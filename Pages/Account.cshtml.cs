using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Security.Claims;

namespace BaitaplonWeb.Pages;

[Authorize]
public sealed class AccountModel(
    UserManager<IdentityUser> userManager,
    SignInManager<IdentityUser> signInManager) : PageModel
{
    public string DisplayName { get; private set; } = "Khách hàng";
    public string Email { get; private set; } = string.Empty;

    public async Task<IActionResult> OnGetAsync()
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
        {
            return Challenge();
        }

        Email = user.Email ?? string.Empty;
        var claims = await userManager.GetClaimsAsync(user);
        DisplayName = claims.FirstOrDefault(claim => claim.Type == AuthClaimTypes.FullName)?.Value
            ?? user.Email?.Split('@')[0]
            ?? "Khách hàng";
        return Page();
    }

    public async Task<IActionResult> OnPostLogoutAsync()
    {
        await signInManager.SignOutAsync();
        return Redirect("/");
    }
}
