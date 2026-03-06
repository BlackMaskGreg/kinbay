const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

const DEFAULT_STORE = {
  users: [],
  sessions: [],
  cartsByUser: {},
  purchasesByUser: {},
  ordersByUser: {},
  serviceOrdersByUser: {},
};

const PRODUCT_CATALOG = [
  {
    id: "cv-template-pack",
    title: "Astra Pro Premium WordPress Theme",
    category: "Themes",
    price: 19,
  },
  {
    id: "portfolio-kit",
    title: "Elementor Pro Website Builder Plugin",
    category: "Plugins",
    price: 24,
  },
  {
    id: "job-hunt-playbook",
    title: "WooCommerce Product Addons Toolkit",
    category: "Plugins",
    price: 14,
  },
  {
    id: "social-bundle",
    title: "Modern Admin Dashboard HTML Template",
    category: "Templates",
    price: 17,
  },
  {
    id: "audio-brand-pack",
    title: "WordPress Security Booster Bundle",
    category: "Security",
    price: 29,
  },
  {
    id: "client-onboarding",
    title: "SaaS Landing Page React Template",
    category: "Templates",
    price: 22,
  },
  {
    id: "pitch-deck",
    title: "Membership Pro Business Script",
    category: "Scripts",
    price: 31,
  },
  {
    id: "youtube-thumbnail",
    title: "Premium Icon Pack Collection",
    category: "Assets",
    price: 16,
  },
];

const PRODUCT_IDS = new Set(PRODUCT_CATALOG.map((item) => item.id));
const PRODUCT_MAP = new Map(PRODUCT_CATALOG.map((item) => [item.id, item]));

const SERVICE_IDS = new Set(["cv-writing", "linkedin-refresh", "cover-letter", "portfolio-review"]);
const PACKAGE_TIERS = new Set(["Starter", "Standard", "Premium"]);
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

ensureDataFile();
let store = loadStore();

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    pruneExpiredSessions();

    if (requestUrl.pathname.startsWith("/api/")) {
      await handleApi(req, res, requestUrl);
      return;
    }

    serveStatic(req, res, requestUrl);
  } catch (error) {
    console.error("Unhandled server error:", error);
    sendJson(res, 500, { error: "Internal server error." });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Kinnbay server running at http://localhost:${PORT}`);
});

