using SB_DAL.DapperContext;
using SB_Services.DTO;

namespace SB_Services.Services.Report
{
    public class ReportServices(IDapperContext dapperContext) : IReportServices
    {
        private readonly IDapperContext _dapper = dapperContext;

        public async Task<BaoCaoYeuCauResponseDto> GetBaoCaoYeuCauAsync(
            int currentUserId,
            int currentChiNhanhId,
            bool isAdmin,
            BaoCaoYeuCauQuery query)
        {
            var today = DateTime.Today;
            var tuNgay = (query.TuNgay ?? new DateTime(today.Year, today.Month, 1)).Date;
            var denNgay = (query.DenNgay ?? today).Date;

            if (denNgay < tuNgay)
                throw new ArgumentException("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.");

            // Người dùng không có quyền Admin chỉ được xuất dữ liệu trong chi nhánh của mình hoặc theo phạm vi chi nhánh được chọn
            int effectiveChiNhanhId = query.ChiNhanhId;
            if (!isAdmin && effectiveChiNhanhId <= 0)
            {
                effectiveChiNhanhId = currentChiNhanhId;
            }

            var rows = (await _dapper.GetStoreAsync<BaoCaoYeuCauRowDto>(
                "dbo.usp_Report_BaoCaoYeuCau",
                new
                {
                    TuNgay = tuNgay,
                    DenNgay = denNgay,
                    ChiNhanhId = effectiveChiNhanhId,
                    query.NhomTrangThai
                })).ToList();

            string tenChiNhanh = "Tất cả chi nhánh";
            if (effectiveChiNhanhId > 0)
            {
                const string sqlCn = "SELECT TOP 1 TenChiNhanh FROM dbo.ChiNhanh WHERE ChiNhanhId = @ChiNhanhId";
                tenChiNhanh = await _dapper.ExecuteScalarAsync<string>(sqlCn, new { ChiNhanhId = effectiveChiNhanhId })
                    ?? $"Chi nhánh #{effectiveChiNhanhId}";
            }

            return new BaoCaoYeuCauResponseDto
            {
                TuNgay = tuNgay.ToString("yyyy-MM-dd"),
                DenNgay = denNgay.ToString("yyyy-MM-dd"),
                ChiNhanhId = effectiveChiNhanhId,
                TenChiNhanh = tenChiNhanh,
                TongSo = rows.Count,
                Rows = rows
            };
        }
    }
}
