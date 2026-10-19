import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Receipt,
  Printer,
  Calendar,
  Phone,
  FileSpreadsheet,
  Trash2,
  Edit,
  ArrowUpRight,
  ArrowDownLeft,
  Share2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Vendor, VendorPurchase, VendorPayment, StoreSettings, InventoryItem } from '../types';
import { formatRs } from '../utils/currency';
import { BuyItemsPage } from './BuyItemsPage';
import { VendorModal } from './VendorModal';
import { VendorPurchaseModal } from './VendorPurchaseModal';
import { VendorPaymentModal } from './VendorPaymentModal';
import { VendorLedgerModal } from './VendorLedgerModal';
import { VendorVoucherModal } from './VendorVoucherModal';

interface VendorDashboardProps {
  vendors: Vendor[];
  purchases: VendorPurchase[];
  payments: VendorPayment[];
  inventoryItems?: InventoryItem[];
  storeSettings?: StoreSettings;
  onSaveVendor: (vendor: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt' | 'totalBilled' | 'totalPaid' | 'currentBalance'> & { id?: string }) => Promise<Vendor>;
  onDeleteVendor: (id: string) => Promise<boolean>;
  onSavePurchase: (purchase: Omit<VendorPurchase, 'id' | 'createdAt' | 'status' | 'remainingAmount'> & { id?: string }) => Promise<VendorPurchase>;
  onDeletePurchase: (id: string) => Promise<boolean>;
  onSavePayment: (payment: Omit<VendorPayment, 'id' | 'createdAt'> & { id?: string }) => Promise<VendorPayment>;
  onDeletePayment: (id: string) => Promise<boolean>;
  onRefresh: () => void;
}

type SubTab = 'VENDORS' | 'PURCHASES' | 'PAYMENTS';

export const VendorDashboard: React.FC<VendorDashboardProps> = ({
  vendors,
  purchases,
  payments,
  inventoryItems,
  storeSettings,
  onSaveVendor,
  onDeleteVendor,
  onSavePurchase,
  onDeletePurchase,
  onSavePayment,
  onDeletePayment,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('VENDORS');
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'BUY_ITEMS'>('DASHBOARD');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CLEARED'>('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Modals state
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseVendorId, setPurchaseVendorId] = useState<string | undefined>(undefined);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentVendorId, setPaymentVendorId] = useState<string | undefined>(undefined);
  const [paymentPurchaseId, setPaymentPurchaseId] = useState<string | undefined>(undefined);

  const [ledgerVendor, setLedgerVendor] = useState<Vendor | null>(null);

  const [voucherModal, setVoucherModal] = useState<{
    isOpen: boolean;
    type: 'PURCHASE' | 'PAYMENT';
    record: VendorPurchase | VendorPayment | null;
  }>({
    isOpen: false,
    type: 'PURCHASE',
    record: null,
  });