async function handleApi(req, res, requestUrl) {
  const pathname = requestUrl.pathname;

  if (pathname === "/api/health") {
    if (!isMethod(req, ["GET"])) {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    sendJson(res, 200, { ok: true, service: "kinnbay-api" });
    return;
  }

  if (pathname === "/api/catalog/products") {
    if (!isMethod(req, ["GET"])) {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    sendJson(res, 200, { products: PRODUCT_CATALOG });
    return;
  }

  if (pathname === "/api/auth/signup") {
    if (!isMethod(req, ["POST"])) {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    const body = await parseJsonBody(req, res);
    if (!body) return;

    const fullName = String(body.fullName || "").trim();
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (fullName.length < 2) {
      sendJson(res, 400, { error: "Full name must be at least 2 characters." });
      return;
    }

    if (!isValidEmail(email)) {
      sendJson(res, 400, { error: "Enter a valid email address." });
      return;
    }

    if (password.length < 8) {
      sendJson(res, 400, { error: "Password must be at least 8 characters." });
      return;
    }

    const duplicate = store.users.find((item) => item.email === email);
    if (duplicate) {
      sendJson(res, 409, { error: "An account with this email already exists." });
      return;
    }

    const passwordSalt = makeToken(16);
    const passwordHash = hashPassword(password, passwordSalt);
    const user = {
      id: makeUserId(),
      fullName,
      email,
      passwordSalt,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    store.users.push(user);
    store.cartsByUser[user.id] = [];
    store.purchasesByUser[user.id] = [];
    store.ordersByUser[user.id] = [];
    store.serviceOrdersByUser[user.id] = [];

    const token = issueSession(user.id);
    persistStore();

    sendJson(res, 201, {
      token,
      user: sanitizeUser(user),
      state: getUserState(user.id),
    });
    return;
  }

  if (pathname === "/api/auth/login") {
    if (!isMethod(req, ["POST"])) {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    const body = await parseJsonBody(req, res);
    if (!body) return;

    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    if (!isValidEmail(email) || !password) {
      sendJson(res, 400, { error: "Enter email and password." });
      return;
    }

    const user = store.users.find((item) => item.email === email);
    if (!user) {
      sendJson(res, 401, { error: "Invalid email or password." });
      return;
    }

    const passwordHash = hashPassword(password, user.passwordSalt);
    if (!safeEqualHex(passwordHash, user.passwordHash)) {
      sendJson(res, 401, { error: "Invalid email or password." });
      return;
    }

    const token = issueSession(user.id);
    persistStore();

    sendJson(res, 200, {
      token,
      user: sanitizeUser(user),
      state: getUserState(user.id),
    });
    return;
  }

  if (pathname === "/api/auth/me") {
    if (!isMethod(req, ["GET"])) {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    const auth = getAuth(req);
    if (!auth) {
      sendJson(res, 401, { error: "Unauthorized." });
      return;
    }

    persistStore();
    sendJson(res, 200, {
      user: sanitizeUser(auth.user),
      state: getUserState(auth.user.id),
    });
    return;
  }

  if (pathname === "/api/auth/logout") {
    if (!isMethod(req, ["POST"])) {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    const token = readBearerToken(req);
    if (token) {
      store.sessions = store.sessions.filter((session) => session.token !== token);
      persistStore();
    }

    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === "/api/user/state") {
    if (!isMethod(req, ["GET"])) {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    const auth = getAuth(req);
    if (!auth) {
      sendJson(res, 401, { error: "Unauthorized." });
      return;
    }

    persistStore();
    sendJson(res, 200, getUserState(auth.user.id));
    return;
  }

  if (pathname === "/api/user/cart") {
    if (!isMethod(req, ["PUT"])) {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    const auth = getAuth(req);
    if (!auth) {
      sendJson(res, 401, { error: "Unauthorized." });
      return;
    }

    const body = await parseJsonBody(req, res);
    if (!body) return;

    const normalizedCart = normalizeCart(body.cart);
    if (!normalizedCart) {
      sendJson(res, 400, { error: "Invalid cart payload." });
      return;
    }

    store.cartsByUser[auth.user.id] = normalizedCart;
    persistStore();
    sendJson(res, 200, { cart: normalizedCart });
    return;
  }

  if (pathname === "/api/user/checkout") {
    if (!isMethod(req, ["POST"])) {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    const auth = getAuth(req);
    if (!auth) {
      sendJson(res, 401, { error: "Unauthorized." });
      return;
    }

    const body = await parseJsonBody(req, res);
    if (!body) return;

    const cart = normalizeCart(store.cartsByUser[auth.user.id]) || [];
    if (!cart.length) {
      sendJson(res, 400, { error: "Cart is empty." });
      return;
    }

    const billing = normalizeBilling(body, auth.user);
    if (!billing) {
      sendJson(res, 400, {
        error:
          "Invalid billing details. Provide fullName, email, country, addressLine1, city, state, and zipCode.",
      });
      return;
    }

    const lineItems = cart
      .map((line) => {
        const product = PRODUCT_MAP.get(line.productId);
        if (!product) return null;
        return {
          productId: product.id,
          title: product.title,
          qty: line.qty,
          unitPrice: product.price,
          lineTotal: product.price * line.qty,
        };
      })
      .filter(Boolean);

    if (!lineItems.length) {
      sendJson(res, 400, { error: "Cart has invalid items." });
      return;
    }

    const subtotal = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);
    const tax = Number((subtotal * 0.1).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    const order = {
      orderId: makeCheckoutOrderId(),
      userId: auth.user.id,
      userEmail: auth.user.email,
      status: "paid",
      createdAt: new Date().toISOString(),
      billing,
      items: lineItems,
      totals: {
        subtotal,
        tax,
        total,
        currency: "USD",
      },
    };

    if (!Array.isArray(store.ordersByUser[auth.user.id])) {
      store.ordersByUser[auth.user.id] = [];
    }
    store.ordersByUser[auth.user.id].push(order);

    const existingPurchases = normalizePurchases(store.purchasesByUser[auth.user.id]) || [];
    const purchaseSet = new Set(existingPurchases);

    lineItems.forEach((line) => {
      purchaseSet.add(line.productId);
    });

    store.purchasesByUser[auth.user.id] = [...purchaseSet];
    store.cartsByUser[auth.user.id] = [];
    persistStore();

    sendJson(res, 200, { order, state: getUserState(auth.user.id) });
    return;
  }

  if (pathname === "/api/user/orders") {
    if (!isMethod(req, ["GET"])) {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    const auth = getAuth(req);
    if (!auth) {
      sendJson(res, 401, { error: "Unauthorized." });
      return;
    }

    const orders = normalizeOrders(store.ordersByUser[auth.user.id]) || [];
    sendJson(res, 200, { orders });
    return;
  }

  if (pathname === "/api/user/purchases") {
    if (!isMethod(req, ["PUT"])) {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    const auth = getAuth(req);
    if (!auth) {
      sendJson(res, 401, { error: "Unauthorized." });
      return;
    }

    const body = await parseJsonBody(req, res);
    if (!body) return;

    const normalizedPurchases = normalizePurchases(body.purchases);
    if (!normalizedPurchases) {
      sendJson(res, 400, { error: "Invalid purchases payload." });
      return;
    }

    store.purchasesByUser[auth.user.id] = normalizedPurchases;
    persistStore();
    sendJson(res, 200, { purchases: normalizedPurchases });
    return;
  }

  if (pathname === "/api/user/service-orders") {
    if (!isMethod(req, ["POST"])) {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    const auth = getAuth(req);
    if (!auth) {
      sendJson(res, 401, { error: "Unauthorized." });
      return;
    }

    const body = await parseJsonBody(req, res);
    if (!body) return;

    const serviceId = String(body.serviceId || "");
    const packageTier = String(body.packageTier || "");
    const deadline = String(body.deadline || "");
    const requirements = String(body.requirements || "").trim();

    if (!SERVICE_IDS.has(serviceId)) {
      sendJson(res, 400, { error: "Invalid service selected." });
      return;
    }

    if (!PACKAGE_TIERS.has(packageTier)) {
      sendJson(res, 400, { error: "Invalid package tier selected." });
      return;
    }

    if (!isFutureDate(deadline)) {
      sendJson(res, 400, { error: "Deadline should be today or later." });
      return;
    }

    if (requirements.length < 6) {
      sendJson(res, 400, { error: "Please provide detailed requirements." });
      return;
    }

    const order = {
      orderId: makeOrderId(),
      serviceId,
      packageTier,
      deadline,
      requirements,
      customerId: auth.user.id,
      customerEmail: auth.user.email,
      createdAt: new Date().toISOString(),
    };

    if (!Array.isArray(store.serviceOrdersByUser[auth.user.id])) {
      store.serviceOrdersByUser[auth.user.id] = [];
    }
    store.serviceOrdersByUser[auth.user.id].push(order);
    persistStore();

    sendJson(res, 201, { order });
    return;
  }

  sendJson(res, 404, { error: "API route not found." });
}

function getAuth(req) {
  const token = readBearerToken(req);
  if (!token) return null;

  const session = store.sessions.find((item) => item.token === token);
  if (!session) return null;

  if (Date.now() - new Date(session.createdAt).getTime() > SESSION_TTL_MS) {
    store.sessions = store.sessions.filter((item) => item.token !== token);
    return null;
  }

  const user = store.users.find((item) => item.id === session.userId);
  if (!user) {
    store.sessions = store.sessions.filter((item) => item.token !== token);
    return null;
  }

  session.lastUsedAt = new Date().toISOString();
  return { token, session, user };
}

function getUserState(userId) {
  const cart = normalizeCart(store.cartsByUser[userId]) || [];
  const purchases = normalizePurchases(store.purchasesByUser[userId]) || [];
  const orders = normalizeOrders(store.ordersByUser[userId]) || [];
  const serviceOrders = normalizeServiceOrders(store.serviceOrdersByUser[userId]) || [];
  return { cart, purchases, orders, serviceOrders };
}

function issueSession(userId) {
  store.sessions = store.sessions.filter((item) => item.userId !== userId);
  const token = makeToken(24);
  store.sessions.push({
    token,
    userId,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  });
  return token;
}

function pruneExpiredSessions() {
  const before = store.sessions.length;
  const now = Date.now();

  store.sessions = store.sessions.filter((session) => {
    const age = now - new Date(session.createdAt).getTime();
    return Number.isFinite(age) && age <= SESSION_TTL_MS;
  });

  if (before !== store.sessions.length) {
    persistStore();
  }
}

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function safeEqualHex(left, right) {
  try {
    const leftBuffer = Buffer.from(left, "hex");
    const rightBuffer = Buffer.from(right, "hex");
    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
}

function normalizeCart(rawCart) {
  if (!Array.isArray(rawCart)) return null;

  const merged = new Map();
  for (const line of rawCart) {
    if (!line || typeof line !== "object") return null;
    const productId = String(line.productId || "");
    const qty = Number(line.qty);
    if (!PRODUCT_IDS.has(productId)) return null;
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) return null;

    merged.set(productId, (merged.get(productId) || 0) + qty);
  }

  return [...merged.entries()].map(([productId, qty]) => ({ productId, qty }));
}

function normalizePurchases(rawPurchases) {
  if (!Array.isArray(rawPurchases)) return null;

  const unique = [];
  const seen = new Set();
  for (const productIdRaw of rawPurchases) {
    const productId = String(productIdRaw || "");
    if (!PRODUCT_IDS.has(productId)) return null;
    if (seen.has(productId)) continue;
    seen.add(productId);
    unique.push(productId);
  }
  return unique;
}

function normalizeServiceOrders(rawOrders) {
  if (!Array.isArray(rawOrders)) return null;

  const normalized = [];
  for (const order of rawOrders) {
    if (!order || typeof order !== "object") continue;
    if (!SERVICE_IDS.has(String(order.serviceId || ""))) continue;
    if (!PACKAGE_TIERS.has(String(order.packageTier || ""))) continue;

    normalized.push({
      orderId: String(order.orderId || ""),
      serviceId: String(order.serviceId || ""),
      packageTier: String(order.packageTier || ""),
      deadline: String(order.deadline || ""),
      requirements: String(order.requirements || ""),
      customerId: String(order.customerId || ""),
      customerEmail: String(order.customerEmail || ""),
      createdAt: String(order.createdAt || ""),
    });
  }

  return normalized;
}

function normalizeOrders(rawOrders) {
  if (!Array.isArray(rawOrders)) return null;

  return rawOrders
    .filter((order) => order && typeof order === "object")
    .map((order) => ({
      orderId: String(order.orderId || ""),
      userId: String(order.userId || ""),
      userEmail: String(order.userEmail || ""),
      status: String(order.status || "paid"),
      createdAt: String(order.createdAt || ""),
      billing: {
        fullName: String(order.billing?.fullName || ""),
        email: String(order.billing?.email || ""),
        country: String(order.billing?.country || ""),
        addressLine1: String(order.billing?.addressLine1 || ""),
        addressLine2: String(order.billing?.addressLine2 || ""),
        city: String(order.billing?.city || ""),
        state: String(order.billing?.state || ""),
        zipCode: String(order.billing?.zipCode || ""),
      },
      items: Array.isArray(order.items)
        ? order.items
            .filter((line) => line && typeof line === "object")
            .map((line) => ({
              productId: String(line.productId || ""),
              title: String(line.title || ""),
              qty: Number(line.qty) || 0,
              unitPrice: Number(line.unitPrice) || 0,
              lineTotal: Number(line.lineTotal) || 0,
            }))
        : [],
      totals: {
        subtotal: Number(order.totals?.subtotal) || 0,
        tax: Number(order.totals?.tax) || 0,
        total: Number(order.totals?.total) || 0,
        currency: String(order.totals?.currency || "USD"),
      },
    }));
}

function normalizeBilling(rawBody, user) {
  if (!rawBody || typeof rawBody !== "object") return null;

  const billing = {
    fullName: String(rawBody.fullName || user.fullName || "").trim(),
    email: normalizeEmail(rawBody.email || user.email),
    country: String(rawBody.country || "").trim(),
    addressLine1: String(rawBody.addressLine1 || "").trim(),
    addressLine2: String(rawBody.addressLine2 || "").trim(),
    city: String(rawBody.city || "").trim(),
    state: String(rawBody.state || "").trim(),
    zipCode: String(rawBody.zipCode || "").trim(),
  };

  if (
    billing.fullName.length < 2 ||
    !isValidEmail(billing.email) ||
    billing.country.length < 2 ||
    billing.addressLine1.length < 4 ||
    billing.city.length < 2 ||
    billing.state.length < 2 ||
    billing.zipCode.length < 3
  ) {
    return null;
  }

  return billing;
}

function parseJsonBody(req, res) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    const maxBytes = 1024 * 1024;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        sendJson(res, 413, { error: "Payload too large." });
        req.destroy();
        resolve(null);
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }

      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        const parsed = JSON.parse(raw);
        resolve(parsed && typeof parsed === "object" ? parsed : null);
      } catch {
        sendJson(res, 400, { error: "Invalid JSON body." });
        resolve(null);
      }
    });

    req.on("error", () => {
      sendJson(res, 400, { error: "Unable to read request body." });
      resolve(null);
    });
  });
}

function readBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return null;
  if (!header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

function serveStatic(req, res, requestUrl) {
  if (!isMethod(req, ["GET", "HEAD"])) {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === "/") pathname = "/index.html";
  if (pathname.includes("..")) {
    sendJson(res, 400, { error: "Invalid path." });
    return;
  }

  const absolutePath = path.join(ROOT_DIR, pathname);
  if (!absolutePath.startsWith(ROOT_DIR)) {
    sendJson(res, 400, { error: "Invalid path." });
    return;
  }

  fs.stat(absolutePath, (error, stat) => {
    if (error || !stat.isFile()) {
      sendJson(res, 404, { error: "Not found." });
      return;
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    fs.readFile(absolutePath, (readError, data) => {
      if (readError) {
        sendJson(res, 500, { error: "Failed to read file." });
        return;
      }

      res.writeHead(200, { "Content-Type": contentType });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      res.end(data);
    });
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function isMethod(req, methods) {
  return methods.includes(req.method || "GET");
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_STORE, null, 2));
  }
}

function loadStore() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      cartsByUser: isObject(parsed.cartsByUser) ? parsed.cartsByUser : {},
      purchasesByUser: isObject(parsed.purchasesByUser) ? parsed.purchasesByUser : {},
      ordersByUser: isObject(parsed.ordersByUser) ? parsed.ordersByUser : {},
      serviceOrdersByUser: isObject(parsed.serviceOrdersByUser) ? parsed.serviceOrdersByUser : {},
    };
  } catch {
    return { ...DEFAULT_STORE };
  }
}

function persistStore() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isFutureDate(value) {
  const selected = new Date(`${value}T00:00:00`);
  if (Number.isNaN(selected.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected >= today;
}

function makeUserId() {
  return `USR-${Date.now().toString(36)}-${makeToken(4)}`;
}

function makeToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex");
}

function makeOrderId() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.floor(Math.random() * 9000 + 1000);
  return `SRV-${datePart}-${randomPart}`;
}

function makeCheckoutOrderId() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.floor(Math.random() * 900000 + 100000);
  return `ORD-${datePart}-${randomPart}`;
}
