const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#primary-menu");

if (menuToggle && navigation) {
    menuToggle.addEventListener("click", () => {
        const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
        menuToggle.setAttribute("aria-expanded", String(!isExpanded));
        navigation.classList.toggle("is-open", !isExpanded);
    });

    navigation.addEventListener("click", (event) => {
        if (event.target instanceof HTMLAnchorElement) {
            menuToggle.setAttribute("aria-expanded", "false");
            navigation.classList.remove("is-open");
        }
    });
}

const searchForm = document.querySelector("#medicineSearch");
const medicineQuery = document.querySelector("#medicineQuery");
const searchMessage = document.querySelector("#searchMessage");
const filterStatus = document.querySelector("#filterStatus");
const favoriteCount = document.querySelector("#favoriteCount");
const favoritesFilter = document.querySelector("[data-favorites-toggle]");
const categoryFilters = Array.from(document.querySelectorAll("button[data-category]"));
const medicineCards = Array.from(document.querySelectorAll(".medicine-card"));
const medicineEmpty = document.querySelector("#medicineEmpty");
const dashboardFavoriteCount = document.querySelector("#dashboardFavoriteCount");
const recentSearchList = document.querySelector("#recentSearchList");
const favoritesKey = "medifinder-favorites";
const recentSearchesKey = "medifinder-recent-searches";
let activeCategory = "all";
let favoritesOnly = false;
let currentQuery = "";
let favoriteIds = new Set();
let recentSearches = [];
let favoriteStorageMessage = "";

const updateFavoriteButton = (card) => {
    const medicineId = card.dataset.medicineId;
    const button = card.querySelector("[data-favorite]");
    const medicineName = card.querySelector("h3")?.textContent;
    if (!medicineId || !button || !medicineName) return;

    const isFavorite = favoriteIds.has(medicineId);
    button.setAttribute("aria-pressed", String(isFavorite));
    button.setAttribute("aria-label", `${isFavorite ? "Remove" : "Save"} ${medicineName} ${isFavorite ? "from" : "to"} saved medicines`);
    button.textContent = isFavorite ? "♥" : "♡";
};

const renderMedicines = () => {
    let visibleCount = 0;

    medicineCards.forEach((card) => {
        const matchesCategory = activeCategory === "all" || card.dataset.category === activeCategory;
        const matchesFavorite = !favoritesOnly || favoriteIds.has(card.dataset.medicineId || "");
        const matchesQuery = !currentQuery || card.textContent.toLocaleLowerCase().includes(currentQuery);
        const isVisible = matchesCategory && matchesFavorite && matchesQuery;
        card.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
    });

    if (favoriteCount) favoriteCount.textContent = String(favoriteIds.size);
    if (dashboardFavoriteCount) dashboardFavoriteCount.textContent = String(favoriteIds.size).padStart(2, "0");
    if (medicineEmpty) medicineEmpty.hidden = visibleCount > 0;
    const pharmacyCount = document.querySelectorAll(".pharmacy-card").length;
    const openPharmacyCount = document.querySelectorAll(".pharmacy-card .availability.available").length;
    const pharmacyCountDisplay = document.querySelector("#pharmacyCount");
    const openPharmacyCountDisplay = document.querySelector("#openPharmacyCount");
    if (pharmacyCountDisplay) pharmacyCountDisplay.textContent = String(pharmacyCount).padStart(2, "0");
    if (openPharmacyCountDisplay) openPharmacyCountDisplay.textContent = String(openPharmacyCount).padStart(2, "0");
    if (filterStatus) {
        const resultMessage = visibleCount
            ? `Showing ${visibleCount} ${visibleCount === 1 ? "medicine" : "medicines"}.`
            : "No medicines match these filters. Try another category or save a medicine first.";
        filterStatus.textContent = [resultMessage, favoriteStorageMessage].filter(Boolean).join(" ");
    }

    return visibleCount;
};

const renderRecentSearches = () => {
    if (!recentSearchList) return;
    recentSearchList.replaceChildren();

    if (!recentSearches.length) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "Your searches will show up here.";
        recentSearchList.append(emptyMessage);
        return;
    }

    recentSearches.forEach((query) => {
        const button = document.createElement("button");
        button.className = "recent-search-chip";
        button.type = "button";
        button.textContent = query;
        button.setAttribute("aria-label", `Search again for ${query}`);
        button.addEventListener("click", () => runMedicineSearch(query));
        recentSearchList.append(button);
    });
};

const rememberSearch = (query) => {
    recentSearches = [query, ...recentSearches.filter((item) => item.toLocaleLowerCase() !== query.toLocaleLowerCase())].slice(0, 3);
    renderRecentSearches();
    try {
        localStorage.setItem(recentSearchesKey, JSON.stringify(recentSearches));
    } catch {
        favoriteStorageMessage = "Recent searches will be available for this visit only.";
    }
};

