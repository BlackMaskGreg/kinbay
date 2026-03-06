
const PRODUCTS = [
  {
    id: "cv-template-pack",
    title: "Astra Pro Premium WordPress Theme",
    category: "Themes",
    price: 19,
    rating: 4.9,
    label: "Top rated",
    description: "Fast and customizable multipurpose WordPress theme.",
  },
  {
    id: "portfolio-kit",
    title: "Elementor Pro Website Builder Plugin",
    category: "Plugins",
    price: 24,
    rating: 4.8,
    label: "Updated",
    description: "Drag-and-drop page builder for production-ready sites.",
  },
  {
    id: "job-hunt-playbook",
    title: "WooCommerce Product Addons Toolkit",
    category: "Plugins",
    price: 14,
    rating: 4.7,
    label: "On sale",
    description: "Extra product options and conversion features for stores.",
  },
  {
    id: "social-bundle",
    title: "Modern Admin Dashboard HTML Template",
    category: "Templates",
    price: 17,
    rating: 4.6,
    label: "Trending",
    description: "Clean admin UI kit with charts, widgets, and auth pages.",
  },
  {
    id: "audio-brand-pack",
    title: "WordPress Security Booster Bundle",
    category: "Security",
    price: 29,
    rating: 4.8,
    label: "Popular",
    description: "Harden login, firewall rules, and malware scan workflow.",
  },
  {
    id: "client-onboarding",
    title: "SaaS Landing Page React Template",
    category: "Templates",
    price: 22,
    rating: 4.5,
    label: "Updated",
    description: "Modern React starter for SaaS marketing pages.",
  },
  {
    id: "pitch-deck",
    title: "Membership Pro Business Script",
    category: "Scripts",
    price: 31,
    rating: 4.7,
    label: "Best value",
    description: "Turn your content platform into a subscription business.",
  },
  {
    id: "youtube-thumbnail",
    title: "Premium Icon Pack Collection",
    category: "Assets",
    price: 16,
    rating: 4.6,
    label: "On sale",
    description: "Scalable icon library for websites and app dashboards.",
  },
];

const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const API_PATHS = {
  health: "/api/health",
  signup: "/api/auth/signup",
  login: "/api/auth/login",
  me: "/api/auth/me",
  logout: "/api/auth/logout",
  userState: "/api/user/state",
  orders: "/api/user/orders",
  cart: "/api/user/cart",
  checkout: "/api/user/checkout",
};

const STORAGE_KEYS = {
  authToken: "kinnbay_auth_token_v1",
  lastOrder: "kinnbay_last_order_v1",
};

const state = {
  authToken: loadStorage(STORAGE_KEYS.authToken),
  currentUser: null,
  cart: [],
  purchases: new Set(),
  orders: [],
  query: "",
  category: "All",
  authView: "login",
  apiReady: false,
  backendWarningShown: false,
};

const refs = {
  menuToggle: document.getElementById("menuToggle"),
  closeMenu: document.getElementById("closeMenu"),
  sideMenu: document.getElementById("sideMenu"),
  menuSearchInput: document.getElementById("menuSearchInput"),
  searchInput: document.getElementById("searchInput"),
  featuredGrid: document.getElementById("featuredGrid"),
  recentGrid: document.getElementById("recentGrid"),
  saleGrid: document.getElementById("saleGrid"),
  productsGrid: document.getElementById("productsGrid"),
  categoryFilters: document.getElementById("categoryFilters"),
  libraryGrid: document.getElementById("libraryGrid"),
  ordersGrid: document.getElementById("ordersGrid"),
  downloadsState: document.getElementById("downloadsState"),
  accountState: document.getElementById("accountState"),
  profileCard: document.getElementById("profileCard"),
  accountOrders: document.getElementById("accountOrders"),
  cartPageItems: document.getElementById("cartPageItems"),
  cartPageSubtotal: document.getElementById("cartPageSubtotal"),
  cartPageTax: document.getElementById("cartPageTax"),
  cartPageTotal: document.getElementById("cartPageTotal"),
  cartPageCheckout: document.getElementById("cartPageCheckout"),
  checkoutPageForm: document.getElementById("checkoutPageForm"),
  checkoutSummary: document.getElementById("checkoutSummary"),
  checkoutSubtotal: document.getElementById("checkoutSubtotal"),
  checkoutTax: document.getElementById("checkoutTax"),
  checkoutTotal: document.getElementById("checkoutTotal"),
  contactForm: document.getElementById("contactForm"),
  successOrderId: document.getElementById("successOrderId"),
  successDate: document.getElementById("successDate"),
  successTotal: document.getElementById("successTotal"),
  openAuthButton: document.getElementById("openAuthButton"),
  authSessionPanel: document.getElementById("authSessionPanel"),
  authGreeting: document.getElementById("authGreeting"),
  logoutButton: document.getElementById("logoutButton"),
  cartButton: document.getElementById("cartButton"),
  cartCount: document.getElementById("cartCount"),
  cartDrawer: document.getElementById("cartDrawer"),
  closeCart: document.getElementById("closeCart"),
  cartItems: document.getElementById("cartItems"),
  cartTotal: document.getElementById("cartTotal"),
  checkoutButton: document.getElementById("checkoutButton"),
  authModal: document.getElementById("authModal"),
  authTabs: document.getElementById("authTabs"),
  loginForm: document.getElementById("loginForm"),
  signupForm: document.getElementById("signupForm"),
  footerYear: document.getElementById("footerYear"),
  toast: document.getElementById("toast"),
};

