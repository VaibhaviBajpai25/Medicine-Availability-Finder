const sellerStorageKey = "medifinder-seller-profile";
const sellerForm = document.querySelector("#sellerForm");
const sellerMessage = document.querySelector("#sellerMessage");
const sellerRegistration = document.querySelector("#sellerRegistration");
const sellerDashboard = document.querySelector("#sellerDashboard");
const inventoryForm = document.querySelector("#inventoryForm");
const inventoryMessage = document.querySelector("#inventoryMessage");
const inventoryRows = document.querySelector("#inventoryRows");
const inventoryEmpty = document.querySelector("#inventoryEmpty");
const inventoryCount = document.querySelector("#inventoryCount");
const saveMedicineButton = document.querySelector("#saveMedicineButton");
const cancelMedicineEdit = document.querySelector("#cancelMedicineEdit");
let sellerProfile = null;
let editingMedicineKey = "";
let storageReadError = "";

const isValidInventoryItem = (item) => item
    && typeof item.medicine === "string"
    && typeof item.stock === "number"
    && Number.isSafeInteger(item.stock)
    && item.stock >= 0
    && typeof item.price === "number"
    && Number.isFinite(item.price)
    && item.price > 0;

const isValidSellerProfile = (profile) => profile
    && typeof profile === "object"
    && typeof profile.shopId === "string"
    && typeof profile.shopName === "string"
    && typeof profile.ownerName === "string"
    && typeof profile.email === "string"
    && typeof profile.phone === "string"
    && typeof profile.area === "string"
    && Array.isArray(profile.inventory)
    && profile.inventory.every(isValidInventoryItem);

const showSellerMessage = (message, isError = false) => {
    if (!sellerMessage) return;
    sellerMessage.textContent = message;
    sellerMessage.classList.toggle("profile-message-error", isError);
};

const showInventoryMessage = (message, isError = false) => {
    if (!inventoryMessage) return;
    inventoryMessage.textContent = message;
    inventoryMessage.classList.toggle("profile-message-error", isError);
};

const saveSellerProfile = (profile) => {
    try {
        localStorage.setItem(sellerStorageKey, JSON.stringify(profile));
        return true;
    } catch {
        return false;
    }
};

const getMedicineKey = (medicine) => medicine.trim().toLocaleLowerCase();

const formatPrice = (price) => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
}).format(price);

const resetInventoryForm = () => {
    inventoryForm?.reset();
    editingMedicineKey = "";
    if (saveMedicineButton) saveMedicineButton.innerHTML = 'Add to stock <span aria-hidden="true">+</span>';
    if (cancelMedicineEdit) cancelMedicineEdit.hidden = true;
};

const startEditingMedicine = (medicine) => {
    const item = sellerProfile?.inventory.find((entry) => getMedicineKey(entry.medicine) === medicine);
    if (!item) {
        showInventoryMessage("That medicine could not be found in your stock list.", true);
        return;
    }

    const medicineName = document.querySelector("#medicineName");
    const medicineStock = document.querySelector("#medicineStock");
    const medicinePrice = document.querySelector("#medicinePrice");
    if (!medicineName || !medicineStock || !medicinePrice) return;

    medicineName.value = item.medicine;
    medicineStock.value = String(item.stock);
    medicinePrice.value = String(item.price);
    editingMedicineKey = medicine;
    if (saveMedicineButton) saveMedicineButton.innerHTML = 'Update stock <span aria-hidden="true">→</span>';
    if (cancelMedicineEdit) cancelMedicineEdit.hidden = false;
    showInventoryMessage(`Editing ${item.medicine}. Save to update its stock and price.`);
    medicineName.focus();
    inventoryForm?.scrollIntoView({ behavior: "smooth", block: "center" });
}

