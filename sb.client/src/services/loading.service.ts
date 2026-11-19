import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$: Observable<boolean> = this.loadingSubject.asObservable();
  private requests = 0;

  show(): void {
    Promise.resolve().then(() => this.loadingSubject.next(true));
  }

  hide(): void {
    Promise.resolve().then(() => this.loadingSubject.next(false));
  }

  reset(): void {
    this.requests = 0;
    this.loadingSubject.next(false);
  }
}
