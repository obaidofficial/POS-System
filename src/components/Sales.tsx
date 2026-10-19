import React, { useState, useMemo, useEffect } from "react";
import {
  ShoppingCart,
  Plus,
  Search,
  Receipt,
  Trash2,
  Banknote,
  Eye,
  AlertTriangle,
  Calendar,
  History,
  Clock,
  User,
  Boxes,
  TrendingUp,
  RotateCcw,
  ArrowLeftRight,
  DollarSign,
} from "lucide-react";
import { Sale, SaleReturn, SaleExchange } from "../types";
import { storage } from "../services/storage";
import { formatPKR } from "../utils/currency";
import { SaleReceiptModal } from "./SaleReceiptModal";
import { ReturnExchangeModal } from "./ReturnExchangeModal";
import { ReturnReceiptModal } from "./ReturnReceiptModal";
import { TablePagination } from "./TablePagination";
import { getStoredPageSize, setStoredPageSize } from "../utils/pagination";
import { RecordSalePage } from "./RecordSalePage";
import { getBusinessDate } from "../utils/businessDate";

interface SalesProps {
  sales: Sale[];
  onOpenNewSale: () => void;
  onRefresh: () => void;
  isWorker?: boolean;
  initialViewMode?: "LIST" | "NEW_SALE";
  onViewModeChange?: (mode: "LIST" | "NEW_SALE") => void;
  onSaleRecorded?: (newSale: Sale, shouldAutoPrint?: boolean) => void;
}

