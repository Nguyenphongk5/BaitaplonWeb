const orderList = document.querySelector("[data-order-list]");
const ordersMessage = document.querySelector("[data-orders-message]");
const liveState = document.querySelector("[data-live-state]");

const orderStatuses = {
  Pending: { label: "Chờ xác nhận", className: "status-pending" },
  Confirmed: { label: "Đã xác nhận", className: "status-confirmed" },
  Shipping: { label: "Đang giao", className: "status-shipping" },
  Completed: { label: "Hoàn tất", className: "status-completed" },
  Cancelled: { label: "Đã hủy", className: "status-cancelled" }
};

function renderOrders(orders) {
  if (orders.length === 0) {
    orderList.replaceChildren();
    ordersMessage.textContent = "Bạn chưa có đơn hàng nào được đặt khi đăng nhập.";
    return;
  }

  ordersMessage.textContent = "";
  const cards = orders.map((order) => {
    const card = document.createElement("article");
    card.className = "account-order";
    const header = document.createElement("div");
    header.className = "account-order-top";
    const id = document.createElement("strong");
    id.textContent = `Đơn hàng #AS-${String(order.id).padStart(6, "0")}`;
    const date = document.createElement("time");
    date.className = "account-order-date";
    date.dateTime = order.createdAtUtc;
    date.textContent = new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(order.createdAtUtc));
    header.append(id, date);

    const items = document.createElement("div");
    items.className = "account-order-items";
    order.items.forEach((item) => {
      const line = document.createElement("div");
      line.className = "account-order-item";
      const name = document.createElement("span");
      name.textContent = `${item.productName}${item.color || item.variant ? ` · ${[item.color, item.variant].filter(Boolean).join(" · ")}` : ""} × ${item.quantity}`;
      const amount = document.createElement("strong");
      amount.textContent = `${new Intl.NumberFormat("vi-VN").format(item.unitPrice * item.quantity)} ₫`;
      line.append(name, amount);
      items.append(line);
    });

    const footer = document.createElement("div");
    footer.className = "account-order-bottom";
    const status = document.createElement("span");
    const statusInfo = orderStatuses[order.status] ?? { label: order.status, className: "" };
    status.className = `account-order-status ${statusInfo.className}`;
    status.textContent = statusInfo.label;
    const total = document.createElement("strong");
    total.className = "account-order-total";
    total.textContent = `Tổng cộng: ${new Intl.NumberFormat("vi-VN").format(order.totalAmount)} ₫`;
    footer.append(status, total);
    card.append(header, items, footer);
    return card;
  });
  orderList.replaceChildren(...cards);
}

async function loadOrders() {
  const response = await fetch("/api/account/orders", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(response.status === 401
      ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
      : "Không thể tải lịch sử đơn hàng. Hãy thử tải lại trang.");
  }
  renderOrders(await response.json());
}

loadOrders().catch((error) => {
  console.error("Could not load customer order history.", error);
  ordersMessage.textContent = error.message;
});

const orderEvents = new EventSource("/api/account/orders/stream");
orderEvents.addEventListener("connected", () => {
  liveState.textContent = "Đang cập nhật trực tiếp";
  liveState.classList.add("is-connected");
});
orderEvents.addEventListener("order-status", () => {
  loadOrders().catch((error) => {
    console.error("Could not refresh customer order history.", error);
    ordersMessage.textContent = error.message;
  });
});
orderEvents.addEventListener("error", () => {
  liveState.textContent = "Đang kết nối lại…";
  liveState.classList.remove("is-connected");
});
