require("dotenv").config();

const crypto = require("node:crypto");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const connectMongo = require("connect-mongo");
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const session = require("express-session");
const helmet = require("helmet");
const mongoose = require("mongoose");

const app = express();
const port = Number(process.env.PORT || 3000);
const root = __dirname;
const categories = ["Pain relief", "Allergy", "Antibiotic", "Vitamins", "Hydration", "Other"];
const sessionSecret = process.env.SESSION_SECRET || "local-development-only-change-this-secret";

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set in production.");
}

const pharmacyDetailsSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  address: { type: String, required: true, trim: true, maxlength: 240 },
  licenseNumber: { type: String, required: true, trim: true, maxlength: 80 },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  reviewedAt: { type: Date, default: null },
  isDemo: { type: Boolean, default: false }
}, { _id: false });

const recentSearchSchema = new mongoose.Schema({
  medicine: { type: String, required: true },
  pin: { type: String, required: true },
  searchedAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  phone: { type: String, required: true, trim: true },
  pin: { type: String, required: true, match: /^\d{6}$/ },
  role: { type: String, enum: ["user", "pharmacy"], required: true, default: "user" },
  pharmacy: { type: pharmacyDetailsSchema, default: undefined },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "InventoryItem" }],
  recentSearches: { type: [recentSearchSchema], default: [] }
}, { timestamps: true });

const stockEventSchema = new mongoose.Schema({
  action: { type: String, enum: ["restock", "adjustment"], required: true },
  change: { type: Number, required: true },
  note: { type: String, trim: true, maxlength: 160, default: "" },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const inventorySchema = new mongoose.Schema({
  pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  manufacturer: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, enum: categories, required: true },
  price: { type: Number, required: true, min: 0, max: 1000000 },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  suppliedTotal: { type: Number, min: 0, default: 0 },
  isDemo: { type: Boolean, default: false },
  stockHistory: { type: [stockEventSchema], default: [] }
}, { timestamps: true });

inventorySchema.index({ name: "text", manufacturer: "text" });

const User = mongoose.model("User", userSchema);
const InventoryItem = mongoose.model("InventoryItem", inventorySchema);

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: "16kb" }));
app.use("/api", function (req, res, next) {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      req.get("X-Requested-With") !== "XMLHttpRequest") {
    return res.status(403).json({ error: "This request could not be verified." });
  }
  next();
});
app.use(session({
  name: "medi_finder.sid",
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: connectMongo.create({
    mongoUrl: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/medi_finder",
    collectionName: "sessions",
    ttl: 60 * 60 * 24 * 7
  }),
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." }
});

function isValidPhone(phone) {
  return /^[+()\d\s-]{10,18}$/.test(phone) && phone.replace(/\D/g, "").length >= 10;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    pin: user.pin,
    role: user.role,
    pharmacy: user.pharmacy ? {
      name: user.pharmacy.name,
      address: user.pharmacy.address,
      licenseNumber: user.pharmacy.licenseNumber,
      status: user.pharmacy.status
    } : null,
    recentSearches: user.recentSearches || [],
    favorites: Array.isArray(user.favorites) ? user.favorites.filter(function (item) {
      return item && item.name;
    }).map(function (item) {
      const pharmacy = item.pharmacy;
      return {
        id: item._id.toString(),
        name: item.name,
        manufacturer: item.manufacturer,
        category: item.category,
        price: item.price,
        pharmacy: pharmacy ? {
          name: pharmacy.pharmacy.name,
          pin: pharmacy.pin
        } : null
      };
    }) : []
  };
}

function regenerateSession(req, userId, role) {
  return new Promise(function (resolve, reject) {
    req.session.regenerate(function (error) {
      if (error) return reject(error);
      req.session.userId = userId;
      req.session.role = role;
      resolve();
    });
  });
}

function requireRole(role) {
  return async function (req, res, next) {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Please log in to continue." });
    }
    const user = await User.findById(req.session.userId);
    if (!user || user.role !== role) {
      return res.status(403).json({ error: "This account cannot access that area." });
    }
    req.user = user;
    next();
  };
}

