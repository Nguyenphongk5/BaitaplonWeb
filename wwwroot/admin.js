const adminSidebar = document.querySelector("#admin-sidebar");
const sidebarToggle = document.querySelector(".sidebar-toggle");
const orderSearch = document.querySelector("#order-search");
const ordersTableBody = document.querySelector(".orders-table-body");
const emptyOrders = document.querySelector(".empty-orders");
const adminToast = document.querySelector(".admin-toast");
const productTableBody = document.querySelector(".product-table-body");
const productSearch = document.querySelector("#product-search");
const productCategoryFilters = document.querySelector(".product-category-filters");
const productDialog = document.querySelector(".admin-product-dialog");
const productForm = document.querySelector(".admin-product-form");
const productFormError = document.querySelector(".product-form-error");
const productCount = document.querySelector(".product-count");
const productColorGroups = document.querySelector(".product-color-groups");
let adminToastTimeout;
let products = [];
let orders = [];
let orderRows = [];
let antiforgeryToken;
let selectedProductCategory = "all";

const productCategories = [
  { value: "all", label: "Tất cả" },
  { value: "shoes", label: "Giày" },
  { value: "clothing", label: "Quần áo" },
  { value: "pickleball-racket", label: "Vợt Pickleball" },
  { value: "accessories", label: "Phụ kiện" },
  { value: "tennis", label: "Tennis" },
  { value: "running", label: "Chạy bộ" },
  { value: "lifestyle", label: "Lifestyle" }
];

function showAdminToast(message) {
  adminToast.textContent = message;
  adminToast.classList.add("is-visible");
  window.clearTimeout(adminToastTimeout);
  adminToastTimeout = window.setTimeout(() => adminToast.classList.remove("is-visible"), 2400);
}

function statusLabel(status) {
  return {
    Pending: "Chờ xác nhận",
    Confirmed: "Đã xác nhận",
    Shipping: "Đang giao",
    Completed: "Hoàn tất",
    Cancelled: "Đã hủy"
  }[status] ?? status;
}

function statusClass(status) {
  return {
    Pending: "status-processing",
    Confirmed: "status-confirmed",
    Shipping: "status-shipping",
    Completed: "status-completed",
    Cancelled: "status-cancelled"
  }[status] ?? "";
}

function allowedStatuses(status) {
  return {
    Pending: ["Pending", "Confirmed", "Cancelled"],
    Confirmed: ["Confirmed", "Shipping", "Cancelled"],
    Shipping: ["Shipping", "Completed"],
    Completed: ["Completed"],
    Cancelled: ["Cancelled"]
  }[status] ?? [status];
}

function applyOrderSearch() {
  const query = orderSearch.value.trim().toLocaleLowerCase("vi");
  let visibleRows = 0;
  orderRows.forEach((row) => {
    const matches = row.textContent.toLocaleLowerCase("vi").includes(query);
    row.hidden = !matches;
    if (matches) visibleRows += 1;
  });
  emptyOrders.hidden = visibleRows > 0;
  document.querySelector(".order-count").textContent =
    `Đang hiển thị ${visibleRows} trên ${orders.length} đơn hàng`;
}

