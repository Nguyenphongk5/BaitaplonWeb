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

function formatDashboardMoney(value) {
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
}

async function loadDashboard() {
  const dashboard = await requestProductApi("/api/admin/dashboard");
  const stats = {
    revenue: formatDashboardMoney(dashboard.revenueThisMonth),
    orders: new Intl.NumberFormat("vi-VN").format(dashboard.ordersThisMonth),
    customers: new Intl.NumberFormat("vi-VN").format(dashboard.customersThisMonth),
    average: formatDashboardMoney(Math.round(dashboard.averageCompletedOrderThisMonth))
  };
  Object.entries(stats).forEach(([key, value]) => {
    document.querySelector(`[data-stat="${key}"]`).textContent = value;
  });
  document.querySelector('[data-summary="revenue"]').textContent = stats.revenue;
  document.querySelector('[data-summary="orders"]').textContent = `${stats.orders} đơn`;

  const now = new Date();
  document.querySelector(".dashboard-date").textContent = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric"
  }).format(now).toLocaleUpperCase("vi");
  document.querySelector(".dashboard-month").textContent = new Intl.DateTimeFormat("vi-VN", {
    month: "long", year: "numeric"
  }).format(now);

  const revenueMax = Math.max(1, ...dashboard.monthlySeries.map((month) => month.revenue));
  const ordersMax = Math.max(1, ...dashboard.monthlySeries.map((month) => month.orders));
  const chartColumns = document.querySelector(".chart-columns");
  const chartLabels = document.querySelector(".chart-x-labels");
  chartColumns.replaceChildren();
  chartLabels.replaceChildren();
  dashboard.monthlySeries.forEach((month) => {
    const column = document.createElement("div");
    column.className = "chart-column";
    column.dataset.tooltip = `${month.label}: ${formatDashboardMoney(month.revenue)}, ${month.orders} đơn`;
    const revenueBar = document.createElement("span");
    revenueBar.className = "bar-revenue";
    revenueBar.style.setProperty("--revenue", String(month.revenue / revenueMax * 100));
    const ordersBar = document.createElement("span");
    ordersBar.className = "bar-orders";
    ordersBar.style.setProperty("--orders", String(month.orders / ordersMax * 100));
    column.append(revenueBar, ordersBar);
    chartColumns.append(column);
    const label = document.createElement("span");
    label.textContent = month.label;
    chartLabels.append(label);
  });
  document.querySelector(".chart-max-label").textContent = formatDashboardMoney(revenueMax);

  const categoryList = document.querySelector(".category-list");
  if (dashboard.topProducts.length === 0) {
    categoryList.textContent = "Chưa có sản phẩm bán hoàn tất.";
    return;
  }
  categoryList.replaceChildren(...dashboard.topProducts.map((product, index) => {
    const row = document.createElement("div");
    row.className = "category-row";
    const thumb = document.createElement("span");
    thumb.className = `category-thumb thumb-${["blue", "sand", "pink", "green", "lilac"][index]}`;
    thumb.textContent = product.name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toLocaleUpperCase("vi");
    const copy = document.createElement("span");
    copy.className = "category-copy";
    const name = document.createElement("strong");
    name.textContent = product.name;
    copy.append(name);
    const sold = document.createElement("span");
    sold.className = "category-sold";
    sold.textContent = `${new Intl.NumberFormat("vi-VN").format(product.quantity)} sản phẩm`;
    row.append(thumb, copy, sold);
    return row;
  }));
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
    throw new Error(validationMessages || body?.detail || body?.title || "Không thể hoàn tất thao tác sản phẩm.");
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
    stockCell.className = `product-stock-cell${product.stockQuantity === 0 ? " is-out-of-stock" : ""}`;
    stockCell.textContent = `${new Intl.NumberFormat("vi-VN").format(product.stockQuantity)} sản phẩm`;
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
  productCount.textContent = `Đang hiển thị ${visibleProducts.length} sản phẩm`;
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
  await loadDashboard();
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

document.querySelector(".export-button").addEventListener("click", () => {
  const protectSpreadsheetCell = (value) => {
    const text = String(value ?? "");
    return /^[\s\uFEFF]*[=+\-@]/.test(text) ? `'${text}` : text;
  };
  const rows = [
    ["Mã đơn hàng", "Khách hàng", "Ngày đặt", "Sản phẩm", "Tổng tiền COD", "Trạng thái"],
    ...orderRows
      .filter((row) => !row.hidden)
      .map((row) => [...row.cells].slice(0, 6).map((cell) =>
        protectSpreadsheetCell(cell.innerText.replace(/\s+/g, " ").trim())))
  ];
  const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\r\n")}`;
  const file = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = "authentic-shoes-don-hang.csv";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  showAdminToast("Đã tải báo cáo đơn hàng dạng CSV.");
});

document.querySelector(".profile-button").addEventListener("click", () => {
  window.location.href = "/account";
});

document.querySelector(".sidebar-account").addEventListener("click", () => {
  window.location.href = "/account";
});
