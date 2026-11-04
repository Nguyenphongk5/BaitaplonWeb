const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const shoeMenuItem = document.querySelector(".has-mega-menu");
const shoeMenuTrigger = document.querySelector(".mega-menu-trigger");
const categoryMenuItems = [...document.querySelectorAll(".has-category-menu")];
const searchToggle = document.querySelector(".search-toggle");
const searchPanel = document.querySelector(".search-panel");
const searchInput = document.querySelector("#site-search");
const toast = document.querySelector(".toast");
const accountButton = document.querySelector(".account-button");
const productGrid = document.querySelector(".product-grid");
const featuredProductGrids = [...document.querySelectorAll(".featured-product-grid")];

let toastTimeout;
let productsExpanded = false;
let productSelection = null;
let productCards = [];
let catalogProducts = [];
const productTabs = [...document.querySelectorAll(".tab-button")];
const productSelectionPanel = document.querySelector(".product-selection");
const productSelectionMessage = document.querySelector(".product-selection-message");
const showMoreButton = document.querySelector(".show-more");

function renderProducts(category = "all", query = "") {
  const normalizedQuery = query.toLocaleLowerCase("vi");
  let visibleCount = 0;

  productCards.forEach((card) => {
    const isShoe = ["shoes", "tennis", "running", "lifestyle"].includes(card.dataset.category);
    const matchesCategory = category === "all"
      ? isShoe
      : card.dataset.category === category
        || (category === "shoes" && ["tennis", "running", "lifestyle"].includes(card.dataset.category));
    const matchesQuery = !normalizedQuery || card.textContent.toLocaleLowerCase("vi").includes(normalizedQuery);
    const isVisible = matchesCategory && matchesQuery && (productsExpanded || card.dataset.extra !== "true");
    card.classList.toggle("is-hidden", !isVisible);
    if (isVisible) visibleCount += 1;
  });

  productSelectionPanel.hidden = !productSelection;
  if (productSelection) {
    productSelectionMessage.textContent = visibleCount
      ? `Đang xem: ${productSelection.label} · ${visibleCount} sản phẩm`
      : `Chưa có sản phẩm "${productSelection.label}" trong danh sách demo.`;
  }
  showMoreButton.hidden = Boolean(productSelection) || productCards.length <= 6;
  showMoreButton.innerHTML = productsExpanded
    ? 'Thu gọn sản phẩm <span>↑</span>'
    : 'Xem thêm sản phẩm <span>→</span>';
}

function renderFeaturedSections(products) {
  featuredProductGrids.forEach((grid) => {
    const section = grid.closest(".featured-section");
    const category = grid.dataset.featuredProducts;
    const featured = category === "bestsellers"
      ? products
        .filter((product) => product.soldQuantity > 0 || product.badge?.toLocaleUpperCase("vi") === "BÁN CHẠY")
        .sort((a, b) => b.soldQuantity - a.soldQuantity)
        .slice(0, 6)
      : products.filter((product) => product.category === category).slice(0, 6);
    section.hidden = featured.length === 0;
    grid.replaceChildren(...featured.map((product, index) => createProductCard(product, index)));
  });
}

