using SB_Services.DTO;

namespace SB_Services.Services.Report
{
    public interface IReportServices
    {
        Task<BaoCaoYeuCauResponseDto> GetBaoCaoYeuCauAsync(
            int currentUserId,
            int currentChiNhanhId,
            bool isAdmin,
            BaoCaoYeuCauQuery query);
    }
}
