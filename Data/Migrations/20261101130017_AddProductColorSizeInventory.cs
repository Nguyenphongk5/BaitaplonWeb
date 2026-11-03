using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaitaplonWeb.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProductColorSizeInventory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "StoreOrderItems",
                type: "TEXT",
                maxLength: 40,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProductVariants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ProductId = table.Column<int>(type: "INTEGER", nullable: false),
                    Color = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    ColorHex = table.Column<string>(type: "TEXT", maxLength: 7, nullable: false),
                    Size = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    StockQuantity = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductVariants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductVariants_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariants_ProductId_Color_Size",
                table: "ProductVariants",
                columns: new[] { "ProductId", "Color", "Size" },
                unique: true);

            migrationBuilder.Sql("""
                INSERT INTO "ProductVariants" ("ProductId", "Color", "ColorHex", "Size", "StockQuantity")
                SELECT product."Id",
                       CASE
                           WHEN lower(product."Name") LIKE '%red%' OR lower(product."Name") LIKE '%đỏ%' THEN 'Đỏ'
                           WHEN lower(product."Name") LIKE '%blue%' OR lower(product."Name") LIKE '%xanh%' THEN 'Xanh dương'
                           WHEN lower(product."Name") LIKE '%white%' OR lower(product."Name") LIKE '%silver%' OR lower(product."Name") LIKE '%trắng%' THEN 'Trắng'
                           WHEN lower(product."Name") LIKE '%teal%' THEN 'Xanh ngọc'
                           WHEN lower(product."Name") LIKE '%navy%' THEN 'Xanh navy'
                           WHEN lower(product."Name") LIKE '%violet%' OR lower(product."Name") LIKE '%tím%' THEN 'Tím'
                           ELSE 'Màu mặc định'
                       END,
                       CASE
                           WHEN lower(product."Name") LIKE '%red%' OR lower(product."Name") LIKE '%đỏ%' THEN '#D71920'
                           WHEN lower(product."Name") LIKE '%blue%' OR lower(product."Name") LIKE '%xanh%' THEN '#2D66B3'
                           WHEN lower(product."Name") LIKE '%white%' OR lower(product."Name") LIKE '%silver%' OR lower(product."Name") LIKE '%trắng%' THEN '#F4F4F4'
                           WHEN lower(product."Name") LIKE '%teal%' THEN '#20B2AA'
                           WHEN lower(product."Name") LIKE '%navy%' THEN '#17224D'
                           WHEN lower(product."Name") LIKE '%violet%' OR lower(product."Name") LIKE '%tím%' THEN '#7556A5'
                           ELSE '#404040'
                       END,
                       sizes."Size",
                       product."StockQuantity" / 7 +
                           CASE WHEN sizes."Position" < product."StockQuantity" % 7 THEN 1 ELSE 0 END
                FROM "Products" AS product
                CROSS JOIN (
                    SELECT 0 AS "Position", '39' AS "Size" UNION ALL
                    SELECT 1, '40' UNION ALL
                    SELECT 2, '41' UNION ALL
                    SELECT 3, '42' UNION ALL
                    SELECT 4, '43' UNION ALL
                    SELECT 5, '44' UNION ALL
                    SELECT 6, '45'
                ) AS sizes
                WHERE product."Category" IN ('tennis', 'running', 'lifestyle', 'shoes');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "Color",
                table: "StoreOrderItems");
        }
    }
}