function renderOrders() {
  orderRows = orders.map((order) => {
    const row = document.createElement("tr");
    row.dataset.orderId = order.id;

    const orderId = document.createElement("td");
    orderId.className = "order-id";
    orderId.textContent = `#AS-${String(order.id).padStart(6, "0")}`;
    const customerCell = document.createElement("td");
    const customer = document.createElement("span");
    customer.className = "customer-cell";
    const customerAvatar = document.createElement("span");
    customerAvatar.className = "avatar customer-avatar avatar-one";
    customerAvatar.textContent = order.customerName.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toLocaleUpperCase("vi");
    const customerDetails = document.createElement("span");
    customerDetails.className = "order-customer-details";
    const customerName = document.createElement("strong");
    customerName.textContent = order.customerName;
    const phone = document.createElement("small");
    phone.textContent = order.phoneNumber;
    phone.title = order.shippingAddress;
    customerDetails.append(customerName, phone);
    customer.append(customerAvatar, customerDetails);
    customerCell.append(customer);

    const dateCell = document.createElement("td");
    dateCell.textContent = new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(order.createdAtUtc));

    const itemsCell = document.createElement("td");
    itemsCell.className = "order-items-cell";
    itemsCell.textContent = order.items.map((item) =>
      `${item.productName}${item.color || item.variant ? ` (${[item.color, item.variant].filter(Boolean).join(" · ")})` : ""} × ${item.quantity}`).join(", ");
    itemsCell.title = order.shippingAddress;
    const total = document.createElement("td");
    total.className = "order-total";
    total.textContent = `${new Intl.NumberFormat("vi-VN").format(order.totalAmount)} ₫`;

    const statusCell = document.createElement("td");
    const statusSelect = document.createElement("select");
    statusSelect.className = `order-status-select ${statusClass(order.status)}`;
    statusSelect.setAttribute("aria-label", `Trạng thái đơn #AS-${String(order.id).padStart(6, "0")}`);
    allowedStatuses(order.status).forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = statusLabel(status);
      statusSelect.append(option);
    });
    statusSelect.value = order.status;
    statusCell.append(statusSelect);
    row.append(orderId, customerCell, dateCell, itemsCell, total, statusCell);
    return row;
  });
  ordersTableBody.replaceChildren(...orderRows);
  document.querySelector(".nav-count").textContent = String(orders.length);
  applyOrderSearch();
}

async function loadOrders() {
  orders = await requestProductApi("/api/admin/orders");
  renderOrders();
}

ordersTableBody.addEventListener("change", async (event) => {
  const select = event.target.closest(".order-status-select");
  if (!select) return;
  const row = select.closest("tr");
  const orderId = Number(row.dataset.orderId);
  const order = orders.find((item) => item.id === orderId);
  if (!order) return;
  const previousStatus = order.status;
  const newStatus = select.value;
  if (newStatus === previousStatus) return;

  select.disabled = true;
  try {
    const token = await getAntiforgeryToken();
    await requestProductApi(`/api/admin/orders/${orderId}/status`, {
      method: "PUT",
      headers: { RequestVerificationToken: token },
      body: JSON.stringify({ status: newStatus })
    });
    order.status = newStatus;
    renderOrders();
    await loadProducts();
    showAdminToast(newStatus === "Cancelled"
      ? "Đơn đã hủy, số lượng đã được hoàn lại kho."
      : `Đã cập nhật trạng thái: ${statusLabel(newStatus)}.`);
  } catch (error) {
    console.error("Could not update order status.", error);
    select.value = previousStatus;
    showAdminToast(error.message);
  } finally {
    select.disabled = false;
  }
});

async function requestProductApi(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {})
    }
  });

  if (response.status === 401 || response.status === 403) {
    window.location.href = "/login?ReturnUrl=%2Fadmin";
    throw new Error("Phiên đăng nhập quản trị đã hết hạn.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const validationMessages = body?.errors
      ? Object.values(body.errors).flat().join(" ")
      : "";
      throw new Error(validationMessages || body?.message || body?.detail || body?.title || "Không thể hoàn tất thao tác.");
  }

  return response.status === 204 ? null : response.json();
}

async function getAntiforgeryToken() {
  if (!antiforgeryToken) {
    const result = await requestProductApi("/api/admin/products/antiforgery");
    antiforgeryToken = result.token;
  }
  return antiforgeryToken;
}

function categoryLabel(category) {
  return {
    tennis: "Tennis",
    running: "Chạy bộ",
    lifestyle: "Lifestyle",
    clothing: "Quần áo",
    shoes: "Giày",
    "pickleball-racket": "Vợt Pickleball",
    accessories: "Phụ kiện"
  }[category] ?? category;
}

function productsInCategory(category) {
  if (category === "all") return products;
  if (category === "shoes") {
    return products.filter((product) => ["shoes", "tennis", "running", "lifestyle"].includes(product.category));
  }
  return products.filter((product) => product.category === category);
}

