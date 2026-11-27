using SB_Services.DTO;
using SB_Services.EF;

namespace SB_Services.Services.Common
{
    public interface ICommonServices
    {
        Task<IEnumerable<ChiNhanh>> GetChiNhanhsAsync();
        Task<bool> CreateChiNhanhAsync(ChiNhanh chiNhanh);
        Task<bool> UpdateChiNhanhAsync(ChiNhanh chiNhanh);
        Task<bool> DeleteChiNhanhAsync(int chiNhanhId);
        Task<IEnumerable<ThongBaoDTO>> GetDanhSachThongBaoAsync(int chiNhanhId, int userId);
        Task<bool> MarkReadAsync(int userId, List<int> listThongBaoIds);
        Task<IEnumerable<ThongBaoLichTrinhDto>> GetThongBaoLichTrinhAsync(int userId);
        Task<bool> MarkThongBaoLichTrinhReadAsync(int userId, int id);
        Task<bool> MarkAllThongBaoLichTrinhReadAsync(int userId);
        Task<IEnumerable<PhongBan>> GetPhongBansAsync();
        Task<bool> CreatePhongBanAsync(PhongBan phongBan);
        Task<bool> UpdatePhongBanAsync(PhongBan phongBan);
        Task<bool> DeletePhongBanAsync(int phongBanId);
        Task<IEnumerable<ChucVu>> GetChucVusAsync();
    }
}
