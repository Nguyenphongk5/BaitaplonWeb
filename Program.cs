using System.Security.Claims;
using BaitaplonWeb.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not configured.");

builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connectionString));
builder.Services.AddSingleton<OrderStatusNotifier>();
builder.Services
    .AddIdentity<IdentityUser, IdentityRole>(options =>
    {
        options.SignIn.RequireConfirmedAccount = false;
        options.User.RequireUniqueEmail = true;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();
builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath = "/login";
    options.AccessDeniedPath = "/";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.SlidingExpiration = true;
    options.Events.OnRedirectToLogin = context =>
    {
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        }

        context.Response.Redirect(context.RedirectUri);
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        }

        context.Response.Redirect(context.RedirectUri);
        return Task.CompletedTask;
    };
});
builder.Services.AddRazorPages();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.UseAntiforgery();

app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value;
    var isAdminPage = string.Equals(path, "/admin", StringComparison.OrdinalIgnoreCase)
        || string.Equals(path, "/admin.html", StringComparison.OrdinalIgnoreCase);

    if (isAdminPage)
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            context.Response.Redirect("/login?ReturnUrl=%2Fadmin");
            return;
        }

        if (!context.User.IsInRole(RoleNames.Admin))
        {
            context.Response.Redirect("/");
            return;
        }

        context.Request.Path = "/admin.html";
    }

    await next();
});

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/auth/status", (ClaimsPrincipal user) =>
{
    var authenticated = user.Identity?.IsAuthenticated == true;
    return Results.Ok(new
    {
        isAuthenticated = authenticated,
        isAdmin = authenticated && user.IsInRole(RoleNames.Admin),
        userName = authenticated ? user.Identity?.Name : null
    });
}).AllowAnonymous();

app.MapProductEndpoints();
app.MapRazorPages();

await InitializeIdentityAsync(app);
await app.RunAsync();

static async Task InitializeIdentityAsync(WebApplication app)
{
    var adminEmail = app.Configuration["Admin:Email"];
    var adminPassword = app.Configuration["Admin:Password"];
    if (string.IsNullOrWhiteSpace(adminEmail) != string.IsNullOrWhiteSpace(adminPassword))
    {
        throw new InvalidOperationException("Configure both Admin:Email and Admin:Password to provision the administrator account.");
    }

    await using var scope = app.Services.CreateAsyncScope();
    var services = scope.ServiceProvider;
    var database = services.GetRequiredService<ApplicationDbContext>();
    await database.Database.MigrateAsync();

    var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
    foreach (var roleName in new[] { RoleNames.User, RoleNames.Admin })
    {
        if (!await roleManager.RoleExistsAsync(roleName))
        {
            var result = await roleManager.CreateAsync(new IdentityRole(roleName));
            if (!result.Succeeded)
            {
                var errors = string.Join("; ", result.Errors.Select(error => error.Description));
                throw new InvalidOperationException($"Could not create the '{roleName}' role: {errors}");
            }
        }
    }

    if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
    {
        app.Logger.LogWarning("No administrator has been provisioned. Set Admin__Email and Admin__Password before deploying the admin dashboard.");
        return;
    }

    var userManager = services.GetRequiredService<UserManager<IdentityUser>>();
    var admin = await userManager.FindByEmailAsync(adminEmail);
    if (admin is null)
    {
        admin = new IdentityUser { UserName = adminEmail, Email = adminEmail, EmailConfirmed = true };
        var createResult = await userManager.CreateAsync(admin, adminPassword);
        if (!createResult.Succeeded)
        {
            var errors = string.Join("; ", createResult.Errors.Select(error => error.Description));
            throw new InvalidOperationException($"Could not provision the administrator account: {errors}");
        }
    }

    if (!await userManager.IsInRoleAsync(admin, RoleNames.Admin))
    {
        var roleResult = await userManager.AddToRoleAsync(admin, RoleNames.Admin);
        if (!roleResult.Succeeded)
        {
            var errors = string.Join("; ", roleResult.Errors.Select(error => error.Description));
            throw new InvalidOperationException($"Could not assign the administrator role: {errors}");
        }
    }
}

public static class RoleNames
{
    public const string User = "User";
    public const string Admin = "Admin";
}

public static class AuthClaimTypes
{
    public const string FullName = "full_name";
}
