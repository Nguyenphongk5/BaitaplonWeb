using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaitaplonWeb.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceIllustrationProductImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "Products" SET "ImageUrl" = '/img/pickleball-paddle-2025.jpg'
                WHERE "Name" = 'Vợt Pickleball JOOLA Ben Johns Hyperion';
                UPDATE "Products" SET "ImageUrl" = '/img/pickleball-selkirk.jpg'
                WHERE "Name" = 'Vợt Pickleball Selkirk SLK Evo';
                UPDATE "Products" SET "ImageUrl" = '/img/pickleball-head.jpg'
                WHERE "Name" = 'Vợt Pickleball HEAD Radical Tour';
                UPDATE "Products" SET "ImageUrl" = '/img/sports-shirt.jpg'
                WHERE "Name" IN ('Áo thể thao Authentic Dry-Fit', 'Áo polo tennis Court Classic', 'Quần short thể thao Move Free');
                UPDATE "Products" SET "ImageUrl" = '/img/pickleball-paddle-2025.jpg'
                WHERE "Name" = 'Bóng Pickleball Franklin X-40 (3 quả)';
                UPDATE "Products" SET "ImageUrl" = '/img/sports-bag.jpg'
                WHERE "Name" = 'Túi đựng vợt Pickleball Court Bag';
                UPDATE "Products" SET "ImageUrl" = '/img/pickleball-head.jpg'
                WHERE "Name" = 'Băng quấn cán vợt Pro Overgrip (3 cuộn)';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "Products" SET "ImageUrl" = '/assets/images/category-pickleball.svg'
                WHERE "Name" IN (
                    'Vợt Pickleball JOOLA Ben Johns Hyperion',
                    'Vợt Pickleball Selkirk SLK Evo',
                    'Vợt Pickleball HEAD Radical Tour'
                );
                UPDATE "Products" SET "ImageUrl" = '/assets/images/category-apparel.svg'
                WHERE "Name" IN ('Áo thể thao Authentic Dry-Fit', 'Áo polo tennis Court Classic', 'Quần short thể thao Move Free');
                UPDATE "Products" SET "ImageUrl" = '/assets/images/category-accessories.svg'
                WHERE "Name" IN (
                    'Bóng Pickleball Franklin X-40 (3 quả)',
                    'Túi đựng vợt Pickleball Court Bag',
                    'Băng quấn cán vợt Pro Overgrip (3 cuộn)'
                );
                """);
        }
    }
}
