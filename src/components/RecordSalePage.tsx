import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  ShoppingCart,
  Check,
  AlertCircle,
  Package,
  Barcode as BarcodeIcon,
  ScanLine,
  User,
  Calendar,
  Hash,
  Printer,
  Tag,
  Clock,
  DollarSign,
  Percent,
  Sparkles,
  Layers,
  Banknote,
  Minus,
  X,
  CheckCircle,
  LayoutGrid,
  List,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { InventoryItem, SaleItemLine, Sale, ScreenProtector } from "../types";
import { storage } from "../services/storage";
import { formatPKR } from "../utils/currency";
import { soundController } from "../utils/audio";
import { authService } from "../services/auth";

interface RecordSalePageProps {
  onBack: () => void;
  onSaleCompleted: (newSale: Sale, shouldAutoPrint?: boolean) => void;
}

interface SaleRowItem {
  id: string; // row unique identifier
  itemId: string;
  sku: string;
  barcode?: string;
  name: string;
  unit: string;
  category: string;
  brand?: string;
  availableStock: number;
  costPrice: number;
  originalPrice: number; // Unit Price
  discountPerUnit: number;
  discountType?: "fixed" | "percentage";
  discountPercent?: number;
  soldPrice: number; // maintained internally: originalPrice - discountPerUnit
  quantity: number;
  total: number;
  searchQuery: string; // search text typed for this row
}

