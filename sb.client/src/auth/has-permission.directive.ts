import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from './auth.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: false 
})
export class HasPermissionDirective {
  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  @Input() set appHasPermission(permissionName: string) {
    if (this.authService.hasPermission(permissionName)) {
      // Nếu có quyền -> Hiển thị phần tử
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      // Không có quyền -> Xóa phần tử khỏi DOM
      this.viewContainer.clear();
    }
  }
}