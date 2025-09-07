document.getElementById("login").addEventListener("click", function (e) {
  // --- Ripple for the Button ---
  const rippleBtn = document.createElement("span");
  rippleBtn.classList.add("ripple");

  // Calculate size and position for the button ripple
  const btnRect = this.getBoundingClientRect();
  const btnSize = Math.max(btnRect.width, btnRect.height);
  rippleBtn.style.width = rippleBtn.style.height = btnSize + "px";

  // Calculate center position based on click within the button
  const btnX = e.clientX - btnRect.left - btnSize / 2;
  const btnY = e.clientY - btnRect.top - btnSize / 2;
  rippleBtn.style.left = btnX + "px";
  rippleBtn.style.top = btnY + "px";

  // --- Ripple for the Body ---
  const rippleBody = document.createElement("span");
  // Add both classes: base ripple and body override
  rippleBody.classList.add("ripple", "ripple-body");

  // Size: make it very large so it covers the entire screen
  const sizeBody = Math.max(window.innerWidth, window.innerHeight) * 2;
  rippleBody.style.width = rippleBody.style.height = sizeBody + "px";

  // Calculate position based on click relative to viewport
  const bodyX = e.clientX - sizeBody / 2;
  const bodyY = e.clientY - sizeBody / 2;
  rippleBody.style.left = bodyX + "px";
  rippleBody.style.top = bodyY + "px";

  // Append the ripple to the button and remove it once the animation ends
  this.appendChild(rippleBtn);
  rippleBtn.addEventListener("animationend", function () {
    rippleBtn.remove();
  });

  const employeeName = document.getElementById("employee-id").value.trim();
  const employeePassword = document.getElementById("password").value;

  // Client-side validation
  if (!employeeName || !employeePassword) {
    Swal.fire({
      icon: "warning",
      title: "Missing Fields",
      text: "Please fill in all required fields",
    });
    return;
  }

  // Prepare form data
  const formData = new FormData();
  formData.append("employee-id", employeeName);
  formData.append("password", employeePassword);

  // Send request
  fetch("login-retrieve.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.text(); // Get raw text first
    })
    .then((text) => {
      console.log("Raw response:", text); // Debug raw response
      let data;
      try {
        data = JSON.parse(text); // Parse JSON
        console.log("Parsed data:", data); // Debug parsed data
      } catch (e) {
        console.error("JSON Parse Error:", e);
        throw new Error("Invalid JSON response");
      }

      if (data.success) {
        // Append the ripple to the document body and remove it once animation ends
        document.body.appendChild(rippleBody);
        rippleBody.addEventListener("animationend", () => {
          rippleBody.remove();
        });
        Swal.fire({
          icon: "success",
          title: "Login Successful",
          text: "Welcome back! Redirecting...",
          timer: 2000,
          showConfirmButton: false,
        }).then(() => {
          const redirectUrl = data.redirect || "login.php";
          console.log("Redirecting to:", redirectUrl); // Debug redirect
          window.location.href = redirectUrl;
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Login Failed",
          text: data.message || "Something went wrong",
        });
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Failed to process request: " + error.message,
      });
    });
});

document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.getElementById("login");
  const regLink = document.getElementById("toggle-register");
  const loginLink = document.getElementById("toggle-login");
  const deptGroup = document.getElementById("department-group");

  // Switch to Register mode
  regLink.addEventListener("click", (e) => {
    e.preventDefault();
    submitBtn.querySelector("span").textContent = "Register";
    submitBtn.id = "register";
    deptGroup.style.display = "block";
    regLink.closest("p").style.display = "none";
    loginLink.closest("p").style.display = "block";
  });

  // Switch back to Login mode
  loginLink.addEventListener("click", (e) => {
    e.preventDefault();
    submitBtn.querySelector("span").textContent = "Login";
    submitBtn.id = "login";
    deptGroup.style.display = "none";
    loginLink.closest("p").style.display = "none";
    regLink.closest("p").style.display = "block";
  });
});
