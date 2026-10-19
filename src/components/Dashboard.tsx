import React, { useMemo, useState } from "react";
import {
  Package,
  AlertTriangle,
  Boxes,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  HardDrive,
  XCircle,
  Banknote,
  ShoppingCart,
  Smartphone,
  Radio,
  Building2,
  TrendingUp,
  Layers,
  Wallet,
  Tag,
  Filter,
  RotateCcw,
} from "lucide-react";
import {
  DashboardMetrics,
  InventoryItem,
  Sale,
  EpJcDailyRecord,
  EpJcTransaction,
  LoadDailyRecord,
  LoadTransaction,
  AuthUser,
} from "../types";
import { ActiveTab } from "./Navbar";
import { formatPKR, formatNumber } from "../utils/currency";
import { FinancialPeriodBreakdown } from "./FinancialPeriodBreakdown";
import { MonthlyFinancialReports } from "./MonthlyFinancialReports";

export interface BrandBreakdownStats {
  brand: string;
  count: number;
  units: number;
  costVal: number;
  retailVal: number;
}

export interface CategoryStats {
  count: number;
  units: number;
  costVal: number;
  retailVal: number;
  brands: Record<string, BrandBreakdownStats>;
}

export interface CategoryBreakdownForBrand {
  category: string;
  count: number;
  units: number;
  costVal: number;
  retailVal: number;
}

export interface GroupedBrandStats {
  brand: string;
  count: number;
  units: number;
  costVal: number;
  retailVal: number;
  categories: Record<string, CategoryBreakdownForBrand>;
}