function requireCurrentPharmacy(req, res, next) {
  if (req.user.pharmacy.status === "rejected") {
    return res.status(403).json({ error: "This pharmacy application was rejected. Contact the administrator for next steps." });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.session.role !== "admin") {
    return res.status(401).json({ error: "Administrator login required." });
  }
  next();
}

function jsonSessionDestroy(req, res) {
  req.session.destroy(function (error) {
    if (error) return res.status(500).json({ error: "Could not end the session." });
    res.clearCookie("medi_finder.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    res.json({ ok: true });
  });
}

app.get("/api/health", function (req, res) {
  res.json({ status: mongoose.connection.readyState === 1 ? "ok" : "database unavailable" });
});

app.post("/api/auth/signup", authLimiter, async function (req, res) {
  const body = req.body || {};
  const role = body.role;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !isValidPhone(phone) || !/^\d{6}$/.test(pin) || password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72 ||
      !["user", "pharmacy"].includes(role)) {
    return res.status(400).json({ error: "Check your name, email, phone, PIN, account type, and password (8–72 bytes)." });
  }

  let pharmacy;
  if (role === "pharmacy") {
    const pharmacyName = typeof body.pharmacyName === "string" ? body.pharmacyName.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const licenseNumber = typeof body.licenseNumber === "string" ? body.licenseNumber.trim() : "";
    if (!pharmacyName || !address || !licenseNumber) {
      return res.status(400).json({ error: "Pharmacy name, address, and license/registration number are required." });
    }
    pharmacy = { name: pharmacyName, address: address, licenseNumber: licenseNumber, status: "pending" };
  }

  const existingUser = await User.findOne({ email }).select("_id");
  if (existingUser) return res.status(409).json({ error: "An account with this email already exists." });

  const user = await User.create({
    name: name,
    email: email,
    passwordHash: await bcrypt.hash(password, 12),
    phone: phone,
    pin: pin,
    role: role,
    pharmacy: pharmacy
  });
  await regenerateSession(req, user._id.toString(), role);
  res.status(201).json({ user: publicUser(user) });
});

app.post("/api/auth/login", authLimiter, async function (req, res) {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (Buffer.byteLength(password, "utf8") > 72) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  await regenerateSession(req, user._id.toString(), user.role);
  req.session.cookie.maxAge = req.body.remember ? 1000 * 60 * 60 * 24 * 7 : null;
  res.json({ user: publicUser(user) });
});

app.get("/api/auth/me", async function (req, res) {
  if (!req.session.userId) return res.json({ user: null });
  if (req.session.role === "admin") {
    return res.json({ user: { role: "admin", name: "Administrator" } });
  }
  const user = await User.findById(req.session.userId)
    .populate({ path: "favorites", populate: { path: "pharmacy", select: "pin pharmacy" } });
  if (!user) {
    return jsonSessionDestroy(req, res);
  }
  res.json({ user: publicUser(user) });
});

app.post("/api/auth/logout", jsonSessionDestroy);

