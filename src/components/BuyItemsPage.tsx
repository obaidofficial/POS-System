import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  ShoppingBag,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  Check,
  Trash2,
  Copy,
  Package,
  Sparkles,
  Save,
  RotateCcw,
  Tag,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Receipt,
  UserPlus,
  X,
} from 'lucide-react';
import {
  Vendor,
  VendorPurchase,
  VendorPurchaseItem,
  VendorPaymentMethod,
  InventoryItem,
} from '../types';
import { storage } from '../services/storage';
import { formatPKR, formatRs } from '../utils/currency';

export interface PurchaseItemRow {
  id: string;
  inventoryItemId?: string;
  itemName: string;
  sku?: string;
  currentStock?: number;
  unit?: string;
  costPrice: number | '';
  salePrice: number | '';
  quantity: number | '';
  isExistingItem?: boolean;
}

interface BuyItemsPageProps {
  vendors: Vendor[];
  initialVendorId?: string;
  inventoryItems?: InventoryItem[];
  onBack: () => void;
  onSaved: (
    purchase: Omit<VendorPurchase, 'id' | 'createdAt' | 'status' | 'remainingAmount'> & {
      id?: string;
    }
  ) => Promise<void>;
  onSaveVendor?: (
    vendor: Omit<
      Vendor,
      'id' | 'createdAt' | 'updatedAt' | 'totalBilled' | 'totalPaid' | 'currentBalance'
    > & { id?: string }
  ) => Promise<Vendor>;
  onAddNewVendorClick?: () => void;
}

