import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Barcode as BarcodeIcon, Copy, Check } from 'lucide-react';
import { InventoryItem } from '../types';
import { renderBarcodeSvg } from '../utils/barcode';
import { formatPKR } from '../utils/currency';

interface BarcodeViewModalProps {
  isOpen: boolean;
  item: InventoryItem | null;
  onClose: () => void;
}

export const BarcodeViewModal: React.FC<BarcodeViewModalProps> = ({
  isOpen,
  item,
  onClose,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [copied, setCopied] = React.useState(false);

  const barcodeValue = item ? item.barcode || item.sku : '';

  useEffect(() => {
    if (isOpen && item) {
      document.body.classList.add('print-modal-active');
      return () => {
        document.body.classList.remove('print-modal-active');
      };
    }
  }, [isOpen, item]);

  useEffect(() => {
    if (isOpen && item && svgRef.current) {
      renderBarcodeSvg(svgRef.current, barcodeValue, {
        height: 60,
        width: 2,
        fontSize: 14,
      });
    }
  }, [isOpen, item, barcodeValue]);

  if (!isOpen || !item) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div id="printable-barcode-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto printable-modal-overlay">
      <style>{`
        @media print {
          @page {
            margin: 0 !important;
            size: auto;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          #printable-barcode-modal {
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          #printable-barcode-card {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>
      <div id="printable-barcode-card" className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl border border-slate-200 printable-modal-card print:p-0 print:border-none print:shadow-none print:max-w-none">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2 text-slate-800">
            <BarcodeIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Product Barcode & Label
            </h3>
          </div>
          <button
            id="btn-close-barcode-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Label Area */}
        <div className="my-5 p-5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center text-center print:border-none print:p-0 print:m-0 print:bg-white">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5 flex-wrap">
            <span>{item.category || 'General'}</span>
            {item.brand && (
              <>
                <span>•</span>
                <span className="text-indigo-600 font-extrabold">{item.brand}</span>
              </>
            )}
          </div>
          <div className="text-base font-bold text-slate-900 max-w-xs truncate mb-1">
            {item.name}
          </div>
          <div className="text-xs font-mono text-slate-500 mb-3">
            SKU: <span className="font-semibold text-slate-800">{item.sku}</span>
          </div>

          {/* SVG Barcode */}
          <div className="bg-white p-2 rounded border border-slate-200 shadow-xs mb-3 flex justify-center w-full max-w-[320px]">
            <svg ref={svgRef} className="max-w-full h-auto" />
          </div>

          <div className="flex items-center justify-between w-full max-w-[280px] px-2 pt-1 border-t border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">Retail Price</span>
            <span className="text-sm font-bold font-mono text-slate-900">
              {formatPKR(item.sellingPrice)}
            </span>
          </div>
        </div>

        {/* Barcode details & quick actions */}
        <div className="flex items-center justify-between bg-slate-100/70 p-3 rounded-md mb-5 text-xs print:hidden">
          <div>
            <span className="text-slate-500 block text-[11px]">Barcode String</span>
            <span className="font-mono font-bold text-slate-800 text-sm tracking-wide">
              {barcodeValue}
            </span>
          </div>
          <button
            id="btn-copy-barcode-value"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 print:hidden">
          <button
            id="btn-dismiss-barcode-modal"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            Close
          </button>
          <button
            id="btn-print-barcode-label"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Label</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