function createProductCard(product, index) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.dataset.category = product.category;
  card.dataset.productId = product.id;
  card.dataset.stock = product.stockQuantity;
  card.dataset.hasVariants = String((product.variants?.length ?? 0) > 0);
  if (index >= 6) card.dataset.extra = "true";

  const imageContainer = document.createElement("div");
  imageContainer.className = "product-image";
  const badgeText = product.stockQuantity === 0 ? "HẾT HÀNG" : product.badge;
  if (badgeText) {
    const badge = document.createElement("span");
    badge.className = "product-badge";
    if (badgeText === "MỚI") badge.classList.add("badge-new");
    if (badgeText === "HẾT HÀNG" || badgeText.includes("%")) badge.classList.add("badge-sale");
    badge.textContent = badgeText;
    imageContainer.append(badge);
  }

  const favoriteButton = document.createElement("button");
  favoriteButton.className = "favorite-button";
  favoriteButton.type = "button";
  favoriteButton.setAttribute("aria-label", "Thêm vào yêu thích");
  favoriteButton.textContent = "♡";

  const image = document.createElement("img");
  image.src = product.imageUrl;
  image.alt = `${product.brand} ${product.name}`;
  image.loading = "lazy";
  const detailLink = document.createElement("a");
  detailLink.className = "product-detail-link";
  detailLink.href = `/product.html?id=${encodeURIComponent(product.id)}`;
  detailLink.setAttribute("aria-label", `Xem chi tiết ${product.name}`);
  detailLink.append(image);
  imageContainer.append(favoriteButton, detailLink);

  const info = document.createElement("div");
  info.className = "product-info";
  const brand = document.createElement("p");
  brand.className = "product-brand";
  brand.textContent = product.brand;
  const name = document.createElement("h3");
  const nameLink = document.createElement("a");
  nameLink.href = `/product.html?id=${encodeURIComponent(product.id)}`;
  nameLink.textContent = product.name;
  name.append(nameLink);
  const bottom = document.createElement("div");
  bottom.className = "product-bottom";
  const price = document.createElement("strong");
  price.textContent = `${new Intl.NumberFormat("vi-VN").format(product.price)} ₫`;
  const addButton = document.createElement("button");
  addButton.className = "add-cart";
  addButton.type = "button";
  addButton.disabled = product.stockQuantity === 0;
  addButton.setAttribute("aria-label", product.stockQuantity === 0 ? `${product.name} đã hết hàng` : `Thêm ${product.name} vào giỏ`);
  addButton.textContent = product.stockQuantity === 0 ? "×" : "+";
  const stock = document.createElement("p");
  stock.className = `product-stock${product.stockQuantity === 0 ? " is-out-of-stock" : ""}`;
  stock.textContent = product.stockQuantity === 0 ? "Tạm hết hàng" : `Còn ${product.stockQuantity} sản phẩm`;
  const detailAction = document.createElement("a");
  detailAction.className = "product-detail-action";
  detailAction.href = `/product.html?id=${encodeURIComponent(product.id)}`;
  detailAction.append(document.createTextNode("Xem chi tiết "));
  const detailArrow = document.createElement("span");
  detailArrow.setAttribute("aria-hidden", "true");
  detailArrow.textContent = "↗";
  detailAction.append(detailArrow);
  bottom.append(price, addButton);
  info.append(brand, name, stock, bottom, detailAction);
  card.append(imageContainer, info);
  return card;
}

function selectMegaMenuLink(link) {
  const activeCategory = shoeMenuItem.querySelector(".mega-category.is-active").dataset.megaCategory;
  const label = link.textContent.replace(/\s+(SALE|HOT)$/i, "").trim();
  const columnTitle = link.closest(".mega-column").querySelector("h3").textContent.toLocaleLowerCase("vi");
  let query = "";
  let category = "shoes";

  if (activeCategory === "nike") query = "nike";
  if (activeCategory === "adidas") query = "adidas";
  if (activeCategory === "jordan") query = "jordan";
  if (activeCategory === "other") {
    if (columnTitle.includes("asics")) query = "asics";
    else if (columnTitle.includes("new balance")) query = "new balance";
    else if (columnTitle.includes("puma")) query = "puma";
    else query = label;
  }
  if (activeCategory === "sports") {
    const normalizedLabel = label.toLocaleLowerCase("vi");
    if (normalizedLabel.includes("pickleball")) query = "pickleball";
    else if (normalizedLabel.includes("tennis")) category = "tennis";
    else if (normalizedLabel.includes("chạy")) category = "running";
  }

  selectProductCategory(category, label, query);
}

function selectProductCategory(category, label, query = "") {
  productSelection = { label, category, query };
  productsExpanded = true;
  productTabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.filter === category));
  renderProducts(category, query);
  document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

