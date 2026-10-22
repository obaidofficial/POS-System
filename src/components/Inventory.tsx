import React, { useState, useMemo, useEffect } from "react";
import {
  Boxes,
  Search,
  Plus,
  Filter,
  AlertTriangle,
  Edit2,
  Trash2,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  Layers,
  MapPin,
  SlidersHorizontal,
  Barcode as BarcodeIcon,
  ScanLine,
  Printer,
  Sparkles,
} from "lucide-react";
import { InventoryItem } from "../types";
import { storage } from "../services/storage";
import { formatPKR } from "../utils/currency";
import { TablePagination } from "./TablePagination";
import { getStoredPageSize, setStoredPageSize } from "../utils/pagination";
import { BarcodeViewModal } from "./BarcodeViewModal";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { AddProductsPage } from "./AddProductsPage";

interface InventoryProps {
  items: InventoryItem[];
  onOpenAddItem: () => void;
  onEditItem: (item: InventoryItem) => void;
  onAdjustStock: (item: InventoryItem) => void;
  onDeleteSuccess: () => void;
  initialViewMode?: "LIST" | "ADD_PRODUCTS";
  onViewModeChange?: (mode: "LIST" | "ADD_PRODUCTS") => void;
}

export const Inventory: React.FC<InventoryProps> = ({
  items,
  onOpenAddItem,
  onEditItem,
  onAdjustStock,
  onDeleteSuccess,
  initialViewMode = "LIST",
  onViewModeChange,
}) => {
  const [viewMode, setViewMode] = useState<"LIST" | "ADD_PRODUCTS">(
    () => initialViewMode,
  );

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  const handleSetViewMode = (mode: "LIST" | "ADD_PRODUCTS") => {
    setViewMode(mode);
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [stockStatusFilter, setStockStatusFilter] = useState<
    "ALL" | "LOW" | "OUT" | "HEALTHY"
  >("ALL");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "cost" | "selling">(
    "stock",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Barcode View and Scan Modals
  const [selectedBarcodeItem, setSelectedBarcodeItem] =
    useState<InventoryItem | null>(null);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  // Pagination state with local storage persistence
  const [pageSize, setPageSize] = useState<number>(() =>
    getStoredPageSize("inventory", 30),
  );
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Extract unique brands
  const brands = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.brand && item.brand.trim()) set.add(item.brand.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Screen Protector matches if user searches mobile phone (e.g. "Oppo A5", "Realme C11", "Samsung A12")
  const protectorMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    const compactQ = q.replace(/[\s\-_]/g, "");

    const protectors = storage.getProtectors();
    const matches: {
      protectorName: string;
      brand: string;
      model: string;
      price: number;
      category: string;
    }[] = [];
    const seen = new Set<string>();

    protectors.forEach((prot) => {
      prot.compatibleBrands.forEach((b) => {
        b.models.forEach((m) => {
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
              ));

          if (isMatch) {
            const key = `${prot.name}_${b.brand}_${m}`;
            if (!seen.has(key)) {
              seen.add(key);
              matches.push({
                protectorName: prot.name,
                brand: b.brand,
                model: m,
                price: prot.defaultPrice || 150,
                category: prot.category || "Screen Glass",
              });
            }
          }
        });
      });
    });

    return matches;
  }, [searchQuery]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch =
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.brand &&
            item.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (item.barcode &&
            item.barcode.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (item.location &&
            item.location.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory =
          selectedCategory === "ALL" || item.category === selectedCategory;

        const matchesBrand =
          selectedBrand === "ALL" ||
          (item.brand && item.brand === selectedBrand);

        let matchesStatus = true;
        if (stockStatusFilter === "OUT") {
          matchesStatus = item.currentStock === 0;
        } else if (stockStatusFilter === "LOW") {
          matchesStatus =
            item.currentStock > 0 && item.currentStock <= item.minStockAlert;
        } else if (stockStatusFilter === "HEALTHY") {
          matchesStatus = item.currentStock > item.minStockAlert;
        }

        return (
          matchesSearch && matchesCategory && matchesBrand && matchesStatus
        );
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === "name") cmp = a.name.localeCompare(b.name);
        if (sortBy === "stock") cmp = a.currentStock - b.currentStock;
        if (sortBy === "cost") cmp = a.costPrice - b.costPrice;
        if (sortBy === "selling") cmp = a.sellingPrice - b.sellingPrice;
        return sortOrder === "asc" ? cmp : -cmp;
      });
  }, [
    items,
    searchQuery,
    selectedCategory,
    selectedBrand,
    stockStatusFilter,
    sortBy,
    sortOrder,
  ]);

  const handleDelete = () => {
    if (!itemToDelete) return;
    storage.deleteItem(itemToDelete.id);
    setItemToDelete(null);
    onDeleteSuccess();
  };

  // Reset to page 1 whenever filters, search, or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedCategory,
    selectedBrand,
    stockStatusFilter,
    sortBy,
    sortOrder,
  ]);

  // Ensure current page does not exceed total pages
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Sliced items for current page
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Selection helpers
  const isAllPageSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((item) => selectedIds.has(item.id));
  const isSomePageSelected = paginatedItems.some((item) =>
    selectedIds.has(item.id),
  );
  const isPageIndeterminate = !isAllPageSelected && isSomePageSelected;

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedItems.forEach((item) => next.delete(item.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedItems.forEach((item) => next.add(item.id));
        return next;
      });
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(new Set(filteredItems.map((item) => item.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleConfirmBulkDelete = () => {
    if (selectedIds.size === 0) return;
    storage.deleteItems(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsBulkDeleteOpen(false);
    onDeleteSuccess();
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setStoredPageSize("inventory", newSize);
    setCurrentPage(1);
  };

  const formatCurrency = (val: number) => formatPKR(val);

  if (viewMode === "ADD_PRODUCTS") {
    return (
      <AddProductsPage
        existingItems={items}
        onBack={() => handleSetViewMode("LIST")}
        onSaved={(count) => {
          handleSetViewMode("LIST");
          setSuccessBanner(
            `Successfully added ${count} new product${count > 1 ? "s" : ""} to inventory!`,
          );
          setTimeout(() => setSuccessBanner(null), 5000);
          onDeleteSuccess();
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
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Main Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Inventory &amp; Stock Tracking</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {storage.isBarcodeEnabled() && (
            <button
              id="btn-scan-barcode-inventory"
              onClick={() => setIsScannerModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-sm sm:text-base font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <ScanLine className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 shrink-0" />
              <span>Scan Barcode</span>
            </button>
          )}

          <button
            type="button"
            id="btn-add-new-inventory-item"
            onClick={() => handleSetViewMode("ADD_PRODUCTS")}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-sm sm:text-base font-semibold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap">Add New Product SKU</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
          {/* Search input */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-inventory-search"
              type="text"
              placeholder="Search by SKU, product name, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-sm sm:text-base rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              id="select-inventory-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm sm:text-base rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-400 font-medium cursor-pointer"
            >
              <option value="ALL">All Categories ({items.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Dropdown */}
          <div>
            <select
              id="select-inventory-brand"
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm sm:text-base rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-400 font-medium cursor-pointer"
            >
              <option value="ALL">All Brands ({brands.length})</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Health Status Filter */}
          <div>
            <select
              id="select-inventory-stock-status"
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className="w-full px-3.5 py-2.5 text-sm sm:text-base rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-400 font-semibold cursor-pointer"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="LOW">⚠️ Low Stock Alerts</option>
              <option value="OUT">🛑 Out of Stock (0 units)</option>
              <option value="HEALTHY">✅ In Stock / Adequate</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex gap-2">
            <select
              id="select-inventory-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3.5 py-2.5 text-sm sm:text-base rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-400 font-medium cursor-pointer"
            >
              <option value="stock">Sort: Stock Level</option>
              <option value="name">Sort: Product Name</option>
              <option value="cost">Sort: Cost Price</option>
              <option value="selling">Sort: Selling Price</option>
            </select>
            <button
              id="btn-inventory-sort-order"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              title={`Toggle sort direction: currently ${sortOrder}`}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shrink-0"
            >
              <ArrowUpDown className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white rounded-md px-3.5 sm:px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md border border-slate-800 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-full">
              {selectedIds.size}
            </span>
            <span className="text-xs text-slate-200 font-medium">
              product{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            {selectedIds.size < filteredItems.length && (
              <button
                type="button"
                id="btn-select-all-filtered-inventory"
                onClick={handleSelectAllFiltered}
                className="text-xs text-indigo-300 hover:text-indigo-200 underline font-medium cursor-pointer"
              >
                Select all {filteredItems.length} matching products
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              id="btn-clear-selected-inventory"
              onClick={handleClearSelection}
              className="flex-1 sm:flex-initial px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer text-center"
            >
              Deselect All
            </button>
            <button
              type="button"
              id="btn-bulk-delete-inventory"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Screen Protector Size Compatibility Banner if searching a mobile model (e.g. "Oppo A5") */}
      {searchQuery.trim() && protectorMatches.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 shadow-2xs space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-bold text-emerald-950">
                Compatible Screen Protector Size
                {protectorMatches.length > 1 ? "s" : ""} for "{searchQuery}":
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {protectorMatches.length} Size Match
              {protectorMatches.length > 1 ? "es" : ""} Found
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {protectorMatches.map((pm, idx) => (
              <div
                key={`${pm.protectorName}_${pm.model}_${idx}`}
                className="p-3 rounded-lg bg-white border border-emerald-200 shadow-2xs flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Size:
                    </span>
                    <strong className=" font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300 text-sm">
                      {pm.protectorName}
                    </strong>
                  </div>
                  <div className="text-xs text-emerald-800 font-semibold mt-1">
                    {pm.brand} {pm.model} • {pm.category}
                  </div>
                </div>
                <span className=" font-black text-emerald-700 text-sm shrink-0">
                  {formatPKR(pm.price)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="rounded-xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-sm sm:text-base min-w-[840px]">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-800 uppercase tracking-wider text-xs sm:text-sm font-bold">
              <tr>
                <th className="py-3.5 sm:py-4 px-3.5 w-12 text-center">
                  <input
                    type="checkbox"
                    id="select-all-inventory-items"
                    checked={isAllPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isPageIndeterminate;
                    }}
                    onChange={handleToggleSelectAllPage}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    aria-label="Select all products on current page"
                  />
                </th>
                <th className="py-3.5 sm:py-4 px-3 sm:px-4">SKU / Product</th>
                <th className="py-3.5 sm:py-4 px-3 sm:px-4">Category</th>
                <th className="py-3.5 sm:py-4 px-3 sm:px-4">Brand</th>
                <th className="py-3.5 sm:py-4 px-3 sm:px-4">Current Stock</th>
                <th className="py-3.5 sm:py-4 px-3 sm:px-4 text-right">Cost Price (PKR)</th>
                <th className="py-3.5 sm:py-4 px-3 sm:px-4 text-right">Selling Price (PKR)</th>
                <th className="py-3.5 sm:py-4 px-3 sm:px-4 text-right">Total Value (PKR)</th>
                <th className="py-3.5 sm:py-4 px-3 sm:px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900 text-sm sm:text-base">
              {paginatedItems.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isOutOfStock = item.currentStock === 0;
                const isLowStock =
                  item.currentStock > 0 &&
                  item.currentStock <= item.minStockAlert;
                const totalValuation = item.currentStock * item.costPrice;

                return (
                  <tr
                    key={item.id}
                    id={`inventory-row-${item.id}`}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-indigo-50/70 border-l-2 border-l-indigo-600"
                        : isOutOfStock
                          ? "bg-rose-50/30 hover:bg-slate-50/80"
                          : isLowStock
                            ? "bg-amber-50/20 hover:bg-slate-50/80"
                            : "hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Row Select Checkbox */}
                    <td
                      className="py-4 px-3.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        id={`select-inventory-item-${item.id}`}
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        aria-label={`Select product ${item.name}`}
                      />
                    </td>

                    {/* Name & SKU */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-950 text-base">
                        {item.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-slate-500  text-xs">
                        <span className="font-semibold text-slate-600">
                          {item.sku}
                        </span>
                        {item.barcode && (
                          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-sans border border-slate-200">
                            <BarcodeIcon className="w-3 h-3 text-indigo-600" />
                            <span className=" font-semibold">
                              {item.barcode}
                            </span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4 text-sm text-slate-700 font-semibold">
                      {item.category || "General"}
                    </td>

                    {/* Brand */}
                    <td className="py-4 px-4 text-sm font-semibold">
                      {item.brand ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
                          {item.brand}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs font-normal italic">
                          —
                        </span>
                      )}
                    </td>

                    {/* Current Stock with clean status indicator */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-medium tabular-nums text-slate-950">
                          {item.currentStock}
                        </span>
                        <span className="text-slate-500 text-xs font-medium">
                          {item.unit}
                        </span>

                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 rounded-full border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 rounded-full border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cost Price */}
                    <td className="py-4 px-4 text-right  tabular-nums font-bold text-slate-700 text-base">
                      {item.costPrice}
                    </td>

                    {/* Selling Price */}
                    <td className="py-4 px-4 text-right  tabular-nums font-medium text-slate-950 text-base sm:text-lg">
                      {item.sellingPrice}
                    </td>

                    {/* Total Value (Cost Basis) */}
                    <td className="py-4 px-4 text-right  tabular-nums font-medium text-slate-950 text-base sm:text-lg">
                      {totalValuation}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 sm:py-4 px-3 sm:px-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        {/* View & Print Barcode Label */}
                        <button
                          id={`btn-view-barcode-${item.id}`}
                          onClick={() => setSelectedBarcodeItem(item)}
                          title="View & Print Barcode Label"
                          className="p-1.5 sm:p-2 rounded-xl text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors cursor-pointer"
                        >
                          <BarcodeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>

                        {/* Adjust Stock +/- */}
                        <button
                          id={`btn-adjust-stock-${item.id}`}
                          onClick={() => onAdjustStock(item)}
                          title="Quick stock adjustment (+/-)"
                          className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
                          <span>Adjust</span>
                        </button>

                        {/* Edit Item */}
                        <button
                          id={`btn-edit-item-${item.id}`}
                          onClick={() => onEditItem(item)}
                          title="Edit Product details"
                          className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>

                        {/* Delete Item */}
                        <button
                          id={`btn-delete-item-${item.id}`}
                          onClick={() => setItemToDelete(item)}
                          title="Delete Product"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-sm">
                      No items found matching the filter criteria.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("ALL");
                        setStockStatusFilter("ALL");
                      }}
                      className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Clear all filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination with persistent rows per page */}
        <TablePagination
          totalItems={filteredItems.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
          itemLabel="inventory items"
          idPrefix="inventory"
        />
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 sm:p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Confirm Product Removal
            </h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-slate-900">
                {itemToDelete.name}
              </span>{" "}
              ({itemToDelete.sku})? This product will be permanently removed
              from inventory.
            </p>
            <div className="mt-5 sm:mt-6 flex items-center justify-end gap-2">
              <button
                id="btn-cancel-delete-item"
                onClick={() => setItemToDelete(null)}
                className="flex-1 sm:flex-initial text-center px-3.5 py-2 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-item"
                onClick={handleDelete}
                className="flex-1 sm:flex-initial text-center px-3.5 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-md max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Confirm Bulk Product Deletion
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <span className="font-bold text-slate-900">
                {selectedIds.size}
              </span>{" "}
              selected product{selectedIds.size > 1 ? "s" : ""}? These products
              and their stock records will be permanently removed from
              inventory.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                id="btn-cancel-bulk-delete-inventory"
                onClick={() => setIsBulkDeleteOpen(false)}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-bulk-delete-inventory"
                onClick={handleConfirmBulkDelete}
                className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanently Delete ({selectedIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode View / Print Label Modal */}
      <BarcodeViewModal
        isOpen={Boolean(selectedBarcodeItem)}
        item={selectedBarcodeItem}
        onClose={() => setSelectedBarcodeItem(null)}
      />

      {/* Barcode Scanner Modal for Quick Stock Lookup */}
      <BarcodeScannerModal
        isOpen={isScannerModalOpen && storage.isBarcodeEnabled()}
        items={items}
        title="Stock Inventory Barcode Terminal"
        subtitle="Aim USB/Bluetooth barcode gun or enter code to identify product and stock levels."
        onClose={() => setIsScannerModalOpen(false)}
        onItemScanned={(item) => {
          setSearchQuery(item.barcode || item.sku);
        }}
      />
    </div>
  );
};
