/**
 * Pagination configuration and persistence utilities.
 * Allows persisting user-selected rows per page (30, 50, 100)
 * across application reloads, navigation, and sessions.
 */

export const ALLOWED_PAGE_SIZES = [20, 30, 50, 100] as const;
export type PageSizeOption = typeof ALLOWED_PAGE_SIZES[number];

const STORAGE_PREFIX = 'stockcore_table_rows_per_page_';

export function getStoredPageSize(tableKey: string, defaultSize: PageSizeOption = 20): PageSizeOption {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${tableKey}`);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (ALLOWED_PAGE_SIZES.includes(parsed as PageSizeOption)) {
        return parsed as PageSizeOption;
      }
    }
  } catch {
    // Local storage fallback
  }
  return defaultSize;
}

export function setStoredPageSize(tableKey: string, size: PageSizeOption | number): void {
  try {
    if (ALLOWED_PAGE_SIZES.includes(size as PageSizeOption)) {
      localStorage.setItem(`${STORAGE_PREFIX}${tableKey}`, String(size));
    }
  } catch {
    // Local storage fallback
  }
}