interface DashboardProps {
  metrics: DashboardMetrics;
  items: InventoryItem[];
  sales: Sale[];
  epJcRecords?: EpJcDailyRecord[];
  epJcTransactions?: EpJcTransaction[];
  loadRecords?: LoadDailyRecord[];
  loadTransactions?: LoadTransaction[];
  currentUser?: AuthUser | null;
  onNavigate: (tab: ActiveTab) => void;
  onOpenNewItem: () => void;
  onOpenNewSale: () => void;
  onOpenBackupModal: () => void;
  onAdjustStock: (item: InventoryItem) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  metrics,
  items,
  sales,
  epJcRecords = [],
  epJcTransactions = [],
  loadRecords = [],
  loadTransactions = [],
  currentUser,
  onNavigate,
  onOpenNewItem,
  onOpenNewSale,
  onOpenBackupModal,
  onAdjustStock,
}) => {
  const lowStockItems = items.filter(
    (item) => item.currentStock > 0 && item.currentStock <= item.minStockAlert,
  );
  const outOfStockItems = items.filter((item) => item.currentStock === 0);

  const formatCurrency = (amount: number) => formatPKR(amount);

  // Brand & Category Breakdown State
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>("ALL");
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [expandAllBrands, setExpandAllBrands] = useState<boolean>(false);
  const [breakdownGrouping, setBreakdownGrouping] = useState<
    "category" | "brand"
  >("category");

  // Available unique brands across active items
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      const b = item.brand?.trim();
      if (b) set.add(b);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const hasUnbrandedItems = useMemo(() => {
    return items.some((item) => !item.brand || !item.brand.trim());
  }, [items]);

  // Items filtered by selected brand (if any)
  const filteredBreakdownItems = useMemo(() => {
    if (selectedBrandFilter === "ALL") return items;
    if (selectedBrandFilter === "__UNBRANDED__") {
      return items.filter((item) => !item.brand || !item.brand.trim());
    }
    return items.filter(
      (item) =>
        item.brand &&
        item.brand.trim().toLowerCase() === selectedBrandFilter.toLowerCase(),
    );
  }, [items, selectedBrandFilter]);

  const filteredStockCost = useMemo(() => {
    return filteredBreakdownItems.reduce(
      (sum, item) => sum + (item.currentStock || 0) * (item.costPrice || 0),
      0,
    );
  }, [filteredBreakdownItems]);

  const filteredStockUnits = useMemo(() => {
    return filteredBreakdownItems.reduce(
      (sum, item) => sum + (item.currentStock || 0),
      0,
    );
  }, [filteredBreakdownItems]);

  // Group items by category with brand breakdown nested inside
  const categoryMap: Record<string, CategoryStats> = useMemo(() => {
    return filteredBreakdownItems.reduce(
      (acc, item) => {
        const cat = item.category?.trim() || "General";
        const brand = item.brand?.trim() || "Unbranded / Other";

        if (!acc[cat]) {
          acc[cat] = {
            count: 0,
            units: 0,
            costVal: 0,
            retailVal: 0,
            brands: {},
          };
        }
        acc[cat].count += 1;
        acc[cat].units += item.currentStock || 0;
        acc[cat].costVal += (item.currentStock || 0) * (item.costPrice || 0);
        acc[cat].retailVal +=
          (item.currentStock || 0) * (item.sellingPrice || 0);

        if (!acc[cat].brands[brand]) {
          acc[cat].brands[brand] = {
            brand,
            count: 0,
            units: 0,
            costVal: 0,
            retailVal: 0,
          };
        }
        acc[cat].brands[brand].count += 1;
        acc[cat].brands[brand].units += item.currentStock || 0;
        acc[cat].brands[brand].costVal +=
          (item.currentStock || 0) * (item.costPrice || 0);
        acc[cat].brands[brand].retailVal +=
          (item.currentStock || 0) * (item.sellingPrice || 0);

        return acc;
      },
      {} as Record<string, CategoryStats>,
    );
  }, [filteredBreakdownItems]);

  const categoriesList: [string, CategoryStats][] = useMemo(() => {
    return (Object.entries(categoryMap) as [string, CategoryStats][]).sort(
      (a, b) => b[1].costVal - a[1].costVal,
    );
  }, [categoryMap]);

  // Group items by brand with category breakdown nested inside
  const brandMap: Record<string, GroupedBrandStats> = useMemo(() => {
    return filteredBreakdownItems.reduce(
      (acc, item) => {
        const brand = item.brand?.trim() || "Unbranded / Other";
        const cat = item.category?.trim() || "General";

        if (!acc[brand]) {
          acc[brand] = {
            brand,
            count: 0,
            units: 0,
            costVal: 0,
            retailVal: 0,
            categories: {},
          };
        }
        acc[brand].count += 1;
        acc[brand].units += item.currentStock || 0;
        acc[brand].costVal += (item.currentStock || 0) * (item.costPrice || 0);
        acc[brand].retailVal +=
          (item.currentStock || 0) * (item.sellingPrice || 0);

        if (!acc[brand].categories[cat]) {
          acc[brand].categories[cat] = {
            category: cat,
            count: 0,
            units: 0,
            costVal: 0,
            retailVal: 0,
          };
        }
        acc[brand].categories[cat].count += 1;
        acc[brand].categories[cat].units += item.currentStock || 0;
        acc[brand].categories[cat].costVal +=
          (item.currentStock || 0) * (item.costPrice || 0);
        acc[brand].categories[cat].retailVal +=
          (item.currentStock || 0) * (item.sellingPrice || 0);

        return acc;
      },
      {} as Record<string, GroupedBrandStats>,
    );
  }, [filteredBreakdownItems]);

  const brandsList: [string, GroupedBrandStats][] = useMemo(() => {
    return (Object.entries(brandMap) as [string, GroupedBrandStats][]).sort(
      (a, b) => b[1].costVal - a[1].costVal,
    );
  }, [brandMap]);

  const toggleCategoryExpand = (catName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catName]:
        prev[catName] !== undefined ? !prev[catName] : !expandAllBrands,
    }));
  };

  // Present Date (Today) calculations for quick KPI tags
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const todayCash = useMemo(
    () =>
      sales
        .filter((s) => s.date === todayStr)
        .reduce((sum, s) => sum + s.totalAmount, 0),
    [sales, todayStr],
  );
  const prevCash = useMemo(
    () =>
      sales
        .filter((s) => s.date !== todayStr)
        .reduce((sum, s) => sum + s.totalAmount, 0),
    [sales, todayStr],
  );

  const todaySalesCount = useMemo(
    () => sales.filter((s) => s.date === todayStr).length,
    [sales, todayStr],
  );

  return (
    <div className="space-y-6">
      {/* Top Greeting & Date Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 gap-2">
        <div className="flex justify-between w-full">
          <h1 className="text-2xl font-bold text-black tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-base text-black flex items-center float-right">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Top Banner: Low / Out of Stock Alert Notification */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="p-4 sm:p-5 rounded-xl bg-amber-50/90 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950 uppercase tracking-wider">
                Inventory Replenishment Required
              </h4>
              <p className="text-sm text-amber-900 mt-1">
                {outOfStockItems.length > 0 &&
                  `${outOfStockItems.length} SKU out of stock`}
                {outOfStockItems.length > 0 &&
                  lowStockItems.length > 0 &&
                  " · "}
                {lowStockItems.length > 0 &&
                  `${lowStockItems.length} low stock threshold item${lowStockItems.length > 1 ? "s" : ""}`}
                . Adjust shelf inventory to maintain uninterrupted counter
                sales.
              </p>
            </div>
          </div>
          <button
            id="btn-view-low-stock-alert"
            onClick={() => onNavigate("inventory")}
            className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold shadow-xs hover:shadow-sm transition-all shrink-0 cursor-pointer"
          >
            Review Stock Items
          </button>
        </div>
      )}

      {/* Primary Financial & Stock KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Present Date Cash */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-600" />
                Today Sale
              </span>
              <span className="text-sm font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                Today
              </span>
            </div>
            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-black text-emerald-700 tracking-tight font-mono tabular-nums">
                {formatCurrency(todayCash)}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 gap-2 text-sm font-mono">
                <div className="bg-slate-50/90 p-3 rounded-xl text-slate-800 border border-slate-100">
                  <span className="text-xs block font-sans text-slate-500 font-semibold mb-1">
                    Previous Cash:
                  </span>
                  <span className="font-bold tabular-nums text-base">
                    {formatCurrency(prevCash)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-600 flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="font-medium">
              {todaySalesCount} sales recorded today
            </span>
          </div>
        </div>

        {/* Card 2: Total Cash Sales Revenue */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-600" />
                Lifetime Sales
              </span>
              <span className="text-sm font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                All-time
              </span>
            </div>
            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-black text-indigo-950 tracking-tight font-mono tabular-nums">
                {formatCurrency(metrics.totalSalesRevenue)}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-700 flex items-center justify-between">
                <span className="font-medium">Invoices recorded:</span>
                <strong className="text-slate-900 font-mono tabular-nums font-bold text-base">
                  {formatNumber(metrics.totalSalesCount)}
                </strong>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-600 flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="font-medium">
              {formatNumber(sales.length)} completed transactions
            </span>
          </div>
        </div>

        {/* Card 3: Inventory Asset Value (Cost Basis) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-5 h-5 text-slate-500" />
                Stock Value
              </span>
              <span className="text-sm font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                Cost Basis
              </span>
            </div>
            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
                {formatCurrency(metrics.totalStockValueAtCost)}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-700 flex items-center justify-between">
                <span className="font-medium">Retail shelf value:</span>
                <span className="font-mono tabular-nums font-bold text-slate-900 text-base">
                  {formatCurrency(metrics.totalStockValueAtRetail)}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-600 flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="font-medium">
              {formatNumber(metrics.totalInventoryUnits)} units in stock
            </span>
            <span className="text-slate-800 font-mono font-bold">
              {formatNumber(metrics.totalProductsCount)} SKUs
            </span>
          </div>
        </div>

        {/* Card 4: Potential Inventory Profit */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Potential Profit
              </span>
              <span className="text-sm font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                Shelf Stock
              </span>
            </div>
            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-black text-emerald-700 tracking-tight font-mono tabular-nums">
                +{formatCurrency(metrics.potentialProfitInStock)}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-700">
                <span className="font-medium">
                  Unrealized margin on active items
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-600 flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="font-medium">
              {lowStockItems.length + outOfStockItems.length} alerts pending
            </span>
            <span className="text-emerald-700 font-bold">Healthy Margin</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Stock Health & Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Category & Inventory Breakdown with Brand Distribution */}
        <div className="lg:col-span-3 p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-6">
          {/* Header with Title, Filter & Controls */}
          <div className="flex flex-col gap-4 pb-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-slate-900">
                    Inventory Asset Value by Category
                  </h3>
                  {selectedBrandFilter !== "ALL" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Tag className="w-3 h-3 text-emerald-700" />
                      <span>
                        Brand:{" "}
                        {selectedBrandFilter === "__UNBRANDED__"
                          ? "Unbranded / Other"
                          : selectedBrandFilter}
                      </span>
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  Breakdown of active stock units and valuation across product
                  classifications and brands
                </p>
              </div>

              <button
                id="btn-goto-inventory-tab"
                onClick={() => onNavigate("inventory")}
                className="text-sm font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-lg hover:bg-slate-100 transition-colors self-start sm:self-auto shrink-0"
              >
                <span>Manage Inventory</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Filter & View Mode Control Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100/80">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Specific Brand Selector Filter */}
                <div className="relative inline-flex items-center">
                  <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <select
                    id="select-dashboard-brand-filter"
                    value={selectedBrandFilter}
                    onChange={(e) => setSelectedBrandFilter(e.target.value)}
                    className="pl-8 pr-8 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer transition-colors"
                  >
                    <option value="ALL">
                      All Brands ({availableBrands.length})
                    </option>
                    {availableBrands.map((b) => (
                      <option key={b} value={b}>
                        Brand: {b}
                      </option>
                    ))}
                    {hasUnbrandedItems && (
                      <option value="__UNBRANDED__">Unbranded / Other</option>
                    )}
                  </select>
                </div>

                {selectedBrandFilter !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setSelectedBrandFilter("ALL")}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/80 px-2 py-1.5 rounded-lg border border-rose-200/80 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Clear brand filter"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Brand</span>
                  </button>
                )}

                {/* View Grouping: By Category vs By Brand */}
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/70 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setBreakdownGrouping("category")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      breakdownGrouping === "category"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    By Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setBreakdownGrouping("brand")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      breakdownGrouping === "brand"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    By Brand
                  </button>
                </div>
              </div>

              {/* Expand / Collapse All Brands Button (in Category view) */}
              {breakdownGrouping === "category" && (
                <button
                  type="button"
                  onClick={() => setExpandAllBrands((prev) => !prev)}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 py-1.5 px-2.5 rounded-lg border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {expandAllBrands ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Collapse Brands</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Expand All Brands</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Active Brand Scope Notification Banner */}
            {selectedBrandFilter !== "ALL" && (
              <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    Viewing category items of brand{" "}
                    <strong className="font-bold underline">
                      {selectedBrandFilter === "__UNBRANDED__"
                        ? "Unbranded / Other"
                        : selectedBrandFilter}
                    </strong>
                    : <strong>{formatNumber(filteredStockUnits)}</strong> units
                    across <strong>{categoriesList.length}</strong> categor
                    {categoriesList.length === 1 ? "y" : "ies"}.
                  </span>
                </div>
                <div className="font-mono font-bold text-emerald-900 tabular-nums">
                  Brand Asset Value: {formatCurrency(filteredStockCost)}
                </div>
              </div>
            )}
          </div>

          {/* Breakdown Content */}
          <div className="space-y-5">
            {/* 1. Group By Category */}
            {breakdownGrouping === "category" && (
              <>
                {categoriesList.map(([catName, data]) => {
                  const baselineCost =
                    selectedBrandFilter === "ALL"
                      ? metrics.totalStockValueAtCost
                      : filteredStockCost;
                  const percentage =
                    baselineCost > 0
                      ? Math.round((data.costVal / baselineCost) * 100)
                      : 0;

                  const isExpanded =
                    expandedCategories[catName] ??
                    (expandAllBrands || selectedBrandFilter !== "ALL");
                  const brandEntries = (
                    Object.values(data.brands) as BrandBreakdownStats[]
                  ).sort((a, b) => b.costVal - a.costVal);
                  const brandsCount = brandEntries.length;

                  return (
                    <div
                      key={catName}
                      className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3"
                    >
                      {/* Category Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => toggleCategoryExpand(catName)}
                            className="font-bold text-slate-900 text-base hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                          >
                            <span>{catName}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                          </button>
                          <span className="text-slate-500 text-xs sm:text-sm font-medium">
                            ({data.count} SKU{data.count > 1 ? "s" : ""} ·{" "}
                            {data.units} unit{data.units !== 1 ? "s" : ""})
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleCategoryExpand(catName)}
                            className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 hover:bg-slate-200 cursor-pointer"
                          >
                            {brandsCount} Brand{brandsCount > 1 ? "s" : ""}
                          </button>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 font-mono">
                          <span className="text-slate-500 text-xs sm:text-sm font-semibold tabular-nums">
                            {percentage}%
                          </span>
                          <span className="font-bold text-slate-950 text-base sm:text-lg tabular-nums">
                            {formatCurrency(data.costVal)}
                          </span>
                        </div>
                      </div>

                      {/* Main Category Progress Bar */}
                      <div className="h-2.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-900 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.max(2, Math.min(100, percentage))}%`,
                          }}
                        />
                      </div>

                      {/* Nested Brand Breakdown within this Category */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                            <span className="flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-slate-400" />
                              Brand Breakdown in {catName}
                            </span>
                            <span>Units &amp; Asset Value</span>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            {brandEntries.map((brandData) => {
                              const brandShare =
                                data.costVal > 0
                                  ? Math.round(
                                      (brandData.costVal / data.costVal) * 100,
                                    )
                                  : 0;

                              const isSelectedThisBrand =
                                selectedBrandFilter.toLowerCase() ===
                                brandData.brand.toLowerCase();

                              return (
                                <div
                                  key={brandData.brand}
                                  className={`p-2.5 rounded-lg border text-sm transition-all ${
                                    isSelectedThisBrand
                                      ? "bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400"
                                      : "bg-white border-slate-200/70 hover:border-slate-300 hover:shadow-2xs"
                                  }`}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSelectedBrandFilter(
                                            isSelectedThisBrand
                                              ? "ALL"
                                              : brandData.brand,
                                          )
                                        }
                                        className={`font-semibold text-xs sm:text-sm px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                          isSelectedThisBrand
                                            ? "bg-emerald-600 text-white"
                                            : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                                        }`}
                                        title={`Filter category items for ${brandData.brand}`}
                                      >
                                        {brandData.brand}
                                      </button>
                                      <span className="text-xs text-slate-500 font-medium">
                                        {brandData.units} unit
                                        {brandData.units !== 1 ? "s" : ""} in
                                        stock · {brandData.count} SKU
                                        {brandData.count > 1 ? "s" : ""}
                                      </span>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-3 font-mono">
                                      <span className="text-xs text-slate-500 font-medium tabular-nums">
                                        {brandShare}% of cat.
                                      </span>
                                      <span className="font-bold text-slate-900 text-sm tabular-nums">
                                        {formatCurrency(brandData.costVal)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Mini bar for brand proportion inside category */}
                                  <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        isSelectedThisBrand
                                          ? "bg-emerald-600"
                                          : "bg-slate-600"
                                      }`}
                                      style={{
                                        width: `${Math.max(2, Math.min(100, brandShare))}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {categoriesList.length === 0 && (
                  <p className="py-8 text-center text-base text-slate-400">
                    No items found for the selected category or brand.
                  </p>
                )}
              </>
            )}

            {/* 2. Group By Brand */}
            {breakdownGrouping === "brand" && (
              <>
                {brandsList.map(([brandName, data]) => {
                  const baselineCost =
                    selectedBrandFilter === "ALL"
                      ? metrics.totalStockValueAtCost
                      : filteredStockCost;
                  const percentage =
                    baselineCost > 0
                      ? Math.round((data.costVal / baselineCost) * 100)
                      : 0;

                  const isExpanded = expandedCategories[brandName] ?? true;
                  const catEntries = (
                    Object.values(
                      data.categories,
                    ) as CategoryBreakdownForBrand[]
                  ).sort((a, b) => b.costVal - a.costVal);
                  const catCount = catEntries.length;

                  return (
                    <div
                      key={brandName}
                      className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3"
                    >
                      {/* Brand Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => toggleCategoryExpand(brandName)}
                            className="font-bold text-slate-900 text-base hover:text-emerald-700 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                          >
                            <Tag className="w-4 h-4 text-emerald-600" />
                            <span>{brandName}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                          </button>
                          <span className="text-slate-500 text-xs sm:text-sm font-medium">
                            ({data.count} SKU{data.count > 1 ? "s" : ""} ·{" "}
                            {data.units} unit{data.units !== 1 ? "s" : ""})
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {catCount} Categor{catCount === 1 ? "y" : "ies"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 font-mono">
                          <span className="text-slate-500 text-xs sm:text-sm font-semibold tabular-nums">
                            {percentage}%
                          </span>
                          <span className="font-bold text-slate-950 text-base sm:text-lg tabular-nums">
                            {formatCurrency(data.costVal)}
                          </span>
                        </div>
                      </div>

                      {/* Brand Progress Bar */}
                      <div className="h-2.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-700 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.max(2, Math.min(100, percentage))}%`,
                          }}
                        />
                      </div>

                      {/* Nested Category Breakdown for this Brand */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                            <span>Category Breakdown of {brandName} Items</span>
                            <span>Units &amp; Asset Value</span>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            {catEntries.map((catData) => {
                              const shareOfBrand =
                                data.costVal > 0
                                  ? Math.round(
                                      (catData.costVal / data.costVal) * 100,
                                    )
                                  : 0;

                              return (
                                <div
                                  key={catData.category}
                                  className="p-2.5 rounded-lg border border-slate-200/70 bg-white hover:border-slate-300 text-sm transition-all"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-xs sm:text-sm text-slate-900">
                                        {catData.category}
                                      </span>
                                      <span className="text-xs text-slate-500 font-medium">
                                        {catData.units} unit
                                        {catData.units !== 1 ? "s" : ""} in
                                        stock · {catData.count} SKU
                                        {catData.count > 1 ? "s" : ""}
                                      </span>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-3 font-mono">
                                      <span className="text-xs text-slate-500 font-medium tabular-nums">
                                        {shareOfBrand}% of brand
                                      </span>
                                      <span className="font-bold text-slate-900 text-sm tabular-nums">
                                        {formatCurrency(catData.costVal)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Mini bar for category proportion inside brand */}
                                  <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-slate-700 rounded-full transition-all duration-300"
                                      style={{
                                        width: `${Math.max(2, Math.min(100, shareOfBrand))}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {brandsList.length === 0 && (
                  <p className="py-8 text-center text-base text-slate-400">
                    No items registered for any brand.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Stock Health Summary Bar */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-100">
              <div className="text-base font-bold text-emerald-800">
                Adequate Stock
              </div>
              <div className="text-3xl sm:text-4xl font-black text-emerald-700 font-mono tabular-nums mt-1">
                {items.length - lowStockItems.length - outOfStockItems.length}
              </div>
              <div className="text-sm font-medium text-emerald-700 mt-0.5">
                Optimal levels
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-100">
              <div className="text-base font-bold text-amber-800">
                Low Stock
              </div>
              <div className="text-3xl sm:text-4xl font-black text-amber-700 font-mono tabular-nums mt-1">
                {lowStockItems.length}
              </div>
              <div className="text-sm font-medium text-amber-700 mt-0.5">
                Need replenishment
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-100">
              <div className="text-base font-bold text-rose-800">
                Out of Stock
              </div>
              <div className="text-3xl sm:text-4xl font-black text-rose-700 font-mono tabular-nums mt-1">
                {outOfStockItems.length}
              </div>
              <div className="text-sm font-medium text-rose-700 mt-0.5">
                0 units available
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CORE FINANCIAL BREAKDOWN: Present Date vs Total Previous */}
      <FinancialPeriodBreakdown
        sales={sales}
        onNavigate={onNavigate}
        onOpenNewSale={onOpenNewSale}
      />

      {/* ADMINISTRATOR ONLY: MONTHLY FINANCIAL BREAKDOWN FOR ITEMS, EP & JC, AND LOAD SERVICES */}
      <MonthlyFinancialReports
        sales={sales}
        epJcRecords={epJcRecords}
        epJcTransactions={epJcTransactions}
        loadRecords={loadRecords}
        loadTransactions={loadTransactions}
        items={items}
        currentUser={currentUser}
        onNavigate={onNavigate}
      />

      {/* Items Requiring Attention: Low Stock or Out of Stock List */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h4 className="text-lg font-bold text-slate-900">
                Items Requiring Stock Replenishment
              </h4>
            </div>
            <button
              id="btn-open-all-inventory-alerts"
              onClick={() => onNavigate("inventory")}
              className="text-base font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
            >
              See all inventory <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {[...outOfStockItems, ...lowStockItems].map((item) => (
              <div
                key={item.id}
                className="py-4 flex items-center justify-between text-base gap-3"
              >
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2.5 text-base">
                    <span>{item.name}</span>
                    <span className="text-slate-500 font-mono text-xs">
                      ({item.sku})
                    </span>
                    {item.currentStock === 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>{" "}
                        Out of stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>{" "}
                        Low stock
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600 text-sm mt-1">
                    Current:{" "}
                    <strong className="text-slate-950 font-mono font-bold tabular-nums text-base">
                      {item.currentStock} {item.unit}
                    </strong>{" "}
                    (Alert threshold: {item.minStockAlert} {item.unit}) • Cost:{" "}
                    <span className="font-mono font-bold">
                      {formatCurrency(item.costPrice)}
                    </span>
                  </div>
                </div>

                <button
                  id={`btn-dashboard-adjust-${item.id}`}
                  onClick={() => onAdjustStock(item)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Adjust Stock</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
