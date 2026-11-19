(function () {
  "use strict";
  var api = window.MediFinder;
  var form = document.getElementById("medicine-search");
  var queryInput = document.getElementById("medicine-query");
  var pinInput = document.getElementById("pin-query");
  var results = document.getElementById("medicine-results");
  var emptyState = document.getElementById("empty-state");
  var resultCount = document.getElementById("result-count");
  var resultsTitle = document.getElementById("results-title");
  var categoryFilter = document.getElementById("category-filter");
  var availabilityFilter = document.getElementById("availability-filter");
  var priceFilter = document.getElementById("price-filter");
  var priceOutput = document.getElementById("price-output");
  var currentSearch = { medicine: "", pin: "" };
  var currentItems = [];
  var recentSearchKey = "";

  window.addEventListener("medi-finder-user-ready", function (event) {
    api.currentUser = event.detail;
    if (currentSearch.medicine && currentSearch.pin) renderItems(currentItems);
    else showEmpty("Start with a medicine name", "Enter a medicine and your PIN code to find approved pharmacy listings.");
    saveRecentSearchIfSignedIn();
  });

  var params = new URLSearchParams(window.location.search);
  queryInput.value = params.get("medicine") || "";
  pinInput.value = params.get("pin") || "";
  if (queryInput.value.trim() && /^\d{6}$/.test(pinInput.value.trim())) {
    currentSearch = { medicine: queryInput.value.trim(), pin: pinInput.value.trim() };
    recentSearchKey = "";
    search();
  } else {
    showEmpty("Start with a medicine name", "Enter a medicine and your PIN code to find approved pharmacy listings.");
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    pinInput.setCustomValidity("");
    if (!/^\d{6}$/.test(pinInput.value.trim())) {
      pinInput.setCustomValidity("Enter a 6-digit PIN code.");
      pinInput.reportValidity();
      return;
    }
    if (!queryInput.value.trim()) {
      queryInput.reportValidity();
      return;
    }
    currentSearch = { medicine: queryInput.value.trim(), pin: pinInput.value.trim() };
    var url = new URL(window.location.href);
    url.searchParams.set("medicine", currentSearch.medicine);
    url.searchParams.set("pin", currentSearch.pin);
    window.history.replaceState({}, "", url);
    search();
  });

  [categoryFilter, availabilityFilter].forEach(function (control) {
    control.addEventListener("change", search);
  });
  priceFilter.addEventListener("input", function () {
    priceOutput.value = api.formatPrice(Number(priceFilter.value));
    priceOutput.textContent = api.formatPrice(Number(priceFilter.value));
    search();
  });
  document.getElementById("reset-filters").addEventListener("click", function () {
    categoryFilter.value = "";
    availabilityFilter.value = "";
    priceFilter.value = "1000";
    priceOutput.value = api.formatPrice(1000);
    priceOutput.textContent = api.formatPrice(1000);
    search();
  });

  results.addEventListener("click", async function (event) {
    var favoriteButton = event.target.closest("[data-favorite-id]");
    if (!favoriteButton) return;
    favoriteButton.disabled = true;
    try {
      var response = await api.request("/api/users/me/favorites", {
        method: "POST",
        body: JSON.stringify({ inventoryId: favoriteButton.getAttribute("data-favorite-id") })
      });
      if (api.currentUser) api.currentUser.favorites = response.favorites;
      renderItems(currentItems);
    } catch (error) {
      favoriteButton.disabled = false;
      showEmpty(error.message, "Sign in to save medicines to your favorites.");
    }
  });

  async function search() {
    if (!currentSearch.medicine || !currentSearch.pin) {
      renderItems([]);
      showEmpty("Start with a medicine name", "Enter a medicine and your PIN code to find approved pharmacy listings.");
      return;
    }
    resultsTitle.textContent = "Listings for \"" + currentSearch.medicine + "\"";
    resultCount.textContent = "Searching…";
    emptyState.hidden = true;
    var searchParams = new URLSearchParams({
      medicine: currentSearch.medicine,
      pin: currentSearch.pin,
      maxPrice: priceFilter.value
    });
    if (categoryFilter.value) searchParams.set("category", categoryFilter.value);
    if (availabilityFilter.value) searchParams.set("availability", availabilityFilter.value);
    try {
      var response = await api.request("/api/medicines?" + searchParams.toString());
      currentItems = response.items;
      renderItems(currentItems);
      saveRecentSearchIfSignedIn();
    } catch (error) {
      currentItems = [];
      renderItems([]);
      showEmpty("Search couldn’t be completed", error.message);
    }
  }

  function saveRecentSearchIfSignedIn() {
    if (!api.currentUser || api.currentUser.role !== "user" || !currentSearch.medicine) return;
    var key = currentSearch.medicine.toLowerCase() + "|" + currentSearch.pin;
    if (recentSearchKey === key) return;
    recentSearchKey = key;
    api.request("/api/users/me/searches", {
      method: "POST",
      body: JSON.stringify(currentSearch)
    }).catch(function (error) {
      console.error("Could not save recent search:", error.message);
    });
  }

  function renderItems(items) {
    var favorites = api.currentUser && api.currentUser.favorites ? api.currentUser.favorites : [];
    resultCount.textContent = items.length + (items.length === 1 ? " listing" : " listings");
    results.innerHTML = items.map(function (item) {
      var isFavorite = favorites.some(function (favorite) { return favorite.id === item.id; });
      var availability = item.demo
        ? (item.available ? "In stock · " + item.quantity + " demo units" : "Out of stock · demo")
        : (item.available ? "In stock · " + item.quantity + " units reported" : "Out of stock");
      var contactAction = item.demo
        ? '<span class="button contact-button demo-contact" aria-label="Demo listing; contact unavailable">Demo only · no contact</span>'
        : '<a class="button contact-button" href="tel:' + api.escapeHtml(item.pharmacy.phone) + '">Contact pharmacy <span aria-hidden="true">↗</span></a>';
      return '<article class="medicine-card">' +
        '<div class="medicine-image-wrap"><img src="images/medicines/medicine-pack.svg" alt="' + api.escapeHtml(item.name) + ' pack illustration"></div>' +
        '<div class="medicine-info"><div class="medicine-title-row"><div><h3>' + api.escapeHtml(item.name) + '</h3><p class="medicine-manufacturer">by ' + api.escapeHtml(item.manufacturer) + '</p></div><button class="favorite-button' + (isFavorite ? " is-favorite" : "") + '" type="button" data-favorite-id="' + api.escapeHtml(item.id) + '" aria-label="' + (isFavorite ? "Remove " + api.escapeHtml(item.name) + " from favorites" : "Save " + api.escapeHtml(item.name) + " to favorites") + '" aria-pressed="' + String(isFavorite) + '">' + (isFavorite ? "♥" : "♡") + '</button></div>' +
        '<span class="category-pill">' + api.escapeHtml(item.category) + '</span>' +
        (item.demo ? '<p class="demo-listing-note"><strong>DEMO DATA</strong> · Example only, not a real pharmacy or verified stock.</p>' : '') +
        '<div class="pharmacy-meta"><div class="meta-item"><strong>' + api.escapeHtml(item.pharmacy.name) + '</strong>' + api.escapeHtml(item.pharmacy.address) + '</div><div class="meta-item"><strong>PIN ' + api.escapeHtml(item.pharmacy.pin) + '</strong><span class="availability-badge' + (item.available ? "" : " unavailable") + '">' + api.escapeHtml(availability) + '</span></div></div></div>' +
        '<div class="medicine-card-action"><div><p class="price-label">' + (item.demo ? "Example price" : "Pharmacy price") + '</p><span class="price-value">' + api.formatPrice(item.price) + '</span><p class="distance-label">Distance not available</p></div>' + contactAction + '</div>' +
        '</article>';
    }).join("");
    if (items.length) emptyState.hidden = true;
    else showEmpty("No matching pharmacy listings", "Try another medicine or PIN region, or adjust the filters.");
  }

  function showEmpty(title, description) {
    emptyState.hidden = false;
    emptyState.querySelector("h3").textContent = title;
    emptyState.querySelector("p").textContent = description;
  }
}());