app.patch("/api/auth/profile", requireRole("user"), async function (req, res) {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
  const pin = typeof req.body.pin === "string" ? req.body.pin.trim() : "";
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !isValidPhone(phone) || !/^\d{6}$/.test(pin)) {
    return res.status(400).json({ error: "Enter a valid name, email, phone number, and 6-digit PIN." });
  }
  const duplicate = await User.findOne({ email, _id: { $ne: req.user._id } }).select("_id");
  if (duplicate) return res.status(409).json({ error: "Another account already uses this email." });
  req.user.name = name;
  req.user.email = email;
  req.user.phone = phone;
  req.user.pin = pin;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

app.get("/api/medicines", async function (req, res) {
  const medicine = typeof req.query.medicine === "string" ? req.query.medicine.trim() : "";
  const pin = typeof req.query.pin === "string" ? req.query.pin.trim() : "";
  const category = typeof req.query.category === "string" ? req.query.category : "";
  const availability = typeof req.query.availability === "string" ? req.query.availability : "";
  const maxPrice = req.query.maxPrice === undefined ? null : Number(req.query.maxPrice);
  if (!medicine || medicine.length > 120 || !/^\d{6}$/.test(pin) ||
      (category && !categories.includes(category)) ||
      !["", "available", "unavailable"].includes(availability) ||
      (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0))) {
    return res.status(400).json({ error: "Enter a medicine name and valid 6-digit PIN, then check your filters." });
  }

  const pinRegion = new RegExp("^" + escapeRegex(pin.slice(0, 3)));
  const pharmacyAccounts = await User.find({
    role: "pharmacy",
    "pharmacy.status": "approved",
    pin: pinRegion
  }).select("name phone pin pharmacy");
  const pharmacyIds = pharmacyAccounts.map(function (pharmacy) { return pharmacy._id; });
  if (!pharmacyIds.length) return res.json({ items: [] });

  const filter = {
    pharmacy: { $in: pharmacyIds },
    name: { $regex: escapeRegex(medicine), $options: "i" }
  };
  if (category) filter.category = category;
  if (availability === "available") filter.quantity = { $gt: 0 };
  if (availability === "unavailable") filter.quantity = 0;
  if (maxPrice !== null) filter.price = { $lte: maxPrice };

  const items = await InventoryItem.find(filter).sort({ price: 1, name: 1 })
    .populate("pharmacy", "name phone pin pharmacy");
  res.json({
    items: items.map(function (item) {
      return {
        id: item._id.toString(),
        name: item.name,
        manufacturer: item.manufacturer,
        category: item.category,
        price: item.price,
        quantity: item.quantity,
        available: item.quantity > 0,
        demo: Boolean(item.isDemo || item.pharmacy.pharmacy.isDemo),
        pharmacy: {
          name: item.pharmacy.pharmacy.name,
          address: item.pharmacy.pharmacy.address,
          phone: item.isDemo || item.pharmacy.pharmacy.isDemo ? "" : item.pharmacy.phone,
          pin: item.pharmacy.pin
        }
      };
    })
  });
});

app.post("/api/users/me/searches", requireRole("user"), async function (req, res) {
  const medicine = typeof req.body.medicine === "string" ? req.body.medicine.trim() : "";
  const pin = typeof req.body.pin === "string" ? req.body.pin.trim() : "";
  if (!medicine || medicine.length > 120 || !/^\d{6}$/.test(pin)) {
    return res.status(400).json({ error: "A medicine name and valid PIN are required." });
  }
  req.user.recentSearches = req.user.recentSearches.filter(function (item) {
    return item.medicine.toLowerCase() !== medicine.toLowerCase() || item.pin !== pin;
  });
  req.user.recentSearches.unshift({ medicine: medicine, pin: pin, searchedAt: new Date() });
  req.user.recentSearches = req.user.recentSearches.slice(0, 8);
  await req.user.save();
  res.json({ recentSearches: req.user.recentSearches });
});

app.post("/api/users/me/favorites", requireRole("user"), async function (req, res) {
  const inventoryId = typeof req.body.inventoryId === "string" ? req.body.inventoryId : "";
  if (!mongoose.isValidObjectId(inventoryId)) {
    return res.status(400).json({ error: "Choose a valid medicine listing." });
  }
  const item = await InventoryItem.findById(inventoryId).populate("pharmacy", "pharmacy");
  if (!item || !item.pharmacy || item.pharmacy.pharmacy.status !== "approved") {
    return res.status(404).json({ error: "That medicine listing is no longer available." });
  }
  const alreadySaved = req.user.favorites.some(function (favoriteId) { return favoriteId.equals(item._id); });
  await User.updateOne(
    { _id: req.user._id },
    alreadySaved ? { $pull: { favorites: item._id } } : { $addToSet: { favorites: item._id } }
  );
  const user = await User.findById(req.user._id)
    .populate({ path: "favorites", populate: { path: "pharmacy", select: "pin pharmacy" } });
  res.json({ favorites: publicUser(user).favorites });
});