fetch("/api/products")
  .then((response) => {
    if (!response.ok) throw new Error("Không thể tải danh sách sản phẩm.");
    return response.json();
  })
  .then((products) => {
    catalogProducts = products;
    productCards = products.map(createProductCard);
    productCards.forEach((card, index) => {
      card.dataset.price = String(products[index].price);
    });
    productGrid.replaceChildren(...productCards);
    renderProducts(document.querySelector(".tab-button.is-active").dataset.filter);
    renderFeaturedSections(catalogProducts);
  })
  .catch((error) => {
    console.error("Could not load products.", error);
    showToast("Không thể tải sản phẩm. Vui lòng tải lại trang.");
  });

window.addEventListener("store:products-updated", (event) => {
  catalogProducts = event.detail;
  productCards = catalogProducts.map(createProductCard);
  productCards.forEach((card, index) => {
    card.dataset.price = String(catalogProducts[index].price);
  });
  productGrid.replaceChildren(...productCards);
  renderProducts(
    document.querySelector(".tab-button.is-active").dataset.filter,
    productSelection?.query ?? ""
  );
  renderFeaturedSections(catalogProducts);
});

fetch("/auth/status")
  .then((response) => {
    if (!response.ok) throw new Error("Could not load the account status.");
    return response.json();
  })
  .then((account) => {
    if (!account.isAuthenticated) return;
    accountButton.href = "/account";
    accountButton.setAttribute("aria-label", `Tài khoản ${account.userName}`);
    accountButton.title = `Tài khoản ${account.userName}`;
  })
  .catch((error) => console.error("Could not load the account status.", error));

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  mainNav.classList.toggle("is-open", !isOpen);
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    if (link.matches(".category-menu-trigger, .mega-menu-trigger")) return;
    mainNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    closeCategoryMenus();
  });
});

function closeCategoryMenus(except = null) {
  categoryMenuItems.forEach((item) => {
    if (item === except) return;
    item.classList.remove("is-open");
    item.querySelector(".category-menu-trigger, .mega-menu-trigger").setAttribute("aria-expanded", "false");
  });
}

categoryMenuItems.forEach((item) => {
  const trigger = item.querySelector(".category-menu-trigger, .mega-menu-trigger");
  const isShoesMenu = item === shoeMenuItem;

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    const isPointerDevice = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const willOpen = isPointerDevice || !item.classList.contains("is-open");
    closeCategoryMenus();
    item.classList.toggle("is-open", willOpen);
    trigger.setAttribute("aria-expanded", String(willOpen));
  });

  item.addEventListener("mouseenter", () => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    closeCategoryMenus(item);
    item.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
  });

  item.addEventListener("mouseleave", () => {
    item.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
  });

  if (!isShoesMenu) {
    item.querySelectorAll(".category-menu a").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        selectProductCategory(link.dataset.productCategory, link.dataset.categoryLabel, link.dataset.categoryQuery ?? "");
        item.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
        mainNav.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }
});

shoeMenuItem.querySelectorAll(".mega-category").forEach((category) => {
  const activateCategory = () => {
    const categoryName = category.dataset.megaCategory;
    shoeMenuItem.querySelectorAll(".mega-category").forEach((button) => {
      const isActive = button === category;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
    shoeMenuItem.querySelectorAll(".mega-panel").forEach((panel) => {
      const isActive = panel.dataset.megaPanel === categoryName;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });
  };

  category.addEventListener("mouseenter", activateCategory);
  category.addEventListener("focus", activateCategory);
  category.addEventListener("click", activateCategory);
});

shoeMenuItem.querySelectorAll(".mega-panel a").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    selectMegaMenuLink(link);
    shoeMenuItem.classList.remove("is-open");
    shoeMenuTrigger.setAttribute("aria-expanded", "false");
    mainNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

document.addEventListener("click", (event) => {
  if (!categoryMenuItems.some((item) => item.contains(event.target))) closeCategoryMenus();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && categoryMenuItems.some((item) => item.classList.contains("is-open"))) {
    closeCategoryMenus();
    shoeMenuTrigger.focus();
  }
});

document.querySelectorAll(".category-card[data-product-category]").forEach((card) => {
  card.addEventListener("click", (event) => {
    event.preventDefault();
    selectProductCategory(card.dataset.productCategory, card.dataset.categoryLabel);
  });
});

document.querySelectorAll("[data-brand-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    const brand = button.dataset.brandFilter;
    selectProductCategory("shoes", brand, brand);
  });
});

