using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace BaitaplonWeb.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialSqlServer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecurityStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "bit", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "bit", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Brand = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Price = table.Column<long>(type: "bigint", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Badge = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    StockQuantity = table.Column<int>(type: "int", nullable: false, defaultValue: 10),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StoreOrders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CustomerName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ShippingAddress = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    TotalAmount = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoreOrders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductVariants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Color = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ColorHex = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: false),
                    Size = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    StockQuantity = table.Column<int>(type: "int", nullable: false)
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

            migrationBuilder.CreateTable(
                name: "StoreOrderItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreOrderId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    ProductName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    ProductImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Variant = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Color = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoreOrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoreOrderItems_StoreOrders_StoreOrderId",
                        column: x => x.StoreOrderId,
                        principalTable: "StoreOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Products",
                columns: new[] { "Id", "Badge", "Brand", "Category", "ImageUrl", "IsActive", "Name", "Price", "StockQuantity" },
                values: new object[,]
                {
                    { 1, "BÁN CHẠY", "ASICS", "tennis", "/img/shoe-white.jpg", true, "Giày Asics Gel Resolution X 'White Pure Silver'", 3500000L, 10 },
                    { 2, "MỚI", "WILSON", "tennis", "/img/shoe-red.jpg", true, "Giày Wilson Rush Pro 4.5 'Red White'", 4900000L, 10 },
                    { 3, null, "NIKE", "tennis", "/img/shoe-violet.jpg", true, "Giày Nike Air Zoom Vapor Pro 3 'Binary Blue'", 3500000L, 10 },
                    { 4, "-15%", "BABOLAT", "tennis", "/img/shoe-blue.jpg", true, "Giày Babolat Jet Mach 3 'Blue Court'", 4500000L, 10 },
                    { 5, null, "BABOLAT", "running", "/img/shoe-teal.jpg", true, "Giày Babolat Jet Mach 3 All Court", 4500000L, 10 },
                    { 6, null, "BABOLAT", "running", "/img/shoe-navy.jpg", true, "Giày Babolat Jet Mach 3 'Sand Grass'", 4900000L, 10 },
                    { 7, "MỚI", "ASICS", "tennis", "/img/shoe-white.jpg", true, "Giày Asics Court FF 3 'White Silver'", 3990000L, 10 },
                    { 8, null, "NEW BALANCE", "running", "/img/shoe-teal.jpg", true, "Giày chạy bộ Fresh Foam 'Sea Salt'", 3250000L, 10 },
                    { 9, "-10%", "BABOLAT", "tennis", "/img/shoe-blue.jpg", true, "Giày Babolat Propulse Fury 'Blue'", 4200000L, 10 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariants_ProductId_Color_Size",
                table: "ProductVariants",
                columns: new[] { "ProductId", "Color", "Size" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StoreOrderItems_StoreOrderId",
                table: "StoreOrderItems",
                column: "StoreOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_StoreOrders_CreatedAtUtc",
                table: "StoreOrders",
                column: "CreatedAtUtc");

            migrationBuilder.Sql("""
                INSERT INTO [Products] ([Name], [Brand], [Category], [Price], [ImageUrl], [Badge], [StockQuantity], [IsActive])
                SELECT seed.[Name], seed.[Brand], seed.[Category], seed.[Price], seed.[ImageUrl], seed.[Badge], 10, 1
                FROM (VALUES
                    (N'Vợt Pickleball JOOLA Ben Johns Hyperion', N'JOOLA', N'pickleball-racket', 4890000, N'/img/pickleball-paddle-2025.jpg', N'BÁN CHẠY'),
                    (N'Vợt Pickleball Selkirk SLK Evo', N'SELKIRK', N'pickleball-racket', 3290000, N'/img/pickleball-selkirk.jpg', NULL),
                    (N'Vợt Pickleball HEAD Radical Tour', N'HEAD', N'pickleball-racket', 3790000, N'/img/pickleball-head.jpg', N'MỚI'),
                    (N'Áo thể thao Authentic Dry-Fit', N'AUTHENTIC', N'clothing', 590000, N'/img/sports-shirt.jpg', NULL),
                    (N'Áo polo tennis Court Classic', N'AUTHENTIC', N'clothing', 890000, N'/img/sports-shirt.jpg', N'MỚI'),
                    (N'Quần short thể thao Move Free', N'AUTHENTIC', N'clothing', 650000, N'/img/sports-shirt.jpg', NULL),
                    (N'Bóng Pickleball Franklin X-40 (3 quả)', N'FRANKLIN', N'accessories', 390000, N'/img/pickleball-paddle-2025.jpg', NULL),
                    (N'Túi đựng vợt Pickleball Court Bag', N'AUTHENTIC', N'accessories', 790000, N'/img/sports-bag.jpg', NULL),
                    (N'Băng quấn cán vợt Pro Overgrip (3 cuộn)', N'WILSON', N'accessories', 250000, N'/img/pickleball-head.jpg', NULL)
                ) AS seed ([Name], [Brand], [Category], [Price], [ImageUrl], [Badge])
                WHERE NOT EXISTS (SELECT 1 FROM [Products] AS existing WHERE existing.[Name] = seed.[Name]);

                INSERT INTO [ProductVariants] ([ProductId], [Color], [ColorHex], [Size], [StockQuantity])
                SELECT product.[Id],
                       CASE
                           WHEN LOWER(product.[Name]) LIKE N'%red%' OR LOWER(product.[Name]) LIKE N'%đỏ%' THEN N'Đỏ'
                           WHEN LOWER(product.[Name]) LIKE N'%blue%' OR LOWER(product.[Name]) LIKE N'%xanh%' THEN N'Xanh dương'
                           WHEN LOWER(product.[Name]) LIKE N'%white%' OR LOWER(product.[Name]) LIKE N'%silver%' OR LOWER(product.[Name]) LIKE N'%trắng%' THEN N'Trắng'
                           WHEN LOWER(product.[Name]) LIKE N'%teal%' THEN N'Xanh ngọc'
                           WHEN LOWER(product.[Name]) LIKE N'%navy%' THEN N'Xanh navy'
                           WHEN LOWER(product.[Name]) LIKE N'%violet%' OR LOWER(product.[Name]) LIKE N'%tím%' THEN N'Tím'
                           ELSE N'Màu mặc định'
                       END,
                       CASE
                           WHEN LOWER(product.[Name]) LIKE N'%red%' OR LOWER(product.[Name]) LIKE N'%đỏ%' THEN N'#D71920'
                           WHEN LOWER(product.[Name]) LIKE N'%blue%' OR LOWER(product.[Name]) LIKE N'%xanh%' THEN N'#2D66B3'
                           WHEN LOWER(product.[Name]) LIKE N'%white%' OR LOWER(product.[Name]) LIKE N'%silver%' OR LOWER(product.[Name]) LIKE N'%trắng%' THEN N'#F4F4F4'
                           WHEN LOWER(product.[Name]) LIKE N'%teal%' THEN N'#20B2AA'
                           WHEN LOWER(product.[Name]) LIKE N'%navy%' THEN N'#17224D'
                           WHEN LOWER(product.[Name]) LIKE N'%violet%' OR LOWER(product.[Name]) LIKE N'%tím%' THEN N'#7556A5'
                           ELSE N'#404040'
                       END,
                       sizes.[Size],
                       product.[StockQuantity] / 7 +
                           CASE WHEN sizes.[Position] < product.[StockQuantity] % 7 THEN 1 ELSE 0 END
                FROM [Products] AS product
                CROSS JOIN (VALUES (0, N'39'), (1, N'40'), (2, N'41'), (3, N'42'), (4, N'43'), (5, N'44'), (6, N'45')) AS sizes ([Position], [Size])
                WHERE product.[Category] IN (N'tennis', N'running', N'lifestyle', N'shoes');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "ProductVariants");

            migrationBuilder.DropTable(
                name: "StoreOrderItems");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "Products");

            migrationBuilder.DropTable(
                name: "StoreOrders");
        }
    }
}
