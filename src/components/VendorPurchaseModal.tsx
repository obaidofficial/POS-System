import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
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
  Package,
  Sparkles,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { Vendor, VendorPurchase, VendorPurchaseItem, VendorPaymentMethod, InventoryItem } from '../types';
import { storage } from '../services/storage';
import { formatRs } from '../utils/currency';

export interface PurchaseItemRow {
  id: string;
  inventoryItemId?: string;
  itemName: string;
  costPrice: number | '';
  salePrice: number | '';
  quantity: number | '';
  isExistingItem?: boolean;
  currentStock?: number;
  unit?: string;
  sku?: string;
}

interface VendorPurchaseModalProps {
  isOpen: boolean;
  vendors: Vendor[];
  initialVendorId?: string;
  inventoryItems?: InventoryItem[];
  onClose: () => void;
  onSaved: (purchase: Omit<VendorPurchase, 'id' | 'createdAt' | 'status' | 'remainingAmount'> & { id?: string }) => Promise<void>;
  onAddNewVendorClick?: () => void;
  onSaveVendor?: (vendor: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt' | 'totalBilled' | 'totalPaid' | 'currentBalance'> & { id?: string }) => Promise<Vendor>;
}

export const VendorPurchaseModal: React.FC<VendorPurchaseModalProps> = ({
  isOpen,
  vendors,
  initialVendorId,
  inventoryItems: propInventoryItems,
  onClose,
  onSaved,
  onAddNewVendorClick,
  onSaveVendor,
}) => {
  // Vendor search & select state
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorSearchInput, setVendorSearchInput] = useState('');
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);
  const vendorInputContainerRef = useRef<HTMLDivElement>(null);

  // Bill metadata
  const [billNumber, setBillNumber] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10));

  // Inventory items for autocomplete lookup
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);

  // Item Repeater Rows
  const [itemRows, setItemRows] = useState<PurchaseItemRow[]>([
    {
      id: 'row_1',
      itemName: '',
      costPrice: '',
      salePrice: '',
      quantity: 1,
      isExistingItem: false,
    },
  ]);

  // Which row currently has its Item Name autocomplete dropdown open
  const [activeItemDropdownRowId, setActiveItemDropdownRowId] = useState<string | null>(null);
  const itemRepeaterRef = useRef<HTMLDivElement>(null);

  // Financial fields
  const [paidAmount, setPaidAmount] = useState<number | ''>(0);
  const [paymentMethod, setPaymentMethod] = useState<VendorPaymentMethod>('CASH');
  const [paymentRef, setPaymentRef] = useState('Counter Cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load inventory items and reset state when opened
  useEffect(() => {
    if (isOpen) {
      const itemsList = propInventoryItems && propInventoryItems.length > 0
        ? propInventoryItems
        : storage.getItems();
      setAvailableItems(itemsList);

      const initialV = initialVendorId ? vendors.find((v) => v.id === initialVendorId) : null;
      if (initialV) {
        setSelectedVendorId(initialV.id);
        setVendorSearchInput(initialV.name);
      } else {
        setSelectedVendorId('');
        setVendorSearchInput('');
      }
      setIsVendorDropdownOpen(false);
      setBillNumber(`BILL-${Math.floor(1000 + Math.random() * 9000)}`);
      setDate(new Date().toISOString().substring(0, 10));

      // Reset repeater to 1 blank row
      setItemRows([
        {
          id: `row_${Date.now()}`,
          itemName: '',
          costPrice: '',
          salePrice: '',
          quantity: 1,
          isExistingItem: false,
        },
      ]);
      setActiveItemDropdownRowId(null);
      setPaidAmount(0);
      setPaymentMethod('CASH');
      setPaymentRef('Counter Cash');
      setNotes('');
      setError('');
    }
  }, [isOpen, initialVendorId, vendors, propInventoryItems]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        vendorInputContainerRef.current &&
        !vendorInputContainerRef.current.contains(e.target as Node)
      ) {
        setIsVendorDropdownOpen(false);
      }
      if (
        itemRepeaterRef.current &&
        !itemRepeaterRef.current.contains(e.target as Node)
      ) {
        setActiveItemDropdownRowId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Filter vendor list by typing 3 or more characters
  const trimmedVendorInput = vendorSearchInput.trim().toLowerCase();
  const shouldShowVendorSuggestions = isVendorDropdownOpen && trimmedVendorInput.length >= 3;
  const filteredVendors = shouldShowVendorSuggestions
    ? vendors.filter(
        (v) =>
          v.name.toLowerCase().includes(trimmedVendorInput) ||
          (v.city && v.city.toLowerCase().includes(trimmedVendorInput)) ||
          (v.contactPerson && v.contactPerson.toLowerCase().includes(trimmedVendorInput))
      )
    : [];

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  // Calculate Cost Price of all items:
  // "The Cost Price of All Items is equal to 'Actual Purchase Value (Total Rs.)'"
  const totalActualPurchaseValue = itemRows.reduce((sum, row) => {
    const cp = Number(row.costPrice) || 0;
    const qty = Number(row.quantity) || 0;
    return sum + cp * qty;
  }, 0);

  const totalQuantityUnits = itemRows.reduce((sum, row) => {
    return sum + (Number(row.quantity) || 0);
  }, 0);

  const numPaid = Number(paidAmount) || 0;
  const remainingCreditUdhaar = Math.max(0, totalActualPurchaseValue - numPaid);

  const setPresetPaid = (ratio: number) => {
    if (!totalActualPurchaseValue) return;
    setPaidAmount(Math.round(totalActualPurchaseValue * ratio));
  };

  const handleSelectVendor = (vendor: Vendor) => {
    setSelectedVendorId(vendor.id);
    setVendorSearchInput(vendor.name);
    setIsVendorDropdownOpen(false);
    setError('');
  };

  // Repeater handlers
  const handleAddItemRow = () => {
    setItemRows((prev) => [
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

  const handleRemoveItemRow = (rowId: string) => {
    if (itemRows.length <= 1) {
      setItemRows([
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
    setItemRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleRowChange = (rowId: string, field: keyof PurchaseItemRow, val: any) => {
    setItemRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r, [field]: val };
        // If user changed the name manually and it does not match previous selected item, reset match flags
        if (field === 'itemName') {
          if (r.isExistingItem && r.itemName !== val) {
            updated.isExistingItem = false;
            updated.inventoryItemId = undefined;
            updated.currentStock = undefined;
          }
        }
        return updated;
      })
    );
  };

  const handleSelectInventoryItem = (rowId: string, item: InventoryItem) => {
    setItemRows((prev) =>
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalVendorName = vendorSearchInput.trim();
    if (!finalVendorName) {
      setError('Please type or select a vendor / supplier name');
      return;
    }

    // Filter rows with item name
    const validRows = itemRows.filter((r) => r.itemName.trim().length > 0);
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

    if (totalActualPurchaseValue <= 0) {
      setError('Total actual purchase value must be greater than Rs. 0.');
      return;
    }

    if (numPaid < 0) {
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
          // Auto-register new vendor
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
        totalAmount: totalActualPurchaseValue,
        paidAmount: numPaid,
        paymentMethod: numPaid > 0 ? paymentMethod : undefined,
        paymentRef: numPaid > 0 ? paymentRef.trim() : undefined,
        notes: notes.trim(),
      });

      onClose();
    } catch (err: any) {
      console.error('Failed to record purchase bill:', err);
      setError(err?.message || 'Failed to record purchase bill. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Vendor Purchase (Stock / Items)</h2>
              <p className="text-xs text-slate-500">
                Add purchased items, auto-sync stock inventory, and update supplier credit (Udhaar)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Vendor selection with 3-character autocomplete */}
          <div ref={vendorInputContainerRef} className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Vendor / Supplier Name <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">
                  Type 3 letters to search
                </span>
                {onAddNewVendorClick && (
                  <button
                    type="button"
                    onClick={onAddNewVendorClick}
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    New Vendor Profile
                  </button>
                )}
              </div>
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
                placeholder="Type vendor name (e.g. Al-Madina, Prime Cases...)"
                className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
              />
              {vendorSearchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setVendorSearchInput('');
                    setSelectedVendorId('');
                    setIsVendorDropdownOpen(false);
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="Clear vendor name"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Suggestions list when >= 3 letters typed */}
            {shouldShowVendorSuggestions && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-slate-100">
                {filteredVendors.length > 0 ? (
                  <>
                    <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Matching Saved Vendors ({filteredVendors.length})
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
                            <span className="text-slate-900 font-medium">{v.name}</span>
                            <span className="text-[10px] text-slate-500">
                              {v.city ? `${v.city} • ` : ''}Phone: {v.phone}
                            </span>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span
                              className={`text-[11px] font-semibold ${
                                v.currentBalance > 0 ? 'text-amber-700' : 'text-emerald-700'
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
                    <p className="font-semibold text-slate-700">No matching vendor found for "{vendorSearchInput}"</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      New vendor <strong className="text-amber-700 font-semibold">"{vendorSearchInput.trim()}"</strong> will be automatically saved and stored when you save this bill!
                    </p>
                  </div>
                )}
              </div>
            )}

            {selectedVendor && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>Phone: {selectedVendor.phone}</span>
                <span className="font-semibold text-slate-700">
                  Current Khata Balance:{' '}
                  <span className={selectedVendor.currentBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                    {formatRs(selectedVendor.currentBalance)} {selectedVendor.currentBalance > 0 ? '(Payable)' : '(Nil)'}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Bill No and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bill / Invoice / Parchi #
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  placeholder="e.g. BILL-4821"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ITEMS REPEATER: Item Name, Cost Price, Sale Price, Quantity */}
          {/* ========================================================================= */}
          <div ref={itemRepeaterRef} className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>Accessories / Items Bought (Stock Inventory Repeater)</span>
                  <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Type 3 letters in Item Name to link with existing stock. If not found, it is added as a new product in Inventory.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItemRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Repeater Card Container */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
              {/* Desktop / Tablet Header */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <div className="col-span-4">Item Name (Type 3 letters)</div>
                <div className="col-span-2 text-right">Cost Price (Rs.)</div>
                <div className="col-span-2 text-right">Sale Price (Rs.)</div>
                <div className="col-span-1 text-center">Quantity</div>
                <div className="col-span-2 text-right">Line Total (Rs.)</div>
                <div className="col-span-1 text-center">Action</div>
              </div>

              {/* Rows List */}
              <div className="divide-y divide-slate-200">
                {itemRows.map((row, idx) => {
                  const rowCost = Number(row.costPrice) || 0;
                  const rowQty = Number(row.quantity) || 0;
                  const rowTotal = rowCost * rowQty;

                  // Autocomplete suggestions for this specific row
                  const trimmedRowName = row.itemName.trim().toLowerCase();
                  const isDropdownActive = activeItemDropdownRowId === row.id;
                  const shouldShowItemSuggestions = isDropdownActive && trimmedRowName.length >= 3;

                  const matchingItems = shouldShowItemSuggestions
                    ? availableItems.filter(
                        (it) =>
                          it.name.toLowerCase().includes(trimmedRowName) ||
                          it.sku.toLowerCase().includes(trimmedRowName) ||
                          (it.barcode && it.barcode.toLowerCase().includes(trimmedRowName))
                      )
                    : [];

                  return (
                    <div
                      key={row.id}
                      className="p-3 md:px-3 md:py-2.5 bg-white hover:bg-amber-50/20 transition-colors"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:items-center">
                        {/* 1. Item Name with 3-char autocomplete */}
                        <div className="md:col-span-4 relative">
                          <div className="md:hidden text-[10px] font-semibold text-slate-500 mb-0.5">
                            Item Name #{idx + 1}
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              autoComplete="off"
                              required
                              value={row.itemName}
                              onChange={(e) => {
                                handleRowChange(row.id, 'itemName', e.target.value);
                                setActiveItemDropdownRowId(row.id);
                              }}
                              onFocus={() => setActiveItemDropdownRowId(row.id)}
                              placeholder="Type item name (e.g. Type-C Cable, Fast Charger...)"
                              className="w-full pl-7 pr-7 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
                            />
                            <Package className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                            {row.itemName && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleRowChange(row.id, 'itemName', '');
                                  handleRowChange(row.id, 'isExistingItem', false);
                                  handleRowChange(row.id, 'inventoryItemId', undefined);
                                  setActiveItemDropdownRowId(null);
                                }}
                                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                                title="Clear item"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Inventory status badge */}
                          {row.itemName && (
                            <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                              {row.isExistingItem ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>In Inventory (Stock: {row.currentStock || 0} {row.unit || 'pcs'})</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>New Item (Will be added to Inventory)</span>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Autocomplete Dropdown */}
                          {shouldShowItemSuggestions && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl z-50 max-h-52 overflow-y-auto divide-y divide-slate-100">
                              {matchingItems.length > 0 ? (
                                <>
                                  <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                                    <span>Found in Inventory ({matchingItems.length})</span>
                                    <span className="text-[9px] text-amber-700 font-normal">Click to pre-fill</span>
                                  </div>
                                  {matchingItems.map((inv) => (
                                    <button
                                      key={inv.id}
                                      type="button"
                                      onClick={() => handleSelectInventoryItem(row.id, inv)}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 transition-colors flex items-center justify-between cursor-pointer"
                                    >
                                      <div>
                                        <p className="font-semibold text-slate-900">{inv.name}</p>
                                        <p className="text-[10px] text-slate-500">
                                          SKU: {inv.sku} • Stock: {inv.currentStock} {inv.unit}
                                        </p>
                                      </div>
                                      <div className="text-right text-[11px] font-mono">
                                        <div className="text-slate-600">Cost: {formatRs(inv.costPrice)}</div>
                                        <div className="text-emerald-600 font-bold">Sale: {formatRs(inv.sellingPrice)}</div>
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
                                    "{row.itemName}" is not currently in inventory. It will be automatically added to stock with the cost and sale price you enter!
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 2. Cost Price */}
                        <div className="md:col-span-2">
                          <div className="md:hidden text-[10px] font-semibold text-slate-500 mb-0.5">
                            Cost Price (Unit Rs.) <span className="text-red-500">*</span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-[11px] font-semibold text-slate-400">Rs.</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              required
                              value={row.costPrice}
                              onChange={(e) =>
                                handleRowChange(
                                  row.id,
                                  'costPrice',
                                  e.target.value === '' ? '' : Number(e.target.value)
                                )
                              }
                              placeholder="Cost"
                              className="w-full pl-8 pr-2 py-1.5 text-xs font-semibold text-slate-900 text-right border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                          </div>
                        </div>

                        {/* 3. Sale Price */}
                        <div className="md:col-span-2">
                          <div className="md:hidden text-[10px] font-semibold text-slate-500 mb-0.5">
                            Sale Price (Retail Rs.)
                          </div>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-[11px] font-semibold text-emerald-500">Rs.</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.salePrice}
                              onChange={(e) =>
                                handleRowChange(
                                  row.id,
                                  'salePrice',
                                  e.target.value === '' ? '' : Number(e.target.value)
                                )
                              }
                              placeholder="Sale / Retail"
                              className="w-full pl-8 pr-2 py-1.5 text-xs font-semibold text-emerald-700 text-right border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                          </div>
                        </div>

                        {/* 4. Quantity */}
                        <div className="md:col-span-1">
                          <div className="md:hidden text-[10px] font-semibold text-slate-500 mb-0.5">
                            Quantity <span className="text-red-500">*</span>
                          </div>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={row.quantity}
                            onChange={(e) =>
                              handleRowChange(
                                row.id,
                                'quantity',
                                e.target.value === '' ? '' : Math.max(1, Number(e.target.value))
                              )
                            }
                            placeholder="Qty"
                            className="w-full px-2 py-1.5 text-xs font-bold text-slate-900 text-center border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>

                        {/* 5. Line Total */}
                        <div className="md:col-span-2 flex items-center justify-between md:justify-end">
                          <span className="md:hidden text-[10px] font-semibold text-slate-500">
                            Subtotal:
                          </span>
                          <span className="text-xs font-bold text-slate-900 font-mono">
                            {formatRs(rowTotal)}
                          </span>
                        </div>

                        {/* 6. Action: Delete Row */}
                        <div className="md:col-span-1 flex items-center justify-end md:justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(row.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove this item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Repeater Footer with Add Button & Subtotal Banner */}
              <div className="p-2.5 bg-slate-100/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-white hover:bg-amber-50 border border-amber-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Item Row</span>
                </button>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-600 font-medium">
                    Total Items: <strong className="text-slate-900">{itemRows.length}</strong> ({totalQuantityUnits} units)
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="font-bold text-slate-800">
                    Total Cost: <strong className="text-amber-700 font-mono text-sm">{formatRs(totalActualPurchaseValue)}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* Financial Calculation: Total Cost Price of Items = Actual Purchase Value */}
          {/* ========================================================================= */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Actual Purchase Value (Total Rs.) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    Actual Purchase Value (Total Rs.) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                    = Cost Price of All Items
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">Rs.</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    readOnly
                    value={totalActualPurchaseValue}
                    placeholder="0"
                    className="w-full pl-10 pr-3 py-2 text-sm font-extrabold text-slate-900 bg-amber-50/50 border border-amber-300 rounded-lg cursor-not-allowed select-all"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Automatically calculated from item repeater: sum of (Cost Price × Quantity)
                </p>
              </div>

              {/* Paid Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Paid Amount (Paid Now)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-emerald-600">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    max={totalActualPurchaseValue || undefined}
                    step="any"
                    value={paidAmount}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setPaidAmount(val);
                    }}
                    placeholder="0"
                    className="w-full pl-10 pr-3 py-2 text-sm font-bold text-emerald-700 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {/* Quick Preset Buttons */}
                {totalActualPurchaseValue > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] mt-1.5">
                    <span className="text-slate-400 font-medium">Quick:</span>
                    <button
                      type="button"
                      onClick={() => setPresetPaid(0)}
                      className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Full Udhaar (Rs. 0)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetPaid(0.5)}
                      className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      50% (Half)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetPaid(1)}
                      className="px-2 py-0.5 rounded bg-white border border-emerald-300 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors cursor-pointer"
                    >
                      100% (Full Paid)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Live Remaining Balance Calculation Card */}
            <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500">Remaining Balance (Udhaar / Credit):</span>
                <p className="text-lg font-extrabold text-amber-600 font-mono">
                  {formatRs(remainingCreditUdhaar)}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                    remainingCreditUdhaar === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : numPaid > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {remainingCreditUdhaar === 0 ? 'Fully Paid' : numPaid > 0 ? 'Partial Credit' : 'Full Udhaar'}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {totalActualPurchaseValue > 0
                    ? `${Math.round((numPaid / totalActualPurchaseValue) * 100)}% Paid`
                    : '0%'}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method & Ref for the upfront paid amount */}
          {numPaid > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as VendorPaymentMethod)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Reference / Trx ID
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. Counter Cash / Trx # 9812"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Terms / Due Date
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Balance payable within 10 days"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Save Purchase Bill & Update Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
