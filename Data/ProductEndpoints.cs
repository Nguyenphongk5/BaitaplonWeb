using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text.Json;
using BaitaplonWeb;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.EntityFrameworkCore;

namespace BaitaplonWeb.Data;

public static class ProductEndpoints
{
    private static readonly HashSet<string> Categories = new(StringComparer.Ordinal)
    {
        "tennis",
        "running",
        "lifestyle",
        "clothing",
        "shoes",
        "pickleball-racket",
        "accessories"
    };

    public static void MapProductEndpoints(this WebApplication app)
    {
        app.MapGet("/api/account/orders", async (
            ClaimsPrincipal user,
            ApplicationDbContext database,
            CancellationToken cancellationToken) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Results.Unauthorized();
            }

            var orders = await database.StoreOrders
                .AsNoTracking()
                .Where(order => order.UserId == userId)
                .OrderByDescending(order => order.CreatedAtUtc)
                .Select(order => new CustomerOrderResponse(
                    order.Id,
                    order.TotalAmount,
                    order.Status,
                    order.CreatedAtUtc,
                    order.Items.Select(item => new OrderItemResponse(item.ProductName, item.ProductImageUrl, item.Variant, item.Color, item.Quantity, item.UnitPrice)).ToList()))
                .ToListAsync(cancellationToken);

            return Results.Ok(orders);
        }).RequireAuthorization();

        app.MapGet("/api/account/orders/stream", async (
            HttpContext context,
            OrderStatusNotifier notifier,
            CancellationToken cancellationToken) =>
        {
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Results.Unauthorized();
            }

            context.Response.Headers.CacheControl = "no-cache";
            context.Response.Headers.Append("X-Accel-Buffering", "no");
            context.Response.ContentType = "text/event-stream";

            using var subscription = notifier.Subscribe(userId);
            await context.Response.WriteAsync("event: connected\ndata: {}\n\n", cancellationToken);
            await context.Response.Body.FlushAsync(cancellationToken);

            while (!cancellationToken.IsCancellationRequested)
            {
                var readTask = subscription.Reader.WaitToReadAsync(cancellationToken).AsTask();
                var keepAliveTask = Task.Delay(TimeSpan.FromSeconds(15), cancellationToken);
                var completedTask = await Task.WhenAny(readTask, keepAliveTask);
                if (completedTask == keepAliveTask)
                {
                    await context.Response.WriteAsync(": keep-alive\n\n", cancellationToken);
                    await context.Response.Body.FlushAsync(cancellationToken);
                    continue;
                }

                if (!await readTask)
                {
                    break;
                }

                while (subscription.Reader.TryRead(out var update))
                {
                    var payload = JsonSerializer.Serialize(new
                    {
                        orderId = update.OrderId,
                        status = update.Status,
                        updatedAtUtc = update.UpdatedAtUtc
                    });
                    await context.Response.WriteAsync($"event: order-status\ndata: {payload}\n\n", cancellationToken);
                    await context.Response.Body.FlushAsync(cancellationToken);
                }
            }

            return Results.Empty;
        }).RequireAuthorization();

        app.MapGet("/api/products", async (ApplicationDbContext database, CancellationToken cancellationToken) =>
        {
            var products = await database.Products
                .AsNoTracking()
                .Include(product => product.Variants)
                .Where(product => product.IsActive)
                .OrderBy(product => product.Id)
                .ToListAsync(cancellationToken);

            var soldQuantities = await database.StoreOrderItems
                .Where(item => item.Order != null && item.Order.Status != OrderStatuses.Cancelled)
                .GroupBy(item => item.ProductId)
                .Select(group => new { ProductId = group.Key, Quantity = group.Sum(item => item.Quantity) })
                .ToDictionaryAsync(item => item.ProductId, item => item.Quantity, cancellationToken);

            return Results.Ok(products.Select(product =>
                ToResponse(product, soldQuantities.GetValueOrDefault(product.Id))));
        }).AllowAnonymous();

        app.MapGet("/api/products/{id:int}", async (int id, ApplicationDbContext database, CancellationToken cancellationToken) =>
        {
            var product = await database.Products
                .AsNoTracking()
                .Include(item => item.Variants)
                .SingleOrDefaultAsync(item => item.Id == id && item.IsActive, cancellationToken);

            if (product is null)
            {
                return Results.NotFound();
            }

            var soldQuantity = await database.StoreOrderItems
                .Where(item => item.ProductId == id && item.Order != null && item.Order.Status != OrderStatuses.Cancelled)
                .SumAsync(item => (int?)item.Quantity, cancellationToken) ?? 0;
            return Results.Ok(ToResponse(product, soldQuantity));
        }).AllowAnonymous();

        app.MapPost("/api/cart/check", async (CartCheckRequest request, ApplicationDbContext database, CancellationToken cancellationToken) =>
        {
            if (request.ProductId < 1 || request.Quantity is < 1 or > 99
                || (request.Color is null) != (request.Size is null))
            {
                return Results.BadRequest(new { message = "Số lượng sản phẩm không hợp lệ." });
            }

            var product = await database.Products
                .AsNoTracking()
                .Include(item => item.Variants)
                .SingleOrDefaultAsync(item => item.Id == request.ProductId && item.IsActive, cancellationToken);

            if (product is null)
            {
                return Results.NotFound(new { message = "Sản phẩm không còn bán." });
            }

            var variant = product.Variants.Count == 0
                ? null
                : product.Variants.SingleOrDefault(item =>
                    string.Equals(item.Color, request.Color?.Trim(), StringComparison.OrdinalIgnoreCase)
                    && string.Equals(item.Size, request.Size?.Trim(), StringComparison.OrdinalIgnoreCase));
            if (product.Variants.Count > 0 && variant is null)
            {
                return Results.Conflict(new { message = "Vui lòng chọn màu sắc và size còn hàng." });
            }

            if (product.Variants.Count == 0 && (request.Color is not null || request.Size is not null))
            {
                return Results.Conflict(new { message = "Sản phẩm này không có phân loại màu sắc và size." });
            }

            var available = variant?.StockQuantity ?? product.StockQuantity;
            if (request.Quantity > available)
            {
                return Results.Conflict(new
                {
                    message = available == 0
                        ? $"“{product.Name}” đã hết hàng."
                        : $"“{product.Name}” chỉ còn {available} sản phẩm trong lựa chọn này.",
                    available
                });
            }

            return Results.Ok(new { available, product.Name });
        }).AllowAnonymous();

        app.MapGet("/api/orders/antiforgery", (HttpContext context, IAntiforgery antiforgery) =>
        {
            var tokens = antiforgery.GetAndStoreTokens(context);
            return Results.Ok(new { token = tokens.RequestToken });
        }).AllowAnonymous();

        app.MapPost("/api/orders", async (
            CheckoutRequest request,
            HttpContext context,
            IAntiforgery antiforgery,
            ApplicationDbContext database,
            CancellationToken cancellationToken) =>
        {
            if (context.User.Identity?.IsAuthenticated != true)
            {
                return Results.Unauthorized();
            }

            if (!await HasValidAntiforgeryToken(context, antiforgery))
            {
                return Results.BadRequest(new { message = "Phiên đặt hàng không hợp lệ. Hãy tải lại trang và thử lại." });
            }

            var validationErrors = ValidateCheckout(request);
            if (validationErrors.Count > 0)
            {
                return Results.ValidationProblem(validationErrors);
            }

            if (request.Items
                .Select(item => $"{item.ProductId}:{item.Color?.Trim().ToUpperInvariant()}:{item.Size?.Trim().ToUpperInvariant()}:{item.Variant?.Trim().ToUpperInvariant()}")
                .Distinct(StringComparer.Ordinal)
                .Count() != request.Items.Count)
            {
                return Results.BadRequest(new { message = "Giỏ hàng có sản phẩm và phân loại bị trùng. Hãy tải lại trang rồi thử lại." });
            }

            var productIds = request.Items.Select(item => item.ProductId).Distinct().ToArray();
            var products = await database.Products
                .Include(product => product.Variants)
                .Where(product => productIds.Contains(product.Id) && product.IsActive)
                .ToDictionaryAsync(product => product.Id, cancellationToken);

            if (products.Count != productIds.Length)
            {
                return Results.Conflict(new { message = "Một số sản phẩm không còn bán. Vui lòng kiểm tra lại giỏ hàng." });
            }

            await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);
            foreach (var item in request.Items)
            {
                var product = products[item.ProductId];
                var variant = product.Variants.Count == 0
                    ? null
                    : product.Variants.SingleOrDefault(option =>
                        string.Equals(option.Color, item.Color?.Trim(), StringComparison.OrdinalIgnoreCase)
                        && string.Equals(option.Size, item.Size?.Trim(), StringComparison.OrdinalIgnoreCase));
                if ((product.Variants.Count > 0 && variant is null)
                    || (product.Variants.Count == 0 && (item.Color is not null || item.Size is not null)))
                {
                    await transaction.RollbackAsync(cancellationToken);
                    return Results.Conflict(new { message = $"Vui lòng chọn màu sắc và size hợp lệ cho “{product.Name}”.", productId = product.Id });
                }

                var updatedVariantRows = variant is null
                    ? 1
                    : await database.ProductVariants
                        .Where(current => current.Id == variant.Id && current.StockQuantity >= item.Quantity)
                        .ExecuteUpdateAsync(setters => setters
                            .SetProperty(current => current.StockQuantity, current => current.StockQuantity - item.Quantity), cancellationToken);
                var updatedRows = await database.Products
                    .Where(current => current.Id == item.ProductId && current.IsActive && current.StockQuantity >= item.Quantity
                        && updatedVariantRows > 0)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(current => current.StockQuantity, current => current.StockQuantity - item.Quantity), cancellationToken);

                if (updatedVariantRows == 0 || updatedRows == 0)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    return Results.Conflict(new
                    {
                        message = (variant?.StockQuantity ?? product.StockQuantity) == 0
                            ? $"“{product.Name}” đã hết hàng."
                            : $"“{product.Name}” không đủ số lượng trong lựa chọn này. Vui lòng cập nhật giỏ hàng.",
                        productId = product.Id
                    });
                }
            }

            var order = new StoreOrder
            {
                UserId = context.User.Identity?.IsAuthenticated == true
                    ? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    : null,
                CustomerName = request.CustomerName.Trim(),
                PhoneNumber = request.PhoneNumber.Trim(),
                ShippingAddress = request.ShippingAddress.Trim(),
                CreatedAtUtc = DateTime.UtcNow,
                Status = OrderStatuses.Pending,
                Items = request.Items.Select(item =>
                {
                    var product = products[item.ProductId];
                    return new StoreOrderItem
                    {
                        ProductId = product.Id,
                        ProductName = product.Name,
                        ProductImageUrl = product.ImageUrl,
                        Variant = string.IsNullOrWhiteSpace(item.Size) ? (string.IsNullOrWhiteSpace(item.Variant) ? null : item.Variant.Trim()) : item.Size.Trim(),
                        Color = string.IsNullOrWhiteSpace(item.Color) ? null : item.Color.Trim(),
                        Quantity = item.Quantity,
                        UnitPrice = product.Price
                    };
                }).ToList()
            };
            order.TotalAmount = order.Items.Sum(item => item.UnitPrice * item.Quantity);

            database.StoreOrders.Add(order);
            await database.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return Results.Created($"/api/orders/{order.Id}", new { id = order.Id, order.TotalAmount, order.Status });
        }).RequireAuthorization();

        var adminProducts = app.MapGroup("/api/admin/products")
            .RequireAuthorization(policy => policy.RequireRole(RoleNames.Admin));

        adminProducts.MapGet("/", async (ApplicationDbContext database, CancellationToken cancellationToken) =>
        {
            var products = await database.Products
                .AsNoTracking()
                .Include(product => product.Variants)
                .OrderByDescending(product => product.Id)
                .ToListAsync(cancellationToken);

            return Results.Ok(products.Select(ToResponse));
        });

        adminProducts.MapGet("/antiforgery", (HttpContext context, IAntiforgery antiforgery) =>
        {
            var tokens = antiforgery.GetAndStoreTokens(context);
            return Results.Ok(new { token = tokens.RequestToken });
        });

        adminProducts.MapPost("/", async (
            ProductRequest request,
            HttpContext context,
            IAntiforgery antiforgery,
            ApplicationDbContext database,
            CancellationToken cancellationToken) =>
        {
            if (!await HasValidAntiforgeryToken(context, antiforgery))
            {
                return Results.BadRequest(new { title = "Mã bảo mật không hợp lệ. Hãy tải lại trang và thử lại." });
            }

            var errors = Validate(request);
            if (errors.Count > 0)
            {
                return Results.ValidationProblem(errors);
            }

            var product = new Product
            {
                Name = request.Name.Trim(),
                Brand = request.Brand.Trim(),
                Category = request.Category,
                Price = request.Price,
                ImageUrl = request.ImageUrl.Trim(),
                Badge = CleanBadge(request.Badge),
                StockQuantity = request.Variants.Count > 0 ? request.Variants.Sum(variant => variant.StockQuantity) : request.StockQuantity,
                IsActive = request.IsActive
            };

            product.Variants = request.Variants.Select(ToVariant).ToList();
            database.Products.Add(product);
            await database.SaveChangesAsync(cancellationToken);
            return Results.Created($"/api/admin/products/{product.Id}", ToResponse(product));
        });

        adminProducts.MapPut("/{id:int}", async (
            int id,
            ProductRequest request,
            HttpContext context,
            IAntiforgery antiforgery,
            ApplicationDbContext database,
            CancellationToken cancellationToken) =>
        {
            if (!await HasValidAntiforgeryToken(context, antiforgery))
            {
                return Results.BadRequest(new { title = "Mã bảo mật không hợp lệ. Hãy tải lại trang và thử lại." });
            }

            var errors = Validate(request);
            if (errors.Count > 0)
            {
                return Results.ValidationProblem(errors);
            }

            var product = await database.Products.Include(item => item.Variants).SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
            if (product is null)
            {
                return Results.NotFound();
            }

            var requestedVariantKeys = request.Variants
                .Select(variant => $"{variant.Color.Trim().ToUpperInvariant()}:{variant.Size.Trim().ToUpperInvariant()}")
                .ToHashSet(StringComparer.Ordinal);
            var outstandingVariants = await database.StoreOrderItems
                .Where(item => item.ProductId == id
                    && item.Color != null
                    && item.Variant != null
                    && (item.Order!.Status == OrderStatuses.Pending || item.Order.Status == OrderStatuses.Confirmed))
                .Select(item => new { item.Color, item.Variant })
                .Distinct()
                .ToListAsync(cancellationToken);
            if (outstandingVariants.Any(variant =>
                !requestedVariantKeys.Contains($"{variant.Color!.ToUpperInvariant()}:{variant.Variant!.ToUpperInvariant()}")))
            {
                return Results.Conflict(new { message = "Không thể xóa hoặc đổi màu/size đang có đơn chưa hủy; hãy giữ phân loại đến khi đơn được hủy hoặc hoàn tất." });
            }

            product.Name = request.Name.Trim();
            product.Brand = request.Brand.Trim();
            product.Category = request.Category;
            product.Price = request.Price;
            product.ImageUrl = request.ImageUrl.Trim();
            product.Badge = CleanBadge(request.Badge);
            product.StockQuantity = request.Variants.Count > 0 ? request.Variants.Sum(variant => variant.StockQuantity) : request.StockQuantity;
            product.IsActive = request.IsActive;
            UpdateVariants(product, request.Variants);

            await database.SaveChangesAsync(cancellationToken);
            return Results.Ok(ToResponse(product));
        });

        adminProducts.MapDelete("/{id:int}", async (
            int id,
            HttpContext context,
            IAntiforgery antiforgery,
            ApplicationDbContext database,
            CancellationToken cancellationToken) =>
        {
            if (!await HasValidAntiforgeryToken(context, antiforgery))
            {
                return Results.BadRequest(new { title = "Mã bảo mật không hợp lệ. Hãy tải lại trang và thử lại." });
            }

            var product = await database.Products.FindAsync([id], cancellationToken);
            if (product is null)
            {
                return Results.NotFound();
            }

            database.Products.Remove(product);
            await database.SaveChangesAsync(cancellationToken);
            return Results.NoContent();
        });

        var adminOrders = app.MapGroup("/api/admin/orders")
            .RequireAuthorization(policy => policy.RequireRole(RoleNames.Admin));

        adminOrders.MapGet("/", async (ApplicationDbContext database, CancellationToken cancellationToken) =>
        {
            var orders = await database.StoreOrders
                .AsNoTracking()
                .Include(order => order.Items)
                .OrderByDescending(order => order.CreatedAtUtc)
                .Select(order => new OrderResponse(
                    order.Id,
                    order.CustomerName,
                    order.PhoneNumber,
                    order.ShippingAddress,
                    order.TotalAmount,
                    order.Status,
                    order.CreatedAtUtc,
                    order.Items.Select(item => new OrderItemResponse(item.ProductName, item.ProductImageUrl, item.Variant, item.Color, item.Quantity, item.UnitPrice)).ToList()))
                .ToListAsync(cancellationToken);

            return Results.Ok(orders);
        });

        adminOrders.MapPut("/{id:int}/status", async (
            int id,
            UpdateOrderStatusRequest request,
            HttpContext context,
            IAntiforgery antiforgery,
            ApplicationDbContext database,
            OrderStatusNotifier notifier,
            CancellationToken cancellationToken) =>
        {
            if (!await HasValidAntiforgeryToken(context, antiforgery))
            {
                return Results.BadRequest(new { message = "Mã bảo mật không hợp lệ. Hãy tải lại trang và thử lại." });
            }

            if (!OrderStatuses.IsValid(request.Status))
            {
                return Results.BadRequest(new { message = "Trạng thái đơn hàng không hợp lệ." });
            }

            await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);
            var order = await database.StoreOrders
                .Include(item => item.Items)
                .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
            if (order is null)
            {
                return Results.NotFound();
            }

            if (order.Status == OrderStatuses.Cancelled && request.Status != OrderStatuses.Cancelled)
            {
                return Results.Conflict(new { message = "Đơn đã hủy không thể mở lại." });
            }

            if (!CanChangeOrderStatus(order.Status, request.Status))
            {
                return Results.Conflict(new { message = $"Không thể chuyển đơn từ {GetStatusLabel(order.Status)} sang {GetStatusLabel(request.Status)}." });
            }

            if (request.Status == OrderStatuses.Cancelled && order.Status != OrderStatuses.Cancelled)
            {
                if (order.Status is OrderStatuses.Shipping or OrderStatuses.Completed)
                {
                    return Results.Conflict(new { message = "Không thể hủy đơn đã giao cho đơn vị vận chuyển." });
                }

                foreach (var item in order.Items)
                {
                    if (item.Color is not null && item.Variant is not null)
                    {
                        await database.ProductVariants
                            .Where(variant => variant.ProductId == item.ProductId
                                && variant.Color == item.Color
                                && variant.Size == item.Variant)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(variant => variant.StockQuantity, variant => variant.StockQuantity + item.Quantity), cancellationToken);
                    }

                    await database.Products
                        .Where(product => product.Id == item.ProductId)
                        .ExecuteUpdateAsync(setters => setters
                            .SetProperty(product => product.StockQuantity, product => product.StockQuantity + item.Quantity), cancellationToken);
                }
            }

            order.Status = request.Status;
            await database.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            if (order.UserId is not null)
            {
                notifier.Notify(new OrderStatusUpdate(order.UserId, order.Id, order.Status, DateTime.UtcNow));
            }
            return Results.Ok(new { id = order.Id, order.Status });
        });
    }

    private static Dictionary<string, string[]> ValidateCheckout(CheckoutRequest request)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);
        if (string.IsNullOrWhiteSpace(request.CustomerName) || request.CustomerName.Trim().Length > 120)
        {
            errors[nameof(request.CustomerName)] = ["Vui lòng nhập họ tên (tối đa 120 ký tự)."];
        }

        if (string.IsNullOrWhiteSpace(request.PhoneNumber)
            || request.PhoneNumber.Trim().Length > 30
            || request.PhoneNumber.Trim().Count(char.IsDigit) < 9)
        {
            errors[nameof(request.PhoneNumber)] = ["Vui lòng nhập số điện thoại hợp lệ."];
        }

        if (string.IsNullOrWhiteSpace(request.ShippingAddress) || request.ShippingAddress.Trim().Length > 500)
        {
            errors[nameof(request.ShippingAddress)] = ["Vui lòng nhập địa chỉ giao hàng (tối đa 500 ký tự)."];
        }

        if (request.Items is null
            || request.Items.Count is < 1 or > 50
            || request.Items.Any(item => item is null
                || item.ProductId < 1
                || item.Quantity is < 1 or > 99
                || item.Variant?.Trim().Length > 30
                || item.Color?.Trim().Length > 40
                || item.Size?.Trim().Length > 20
                || (item.Color is null) != (item.Size is null)))
        {
            errors[nameof(request.Items)] = ["Giỏ hàng trống hoặc số lượng sản phẩm không hợp lệ."];
        }

        return errors;
    }

    private static bool CanChangeOrderStatus(string current, string requested) => current switch
    {
        OrderStatuses.Pending => requested is OrderStatuses.Pending or OrderStatuses.Confirmed or OrderStatuses.Cancelled,
        OrderStatuses.Confirmed => requested is OrderStatuses.Confirmed or OrderStatuses.Shipping or OrderStatuses.Cancelled,
        OrderStatuses.Shipping => requested is OrderStatuses.Shipping or OrderStatuses.Completed,
        OrderStatuses.Completed => requested == OrderStatuses.Completed,
        _ => false
    };

    private static string GetStatusLabel(string status) => status switch
    {
        OrderStatuses.Pending => "Chờ xác nhận",
        OrderStatuses.Confirmed => "Đã xác nhận",
        OrderStatuses.Shipping => "Đang giao",
        OrderStatuses.Completed => "Hoàn tất",
        OrderStatuses.Cancelled => "Đã hủy",
        _ => status
    };

    private static Dictionary<string, string[]> Validate(ProductRequest request)
    {
        var validationResults = new List<ValidationResult>();
        var isValid = Validator.TryValidateObject(request, new ValidationContext(request), validationResults, validateAllProperties: true);
        var errors = validationResults
            .SelectMany(result => result.MemberNames.Select(member => (member, message: result.ErrorMessage ?? "Giá trị không hợp lệ.")))
            .GroupBy(error => error.member)
            .ToDictionary(group => group.Key, group => group.Select(error => error.message).ToArray());

        if (!isValid)
        {
            return errors;
        }

        if (!Categories.Contains(request.Category))
        {
            errors[nameof(request.Category)] = ["Danh mục không hợp lệ."];
        }

        if (!IsValidImageUrl(request.ImageUrl))
        {
            errors[nameof(request.ImageUrl)] = ["Ảnh phải là đường dẫn /img/ hoặc /assets/ trong website, hoặc URL HTTPS."];
        }

        if (request.Variants is null || request.Variants.Count > 100)
        {
            errors[nameof(request.Variants)] = ["Danh sách phân loại không hợp lệ (tối đa 100 tổ hợp)."];
            return errors;
        }

        var variantErrors = new List<string>();
        if (request.Variants.Any(variant => variant is null
            || string.IsNullOrWhiteSpace(variant.Color)
            || variant.Color.Trim().Length > 40
            || string.IsNullOrWhiteSpace(variant.Size)
            || variant.Size.Trim().Length > 20
            || !System.Text.RegularExpressions.Regex.IsMatch(variant.ColorHex ?? string.Empty, "^#[0-9A-Fa-f]{6}$")
            || variant.StockQuantity is < 0 or > 1_000_000))
        {
            variantErrors.Add("Mỗi phân loại cần có màu, mã màu #RRGGBB, size và tồn kho từ 0 đến 1.000.000.");
        }

        if (variantErrors.Count > 0)
        {
            errors[nameof(request.Variants)] = variantErrors.ToArray();
            return errors;
        }

        var duplicateVariant = request.Variants
            .Where(variant => variant is not null)
            .GroupBy(variant => $"{variant.Color.Trim().ToUpperInvariant()}:{variant.Size.Trim().ToUpperInvariant()}", StringComparer.Ordinal)
            .Any(group => group.Count() > 1);
        if (duplicateVariant)
        {
            variantErrors.Add("Không được khai báo trùng tổ hợp màu và size.");
        }

        if (request.Variants.Sum(variant => (long)variant.StockQuantity) > 1_000_000)
        {
            variantErrors.Add("Tổng tồn kho các phân loại không được vượt quá 1.000.000.");
        }

        if (variantErrors.Count > 0)
        {
            errors[nameof(request.Variants)] = variantErrors.ToArray();
        }

        return errors;
    }

    private static bool IsValidImageUrl(string imageUrl)
    {
        var value = imageUrl.Trim();
        if (value.StartsWith("/img/", StringComparison.Ordinal)
            || value.StartsWith("/assets/", StringComparison.Ordinal))
        {
            return !value.Contains("..", StringComparison.Ordinal)
                && !value.Contains('\\')
                && !value.Any(char.IsControl);
        }

        return Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && uri.Scheme == Uri.UriSchemeHttps;
    }

    private static string? CleanBadge(string? badge)
    {
        return string.IsNullOrWhiteSpace(badge) ? null : badge.Trim();
    }

    private static async Task<bool> HasValidAntiforgeryToken(HttpContext context, IAntiforgery antiforgery)
    {
        try
        {
            await antiforgery.ValidateRequestAsync(context);
            return true;
        }
        catch (AntiforgeryValidationException)
        {
            return false;
        }
    }

    private static ProductVariant ToVariant(ProductVariantRequest variant) => new()
    {
        Color = variant.Color.Trim(),
        ColorHex = variant.ColorHex.Trim().ToUpperInvariant(),
        Size = variant.Size.Trim(),
        StockQuantity = variant.StockQuantity
    };

    private static void UpdateVariants(Product product, List<ProductVariantRequest> requests)
    {
        var requested = requests.ToDictionary(
            variant => $"{variant.Color.Trim().ToUpperInvariant()}:{variant.Size.Trim().ToUpperInvariant()}",
            StringComparer.Ordinal);
        foreach (var existing in product.Variants.ToArray())
        {
            var key = $"{existing.Color.ToUpperInvariant()}:{existing.Size.ToUpperInvariant()}";
            if (!requested.Remove(key, out var updated))
            {
                product.Variants.Remove(existing);
                continue;
            }

            existing.Color = updated.Color.Trim();
            existing.ColorHex = updated.ColorHex.Trim().ToUpperInvariant();
            existing.Size = updated.Size.Trim();
            existing.StockQuantity = updated.StockQuantity;
        }

        product.Variants.AddRange(requested.Values.Select(ToVariant));
    }

    private static ProductResponse ToResponse(Product product, int soldQuantity = 0) => new(
        product.Id,
        product.Name,
        product.Brand,
        product.Category,
        product.Price,
        product.ImageUrl,
        product.Badge,
        product.Variants.Count > 0 ? product.Variants.Sum(variant => variant.StockQuantity) : product.StockQuantity,
        product.IsActive,
        product.Variants.Select(variant => new ProductVariantResponse(variant.Color, variant.ColorHex, variant.Size, variant.StockQuantity)).ToList(),
        soldQuantity);

    public sealed class ProductRequest
    {
        [Required(ErrorMessage = "Vui lòng nhập tên sản phẩm.")]
        [StringLength(160, MinimumLength = 2, ErrorMessage = "Tên sản phẩm phải từ 2 đến 160 ký tự.")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng nhập thương hiệu.")]
        [StringLength(80, ErrorMessage = "Thương hiệu không được quá 80 ký tự.")]
        public string Brand { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng chọn danh mục.")]
        public string Category { get; set; } = string.Empty;

        [Range(1, 1_000_000_000, ErrorMessage = "Giá phải lớn hơn 0 và không vượt quá 1 tỷ đồng.")]
        public long Price { get; set; }

        [Required(ErrorMessage = "Vui lòng nhập đường dẫn ảnh.")]
        [StringLength(500, ErrorMessage = "Đường dẫn ảnh không được quá 500 ký tự.")]
        public string ImageUrl { get; set; } = string.Empty;

        [StringLength(40, ErrorMessage = "Nhãn không được quá 40 ký tự.")]
        public string? Badge { get; set; }

        [Range(0, 1_000_000, ErrorMessage = "Tồn kho phải từ 0 đến 1.000.000.")]
        public int StockQuantity { get; set; }

        public List<ProductVariantRequest> Variants { get; set; } = [];

        public bool IsActive { get; set; }
    }

    public sealed class ProductVariantRequest
    {
        public string Color { get; set; } = string.Empty;
        public string ColorHex { get; set; } = "#333333";
        public string Size { get; set; } = string.Empty;
        public int StockQuantity { get; set; }
    }

    public sealed class CartCheckRequest
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public string? Color { get; set; }
        public string? Size { get; set; }
    }

    public sealed class CheckoutRequest
    {
        public string CustomerName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string ShippingAddress { get; set; } = string.Empty;
        public List<CheckoutItemRequest> Items { get; set; } = [];
    }

    public sealed class CheckoutItemRequest
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public string? Variant { get; set; }
        public string? Color { get; set; }
        public string? Size { get; set; }
    }

    public sealed class UpdateOrderStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }

    private sealed record ProductResponse(
        int Id,
        string Name,
        string Brand,
        string Category,
        long Price,
        string ImageUrl,
        string? Badge,
        int StockQuantity,
        bool IsActive,
        List<ProductVariantResponse> Variants,
        int SoldQuantity);

    private sealed record ProductVariantResponse(string Color, string ColorHex, string Size, int StockQuantity);

    private sealed record OrderItemResponse(string ProductName, string ProductImageUrl, string? Variant, string? Color, int Quantity, long UnitPrice);

    private sealed record OrderResponse(
        int Id,
        string CustomerName,
        string PhoneNumber,
        string ShippingAddress,
        long TotalAmount,
        string Status,
        DateTime CreatedAtUtc,
        List<OrderItemResponse> Items);

    private sealed record CustomerOrderResponse(
        int Id,
        long TotalAmount,
        string Status,
        DateTime CreatedAtUtc,
        List<OrderItemResponse> Items);
}
