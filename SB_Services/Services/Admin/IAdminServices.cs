using SB_Services.DTO;

namespace SB_Services.Services.Admin
{
    public interface IAdminServices
    {
        Task<AdminDashboardDto> GetDashboardAsync();
        Task<AdminLanhDaoListResponseDto> GetLanhDaosAsync();
        Task<int> SaveLanhDaoAsync(int currentUserId, int defaultChiNhanhId, SaveLanhDaoRequest req);
        Task<bool> DeleteLanhDaoAsync(int id);

        Task<List<AdminLoaiYeuCauRowDto>> GetLoaiYeuCausAsync();
        Task<int> SaveLoaiYeuCauAsync(int currentUserId, int defaultChiNhanhId, SaveLoaiYeuCauRequest req);
        Task<bool> DeleteLoaiYeuCauAsync(int currentUserId, int id);

        Task<List<AdminMucUuTienRowDto>> GetMucUuTiensAsync();
        Task<int> SaveMucUuTienAsync(int defaultChiNhanhId, SaveMucUuTienRequest req);
        Task<bool> DeleteMucUuTienAsync(int id);
    }
}
