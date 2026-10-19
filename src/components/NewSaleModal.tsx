import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Search,
  ShoppingCart,
  Trash2,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Package,
  Barcode as BarcodeIcon,
  ScanLine,
  User,
  Calendar,
  Hash,
  Printer,
  Tag,
  Percent,
  Clock,
} from 'lucide-react';
import { InventoryItem, SaleItemLine, Sale } from '../types';
import { storage } from '../services/storage';
import { formatPKR } from '../utils/currency';
import { BarcodeScannerWidget } from './BarcodeScannerWidget';
import { soundController } from '../utils/audio';
import { authService } from '../services/auth';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCompleted: (newSale?: Sale, autoPrint?: boolean) => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  onSaleCompleted,
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLines, setSelectedLines] = useState<SaleItemLine[]>([]);
  const [customerName, setCustomerName] = useState('Walk in Customer');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [autoPrintSlip, setAutoPrintSlip] = useState<boolean>(() => storage.isAutoPrintSlipEnabled());
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [cashierName, setCashierName] = useState<string>(() => {
    return authService.getStoredUser()?.name || 'Obaid';
  });
  const [saleTime, setSaleTime] = useState<string>(() => {
    const is24h = storage.getStoreSettings().printerSettings?.timeFormat === '24h';
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !is24h });
  });

  const storeSettings = useMemo(() => storage.getStoreSettings(), [isOpen]);
  const printerName = storeSettings.printerSettings?.printerName || 'BC-96AC Mini Printer';

  // Barcode scanning state
  const [isScannerExpanded, setIsScannerExpanded] = useState<boolean>(true);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [lastScannedStatus, setLastScannedStatus] = useState<{
    success: boolean;
    message: string;
    itemName?: string;
    itemPrice?: number;
  } | null>(null);

  // Load latest inventory items and reset fields when modal opens
  useEffect(() => {
    if (isOpen) {
      const currentSettings = storage.getStoreSettings();
      setItems(storage.getItems());
      setSelectedLines([]);
      setCustomerName('Walk in Customer');
      setNotes('');
      setError('');
      setDate(new Date().toISOString().split('T')[0]);
      setSearchQuery('');
      setLastScannedCode('');
      setLastScannedStatus(null);
      setAutoPrintSlip(storage.isAutoPrintSlipEnabled());
      setOrderDiscount(0);
      const is24h = currentSettings.printerSettings?.timeFormat === '24h';
      const userProfileName = authService.getStoredUser()?.name || 'Obaid';
      setCashierName(userProfileName);
      setSaleTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !is24h }));
      const prefix = currentSettings.printerSettings?.invoicePrefix || 'INV-';
      const randomInvSuffix = Math.floor(10000 + Math.random() * 90000);
      setInvoiceNumber(`${prefix}${randomInvSuffix}`);
    }
  }, [isOpen]);

  // Filter available inventory items based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Handle adding an item to the sale lines
  const handleAddItem = (item: InventoryItem) => {
    if (item.currentStock <= 0) {
      setError(`"${item.name}" is currently out of stock.`);
      return;
    }

    const existingIndex = selectedLines.findIndex((l) => l.itemId === item.id);
    if (existingIndex !== -1) {
      // Increase quantity if below stock
      const existingLine = selectedLines[existingIndex];
      if (existingLine.quantity >= item.currentStock) {
        setError(`Cannot add more than available stock (${item.currentStock} ${item.unit}).`);
        return;
      }
      const updatedLines = [...selectedLines];
      const newQty = existingLine.quantity + 1;
      updatedLines[existingIndex] = {
        ...existingLine,
        quantity: newQty,
        total: newQty * existingLine.soldPrice,
      };
      setSelectedLines(updatedLines);
    } else {
      // Add fresh line
      const newLine: SaleItemLine = {
        itemId: item.id,
        sku: item.sku,
        barcode: item.barcode,
        name: item.name,
        unit: item.unit,
        availableStock: item.currentStock,
        costPrice: item.costPrice,
        originalPrice: item.sellingPrice,
        discountPerUnit: 0,
        discountType: 'fixed',
        discountPercent: 0,
        soldPrice: item.sellingPrice, // defaults to retail, discountable
        quantity: 1,
        total: item.sellingPrice,
      };
      setSelectedLines([...selectedLines, newLine]);
    }
    setError('');
    setSearchQuery('');
  };

  // Automatically scan and add product from USB/Bluetooth or Web Cam Scanner
  const handleBarcodeScanned = (code: string) => {
    const clean = code.trim().toLowerCase();
    setLastScannedCode(code);

    const matched = items.find(
      (item) =>
        (item.barcode && item.barcode.trim().toLowerCase() === clean) ||
        item.sku.trim().toLowerCase() === clean ||
        item.id.trim().toLowerCase() === clean
    );

    if (matched) {
      if (matched.currentStock <= 0) {
        soundController.playErrorBeep();
        setLastScannedStatus({
          success: false,
          message: `Out of Stock: "${matched.name}"`,
          itemName: `${matched.sku} • Available: 0`,
        });
        setError(`"${matched.name}" is out of stock.`);
        return;
      }

      const existing = selectedLines.find((l) => l.itemId === matched.id);
      if (existing && existing.quantity >= matched.currentStock) {
        soundController.playErrorBeep();
        setLastScannedStatus({
          success: false,
          message: `Stock limit reached (${matched.currentStock} ${matched.unit})`,
          itemName: matched.name,
        });
        setError(`Cannot add more than available stock (${matched.currentStock} ${matched.unit}).`);
        return;
      }

      soundController.playSuccessBeep();
      handleAddItem(matched);
      const newQty = existing ? existing.quantity + 1 : 1;
      setLastScannedStatus({
        success: true,
        message: `Scanned & Added: ${matched.name}`,
        itemName: `${matched.sku} • Quantity in Sale: ${newQty} ${matched.unit}`,
        itemPrice: matched.sellingPrice,
      });
      setError('');
    } else {
      soundController.playErrorBeep();
      setLastScannedStatus({
        success: false,
        message: `No stock item found for barcode "${code}".`,
      });
      setError(`No product found with barcode "${code}". Please verify barcode in stock inventory.`);
    }
  };

  // Update quantity for a selected line
  const handleQuantityChange = (itemId: string, newQty: number) => {
    const updated = selectedLines.map((line) => {
      if (line.itemId === itemId) {
        const validatedQty = Math.max(1, Math.min(line.availableStock, newQty || 1));
        return {
          ...line,
          quantity: validatedQty,
          total: validatedQty * line.soldPrice,
        };
      }
      return line;
    });
    setSelectedLines(updated);
  };

  // Update discount for a selected line (either flat PKR or percentage %)
  const handleLineDiscountChange = (
    itemId: string,
    discountVal: number,
    type: 'fixed' | 'percentage' = 'fixed'
  ) => {
    const updated = selectedLines.map((line) => {
      if (line.itemId === itemId) {
        const orig = line.originalPrice ?? line.soldPrice;
        let discountPerUnit = 0;
        let discountPercent = 0;

        if (type === 'percentage') {
          discountPercent = Math.max(0, Math.min(100, discountVal || 0));
          discountPerUnit = Math.round((orig * discountPercent) / 100);
        } else {
          discountPerUnit = Math.max(0, Math.min(orig, discountVal || 0));
          discountPercent = orig > 0 ? Math.round((discountPerUnit / orig) * 100) : 0;
        }

        const soldPrice = Math.max(0, orig - discountPerUnit);
        return {
          ...line,
          originalPrice: orig,
          discountPerUnit,
          discountType: type,
          discountPercent,
          soldPrice,
          total: line.quantity * soldPrice,
        };
      }
      return line;
    });
    setSelectedLines(updated);
  };

  // Update custom sold price directly (e.g. typing 1800 on 2000 item automatically calculates 200 discount)
  const handleSoldPriceChange = (itemId: string, newPrice: number) => {
    const updated = selectedLines.map((line) => {
      if (line.itemId === itemId) {
        const orig = line.originalPrice ?? line.soldPrice;
        const validatedPrice = Math.max(0, newPrice);
        let discountPerUnit = 0;
        let discountPercent = 0;

        if (validatedPrice < orig) {
          discountPerUnit = orig - validatedPrice;
          discountPercent = orig > 0 ? Math.round((discountPerUnit / orig) * 100) : 0;
        } else {
          discountPerUnit = 0;
          discountPercent = 0;
        }

        return {
          ...line,
          originalPrice: orig,
          discountPerUnit,
          discountType: 'fixed',
          discountPercent,
          soldPrice: validatedPrice,
          total: line.quantity * validatedPrice,
        };
      }
      return line;
    });
    setSelectedLines(updated);
  };

  // Update regular/original item price
  const handleOriginalPriceChange = (itemId: string, newOrigPrice: number) => {
    const updated = selectedLines.map((line) => {
      if (line.itemId === itemId) {
        const orig = Math.max(0, newOrigPrice || 0);
        const disc = line.discountPerUnit || 0;
        const discountPerUnit = Math.min(orig, disc);
        const discountPercent = orig > 0 ? Math.round((discountPerUnit / orig) * 100) : 0;
        const soldPrice = Math.max(0, orig - discountPerUnit);
        return {
          ...line,
          originalPrice: orig,
          discountPerUnit,
          discountPercent,
          soldPrice,
          total: line.quantity * soldPrice,
        };
      }
      return line;
    });
    setSelectedLines(updated);
  };

  // Remove a line from sale
  const handleRemoveLine = (itemId: string) => {
    setSelectedLines(selectedLines.filter((l) => l.itemId !== itemId));
  };

  // Calculate order totals with discount breakdown
  const grossSubtotal = selectedLines.reduce(
    (sum, line) => sum + ((line.originalPrice ?? line.soldPrice) * line.quantity),
    0
  );
  const totalLineDiscounts = selectedLines.reduce(
    (sum, line) => sum + ((line.discountPerUnit || 0) * line.quantity),
    0
  );
  const totalDiscount = totalLineDiscounts + Math.max(0, orderDiscount || 0);
  const subtotal = grossSubtotal;
  const totalAmount = Math.max(0, grossSubtotal - totalDiscount);
  const totalUnits = selectedLines.reduce((sum, line) => sum + line.quantity, 0);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!customerName.trim()) {
      setError('Please enter a customer or client name.');
      return;
    }

    if (selectedLines.length === 0) {
      setError('Please add at least one item from stock to sell.');
      return;
    }

    try {
      const createdSale = storage.recordSale({
        invoiceNumber: invoiceNumber.trim() || `INV-${Date.now().toString().slice(-5)}`,
        date,
        time: saleTime.trim() || undefined,
        cashierName: cashierName.trim() || undefined,
        customerName: customerName.trim(),
        paymentMethod: 'CASH',
        items: selectedLines,
        subtotal: grossSubtotal,
        discountTotal: totalDiscount,
        orderDiscount: Math.max(0, orderDiscount || 0),
        totalAmount,
        notes: notes.trim() || undefined,
      });

      onSaleCompleted(createdSale, true);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record sale.');
    }
  };

  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isF9 = e.key === 'F9';
      const isCtrlEnter = (e.ctrlKey || e.metaKey) && e.key === 'Enter';
      if (isF9 || isCtrlEnter) {
        e.preventDefault();
        handleSubmitRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-900 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Record Sale Order</span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Cash Only
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Instant counter sale with automatic stock deduction and cash drawer update
                </p>
              </div>
            </div>

            <button
              id="btn-close-sale-modal"
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2.5 shrink-0">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Single Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-6 text-sm space-y-5">
          
          {/* SECTION 1: Customer & Invoice Info */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              
              {/* Customer Name */}
              <div className="sm:col-span-2 lg:col-span-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomerName('Walk in Customer')}
                    className="px-2 py-0.5 rounded bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    + Walk in
                  </button>
                </div>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="sale-input-customer-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk in Customer"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm sm:text-base focus:outline-none focus:border-slate-400 font-medium"
                  />
                </div>
              </div>

              {/* Invoice Number */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Invoice / Receipt #
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="sale-input-invoice-no"
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-10293"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm sm:text-base font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Sale Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="sale-input-date"
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-9 pr-2 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Sale Time
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="sale-input-time"
                      type="text"
                      value={saleTime}
                      onChange={(e) => setSaleTime(e.target.value)}
                      placeholder="02:45 PM"
                      className="w-full pl-9 pr-2 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-mono focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-row for Cashier info */}
            <div className="flex flex-wrap items-center justify-between pt-1 border-t border-slate-200/60 text-xs text-slate-600 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Cashier:</span>
                <input
                  type="text"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  placeholder="Cashier Name"
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-400 w-44"
                />
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Slip display: {storeSettings.printerSettings?.showCashierName ? '✓ Cashier' : '✗ Cashier hidden'} • {storeSettings.printerSettings?.showTimeOnSlip ? '✓ Time' : '✗ Time hidden'}
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <input
                id="sale-input-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional sale remarks or notes (e.g. counter sale, discount applied)..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm sm:text-base focus:outline-none focus:border-slate-400 text-slate-700"
              />
            </div>
          </div>

          {/* SECTION 2: Barcode Scanner & Product Lookup */}
          <div className="space-y-3">
            {/* Barcode Scanner Toggle & Widget (shown only if Barcode Option is Enabled in Settings) */}
            {storage.isBarcodeEnabled() && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <BarcodeIcon className="w-4 h-4 text-indigo-600" />
                    <span>Barcode Scanner & Product Lookup</span>
                  </label>

                  <button
                    type="button"
                    id="btn-toggle-sale-scanner"
                    onClick={() => setIsScannerExpanded(!isScannerExpanded)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    <span>{isScannerExpanded ? 'Minimize Scanner' : 'Open Scanner'}</span>
                  </button>
                </div>

                {isScannerExpanded && (
                  <BarcodeScannerWidget
                    onScan={handleBarcodeScanned}
                    lastScannedCode={lastScannedCode}
                    lastScannedStatus={lastScannedStatus}
                  />
                )}
              </div>
            )}

            {/* Manual Search & Autocomplete Input */}
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="sale-search-stock-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type product name, SKU, or barcode to add manually..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm sm:text-base focus:outline-none focus:border-slate-400 bg-white"
              />
            </div>

            {/* Autocomplete Dropdown */}
            {searchQuery.trim().length > 0 && (
              <div className="border border-slate-200 rounded-md bg-white shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 z-10">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddItem(item)}
                    disabled={item.currentStock <= 0}
                    className={`w-full text-left p-2.5 text-xs flex items-center justify-between transition-colors ${
                      item.currentStock > 0
                        ? 'hover:bg-slate-50 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span>{item.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">({item.sku})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Category: {item.category} • Price: {formatPKR(item.sellingPrice)}
                      </div>
                    </div>
                    <div className="text-right">
                      {item.currentStock > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                          {item.currentStock} {item.unit} in stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">
                          Out of stock
                        </span>
                      )}
                    </div>
                  </button>
                ))}

                {searchResults.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No items found matching "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 3: Selected Items for Sale */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span>2. Selected Items &amp; Pricing ({selectedLines.length})</span>
              </span>
              {selectedLines.length > 0 && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500">
                    Units: <strong className="text-slate-900">{totalUnits}</strong>
                  </span>
                  {totalDiscount > 0 && (
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Total Discount: -{formatPKR(totalDiscount)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {selectedLines.length === 0 ? (
              <div className="p-8 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-400">
                <Package className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
                No products added yet. Scan a barcode above or search by product name.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {selectedLines.map((line) => {
                  const origPrice = line.originalPrice ?? line.soldPrice;
                  const discountVal = line.discountPerUnit || 0;
                  const hasDiscount = discountVal > 0;
                  const lineSavings = discountVal * line.quantity;

                  return (
                    <div
                      key={line.itemId}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs transition-all space-y-2.5"
                    >
                      {/* Top Row: Product Name, SKU, and Remove Action */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-2">
                            <span>{line.name}</span>
                            {hasDiscount && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <Tag className="w-3 h-3 text-emerald-700" />
                                <span>
                                  -{line.discountPercent || Math.round((discountVal / origPrice) * 100)}% Off
                                </span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 font-mono mt-0.5">
                            <span className="font-semibold text-slate-700">SKU: {line.sku}</span>
                            {line.barcode && (
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 border border-slate-200">
                                BC: {line.barcode}
                              </span>
                            )}
                            <span>•</span>
                            <span className="text-emerald-700 font-semibold">
                              Stock: {line.availableStock} {line.unit}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.itemId)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title="Remove item from sale"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Bottom Row: Quantity, Item Price, Discount, and Total */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 items-end text-xs">
                        {/* 1. Qty Stepper */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            Qty ({line.unit})
                          </label>
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(line.itemId, line.quantity - 1)}
                              className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={line.availableStock}
                              value={line.quantity}
                              onChange={(e) =>
                                handleQuantityChange(line.itemId, parseInt(e.target.value) || 1)
                              }
                              className="w-full text-center py-1 font-mono font-bold text-slate-900 text-xs focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(line.itemId, line.quantity + 1)}
                              disabled={line.quantity >= line.availableStock}
                              className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* 2. Item Price */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            Item Price (PKR)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={origPrice}
                            onChange={(e) =>
                              handleOriginalPriceChange(line.itemId, parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-right font-mono font-semibold text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                            title="Catalog / Retail Price per unit"
                          />
                        </div>

                        {/* 3. Discount Input (PKR or %) */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Discount</span>
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                handleLineDiscountChange(
                                  line.itemId,
                                  line.discountType === 'percentage'
                                    ? line.discountPerUnit || 0
                                    : line.discountPercent || 0,
                                  line.discountType === 'percentage' ? 'fixed' : 'percentage'
                                )
                              }
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 cursor-pointer transition-colors"
                              title="Toggle between Flat PKR and Percentage % discount"
                            >
                              {line.discountType === 'percentage' ? '% Off' : 'PKR Off'}
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max={line.discountType === 'percentage' ? 100 : origPrice}
                              step="1"
                              value={
                                line.discountType === 'percentage'
                                  ? line.discountPercent || 0
                                  : line.discountPerUnit || 0
                              }
                              onChange={(e) =>
                                handleLineDiscountChange(
                                  line.itemId,
                                  parseFloat(e.target.value) || 0,
                                  line.discountType || 'fixed'
                                )
                              }
                              placeholder="0"
                              className="w-full pl-2 pr-6 py-1.5 bg-emerald-50/60 rounded-lg border border-emerald-300 text-right font-mono font-bold text-emerald-900 text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 pointer-events-none">
                              {line.discountType === 'percentage' ? '%' : 'Rs'}
                            </span>
                          </div>
                        </div>

                        {/* 4. Line Total */}
                        <div className="text-right">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            Line Total
                          </label>
                          <span className="font-mono font-black text-slate-900 text-sm block">
                            {formatPKR(line.total)}
                          </span>
                          {hasDiscount && (
                            <span className="text-[10px] font-bold text-emerald-700 font-mono block">
                              Saved {formatPKR(lineSavings)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 4: Payment Summary (Cash Only) */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-800 text-emerald-400">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>Payment Method: Cash Counter</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                      <CheckCircle2 className="w-3 h-3" />
                      Cash in Hand
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Directly updates the active cash register balance upon sale.
                  </div>
                </div>
              </div>

              {/* Extra Whole-Order Discount */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <label className="text-xs text-slate-300 font-medium whitespace-nowrap flex items-center gap-1">
                  <Tag className="w-3 h-3 text-emerald-400" />
                  <span>Extra Order Disc:</span>
                </label>
                <div className="relative w-28">
                  <input
                    type="number"
                    min="0"
                    value={orderDiscount || ''}
                    onChange={(e) => setOrderDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full px-2 py-1 text-xs font-mono font-bold text-emerald-300 bg-slate-800 rounded-lg border border-slate-700 text-right pr-6 focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                    Rs
                  </span>
                </div>
              </div>
            </div>

            {/* Financial breakdown row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  Gross Subtotal
                </span>
                <span className="text-sm font-bold font-mono text-slate-200">
                  {formatPKR(grossSubtotal)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-semibold">
                  Total Discount
                </span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  {totalDiscount > 0 ? `-${formatPKR(totalDiscount)}` : 'PKR 0'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  Items &amp; Units
                </span>
                <span className="text-sm font-bold text-slate-300">
                  {selectedLines.length} item{selectedLines.length !== 1 ? 's' : ''} ({totalUnits} unit{totalUnits !== 1 ? 's' : ''})
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-extrabold">
                  Net Total Payable
                </span>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  {formatPKR(totalAmount)}
                </span>
              </div>
            </div>

            {totalDiscount > 0 && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-emerald-300 font-medium">
                <span className="flex items-center gap-1.5 font-bold">
                  <span>🎉 Customer Savings Applied:</span>
                </span>
                <span className="font-mono font-bold text-sm bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800 text-emerald-300">
                  You saved customer {formatPKR(totalDiscount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pinned Single Footer with Action Buttons */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/90 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 shrink-0">
          <button
            id="btn-cancel-sale-modal"
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-slate-700 text-sm sm:text-base font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4">
            {/* Auto-print slip toggle */}
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <input
                id="checkbox-auto-print-slip"
                type="checkbox"
                checked={autoPrintSlip}
                onChange={(e) => setAutoPrintSlip(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
              />
              <Printer className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Auto-print slip ({printerName})</span>
              <span className="sm:hidden">Print slip</span>
            </label>

            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-500">
                {selectedLines.length} item{selectedLines.length !== 1 ? 's' : ''} ({totalUnits} unit{totalUnits !== 1 ? 's' : ''})
              </div>
              <div className="text-sm font-bold font-mono text-slate-900">
                Net: {formatPKR(totalAmount)}
              </div>
            </div>

            <button
              id="btn-confirm-record-sale"
              type="button"
              onClick={() => handleSubmit()}
              disabled={selectedLines.length === 0}
              title="Complete Sale & Auto-Print Invoice (Shortcut: F9 or Ctrl+Enter)"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer"
            >
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              <span>Complete Sale &amp; Deduct Stock</span>
              <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 text-xs font-mono font-bold text-emerald-300 border border-slate-700">
                F9
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