void init();

async function init() {
  setAuthView("login");
  setFooterYear();
  markActiveNav();
  renderCategoryFilters();
  setupEvents();
  renderAll();
  await hydrateAuthState();
}

function setupEvents() {
  refs.menuToggle?.addEventListener("click", openSideMenu);
  refs.closeMenu?.addEventListener("click", closeSideMenu);

  refs.searchInput?.addEventListener("input", syncSearchInput);
  refs.menuSearchInput?.addEventListener("input", syncSearchInput);

  refs.categoryFilters?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-category]");
    if (!btn) return;
    state.category = btn.dataset.category || "All";
    renderCategoryFilters();
    renderProductPages();
  });

  refs.openAuthButton?.addEventListener("click", () => openAuthModal("login"));
  refs.logoutButton?.addEventListener("click", () => {
    void logout();
  });

  refs.cartButton?.addEventListener("click", openCart);
  refs.closeCart?.addEventListener("click", closeCart);

  refs.checkoutButton?.addEventListener("click", (event) => {
    if (!ensureCheckoutAccessible()) {
      event.preventDefault();
    }
  });

  refs.cartPageCheckout?.addEventListener("click", (event) => {
    if (!ensureCheckoutAccessible()) {
      event.preventDefault();
    }
  });

  refs.checkoutPageForm?.addEventListener("submit", (event) => {
    void onCheckoutPageSubmit(event);
  });

  refs.contactForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    event.currentTarget.reset();
    showToast("Message sent. We will get back to you shortly.");
  });

  refs.authTabs?.addEventListener("click", (event) => {
    const tab = event.target.closest("button[data-auth-view]");
    if (!tab) return;
    setAuthView(tab.dataset.authView);
  });

  refs.authModal?.addEventListener("click", (event) => {
    const switchBtn = event.target.closest("button[data-auth-switch]");
    if (!switchBtn) return;
    setAuthView(switchBtn.dataset.authSwitch);
  });

  refs.loginForm?.addEventListener("submit", (event) => {
    void onLoginSubmit(event);
  });

  refs.signupForm?.addEventListener("submit", (event) => {
    void onSignupSubmit(event);
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const modalId = event.currentTarget.getAttribute("data-close-modal");
      closeModal(document.getElementById(modalId));
    });
  });

  document.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      void handleAction(actionButton);
      return;
    }

    if (!document.body.classList.contains("menu-open")) {
      return;
    }

    const clickedInsideMenu = event.target.closest("#sideMenu");
    const clickedMenuToggle = event.target.closest("#menuToggle");
    if (!clickedInsideMenu && !clickedMenuToggle) {
      closeSideMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSideMenu();
      closeCart();
      closeModal(refs.authModal);
    }
  });
}

function syncSearchInput(event) {
  const value = String(event.target.value || "").trim().toLowerCase();
  state.query = value;

  if (refs.searchInput && event.target !== refs.searchInput) {
    refs.searchInput.value = event.target.value;
  }

  if (refs.menuSearchInput && event.target !== refs.menuSearchInput) {
    refs.menuSearchInput.value = event.target.value;
  }

  renderProductPages();
}

async function handleAction(button) {
  const action = button.dataset.action;
  const productId = button.dataset.productId;

  if (action === "add") {
    await addToCart(productId);
    return;
  }

  if (action === "download") {
    downloadProduct(productId);
    return;
  }

  if (action === "inc") {
    await updateQty(productId, 1);
    return;
  }

  if (action === "dec") {
    await updateQty(productId, -1);
    return;
  }

  if (action === "remove") {
    await removeFromCart(productId);
    return;
  }

  if (action === "auth-login") {
    openAuthModal("login");
    return;
  }

  if (action === "account-logout") {
    await logout();
  }
}

function renderAll() {
  renderProductPages();
  renderCartDrawer();
  renderCartPage();
  renderCheckoutPage();
  renderDownloadsPage();
  renderAccountPage();
  renderSuccessPage();
  updateAuthUi();
}

function renderProductPages() {
  renderFeaturedGrid();
  renderRecentGrid();
  renderSaleGrid();
  renderProductsGrid();
}

