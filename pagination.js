const rowsPerPage     = 15;
let currentPage       = 1;
let paginationRows    = [];
let totalPages        = 0;

const paginationEl    = document.getElementById('pagination');
const jumpInput       = document.getElementById('jump-page-input');
const jumpBtn         = document.getElementById('jump-page-btn');

function setupPagination(table) {
  // grab & cache all rows
  paginationRows = Array.from(table.querySelector('tbody').rows);
  totalPages     = Math.ceil(paginationRows.length / rowsPerPage);
  currentPage    = Math.min(currentPage, totalPages) || 1;

  paginationEl.innerHTML = '';

  // “<<” go to first
  appendArrow('«', () => goToPage(1), currentPage === 1);

  // “‹” previous
  appendArrow('‹', () => goToPage(currentPage - 1), currentPage === 1);

  // the page-number window with ellipses
  renderPageWindow();

  // “›” next
  appendArrow('›', () => goToPage(currentPage + 1), currentPage === totalPages);

  // “>>” last
  appendArrow('»', () => goToPage(totalPages), currentPage === totalPages);

  // update jump-to input
  jumpInput.max = totalPages;
  jumpInput.value = currentPage;

  // display first page
  displayPage();
}

function appendArrow(symbol, onClick, disabled) {
  const li = document.createElement('li');
  li.textContent = symbol;
  li.classList.add('arrow');
  if (disabled) li.classList.add('disabled');
  else li.addEventListener('click', onClick);
  paginationEl.appendChild(li);
}

function renderPageWindow() {
  const delta = 2;       // how many pages to show on each side of current
  const range = [];
  const left  = Math.max(2, currentPage - delta);
  const right = Math.min(totalPages - 1, currentPage + delta);

  // always include page 1
  addPageItem(1);

  // left ellipsis
  if (left > 2) addEllipsis();

  // pages around current
  for (let p = left; p <= right; p++) {
    addPageItem(p);
  }

  // right ellipsis
  if (right < totalPages - 1) addEllipsis();

  // always include last
  if (totalPages > 1) addPageItem(totalPages);
}

function addPageItem(p) {
  const li = document.createElement('li');
  li.textContent = p;
  if (p === currentPage) li.classList.add('active');
  else li.addEventListener('click', () => goToPage(p));
  paginationEl.appendChild(li);
}

function addEllipsis() {
  const li = document.createElement('li');
  li.textContent = '…';
  li.classList.add('ellipsis');
  paginationEl.appendChild(li);
}

function goToPage(page) {
  if (page < 1 || page > totalPages || page === currentPage) return;
  currentPage = page;
  setupPagination(document.querySelector('.inspection-table'));
}

jumpBtn.addEventListener('click', () => {
  const p = parseInt(jumpInput.value, 10);
  if (p >= 1 && p <= totalPages) goToPage(p);
});

// show only the rows for the current page
function displayPage() {
  const start = (currentPage - 1) * rowsPerPage;
  const end   = start + rowsPerPage;
  paginationRows.forEach((row, i) => {
    row.style.display = (i >= start && i < end) ? '' : 'none';
  });
}

// initialize on your table
setupPagination(document.querySelector('.inspection-table'));
