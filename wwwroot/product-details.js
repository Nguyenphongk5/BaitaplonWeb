const detailImage = document.querySelector(".detail-image");
const detailName = document.querySelector(".detail-name");
const detailBrand = document.querySelector(".detail-brand");
const detailPrice = document.querySelector(".detail-price");
const detailStock = document.querySelector(".detail-stock");
const detailVariant = document.querySelector(".detail-variant");
const detailVariantLabel = document.querySelector(".detail-variant-label");
const detailVariantOptions = document.querySelector(".detail-variant-options");
const detailError = document.querySelector(".detail-error");
let selectedVariant = "";
let selectedColor = "";
let selectedSize = "";

const categoryLabels = {
  tennis: "Giày Tennis",
  running: "Giày chạy bộ",
  lifestyle: "Giày Lifestyle",
  shoes: "Giày",
  clothing: "Quần áo",
  "pickleball-racket": "Vợt Pickleball",
  accessories: "Phụ kiện"
};

function formatPrice(price) {
  return `${new Intl.NumberFormat("vi-VN").format(price)} ₫`;
}

function renderVariants(product) {
  const isShoe = ["tennis", "running", "lifestyle", "shoes"].includes(product.category);
  const isClothing = product.category === "clothing";
  const stockedVariants = product.variants ?? [];
  const hasColorVariants = stockedVariants.length > 0;
  if (!hasColorVariants && !isShoe && !isClothing) return;

  const variants = hasColorVariants
    ? [...new Set(stockedVariants.map((variant) => variant.size))].sort((a, b) => a.localeCompare(b, "vi", { numeric: true }))
    : isShoe
      ? ["39", "40", "40.5", "41", "41.5", "42", "42.5", "43", "44", "45"]
      : ["S", "M", "L", "XL", "XXL"];
  detailVariant.hidden = false;
  const colorSection = document.querySelector(".detail-color");
  colorSection.hidden = !hasColorVariants;
  detailVariantLabel.textContent = isShoe ? "Chọn size giày" : "Chọn kích cỡ";
  document.querySelector(".size-guide").hidden = !isShoe;
  detailVariantOptions.setAttribute("aria-label", detailVariantLabel.textContent);
  if (!hasColorVariants) {
    detailVariantOptions.replaceChildren(...variants.map((variant, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `detail-variant-option${index === 0 ? " is-active" : ""}`;
      button.textContent = variant;
      button.setAttribute("aria-pressed", String(index === 0));
      button.addEventListener("click", () => {
        selectedVariant = variant;
        detailVariantOptions.querySelectorAll("button").forEach((option) => {
          const active = option === button;
          option.classList.toggle("is-active", active);
          option.setAttribute("aria-pressed", String(active));
        });
      });
      return button;
    }));
    selectedVariant = variants[0];
    return;
  }

  const colors = [...new Map(stockedVariants.map((variant) => [variant.color, {
    name: variant.color,
    hex: variant.colorHex,
    stock: stockedVariants.filter((item) => item.color === variant.color).reduce((sum, item) => sum + item.stockQuantity, 0)
  }])).values()];
  selectedColor = (colors.find((color) => color.stock > 0) ?? colors[0]).name;
  const availableSizes = (color) => stockedVariants.filter((variant) => variant.color === color);
  const selectedColorSizes = availableSizes(selectedColor);
  selectedSize = (selectedColorSizes.find((variant) => variant.stockQuantity > 0) ?? selectedColorSizes[0]).size;
  selectedVariant = selectedSize;

  const colorOptions = document.querySelector(".detail-color-options");
  colorOptions.replaceChildren(...colors.map((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "detail-color-option";
    button.dataset.color = color.name;
    button.disabled = color.stock === 0;
    button.title = `${color.name}: ${color.stock > 0 ? `còn ${color.stock}` : "hết hàng"}`;
    button.setAttribute("aria-label", button.title);
    const swatch = document.createElement("span");
    swatch.className = "detail-color-swatch";
    swatch.style.backgroundColor = color.hex;
    const label = document.createElement("span");
    label.textContent = `${color.name} · ${color.stock > 0 ? `còn ${color.stock}` : "hết hàng"}`;
    button.append(swatch, label);
    button.addEventListener("click", () => {
      selectedColor = color.name;
      const sizes = availableSizes(selectedColor);
      if (!sizes.some((variant) => variant.size === selectedSize && variant.stockQuantity > 0)) {
        selectedSize = (sizes.find((variant) => variant.stockQuantity > 0) ?? sizes[0]).size;
      }
      selectedVariant = selectedSize;
      refreshVariantOptions();
    });
    return button;
  }));
  detailVariantOptions.replaceChildren(...variants.map((size) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "detail-variant-option";
    button.textContent = size;
    button.dataset.size = size;
    button.addEventListener("click", () => {
      const variant = stockedVariants.find((item) => item.color === selectedColor && item.size === size);
      if (!variant || variant.stockQuantity === 0) return;
      selectedSize = size;
      selectedVariant = size;
      refreshVariantOptions();
    });
    return button;
  }));

  function refreshVariantOptions() {
    colorOptions.querySelectorAll("button").forEach((button) => {
      const active = button.dataset.color === selectedColor;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    let selectedStock = 0;
    detailVariantOptions.querySelectorAll("button").forEach((button) => {
      const option = stockedVariants.find((variant) => variant.color === selectedColor && variant.size === button.dataset.size);
      const active = button.dataset.size === selectedSize && option?.stockQuantity > 0;
      button.disabled = !option || option.stockQuantity === 0;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      if (button.dataset.size === selectedSize) selectedStock = option?.stockQuantity ?? 0;
    });
    detailStock.textContent = selectedStock > 0
      ? `Màu ${selectedColor} · size ${selectedSize}: còn ${selectedStock} sản phẩm`
      : `Màu ${selectedColor} · size ${selectedSize}: đã hết hàng`;
    detailStock.classList.toggle("is-out-of-stock", selectedStock === 0);
    document.querySelector(".detail-add-cart").disabled = selectedStock === 0;
    document.querySelector(".detail-buy-now").disabled = selectedStock === 0;
  }

  refreshVariantOptions();
}

document.querySelector(".size-guide").addEventListener("click", () => {
  const note = document.querySelector(".size-guide-note");
  note.hidden = !note.hidden;
});

function renderProduct(product) {
  document.title = `${product.name} | Authentic Shoes`;
  document.querySelector('meta[name="description"]').content = `${product.brand} ${product.name} - thông tin, giá bán và tình trạng tồn kho.`;
  document.querySelector(".detail-breadcrumb-current").textContent = categoryLabels[product.category] ?? "Sản phẩm";
  detailImage.src = product.imageUrl;
  detailImage.alt = `${product.brand} ${product.name}`;
  detailName.textContent = product.name;
  detailBrand.textContent = product.brand;
  detailPrice.textContent = formatPrice(product.price);
  document.querySelector(".detail-sku").textContent = `SKU: AS-${String(product.id).padStart(6, "0")}`;
  detailStock.textContent = product.stockQuantity > 0
    ? `Còn ${product.stockQuantity} sản phẩm trong kho`
    : "Sản phẩm hiện đã hết hàng";
  detailStock.classList.toggle("is-out-of-stock", product.stockQuantity === 0);
  document.querySelector(".detail-description-copy").textContent =
    `${product.name} thuộc danh mục ${categoryLabels[product.category] ?? "sản phẩm thể thao"} tại Authentic Shoes. Giá và tình trạng tồn kho được cập nhật trực tiếp từ cửa hàng.`;
  const thumbnail = document.createElement("button");
  thumbnail.type = "button";
  thumbnail.className = "detail-thumbnail is-active";
  thumbnail.setAttribute("aria-label", `Xem ảnh ${product.name}`);
  const thumbnailImage = document.createElement("img");
  thumbnailImage.src = product.imageUrl;
  thumbnailImage.alt = "";
  thumbnail.append(thumbnailImage);
  thumbnail.addEventListener("click", () => {
    detailImage.src = product.imageUrl;
    document.querySelectorAll(".detail-thumbnail").forEach((item) => item.classList.toggle("is-active", item === thumbnail));
  });
  document.querySelector(".detail-thumbnails").replaceChildren(thumbnail);
  renderVariants(product);

  const addButton = document.querySelector(".detail-add-cart");
  const buyButton = document.querySelector(".detail-buy-now");
  addButton.disabled = product.stockQuantity === 0;
  buyButton.disabled = product.stockQuantity === 0;
  addButton.addEventListener("click", () => addProductToCart(product, false));
  buyButton.addEventListener("click", () => addProductToCart(product, true));

  async function addProductToCart(currentProduct, openCart) {
    detailError.hidden = true;
    try {
      await window.StoreCart.add(currentProduct.id, selectedVariant, selectedColor, selectedSize);
      if (openCart) await window.StoreCart.open();
    } catch (error) {
      console.error("Could not add detail product to cart.", error);
      detailError.textContent = error.message;
      detailError.hidden = false;
    }
  }
}

async function loadProduct() {
  const id = Number(new URLSearchParams(window.location.search).get("id"));
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Đường dẫn sản phẩm không hợp lệ.");
  }
  await window.StoreCart.ready;
  const response = await fetch(`/api/products/${id}`);
  if (response.status === 404) throw new Error("Sản phẩm không tồn tại hoặc đã ngừng bán.");
  if (!response.ok) throw new Error("Không thể tải thông tin sản phẩm.");
  renderProduct(await response.json());
}

loadProduct().catch((error) => {
  console.error("Could not load product details.", error);
  detailName.textContent = "Không tải được sản phẩm";
  detailError.textContent = error.message;
  detailError.hidden = false;
});

fetch("/auth/status")
  .then((response) => {
    if (!response.ok) throw new Error("Không thể kiểm tra trạng thái tài khoản.");
    return response.json();
  })
  .then((account) => {
    if (!account.isAuthenticated) return;
    const accountButton = document.querySelector(".account-button");
    accountButton.href = "/account";
    accountButton.setAttribute("aria-label", `Tài khoản ${account.userName}`);
  })
  .catch((error) => console.error("Could not load account status.", error));