export const RecordSalePage: React.FC<RecordSalePageProps> = ({
  onBack,
  onSaleCompleted,
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [rows, setRows] = useState<SaleRowItem[]>([]);
  const [customerName, setCustomerName] = useState("Walk in");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [autoPrintSlip, setAutoPrintSlip] = useState<boolean>(true);

  // View mode for product search results: 'blocks' or 'list'
  const [productViewMode, setProductViewMode] = useState<"blocks" | "list">(
    () => {
      try {
        const stored = localStorage.getItem("pos_product_search_view");
        return stored === "list" ? "list" : "blocks";
      } catch {
        return "blocks";
      }
    },
  );

  const handleToggleProductViewMode = (mode: "blocks" | "list") => {
    setProductViewMode(mode);
    try {
      localStorage.setItem("pos_product_search_view", mode);
    } catch {
      // ignore
    }
  };

  // Popover category filter
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Protectors catalog for quick mobile model lookups (e.g. "Oppo A5" -> "Go 1" / "OG-05 Super D")
  const [protectorsList, setProtectorsList] = useState<ScreenProtector[]>(() =>
    storage.getProtectors(),
  );

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setProtectorsList(storage.getProtectors());
      setItems(storage.getItems());
    });
    return () => unsub();
  }, []);

  const getProtectorMatches = (
    query: string,
  ): { protector: ScreenProtector; brand: string; model: string }[] => {
    const q = (query || "").trim().toLowerCase();
    if (!q || q.length < 2) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    const compactQ = q.replace(/[\s\-_]/g, "");

    const matches: {
      protector: ScreenProtector;
      brand: string;
      model: string;
    }[] = [];
    const seen = new Set<string>();

    for (const prot of protectorsList) {
      for (const b of prot.compatibleBrands) {
        for (const m of b.models) {
          const bLower = b.brand.toLowerCase();
          const mLower = m.toLowerCase();
          const full = `${bLower} ${mLower}`;
          const reverse = `${mLower} ${bLower}`;
          const compact = `${bLower}${mLower}`.replace(/[\s\-_]/g, "");
          const compactM = mLower.replace(/[\s\-_]/g, "");

          const isMatch =
            mLower.includes(q) ||
            bLower.includes(q) ||
            full.includes(q) ||
            reverse.includes(q) ||
            (compactQ &&
              (compact.includes(compactQ) || compactM.includes(compactQ))) ||
            (tokens.length >= 2 &&
              tokens.every(
                (t) =>
                  bLower.includes(t) ||
                  mLower.includes(t) ||
                  full.includes(t) ||
                  compact.includes(t.replace(/[\s\-_]/g, "")) ||
                  compactM.includes(t.replace(/[\s\-_]/g, "")),
              )) ||
            (tokens.length === 1 &&
              (mLower.includes(q) || compactM.includes(compactQ)));

          if (isMatch) {
            const key = `${prot.id}_${b.brand}_${m}`;
            if (!seen.has(key)) {
              seen.add(key);
              matches.push({
                protector: prot,
                brand: b.brand,
                model: m,
              });
            }
          }
        }
      }
    }
    return matches;
  };

  // Active search dropdown popover tracking
  const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(
    null,
  );
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Cashier & Time
  const [cashierName, setCashierName] = useState<string>(() => {
    return authService.getStoredUser()?.name || "Obaid";
  });
  const [saleTime, setSaleTime] = useState<string>(() => {
    const is24h =
      storage.getStoreSettings().printerSettings?.timeFormat === "24h";
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: !is24h,
    });
  });

  // Barcode quick scan input
  const [barcodeScanInput, setBarcodeScanInput] = useState("");
  const [scanFeedback, setScanFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Close search popover when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setActiveSearchRowId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveSearchRowId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Unique categories for filter pills
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set);
  }, [items]);

  // Helper to create a new row
  const createNewRow = (item?: InventoryItem): SaleRowItem => {
    const rowId = `row_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (item) {
      return {
        id: rowId,
        itemId: item.id,
        sku: item.sku,
        barcode: item.barcode,
        name: item.name,
        unit: item.unit,
        category: item.category || "General",
        brand: item.brand || undefined,
        availableStock: item.currentStock,
        costPrice: item.costPrice,
        originalPrice: item.sellingPrice,
        discountPerUnit: 0,
        discountType: "fixed",
        discountPercent: 0,
        soldPrice: item.sellingPrice,
        quantity: 1,
        total: item.sellingPrice,
        searchQuery: item.name,
      };
    }
    return {
      id: rowId,
      itemId: "",
      sku: "",
      barcode: "",
      name: "",
      unit: "pcs",
      category: "",
      availableStock: 0,
      costPrice: 0,
      originalPrice: 0,
      discountPerUnit: 0,
      discountType: "fixed",
      discountPercent: 0,
      soldPrice: 0,
      quantity: 1,
      total: 0,
      searchQuery: "",
    };
  };

  // Initialize data
  useEffect(() => {
    const loadedItems = storage.getItems();
    setItems(loadedItems);

    const currentSettings = storage.getStoreSettings();
    const prefix = currentSettings.printerSettings?.invoicePrefix || "INV-";
    const randomInvSuffix = Math.floor(10000 + Math.random() * 90000);
    setInvoiceNumber(`${prefix}${randomInvSuffix}`);

    // Start with 1 clean empty search row ready for input or barcode scanning
    setRows([createNewRow()]);
  }, []);

  // Quick Barcode Scan handler
  const handleBarcodeScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeScanInput.trim().toLowerCase();
    if (!query) return;

    const matched = items.find(
      (it) =>
        (it.barcode && it.barcode.toLowerCase() === query) ||
        it.sku.toLowerCase() === query ||
        it.name.toLowerCase() === query,
    );

    if (matched) {
      if (matched.currentStock <= 0) {
        setScanFeedback({
          success: false,
          message: `"${matched.name}" is currently OUT OF STOCK.`,
        });
        soundController.playErrorBeep();
      } else {
        handleAddItemFromProduct(matched);
        setScanFeedback({
          success: true,
          message: `Added: ${matched.name} (${formatPKR(matched.sellingPrice)})`,
        });
        soundController.playSuccessBeep();
      }
    } else {
      setScanFeedback({
        success: false,
        message: `No item found matching "${barcodeScanInput}"`,
      });
      soundController.playErrorBeep();
    }

    setBarcodeScanInput("");
    if (barcodeInputRef.current) barcodeInputRef.current.focus();

    setTimeout(() => {
      setScanFeedback(null);
    }, 3500);
  };

  // Add Item to Lines via Scanner or selection
  const handleAddItemFromProduct = (item: InventoryItem) => {
    setError(null);
    if (item.currentStock <= 0) {
      setError(`"${item.name}" is currently out of stock.`);
      return;
    }

    // Check if item already exists in rows
    const existingIndex = rows.findIndex((r) => r.itemId === item.id);
    if (existingIndex !== -1) {
      const line = rows[existingIndex];
      if (line.quantity >= item.currentStock) {
        setError(
          `Cannot add more than available stock (${item.currentStock} ${item.unit}) for "${item.name}".`,
        );
        return;
      }
      handleUpdateQuantity(line.id, line.quantity + 1);
    } else {
      // If there is an empty unselected row, use that row
      const emptyRowIndex = rows.findIndex((r) => !r.itemId);
      if (emptyRowIndex !== -1) {
        handleSelectProductForRow(rows[emptyRowIndex].id, item);
      } else {
        // Append a new row with this item
        setRows((prev) => [...prev, createNewRow(item)]);
      }
    }
  };

  // Add new empty row via + button
  const handleAddNewRow = () => {
    setError(null);
    const newRow = createNewRow();
    setRows((prev) => [...prev, newRow]);
    setActiveSearchRowId(newRow.id);
  };

  // Add multiple rows
  const handleAddMultipleRows = (count: number) => {
    setError(null);
    const newRows: SaleRowItem[] = [];
    for (let i = 0; i < count; i++) {
      newRows.push(createNewRow());
    }
    setRows((prev) => [...prev, ...newRows]);
  };

  // Select a product from search (blocks or list) for a specific row
  const handleSelectProductForRow = (rowId: string, item: InventoryItem) => {
    setError(null);
    if (item.currentStock <= 0) {
      setError(`"${item.name}" is currently out of stock.`);
      return;
    }

    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            itemId: item.id,
            sku: item.sku,
            barcode: item.barcode,
            name: item.name,
            unit: item.unit,
            category: item.category || "General",
            brand: item.brand || undefined,
            availableStock: item.currentStock,
            costPrice: item.costPrice,
            originalPrice: item.sellingPrice,
            discountPerUnit: 0,
            discountType: "fixed",
            discountPercent: 0,
            soldPrice: item.sellingPrice,
            quantity: 1,
            total: item.sellingPrice,
            searchQuery: item.name,
          };
        }
        return row;
      }),
    );

    setActiveSearchRowId(null);
    soundController.playSuccessBeep();
  };

  // Clear product from row
  const handleClearRowProduct = (rowId: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            itemId: "",
            sku: "",
            barcode: "",
            name: "",
            availableStock: 0,
            originalPrice: 0,
            discountPerUnit: 0,
            soldPrice: 0,
            total: 0,
            searchQuery: "",
          };
        }
        return row;
      }),
    );
    setActiveSearchRowId(rowId);
  };

  // Update Quantity
  const handleUpdateQuantity = (rowId: string, newQty: number) => {
    setError(null);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const qty = Math.max(1, newQty);
          if (row.availableStock > 0 && qty > row.availableStock) {
            setError(
              `Cannot exceed available stock of ${row.availableStock} ${row.unit} for "${row.name}".`,
            );
            return {
              ...row,
              quantity: row.availableStock,
              total: row.availableStock * row.soldPrice,
            };
          }
          return {
            ...row,
            quantity: qty,
            total: qty * row.soldPrice,
          };
        }
        return row;
      }),
    );
  };

  // Update Unit Price
  const handleUpdateUnitPrice = (rowId: string, newPrice: number) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const price = Math.max(0, newPrice);
          const disc = Math.min(price, row.discountPerUnit || 0);
          const sold = price - disc;
          return {
            ...row,
            originalPrice: price,
            discountPerUnit: disc,
            soldPrice: sold,
            total: row.quantity * sold,
          };
        }
        return row;
      }),
    );
  };

  // Update Discount per Unit
  const handleDiscountChange = (rowId: string, discountVal: number) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const orig = row.originalPrice;
          const disc = Math.max(0, Math.min(orig, discountVal));
          const sold = Math.max(0, orig - disc);
          const discountPercent =
            orig > 0 ? Math.round((disc / orig) * 100) : 0;

          return {
            ...row,
            discountPerUnit: disc,
            discountPercent,
            soldPrice: sold,
            total: row.quantity * sold,
          };
        }
        return row;
      }),
    );
  };

  // Remove a row
  const handleRemoveRow = (rowId: string) => {
    if (rows.length <= 1) {
      setRows([createNewRow()]);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Select a Screen Protector directly from compatibility search result
  const handleSelectProtectorForSale = (
    rowId: string,
    pMatch: { protector: ScreenProtector; brand: string; model: string },
  ) => {
    setError(null);
    const price = pMatch.protector.defaultPrice || 150;

    // Check if an item in inventory matches this protector name
    const existingInvItem = items.find(
      (it) =>
        it.name.toLowerCase().includes(pMatch.protector.name.toLowerCase()) &&
        it.currentStock > 0,
    );

    if (existingInvItem) {
      handleSelectProductForRow(rowId, existingInvItem);
      return;
    }

    // Otherwise, assign custom line item for this screen protector
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            itemId: `prot_${pMatch.protector.id}`,
            sku: `PROT-${pMatch.protector.name.replace(/\s+/g, "-").toUpperCase()}`,
            barcode: "",
            name: `${pMatch.protector.name} Screen Protector (${pMatch.brand} ${pMatch.model})`,
            category: pMatch.protector.category || "Screen Glass",
            availableStock: 99,
            costPrice: Math.round(price * 0.4),
            originalPrice: price,
            soldPrice: price,
            discountPerUnit: 0,
            quantity: 1,
            total: price,
            searchQuery: `${pMatch.protector.name} (${pMatch.brand} ${pMatch.model})`,
          };
        }
        return r;
      }),
    );
    setActiveSearchRowId(null);
  };

  // Filter items matching a specific row's search query and active category
  const getMatchingProducts = (
    query: string,
    catFilter: string = categoryFilter,
  ) => {
    const q = (query || "").toLowerCase().trim();
    const tokens = q.split(/\s+/).filter(Boolean);

    // Also check if any protectors match this query (e.g. "Oppo A5")
    const matchedProtectorNames = new Set<string>();
    if (q.length >= 2) {
      for (const prot of protectorsList) {
        for (const b of prot.compatibleBrands) {
          for (const m of b.models) {
            const bLower = b.brand.toLowerCase();
            const mLower = m.toLowerCase();
            const full = `${bLower} ${mLower}`;
            if (
              full.includes(q) ||
              mLower.includes(q) ||
              (tokens.length >= 2 &&
                tokens.every(
                  (t) =>
                    full.includes(t) ||
                    mLower.includes(t) ||
                    bLower.includes(t),
                ))
            ) {
              matchedProtectorNames.add(prot.name.toLowerCase());
            }
          }
        }
      }
    }

    return items
      .filter((it) => {
        const matchesCategory =
          catFilter === "ALL" || it.category === catFilter;
        if (!matchesCategory) return false;

        if (!q) {
          return it.currentStock >= 0;
        }

        const nameLower = it.name.toLowerCase();
        const matchesProtector = Array.from(matchedProtectorNames).some(
          (pName) => nameLower.includes(pName),
        );

        return (
          matchesProtector ||
          nameLower.includes(q) ||
          it.sku.toLowerCase().includes(q) ||
          (it.barcode && it.barcode.toLowerCase().includes(q)) ||
          it.category.toLowerCase().includes(q) ||
          (it.location && it.location.toLowerCase().includes(q))
        );
      })
      .slice(0, 40);
  };

  // Valid rows with an actual item selected
  const validLines = useMemo(() => {
    return rows.filter((r) => Boolean(r.itemId && r.name));
  }, [rows]);

  // Live order calculations
  const grossSubtotal = useMemo(() => {
    return validLines.reduce(
      (sum, line) => sum + line.originalPrice * line.quantity,
      0,
    );
  }, [validLines]);

  const totalLineDiscounts = useMemo(() => {
    return validLines.reduce(
      (sum, line) => sum + (line.discountPerUnit || 0) * line.quantity,
      0,
    );
  }, [validLines]);

  const totalDiscount = totalLineDiscounts + Math.max(0, orderDiscount || 0);
  const netTotalAmount = Math.max(0, grossSubtotal - totalDiscount);
  const totalUnits = useMemo(() => {
    return validLines.reduce((sum, line) => sum + line.quantity, 0);
  }, [validLines]);

  // Complete and submit the sale
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitSale = () => {
    setError(null);

    if (!customerName.trim()) {
      setError("Please enter a Customer Name.");
      return;
    }

    if (validLines.length === 0) {
      setError("Please select at least one product from stock in the table.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate inventory stock levels before recording
      const currentDbItems = storage.getItems();
      for (const line of validLines) {
        const stockItem = currentDbItems.find((i) => i.id === line.itemId);
        if (!stockItem) {
          throw new Error(
            `Product "${line.name}" not found in current inventory.`,
          );
        }
        if (stockItem.currentStock < line.quantity) {
          throw new Error(
            `Insufficient stock for "${stockItem.name}". Available: ${stockItem.currentStock} ${stockItem.unit}, Requested: ${line.quantity}.`,
          );
        }
      }

      // Convert rows to SaleItemLine
      const saleLines: SaleItemLine[] = validLines.map((r) => {
        const stockItem = currentDbItems.find((i) => i.id === r.itemId);
        const resolvedBarcode =
          r.barcode?.trim() || stockItem?.barcode?.trim() || undefined;
        return {
          itemId: r.itemId,
          name: r.name,
          sku: r.sku,
          barcode: resolvedBarcode,
          unit: r.unit,
          quantity: r.quantity,
          costPrice: r.costPrice,
          originalPrice: r.originalPrice,
          discountPerUnit: r.discountPerUnit || 0,
          discountType: r.discountType || "fixed",
          discountPercent: r.discountPercent || 0,
          soldPrice: r.soldPrice,
          total: r.total,
          availableStock: r.availableStock,
        };
      });

      const finalInvoiceNo =
        invoiceNumber.trim() || `INV-${Date.now().toString().slice(-6)}`;

      const createdSale = storage.recordSale({
        invoiceNumber: finalInvoiceNo,
        date: date || new Date().toISOString().split("T")[0],
        time: saleTime || undefined,
        cashierName: cashierName || undefined,
        customerName: customerName.trim(),
        paymentMethod: "CASH",
        items: saleLines,
        subtotal: grossSubtotal,
        discountTotal: totalDiscount,
        orderDiscount: Math.max(0, orderDiscount || 0),
        totalAmount: netTotalAmount,
        notes: notes.trim() || undefined,
      });

      soundController.playSuccessBeep();

      // Notify parent and trigger auto-print
      onSaleCompleted(createdSale, true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to record sale order.";
      setError(msg);
      soundController.playErrorBeep();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut listener: F9 or Ctrl+Enter to complete sale instantly
  const handleSubmitSaleRef = useRef(handleSubmitSale);
  useEffect(() => {
    handleSubmitSaleRef.current = handleSubmitSale;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if currently submitting
      if (isSubmitting) return;

      const isF9 = e.key === "F9";
      const isCtrlEnter = (e.ctrlKey || e.metaKey) && e.key === "Enter";

      if (isF9 || isCtrlEnter) {
        e.preventDefault();
        handleSubmitSaleRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting]);

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & NAVIGATION                                */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
            title="Back to Sales Order List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Record New Sale Order</span>
            </h1>
          </div>
        </div>

        {/* Top Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-complete-sale-top"
            onClick={handleSubmitSale}
            disabled={isSubmitting || validLines.length === 0}
            title="Complete Sale & Auto-Print Invoice (Shortcut: F9 or Ctrl+Enter)"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>
              {isSubmitting
                ? "Recording..."
                : `Complete Sale (${formatPKR(netTotalAmount)})`}
            </span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-emerald-300 border border-slate-700">
              F9
            </kbd>
          </button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-600 hover:text-rose-900 text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. REAL-TIME KPI SUMMARY METRIC CARDS                     */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Line Items & Units */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Items &amp; Units
            </span>
            <div className="text-2xl font-black font-mono text-slate-900 mt-1">
              {validLines.length}{" "}
              <span className="text-xs text-slate-500 font-sans font-semibold">
                SKUs ({totalUnits} pcs)
              </span>
            </div>
          </div>
          <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Package className="w-5 h-5" />
          </span>
        </div>

        {/* Card 2: Gross Subtotal */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Gross Subtotal
            </span>
            <div className="text-2xl font-black font-mono text-slate-900 mt-1">
              {formatPKR(grossSubtotal)}
            </div>
          </div>
          <span className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
            <Tag className="w-5 h-5" />
          </span>
        </div>

        {/* Card 3: Total Discount */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
              Total Discount Given
            </span>
            <div className="text-2xl font-black font-mono text-amber-600 mt-1">
              - {formatPKR(totalDiscount)}
            </div>
          </div>
          <span className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <Percent className="w-5 h-5" />
          </span>
        </div>

        {/* Card 4: Net Grand Total */}
        <div className="p-4 rounded-2xl bg-white border-2 border-emerald-500 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Net Payable Total
            </span>
            <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
              {formatPKR(netTotalAmount)}
            </div>
          </div>
          <span className="p-2.5 rounded-xl bg-emerald-500 text-white">
            <DollarSign className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. INVOICE METADATA & QUICK BARCODE SCANNER TOOLBAR       */}
      {/* ========================================================= */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        {/* Row 1: Invoice Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Customer Name</span>{" "}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Walk in, Ahmed Ali..."
              className="w-full px-3 py-2 rounded-md border border-slate-300 font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          {/* Invoice # */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>Invoice / Bill #</span>
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden bg-slate-50"
            />
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2.5 py-2 rounded-md border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Time</span>
            </label>
            <input
              type="text"
              value={saleTime}
              onChange={(e) => setSaleTime(e.target.value)}
              className="w-full px-2.5 py-2 rounded-md border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Row 2: Rapid Barcode / SKU Scan Bar */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <form
            onSubmit={handleBarcodeScanSubmit}
            className="flex-1 w-full flex items-center gap-2"
          >
            <div className="relative flex-1">
              <BarcodeIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeScanInput}
                onChange={(e) => setBarcodeScanInput(e.target.value)}
                placeholder="Scan physical barcode or type SKU to instantly add product (Press Enter)..."
                className="w-full pl-9 pr-4 py-2 rounded-md border border-slate-300 bg-slate-50 focus:bg-white text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <ScanLine className="w-3.5 h-3.5 text-emerald-400" />
              <span>Scan / Add</span>
            </button>
          </form>

          {/* Scan feedback toast */}
          {scanFeedback && (
            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 animate-fadeIn ${
                scanFeedback.success
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-rose-100 text-rose-800 border border-rose-300"
              }`}
            >
              {scanFeedback.message}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. MULTI-ITEM SALES REPEATER TABLE                        */}
      {/* ========================================================= */}
      <div
        ref={searchContainerRef}
        className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-visible"
      >
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            <span className="font-black text-xs uppercase tracking-wider text-slate-900">
              Sale Items Repeater Table
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono">
              {validLines.length} valid item{validLines.length !== 1 ? "s" : ""}
            </span>

            {/* View Mode Display Preference Pill */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-md text-[10px] font-semibold text-slate-700 ml-2">
              <span className="px-1.5 text-slate-500">Search View:</span>
              <button
                type="button"
                onClick={() => handleToggleProductViewMode("blocks")}
                className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer ${
                  productViewMode === "blocks"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Show matching products as Grid (2 in a row)"
              >
                <LayoutGrid className="w-3 h-3 text-emerald-600" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleProductViewMode("list")}
                className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer ${
                  productViewMode === "list"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Show matching products as Compact List"
              >
                <List className="w-3 h-3 text-blue-600" />
                <span>List</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleAddMultipleRows(5)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              title="Add 5 empty rows at once"
            >
              <Plus className="w-3 h-3 text-slate-500" />
              <span>+5 Rows</span>
            </button>

            <button
              type="button"
              id="btn-add-repeater-row-table-head"
              onClick={handleAddNewRow}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Another Product</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-visible">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 w-10 text-center">#</th>
                <th className="px-3 py-3 min-w-[340px]">
                  Product Search (Type any alphabet to view list / blocks){" "}
                  <span className="text-rose-500">*</span>
                </th>
                <th className="px-3 py-3 min-w-[90px] text-center">In Stock</th>
                <th className="px-3 py-3 min-w-[130px] text-center">
                  Quantity
                </th>
                <th className="px-3 py-3 min-w-[120px] text-center">
                  Unit Price (Rs.)
                </th>
                <th className="px-3 py-3 min-w-[120px] text-center">
                  Discount / Unit (Rs.)
                </th>
                <th className="px-3 py-3 min-w-[120px] text-right">
                  Line Total (Rs.)
                </th>
                <th className="px-3 py-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => {
                const isSearchOpen = activeSearchRowId === row.id;
                const matchedProducts = getMatchingProducts(
                  row.searchQuery,
                  categoryFilter,
                );
                const hasDiscount = (row.discountPerUnit || 0) > 0;
                const isStockLow =
                  row.availableStock > 0 && row.availableStock <= 5;
                const hasSelected = Boolean(row.itemId && row.name);

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors group focus-within:bg-amber-50/20"
                  >
                    {/* Row Index */}
                    <td className="px-3 py-3 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Interactive Product Search Field with Live List or Blocks */}
                    <td className="px-3 py-3 relative">
                      <div className="relative">
                        <div className="relative flex items-center">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={
                              hasSelected && !isSearchOpen
                                ? `${row.name} (${row.sku})`
                                : row.searchQuery
                            }
                            onFocus={() => {
                              setActiveSearchRowId(row.id);
                              if (hasSelected) {
                                // Keep query ready for editing
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id
                                      ? { ...r, searchQuery: "" }
                                      : r,
                                  ),
                                );
                              }
                            }}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id
                                    ? { ...r, searchQuery: val }
                                    : r,
                                ),
                              );
                              setActiveSearchRowId(row.id);
                            }}
                            placeholder="Type any alphabet (e.g. 'c', 'case', 'cable')..."
                            className={`w-full pl-9 pr-8 py-2 rounded-md border text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all ${
                              hasSelected
                                ? "bg-emerald-50/70 border-emerald-300 text-slate-900"
                                : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                            }`}
                          />
                          {hasSelected && (
                            <button
                              type="button"
                              onClick={() => handleClearRowProduct(row.id)}
                              title="Clear and search another product"
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Floating Product Search Popover with Toggle: List or Blocks (Grid 2 in a row) */}
                        {isSearchOpen && (
                          <div className="absolute left-0 top-full mt-1.5 w-[1700px] max-w-[96vw] z-50 bg-white rounded-md shadow-2xl border border-slate-200 p-3.5 space-y-3 animate-fadeIn max-h-[490px] flex flex-col">
                            {/* Popover Header: Results Count + Blocks / List Switcher */}
                            <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-600 border-b border-slate-100 pb-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900 text-xs">
                                  {matchedProducts.length > 0
                                    ? `Found (${matchedProducts.length}) Products`
                                    : "No Products Found"}
                                </span>
                                {row.searchQuery.trim() && (
                                  <span className="text-[10px] text-slate-400">
                                    matching "{row.searchQuery}"
                                  </span>
                                )}
                              </div>

                              {/* View Mode Toggle: Grid (2 per row) vs List */}
                              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleProductViewMode("blocks")
                                  }
                                  className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    productViewMode === "blocks"
                                      ? "bg-slate-900 text-white shadow-xs"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                  title="Show 2 products in a row in grid layout"
                                >
                                  <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Grid</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleProductViewMode("list")
                                  }
                                  className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    productViewMode === "list"
                                      ? "bg-slate-900 text-white shadow-xs"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  <List className="w-3.5 h-3.5 text-blue-400" />
                                  <span>List</span>
                                </button>
                              </div>
                            </div>

                            {/* Category Filter Chips inside popover */}
                            {categories.length > 0 && (
                              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[8px] font-medium no-scrollbar">
                                <button
                                  type="button"
                                  onClick={() => setCategoryFilter("ALL")}
                                  className={`px-2.5 py-0.5 rounded-md border transition-colors cursor-pointer shrink-0 text-[12px] ${
                                    categoryFilter === "ALL"
                                      ? "bg-emerald-600 text-white border-emerald-600"
                                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  All Categories
                                </button>
                                {categories.slice(0, 8).map((cat) => (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setCategoryFilter(cat)}
                                    className={`px-2.5 py-0.5 rounded-md border transition-colors cursor-pointer shrink-0 text-[12px] ${
                                      categoryFilter === cat
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                    }`}
                                  >
                                    {cat}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Screen Protector Size Compatibility Banner if searching a mobile model (e.g. "Oppo A5") */}
                            {(() => {
                              const pMatches = getProtectorMatches(
                                row.searchQuery,
                              );
                              if (pMatches.length === 0) return null;
                              return (
                                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 shadow-2xs space-y-2 animate-fadeIn">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <span className="text-xs font-bold text-emerald-950">
                                        Compatible Screen Protector Size
                                        {pMatches.length > 1 ? "s" : ""} for "
                                        {row.searchQuery}":
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                      {pMatches.length} Size Match
                                      {pMatches.length > 1 ? "es" : ""}
                                    </span>
                                  </div>

                                  <div className="space-y-1.5">
                                    {pMatches.map((pMatch, pIdx) => (
                                      <div
                                        key={`${pMatch.protector.id}_${pMatch.model}_${pIdx}`}
                                        className="p-2 rounded-lg bg-white border border-emerald-200 flex items-center justify-between gap-2"
                                      >
                                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                                          <span className="text-[11px] font-bold text-slate-500 uppercase">
                                            Size:
                                          </span>
                                          <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-xs">
                                            {pMatch.protector.name}
                                          </span>
                                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                            {pMatch.brand} {pMatch.model}
                                          </span>
                                          <span className="text-xs font-bold text-emerald-700 font-mono">
                                            {formatPKR(
                                              pMatch.protector.defaultPrice ||
                                                150,
                                            )}
                                          </span>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSelectProtectorForSale(
                                              row.id,
                                              pMatch,
                                            )
                                          }
                                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                                          title="Select this protector size for the invoice"
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>Add to Bill</span>
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Products Container: Scrollable Blocks or List */}
                            <div className="overflow-y-auto flex-1 pr-1 max-h-[340px]">
                              {matchedProducts.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 space-y-1">
                                  <Package className="w-8 h-8 mx-auto text-slate-300" />
                                  <p className="text-xs font-semibold text-slate-700">
                                    No products match "{row.searchQuery}"
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    Try typing a different alphabet, SKU number
                                    or reset category filter.
                                  </p>
                                </div>
                              ) : productViewMode === "blocks" ? (
                                /* ============================================ */
                                /* VIEW 1: GRID LAYOUT (2 PRODUCTS IN A ROW)    */
                                /* ============================================ */
                                <div className="grid grid-cols-3 gap-2.5 pt-0.5">
                                  {matchedProducts.map((p) => {
                                    const isOut = p.currentStock <= 0;
                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        disabled={isOut}
                                        onClick={() =>
                                          handleSelectProductForRow(row.id, p)
                                        }
                                        className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 group/card ${
                                          isOut
                                            ? "bg-slate-50 border-slate-200 opacity-40 cursor-not-allowed"
                                            : "bg-white hover:bg-emerald-50/70 hover:border-emerald-400 border-slate-200 shadow-2xs hover:shadow-xs active:scale-[0.99]"
                                        }`}
                                      >
                                        {/* Top: Product Name & Category */}
                                        <div className="min-w-0 w-full space-y-1">
                                          <div className="flex items-start justify-between gap-1.5">
                                            <div className="text-lg font-bold tracking-wide text-slate-900 group-hover/card:text-emerald-950 leading-snug break-words line-clamp-2">
                                              {p.name}
                                            </div>
                                            <span className="text-lg font-bold tracking-wide text-emerald-700 shrink-0">
                                              {p.sellingPrice}
                                            </span>
                                          </div>
                                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap">
                                            <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-700 font-bold">
                                              SKU: {p.sku}
                                            </span>
                                            {p.category && (
                                              <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-semibold truncate max-w-[120px]">
                                                {p.category}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Bottom: Stock Status & Quick Select Badge */}
                                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 w-full">
                                          <span
                                            className={`text-sm font-bold px-2 py-0.5 rounded-md ${
                                              isOut
                                                ? "bg-rose-100 text-rose-800"
                                                : p.currentStock <= 5
                                                  ? "bg-amber-100 text-amber-800"
                                                  : "bg-emerald-100 text-emerald-800"
                                            }`}
                                          >
                                            {isOut
                                              ? "Out of stock"
                                              : `${p.currentStock} ${p.unit}`}
                                          </span>
                                          <span className="px-2 py-0.5 rounded-md bg-emerald-600 group-hover/card:bg-emerald-700 text-white font-normal text-sm shadow-2xs">
                                            + Add
                                          </span>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                /* ============================================ */
                                /* VIEW 2: STRUCTURED COMPACT LIST              */
                                /* ============================================ */
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                                  {matchedProducts.map((p) => {
                                    const isOut = p.currentStock <= 0;
                                    return (
                                      <div
                                        key={p.id}
                                        onClick={() => {
                                          if (!isOut)
                                            handleSelectProductForRow(
                                              row.id,
                                              p,
                                            );
                                        }}
                                        className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                                          isOut
                                            ? "opacity-40 bg-slate-50 cursor-not-allowed"
                                            : "hover:bg-emerald-50/60 cursor-pointer group/row"
                                        }`}
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-lg text-slate-900 group-hover/row:text-emerald-950 break-words tracking-wide">
                                              {p.name}
                                            </span>
                                            <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[10px] font-mono font-bold text-slate-600 shrink-0">
                                              {p.sku}
                                            </span>
                                          </div>
                                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-slate-500">
                                              {p.category}
                                            </span>
                                            {p.barcode && (
                                              <span>• BC: {p.barcode}</span>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                          <span
                                            className={`text-md font-bold px-2 py-0.5 rounded-md ${
                                              isOut
                                                ? "bg-rose-100 text-rose-800"
                                                : p.currentStock <= 5
                                                  ? "bg-amber-100 text-amber-800"
                                                  : "bg-emerald-100 text-emerald-800"
                                            }`}
                                          >
                                            {isOut
                                              ? "Out of stock"
                                              : `${p.currentStock} ${p.unit}`}
                                          </span>

                                          <span className="font-bold text-emerald-700 text-lg min-w-[75px] text-right">
                                            {p.sellingPrice}
                                          </span>

                                          <button
                                            type="button"
                                            disabled={isOut}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSelectProductForRow(
                                                row.id,
                                                p,
                                              );
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white font-normal text-sm transition-colors cursor-pointer"
                                          >
                                            + Add
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* In Stock Badge */}
                    <td className="px-3 py-3 text-center">
                      {hasSelected ? (
                        <span
                          className={`inline-block rounded-full text-md font-bold ${
                            row.availableStock <= 0
                              ? "text-rose-800"
                              : isStockLow
                                ? "text-amber-800"
                                : "text-emerald-800"
                          }`}
                        >
                          {row.availableStock}
                        </span>
                      ) : (
                        <span className="text-slate-300">--</span>
                      )}
                    </td>

                    {/* Quantity Stepper */}
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateQuantity(row.id, row.quantity - 1)
                          }
                          disabled={!hasSelected || row.quantity <= 1}
                          className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={row.availableStock || 9999}
                          disabled={!hasSelected}
                          value={row.quantity}
                          onChange={(e) =>
                            handleUpdateQuantity(
                              row.id,
                              parseInt(e.target.value) || 1,
                            )
                          }
                          className="w-16 px-1 py-1 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 text-xs text-center focus:ring-2 focus:ring-slate-900 focus:outline-hidden disabled:bg-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateQuantity(row.id, row.quantity + 1)
                          }
                          disabled={
                            !hasSelected ||
                            (row.availableStock > 0 &&
                              row.quantity >= row.availableStock)
                          }
                          className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Unit Price (Rs.) - Editable catalog price, no "Sold Price" column */}
                    <td className="px-3 py-3 text-right">
                      {hasSelected ? (
                        <div
                          onChange={(e) =>
                            handleUpdateUnitPrice(
                              row.id,
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full px-2 py-1 border-slate-300 font-bold text-slate-800 text-md text-center bg-white"
                        >
                          {row.originalPrice}
                        </div>
                      ) : (
                        <span className="font-mono text-slate-300">--</span>
                      )}
                    </td>

                    {/* Discount / Unit (Rs.) */}
                    <td className="px-3 py-3 text-left">
                      {hasSelected ? (
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max={row.originalPrice}
                            value={row.discountPerUnit || ""}
                            onChange={(e) =>
                              handleDiscountChange(
                                row.id,
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            placeholder="0"
                            className="w-full px-2 py-1 rounded-md border border-slate-300 font-mono font-bold text-amber-700 text-xs text-left focus:ring-2 focus:ring-slate-900 focus:outline-hidden bg-white"
                          />
                          {/* {hasDiscount && (
                            <span className="text-[10px] font-bold text-amber-600 block mt-0.5">
                              -{row.discountPercent}% off
                            </span>
                          )} */}
                        </div>
                      ) : (
                        <span className="font-mono text-slate-300">--</span>
                      )}
                    </td>

                    {/* Line Total */}
                    <td className="px-3 py-3 text-right font-bold text-md text-emerald-700 whitespace-nowrap">
                      {hasSelected ? row.total : "--"}
                    </td>

                    {/* Action: Delete Row */}
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        title="Remove item row"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Table Footer Totals */}
            <tfoot className="bg-slate-50/90 font-bold border-t border-slate-200 text-xs">
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-3 text-right uppercase text-[10px] text-slate-500"
                >
                  Subtotals:
                </td>
                <td className="px-3 py-3 font-mono font-black text-center text-slate-900">
                  {totalUnits} pcs
                </td>
                <td className="px-3 py-3 font-mono font-black text-right text-slate-700">
                  {formatPKR(grossSubtotal)}
                </td>
                <td className="px-3 py-3 font-mono font-black text-right text-amber-600">
                  {totalLineDiscounts > 0
                    ? `- ${formatPKR(totalLineDiscounts)}`
                    : "--"}
                </td>
                <td className="px-3 py-3 font-mono font-black text-sm text-right text-emerald-600 whitespace-nowrap">
                  {formatPKR(netTotalAmount)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Big Repeater Add Button directly under table */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              id="btn-add-repeater-row-bottom"
              onClick={handleAddNewRow}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md border-2 border-dashed border-emerald-500/70 hover:border-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition-all shadow-2xs cursor-pointer w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>+ Add Another Product Item</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddMultipleRows(5)}
              className="px-3 py-3 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
              title="Add 5 more product rows"
            >
              +5 Rows
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-slate-700">
              Extra Overall Invoice Discount (Rs.):
            </span>
            <input
              type="number"
              min="0"
              value={orderDiscount || ""}
              onChange={(e) =>
                setOrderDiscount(parseFloat(e.target.value) || 0)
              }
              placeholder="0"
              className="w-28 px-3 py-1.5 rounded-md border border-slate-300 font-mono font-bold text-amber-700 text-xs text-left focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
            />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. NOTES & REMARKS                                        */}
      {/* ========================================================= */}
      {/* <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Order Notes / Warranty / Remarks (Optional)
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. 1 year official warranty, return/exchange within 7 days, customer phone..."
          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
        />
      </div> */}

      {/* ========================================================= */}
      {/* 6. BOTTOM SUBMIT ACTION BAR (STICKY)                      */}
      {/* ========================================================= */}
      <div className="sticky bottom-4 z-20 bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Grand Total To Charge
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400">
              {formatPKR(netTotalAmount)}
            </div>
          </div>
          <div className="h-10 w-px bg-slate-700 hidden sm:block" />
          <div className="hidden sm:block text-md text-slate-300">
            <span className="text-white">
              {validLines.length} item{validLines.length !== 1 ? "s" : ""} •{" "}
              {totalUnits} unit{totalUnits !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-complete-sale-bottom"
            onClick={handleSubmitSale}
            disabled={isSubmitting || validLines.length === 0}
            title="Complete Sale & Auto-Print Invoice (Shortcut: F9 or Ctrl+Enter)"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4 text-white" />
            <span>
              {isSubmitting
                ? "Recording Sale..."
                : `Complete Sale (${formatPKR(netTotalAmount)})`}
            </span>
            <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-700 text-[10px] font-mono font-bold text-white border border-emerald-600">
              F9
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
};