function getFilteredProducts() {
  return PRODUCTS.filter((product) => {
    const categoryOk = state.category === "All" || product.category === state.category;
    if (!categoryOk) return false;

    if (!state.query) return true;
    return (
      product.title.toLowerCase().includes(state.query) ||
      product.category.toLowerCase().includes(state.query) ||
      product.description.toLowerCase().includes(state.query)
    );
  });
}

function renderFeaturedGrid() {
  if (!refs.featuredGrid) return;

  const items = [...getFilteredProducts()].sort((a, b) => b.rating - a.rating).slice(0, 6);
  refs.featuredGrid.innerHTML = items.length
    ? items.map((item) => renderProductCard(item)).join("")
    : `<p class="empty">No products found.</p>`;
}

function renderRecentGrid() {
  if (!refs.recentGrid) return;

  const items = getFilteredProducts();
  refs.recentGrid.innerHTML = items.length
    ? items.map((item) => renderProductCard(item)).join("")
    : `<p class="empty">No products found.</p>`;
}

function renderSaleGrid() {
  if (!refs.saleGrid) return;

  const items = getFilteredProducts().filter((item) => item.price <= 20);
  refs.saleGrid.innerHTML = items.length
    ? items.map((item) => renderProductCard(item)).join("")
    : `<p class="empty">No sale products found.</p>`;
}

function renderProductsGrid() {
  if (!refs.productsGrid) return;

  const items = getFilteredProducts();
  refs.productsGrid.innerHTML = items.length
    ? items.map((item) => renderProductCard(item)).join("")
    : `<p class="empty">No products found.</p>`;
}

