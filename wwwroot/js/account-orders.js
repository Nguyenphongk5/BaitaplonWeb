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

    const canRequestCancellation = ["Pending", "Confirmed"].includes(order.status);
    if (order.cancellationRequestedAtUtc) {
      const requestState = document.createElement("p");
      requestState.className = "account-order-cancellation-note";
      requestState.textContent = "Đã gửi yêu cầu hủy, đang chờ quản trị viên xử lý.";
      card.append(requestState);
    } else if (canRequestCancellation) {
      const actions = document.createElement("div");
      actions.className = "account-order-actions";
      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "account-order-cancel-button";
      cancelButton.dataset.orderId = String(order.id);
      cancelButton.textContent = "Yêu cầu hủy đơn";
      actions.append(cancelButton);
      card.append(actions);
    }

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

orderList.addEventListener("click", async (event) => {
  const button = event.target.closest(".account-order-cancel-button");
  if (!button) return;
  if (!window.confirm("Gửi yêu cầu hủy đơn? Đơn chỉ được hủy khi quản trị viên duyệt.")) return;

  button.disabled = true;
  try {
    const tokenResponse = await fetch("/api/orders/antiforgery");
    if (!tokenResponse.ok) throw new Error("Không thể xác thực yêu cầu. Hãy tải lại trang và thử lại.");
    const { token } = await tokenResponse.json();
    const response = await fetch(`/api/account/orders/${button.dataset.orderId}/cancellation-request`, {
      method: "POST",
      headers: { RequestVerificationToken: token }
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.message ?? "Không thể gửi yêu cầu hủy đơn. Hãy thử lại.");
    }

    await loadOrders();
    ordersMessage.textContent = "Đã gửi yêu cầu hủy. Bạn sẽ thấy trạng thái được cập nhật khi quản trị viên xử lý.";
  } catch (error) {
    console.error("Could not request order cancellation.", error);
    ordersMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
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
