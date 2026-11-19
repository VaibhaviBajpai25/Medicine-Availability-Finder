(function () {
  "use strict";

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  window.MediFinder = {
    currentUser: null,
    escapeHtml: escapeHtml,
    formatPrice: function (amount) {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
    },
    request: async function (url, options) {
      var config = options || {};
      var headers = Object.assign({ "X-Requested-With": "XMLHttpRequest" }, config.headers || {});
      if (config.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
      var response;
      try {
        response = await fetch(url, Object.assign({}, config, { headers: headers, credentials: "same-origin" }));
      } catch (error) {
        throw new Error("Could not reach Medi Finder. Start the server and make sure MongoDB is running.");
      }
      var result = await response.json();
      if (!response.ok) {
        var apiError = new Error(result.error || "The request could not be completed.");
        apiError.status = response.status;
        throw apiError;
      }
      return result;
    }
  };

  document.querySelectorAll("[data-current-year]").forEach(function (element) {
    element.textContent = new Date().getFullYear();
  });

  var menuButton = document.querySelector(".menu-toggle");
  var nav = document.querySelector(".nav-links");
  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        nav.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation menu");
      }
    });
    document.addEventListener("click", function (event) {
      if (!nav.contains(event.target) && !menuButton.contains(event.target)) {
        nav.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation menu");
      }
    });
  }

  document.querySelectorAll(".search-form").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      var pin = form.querySelector('[name="pin"]');
      if (pin && !/^\d{6}$/.test(pin.value.trim())) {
        event.preventDefault();
        pin.setCustomValidity("Enter a 6-digit PIN code.");
        pin.reportValidity();
      } else if (pin) {
        pin.setCustomValidity("");
      }
    });
  });

  if (nav) {
    window.MediFinder.request("/api/auth/me").then(function (result) {
      var user = result.user;
      window.MediFinder.currentUser = user;
      window.dispatchEvent(new CustomEvent("medi-finder-user-ready", { detail: user }));
      if (!user || user.role === "admin") return;
      var profileLink = nav.querySelector(".nav-profile");
      if (profileLink) {
        profileLink.href = user.role === "pharmacy" ? "pharmacy.html" : "profile.html";
        profileLink.innerHTML = '<span class="profile-dot" aria-hidden="true">↗</span> ' +
          (user.role === "pharmacy" ? "Pharmacy dashboard" : "My profile");
      }
      nav.querySelectorAll('a[href="login.html"], a[href="signup.html"]').forEach(function (link) {
        link.hidden = true;
      });
      var logoutButton = document.createElement("button");
      logoutButton.type = "button";
      logoutButton.className = "nav-profile nav-logout";
      logoutButton.textContent = "Log out";
      logoutButton.addEventListener("click", async function () {
        try {
          await window.MediFinder.request("/api/auth/logout", { method: "POST" });
          window.location.href = "index.html";
        } catch (error) {
          showConnectionMessage(error.message);
        }
      });
      nav.appendChild(logoutButton);
    }).catch(function (error) {
      window.dispatchEvent(new CustomEvent("medi-finder-user-ready", { detail: null }));
      showConnectionMessage(error.message);
    });
  }

  var featured = document.getElementById("featured-pharmacies");
  if (featured) {
    window.MediFinder.request("/api/pharmacies/featured").then(function (result) {
      if (!result.pharmacies.length) {
        featured.innerHTML = '<p class="list-empty">Approved pharmacies will appear here as they join Medi Finder.</p>';
        return;
      }
      featured.innerHTML = result.pharmacies.map(function (pharmacy) {
        return '<article class="pharmacy-card"><div class="pharmacy-card-top"><span class="pharmacy-symbol" aria-hidden="true"><img src="images/pharmacy/pharmacy-mark.svg" alt=""></span><div><h3>' + escapeHtml(pharmacy.name) + '</h3><p>Approved pharmacy · PIN ' + escapeHtml(pharmacy.pin) + '</p></div></div><p class="pharmacy-detail">' + escapeHtml(pharmacy.address) + '</p><div class="pharmacy-tags"><a href="tel:' + escapeHtml(pharmacy.phone) + '">☎ ' + escapeHtml(pharmacy.phone) + '</a><span>' + pharmacy.medicineCount + (pharmacy.medicineCount === 1 ? ' medicine listing' : ' medicine listings') + '</span></div></article>';
      }).join("");
    }).catch(function (error) {
      featured.innerHTML = '<p class="list-empty">' + escapeHtml(error.message) + '</p>';
    });
  }

  function showConnectionMessage(text) {
    var status = document.getElementById("connection-status");
    if (!status) {
      status = document.createElement("div");
      status.id = "connection-status";
      status.className = "connection-status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      document.body.appendChild(status);
    }
    status.textContent = text;
  }
}());