function renderProductCategoryFilters() {
  productCategoryFilters.replaceChildren(...productCategories.map((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `product-category-filter${selectedProductCategory === category.value ? " is-active" : ""}`;
    button.dataset.category = category.value;
    button.setAttribute("aria-pressed", String(selectedProductCategory === category.value));
    const label = document.createElement("span");
    label.textContent = category.label;
    const count = document.createElement("small");
    count.textContent = String(productsInCategory(category.value).length);
    button.append(label, count);
    return button;
  }));
}

function productStockQuantity(product) {
  return product.variants?.length
    ? product.variants.reduce((total, variant) => total + variant.stockQuantity, 0)
    : product.stockQuantity;
}

function renderProductRows() {
  const query = productSearch.value.trim().toLocaleLowerCase("vi");
  const visibleProducts = productsInCategory(selectedProductCategory).filter((product) =>
    `${product.name} ${product.brand}`.toLocaleLowerCase("vi").includes(query));
  productTableBody.replaceChildren(...visibleProducts.map((product) => {
    const row = document.createElement("tr");
    row.dataset.productId = product.id;

    const productCell = document.createElement("td");
    const productName = document.createElement("div");
    productName.className = "product-table-name";
    const image = document.createElement("img");
    image.className = "product-table-image";
    image.src = product.imageUrl;
    image.alt = "";
    image.loading = "lazy";
    const copy = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = product.name;
    const brand = document.createElement("small");
    brand.textContent = product.brand;
    copy.append(name, brand);
    productName.append(image, copy);
    productCell.append(productName);

    const category = document.createElement("td");
    category.textContent = categoryLabel(product.category);
    const price = document.createElement("td");
    price.className = "product-table-price";
    price.textContent = `${new Intl.NumberFormat("vi-VN").format(product.price)} ₫`;
    const stockCell = document.createElement("td");
    const stockQuantity = productStockQuantity(product);
    stockCell.className = `product-stock-cell${stockQuantity === 0 ? " is-out-of-stock" : ""}`;
    stockCell.textContent = `${new Intl.NumberFormat("vi-VN").format(stockQuantity)} sản phẩm`;
    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    status.className = `product-visibility ${product.isActive ? "is-active" : "is-inactive"}`;
    status.textContent = product.isActive ? "Đang bán" : "Đã ẩn";
    statusCell.append(status);

    const actions = document.createElement("td");
    const actionGroup = document.createElement("div");
    actionGroup.className = "product-row-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.textContent = "Sửa";
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.className = "delete-product-button";
    deleteButton.textContent = "Xóa";
    actionGroup.append(editButton, deleteButton);
    actions.append(actionGroup);

    row.append(productCell, category, price, stockCell, statusCell, actions);
    return row;
  }));
  document.querySelector(".empty-products").hidden = visibleProducts.length > 0;
  const totalStock = visibleProducts.reduce((total, product) => total + productStockQuantity(product), 0);
  productCount.textContent =
    `Đang hiển thị ${visibleProducts.length} sản phẩm · Tổng tồn kho ${new Intl.NumberFormat("vi-VN").format(totalStock)} sản phẩm`;
  renderProductCategoryFilters();
}

async function loadProducts() {
  products = await requestProductApi("/api/admin/products");
  renderProductRows();
}

function openProductDialog(product = null) {
  productForm.reset();
  productFormError.hidden = true;
  productFormError.textContent = "";
  productForm.dataset.productId = product?.id ?? "";
  productForm.elements.name.value = product?.name ?? "";
  productForm.elements.brand.value = product?.brand ?? "";
  productForm.elements.category.value = product?.category ?? "tennis";
  productForm.elements.price.value = product?.price ?? "";
  productForm.elements.imageUrl.value = product?.imageUrl ?? "";
  productForm.elements.badge.value = product?.badge ?? "";
  productForm.elements.stockQuantity.value = product?.stockQuantity ?? 10;
  productForm.elements.isActive.checked = product?.isActive ?? true;
  productColorGroups.replaceChildren();
  const variantsByColor = (product?.variants ?? []).reduce((groups, variant) => {
    const variants = groups.get(variant.color) ?? [];
    variants.push(variant);
    groups.set(variant.color, variants);
    return groups;
  }, new Map());
  for (const [color, variants] of variantsByColor) {
    addProductColorGroup({
      color,
      colorHex: variants[0].colorHex,
      sizes: variants.map((variant) => ({ size: variant.size, stockQuantity: variant.stockQuantity }))
    });
  }
  updateStockFieldVisibility();
  document.querySelector("#product-dialog-title").textContent = product ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm";
  document.querySelector(".product-save-button").textContent = product ? "Lưu thay đổi" : "Lưu sản phẩm";
  productDialog.showModal();
}

