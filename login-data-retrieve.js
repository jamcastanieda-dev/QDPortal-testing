document.addEventListener("DOMContentLoaded", () => {
  const submitBtn   = document.querySelector(".login-button");
  const regLink     = document.getElementById("toggle-register");
  const loginLink   = document.getElementById("toggle-login");
  const deptGroup   = document.getElementById("department-group");
  const nameGroup   = document.getElementById("fullname-group");

  // — Toggle UI between Login and Register —
  regLink.addEventListener("click", e => {
    e.preventDefault();
    submitBtn.querySelector("span").textContent = "Register";
    submitBtn.id = "register";
    nameGroup.style.display = "block";
    deptGroup.style.display = "block";
    regLink.closest("p").style.display   = "none";
    loginLink.closest("p").style.display = "block";
  });

  loginLink.addEventListener("click", e => {
    e.preventDefault();
    submitBtn.querySelector("span").textContent = "Login";
    submitBtn.id = "login";
    nameGroup.style.display = "none";
    deptGroup.style.display = "none";
    loginLink.closest("p").style.display = "none";
    regLink.closest("p").style.display   = "block";
  });

  // — Main click handler for Login/Register —
  submitBtn.addEventListener("click", function(e) {
    e.preventDefault();

    // --- Button ripple ---
    const rippleBtn = document.createElement("span");
    rippleBtn.classList.add("ripple");
    const btnRect = this.getBoundingClientRect();
    const btnSize = Math.max(btnRect.width, btnRect.height);
    rippleBtn.style.width = rippleBtn.style.height = btnSize + "px";
    rippleBtn.style.left = e.clientX - btnRect.left - btnSize/2 + "px";
    rippleBtn.style.top  = e.clientY - btnRect.top  - btnSize/2 + "px";
    this.appendChild(rippleBtn);
    rippleBtn.addEventListener("animationend", () => rippleBtn.remove());

    // --- Prepare body ripple for success ---
    const rippleBody = document.createElement("span");
    rippleBody.classList.add("ripple", "ripple-body");
    const sizeBody = Math.max(window.innerWidth, window.innerHeight) * 2;
    rippleBody.style.width = rippleBody.style.height = sizeBody + "px";
    rippleBody.style.left = e.clientX - sizeBody/2 + "px";
    rippleBody.style.top  = e.clientY - sizeBody/2 + "px";

    // — Gather form values —
    const mode       = this.id; // "login" or "register"
    const empId      = document.getElementById("employee-id").value.trim();
    const password   = document.getElementById("password").value;
    const nameEl     = document.getElementById("full-name");
    const fullName   = nameEl ? nameEl.value.trim() : "";
    const deptEl     = document.getElementById("department");
    const department = deptEl ? deptEl.value : "";

    // — Validation —
    if (
      !empId ||
      !password ||
      (mode === "register" && (!fullName || !department))
    ) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill in all required fields"
      });
      return;
    }

    // — Build the request —
    const formData = new FormData();
    formData.append("employee-id", empId);
    formData.append("password", password);
    if (mode === "register") {
      formData.append("full-name", fullName);
      formData.append("department", department);
    }

    const endpoint = mode === "login"
      ? "login-retrieve.php"
      : "login-register.php";

    fetch(endpoint, {
      method: "POST",
      body: formData
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then(text => {
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON response");
      }

      if (data.success) {
        // show body ripple on success
        document.body.appendChild(rippleBody);
        rippleBody.addEventListener("animationend", () => rippleBody.remove());

        Swal.fire({
          icon: "success",
          title: data.message,
          timer: 1500,
          showConfirmButton: false
        })
        .then(() => {
          window.location.href = data.redirect;
        });

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
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Failed to process request: " + err.message
      });
    });
  });
});
