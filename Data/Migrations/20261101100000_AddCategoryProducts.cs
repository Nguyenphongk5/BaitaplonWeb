using BaitaplonWeb.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaitaplonWeb.Data.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20261101100000_AddCategoryProducts")]
public sealed class AddCategoryProducts : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            INSERT INTO "Products" ("Name", "Brand", "Category", "Price", "ImageUrl", "Badge", "StockQuantity", "IsActive")
            SELECT 'Vợt Pickleball JOOLA Ben Johns Hyperion', 'JOOLA', 'pickleball-racket', 4890000, '/assets/images/category-pickleball.svg', 'BÁN CHẠY', 10, 1
            WHERE NOT EXISTS (SELECT 1 FROM "Products" WHERE "Name" = 'Vợt Pickleball JOOLA Ben Johns Hyperion');
            """);
        migrationBuilder.Sql("""
            INSERT INTO "Products" ("Name", "Brand", "Category", "Price", "ImageUrl", "Badge", "StockQuantity", "IsActive")
            SELECT 'Vợt Pickleball Selkirk SLK Evo', 'SELKIRK', 'pickleball-racket', 3290000, '/assets/images/category-pickleball.svg', NULL, 10, 1
            WHERE NOT EXISTS (SELECT 1 FROM "Products" WHERE "Name" = 'Vợt Pickleball Selkirk SLK Evo');
            """);
        migrationBuilder.Sql("""
            INSERT INTO "Products" ("Name", "Brand", "Category", "Price", "ImageUrl", "Badge", "StockQuantity", "IsActive")
            SELECT 'Vợt Pickleball HEAD Radical Tour', 'HEAD', 'pickleball-racket', 3790000, '/assets/images/category-pickleball.svg', 'MỚI', 10, 1
            WHERE NOT EXISTS (SELECT 1 FROM "Products" WHERE "Name" = 'Vợt Pickleball HEAD Radical Tour');
            """);
        migrationBuilder.Sql("""
            INSERT INTO "Products" ("Name", "Brand", "Category", "Price", "ImageUrl", "Badge", "StockQuantity", "IsActive")
            SELECT 'Áo thể thao Authentic Dry-Fit', 'AUTHENTIC', 'clothing', 590000, '/assets/images/category-apparel.svg', NULL, 10, 1
            WHERE NOT EXISTS (SELECT 1 FROM "Products" WHERE "Name" = 'Áo thể thao Authentic Dry-Fit');
            """);
        migrationBuilder.Sql("""
            INSERT INTO "Products" ("Name", "Brand", "Category", "Price", "ImageUrl", "Badge", "StockQuantity", "IsActive")
            SELECT 'Áo polo tennis Court Classic', 'AUTHENTIC', 'clothing', 890000, '/assets/images/category-apparel.svg', 'MỚI', 10, 1
            WHERE NOT EXISTS (SELECT 1 FROM "Products" WHERE "Name" = 'Áo polo tennis Court Classic');
            """);
        migrationBuilder.Sql("""
            INSERT INTO "Products" ("Name", "Brand", "Category", "Price", "ImageUrl", "Badge", "StockQuantity", "IsActive")
            SELECT 'Quần short thể thao Move Free', 'AUTHENTIC', 'clothing', 650000, '/assets/images/category-apparel.svg', NULL, 10, 1
            WHERE NOT EXISTS (SELECT 1 FROM "Products" WHERE "Name" = 'Quần short thể thao Move Free');
            """);
        migrationBuilder.Sql("""
            INSERT INTO "Products" ("Name", "Brand", "Category", "Price", "ImageUrl", "Badge", "StockQuantity", "IsActive")
            SELECT 'Bóng Pickleball Franklin X-40 (3 quả)', 'FRANKLIN', 'accessories', 390000, '/assets/images/category-accessories.svg', NULL, 10, 1
            WHERE NOT EXISTS (SELECT 1 FROM "Products" WHERE "Name" = 'Bóng Pickleball Franklin X-40 (3 quả)');
            """);
        migrationBuilder.Sql("""
            INSERT INTO "Products" ("Name", "Brand", "Category", "Price", "ImageUrl", "Badge", "StockQuantity", "IsActive")
            SELECT 'Túi đựng vợt Pickleball Court Bag', 'AUTHENTIC', 'accessories', 790000, '/assets/images/category-accessories.svg', NULL, 10, 1
            WHERE NOT EXISTS (SELECT 1 FROM "Products" WHERE "Name" = 'Túi đựng vợt Pickleball Court Bag');
            """);
        migrationBuilder.Sql("""
            INSERT INTO "Products" ("Name", "Brand", "Category", "Price", "ImageUrl", "Badge", "StockQuantity", "IsActive")
            SELECT 'Băng quấn cán vợt Pro Overgrip (3 cuộn)', 'WILSON', 'accessories', 250000, '/assets/images/category-accessories.svg', NULL, 10, 1
            WHERE NOT EXISTS (SELECT 1 FROM "Products" WHERE "Name" = 'Băng quấn cán vợt Pro Overgrip (3 cuộn)');
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DELETE FROM "Products"
            WHERE "Name" IN (
                'Vợt Pickleball JOOLA Ben Johns Hyperion',
                'Vợt Pickleball Selkirk SLK Evo',
                'Vợt Pickleball HEAD Radical Tour',
                'Áo thể thao Authentic Dry-Fit',
                'Áo polo tennis Court Classic',
                'Quần short thể thao Move Free',
                'Bóng Pickleball Franklin X-40 (3 quả)',
                'Túi đựng vợt Pickleball Court Bag',
                'Băng quấn cán vợt Pro Overgrip (3 cuộn)'
            );
            """);
    }
}
