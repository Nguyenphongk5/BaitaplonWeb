namespace BaitaplonWeb.Data;

public sealed class Product
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Brand { get; set; }
    public required string Category { get; set; }
    public long Price { get; set; }
    public required string ImageUrl { get; set; }
    public string? Badge { get; set; }
    public int StockQuantity { get; set; } = 10;
    public bool IsActive { get; set; } = true;
    public List<ProductVariant> Variants { get; set; } = [];
}

public sealed class ProductVariant
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public required string Color { get; set; }
    public required string ColorHex { get; set; }
    public required string Size { get; set; }
    public int StockQuantity { get; set; }
}
