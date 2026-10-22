import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Radio,
  Plus,
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  Search,
  Filter,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  DollarSign,
  Wallet,
  Coins,
  History,
  Info,
  AlertTriangle,
  Smartphone,
  Sparkles,
  PhoneCall,
  Hash,
  Clock,
  RotateCcw,
} from "lucide-react";
import {
  LoadDailyRecord,
  LoadTransaction,
  LoadNetworkType,
  LoadTxType,
} from "../types";
import { formatPKR } from "../utils/currency";
import { getBusinessDate, getDateNDaysAgoBusiness } from "../utils/businessDate";
import { LoadDailyModal } from "./LoadDailyModal";
import { LoadTxModal } from "./LoadTxModal";
import { TablePagination } from "./TablePagination";
import { getStoredPageSize, setStoredPageSize } from "../utils/pagination";

interface LoadDashboardProps {
  records: LoadDailyRecord[];
  transactions: LoadTransaction[];
  onSaveDailyRecord: (
    record: Partial<LoadDailyRecord> & { date: string },
  ) => Promise<void>;
  onDeleteDailyRecord: (idOrDate: string) => Promise<void>;
  onSaveTransaction: (
    tx: Omit<LoadTransaction, "id" | "createdAt"> & { id?: string },
  ) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onRefresh: () => void;
  isWorker?: boolean;
}

const NETWORK_BADGES: Record<
  LoadNetworkType,
  { label: string; badge: string; color: string }
> = {
  JAZZ_WARID: {
    label: "Jazz / Warid",
    badge: "bg-red-50 text-red-700 border-red-200",
    color: "text-red-700",
  },
  TELENOR: {
    label: "Telenor",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    color: "text-sky-700",
  },
  ZONG: {
    label: "Zong",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    color: "text-emerald-700",
  },
  UFONE: {
    label: "Ufone",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    color: "text-amber-700",
  },
};

