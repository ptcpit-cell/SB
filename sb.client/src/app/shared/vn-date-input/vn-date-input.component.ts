import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface CalendarDayCell {
  iso: string;
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
}

@Component({
  selector: 'app-vn-date-input',
  templateUrl: './vn-date-input.component.html',
  styleUrls: ['./vn-date-input.component.css'],
  standalone: false,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => VnDateInputComponent),
      multi: true
    }
  ]
})
export class VnDateInputComponent implements ControlValueAccessor {
  @Input() min?: string | null;
  @Input() max?: string | null;
  @Input() placeholder = 'dd/MM/yyyy';
  @Input() disabled = false;
  @Input() allowClear = false;
  @Input() inputTitle = '';
  @Input() compact = false;
  @Input() showNavButtons = false;
  @Input() prevTitle = 'Ngày trước';
  @Input() nextTitle = 'Ngày sau';

  @Output() stepDate = new EventEmitter<number>();

  @ViewChild('wrapperEl', { static: true }) wrapperEl!: ElementRef<HTMLElement>;
  @ViewChild('textInput') textInput?: ElementRef<HTMLInputElement>;

  /** Giá trị model nội bộ chuẩn ISO yyyy-MM-dd */
  isoValue = '';
  /** Chuỗi hiển thị cho người dùng chuẩn dd/MM/yyyy */
  displayText = '';
  invalid = false;

  popupOpen = false;
  popupTop = 0;
  popupLeft = 0;

  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth(); // 0..11
  calendarCells: CalendarDayCell[] = [];

