using Microsoft.AspNetCore.SignalR;

namespace SB_Services.Helpers
{
    public class ThongBao : Hub
    {
        // Khi một User kết nối vào Hub, tự động xếp họ vào nhóm của Chi Nhánh tương ứng
        public async Task JoinBranchGroup(string chiNhanhId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, chiNhanhId);
        }

        // Khi User ngắt kết nối (Rời trang, tắt trình duyệt)
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            // SignalR tự động xóa ConnectionId ra khỏi các Group
            await base.OnDisconnectedAsync(exception);
        }
    }
}