export const Sales: React.FC<SalesProps> = ({
  sales,
  onOpenNewSale,
  onRefresh,
  isWorker = false,
  initialViewMode = "LIST",
  onViewModeChange,
  onSaleRecorded,
}) => {
  const [viewMode, setViewMode] = useState<"LIST" | "NEW_SALE">(
    () => initialViewMode,
  );

  const [saleFormKey, setSaleFormKey] = useState(0);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  const [searchQuery, setSearchQuery] = useState("");
  const [datePeriodFilter, setDatePeriodFilter] = useState<
    "ALL" | "PRESENT" | "PREVIOUS"
  >(isWorker ? "PRESENT" : "PRESENT");
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(
    null,
  );
  const [selectedReturnExchangeSale, setSelectedReturnExchangeSale] =
    useState<Sale | null>(null);
  const [activeVoucherRecord, setActiveVoucherRecord] = useState<{
    sale: Sale;
    record: SaleReturn | SaleExchange;
    type: "RETURN" | "EXCHANGE";
  } | null>(null);
  const [returnsOnlyFilter, setReturnsOnlyFilter] = useState<boolean>(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState(true);

  // Synchronize worker mode with PRESENT filter
  useEffect(() => {
    if (isWorker) {
      setDatePeriodFilter("PRESENT");
    }
  }, [isWorker]);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkRestoreStock, setBulkRestoreStock] = useState(true);

  // Pagination state with local storage persistence
  const [pageSize, setPageSize] = useState<number>(() =>
    getStoredPageSize("sales", 30),
  );
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Present business date reference (business day starts at 6:00 AM)
  const [todayStr, setTodayStr] = useState(() => getBusinessDate());

  useEffect(() => {
    const updateBusinessDate = () => {
      setTodayStr(getBusinessDate());
    };

    updateBusinessDate();

    // Check the business date every 30 seconds
    const interval = window.setInterval(updateBusinessDate, 30_000);

    return () => window.clearInterval(interval);
  }, []);

  // Available Months for Administrator
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    sales.forEach((s) => {
      if (s.date && s.date.length >= 7) set.add(s.date.substring(0, 7));
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [sales]);

  const [monthFilter, setMonthFilter] = useState<string>("ALL");

  // Date Range filter states (defaults to Today)
  const [fromDate, setFromDate] = useState<string>(() => getBusinessDate());
  const [toDate, setToDate] = useState<string>(() => getBusinessDate());

  // Previous business date
  const yesterdayStr = useMemo(() => {
    const date = new Date(`${todayStr}T12:00:00`);

    date.setDate(date.getDate() - 1);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, [todayStr]);

  // Date Range stats computed exclusively for Administrator
  const dateRangeStats = useMemo(() => {
    if (isWorker) return null;

    const rangeSales = sales.filter((s) => {
      if (!s.date) return false;
      if (fromDate && s.date < fromDate) return false;
      if (toDate && s.date > toDate) return false;
      return true;
    });

    let totalSale = 0;
    let totalCost = 0;
    let itemsSold = 0;

    rangeSales.forEach((s) => {
      totalSale += s.totalAmount;
      s.items.forEach((item) => {
        itemsSold += item.quantity;
        const cPrice = item.costPrice > 0 ? item.costPrice : 0;
        totalCost += cPrice * item.quantity;
      });
    });

    const profit = totalSale - totalCost;
    const margin = totalSale > 0 ? (profit / totalSale) * 100 : 0;

    let rangeLabel = "";
    if (fromDate && toDate) {
      if (fromDate === toDate) {
        rangeLabel = fromDate === todayStr ? "Today" : fromDate;
      } else {
        rangeLabel = `${fromDate} → ${toDate}`;
      }
    } else if (fromDate) {
      rangeLabel = `From ${fromDate}`;
    } else if (toDate) {
      rangeLabel = `Up to ${toDate}`;
    } else {
      rangeLabel = "All Dates";
    }

    return {
      rangeLabel,
      totalSale,
      itemsSold,
      profit,
      margin,
      invoicesCount: rangeSales.length,
    };
  }, [sales, fromDate, toDate, todayStr, isWorker]);

  // Filter sales
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Date range filter (Administrator only)
      if (!isWorker) {
        if (fromDate && sale.date < fromDate) {
          return false;
        }
        if (toDate && sale.date > toDate) {
          return false;
        }
      }

      // Date period filter
      if (datePeriodFilter === "PRESENT" && sale.date !== todayStr) {
        return false;
      }
      if (datePeriodFilter === "PREVIOUS" && sale.date >= todayStr) {
        return false;
      }

      // Returns & Exchanges filter
      if (returnsOnlyFilter) {
        const hasReturns =
          (sale.returns && sale.returns.length > 0) ||
          (sale.exchanges && sale.exchanges.length > 0) ||
          (sale.returnStatus && sale.returnStatus !== "NONE");
        if (!hasReturns) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesInvoice = sale.invoiceNumber.toLowerCase().includes(q);
        const matchesCustomer = sale.customerName.toLowerCase().includes(q);
        const matchesItem = sale.items.some(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.sku.toLowerCase().includes(q) ||
            (item.barcode && item.barcode.toLowerCase().includes(q)),
        );
        const matchesReturn =
          sale.returns?.some((r) => r.returnNumber.toLowerCase().includes(q)) ||
          sale.exchanges?.some((e) =>
            e.exchangeNumber.toLowerCase().includes(q),
          );
        return (
          matchesInvoice || matchesCustomer || matchesItem || matchesReturn
        );
      }

      return true;
    });
  }, [
    sales,
    fromDate,
    toDate,
    datePeriodFilter,
    searchQuery,
    returnsOnlyFilter,
    todayStr,
    isWorker,
  ]);

  const totalReturnExchangeSales = useMemo(() => {
    return sales.filter(
      (s) =>
        (s.returns && s.returns.length > 0) ||
        (s.exchanges && s.exchanges.length > 0) ||
        (s.returnStatus && s.returnStatus !== "NONE"),
    ).length;
  }, [sales]);

  // Financial statistics - Present vs Previous split
  const presentSales = useMemo(
    () => sales.filter((s) => s.date === todayStr),
    [sales, todayStr],
  );
  const previousSales = useMemo(
    () => sales.filter((s) => s.date < todayStr),
    [sales, todayStr],
  );

  const presentRevenue = useMemo(
    () => presentSales.reduce((sum, s) => sum + s.totalAmount, 0),
    [presentSales],
  );
  const previousRevenue = useMemo(
    () => previousSales.reduce((sum, s) => sum + s.totalAmount, 0),
    [previousSales],
  );
  const totalRevenue = presentRevenue + previousRevenue;

  const totalUnitsSold = sales.reduce(
    (sum, s) => sum + s.items.reduce((iSum, line) => iSum + line.quantity, 0),
    0,
  );

  const presentUnitsSold = useMemo(
    () =>
      presentSales.reduce(
        (sum, s) =>
          sum + s.items.reduce((iSum, line) => iSum + line.quantity, 0),
        0,
      ),
    [presentSales],
  );

  const confirmDelete = () => {
    if (!saleToDelete) return;
    storage.deleteSale(saleToDelete.id, restoreStockOnDelete);
    setSaleToDelete(null);
    onRefresh();
  };

  // Reset to page 1 whenever filters or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, datePeriodFilter]);

  // Ensure current page does not exceed total pages
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Sliced items for current page
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, currentPage, pageSize]);

  // Selection helpers
  const isAllPageSelected =
    paginatedSales.length > 0 &&
    paginatedSales.every((sale) => selectedIds.has(sale.id));
  const isSomePageSelected = paginatedSales.some((sale) =>
    selectedIds.has(sale.id),
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
        paginatedSales.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedSales.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(new Set(filteredSales.map((s) => s.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleConfirmBulkDelete = () => {
    if (selectedIds.size === 0) return;
    storage.deleteSales(Array.from(selectedIds), bulkRestoreStock);
    setSelectedIds(new Set());
    setIsBulkDeleteOpen(false);
    onRefresh();
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setStoredPageSize("sales", newSize);
    setCurrentPage(1);
  };

  if (viewMode === "NEW_SALE") {
    return (
      <RecordSalePage
        key={saleFormKey}
        onBack={() => {
          setViewMode("LIST");

          if (onViewModeChange) {
            onViewModeChange("LIST");
          }
        }}
        onSaleCompleted={(newSale, autoPrint) => {
          // Refresh sales and inventory data.
          onRefresh();

          // Reset the form so it is ready for the next sale.
          // The current screen remains on Record New Sale.
          setSaleFormKey((prev) => prev + 1);

          // Open the receipt/printing option without leaving this screen.
          if (onSaleRecorded) {
            onSaleRecorded(newSale, autoPrint ?? true);
          } else {
            setSelectedReceiptSale(newSale);
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Sales Orders & Invoicing</span>
            </h1>
            {isWorker && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                Today's Register
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {/* Record New Sale Button */}
          <button
            type="button"
            id="btn-sales-record-new"
            onClick={() => {
              setViewMode("NEW_SALE");
              if (onViewModeChange) onViewModeChange("NEW_SALE");
            }}
            className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5 text-white" />
            <span>Record New Sale</span>
          </button>
        </div>
      </div>

      {/* Worker Present Day Focus Banner */}
      {isWorker && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">
                  Today's Sales Register
                </span>
                <span className="text-[12px] px-2 py-0.5 rounded-sm font-bold bg-emerald-600 text-white uppercase tracking-wider">
                  {todayStr}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200">
              {presentSales.length} Order{presentSales.length !== 1 ? "s" : ""}{" "}
              Today
            </span>
          </div>
        </div>
      )}

      {/* KPI Cards: Tailored for Worker vs Admin */}
      {isWorker ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Cash Revenue */}
          <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-wider text-emerald-800">
                  Today's Cash Revenue
                </span>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Banknote className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl sm:text-4xl font-black text-emerald-700 font-mono tabular-nums">
                  {formatPKR(presentRevenue)}
                </div>
              </div>
            </div>
          </div>

          {/* Today's Cash Invoices */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-600">
                  Today's Invoices
                </span>
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tabular-nums">
                  {presentSales.length}{" "}
                  <span className="text-base font-normal text-slate-700">
                    Bills
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Units Dispatched */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-600">
                  Today's Items Sold
                </span>
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <ShoppingCart className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tabular-nums">
                  {presentUnitsSold}{" "}
                  <span className="text-base font-normal text-slate-500">
                    Units
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Present Day Shift Indicator */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-600">
                  Active Shift Date
                </span>
                <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-lg font-bold text-slate-900 font-mono">
                  {todayStr}
                </div>
                <div className="mt-1.5 text-sm text-emerald-700 font-semibold">
                  {datePeriodFilter === "PRESENT"
                    ? "Showing Today's Data"
                    : `Filter: ${datePeriodFilter}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Sales Revenue */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-600">
                  Total Sales Revenue
                </span>
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
                  <ShoppingCart className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tabular-nums">
                  {formatPKR(totalRevenue)}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 gap-2 text-xs font-mono">
                  <div className="bg-slate-50 p-2.5 rounded-xl text-slate-800 border border-slate-100">
                    <span className="text-xs block font-sans text-slate-500 font-semibold mb-0.5">
                      Previous:
                    </span>
                    <span className="font-bold text-sm sm:text-base tabular-nums">
                      {formatPKR(previousRevenue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3.5 text-sm text-slate-600 font-medium">
              {sales.length} total orders recorded
            </div>
          </div>

          {/* Cash In Hand / Today's Cash Sales */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-600">
                  Today's Sales
                </span>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <Banknote className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl sm:text-4xl font-black text-emerald-700 font-mono tabular-nums">
                  {formatPKR(presentRevenue)}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {presentSales.length} cash order
                  {presentSales.length !== 1 ? "s" : ""} received today
                </div>
              </div>
            </div>
            <div className="mt-3.5 text-sm text-emerald-700 font-semibold">
              Counter Register Active
            </div>
          </div>

          {/* Total Previous Cash Sales */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-600">
                  Previous Sales Total
                </span>
                <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                  <History className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tabular-nums">
                  {formatPKR(previousRevenue)}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {previousSales.length} historical sales
                </div>
              </div>
            </div>
            <div className="mt-3.5 text-sm text-slate-600 font-medium">
              Archived counter receipts
            </div>
          </div>

          {/* Units Dispatched */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-600">
                  Units Dispatched
                </span>
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tabular-nums">
                  {totalUnitsSold}{" "}
                  <span className="text-base font-normal text-slate-500">
                    units
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Deducted automatically from PC stock database.
                </div>
              </div>
            </div>
            <div className="mt-3.5 text-sm text-emerald-700 font-semibold">
              Active Real-time Stock Sync
            </div>
          </div>
        </div>
      )}

      {/* Administrator Date Range Performance Bar (From Date -> To Date, Items Sold, Total Sale, Profit) */}
      {!isWorker && dateRangeStats && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-50/80 via-indigo-50/60 to-purple-50/80 border border-purple-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Header and Date Range Controls */}
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-3 rounded-xl bg-purple-600 text-white font-bold shrink-0 shadow-xs">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold uppercase tracking-wider text-purple-950">
                    Date Range Performance
                  </span>
                  <span className="text-slate-400 font-normal">·</span>
                  <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                    Admin Only
                  </span>
                  {dateRangeStats.rangeLabel && (
                    <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-md border border-purple-200 shadow-2xs">
                      {dateRangeStats.rangeLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Filter sales between specific dates to analyze items sold,
                  revenue, and gross profit.
                </p>
              </div>
            </div>

            {/* "From Date" -> "To Date" Inputs and Presets */}
            <div className="flex flex-wrap items-center gap-2.5 bg-white/95 p-2.5 rounded-xl border border-purple-200 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="input-sales-from-date"
                  className="text-xs font-bold text-slate-700 whitespace-nowrap"
                >
                  From Date:
                </label>
                <input
                  type="date"
                  id="input-sales-from-date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setDatePeriodFilter("ALL");
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                />
              </div>

              <span className="text-slate-400 font-bold hidden sm:inline">
                →
              </span>

              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="input-sales-to-date"
                  className="text-xs font-bold text-slate-700 whitespace-nowrap"
                >
                  To Date:
                </label>
                <input
                  type="date"
                  id="input-sales-to-date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setDatePeriodFilter("ALL");
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
                <button
                  type="button"
                  id="btn-range-preset-today"
                  onClick={() => {
                    setFromDate(todayStr);
                    setToDate(todayStr);
                    setDatePeriodFilter("ALL");
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                    fromDate === todayStr && toDate === todayStr
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                  title="Filter sales for today only"
                >
                  Today
                </button>
                <button
                  type="button"
                  id="btn-range-preset-this-month"
                  onClick={() => {
                    const startOfMonth = `${todayStr.substring(0, 7)}-01`;
                    setFromDate(startOfMonth);
                    setToDate(todayStr);
                    setDatePeriodFilter("ALL");
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                    fromDate === `${todayStr.substring(0, 7)}-01` &&
                    toDate === todayStr
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                  title="Filter sales for this month"
                >
                  This Month
                </button>
                {(fromDate || toDate) && (
                  <button
                    type="button"
                    id="btn-range-preset-clear"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                      setDatePeriodFilter("ALL");
                    }}
                    className="px-2 py-1 rounded text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer transition-colors"
                    title="Clear date range filter"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Three Required Performance Metric Cards: Items Sold, Total Sale, Profit */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            {/* Card 1: Items Sold */}
            <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Items Sold
                </span>
                <span className="text-lg sm:text-xl font-black font-mono text-slate-900 tabular-nums mt-0.5 block">
                  {dateRangeStats.itemsSold} units
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Across {dateRangeStats.invoicesCount} invoice
                  {dateRangeStats.invoicesCount !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center shrink-0">
                <Boxes className="w-5 h-5 text-purple-600" />
              </div>
            </div>

            {/* Card 2: Total Sale */}
            <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Total Sale
                </span>
                <span className="text-lg sm:text-xl font-black font-mono text-slate-900 tabular-nums mt-0.5 block">
                  {formatPKR(dateRangeStats.totalSale)}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Gross sales revenue
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0">
                <Banknote className="w-5 h-5 text-indigo-600" />
              </div>
            </div>

            {/* Card 4: Cost of Goods */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-300 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                  Cost of Goods
                </span>

                <span className="text-lg sm:text-xl font-black font-mono text-amber-700 tabular-nums mt-0.5 block">
                  {formatPKR(dateRangeStats.totalSale - dateRangeStats.profit)}
                </span>

                <span className="text-[11px] text-amber-700 font-medium">
                  Total inventory cost
                </span>
              </div>

              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
            </div>

            {/* Card 3: Profit */}
            <div className="bg-white p-3.5 rounded-xl border border-emerald-300 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                  Profit
                </span>
                <span className="text-lg sm:text-xl font-black font-mono text-emerald-700 tabular-nums mt-0.5 block">
                  {dateRangeStats.profit >= 0
                    ? `${formatPKR(dateRangeStats.profit)}`
                    : formatPKR(dateRangeStats.profit)}
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold font-mono">
                  {dateRangeStats.margin.toFixed(1)}% profit margin
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar with Date Period */}
      <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-188">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
          <input
            id="sales-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice #, customer, product name..."
            className="w-full pl-11 pr-4 py-2.5 rounded-md border border-slate-200 text-sm sm:text-base focus:outline-none focus:border-slate-400"
          />
        </div>

        {/* Date Period & Month Selector */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto flex-wrap sm:flex-nowrap">
          <span className="text-sm font-bold text-slate-600 flex items-center gap-1.5 mr-1">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Period:</span>
          </span>

          <button
            id="btn-filter-date-present"
            onClick={() => {
              setDatePeriodFilter("PRESENT");
              setFromDate(todayStr);
              setToDate(todayStr);
            }}
            className={`px-4 py-2.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              datePeriodFilter === "PRESENT"
                ? "bg-emerald-600 text-white shadow-xs font-bold"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${datePeriodFilter === "PRESENT" ? "bg-white animate-pulse" : "bg-emerald-500"}`}
            ></span>
            <span>Today ({presentSales.length})</span>
          </button>

          {!isWorker && (
            <button
              id="btn-filter-date-all"
              onClick={() => {
                setDatePeriodFilter("ALL");
                setFromDate("");
                setToDate("");
              }}
              className={`px-4 py-2.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                datePeriodFilter === "ALL" && !fromDate && !toDate
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Dates ({sales.length})
            </button>
          )}

          {/* Previous — Admin Only */}
          {!isWorker && (
            <button
              id="btn-filter-date-previous"
              onClick={() => {
                setDatePeriodFilter("PREVIOUS");
                setFromDate("");
                setToDate(yesterdayStr);
              }}
              className={`px-4 py-2.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                datePeriodFilter === "PREVIOUS"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>Previous ({previousSales.length})</span>
            </button>
          )}

          {/* Returns & Exchanges Quick Filter */}
          {totalReturnExchangeSales > 0 && (
            <button
              id="btn-filter-returns-exchanges"
              type="button"
              onClick={() => setReturnsOnlyFilter((prev) => !prev)}
              className={`px-4 py-2.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                returnsOnlyFilter
                  ? "bg-purple-600 text-white shadow-xs font-bold"
                  : "bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200"
              }`}
              title="Filter sales orders with returned or exchanged items"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Returns / Exchanges ({totalReturnExchangeSales})</span>
            </button>
          )}

          {/* Administrator Month Selector */}
          {!isWorker && availableMonths.length > 0 && (
            <div className="flex items-center gap-2 pl-2 sm:border-l sm:border-slate-200">
              <span className="text-sm font-bold text-slate-600 whitespace-nowrap">
                Month:
              </span>
              <select
                id="select-sales-month-filter"
                value={monthFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setMonthFilter(val);
                  setDatePeriodFilter("ALL");
                  if (val !== "ALL") {
                    const [y, mon] = val.split("-").map(Number);
                    const lastDay = new Date(y, mon, 0).getDate();
                    setFromDate(`${val}-01`);
                    setToDate(`${val}-${String(lastDay).padStart(2, "0")}`);
                  } else {
                    setFromDate("");
                    setToDate("");
                  }
                }}
                className="px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-800 shadow-2xs outline-none cursor-pointer"
              >
                <option value="ALL">
                  All Months ({availableMonths.length})
                </option>
                {availableMonths.map((m) => {
                  let label = m;
                  try {
                    const [y, mon] = m.split("-").map(Number);
                    label = new Date(y, mon - 1, 1).toLocaleDateString(
                      "en-US",
                      { month: "short", year: "numeric" },
                    );
                  } catch {}
                  return (
                    <option key={m} value={m}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white rounded-md px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md border border-slate-800 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <span className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-full">
              {selectedIds.size}
            </span>
            <span className="text-xs text-slate-200 font-medium">
              sale order{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            {selectedIds.size < filteredSales.length && (
              <button
                type="button"
                id="btn-select-all-filtered-sales"
                onClick={handleSelectAllFiltered}
                className="text-xs text-emerald-300 hover:text-emerald-200 underline font-medium ml-2 cursor-pointer"
              >
                Select all {filteredSales.length} matching sales
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-clear-selected-sales"
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              Deselect All
            </button>
            <button
              type="button"
              id="btn-bulk-delete-sales"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Sales Orders Table */}
      <div className="rounded-xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-base">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-sm font-bold uppercase tracking-wider text-slate-800">
                <th className="py-4 px-3.5 w-12 text-center">
                  <input
                    type="checkbox"
                    id="select-all-sales"
                    checked={isAllPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isPageIndeterminate;
                    }}
                    onChange={handleToggleSelectAllPage}
                    className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    aria-label="Select all sales on current page"
                  />
                </th>
                <th className="py-4 px-4">Invoice #</th>
                <th className="py-4 px-4">Date</th>
                <th className="py-4 px-4">Customer</th>
                <th className="py-4 px-4">Items Summary</th>
                <th className="py-4 px-4 text-right">Total Amount</th>
                <th className="py-4 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-base">
              {paginatedSales.map((sale) => {
                const isSelected = selectedIds.has(sale.id);
                const totalQty = sale.items.reduce(
                  (acc, i) => acc + i.quantity,
                  0,
                );

                return (
                  <tr
                    key={sale.id}
                    id={`sale-row-${sale.id}`}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-emerald-50/70 border-l-2 border-l-emerald-600"
                        : "hover:bg-slate-50/70"
                    }`}
                  >
                    {/* Row Select Checkbox */}
                    <td
                      className="py-4 px-3.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        id={`select-sale-${sale.id}`}
                        checked={isSelected}
                        onChange={() => handleToggleSelect(sale.id)}
                        className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        aria-label={`Select invoice ${sale.invoiceNumber}`}
                      />
                    </td>

                    {/* Invoice # */}
                    <td className="py-4 px-4">
                      <span className="font-mono font-bold text-slate-950 text-base block">
                        {sale.invoiceNumber}
                      </span>
                      {sale.returnStatus && sale.returnStatus !== "NONE" && (
                        <div className="mt-1 flex items-center gap-1 flex-wrap">
                          {sale.returnStatus === "FULLY_RETURNED" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Returned</span>
                            </span>
                          )}
                          {sale.returnStatus === "PARTIAL_RETURN" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Part. Returned</span>
                            </span>
                          )}
                          {(sale.returnStatus === "EXCHANGED" ||
                            sale.returnStatus === "PARTIAL_EXCHANGE") && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                              <ArrowLeftRight className="w-2.5 h-2.5" />
                              <span>Exchanged</span>
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Date & Time */}
                    <td className="py-4 px-4 font-mono text-slate-600 whitespace-nowrap text-base">
                      <div>{sale.date}</div>
                      {(sale.time || sale.createdAt) && (
                        <div className="text-xs text-slate-400 font-sans mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {sale.time ||
                              new Date(sale.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Customer & Cashier */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-950 text-base">
                        {sale.customerName}
                      </div>
                      {sale.cashierName && (
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>
                            Cashier:{" "}
                            <strong className="text-slate-700">
                              {sale.cashierName}
                            </strong>
                          </span>
                        </div>
                      )}
                      {sale.notes && (
                        <div className="text-xs text-slate-500 truncate max-w-[200px] mt-0.5">
                          {sale.notes}
                        </div>
                      )}
                    </td>

                    {/* Items Sold */}
                    <td className="py-4 px-4">
                      <div className="text-[14px] text-black font-semibold truncate max-w-[1000px]">
                        {sale.items
                          .map((i) => `${i.name} (x${i.quantity})`)
                          .join(", ")}
                      </div>
                      <div className="text-slate-700 text-xs mt-1">
                        {sale.items.length} product
                        {sale.items.length > 1 ? "s" : ""} ({totalQty} units)
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="py-4 px-4 text-right">
                      <span className="tabular-nums font-semibold text-slate-950 text-base sm:text-lg block">
                        {formatPKR(sale.totalAmount)}
                      </span>
                      {sale.discountTotal !== undefined &&
                        sale.discountTotal > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 mt-0.5 font-mono">
                            Disc: -{formatPKR(sale.discountTotal)}
                          </span>
                        )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          id={`btn-view-receipt-${sale.id}`}
                          onClick={() => setSelectedReceiptSale(sale)}
                          title="View & Print Sale Receipt"
                          className="p-2.5 rounded-xl text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          id={`btn-return-exchange-${sale.id}`}
                          onClick={() => setSelectedReturnExchangeSale(sale)}
                          title="Return or Exchange Items"
                          className="p-2.5 rounded-xl text-purple-600 hover:text-purple-900 hover:bg-purple-50 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                        <button
                          id={`btn-delete-sale-${sale.id}`}
                          onClick={() => setSaleToDelete(sale)}
                          title="Delete Sale Order"
                          className="p-2.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No sales records found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination with persistent rows per page */}
        <TablePagination
          totalItems={filteredSales.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
          itemLabel="sales orders"
          idPrefix="sales"
        />
      </div>

      {/* Sale Receipt Modal */}
      {selectedReceiptSale && (
        <SaleReceiptModal
          sale={selectedReceiptSale}
          onClose={() => setSelectedReceiptSale(null)}
        />
      )}

      {/* Return & Exchange Action Modal */}
      {selectedReturnExchangeSale && (
        <ReturnExchangeModal
          sale={selectedReturnExchangeSale}
          isOpen={true}
          onClose={() => setSelectedReturnExchangeSale(null)}
          onCompleted={(result) => {
            onRefresh();
            const prevSale = selectedReturnExchangeSale;
            setSelectedReturnExchangeSale(null);

            if (result.type === "EXCHANGE" && result.newSale) {
              // Open the newly generated slip for the replacement item
              setSelectedReceiptSale(result.newSale);
            } else if (result.type === "RETURN") {
              if (result.updatedSale) {
                // Sale order updated with remaining units and new total
                setSelectedReceiptSale(result.updatedSale);
              } else if (prevSale) {
                // Sale invoice was deleted from history (full refund)
                setActiveVoucherRecord({
                  sale: prevSale,
                  record: result.record,
                  type: "RETURN",
                });
              }
            }
          }}
          onViewPastSlip={(type, record) => {
            setActiveVoucherRecord({
              sale: selectedReturnExchangeSale,
              record,
              type,
            });
          }}
        />
      )}

      {/* Return / Exchange Voucher Receipt Modal */}
      {activeVoucherRecord && (
        <ReturnReceiptModal
          sale={activeVoucherRecord.sale}
          record={activeVoucherRecord.record}
          type={activeVoucherRecord.type}
          onClose={() => setActiveVoucherRecord(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {saleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-md max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Delete Sale Order
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Are you sure you want to delete invoice{" "}
              <span className="font-semibold text-slate-900 font-mono">
                {saleToDelete.invoiceNumber}
              </span>{" "}
              for{" "}
              <strong className="text-slate-900">
                {saleToDelete.customerName}
              </strong>{" "}
              ({formatPKR(saleToDelete.totalAmount)})?
            </p>

            <div className="mt-4 p-2.5 rounded-md bg-slate-50 border border-slate-200">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreStockOnDelete}
                  onChange={(e) => setRestoreStockOnDelete(e.target.checked)}
                  className="rounded text-slate-900 cursor-pointer"
                />
                <span>Return items back to inventory stock</span>
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                id="btn-cancel-delete-sale"
                onClick={() => setSaleToDelete(null)}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-sale"
                onClick={confirmDelete}
                className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
              >
                Delete Sale
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
                Confirm Bulk Sales Deletion
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <span className="font-bold text-slate-900">
                {selectedIds.size}
              </span>{" "}
              selected sales order{selectedIds.size > 1 ? "s" : ""}? These
              invoice records will be removed from your sales history.
            </p>

            <div className="mt-4 p-3 rounded-md bg-slate-50 border border-slate-200">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  id="checkbox-bulk-restore-stock"
                  checked={bulkRestoreStock}
                  onChange={(e) => setBulkRestoreStock(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                />
                <span>
                  Restore and return all sold item quantities back to inventory
                  stock
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                id="btn-cancel-bulk-delete-sales"
                onClick={() => setIsBulkDeleteOpen(false)}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-bulk-delete-sales"
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
    </div>
  );
};