  readonly weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  readonly monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private hostRef: ElementRef<HTMLElement>) {}

  // ===== ControlValueAccessor =====
  writeValue(value: string | null | undefined): void {
    const normalized = this.normalizeIso(value);
    this.isoValue = normalized;
    this.displayText = normalized ? this.isoToVn(normalized) : '';
    this.invalid = false;
    if (normalized) {
      const [y, m] = normalized.split('-').map(Number);
      this.viewYear = y;
      this.viewMonth = m - 1;
    }
    if (this.popupOpen) {
      this.buildCalendar();
    }
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) this.popupOpen = false;
  }

  // ===== Nhập tay dd/MM/yyyy =====
  onTextInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const rawValue = inputEl.value;
    const inputType = (event as InputEvent).inputType || '';
    const isDeleting =
      inputType.startsWith('delete') ||
      (rawValue.length < this.displayText.length && !inputType.startsWith('insert'));

    const caretPos = inputEl.selectionStart ?? rawValue.length;
    const digitsBeforeCaret = rawValue.slice(0, caretPos).replace(/\D/g, '').length;
    const caretWasAtEnd = caretPos >= rawValue.length;
    const justTypedSep =
      !isDeleting && caretPos > 0 && /[/\s.-]/.test(rawValue[caretPos - 1]);

    const trimmed = rawValue.trim();
    if (!trimmed) {
      this.displayText = '';
      if (inputEl.value !== '') {
        inputEl.value = '';
      }
      this.invalid = false;
      if (this.allowClear) {
        this.commitIso('');
      }
      return;
    }

    // Hỗ trợ dán trực tiếp định dạng ISO yyyy-MM-dd
    const isoPaste = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const formatted = isoPaste
      ? `${isoPaste[3].padStart(2, '0')}/${isoPaste[2].padStart(2, '0')}/${isoPaste[1]}`
      : this.formatVnDateText(rawValue, isDeleting, justTypedSep);

    this.displayText = formatted;
    if (inputEl.value !== formatted) {
      inputEl.value = formatted;
    }

    const newCaret = this.computeCaretPos(formatted, digitsBeforeCaret, caretWasAtEnd, isDeleting);
    try {
      inputEl.setSelectionRange(newCaret, newCaret);
    } catch {
      // Bỏ qua nếu trình duyệt không hỗ trợ setSelectionRange
    }

    const parsedIso = this.vnToIso(formatted);
    if (parsedIso) {
      if (this.isOutOfRange(parsedIso)) {
        this.invalid = true;
      } else {
        this.invalid = false;
        const [y, m] = parsedIso.split('-').map(Number);
        this.viewYear = y;
        this.viewMonth = m - 1;
        this.commitIso(parsedIso);
        if (this.popupOpen) this.buildCalendar();
      }
    } else {
      const digitCount = formatted.replace(/\D/g, '').length;
      this.invalid = digitCount >= 8;
    }
  }

  onTextBlur(): void {
    this.onTouched();
    if (!this.displayText.trim()) {
      this.invalid = false;
      if (this.allowClear) {
        this.commitIso('');
      } else if (this.isoValue) {
        this.displayText = this.isoToVn(this.isoValue);
      }
      return;
    }

    const parsedIso = this.vnToIso(this.displayText);
    if (parsedIso && !this.isOutOfRange(parsedIso)) {
      this.displayText = this.isoToVn(parsedIso);
      this.invalid = false;
      this.commitIso(parsedIso);
    } else {
      // Khôi phục giá trị hợp lệ gần nhất nếu gõ thiếu hoặc ngày không tồn tại
      this.displayText = this.isoValue ? this.isoToVn(this.isoValue) : '';
      this.invalid = false;
    }
  }

  // ===== Popup lịch chọn ngày =====
  togglePopup(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled) return;
    if (this.popupOpen) {
      this.popupOpen = false;
      return;
    }
    this.openPopup();
  }

  openPopup(): void {
    if (this.disabled) return;
    if (this.isoValue) {
      const [y, m] = this.isoValue.split('-').map(Number);
      this.viewYear = y;
      this.viewMonth = m - 1;
    } else {
      const now = new Date();
      this.viewYear = now.getFullYear();
      this.viewMonth = now.getMonth();
    }
    this.buildCalendar();
    this.computePopupPosition();
    this.popupOpen = true;
  }

  prevMonth(): void {
    if (this.viewMonth === 0) {
      this.viewMonth = 11;
      this.viewYear--;
    } else {
      this.viewMonth--;
    }
    this.buildCalendar();
  }

  nextMonth(): void {
    if (this.viewMonth === 11) {
      this.viewMonth = 0;
      this.viewYear++;
    } else {
      this.viewMonth++;
    }
    this.buildCalendar();
  }

  selectDay(cell: CalendarDayCell): void {
    if (cell.isDisabled) return;
    this.displayText = this.isoToVn(cell.iso);
    this.invalid = false;
    this.commitIso(cell.iso);
    this.popupOpen = false;
  }

  selectToday(): void {
    const todayIso = this.dateToIso(new Date());
    if (this.isOutOfRange(todayIso)) return;
    this.displayText = this.isoToVn(todayIso);
    this.invalid = false;
    this.commitIso(todayIso);
    this.popupOpen = false;
  }

  clearDate(): void {
    this.displayText = '';
    this.invalid = false;
    this.commitIso('');
    this.popupOpen = false;
  }

  isTodayDisabled(): boolean {
    return this.isOutOfRange(this.dateToIso(new Date()));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.popupOpen) return;
    if (!this.hostRef.nativeElement.contains(event.target as Node)) {
      this.popupOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.popupOpen = false;
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChange(): void {
    if (this.popupOpen) {
      this.computePopupPosition();
    }
  }

  // ===== Helpers =====
  private formatVnDateText(rawValue: string, isDeleting: boolean, justTypedSep: boolean): string {
    // Chuẩn hóa mọi dấu phân cách (/, khoảng trắng, -, .) thành '/'
    const normalized = rawValue
      .replace(/[^\d/\s.-]/g, '')
      .replace(/[\s.-]+/g, '/')
      .replace(/\/{2,}/g, '/')
      .replace(/^\/+/, '');

    if (!normalized) return '';

    const rawParts = normalized.split('/');
    const p0 = rawParts[0] || '';
    const hasSep1 = rawParts.length > 1;
    const p1 = hasSep1 ? rawParts[1] : '';
    const hasSep2 = rawParts.length > 2;
    const p2 = hasSep2 ? rawParts.slice(2).join('') : '';

    // Ngày (tối đa 2 chữ số, phần dư tự tràn sang tháng)
    let day = p0.slice(0, 2);
    const dayOverflow = p0.slice(2);
    if (justTypedSep && hasSep1 && day.length === 1 && !dayOverflow && !p1) {
      day = day.padStart(2, '0');
    }

    // Tháng (tối đa 2 chữ số, phần dư tự tràn sang năm)
    const monthSource = dayOverflow + p1;
    let month = monthSource.slice(0, 2);
    const monthOverflow = monthSource.slice(2);
    const hasMonthPart = hasSep1 || dayOverflow.length > 0;
    const hasYearPart = hasSep2 || monthOverflow.length > 0;

    if (justTypedSep && hasSep2 && month.length === 1 && !monthOverflow && !p2) {
      month = month.padStart(2, '0');
    }

    // Năm (tối đa 4 chữ số)
    const year = (monthOverflow + p2).slice(0, 4);

    if (year.length > 0) {
      return `${day}/${month}/${year}`;
    }

    if (hasYearPart) {
      return isDeleting ? `${day}/${month}` : `${day}/${month}/`;
    }

    if (month.length > 0) {
      if (!isDeleting && month.length === 2 && day.length === 2) {
        return `${day}/${month}/`;
      }
      return `${day}/${month}`;
    }

    if (hasMonthPart) {
      return isDeleting ? day : `${day}/`;
    }

    if (!isDeleting && day.length === 2) {
      return `${day}/`;
    }

    return day;
  }

  private computeCaretPos(
    formatted: string,
    digitsBeforeCaret: number,
    caretWasAtEnd: boolean,
    isDeleting: boolean
  ): number {
    if (caretWasAtEnd) {
      return formatted.length;
    }
    if (digitsBeforeCaret === 0) {
      return 0;
    }
    let seenDigits = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        seenDigits++;
        if (seenDigits === digitsBeforeCaret) {
          if (!isDeleting && (seenDigits === 2 || seenDigits === 4) && formatted[i + 1] === '/') {
            return i + 2;
          }
          return i + 1;
        }
      }
    }
    return formatted.length;
  }

  private commitIso(newIso: string): void {
    if (this.isoValue !== newIso) {
      this.isoValue = newIso;
      this.onChange(newIso);
    }
  }

  private computePopupPosition(): void {
    const rect = this.wrapperEl.nativeElement.getBoundingClientRect();
    const popupWidth = 264;
    const popupHeight = 296;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = rect.bottom + 4;
    if (top + popupHeight > vh - 8 && rect.top - popupHeight - 4 >= 8) {
      top = rect.top - popupHeight - 4;
    }

    let left = rect.left;
    if (left + popupWidth > vw - 8) {
      left = Math.max(8, rect.right - popupWidth);
    }

    this.popupTop = top;
    this.popupLeft = left;
  }

  private buildCalendar(): void {
    const firstOfMonth = new Date(this.viewYear, this.viewMonth, 1);
    // Thứ 2 = 0 ... Chủ nhật = 6
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const startDate = new Date(this.viewYear, this.viewMonth, 1 - startOffset);
    const todayIso = this.dateToIso(new Date());

    const cells: CalendarDayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const dt = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const iso = this.dateToIso(dt);
      cells.push({
        iso,
        day: dt.getDate(),
        inCurrentMonth: dt.getMonth() === this.viewMonth,
        isToday: iso === todayIso,
        isSelected: iso === this.isoValue,
        isDisabled: this.isOutOfRange(iso)
      });
    }
    this.calendarCells = cells;
  }

  private normalizeIso(val: string | null | undefined): string {
    if (!val) return '';
    const trimmed = String(val).trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const candidate = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      return this.isValidDateParts(+isoMatch[1], +isoMatch[2], +isoMatch[3]) ? candidate : '';
    }
    return this.vnToIso(trimmed) || '';
  }

  private isoToVn(iso: string): string {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    return `${m[3]}/${m[2]}/${m[1]}`;
  }

  private vnToIso(text: string): string | null {
    const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    if (!this.isValidDateParts(year, month, day)) return null;
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private isValidDateParts(year: number, month: number, day: number): boolean {
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
    const dt = new Date(year, month - 1, day);
    return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
  }

  private dateToIso(dt: Date): string {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  private isOutOfRange(iso: string): boolean {
    const minIso = this.min ? this.normalizeIso(this.min) : '';
    const maxIso = this.max ? this.normalizeIso(this.max) : '';
    if (minIso && iso < minIso) return true;
    if (maxIso && iso > maxIso) return true;
    return false;
  }
}
