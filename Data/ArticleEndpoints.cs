using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using BaitaplonWeb;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.EntityFrameworkCore;

namespace BaitaplonWeb.Data;

public static partial class ArticleEndpoints
{
    private const int PageSize = 20;

    public static void MapArticleEndpoints(this WebApplication app)
    {
        var adminArticles = app.MapGroup("/api/admin/articles")
            .RequireAuthorization(policy => policy.RequireRole(RoleNames.Admin));

        adminArticles.MapGet("/antiforgery", (HttpContext context, IAntiforgery antiforgery) =>
        {
            var tokens = antiforgery.GetAndStoreTokens(context);
            return Results.Ok(new { token = tokens.RequestToken });
        });

        adminArticles.MapGet("/categories", async (ApplicationDbContext database, CancellationToken cancellationToken) =>
            Results.Ok(await database.Articles.AsNoTracking()
                .Select(article => article.Category)
                .Distinct()
                .OrderBy(category => category)
                .ToListAsync(cancellationToken)));

        adminArticles.MapGet("/", async (
            string? q,
            string? category,
            string? status,
            int? page,
            ApplicationDbContext database,
            CancellationToken cancellationToken) =>
        {
            var query = database.Articles.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                query = query.Where(article => article.Title.Contains(term));
            }
            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(article => article.Category == category.Trim());
            }
            if (Enum.TryParse<ArticleStatus>(status, true, out var parsedStatus))
            {
                query = query.Where(article => article.Status == parsedStatus);
            }

            var total = await query.CountAsync(cancellationToken);
            var currentPage = Math.Max(1, page ?? 1);
            var articles = await query
                .OrderByDescending(article => article.UpdatedAt)
                .Skip((currentPage - 1) * PageSize)
                .Take(PageSize)
                .Select(article => new ArticleResponse(
                    article.Id, article.Title, article.Slug, article.Summary, string.Empty,
                    article.ThumbnailUrl, article.Category, article.AuthorId,
                    article.Author == null ? article.AuthorId : article.Author.UserName ?? article.AuthorId,
                    article.CreatedAt, article.UpdatedAt, article.PublishedAt, article.Status.ToString()))
                .ToListAsync(cancellationToken);

            return Results.Ok(new { items = articles, total, page = currentPage, pageSize = PageSize });
        });

        adminArticles.MapGet("/{id:int}", async (int id, ApplicationDbContext database, CancellationToken cancellationToken) =>
        {
            var article = await database.Articles.AsNoTracking()
                .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
            return article is null ? Results.NotFound() : Results.Ok(await ToResponseAsync(database, article, cancellationToken));
        });

        adminArticles.MapPost("/", async (
            ArticleRequest request,
            ClaimsPrincipal user,
            HttpContext context,
            IAntiforgery antiforgery,
            ApplicationDbContext database,
            CancellationToken cancellationToken) =>
        {
            if (!await HasValidAntiforgeryToken(context, antiforgery))
            {
                return Results.BadRequest(new { message = "Mã bảo mật không hợp lệ. Hãy tải lại trang và thử lại." });
            }

            var values = Normalize(request);
            var errors = Validate(values);
            if (errors.Count > 0) return Results.ValidationProblem(errors);
            if (await database.Articles.AnyAsync(article => article.Slug == values.Slug, cancellationToken))
            {
                return Results.Conflict(new { message = "Đường dẫn bài viết đã được sử dụng." });
            }

            var now = DateTime.UtcNow;
            var article = new Article
            {
                Title = values.Title,
                Slug = values.Slug,
                Summary = values.Summary,
                Content = values.Content,
                ThumbnailUrl = values.ThumbnailUrl,
                Category = values.Category,
                AuthorId = user.FindFirstValue(ClaimTypes.NameIdentifier)!,
                CreatedAt = now,
                UpdatedAt = now,
                PublishedAt = values.Status == ArticleStatus.Published ? now : null,
                Status = values.Status
            };

            database.Articles.Add(article);
            try
            {
                await database.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                return Results.Conflict(new { message = "Không thể lưu bài viết. Hãy kiểm tra đường dẫn có bị trùng không." });
            }

            return Results.Created($"/api/admin/articles/{article.Id}", await ToResponseAsync(database, article, cancellationToken));
        });

        adminArticles.MapPut("/{id:int}", async (
            int id,
            ArticleRequest request,
            HttpContext context,
            IAntiforgery antiforgery,
            ApplicationDbContext database,
            CancellationToken cancellationToken) =>
        {
            if (!await HasValidAntiforgeryToken(context, antiforgery))
            {
                return Results.BadRequest(new { message = "Mã bảo mật không hợp lệ. Hãy tải lại trang và thử lại." });
            }

            var values = Normalize(request);
            var errors = Validate(values);
            if (errors.Count > 0) return Results.ValidationProblem(errors);
            var article = await database.Articles.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
            if (article is null) return Results.NotFound();
            if (await database.Articles.AnyAsync(item => item.Id != id && item.Slug == values.Slug, cancellationToken))
            {
                return Results.Conflict(new { message = "Đường dẫn bài viết đã được sử dụng." });
            }

            var wasPublished = article.Status == ArticleStatus.Published;
            article.Title = values.Title;
            article.Slug = values.Slug;
            article.Summary = values.Summary;
            article.Content = values.Content;
            article.ThumbnailUrl = values.ThumbnailUrl;
            article.Category = values.Category;
            article.Status = values.Status;
            article.UpdatedAt = DateTime.UtcNow;
            article.PublishedAt = values.Status == ArticleStatus.Published
                ? article.PublishedAt ?? article.UpdatedAt
                : wasPublished ? null : article.PublishedAt;

            try
            {
                await database.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                return Results.Conflict(new { message = "Không thể lưu bài viết. Hãy kiểm tra đường dẫn có bị trùng không." });
            }

            return Results.Ok(await ToResponseAsync(database, article, cancellationToken));
        });

        adminArticles.MapDelete("/{id:int}", async (
            int id,
            HttpContext context,
            IAntiforgery antiforgery,
            ApplicationDbContext database,
            CancellationToken cancellationToken) =>
        {
            if (!await HasValidAntiforgeryToken(context, antiforgery))
            {
                return Results.BadRequest(new { message = "Mã bảo mật không hợp lệ. Hãy tải lại trang và thử lại." });
            }

            var article = await database.Articles.FindAsync([id], cancellationToken);
            if (article is null) return Results.NotFound();
            database.Articles.Remove(article);
            await database.SaveChangesAsync(cancellationToken);
            return Results.NoContent();
        });

        app.MapGet("/api/articles", async (
            string? q,
            string? category,
            int? page,
            ApplicationDbContext database,
            CancellationToken cancellationToken) =>
        {
            var query = database.Articles.AsNoTracking()
                .Where(article => article.Status == ArticleStatus.Published);
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                query = query.Where(article => article.Title.Contains(term) || article.Summary.Contains(term));
            }
            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(article => article.Category == category.Trim());
            }

            var total = await query.CountAsync(cancellationToken);
            var currentPage = Math.Max(1, page ?? 1);
            var articles = await query
                .OrderByDescending(article => article.PublishedAt)
                .Skip((currentPage - 1) * PageSize)
                .Take(PageSize)
                .Select(article => new PublicArticleResponse(
                    article.Title, article.Slug, article.Summary, article.ThumbnailUrl,
                    article.Category, article.Author == null ? "Authentic Shoes" : article.Author.UserName ?? "Authentic Shoes",
                    article.PublishedAt))
                .ToListAsync(cancellationToken);

            return Results.Ok(new { items = articles, total, page = currentPage, pageSize = PageSize });
        }).AllowAnonymous();

        app.MapGet("/api/articles/categories", async (ApplicationDbContext database, CancellationToken cancellationToken) =>
            Results.Ok(await database.Articles.AsNoTracking()
                .Where(article => article.Status == ArticleStatus.Published)
                .Select(article => article.Category)
                .Distinct()
                .OrderBy(category => category)
                .ToListAsync(cancellationToken))).AllowAnonymous();

        app.MapGet("/api/articles/{slug}", async (
            string slug,
            ApplicationDbContext database,
            CancellationToken cancellationToken) =>
        {
            var article = await database.Articles.AsNoTracking()
                .Where(item => item.Slug == slug && item.Status == ArticleStatus.Published)
                .Select(item => new PublicArticleDetailResponse(
                    item.Title, item.Slug, item.Summary, item.Content, item.ThumbnailUrl,
                    item.Category, item.Author == null ? "Authentic Shoes" : item.Author.UserName ?? "Authentic Shoes",
                    item.PublishedAt))
                .SingleOrDefaultAsync(cancellationToken);
            return article is null ? Results.NotFound() : Results.Ok(article);
        }).AllowAnonymous();
    }

    public static string CreateSlug(string value)
    {
        var normalized = value.Trim().ToLowerInvariant().Replace('đ', 'd');
        var decomposed = normalized.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        foreach (var character in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark) continue;
            builder.Append(char.IsLetterOrDigit(character) ? character : '-');
        }

        return SlugSeparators().Replace(builder.ToString(), "-").Trim('-').Normalize(NormalizationForm.FormC);
    }

    private static NormalizedArticle Normalize(ArticleRequest request) => new(
        request.Title?.Trim() ?? string.Empty,
        CreateSlug(string.IsNullOrWhiteSpace(request.Slug) ? request.Title ?? string.Empty : request.Slug),
        request.Summary?.Trim() ?? string.Empty,
        request.Content?.Trim() ?? string.Empty,
        string.IsNullOrWhiteSpace(request.ThumbnailUrl) ? null : request.ThumbnailUrl.Trim(),
        request.Category?.Trim() ?? string.Empty,
        Enum.TryParse<ArticleStatus>(request.Status, true, out var status) ? status : (ArticleStatus)(-1));

    private static Dictionary<string, string[]> Validate(NormalizedArticle article)
    {
        var errors = new Dictionary<string, string[]>();
        if (article.Title.Length is < 2 or > 200) errors[nameof(article.Title)] = ["Tiêu đề phải có từ 2 đến 200 ký tự."];
        if (article.Slug.Length is < 1 or > 240 || !Regex.IsMatch(article.Slug, "^[a-z0-9]+(?:-[a-z0-9]+)*$"))
            errors[nameof(article.Slug)] = ["Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang."];
        if (article.Summary.Length > 500) errors[nameof(article.Summary)] = ["Mô tả ngắn không được vượt quá 500 ký tự."];
        if (string.IsNullOrWhiteSpace(article.Content) || article.Content.Length > 100_000)
            errors[nameof(article.Content)] = ["Nội dung không được để trống và tối đa 100.000 ký tự."];
        if (article.Category.Length is < 1 or > 80) errors[nameof(article.Category)] = ["Danh mục phải có từ 1 đến 80 ký tự."];
        if (article.Status is not ArticleStatus.Draft and not ArticleStatus.Published)
            errors[nameof(article.Status)] = ["Trạng thái bài viết không hợp lệ."];
        if (article.ThumbnailUrl is not null && !IsValidImageUrl(article.ThumbnailUrl))
            errors[nameof(article.ThumbnailUrl)] = ["Ảnh phải nằm trong /img hoặc /assets, hoặc dùng đường dẫn HTTPS."];
        return errors;
    }

    private static bool IsValidImageUrl(string imageUrl)
    {
        var value = imageUrl.Trim();
        if (value.StartsWith("/img/", StringComparison.Ordinal) || value.StartsWith("/assets/", StringComparison.Ordinal))
        {
            return !value.Contains("..", StringComparison.Ordinal) && !value.Contains('\\') && !value.Any(char.IsControl);
        }

        return Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps;
    }

    private static async Task<ArticleResponse> ToResponseAsync(ApplicationDbContext database, Article article, CancellationToken cancellationToken)
    {
        var author = await database.Users.AsNoTracking()
            .Where(user => user.Id == article.AuthorId)
            .Select(user => user.UserName)
            .SingleOrDefaultAsync(cancellationToken);
        return new ArticleResponse(article.Id, article.Title, article.Slug, article.Summary, article.Content,
            article.ThumbnailUrl, article.Category, article.AuthorId, author ?? article.AuthorId,
            article.CreatedAt, article.UpdatedAt, article.PublishedAt, article.Status.ToString());
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

    [GeneratedRegex("-+")]
    private static partial Regex SlugSeparators();

    public sealed record ArticleRequest(string? Title, string? Slug, string? Summary, string? Content, string? ThumbnailUrl, string? Category, string? Status);
    private sealed record NormalizedArticle(string Title, string Slug, string Summary, string Content, string? ThumbnailUrl, string Category, ArticleStatus Status);
    private sealed record ArticleResponse(int Id, string Title, string Slug, string Summary, string Content, string? ThumbnailUrl, string Category, string AuthorId, string AuthorName, DateTime CreatedAt, DateTime UpdatedAt, DateTime? PublishedAt, string Status);
    private sealed record PublicArticleResponse(string Title, string Slug, string Summary, string? ThumbnailUrl, string Category, string AuthorName, DateTime? PublishedAt);
    private sealed record PublicArticleDetailResponse(string Title, string Slug, string Summary, string Content, string? ThumbnailUrl, string Category, string AuthorName, DateTime? PublishedAt);
}