import { Inject, Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SignalRService {
  private hubConnection: signalR.HubConnection | null = null;
  private activeBranchId: number | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryAttempt = 0;
  private isStoppedManually = false;

  // Dùng Subject để các component khác có thể "lắng nghe" luồng dữ liệu thông báo mới đổ về
  public notificationReceived$ = new Subject<any>();
  public scheduleNotificationReceived$ = new Subject<any>();

  constructor(@Inject('BASE_URL') private baseUrl: string) {}

  // Khởi động kết nối SignalR
  public startConnection(chiNhanhId: number): void {
    if (chiNhanhId === null || chiNhanhId === undefined) {
      return;
    }

    // Nếu đã có kết nối đang chạy/kết nối cho cùng chi nhánh thì không tạo trùng lặp
    if (
      this.hubConnection &&
      this.activeBranchId === chiNhanhId &&
      this.hubConnection.state !== signalR.HubConnectionState.Disconnected
    ) {
      return;
    }

    this.clearRetryTimer();
    this.isStoppedManually = false;
    this.activeBranchId = chiNhanhId;
    this.retryAttempt = 0;

    const previousConnection = this.hubConnection;
    this.hubConnection = null;

    const initNewConnection = () => {
      if (this.isStoppedManually || this.activeBranchId !== chiNhanhId) {
        return;
      }

      const normalizedBase = (this.baseUrl || '/').replace(/\/+$/, '');
      const hubUrl = `${normalizedBase}/hubs/thongbao`;

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect([2000, 5000, 10000, 15000, 30000])
        .configureLogging(signalR.LogLevel.None)
        .build();

      connection.serverTimeoutInMilliseconds = 60000;
      connection.keepAliveIntervalInMilliseconds = 15000;

      // Lắng nghe sự kiện "ReceiveNewNotification" từ Server bắn xuống (ThongBao cơ bản)
      connection.on('ReceiveNewNotification', (data) => {
        this.notificationReceived$.next(data);
      });

      // Lắng nghe sự kiện "ReceiveScheduleNotification" từ Server bắn xuống (ThongBaoLichTrinh)
      connection.on('ReceiveScheduleNotification', (data) => {
        this.scheduleNotificationReceived$.next(data);
      });

      // Tự động gia nhập lại nhóm chi nhánh sau khi kết nối lại thành công
      connection.onreconnected(() => {
        if (this.activeBranchId !== null) {
          this.joinBranch(this.activeBranchId);
        }
      });

      // Nếu hết các lượt automatic reconnect mà vẫn ngắt (do server restart), thử kết nối lại nhẹ nhàng
      connection.onclose(() => {
        if (!this.isStoppedManually && this.hubConnection === connection && this.activeBranchId !== null) {
          this.scheduleRetry(this.activeBranchId);
        }
      });

      this.hubConnection = connection;
      this.connectWithRetry(connection, chiNhanhId);
    };

    if (previousConnection) {
      previousConnection
        .stop()
        .catch(() => {})
        .finally(initNewConnection);
    } else {
      initNewConnection();
    }
  }

  private connectWithRetry(connection: signalR.HubConnection, chiNhanhId: number): void {
    if (this.isStoppedManually || this.hubConnection !== connection) {
      return;
    }

    connection
      .start()
      .then(() => {
        this.retryAttempt = 0;
        if (!this.isStoppedManually && this.hubConnection === connection) {
          this.joinBranch(chiNhanhId);
        }
      })
      .catch(() => {
        if (!this.isStoppedManually && this.hubConnection === connection) {
          this.scheduleRetry(chiNhanhId);
        }
      });
  }

  private scheduleRetry(chiNhanhId: number): void {
    this.clearRetryTimer();
    const delays = [3000, 6000, 12000, 20000, 30000];
    if (this.retryAttempt >= delays.length) {
      return;
    }
    const delay = delays[this.retryAttempt];
    this.retryAttempt += 1;

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.isStoppedManually || this.activeBranchId !== chiNhanhId) {
        return;
      }
      if (
        this.hubConnection &&
        this.hubConnection.state === signalR.HubConnectionState.Disconnected
      ) {
        this.connectWithRetry(this.hubConnection, chiNhanhId);
      }
    }, delay);
  }

  private clearRetryTimer(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  // Xin gia nhập nhóm theo chi nhánh
  private joinBranch(chiNhanhId: number): void {
    if (
      !this.hubConnection ||
      this.hubConnection.state !== signalR.HubConnectionState.Connected
    ) {
      return;
    }
    this.hubConnection
      .invoke('JoinBranchGroup', chiNhanhId.toString())
      .catch(() => {});
  }

  // Ngắt kết nối khi logout
  public stopConnection(): void {
    this.isStoppedManually = true;
    this.activeBranchId = null;
    this.retryAttempt = 0;
    this.clearRetryTimer();

    if (this.hubConnection) {
      const conn = this.hubConnection;
      this.hubConnection = null;
      conn.stop().catch(() => {});
    }
  }
}