function renderProductCard(product) {
  const owned = state.purchases.has(product.id);
  const addLabel = state.currentUser ? "Add to cart" : "Login to buy";
  const addClass = state.currentUser ? "card-btn primary" : "card-btn";

  return `
    <article class="product-card">
      <div class="product-media">
        <span class="product-tag">${escapeHtml(product.label)}</span>
      </div>
      <div class="product-body">
        <h3 class="product-title">${escapeHtml(product.title)}</h3>
        <p class="product-copy">${escapeHtml(product.description)}</p>
        <div class="product-meta">
          <strong class="price">${CURRENCY.format(product.price)}</strong>
          <span class="rating">Rating ${product.rating.toFixed(1)}</span>
        </div>
        <div class="card-actions">
          <button class="${addClass}" data-action="add" data-product-id="${product.id}">${addLabel}</button>
          <button class="card-btn" data-action="download" data-product-id="${product.id}" ${owned ? "" : "disabled"}>
            ${owned ? "Download" : state.currentUser ? "Locked" : "Login"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderCategoryFilters() {
  if (!refs.categoryFilters) return;

  const categories = ["All", ...new Set(PRODUCTS.map((item) => item.category))];
  refs.categoryFilters.innerHTML = categories
    .map((category) => {
      const activeClass = category === state.category ? "chip active" : "chip";
      return `<button class="${activeClass}" data-category="${category}" type="button">${escapeHtml(
        category,
      )}</button>`;
    })
    .join("");
}
async function addToCart(productId) {
  if (!ensureAuthenticated("Sign in to add products to your cart.", "login")) {
    return;
  }

  const product = PRODUCTS.find((item) => item.id === productId);
  if (!product) return;

  const line = state.cart.find((item) => item.productId === productId);
  if (line) {
    line.qty += 1;
  } else {
    state.cart.push({ productId, qty: 1 });
  }

  renderCartDrawer();
  renderCartPage();
  renderCheckoutPage();

  try {
    await persistCart();
    renderAll();
    showToast(`${product.title} added to cart.`);
  } catch (error) {
    await recoverAfterSyncError(error, "Unable to update cart right now.");
  }
}

async function updateQty(productId, delta) {
  const line = state.cart.find((item) => item.productId === productId);
  if (!line) return;

  line.qty += delta;
  if (line.qty <= 0) {
    state.cart = state.cart.filter((item) => item.productId !== productId);
  }

  renderCartDrawer();
  renderCartPage();
  renderCheckoutPage();

  try {
    await persistCart();
    renderAll();
  } catch (error) {
    await recoverAfterSyncError(error, "Unable to sync your cart.");
  }
}

async function removeFromCart(productId) {
  state.cart = state.cart.filter((item) => item.productId !== productId);

  renderCartDrawer();
  renderCartPage();
  renderCheckoutPage();

  try {
    await persistCart();
    renderAll();
  } catch (error) {
    await recoverAfterSyncError(error, "Unable to sync your cart.");
  }
}

async function persistCart() {
  if (!state.currentUser) return;

  const payload = await apiRequest(API_PATHS.cart, {
    method: "PUT",
    auth: true,
    body: { cart: state.cart },
  });

  state.cart = normalizeCartLines(payload.cart || []);
}

function getCartTotals() {
  const subtotal = state.cart.reduce((sum, line) => {
    const product = PRODUCTS.find((item) => item.id === line.productId);
    return sum + (product ? product.price * line.qty : 0);
  }, 0);

  const tax = Number((subtotal * 0.1).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));

  return { subtotal, tax, total };
}

function renderCartDrawer() {
  if (!refs.cartCount || !refs.cartItems || !refs.cartTotal) return;

  if (!state.currentUser) {
    refs.cartCount.textContent = "0";
    refs.cartItems.innerHTML = `
      <article class="empty">
        <p>Sign in to use your cart.</p>
        <button class="action-btn full" data-action="auth-login" type="button">Login / Sign Up</button>
      </article>
    `;
    refs.cartTotal.textContent = CURRENCY.format(0);
    return;
  }

  const totalCount = state.cart.reduce((sum, line) => sum + line.qty, 0);
  refs.cartCount.textContent = String(totalCount);

  if (!state.cart.length) {
    refs.cartItems.innerHTML = `<p class="empty">No items yet. Add products to continue.</p>`;
    refs.cartTotal.textContent = CURRENCY.format(0);
    return;
  }

  refs.cartItems.innerHTML = state.cart
    .map((line) => {
      const product = PRODUCTS.find((item) => item.id === line.productId);
      if (!product) return "";

      return `
        <article class="cart-item">
          <div class="cart-item-head">
            <strong>${escapeHtml(product.title)}</strong>
            <button class="icon-btn" data-action="remove" data-product-id="${product.id}" aria-label="Remove item">x</button>
          </div>
          <p>${CURRENCY.format(product.price)} each</p>
          <div class="qty-wrap">
            <button type="button" data-action="dec" data-product-id="${product.id}" aria-label="Decrease quantity">-</button>
            <span>${line.qty}</span>
            <button type="button" data-action="inc" data-product-id="${product.id}" aria-label="Increase quantity">+</button>
          </div>
        </article>
      `;
    })
    .join("");

  refs.cartTotal.textContent = CURRENCY.format(getCartTotals().total);
}

function renderCartPage() {
  if (!refs.cartPageItems) return;

  if (!state.currentUser) {
    refs.cartPageItems.innerHTML = `
      <article class="empty-state">
        <p>Sign in to manage your cart.</p>
        <button class="action-btn" data-action="auth-login" type="button">Login / Sign Up</button>
      </article>
    `;
    setText(refs.cartPageSubtotal, CURRENCY.format(0));
    setText(refs.cartPageTax, CURRENCY.format(0));
    setText(refs.cartPageTotal, CURRENCY.format(0));
    return;
  }

  if (!state.cart.length) {
    refs.cartPageItems.innerHTML = `
      <article class="empty-state">
        <p>Your cart is empty.</p>
        <a class="action-btn" href="products.html">Browse Products</a>
      </article>
    `;
    setText(refs.cartPageSubtotal, CURRENCY.format(0));
    setText(refs.cartPageTax, CURRENCY.format(0));
    setText(refs.cartPageTotal, CURRENCY.format(0));
    return;
  }

  refs.cartPageItems.innerHTML = state.cart
    .map((line) => {
      const product = PRODUCTS.find((item) => item.id === line.productId);
      if (!product) return "";

      const lineTotal = product.price * line.qty;
      return `
        <article class="cart-line">
          <div>
            <h3>${escapeHtml(product.title)}</h3>
            <p>${escapeHtml(product.category)} - ${CURRENCY.format(product.price)} each</p>
          </div>
          <div class="line-actions">
            <div class="qty-wrap">
              <button type="button" data-action="dec" data-product-id="${product.id}">-</button>
              <span>${line.qty}</span>
              <button type="button" data-action="inc" data-product-id="${product.id}">+</button>
            </div>
            <strong>${CURRENCY.format(lineTotal)}</strong>
            <button type="button" class="icon-btn" data-action="remove" data-product-id="${product.id}">Remove</button>
          </div>
        </article>
      `;
    })
    .join("");

  const totals = getCartTotals();
  setText(refs.cartPageSubtotal, CURRENCY.format(totals.subtotal));
  setText(refs.cartPageTax, CURRENCY.format(totals.tax));
  setText(refs.cartPageTotal, CURRENCY.format(totals.total));
}

function renderCheckoutPage() {
  if (!refs.checkoutSummary) return;

  if (!state.currentUser) {
    refs.checkoutSummary.innerHTML = `
      <article class="empty-state">
        <p>Sign in before placing an order.</p>
        <button class="action-btn" data-action="auth-login" type="button">Login / Sign Up</button>
      </article>
    `;
    setText(refs.checkoutSubtotal, CURRENCY.format(0));
    setText(refs.checkoutTax, CURRENCY.format(0));
    setText(refs.checkoutTotal, CURRENCY.format(0));

    if (refs.checkoutPageForm) {
      refs.checkoutPageForm.querySelectorAll("input, select, button").forEach((el) => {
        el.disabled = true;
      });
    }
    return;
  }

  if (refs.checkoutPageForm) {
    refs.checkoutPageForm.querySelectorAll("input, select, button").forEach((el) => {
      el.disabled = false;
    });

    prefillCheckoutForm();
  }

  if (!state.cart.length) {
    refs.checkoutSummary.innerHTML = `
      <article class="empty-state">
        <p>Your cart is empty. Add products before checkout.</p>
        <a class="action-btn" href="products.html">Browse Products</a>
      </article>
    `;
    setText(refs.checkoutSubtotal, CURRENCY.format(0));
    setText(refs.checkoutTax, CURRENCY.format(0));
    setText(refs.checkoutTotal, CURRENCY.format(0));
    return;
  }

  refs.checkoutSummary.innerHTML = state.cart
    .map((line) => {
      const product = PRODUCTS.find((item) => item.id === line.productId);
      if (!product) return "";

      return `
        <article class="checkout-line">
          <span>${escapeHtml(product.title)} x${line.qty}</span>
          <strong>${CURRENCY.format(product.price * line.qty)}</strong>
        </article>
      `;
    })
    .join("");

  const totals = getCartTotals();
  setText(refs.checkoutSubtotal, CURRENCY.format(totals.subtotal));
  setText(refs.checkoutTax, CURRENCY.format(totals.tax));
  setText(refs.checkoutTotal, CURRENCY.format(totals.total));
}

function prefillCheckoutForm() {
  if (!refs.checkoutPageForm || !state.currentUser) return;

  const fullName = refs.checkoutPageForm.querySelector("input[name='fullName']");
  const email = refs.checkoutPageForm.querySelector("input[name='email']");

  if (fullName && !fullName.value) {
    fullName.value = state.currentUser.fullName || "";
  }

  if (email && !email.value) {
    email.value = state.currentUser.email || "";
  }
}

async function onCheckoutPageSubmit(event) {
  event.preventDefault();

  if (!ensureAuthenticated("Sign in to continue to checkout.", "login")) {
    return;
  }

  if (!state.cart.length) {
    showToast("Your cart is empty.");
    return;
  }

  const formData = new FormData(event.currentTarget);
  const payload = {
    fullName: String(formData.get("fullName") || "").trim(),
    email: normalizeEmail(formData.get("email")),
    country: String(formData.get("country") || "").trim(),
    addressLine1: String(formData.get("addressLine1") || "").trim(),
    addressLine2: String(formData.get("addressLine2") || "").trim(),
    city: String(formData.get("city") || "").trim(),
    state: String(formData.get("state") || "").trim(),
    zipCode: String(formData.get("zipCode") || "").trim(),
    paymentMethod: String(formData.get("paymentMethod") || "card"),
  };

  try {
    const response = await apiRequest(API_PATHS.checkout, {
      method: "POST",
      auth: true,
      body: payload,
    });

    applyUserState(response.state);
    if (response.order) {
      saveStorage(STORAGE_KEYS.lastOrder, JSON.stringify(response.order));
    }

    renderAll();
    window.location.href = `success.html?orderId=${encodeURIComponent(response.order?.orderId || "")}`;
  } catch (error) {
    await recoverAfterSyncError(error, "Checkout failed. Please review your details and try again.");
  }
}

function renderDownloadsPage() {
  if (!refs.libraryGrid && !refs.ordersGrid && !refs.downloadsState) return;

  if (!state.currentUser) {
    setText(refs.downloadsState, "Sign in to view and download your purchased files.");

    if (refs.libraryGrid) {
      refs.libraryGrid.innerHTML = `
        <article class="empty-state">
          <p>You are currently browsing as a guest.</p>
          <button class="action-btn" data-action="auth-login" type="button">Login / Sign Up</button>
        </article>
      `;
    }

    if (refs.ordersGrid) {
      refs.ordersGrid.innerHTML = "";
    }
    return;
  }

  const purchasedProducts = PRODUCTS.filter((product) => state.purchases.has(product.id));
  setText(
    refs.downloadsState,
    purchasedProducts.length
      ? `You own ${purchasedProducts.length} product${purchasedProducts.length === 1 ? "" : "s"}.`
      : "No purchases yet. Complete checkout to unlock your downloads.",
  );

  if (refs.libraryGrid) {
    refs.libraryGrid.innerHTML = purchasedProducts.length
      ? purchasedProducts.map((product) => renderLibraryCard(product)).join("")
      : `<article class="empty-state"><p>No purchased products yet.</p></article>`;
  }

  if (refs.ordersGrid) {
    refs.ordersGrid.innerHTML = state.orders.length
      ? state.orders
          .slice()
          .reverse()
          .map((order) => renderOrderCard(order))
          .join("")
      : `<article class="empty-state"><p>No orders yet.</p></article>`;
  }
}

function renderAccountPage() {
  if (!refs.accountState && !refs.profileCard && !refs.accountOrders) return;

  if (!state.currentUser) {
    setText(refs.accountState, "Sign in to access your account details and orders.");

    if (refs.profileCard) {
      refs.profileCard.innerHTML = `
        <article class="empty-state">
          <p>You are not signed in.</p>
          <button class="action-btn" data-action="auth-login" type="button">Login / Sign Up</button>
        </article>
      `;
    }

    if (refs.accountOrders) {
      refs.accountOrders.innerHTML = "";
    }
    return;
  }

  setText(refs.accountState, "Manage your account and review your activity.");

  if (refs.profileCard) {
    refs.profileCard.innerHTML = `
      <div class="profile-grid">
        <p><strong>Name:</strong> ${escapeHtml(state.currentUser.fullName || "-")}</p>
        <p><strong>Email:</strong> ${escapeHtml(state.currentUser.email || "-")}</p>
        <p><strong>Purchased Items:</strong> ${state.purchases.size}</p>
        <p><strong>Total Orders:</strong> ${state.orders.length}</p>
      </div>
      <button class="ghost-btn" data-action="account-logout" type="button">Logout</button>
    `;
  }

  if (refs.accountOrders) {
    refs.accountOrders.innerHTML = state.orders.length
      ? state.orders
          .slice()
          .reverse()
          .map((order) => renderOrderCard(order))
          .join("")
      : `<article class="empty-state"><p>No orders yet.</p></article>`;
  }
}

function renderSuccessPage() {
  if (!refs.successOrderId || !refs.successDate || !refs.successTotal) return;

  const queryOrderId = new URLSearchParams(window.location.search).get("orderId");
  let order = null;

  const stored = loadStorage(STORAGE_KEYS.lastOrder);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        order = parsed;
      }
    } catch {
      order = null;
    }
  }

  if (!order && queryOrderId && state.orders.length) {
    order = state.orders.find((item) => item.orderId === queryOrderId) || null;
  }

  if (!order) {
    setText(refs.successOrderId, queryOrderId || "Unavailable");
    setText(refs.successDate, "Unavailable");
    setText(refs.successTotal, CURRENCY.format(0));
    return;
  }

  setText(refs.successOrderId, order.orderId || "Unavailable");
  setText(refs.successDate, formatDate(order.createdAt));
  setText(refs.successTotal, CURRENCY.format(Number(order.totals?.total || 0)));
}

function renderLibraryCard(product) {
  return `
    <article class="product-card">
      <div class="product-media">
        <span class="product-tag">Purchased</span>
      </div>
      <div class="product-body">
        <h3 class="product-title">${escapeHtml(product.title)}</h3>
        <p class="product-copy">${escapeHtml(product.description)}</p>
        <div class="product-meta">
          <strong class="price">Purchased</strong>
          <span class="rating">Rating ${product.rating.toFixed(1)}</span>
        </div>
        <div class="card-actions">
          <button class="card-btn primary" data-action="download" data-product-id="${product.id}">Download</button>
        </div>
      </div>
    </article>
  `;
}

function renderOrderCard(order) {
  const itemCount = Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + (item.qty || 0), 0) : 0;
  const total = Number(order.totals?.total || 0);

  return `
    <article class="order-card">
      <div class="order-top">
        <strong>${escapeHtml(order.orderId || "Order")}</strong>
        <span class="status-pill">${escapeHtml((order.status || "paid").toUpperCase())}</span>
      </div>
      <p>${itemCount} item${itemCount === 1 ? "" : "s"} - ${CURRENCY.format(total)}</p>
      <p>${formatDate(order.createdAt)}</p>
    </article>
  `;
}
async function refreshOrders() {
  if (!state.currentUser) {
    state.orders = [];
    return;
  }

  try {
    const payload = await apiRequest(API_PATHS.orders, { auth: true });
    state.orders = normalizeOrders(payload.orders || []);
  } catch {
    state.orders = [];
  }
}

function ensureCheckoutAccessible() {
  if (!ensureAuthenticated("Sign in to continue to checkout.", "login")) {
    return false;
  }

  if (!state.cart.length) {
    showToast("Your cart is empty.");
    return false;
  }

  return true;
}

function downloadProduct(productId) {
  if (!ensureAuthenticated("Sign in to access your downloads.", "login")) {
    return;
  }

  if (!state.purchases.has(productId)) {
    showToast("Complete checkout to unlock this product.");
    return;
  }

  const product = PRODUCTS.find((item) => item.id === productId);
  if (!product) return;

  const payload = [
    "Kinbay Digital Product",
    `Product: ${product.title}`,
    `Account: ${state.currentUser.email}`,
    `Date: ${new Date().toLocaleDateString("en-US")}`,
    "",
    "This is a demo download payload.",
  ].join("\n");

  const blob = new Blob([payload], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${product.id}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast(`${product.title} download started.`);
}

function openCart() {
  if (!ensureAuthenticated("Sign in to access your cart.", "login")) {
    return;
  }

  if (!refs.cartDrawer) return;

  refs.cartDrawer.classList.add("open");
  refs.cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCart() {
  if (!refs.cartDrawer) return;

  refs.cartDrawer.classList.remove("open");
  refs.cartDrawer.setAttribute("aria-hidden", "true");
}

function openSideMenu() {
  document.body.classList.add("menu-open");
  refs.sideMenu?.setAttribute("aria-hidden", "false");
}

function closeSideMenu() {
  document.body.classList.remove("menu-open");
  refs.sideMenu?.setAttribute("aria-hidden", "true");
}

function openModal(dialog) {
  if (!dialog) return;

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "open");
  }
}

function closeModal(dialog) {
  if (!dialog) return;

  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}

function openAuthModal(view = "login") {
  setAuthView(view);
  openModal(refs.authModal);
}

function setAuthView(view) {
  state.authView = view === "signup" ? "signup" : "login";
  const showLogin = state.authView === "login";

  refs.loginForm?.classList.toggle("hidden", !showLogin);
  refs.signupForm?.classList.toggle("hidden", showLogin);

  refs.authTabs?.querySelectorAll("button[data-auth-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authView === state.authView);
  });
}

function ensureAuthenticated(message, preferredView = "login") {
  if (!state.apiReady) {
    showBackendOfflineToast();
    return false;
  }

  if (state.currentUser) return true;

  showToast(message);
  openAuthModal(preferredView);
  return false;
}

async function hydrateAuthState() {
  const online = await ensureApiAvailability();
  if (!online) {
    clearAuthState({ clearToken: false });
    renderAll();
    return;
  }

  if (!state.authToken) {
    renderAll();
    return;
  }

  try {
    const payload = await apiRequest(API_PATHS.me, { auth: true });
    state.currentUser = payload.user || null;
    applyUserState(payload.state);
    await refreshOrders();
    renderAll();
  } catch (error) {
    clearAuthState();
    renderAll();
    showToast(readErrorMessage(error, "Session expired. Please login again."));
  }
}

function updateAuthUi() {
  const loggedIn = Boolean(state.currentUser);

  refs.openAuthButton?.classList.toggle("hidden", loggedIn);
  refs.authSessionPanel?.classList.toggle("hidden", !loggedIn);

  if (refs.authGreeting) {
    refs.authGreeting.textContent = loggedIn ? `Hi, ${getDisplayName(state.currentUser.fullName)}` : "";
  }
}

function clearAuthState(options = {}) {
  const { clearToken = true } = options;

  state.currentUser = null;
  state.cart = [];
  state.purchases = new Set();
  state.orders = [];

  if (clearToken) {
    setAuthToken(null);
  }
}

function setAuthToken(token) {
  state.authToken = token || null;

  if (state.authToken) {
    saveStorage(STORAGE_KEYS.authToken, state.authToken);
  } else {
    removeStorage(STORAGE_KEYS.authToken);
  }
}

function applySessionPayload(payload) {
  setAuthToken(payload.token || null);
  state.currentUser = payload.user || null;
  applyUserState(payload.state);
}

function applyUserState(rawState) {
  const userState = rawState && typeof rawState === "object" ? rawState : {};

  state.cart = normalizeCartLines(userState.cart || []);
  state.purchases = new Set(normalizePurchaseIds(userState.purchases || []));
  state.orders = normalizeOrders(userState.orders || []);
}

async function onSignupSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const fullName = String(formData.get("fullName") || "").trim();
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (fullName.length < 2) {
    showToast("Enter your full name.");
    return;
  }

  if (!isValidEmail(email)) {
    showToast("Enter a valid email address.");
    return;
  }

  if (password.length < 8) {
    showToast("Password must be at least 8 characters.");
    return;
  }

  if (password !== confirmPassword) {
    showToast("Passwords do not match.");
    return;
  }

  const online = await ensureApiAvailability();
  if (!online) return;

  try {
    const payload = await apiRequest(API_PATHS.signup, {
      method: "POST",
      body: { fullName, email, password },
    });

    applySessionPayload(payload);
    await refreshOrders();

    renderAll();
    refs.signupForm?.reset();
    refs.loginForm?.reset();
    closeModal(refs.authModal);
    showToast("Account created. You are now signed in.");
  } catch (error) {
    showToast(readErrorMessage(error, "Unable to create account."));
  }
}

async function onLoginSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") || "");

  if (!isValidEmail(email) || !password) {
    showToast("Enter your email and password.");
    return;
  }

  const online = await ensureApiAvailability();
  if (!online) return;

  try {
    const payload = await apiRequest(API_PATHS.login, {
      method: "POST",
      body: { email, password },
    });

    applySessionPayload(payload);
    await refreshOrders();

    renderAll();
    refs.loginForm?.reset();
    closeModal(refs.authModal);
    showToast(`Welcome back, ${getDisplayName(state.currentUser.fullName)}.`);
  } catch (error) {
    showToast(readErrorMessage(error, "Unable to login."));
  }
}

async function logout() {
  if (state.authToken) {
    try {
      await apiRequest(API_PATHS.logout, { method: "POST", auth: true });
    } catch {
      // Local logout still completes.
    }
  }

  clearAuthState();
  renderAll();
  closeCart();
  closeModal(refs.authModal);
  showToast("You have been logged out.");
}

async function recoverAfterSyncError(error, fallbackMessage) {
  showToast(readErrorMessage(error, fallbackMessage));
  await refreshUserState({ silent: true });
}

async function refreshUserState(options = {}) {
  const { silent = false } = options;
  if (!state.currentUser) return;

  try {
    const payload = await apiRequest(API_PATHS.userState, { auth: true });
    applyUserState(payload);
    await refreshOrders();
    renderAll();
  } catch (error) {
    if (!silent) {
      showToast(readErrorMessage(error, "Unable to sync your account data."));
    }
  }
}

async function ensureApiAvailability() {
  if (state.apiReady) {
    return true;
  }

  try {
    await apiRequest(API_PATHS.health);
    return true;
  } catch {
    showBackendOfflineToast();
    return false;
  }
}

async function apiRequest(path, options = {}) {
  const { method = "GET", body = null, auth = false } = options;

  const headers = {};
  if (body !== null) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    if (!state.authToken) {
      throw new Error("Please login first.");
    }
    headers.Authorization = `Bearer ${state.authToken}`;
  }

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
    });
  } catch {
    state.apiReady = false;
    throw new Error("Cannot reach backend. Start backend before using auth/cart.");
  }

  state.apiReady = true;
  state.backendWarningShown = false;

  let payload = {};
  const rawText = await response.text();
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = {};
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearAuthState();
      renderAll();
    }

    throw new Error(payload.error || `Request failed (${response.status}).`);
  }

  return payload;
}

function showBackendOfflineToast() {
  if (state.backendWarningShown) return;

  showToast("Backend is offline. Deploy/start API first.");
  state.backendWarningShown = true;
}

function markActiveNav() {
  const page = document.body.dataset.page || "";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === page);
  });
}

function setFooterYear() {
  setText(refs.footerYear, String(new Date().getFullYear()));
}

function showToast(message) {
  if (!refs.toast) return;

  refs.toast.textContent = message;
  refs.toast.classList.add("show");

  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    refs.toast.classList.remove("show");
  }, 2600);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getDisplayName(fullName) {
  const trimmed = String(fullName || "").trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

function normalizeCartLines(rawCart) {
  if (!Array.isArray(rawCart)) return [];

  const merged = new Map();
  for (const item of rawCart) {
    if (!item || typeof item !== "object") continue;

    const productId = String(item.productId || "");
    const qty = Math.max(1, Number(item.qty) || 1);
    if (!PRODUCTS.some((product) => product.id === productId)) continue;

    merged.set(productId, (merged.get(productId) || 0) + qty);
  }

  return [...merged.entries()].map(([productId, qty]) => ({ productId, qty }));
}

function normalizePurchaseIds(rawPurchases) {
  if (!Array.isArray(rawPurchases)) return [];

  const unique = new Set();
  rawPurchases.forEach((productIdRaw) => {
    const productId = String(productIdRaw || "");
    if (PRODUCTS.some((product) => product.id === productId)) {
      unique.add(productId);
    }
  });

  return [...unique];
}

function normalizeOrders(rawOrders) {
  if (!Array.isArray(rawOrders)) return [];

  return rawOrders
    .filter((order) => order && typeof order === "object")
    .map((order) => ({
      orderId: String(order.orderId || ""),
      status: String(order.status || "paid"),
      createdAt: String(order.createdAt || ""),
      items: Array.isArray(order.items)
        ? order.items.map((item) => ({
            productId: String(item.productId || ""),
            qty: Number(item.qty) || 0,
          }))
        : [],
      totals: {
        total: Number(order.totals?.total) || 0,
      },
    }));
}

function formatDate(isoValue) {
  const date = new Date(isoValue || "");
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function readErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function loadStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors.
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }
}

function setText(node, value) {
  if (!node) return;
  node.textContent = value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
