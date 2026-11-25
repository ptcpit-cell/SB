export interface AttachmentLike {
  tenFile?: string | null;
  duongDan: string;
  contentType?: string | null;
}

export function normalizeAttachmentPath(duongDan: string): string {
  return (duongDan || '').trim().replace(/^\/+/, '').replace(/^Files\//i, '');
}

export function buildFileUrl(baseUrl: string, duongDan: string): string {
  const base = (baseUrl || '/').endsWith('/') ? (baseUrl || '/') : `${baseUrl}/`;
  const clean = normalizeAttachmentPath(duongDan);
  return `${base}Files/${clean}`;
}

export function isDocxFile(
  tenFile?: string | null,
  duongDan?: string | null,
  contentType?: string | null
): boolean {
  const name = (tenFile || '').toLowerCase().trim();
  const path = (duongDan || '').toLowerCase().trim();
  const mime = (contentType || '').toLowerCase().trim();
  return (
    name.endsWith('.docx') ||
    path.endsWith('.docx') ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
}

export function buildOpenFileUrl(baseUrl: string, file: AttachmentLike): string {
  const base = (baseUrl || '/').endsWith('/') ? (baseUrl || '/') : `${baseUrl}/`;
  const clean = normalizeAttachmentPath(file.duongDan);
  if (isDocxFile(file.tenFile, file.duongDan, file.contentType)) {
    const params = new URLSearchParams();
    params.set('path', clean);
    if (file.tenFile) {
      params.set('name', file.tenFile);
    }
    return `${base}#/xem-tai-lieu?${params.toString()}`;
  }
  return buildFileUrl(base, clean);
}

export function getFileIconClass(tenFile?: string | null): string {
  const lower = (tenFile || '').toLowerCase().trim();
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'fa-regular fa-file-word text-primary';
  if (lower.endsWith('.pdf')) return 'fa-regular fa-file-pdf text-danger';
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return 'fa-regular fa-file-excel text-success';
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return 'fa-regular fa-file-powerpoint text-warning';
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'fa-regular fa-file-image text-info';
  if (lower.endsWith('.zip')) return 'fa-regular fa-file-zipper text-secondary';
  return 'fa-regular fa-file-lines text-primary';
}
