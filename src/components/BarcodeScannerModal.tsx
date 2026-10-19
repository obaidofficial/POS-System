import React, { useState } from 'react';
import { X, ScanLine, Search, PackageCheck } from 'lucide-react';
import { BarcodeScannerWidget } from './BarcodeScannerWidget';
import { InventoryItem } from '../types';
import { soundController } from '../utils/audio';
import { formatPKR } from '../utils/currency';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  items?: InventoryItem[];
  onClose: () => void;
  onItemScanned?: (item: InventoryItem) => void;
  onRawCodeScanned?: (code: string) => void;
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  items = [],
  onClose,
  onItemScanned,
  onRawCodeScanned,
  title = 'Barcode Scanner Terminal',
  subtitle = 'Scan with USB/Bluetooth barcode gun or enter code to identify stock.',
}) => {
  const [lastCode, setLastCode] = useState('');
  const [lastStatus, setLastStatus] = useState<{
    success: boolean;
    message: string;
    itemName?: string;
    itemPrice?: number;
  } | null>(null);
  const [matchedItem, setMatchedItem] = useState<InventoryItem | null>(null);

  if (!isOpen) return null;

  const handleBarcodeScan = (code: string) => {
    setLastCode(code);
    const cleanCode = code.trim().toLowerCase();

    // If caller wants raw code capture (e.g. entering a new barcode for a product)
    if (onRawCodeScanned) {
      soundController.playSuccessBeep();
      setLastStatus({
        success: true,
        message: `Barcode Captured: ${code}`,
      });
      onRawCodeScanned(code);
      return;
    }

    // Match by barcode, SKU, or ID
    const found = items.find(
      (it) =>
        (it.barcode && it.barcode.trim().toLowerCase() === cleanCode) ||
        it.sku.trim().toLowerCase() === cleanCode ||
        it.id.trim().toLowerCase() === cleanCode
    );

    if (found) {
      soundController.playSuccessBeep();
      setMatchedItem(found);
      setLastStatus({
        success: true,
        message: `Product Identified: ${found.name}`,
        itemName: `${found.sku} • Stock: ${found.currentStock} ${found.unit}`,
        itemPrice: found.sellingPrice,
      });

      if (onItemScanned) {
        onItemScanned(found);
      }
    } else {
      soundController.playErrorBeep();
      setMatchedItem(null);
      setLastStatus({
        success: false,
        message: `No stock record found for barcode "${code}".`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            id="btn-close-scanner-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Widget */}
        <div className="my-4">
          <BarcodeScannerWidget
            onScan={handleBarcodeScan}
            lastScannedCode={lastCode}
            lastScannedStatus={lastStatus}
          />
        </div>

        {/* Matched Item Summary Card if found */}
        {matchedItem && (
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-md text-xs mb-4">
            <div className="flex items-center justify-between font-bold text-indigo-950 mb-1">
              <span className="flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-indigo-600" />
                <span>{matchedItem.name}</span>
              </span>
              <span className="font-mono">{formatPKR(matchedItem.sellingPrice)}</span>
            </div>
            <div className="flex items-center justify-between text-indigo-700 text-[11px]">
              <span>SKU: {matchedItem.sku}</span>
              <span>Available Stock: {matchedItem.currentStock} {matchedItem.unit}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            id="btn-dismiss-scanner-modal"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-semibold"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
};
