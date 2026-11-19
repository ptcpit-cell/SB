using SB_Services.EF;

namespace SB_Services.Services.Common
{
    public interface ICommonServices
    {
        Task<IEnumerable<ChiNhanh>> GetChiNhanhsAsync();
        Task<IEnumerable<ThongBaoDTO>> GetDanhSachThongBaoAsync(int chiNhanhId, int userId);
        Task<bool> MarkReadAsync(int userId, List<int> listThongBaoIds);
        Task<IEnumerable<PhongBan>> GetPhongBansAsync();
        Task<bool> CreatePhongBanAsync(PhongBan phongBan);
        Task<bool> UpdatePhongBanAsync(PhongBan phongBan);
        Task<bool> DeletePhongBanAsync(int phongBanId);
        Task<IEnumerable<ChucVu>> GetChucVusAsync();
    }
}
