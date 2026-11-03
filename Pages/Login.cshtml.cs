using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace BaitaplonWeb.Pages;

public sealed class LoginModel(
    SignInManager<IdentityUser> signInManager,
    UserManager<IdentityUser> userManager) : PageModel
{
    [BindProperty]
    public LoginInput Input { get; set; } = new();

    [BindProperty(SupportsGet = true)]
    public string? ReturnUrl { get; set; }

    public async Task<IActionResult> OnGetAsync()
    {
        if (User.Identity?.IsAuthenticated == true)
        {
            return await RedirectForCurrentUserAsync();
        }

        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        var user = await userManager.FindByEmailAsync(Input.Email.Trim());
        var result = user is null
            ? Microsoft.AspNetCore.Identity.SignInResult.Failed
            : await signInManager.PasswordSignInAsync(
                user,
                Input.Password,
                Input.RememberMe,
                lockoutOnFailure: true);

        if (result.Succeeded)
        {
            return await RedirectForUserAsync(user!, ReturnUrl);
        }

        ModelState.AddModelError(string.Empty, result.IsLockedOut
            ? "Tài khoản đang tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau 15 phút."
            : "Email hoặc mật khẩu không chính xác.");
        return Page();
    }

    private async Task<IActionResult> RedirectForCurrentUserAsync()
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
        {
            await signInManager.SignOutAsync();
            return Page();
        }

        return await RedirectForUserAsync(user, ReturnUrl);
    }

    private async Task<IActionResult> RedirectForUserAsync(IdentityUser user, string? returnUrl)
    {
        if (await userManager.IsInRoleAsync(user, RoleNames.Admin))
        {
            return Url.IsLocalUrl(returnUrl) ? LocalRedirect(returnUrl!) : Redirect("/admin");
        }

        if (Url.IsLocalUrl(returnUrl)
            && !string.Equals(returnUrl, "/admin", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(returnUrl, "/admin.html", StringComparison.OrdinalIgnoreCase))
        {
            return LocalRedirect(returnUrl!);
        }

        return Redirect("/");
    }

    public sealed class LoginInput
    {
        [Required(ErrorMessage = "Vui lòng nhập email.")]
        [EmailAddress(ErrorMessage = "Email chưa đúng định dạng.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng nhập mật khẩu.")]
        [DataType(DataType.Password)]
        public string Password { get; set; } = string.Empty;

        public bool RememberMe { get; set; }
    }
}
