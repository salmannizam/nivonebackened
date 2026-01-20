export type SearchGroupType = 'residents' | 'rooms' | 'payments';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: Record<string, string | number | boolean>;
  path: string;
  query?: Record<string, string>;
}

export interface SearchGroup {
  type: SearchGroupType;
  label: string;
  path: string;
  count: number;
  items: SearchResultItem[];
}

export interface SearchResponseDto {
  query: string;
  totalResults: number;
  groups: SearchGroup[];
}
