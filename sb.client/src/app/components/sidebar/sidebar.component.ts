import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { MainTab, SubTab } from '../../../type';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  collapsed = false;
  activeMainTab = 'home';
  expandedTab: string | null = null;

  mainTabs: MainTab[] = [
    { id: 'home', label: 'Trang chủ', icon: 'fa-solid fa-house', route: '/home', appHasPermission: 'View admin' },
    { id: 'home', label: 'Trang chủ', icon: 'fa-solid fa-house', route: '/nhan-vien', appHasPermission: 'View nhân viên' },
    { id: 'home', label: 'Trang chủ', icon: 'fa-solid fa-house', route: '/tro-ly', appHasPermission: 'View trợ lý' },
    { id: 'home', label: 'Trang chủ', icon: 'fa-solid fa-house', route: '/lanh-dao', appHasPermission: 'View lãnh đạo' },
    { id: 'user', label: 'User', icon: 'fa-solid fa-users', route: '/user', appHasPermission: 'Xem user' },
    { id: 'role', label: 'Role', icon: 'fa-solid fa-user-shield', route: '/role', appHasPermission: 'Xem role' },
    { id: 'danh-muc', label: 'Danh mục', icon: 'fa-solid fa-folder-open', route: null },
  ];

  subTabs: SubTab[] = [
    { id: 'phong-ban', label: 'Phòng ban', icon: 'fa-solid fa-building', route: '/phong-ban', parentId: 'danh-muc', appHasPermission: 'Xem phòng ban' },
    { id: 'chuc-vu', label: 'Chức vụ', icon: 'fa-solid fa-user-tag', route: '/chuc-vu', parentId: 'danh-muc', appHasPermission: 'Xem chức vụ' },
  ];

  constructor(private router: Router, public authService: AuthService) {}

  ngOnInit(): void {
    this.syncActiveStateFromRoute(this.router.url);

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.syncActiveStateFromRoute(event.urlAfterRedirects);
      }
    });
  }

  private normalizeRoute(route: string): string {
    if (!route) {
      return '/';
    }

    const withoutHash = route.includes('#') ? route.split('#')[1] || '/' : route;
    const withoutQuery = withoutHash.split('?')[0];
    return withoutQuery || '/';
  }

  private isRouteMatch(currentRoute: string, targetRoute: string): boolean {
    if (!targetRoute) {
      return false;
    }

    return currentRoute === targetRoute || currentRoute.startsWith(`${targetRoute}/`);
  }

  private syncActiveStateFromRoute(route: string): void {
    const normalizedRoute = this.normalizeRoute(route);

    const matchedSubTab = this.subTabs.find(subTab => this.isRouteMatch(normalizedRoute, subTab.route));
    if (matchedSubTab) {
      this.activeMainTab = matchedSubTab.parentId;
      this.expandedTab = matchedSubTab.parentId;
      return;
    }

    const matchedMainTab = this.mainTabs.find(tab => tab.route && this.isRouteMatch(normalizedRoute, tab.route));
    if (matchedMainTab) {
      this.activeMainTab = matchedMainTab.id;
      this.expandedTab = null;
      return;
    }

    const matchedParentTab = this.mainTabs.find(tab => !tab.route && this.subTabsOf(tab.id).some(subTab => this.isRouteMatch(normalizedRoute, subTab.route)));
    if (matchedParentTab) {
      this.activeMainTab = matchedParentTab.id;
      this.expandedTab = matchedParentTab.id;
      return;
    }

    this.activeMainTab = 'home';
    this.expandedTab = null;
  }

  isActiveSubTab(route: string): boolean {
    return this.normalizeRoute(this.router.url) === this.normalizeRoute(route);
  }

  // Lấy các subtab thuộc 1 main tab cụ thể, đã lọc theo quyền
  subTabsOf(parentId: string): SubTab[] {
    return this.subTabs.filter(
      s => s.parentId === parentId && (!s.appHasPermission || this.authService.hasPermission(s.appHasPermission))
    );
  }
  getDisplayName(): string {
    const user = this.authService.currentUserValue;
    return user ? user.tenNguoiDung : '';
  }
  // Main tab nào là "nhóm" (không có route riêng) và có ít nhất 1 subtab hợp lệ thì mới hiện
  get visibleMainTabs() {
    return this.mainTabs.filter(t => {
      if (t.route) {
        return !t.appHasPermission || this.authService.hasPermission(t.appHasPermission);
      }
      return this.subTabsOf(t.id).length > 0; // tab nhóm -> chỉ hiện nếu có subtab được phép xem
    });
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
  }
  selectMain(tab: MainTab) {
    // Tab nhóm nhưng không có subtab nào được phép -> không làm gì
    if (!tab.route && this.subTabsOf(tab.id).length === 0) {
      return;
    }

    this.activeMainTab = tab.id;

    if (tab.route) {
      this.expandedTab = null;
      this.router.navigate([tab.route]);
    } else {
      this.expandedTab = this.expandedTab === tab.id ? null : tab.id;
    }
  }
  go(route: string) {
    const parentId = this.subTabs.find(subTab => this.isRouteMatch(this.normalizeRoute(route), subTab.route))?.parentId;
    if (parentId) {
      this.activeMainTab = parentId;
      this.expandedTab = parentId;
    } else {
      this.expandedTab = this.activeMainTab; // tab cha hiện tại vẫn giữ mở
    }
    this.router.navigate([route]);
  }

  logout() {
    this.authService.logout();
  }
}