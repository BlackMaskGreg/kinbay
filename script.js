const products = [
  {
    id: "cv-template-pack",
    name: "ATS CV Template Pack",
    category: "Templates",
    price: 19,
    rating: 4.8,
    description: "Editable CV and cover-letter templates optimized for ATS systems.",
  },
  {
    id: "portfolio-kit",
    name: "Freelancer Portfolio Kit",
    category: "Design Kits",
    price: 24,
    rating: 4.7,
    description: "Landing page blocks, color systems, and proposal slides for freelancers.",
  },
  {
    id: "job-hunt-playbook",
    name: "Job Hunt Playbook",
    category: "Ebooks",
    price: 14,
    rating: 4.6,
    description: "A practical guide for targeting roles, applications, and interviews.",
  },
  {
    id: "social-bundle",
    name: "Social Media Growth Bundle",
    category: "Templates",
    price: 17,
    rating: 4.5,
    description: "Content calendar, caption bank, and campaign templates for 90 days.",
  },
  {
    id: "audio-brand-pack",
    name: "Audio Branding Pack",
    category: "Media",
    price: 29,
    rating: 4.9,
    description: "Royalty-safe intros, loops, and sound logos for creators and podcasts.",
  },
  {
    id: "client-onboarding",
    name: "Client Onboarding System",
    category: "Ebooks",
    price: 22,
    rating: 4.7,
    description: "Automated onboarding scripts, checklists, and kickoff templates.",
  },
  {
    id: "pitch-deck",
    name: "Investor Pitch Deck Theme",
    category: "Design Kits",
    price: 31,
    rating: 4.8,
    description: "Story-driven deck templates with charts, milestones, and financial layouts.",
  },
  {
    id: "youtube-thumbnail",
    name: "YouTube Thumbnail Toolkit",
    category: "Templates",
    price: 16,
    rating: 4.5,
    description: "Ready-to-edit templates and layout guides for high click-through thumbnails.",
  },
];

const services = [
  {
    id: "cv-writing",
    name: "CV Writing",
    startPrice: 55,
    delivery: "48h",
    description: "Professional CV writing aligned to your target role and industry.",
  },
  {
    id: "linkedin-refresh",
    name: "LinkedIn Optimization",
    startPrice: 45,
    delivery: "72h",
    description: "Headline, summary, and experience improvements to attract recruiters.",
  },
  {
    id: "cover-letter",
    name: "Cover Letter Writing",
    startPrice: 35,
    delivery: "24h",
    description: "Custom cover letters matched to each job application context.",
  },
  {
    id: "portfolio-review",
    name: "Portfolio Review",
    startPrice: 65,
    delivery: "72h",
    description: "Detailed audit plus actionable recommendations for stronger conversion.",
  },
];

const testimonials = [
  {
    quote:
      "Kinnbay helped me relaunch my freelance profile in one weekend. The templates saved hours.",
    name: "Lydia K.",
    role: "UI Designer",
  },
  {
    quote:
      "The CV writing service got me more interview callbacks within two weeks than the previous three months.",
    name: "Brian O.",
    role: "Operations Analyst",
  },
  {
    quote:
      "I bought the onboarding system and cut admin time by almost half. It paid for itself quickly.",
    name: "Anne M.",
    role: "Agency Founder",
  },
];

const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const STORAGE_KEYS = {
  cart: "kinnbay_cart",
  purchases: "kinnbay_purchases",
  serviceOrders: "kinnbay_service_orders",
};

const state = {
  cart: loadJson(STORAGE_KEYS.cart, []),
  purchases: new Set(loadJson(STORAGE_KEYS.purchases, [])),
  category: "All",
  query: "",
  testimonialIndex: 0,
};

