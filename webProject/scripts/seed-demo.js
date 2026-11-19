require("dotenv").config();

const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/medi_finder";
const allowedHosts = ["127.0.0.1", "localhost", "::1"];
const demoPharmacies = [
  {
    key: "north",
    name: "DEMO · Northside Pharmacy",
    address: "DEMO ADDRESS · Bengaluru, Karnataka",
    pin: "560001",
    inventory: [
      { name: "Paracetamol 500 mg", manufacturer: "Example Manufacturer", category: "Pain relief", price: 20, quantity: 25 },
      { name: "Dolo 650", manufacturer: "Example Manufacturer", category: "Pain relief", price: 32, quantity: 18 },
      { name: "Cetirizine 10 mg", manufacturer: "Example Manufacturer", category: "Allergy", price: 18, quantity: 30 },
      { name: "ORS Sachets", manufacturer: "Example Nutrition", category: "Hydration", price: 20, quantity: 40 }
    ]
  },
  {
    key: "central",
    name: "DEMO · Central Pharmacy",
    address: "DEMO ADDRESS · Bengaluru, Karnataka",
    pin: "560034",
    inventory: [
      { name: "Crocin 650", manufacturer: "Example Manufacturer", category: "Pain relief", price: 35, quantity: 14 },
      { name: "Azithromycin 500 mg", manufacturer: "Example Manufacturer", category: "Antibiotic", price: 80, quantity: 8 },
      { name: "Vitamin C 500 mg", manufacturer: "Example Nutrition", category: "Vitamins", price: 45, quantity: 22 },
      { name: "Paracetamol 500 mg", manufacturer: "Example Manufacturer", category: "Pain relief", price: 24, quantity: 0 }
    ]
  },
  {
    key: "south",
    name: "DEMO · Southside Pharmacy",
    address: "DEMO ADDRESS · Bengaluru, Karnataka",
    pin: "560066",
    inventory: [
      { name: "Dolo 650", manufacturer: "Example Manufacturer", category: "Pain relief", price: 30, quantity: 12 },
      { name: "Cetirizine 10 mg", manufacturer: "Example Manufacturer", category: "Allergy", price: 20, quantity: 0 },
      { name: "Vitamin C 500 mg", manufacturer: "Example Nutrition", category: "Vitamins", price: 50, quantity: 16 }
    ]
  }
];

function stableObjectId(value) {
  return new mongoose.Types.ObjectId(crypto.createHash("sha256").update(value).digest("hex").slice(0, 24));
}

async function seedDemoData() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo data cannot be seeded when NODE_ENV=production.");
  }
  const host = new URL(mongoUri).hostname.replace(/^\[|\]$/g, "");
  if (!allowedHosts.includes(host)) {
    throw new Error("Demo data can only be seeded into a local MongoDB instance.");
  }

  await mongoose.connect(mongoUri);
  const users = mongoose.connection.collection("users");
  const inventory = mongoose.connection.collection("inventoryitems");
  let totalItems = 0;

  for (const pharmacy of demoPharmacies) {
    const email = "demo-" + pharmacy.key + "@demo.medifinder.local";
    let account = await users.findOne({ email: email });
    if (account && (account.role !== "pharmacy" || !account.pharmacy || account.pharmacy.isDemo !== true)) {
      throw new Error("Reserved demo email is already used by a non-demo account: " + email);
    }

    const now = new Date();
    const accountId = account ? account._id : stableObjectId("medi-finder-demo-account:" + pharmacy.key);
    const passwordHash = account ? undefined : await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
    const setOnInsert = {
      _id: accountId,
      passwordHash: passwordHash,
      favorites: [],
      recentSearches: [],
      createdAt: now
    };
    await users.updateOne({ _id: accountId }, {
      $set: {
        name: pharmacy.name,
        email: email,
        phone: "",
        pin: pharmacy.pin,
        role: "pharmacy",
        pharmacy: {
          name: pharmacy.name,
          address: pharmacy.address,
          licenseNumber: "DEMO-NOT-A-REAL-LICENSE",
          status: "approved",
          reviewedAt: now,
          isDemo: true
        },
        updatedAt: now
      },
      $setOnInsert: setOnInsert
    }, { upsert: true });

    for (const item of pharmacy.inventory) {
      const itemId = stableObjectId("medi-finder-demo-inventory:" + pharmacy.key + ":" + item.name);
      const existingItem = await inventory.findOne({ _id: itemId });
      if (existingItem && existingItem.isDemo !== true) {
        throw new Error("A non-demo inventory record conflicts with a demo seed ID.");
      }
      const createdAt = existingItem ? existingItem.createdAt : now;
      await inventory.updateOne({ _id: itemId }, {
        $set: {
          pharmacy: accountId,
          name: item.name,
          manufacturer: item.manufacturer,
          category: item.category,
          price: item.price,
          quantity: item.quantity,
          suppliedTotal: item.quantity,
          isDemo: true,
          stockHistory: item.quantity > 0 ? [{
            _id: new mongoose.Types.ObjectId(),
            action: "restock",
            change: item.quantity,
            note: "Demo data",
            createdAt: now
          }] : [],
          createdAt: createdAt,
          updatedAt: now
        },
        $setOnInsert: { _id: itemId }
      }, { upsert: true });
      totalItems += 1;
    }
  }

  console.log("Seeded " + demoPharmacies.length + " clearly labeled demo pharmacies and " + totalItems + " demo medicine listings.");
  console.log("Search Paracetamol with PIN 560001. These records are examples only, not real pharmacies or verified inventory.");
}

seedDemoData()
  .catch(function (error) {
    console.error("Could not seed demo data:", error.message);
    process.exitCode = 1;
  })
  .finally(function () {
    return mongoose.disconnect();
  });
