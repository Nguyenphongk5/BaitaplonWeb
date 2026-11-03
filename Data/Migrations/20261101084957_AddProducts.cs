using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace BaitaplonWeb.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProducts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 160, nullable: false),
                    Brand = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Price = table.Column<long>(type: "INTEGER", nullable: false),
                    ImageUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    Badge = table.Column<string>(type: "TEXT", maxLength: 40, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Products",
                columns: new[] { "Id", "Badge", "Brand", "Category", "ImageUrl", "IsActive", "Name", "Price" },
                values: new object[,]
                {
                    { 1, "BÁN CHẠY", "ASICS", "tennis", "/img/shoe-white.jpg", true, "Giày Asics Gel Resolution X 'White Pure Silver'", 3500000L },
                    { 2, "MỚI", "WILSON", "tennis", "/img/shoe-red.jpg", true, "Giày Wilson Rush Pro 4.5 'Red White'", 4900000L },
                    { 3, null, "NIKE", "tennis", "/img/shoe-violet.jpg", true, "Giày Nike Air Zoom Vapor Pro 3 'Binary Blue'", 3500000L },
                    { 4, "-15%", "BABOLAT", "tennis", "/img/shoe-blue.jpg", true, "Giày Babolat Jet Mach 3 'Blue Court'", 4500000L },
                    { 5, null, "BABOLAT", "running", "/img/shoe-teal.jpg", true, "Giày Babolat Jet Mach 3 All Court", 4500000L },
                    { 6, null, "BABOLAT", "running", "/img/shoe-navy.jpg", true, "Giày Babolat Jet Mach 3 'Sand Grass'", 4900000L },
                    { 7, "MỚI", "ASICS", "tennis", "/img/shoe-white.jpg", true, "Giày Asics Court FF 3 'White Silver'", 3990000L },
                    { 8, null, "NEW BALANCE", "running", "/img/shoe-teal.jpg", true, "Giày chạy bộ Fresh Foam 'Sea Salt'", 3250000L },
                    { 9, "-10%", "BABOLAT", "tennis", "/img/shoe-blue.jpg", true, "Giày Babolat Propulse Fury 'Blue'", 4200000L }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Products");
        }
    }
}
