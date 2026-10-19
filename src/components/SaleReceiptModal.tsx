import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Receipt,
  Printer,
  Banknote,
  CheckCircle2,
  Sliders,
  Hash,
} from "lucide-react";
import { Sale, StoreSettings, InvoicePaperSize } from "../types";
import { formatPKR } from "../utils/currency";
import { storage } from "../services/storage";
import { renderBarcodeSvg } from "../utils/barcode";
import { authService } from "../services/auth";

interface SaleReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
  autoPrint?: boolean;
}

/**
 * Dedicated barcode element component for invoice slips
 */
const SlipBarcode: React.FC<{
  value: string;
  height?: number;
  compact?: boolean;
}> = ({ value, height = 28, compact = false }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      renderBarcodeSvg(svgRef.current, value, {
        height: compact ? 28 : height,
        width: compact ? 1.3 : 1.6,
        fontSize: compact ? 9 : 10,
        margin: 2,
        lineColor: "#000000",
        displayValue: true,
      });
    }
  }, [value, height, compact]);

  return (
    <div className="flex justify-center my-1 print:my-0.5">
      <svg ref={svgRef} className="max-w-full h-auto" />
    </div>
  );
};

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({
  sale,
  onClose,
  autoPrint = false,
}) => {
  const [settings, setSettings] = useState<StoreSettings>(() =>
    storage.getStoreSettings(),
  );
  const printedSaleKeyRef = useRef<string | null>(null);
  const autoPrintTimerRef = useRef<NodeJS.Timeout | null>(null);
  const printButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isPrintDialogSent, setIsPrintDialogSent] = useState(false);

  // Quick overrides that default to store printer settings
  const printerConfig = settings.printerSettings || {
    printerPreset: "bc-96ac",
    printerName: "BC-96AC Mini Printer",
    paperSize: "58mm",
    printCopies: 1,
    copyLabelsEnabled: true,
    autoPrintOnSale: true,
    autoCutFeedLines: 3,
    showLogoOnSlip: true,
    showBarcodeOnSlip: true,
    showInvoiceBarcode: true,
    showCashierName: true,
    cashierName: "Counter Cashier",
    showTimeOnSlip: true,
    timeFormat: "12h",
    fontSize: "normal",
    darkPrintOptimization: true,
    invoicePrefix: "INV-",
  };

  // Resolve cashier display name: Pick cashier name from User Profile Information -> Name
  const userProfileName = authService.getStoredUser()?.name?.trim();
  const cashierDisplayName =
    userProfileName || sale?.cashierName || "Counter Cashier";

  // Format sale time based on user printer settings
  const itemsMap = useMemo(() => {
    try {
      const allItems = storage.getItems();
      return new Map(allItems.map((i) => [i.id, i]));
    } catch {
      return new Map();
    }
  }, []);

  const formatSaleTime = (
    timeStr?: string,
    createdAt?: string,
    format: "12h" | "24h" = "12h",
  ): string => {
    if (timeStr && timeStr.trim()) {
      return timeStr.trim();
    }
    if (!createdAt) {
      return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: format !== "24h",
      });
    }
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return timeStr || "";
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: format !== "24h",
    });
  };

  const formattedSaleTime = formatSaleTime(
    sale?.time,
    sale?.createdAt,
    printerConfig.timeFormat || "12h",
  );

  const [activePaperSize, setActivePaperSize] = useState<InvoicePaperSize>(
    printerConfig.paperSize || "58mm",
  );

  useEffect(() => {
    const s = storage.getStoreSettings();
    setSettings(s);
    if (s.printerSettings) {
      setActivePaperSize(s.printerSettings.paperSize || "58mm");
    }
    const unsubscribe = storage.subscribe(() => {
      const updated = storage.getStoreSettings();
      setSettings(updated);
      if (updated.printerSettings) {
        setActivePaperSize(updated.printerSettings.paperSize || "58mm");
      }
    });
    return unsubscribe;
  }, []);

  // Set body class while modal is mounted for clean print isolation
  useEffect(() => {
    document.body.classList.add("print-modal-active");
    return () => {
      document.body.classList.remove("print-modal-active");
    };
  }, []);

  // Keyboard shortcut listener for receipt slip modal (Enter, F9, Ctrl+P to print; Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") ||
        e.key === "Enter" ||
        e.key === "F9"
      ) {
        e.preventDefault();
        handleManualPrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Automatically trigger / click print dialogue when modal is shown for fast service
  useEffect(() => {
    if (!autoPrint || !sale) return;

    const saleKey = `${sale.id || sale.invoiceNumber || "current_sale"}`;
    if (printedSaleKeyRef.current === saleKey) {
      return;
    }
    printedSaleKeyRef.current = saleKey;

    if (autoPrintTimerRef.current) {
      clearTimeout(autoPrintTimerRef.current);
    }

    // Fast automatic trigger simulates clicking the Print button immediately after DOM renders
    autoPrintTimerRef.current = setTimeout(() => {
      try {
        if (printButtonRef.current) {
          printButtonRef.current.click();
        } else {
          window.focus();
          window.print();
        }
        setIsPrintDialogSent(true);
      } catch (err) {
        console.warn("Auto-print dialog invocation error:", err);
      }
    }, 220);

    return () => {
      if (autoPrintTimerRef.current) {
        clearTimeout(autoPrintTimerRef.current);
      }
    };
  }, [autoPrint, sale?.id, sale?.invoiceNumber]);

  if (!sale) return null;

  const handleManualPrint = () => {
    try {
      window.focus();
      window.print();
      setIsPrintDialogSent(true);
    } catch (err) {
      console.warn("Print error:", err);
    }
  };

  const is58mm = activePaperSize === "58mm";
  const isA4 = activePaperSize === "a4";
  const isA5 = activePaperSize === "a5";
  const is80mm = activePaperSize === "80mm";

  // Container width styling on screen based on active paper size
  const getContainerWidthClass = () => {
    if (is58mm) return "max-w-[340px] paper-size-58mm";
    if (is80mm) return "max-w-[430px] paper-size-80mm";
    if (isA5) return "max-w-[560px] paper-size-a5";
    if (isA4) return "max-w-3xl paper-size-a4";
    return "max-w-md paper-size-58mm";
  };

  return createPortal(
    <div
      id="printable-receipt-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto printable-modal-overlay"
    >
      {/* Zero margin print styles and reduced, legible font sizing */}
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
          #printable-receipt-modal {
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          #printable-receipt-card {
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
            padding: 1mm 1mm !important;
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
        id="printable-receipt-card"
        className={`bg-white rounded-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 transition-all duration-150 printable-modal-card print:m-0 print:p-0 print:border-none print:shadow-none print:rounded-none print:w-full ${getContainerWidthClass()}`}
      >
        {/* ==================================================== */}
        {/* PRINTABLE SLIP CONTENT (Clean 1 Single Copy Only)    */}
        {/* ==================================================== */}
        <div className="p-4 sm:p-5 text-slate-950 font-sans print:p-0 print:m-0 print:w-full print:text-black">
          <div className="printable-single-copy">
            {/* ==================================================== */}
            {/* A4 / A5 DESKTOP INVOICE LAYOUT                       */}
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
                      {settings.brandName || "STOCKCORE RETAIL & WHOLESALE"}
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
                        settings.phoneNumbers &&
                        settings.phoneNumbers.length > 0
                          ? settings.phoneNumbers.filter((n) => n && n.trim())
                          : settings.phoneNumber
                            ? [settings.phoneNumber]
                            : [];
                      if (nums.length === 0) return null;
                      return (
                        <p className="text-[10.5px] font-mono font-bold text-slate-950 print:text-black mt-0.5">
                          Phone: {nums.join(" • ")}
                        </p>
                      );
                    })()}
                  </div>

                  <div className="text-right">
                    <div className="inline-block px-2.5 py-0.5 bg-slate-900 text-white print:bg-transparent print:text-black print:border print:border-black rounded text-[10px] font-bold uppercase tracking-wider mb-1.5">
                      Sales Tax Invoice
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 print:text-black">
                      Invoice No:{" "}
                      <span className="font-mono text-slate-950 print:text-black text-xs font-bold">
                        {sale.invoiceNumber}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-slate-800 print:text-black mt-0.5">
                      Date: <span className="font-medium">{sale.date}</span>
                      {printerConfig.showTimeOnSlip && (
                        <span className="ml-2 font-mono">
                          Time:{" "}
                          <span className="font-medium">
                            {formattedSaleTime}
                          </span>
                        </span>
                      )}
                    </div>
                    {printerConfig.showInvoiceBarcode && (
                      <div className="mt-1">
                        <SlipBarcode value={sale.invoiceNumber} height={28} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer & Settlement Row */}
                <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-50 print:bg-transparent rounded-lg border border-slate-200 print:border-black text-[11px]">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-600 print:text-black">
                      Billed To Customer:
                    </div>
                    <div className="font-bold text-slate-950 print:text-black text-xs mt-0.5">
                      {sale.customerName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase text-slate-600 print:text-black">
                      Payment Terms:
                    </div>
                    <div className="font-bold text-slate-950 print:text-black text-xs mt-0.5">
                      Cash Settlement (Counter POS)
                    </div>
                    {printerConfig.showCashierName && (
                      <div className="text-[10px] text-slate-700 print:text-black mt-0.5">
                        Cashier:{" "}
                        <span className="font-semibold text-slate-950 print:text-black">
                          {cashierDisplayName}
                        </span>
                      </div>
                    )}
                    {printerConfig.showTimeOnSlip && (
                      <div className="text-[10px] text-slate-700 print:text-black mt-0.5 font-mono">
                        Time:{" "}
                        <span className="font-semibold text-slate-950 print:text-black">
                          {formattedSaleTime}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Full Table */}
                <div className="border border-slate-300 print:border-black rounded-lg overflow-hidden">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 print:bg-transparent text-slate-950 print:text-black font-bold border-b border-slate-300 print:border-black">
                      <tr>
                        <th className="px-2.5 py-1.5 text-left text-[11px]">
                          Item
                        </th>
                        <th className="px-2.5 py-1.5 text-center w-20 text-[11px]">
                          Qty
                        </th>
                        <th className="px-2.5 py-1.5 text-right w-28 text-[11px]">
                          Unit Price
                        </th>
                        <th className="px-2.5 py-1.5 text-right w-28 text-[11px]">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 print:divide-black">
                      {sale.items.map((line, idx) => {
                        const origPrice = line.originalPrice ?? line.soldPrice;
                        const lineDiscount =
                          line.discountPerUnit ||
                          (origPrice > line.soldPrice
                            ? origPrice - line.soldPrice
                            : 0);
                        const matchingItem = line.itemId
                          ? itemsMap.get(line.itemId)
                          : undefined;
                        const effectiveBarcode =
                          line.barcode?.trim() ||
                          matchingItem?.barcode?.trim() ||
                          "";
                        const shouldShowBarcode =
                          printerConfig.showBarcodeOnSlip !== false;

                        return (
                          <tr
                            key={line.itemId || idx}
                            className="text-slate-950 print:text-black"
                          >
                            <td className="px-2.5 py-1.5">
                              <div className="font-bold text-[11px]">
                                {line.name}
                              </div>
                              {shouldShowBarcode &&
                                (effectiveBarcode || line.sku) && (
                                  <div className="text-[9.5px] font-mono text-slate-800 print:text-black mt-0.5">
                                    {effectiveBarcode ? (
                                      <span>
                                        Barcode:{" "}
                                        <strong className="font-bold text-slate-950 print:text-black">
                                          {effectiveBarcode}
                                        </strong>
                                      </span>
                                    ) : null}
                                    {effectiveBarcode &&
                                    line.sku &&
                                    line.sku !== effectiveBarcode ? (
                                      <span className="text-slate-400 print:text-black">
                                        {" "}
                                        •{" "}
                                      </span>
                                    ) : null}
                                    {line.sku &&
                                    line.sku !== effectiveBarcode ? (
                                      <span className="text-slate-600 print:text-black">
                                        SKU: {line.sku}
                                      </span>
                                    ) : null}
                                  </div>
                                )}
                              {lineDiscount > 0 && (
                                <div className="text-[9px] text-emerald-800 print:text-black font-semibold">
                                  Discount: -{formatPKR(lineDiscount)} / unit
                                </div>
                              )}
                            </td>
                            <td className="px-2.5 py-1.5 text-center font-mono font-bold text-[11px]">
                              {line.quantity}{" "}
                              {line.unit ? `(${line.unit})` : ""}
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-mono font-medium text-[11px]">
                              {formatPKR(origPrice)}
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-mono font-bold text-[11px]">
                              {formatPKR(origPrice * line.quantity)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary */}
                {(() => {
                  const totalQty = sale.items.reduce(
                    (sum, l) => sum + (Number(l.quantity) || 0),
                    0,
                  );
                  const displayQty = Number.isInteger(totalQty)
                    ? totalQty
                    : totalQty.toFixed(2);
                  const grossSubtotal =
                    sale.subtotal ||
                    sale.items.reduce(
                      (sum, l) =>
                        sum + (l.originalPrice ?? l.soldPrice) * l.quantity,
                      0,
                    );
                  const totalDiscount =
                    sale.discountTotal !== undefined
                      ? sale.discountTotal
                      : Math.max(0, grossSubtotal - sale.totalAmount);

                  return (
                    <div className="flex justify-end">
                      <div className="w-68 space-y-1 text-[11px]">
                        <div className="flex justify-between py-0.5 border-b border-slate-200 print:border-black">
                          <span className="font-medium text-slate-800 print:text-black">
                            Total Qty:
                          </span>
                          <span className="font-mono font-medium text-slate-950 print:text-black">
                            {displayQty}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5 border-b border-slate-200 print:border-black">
                          <span className="font-medium text-slate-800 print:text-black">
                            Subtotal (Gross):
                          </span>
                          <span className="font-mono font-medium">
                            {formatPKR(grossSubtotal)}
                          </span>
                        </div>
                        {totalDiscount > 0 && (
                          <div className="flex justify-between py-0.5 border-b border-slate-200 print:border-black font-medium text-slate-950 print:text-black">
                            <span>Total Discount:</span>
                            <span className="font-mono font-medium text-emerald-800 print:text-black">
                              -{formatPKR(totalDiscount)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between py-1 border-b-2 border-slate-900 print:border-black text-xs">
                          <span className="font-extrabold text-slate-950 print:text-black">
                            Net Total Paid:
                          </span>
                          <span className="font-mono font-bold text-sm text-slate-950 print:text-black">
                            {formatPKR(sale.totalAmount)}
                          </span>
                        </div>
                        {totalDiscount > 0 && (
                          <div className="pt-0.5 text-right text-[10px] font-bold text-emerald-800 print:text-black font-mono">
                            ★ Total Customer Savings: {formatPKR(totalDiscount)}{" "}
                            ★
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Details to Add Below the Invoice Slip (Left Aligned) */}
                <div className="pt-3 border-t border-slate-300 print:border-black text-left space-y-1 text-xs text-slate-900 print:text-black">
                  {settings.footerBriefText && (
                    <p className="font-bold text-slate-950 print:text-black text-[11px] leading-tight text-left">
                      {settings.footerBriefText}
                    </p>
                  )}

                  {(settings.returnPolicies &&
                  settings.returnPolicies.length > 0
                    ? settings.returnPolicies.filter(Boolean)
                    : settings.returnPolicyText
                      ? [settings.returnPolicyText]
                      : []
                  ).map((pol, pIdx) => (
                    <p
                      key={pIdx}
                      className="text-slate-800 print:text-black italic text-[10px] leading-tight text-left"
                    >
                      *{pol}
                    </p>
                  ))}

                  {settings.supportContact && (
                    <p className="font-mono font-bold text-slate-950 print:text-black text-[10px] text-left">
                      {settings.supportContact}
                    </p>
                  )}

                  {(printerConfig.showCashierName ||
                    printerConfig.showTimeOnSlip) && (
                    <p className="text-[9px] text-slate-700 print:text-black pt-1 border-t border-dotted border-slate-200 uppercase font-mono text-left">
                      {printerConfig.showCashierName &&
                        `Cashier: ${cashierDisplayName}`}
                      {printerConfig.showCashierName &&
                        printerConfig.showTimeOnSlip &&
                        " • "}
                      {printerConfig.showTimeOnSlip &&
                        `Time: ${formattedSaleTime}`}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* ==================================================== */
              /* 58mm (BC-96AC) & 80mm THERMAL RECEIPT SLIP LAYOUT     */
              /* ==================================================== */
              <div
                className={`space-y-2.5 print:space-y-0 print:w-full print:p-0 print:m-0 ${is58mm ? "text-[9.5px] leading-tight" : "text-[10px]"}`}
              >
                {/* Thermal Header */}
                <div className="text-center pb-1.5 border-b border-dashed border-slate-400 print:border-black space-y-0.5">
                  {printerConfig.showLogoOnSlip && settings.logoUrl && (
                    <div className="flex justify-center mb-1">
                      <img
                        src={settings.logoUrl}
                        alt={settings.brandName}
                        className={`${is58mm ? "max-h-8 max-w-[100px]" : "max-h-14 max-w-[280px]"} object-contain`}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* <h2
                    className={`font-black text-slate-950 print:text-black tracking-[0.4px] uppercase ${
                      is58mm ? "text-[12px]" : "text-[16px]"
                    }`}
                  >
                    {settings.brandName || "STOCKCORE RETAIL"}
                  </h2> */}

                  {settings.headerBriefText && (
                    <p className="text-[9px] text-slate-900 print:text-black font-medium mt-1 mb-0.5 tracking-[0.2px]">
                      {settings.headerBriefText}
                    </p>
                  )}

                  {settings.address && (
                    <p className="text-[9px] text-slate-800 print:text-black font-medium tracking-[0.2px]">
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
                      <p className="text-[9px] font-medium text-slate-950 print:text-black mt-0.5 tracking-[0.2px]">
                        Ph: {nums.join(" • ")}
                      </p>
                    );
                  })()}
                </div>

                {/* Thermal Invoice Meta */}
                <div className="flex items-start justify-between pb-1.5 border-b border-slate-300 print:border-black my-2">
                  <div>
                    <div className="text-[9px] font-medium text-slate-800 print:text-black">
                      Invoice #:{" "}
                      <span className="text-[9px] font-medium tracking-wide text-slate-950 print:text-black">
                        {sale.invoiceNumber}
                      </span>
                    </div>
                    <div className="text-[9px] font-medium text-slate-800 print:text-black mt-0.75">
                      Date:{" "}
                      <span className="text-[9px] font-medium tracking-wide text-slate-950 print:text-black">
                        {sale.date}
                      </span>
                    </div>

                    <div className="text-[9px] font-medium text-slate-800 print:text-black mt-0.75">
                      Time:{" "}
                      <span className="text-[9px] uppercase font-medium tracking-wide text-slate-950 print:text-black">
                        {formattedSaleTime}
                      </span>
                    </div>

                    {printerConfig.showCashierName && (
                      <div className="text-[9px] font-medium text-slate-800 print:text-black mt-0.75">
                        Cashier:{" "}
                        <span className="text-[9px] uppercase font-medium tracking-wide text-slate-950 print:text-black">
                          {cashierDisplayName}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-[9px] font-medium text-slate-800 print:text-black">
                      Customer
                    </div>
                    <div className="font-medium text-slate-950 tracking-wide print:text-black text-[9px]">
                      {sale.customerName}
                    </div>
                  </div>
                </div>

                {/* Purchased Items Table */}
                <div className="border border-slate-300 print:border-black rounded overflow-hidden w-full">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 print:bg-transparent text-slate-950 print:text-black border-b border-slate-300 print:border-black">
                      <tr>
                        <th className="px-1 py-1 text-left text-[9px] font-bold tracking-wider">
                          Item
                        </th>
                        <th className="px-0.5 py-1 text-center w-4 text-[9px] font-bold tracking-wider">
                          Qty
                        </th>
                        <th className="px-0.5 py-1 text-right w-11 text-[9px] font-bold tracking-wider">
                          Price
                        </th>
                        <th className="px-1 py-1 text-right w-11 text-[9px] font-bold tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 print:divide-black">
                      {sale.items.map((line, idx) => {
                        const origPrice = line.originalPrice ?? line.soldPrice;
                        const lineDiscount =
                          line.discountPerUnit ||
                          (origPrice > line.soldPrice
                            ? origPrice - line.soldPrice
                            : 0);
                        const hasLineDiscount = lineDiscount > 0;
                        const matchingItem = line.itemId
                          ? itemsMap.get(line.itemId)
                          : undefined;
                        const effectiveBarcode =
                          line.barcode?.trim() ||
                          matchingItem?.barcode?.trim() ||
                          "";
                        const shouldShowBarcode =
                          printerConfig.showBarcodeOnSlip !== false;

                        return (
                          <tr
                            key={line.itemId || idx}
                            className="text-slate-950 print:text-black align-top"
                          >
                            <td className="px-1 py-1.5">
                              <div className="font-medium text-[10px] leading-tight">
                                {line.name}
                              </div>
                              {shouldShowBarcode &&
                                (effectiveBarcode || line.sku) && (
                                  <div className="text-[8px] text-slate-800 print:text-black font-mono leading-tight mt-0.5">
                                    {effectiveBarcode ? (
                                      <div>
                                        BC:{" "}
                                        <strong className="font-bold text-slate-950 print:text-black">
                                          {effectiveBarcode}
                                        </strong>
                                      </div>
                                    ) : null}
                                    {line.sku &&
                                    line.sku !== effectiveBarcode ? (
                                      <div className="text-slate-600 print:text-black">
                                        SKU: {line.sku}
                                      </div>
                                    ) : null}
                                  </div>
                                )}
                              {hasLineDiscount && (
                                <div className="text-[8px] text-emerald-800 print:text-black font-medium mt-1">
                                  Disc: {lineDiscount} / Unit
                                </div>
                              )}
                            </td>
                            <td className="px-0.5 py-1.5 text-center font-medium text-[10px] whitespace-nowrap">
                              {line.quantity}
                            </td>
                            <td className="px-0.5 py-1.5 text-right font-medium text-[10px] whitespace-nowrap">
                              {origPrice}
                            </td>
                            <td className="px-1 py-1.5 text-right font-medium text-[10px] whitespace-nowrap">
                              {origPrice * line.quantity}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Notes */}
                {sale.notes && (
                  <div className="text-[8.5px] text-slate-900 print:text-black italic bg-slate-50 print:bg-transparent p-1 rounded border border-slate-300 print:border-black">
                    Note: {sale.notes}
                  </div>
                )}

                {/* Financial Breakdown */}
                {(() => {
                  const totalQty = sale.items.reduce(
                    (sum, l) => sum + (Number(l.quantity) || 0),
                    0,
                  );
                  const displayQty = Number.isInteger(totalQty)
                    ? totalQty
                    : totalQty.toFixed(2);
                  const grossSubtotal =
                    sale.subtotal ||
                    sale.items.reduce(
                      (sum, l) =>
                        sum + (l.originalPrice ?? l.soldPrice) * l.quantity,
                      0,
                    );
                  const totalDiscount =
                    sale.discountTotal !== undefined
                      ? sale.discountTotal
                      : Math.max(0, grossSubtotal - sale.totalAmount);

                  return (
                    <div className="py-2 border-t border-slate-300 print:border-black space-y-0.5 mt-2">
                      <div className="flex items-center justify-between text-slate-900 print:text-black font-medium text-[11px]">
                        <span>Total Qty:</span>
                        <span className="font-medium text-slate-950 print:text-black">
                          {displayQty}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-900 print:text-black font-medium text-[11px]">
                        <span>Subtotal (Gross):</span>
                        <span className="font-medium text-slate-950 print:text-black">
                          {formatPKR(grossSubtotal)}
                        </span>
                      </div>

                      {totalDiscount > 0 && (
                        <div className="flex items-center justify-between text-slate-900 print:text-black font-medium text-[11px]">
                          <span>Total Discount:</span>
                          <span className="font-medium text-slate-950 print:text-black">
                            -{formatPKR(totalDiscount)}
                          </span>
                        </div>
                      )}

                      <div className="py-1.5 border-t-2 border-slate-900 print:border-black flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-950 print:text-black text-[12px] uppercase">
                            Paid
                          </span>
                        </div>
                        <span className="font-semibold text-slate-950 print:text-black text-[12px]">
                          {formatPKR(sale.totalAmount)}
                        </span>
                      </div>

                      {totalDiscount > 0 && (
                        <div className="text-center py-1.5 border-t border-b border-dashed border-slate-400 print:border-black text-[13px] font-medium text-slate-950 print:text-black uppercase">
                          *** YOU SAVED: {formatPKR(totalDiscount)} ***
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Scannable Invoice Barcode (at top/middle for fast scanner verification) */}
                {printerConfig.showInvoiceBarcode && (
                  <div className="py-0.5">
                    <SlipBarcode value={sale.invoiceNumber} compact={is58mm} />
                  </div>
                )}

                {/* ==================================================== */}
                {/* FOOTER DETAILS & RETURN POLICY (LEFT ALIGNED)        */}
                {/* ==================================================== */}
                <div className="pt-1.5 border-t border-dashed border-slate-400 print:border-black text-left space-y-0.5 text-[9px] text-slate-900 print:text-black">
                  {settings.footerBriefText && (
                    <p className="font-medium text-slate-950 print:text-black text-[9.5px] leading-tight text-left">
                      {settings.footerBriefText}
                    </p>
                  )}

                  <h4 className="text-[12px] font-semibold mt-2 tracking-wide">
                    Terms & Conditions
                  </h4>
                  {(settings.returnPolicies &&
                  settings.returnPolicies.length > 0
                    ? settings.returnPolicies.filter(Boolean)
                    : settings.returnPolicyText
                      ? [settings.returnPolicyText]
                      : []
                  ).map((pol, pIdx) => (
                    <p
                      key={pIdx}
                      className="text-slate-900 print:text-black font-medium italic text-[8.5px] leading-tight text-left"
                    >
                      {pol}
                    </p>
                  ))}

                  {settings.supportContact && (
                    <p className="font-mono font-bold text-slate-950 print:text-black pt-0.5 text-[8.5px] text-left">
                      {settings.supportContact}
                    </p>
                  )}
                </div>

                {/* Paper Feed Blank Spacing before Tear/Cut (Minimal feed for clean single-page cut) */}
                {printerConfig.autoCutFeedLines > 0 && (
                  <div
                    style={{
                      height: `${Math.min(printerConfig.autoCutFeedLines, 2) * 10}px`,
                    }}
                    className="w-full select-none print:hidden"
                    aria-hidden="true"
                  />
                )}
              </div>
            )}
          </div>

          {/* Modal Actions (hidden in print) */}
          <div className="pt-4 flex items-center justify-end gap-2 print:hidden border-t border-slate-100 mt-4">
            <button
              id="btn-close-receipt-modal"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Done / Close
            </button>
            <button
              id="btn-print-receipt-modal"
              onClick={handleManualPrint}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
