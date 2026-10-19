import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, RotateCcw, ArrowLeftRight, CheckCircle2, Sliders, Banknote } from 'lucide-react';
import { Sale, SaleReturn, SaleExchange, StoreSettings, InvoicePaperSize } from '../types';
import { formatPKR } from '../utils/currency';
import { storage } from '../services/storage';
import { renderBarcodeSvg } from '../utils/barcode';
import { authService } from '../services/auth';

interface ReturnReceiptModalProps {
  sale: Sale;
  record: SaleReturn | SaleExchange;
  type: 'RETURN' | 'EXCHANGE';
  onClose: () => void;
}

/**
 * Scannable barcode renderer for Return / Exchange voucher slips
 */
const VoucherBarcode: React.FC<{ value: string; compact?: boolean }> = ({
  value,
  compact = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      renderBarcodeSvg(svgRef.current, value, {
        height: compact ? 26 : 34,
        width: compact ? 1.3 : 1.6,
        fontSize: compact ? 8.5 : 9.5,
        margin: 2,
        lineColor: '#000000',
        displayValue: true,
      });
    }
  }, [value, compact]);

  return (
    <div className="flex justify-center my-1 print:my-0.5">
      <svg ref={svgRef} className="max-w-full h-auto" />
    </div>
  );
};