export const LoadDashboard: React.FC<LoadDashboardProps> = ({
  records,
  transactions,
  onSaveDailyRecord,
  onDeleteDailyRecord,
  onSaveTransaction,
  onDeleteTransaction,
  onRefresh,
  isWorker = false,
}) => {
  const [todayStr, setTodayStr] = useState<string>(() => getBusinessDate());

  useEffect(() => {
    const checkDate = () => {
      const current = getBusinessDate();
      setTodayStr((prev) => {
        if (prev !== current) {
          setSelectedDate((oldSel) => (oldSel === prev ? current : oldSel));
          return current;
        }
        return prev;
      });
    };
    const interval = setInterval(checkDate, 10000);
    return () => clearInterval(interval);
  }, []);

  // Modals state
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<LoadDailyRecord | null>(
    null,
  );

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<LoadTransaction | null>(null);

  // Delete confirmation state
  const [recordToDelete, setRecordToDelete] = useState<LoadDailyRecord | null>(
    null,
  );
  const [txToDelete, setTxToDelete] = useState<LoadTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Active view tab
  const [viewMode, setViewMode] = useState<"DAILY_RECORDS" | "TRANSACTIONS">(
    "DAILY_RECORDS",
  );

  // Selected date for quick focus (defaults strictly to active Pakistan business date)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Filters & Search for transactions
  const [txSearch, setTxSearch] = useState("");
  const [networkFilter, setNetworkFilter] = useState<"ALL" | LoadNetworkType>(
    "ALL",
  );
  const [typeFilter, setTypeFilter] = useState<"ALL" | LoadTxType>("ALL");
  const [txDateFilter, setTxDateFilter] = useState<string>(
    isWorker ? todayStr : "ALL",
  );

  // Filter for Daily Records tab (Today vs All vs Date Range)
  const [dailyFilter, setDailyFilter] = useState<"TODAY" | "ALL" | "RANGE">(
    isWorker ? "TODAY" : "ALL",
  );
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const getDateNDaysAgo = (days: number): string => {
    return getDateNDaysAgoBusiness(days - 1, todayStr);
  };

  const handleApplyPresetDays = (days: number) => {
    const start = getDateNDaysAgo(days);
    setStartDate(start);
    setEndDate(todayStr);
    setDailyFilter("RANGE");
    setRecordsPage(1);
  };

  const handleClearDateRange = () => {
    setStartDate("");
    setEndDate("");
    setDailyFilter("ALL");
    setRecordsPage(1);
  };

  // Synchronize when worker status changes
  useEffect(() => {
    if (isWorker) {
      setSelectedDate(todayStr);
      setTxDateFilter(todayStr);
      setDailyFilter("TODAY");
      setStartDate(todayStr);
      setEndDate(todayStr);
    }
  }, [isWorker, todayStr]);

  // Pagination
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPageSize, setRecordsPageSize] = useState<number>(() =>
    getStoredPageSize("load_records", 30),
  );

  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState<number>(() =>
    getStoredPageSize("load_txs", 30),
  );

  // Print slip state
  const [slipRecord, setSlipRecord] = useState<LoadDailyRecord | null>(null);

  // Set print-modal-active on document.body when slipRecord is opened
  useEffect(() => {
    if (slipRecord) {
      document.body.classList.add("print-modal-active");
      return () => {
        document.body.classList.remove("print-modal-active");
      };
    }
  }, [slipRecord]);

  // Current selected day's record (if exists)
  const activeDayRecord = useMemo(() => {
    return records.find((r) => r.date === selectedDate);
  }, [records, selectedDate]);

  // Present Day (Today) Metrics
  const todayMetrics = useMemo(() => {
    const todayRecord = records.find((r) => r.date === todayStr);
    const todayTxs = transactions.filter((t) => t.date === todayStr);

    let todaySalesVolume = 0;
    let todayCommission = 0;

    todayTxs.forEach((t) => {
      todaySalesVolume += t.amount;
      todayCommission += t.commissionOrProfit || 0;
    });

    return {
      record: todayRecord,
      hasRecord: Boolean(todayRecord),
      totalOpening: todayRecord?.totalOpening || 0,
      totalClosing: todayRecord?.totalClosing || 0,
      netDifference: todayRecord
        ? todayRecord.totalClosing - todayRecord.totalOpening
        : 0,
      resultType: todayRecord?.resultType,
      txCount: todayTxs.length,
      salesVolume: todaySalesVolume,
      commission: todayCommission,
    };
  }, [records, transactions, todayStr]);

  // Calculations for all-time totals
  const summaryMetrics = useMemo(() => {
    let totalOpeningSum = 0;
    let totalClosingSum = 0;
    let netProfitDays = 0;
    let netLossDays = 0;

    records.forEach((r) => {
      totalOpeningSum += r.totalOpening;
      totalClosingSum += r.totalClosing;
      if (r.resultType === "PROFIT") netProfitDays += 1;
      if (r.resultType === "LOSS") netLossDays += 1;
    });

    const netOverall = totalClosingSum - totalOpeningSum;

    // Transaction metrics
    let totalLoadSalesVolume = 0;
    let totalCommissionEarned = 0;
    transactions.forEach((t) => {
      totalLoadSalesVolume += t.amount;
      totalCommissionEarned += t.commissionOrProfit || 0;
    });

    return {
      totalDays: records.length,
      netOverall,
      totalOpeningSum,
      totalClosingSum,
      netProfitDays,
      netLossDays,
      totalLoadSalesVolume,
      totalCommissionEarned,
      totalTransactions: transactions.length,
    };
  }, [records, transactions]);

  // Administrator Date Range / Period Balances Analytics
  const adminPeriodStats = useMemo(() => {
    if (isWorker) return null;

    const inRangeRecords = records.filter((r) => {
      if (dailyFilter === "TODAY") return r.date === todayStr;
      if (dailyFilter === "RANGE" || startDate || endDate) {
        if (startDate && r.date < startDate) return false;
        if (endDate && r.date > endDate) return false;
        return true;
      }
      return true;
    });

    const inRangeTxs = transactions.filter((t) => {
      if (dailyFilter === "TODAY") return t.date === todayStr;
      if (dailyFilter === "RANGE" || startDate || endDate) {
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        return true;
      }
      return true;
    });

    let pOpening = 0;
    let pClosing = 0;
    let pProfit = 0;

    inRangeRecords.forEach((r) => {
      pOpening += r.totalOpening;
      pClosing += r.totalClosing;
      pProfit += r.netDifference;
    });

    let pTotalLoadSale = 0;
    inRangeTxs.forEach((t) => {
      pTotalLoadSale += t.amount;
    });

    let label = "All History";
    let spanDays = inRangeRecords.length;

    if (dailyFilter === "TODAY") {
      label = `Today (${todayStr})`;
      spanDays = 1;
    } else if (startDate && endDate) {
      if (startDate === endDate) {
        label = startDate;
        spanDays = 1;
      } else {
        const s = new Date(startDate);
        const e = new Date(endDate);
        const diff =
          Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        spanDays = diff > 0 ? diff : inRangeRecords.length;
        label = `${startDate} to ${endDate} (${spanDays} Day${spanDays !== 1 ? "s" : ""})`;
      }
    } else if (startDate) {
      label = `From ${startDate}`;
    } else if (endDate) {
      label = `Up to ${endDate}`;
    } else {
      label = `All History (${records.length} Days Recorded)`;
    }

    return {
      periodLabel: label,
      monthLabel: label,
      totalOpening: pOpening,
      totalClosing: pClosing,
      totalLoadSale: pTotalLoadSale,
      profit: pProfit,
      isProfit: pProfit > 0,
      isLoss: pProfit < 0,
      daysLogged: inRangeRecords.length,
      spanDays,
      txCount: inRangeTxs.length,
    };
  }, [
    records,
    transactions,
    dailyFilter,
    startDate,
    endDate,
    todayStr,
    isWorker,
  ]);

  // Backward compatibility alias
  const adminMonthlyStats = adminPeriodStats;

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!isWorker) {
        if (dailyFilter === "TODAY" && t.date !== todayStr) return false;
        if (dailyFilter === "RANGE" || startDate || endDate) {
          if (startDate && t.date < startDate) return false;
          if (endDate && t.date > endDate) return false;
        }
      }
      if (networkFilter !== "ALL" && t.network !== networkFilter) return false;
      if (typeFilter !== "ALL" && t.type !== typeFilter) return false;
      if (txDateFilter !== "ALL" && t.date !== txDateFilter) return false;

      if (txSearch) {
        const query = txSearch.toLowerCase();
        const matchesMobile = t.customerMobile.toLowerCase().includes(query);
        const matchesName = t.customerName
          ? t.customerName.toLowerCase().includes(query)
          : false;
        const matchesNotes = t.notes
          ? t.notes.toLowerCase().includes(query)
          : false;
        const matchesTrx = t.trxId
          ? t.trxId.toLowerCase().includes(query)
          : false;
        if (!matchesMobile && !matchesName && !matchesNotes && !matchesTrx)
          return false;
      }
      return true;
    });
  }, [
    transactions,
    networkFilter,
    typeFilter,
    txDateFilter,
    txSearch,
    isWorker,
    dailyFilter,
    startDate,
    endDate,
    todayStr,
  ]);

  // Filtered daily records (Today vs Range vs All)
  const filteredDailyRecords = useMemo(() => {
    if (dailyFilter === "TODAY") {
      return records.filter((r) => r.date === todayStr);
    }
    if (dailyFilter === "RANGE" || startDate || endDate) {
      return records.filter((r) => {
        if (startDate && r.date < startDate) return false;
        if (endDate && r.date > endDate) return false;
        return true;
      });
    }
    return records;
  }, [records, dailyFilter, todayStr, startDate, endDate]);

  const paginatedDailyRecords = useMemo(() => {
    const start = (recordsPage - 1) * recordsPageSize;
    return filteredDailyRecords.slice(start, start + recordsPageSize);
  }, [filteredDailyRecords, recordsPage, recordsPageSize]);

  const paginatedTransactions = useMemo(() => {
    const start = (txPage - 1) * txPageSize;
    return filteredTransactions.slice(start, start + txPageSize);
  }, [filteredTransactions, txPage, txPageSize]);

  // Unique transaction dates for date filter
  const uniqueTxDates = useMemo(() => {
    const set = new Set<string>();
    set.add(todayStr);
    transactions.forEach((t) => set.add(t.date));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions, todayStr]);

  // Handlers
  const handleOpenNewDailyModal = () => {
    setRecordToEdit(null);
    setIsDailyModalOpen(true);
  };

  const handleOpenEditDailyModal = (rec: LoadDailyRecord) => {
    setRecordToEdit(rec);
    setIsDailyModalOpen(true);
  };

  const handleOpenNewTxModal = () => {
    setTxToEdit(null);
    setIsTxModalOpen(true);
  };

  const handleConfirmDeleteRecord = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteDailyRecord(recordToDelete.id);
      setRecordToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteTx = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteTransaction(txToDelete.id);
      setTxToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Exports
  const exportDailyRecordsCSV = () => {
    if (records.length === 0) return;
    const headers = [
      "Date",
      "Jazz Opening",
      "Telenor Opening",
      "Zong Opening",
      "Ufone Opening",
      "Load Cash Opening",
      "Extra Addition (Open)",
      "Total Opening",
      "Jazz Closing",
      "Telenor Closing",
      "Zong Closing",
      "Ufone Closing",
      "Load Cash Closing",
      "Load Expense (Close)",
      "Total Closing",
      "Net Difference",
      "Result Type",
      "Notes",
    ];

    const rows = records.map((r) => [
      r.date,
      r.jazzOpening,
      r.telenorOpening,
      r.zongOpening,
      r.ufoneOpening,
      r.loadCashOpening,
      r.extraAddition || 0,
      r.totalOpening,
      r.jazzClosing,
      r.telenorClosing,
      r.zongClosing,
      r.ufoneClosing,
      r.loadCashClosing,
      r.loadExpense || 0,
      r.totalClosing,
      r.netDifference,
      r.resultType,
      `"${(r.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mobile_load_daily_records_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTransactionsCSV = () => {
    if (transactions.length === 0) return;
    const headers = [
      "Date",
      "Time",
      "Network",
      "Type",
      "Customer Mobile",
      "Customer Name",
      "Amount",
      "Commission/Profit",
      "Trx ID",
      "Notes",
    ];

    const rows = transactions.map((t) => [
      t.date,
      t.time || "",
      t.network,
      t.type,
      t.customerMobile,
      `"${(t.customerName || "").replace(/"/g, '""')}"`,
      t.amount,
      t.commissionOrProfit,
      t.trxId || "",
      `"${(t.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mobile_load_sales_register_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintSlip = (record: LoadDailyRecord) => {
    setSlipRecord(record);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Mobile Load Services Management
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenNewTxModal}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Smartphone className="w-4 h-4 text-amber-600" />
            <span>Record Load Sale</span>
          </button>
          <button
            onClick={handleOpenNewDailyModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>New Daily Load Record</span>
          </button>
        </div>
      </div>

      {/* Worker Present Day Focus Banner */}
      {isWorker && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  Today's Mobile Load Register
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-600 text-white uppercase tracking-wider">
                  Present Day: {todayStr}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200">
              {todayMetrics.txCount} Top-up
              {todayMetrics.txCount !== 1 ? "s" : ""} Today
            </span>
          </div>
        </div>
      )}

      {/* High-Level Overview Metrics: Worker Present Day vs Admin All-Time */}
      {isWorker ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Net Load Variance / Result */}
          <div className="p-5 bg-white rounded-2xl border border-amber-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-amber-800 text-sm font-bold uppercase tracking-wider">
              <span>Today's Net Variance</span>
              {todayMetrics.hasRecord ? (
                todayMetrics.netDifference >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )
              ) : (
                <Calendar className="w-5 h-5 text-amber-500" />
              )}
            </div>
            <div
              className={`text-3xl sm:text-4xl font-black font-mono tracking-tight tabular-nums ${
                todayMetrics.hasRecord
                  ? todayMetrics.netDifference >= 0
                    ? "text-emerald-700"
                    : "text-red-700"
                  : "text-slate-500"
              }`}
            >
              {todayMetrics.hasRecord
                ? `${todayMetrics.netDifference >= 0 ? "+" : ""}${formatPKR(todayMetrics.netDifference)}`
                : "Pending Sheet"}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 pt-1 font-medium">
              {todayMetrics.hasRecord
                ? `Opening ${formatPKR(todayMetrics.totalOpening)} • Closing ${formatPKR(todayMetrics.totalClosing)}`
                : "Reconcile today's SIM balances below"}
            </p>
          </div>

          {/* Today's Easyload Sales Volume */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600 text-sm font-bold uppercase tracking-wider">
              <span>Today's Load Sales</span>
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 tracking-tight tabular-nums">
              {formatPKR(todayMetrics.salesVolume)}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 pt-1 font-medium">
              {todayMetrics.txCount} customer top-up
              {todayMetrics.txCount !== 1 ? "s" : ""} sold today
            </p>
          </div>

          {/* Today's Commission / Profit Earned */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600 text-sm font-bold uppercase tracking-wider">
              <span>Today's Profit / Commission</span>
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-amber-700 tracking-tight tabular-nums">
              {formatPKR(todayMetrics.commission)}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 pt-1 font-medium">
              Earned on today's retail sales
            </p>
          </div>

          {/* Today's Active Date */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600 text-sm font-bold uppercase tracking-wider">
              <span>Active Shift Date</span>
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight">
              {todayStr}
            </div>
            <p className="text-xs sm:text-sm text-emerald-700 font-bold pt-1">
              Present Day Register Active
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* All-time Net Reconciled Profit / Loss */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600 text-sm font-bold uppercase tracking-wider">
              <span>Total Net Load Profit/Loss</span>
              {summaryMetrics.netOverall >= 0 ? (
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div
              className={`text-3xl sm:text-4xl font-black font-mono tracking-tight tabular-nums ${
                summaryMetrics.netOverall >= 0
                  ? "text-emerald-700"
                  : "text-red-700"
              }`}
            >
              {summaryMetrics.netOverall > 0 ? "+" : ""}
              {formatPKR(summaryMetrics.netOverall)}
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 pt-1 font-semibold">
              <span className="text-emerald-700 font-bold">
                {summaryMetrics.netProfitDays} Profit Days
              </span>
              <span>•</span>
              <span className="text-red-700 font-bold">
                {summaryMetrics.netLossDays} Loss Days
              </span>
            </div>
          </div>

          {/* Total Opening Volume across all days */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600 text-sm font-bold uppercase tracking-wider">
              <span>Total Opening Volume</span>
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 tracking-tight tabular-nums">
              {formatPKR(summaryMetrics.totalOpeningSum)}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 pt-1 font-medium">
              Across {summaryMetrics.totalDays} recorded business days
            </div>
          </div>

          {/* Total Closing Volume across all days */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600 text-sm font-bold uppercase tracking-wider">
              <span>Total Closing Volume</span>
              <Coins className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 tracking-tight tabular-nums">
              {formatPKR(summaryMetrics.totalClosingSum)}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 pt-1 font-medium">
              Sum of SIM closings & cash collected
            </div>
          </div>

          {/* Retail Sales & Commission Volume */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600 text-sm font-bold uppercase tracking-wider">
              <span>Registered Sales / Profit</span>
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 tracking-tight tabular-nums">
              {formatPKR(summaryMetrics.totalLoadSalesVolume)}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 pt-1 font-medium flex items-center justify-between">
              <span>{summaryMetrics.totalTransactions} top-ups</span>
              <span className="text-emerald-700 font-bold font-mono">
                +{formatPKR(summaryMetrics.totalCommissionEarned)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Daily Reconciliation Spotlight (Active Day Focus) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-slate-200 bg-slate-50/60 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Daily Load Reconciliation Spotlight:</span>
                <span className="font-mono text-amber-700">{selectedDate}</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Detailed SIM opening/closing status, cash drawer balance, and
                daily profit result
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">
              Select Day:
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500"
            >
              {records.map((r) => (
                <option key={r.id} value={r.date}>
                  {r.date} (
                  {r.resultType === "PROFIT"
                    ? `+${formatPKR(r.netDifference)}`
                    : formatPKR(r.netDifference)}
                  )
                </option>
              ))}
              {!records.some((r) => r.date === todayStr) && (
                <option value={todayStr}>{todayStr} (Not Recorded Yet)</option>
              )}
            </select>
          </div>
        </div>

        {activeDayRecord ? (
          <div className="p-5 space-y-5">
            {/* Top row: 4 Networks + Cash breakdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Jazz / Warid */}
              <div className="p-3.5 rounded-lg border border-red-200 bg-red-50/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                    Jazz / Warid
                  </span>
                  <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-1.5 py-0.2 rounded">
                    SIM
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Open:</span>
                    <span className="font-mono font-medium">
                      {formatPKR(activeDayRecord.jazzOpening)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-semibold">
                    <span>Close:</span>
                    <span className="font-mono">
                      {formatPKR(activeDayRecord.jazzClosing)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] pt-1 border-t border-red-100">
                    <span className="text-slate-500">Delta:</span>
                    <span className="font-mono font-bold text-red-700">
                      {activeDayRecord.jazzClosing -
                        activeDayRecord.jazzOpening >=
                      0
                        ? "+"
                        : ""}
                      {formatPKR(
                        activeDayRecord.jazzClosing -
                          activeDayRecord.jazzOpening,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Telenor */}
              <div className="p-3.5 rounded-lg border border-sky-200 bg-sky-50/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    Telenor
                  </span>
                  <span className="text-[10px] font-semibold text-sky-600 bg-sky-100 px-1.5 py-0.2 rounded">
                    SIM
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Open:</span>
                    <span className="font-mono font-medium">
                      {formatPKR(activeDayRecord.telenorOpening)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-semibold">
                    <span>Close:</span>
                    <span className="font-mono">
                      {formatPKR(activeDayRecord.telenorClosing)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] pt-1 border-t border-sky-100">
                    <span className="text-slate-500">Delta:</span>
                    <span className="font-mono font-bold text-sky-700">
                      {activeDayRecord.telenorClosing -
                        activeDayRecord.telenorOpening >=
                      0
                        ? "+"
                        : ""}
                      {formatPKR(
                        activeDayRecord.telenorClosing -
                          activeDayRecord.telenorOpening,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Zong */}
              <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Zong
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.2 rounded">
                    SIM
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Open:</span>
                    <span className="font-mono font-medium">
                      {formatPKR(activeDayRecord.zongOpening)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-semibold">
                    <span>Close:</span>
                    <span className="font-mono">
                      {formatPKR(activeDayRecord.zongClosing)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] pt-1 border-t border-emerald-100">
                    <span className="text-slate-500">Delta:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {activeDayRecord.zongClosing -
                        activeDayRecord.zongOpening >=
                      0
                        ? "+"
                        : ""}
                      {formatPKR(
                        activeDayRecord.zongClosing -
                          activeDayRecord.zongOpening,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ufone */}
              <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Ufone
                  </span>
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.2 rounded">
                    SIM
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Open:</span>
                    <span className="font-mono font-medium">
                      {formatPKR(activeDayRecord.ufoneOpening)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-semibold">
                    <span>Close:</span>
                    <span className="font-mono">
                      {formatPKR(activeDayRecord.ufoneClosing)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] pt-1 border-t border-amber-100">
                    <span className="text-slate-500">Delta:</span>
                    <span className="font-mono font-bold text-amber-700">
                      {activeDayRecord.ufoneClosing -
                        activeDayRecord.ufoneOpening >=
                      0
                        ? "+"
                        : ""}
                      {formatPKR(
                        activeDayRecord.ufoneClosing -
                          activeDayRecord.ufoneOpening,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Drawer Cash */}
              <div className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                    <Coins className="w-3 h-3 text-teal-600" />
                    Load Cash
                  </span>
                  <span className="text-[10px] font-semibold text-teal-700 bg-teal-100 px-1.5 py-0.2 rounded">
                    Counter
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Open:</span>
                    <span className="font-mono font-medium">
                      {formatPKR(activeDayRecord.loadCashOpening)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-semibold">
                    <span>Close:</span>
                    <span className="font-mono">
                      {formatPKR(activeDayRecord.loadCashClosing)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] pt-1 border-t border-teal-100">
                    <span className="text-slate-500">Cash Flow:</span>
                    <span className="font-mono font-bold text-teal-800">
                      {activeDayRecord.loadCashClosing -
                        activeDayRecord.loadCashOpening >=
                      0
                        ? "+"
                        : ""}
                      {formatPKR(
                        activeDayRecord.loadCashClosing -
                          activeDayRecord.loadCashOpening,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reconciliation Totals Banner */}
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                activeDayRecord.resultType === "PROFIT"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : activeDayRecord.resultType === "LOSS"
                    ? "bg-red-50 border-red-200 text-red-950"
                    : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                    activeDayRecord.resultType === "PROFIT"
                      ? "bg-emerald-600"
                      : activeDayRecord.resultType === "LOSS"
                        ? "bg-red-600"
                        : "bg-slate-600"
                  }`}
                >
                  {activeDayRecord.resultType === "PROFIT" ? (
                    <TrendingUp className="w-6 h-6" />
                  ) : activeDayRecord.resultType === "LOSS" ? (
                    <TrendingDown className="w-6 h-6" />
                  ) : (
                    <Scale className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">
                      {activeDayRecord.resultType === "PROFIT"
                        ? "Day Reconciled With Profit"
                        : activeDayRecord.resultType === "LOSS"
                          ? "Day Reconciled With Deficit / Loss"
                          : "Balanced Daily Reconciliation"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeDayRecord.resultType === "PROFIT"
                          ? "bg-emerald-200 text-emerald-800"
                          : activeDayRecord.resultType === "LOSS"
                            ? "bg-red-200 text-red-800"
                            : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {activeDayRecord.resultType}
                    </span>
                  </div>
                  <div className="text-xs opacity-75 mt-1 flex flex-wrap items-center gap-3">
                    <span>
                      Total Opening:{" "}
                      <strong className="font-mono">
                        {formatPKR(activeDayRecord.totalOpening)}
                      </strong>
                      {Number(activeDayRecord.extraAddition) > 0 && (
                        <span className="ml-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1 rounded">
                          (Extra: +{formatPKR(activeDayRecord.extraAddition)})
                        </span>
                      )}
                    </span>
                    <span>•</span>
                    <span>
                      Total Closing:{" "}
                      <strong className="font-mono">
                        {formatPKR(activeDayRecord.totalClosing)}
                      </strong>
                      {Number(activeDayRecord.loadExpense) > 0 && (
                        <span className="ml-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-1 rounded">
                          (Expense: +{formatPKR(activeDayRecord.loadExpense)})
                        </span>
                      )}
                    </span>
                  </div>
                  {activeDayRecord.notes && (
                    <p className="text-xs italic mt-1 text-slate-600">
                      Note: "{activeDayRecord.notes}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="text-right">
                  <span className="text-xs font-medium opacity-75 block">
                    Day Net Difference
                  </span>
                  <span
                    className={`text-2xl font-black font-mono tracking-tight ${
                      activeDayRecord.resultType === "PROFIT"
                        ? "text-emerald-700"
                        : activeDayRecord.resultType === "LOSS"
                          ? "text-red-700"
                          : "text-slate-700"
                    }`}
                  >
                    {activeDayRecord.netDifference > 0 ? "+" : ""}
                    {formatPKR(activeDayRecord.netDifference)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pl-3 border-l border-slate-300">
                  <button
                    onClick={() => handlePrintSlip(activeDayRecord)}
                    title="Print Daily Slip"
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEditDailyModal(activeDayRecord)}
                    title="Edit Record"
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500">
            <Info className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              No Mobile Load Record Found For {selectedDate}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You haven't recorded opening & closing balances for Jazz, Telenor,
              Zong, Ufone and load cash on this date.
            </p>
            <button
              onClick={handleOpenNewDailyModal}
              className="mt-3.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Record Opening & Closing For Today</span>
            </button>
          </div>
        )}
      </div>

      {/* View Switcher Tabs & Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 pt-4 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setViewMode("DAILY_RECORDS")}
              className={`pb-3 text-xs font-bold transition-all relative ${
                viewMode === "DAILY_RECORDS"
                  ? "text-slate-900 border-b-2 border-slate-900"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Daily Opening & Closing History</span>
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
                {isWorker && dailyFilter === "TODAY"
                  ? filteredDailyRecords.length
                  : records.length}
              </span>
            </button>

            <button
              onClick={() => setViewMode("TRANSACTIONS")}
              className={`pb-3 text-xs font-bold transition-all relative ${
                viewMode === "TRANSACTIONS"
                  ? "text-slate-900 border-b-2 border-slate-900"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Load Sales Register (Top-ups & Packages)</span>
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono">
                {isWorker && txDateFilter === todayStr
                  ? filteredTransactions.length
                  : transactions.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 pb-3">
            {viewMode === "DAILY_RECORDS" ? (
              <button
                onClick={exportDailyRecordsCSV}
                disabled={filteredDailyRecords.length === 0}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Daily CSV</span>
              </button>
            ) : (
              <button
                onClick={exportTransactionsCSV}
                disabled={filteredTransactions.length === 0}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Sales CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Daily Records Table */}
        {viewMode === "DAILY_RECORDS" && (
          <div>
            {/* Administrator Period Balances Focus Bar (Showing Load Opening, Closing, Total Sale by Date Range) */}
            {!isWorker && adminPeriodStats && (
              <div className="p-4 bg-amber-50/60 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-600 text-white font-bold shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                        Load Balances &amp; Sales:{" "}
                        {adminPeriodStats.periodLabel}
                      </span>
                      <span className="text-slate-400 font-normal">·</span>
                      <span className="text-[11px] font-semibold text-amber-800">
                        Admin Only
                      </span>
                      {adminPeriodStats.daysLogged > 0 && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                          {adminPeriodStats.daysLogged} Day
                          {adminPeriodStats.daysLogged !== 1 ? "s" : ""}{" "}
                          Recorded
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cumulative SIM &amp; cash load opening, closing, and total
                      top-up sales for selected date range
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-amber-200 shadow-2xs">
                    <span className="text-[10px] font-sans text-slate-500 block">
                      Period Opening:
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatPKR(adminPeriodStats.totalOpening)}
                    </span>
                  </div>

                  <div className="bg-white px-3 py-1.5 rounded-lg border border-amber-200 shadow-2xs">
                    <span className="text-[10px] font-sans text-slate-500 block">
                      Period Closing:
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatPKR(adminPeriodStats.totalClosing)}
                    </span>
                  </div>

                  <div className="bg-white px-3 py-1.5 rounded-lg border border-amber-300 shadow-2xs">
                    <span className="text-[10px] font-sans text-amber-900 font-semibold block">
                      Total Sale of Load:
                    </span>
                    <span className="font-black text-amber-950">
                      {formatPKR(adminPeriodStats.totalLoadSale)}
                    </span>
                  </div>

                  {adminPeriodStats.profit !== 0 && (
                    <div
                      className={`bg-white px-3 py-1.5 rounded-lg border shadow-2xs ${
                        adminPeriodStats.isProfit
                          ? "border-emerald-300"
                          : "border-rose-300"
                      }`}
                    >
                      <span className="text-[10px] font-sans text-slate-500 block">
                        Net Difference:
                      </span>
                      <span
                        className={`font-black ${
                          adminPeriodStats.isProfit
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        {adminPeriodStats.profit > 0 ? "+" : ""}
                        {formatPKR(adminPeriodStats.profit)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Filter & Action bar with Date Range */}
            <div className="p-4 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Date Range:</span>
                </span>

                {/* Preset: Today */}
                <button
                  type="button"
                  id="btn-load-filter-today"
                  onClick={() => {
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                    setDailyFilter("TODAY");
                    setRecordsPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    dailyFilter === "TODAY"
                      ? "bg-amber-600 text-white shadow-xs font-bold"
                      : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      dailyFilter === "TODAY"
                        ? "bg-white animate-pulse"
                        : "bg-amber-500"
                    }`}
                  ></span>
                  <span>Today</span>
                </button>

                {/* Preset: 8 Days (Just like EP & JC) */}
                <button
                  type="button"
                  id="btn-load-filter-8days"
                  onClick={() => handleApplyPresetDays(8)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    dailyFilter === "RANGE" &&
                    startDate === getDateNDaysAgo(8) &&
                    endDate === todayStr
                      ? "bg-amber-600 text-white shadow-xs font-bold ring-2 ring-amber-300"
                      : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
                  }`}
                  title="Filter last 8 days of records"
                >
                  <Clock className="w-3 h-3 text-current" />
                  <span>Last 8 Days</span>
                </button>

                {/* Preset: 30 Days */}
                <button
                  type="button"
                  id="btn-load-filter-30days"
                  onClick={() => handleApplyPresetDays(30)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    dailyFilter === "RANGE" &&
                    startDate === getDateNDaysAgo(30) &&
                    endDate === todayStr
                      ? "bg-slate-900 text-white shadow-xs font-bold"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Filter last 30 days of records"
                >
                  <span>Last 30 Days</span>
                </button>

                {/* Preset: All History */}
                <button
                  type="button"
                  id="btn-load-filter-all"
                  onClick={handleClearDateRange}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    dailyFilter === "ALL" && !startDate && !endDate
                      ? "bg-slate-900 text-white shadow-xs font-bold"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  All History ({records.length})
                </button>

                {/* Custom Date Range Pickers (From Date & To Date) */}
                <div className="flex items-center gap-2 pl-2 sm:border-l sm:border-slate-200 flex-wrap">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="font-semibold text-slate-500 whitespace-nowrap">
                      From:
                    </span>
                    <input
                      type="date"
                      id="input-load-start-date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setDailyFilter("RANGE");
                        setRecordsPage(1);
                      }}
                      className="px-2 py-1 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="font-semibold text-slate-500 whitespace-nowrap">
                      To:
                    </span>
                    <input
                      type="date"
                      id="input-load-end-date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setDailyFilter("RANGE");
                        setRecordsPage(1);
                      }}
                      className="px-2 py-1 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                    />
                  </div>

                  {(startDate || endDate || dailyFilter === "RANGE") && (
                    <button
                      type="button"
                      id="btn-load-reset-date-filter"
                      onClick={handleClearDateRange}
                      className="text-xs text-rose-600 hover:text-rose-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer ml-1"
                      title="Clear custom date filter"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={handleOpenNewDailyModal}
                className="px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>New Daily Load Record</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-base">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-800 font-bold uppercase tracking-wider text-sm">
                  <tr>
                    <th className="py-4 px-4">Date</th>
                    <th className="py-4 px-3 text-red-700">JL (O / C)</th>
                    <th className="py-4 px-3 text-sky-700">TL (O / C)</th>
                    <th className="py-4 px-3 text-emerald-700">ZL (O / C)</th>
                    <th className="py-4 px-3 text-amber-700">UL (O / C)</th>
                    <th className="py-4 px-3 text-teal-800">Cash (O / C)</th>
                    <th className="py-4 px-3 text-slate-800">EXT / EXP</th>
                    <th className="py-4 px-3 text-slate-800 font-bold">
                      Total Open
                    </th>
                    <th className="py-4 px-3 text-slate-800 font-bold">
                      Total Close
                    </th>
                    <th className="py-4 px-3 text-right">Net</th>
                    <th className="py-4 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDailyRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="py-8 text-center text-slate-400"
                      >
                        {dailyFilter === "TODAY"
                          ? `No mobile load opening & closing record found for Today (${todayStr}). Click "New Daily Load Record" to start.`
                          : dailyFilter === "RANGE" || startDate || endDate
                            ? `No mobile load records found for selected date range (${startDate || "..."} to ${endDate || "..."}).`
                            : 'No mobile load records saved yet. Click "New Daily Load Record" to start.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedDailyRecords.map((r) => {
                      const isProfit = r.resultType === "PROFIT";
                      const isLoss = r.resultType === "LOSS";
                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            r.date === selectedDate ? "bg-amber-50/30" : ""
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                            {r.date}
                          </td>
                          {/* Jazz */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-slate-800">
                              {r.jazzOpening}
                            </span>
                            <span className="text-slate-800 mx-1">/</span>
                            <span className="font-semibold text-slate-800">
                              {r.jazzClosing}
                            </span>
                          </td>
                          {/* Telenor */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-slate-800">
                              {r.telenorOpening}
                            </span>
                            <span className="text-slate-800 mx-1">/</span>
                            <span className="font-semibold text-slate-800">
                              {r.telenorClosing}
                            </span>
                          </td>
                          {/* Zong */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-slate-800">
                              {r.zongOpening}
                            </span>
                            <span className="text-slate-800 mx-1">/</span>
                            <span className="font-semibold text-slate-800">
                              {r.zongClosing}
                            </span>
                          </td>
                          {/* Ufone */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-slate-800">
                              {r.ufoneOpening}
                            </span>
                            <span className="text-slate-800 mx-1">/</span>
                            <span className="font-semibold text-slate-800">
                              {r.ufoneClosing}
                            </span>
                          </td>
                          {/* Cash */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-slate-800">
                              {r.loadCashOpening}
                            </span>
                            <span className="text-slate-800 mx-1">/</span>
                            <span className="font-semibold text-slate-800">
                              {r.loadCashClosing}
                            </span>
                          </td>
                          {/* Ext and Exp */}
                          <td lassName="py-3 px-3 whitespace-nowrap">
                            {Number(r.extraAddition) > 0 && (
                              <span className="text-slate-800">
                                {r.extraAddition}
                              </span>
                            )}
                            <span className="text-slate-800 mx-1">/</span>
                            {Number(r.loadExpense) > 0 && (
                              <span className="text-slate-800">
                                {r.loadExpense}
                              </span>
                            )}
                          </td>
                          {/* Total Open */}
                          <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                            <div>{r.totalOpening}</div>
                          </td>
                          {/* Total Close */}
                          <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                            <div>{r.totalClosing}</div>
                          </td>
                          {/* Net Difference */}
                          <td
                            className={`py-3 px-3 font-extrabold text-right whitespace-nowrap ${
                              isProfit
                                ? "text-emerald-700"
                                : isLoss
                                  ? "text-red-700"
                                  : "text-slate-700"
                            }`}
                          >
                            {r.netDifference > 0 ? "+" : ""}
                            {r.netDifference}
                          </td>
                          {/* Actions */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handlePrintSlip(r)}
                                title="Print Slip"
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEditDailyModal(r)}
                                title="Edit Record"
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setRecordToDelete(r)}
                                title="Delete Record"
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredDailyRecords.length > 0 && (
              <div className="p-4 border-t border-slate-200">
                <TablePagination
                  currentPage={recordsPage}
                  pageSize={recordsPageSize}
                  totalItems={filteredDailyRecords.length}
                  onPageChange={setRecordsPage}
                  onPageSizeChange={(newSize) => {
                    setRecordsPageSize(newSize);
                    setStoredPageSize("load_records", newSize);
                    setRecordsPage(1);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Transactions Table (Load Sales Register) */}
        {viewMode === "TRANSACTIONS" && (
          <div>
            {/* Filter Bar */}
            <div className="p-4 bg-slate-50/60 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search mobile, name, Trx ID..."
                  value={txSearch}
                  onChange={(e) => {
                    setTxSearch(e.target.value);
                    setTxPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Network Filter */}
              <div>
                <select
                  value={networkFilter}
                  onChange={(e) => {
                    setNetworkFilter(e.target.value as any);
                    setTxPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="ALL">All Networks</option>
                  <option value="JAZZ_WARID">Jazz / Warid</option>
                  <option value="TELENOR">Telenor</option>
                  <option value="ZONG">Zong</option>
                  <option value="UFONE">Ufone</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value as any);
                    setTxPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="ALL">All Load Types</option>
                  <option value="EASYLOAD">Easyload / Topup</option>
                  <option value="PACKAGE">Super Card / Bundle</option>
                  <option value="POSTPAID_BILL">Postpaid Bill</option>
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <select
                  value={txDateFilter}
                  onChange={(e) => {
                    setTxDateFilter(e.target.value);
                    setTxPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="ALL">
                    All Dates ({uniqueTxDates.length})
                  </option>
                  {uniqueTxDates.map((d) => (
                    <option key={d} value={d}>
                      {d === todayStr ? `Today (${d})` : d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-base">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-800 font-bold uppercase tracking-wider text-sm">
                  <tr>
                    <th className="py-4 px-4">Date & Time</th>
                    <th className="py-4 px-3">Network</th>
                    <th className="py-4 px-3">Service Type</th>
                    <th className="py-4 px-3">Customer Mobile</th>
                    <th className="py-4 px-3">Customer Name</th>
                    <th className="py-4 px-3 text-right">Load Amount</th>
                    <th className="py-4 px-3 text-right text-emerald-700">
                      Commission / Margin
                    </th>
                    <th className="py-4 px-3">Trx ID / Ref</th>
                    <th className="py-4 px-3">Notes</th>
                    <th className="py-4 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-8 text-center text-slate-400"
                      >
                        No load sales match the current filters. Click "Record
                        Load Sale" to add one.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions
                      .slice((txPage - 1) * txPageSize, txPage * txPageSize)
                      .map((t) => {
                        const netCfg = NETWORK_BADGES[t.network];
                        return (
                          <tr
                            key={t.id}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="font-mono font-medium text-slate-900">
                                {t.date}
                              </span>
                              {t.time && (
                                <span className="text-[10px] text-slate-400 ml-1.5">
                                  {t.time}
                                </span>
                              )}
                            </td>
                            {/* Network */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${netCfg.badge}`}
                              >
                                {netCfg.label}
                              </span>
                            </td>
                            {/* Type */}
                            <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                              {t.type === "EASYLOAD"
                                ? "Easyload"
                                : t.type === "PACKAGE"
                                  ? "Package Bundle"
                                  : "Postpaid Bill"}
                            </td>
                            {/* Mobile */}
                            <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {t.customerMobile}
                            </td>
                            {/* Name */}
                            <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                              {t.customerName || (
                                <span className="text-slate-400 italic">
                                  Walk-in
                                </span>
                              )}
                            </td>
                            {/* Amount */}
                            <td className="py-3 px-3 font-mono font-bold text-right text-slate-900 whitespace-nowrap">
                              {formatPKR(t.amount)}
                            </td>
                            {/* Commission */}
                            <td className="py-3 px-3 font-mono font-bold text-right text-emerald-700 whitespace-nowrap">
                              +{formatPKR(t.commissionOrProfit || 0)}
                            </td>
                            {/* Trx ID */}
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                              {t.trxId || (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            {/* Notes */}
                            <td className="py-3 px-3 text-[11px] text-slate-500 max-w-xs truncate">
                              {t.notes || "-"}
                            </td>
                            {/* Actions */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <button
                                onClick={() => setTxToDelete(t)}
                                title="Delete Transaction"
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {filteredTransactions.length > 0 && (
              <div className="p-4 border-t border-slate-200">
                <TablePagination
                  currentPage={txPage}
                  pageSize={txPageSize}
                  totalItems={filteredTransactions.length}
                  onPageChange={setTxPage}
                  onPageSizeChange={(newSize) => {
                    setTxPageSize(newSize);
                    setStoredPageSize("load_txs", newSize);
                    setTxPage(1);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Load Daily Record Modal */}
      {isDailyModalOpen && (
        <LoadDailyModal
          isOpen={isDailyModalOpen}
          onClose={() => setIsDailyModalOpen(false)}
          recordToEdit={recordToEdit}
          onSave={onSaveDailyRecord}
          existingDates={records.map((r) => r.date)}
        />
      )}

      {/* Load Tx Modal */}
      {isTxModalOpen && (
        <LoadTxModal
          isOpen={isTxModalOpen}
          onClose={() => setIsTxModalOpen(false)}
          txToEdit={txToEdit}
          onSave={onSaveTransaction}
          defaultDate={selectedDate}
        />
      )}

      {/* Delete Record Confirmation */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Mobile Load Record?
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the mobile load
              reconciliation record for{" "}
              <strong className="font-mono text-slate-900">
                {recordToDelete.date}
              </strong>
              ? This will remove all opening and closing balances recorded for
              this date.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteRecord}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tx Confirmation */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Load Transaction?
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove the load sale of{" "}
              <strong className="font-mono text-slate-900">
                {formatPKR(txToDelete.amount)}
              </strong>{" "}
              to mobile{" "}
              <strong className="font-mono text-slate-900">
                {txToDelete.customerMobile}
              </strong>
              ?
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteTx}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Reconciliation Slip Modal */}
      {slipRecord &&
        createPortal(
          <div
            id="printable-load-slip-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto printable-modal-overlay"
          >
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
                #printable-load-slip-modal {
                  position: static !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  display: block !important;
                }
                #printable-load-card {
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  box-shadow: none !important;
                  border: none !important;
                  border-radius: 0 !important;
                  page-break-after: avoid !important;
                  break-after: avoid !important;
                }
              }
            `}</style>

            <div
              id="printable-load-card"
              className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 printable-modal-card print:p-0 print:border-none print:shadow-none print:max-w-none"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-amber-600" />
                  Mobile Load Reconciliation Slip
                </h3>
                <button
                  onClick={() => setSlipRecord(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Slip Paper Preview */}
              <div
                id="printable-load-slip"
                className="p-5 border border-dashed border-slate-300 rounded-lg bg-slate-50/50 font-mono text-xs space-y-3 print:bg-white print:border-black print:p-2"
              >
                <div className="text-center pb-2 border-b border-slate-300 space-y-0.5">
                  <h4 className="font-extrabold text-sm text-slate-900 uppercase">
                    MOBILE LOAD DAILY REPORT
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Jazz / Warid • Telenor • Zong • Ufone
                  </p>
                  <p className="text-[11px] font-bold text-slate-700">
                    DATE: {slipRecord.date}
                  </p>
                </div>

                {/* Items Breakdown */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between font-bold text-slate-800 border-b border-slate-200 pb-1">
                    <span>NETWORK / HEAD</span>
                    <span className="w-20 text-right">OPEN</span>
                    <span className="w-20 text-right">CLOSE</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jazz / Warid</span>
                    <span className="w-20 text-right">
                      {formatPKR(slipRecord.jazzOpening)}
                    </span>
                    <span className="w-20 text-right font-semibold">
                      {formatPKR(slipRecord.jazzClosing)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Telenor</span>
                    <span className="w-20 text-right">
                      {formatPKR(slipRecord.telenorOpening)}
                    </span>
                    <span className="w-20 text-right font-semibold">
                      {formatPKR(slipRecord.telenorClosing)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zong</span>
                    <span className="w-20 text-right">
                      {formatPKR(slipRecord.zongOpening)}
                    </span>
                    <span className="w-20 text-right font-semibold">
                      {formatPKR(slipRecord.zongClosing)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ufone</span>
                    <span className="w-20 text-right">
                      {formatPKR(slipRecord.ufoneOpening)}
                    </span>
                    <span className="w-20 text-right font-semibold">
                      {formatPKR(slipRecord.ufoneClosing)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 text-teal-800 font-semibold">
                    <span>Load Cash Drawer</span>
                    <span className="w-20 text-right">
                      {formatPKR(slipRecord.loadCashOpening)}
                    </span>
                    <span className="w-20 text-right">
                      {formatPKR(slipRecord.loadCashClosing)}
                    </span>
                  </div>
                  {Number(slipRecord.extraAddition) > 0 && (
                    <div className="flex justify-between text-indigo-700 font-semibold">
                      <span>Extra Load Addition</span>
                      <span className="w-20 text-right">
                        +{formatPKR(slipRecord.extraAddition)}
                      </span>
                      <span className="w-20 text-right text-slate-400">-</span>
                    </div>
                  )}
                  {Number(slipRecord.loadExpense) > 0 && (
                    <div className="flex justify-between text-rose-700 font-semibold">
                      <span>Load Day Expense</span>
                      <span className="w-20 text-right text-slate-400">-</span>
                      <span className="w-20 text-right">
                        +{formatPKR(slipRecord.loadExpense)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="pt-2 border-t border-slate-300 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-700">
                    <span>TOTAL OPENING:</span>
                    <span className="font-bold">
                      {formatPKR(slipRecord.totalOpening)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold">
                    <span>TOTAL CLOSING:</span>
                    <span>{formatPKR(slipRecord.totalClosing)}</span>
                  </div>
                  <div
                    className={`flex justify-between font-extrabold text-sm pt-1 border-t border-slate-400 ${
                      slipRecord.resultType === "PROFIT"
                        ? "text-emerald-700"
                        : slipRecord.resultType === "LOSS"
                          ? "text-red-700"
                          : "text-slate-800"
                    }`}
                  >
                    <span>NET RECONCILIATION:</span>
                    <span>
                      {slipRecord.netDifference > 0 ? "+" : ""}
                      {formatPKR(slipRecord.netDifference)} (
                      {slipRecord.resultType})
                    </span>
                  </div>
                </div>

                {slipRecord.notes && (
                  <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 italic">
                    Notes: {slipRecord.notes}
                  </div>
                )}

                <div className="text-center pt-2 text-[9px] text-slate-400">
                  Printed: {new Date().toLocaleString()}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 print:hidden">
                <button
                  type="button"
                  onClick={() => setSlipRecord(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Print Slip</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