export const BuyItemsPage: React.FC<BuyItemsPageProps> = ({
  vendors,
  initialVendorId,
  inventoryItems: propInventoryItems,
  onBack,
  onSaved,
  onSaveVendor,
  onAddNewVendorClick,
}) => {
  // Vendor search & select state
  const [selectedVendorId, setSelectedVendorId] = useState<string>(initialVendorId || '');
  const [vendorSearchInput, setVendorSearchInput] = useState<string>('');
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);
  const vendorInputContainerRef = useRef<HTMLDivElement>(null);

  // Quick New Vendor modal within page (so user never loses typed bill data!)
  const [isQuickVendorModalOpen, setIsQuickVendorModalOpen] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({
    name: '',
    phone: '',
    city: '',
    address: '',
    notes: '',
  });
  const [isSavingVendor, setIsSavingVendor] = useState(false);

  // Bill metadata
  const [billNumber, setBillNumber] = useState<string>(
    () => `BILL-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [date, setDate] = useState<string>(() => new Date().toISOString().substring(0, 10));

  // Inventory items for autocomplete lookup
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);

  // Item Repeater Rows
  const [rows, setRows] = useState<PurchaseItemRow[]>([
    {
      id: `row_1_${Date.now()}`,
      itemName: '',
      costPrice: '',
      salePrice: '',
      quantity: 1,
      isExistingItem: false,
    },
    {
      id: `row_2_${Date.now()}`,
      itemName: '',
      costPrice: '',
      salePrice: '',
      quantity: 1,
      isExistingItem: false,
    },
    {
      id: `row_3_${Date.now()}`,
      itemName: '',
      costPrice: '',
      salePrice: '',
      quantity: 1,
      isExistingItem: false,
    },
  ]);

  // Which row currently has its Item Name autocomplete dropdown open
  const [activeItemDropdownRowId, setActiveItemDropdownRowId] = useState<string | null>(null);
  const repeaterTableRef = useRef<HTMLDivElement>(null);

  // Financial fields
  const [paidAmount, setPaidAmount] = useState<number | ''>(0);
  const [paymentMethod, setPaymentMethod] = useState<VendorPaymentMethod>('CASH');
  const [paymentRef, setPaymentRef] = useState('Counter Cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Success message toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize available inventory items and pre-selected vendor
  useEffect(() => {
    const itemsList =
      propInventoryItems && propInventoryItems.length > 0
        ? propInventoryItems
        : storage.getItems();
    setAvailableItems(itemsList);

    if (initialVendorId) {
      const match = vendors.find((v) => v.id === initialVendorId);
      if (match) {
        setSelectedVendorId(match.id);
        setVendorSearchInput(match.name);
      }
    }
  }, [initialVendorId, vendors, propInventoryItems]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        vendorInputContainerRef.current &&
        !vendorInputContainerRef.current.contains(e.target as Node)
      ) {
        setIsVendorDropdownOpen(false);
      }
      if (
        repeaterTableRef.current &&
        !repeaterTableRef.current.contains(e.target as Node)
      ) {
        setActiveItemDropdownRowId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter vendors by search input
  const trimmedVendorInput = vendorSearchInput.trim().toLowerCase();
  const filteredVendors = useMemo(() => {
    if (!trimmedVendorInput) return vendors.slice(0, 8);
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(trimmedVendorInput) ||
        (v.city && v.city.toLowerCase().includes(trimmedVendorInput)) ||
        (v.contactPerson && v.contactPerson.toLowerCase().includes(trimmedVendorInput)) ||
        (v.phone && v.phone.includes(trimmedVendorInput))
    );
  }, [vendors, trimmedVendorInput]);

  const selectedVendor = useMemo(
    () => vendors.find((v) => v.id === selectedVendorId),
    [vendors, selectedVendorId]
  );

  // Calculations for Summary
  const summary = useMemo(() => {
    let totalItemsCount = 0;
    let totalUnits = 0;
    let totalActualValue = 0;

    rows.forEach((row) => {
      if (row.itemName.trim()) {
        totalItemsCount += 1;
        const qty = Number(row.quantity) || 0;
        const cp = Number(row.costPrice) || 0;
        totalUnits += qty;
        totalActualValue += cp * qty;
      }
    });

    const numPaid = Number(paidAmount) || 0;
    const remainingCreditUdhaar = Math.max(0, totalActualValue - numPaid);

    return {
      totalItemsCount,
      totalUnits,
      totalActualValue,
      numPaid,
      remainingCreditUdhaar,
    };
  }, [rows, paidAmount]);

  // Quick preset for paid amount
  const setPresetPaid = (ratio: number) => {
    if (!summary.totalActualValue) return;
    setPaidAmount(Math.round(summary.totalActualValue * ratio));
  };

  // Vendor selection handlers
  const handleSelectVendor = (vendor: Vendor) => {
    setSelectedVendorId(vendor.id);
    setVendorSearchInput(vendor.name);
    setIsVendorDropdownOpen(false);
    setError('');
  };

  const handleClearVendor = () => {
    setSelectedVendorId('');
    setVendorSearchInput('');
    setIsVendorDropdownOpen(false);
  };

  // Row Manipulation Handlers
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        itemName: '',
        costPrice: '',
        salePrice: '',
        quantity: 1,
        isExistingItem: false,
      },
    ]);
  };

  const handleAddMultipleRows = (count: number = 5) => {
    const newRows: PurchaseItemRow[] = [];
    for (let i = 0; i < count; i++) {
      newRows.push({
        id: `row_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        itemName: '',
        costPrice: '',
        salePrice: '',
        quantity: 1,
        isExistingItem: false,
      });
    }
    setRows((prev) => [...prev, ...newRows]);
  };

  const handleDuplicateRow = (rowId: string) => {
    const target = rows.find((r) => r.id === rowId);
    if (!target) return;
    const targetIdx = rows.findIndex((r) => r.id === rowId);
    const cloned: PurchaseItemRow = {
      ...target,
      id: `row_${Date.now()}_clone_${Math.random().toString(36).substring(2, 6)}`,
    };
    const updated = [...rows];
    updated.splice(targetIdx + 1, 0, cloned);
    setRows(updated);
  };

  const handleRemoveRow = (rowId: string) => {
    if (rows.length <= 1) {
      setRows([
        {
          id: `row_${Date.now()}`,
          itemName: '',
          costPrice: '',
          salePrice: '',
          quantity: 1,
          isExistingItem: false,
        },
      ]);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleClearEmptyRows = () => {
    const valid = rows.filter((r) => r.itemName.trim().length > 0);
    if (valid.length === 0) {
      setRows([
        {
          id: `row_${Date.now()}`,
          itemName: '',
          costPrice: '',
          salePrice: '',
          quantity: 1,
          isExistingItem: false,
        },
      ]);
    } else {
      setRows(valid);
    }
  };

  const handleUpdateRow = (rowId: string, field: keyof PurchaseItemRow, val: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r, [field]: val };
        // If user changed the name manually and it doesn't match selected item
        if (field === 'itemName') {
          if (r.isExistingItem && r.itemName !== val) {
            updated.isExistingItem = false;
            updated.inventoryItemId = undefined;
            updated.currentStock = undefined;
            updated.sku = undefined;
          }
        }
        return updated;
      })
    );
  };

  const handleSelectInventoryItem = (rowId: string, item: InventoryItem) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          inventoryItemId: item.id,
          itemName: item.name,
          costPrice: item.costPrice,
          salePrice: item.sellingPrice,
          isExistingItem: true,
          currentStock: item.currentStock,
          unit: item.unit,
          sku: item.sku,
        };
      })
    );
    setActiveItemDropdownRowId(null);
    setError('');
  };

  // Quick markup calculation helper (e.g. +30% retail margin)
  const handleApplyMarkup = (rowId: string, percentage: number) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row || !row.costPrice) return;
    const cp = Number(row.costPrice);
    const sp = Math.round(cp * (1 + percentage / 100));
    handleUpdateRow(rowId, 'salePrice', sp);
  };

  // Handle Quick Add Vendor Save
  const handleSaveQuickVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorForm.name.trim()) return;

    try {
      setIsSavingVendor(true);
      let createdVendor: Vendor | null = null;
      if (onSaveVendor) {
        createdVendor = await onSaveVendor({
          name: newVendorForm.name.trim(),
          phone: newVendorForm.phone.trim() || 'Not provided',
          city: newVendorForm.city.trim() || 'General',
          address: newVendorForm.address.trim() || '',
          notes: newVendorForm.notes.trim() || '',
        });
      } else {
        createdVendor = await storage.saveVendor({
          name: newVendorForm.name.trim(),
          phone: newVendorForm.phone.trim() || 'Not provided',
          city: newVendorForm.city.trim() || 'General',
          address: newVendorForm.address.trim() || '',
          notes: newVendorForm.notes.trim() || '',
        });
      }

      if (createdVendor) {
        setSelectedVendorId(createdVendor.id);
        setVendorSearchInput(createdVendor.name);
        setToastMessage(`Vendor "${createdVendor.name}" created and selected!`);
        setTimeout(() => setToastMessage(null), 4000);
      }

      setIsQuickVendorModalOpen(false);
      setNewVendorForm({ name: '', phone: '', city: '', address: '', notes: '' });
    } catch (err: any) {
      console.error('Failed to create vendor:', err);
      setError(err?.message || 'Failed to create vendor');
    } finally {
      setIsSavingVendor(false);
    }
  };

  // Form Submission
  const handleSavePurchaseBill = async () => {
    const finalVendorName = vendorSearchInput.trim();
    if (!finalVendorName) {
      setError('Please type or select a vendor / supplier name');
      return;
    }

    // Filter rows with item name
    const validRows = rows.filter((r) => r.itemName.trim().length > 0);
    if (validRows.length === 0) {
      setError('Please add at least one item/accessory in the purchase bill.');
      return;
    }

    // Validate each row
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const cp = Number(row.costPrice);
      const qty = Number(row.quantity);

      if (row.itemName.trim().length < 2) {
        setError(`Row #${i + 1}: Item name is too short.`);
        return;
      }
      if (!cp || cp <= 0) {
        setError(`Row #${i + 1} ("${row.itemName}"): Cost Price must be greater than Rs. 0.`);
        return;
      }
      if (!qty || qty <= 0) {
        setError(`Row #${i + 1} ("${row.itemName}"): Quantity must be at least 1.`);
        return;
      }
    }

    if (summary.totalActualValue <= 0) {
      setError('Total actual purchase value must be greater than Rs. 0.');
      return;
    }

    if (summary.numPaid < 0) {
      setError('Paid amount cannot be negative');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      let targetVendorId = selectedVendorId;

      // If vendor not explicitly chosen from saved list, check if exact name exists or create one
      if (!targetVendorId) {
        const matched = vendors.find(
          (v) => v.name.toLowerCase() === finalVendorName.toLowerCase()
        );
        if (matched) {
          targetVendorId = matched.id;
        } else if (onSaveVendor) {
          const created = await onSaveVendor({
            name: finalVendorName,
            phone: 'Not provided',
            city: 'General',
            address: 'Added from purchase bill',
            notes: `Auto-registered via Purchase Bill ${billNumber}`,
          });
          if (created && created.id) {
            targetVendorId = created.id;
          }
        }
      }

      // Format purchase items
      const formattedItems: VendorPurchaseItem[] = validRows.map((r) => {
        const cp = Number(r.costPrice) || 0;
        const sp = Number(r.salePrice) || Math.round(cp * 1.3);
        const qty = Number(r.quantity) || 1;
        return {
          itemId: r.inventoryItemId,
          itemName: r.itemName.trim(),
          costPrice: cp,
          salePrice: sp,
          quantity: qty,
          totalCost: cp * qty,
          isNewItem: !r.isExistingItem,
        };
      });

      const generatedSummary = formattedItems
        .map((it) => `${it.itemName} (${it.quantity} pcs @ ${formatRs(it.costPrice)})`)
        .join(', ');

      await onSaved({
        vendorId: targetVendorId || `vendor_${Date.now()}`,
        vendorName: finalVendorName,
        billNumber: billNumber.trim() || `BILL-${Date.now()}`,
        date,
        itemsDescription: generatedSummary,
        items: formattedItems,
        totalAmount: summary.totalActualValue,
        paidAmount: summary.numPaid,
        paymentMethod: summary.numPaid > 0 ? paymentMethod : undefined,
        paymentRef: summary.numPaid > 0 ? paymentRef.trim() : undefined,
        notes: notes.trim(),
      });
    } catch (err: any) {
      console.error('Failed to record purchase bill:', err);
      setError(err?.message || 'Failed to record purchase bill. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & NAVIGATION                                */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
            title="Back to Vendors & Khata"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <ShoppingBag className="w-7 h-7 text-amber-600" />
              <span>Buy Items / Purchase Bill (Batch Repeater)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Record vendor invoices, batch restock items, calculate supplier credit (Udhaar), and auto-sync inventory stock.
            </p>
          </div>
        </div>

        {/* Top Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-save-purchase-bill-top"
            onClick={handleSavePurchaseBill}
            disabled={isSubmitting || summary.totalItemsCount === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 text-white" />
            <span>
              {isSubmitting
                ? 'Recording...'
                : `Save Purchase Bill ${summary.totalItemsCount > 0 ? `(${summary.totalItemsCount} Items)` : ''}`}
            </span>
          </button>
        </div>
      </div>

      {/* Success / Info Toast */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error notification banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-rose-700 hover:text-rose-950 font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SUMMARY KPI METRIC TILES                               */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* KPI 1: Total Purchase Value */}
        <div className="p-3.5 rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/70 via-white to-white shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold tracking-wide uppercase">Total Bill Value</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 font-mono tracking-tight">
              {formatRs(summary.totalActualValue)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Cost of all items combined
            </div>
          </div>
        </div>

        {/* KPI 2: Total Items & Quantity */}
        <div className="p-3.5 rounded-xl border border-blue-200/70 bg-gradient-to-br from-blue-50/70 via-white to-white shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold tracking-wide uppercase">Items &amp; Units</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 tracking-tight">
              {summary.totalItemsCount}{' '}
              <span className="text-xs font-semibold text-slate-500 font-normal">
                items ({summary.totalUnits} units)
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Will restock into inventory
            </div>
          </div>
        </div>

        {/* KPI 3: Upfront Paid */}
        <div className="p-3.5 rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 via-white to-white shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold tracking-wide uppercase">Paid Upfront</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-700 font-mono tracking-tight">
              {formatRs(summary.numPaid)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {summary.totalActualValue > 0
                ? `${Math.round((summary.numPaid / summary.totalActualValue) * 100)}% Paid Now`
                : 'Cash / Transfer'}
            </div>
          </div>
        </div>

        {/* KPI 4: Remaining Udhaar */}
        <div className="p-3.5 rounded-xl border border-rose-200/70 bg-gradient-to-br from-rose-50/70 via-white to-white shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold tracking-wide uppercase">Remaining Udhaar</span>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <div className="text-xl font-black text-rose-700 font-mono tracking-tight">
              {formatRs(summary.remainingCreditUdhaar)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {summary.remainingCreditUdhaar === 0
                ? 'Full Paid (No Debt)'
                : 'Added to vendor payable'}
            </div>
          </div>
        </div>

        {/* KPI 5: Selected Vendor Info */}
        <div className="col-span-2 lg:col-span-1 p-3.5 rounded-xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/70 via-white to-white shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold tracking-wide uppercase">Supplier / Vendor</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {selectedVendor ? selectedVendor.name : vendorSearchInput || 'Not Selected'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
              {selectedVendor
                ? `Prev Balance: ${formatRs(selectedVendor.currentBalance)}`
                : 'Select from list below'}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. VENDOR & BILL DETAILS CARD                             */}
      {/* ========================================================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-800">
              Invoice &amp; Supplier Information
            </h2>
          </div>
          <span className="text-xs text-slate-400">Step 1: Choose Vendor &amp; Invoice Info</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Vendor selection with smart autocomplete */}
          <div ref={vendorInputContainerRef} className="relative md:col-span-1">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>Vendor / Supplier Name</span>
                <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsQuickVendorModalOpen(true)}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ New Vendor</span>
              </button>
            </div>

            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                id="input-vendor-name"
                type="text"
                autoComplete="off"
                required
                value={vendorSearchInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setVendorSearchInput(val);
                  setIsVendorDropdownOpen(true);
                  if (selectedVendor && val.toLowerCase() !== selectedVendor.name.toLowerCase()) {
                    setSelectedVendorId('');
                  }
                }}
                onFocus={() => setIsVendorDropdownOpen(true)}
                placeholder="Search vendor or type new..."
                className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
              />
              {vendorSearchInput && (
                <button
                  type="button"
                  onClick={handleClearVendor}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="Clear vendor name"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Suggestions list */}
            {isVendorDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                {filteredVendors.length > 0 ? (
                  <>
                    <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                      <span>Saved Vendors ({filteredVendors.length})</span>
                      <span className="text-amber-700 text-[10px] font-normal">Click to select</span>
                    </div>
                    {filteredVendors.map((v) => {
                      const isSelected = v.id === selectedVendorId;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleSelectVendor(v)}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-50/80 transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected ? 'bg-amber-50 font-semibold' : ''
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-slate-900 font-bold">{v.name}</span>
                            <span className="text-[10px] text-slate-500">
                              {v.city ? `${v.city} • ` : ''}Phone: {v.phone}
                            </span>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span
                              className={`text-[11px] font-bold ${
                                v.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                              }`}
                            >
                              {v.currentBalance > 0
                                ? `Udhaar: ${formatRs(v.currentBalance)}`
                                : 'All Clear'}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 ml-auto" />}
                          </div>
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <div className="p-3 text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">
                      No saved vendor matches "{vendorSearchInput}"
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      New vendor <strong className="text-amber-700 font-semibold">"{vendorSearchInput.trim()}"</strong> will be automatically saved and added to your Khata directory when you save this bill!
                    </p>
                  </div>
                )}
              </div>
            )}

            {selectedVendor && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>Phone: {selectedVendor.phone}</span>
                <span className="font-semibold text-slate-700">
                  Current Khata:{' '}
                  <span className={selectedVendor.currentBalance > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                    {formatRs(selectedVendor.currentBalance)} {selectedVendor.currentBalance > 0 ? '(Payable)' : '(Nil)'}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Bill / Invoice Number */}
          <div className="md:col-span-1">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Bill / Invoice / Parchi #
              </label>
              <button
                type="button"
                onClick={() => setBillNumber(`BILL-${Math.floor(1000 + Math.random() * 9000)}`)}
                className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Regenerate
              </button>
            </div>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="e.g. BILL-4821"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Supplier bill number or internal voucher number
            </p>
          </div>

          {/* Purchase Date */}
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Purchase Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Date on supplier invoice or stock arrival date
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. BATCH REPEATER CONTROLS & TABLE                        */}
      {/* ========================================================= */}
      <div className="space-y-3">
        {/* Row Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/90 p-3 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Accessories &amp; Items Table (Batch Repeater)
              </h2>
              <p className="text-[11px] text-slate-500">
                Select existing products from store or enter new ones. Stock will automatically increase.
              </p>
            </div>
          </div>

          {/* Quick Row Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Row</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddMultipleRows(5)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-700 text-xs transition-colors cursor-pointer shadow-2xs"
            >
              + Add 5 Rows
            </button>

            <button
              type="button"
              onClick={handleClearEmptyRows}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-600 text-xs transition-colors cursor-pointer shadow-2xs"
              title="Remove empty unconfigured rows"
            >
              Clear Empty Rows
            </button>
          </div>
        </div>

        {/* Batch Table Container */}
        <div
          ref={repeaterTableRef}
          className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">#</th>
                  <th className="px-3 py-3 min-w-[280px]">
                    Item / Accessory Name <span className="text-rose-500">*</span>
                  </th>
                  <th className="px-3 py-3 min-w-[110px] text-center">Current Stock</th>
                  <th className="px-3 py-3 min-w-[130px] text-right">
                    Cost Price (Rs.) <span className="text-rose-500">*</span>
                  </th>
                  <th className="px-3 py-3 min-w-[140px] text-right">
                    Sale / Retail (Rs.)
                  </th>
                  <th className="px-3 py-3 min-w-[100px] text-center">
                    Quantity <span className="text-rose-500">*</span>
                  </th>
                  <th className="px-3 py-3 min-w-[130px] text-right">
                    Line Total (Rs.)
                  </th>
                  <th className="px-3 py-3 w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => {
                  const rowCost = Number(row.costPrice) || 0;
                  const rowQty = Number(row.quantity) || 0;
                  const rowTotalCost = rowCost * rowQty;

                  const trimmedRowName = row.itemName.trim().toLowerCase();
                  const isDropdownActive = activeItemDropdownRowId === row.id;
                  const shouldShowItemSuggestions = isDropdownActive && trimmedRowName.length >= 2;

                  const matchingItems = shouldShowItemSuggestions
                    ? availableItems.filter(
                        (it) =>
                          it.name.toLowerCase().includes(trimmedRowName) ||
                          it.sku.toLowerCase().includes(trimmedRowName) ||
                          (it.barcode && it.barcode.toLowerCase().includes(trimmedRowName))
                      )
                    : [];

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 transition-colors group focus-within:bg-amber-50/25"
                    >
                      {/* Row Index */}
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Item Name with Autocomplete */}
                      <td className="px-3 py-2.5 relative">
                        <div className="relative">
                          <input
                            type="text"
                            autoComplete="off"
                            required
                            value={row.itemName}
                            onChange={(e) => {
                              handleUpdateRow(row.id, 'itemName', e.target.value);
                              setActiveItemDropdownRowId(row.id);
                            }}
                            onFocus={() => setActiveItemDropdownRowId(row.id)}
                            placeholder="Type item name (e.g. Type-C Fast Cable, 20W Adapter...)"
                            className="w-full pl-7 pr-7 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
                          />
                          <Package className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400" />
                          {row.itemName && (
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateRow(row.id, 'itemName', '');
                                handleUpdateRow(row.id, 'isExistingItem', false);
                                handleUpdateRow(row.id, 'inventoryItemId', undefined);
                                handleUpdateRow(row.id, 'currentStock', undefined);
                                handleUpdateRow(row.id, 'sku', undefined);
                                setActiveItemDropdownRowId(null);
                              }}
                              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                              title="Clear item name"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Inventory Match Pill */}
                        {row.itemName && (
                          <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                            {row.isExistingItem ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                <Check className="w-2.5 h-2.5" />
                                <span>
                                  In Store (SKU: {row.sku || '-'} • Stock: {row.currentStock || 0}{' '}
                                  {row.unit || 'pcs'})
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                                <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                                <span>New Item (Will be auto-added to inventory)</span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Autocomplete Dropdown List */}
                        {shouldShowItemSuggestions && (
                          <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto divide-y divide-slate-100">
                            {matchingItems.length > 0 ? (
                              <>
                                <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                                  <span>Matching Store Products ({matchingItems.length})</span>
                                  <span className="text-amber-700 font-normal">Click to prefill</span>
                                </div>
                                {matchingItems.map((inv) => (
                                  <button
                                    key={inv.id}
                                    type="button"
                                    onClick={() => handleSelectInventoryItem(row.id, inv)}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 transition-colors flex items-center justify-between cursor-pointer"
                                  >
                                    <div>
                                      <p className="font-bold text-slate-900">{inv.name}</p>
                                      <p className="text-[10px] text-slate-500">
                                        SKU: {inv.sku} • Stock: {inv.currentStock} {inv.unit}
                                      </p>
                                    </div>
                                    <div className="text-right text-[11px] font-mono">
                                      <div className="text-slate-600">Cost: {formatRs(inv.costPrice)}</div>
                                      <div className="text-emerald-600 font-bold">
                                        Sale: {formatRs(inv.sellingPrice)}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </>
                            ) : (
                              <div className="p-3 text-xs text-slate-600">
                                <div className="flex items-center gap-1.5 text-blue-700 font-semibold mb-0.5">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>New Item Detected</span>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  "{row.itemName}" is not currently in inventory. It will be created as a new stock product!
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Current Stock */}
                      <td className="px-3 py-2.5 text-center">
                        {row.isExistingItem ? (
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                            {row.currentStock || 0} {row.unit || 'pcs'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">New (0)</span>
                        )}
                      </td>

                      {/* Cost Price */}
                      <td className="px-3 py-2.5 text-right">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-[11px] font-semibold text-slate-400">
                            Rs.
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={row.costPrice}
                            onChange={(e) =>
                              handleUpdateRow(
                                row.id,
                                'costPrice',
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            placeholder="Cost"
                            className="w-full pl-8 pr-2.5 py-1.5 text-xs font-bold text-slate-900 text-right border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>
                      </td>

                      {/* Sale / Retail Price */}
                      <td className="px-3 py-2.5 text-right">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-[11px] font-semibold text-emerald-500">
                            Rs.
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.salePrice}
                            onChange={(e) =>
                              handleUpdateRow(
                                row.id,
                                'salePrice',
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            placeholder="Sale"
                            className="w-full pl-8 pr-2.5 py-1.5 text-xs font-bold text-emerald-700 text-right border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>
                        {row.costPrice && Number(row.costPrice) > 0 && (
                          <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-400">
                            <span>Markup:</span>
                            <button
                              type="button"
                              onClick={() => handleApplyMarkup(row.id, 25)}
                              className="text-amber-700 hover:underline cursor-pointer"
                            >
                              +25%
                            </button>
                            <span>·</span>
                            <button
                              type="button"
                              onClick={() => handleApplyMarkup(row.id, 40)}
                              className="text-amber-700 hover:underline cursor-pointer"
                            >
                              +40%
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={row.quantity}
                          onChange={(e) =>
                            handleUpdateRow(
                              row.id,
                              'quantity',
                              e.target.value === '' ? '' : Math.max(1, Number(e.target.value))
                            )
                          }
                          placeholder="1"
                          className="w-20 px-2 py-1.5 text-xs font-black text-slate-900 text-center border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 mx-auto"
                        />
                      </td>

                      {/* Line Subtotal */}
                      <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900 text-xs">
                        {formatRs(rowTotalCost)}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(row.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Duplicate this row"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete this row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Summary and Add Row Trigger */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-amber-700 bg-white hover:bg-amber-50 border border-amber-300 rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Next Item Row</span>
            </button>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-600 font-medium">
                Total Products: <strong className="text-slate-900">{summary.totalItemsCount}</strong> ({summary.totalUnits} units)
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-bold text-slate-800">
                Total Bill Value:{' '}
                <strong className="text-amber-700 font-mono text-sm ml-1">
                  {formatRs(summary.totalActualValue)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. FINANCIAL PAYMENT & KHATA SETTLEMENT                   */}
      {/* ========================================================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-800">
              Payment Settlement &amp; Udhaar Calculation
            </h2>
          </div>
          <span className="text-xs text-slate-400">Step 3: Upfront Payment &amp; Terms</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Actual Purchase Value (Calculated) */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">
                Actual Purchase Value (Total Rs.)
              </label>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                = All Rows Cost
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {formatRs(summary.totalActualValue)}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Automatically calculated as sum of (Cost Price × Quantity)
            </p>
          </div>

          {/* Paid Amount */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Paid Amount (Paid Now)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-emerald-600">
                Rs.
              </span>
              <input
                type="number"
                min="0"
                max={summary.totalActualValue || undefined}
                step="any"
                value={paidAmount}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  setPaidAmount(val);
                }}
                placeholder="0"
                className="w-full pl-10 pr-3 py-2 text-base font-bold text-emerald-700 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            {/* Quick preset buttons */}
            {summary.totalActualValue > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-[10px] mt-2">
                <span className="text-slate-400 font-medium">Quick:</span>
                <button
                  type="button"
                  onClick={() => setPresetPaid(0)}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Full Udhaar (Rs. 0)
                </button>
                <button
                  type="button"
                  onClick={() => setPresetPaid(0.5)}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  50% (Half)
                </button>
                <button
                  type="button"
                  onClick={() => setPresetPaid(1)}
                  className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-700 font-bold hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  100% (Full Paid)
                </button>
              </div>
            )}
          </div>

          {/* Remaining Balance (Udhaar) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-700">Remaining Balance (Udhaar):</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    summary.remainingCreditUdhaar === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : summary.numPaid > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {summary.remainingCreditUdhaar === 0
                    ? 'Fully Paid'
                    : summary.numPaid > 0
                    ? 'Partial Credit'
                    : 'Full Udhaar'}
                </span>
              </div>
              <div className="text-2xl font-black text-rose-600 font-mono">
                {formatRs(summary.remainingCreditUdhaar)}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              {summary.remainingCreditUdhaar > 0
                ? `Will be added to ${selectedVendor?.name || 'vendor'}'s payable account balance.`
                : 'No outstanding debt for this purchase.'}
            </p>
          </div>
        </div>

        {/* Payment details if paidAmount > 0 */}
        {summary.numPaid > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as VendorPaymentMethod)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
              >
                <option value="CASH">Cash in Hand</option>
                <option value="BANK_TRANSFER">Bank Online Transfer</option>
                <option value="EASYPAISA">EasyPaisa</option>
                <option value="JAZZCASH">JazzCash</option>
                <option value="CHEQUE">Bank Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Reference / Account
              </label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="e.g. Counter Cash, Trx # 9812, Meezan Bank"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
              />
            </div>
          </div>
        )}

        {/* Notes & Terms */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Notes / Payment Terms / Delivery Remarks
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Balance payable within 10 days, carton #4 received in good condition..."
            className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. BOTTOM ACTION BAR                                      */}
      {/* ========================================================= */}
      <div className="sticky bottom-4 z-20 bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
              Total Actual Value
            </span>
            <span className="text-lg font-black font-mono text-amber-400">
              {formatRs(summary.totalActualValue)}
            </span>
          </div>
          <div className="hidden sm:block h-8 w-px bg-slate-700" />
          <div className="hidden sm:block">
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
              Paid Now
            </span>
            <span className="text-sm font-bold font-mono text-emerald-400">
              {formatRs(summary.numPaid)}
            </span>
          </div>
          <div className="hidden sm:block h-8 w-px bg-slate-700" />
          <div className="hidden sm:block">
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
              Remaining Udhaar
            </span>
            <span className="text-sm font-bold font-mono text-rose-400">
              {formatRs(summary.remainingCreditUdhaar)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSavePurchaseBill}
            disabled={isSubmitting || summary.totalItemsCount === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Recording...'
                : `Save Purchase Bill & Update Stock (${summary.totalItemsCount})`}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* QUICK NEW VENDOR MODAL (Preserves all typed rows!)       */}
      {/* ========================================================= */}
      {isQuickVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Add New Vendor Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickVendorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickVendor} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Vendor / Supplier Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newVendorForm.name}
                  onChange={(e) =>
                    setNewVendorForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Al-Rehman Mobile Accessories"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newVendorForm.phone}
                  onChange={(e) =>
                    setNewVendorForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="e.g. 0300-1234567"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City / Market</label>
                  <input
                    type="text"
                    value={newVendorForm.city}
                    onChange={(e) =>
                      setNewVendorForm((prev) => ({ ...prev, city: e.target.value }))
                    }
                    placeholder="e.g. Lahore / Hafeez Centre"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Shop / Address</label>
                  <input
                    type="text"
                    value={newVendorForm.address}
                    onChange={(e) =>
                      setNewVendorForm((prev) => ({ ...prev, address: e.target.value }))
                    }
                    placeholder="e.g. Shop # 24"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={newVendorForm.notes}
                  onChange={(e) =>
                    setNewVendorForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="e.g. Fast delivery, wholesale rates"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickVendorModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingVendor}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  {isSavingVendor ? 'Saving...' : 'Save & Select Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
