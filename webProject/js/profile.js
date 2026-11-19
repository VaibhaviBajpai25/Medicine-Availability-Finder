(function () {
  "use strict";
  var api = window.MediFinder;
  var profileForm = document.getElementById("profile-form");
  var profileInputs = Array.from(document.querySelectorAll(".profile-input"));
  var saveActions = document.getElementById("profile-save-actions");
  var message = document.getElementById("profile-message");
  var user = null;

  initialize();

  document.getElementById("logout-button").addEventListener("click", async function () {
    try {
      await api.request("/api/auth/logout", { method: "POST" });
      window.location.href = "login.html";
    } catch (error) {
      showMessage(error.message);
    }
  });

  document.getElementById("edit-profile").addEventListener("click", function () {
    profileInputs.forEach(function (input) { input.disabled = false; });
    saveActions.hidden = false;
    document.getElementById("profile-name").focus();
  });
  document.getElementById("cancel-edit").addEventListener("click", function () {
    fillProfile(user);
    profileInputs.forEach(function (input) { input.disabled = true; });
    saveActions.hidden = true;
    clearMessage();
  });

  profileForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearMessage();
    if (!profileForm.reportValidity()) return;
    var update = {
      name: document.getElementById("profile-name").value.trim(),
      email: document.getElementById("profile-email").value.trim().toLowerCase(),
      phone: document.getElementById("profile-phone").value.trim(),
      pin: document.getElementById("profile-pin").value.trim()
    };
    if (update.name.length < 2 || !/^[+()\d\s-]{10,18}$/.test(update.phone) ||
        update.phone.replace(/\D/g, "").length < 10 || !/^\d{6}$/.test(update.pin)) {
      showMessage("Enter a valid name, 10-digit phone number, and 6-digit PIN.");
      return;
    }
    try {
      var response = await api.request("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(update)
      });
      user = response.user;
      api.currentUser = user;
      fillProfile(user);
      profileInputs.forEach(function (input) { input.disabled = true; });
      saveActions.hidden = true;
      showMessage("Your profile details have been saved.", true);
    } catch (error) {
      showMessage(error.message);
    }
  });

  document.getElementById("favorite-medicines").addEventListener("click", async function (event) {
    var button = event.target.closest("[data-remove-favorite]");
    if (!button) return;
    button.disabled = true;
    try {
      var response = await api.request("/api/users/me/favorites", {
        method: "POST",
        body: JSON.stringify({ inventoryId: button.getAttribute("data-remove-favorite") })
      });
      user.favorites = response.favorites;
      renderFavorites();
    } catch (error) {
      button.disabled = false;
      showMessage(error.message);
    }
  });

  async function initialize() {
    try {
      var response = await api.request("/api/auth/me");
      user = response.user;
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      if (user.role !== "user") {
        window.location.href = user.role === "pharmacy" ? "pharmacy.html" : "login.html";
        return;
      }
      api.currentUser = user;
      fillProfile(user);
      renderRecentSearches(user.recentSearches || []);
      renderFavorites(user.favorites || []);
    } catch (error) {
      showMessage(error.message);
    }
  }

  function fillProfile(profile) {
    document.getElementById("profile-name").value = profile.name || "";
    document.getElementById("profile-email").value = profile.email || "";
    document.getElementById("profile-phone").value = profile.phone || "";
    document.getElementById("profile-pin").value = profile.pin || "";
    document.getElementById("welcome-name").textContent = "Hello, " + profile.name.split(/\s+/)[0];
    document.getElementById("profile-subtitle").textContent = profile.email;
    document.getElementById("profile-avatar").textContent = profile.name.split(/\s+/)
      .slice(0, 2).map(function (part) { return part.charAt(0); }).join("").toUpperCase();
  }

  function renderRecentSearches(recent) {
    document.getElementById("recent-count").textContent = recent.length + (recent.length === 1 ? " search" : " searches");
    var container = document.getElementById("recent-searches");
    container.innerHTML = recent.length ? recent.map(function (item) {
      var href = "medicines.html?medicine=" + encodeURIComponent(item.medicine) + "&pin=" + encodeURIComponent(item.pin);
      return '<div class="profile-list-item"><span class="list-item-icon" aria-hidden="true">⌕</span><div class="list-item-copy"><strong>' + api.escapeHtml(item.medicine) + '</strong><span>PIN ' + api.escapeHtml(item.pin) + '</span></div><a class="list-item-link" href="' + href + '">Search ↗</a></div>';
    }).join("") : '<p class="list-empty">Your recent searches will show up here.</p>';
  }

  function renderFavorites(favorites) {
    document.getElementById("favorite-count").textContent = favorites.length + " saved";
    var container = document.getElementById("favorite-medicines");
    container.innerHTML = favorites.length ? favorites.map(function (item) {
      var pharmacyPin = item.pharmacy ? item.pharmacy.pin : "";
      var href = "medicines.html?medicine=" + encodeURIComponent(item.name) + "&pin=" + encodeURIComponent(pharmacyPin);
      return '<div class="profile-list-item"><span class="list-item-icon" aria-hidden="true">♥</span><div class="list-item-copy"><strong>' + api.escapeHtml(item.name) + '</strong><span>' + api.escapeHtml(item.pharmacy ? item.pharmacy.name : "Approved pharmacy") + ' · ' + api.formatPrice(item.price) + '</span></div><a class="list-item-link" href="' + href + '">View ↗</a><button class="remove-favorite" type="button" data-remove-favorite="' + api.escapeHtml(item.id) + '" aria-label="Remove ' + api.escapeHtml(item.name) + ' from favorites">Remove</button></div>';
    }).join("") : '<p class="list-empty">Save a medicine listing with the heart icon to see it here.</p>';
  }

  function showMessage(text, success) {
    message.textContent = text;
    message.classList.toggle("success", Boolean(success));
  }

  function clearMessage() {
    message.textContent = "";
    message.classList.remove("success");
  }
}());
