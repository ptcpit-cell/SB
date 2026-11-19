import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { LoadingService } from '../services/loading.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'sb.client';
  showSidebar = true;
  showNavbar = true;
  loading$: Observable<boolean>;

  constructor(private http: HttpClient, private router: Router, private loadingService: LoadingService, public authService: AuthService) {
    // hide sidebar on login route
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      const url: string = e.urlAfterRedirects || e.url || '';
      this.showSidebar = !url.includes('/auth/login');
    });

    // Router navigation loading
    this.router.events.subscribe(e => {
      if (e instanceof NavigationStart) {
        this.loadingService.show();
      }
      if (e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError) {
        this.loadingService.hide();
      }
    });

    this.loading$ = this.loadingService.loading$;
  }
}