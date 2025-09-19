const $wbs = document.getElementById("filter-wbs");
const $req = document.getElementById("filter-request");
const $status = document.getElementById("filter-status");
const $company = document.getElementById("filter-company");
const $companyContainer = document.getElementById("filter-company-container");
const $dateContainer = document.getElementById("filter-date-container");
const $date = document.getElementById("filter-date");
const $tbody = document.getElementById("inspection-tbody");
const $dept = document.getElementById("filter-department");

// …later with other listeners:
$dept.addEventListener("change", () => loadInspections(phpFileFilter));

let phpFileFilter;
let availableDates = [];
let datePicker;

let currentPage = 1;
const limit = 20;

// Helper: show only date part (YYYY-MM-DD) from datetime string
function formatDateOnly(str) {
  if (!str) return '';

  // Handle 'DD-MM-YYYY' (with or without time part)
  if (/^\d{2}-\d{2}-\d{4}/.test(str)) {
    return str.split(' ')[0]; // already in dd-mm-yyyy, just return the date part
  }

  // Handle 'YYYY-MM-DD' format
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${d}-${m}-${y}`;
  }

  return str;
}




// Debounce helper
function debounce(fn, delay = 300) {
  let to;
  return (...args) => {
    clearTimeout(to);
    to = setTimeout(() => fn(...args), delay);
  };
}

function loadAvailableDates() {
  fetch("inspection-dates-available.php")
    .then((r) => r.json())
    .then((dates) => {
      if (datePicker) datePicker.destroy();
      datePicker = flatpickr("#filter-date", {
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "F j, Y",
        allowInput: true,
        enable: dates,
        prevArrow:
          '<svg width="14" height="14"><path d="M10 1 L4 7 L10 13" stroke="#555" stroke-width="2" fill="none"/></svg>',
        nextArrow:
          '<svg width="14" height="14"><path d="M4 1 L10 7 L4 13" stroke="#555" stroke-width="2" fill="none"/></svg>',
        onChange: () => loadInspections(phpFileFilter),
      });
    });
}

// a zero‐arg debounced loader that always uses the up‐to‐date phpFileFilter
const loadDebounced = debounce(() => loadInspections(phpFileFilter), 300);

document.querySelectorAll(".metric-card").forEach((card) => {
  card.addEventListener("click", () => {
    const title = card.querySelector("h3").innerText;
    if (title === "Total Requests") {
      phpFileFilter = "inspection-table-filter-total.php";
      $companyContainer.style.display = "block";
    } else if (title === "RTI") {
      phpFileFilter = "inspection-table-filter-rti.php";
      $companyContainer.style.display = "none";
      $company.value = "";
    } else if (title === "SSD") {
      phpFileFilter = "inspection-table-filter-ssd.php";
      $companyContainer.style.display = "none";
      $company.value = "";
    }

    // reset new Department + Date
    $dept.value = "";
    $dateContainer.style.display = "block";
    $date.value = "";
    loadAvailableDates();

    modal.style.display = "block";
    requestAnimationFrame(() => modal.classList.add("show"));

    loadInspections(phpFileFilter);
  });
});


// re‐use the same file for both change‐events
$req.addEventListener("change", () => loadInspections(phpFileFilter));
$status.addEventListener("change", () => loadInspections(phpFileFilter));
$company.addEventListener("change", () => loadInspections(phpFileFilter));
$wbs.addEventListener("input", loadDebounced);


// Fetch + render
function loadInspections(phpFile, page = 1) {
  currentPage = page;
  const params = new URLSearchParams();
  if ($wbs.value.trim()) params.append("wbs", $wbs.value.trim());
  if ($req.value) params.append("request", $req.value);
  if ($status.value) params.append("status", $status.value);
  if ($company.value) params.append("company", $company.value);
  if ($date.value) params.append("date", $date.value);
  if ($dept.value) params.append("department", $dept.value); // Department filter
  params.append("page", page);

  fetch(`${phpFile}?${params}`, { headers: { Accept: "application/json" } })
    .then(r => r.json())
    .then(({ data, total }) => {
      // -- start added filter logic (search + department fallback) --
      const term = $wbs.value.trim().toLowerCase();
      const selectedDept = ($dept && $dept.value) ? $dept.value : "";

      const filtered = data.filter(item => {
        const wbs = (item.wbs || "").toLowerCase();
        const desc = (item.description || "").toLowerCase();
        const deptVal = String(item.department || "");
        const matchesTerm = !term || wbs.includes(term) || desc.includes(term);
        const matchesDept = !selectedDept || deptVal === selectedDept;
        return matchesTerm && matchesDept;
      });
      // -- end filter logic --

      $tbody.innerHTML = "";

      const seen = new Set();

      if (!filtered.length) {
        $tbody.innerHTML = '<tr><td colspan="14">No records found.</td></tr>';
      } else {

        filtered.forEach(item => {
          if (seen.has(item.inspectionNo)) return;
          seen.add(item.inspectionNo);

          const parts = (item.requestor || "").trim().split(/\s+/);
          const shortName = parts.length > 1
            ? `${parts[0]} ${parts[1].charAt(0)}.`
            : (parts[0] || "");

          // compute sums for mixed pass/fail
          const sumPass = (Number(item.passed_qty) || 0) + (Number(item.pwf_pass) || 0);
          const sumFail = (Number(item.failed_qty) || 0) + (Number(item.pwf_fail) || 0);

          // choose display text for status
          const statusVal = item.status || "";
          const displayStatus = statusVal === "PASSED W/ FAILED"
            ? `PASSED (${sumPass}) W/ FAILED (${sumFail})`
            : statusVal;

          const statusClass = statusVal === "PASSED W/ FAILED"
            ? "status-pass-fail"
            : `status-${statusVal.toLowerCase().replace(/ /g, "-")}`;

          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${item.inspectionNo}</td>
            <td>${String(item.company).toUpperCase()}</td>
            <td>${item.department || ""}</td>
            <td>${item.wbs}</td>
            <td>${item.documentNo || ""}</td>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>${item.request}</td>
            <td>${shortName}</td>
            <td>${item.dateOfRequest || ''}</td>
            <td class="date-completed">
              ${statusVal === "PENDING"
              ? ''
              : (item.painting ? item.dateOfRequest : (item.dateCompleted || ''))
            }
            </td>
            <td class="${statusClass}">${displayStatus}</td>
            <td><button class="view-btn">View</button></td>
            <td><i class="fa-solid fa-clock-rotate-left history-button"></i></td>
          `;
          $tbody.appendChild(tr);
        });
      }

      styleSectionRows();
      const totalPages = Math.ceil(total / limit);
      renderPagination(currentPage, totalPages);
    });
}


