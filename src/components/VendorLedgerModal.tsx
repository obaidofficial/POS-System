import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Building2,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  ShoppingBag,
  Printer,
  Download,
  Share2,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { Vendor, VendorPurchase, VendorPayment, StoreSettings } from '../types';
import { formatRs } from '../utils/currency';

interface VendorLedgerModalProps {
  isOpen: boolean;
  vendor: Vendor | null;
  purchases: VendorPurchase[];
  payments: VendorPayment[];
  storeSettings?: StoreSettings;
  onClose: () => void;
  onRecordPurchase: (vendorId: string) => void;
  onRecordPayment: (vendorId: string) => void;
  onPrintVoucher?: (type: 'PURCHASE' | 'PAYMENT', record: VendorPurchase | VendorPayment) => void;
  onDeletePurchase?: (id: string, billNumber: string) => void;
  onDeletePayment?: (id: string) => void;
}

interface CombinedLedgerEntry {
  id: string;
  type: 'PURCHASE' | 'PAYMENT';
  date: string;
  time: string;
  sortTimestamp: number;
  description: string;
  billNumber?: string;
  method?: string;
  reference?: string;
  debit: number; // Purchase increases debt
  credit: number; // Payment decreases debt
  runningBalance: number;
  raw: VendorPurchase | VendorPayment;
}