app.get("/api/pharmacies/featured", async function (req, res) {
  const pharmacies = await User.find({
    role: "pharmacy",
    "pharmacy.status": "approved",
    "pharmacy.isDemo": { $ne: true }
  })
    .select("phone pin pharmacy").sort({ "pharmacy.name": 1 }).limit(3);
  const items = await Promise.all(pharmacies.map(async function (pharmacy) {
    const medicineCount = await InventoryItem.countDocuments({ pharmacy: pharmacy._id });
    return {
      name: pharmacy.pharmacy.name,
      address: pharmacy.pharmacy.address,
      pin: pharmacy.pin,
      phone: pharmacy.phone,
      medicineCount: medicineCount
    };
  }));
  res.json({ pharmacies: items });
});

app.get("/api/pharmacy/dashboard", requireRole("pharmacy"), async function (req, res) {
  const items = await InventoryItem.find({ pharmacy: req.user._id }).sort({ updatedAt: -1 });
  const history = items.flatMap(function (item) {
    return item.stockHistory.map(function (entry) {
      return {
        inventoryId: item._id.toString(),
        medicine: item.name,
        action: entry.action,
        change: entry.change,
        note: entry.note,
        createdAt: entry.createdAt
      };
    });
  }).sort(function (left, right) { return new Date(right.createdAt) - new Date(left.createdAt); }).slice(0, 30);
  const totalUnits = items.reduce(function (sum, item) { return sum + item.quantity; }, 0);
  const totalSupplied = items.reduce(function (sum, item) { return sum + item.suppliedTotal; }, 0);
  res.json({
    pharmacy: {
      name: req.user.pharmacy.name,
      status: req.user.pharmacy.status,
      pin: req.user.pin,
      address: req.user.pharmacy.address
    },
    stats: { medicineCount: items.length, totalUnits: totalUnits, totalSupplied: totalSupplied },
    items: items.map(function (item) {
      return {
        id: item._id.toString(),
        name: item.name,
        manufacturer: item.manufacturer,
        category: item.category,
        price: item.price,
        quantity: item.quantity,
        updatedAt: item.updatedAt
      };
    }),
    history: history
  });
});

app.post("/api/pharmacy/inventory", requireRole("pharmacy"), requireCurrentPharmacy, async function (req, res) {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const manufacturer = typeof req.body.manufacturer === "string" ? req.body.manufacturer.trim() : "";
  const category = typeof req.body.category === "string" ? req.body.category : "";
  const price = Number(req.body.price);
  const quantity = Number(req.body.quantity);
  if (!name || name.length > 120 || !manufacturer || manufacturer.length > 120 ||
      !categories.includes(category) || !Number.isFinite(price) || price < 0 ||
      !Number.isInteger(quantity) || quantity < 0 || quantity > 1000000) {
    return res.status(400).json({ error: "Check the medicine name, manufacturer, category, price, and stock quantity." });
  }
  const stockHistory = quantity > 0 ? [{ action: "restock", change: quantity, note: "Initial stock" }] : [];
  const item = await InventoryItem.create({
    pharmacy: req.user._id,
    name: name,
    manufacturer: manufacturer,
    category: category,
    price: price,
    quantity: quantity,
    suppliedTotal: quantity,
    stockHistory: stockHistory
  });
  res.status(201).json({ item: { id: item._id.toString(), name: item.name, quantity: item.quantity } });
});

app.patch("/api/pharmacy/inventory/:id/stock", requireRole("pharmacy"), requireCurrentPharmacy, async function (req, res) {
  const itemId = req.params.id;
  const action = req.body.action;
  const quantity = Number(req.body.quantity);
  const note = typeof req.body.note === "string" ? req.body.note.trim().slice(0, 160) : "";
  if (!mongoose.isValidObjectId(itemId) || !["restock", "adjustment"].includes(action) ||
      !Number.isInteger(quantity) || quantity < 1 || quantity > 1000000) {
    return res.status(400).json({ error: "Choose a valid stock action and a whole-number quantity greater than zero." });
  }
  const change = action === "restock" ? quantity : -quantity;
  const filter = { _id: itemId, pharmacy: req.user._id };
  if (change < 0) filter.quantity = { $gte: quantity };
  else filter.quantity = { $lte: 1000000 - quantity };
  const update = {
    $inc: { quantity: change },
    $push: { stockHistory: { $each: [{ action: action, change: change, note: note }], $slice: -500 } }
  };
  if (action === "restock") update.$inc.suppliedTotal = quantity;
  const item = await InventoryItem.findOneAndUpdate(filter, update, { new: true, runValidators: true });
  if (!item) {
    const ownedItem = await InventoryItem.exists({ _id: itemId, pharmacy: req.user._id });
    if (!ownedItem) return res.status(404).json({ error: "Medicine listing not found." });
    return res.status(400).json({
      error: action === "restock" ? "Stock cannot exceed 1,000,000 units." : "Stock cannot be reduced below zero."
    });
  }
  res.json({ item: { id: item._id.toString(), name: item.name, quantity: item.quantity } });
});