const renderInventory = () => {
    if (!sellerProfile || !inventoryRows || !inventoryEmpty || !inventoryCount) return;

    inventoryRows.replaceChildren();
    sellerProfile.inventory.forEach((item) => {
        const row = document.createElement("tr");
        const medicineCell = document.createElement("td");
        const stockCell = document.createElement("td");
        const priceCell = document.createElement("td");
        const actionsCell = document.createElement("td");
        const actions = document.createElement("div");
        const editButton = document.createElement("button");
        const removeButton = document.createElement("button");
        const medicineKey = getMedicineKey(item.medicine);

        medicineCell.textContent = item.medicine;
        stockCell.textContent = String(item.stock);
        priceCell.textContent = formatPrice(item.price);
        actions.className = "inventory-row-actions";
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.setAttribute("aria-label", `Edit ${item.medicine}`);
        editButton.addEventListener("click", () => startEditingMedicine(medicineKey));
        removeButton.type = "button";
        removeButton.className = "inventory-remove";
        removeButton.textContent = "Remove";
        removeButton.setAttribute("aria-label", `Remove ${item.medicine} from stock`);
        removeButton.addEventListener("click", () => {
            const updatedProfile = {
                ...sellerProfile,
                inventory: sellerProfile.inventory.filter((entry) => getMedicineKey(entry.medicine) !== medicineKey)
            };
            if (!saveSellerProfile(updatedProfile)) {
                showInventoryMessage("This medicine could not be removed. Browser storage may be unavailable.", true);
                return;
            }
            sellerProfile = updatedProfile;
            if (editingMedicineKey === medicineKey) resetInventoryForm();
            renderInventory();
            showInventoryMessage(`${item.medicine} was removed from your stock.`);
        });

        actions.append(editButton, removeButton);
        actionsCell.append(actions);
        row.append(medicineCell, stockCell, priceCell, actionsCell);
        inventoryRows.append(row);
    });

    inventoryCount.textContent = String(sellerProfile.inventory.length);
    inventoryEmpty.hidden = sellerProfile.inventory.length > 0;
};

const renderSellerDashboard = () => {
    if (!sellerProfile || !sellerRegistration || !sellerDashboard) return;
    const fillText = (selector, value) => {
        const element = document.querySelector(selector);
        if (element) element.textContent = value;
    };

    fillText("#sellerWelcome", sellerProfile.ownerName);
    fillText("#shopId", sellerProfile.shopId);
    fillText("#registeredShopName", sellerProfile.shopName);
    fillText("#registeredOwner", sellerProfile.ownerName);
    fillText("#registeredArea", sellerProfile.area);
    sellerRegistration.hidden = true;
    sellerDashboard.hidden = false;
    renderInventory();
};

const createShopId = () => {
    if (!window.crypto?.getRandomValues) return null;
    const randomBytes = new Uint8Array(8);
    window.crypto.getRandomValues(randomBytes);
    const randomPart = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
    return `MF-SHOP-${new Date().getFullYear()}-${randomPart}`;
};

try {
    const storedProfile = localStorage.getItem(sellerStorageKey);
    if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        if (isValidSellerProfile(parsedProfile)) {
            sellerProfile = parsedProfile;
            renderSellerDashboard();
        } else {
            storageReadError = "Your saved seller profile could not be read. Clear this site's saved data before creating a new profile.";
            showSellerMessage(storageReadError, true);
        }
    }
} catch {
    storageReadError = "Your saved seller profile could not be read. Browser storage may be unavailable.";
    showSellerMessage(storageReadError, true);
}

sellerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (storageReadError) {
        showSellerMessage(storageReadError, true);
        return;
    }

    const formData = new FormData(sellerForm);
    const shopId = createShopId();
    if (!shopId) {
        showSellerMessage("A unique shop reference could not be generated. Please use a modern browser and try again.", true);
        return;
    }

    const profile = {
        shopId,
        shopName: String(formData.get("shopName") || "").trim(),
        ownerName: String(formData.get("ownerName") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        area: String(formData.get("area") || "").trim(),
        createdAt: new Date().toISOString(),
        inventory: []
    };

    if (!profile.shopName || !profile.ownerName || !profile.email || !profile.phone || !profile.area) {
        showSellerMessage("Complete each field with the requested shop and contact details.", true);
        return;
    }

    if (!saveSellerProfile(profile)) {
        showSellerMessage("Your seller profile could not be saved. Check browser storage settings and try again.", true);
        return;
    }

    sellerProfile = profile;
    renderSellerDashboard();
    document.querySelector("#sellerDashboardTitle")?.focus();
});

inventoryForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!sellerProfile) {
        showInventoryMessage("Create a seller profile before adding stock.", true);
        return;
    }

    const formData = new FormData(inventoryForm);
    const medicine = String(formData.get("medicine") || "").trim();
    const stock = Number(formData.get("stock"));
    const price = Number(formData.get("price"));
    if (!medicine || !Number.isSafeInteger(stock) || stock < 0 || stock > 1000000 || !Number.isFinite(price) || price <= 0 || price > 10000000) {
        showInventoryMessage("Enter a medicine name, a whole-number stock count, and a price greater than zero.", true);
        return;
    }

    const medicineKey = getMedicineKey(medicine);
    const matchingIndex = editingMedicineKey
        ? sellerProfile.inventory.findIndex((item) => getMedicineKey(item.medicine) === editingMedicineKey)
        : sellerProfile.inventory.findIndex((item) => getMedicineKey(item.medicine) === medicineKey);
    if (editingMedicineKey && matchingIndex < 0) {
        showInventoryMessage("That medicine could not be found. Refresh the page and try again.", true);
        return;
    }
    const duplicateIndex = sellerProfile.inventory.findIndex((item) => getMedicineKey(item.medicine) === medicineKey);
    if (duplicateIndex >= 0 && duplicateIndex !== matchingIndex) {
        showInventoryMessage("That medicine is already listed. Edit its existing stock entry instead.", true);
        return;
    }

    const updatedInventory = [...sellerProfile.inventory];
    if (matchingIndex >= 0) updatedInventory[matchingIndex] = { medicine, stock, price };
    else updatedInventory.push({ medicine, stock, price });

    const updatedProfile = { ...sellerProfile, inventory: updatedInventory };
    if (!saveSellerProfile(updatedProfile)) {
        showInventoryMessage("Your stock could not be saved. Check browser storage settings and try again.", true);
        return;
    }

    sellerProfile = updatedProfile;
    renderInventory();
    resetInventoryForm();
    showInventoryMessage(`${medicine} stock and price were saved.`);
});

cancelMedicineEdit?.addEventListener("click", () => {
    resetInventoryForm();
    showInventoryMessage("Stock edit cancelled.");
});

document.querySelector("#copyShopId")?.addEventListener("click", async (event) => {
    if (!sellerProfile?.shopId) {
        showInventoryMessage("Your shop reference is unavailable to copy.", true);
        return;
    }

    try {
        await navigator.clipboard.writeText(sellerProfile.shopId);
        const button = event.currentTarget;
        if (button instanceof HTMLButtonElement) {
            button.textContent = "Copied";
            window.setTimeout(() => {
                button.textContent = "Copy";
            }, 1600);
        }
        showInventoryMessage("Your shop reference was copied.");
    } catch {
        showInventoryMessage("Could not copy the shop reference automatically. Select and copy the ID above.", true);
    }
});

if (window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) {
    const shopIdCard = document.querySelector(".shop-id-card");
    shopIdCard?.addEventListener("pointermove", (event) => {
        const bounds = shopIdCard.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        shopIdCard.style.setProperty("--tilt-x", `${(y * -5).toFixed(2)}deg`);
        shopIdCard.style.setProperty("--tilt-y", `${(x * 6).toFixed(2)}deg`);
    });
    shopIdCard?.addEventListener("pointerleave", () => {
        shopIdCard.style.removeProperty("--tilt-x");
        shopIdCard.style.removeProperty("--tilt-y");
    });
}