export const ReturnReceiptModal: React.FC<ReturnReceiptModalProps> = ({
  sale,
  record,
  type,
  onClose,
}) => {
  const [settings, setSettings] = useState<StoreSettings>(() => storage.getStoreSettings());
  const [activePaperSize, setActivePaperSize] = useState<InvoicePaperSize>(() => {
    const s = storage.getStoreSettings();
    return s.printerSettings?.paperSize || '58mm';
  });

  const printButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const s = storage.getStoreSettings();
    setSettings(s);
    if (s.printerSettings?.paperSize) {
      setActivePaperSize(s.printerSettings.paperSize);
    }
  }, []);

  // Set body class while modal is mounted for clean print isolation
  useEffect(() => {
    document.body.classList.add('print-modal-active');
    return () => {
      document.body.classList.remove('print-modal-active');
    };
  }, []);

  // Keyboard shortcut listener (Enter, Ctrl+P, F9 to print; Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') ||
        e.key === 'Enter' ||
        e.key === 'F9'
      ) {
        e.preventDefault();
        handleManualPrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleManualPrint = () => {
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.warn('Print error:', err);
    }
  };

  const printerConfig = settings.printerSettings || {
    printerPreset: 'bc-96ac',
    printerName: 'BC-96AC Mini Printer',
    paperSize: '58mm',
    printCopies: 1,
    copyLabelsEnabled: true,
    autoPrintOnSale: true,
    autoCutFeedLines: 3,
    showLogoOnSlip: true,
    showBarcodeOnSlip: true,
    showInvoiceBarcode: true,
    showCashierName: true,
    cashierName: 'Counter Cashier',
    showTimeOnSlip: true,
    timeFormat: '12h',
    fontSize: 'normal',
    darkPrintOptimization: true,
    invoicePrefix: 'INV-',
  };

  const is58mm = activePaperSize === '58mm';
  const is80mm = activePaperSize === '80mm';
  const isA4 = activePaperSize === 'a4';
  const isA5 = activePaperSize === 'a5';

  const isReturn = type === 'RETURN';
  const returnRecord = isReturn ? (record as SaleReturn) : null;
  const exchangeRecord = !isReturn ? (record as SaleExchange) : null;

  const voucherNumber = isReturn ? returnRecord?.returnNumber : exchangeRecord?.exchangeNumber;
  const voucherDate = record.date;
  const voucherTime = record.time;

  // Resolve cashier display name: User profile information -> record processedBy -> sale cashierName
  const userProfileName = authService.getStoredUser()?.name?.trim();
  const cashierDisplayName =
    record.processedBy || userProfileName || sale.cashierName || 'Counter Cashier';

  // Format voucher time based on printer timeFormat
  const formatTime = (timeStr?: string): string => {
    if (timeStr && timeStr.trim()) return timeStr.trim();
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: printerConfig.timeFormat !== '24h',
    });
  };
  const formattedVoucherTime = formatTime(voucherTime);

  // Container width styling on screen based on active paper size
  const getContainerWidthClass = () => {
    if (is58mm) return 'max-w-[340px] paper-size-58mm';
    if (is80mm) return 'max-w-[430px] paper-size-80mm';
    if (isA5) return 'max-w-[560px] paper-size-a5';
    if (isA4) return 'max-w-3xl paper-size-a4';
    return 'max-w-md paper-size-58mm';
  };

  return createPortal(
    <div
      id="printable-return-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto printable-modal-overlay"
    >
      {/* Zero margin print styles and reduced, legible font sizing matching SaleReceiptModal */}
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
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-return-modal {
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          #printable-return-card {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .printable-single-copy {
            width: 100% !important;
            margin: 0 !important;
            padding: 1mm 2mm !important;
            box-sizing: border-box !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          /* Reduced, clean, perfectly legible print typography */
          .paper-size-58mm {
            font-size: 8pt !important;
            line-height: 1.2 !important;
          }
          .paper-size-58mm table {
            font-size: 7.5pt !important;
          }
          .paper-size-80mm {
            font-size: 8.5pt !important;
            line-height: 1.25 !important;
          }
          .paper-size-80mm table {
            font-size: 8pt !important;
          }
          .paper-size-a4,
          .paper-size-a5 {
            font-size: 8.5pt !important;
            line-height: 1.3 !important;
          }
          .paper-size-a4 table,
          .paper-size-a5 table {
            font-size: 8pt !important;
          }
        }
      `}</style>

      <div
        id="printable-return-card"
        className={`bg-white rounded-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 transition-all duration-150 printable-modal-card print:m-0 print:p-0 print:border-none print:shadow-none print:rounded-none print:w-full ${getContainerWidthClass()}`}
      >
        {/* ==================================================== */}
        {/* TOP BAR / QUICK PRINTER CONTROLS (Hidden in print)    */}
        {/* ==================================================== */}
        <div className="bg-slate-900 text-white px-4 py-3 print:hidden border-b border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isReturn ? (
                <div className="p-1 rounded-md bg-rose-500/20 text-rose-400">
                  <RotateCcw className="w-4 h-4" />
                </div>
              ) : (
                <div className="p-1 rounded-md bg-purple-500/20 text-purple-400">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
              )}
              <div>
                <h3 className="text-xs font-bold leading-tight flex items-center gap-1.5">
                  <span>{isReturn ? 'Return Voucher Slip' : 'Product Exchange Slip'}</span>
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {voucherNumber}
                  </span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                ref={printButtonRef}
                id="btn-quick-print-return"
                onClick={handleManualPrint}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
                title="Print Slip (Ctrl+P, Enter, or F9)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                id="btn-close-return-modal-x"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Paper Size Toolbar */}
          <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Sliders className="w-3 h-3 text-slate-400 mr-0.5" />
              <span className="text-[11px] text-slate-400 font-medium">Size:</span>
              <div className="inline-flex rounded-md bg-slate-800 p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setActivePaperSize('58mm')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    activePaperSize === '58mm'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="58mm Mini Roll (BC-96AC standard)"
                >
                  58mm (BC-96AC)
                </button>
                <button
                  type="button"
                  onClick={() => setActivePaperSize('80mm')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    activePaperSize === '80mm'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="80mm POS slip"
                >
                  80mm
                </button>
                <button
                  type="button"
                  onClick={() => setActivePaperSize('a4')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    activePaperSize === 'a4'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="A4 Full Page"
                >
                  A4
                </button>
                <button
                  type="button"
                  onClick={() => setActivePaperSize('a5')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    activePaperSize === 'a5'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="A5 Half Sheet"
                >
                  A5
                </button>
              </div>
            </div>

            <span className="text-[11px] text-slate-400 font-medium">
              1 Copy (Current Page Only)
            </span>
          </div>
        </div>

        {/* ==================================================== */}
        {/* PRINTABLE SLIP CONTENT (Clean 1 Single Copy Only)    */}
        {/* ==================================================== */}
        <div className="p-4 sm:p-5 text-slate-950 font-sans print:p-0 print:m-0 print:w-full print:text-black">
          <div className="printable-single-copy">
            {/* ==================================================== */}
            {/* A4 / A5 DESKTOP SLIP LAYOUT                          */}
            {/* ==================================================== */}
            {isA4 || isA5 ? (
              <div className="space-y-3.5 print:space-y-2.5">
                {/* Header Banner */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 print:border-black pb-3">
                  <div>
                    {printerConfig.showLogoOnSlip && settings.logoUrl && (
                      <img
                        src={settings.logoUrl}
                        alt={settings.brandName}
                        className="max-h-10 max-w-[150px] object-contain mb-1"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <h1 className="text-base sm:text-lg font-bold text-slate-950 print:text-black uppercase tracking-tight">
                      {settings.brandName || 'STOCKCORE RETAIL & WHOLESALE'}
                    </h1>
                    {settings.headerBriefText && (
                      <p className="text-[11px] text-slate-800 print:text-black font-semibold">
                        {settings.headerBriefText}
                      </p>
                    )}
                    {settings.address && (
                      <p className="text-[10.5px] text-slate-700 print:text-black font-medium mt-0.5">
                        {settings.address}
                      </p>
                    )}
                    {(() => {
                      const nums =
                        settings.phoneNumbers && settings.phoneNumbers.length > 0
                          ? settings.phoneNumbers.filter((n) => n && n.trim())
                          : settings.phoneNumber
                          ? [settings.phoneNumber]
                          : [];
                      if (nums.length === 0) return null;
                      return (
                        <p className="text-[10.5px] font-mono text-slate-900 print:text-black font-bold">
                          Tel: {nums.join(' • ')}
                        </p>
                      );
                    })()}
                  </div>

                  <div className="text-right">
                    <div
                      className={`inline-block px-3 py-1 rounded text-xs font-black uppercase tracking-wider mb-1 ${
                        isReturn
                          ? 'bg-rose-100 text-rose-900 border border-rose-300 print:bg-white print:border-black print:text-black'
                          : 'bg-purple-100 text-purple-900 border border-purple-300 print:bg-white print:border-black print:text-black'
                      }`}
                    >
                      {isReturn ? 'CUSTOMER RETURN VOUCHER' : 'PRODUCT EXCHANGE SLIP'}
                    </div>
                    <div className="font-mono text-sm font-black text-slate-950 print:text-black">
                      {voucherNumber}
                    </div>
                    <div className="text-[11px] text-slate-700 print:text-black font-semibold mt-0.5">
                      Date: {voucherDate}
                      {printerConfig.showTimeOnSlip && ` • ${formattedVoucherTime}`}
                    </div>
                    <div className="text-[10px] text-slate-600 print:text-black font-mono">
                      Ref Invoice: <strong>{sale.invoiceNumber}</strong>
                    </div>
                  </div>
                </div>

                {/* Customer & Cashier Info Block */}
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-300 print:border-black text-[11px]">
                  <div>
                    <span className="text-slate-600 print:text-black font-bold block uppercase text-[10px]">
                      Customer Details
                    </span>
                    <span className="font-bold text-slate-950 print:text-black text-xs">
                      {sale.customerName || 'Walk-in Customer'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-600 print:text-black font-bold block uppercase text-[10px]">
                      Authorized Staff
                    </span>
                    <span className="font-bold text-slate-950 print:text-black text-xs">
                      {cashierDisplayName}
                    </span>
                  </div>
                </div>

                {/* Barcode in Desktop Layout */}
                {printerConfig.showInvoiceBarcode && voucherNumber && (
                  <div className="py-1 border-b border-dotted border-slate-300 print:border-black">
                    <VoucherBarcode value={voucherNumber} compact={false} />
                  </div>
                )}

                {/* Table 1: Returned Items */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 print:text-black flex items-center justify-between">
                    <span>{isReturn ? 'Items Returned for Refund:' : 'Items Returned by Customer:'}</span>
                    <span className="text-[10px] font-mono font-bold text-rose-700 print:text-black">
                      {isReturn
                        ? `Refund: ${formatPKR(returnRecord?.totalRefundAmount || 0)}`
                        : `Credit: ${formatPKR(exchangeRecord?.returnCreditTotal || 0)}`}
                    </span>
                  </div>

                  <div className="border border-slate-300 print:border-black rounded overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 print:bg-transparent font-bold border-b border-slate-300 print:border-black text-[10px] uppercase">
                        <tr>
                          <th className="px-2 py-1.5">Item Description</th>
                          <th className="px-2 py-1.5 text-center w-16">Qty</th>
                          <th className="px-2 py-1.5 text-right w-24">Unit Rate</th>
                          <th className="px-2 py-1.5 text-right w-28">Refund Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 print:divide-black">
                        {(isReturn ? returnRecord?.items : exchangeRecord?.returnedItems)?.map(
                          (it, idx) => (
                            <tr key={idx}>
                              <td className="px-2 py-1.5 font-medium">
                                <div className="font-bold text-slate-950 print:text-black">
                                  {it.name}
                                </div>
                                <div className="text-[9.5px] font-mono text-slate-600 print:text-black">
                                  SKU: {it.sku}
                                  {it.barcode ? ` • Barcode: ${it.barcode}` : ''}
                                  {it.condition && it.condition !== 'good' ? ` • (${it.condition})` : ''}
                                </div>
                              </td>
                              <td className="px-2 py-1.5 text-center font-mono font-bold">
                                {it.quantity} {it.unit || 'pcs'}
                              </td>
                              <td className="px-2 py-1.5 text-right font-mono font-medium">
                                {formatPKR(it.unitRefundPrice)}
                              </td>
                              <td className="px-2 py-1.5 text-right font-mono font-bold text-slate-950 print:text-black">
                                {formatPKR(it.totalRefund)}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table 2: Replacement Items (Exchange only) */}
                {!isReturn && exchangeRecord && (
                  <div className="space-y-1.5 pt-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 print:text-black flex items-center justify-between">
                      <span>Replacement Items Issued to Customer:</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 print:text-black">
                        New Total: {formatPKR(exchangeRecord.newItemsTotal)}
                      </span>
                    </div>

                    <div className="border border-slate-300 print:border-black rounded overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-100 print:bg-transparent font-bold border-b border-slate-300 print:border-black text-[10px] uppercase">
                          <tr>
                            <th className="px-2 py-1.5">New Item Description</th>
                            <th className="px-2 py-1.5 text-center w-16">Qty</th>
                            <th className="px-2 py-1.5 text-right w-24">Price</th>
                            <th className="px-2 py-1.5 text-right w-28">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 print:divide-black">
                          {exchangeRecord.newItems.map((it, idx) => (
                            <tr key={idx}>
                              <td className="px-2 py-1.5 font-medium">
                                <div className="font-bold text-slate-950 print:text-black">
                                  {it.name}
                                </div>
                                <div className="text-[9.5px] font-mono text-slate-600 print:text-black">
                                  SKU: {it.sku}
                                  {it.barcode ? ` • Barcode: ${it.barcode}` : ''}
                                </div>
                              </td>
                              <td className="px-2 py-1.5 text-center font-mono font-bold">
                                {it.quantity} {it.unit || 'pcs'}
                              </td>
                              <td className="px-2 py-1.5 text-right font-mono font-medium">
                                {formatPKR(it.pricePerUnit)}
                              </td>
                              <td className="px-2 py-1.5 text-right font-mono font-bold text-slate-950 print:text-black">
                                {formatPKR(it.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Settlement Summary */}
                <div className="flex justify-end pt-1">
                  <div className="w-72 space-y-1 text-[11px]">
                    {isReturn ? (
                      <div className="flex justify-between py-1 border-t-2 border-b-2 border-slate-950 print:border-black font-black text-sm">
                        <span>Total Cash Refunded:</span>
                        <span className="font-mono text-rose-700 print:text-black">
                          {formatPKR(returnRecord?.totalRefundAmount || 0)}
                        </span>
                      </div>
                    ) : exchangeRecord ? (
                      <div className="p-2.5 rounded border-2 border-slate-900 print:border-black bg-slate-50 print:bg-white space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span>New Items Total:</span>
                          <span className="font-mono font-bold">
                            {formatPKR(exchangeRecord.newItemsTotal)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Less Return Credit:</span>
                          <span className="font-mono font-bold">
                            -{formatPKR(exchangeRecord.returnCreditTotal)}
                          </span>
                        </div>
                        <div className="pt-1 border-t border-slate-300 print:border-black flex justify-between items-center text-xs font-black">
                          <span>
                            {exchangeRecord.differenceType === 'CUSTOMER_PAID' &&
                              'Cash Collected from Customer:'}
                            {exchangeRecord.differenceType === 'STORE_REFUNDED' &&
                              'Cash Refunded to Customer:'}
                            {exchangeRecord.differenceType === 'EVEN' &&
                              'Net Settlement (Even Exchange):'}
                          </span>
                          <span className="font-mono text-sm">
                            {formatPKR(exchangeRecord.differenceAmount)}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Reason & Notes */}
                {record.reason && (
                  <div className="pt-1 text-[10px] text-slate-700 print:text-black">
                    <span className="font-bold">Reason:</span> {record.reason}
                    {record.notes && <span className="block italic mt-0.5">Note: {record.notes}</span>}
                  </div>
                )}

                {/* Signature Row */}
                <div className="pt-6 pb-2 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-800 print:text-black">
                  <div className="border-t border-slate-400 print:border-black pt-1">
                    Customer Signature
                  </div>
                  <div className="border-t border-slate-400 print:border-black pt-1">
                    Authorized Cashier Signature
                  </div>
                </div>

                {/* Footer Notes & Return Policies */}
                <div className="pt-2 border-t border-dashed border-slate-400 print:border-black text-left space-y-0.5 text-[9.5px] text-slate-800 print:text-black">
                  {settings.footerBriefText && (
                    <p className="font-bold text-slate-950 print:text-black text-left">
                      {settings.footerBriefText}
                    </p>
                  )}
                  {((settings.returnPolicies && settings.returnPolicies.length > 0)
                    ? settings.returnPolicies.filter(Boolean)
                    : [settings.returnPolicyText || 'Items can be exchanged within 7 days.']
                  ).map((pol, idx) => (
                    <p key={idx} className="italic text-slate-700 print:text-black text-left">
                      *{pol}
                    </p>
                  ))}
                  {settings.supportContact && (
                    <p className="font-mono font-bold text-slate-950 print:text-black text-left">
                      {settings.supportContact}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* ==================================================== */
              /* 58mm (BC-96AC) & 80mm THERMAL RECEIPT SLIP LAYOUT     */
              /* ==================================================== */
              <div
                className={`space-y-2 print:space-y-1 print:w-full print:p-0 print:m-0 ${
                  is58mm ? 'text-[9.5px] leading-tight' : 'text-[10px]'
                }`}
              >
                {/* Thermal Header */}
                <div className="text-center pb-1.5 border-b border-dashed border-slate-400 print:border-black space-y-0.5">
                  {printerConfig.showLogoOnSlip && settings.logoUrl && (
                    <div className="flex justify-center mb-1">
                      <img
                        src={settings.logoUrl}
                        alt={settings.brandName}
                        className={`${
                          is58mm ? 'max-h-8 max-w-[100px]' : 'max-h-10 max-w-[130px]'
                        } object-contain`}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <h2
                    className={`font-black text-slate-950 print:text-black tracking-tight uppercase ${
                      is58mm ? 'text-[12px]' : 'text-[13px]'
                    }`}
                  >
                    {settings.brandName || 'STOCKCORE RETAIL'}
                  </h2>

                  {settings.headerBriefText && (
                    <p className="text-[9.5px] text-slate-900 print:text-black font-semibold leading-tight">
                      {settings.headerBriefText}
                    </p>
                  )}

                  {settings.address && (
                    <p className="text-[8.5px] text-slate-800 print:text-black font-medium leading-tight">
                      {settings.address}
                    </p>
                  )}

                  {(() => {
                    const nums =
                      settings.phoneNumbers && settings.phoneNumbers.length > 0
                        ? settings.phoneNumbers.filter((n) => n && n.trim())
                        : settings.phoneNumber
                        ? [settings.phoneNumber]
                        : [];
                    if (nums.length === 0) return null;
                    return (
                      <p className="text-[9.5px] font-mono font-bold text-slate-950 print:text-black">
                        Tel: {nums.join(' • ')}
                      </p>
                    );
                  })()}
                </div>

                {/* Voucher Title Badge */}
                <div className="py-1 text-center border-b border-dashed border-slate-400 print:border-black">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider ${
                      isReturn
                        ? 'bg-rose-100 text-rose-900 border border-rose-300 print:bg-white print:border-black print:text-black'
                        : 'bg-purple-100 text-purple-900 border border-purple-300 print:bg-white print:border-black print:text-black'
                    }`}
                  >
                    {isReturn ? '★ CUSTOMER RETURN VOUCHER ★' : '★ PRODUCT EXCHANGE SLIP ★'}
                  </span>
                </div>

                {/* Thermal Voucher Meta */}
                <div className="flex items-start justify-between pb-1.5 border-b border-slate-300 print:border-black">
                  <div>
                    <div className="text-[8.5px] uppercase font-bold text-slate-800 print:text-black tracking-wider">
                      Slip #
                    </div>
                    <div className="font-mono text-xs font-black text-slate-950 print:text-black">
                      {voucherNumber}
                    </div>
                    <div className="text-slate-800 print:text-black text-[8.5px] font-semibold mt-0.5">
                      Date: {voucherDate}
                      {printerConfig.showTimeOnSlip && (
                        <span className="ml-1 text-slate-950 print:text-black font-mono font-bold">
                          • {formattedVoucherTime}
                        </span>
                      )}
                    </div>
                    {printerConfig.showCashierName && (
                      <div className="text-slate-800 print:text-black text-[8.5px] font-medium mt-0.5">
                        Cashier:{' '}
                        <span className="font-bold text-slate-950 print:text-black">
                          {cashierDisplayName}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-[8.5px] uppercase font-bold text-slate-800 print:text-black tracking-wider">
                      Customer
                    </div>
                    <div className="font-bold text-slate-950 print:text-black text-[10px]">
                      {sale.customerName || 'Walk-in'}
                    </div>
                    <div className="text-[8.5px] font-mono text-slate-600 print:text-black mt-0.5">
                      Inv: {sale.invoiceNumber}
                    </div>
                  </div>
                </div>

                {/* Scannable Voucher Barcode */}
                {printerConfig.showInvoiceBarcode && voucherNumber && (
                  <div className="py-0.5 border-b border-dotted border-slate-300 print:border-black">
                    <VoucherBarcode value={voucherNumber} compact={is58mm} />
                  </div>
                )}

                {/* Returned Items Table */}
                <div className="space-y-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-800 print:text-black">
                    {isReturn ? 'Items Returned for Refund:' : 'Items Returned by Customer:'}
                  </div>
                  <div className="border border-slate-300 print:border-black rounded overflow-hidden w-full">
                    <table className="w-full text-[9px] text-left">
                      <thead className="bg-slate-100 print:bg-transparent text-slate-950 print:text-black font-bold border-b border-slate-300 print:border-black text-[8.5px]">
                        <tr>
                          <th className="px-1 py-0.5 text-left">Item</th>
                          <th className="px-0.5 py-0.5 text-center w-8">Qty</th>
                          <th className="px-0.5 py-0.5 text-right w-14">Rate</th>
                          <th className="px-1 py-0.5 text-right w-14">Refund</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 print:divide-black">
                        {(isReturn ? returnRecord?.items : exchangeRecord?.returnedItems)?.map(
                          (it, idx) => (
                            <tr key={idx} className="print:text-black">
                              <td className="px-1 py-0.5">
                                <div className="font-bold text-slate-950 print:text-black leading-tight">
                                  {it.name}
                                </div>
                                {printerConfig.showBarcodeOnSlip && (it.barcode || it.sku) && (
                                  <div className="text-[7.5px] text-slate-600 font-mono print:text-black">
                                    {it.barcode ? `BC: ${it.barcode}` : `SKU: ${it.sku}`}
                                  </div>
                                )}
                              </td>
                              <td className="px-0.5 py-0.5 text-center font-mono font-bold">
                                {it.quantity}
                              </td>
                              <td className="px-0.5 py-0.5 text-right font-mono">
                                {formatPKR(it.unitRefundPrice)}
                              </td>
                              <td className="px-1 py-0.5 text-right font-mono font-bold text-slate-950 print:text-black">
                                {formatPKR(it.totalRefund)}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Replacement Items (Exchange Only) */}
                {!isReturn && exchangeRecord && (
                  <div className="space-y-1 pt-1 border-t border-dashed border-slate-300 print:border-black">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-800 print:text-black">
                      Replacement Items Issued:
                    </div>
                    <div className="border border-slate-300 print:border-black rounded overflow-hidden w-full">
                      <table className="w-full text-[9px] text-left">
                        <thead className="bg-slate-100 print:bg-transparent text-slate-950 print:text-black font-bold border-b border-slate-300 print:border-black text-[8.5px]">
                          <tr>
                            <th className="px-1 py-0.5 text-left">Item</th>
                            <th className="px-0.5 py-0.5 text-center w-8">Qty</th>
                            <th className="px-0.5 py-0.5 text-right w-14">Price</th>
                            <th className="px-1 py-0.5 text-right w-14">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 print:divide-black">
                          {exchangeRecord.newItems.map((it, idx) => (
                            <tr key={idx} className="print:text-black">
                              <td className="px-1 py-0.5">
                                <div className="font-bold text-slate-950 print:text-black leading-tight">
                                  {it.name}
                                </div>
                                {printerConfig.showBarcodeOnSlip && (it.barcode || it.sku) && (
                                  <div className="text-[7.5px] text-slate-600 font-mono print:text-black">
                                    {it.barcode ? `BC: ${it.barcode}` : `SKU: ${it.sku}`}
                                  </div>
                                )}
                              </td>
                              <td className="px-0.5 py-0.5 text-center font-mono font-bold">
                                {it.quantity}
                              </td>
                              <td className="px-0.5 py-0.5 text-right font-mono">
                                {formatPKR(it.pricePerUnit)}
                              </td>
                              <td className="px-1 py-0.5 text-right font-mono font-bold text-slate-950 print:text-black">
                                {formatPKR(it.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Totals & Net Settlement */}
                <div className="pt-1 border-t border-slate-300 print:border-black space-y-0.5 text-[9.5px]">
                  {isReturn ? (
                    <div className="flex justify-between font-black text-slate-950 print:text-black pt-1 border-t border-slate-900 print:border-black text-xs">
                      <span>Total Cash Refunded:</span>
                      <span className="font-mono text-sm text-rose-700 print:text-black">
                        {formatPKR(returnRecord?.totalRefundAmount || 0)}
                      </span>
                    </div>
                  ) : exchangeRecord ? (
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-slate-800 print:text-black font-semibold">
                        <span>New Items Total:</span>
                        <span className="font-mono font-bold">
                          {formatPKR(exchangeRecord.newItemsTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-800 print:text-black font-semibold">
                        <span>Less Return Credit:</span>
                        <span className="font-mono font-bold">
                          -{formatPKR(exchangeRecord.returnCreditTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between font-black text-slate-950 print:text-black pt-1 border-t border-slate-900 print:border-black text-xs">
                        <span>
                          {exchangeRecord.differenceType === 'CUSTOMER_PAID' &&
                            'Cash Collected:'}
                          {exchangeRecord.differenceType === 'STORE_REFUNDED' &&
                            'Cash Refunded:'}
                          {exchangeRecord.differenceType === 'EVEN' &&
                            'Net Even:'}
                        </span>
                        <span className="font-mono text-sm">
                          {formatPKR(exchangeRecord.differenceAmount)}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Reason & Notes */}
                {record.reason && (
                  <div className="pt-1 text-[8.5px] text-slate-800 print:text-black">
                    <span className="font-bold">Reason:</span> {record.reason}
                    {record.notes && <span className="block italic mt-0.5">Note: {record.notes}</span>}
                  </div>
                )}

                {/* Customer Signature Box */}
                <div className="pt-3 pb-1 grid grid-cols-2 gap-3 text-center text-[8px] text-slate-800 print:text-black">
                  <div className="border-t border-slate-400 print:border-black pt-0.5">
                    Customer Signature
                  </div>
                  <div className="border-t border-slate-400 print:border-black pt-0.5">
                    Authorized Cashier
                  </div>
                </div>

                {/* Thermal Footer Policies */}
                <div className="pt-1.5 border-t border-dashed border-slate-400 print:border-black text-left space-y-0.5 text-[8px] text-slate-800 print:text-black">
                  {settings.footerBriefText && (
                    <p className="font-bold text-slate-950 print:text-black text-left">
                      {settings.footerBriefText}
                    </p>
                  )}
                  {((settings.returnPolicies && settings.returnPolicies.length > 0)
                    ? settings.returnPolicies.filter(Boolean)
                    : [settings.returnPolicyText || 'Items can be exchanged within 7 days.']
                  ).map((pol, idx) => (
                    <p key={idx} className="italic text-slate-700 print:text-black text-left">
                      *{pol}
                    </p>
                  ))}
                  {settings.supportContact && (
                    <p className="font-mono font-bold text-slate-950 print:text-black text-left">
                      {settings.supportContact}
                    </p>
                  )}
                  {(printerConfig.showCashierName || printerConfig.showTimeOnSlip) && (
                    <p className="text-[7.5px] text-slate-700 print:text-black pt-0.5 border-t border-dotted border-slate-200 uppercase font-mono text-left">
                      {printerConfig.showCashierName && `Cashier: ${cashierDisplayName}`}
                      {printerConfig.showCashierName && printerConfig.showTimeOnSlip && ' • '}
                      {printerConfig.showTimeOnSlip && `Time: ${formattedVoucherTime}`}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Actions (Hidden in print) */}
        <div className="print:hidden bg-white px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleManualPrint}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print {isReturn ? 'Return Voucher' : 'Exchange Slip'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
