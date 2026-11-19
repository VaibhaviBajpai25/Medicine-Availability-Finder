const profileStorageKey = "medifinder-user-profile";
const favoritesStorageKey = "medifinder-favorites";
const dashboardMessage = document.querySelector("#dashboardMessage");

const showDashboardMessage = (message) => {
    if (dashboardMessage) dashboardMessage.textContent = message;
};

let profile;
try {
    const storedProfile = localStorage.getItem(profileStorageKey);
    if (!storedProfile) {
        window.location.replace("profile.html");
    } else {
        profile = JSON.parse(storedProfile);
    }
} catch {
    showDashboardMessage("Your profile could not be loaded from browser storage.");
}

if (profile && typeof profile === "object" && typeof profile.userId === "string" && typeof profile.name === "string") {
    const initials = profile.name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toLocaleUpperCase();
    const createdAt = new Date(profile.createdAt);
    const formattedCreatedDate = Number.isNaN(createdAt.getTime())
        ? "Recently"
        : new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(createdAt);
    const fillText = (selector, value, fallback = "Not added") => {
        const element = document.querySelector(selector);
        if (element) element.textContent = value || fallback;
    };

    fillText("#welcomeName", profile.name);
    fillText("#sceneName", profile.name);
    fillText("#sceneUserId", profile.userId);
    fillText("#dashboardUserId", profile.userId);
    fillText("#createdDate", formattedCreatedDate);
    fillText("#overviewName", profile.name);
    fillText("#overviewEmail", profile.email);
    fillText("#accountName", profile.name);
    fillText("#accountEmail", profile.email);
    fillText("#accountPhone", profile.phone);
    fillText("#accountArea", profile.area);
    const initialsElement = document.querySelector("#profileInitials");
    if (initialsElement) initialsElement.textContent = initials || "MF";

    try {
        const savedMedicines = JSON.parse(localStorage.getItem(favoritesStorageKey) || "[]");
        if (Array.isArray(savedMedicines) && savedMedicines.every((item) => typeof item === "string")) {
            fillText("#savedMedicineCount", String(savedMedicines.length).padStart(2, "0"));
        } else {
            fillText("#savedMedicineCount", "—");
            showDashboardMessage("Your saved medicine count could not be read.");
        }
    } catch {
        fillText("#savedMedicineCount", "—");
        showDashboardMessage("Your saved medicine count could not be read from browser storage.");
    }
} else if (profile) {
    showDashboardMessage("Your profile details are incomplete. Please update your profile before continuing.");
}

document.querySelector("#copyUserId")?.addEventListener("click", async (event) => {
    if (!profile || typeof profile.userId !== "string") {
        showDashboardMessage("Your MediFinder ID is unavailable to copy.");
        return;
    }

    try {
        await navigator.clipboard.writeText(profile.userId);
        const button = event.currentTarget;
        if (button instanceof HTMLButtonElement) {
            button.textContent = "Copied";
            window.setTimeout(() => {
                button.textContent = "Copy";
            }, 1600);
        }
        showDashboardMessage("Your MediFinder ID was copied.");
    } catch {
        showDashboardMessage("Could not copy the ID automatically. Select and copy the ID above.");
    }
});

if (window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) {
    document.querySelectorAll(".tilt-surface").forEach((surface) => {
        surface.addEventListener("pointermove", (event) => {
            const bounds = surface.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / bounds.width - 0.5;
            const y = (event.clientY - bounds.top) / bounds.height - 0.5;
            surface.style.setProperty("--tilt-x", `${(y * -6).toFixed(2)}deg`);
            surface.style.setProperty("--tilt-y", `${(x * 7).toFixed(2)}deg`);
        });
        surface.addEventListener("pointerleave", () => {
            surface.style.removeProperty("--tilt-x");
            surface.style.removeProperty("--tilt-y");
        });
    });
}