export const VendorLedgerModal: React.FC<VendorLedgerModalProps> = ({
  isOpen,
  vendor,
  purchases,
  payments,
  storeSettings,
  onClose,
  onRecordPurchase,
  onRecordPayment,
  onPrintVoucher,
  onDeletePurchase,
  onDeletePayment,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'PURCHASES' | 'PAYMENTS'>('ALL');

  useEffect(() => {
    if (isOpen && vendor) {
      document.body.classList.add('print-modal-active');
      return () => {
        document.body.classList.remove('print-modal-active');
      };
    }
  }, [isOpen, vendor]);

  if (!isOpen || !vendor) return null;

  // Filter vendor-specific transactions
  const vendorPurchases = purchases.filter((p) => p.vendorId === vendor.id);
  const vendorPayments = payments.filter((p) => p.vendorId === vendor.id);

  // Combine and sort chronologically (oldest to newest for running balance)
  const allEvents: CombinedLedgerEntry[] = [];

  vendorPurchases.forEach((p) => {
    const ts = new Date(p.createdAt || `${p.date}T12:00:00Z`).getTime();
    allEvents.push({
      id: p.id,
      type: 'PURCHASE',
      date: p.date,
      time: p.createdAt ? new Date(p.createdAt).toTimeString().substring(0, 5) : '12:00',
      sortTimestamp: ts,
      description: p.itemsDescription,
      billNumber: p.billNumber,
      method: p.paymentMethod,
      reference: p.paymentRef,
      debit: p.totalAmount,
      credit: 0,
      runningBalance: 0,
      raw: p,
    });
  });

  vendorPayments.forEach((pay) => {
    const ts = new Date(pay.createdAt || `${pay.date}T${pay.time || '12:00'}:00Z`).getTime();
    allEvents.push({
      id: pay.id,
      type: 'PAYMENT',
      date: pay.date,
      time: pay.time || '12:00',
      sortTimestamp: ts,
      description: pay.notes || `Payment made via ${pay.paymentMethod}`,
      billNumber: pay.billNumber,
      method: pay.paymentMethod,
      reference: pay.referenceNumber,
      debit: 0,
      credit: pay.amount,
      runningBalance: 0,
      raw: pay,
    });
  });

  // Sort ascending by time to calculate accurate running balance
  allEvents.sort((a, b) => a.sortTimestamp - b.sortTimestamp);

  let currentBal = 0;
  for (const ev of allEvents) {
    currentBal += ev.debit;
    currentBal -= ev.credit;
    ev.runningBalance = currentBal;
  }

  // Then display newest first for the user interface
  const displayEvents = [...allEvents].reverse().filter((ev) => {
    if (filterType === 'PURCHASES') return ev.type === 'PURCHASE';
    if (filterType === 'PAYMENTS') return ev.type === 'PAYMENT';
    return true;
  });

  const exportCSV = () => {
    const headers = ['Date', 'Time', 'Type', 'Bill / Ref', 'Details', 'Debit (Purchase Rs)', 'Credit (Payment Rs)', 'Running Balance (Rs)'];
    const rows = allEvents.map((e) => [
      e.date,
      e.time,
      e.type === 'PURCHASE' ? 'PURCHASE BILL' : 'PAYMENT PAID',
      e.billNumber || e.reference || '-',
      `"${e.description.replace(/"/g, '""')}"`,
      e.debit || 0,
      e.credit || 0,
      e.runningBalance,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Khata_Statement_${vendor.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().substring(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppStatement = () => {
    const cleanPhone = vendor.phone.replace(/[^\d+]/g, '');
    const storeName = storeSettings?.brandName || 'Our Store';
    const text = encodeURIComponent(
      `*Khata Statement - ${storeName}*\n` +
      `Vendor: ${vendor.name}\n` +
      `Total Purchases Value: ${formatRs(vendor.totalBilled)}\n` +
      `Total Payments Made: ${formatRs(vendor.totalPaid)}\n` +
      `*Current Outstanding Balance (Payable): ${formatRs(vendor.currentBalance)}*\n\n` +
      `Generated on: ${new Date().toLocaleDateString('en-GB')}`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  return createPortal(
    <div id="printable-vendor-ledger" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 printable-modal-overlay print:p-0 print:bg-white print:static">
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
          #printable-vendor-ledger {
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          #printable-vendor-ledger-card {
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
      <div id="printable-vendor-ledger-card" className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] printable-modal-card print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:bg-transparent print:text-slate-900 print:border-b print:border-slate-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 print:text-slate-900">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{vendor.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-slate-700 print:hidden">
                  Vendor Ledger / Khata
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-3 mt-0.5 print:text-slate-600">
                {vendor.contactPerson && <span>Contact: {vendor.contactPerson}</span>}
                <span>Phone: {vendor.phone}</span>
                {vendor.city && <span>City: {vendor.city}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Print Statement"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={exportCSV}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Export CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Khata Summary Cards */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Total Purchased Value</span>
                <ShoppingBag className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-lg font-extrabold text-slate-900">
                {formatRs(vendor.totalBilled)}
              </p>
              <span className="text-[11px] text-slate-400">Total items/stock bought</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Total Paid So Far</span>
                <CreditCard className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-lg font-extrabold text-emerald-600">
                {formatRs(vendor.totalPaid)}
              </p>
              <span className="text-[11px] text-slate-400">Total payments made</span>
            </div>

            <div className={`p-3.5 rounded-xl border shadow-xs ${
              vendor.currentBalance > 0
                ? 'bg-amber-50/80 border-amber-200'
                : 'bg-emerald-50/80 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className={vendor.currentBalance > 0 ? 'text-amber-900' : 'text-emerald-900'}>
                  Current Outstanding (Udhaar)
                </span>
                <Receipt className={`w-4 h-4 ${vendor.currentBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
              </div>
              <p className={`text-xl font-extrabold ${vendor.currentBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatRs(vendor.currentBalance)}
              </p>
              <span className={`text-[11px] font-semibold ${vendor.currentBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {vendor.currentBalance > 0 ? 'Amount Payable' : 'All Dues Cleared (Nil)'}
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-lg text-xs">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  filterType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Entries ({allEvents.length})
              </button>
              <button
                onClick={() => setFilterType('PURCHASES')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  filterType === 'PURCHASES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Purchases Only ({vendorPurchases.length})
              </button>
              <button
                onClick={() => setFilterType('PAYMENTS')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  filterType === 'PAYMENTS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Payments Only ({vendorPayments.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleWhatsAppStatement}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp Statement</span>
              </button>
              <button
                onClick={() => onRecordPurchase(vendor.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Buy Items (Bill)</span>
              </button>
              <button
                onClick={() => onRecordPayment(vendor.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Pay Vendor</span>
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Transactions Table */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          {displayEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-slate-600">No Ledger Entries Found</p>
              <p className="text-xs text-slate-400 mt-1">
                Record a purchase bill or payment to populate this vendor's Khata ledger.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-base">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-800 font-bold uppercase text-sm tracking-wider">
                    <th className="py-3.5 px-4">Date / Time</th>
                    <th className="py-3.5 px-3">Type</th>
                    <th className="py-3.5 px-3">Bill / Ref #</th>
                    <th className="py-3.5 px-3">Details / Description</th>
                    <th className="py-3.5 px-3 text-right">Debit (+Debt)</th>
                    <th className="py-3.5 px-3 text-right">Credit (-Paid)</th>
                    <th className="py-3.5 px-4 text-right">Running Balance</th>
                    <th className="py-3.5 px-3 text-center print:hidden">Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayEvents.map((ev) => (
                    <tr key={`${ev.type}_${ev.id}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                        <div>{ev.date}</div>
                        <span className="text-[10px] text-slate-400">{ev.time}</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {ev.type === 'PURCHASE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] bg-amber-50 text-amber-800 border border-amber-200">
                            <ArrowDownLeft className="w-3 h-3 text-amber-600" />
                            Purchase Bill
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                            Payment Paid
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {ev.billNumber || ev.reference || '-'}
                      </td>

                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={ev.description}>
                        <div>{ev.description}</div>
                        {ev.method && (
                          <span className="text-[10px] text-slate-400 capitalize">
                            Method: {ev.method.replace('_', ' ').toLowerCase()}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-bold whitespace-nowrap text-amber-700">
                        {ev.debit > 0 ? formatRs(ev.debit) : '-'}
                      </td>

                      <td className="py-3 px-3 text-right font-bold whitespace-nowrap text-emerald-700">
                        {ev.credit > 0 ? formatRs(ev.credit) : '-'}
                      </td>

                      <td className="py-3 px-3 text-right font-bold whitespace-nowrap">
                        <span className={ev.runningBalance > 0 ? 'text-amber-800 font-extrabold' : 'text-emerald-700'}>
                          {formatRs(ev.runningBalance)}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          {onPrintVoucher && (
                            <button
                              onClick={() => onPrintVoucher(ev.type, ev.raw)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                              title="Print Voucher / Slip"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {ev.type === 'PURCHASE' && onDeletePurchase && (
                            <button
                              onClick={() => onDeletePurchase(ev.id, ev.billNumber || 'Bill')}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="Delete Purchase Bill"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {ev.type === 'PAYMENT' && onDeletePayment && (
                            <button
                              onClick={() => onDeletePayment(ev.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="Delete Payment Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 print:hidden">
          <span className="text-xs text-slate-500">
            Total Transactions: {displayEvents.length}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
