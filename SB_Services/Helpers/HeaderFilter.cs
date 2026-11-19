using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace SB_Services.Helpers
{
    public class HeaderFilter : ActionFilterAttribute
    {
        public const string ItemKey = "ChiNhanhId";

        public override void OnActionExecuting(ActionExecutingContext context)
        {

            // Bỏ qua action [AllowAnonymous] (login, refresh token...)
            if (context.ActionDescriptor.EndpointMetadata.OfType<IAllowAnonymous>().Any())
                return;

            // Nguồn tin cậy: claim trong JWT
            var claimValue = context.HttpContext.User.FindFirst("ChiNhanhId")?.Value;
            if (!int.TryParse(claimValue, out var claimId))
            {
                context.Result = new ForbidResult();
                return;
            }

            // Header (nếu có) chỉ để đối chiếu, không được khác claim
            if (context.HttpContext.Request.Headers.TryGetValue("X-ChiNhanh-Id", out var header)
                && !string.IsNullOrEmpty(header))
            {
                if (!int.TryParse(header, out var headerId))
                {
                    context.Result = new BadRequestObjectResult("Mã chi nhánh không hợp lệ.");
                    return;
                }
                if (headerId != claimId)
                {
                    context.Result = new ForbidResult();
                    return;
                }
            }

            context.HttpContext.Items[ItemKey] = claimId;
        }
    }
}