function renderPagination(current, total) {
  const container = document.getElementById('pagination');
  container.innerHTML = '';

  function makeNav(text, disabled, onClick) {
    const li = document.createElement('li');
    li.textContent = text;
    li.classList.add('nav');
    if (disabled) {
      li.classList.add('disabled');
    } else {
      li.addEventListener('click', onClick);
    }
    container.appendChild(li);
  }

  function addPage(num, text = num) {
    const li = document.createElement('li');
    li.textContent = text;
    if (num === current) {
      li.classList.add('active');
    } else {
      li.addEventListener('click', () => loadInspections(phpFileFilter, num));
    }
    container.appendChild(li);
  }

  function addEllipsis() {
    const li = document.createElement('li');
    li.textContent = '…';
    li.classList.add('ellipsis');
    container.appendChild(li);
  }

  // « First
  makeNav('«', current === 1, () => loadInspections(phpFileFilter, 1));
  // ‹ Prev
  makeNav('‹', current === 1, () => loadInspections(phpFileFilter, current - 1));

  // Determine window
  const delta = 2;
  let left = Math.max(1, current - delta);
  let right = Math.min(total, current + delta);

  if (left > 1) {
    addPage(1);
    if (left > 2) addEllipsis();
  }

  for (let i = left; i <= right; i++) {
    addPage(i);
  }

  if (right < total) {
    if (right < total - 1) addEllipsis();
    addPage(total);
  }

  // › Next
  makeNav('›', current === total, () => loadInspections(phpFileFilter, current + 1));
  // » Last
  makeNav('»', current === total, () => loadInspections(phpFileFilter, total));
}

function styleSectionRows() {
  document.querySelectorAll("#inspection-tbody tr").forEach((row) => {
    const company = row.querySelector("td:nth-child(2)").textContent.trim();
    row.classList.remove("rti", "ssd");
    if (company === "RTI") row.classList.add("rti");
    if (company === "SSD") row.classList.add("ssd");
  });
}

let dateSortState = 0;
const thDate = document.getElementById("th-date-completed");
const indicator = thDate.querySelector(".sort-indicator");
const tbody = document.getElementById("inspection-tbody");

thDate.addEventListener("click", () => {
  dateSortState = (dateSortState + 1) % 3;

  thDate.classList.remove("sorted-desc", "sorted-asc");
  if (dateSortState === 1) {
    thDate.classList.add("sorted-desc");
  } else if (dateSortState === 2) {
    thDate.classList.add("sorted-asc");
  }

  indicator.textContent =
    dateSortState === 1 ? "↓" : dateSortState === 2 ? "↑" : "";

  if (dateSortState === 0) {
    loadInspections(phpFileFilter);
  } else {
    const rows = Array.from(tbody.querySelectorAll("tr"));
    rows.sort((a, b) => {
      const aText = a.querySelector(".date-completed").textContent.trim();
      const bText = b.querySelector(".date-completed").textContent.trim();
      if (!aText) return 1;
      if (!bText) return -1;
      return dateSortState === 1
        ? bText.localeCompare(aText)
        : aText.localeCompare(bText);
    });
    rows.forEach((r) => tbody.appendChild(r));
  }
});
