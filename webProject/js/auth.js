(function () {
  "use strict";
  var api = window.MediFinder;
  var signupForm = document.getElementById("signup-form");
  var loginForm = document.getElementById("login-form");
  var resetForm = document.getElementById("reset-form");

  document.querySelectorAll("[data-toggle-password]").forEach(function (button) {
    button.addEventListener("click", function () {
      var input = document.getElementById(button.getAttribute("data-toggle-password"));
      var reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      button.textContent = reveal ? "Hide" : "Show";
      button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    });
  });

  var pharmacyFields = document.getElementById("pharmacy-fields");
  if (pharmacyFields) {
    document.querySelectorAll('input[name="role"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        var isPharmacy = radio.checked && radio.value === "pharmacy";
        pharmacyFields.hidden = !isPharmacy;
        pharmacyFields.querySelectorAll("input").forEach(function (input) {
          input.disabled = !isPharmacy;
          input.required = isPharmacy;
        });
      });
    });
  }

  if (signupForm) {
    signupForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      var message = document.getElementById("signup-message");
      clearMessage(message);
      if (!signupForm.reportValidity()) return;

      var data = new FormData(signupForm);
      var password = data.get("password");
      if (password !== data.get("confirm")) {
        showMessage(message, "Your passwords do not match.");
        return;
      }
      var phone = String(data.get("phone")).trim();
      if (!/^[+()\d\s-]{10,18}$/.test(phone) || phone.replace(/\D/g, "").length < 10) {
        showMessage(message, "Enter a valid phone number with at least 10 digits.");
        return;
      }
      if (!/^\d{6}$/.test(String(data.get("pin")).trim())) {
        showMessage(message, "Enter a valid 6-digit PIN code.");
        return;
      }
      var payload = {
        name: String(data.get("name")).trim(),
        email: String(data.get("email")).trim().toLowerCase(),
        phone: phone,
        pin: String(data.get("pin")).trim(),
        password: password,
        role: String(data.get("role"))
      };
      if (payload.role === "pharmacy") {
        payload.pharmacyName = String(data.get("pharmacyName")).trim();
        payload.address = String(data.get("address")).trim();
        payload.licenseNumber = String(data.get("licenseNumber")).trim();
      }
      try {
        var result = await api.request("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        window.location.href = destinationFor(result.user);
      } catch (error) {
        showMessage(message, error.message);
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      var message = document.getElementById("login-message");
      clearMessage(message);
      if (!loginForm.reportValidity()) return;
      try {
        var result = await api.request("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: document.getElementById("login-email").value.trim().toLowerCase(),
            password: document.getElementById("login-password").value,
            remember: document.getElementById("remember-me").checked
          })
        });
        window.location.href = destinationFor(result.user);
      } catch (error) {
        showMessage(message, error.message);
      }
    });

    document.getElementById("forgot-password").addEventListener("click", function () {
      document.getElementById("reset-panel").hidden = false;
      document.getElementById("reset-email").value = document.getElementById("login-email").value;
      document.getElementById("reset-email").focus();
    });
    document.getElementById("cancel-reset").addEventListener("click", function () {
      document.getElementById("reset-panel").hidden = true;
      clearMessage(document.getElementById("login-message"));
    });
  }

  if (resetForm) {
    resetForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      var message = document.getElementById("login-message");
      clearMessage(message);
      if (!resetForm.reportValidity()) return;
      try {
        await api.request("/api/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ email: document.getElementById("reset-email").value.trim().toLowerCase() })
        });
      } catch (error) {
        showMessage(message, error.message);
      }
    });
  }

  function destinationFor(user) {
    return user.role === "pharmacy" ? "pharmacy.html" : "index.html";
  }

  function showMessage(element, text) {
    element.textContent = text;
    element.classList.remove("success");
  }

  function clearMessage(element) {
    element.textContent = "";
    element.classList.remove("success");
  }
}());
