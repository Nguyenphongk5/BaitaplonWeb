(() => {
  const storageKey = "authentic-shoes-cart";
  const currency = new Intl.NumberFormat("vi-VN");
  let items = [];
  let products = new Map();
  let requestToken;
  let dialog;
  let itemList;
  let checkoutForm;
  let checkoutError;
  let isAuthenticated = false;
  let ready;
  let toastTimeout;

  function showToast(message) {
    const toast = document.querySelector(".toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  function loadItems() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      if (!Array.isArray(saved)) throw new Error("Dữ liệu giỏ hàng không hợp lệ.");
      return saved.filter((item) =>
        Number.isInteger(item.productId)
        && Number.isInteger(item.quantity)
        && item.quantity > 0
        && (item.variant === undefined || typeof item.variant === "string"));
    } catch (error) {
      console.error("Could not read the saved cart.", error);
      return [];
    }
  }

  function saveItems() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
      updateCount();
      return true;
    } catch (error) {
      console.error("Could not save the cart.", error);
      showToast("Không thể lưu giỏ hàng trên thiết bị này.");
      return false;
    }
  }

  function updateCount() {
    const count = String(items.reduce((sum, item) => sum + item.quantity, 0));
    document.querySelectorAll(".cart-count").forEach((element) => { element.textContent = count; });
  }

  function getProductQuantity(productId, color = undefined, size = undefined, variant = undefined) {
    return items
      .filter((item) => item.productId === productId
        && (color === undefined || item.color === color)
        && (size === undefined || item.size === size)
        && (variant === undefined || (item.variant ?? "") === variant))
      .reduce((sum, item) => sum + item.quantity, 0);
  }

  function getSelectedStock(product, item) {
    if (item.color && item.size && product.variants?.length) {
      return product.variants.find((variant) => variant.color === item.color && variant.size === item.size)?.stockQuantity ?? 0;
    }
    return product.stockQuantity;
  }

  function renderItems() {
    const rows = items.flatMap((item) => {
      const product = products.get(item.productId);
      if (!product) return [];

      const row = document.createElement("article");
      row.className = "cart-item";
      row.dataset.productId = item.productId;
      row.dataset.variant = item.variant ?? "";
      row.dataset.color = item.color ?? "";
      row.dataset.size = item.size ?? "";
      const image = document.createElement("img");
      image.src = product.imageUrl;
      image.alt = "";

      const copy = document.createElement("div");
      copy.className = "cart-item-copy";
      const name = document.createElement("strong");
      name.textContent = product.name;
      const price = document.createElement("span");
      price.textContent = `×${item.quantity} · ${currency.format(product.price)} ₫`;
      copy.append(name, price);
      if (item.variant) {
        const variant = document.createElement("small");
        variant.className = "cart-item-variant";
        variant.textContent = [item.color, item.size ?? item.variant].filter(Boolean).join(" · ");
        copy.append(variant);
      }

      const quantity = document.createElement("div");
      quantity.className = "cart-item-quantity";
      const decrease = document.createElement("button");
      decrease.type = "button";
      decrease.dataset.action = "decrease";
      decrease.setAttribute("aria-label", "Giảm số lượng");
      decrease.textContent = "−";
      const count = document.createElement("span");
      count.textContent = String(item.quantity);
      const increase = document.createElement("button");
      increase.type = "button";
      increase.dataset.action = "increase";
      increase.setAttribute("aria-label", "Tăng số lượng");
      const availableStock = getSelectedStock(product, item);
      const selectedQuantity = item.color && item.size
        ? getProductQuantity(item.productId, item.color, item.size)
        : getProductQuantity(item.productId);
      increase.disabled = selectedQuantity >= availableStock;
      increase.textContent = "+";
      quantity.append(decrease, count, increase);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "cart-item-remove";
      remove.dataset.action = "remove";
      remove.setAttribute("aria-label", `Xóa ${product.name} khỏi giỏ`);
      remove.textContent = "×";
      row.append(image, copy, quantity, remove);

      if (item.quantity > availableStock) {
        const warning = document.createElement("p");
        warning.className = "cart-item-warning";
        warning.textContent = availableStock === 0
          ? "Lựa chọn này đã hết hàng."
          : `Lựa chọn này chỉ còn ${availableStock} sản phẩm.`;
        row.append(warning);
      }
      return [row];
    });

    itemList.replaceChildren(...rows);
    document.querySelector(".cart-empty").hidden = items.length > 0;
    checkoutForm.hidden = items.length === 0;
    document.querySelector(".checkout-login-required").hidden = isAuthenticated || items.length === 0;
    document.querySelector(".checkout-fields").hidden = !isAuthenticated || items.length === 0;
    const total = items.reduce((sum, item) => {
      const product = products.get(item.productId);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
    document.querySelector(".cart-total strong").textContent = `${currency.format(total)} ₫`;
    document.querySelector(".cart-dialog-count").textContent =
      `${items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm`;
    document.querySelector(".cart-line-count").textContent = String(items.length);
    updateCount();
  }

  async function validateQuantity(productId, quantity, color = null, size = null) {
    const response = await fetch("/api/cart/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity, color, size })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Không thể kiểm tra tồn kho.");
  }

  async function add(productId, variant = "", color = "", size = "") {
    await ready;
    const product = products.get(Number(productId));
    if (!product) throw new Error("Sản phẩm không còn bán.");
    const normalizedVariant = variant.trim();
    const normalizedColor = color.trim();
    const normalizedSize = size.trim();
    const existing = items.find((item) =>
      item.productId === product.id
      && (item.color ?? "") === normalizedColor
      && (item.size ?? "") === normalizedSize
      && (item.variant ?? "") === normalizedVariant);
    const quantity = normalizedColor && normalizedSize
      ? getProductQuantity(product.id, normalizedColor, normalizedSize) + 1
      : getProductQuantity(product.id) + 1;
    await validateQuantity(product.id, quantity, normalizedColor || null, normalizedSize || null);
    if (existing) existing.quantity += 1;
    else items.push({
      productId: product.id,
      quantity: 1,
      ...(normalizedVariant ? { variant: normalizedVariant } : {}),
      ...(normalizedColor ? { color: normalizedColor } : {}),
      ...(normalizedSize ? { size: normalizedSize } : {})
    });
    if (!saveItems()) return false;
    renderItems();
    showToast(`Đã thêm "${product.name}" vào giỏ hàng.`);
    return true;
  }

  async function open() {
    await ready;
    renderItems();
    dialog.showModal();
    if (!isAuthenticated && items.length > 0) {
      showToast("Vui lòng đăng nhập hoặc đăng ký để mua hàng.");
    }
  }

  async function refreshProducts() {
    const response = await fetch("/api/products");
    if (!response.ok) throw new Error("Không thể cập nhật lại tồn kho.");
    const latest = await response.json();
    products = new Map(latest.map((product) => [product.id, product]));
    window.dispatchEvent(new CustomEvent("store:products-updated", { detail: latest }));
  }

  function getCurrentReturnUrl() {
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.delete("checkout");
    returnUrl.searchParams.set("checkout", "1");
    return `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;
  }

  function configureAuthenticationLinks() {
    const returnUrl = getCurrentReturnUrl();
    document.querySelector(".checkout-login-link").href =
      `/login?${new URLSearchParams({ ReturnUrl: returnUrl })}`;
    document.querySelector(".checkout-register-link").href =
      `/register?${new URLSearchParams({ ReturnUrl: returnUrl })}`;
  }

  function wireEvents() {
    document.addEventListener("click", async (event) => {
      if (event.target.closest(".cart-button")) {
        event.preventDefault();
        await open();
      }
      if (event.target.closest(".cart-close")) dialog.close();
      if (!event.target.closest(".cart-item button[data-action]")) return;

      const button = event.target.closest("button[data-action]");
      const row = button.closest(".cart-item");
      const productId = Number(row.dataset.productId);
      const variant = row.dataset.variant;
      const color = row.dataset.color;
      const size = row.dataset.size;
      const item = items.find((entry) =>
        entry.productId === productId
        && (entry.variant ?? "") === variant
        && (entry.color ?? "") === color
        && (entry.size ?? "") === size);
      if (!item) return;

      if (button.dataset.action === "remove") {
        items = items.filter((entry) => entry !== item);
      } else if (button.dataset.action === "decrease") {
        item.quantity -= 1;
        if (item.quantity === 0) items = items.filter((entry) => entry !== item);
      } else {
        button.disabled = true;
        try {
          const currentQuantity = color && size
            ? getProductQuantity(productId, color, size)
            : getProductQuantity(productId);
          await validateQuantity(productId, currentQuantity + 1, color || null, size || null);
          item.quantity += 1;
        } catch (error) {
          console.error("Could not increase cart quantity.", error);
          showToast(error.message);
          return;
        }
      }

      if (saveItems()) renderItems();
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });

    checkoutForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      checkoutError.hidden = true;
      if (!checkoutForm.reportValidity() || items.length === 0) return;
      if (!isAuthenticated) {
        document.querySelector(".checkout-login-required").hidden = false;
        document.querySelector(".checkout-fields").hidden = true;
        showToast("Vui lòng đăng nhập hoặc đăng ký để mua hàng.");
        return;
      }

      const submit = checkoutForm.querySelector(".checkout-submit");
      submit.disabled = true;
      try {
        if (!requestToken) {
          const tokenResponse = await fetch("/api/orders/antiforgery");
          if (!tokenResponse.ok) throw new Error("Không thể xác thực phiên đặt hàng. Hãy tải lại trang.");
          requestToken = (await tokenResponse.json()).token;
        }

        const formData = new FormData(checkoutForm);
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            RequestVerificationToken: requestToken
          },
          body: JSON.stringify({
            customerName: formData.get("customerName"),
            phoneNumber: formData.get("phoneNumber"),
            shippingAddress: formData.get("shippingAddress"),
            items: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              variant: item.size ?? item.variant ?? null,
              color: item.color ?? null,
              size: item.size ?? null
            }))
          })
        });
        if (response.status === 401) {
          isAuthenticated = false;
          renderItems();
          showToast("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập để mua hàng.");
          return;
        }
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || Object.values(result.errors ?? {}).flat().join(" ") || "Không thể đặt hàng.");
        }

        items = [];
        saveItems();
        renderItems();
        checkoutForm.reset();
        dialog.close();
        showToast(`Đặt hàng thành công! Mã đơn #AS-${String(result.id).padStart(6, "0")}. Thanh toán khi nhận hàng.`);
        try {
          await refreshProducts();
          renderItems();
        } catch (error) {
          console.error("Could not refresh inventory after checkout.", error);
          showToast("Đơn đã lưu, nhưng không thể cập nhật tồn kho. Hãy tải lại trang.");
        }
      } catch (error) {
        console.error("Could not complete the checkout.", error);
        checkoutError.textContent = error.message;
        checkoutError.hidden = false;
      } finally {
        submit.disabled = false;
      }
    });
  }

  ready = (async () => {
    items = loadItems();
    const [markupResponse, productResponse, accountResponse] = await Promise.all([
      fetch("/cart-panel.html"),
      fetch("/api/products"),
      fetch("/auth/status")
    ]);
    if (!markupResponse.ok || !productResponse.ok || !accountResponse.ok) {
      throw new Error("Không thể tải giỏ hàng hoặc danh sách sản phẩm.");
    }
    document.querySelector("#cart-root").innerHTML = await markupResponse.text();
    const loadedProducts = await productResponse.json();
    isAuthenticated = (await accountResponse.json()).isAuthenticated;
    products = new Map(loadedProducts.map((product) => [product.id, product]));
    items = items.filter((item) => products.has(item.productId));
    dialog = document.querySelector(".cart-dialog");
    itemList = document.querySelector(".cart-items");
    checkoutForm = document.querySelector(".checkout-form");
    checkoutError = document.querySelector(".checkout-error");
    configureAuthenticationLinks();
    wireEvents();
    saveItems();
    renderItems();
    if (isAuthenticated && new URLSearchParams(window.location.search).get("checkout") === "1" && items.length > 0) {
      dialog.showModal();
      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.delete("checkout");
      window.history.replaceState(null, "", returnUrl);
    }
  })().catch((error) => {
    console.error("Could not initialize the cart.", error);
    showToast(error.message);
    throw error;
  });

  window.StoreCart = { add, open, ready };
})();
