const profileForm = document.querySelector("#profileForm");
const profileMessage = document.querySelector("#profileMessage");
const profileStorageKey = "medifinder-user-profile";
const pendingEmailKey = "medifinder-pending-email";
const profileEmail = document.querySelector("#profileEmail");
const dateOfBirth = document.querySelector("#dateOfBirth");
let existingProfile = null;
let pendingEmail = "";

const showProfileMessage = (message, isError = false) => {
    if (!profileMessage) return;
    profileMessage.textContent = message;
    profileMessage.classList.toggle("profile-message-error", isError);
};

try {
    pendingEmail = sessionStorage.getItem(pendingEmailKey) || "";
} catch {
    showProfileMessage("Session storage is unavailable. Please enter your email address.", true);
}

try {
    const storedProfile = localStorage.getItem(profileStorageKey);
    if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        if (parsedProfile && typeof parsedProfile === "object" && typeof parsedProfile.userId === "string") {
            existingProfile = parsedProfile;
        } else {
            showProfileMessage("Your saved profile could not be read. You can create a new one.", true);
        }
    }
} catch {
    showProfileMessage("Your saved profile could not be read. Browser storage may be unavailable.", true);
}

if (profileForm && profileEmail) {
    const shouldRestoreProfile = !pendingEmail || pendingEmail.toLocaleLowerCase() === existingProfile?.email?.toLocaleLowerCase();
    if (shouldRestoreProfile && existingProfile) {
        const fullName = document.querySelector("#fullName");
        const phone = document.querySelector("#phone");
        const area = document.querySelector("#area");
        if (fullName) fullName.value = existingProfile.name || "";
        profileEmail.value = existingProfile.email || "";
        if (phone) phone.value = existingProfile.phone || "";
        if (dateOfBirth) dateOfBirth.value = existingProfile.dateOfBirth || "";
        if (area) area.value = existingProfile.area || "";
    } else {
        profileEmail.value = pendingEmail;
    }

    profileForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(profileForm);
        const email = String(formData.get("email") || "").trim();
        const name = String(formData.get("name") || "").trim();
        const phone = String(formData.get("phone") || "").trim();
        const matchingProfile = existingProfile?.email?.toLocaleLowerCase() === email.toLocaleLowerCase()
            ? existingProfile
            : null;

        let userId = matchingProfile?.userId;
        if (!userId) {
            try {
                const randomBytes = new Uint8Array(8);
                window.crypto.getRandomValues(randomBytes);
                const randomPart = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
                userId = `MF-${new Date().getFullYear()}-${randomPart}`;
            } catch {
                showProfileMessage("A unique user ID could not be generated. Please use a modern browser and try again.", true);
                return;
            }
        }

        const profile = {
            userId,
            name,
            email,
            phone,
            dateOfBirth: String(formData.get("dateOfBirth") || ""),
            area: String(formData.get("area") || "").trim(),
            createdAt: matchingProfile?.createdAt || new Date().toISOString()
        };

        try {
            localStorage.setItem(profileStorageKey, JSON.stringify(profile));
        } catch {
            showProfileMessage("Your profile could not be saved. Check browser storage settings and try again.", true);
            return;
        }

        try {
            sessionStorage.removeItem(pendingEmailKey);
        } catch {
            showProfileMessage("Your profile was saved, but this browser could not clear the temporary login email.", true);
            window.location.href = "dashboard.html";
            return;
        }
        window.location.href = "dashboard.html";
    });
}