function addProductColorGroup(colorVariant = {}) {
  const group = document.createElement("section");
  group.className = "product-color-group";
  const heading = document.createElement("div");
  heading.className = "product-color-heading";
  const color = document.createElement("input");
  color.type = "text";
  color.maxLength = 40;
  color.placeholder = "Tên màu (VD: Đỏ)";
  color.value = colorVariant.color ?? "";
  color.setAttribute("aria-label", "Tên màu");
  const colorHex = document.createElement("input");
  colorHex.type = "color";
  colorHex.value = colorVariant.colorHex ?? "#333333";
  colorHex.setAttribute("aria-label", "Mã màu sắc");
  const removeColor = document.createElement("button");
  removeColor.type = "button";
  removeColor.className = "remove-product-color";
  removeColor.setAttribute("aria-label", "Xóa màu sắc");
  removeColor.textContent = "×";
  removeColor.addEventListener("click", () => {
    group.remove();
    updateStockFieldVisibility();
  });
  const colorLabel = document.createElement("label");
  colorLabel.append(document.createTextNode("Tên màu"), color);
  const colorCodeLabel = document.createElement("label");
  colorCodeLabel.append(document.createTextNode("Mã màu"), colorHex);
  const addSize = document.createElement("button");
  addSize.type = "button";
  addSize.className = "add-product-size";
  addSize.textContent = "+ Thêm size";
  addSize.addEventListener("click", () => addProductSizeRow(group));
  heading.append(colorLabel, colorCodeLabel, addSize, removeColor);
  const sizes = document.createElement("div");
  sizes.className = "product-size-rows";
  group.append(heading, sizes);
  productColorGroups.append(group);
  (colorVariant.sizes ?? [{}]).forEach((size) => addProductSizeRow(group, size));
  updateStockFieldVisibility();
}

function addProductSizeRow(group, variant = {}) {
  const row = document.createElement("div");
  row.className = "product-size-row";
  const size = document.createElement("input");
  size.type = "text";
  size.maxLength = 20;
  size.placeholder = "Size (VD: 40)";
  size.value = variant.size ?? "";
  size.required = true;
  size.setAttribute("aria-label", "Size");
  const stock = document.createElement("input");
  stock.type = "number";
  stock.min = "0";
  stock.max = "1000000";
  stock.step = "1";
  stock.required = true;
  stock.value = variant.stockQuantity ?? 0;
  stock.setAttribute("aria-label", "Tồn kho size");
  const removeSize = document.createElement("button");
  removeSize.type = "button";
  removeSize.className = "remove-product-size";
  removeSize.setAttribute("aria-label", "Xóa size");
  removeSize.textContent = "Xóa size";
  removeSize.addEventListener("click", () => {
    row.remove();
    if (group.querySelectorAll(".product-size-row").length === 0) group.remove();
    updateStockFieldVisibility();
  });
  row.append(size, stock, removeSize);
  group.querySelector(".product-size-rows").append(row);
}

function updateStockFieldVisibility() {
  document.querySelector(".product-legacy-stock-field").hidden = productColorGroups.children.length > 0;
}

async function initializeProductManagement() {
  const response = await fetch("/auth/status");
  if (!response.ok) throw new Error("Không thể kiểm tra quyền quản trị.");
  const account = await response.json();
  if (!account.isAdmin) {
    window.location.href = "/";
    return;
  }
  await loadProducts();
  await loadOrders();
}

initializeProductManagement().catch((error) => {
  console.error("Could not initialize product management.", error);
  showAdminToast(error.message);
});

document.querySelector(".add-product-button").addEventListener("click", () => openProductDialog());
document.querySelector(".close-product-dialog").addEventListener("click", () => productDialog.close());
document.querySelector(".dialog-cancel-button").addEventListener("click", () => productDialog.close());
document.querySelector(".add-product-color").addEventListener("click", () => addProductColorGroup());
productSearch.addEventListener("input", renderProductRows);
productCategoryFilters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button) return;
  selectedProductCategory = button.dataset.category;
  renderProductRows();
});

productTableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest("tr");
  const product = products.find((item) => item.id === Number(row.dataset.productId));
  if (!product) return;

  if (button.dataset.action === "edit") {
    openProductDialog(product);
    return;
  }

  if (!window.confirm(`Xóa sản phẩm "${product.name}" khỏi cửa hàng?`)) return;
  try {
    const token = await getAntiforgeryToken();
    await requestProductApi(`/api/admin/products/${product.id}`, {
      method: "DELETE",
      headers: { RequestVerificationToken: token }
    });
    products = products.filter((item) => item.id !== product.id);
    renderProductRows();
    showAdminToast("Đã xóa sản phẩm.");
  } catch (error) {
    console.error("Could not delete product.", error);
    showAdminToast(error.message);
  }
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!productForm.reportValidity()) return;

  const formData = new FormData(productForm);
  const productId = productForm.dataset.productId;
  const payload = {
    name: formData.get("name").trim(),
    brand: formData.get("brand").trim(),
    category: formData.get("category"),
    price: Number(formData.get("price")),
    imageUrl: formData.get("imageUrl").trim(),
    badge: formData.get("badge").trim() || null,
    stockQuantity: Number(formData.get("stockQuantity") || 0),
    variants: [...productColorGroups.querySelectorAll(".product-color-group")].flatMap((group) => {
      const color = group.querySelector('[aria-label="Tên màu"]').value.trim();
      const colorHex = group.querySelector('[aria-label="Mã màu sắc"]').value;
      return [...group.querySelectorAll(".product-size-row")].map((row) => ({
        color,
        colorHex,
        size: row.querySelector('[aria-label="Size"]').value.trim(),
        stockQuantity: Number(row.querySelector('[aria-label="Tồn kho size"]').value)
      }));
    }),
    isActive: formData.has("isActive")
  };
  const saveButton = document.querySelector(".product-save-button");
  saveButton.disabled = true;
  productFormError.hidden = true;

  try {
    const token = await getAntiforgeryToken();
    const savedProduct = await requestProductApi(
      productId ? `/api/admin/products/${productId}` : "/api/admin/products",
      {
        method: productId ? "PUT" : "POST",
        headers: { RequestVerificationToken: token },
        body: JSON.stringify(payload)
      }
    );
    if (productId) {
      products = products.map((product) => product.id === savedProduct.id ? savedProduct : product);
    } else {
      products.unshift(savedProduct);
    }
    renderProductRows();
    productDialog.close();
    showAdminToast(productId ? "Đã cập nhật sản phẩm." : "Đã thêm sản phẩm vào cửa hàng.");
  } catch (error) {
    console.error("Could not save product.", error);
    productFormError.textContent = error.message;
    productFormError.hidden = false;
  } finally {
    saveButton.disabled = false;
  }
});

sidebarToggle.addEventListener("click", () => {
  const isOpen = adminSidebar.classList.toggle("is-open");
  sidebarToggle.setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll(".sidebar-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-link").forEach((item) => item.classList.remove("is-active"));
    link.classList.add("is-active");
    adminSidebar.classList.remove("is-open");
    sidebarToggle.setAttribute("aria-expanded", "false");
  });
});

orderSearch.addEventListener("input", applyOrderSearch);

const periodValues = {
  "12 tháng qua": [
    [38, 23], [47, 30], [42, 26], [57, 34], [50, 39], [68, 43],
    [61, 38], [78, 52], [71, 48], [88, 60], [77, 55], [97, 67]
  ],
  "30 ngày qua": [
    [30, 21], [45, 28], [38, 24], [57, 36], [48, 34], [70, 45],
    [64, 41], [53, 38], [76, 52], [69, 49], [86, 62], [96, 72]
  ],
  "7 ngày qua": [
    [33, 25], [47, 36], [41, 31], [64, 48], [55, 42], [79, 59],
    [68, 51], [58, 44], [75, 58], [70, 53], [88, 67], [98, 76]
  ]
};

