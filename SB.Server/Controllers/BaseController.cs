using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SB_Services.Helpers;
using System.Security.Claims;

namespace SB.Server.Controllers
{
    [Authorize]
    public abstract class BaseController : ControllerBase
    {
        protected int CurrentChiNhanhId => HttpContext.Items[HeaderFilter.ItemKey]
            is int id ? id : throw new InvalidOperationException("Không xác định được Chi nhánh.");
        // Tên claim phụ thuộc cách bạn tạo token: NameIdentifier, "sub" hoặc "UserId"
        protected int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? throw new UnauthorizedAccessException());
    }
}
