import JsBarcode from 'jsbarcode';

/**
 * Generate a clean 12-digit numeric barcode or formatted code for a stock item.
 */
export function generateRandomBarcode(prefix = '2026'): string {
  const randomPart = Math.floor(10000000 + Math.random() * 90000000);
  return `${prefix}${randomPart}`;
}

export interface BarcodeRenderOptions {
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  textMargin?: number;
  lineColor?: string;
  background?: string;
  margin?: number;
}

/**
 * Render barcode onto an SVG element safely.
 */
export function renderBarcodeSvg(
  svgElement: SVGSVGElement | null,
  value: string,
  options: BarcodeRenderOptions = {}
): boolean {
  if (!svgElement || !value || !value.trim()) return false;
  try {
    JsBarcode(svgElement, value.trim(), {
      format: 'CODE128',
      width: options.width ?? 1.8,
      height: options.height ?? 48,
      displayValue: options.displayValue ?? true,
      fontSize: options.fontSize ?? 12,
      font: 'monospace',
      textAlign: 'center',
      textPosition: 'bottom',
      textMargin: options.textMargin ?? 2,
      lineColor: options.lineColor ?? '#0f172a',
      background: options.background ?? '#ffffff',
      margin: options.margin ?? 4,
    });
    return true;
  } catch (err) {
    console.warn('Failed to render barcode for value:', value, err);
    return false;
  }
}