const refs = {
  menuToggle: document.querySelector(".menu-toggle"),
  mainNav: document.getElementById("mainNav"),
  productGrid: document.getElementById("productGrid"),
  serviceGrid: document.getElementById("serviceGrid"),
  libraryGrid: document.getElementById("libraryGrid"),
  libraryState: document.getElementById("libraryState"),
  searchInput: document.getElementById("searchInput"),
  categoryFilters: document.getElementById("categoryFilters"),
  cartButton: document.getElementById("cartButton"),
  cartCount: document.getElementById("cartCount"),
  cartDrawer: document.getElementById("cartDrawer"),
  closeCart: document.getElementById("closeCart"),
  cartItems: document.getElementById("cartItems"),
  cartTotal: document.getElementById("cartTotal"),
  checkoutButton: document.getElementById("checkoutButton"),
  checkoutModal: document.getElementById("checkoutModal"),
  checkoutForm: document.getElementById("checkoutForm"),
  serviceModal: document.getElementById("serviceModal"),
  serviceForm: document.getElementById("serviceForm"),
  serviceSelect: document.getElementById("serviceSelect"),
  toast: document.getElementById("toast"),
  testimonialQuote: document.getElementById("testimonialQuote"),
  testimonialName: document.getElementById("testimonialName"),
  testimonialRole: document.getElementById("testimonialRole"),
  prevTestimonial: document.getElementById("prevTestimonial"),
  nextTestimonial: document.getElementById("nextTestimonial"),
};

init();

function init() {
  renderCategoryChips();
  renderProducts();
  renderServices();
  renderLibrary();
  renderCart();
  renderTestimonial();
  setupEvents();
  setupReveal();
  setDateConstraints();
  startTestimonialAutoRotate();
}

function setupEvents() {
  refs.menuToggle?.addEventListener("click", toggleMenu);
  refs.mainNav?.addEventListener("click", (event) => {
    if (event.target.matches("a")) {
      closeMenu();
    }
  });

  refs.searchInput?.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderProducts();
  });

  refs.categoryFilters?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    renderCategoryChips();
    renderProducts();
  });

  refs.productGrid?.addEventListener("click", (event) => {
    const actionButton = event.target.closest("button[data-action]");
    if (!actionButton) return;

    const { action, productId } = actionButton.dataset;
    if (action === "add") addToCart(productId);
    if (action === "download") downloadProduct(productId);
  });

  refs.libraryGrid?.addEventListener("click", (event) => {
    const actionButton = event.target.closest("button[data-action]");
    if (!actionButton) return;
    const { action, productId } = actionButton.dataset;
    if (action === "download") downloadProduct(productId);
  });

  refs.serviceGrid?.addEventListener("click", (event) => {
    const orderButton = event.target.closest("button[data-service-id]");
    if (!orderButton) return;
    refs.serviceSelect.value = orderButton.dataset.serviceId;
    openModal(refs.serviceModal);
  });

  refs.cartButton?.addEventListener("click", openCart);
  refs.closeCart?.addEventListener("click", closeCart);

  refs.cartItems?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const { action, productId } = button.dataset;
    if (action === "inc") updateQty(productId, 1);
    if (action === "dec") updateQty(productId, -1);
    if (action === "remove") removeFromCart(productId);
  });

  refs.checkoutButton?.addEventListener("click", () => {
    if (!state.cart.length) {
      showToast("Your cart is empty.");
      return;
    }
    openModal(refs.checkoutModal);
  });

  refs.checkoutForm?.addEventListener("submit", onCheckoutSubmit);
  refs.serviceForm?.addEventListener("submit", onServiceSubmit);

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const modalId = event.currentTarget.getAttribute("data-close-modal");
      const modal = document.getElementById(modalId);
      closeModal(modal);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCart();
  });

  refs.prevTestimonial?.addEventListener("click", () => changeTestimonial(-1));
  refs.nextTestimonial?.addEventListener("click", () => changeTestimonial(1));
}

function renderCategoryChips() {
  const categories = ["All", ...new Set(products.map((item) => item.category))];
  refs.categoryFilters.innerHTML = categories
    .map((category) => {
      const activeClass = category === state.category ? "chip active" : "chip";
      return `<button type="button" class="${activeClass}" data-category="${category}">${category}</button>`;
    })
    .join("");
}