app.post("/api/admin/login", authLimiter, async function (req, res) {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const expectedEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD || "";
  if (!expectedEmail || !expectedPassword) {
    return res.status(503).json({ error: "Admin access is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env." });
  }
  if (!timingSafeEqual(email, expectedEmail) || !timingSafeEqual(password, expectedPassword)) {
    return res.status(401).json({ error: "Administrator email or password is incorrect." });
  }
  await regenerateSession(req, "admin", "admin");
  res.json({ ok: true });
});

app.get("/api/admin/pharmacies", requireAdmin, async function (req, res) {
  const pharmacies = await User.find({ role: "pharmacy", "pharmacy.status": "pending" })
    .select("name email phone pin pharmacy createdAt").sort({ createdAt: 1 });
  res.json({
    pharmacies: pharmacies.map(function (user) {
      return {
        id: user._id.toString(),
        owner: user.name,
        email: user.email,
        phone: user.phone,
        pin: user.pin,
        name: user.pharmacy.name,
        address: user.pharmacy.address,
        licenseNumber: user.pharmacy.licenseNumber,
        createdAt: user.createdAt
      };
    })
  });
});

app.patch("/api/admin/pharmacies/:id", requireAdmin, async function (req, res) {
  const status = req.body.status;
  if (!mongoose.isValidObjectId(req.params.id) || !["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Choose a valid pharmacy and approval decision." });
  }
  const pharmacy = await User.findOneAndUpdate({
    _id: req.params.id,
    role: "pharmacy",
    "pharmacy.status": "pending"
  }, {
    $set: { "pharmacy.status": status, "pharmacy.reviewedAt": new Date() }
  }, { new: true });
  if (!pharmacy) return res.status(404).json({ error: "Pending pharmacy application not found." });
  res.json({ id: pharmacy._id.toString(), status: pharmacy.pharmacy.status });
});

app.post("/api/auth/reset-password", function (req, res) {
  res.status(501).json({ error: "Password reset is not configured. Ask your site administrator to enable verified email recovery." });
});

app.get(["/", "/index.html", "/medicines.html", "/login.html", "/signup.html", "/profile.html", "/pharmacy.html", "/admin.html"], function (req, res) {
  const page = req.path === "/" ? "index.html" : req.path.slice(1);
  res.sendFile(path.join(root, page));
});
app.use("/css", express.static(path.join(root, "css"), { index: false, dotfiles: "deny" }));
app.use("/js", express.static(path.join(root, "js"), { index: false, dotfiles: "deny" }));
app.use("/images", express.static(path.join(root, "images"), { index: false, dotfiles: "deny" }));
app.use(function (req, res) {
  res.status(404).json({ error: "Not found." });
});

app.use(function (error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error && error.code === 11000) return res.status(409).json({ error: "An account with this email already exists." });
  if (error && error.name === "ValidationError") return res.status(400).json({ error: error.message });
  if (error && error.name === "CastError") return res.status(400).json({ error: "Invalid record identifier." });
  if (error && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ error: "The request could not be processed." });
  }
  console.error(error);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

async function start() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/medi_finder");
  app.listen(port, "127.0.0.1", function () {
    console.log("Medi Finder is running at http://127.0.0.1:" + port);
  });
}

start().catch(function (error) {
  console.error("Could not connect to MongoDB. Check that MongoDB is running and MONGODB_URI is correct.", error.message);
  process.exitCode = 1;
});
