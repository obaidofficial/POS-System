import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Building2, CheckCircle2 } from 'lucide-react';
import { VendorPurchase, VendorPayment, StoreSettings } from '../types';
import { formatRs } from '../utils/currency';
import { storage } from '../services/storage';

interface VendorVoucherModalProps {
  isOpen: boolean;
  type: 'PURCHASE' | 'PAYMENT';
  record: VendorPurchase | VendorPayment | null;
  storeSettings?: StoreSettings;
  onClose: () => void;
}

export const VendorVoucherModal: React.FC<VendorVoucherModalProps> = ({
  isOpen,
  type,
  record,
  storeSettings,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen && record) {
      document.body.classList.add('print-modal-active');
      return () => {
        document.body.classList.remove('print-modal-active');
      };
    }
  }, [isOpen, record]);

  if (!isOpen || !record) return null;

  const isPurchase = type === 'PURCHASE';
  const purchase = isPurchase ? (record as VendorPurchase) : null;
  const payment = !isPurchase ? (record as VendorPayment) : null;

  const handlePrint = () => {
    window.print();
  };

  // Vendor balance calculation for Payment Receipt
  const { currentRemainingBalance, specificBillRemaining, previousBalance } = useMemo(() => {
    if (!payment) {
      return { currentRemainingBalance: 0, specificBillRemaining: null, previousBalance: 0 };
    }
    try {
      // Find vendor by ID or fallback by name
      let vendor = payment.vendorId ? storage.getVendorById(payment.vendorId) : undefined;
      if (!vendor && payment.vendorName) {
        vendor = storage.getVendors().find(
          (v) => v.name.trim().toLowerCase() === payment.vendorName.trim().toLowerCase()
        );
      }

      const vId = vendor?.id || payment.vendorId;
      const allPurchases = vId ? storage.getVendorPurchases(vId) : [];
      const allPayments = vId ? storage.getVendorPayments(vId) : [];

      const totalBilled = allPurchases.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
      const totalPaid = allPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

      // Remaining balance from vendor profile or ledger aggregate
      const balance = vendor && typeof vendor.currentBalance === 'number'
        ? vendor.currentBalance
        : totalBilled - totalPaid;

      const currentRemaining = Math.max(0, balance);
      const paidNum = Number(payment.amount) || 0;
      const prevBal = currentRemaining + paidNum;

      // Check if payment was against a specific purchase bill
      let specificBill: number | null = null;
      if (payment.purchaseId || payment.billNumber) {
        const matchedPurchase = allPurchases.find(
          (p) =>
            (payment.purchaseId && p.id === payment.purchaseId) ||
            (payment.billNumber && p.billNumber === payment.billNumber)
        );
        if (matchedPurchase) {
          specificBill = Math.max(0, matchedPurchase.remainingAmount);
        }
      }

      return {
        currentRemainingBalance: currentRemaining,
        specificBillRemaining: specificBill,
        previousBalance: prevBal,
      };
    } catch {
      return { currentRemainingBalance: 0, specificBillRemaining: null, previousBalance: 0 };
    }
  }, [payment]);

  return createPortal(
    <div id="printable-vendor-voucher" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 printable-modal-overlay print:p-0 print:bg-white print:static">
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
          #printable-vendor-voucher {
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          #printable-vendor-voucher-card {
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
      <div id="printable-vendor-voucher-card" className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 printable-modal-card print:shadow-none print:border-none print:max-w-none">
        {/* Action Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white print:hidden">
          <span className="font-semibold text-xs">
            {isPurchase ? 'Vendor Purchase Bill Slip' : 'Vendor Payment Voucher'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thermal / Standard Slip Content */}
        <div className="p-6 text-slate-900 text-xs font-sans print:p-4 print:text-black">
          {/* Store Header */}
          <div className="text-center border-b border-dashed border-slate-400 print:border-black pb-3 mb-3">
            <h1 className="font-bold text-base uppercase tracking-tight text-slate-950 print:text-black">
              {storeSettings?.brandName || 'StockCore Retail & Wholesale'}
            </h1>
            {storeSettings?.address && (
              <p className="text-xs text-slate-800 print:text-black font-medium mt-0.5">{storeSettings.address}</p>
            )}
            {storeSettings?.phoneNumber && (
              <p className="text-xs text-slate-900 print:text-black font-bold">Tel: {storeSettings.phoneNumber}</p>
            )}
            <div className="mt-2 inline-block px-3 py-0.5 rounded-full bg-slate-100 print:bg-transparent text-slate-950 print:text-black font-bold text-xs uppercase tracking-wide border border-slate-300 print:border-black">
              {isPurchase ? 'Vendor Purchase Invoice' : 'Vendor Payment Receipt'}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-1.5 py-2 border-b border-dashed border-slate-400 print:border-black text-xs">
            <div className="flex justify-between">
              <span className="text-slate-800 print:text-black font-medium">Vendor / Supplier:</span>
              <span className="font-bold text-slate-950 print:text-black">{record.vendorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-800 print:text-black font-medium">Date:</span>
              <span className="font-bold text-slate-950 print:text-black">
                {record.date} {payment?.time ? `@ ${payment.time}` : ''}
              </span>
            </div>
            {isPurchase && purchase && (
              <div className="flex justify-between">
                <span className="text-slate-800 print:text-black font-medium">Bill / Invoice #:</span>
                <span className="font-mono font-bold text-slate-950 print:text-black">{purchase.billNumber}</span>
              </div>
            )}
            {!isPurchase && payment && (
              <div className="flex justify-between">
                <span className="text-slate-800 print:text-black font-medium">Voucher / Trx ID:</span>
                <span className="font-mono font-bold text-slate-950 print:text-black">
                  {payment.referenceNumber || payment.id}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-800 print:text-black font-medium">Payment Channel:</span>
              <span className="font-bold text-slate-950 print:text-black capitalize">
                {(purchase?.paymentMethod || payment?.paymentMethod || 'CASH').replace('_', ' ').toLowerCase()}
              </span>
            </div>
          </div>

          {/* Body */}
          {isPurchase && purchase && (
            <div className="py-3 border-b border-dashed border-slate-400 print:border-black">
              <span className="text-slate-900 print:text-black block text-xs uppercase font-bold mb-1">
                Items / Accessories Bought:
              </span>
              
              {purchase.items && purchase.items.length > 0 ? (
                <div className="mb-3 border border-slate-300 print:border-black rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 print:bg-transparent text-slate-950 print:text-black font-bold border-b border-slate-300 print:border-black">
                      <tr>
                        <th className="py-1 px-2">Item</th>
                        <th className="py-1 px-2 text-right">Cost</th>
                        <th className="py-1 px-2 text-center">Qty</th>
                        <th className="py-1 px-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 print:divide-black">
                      {purchase.items.map((item, i) => (
                        <tr key={i}>
                          <td className="py-1 px-2 font-bold text-slate-950 print:text-black">{item.itemName}</td>
                          <td className="py-1 px-2 text-right font-medium text-slate-900 print:text-black">{formatRs(item.costPrice)}</td>
                          <td className="py-1 px-2 text-center font-bold text-slate-950 print:text-black">{item.quantity}</td>
                          <td className="py-1 px-2 text-right font-bold text-slate-950 print:text-black">
                            {formatRs(item.costPrice * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="font-semibold text-slate-950 print:text-black bg-slate-50 print:bg-transparent p-2 rounded-md border border-slate-300 print:border-black">
                  {purchase.itemsDescription}
                </p>
              )}

              <div className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between font-bold text-slate-950 print:text-black">
                  <span>Actual Purchase Value:</span>
                  <span>{formatRs(purchase.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-950 print:text-black font-bold">
                  <span>Amount Paid Now:</span>
                  <span>{formatRs(purchase.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-950 print:text-black font-extrabold text-sm pt-1 border-t border-slate-300 print:border-black">
                  <span>Remaining Credit (Udhaar):</span>
                  <span>{formatRs(purchase.remainingAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {!isPurchase && payment && (
            <div className="py-3 border-b border-dashed border-slate-400 print:border-black space-y-2">
              {payment.billNumber && (
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-800 print:text-black font-medium">Against Bill #:</span>
                  <span className="font-mono font-bold text-slate-950 print:text-black">{payment.billNumber}</span>
                </div>
              )}
              {payment.notes && (
                <div className="mb-2 bg-slate-50 print:bg-transparent p-2 rounded-md text-xs text-slate-900 print:text-black font-medium border border-slate-300 print:border-black">
                  <span className="text-slate-900 print:text-black font-bold block text-xs">Notes:</span>
                  {payment.notes}
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                {/* Previous Balance if available */}
                {previousBalance > (Number(payment.amount) || 0) && (
                  <div className="flex justify-between text-xs text-slate-700 print:text-black font-medium">
                    <span>Previous Balance:</span>
                    <span className="font-mono font-bold text-slate-900 print:text-black">
                      {formatRs(previousBalance)}
                    </span>
                  </div>
                )}

                {/* Amount Paid */}
                <div className="flex justify-between text-sm sm:text-base font-extrabold text-slate-950 print:text-black py-0.5">
                  <span>Amount Paid:</span>
                  <span className="font-mono text-emerald-700 print:text-black font-black">
                    {formatRs(payment.amount)}
                  </span>
                </div>

                {/* Remaining Balance (Always shown right after Amount Paid) */}
                <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-950 print:text-black pt-1.5 border-t border-slate-300 print:border-black">
                  <span className="text-slate-900 print:text-black font-extrabold">Remaining Balance:</span>
                  <span className={`font-mono font-black ${
                    currentRemainingBalance > 0 ? 'text-amber-800 print:text-black' : 'text-emerald-700 print:text-black'
                  }`}>
                    {formatRs(currentRemainingBalance)}
                  </span>
                </div>

                {/* Linked Bill Remaining if specific bill is linked */}
                {specificBillRemaining !== null && (
                  <div className="flex justify-between text-[11px] text-slate-700 print:text-black font-medium pt-0.5">
                    <span>This Bill Remaining {payment.billNumber ? `(${payment.billNumber})` : ''}:</span>
                    <span className="font-mono font-bold text-slate-950 print:text-black">
                      {formatRs(specificBillRemaining)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="pt-6 grid grid-cols-2 gap-4 text-center text-xs text-slate-900 print:text-black font-semibold">
            <div>
              <div className="border-t border-slate-400 print:border-black pt-1">Authorized By</div>
            </div>
            <div>
              <div className="border-t border-slate-400 print:border-black pt-1">Vendor Signature</div>
            </div>
          </div>

          <div className="text-center text-xs font-medium text-slate-800 print:text-black mt-4">
            System generated computer voucher • Offline Stock System
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