function renderProducts() {
  const matches = products.filter((product) => {
    const inCategory = state.category === "All" || product.category === state.category;
    const inSearch =
      product.name.toLowerCase().includes(state.query) ||
      product.description.toLowerCase().includes(state.query);
    return inCategory && inSearch;
  });

  if (!matches.length) {
    refs.productGrid.innerHTML = `<p class="empty">No products found. Try another keyword or category.</p>`;
    return;
  }

  refs.productGrid.innerHTML = matches
    .map((product) => {
      const owned = state.purchases.has(product.id);
      return `
        <article class="card">
          <span class="pill">${product.category}</span>
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description)}</p>
          <div class="price-row">
            <strong class="price">${CURRENCY.format(product.price)}</strong>
            <span class="muted">Rating ${product.rating}</span>
          </div>
          <div class="card-actions">
            <button class="btn btn-primary" data-action="add" data-product-id="${product.id}">Add to Cart</button>
            <button class="btn btn-outline" data-action="download" data-product-id="${product.id}" ${
        owned ? "" : "disabled"
      }>
              ${owned ? "Download" : "Locked"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderServices() {
  refs.serviceGrid.innerHTML = services
    .map(
      (service) => `
      <article class="card">
        <span class="pill">Service</span>
        <h3>${escapeHtml(service.name)}</h3>
        <p>${escapeHtml(service.description)}</p>
        <div class="service-meta">
          <strong>From ${CURRENCY.format(service.startPrice)}</strong>
          <span>${service.delivery}</span>
        </div>
        <button class="btn btn-primary" data-service-id="${service.id}">Order Service</button>
      </article>
    `,
    )
    .join("");

  refs.serviceSelect.innerHTML = services
    .map((service) => `<option value="${service.id}">${escapeHtml(service.name)}</option>`)
    .join("");
}

function renderLibrary() {
  const ownedProducts = products.filter((product) => state.purchases.has(product.id));

  if (!ownedProducts.length) {
    refs.libraryState.textContent = "Complete checkout to unlock files here for instant downloads.";
    refs.libraryGrid.innerHTML = "";
    return;
  }

  refs.libraryState.textContent = `You own ${ownedProducts.length} product${
    ownedProducts.length === 1 ? "" : "s"
  }.`;

  refs.libraryGrid.innerHTML = ownedProducts
    .map(
      (product) => `
      <article class="card">
        <span class="pill">${product.category}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <div class="price-row">
          <strong class="price">Purchased</strong>
          <span class="muted">Rating ${product.rating}</span>
        </div>
        <button class="btn btn-primary" data-action="download" data-product-id="${product.id}">Download File</button>
      </article>
    `,
    )
    .join("");
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const line = state.cart.find((item) => item.productId === productId);
  if (line) {
    line.qty += 1;
  } else {
    state.cart.push({ productId, qty: 1 });
  }

  persistCart();
  renderCart();
  showToast(`${product.name} added to cart.`);
}

function updateQty(productId, delta) {
  const line = state.cart.find((item) => item.productId === productId);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) {
    state.cart = state.cart.filter((item) => item.productId !== productId);
  }
  persistCart();
  renderCart();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((item) => item.productId !== productId);
  persistCart();
  renderCart();
}

function persistCart() {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(state.cart));
}

function renderCart() {
  const totalCount = state.cart.reduce((sum, line) => sum + line.qty, 0);
  refs.cartCount.textContent = String(totalCount);

  if (!state.cart.length) {
    refs.cartItems.innerHTML = `<p class="empty">No items yet. Add digital products to continue.</p>`;
    refs.cartTotal.textContent = CURRENCY.format(0);
    return;
  }

  const totalPrice = state.cart.reduce((sum, line) => {
    const product = products.find((item) => item.id === line.productId);
    return sum + (product ? product.price * line.qty : 0);
  }, 0);

  refs.cartItems.innerHTML = state.cart
    .map((line) => {
      const product = products.find((item) => item.id === line.productId);
      if (!product) return "";

      return `
        <article class="cart-item">
          <div class="cart-item-head">
            <strong>${escapeHtml(product.name)}</strong>
            <button class="close" data-action="remove" data-product-id="${product.id}" aria-label="Remove item">x</button>
          </div>
          <p class="muted">${CURRENCY.format(product.price)} each</p>
          <div class="qty-wrap">
            <button type="button" data-action="dec" data-product-id="${product.id}" aria-label="Decrease quantity">-</button>
            <span>${line.qty}</span>
            <button type="button" data-action="inc" data-product-id="${product.id}" aria-label="Increase quantity">+</button>
          </div>
        </article>
      `;
    })
    .join("");

  refs.cartTotal.textContent = CURRENCY.format(totalPrice);
}

function onCheckoutSubmit(event) {
  event.preventDefault();
  if (!state.cart.length) {
    showToast("Cart is empty.");
    return;
  }

  state.cart.forEach((line) => state.purchases.add(line.productId));
  localStorage.setItem(STORAGE_KEYS.purchases, JSON.stringify([...state.purchases]));
  state.cart = [];
  persistCart();
  renderCart();
  renderProducts();
  renderLibrary();
  closeModal(refs.checkoutModal);
  closeCart();
  refs.checkoutForm.reset();
  showToast("Payment successful. Your downloads are now unlocked.");
}

function onServiceSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const serviceId = formData.get("service");
  const deadline = formData.get("deadline");
  const service = services.find((item) => item.id === serviceId);

  if (!service) {
    showToast("Please select a valid service.");
    return;
  }

  if (!isFutureDate(deadline)) {
    showToast("Deadline should be today or later.");
    return;
  }

  const orderId = makeOrderId();
  const order = {
    orderId,
    serviceId,
    packageTier: formData.get("packageTier"),
    deadline,
    requirements: formData.get("requirements"),
    createdAt: new Date().toISOString(),
  };

  const existing = loadJson(STORAGE_KEYS.serviceOrders, []);
  existing.push(order);
  localStorage.setItem(STORAGE_KEYS.serviceOrders, JSON.stringify(existing));

  event.currentTarget.reset();
  refs.serviceSelect.value = services[0].id;
  closeModal(refs.serviceModal);
  showToast(`Service order received: ${orderId}`);
}

function downloadProduct(productId) {
  if (!state.purchases.has(productId)) {
    showToast("Complete checkout to unlock this product.");
    return;
  }

  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const payload = [
    "Kinnbay Digital Product",
    `Product: ${product.name}`,
    `Date: ${new Date().toLocaleDateString("en-US")}`,
    "",
    "This file is a demo download. Replace this with your real file delivery flow.",
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
  showToast(`${product.name} download started.`);
}

function openCart() {
  refs.cartDrawer.classList.add("open");
  refs.cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCart() {
  refs.cartDrawer.classList.remove("open");
  refs.cartDrawer.setAttribute("aria-hidden", "true");
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

function toggleMenu() {
  const expanded = refs.menuToggle.getAttribute("aria-expanded") === "true";
  refs.menuToggle.setAttribute("aria-expanded", String(!expanded));
  refs.mainNav.classList.toggle("open");
}

function closeMenu() {
  refs.menuToggle?.setAttribute("aria-expanded", "false");
  refs.mainNav?.classList.remove("open");
}

function renderTestimonial() {
  const item = testimonials[state.testimonialIndex];
  refs.testimonialQuote.textContent = `"${item.quote}"`;
  refs.testimonialName.textContent = item.name;
  refs.testimonialRole.textContent = item.role;
}

function changeTestimonial(step) {
  state.testimonialIndex = (state.testimonialIndex + step + testimonials.length) % testimonials.length;
  renderTestimonial();
}

function startTestimonialAutoRotate() {
  setInterval(() => changeTestimonial(1), 7000);
}

function setupReveal() {
  const blocks = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 },
  );

  blocks.forEach((block) => observer.observe(block));
}

function setDateConstraints() {
  const dateInput = refs.serviceForm?.querySelector("input[name='deadline']");
  if (!dateInput) return;
  const today = new Date().toISOString().slice(0, 10);
  dateInput.min = today;
  if (!dateInput.value) dateInput.value = today;
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    refs.toast.classList.remove("show");
  }, 2200);
}

function isFutureDate(value) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(`${value}T00:00:00`);
  return !Number.isNaN(selected.getTime()) && selected >= today;
}

function makeOrderId() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.floor(Math.random() * 9000 + 1000);
  return `SRV-${datePart}-${randomPart}`;
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
