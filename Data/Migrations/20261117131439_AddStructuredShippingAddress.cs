using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaitaplonWeb.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStructuredShippingAddress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "District",
                table: "StoreOrders",
                type: "TEXT",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProvinceOrCity",
                table: "StoreOrders",
                type: "TEXT",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StreetAddress",
                table: "StoreOrders",
                type: "TEXT",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WardOrCommune",
                table: "StoreOrders",
                type: "TEXT",
                maxLength: 120,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "District",
                table: "StoreOrders");

            migrationBuilder.DropColumn(
                name: "ProvinceOrCity",
                table: "StoreOrders");

            migrationBuilder.DropColumn(
                name: "StreetAddress",
                table: "StoreOrders");

            migrationBuilder.DropColumn(
                name: "WardOrCommune",
                table: "StoreOrders");
        }
    }
}