document.querySelectorAll(".chart-column").forEach((column) => {
  column.style.setProperty("--revenue", column.dataset.revenue);
  column.style.setProperty("--orders", column.dataset.orders);
});

const periodButton = document.querySelector(".period-button");
const periodOptions = Object.keys(periodValues);
let activePeriod = 0;

periodButton.addEventListener("click", () => {
  activePeriod = (activePeriod + 1) % periodOptions.length;
  const period = periodOptions[activePeriod];
  periodButton.innerHTML = `${period} <span>⌄</span>`;
  document.querySelectorAll(".chart-column").forEach((column, index) => {
    const [revenue, orders] = periodValues[period][index];
    column.style.setProperty("--revenue", revenue);
    column.style.setProperty("--orders", orders);
  });
  showAdminToast(`Đã cập nhật biểu đồ: ${period.toLocaleLowerCase("vi")}.`);
});

document.querySelector(".export-button").addEventListener("click", () => {
  const rows = [
    ["Mã đơn hàng", "Khách hàng", "Ngày đặt", "Sản phẩm", "Tổng tiền COD", "Trạng thái"],
    ...orderRows
      .filter((row) => !row.hidden)
      .map((row) => [...row.cells].slice(0, 6).map((cell) => cell.innerText.replace(/\s+/g, " ").trim()))
  ];
  const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\r\n")}`;
  const file = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = "authentic-shoes-don-hang.csv";
  link.click();
  URL.revokeObjectURL(link.href);
  showAdminToast("Đã tải báo cáo đơn hàng dạng CSV.");
});

document.querySelector(".date-button").addEventListener("click", () => {
  showAdminToast("Dữ liệu đang hiển thị cho ngày 01 Tháng 11, 2026.");
});

document.querySelector(".notification-button").addEventListener("click", () => {
  showAdminToast("Bạn có 3 thông báo mới từ cửa hàng.");
});

document.querySelectorAll(".pagination button:not(:disabled)").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.hasAttribute("aria-label")) {
      showAdminToast("Đây là dữ liệu mẫu của giao diện quản trị.");
      return;
    }
    document.querySelectorAll(".pagination button").forEach((item) => {
      item.classList.remove("page-current");
      item.removeAttribute("aria-current");
    });
    button.classList.add("page-current");
    button.setAttribute("aria-current", "page");
    showAdminToast("Dữ liệu mẫu chỉ có 4 đơn hàng gần nhất.");
  });
});

document.querySelectorAll(".row-more").forEach((button) => {
  button.addEventListener("click", () => {
    const orderId = button.getAttribute("aria-label").replace("Tùy chọn đơn hàng ", "");
    showAdminToast(`Đơn hàng ${orderId} · Trang quản trị đang dùng dữ liệu mẫu.`);
  });
});

document.querySelector(".profile-button").addEventListener("click", () => {
  window.location.href = "/account";
});

document.querySelector(".sidebar-account").addEventListener("click", () => {
  window.location.href = "/account";
});

document.querySelector(".more-button").addEventListener("click", () => {
  showAdminToast("Danh sách đang được sắp xếp theo sản phẩm bán chạy.");
});

const articleTableBody = document.querySelector(".article-table-body");
const articleSearch = document.querySelector(".article-search-input");
const articleCategoryFilter = document.querySelector(".article-category-filter");
const articleStatusFilter = document.querySelector(".article-status-filter");
const articleForm = document.querySelector(".admin-article-form");
const articleDialog = document.querySelector(".admin-article-dialog");
const articleFormError = document.querySelector(".article-form-error");
const articleViewDialog = document.querySelector(".admin-article-view-dialog");
let articlePage = 1;
let articleTotal = 0;
let articlePageSize = 20;
let articleSearchTimeout;

function articleDate(value) {
  return value
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Chưa xuất bản";
}

function articleStatusLabel(status) {
  return status === "Published" ? "Đã xuất bản" : "Bản nháp";
}

