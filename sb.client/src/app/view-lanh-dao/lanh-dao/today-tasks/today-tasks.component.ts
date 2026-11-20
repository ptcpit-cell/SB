import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LichTrinhView } from '../../../../type';

@Component({
  selector: 'app-lanh-dao-today-tasks',
  standalone: false,
  templateUrl: './today-tasks.component.html',
  styleUrl: './today-tasks.component.css',
})
export class TodayTasksComponent {
  @Input() ngay = '';
  @Input() lichTrinhs: LichTrinhView[] = [];
  @Input() loading = false;

  @Output() openFeedback = new EventEmitter<LichTrinhView>();

  filterStatus: 'all' | 'pending' | 'done' = 'all';

  get filteredList(): LichTrinhView[] {
    if (this.filterStatus === 'pending') {
      return this.lichTrinhs.filter(x => x.trangThaiLich === 1);
    }
    if (this.filterStatus === 'done') {
      return this.lichTrinhs.filter(x => x.trangThaiLich === 2);
    }
    return this.lichTrinhs;
  }

  lichStateBadge(st: number): { label: string; css: string } {
    switch (st) {
      case 1: return { label: 'Chờ trình', css: 'bg-primary-subtle text-primary-emphasis border-primary-subtle' };
      case 2: return { label: 'Đã trình', css: 'bg-success-subtle text-success-emphasis border-success-subtle' };
      case 4: return { label: 'Tạm hoãn', css: 'bg-warning-subtle text-warning-emphasis border-warning-subtle' };
      case 5: return { label: 'Vắng', css: 'bg-danger-subtle text-danger-emphasis border-danger-subtle' };
      default: return { label: 'Đã xếp', css: 'bg-light text-dark' };
    }
  }
}