function runMedicineSearch(query) {
    if (!medicineQuery || !searchMessage) return;
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
        searchMessage.textContent = "Enter a medicine name to see matching examples.";
        medicineQuery.focus();
        return;
    }

    medicineQuery.value = normalizedQuery;
    currentQuery = normalizedQuery.toLocaleLowerCase();
    rememberSearch(normalizedQuery);
    const visibleMatches = renderMedicines();
    searchMessage.textContent = visibleMatches
        ? `${visibleMatches} matching ${visibleMatches === 1 ? "medicine" : "medicines"} shown below. Availability varies by pharmacy.`
        : "No popular medicine matched. Try a medicine name shown below.";
    document.querySelector("#medicines")?.scrollIntoView({ behavior: "smooth" });
}

if (medicineCards.length) {
    try {
        const storedFavorites = JSON.parse(localStorage.getItem(favoritesKey) || "[]");
        if (Array.isArray(storedFavorites) && storedFavorites.every((id) => typeof id === "string")) {
            favoriteIds = new Set(storedFavorites);
        } else {
            favoriteStorageMessage = "Saved medicines could not be loaded. Your new saves will still work for this visit.";
        }
    } catch {
        favoriteStorageMessage = "Saved medicines are unavailable. Your new saves will still work for this visit.";
    }

    try {
        const storedSearches = JSON.parse(localStorage.getItem(recentSearchesKey) || "[]");
        if (Array.isArray(storedSearches) && storedSearches.every((item) => typeof item === "string")) {
            recentSearches = storedSearches.slice(0, 3);
        }
    } catch {
        favoriteStorageMessage = "Recent searches are unavailable. You can still search during this visit.";
    }

    medicineCards.forEach(updateFavoriteButton);
    renderMedicines();
    renderRecentSearches();

    categoryFilters.forEach((button) => {
        button.addEventListener("click", () => {
            activeCategory = button.dataset.category || "all";
            categoryFilters.forEach((filter) => {
                const isActive = filter === button;
                filter.classList.toggle("is-active", isActive);
                filter.setAttribute("aria-pressed", String(isActive));
            });
            if (searchMessage) searchMessage.textContent = "";
            renderMedicines();
        });
    });

    favoritesFilter.addEventListener("click", () => {
        favoritesOnly = !favoritesOnly;
        favoritesFilter.classList.toggle("is-active", favoritesOnly);
        favoritesFilter.setAttribute("aria-pressed", String(favoritesOnly));
        renderMedicines();
    });

    medicineCards.forEach((card) => {
        card.querySelector("[data-favorite]")?.addEventListener("click", () => {
            const medicineId = card.dataset.medicineId;
            if (!medicineId) return;

            if (favoriteIds.has(medicineId)) favoriteIds.delete(medicineId);
            else favoriteIds.add(medicineId);

            updateFavoriteButton(card);
            try {
                localStorage.setItem(favoritesKey, JSON.stringify([...favoriteIds]));
            } catch {
                favoriteStorageMessage = "Favorite saved for this visit, but browser storage is unavailable.";
            }
            renderMedicines();
        });
    });
}

if (searchForm && medicineQuery && searchMessage) {
    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        runMedicineSearch(medicineQuery.value);
    });

    medicineQuery.addEventListener("input", () => {
        if (!medicineQuery.value.trim()) {
            currentQuery = "";
            renderMedicines();
            searchMessage.textContent = "";
        }
    });
}

document.querySelectorAll("[data-quick-search]").forEach((button) => {
    button.addEventListener("click", () => runMedicineSearch(button.dataset.quickSearch || ""));
});

document.querySelector("#savedDashboardCard")?.addEventListener("click", () => {
    if (!favoritesFilter) return;
    if (!favoritesOnly) favoritesFilter.click();
    document.querySelector("#medicines")?.scrollIntoView({ behavior: "smooth" });
});

if (window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) {
    document.querySelectorAll(".dashboard-card, .tilt-surface").forEach((surface) => {
        surface.addEventListener("pointermove", (event) => {
            const bounds = surface.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / bounds.width - 0.5;
            const y = (event.clientY - bounds.top) / bounds.height - 0.5;
            surface.style.setProperty("--tilt-x", `${(y * -7).toFixed(2)}deg`);
            surface.style.setProperty("--tilt-y", `${(x * 9).toFixed(2)}deg`);
        });
        surface.addEventListener("pointerleave", () => {
            surface.style.removeProperty("--tilt-x");
            surface.style.removeProperty("--tilt-y");
        });
    });
}

const contactForm = document.querySelector("#contactForm");
const contactMessage = document.querySelector("#contactMessage");

if (contactForm && contactMessage) {
    contactForm.addEventListener("submit", (event) => {
        event.preventDefault();
        contactMessage.textContent = "Thanks for reaching out. Message delivery isn't connected yet.";
        contactForm.reset();
    });
}