function renderArticleRows(items) {
  articleTableBody.replaceChildren(...items.map((article) => {
    const row = document.createElement("tr");
    row.dataset.articleId = article.id;
    const titleCell = document.createElement("td");
    const titleWrap = document.createElement("div");
    titleWrap.className = "product-table-name article-table-name";
    if (article.thumbnailUrl) {
      const image = document.createElement("img");
      image.className = "product-table-image";
      image.src = article.thumbnailUrl;
      image.alt = "";
      image.loading = "lazy";
      titleWrap.append(image);
    }
    const titleCopy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = article.title;
    const slug = document.createElement("small");
    slug.textContent = `/bai-viet/${article.slug}`;
    titleCopy.append(title, slug);
    titleWrap.append(titleCopy);
    titleCell.append(titleWrap);

    const categoryCell = document.createElement("td");
    categoryCell.textContent = article.category;
    const authorCell = document.createElement("td");
    authorCell.textContent = article.authorName;
    const dateCell = document.createElement("td");
    dateCell.className = "article-date-cell";
    const created = document.createElement("span");
    created.textContent = `Tạo: ${articleDate(article.createdAt)}`;
    const updated = document.createElement("small");
    updated.textContent = `Sửa: ${articleDate(article.updatedAt)}`;
    dateCell.append(created, updated);
    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    status.className = `article-status-pill ${article.status === "Published" ? "is-published" : "is-draft"}`;
    status.textContent = articleStatusLabel(article.status);
    statusCell.append(status);

    const actionCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "product-row-actions article-row-actions";
    for (const [action, label] of [["view", "Xem"], ["edit", "Sửa"], ["delete", "Xóa"]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.action = action;
      button.textContent = label;
      if (action === "delete") button.className = "delete-product-button";
      actions.append(button);
    }
    actionCell.append(actions);
    row.append(titleCell, categoryCell, authorCell, dateCell, statusCell, actionCell);
    return row;
  }));
  document.querySelector(".empty-articles").hidden = items.length > 0;
  document.querySelector(".article-count").textContent = articleTotal
    ? `Đang hiển thị ${(articlePage - 1) * articlePageSize + 1}–${Math.min(articlePage * articlePageSize, articleTotal)} trên ${articleTotal} bài viết`
    : "Chưa có bài viết.";
  renderArticlePagination();
}

function renderArticlePagination() {
  const container = document.querySelector(".article-pagination");
  const pageCount = Math.max(1, Math.ceil(articleTotal / articlePageSize));
  const buttons = [];
  const previous = document.createElement("button");
  previous.type = "button";
  previous.textContent = "‹";
  previous.setAttribute("aria-label", "Trang trước");
  previous.disabled = articlePage <= 1;
  previous.addEventListener("click", () => { articlePage -= 1; loadArticles(); });
  buttons.push(previous);
  const current = document.createElement("span");
  current.textContent = `Trang ${articlePage} / ${pageCount}`;
  buttons.push(current);
  const next = document.createElement("button");
  next.type = "button";
  next.textContent = "›";
  next.setAttribute("aria-label", "Trang sau");
  next.disabled = articlePage >= pageCount;
  next.addEventListener("click", () => { articlePage += 1; loadArticles(); });
  buttons.push(next);
  container.replaceChildren(...buttons);
}

async function loadArticleCategories() {
  const categories = await requestProductApi("/api/admin/articles/categories");
  articleCategoryFilter.replaceChildren(new Option("Tất cả danh mục", ""), ...categories.map((category) => new Option(category, category)));
}

async function loadArticles() {
  const query = new URLSearchParams({ page: String(articlePage) });
  if (articleSearch.value.trim()) query.set("q", articleSearch.value.trim());
  if (articleCategoryFilter.value) query.set("category", articleCategoryFilter.value);
  if (articleStatusFilter.value) query.set("status", articleStatusFilter.value);
  const result = await requestProductApi(`/api/admin/articles/?${query}`);
  articleTotal = result.total;
  articlePageSize = result.pageSize;
  renderArticleRows(result.items);
}

function makeArticleSlug(title) {
  return title.trim().toLocaleLowerCase("vi")
    .replace(/đ/g, "d")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function openArticleEditor(articleId = null) {
  articleForm.reset();
  articleFormError.hidden = true;
  articleFormError.textContent = "";
  articleForm.dataset.articleId = articleId ?? "";
  if (articleId) {
    const article = await requestProductApi(`/api/admin/articles/${articleId}`);
    for (const field of ["title", "slug", "summary", "content", "thumbnailUrl", "category", "status"]) {
      articleForm.elements[field].value = article[field] ?? "";
    }
  } else {
    articleForm.elements.status.value = "Draft";
  }
  document.querySelector("#article-dialog-title").textContent = articleId ? "Chỉnh sửa bài viết" : "Thêm bài viết";
  document.querySelector(".article-save-button").textContent = articleId ? "Lưu thay đổi" : "Lưu bài viết";
  articleDialog.showModal();
}

async function openArticlePreview(articleId) {
  const article = await requestProductApi(`/api/admin/articles/${articleId}`);
  document.querySelector("#article-view-title").textContent = article.title;
  document.querySelector(".article-view-meta").textContent = `${article.category} · ${article.authorName} · ${articleDate(article.updatedAt)}`;
  document.querySelector(".article-view-summary").textContent = article.summary;
  document.querySelector(".article-view-body").textContent = article.content;
  articleViewDialog.showModal();
}

document.querySelector(".add-article-button").addEventListener("click", () => openArticleEditor().catch((error) => showAdminToast(error.message)));
document.querySelectorAll(".close-article-dialog").forEach((button) => button.addEventListener("click", () => articleDialog.close()));
document.querySelector(".close-article-view").addEventListener("click", () => articleViewDialog.close());
articleSearch.addEventListener("input", () => {
  window.clearTimeout(articleSearchTimeout);
  articleSearchTimeout = window.setTimeout(() => { articlePage = 1; loadArticles().catch((error) => showAdminToast(error.message)); }, 250);
});
articleCategoryFilter.addEventListener("change", () => { articlePage = 1; loadArticles().catch((error) => showAdminToast(error.message)); });
articleStatusFilter.addEventListener("change", () => { articlePage = 1; loadArticles().catch((error) => showAdminToast(error.message)); });

articleTableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const articleId = Number(button.closest("tr").dataset.articleId);
  try {
    if (button.dataset.action === "view") await openArticlePreview(articleId);
    if (button.dataset.action === "edit") await openArticleEditor(articleId);
    if (button.dataset.action === "delete") {
      const title = button.closest("tr").querySelector("strong").textContent;
      if (!window.confirm(`Bạn có chắc muốn xóa bài viết “${title}” không?`)) return;
      const token = await getAntiforgeryToken();
      await requestProductApi(`/api/admin/articles/${articleId}`, {
        method: "DELETE",
        headers: { RequestVerificationToken: token }
      });
      await loadArticles();
      await loadArticleCategories();
      showAdminToast("Đã xóa bài viết.");
    }
  } catch (error) {
    console.error("Could not perform article action.", error);
    showAdminToast(error.message);
  }
});

articleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!articleForm.reportValidity()) return;
  const formData = new FormData(articleForm);
  const articleId = articleForm.dataset.articleId;
  const payload = Object.fromEntries(["title", "slug", "summary", "content", "thumbnailUrl", "category", "status"]
    .map((field) => [field, String(formData.get(field) ?? "").trim()]));
  if (!payload.slug) payload.slug = makeArticleSlug(payload.title);
  const saveButton = document.querySelector(".article-save-button");
  saveButton.disabled = true;
  articleFormError.hidden = true;
  try {
    const token = await getAntiforgeryToken();
    await requestProductApi(articleId ? `/api/admin/articles/${articleId}` : "/api/admin/articles/", {
      method: articleId ? "PUT" : "POST",
      headers: { RequestVerificationToken: token },
      body: JSON.stringify(payload)
    });
    articleDialog.close();
    await loadArticles();
    await loadArticleCategories();
    showAdminToast(articleId ? "Đã cập nhật bài viết." : "Đã thêm bài viết.");
  } catch (error) {
    articleFormError.textContent = error.message;
    articleFormError.hidden = false;
  } finally {
    saveButton.disabled = false;
  }
});

loadArticleCategories()
  .then(loadArticles)
  .catch((error) => {
    console.error("Could not load articles.", error);
    document.querySelector(".article-count").textContent = "Không thể tải bài viết. Hãy tải lại trang.";
  });
