export interface BreadcrumbItem {
  id: string;
  label: string;
  type?: string;
  siblings?: Array<{ id: string; label: string; type?: string }>;
}
