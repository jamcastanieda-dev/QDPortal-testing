// login-data-retrieve.js
document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.querySelector(".login-button");
  const regLink = document.getElementById("toggle-register");
  const loginLink = document.getElementById("toggle-login");
  const deptGroup = document.getElementById("department-group");
  const nameGroup = document.getElementById("fullname-group");

  // Section + Role groups
  const sectionGroup = document.getElementById("section-group");
  const sectionSel = document.getElementById("section");
  const roleGroup = document.getElementById("role-group");
  const roleSel = document.getElementById("role");

  // Email group
  const emailGroup = document.getElementById("email-group");
  const emailInput = document.getElementById("email");

  const deptSel = document.getElementById("department");

  // Confirm Password (REGISTER ONLY)
  const confirmGroup = document.getElementById("confirm-group");
  const confirmInput = document.getElementById("confirm-password");

  // --- Department → Section options map (keys should be UPPERCASE) ---
  const SECTION_MAP = {
    "SSD": ["DESIGN", "PPIC", "QA", "WAREHOUSE", "PRODUCTION"],
    "PPIC": ["EXPEDITER", "ORDER TAKING", "EXTERNAL", "PBI"],
    "TSD": ["CNC", "CONVENTIONAL", "ASSEMBLY", "TOOLROOM"],
    "EF": ["MECHANICAL", "WELDING", "WATERJET"],
    "PVD": ["PRODUCTION", "SALES"],
    "A & C": ["CMT", "AUTOMATION", "ELECTRICAL"],
    "MAINTENANCE": ["MECHANICAL", "ELECTRONICS", "B&G"],
    "PE": ["POWER ELECTRONICS", "PROJECTS", "POWER PLANT"]
  };

  // Helper: build Section options for a department
  function populateSectionOptions(deptUC) {
    const options = SECTION_MAP[deptUC] || [];
    // reset to placeholder
    if (sectionSel) {
      sectionSel.innerHTML = `<option value="">— Select section —</option>`;
      options.forEach(opt => {
        const o = document.createElement("option");
        o.value = opt;
        o.textContent = opt;
        sectionSel.appendChild(o);
      });
    }
  }

  // Show/hide & require Section based on department presence in map
  function refreshSectionVisibility() {
    const deptUC = (deptSel?.value || "").trim().toUpperCase();
    const hasSections = !!SECTION_MAP[deptUC];

    if (sectionGroup) sectionGroup.style.display = hasSections ? "block" : "none";

    if (hasSections) {
      populateSectionOptions(deptUC);
      sectionSel?.setAttribute("required", "required");
    } else {
      sectionSel?.removeAttribute("required");
      if (sectionSel) {
        sectionSel.value = "";
        sectionSel.innerHTML = `<option value="">— Select section —</option>`;
      }
    }
  }

  // Eye icons
  function eyeOn() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>`;
  }
  function eyeOff() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 3l18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.6 10.6A3 3 0 0113.4 13.4M9.9 4.24C10.58 4.09 11.28 4 12 4c6.5 0 10 8 10 8a18.1 18.1 0 01-4.16 5.34M6.61 6.61C4.53 7.93 3 10 3 12c0 0 3.5 7 10 7 1.31 0 2.56-.24 3.73-.68" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  // Initialize any existing eye buttons (default: hidden state)
  document.querySelectorAll(".toggle-visibility").forEach(btn => {
    btn.innerHTML = eyeOn();
    btn.setAttribute("aria-label", "Show password");
  });

  // Eye toggle (event delegation)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".toggle-visibility");
    if (!btn) return;
    e.preventDefault();
    const targetId = btn.getAttribute("data-target");
    const input = document.getElementById(targetId);
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    btn.innerHTML = show ? eyeOff() : eyeOn();
  });

  // — Toggle UI between Login and Register —
  regLink.addEventListener("click", e => {
    e.preventDefault();
    submitBtn.querySelector("span").textContent = "Register";
    submitBtn.id = "register";
    nameGroup.style.display = "block";
    deptGroup.style.display = "block";
    if (roleGroup) roleGroup.style.display = "block";
    if (emailGroup) emailGroup.style.display = "block";
    if (confirmGroup) confirmGroup.style.display = "block"; // confirm only in REGISTER
    refreshSectionVisibility(); // populate if department already chosen
    regLink.closest("p").style.display = "none";
    loginLink.closest("p").style.display = "block";
  });

  loginLink.addEventListener("click", e => {
    e.preventDefault();
    submitBtn.querySelector("span").textContent = "Login";
    submitBtn.id = "login";
    nameGroup.style.display = "none";
    deptGroup.style.display = "none";
    if (sectionGroup) sectionGroup.style.display = "none";
    if (roleGroup) roleGroup.style.display = "none";
    if (emailGroup) emailGroup.style.display = "none";
    if (confirmGroup) confirmGroup.style.display = "none"; // hide confirm in LOGIN
    loginLink.closest("p").style.display = "none";
    regLink.closest("p").style.display = "block";
  });

  // React to department change (drive Section visibility + options)
  deptSel?.addEventListener("change", refreshSectionVisibility);

  // — Main click handler for Login/Register —
  submitBtn.addEventListener("click", function (e) {
    e.preventDefault();

    // --- Button ripple ---
    const rippleBtn = document.createElement("span");
    rippleBtn.classList.add("ripple");
    const btnRect = this.getBoundingClientRect();
    const btnSize = Math.max(btnRect.width, btnRect.height);
    rippleBtn.style.width = rippleBtn.style.height = btnSize + "px";
    rippleBtn.style.left = e.clientX - btnRect.left - btnSize / 2 + "px";
    rippleBtn.style.top = e.clientY - btnRect.top - btnSize / 2 + "px";
    this.appendChild(rippleBtn);
    rippleBtn.addEventListener("animationend", () => rippleBtn.remove());

    const rippleBody = document.createElement("span");
    rippleBody.classList.add("ripple", "ripple-body");
    const sizeBody = Math.max(window.innerWidth, window.innerHeight) * 2;
    rippleBody.style.width = rippleBody.style.height = sizeBody + "px";
    rippleBody.style.left = e.clientX - sizeBody / 2 + "px";
    rippleBody.style.top = e.clientY - sizeBody / 2 + "px";

    // — Gather form values —
    const mode = this.id; // "login" or "register"
    const empId = document.getElementById("employee-id").value.trim();
    const password = document.getElementById("password").value;
    const fullName = (document.getElementById("full-name")?.value || "").trim();
    const department = (deptSel?.value || "").trim();
    const emailVal = (emailInput?.value || "").trim();
    const section = (sectionSel?.value || "").trim(); // required when dept has sections

    const deptUC = department.toUpperCase();
    const hasSections = !!SECTION_MAP[deptUC];

    // — Validation —
    if (!empId || !password || (mode === "register" && (!fullName || !department))) {
      Swal.fire({ icon: "warning", title: "Missing Fields", text: "Please fill in all required fields" });
      return;
    }

    if (mode === "register") {
      // Confirm password required + must match (REGISTER ONLY)
      const confirmVal = (confirmInput?.value || "");
      if (!confirmVal) {
        Swal.fire({ icon: "warning", title: "Confirm Password", text: "Please confirm your password." });
        return;
      }
      if (confirmVal !== password) {
        Swal.fire({ icon: "error", title: "Passwords Don’t Match", text: "Password and Confirm Password must match." });
        return;
      }

      // Email required + basic format check
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
      if (!emailVal || !emailOk) {
        Swal.fire({ icon: "warning", title: "Invalid Email", text: "Please enter a valid email address." });
        return;
      }

      if (hasSections && !section) {
        Swal.fire({ icon: "warning", title: "Section Required", text: "Please select a Section for the chosen department." });
        return;
      }

      if (!roleSel?.value) {
        Swal.fire({ icon: "warning", title: "Role Required", text: "Please select a Role." });
        return;
      }
    }

    // Normalize role per rules
    let role = "";
    if (mode === "register") {
      const r = (roleSel?.value || "").toLowerCase();
      role = (r === "manager" || r === "supervisor") ? r : "others";
    }

    // — Build the request —
    const formData = new FormData();
    formData.append("employee-id", empId);
    formData.append("password", password);

    if (mode === "register") {
      formData.append("full-name", fullName);
      formData.append("department", department);
      formData.append("email", emailVal);
      formData.append("section", hasSections ? section : "");
      formData.append("role", role);
      formData.append("confirm-password", confirmInput?.value || "");
    }

    const endpoint = mode === "login" ? "login-retrieve.php" : "login-register.php";

    fetch(endpoint, { method: "POST", body: formData })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(text => {
        let data;
        try { data = JSON.parse(text); }
        catch { throw new Error("Invalid JSON response"); }

        if (data.success) {
          document.body.appendChild(rippleBody);
          rippleBody.addEventListener("animationend", () => rippleBody.remove());
          Swal.fire({
            icon: "success",
            title: data.message || (mode === "login" ? "Login successful!" : "Registration successful!"),
            timer: 1500,
            showConfirmButton: false
          }).then(() => { window.location.href = data.redirect; });
        } else {
          Swal.fire({
            icon: "error",
            title: mode === "login" ? "Login Failed" : "Registration Failed",
            text: data.message || "Something went wrong."
          });
        }
      })
      .catch(err => {
        console.error("Error:", err);
        Swal.fire({ icon: "error", title: "Oops...", text: "Failed to process request: " + err.message });
      });
  });

  // Default page is Login → ensure confirm is hidden
  if (confirmGroup) confirmGroup.style.display = "none";
});
