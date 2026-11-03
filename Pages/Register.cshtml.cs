using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace BaitaplonWeb.Pages;

public sealed class RegisterModel(
    UserManager<IdentityUser> userManager,
    SignInManager<IdentityUser> signInManager,
    ILogger<RegisterModel> logger) : PageModel
{
    [BindProperty]
    public RegisterInput Input { get; set; } = new();

    [BindProperty(SupportsGet = true)]
    public string? ReturnUrl { get; set; }

    public IActionResult OnGet()
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            return Page();
        }

        return Url.IsLocalUrl(ReturnUrl) ? LocalRedirect(ReturnUrl!) : Redirect("/");
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        var user = new IdentityUser
        {
            UserName = Input.Email.Trim(),
            Email = Input.Email.Trim(),
            EmailConfirmed = true
        };
        var createResult = await userManager.CreateAsync(user, Input.Password);
        if (!createResult.Succeeded)
        {
            AddIdentityErrors(createResult);
            return Page();
        }

        var roleResult = await userManager.AddToRoleAsync(user, RoleNames.User);
        if (!roleResult.Succeeded)
        {
            var cleanupResult = await userManager.DeleteAsync(user);
            logger.LogError(
                "Could not assign the User role to a new account. Account cleanup succeeded: {CleanupSucceeded}.",
                cleanupResult.Succeeded);
            AddIdentityErrors(roleResult);
            return Page();
        }

        var claimResult = await userManager.AddClaimAsync(user, new Claim(AuthClaimTypes.FullName, Input.FullName.Trim()));
        if (!claimResult.Succeeded)
        {
            var cleanupResult = await userManager.DeleteAsync(user);
            logger.LogError(
                "Could not save the new account's display name. Account cleanup succeeded: {CleanupSucceeded}.",
                cleanupResult.Succeeded);
            AddIdentityErrors(claimResult);
            return Page();
        }

        await signInManager.SignInAsync(user, isPersistent: false);
        return Url.IsLocalUrl(ReturnUrl) ? LocalRedirect(ReturnUrl!) : Redirect("/");
    }

    private void AddIdentityErrors(IdentityResult result)
    {
        foreach (var error in result.Errors)
        {
            ModelState.AddModelError(string.Empty, error.Description);
        }
    }

    public sealed class RegisterInput
    {
        [Required(ErrorMessage = "Vui lòng nhập họ và tên.")]
        [StringLength(80, MinimumLength = 2, ErrorMessage = "Họ tên cần từ 2 đến 80 ký tự.")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng nhập email.")]
        [EmailAddress(ErrorMessage = "Email chưa đúng định dạng.")]
        [StringLength(256, ErrorMessage = "Email quá dài.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng tạo mật khẩu.")]
        [StringLength(100, MinimumLength = 8, ErrorMessage = "Mật khẩu cần ít nhất 8 ký tự.")]
        [DataType(DataType.Password)]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng xác nhận mật khẩu.")]
        [DataType(DataType.Password)]
        [Compare(nameof(Password), ErrorMessage = "Mật khẩu xác nhận chưa khớp.")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
