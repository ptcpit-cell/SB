import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { renderAsync } from 'docx-preview';
import { buildFileUrl, normalizeAttachmentPath } from '../file-preview.util';

@Component({
  selector: 'app-docx-preview-page',
  standalone: false,
  templateUrl: './docx-preview-page.component.html',
  styleUrl: './docx-preview-page.component.css',
})
export class DocxPreviewPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('previewContainer', { static: true }) previewContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('styleContainer', { static: true }) styleContainer!: ElementRef<HTMLDivElement>;

  filePath = '';
  fileName = '';
  downloadUrl = '';
  loading = true;
  errorMsg = '';
  zoomPct = 100;

  private querySub?: Subscription;
  private originalTitle = '';

  constructor(
    private route: ActivatedRoute,
    @Inject('BASE_URL') private baseUrl: string
  ) {
    this.originalTitle = document.title;
  }

  ngAfterViewInit(): void {
    this.querySub = this.route.queryParamMap.subscribe((params) => {
      const rawPath = params.get('path') || '';
      const rawName = params.get('name') || '';
      const cleanPath = normalizeAttachmentPath(rawPath);

      this.filePath = cleanPath;
      this.fileName = rawName.trim() || cleanPath.split('/').pop() || 'Tài liệu Word.docx';
      document.title = `${this.fileName} — Xem tài liệu`;

      if (!cleanPath || cleanPath.includes('..') || !cleanPath.startsWith('yeu-cau/')) {
        this.loading = false;
        this.downloadUrl = '';
        this.errorMsg = 'Đường dẫn tệp không hợp lệ.';
        return;
      }

      this.downloadUrl = buildFileUrl(this.baseUrl, cleanPath);
      this.loadAndRender();
    });
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
    if (this.originalTitle) {
      document.title = this.originalTitle;
    }
  }

  async loadAndRender(): Promise<void> {
    if (!this.downloadUrl) return;
    this.loading = true;
    this.errorMsg = '';

    const container = this.previewContainer.nativeElement;
    const styleEl = this.styleContainer.nativeElement;
    container.innerHTML = '';
    styleEl.innerHTML = '';

    try {
      const resp = await fetch(this.downloadUrl, { credentials: 'include' });
      if (!resp.ok) {
        throw new Error(resp.status === 404
          ? 'Không tìm thấy tệp trên máy chủ (404).'
          : `Không thể tải tệp (HTTP ${resp.status}).`);
      }

      const contentType = (resp.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/html')) {
        throw new Error('Máy chủ không trả về dữ liệu tệp Word hợp lệ.');
      }

      const buffer = await resp.arrayBuffer();
      if (!buffer || buffer.byteLength === 0) {
        throw new Error('Tệp Word rỗng.');
      }

      await renderAsync(buffer, container, styleEl, {
        className: 'docx',
        inWrapper: true,
        hideWrapperOnPrint: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
        useBase64URL: true
      });
    } catch (err: any) {
      this.errorMsg = err?.message || 'Không thể hiển thị nội dung tệp Word này. Bạn có thể tải tệp về để xem.';
    } finally {
      this.loading = false;
    }
  }

  zoomOut(): void {
    this.zoomPct = Math.max(60, this.zoomPct - 10);
  }

  zoomIn(): void {
    this.zoomPct = Math.min(160, this.zoomPct + 10);
  }

  resetZoom(): void {
    this.zoomPct = 100;
  }

  printDoc(): void {
    window.print();
  }
}
