using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace BaitaplonWeb.Data;

public enum ArticleStatus
{
    Draft,
    Published
}

public sealed class Article
{
    public int Id { get; set; }

    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(240)]
    public string Slug { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Summary { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? ThumbnailUrl { get; set; }

    [MaxLength(80)]
    public string Category { get; set; } = string.Empty;

    [MaxLength(450)]
    public string AuthorId { get; set; } = string.Empty;

    public IdentityUser? Author { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? PublishedAt { get; set; }

    public ArticleStatus Status { get; set; }
}