  // Custom In-App Deletion Confirmation State (avoids browser confirm() block inside iframe)
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'VENDOR' | 'PURCHASE' | 'PAYMENT';
    id: string;
    title: string;
    description: string;
    isDeleting: boolean;
  }>({
    isOpen: false,
    type: 'VENDOR',
    id: '',
    title: '',
    description: '',
    isDeleting: false,
  });

  // Calculate high-level aggregates
  const totalPurchasesValue = useMemo(() => {
    return purchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  }, [purchases]);

  const totalPaymentsMade = useMemo(() => {
    return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const totalRemainingPayables = useMemo(() => {
    return vendors.reduce((sum, v) => sum + Math.max(0, Number(v.currentBalance) || 0), 0);
  }, [vendors]);

  const vendorsWithUdhaar = useMemo(() => {
    return vendors.filter((v) => v.currentBalance > 0);
  }, [vendors]);

  const clearedVendorsCount = vendors.length - vendorsWithUdhaar.length;

  // Filtered Vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchSearch =
        !searchQuery ||
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.phone.includes(searchQuery) ||
        (v.contactPerson && v.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.city && v.city.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && v.currentBalance > 0) ||
        (statusFilter === 'CLEARED' && v.currentBalance <= 0);

      return matchSearch && matchStatus;
    });
  }, [vendors, searchQuery, statusFilter]);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchVendor = !vendorFilter || p.vendorId === vendorFilter;
      const matchDate = !dateFilter || p.date === dateFilter;
      const matchSearch =
        !searchQuery ||
        p.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.itemsDescription.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && p.remainingAmount > 0) ||
        (statusFilter === 'CLEARED' && p.remainingAmount <= 0);

      return matchVendor && matchDate && matchSearch && matchStatus;
    });
  }, [purchases, vendorFilter, dateFilter, searchQuery, statusFilter]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((pay) => {
      const matchVendor = !vendorFilter || pay.vendorId === vendorFilter;
      const matchDate = !dateFilter || pay.date === dateFilter;
      const matchSearch =
        !searchQuery ||
        pay.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pay.referenceNumber && pay.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (pay.notes && pay.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchVendor && matchDate && matchSearch;
    });
  }, [payments, vendorFilter, dateFilter, searchQuery]);

  const handleOpenLedger = (v: Vendor) => {
    setLedgerVendor(v);
  };

  const handleQuickBuy = (vendorId?: string) => {
    setPurchaseVendorId(vendorId);
    setViewMode('BUY_ITEMS');
  };

  const handleQuickPay = (vendorId?: string, purchaseId?: string) => {
    setPaymentVendorId(vendorId);
    setPaymentPurchaseId(purchaseId);
    setIsPaymentModalOpen(true);
  };

  const handleDeleteVendorPrompt = (id: string, name: string) => {
    setDeleteDialog({
      isOpen: true,
      type: 'VENDOR',
      id,
      title: `Delete Vendor "${name}"?`,
      description: `Are you sure you want to permanently delete vendor "${name}"? All their associated purchase bills, transaction ledger, and payment history will be removed and balances updated.`,
      isDeleting: false,
    });
  };

  const handleDeletePurchasePrompt = (id: string, billNumber: string) => {
    setDeleteDialog({
      isOpen: true,
      type: 'PURCHASE',
      id,
      title: `Delete Purchase Bill "${billNumber}"?`,
      description: `Are you sure you want to delete purchase bill "${billNumber}"? The vendor's outstanding credit balance and purchase history will be automatically recalculated.`,
      isDeleting: false,
    });
  };

  const handleDeletePaymentPrompt = (id: string) => {
    setDeleteDialog({
      isOpen: true,
      type: 'PAYMENT',
      id,
      title: 'Delete Payment Record?',
      description: 'Are you sure you want to delete this payment record? The vendor balance will be adjusted accordingly.',
      isDeleting: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));
      if (deleteDialog.type === 'VENDOR') {
        await onDeleteVendor(deleteDialog.id);
        if (ledgerVendor && ledgerVendor.id === deleteDialog.id) {
          setLedgerVendor(null);
        }
      } else if (deleteDialog.type === 'PURCHASE') {
        await onDeletePurchase(deleteDialog.id);
      } else if (deleteDialog.type === 'PAYMENT') {
        await onDeletePayment(deleteDialog.id);
      }
      onRefresh();
      setDeleteDialog({
        isOpen: false,
        type: 'VENDOR',
        id: '',
        title: '',
        description: '',
        isDeleting: false,
      });
    } catch (err) {
      console.error('Failed to execute deletion:', err);
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleCancelDelete = () => {
    if (deleteDialog.isDeleting) return;
    setDeleteDialog({
      isOpen: false,
      type: 'VENDOR',
      id: '',
      title: '',
      description: '',
      isDeleting: false,
    });
  };

  const exportPurchasesCSV = () => {
    const headers = ['Date', 'Bill #', 'Vendor Name', 'Items Description', 'Total Value (Rs)', 'Paid Amount (Rs)', 'Remaining Balance (Rs)', 'Status', 'Payment Method'];
    const rows = filteredPurchases.map((p) => [
      p.date,
      p.billNumber,
      `"${p.vendorName.replace(/"/g, '""')}"`,
      `"${p.itemsDescription.replace(/"/g, '""')}"`,
      p.totalAmount,
      p.paidAmount,
      p.remainingAmount,
      p.status,
      p.paymentMethod || 'CASH',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Vendor_Purchases_${new Date().toISOString().substring(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPaymentsCSV = () => {
    const headers = ['Date', 'Time', 'Vendor Name', 'Amount Paid (Rs)', 'Channel', 'Reference #', 'Bill #', 'Remarks'];
    const rows = filteredPayments.map((p) => [
      p.date,
      p.time || '12:00',
      `"${p.vendorName.replace(/"/g, '""')}"`,
      p.amount,
      p.paymentMethod,
      p.referenceNumber || '-',
      p.billNumber || '-',
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Vendor_Payment_History_${new Date().toISOString().substring(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (viewMode === 'BUY_ITEMS') {
    return (
      <BuyItemsPage
        vendors={vendors}
        initialVendorId={purchaseVendorId}
        inventoryItems={inventoryItems}
        onBack={() => {
          setViewMode('DASHBOARD');
          setPurchaseVendorId(undefined);
        }}
        onSaved={async (purData) => {
          await onSavePurchase(purData);
          onRefresh();
          setViewMode('DASHBOARD');
          setPurchaseVendorId(undefined);
          setSuccessBanner(
            `Successfully recorded purchase bill "${purData.billNumber}" from ${purData.vendorName} (${purData.items.length} items)! Stock inventory and vendor Khata updated.`
          );
          setTimeout(() => setSuccessBanner(null), 6000);
        }}
        onSaveVendor={onSaveVendor}
        onAddNewVendorClick={() => {
          setVendorToEdit(null);
          setIsVendorModalOpen(true);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 font-semibold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
      {/* Header and Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Vendor Khata &amp; Credit Management</h1>
            <span className="text-slate-400 font-normal">·</span>
            <span className="text-xs font-semibold text-amber-700">
              Purchases &amp; Udhaar
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track accessories/items purchased from vendors, upfront payments, remaining credit balances, and payment history.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleQuickBuy()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>+ Buy Items / Bill</span>
          </button>

          <button
            onClick={() => handleQuickPay()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>+ Pay Vendor</span>
          </button>

          <button
            onClick={() => {
              setVendorToEdit(null);
              setIsVendorModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Vendor</span>
          </button>
        </div>
      </div>

      {/* Top Aggregate Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2 font-bold uppercase tracking-wider">
            <span>Total Purchases Value</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-slate-900">
            {formatRs(totalPurchasesValue)}
          </p>
          <span className="text-sm text-slate-500 mt-1 block">
            {purchases.length} total purchase bill{purchases.length === 1 ? '' : 's'} recorded
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2 font-bold uppercase tracking-wider">
            <span>Total Paid to Vendors</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-emerald-600">
            {formatRs(totalPaymentsMade)}
          </p>
          <span className="text-sm text-slate-500 mt-1 block">
            {payments.length} payment transaction{payments.length === 1 ? '' : 's'} logged
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200/90 bg-amber-50/30 shadow-xs">
          <div className="flex items-center justify-between text-sm font-bold text-amber-800 mb-2 uppercase tracking-wider">
            <span>Remaining Credit (Total Udhaar)</span>
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-amber-600">
            {formatRs(totalRemainingPayables)}
          </p>
          <span className="text-sm font-semibold text-amber-800 mt-1 block">
            Payable to {vendorsWithUdhaar.length} vendor{vendorsWithUdhaar.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2 font-bold uppercase tracking-wider">
            <span>Registered Vendors</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-slate-900">{vendors.length}</p>
          <span className="text-sm text-slate-600 mt-1 block">
            <span className="text-emerald-700 font-bold">{clearedVendorsCount} clear</span>
            <span aria-hidden="true" className="text-slate-300 mx-1.5">·</span>
            <span className="text-amber-700 font-bold">{vendorsWithUdhaar.length} with balance</span>
          </span>
        </div>
      </div>

      {/* Main Container with Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 pt-3 pb-0 bg-slate-50/60 overflow-x-auto">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveSubTab('VENDORS')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeSubTab === 'VENDORS'
                  ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Vendors & Khata Ledgers</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {vendors.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('PURCHASES')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeSubTab === 'PURCHASES'
                  ? 'border-amber-600 text-amber-600 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Purchase Bills Register</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {purchases.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('PAYMENTS')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeSubTab === 'PAYMENTS'
                  ? 'border-emerald-600 text-emerald-600 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Payment History Register ("When & How Much Paid")</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {payments.length}
              </span>
            </button>
          </div>

          {/* Quick Export for active tab */}
          <div className="pb-2">
            {activeSubTab === 'PURCHASES' && (
              <button
                onClick={exportPurchasesCSV}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 rounded-md border border-slate-300 shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Export Bills CSV</span>
              </button>
            )}
            {activeSubTab === 'PAYMENTS' && (
              <button
                onClick={exportPaymentsCSV}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 rounded-md border border-slate-300 shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Export Payments CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeSubTab === 'VENDORS'
                    ? 'Search by vendor name, contact person, phone, city...'
                    : activeSubTab === 'PURCHASES'
                    ? 'Search by bill #, vendor name, accessories/items...'
                    : 'Search by vendor, reference #, remarks...'
                }
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Vendor Filter (for Purchases and Payments tabs) */}
            {activeSubTab !== 'VENDORS' && (
              <div className="w-full sm:w-56">
                <select
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Vendors</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Filter */}
            {activeSubTab !== 'PAYMENTS' && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs w-full sm:w-auto">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors ${
                    statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('PENDING')}
                  className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors ${
                    statusFilter === 'PENDING' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Pending Udhaar
                </button>
                <button
                  onClick={() => setStatusFilter('CLEARED')}
                  className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors ${
                    statusFilter === 'CLEARED' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Nil / Cleared
                </button>
              </div>
            )}

            {/* Date filter (for Purchases and Payments tabs) */}
            {activeSubTab !== 'VENDORS' && (
              <div className="w-full sm:w-auto flex items-center gap-1">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                {dateFilter && (
                  <button
                    onClick={() => setDateFilter('')}
                    className="p-1.5 text-xs text-slate-400 hover:text-slate-700"
                    title="Clear date"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* TAB 1: VENDORS & KHATA LEDGERS */}
        {activeSubTab === 'VENDORS' && (
          <div className="p-4 sm:p-6">
            {filteredVendors.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-slate-600">No Vendors Found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Add a vendor or adjust your search filter to see results.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredVendors.map((vendor) => {
                  const hasUdhaar = vendor.currentBalance > 0;
                  const cleanPhone = vendor.phone.replace(/[^\d+]/g, '');

                  return (
                    <div
                      key={vendor.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Vendor Name & Status Badge */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-bold text-base text-slate-950 line-clamp-1" title={vendor.name}>
                              {vendor.name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">
                              {vendor.contactPerson ? `${vendor.contactPerson} • ` : ''}
                              {vendor.city || 'Market Vendor'}
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-bold shrink-0 ${
                              hasUdhaar
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}
                          >
                            {hasUdhaar ? 'Udhaar Pending' : 'All Clear'}
                          </span>
                        </div>

                        {/* Balance Card */}
                        <div className="my-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-sm">
                          <div className="flex justify-between text-slate-600">
                            <span>Total Billed:</span>
                            <span className="font-bold font-mono text-slate-900">{formatRs(vendor.totalBilled)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-800">
                            <span>Total Paid:</span>
                            <span className="font-bold font-mono text-emerald-700">{formatRs(vendor.totalPaid)}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-extrabold">
                            <span className="text-slate-900 text-sm">Remaining Udhaar:</span>
                            <span className={hasUdhaar ? 'text-amber-600 font-mono text-base sm:text-lg font-black' : 'text-emerald-700 font-mono text-base font-bold'}>
                              {formatRs(vendor.currentBalance)}
                            </span>
                          </div>
                        </div>

                        {/* Contact details */}
                        <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="font-mono">{vendor.phone}</span>
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-auto text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                            >
                              <span>WhatsApp</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          {vendor.notes && (
                            <p className="text-slate-400 italic line-clamp-1 mt-1" title={vendor.notes}>
                              "{vendor.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleQuickBuy(vendor.id)}
                            className="w-full py-2 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs sm:text-sm rounded-xl border border-amber-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <ShoppingBag className="w-4 h-4" />
                            <span>+ Buy Items</span>
                          </button>
                          <button
                            onClick={() => handleQuickPay(vendor.id)}
                            className="w-full py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs sm:text-sm rounded-xl border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>+ Pay Vendor</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => handleOpenLedger(vendor)}
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                          >
                            <Receipt className="w-4 h-4" />
                            <span>View Khata Ledger</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setVendorToEdit(vendor);
                                setIsVendorModalOpen(true);
                              }}
                              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Vendor"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVendorPrompt(vendor.id, vendor.name)}
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Vendor"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PURCHASE BILLS REGISTER */}
        {activeSubTab === 'PURCHASES' && (
          <div className="overflow-x-auto">
            {filteredPurchases.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-slate-600">No Purchase Bills Found</p>
                <p className="text-xs text-slate-400 mt-1 mb-3">
                  Click "+ Buy Items / Bill" to record a purchase from a vendor.
                </p>
                <button
                  type="button"
                  onClick={() => handleQuickBuy()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>+ Buy Items / Bill</span>
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-base">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-800 font-bold uppercase text-sm tracking-wider">
                    <th className="py-4 px-4">Date</th>
                    <th className="py-4 px-4">Bill #</th>
                    <th className="py-4 px-4">Vendor / Supplier</th>
                    <th className="py-4 px-4">Accessories / Items Bought</th>
                    <th className="py-4 px-4 text-right">Actual Value</th>
                    <th className="py-4 px-4 text-right">Paid Now</th>
                    <th className="py-4 px-4 text-right">Remaining (Udhaar)</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-base">
                  {filteredPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4 whitespace-nowrap font-medium text-slate-800 font-mono">
                        {p.date}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap font-mono font-bold text-slate-900">
                        {p.billNumber}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap font-bold text-slate-950">
                        {p.vendorName}
                      </td>

                      <td className="py-4 px-4 text-slate-700 max-w-xs truncate font-medium" title={p.itemsDescription}>
                        {p.itemsDescription}
                      </td>

                      <td className="py-4 px-4 text-right font-black font-mono tabular-nums text-slate-950 whitespace-nowrap text-base sm:text-lg">
                        {formatRs(p.totalAmount)}
                      </td>

                      <td className="py-4 px-4 text-right font-black font-mono tabular-nums text-emerald-700 whitespace-nowrap text-base sm:text-lg">
                        {formatRs(p.paidAmount)}
                      </td>

                      <td className="py-4 px-4 text-right font-black font-mono tabular-nums text-base sm:text-lg">
                        <span className={p.remainingAmount > 0 ? 'text-amber-600' : 'text-emerald-700'}>
                          {formatRs(p.remainingAmount)}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                            p.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {p.status === 'PAID' ? 'Fully Paid' : p.status === 'PARTIAL' ? 'Partial Credit' : 'Full Udhaar'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {p.remainingAmount > 0 && (
                            <button
                              onClick={() => handleQuickPay(p.vendorId, p.id)}
                              className="px-2.5 py-1 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
                              title="Pay remaining bill balance"
                            >
                              Pay
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setVoucherModal({
                                isOpen: true,
                                type: 'PURCHASE',
                                record: p,
                              })
                            }
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Print Purchase Slip"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePurchasePrompt(p.id, p.billNumber)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Purchase Bill"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 3: PAYMENT HISTORY REGISTER ("WHEN AND HOW MUCH I PAID") */}
        {activeSubTab === 'PAYMENTS' && (
          <div className="overflow-x-auto">
            {filteredPayments.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-slate-600">No Payment Records Found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click "+ Pay Vendor" to record when and how much you paid to a vendor.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-base">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-800 font-bold uppercase text-sm tracking-wider">
                    <th className="py-4 px-4">When (Date & Time)</th>
                    <th className="py-4 px-4">Vendor Name</th>
                    <th className="py-4 px-4 text-right">How Much Paid</th>
                    <th className="py-4 px-4">Payment Channel</th>
                    <th className="py-4 px-4">Reference / Trx ID</th>
                    <th className="py-4 px-4">Bill Linked</th>
                    <th className="py-4 px-4">Remarks / Notes</th>
                    <th className="py-4 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-base">
                  {filteredPayments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4 whitespace-nowrap font-medium text-slate-800 font-mono">
                        <div>{pay.date}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{pay.time || '12:00'}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap font-bold text-slate-950">
                        {pay.vendorName}
                      </td>

                      <td className="py-4 px-4 text-right font-black text-emerald-700 whitespace-nowrap font-mono tabular-nums text-base sm:text-lg">
                        {formatRs(pay.amount)}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 capitalize">
                          {pay.paymentMethod.replace('_', ' ').toLowerCase()}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap font-mono text-slate-700 font-semibold">
                        {pay.referenceNumber || '-'}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap font-mono text-slate-600">
                        {pay.billNumber || 'General Khata'}
                      </td>

                      <td className="py-4 px-4 text-slate-700 max-w-xs truncate font-medium" title={pay.notes}>
                        {pay.notes || '-'}
                      </td>

                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              setVoucherModal({
                                isOpen: true,
                                type: 'PAYMENT',
                                record: pay,
                              })
                            }
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Print Payment Voucher"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePaymentPrompt(pay.id)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Payment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Vendor Profile Modal */}
      <VendorModal
        isOpen={isVendorModalOpen}
        vendorToEdit={vendorToEdit}
        onClose={() => {
          setIsVendorModalOpen(false);
          setVendorToEdit(null);
        }}
        onSaved={async (vData) => {
          await onSaveVendor(vData);
          onRefresh();
        }}
      />

      {/* Record Purchase Modal */}
      <VendorPurchaseModal
        isOpen={isPurchaseModalOpen}
        vendors={vendors}
        initialVendorId={purchaseVendorId}
        inventoryItems={inventoryItems}
        onClose={() => {
          setIsPurchaseModalOpen(false);
          setPurchaseVendorId(undefined);
        }}
        onSaved={async (purData) => {
          await onSavePurchase(purData);
          onRefresh();
        }}
        onSaveVendor={onSaveVendor}
        onAddNewVendorClick={() => {
          setIsPurchaseModalOpen(false);
          setVendorToEdit(null);
          setIsVendorModalOpen(true);
        }}
      />

      {/* Record Payment Modal */}
      <VendorPaymentModal
        isOpen={isPaymentModalOpen}
        vendors={vendors}
        purchases={purchases}
        initialVendorId={paymentVendorId}
        initialPurchaseId={paymentPurchaseId}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentVendorId(undefined);
          setPaymentPurchaseId(undefined);
        }}
        onSaved={async (payData) => {
          await onSavePayment(payData);
          onRefresh();
        }}
      />

      {/* Detailed Khata Ledger Statement Modal */}
      {ledgerVendor && (
        <VendorLedgerModal
          isOpen={Boolean(ledgerVendor)}
          vendor={ledgerVendor}
          purchases={purchases}
          payments={payments}
          storeSettings={storeSettings}
          onClose={() => setLedgerVendor(null)}
          onRecordPurchase={(vId) => {
            setLedgerVendor(null);
            handleQuickBuy(vId);
          }}
          onRecordPayment={(vId) => {
            setLedgerVendor(null);
            handleQuickPay(vId);
          }}
          onPrintVoucher={(type, rec) => {
            setVoucherModal({
              isOpen: true,
              type,
              record: rec,
            });
          }}
          onDeletePurchase={handleDeletePurchasePrompt}
          onDeletePayment={handleDeletePaymentPrompt}
        />
      )}

      {/* Printable Slip Voucher Modal */}
      {voucherModal.isOpen && voucherModal.record && (
        <VendorVoucherModal
          isOpen={voucherModal.isOpen}
          type={voucherModal.type}
          record={voucherModal.record}
          storeSettings={storeSettings}
          onClose={() => setVoucherModal({ isOpen: false, type: 'PURCHASE', record: null })}
        />
      )}

      {/* In-App Delete Confirmation Modal (Reliable, fast, immune to iframe alert/confirm blocking) */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{deleteDialog.title}</h3>
                <p className="text-[11px] text-slate-400 font-medium">Permanent Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {deleteDialog.description}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={deleteDialog.isDeleting}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteDialog.isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteDialog.isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
