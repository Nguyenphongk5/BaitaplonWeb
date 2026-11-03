namespace BaitaplonWeb.Data;

public sealed class StoreOrder
{
    public int Id { get; set; }
    public string? UserId { get; set; }
    public required string CustomerName { get; set; }
    public required string PhoneNumber { get; set; }
    public required string ShippingAddress { get; set; }
    public long TotalAmount { get; set; }
    public string Status { get; set; } = OrderStatuses.Pending;
    public DateTime CreatedAtUtc { get; set; }
    public List<StoreOrderItem> Items { get; set; } = [];
}

public sealed class StoreOrderItem
{
    public int Id { get; set; }
    public int StoreOrderId { get; set; }
    public StoreOrder? Order { get; set; }
    public int ProductId { get; set; }
    public required string ProductName { get; set; }
    public required string ProductImageUrl { get; set; }
    public string? Variant { get; set; }
    public string? Color { get; set; }
    public int Quantity { get; set; }
    public long UnitPrice { get; set; }
}

public static class OrderStatuses
{
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string Shipping = "Shipping";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";

    public static bool IsValid(string status) => status is Pending or Confirmed or Shipping or Completed or Cancelled;
}
