import React, { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  Boxes,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Barcode as BarcodeIcon,
  DollarSign,
  Package,
  Layers,
  Save,
  RotateCcw,
  Tag,
  Check,
  X,
  FolderPlus,
  SlidersHorizontal,
} from "lucide-react";
import { InventoryItem } from "../types";
import { storage } from "../services/storage";
import { generateRandomBarcode } from "../utils/barcode";
import { formatPKR } from "../utils/currency";

interface RepeaterProductRow {
  id: string;
  name: string;
  category: string;
  brand: string;
  sku: string;
  barcode: string;
  unit: string;
  costPrice: number | "";
  sellingPrice: number | "";
  currentStock: number | "";
  minStockAlert: number | "";
  location: string;
  notes: string;
  isCustomCategory?: boolean; // When true, shows inline text input to type custom category
  isCustomBrand?: boolean; // When true, shows inline text input to type custom brand
}

interface AddProductsPageProps {
  existingItems: InventoryItem[];
  onBack: () => void;
  onSaved: (count: number) => void;
}

const COMMON_CATEGORIES = [
  "Mobile Accessories",
  "Charging Cables",
  "Power Adapters",
  "Handsfree / Earphones",
  "Tempered Glass",
  "Back Covers & Cases",
  "Power Banks",
  "Batteries",
  "Smart Watches",
  "Bluetooth Speakers",
  "Mobile Spare Parts",
  "Electronics",
  "General Items",
];

const SUGGESTED_QUICK_CATEGORIES = [
  "Screen Protectors",
  "Car Mounts & Holders",
  "OTG & Connectors",
  "Memory Cards & USBs",
  "Camera Lens Protectors",
  "AirPods & Earbuds",
  "Gaming Accessories",
  "Repair Tools & Glue",
  "Keypads & Keyboards",
];

const COMMON_BRANDS = [
  "Samsung",
  "Apple",
  "Xiaomi",
  "Infinix",
  "Tecno",
  "Oppo",
  "Vivo",
  "Realme",
  "Anker",
  "Baseus",
  "Ronin",
  "Audionic",
  "Faster",
  "Dany",
  "Remax",
  "Joyroom",
  "Generic / Unbranded",
];

const SUGGESTED_QUICK_BRANDS = [
  "Apple",
  "Samsung",
  "Xiaomi",
  "Infinix",
  "Tecno",
  "Oppo",
  "Vivo",
  "Realme",
  "Anker",
  "Baseus",
  "Ronin",
  "Audionic",
];

const COMMON_UNITS = ["pcs", "box", "pack", "set", "meter", "pair"];

