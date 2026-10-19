import React, { useState, useMemo, useEffect } from "react";
import {
  Smartphone,
  Plus,
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
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
  PlusCircle,
  Receipt,
  RotateCcw,
  Clock,
  Building2,
} from "lucide-react";
import {
  EpJcDailyRecord,
  EpJcTransaction,
  EpJcServiceType,
  EpJcTxType,
} from "../types";
import { formatPKR } from "../utils/currency";
import { EpJcDailyModal } from "./EpJcDailyModal";
import { EpJcTxModal } from "./EpJcTxModal";
import { TablePagination } from "./TablePagination";
import { getStoredPageSize, setStoredPageSize } from "../utils/pagination";

interface EpJcDashboardProps {
  records: EpJcDailyRecord[];
  transactions: EpJcTransaction[];
  onSaveDailyRecord: (
    record: Partial<EpJcDailyRecord> & { date: string },
  ) => Promise<void>;
  onDeleteDailyRecord: (idOrDate: string) => Promise<void>;
  onSaveTransaction: (
    tx: Omit<EpJcTransaction, "id" | "createdAt"> & { id?: string },
  ) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onRefresh: () => void;
  isWorker?: boolean;
}

export const EpJcDashboard: React.FC<EpJcDashboardProps> = ({
  records,
  transactions,
  onSaveDailyRecord,
  onDeleteDailyRecord,
  onSaveTransaction,
  onDeleteTransaction,
  onRefresh,
  isWorker = false,
}) => {
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Modals state
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<EpJcDailyRecord | null>(
    null,
  );

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<EpJcTransaction | null>(null);

  // Delete confirmation state
  const [recordToDelete, setRecordToDelete] = useState<EpJcDailyRecord | null>(
    null,
  );
  const [txToDelete, setTxToDelete] = useState<EpJcTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Active view tab
  const [viewMode, setViewMode] = useState<"DAILY_RECORDS" | "TRANSACTIONS">(
    "DAILY_RECORDS",
  );

  // Selected date for quick focus (Worker defaults to todayStr, Admin defaults to today or newest)
  const [selectedDate, setSelectedDate] = useState<string>(
    isWorker ? todayStr : records.length > 0 ? records[0].date : todayStr,
  );

  // Filters & Search for transactions
  const [txSearch, setTxSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<"ALL" | EpJcServiceType>(
    "ALL",
  );
  const [typeFilter, setTypeFilter] = useState<"ALL" | EpJcTxType>("ALL");
  const [txDateFilter, setTxDateFilter] = useState<string>(
    isWorker ? todayStr : "ALL",
  );

  // Filter for Daily Records view
  const [dailyFilter, setDailyFilter] = useState<"TODAY" | "ALL" | "RANGE">(
    isWorker ? "TODAY" : "ALL",
  );
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const getDateNDaysAgo = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

  // Synchronize when role changes
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
    getStoredPageSize("epjc_records", 30),
  );

  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState<number>(() =>
    getStoredPageSize("epjc_txs", 30),
  );

  // Current selected day's record (if exists)
  const activeDayRecord = useMemo(() => {
    return records.find((r) => r.date === selectedDate);
  }, [records, selectedDate]);

  // Calculations for all-time totals
  const summaryMetrics = useMemo(() => {
    let totalOpeningSum = 0;
    let totalClosingSum = 0;
    let netProfitDays = 0;
    let netLossDays = 0;

    records.forEach((r) => {
      totalOpeningSum += r.totalOpening;
      totalClosingSum += r.totalClosing;
      if (r.netDifference > 0) netProfitDays++;
      else if (r.netDifference < 0) netLossDays++;
    });

    const netVariance = totalClosingSum - totalOpeningSum;

    let transferVolume = 0;
    let withdrawVolume = 0;
    let totalCommission = 0;

    transactions.forEach((tx) => {
      if (tx.type === "TRANSFER") transferVolume += tx.amount;
      if (tx.type === "WITHDRAW") withdrawVolume += tx.amount;
      totalCommission += tx.feeOrCommission || 0;
    });

    return {
      totalRecords: records.length,
      totalOpeningSum,
      totalClosingSum,
      netVariance,
      netProfitDays,
      netLossDays,
      totalTransactions: transactions.length,
      transferVolume,
      withdrawVolume,
      totalCommission,
    };
  }, [records, transactions]);

  // Present Day (Today) Metrics
  const todayMetrics = useMemo(() => {
    const todayRecord = records.find((r) => r.date === todayStr);
    const todayTxs = transactions.filter((t) => t.date === todayStr);

    let todayTransferVol = 0;
    let todayWithdrawVol = 0;
    let todayCommission = 0;

    todayTxs.forEach((tx) => {
      if (tx.type === "TRANSFER") todayTransferVol += tx.amount;
      if (tx.type === "WITHDRAW") todayWithdrawVol += tx.amount;
      todayCommission += tx.feeOrCommission || 0;
    });

    return {
      record: todayRecord,
      hasRecord: Boolean(todayRecord),
      totalOpening: todayRecord?.totalOpening || 0,
      totalClosing: todayRecord?.totalClosing || 0,
      netDifference: todayRecord?.netDifference || 0,
      txCount: todayTxs.length,
      transferVolume: todayTransferVol,
      withdrawVolume: todayWithdrawVol,
      commission: todayCommission,
    };
  }, [records, transactions, todayStr]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (serviceFilter !== "ALL" && tx.service !== serviceFilter) return false;
      if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
      if (txDateFilter !== "ALL" && tx.date !== txDateFilter) return false;

      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        const matchMobile = tx.customerMobile.toLowerCase().includes(q);
        const matchName = (tx.customerName || "").toLowerCase().includes(q);
        const matchTrx = (tx.trxId || "").toLowerCase().includes(q);
        const matchNotes = (tx.notes || "").toLowerCase().includes(q);
        if (!matchMobile && !matchName && !matchTrx && !matchNotes)
          return false;
      }

      return true;
    });
  }, [transactions, serviceFilter, typeFilter, txDateFilter, txSearch]);

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

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const start = (recordsPage - 1) * recordsPageSize;
    return filteredDailyRecords.slice(start, start + recordsPageSize);
  }, [filteredDailyRecords, recordsPage, recordsPageSize]);

  // Paginated transactions
  const paginatedTransactions = useMemo(() => {
    const start = (txPage - 1) * txPageSize;
    return filteredTransactions.slice(start, start + txPageSize);
  }, [filteredTransactions, txPage, txPageSize]);

  const handleOpenAddDaily = () => {
    setRecordToEdit(null);
    setIsDailyModalOpen(true);
  };

  const handleOpenEditDaily = (record: EpJcDailyRecord) => {
    setRecordToEdit(record);
    setIsDailyModalOpen(true);
  };

  const handleDeleteDaily = (record: EpJcDailyRecord) => {
    setRecordToDelete(record);
  };

  const handleConfirmDeleteDaily = async () => {
    if (!recordToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteDailyRecord(recordToDelete.id || recordToDelete.date);
      if (selectedDate === recordToDelete.date) {
        const remaining = records.filter(
          (r) =>
            (r.id || r.date) !== (recordToDelete.id || recordToDelete.date),
        );
        setSelectedDate(remaining.length > 0 ? remaining[0].date : todayStr);
      }
      setRecordToDelete(null);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete daily record:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAddTx = () => {
    setTxToEdit(null);
    setIsTxModalOpen(true);
  };

  const handleOpenEditTx = (tx: EpJcTransaction) => {
    setTxToEdit(tx);
    setIsTxModalOpen(true);
  };

  const handleDeleteTx = (tx: EpJcTransaction) => {
    setTxToDelete(tx);
  };

  const handleConfirmDeleteTx = async () => {
    if (!txToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteTransaction(txToDelete.id);
      setTxToDelete(null);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const exportDailyCSV = () => {
    if (records.length === 0) return;
    const headers = [
      "Date",
      "EP App Opening",
      "JC App Opening",
      "EP and JC Cash Opening",
      "Extra Addition (Open)",
      "Total Opening",
      "EP App Closing",
      "JC App Closing",
      "EP and JC Cash Closing",
      "EP/JC Expense (Close)",
      "Total Closing",
      "Profit / Loss Title",
      "Difference (PKR)",
      "Notes",
    ];

    const rows = records.map((r) => [
      r.date,
      r.epOpening,
      r.jcOpening,
      r.epJcCashOpening !== undefined
        ? r.epJcCashOpening
        : (r.epCashOpening || 0) + (r.jcCashOpening || 0),
      r.extraAddition || 0,
      r.totalOpening,
      r.epClosing,
      r.jcClosing,
      r.epJcCashClosing !== undefined
        ? r.epJcCashClosing
        : (r.epCashClosing || 0) + (r.jcCashClosing || 0),
      r.epJcExpense || 0,
      r.totalClosing,
      r.netDifference > 0
        ? "Profit"
        : r.netDifference < 0
          ? "Loss"
          : "Balanced",
      r.netDifference,
      `"${(r.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `EP_JC_Daily_Records_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  EP & JC Services
                </h1>
                {isWorker && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                    Today's Service Focus
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-export-epjc-csv"
            onClick={exportDailyCSV}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Export Daily Records to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Export CSV
          </button>

          <button
            id="btn-record-epjc-tx"
            onClick={handleOpenAddTx}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Record Transfer / Withdraw
          </button>

          <button
            id="btn-add-epjc-daily-record"
            onClick={handleOpenAddDaily}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Daily Record
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
                <span className="text-sm font-bold text-slate-900">
                  Today's EP & JC Terminal
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-600 text-white uppercase tracking-wider">
                  Present Day: {todayStr}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Worker focus mode active. Showing present day transactions and
                focused daily reconciliation sheet.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200">
              {todayMetrics.txCount} Transaction
              {todayMetrics.txCount !== 1 ? "s" : ""} Today
            </span>
          </div>
        </div>
      )}

      {/* Primary Highlights: Today's / Active Day's Full Opening vs Closing Reconciliation */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Focused Daily Sheet
            </span>
            <select
              id="select-epjc-focus-date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-md px-2.5 py-1 focus:ring-1 focus:ring-emerald-500"
            >
              {records.map((r) => (
                <option key={r.id} value={r.date}>
                  {r.date} {r.date === todayStr ? "(Today)" : ""}
                </option>
              ))}
              {!records.some((r) => r.date === todayStr) && (
                <option value={todayStr}>
                  {todayStr} (Today - Not Recorded)
                </option>
              )}
            </select>
          </div>

          {activeDayRecord ? (
            <div className="flex items-center gap-2">
              <button
                id="btn-edit-focused-day"
                onClick={() => handleOpenEditDaily(activeDayRecord)}
                className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 transition-colors cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
                Edit This Day
              </button>
              <button
                id="btn-delete-focused-day"
                onClick={() => setRecordToDelete(activeDayRecord)}
                className="text-xs text-rose-700 hover:text-rose-900 font-semibold flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md border border-rose-200 transition-colors cursor-pointer"
                title="Delete This Daily Record"
              >
                <Trash2 className="w-3 h-3" />
                Delete This Day
              </button>
            </div>
          ) : (
            <div className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              No record for {selectedDate}. Click "New Daily Record" to set
              Opening/Closing.
            </div>
          )}
        </div>

        {activeDayRecord ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* OPENING BOX */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                    Day Opening Balances
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {activeDayRecord.date}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">EasyPaisa (EP) App:</span>
                    <span className="font-semibold font-mono text-slate-900">
                      {formatPKR(activeDayRecord.epOpening)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">JazzCash (JC) App:</span>
                    <span className="font-semibold font-mono text-slate-900">
                      {formatPKR(activeDayRecord.jcOpening)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-700 font-medium">
                      EP and JC Cash Opening:
                    </span>
                    <span className="font-semibold font-mono text-slate-900">
                      {formatPKR(
                        activeDayRecord.epJcCashOpening !== undefined
                          ? activeDayRecord.epJcCashOpening
                          : (activeDayRecord.epCashOpening || 0) +
                              (activeDayRecord.jcCashOpening || 0),
                      )}
                    </span>
                  </div>
                  {activeDayRecord.customAccounts &&
                    activeDayRecord.customAccounts.length > 0 && (
                      <div className="pt-1 border-t border-slate-200/60 space-y-1">
                        {activeDayRecord.customAccounts.map((ca) => (
                          <div
                            key={ca.id}
                            className="flex justify-between items-center py-1 border-b border-indigo-100 text-indigo-950 bg-indigo-50/50 px-1.5 rounded"
                          >
                            <span className="font-semibold flex items-center gap-1 text-[11px] text-indigo-900">
                              <Building2 className="w-3 h-3 text-indigo-600" />
                              {ca.name || "Custom Bank"} (Opening):
                            </span>
                            <span className="font-bold font-mono text-indigo-900">
                              {formatPKR(ca.openingBalance)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  {Number(activeDayRecord.extraAddition) > 0 && (
                    <div className="flex justify-between items-center py-1 border-b border-indigo-100 text-indigo-900 bg-indigo-50/60 px-1.5 rounded">
                      <span className="font-medium flex items-center gap-1">
                        <PlusCircle className="w-3 h-3 text-indigo-600" />
                        Extra Addition (Reload):
                      </span>
                      <span className="font-bold font-mono text-indigo-700">
                        +{formatPKR(activeDayRecord.extraAddition)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">
                  Total Opening:
                </span>
                <span className="text-base font-bold font-mono text-blue-900">
                  {formatPKR(activeDayRecord.totalOpening)}
                </span>
              </div>
            </div>

            {/* CLOSING BOX */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                    Day Closing Balances
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {activeDayRecord.date}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">EasyPaisa (EP) App:</span>
                    <span className="font-semibold font-mono text-slate-900">
                      {formatPKR(activeDayRecord.epClosing)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">JazzCash (JC) App:</span>
                    <span className="font-semibold font-mono text-slate-900">
                      {formatPKR(activeDayRecord.jcClosing)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-700 font-medium">
                      EP and JC Cash Closing:
                    </span>
                    <span className="font-semibold font-mono text-slate-900">
                      {formatPKR(
                        activeDayRecord.epJcCashClosing !== undefined
                          ? activeDayRecord.epJcCashClosing
                          : (activeDayRecord.epCashClosing || 0) +
                              (activeDayRecord.jcCashClosing || 0),
                      )}
                    </span>
                  </div>
                  {activeDayRecord.customAccounts &&
                    activeDayRecord.customAccounts.length > 0 && (
                      <div className="pt-1 border-t border-slate-200/60 space-y-1">
                        {activeDayRecord.customAccounts.map((ca) => (
                          <div
                            key={ca.id}
                            className="flex justify-between items-center py-1 border-b border-indigo-100 text-indigo-950 bg-indigo-50/50 px-1.5 rounded"
                          >
                            <span className="font-semibold flex items-center gap-1 text-[11px] text-indigo-900">
                              <Building2 className="w-3 h-3 text-indigo-600" />
                              {ca.name || "Custom Bank"} (Closing):
                            </span>
                            <span className="font-bold font-mono text-indigo-900">
                              {formatPKR(ca.closingBalance)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  {Number(activeDayRecord.epJcExpense) > 0 && (
                    <div className="flex justify-between items-center py-1 border-b border-rose-100 text-rose-900 bg-rose-50/60 px-1.5 rounded">
                      <span className="font-medium flex items-center gap-1">
                        <Receipt className="w-3 h-3 text-rose-600" />
                        EP/JC Expense:
                      </span>
                      <span className="font-bold font-mono text-rose-700">
                        +{formatPKR(activeDayRecord.epJcExpense)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">
                  Total Closing:
                </span>
                <span className="text-base font-bold font-mono text-emerald-900">
                  {formatPKR(activeDayRecord.totalClosing)}
                </span>
              </div>
            </div>

            {/* CLOSING TOTAL COMPARISON (REQUIRED GREEN PROFIT / RED LOSS) */}
            <div
              className={`rounded-xl p-5 border flex flex-col justify-between transition-all ${
                activeDayRecord.netDifference > 0
                  ? "bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs"
                  : activeDayRecord.netDifference < 0
                    ? "bg-red-50/90 border-red-300 text-red-950 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-800"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    {activeDayRecord.netDifference > 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    ) : activeDayRecord.netDifference < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    ) : (
                      <Scale className="w-4 h-4 text-slate-500" />
                    )}
                    Closing Total Result
                  </span>

                  {/* TITLE IN GREEN (PROFIT) OR RED (LOSS) */}
                  <span
                    id="epjc-closing-result-badge"
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      activeDayRecord.netDifference > 0
                        ? "bg-emerald-600 text-white shadow-xs"
                        : activeDayRecord.netDifference < 0
                          ? "bg-red-600 text-white shadow-xs"
                          : "bg-slate-200 text-slate-800"
                    }`}
                  >
                    {activeDayRecord.netDifference > 0
                      ? "Profit"
                      : activeDayRecord.netDifference < 0
                        ? "Loss"
                        : "Balanced"}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-xs font-medium opacity-80">
                    Closing Total:
                  </div>
                  <div
                    id="epjc-focused-closing-total"
                    className={`text-2xl font-black font-mono mt-0.5 ${
                      activeDayRecord.netDifference > 0
                        ? "text-emerald-700"
                        : activeDayRecord.netDifference < 0
                          ? "text-red-700"
                          : "text-slate-800"
                    }`}
                  >
                    {formatPKR(activeDayRecord.totalClosing)}
                  </div>
                </div>

                <div className="mt-2 text-xs opacity-90">
                  {activeDayRecord.netDifference > 0 ? (
                    <span className="font-semibold text-emerald-800">
                      Closing is greater than Opening (
                      {formatPKR(activeDayRecord.totalOpening)}).
                    </span>
                  ) : activeDayRecord.netDifference < 0 ? (
                    <span className="font-semibold text-red-800">
                      Closing is less than Opening (
                      {formatPKR(activeDayRecord.totalOpening)}).
                    </span>
                  ) : (
                    <span>Closing equals Opening exactly.</span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-current/20 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {activeDayRecord.netDifference > 0
                    ? "Net Profit:"
                    : activeDayRecord.netDifference < 0
                      ? "Net Loss:"
                      : "Variance:"}
                </span>
                <span
                  className={`text-base font-extrabold font-mono ${
                    activeDayRecord.netDifference > 0
                      ? "text-emerald-700"
                      : activeDayRecord.netDifference < 0
                        ? "text-red-700"
                        : "text-slate-700"
                  }`}
                >
                  {activeDayRecord.netDifference > 0
                    ? `+${formatPKR(activeDayRecord.netDifference)}`
                    : activeDayRecord.netDifference < 0
                      ? `-${formatPKR(Math.abs(activeDayRecord.netDifference))}`
                      : formatPKR(0)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 mt-4">
            <Coins className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              No Daily Record For {selectedDate}
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Enter your EP & JC App digital opening/closing and physical cash
              drawer balances to calculate your daily Profit or Loss
              automatically.
            </p>
            <button
              onClick={handleOpenAddDaily}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Record for {selectedDate}
            </button>
          </div>
        )}
      </div>

      {/* Secondary Metrics: Overview Stats (Worker Present Day vs Admin All-Time) */}
      {isWorker ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Today's Profit / Loss */}
          <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 mb-1">
              <span>Today's Net Variance</span>
              {todayMetrics.hasRecord ? (
                todayMetrics.netDifference >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )
              ) : (
                <Calendar className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <div
              className={`text-lg font-black font-mono ${
                todayMetrics.hasRecord
                  ? todayMetrics.netDifference >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                  : "text-slate-500"
              }`}
            >
              {todayMetrics.hasRecord
                ? `${todayMetrics.netDifference >= 0 ? "+" : ""}${formatPKR(todayMetrics.netDifference)}`
                : "Pending Sheet"}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {todayMetrics.hasRecord
                ? `Opening ${formatPKR(todayMetrics.totalOpening)} • Closing ${formatPKR(todayMetrics.totalClosing)}`
                : "Reconcile today's sheet above"}
            </p>
          </div>

          {/* Today's Transfer (Cash In) */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Today's Transfer (In)</span>
              <ArrowUpRight className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-black font-mono text-slate-900">
              {formatPKR(todayMetrics.transferVolume)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Sent to customers today
            </p>
          </div>

          {/* Today's Withdraw (Cash Out) */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Today's Withdraw (Out)</span>
              <ArrowDownLeft className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-lg font-black font-mono text-slate-900">
              {formatPKR(todayMetrics.withdrawVolume)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Cash paid out of drawer today
            </p>
          </div>

          {/* Today's Commission */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Today's Commission</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg font-black font-mono text-emerald-600">
              {formatPKR(todayMetrics.commission)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Earned on {todayMetrics.txCount} today's transactions
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Overall Net Variance</span>
              {summaryMetrics.netVariance >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
            </div>
            <div
              className={`text-lg font-bold font-mono ${
                summaryMetrics.netVariance >= 0
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {summaryMetrics.netVariance >= 0 ? "+" : ""}
              {formatPKR(summaryMetrics.netVariance)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {summaryMetrics.netProfitDays} Profit days •{" "}
              {summaryMetrics.netLossDays} Loss days
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Transfer (Cash In) Vol.</span>
              <ArrowUpRight className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-bold font-mono text-slate-900">
              {formatPKR(summaryMetrics.transferVolume)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Sent to customer EP/JC accounts
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Withdraw (Cash Out) Vol.</span>
              <ArrowDownLeft className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-lg font-bold font-mono text-slate-900">
              {formatPKR(summaryMetrics.withdrawVolume)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Cash paid out from shop drawer
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Commission Earned</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg font-bold font-mono text-emerald-600">
              {formatPKR(summaryMetrics.totalCommission)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Total service commission fees
            </p>
          </div>
        </div>
      )}

      {/* Main Content Area: View Selector Tabs */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Navigation bar between Daily Records and Transactions */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 pt-3 bg-slate-50/50">
          <div className="flex space-x-2">
            <button
              id="tab-view-daily-records"
              onClick={() => setViewMode("DAILY_RECORDS")}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                viewMode === "DAILY_RECORDS"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Daily Opening & Closing Register</span>
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {records.length}
              </span>
            </button>

            <button
              id="tab-view-transactions"
              onClick={() => setViewMode("TRANSACTIONS")}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                viewMode === "TRANSACTIONS"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Cash Transfer & Withdraw Ledger</span>
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {transactions.length}
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: DAILY OPENING & CLOSING REGISTER */}
        {viewMode === "DAILY_RECORDS" && (
          <div>
            {/* Administrator Period Balances Focus Bar (Showing EP & JC Opening, Closing, Profit for Date Range) */}
            {!isWorker && adminPeriodStats && (
              <div className="p-4 bg-blue-50/60 border-b border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-600 text-white font-bold shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                        EP &amp; JC Balances: {adminPeriodStats.periodLabel}
                      </span>
                      <span className="text-slate-400 font-normal">·</span>
                      <span className="text-[11px] font-semibold text-blue-800">
                        Admin Only
                      </span>
                      {adminPeriodStats.daysLogged > 0 && (
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full">
                          {adminPeriodStats.daysLogged} Day
                          {adminPeriodStats.daysLogged !== 1 ? "s" : ""}{" "}
                          Recorded
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cumulative opening &amp; closing balances and
                      reconciliation net profit / loss for selected date range
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-2xs">
                    <span className="text-[10px] font-sans text-slate-500 block">
                      Period Opening:
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatPKR(adminPeriodStats.totalOpening)}
                    </span>
                  </div>

                  <div className="bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-2xs">
                    <span className="text-[10px] font-sans text-slate-500 block">
                      Period Closing:
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatPKR(adminPeriodStats.totalClosing)}
                    </span>
                  </div>

                  <div
                    className={`bg-white px-3 py-1.5 rounded-lg border shadow-2xs ${
                      adminPeriodStats.isProfit
                        ? "border-emerald-300"
                        : adminPeriodStats.isLoss
                          ? "border-rose-300"
                          : "border-slate-200"
                    }`}
                  >
                    <span className="text-[10px] font-sans text-slate-500 block">
                      Period Profit/Loss:
                    </span>
                    <span
                      className={`font-black ${
                        adminPeriodStats.isProfit
                          ? "text-emerald-700"
                          : adminPeriodStats.isLoss
                            ? "text-rose-700"
                            : "text-slate-800"
                      }`}
                    >
                      {adminPeriodStats.profit > 0 ? "+" : ""}
                      {formatPKR(adminPeriodStats.profit)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Date Range:</span>
                </span>

                {/* Preset: Today */}
                <button
                  type="button"
                  id="btn-epjc-filter-today"
                  onClick={() => {
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                    setDailyFilter("TODAY");
                    setRecordsPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    dailyFilter === "TODAY"
                      ? "bg-emerald-600 text-white shadow-xs font-bold"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      dailyFilter === "TODAY"
                        ? "bg-white animate-pulse"
                        : "bg-emerald-500"
                    }`}
                  ></span>
                  <span>Today</span>
                </button>

                {/* Preset: 8 Days (As requested by user: "So If I want to check only 8 Days Data, I Can use it") */}
                <button
                  type="button"
                  id="btn-epjc-filter-8days"
                  onClick={() => handleApplyPresetDays(8)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    dailyFilter === "RANGE" &&
                    startDate === getDateNDaysAgo(8) &&
                    endDate === todayStr
                      ? "bg-blue-600 text-white shadow-xs font-bold ring-2 ring-blue-300"
                      : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200"
                  }`}
                  title="Filter last 8 days of records"
                >
                  <Clock className="w-3 h-3 text-current" />
                  <span>Last 8 Days</span>
                </button>

                {/* Preset: 30 Days */}
                <button
                  type="button"
                  id="btn-epjc-filter-30days"
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
                  id="btn-epjc-filter-all"
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
                      id="input-epjc-start-date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setDailyFilter("RANGE");
                        setRecordsPage(1);
                      }}
                      className="px-2 py-1 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="font-semibold text-slate-500 whitespace-nowrap">
                      To:
                    </span>
                    <input
                      type="date"
                      id="input-epjc-end-date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setDailyFilter("RANGE");
                        setRecordsPage(1);
                      }}
                      className="px-2 py-1 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    />
                  </div>

                  {(startDate || endDate) && (
                    <button
                      type="button"
                      id="btn-epjc-clear-range"
                      onClick={handleClearDateRange}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/80 px-2.5 py-1 rounded-md border border-rose-200/80 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Clear date range"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={handleOpenAddDaily}
                className="px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer self-start xl:self-auto shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add Daily Record</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-base">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-800 font-bold uppercase tracking-wider text-sm">
                    <th className="py-4 px-4">Date</th>
                    <th className="py-4 px-3">EP &amp; JC O.</th>
                    <th className="py-4 px-3">Cash O.</th>
                    <th className="py-4 px-3">Ext</th>
                    <th className="py-4 px-3">Total O.</th>
                    <th className="py-4 px-3">EP &amp; JC C.</th>
                    <th className="py-4 px-3">Cash C.</th>
                    {/* Crucial requirement: In Closing Total show Green with Profit, or Red with Loss */}
                    <th className="py-4 px-3">EXP</th>
                    <th className="py-4 px-3">Total C.</th>
                    <th className="py-4 px-3">Net</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-8 text-center text-slate-400"
                      >
                        No daily records logged yet. Click "New Daily Record" to
                        begin.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r) => {
                      const isProfit = r.netDifference > 0;
                      const isLoss = r.netDifference < 0;

                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* Date */}
                          <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{r.date}</span>
                              {r.date === todayStr && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-sm font-bold">
                                  Today
                                </span>
                              )}
                            </div>
                            {r.notes && (
                              <p className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5 font-normal">
                                {r.notes}
                              </p>
                            )}
                          </td>

                          {/* Digital Opening (EP & JC + Custom Banks) */}
                          <td className="py-3 px-3 font-bold">
                            <div className="text-slate-800">
                              <span className="text-slate-400 font-sans font-medium">
                                EP:{" "}
                              </span>
                              {r.epOpening}
                            </div>
                            <div className="text-slate-800 font-bold">
                              <span className="text-slate-400 font-sans font-medium">
                                JC:{" "}
                              </span>
                              {r.jcOpening}
                            </div>
                            {r.customAccounts &&
                              r.customAccounts.length > 0 && (
                                <div className="pt-0.5 mt-0.5 border-t border-slate-100">
                                  {r.customAccounts.map((ca) => (
                                    <div
                                      key={ca.id}
                                      className="text-indigo-900 text-[11px] font-semibold flex items-center gap-1"
                                    >
                                      <span className="text-[10px] text-indigo-500 font-sans font-medium">
                                        {ca.name || "Bank"}:
                                      </span>
                                      <span>
                                        {formatPKR(ca.openingBalance)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </td>

                          {/* EP and JC Cash Opening */}
                          <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                            {formatPKR(
                              r.epJcCashOpening !== undefined
                                ? r.epJcCashOpening
                                : (r.epCashOpening || 0) +
                                    (r.jcCashOpening || 0),
                            )}
                          </td>

                          {/* Extra */}
                          <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                            {Number(r.extraAddition) > 0 && (
                              <div>{r.extraAddition}</div>
                            )}
                          </td>

                          {/* Total Opening */}
                          <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                            <div>{r.totalOpening}</div>
                          </td>

                          {/* Digital Closing (EP & JC + Custom Banks) */}
                          <td className="py-3 px-3">
                            <div className="text-slate-800 font-bold">
                              <span className=" text-slate-400 font-sans font-medium">
                                EP:{" "}
                              </span>
                              {r.epClosing}
                            </div>
                            <div className="text-slate-800 font-bold">
                              <span className=" text-slate-400 font-sans font-medium">
                                JC:{" "}
                              </span>
                              {r.jcClosing}
                            </div>
                            {r.customAccounts &&
                              r.customAccounts.length > 0 && (
                                <div className="pt-0.5 mt-0.5 border-t border-slate-100">
                                  {r.customAccounts.map((ca) => (
                                    <div
                                      key={ca.id}
                                      className="text-indigo-900 text-[11px] font-semibold flex items-center gap-1"
                                    >
                                      <span className="text-[10px] text-indigo-500 font-sans font-medium">
                                        {ca.name || "Bank"}:
                                      </span>
                                      <span>
                                        {formatPKR(ca.closingBalance)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </td>

                          {/* EP and JC Cash Closing */}
                          <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                            {formatPKR(
                              r.epJcCashClosing !== undefined
                                ? r.epJcCashClosing
                                : (r.epCashClosing || 0) +
                                    (r.jcCashClosing || 0),
                            )}
                          </td>

                          {/* EXP */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              {Number(r.epJcExpense) > 0 && (
                                <span className="text-sm font-bold text-slate-800">
                                  {r.epJcExpense}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Closing Total with requirement: Green with Profit if > Opening, Red with Loss if < Opening */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span
                                className={`text-sm font-bold text-slate-800`}
                              >
                                {r.totalClosing}
                              </span>
                            </div>
                          </td>

                          {/* Net Variance */}
                          <td className="py-3 px-3 font-bold whitespace-nowrap">
                            <span
                              className={`${
                                isProfit
                                  ? "text-emerald-600"
                                  : isLoss
                                    ? "text-red-600"
                                    : "text-slate-600"
                              }`}
                            >
                              {isProfit
                                ? `+${r.netDifference}`
                                : isLoss
                                  ? `-${Math.abs(r.netDifference)}`
                                  : 0}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditDaily(r)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                                title="Edit Record"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`btn-delete-daily-${r.id || r.date}`}
                                type="button"
                                onClick={() => handleDeleteDaily(r)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete Daily Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
              <div className="p-4 border-t border-slate-100">
                <TablePagination
                  currentPage={recordsPage}
                  totalItems={filteredDailyRecords.length}
                  pageSize={recordsPageSize}
                  onPageChange={setRecordsPage}
                  onPageSizeChange={(sz) => {
                    setRecordsPageSize(sz);
                    setStoredPageSize("epjc_records", sz);
                    setRecordsPage(1);
                  }}
                  idPrefix="epjc-records"
                  itemLabel="daily records"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CASH TRANSFER & WITHDRAW LEDGER */}
        {viewMode === "TRANSACTIONS" && (
          <div>
            {/* Filter controls */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search mobile, customer, TID..."
                    value={txSearch}
                    onChange={(e) => {
                      setTxSearch(e.target.value);
                      setTxPage(1);
                    }}
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-emerald-500 w-52"
                  />
                </div>

                {/* Period Filter: Today vs All */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300">
                  <button
                    type="button"
                    onClick={() => {
                      setTxDateFilter(todayStr);
                      setTxPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                      txDateFilter === todayStr
                        ? "bg-emerald-600 text-white font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${txDateFilter === todayStr ? "bg-white animate-pulse" : "bg-emerald-500"}`}
                    ></span>
                    <span>Today ({todayMetrics.txCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTxDateFilter("ALL");
                      setTxPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      txDateFilter === "ALL"
                        ? "bg-slate-900 text-white font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All ({transactions.length})
                  </button>
                </div>

                {/* Service Filter */}
                <select
                  value={serviceFilter}
                  onChange={(e) => {
                    setServiceFilter(e.target.value as any);
                    setTxPage(1);
                  }}
                  className="bg-white border border-slate-300 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">All Services (EP & JC)</option>
                  <option value="EASYPAISA">EasyPaisa (EP)</option>
                  <option value="JAZZCASH">JazzCash (JC)</option>
                </select>

                {/* Type Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value as any);
                    setTxPage(1);
                  }}
                  className="bg-white border border-slate-300 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">All Actions</option>
                  <option value="TRANSFER">Transfer (Cash In)</option>
                  <option value="WITHDRAW">Withdraw (Cash Out)</option>
                </select>
              </div>

              <button
                onClick={handleOpenAddTx}
                className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Transaction</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-base">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-800 font-bold uppercase tracking-wider text-sm">
                    <th className="py-4 px-4">Date & Time</th>
                    <th className="py-4 px-3">Service</th>
                    <th className="py-4 px-3">Type</th>
                    <th className="py-4 px-3">Customer</th>
                    <th className="py-4 px-3">Amount</th>
                    <th className="py-4 px-3">Fee / Comm.</th>
                    <th className="py-4 px-3">TRX ID / TID</th>
                    <th className="py-4 px-3">Notes</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-8 text-center text-slate-400"
                      >
                        No transactions found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((tx) => {
                      const isTransfer = tx.type === "TRANSFER";

                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-medium text-slate-900">
                              {tx.date}
                            </div>
                            {tx.time && (
                              <div className="text-[10px] text-slate-400">
                                {tx.time}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                tx.service === "EASYPAISA"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-900"
                              }`}
                            >
                              {tx.service === "EASYPAISA"
                                ? "EasyPaisa"
                                : "JazzCash"}
                            </span>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                isTransfer
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {isTransfer ? (
                                <ArrowUpRight className="w-3 h-3 text-blue-600" />
                              ) : (
                                <ArrowDownLeft className="w-3 h-3 text-purple-600" />
                              )}
                              {isTransfer
                                ? "Transfer (Cash In)"
                                : "Withdraw (Cash Out)"}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-mono text-slate-900 font-semibold">
                              {tx.customerMobile}
                            </div>
                            {tx.customerName && (
                              <div className="text-[11px] text-slate-500">
                                {tx.customerName}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatPKR(tx.amount)}
                          </td>

                          <td className="py-3 px-3 font-mono text-emerald-700 font-semibold whitespace-nowrap">
                            {tx.feeOrCommission
                              ? formatPKR(tx.feeOrCommission)
                              : "—"}
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                            {tx.trxId || "—"}
                          </td>

                          <td className="py-3 px-3 text-slate-500 text-[11px] truncate max-w-xs">
                            {tx.notes || "—"}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditTx(tx)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                                title="Edit Transaction"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`btn-delete-tx-${tx.id}`}
                                type="button"
                                onClick={() => handleDeleteTx(tx)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete Transaction"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

            {filteredTransactions.length > 0 && (
              <div className="p-4 border-t border-slate-100">
                <TablePagination
                  currentPage={txPage}
                  totalItems={filteredTransactions.length}
                  pageSize={txPageSize}
                  onPageChange={setTxPage}
                  onPageSizeChange={(sz) => {
                    setTxPageSize(sz);
                    setStoredPageSize("epjc_txs", sz);
                    setTxPage(1);
                  }}
                  idPrefix="epjc-txs"
                  itemLabel="transactions"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Daily Modal */}
      <EpJcDailyModal
        isOpen={isDailyModalOpen}
        onClose={() => setIsDailyModalOpen(false)}
        recordToEdit={recordToEdit}
        onSave={async (record) => {
          await onSaveDailyRecord(record);
          onRefresh();
        }}
        existingDates={records.map((r) => r.date)}
      />

      {/* Transaction Modal */}
      <EpJcTxModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        txToEdit={txToEdit}
        onSave={async (tx) => {
          await onSaveTransaction(tx);
          onRefresh();
        }}
        defaultDate={selectedDate}
      />

      {/* Delete Confirmation Modal for Daily Record */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Daily Record
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Date: {recordToDelete.date}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the daily
              reconciliation record for{" "}
              <strong className="text-slate-900 font-semibold">
                {recordToDelete.date}
              </strong>
              ? This record will be permanently deleted from PC disk storage.
            </p>

            <div className="mt-3.5 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-600">
                <span className="font-sans">Total Day Opening:</span>
                <span className="font-semibold text-slate-800">
                  {formatPKR(recordToDelete.totalOpening)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-sans">Total Day Closing:</span>
                <span className="font-semibold text-slate-800">
                  {formatPKR(recordToDelete.totalClosing)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-sans font-semibold">
                <span className="text-slate-700">Daily Reconciliation:</span>
                <span
                  className={`font-mono font-bold ${
                    recordToDelete.resultType === "PROFIT"
                      ? "text-emerald-600"
                      : recordToDelete.resultType === "LOSS"
                        ? "text-rose-600"
                        : "text-slate-600"
                  }`}
                >
                  {recordToDelete.resultType}{" "}
                  {recordToDelete.netDifference !== 0 &&
                    `(${formatPKR(Math.abs(recordToDelete.netDifference))})`}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                id="btn-cancel-delete-daily-record"
                type="button"
                onClick={() => setRecordToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-daily-record"
                type="button"
                onClick={handleConfirmDeleteDaily}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {isDeleting ? "Deleting..." : "Delete Daily Record"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Transaction */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Transaction
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  {txToDelete.service === "EASYPAISA"
                    ? "EasyPaisa"
                    : "JazzCash"}{" "}
                  •{" "}
                  {txToDelete.type === "TRANSFER"
                    ? "Transfer (Send)"
                    : "Withdraw (Cash Out)"}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this{" "}
              <strong className="text-slate-900 font-semibold">
                {txToDelete.service}{" "}
                {txToDelete.type === "TRANSFER" ? "Transfer" : "Withdrawal"}
              </strong>{" "}
              of{" "}
              <strong className="text-slate-900 font-mono font-bold">
                {formatPKR(txToDelete.amount)}
              </strong>
              ? This record will be permanently deleted from PC disk storage.
            </p>

            <div className="mt-3.5 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Customer Mobile:</span>
                <span className="font-mono font-bold text-slate-900">
                  {txToDelete.customerMobile}
                </span>
              </div>
              {txToDelete.customerName && (
                <div className="flex justify-between text-slate-600">
                  <span>Customer Name:</span>
                  <span className="font-medium text-slate-900">
                    {txToDelete.customerName}
                  </span>
                </div>
              )}
              {txToDelete.trxId && (
                <div className="flex justify-between text-slate-600">
                  <span>TRX ID / TID:</span>
                  <span className="font-mono text-slate-700">
                    {txToDelete.trxId}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Date & Time:</span>
                <span className="font-mono text-slate-700">
                  {txToDelete.date} {txToDelete.time}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-slate-600">
                <span>Fee / Commission:</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {formatPKR(txToDelete.feeOrCommission || 0)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                id="btn-cancel-delete-tx"
                type="button"
                onClick={() => setTxToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-tx"
                type="button"
                onClick={handleConfirmDeleteTx}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? "Deleting..." : "Delete Transaction"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
