using SB_Services.DTO;

namespace SB_Services.Services.Account
{
    public interface IAccountServices
    {
        Task<AuthResponse?> LoginAsync(LoginRequest request);
        Task<AuthResponse?> RefreshTokenAsync(string refreshToken);
        Task<bool> ChangePasswordAsync(int userId, ChangePasswordRequest request);
        Task RevokeRefreshTokenAsync(string refreshToken);
    }
}