export const AddProductsPage: React.FC<AddProductsPageProps> = ({
  existingItems,
  onBack,
  onSaved,
}) => {
  // User's custom categories saved in localStorage
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("pos_custom_categories");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [categoriesClearedTick, setCategoriesClearedTick] = useState(0);
  const [brandsClearedTick, setBrandsClearedTick] = useState(0);

  // Listen to storage clear events so category and brand options update immediately
  useEffect(() => {
    const handleCategoriesCleared = () => {
      setCustomCategories([]);
      setCategoriesClearedTick((c) => c + 1);
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          category: "",
          isCustomCategory: true,
        })),
      );
    };

    const handleBrandsCleared = () => {
      setCustomBrands([]);
      setBrandsClearedTick((b) => b + 1);
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          brand: "",
          isCustomBrand: true,
        })),
      );
    };

    window.addEventListener("pos_categories_cleared", handleCategoriesCleared);
    window.addEventListener("pos_brands_cleared", handleBrandsCleared);
    return () => {
      window.removeEventListener(
        "pos_categories_cleared",
        handleCategoriesCleared,
      );
      window.removeEventListener("pos_brands_cleared", handleBrandsCleared);
    };
  }, []);

  const isCategoriesCleared = () => {
    try {
      return localStorage.getItem("pos_categories_cleared") === "true";
    } catch {
      return false;
    }
  };

  const isBrandsCleared = () => {
    try {
      return localStorage.getItem("pos_brands_cleared") === "true";
    } catch {
      return false;
    }
  };

  // Combine custom categories and existing categories from items
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    // 1. User's custom categories first
    customCategories.forEach((c) => {
      if (c && c.trim()) set.add(c.trim());
    });
    // 2. Existing items categories
    existingItems.forEach((it) => {
      if (it.category && it.category.trim()) set.add(it.category.trim());
    });
    // 3. Built-in categories are ONLY included if user has NOT erased data and there are existing sample items
    if (
      !isCategoriesCleared() &&
      existingItems.length > 0 &&
      customCategories.length === 0
    ) {
      COMMON_CATEGORIES.forEach((c) => set.add(c));
    }
    return Array.from(set);
  }, [existingItems, customCategories, categoriesClearedTick]);

  // User's custom brands saved in localStorage
  const [customBrands, setCustomBrands] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("pos_custom_brands");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Combine custom brands, existing items brands, and common brands
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    // 1. User's custom brands first
    customBrands.forEach((b) => {
      if (b && b.trim()) set.add(b.trim());
    });
    // 2. Existing items brands
    existingItems.forEach((it) => {
      if (it.brand && it.brand.trim()) set.add(it.brand.trim());
    });
    // 3. Built-in brands are ONLY included if user has NOT erased data and there are existing sample items
    if (
      !isBrandsCleared() &&
      existingItems.length > 0 &&
      customBrands.length === 0
    ) {
      COMMON_BRANDS.forEach((b) => set.add(b));
    }
    return Array.from(set);
  }, [existingItems, customBrands, brandsClearedTick]);

  // Modal dialog state for adding a custom category
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [applyNewCategoryToAllRows, setApplyNewCategoryToAllRows] =
    useState(true);
  const [categoryModalError, setCategoryModalError] = useState<string | null>(
    null,
  );

  // Modal dialog state for adding a custom brand
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [applyNewBrandToAllRows, setApplyNewBrandToAllRows] = useState(true);
  const [brandModalError, setBrandModalError] = useState<string | null>(null);

  // Success notice feedback
  const [categorySuccessToast, setCategorySuccessToast] = useState<
    string | null
  >(null);

  // Generate a unique SKU helper
  const generateSku = (indexOffset: number = 0) => {
    const count = existingItems.length + indexOffset + 1;
    const rand = Math.floor(100 + Math.random() * 900);
    return `SKU-${count}-${rand}`;
  };

  // Helper to create an empty row with smart defaults
  const createEmptyRow = (
    indexOffset: number = 0,
    defaultCategory?: string,
    defaultBrand?: string,
  ): RepeaterProductRow => {
    const chosenCat =
      defaultCategory ||
      (availableCategories.length > 0 ? availableCategories[0] : "");
    const chosenBrand = defaultBrand !== undefined ? defaultBrand : "";
    return {
      id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: "",
      category: chosenCat,
      brand: chosenBrand,
      sku: generateSku(indexOffset),
      barcode: generateRandomBarcode(),
      unit: "pcs",
      costPrice: "",
      sellingPrice: "",
      currentStock: 10,
      minStockAlert: 5,
      location: "Aisle 1",
      notes: "",
      isCustomCategory: availableCategories.length === 0,
      isCustomBrand: availableBrands.length === 0,
    };
  };

  // State: Repeater rows starting with 3 clean rows
  const [rows, setRows] = useState<RepeaterProductRow[]>(() => [
    createEmptyRow(0),
    createEmptyRow(1),
    createEmptyRow(2),
  ]);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchCategory, setBatchCategory] = useState<string>("");
  const [batchBrand, setBatchBrand] = useState<string>("");

  // Erase all categories handler
  const handleClearAllCategories = () => {
    storage.clearAllCategories();
    setCustomCategories([]);
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        category: "",
        isCustomCategory: true,
      })),
    );
    setCategorySuccessToast(
      "All categories erased. You can now add your own categories only.",
    );
    setTimeout(() => {
      setCategorySuccessToast(null);
    }, 4000);
  };

  // Erase all brands handler
  const handleClearAllBrands = () => {
    storage.clearAllBrands();
    setCustomBrands([]);
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        brand: "",
        isCustomBrand: true,
      })),
    );
    setCategorySuccessToast(
      "All brands erased. You can now add your own brands only.",
    );
    setTimeout(() => {
      setCategorySuccessToast(null);
    }, 4000);
  };

  // Register a new custom category
  const handleRegisterCategory = (
    categoryName: string,
    applyToAll: boolean = false,
    targetRowId?: string,
  ) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;

    // Check if not already in custom list
    if (!customCategories.includes(trimmed)) {
      const updated = [trimmed, ...customCategories];
      setCustomCategories(updated);
      try {
        localStorage.setItem("pos_custom_categories", JSON.stringify(updated));
        localStorage.setItem("pos_categories_cleared", "true");
      } catch {
        // ignore
      }
    }

    // Apply to target row or all rows
    if (applyToAll) {
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          category: trimmed,
          isCustomCategory: false,
        })),
      );
      setCategorySuccessToast(
        `Category "${trimmed}" created and applied to all rows!`,
      );
    } else if (targetRowId) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === targetRowId
            ? { ...r, category: trimmed, isCustomCategory: false }
            : r,
        ),
      );
      setCategorySuccessToast(
        `Category "${trimmed}" set for this product row!`,
      );
    } else {
      setCategorySuccessToast(
        `Category "${trimmed}" added to categories list!`,
      );
    }

    setTimeout(() => {
      setCategorySuccessToast(null);
    }, 4000);
  };

  // Submit from the new category modal
  const handleModalAddCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCategoryModalError(null);

    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCategoryModalError("Please enter a category name.");
      return;
    }

    handleRegisterCategory(trimmed, applyNewCategoryToAllRows);
    setNewCategoryName("");
    setIsCategoryModalOpen(false);
  };

  // Register a new custom brand
  const handleRegisterBrand = (
    brandName: string,
    applyToAll: boolean = false,
    targetRowId?: string,
  ) => {
    const trimmed = brandName.trim();
    if (!trimmed) return;

    if (!customBrands.includes(trimmed)) {
      const updated = [trimmed, ...customBrands];
      setCustomBrands(updated);
      try {
        localStorage.setItem("pos_custom_brands", JSON.stringify(updated));
        localStorage.setItem("pos_brands_cleared", "true");
      } catch {
        // ignore
      }
    }

    if (applyToAll) {
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          brand: trimmed,
          isCustomBrand: false,
        })),
      );
      setCategorySuccessToast(
        `Brand "${trimmed}" created and applied to all rows!`,
      );
    } else if (targetRowId) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === targetRowId
            ? { ...r, brand: trimmed, isCustomBrand: false }
            : r,
        ),
      );
      setCategorySuccessToast(`Brand "${trimmed}" set for this product row!`);
    } else {
      setCategorySuccessToast(`Brand "${trimmed}" added to brands list!`);
    }

    setTimeout(() => {
      setCategorySuccessToast(null);
    }, 4000);
  };

  // Submit from the new brand modal
  const handleModalAddBrand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setBrandModalError(null);

    const trimmed = newBrandName.trim();
    if (!trimmed) {
      setBrandModalError("Please enter a brand name.");
      return;
    }

    handleRegisterBrand(trimmed, applyNewBrandToAllRows);
    setNewBrandName("");
    setIsBrandModalOpen(false);
  };

  // Repeater handlers
  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow(prev.length)]);
  };

  const handleAddMultipleRows = (count: number) => {
    setRows((prev) => {
      const newItems: RepeaterProductRow[] = [];
      for (let i = 0; i < count; i++) {
        newItems.push(createEmptyRow(prev.length + i));
      }
      return [...prev, ...newItems];
    });
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) {
      // Keep at least 1 row
      setRows([createEmptyRow(0)]);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDuplicateRow = (row: RepeaterProductRow) => {
    const duplicated: RepeaterProductRow = {
      ...row,
      id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sku: generateSku(rows.length),
      barcode: generateRandomBarcode(),
      name: row.name ? `${row.name} (Copy)` : "",
      isCustomCategory: false,
      isCustomBrand: false,
    };
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      if (idx >= 0) {
        const next = [...prev];
        next.splice(idx + 1, 0, duplicated);
        return next;
      }
      return [...prev, duplicated];
    });
  };

  const handleUpdateRow = (
    id: string,
    field: keyof RepeaterProductRow,
    value: any,
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const handleRegenerateBarcode = (id: string) => {
    handleUpdateRow(id, "barcode", generateRandomBarcode());
  };

  const handleClearEmptyRows = () => {
    setRows((prev) => {
      const filled = prev.filter((r) => r.name.trim() !== "");
      return filled.length > 0 ? filled : [createEmptyRow(0)];
    });
  };

  const handleApplyBatchCategory = (cat: string) => {
    if (!cat) return;
    setRows((prev) =>
      prev.map((r) => ({ ...r, category: cat, isCustomCategory: false })),
    );
    setBatchCategory("");
  };

  const handleApplyBatchBrand = (brandVal: string) => {
    if (!brandVal) return;
    setRows((prev) =>
      prev.map((r) => ({ ...r, brand: brandVal, isCustomBrand: false })),
    );
    setBatchBrand("");
  };

  // Real-time live summary calculations
  const summary = useMemo(() => {
    const validRows = rows.filter((r) => r.name.trim() !== "");
    let totalStockUnits = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;

    validRows.forEach((r) => {
      const qty = Number(r.currentStock) || 0;
      const cost = Number(r.costPrice) || 0;
      const retail = Number(r.sellingPrice) || 0;
      totalStockUnits += qty;
      totalCostValue += cost * qty;
      totalRetailValue += retail * qty;
    });

    const potentialProfit = Math.max(0, totalRetailValue - totalCostValue);
    const profitMargin =
      totalRetailValue > 0 ? (potentialProfit / totalRetailValue) * 100 : 0;

    return {
      totalProducts: validRows.length,
      totalRows: rows.length,
      totalStockUnits,
      totalCostValue,
      totalRetailValue,
      potentialProfit,
      profitMargin,
    };
  }, [rows]);

  // Submit all products to inventory
  const handleSaveAll = async () => {
    setFormError(null);

    // Filter valid rows that have a product name
    const validRows = rows.filter((r) => r.name.trim() !== "");

    if (validRows.length === 0) {
      setFormError("Please enter at least one product with a Name.");
      return;
    }

    // Validation checks for prices and SKUs
    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      if (!r.name.trim()) {
        setFormError(`Row #${i + 1}: Product name is required.`);
        return;
      }
      if (!r.sku.trim()) {
        setFormError(`Row #${i + 1} (${r.name}): SKU code is required.`);
        return;
      }
      const cost = Number(r.costPrice);
      const sell = Number(r.sellingPrice);
      if (isNaN(cost) || cost < 0) {
        setFormError(
          `Row #${i + 1} (${r.name}): Please enter a valid Cost Price.`,
        );
        return;
      }
      if (isNaN(sell) || sell < 0) {
        setFormError(
          `Row #${i + 1} (${r.name}): Please enter a valid Selling Price.`,
        );
        return;
      }
    }

    // Check for duplicate SKUs within the batch
    const skusInBatch = new Set<string>();
    for (const r of validRows) {
      const cleanSku = r.sku.trim().toLowerCase();
      if (skusInBatch.has(cleanSku)) {
        setFormError(
          `Duplicate SKU "${r.sku}" found in your batch table. Every SKU must be unique.`,
        );
        return;
      }
      skusInBatch.add(cleanSku);
    }

    setIsSubmitting(true);

    try {
      // Map to InventoryItem format
      const itemsToSave: Array<
        Omit<InventoryItem, "id" | "createdAt" | "updatedAt">
      > = validRows.map((r) => {
        const cost =
          typeof r.costPrice === "number"
            ? r.costPrice
            : Number(r.costPrice) || 0;
        const sell =
          typeof r.sellingPrice === "number"
            ? r.sellingPrice
            : Number(r.sellingPrice) || 0;
        const stock =
          typeof r.currentStock === "number"
            ? r.currentStock
            : Number(r.currentStock) || 0;
        const alert =
          typeof r.minStockAlert === "number"
            ? r.minStockAlert
            : Number(r.minStockAlert) || 5;

        // Ensure category is registered in custom categories if new
        const cat = r.category.trim() || availableCategories[0] || "General";
        if (cat && !customCategories.includes(cat)) {
          const updated = [cat, ...customCategories];
          try {
            localStorage.setItem(
              "pos_custom_categories",
              JSON.stringify(updated),
            );
            localStorage.setItem("pos_categories_cleared", "true");
          } catch {
            // ignore
          }
        }

        const brandVal = r.brand?.trim() || "";
        if (brandVal && !customBrands.includes(brandVal)) {
          const updatedBrands = [brandVal, ...customBrands];
          try {
            localStorage.setItem(
              "pos_custom_brands",
              JSON.stringify(updatedBrands),
            );
          } catch {
            // ignore
          }
        }

        return {
          sku: r.sku.trim(),
          barcode: r.barcode.trim() || r.sku.trim(),
          name: r.name.trim(),
          category: cat,
          brand: brandVal || undefined,
          unit: r.unit || "pcs",
          costPrice: cost,
          sellingPrice: sell,
          currentStock: stock,
          minStockAlert: alert,
          location: r.location.trim() || undefined,
          notes: r.notes.trim() || undefined,
        };
      });

      // Save batch to storage
      storage.addItems(itemsToSave);

      // Notify parent & return
      onSaved(itemsToSave.length);
    } catch (err: any) {
      setFormError(err.message || "Failed to save products to database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & NAVIGATION                                */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
            title="Back to Inventory"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Add Products to Inventory</span>
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
            id="btn-save-all-products-top"
            onClick={handleSaveAll}
            disabled={isSubmitting || summary.totalProducts === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>
              {isSubmitting
                ? "Saving..."
                : `Save ${summary.totalProducts > 0 ? `(${summary.totalProducts})` : ""} Products`}
            </span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {categorySuccessToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{categorySuccessToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setCategorySuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-950 font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Form Error Banner */}
      {formError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-rose-600 hover:text-rose-900 text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. REAL-TIME SUMMARY KPI CARDS                            */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total SKUs ready */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Products to Add
            </span>
            <div className="text-2xl font-black font-mono text-slate-900 mt-1">
              {summary.totalProducts}{" "}
              <span className="text-xs text-slate-400 font-sans font-normal">
                / {summary.totalRows} rows
              </span>
            </div>
          </div>
          <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Package className="w-5 h-5" />
          </span>
        </div>

        {/* Card 2: Total Units */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Stock Units
            </span>
            <div className="text-2xl font-black font-mono text-slate-900 mt-1">
              {summary.totalStockUnits}{" "}
              <span className="text-xs text-slate-400 font-sans font-normal">
                units
              </span>
            </div>
          </div>
          <span className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
            <Layers className="w-5 h-5" />
          </span>
        </div>

        {/* Card 3: Total Stock Cost */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Stock Cost
            </span>
            <div className="text-2xl font-black font-mono text-slate-900 mt-1">
              {formatPKR(summary.totalCostValue)}
            </div>
          </div>
          <span className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <DollarSign className="w-5 h-5" />
          </span>
        </div>

        {/* Card 4: Estimated Retail Value & Margin */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Estimated Retail Value
            </span>
            <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
              {formatPKR(summary.totalRetailValue)}
            </div>
          </div>
          <span className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
            <Sparkles className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. BATCH TOOLBAR / HELPERS & CUSTOM CATEGORY ACTION       */}
      {/* ========================================================= */}
      <div className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Quick Category & Brand Apply with Add Custom buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Category */}
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-700">Quick Category:</span>
            <select
              value={batchCategory}
              onChange={(e) => {
                if (e.target.value === "__ADD_NEW_MODAL__") {
                  setIsCategoryModalOpen(true);
                } else if (e.target.value === "__CLEAR_ALL__") {
                  handleClearAllCategories();
                } else {
                  setBatchCategory(e.target.value);
                  handleApplyBatchCategory(e.target.value);
                }
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden text-xs cursor-pointer shadow-2xs"
            >
              <option value="">
                {availableCategories.length === 0
                  ? "No categories yet (Create below)..."
                  : "Apply category to all rows..."}
              </option>
              {availableCategories.length > 0 && (
                <optgroup
                  label={`Available Categories (${availableCategories.length})`}
                >
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Manage Categories">
                <option
                  value="__ADD_NEW_MODAL__"
                  className="font-bold text-emerald-700 bg-emerald-50"
                >
                  ➕ + Create New Category...
                </option>
                {availableCategories.length > 0 && (
                  <option
                    value="__CLEAR_ALL__"
                    className="font-semibold text-rose-700 bg-rose-50"
                  >
                    🗑️ Erase All Categories...
                  </option>
                )}
              </optgroup>
            </select>
          </div>

          {/* Direct "+ Add My Own Category" button */}
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Add Category</span>
          </button>

          {/* Quick Brand Apply */}
          <div className="flex items-center gap-2 ml-1">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-700">Quick Brand:</span>
            <select
              value={batchBrand}
              onChange={(e) => {
                if (e.target.value === "__ADD_NEW_BRAND__") {
                  setIsBrandModalOpen(true);
                } else if (e.target.value === "__CLEAR_ALL_BRANDS__") {
                  handleClearAllBrands();
                } else {
                  setBatchBrand(e.target.value);
                  handleApplyBatchBrand(e.target.value);
                }
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden text-xs cursor-pointer shadow-2xs"
            >
              <option value="">
                {availableBrands.length === 0
                  ? "No brands yet (Create below)..."
                  : "Apply brand to all rows..."}
              </option>
              {availableBrands.length > 0 && (
                <optgroup
                  label={`Available Brands (${availableBrands.length})`}
                >
                  {availableBrands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Manage Brands">
                <option
                  value="__ADD_NEW_BRAND__"
                  className="font-bold text-indigo-700 bg-indigo-50"
                >
                  ➕ + Create New Brand...
                </option>
                {availableBrands.length > 0 && (
                  <option
                    value="__CLEAR_ALL_BRANDS__"
                    className="font-semibold text-rose-700 bg-rose-50"
                  >
                    🗑️ Erase All Brands...
                  </option>
                )}
              </optgroup>
            </select>
          </div>

          {/* Direct "+ Add My Own Brand" button */}
          <button
            type="button"
            onClick={() => setIsBrandModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Add Brand</span>
          </button>

          {availableCategories.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllCategories}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-semibold text-xs transition-colors cursor-pointer"
              title="Erase all existing categories so you can add your own"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Erase Categories</span>
            </button>
          )}

          {availableBrands.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllBrands}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-semibold text-xs transition-colors cursor-pointer"
              title="Erase all existing brands so you can add your own"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Erase Brands</span>
            </button>
          )}
        </div>

        {/* Right: Quick Batch Row Adders */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleAddMultipleRows(5)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-700 text-xs transition-colors cursor-pointer shadow-2xs"
          >
            + Add 5 Rows
          </button>
          <button
            type="button"
            onClick={handleClearEmptyRows}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-600 text-xs transition-colors cursor-pointer shadow-2xs"
          >
            Clear Empty Rows
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. MULTI-PRODUCT REPEATER TABLE                           */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 w-10 text-center">#</th>
                <th className="px-3 py-3 min-w-[200px]">
                  Name <span className="text-rose-500">*</span>
                </th>
                <th className="px-3 py-3 min-w-[180px]">
                  Category<span className="text-rose-500">*</span>
                </th>
                <th className="px-3 py-3 min-w-[160px]">Brand</th>
                <th className="px-3 py-3 min-w-[120px]">SKU</th>
                <th className="px-3 py-3 min-w-[150px]">Barcode</th>
                {/* <th className="px-3 py-3 min-w-[85px]">Unit</th> */}
                <th className="px-3 py-3 min-w-[110px]">
                  Cost (Rs.) <span className="text-rose-500">*</span>
                </th>
                <th className="px-3 py-3 min-w-[110px]">
                  Sale (Rs.) <span className="text-rose-500">*</span>
                </th>
                <th className="px-3 py-3 min-w-[95px]">Stock</th>
                <th className="px-3 py-3 min-w-[85px]">Alert</th>
                <th className="px-3 py-3 min-w-[110px] text-right">
                  Total Cost
                </th>
                <th className="px-3 py-3 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => {
                const rowCost = Number(row.costPrice) || 0;
                const rowQty = Number(row.currentStock) || 0;
                const rowTotalCost = rowCost * rowQty;

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors group focus-within:bg-amber-50/30"
                  >
                    {/* Index */}
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Product Name */}
                    <td className="px-3 py-2.5 min-w-[320px]">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) =>
                          handleUpdateRow(row.id, "name", e.target.value)
                        }
                        placeholder="e.g. iPhone 15 Pro Case..."
                        autoFocus={idx === 0}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden bg-white"
                      />
                    </td>

                    {/* Category Cell: Dynamic Select or Custom Category Input */}
                    <td className="px-3 py-2.5 max-w-[200px]">
                      {row.isCustomCategory ||
                      availableCategories.length === 0 ? (
                        /* Direct custom input or when no categories exist yet */
                        <div className="flex items-center gap-1 w-full">
                          <input
                            type="text"
                            value={row.category}
                            onChange={(e) =>
                              handleUpdateRow(
                                row.id,
                                "category",
                                e.target.value,
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (row.category.trim()) {
                                  handleRegisterCategory(
                                    row.category,
                                    false,
                                    row.id,
                                  );
                                }
                              } else if (
                                e.key === "Escape" &&
                                availableCategories.length > 0
                              ) {
                                handleUpdateRow(
                                  row.id,
                                  "isCustomCategory",
                                  false,
                                );
                              }
                            }}
                            placeholder="Type category name..."
                            className="w-full px-2 py-1.5 rounded-lg border-2 border-emerald-500 font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-emerald-50/40"
                          />
                          {row.category.trim() && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRegisterCategory(
                                  row.category,
                                  false,
                                  row.id,
                                )
                              }
                              title="Save custom category"
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shrink-0"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {availableCategories.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateRow(
                                  row.id,
                                  "isCustomCategory",
                                  false,
                                );
                                if (!row.category)
                                  handleUpdateRow(
                                    row.id,
                                    "category",
                                    availableCategories[0] || "",
                                  );
                              }}
                              title="Cancel custom input"
                              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Standard Dropdown with "+ Add Custom Category..." option */
                        <div className="flex items-center gap-1 w-full">
                          <select
                            value={row.category}
                            onChange={(e) => {
                              if (e.target.value === "__ADD_NEW__") {
                                handleUpdateRow(
                                  row.id,
                                  "isCustomCategory",
                                  true,
                                );
                                handleUpdateRow(row.id, "category", "");
                              } else {
                                handleUpdateRow(
                                  row.id,
                                  "category",
                                  e.target.value,
                                );
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-800 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden bg-white cursor-pointer"
                          >
                            <optgroup
                              label={`Categories (${availableCategories.length})`}
                            >
                              {availableCategories.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Custom Category">
                              <option
                                value="__ADD_NEW__"
                                className="font-bold text-emerald-700 bg-emerald-50"
                              >
                                ➕ + Add / Type My Own Category...
                              </option>
                            </optgroup>
                          </select>

                          {/* Quick button to switch to typing own category */}
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateRow(row.id, "isCustomCategory", true);
                              handleUpdateRow(row.id, "category", "");
                            }}
                            title="Type your own custom category for this item"
                            className="p-1.5 rounded-lg border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Brand Cell: Dynamic Select or Custom Brand Input */}
                    <td className="px-3 py-2.5 max-w-[200px]">
                      {row.isCustomBrand ? (
                        /* Direct custom input for brand */
                        <div className="flex items-center gap-1 w-full">
                          <input
                            type="text"
                            value={row.brand}
                            onChange={(e) =>
                              handleUpdateRow(row.id, "brand", e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (row.brand.trim()) {
                                  handleRegisterBrand(row.brand, false, row.id);
                                }
                              } else if (e.key === "Escape") {
                                handleUpdateRow(row.id, "isCustomBrand", false);
                              }
                            }}
                            placeholder="Type brand name..."
                            className="w-full px-2 py-1.5 rounded-lg border-2 border-indigo-500 font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-indigo-50/40"
                          />
                          {row.brand.trim() && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRegisterBrand(row.brand, false, row.id)
                              }
                              title="Save custom brand"
                              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shrink-0"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {availableBrands.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateRow(row.id, "isCustomBrand", false);
                              }}
                              title="Cancel custom brand input"
                              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Standard Dropdown with "+ Add Custom Brand..." option */
                        <div className="flex items-center gap-1 w-full">
                          <select
                            value={row.brand}
                            onChange={(e) => {
                              if (e.target.value === "__ADD_NEW__") {
                                handleUpdateRow(row.id, "isCustomBrand", true);
                                handleUpdateRow(row.id, "brand", "");
                              } else {
                                handleUpdateRow(
                                  row.id,
                                  "brand",
                                  e.target.value,
                                );
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-800 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden bg-white cursor-pointer"
                          >
                            <option value="">
                              {availableBrands.length === 0
                                ? "No brands yet (Type own below)..."
                                : "Select Brand..."}
                            </option>
                            {availableBrands.length > 0 && (
                              <optgroup
                                label={`Brands (${availableBrands.length})`}
                              >
                                {availableBrands.map((b) => (
                                  <option key={b} value={b}>
                                    {b}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="Custom Brand">
                              <option
                                value="__ADD_NEW__"
                                className="font-bold text-indigo-700 bg-indigo-50"
                              >
                                ➕ + Add / Type My Own Brand...
                              </option>
                            </optgroup>
                          </select>

                          {/* Quick button to switch to typing own brand */}
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateRow(row.id, "isCustomBrand", true);
                              handleUpdateRow(row.id, "brand", "");
                            }}
                            title="Type custom brand for this item"
                            className="p-1.5 rounded-lg border border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 text-slate-500 hover:text-indigo-700 transition-colors cursor-pointer shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* SKU Code */}
                    <td className="px-3 py-2.5 font-mono max-w-[100px]">
                      <input
                        type="text"
                        value={row.sku}
                        onChange={(e) =>
                          handleUpdateRow(row.id, "sku", e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden bg-slate-50"
                      />
                    </td>

                    {/* Barcode */}
                    <td className="px-3 py-2.5 font-mono max-w-[170px]">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={row.barcode}
                          onChange={(e) =>
                            handleUpdateRow(row.id, "barcode", e.target.value)
                          }
                          placeholder="Auto barcode"
                          className="w-full px-2.5 py-1.5 pr-7 rounded-lg border border-slate-300 text-slate-700 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRegenerateBarcode(row.id)}
                          title="Generate new random barcode"
                          className="absolute right-1 text-slate-400 hover:text-emerald-600 p-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Unit */}
                    {/* <td className="px-3 py-2.5">
                      <select
                        value={row.unit}
                        onChange={(e) =>
                          handleUpdateRow(row.id, "unit", e.target.value)
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-hidden bg-white cursor-pointer"
                      >
                        {COMMON_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td> */}

                    {/* Cost Price */}
                    <td className="px-3 py-2.5 max-w-[100px]">
                      <input
                        type="number"
                        min="0"
                        value={row.costPrice}
                        onChange={(e) =>
                          handleUpdateRow(
                            row.id,
                            "costPrice",
                            e.target.value === ""
                              ? ""
                              : Math.max(0, parseFloat(e.target.value) || 0),
                          )
                        }
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden bg-white"
                      />
                    </td>

                    {/* Selling Price */}
                    <td className="px-3 py-2.5 max-w-[100px]">
                      <input
                        type="number"
                        min="0"
                        value={row.sellingPrice}
                        onChange={(e) =>
                          handleUpdateRow(
                            row.id,
                            "sellingPrice",
                            e.target.value === ""
                              ? ""
                              : Math.max(0, parseFloat(e.target.value) || 0),
                          )
                        }
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-emerald-700 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden bg-white"
                      />
                    </td>

                    {/* Opening Stock */}
                    <td className="px-3 py-2.5 max-w-[100px]">
                      <input
                        type="number"
                        min="0"
                        value={row.currentStock}
                        onChange={(e) =>
                          handleUpdateRow(
                            row.id,
                            "currentStock",
                            e.target.value === ""
                              ? ""
                              : Math.max(0, parseInt(e.target.value) || 0),
                          )
                        }
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-800 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden bg-white"
                      />
                    </td>

                    {/* Min Alert */}
                    <td className="px-3 py-2.5 max-w-[100px]">
                      <input
                        type="number"
                        min="0"
                        value={row.minStockAlert}
                        onChange={(e) =>
                          handleUpdateRow(
                            row.id,
                            "minStockAlert",
                            e.target.value === ""
                              ? ""
                              : Math.max(0, parseInt(e.target.value) || 0),
                          )
                        }
                        placeholder="5"
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-slate-600 text-xs focus:outline-hidden bg-white"
                      />
                    </td>

                    {/* Line Total Cost */}
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                      {formatPKR(rowTotalCost)}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateRow(row)}
                          title="Duplicate row"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          title="Delete row"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

        {/* Big Repeater Add Button directly under table */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            id="btn-add-repeater-row"
            onClick={handleAddRow}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-dashed border-emerald-500/70 hover:border-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>+ Add Another Product Row</span>
          </button>

          <div className="text-xs text-slate-500">
            Total products ready to save:{" "}
            <strong className="text-slate-900 font-mono">
              {summary.totalProducts}
            </strong>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. BOTTOM FINAL SUBMIT ACTION BAR (STICKY)                */}
      {/* ========================================================= */}
      <div className="sticky bottom-4 z-20 bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <span>Ready to save new products?</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {summary.totalProducts} item
                {summary.totalProducts !== 1 ? "s" : ""} ({summary.totalUnits}{" "}
                units)
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              All entered items and custom categories will be saved permanently
              to your PC catalog.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel &amp; Return
          </button>

          <button
            type="button"
            id="btn-save-all-products-bottom"
            onClick={handleSaveAll}
            disabled={isSubmitting || summary.totalProducts === 0}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 text-white" />
            <span>
              {isSubmitting
                ? "Saving Products..."
                : `Save ${summary.totalProducts > 0 ? `(${summary.totalProducts})` : ""} Products to Inventory`}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. MODAL: ADD MY OWN CUSTOM CATEGORY                      */}
      {/* ========================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm tracking-tight">
                  Add My Own Category
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setCategoryModalError(null);
                }}
                className="text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleModalAddCategory}
              className="p-5 space-y-4 text-xs"
            >
              <p className="text-slate-500 leading-relaxed">
                Create a custom category for your inventory. It will be
                immediately available in the dropdown for all products.
              </p>

              {/* Error in modal */}
              {categoryModalError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{categoryModalError}</span>
                </div>
              )}

              {/* Category input */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Screen Protectors, Car Mounts, Toys..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Quick suggestions chips */}
              <div>
                <span className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Popular Suggestions (Click to fill):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_QUICK_CATEGORIES.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setNewCategoryName(sug)}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkbox: apply to all rows */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={applyNewCategoryToAllRows}
                  onChange={(e) =>
                    setApplyNewCategoryToAllRows(e.target.checked)
                  }
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>
                  Apply this category to all current rows in the table
                </span>
              </label>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setCategoryModalError(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. MODAL: ADD MY OWN CUSTOM BRAND                         */}
      {/* ========================================================= */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm tracking-tight">
                  Add My Own Brand
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBrandModalOpen(false);
                  setBrandModalError(null);
                }}
                className="text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleModalAddBrand}
              className="p-5 space-y-4 text-xs"
            >
              <p className="text-slate-500 leading-relaxed">
                Create a custom brand for your inventory products. It will be
                immediately available in the brand dropdown for all items.
              </p>

              {/* Error in modal */}
              {brandModalError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{brandModalError}</span>
                </div>
              )}

              {/* Brand input */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Brand Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="e.g. Apple, Samsung, Anker, Ronin..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Quick suggestions chips */}
              <div>
                <span className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Popular Suggestions (Click to fill):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_QUICK_BRANDS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setNewBrandName(sug)}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-800 border border-slate-200 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkbox: apply to all rows */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={applyNewBrandToAllRows}
                  onChange={(e) => setApplyNewBrandToAllRows(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Apply this brand to all current rows in the table</span>
              </label>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsBrandModalOpen(false);
                    setBrandModalError(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Add Brand</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
