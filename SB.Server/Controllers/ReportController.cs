using Microsoft.AspNetCore.Mvc;
using SB_Services.DTO;
using SB_Services.Services.Report;

namespace SB.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportController(IReportServices reportServices) : BaseController
    {
        private readonly IReportServices _reportServices = reportServices;

        [HttpGet("[action]")]
        public async Task<IActionResult> GetBaoCaoYeuCau([FromQuery] BaoCaoYeuCauQuery query)
        {
            try
            {
                bool isAdmin = HasPermission("View admin");
                var result = await _reportServices.GetBaoCaoYeuCauAsync(
                    CurrentUserId,
                    CurrentChiNhanhId,
                    isAdmin,
                    query);

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