searchToggle.addEventListener("click", () => {
  const isOpen = searchPanel.classList.toggle("is-open");
  if (isOpen) searchInput.focus();
});

searchPanel.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = searchInput.value.trim().toLocaleLowerCase("vi");
  if (!query) {
    searchInput.focus();
    return;
  }
  productSelection = { label: `Tìm kiếm: ${searchInput.value.trim()}`, category: "all", query };
  productsExpanded = true;
  productTabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.filter === "all"));
  renderProducts("all", query);
  const visibleCount = productCards.filter((card) => !card.classList.contains("is-hidden")).length;
  document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
  showToast(visibleCount ? `Tìm thấy ${visibleCount} sản phẩm phù hợp.` : "Chưa tìm thấy sản phẩm phù hợp.");
  searchPanel.classList.remove("is-open");
});

const slides = [...document.querySelectorAll(".hero-slide")];
const dots = [...document.querySelectorAll(".slide-dot")];
let activeSlide = 0;
let slideTimer;

function showSlide(index) {
  activeSlide = (index + slides.length) % slides.length;
  slides.forEach((slide, position) => slide.classList.toggle("is-active", position === activeSlide));
  dots.forEach((dot, position) => {
    dot.classList.toggle("is-active", position === activeSlide);
    dot.setAttribute("aria-current", position === activeSlide ? "true" : "false");
  });
}

function restartSlideTimer() {
  window.clearInterval(slideTimer);
  slideTimer = window.setInterval(() => showSlide(activeSlide + 1), 6000);
}

document.querySelector(".slide-prev").addEventListener("click", () => {
  showSlide(activeSlide - 1);
  restartSlideTimer();
});
document.querySelector(".slide-next").addEventListener("click", () => {
  showSlide(activeSlide + 1);
  restartSlideTimer();
});
dots.forEach((dot) => dot.addEventListener("click", () => {
  showSlide(Number(dot.dataset.goTo));
  restartSlideTimer();
}));
restartSlideTimer();

productTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    productSelection = null;
    productTabs.forEach((button) => button.classList.remove("is-active"));
    tab.classList.add("is-active");
    renderProducts(tab.dataset.filter);
  });
});

async function handleProductCardClick(event) {
  const addButton = event.target.closest(".add-cart");
  if (addButton) {
    const card = addButton.closest(".product-card");
    if (card.dataset.hasVariants === "true") {
      window.location.href = `/product.html?id=${encodeURIComponent(card.dataset.productId)}`;
      return;
    }
    addButton.disabled = true;
    try {
      await window.StoreCart.add(Number(card.dataset.productId));
    } catch (error) {
      console.error("Could not add product to cart.", error);
      showToast(error.message);
    } finally {
      addButton.disabled = Number(card.dataset.stock) === 0;
    }
    return;
  }

  const favoriteButton = event.target.closest(".favorite-button");
  if (favoriteButton) {
    const isFavorite = favoriteButton.classList.toggle("is-favorite");
    favoriteButton.textContent = isFavorite ? "♥" : "♡";
    favoriteButton.setAttribute("aria-label", isFavorite ? "Xóa khỏi yêu thích" : "Thêm vào yêu thích");
  }
}

productGrid.addEventListener("click", handleProductCardClick);
featuredProductGrids.forEach((grid) => grid.addEventListener("click", handleProductCardClick));

document.querySelectorAll("[data-featured-category]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const category = link.dataset.featuredCategory;
    const label = link.closest(".featured-section").querySelector("h2").textContent;
    selectProductCategory(category, label);
  });
});

showMoreButton.addEventListener("click", () => {
  productsExpanded = !productsExpanded;
  renderProducts(document.querySelector(".tab-button.is-active").dataset.filter, productSelection?.query ?? "");
});

document.querySelector(".clear-product-selection").addEventListener("click", () => {
  productSelection = null;
  productsExpanded = false;
  productTabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.filter === "all"));
  renderProducts("all");
});

renderProducts();
showSlide(0);
