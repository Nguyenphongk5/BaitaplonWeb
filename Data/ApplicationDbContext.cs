using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BaitaplonWeb.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : IdentityDbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<StoreOrder> StoreOrders => Set<StoreOrder>();
    public DbSet<StoreOrderItem> StoreOrderItems => Set<StoreOrderItem>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Product>(entity =>
        {
            entity.Property(product => product.Name).HasMaxLength(160).IsRequired();
            entity.Property(product => product.Brand).HasMaxLength(80).IsRequired();
            entity.Property(product => product.Category).HasMaxLength(20).IsRequired();
            entity.Property(product => product.ImageUrl).HasMaxLength(500).IsRequired();
            entity.Property(product => product.Badge).HasMaxLength(40);
            entity.Property(product => product.StockQuantity).HasDefaultValue(10);
            entity.HasMany(product => product.Variants)
                .WithOne(variant => variant.Product)
                .HasForeignKey(variant => variant.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasData(
                new Product { Id = 1, Name = "Giày Asics Gel Resolution X 'White Pure Silver'", Brand = "ASICS", Category = "tennis", Price = 3500000, ImageUrl = "/img/shoe-white.jpg", Badge = "BÁN CHẠY", StockQuantity = 10, IsActive = true },
                new Product { Id = 2, Name = "Giày Wilson Rush Pro 4.5 'Red White'", Brand = "WILSON", Category = "tennis", Price = 4900000, ImageUrl = "/img/shoe-red.jpg", Badge = "MỚI", StockQuantity = 10, IsActive = true },
                new Product { Id = 3, Name = "Giày Nike Air Zoom Vapor Pro 3 'Binary Blue'", Brand = "NIKE", Category = "tennis", Price = 3500000, ImageUrl = "/img/shoe-violet.jpg", StockQuantity = 10, IsActive = true },
                new Product { Id = 4, Name = "Giày Babolat Jet Mach 3 'Blue Court'", Brand = "BABOLAT", Category = "tennis", Price = 4500000, ImageUrl = "/img/shoe-blue.jpg", Badge = "-15%", StockQuantity = 10, IsActive = true },
                new Product { Id = 5, Name = "Giày Babolat Jet Mach 3 All Court", Brand = "BABOLAT", Category = "running", Price = 4500000, ImageUrl = "/img/shoe-teal.jpg", StockQuantity = 10, IsActive = true },
                new Product { Id = 6, Name = "Giày Babolat Jet Mach 3 'Sand Grass'", Brand = "BABOLAT", Category = "running", Price = 4900000, ImageUrl = "/img/shoe-navy.jpg", StockQuantity = 10, IsActive = true },
                new Product { Id = 7, Name = "Giày Asics Court FF 3 'White Silver'", Brand = "ASICS", Category = "tennis", Price = 3990000, ImageUrl = "/img/shoe-white.jpg", Badge = "MỚI", StockQuantity = 10, IsActive = true },
                new Product { Id = 8, Name = "Giày chạy bộ Fresh Foam 'Sea Salt'", Brand = "NEW BALANCE", Category = "running", Price = 3250000, ImageUrl = "/img/shoe-teal.jpg", StockQuantity = 10, IsActive = true },
                new Product { Id = 9, Name = "Giày Babolat Propulse Fury 'Blue'", Brand = "BABOLAT", Category = "tennis", Price = 4200000, ImageUrl = "/img/shoe-blue.jpg", Badge = "-10%", StockQuantity = 10, IsActive = true });
        });

        builder.Entity<ProductVariant>(entity =>
        {
            entity.Property(variant => variant.Color).HasMaxLength(40).IsRequired();
            entity.Property(variant => variant.ColorHex).HasMaxLength(7).IsRequired();
            entity.Property(variant => variant.Size).HasMaxLength(20).IsRequired();
            entity.HasIndex(variant => new { variant.ProductId, variant.Color, variant.Size }).IsUnique();
        });

        builder.Entity<StoreOrder>(entity =>
        {
            entity.Property(order => order.CustomerName).HasMaxLength(120).IsRequired();
            entity.Property(order => order.PhoneNumber).HasMaxLength(30).IsRequired();
            entity.Property(order => order.ShippingAddress).HasMaxLength(500).IsRequired();
            entity.Property(order => order.Status).HasMaxLength(20).IsRequired();
            entity.HasIndex(order => order.CreatedAtUtc);
            entity.HasMany(order => order.Items)
                .WithOne(item => item.Order)
                .HasForeignKey(item => item.StoreOrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<StoreOrderItem>(entity =>
        {
            entity.Property(item => item.ProductName).HasMaxLength(160).IsRequired();
            entity.Property(item => item.ProductImageUrl).HasMaxLength(500).IsRequired();
            entity.Property(item => item.Variant).HasMaxLength(30);
            entity.Property(item => item.Color).HasMaxLength(40);
        });
    }
}
