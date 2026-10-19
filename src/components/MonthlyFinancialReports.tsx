import React, { useState, useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Banknote,
  ShoppingCart,
  Smartphone,
  Radio,
  Package,
  Printer,
  ChevronRight,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  CalendarDays,
  Percent,
} from 'lucide-react';
import {
  Sale,
  EpJcDailyRecord,
  EpJcTransaction,
  LoadDailyRecord,
  LoadTransaction,
  InventoryItem,
  AuthUser,
} from '../types';
import { formatPKR, formatNumber } from '../utils/currency';
import { ActiveTab } from './Navbar';

interface MonthlyFinancialReportsProps {
  sales: Sale[];
  epJcRecords: EpJcDailyRecord[];
  epJcTransactions: EpJcTransaction[];
  loadRecords: LoadDailyRecord[];
  loadTransactions: LoadTransaction[];
  items?: InventoryItem[];
  currentUser?: AuthUser | null;
  onNavigate?: (tab: ActiveTab) => void;
}

interface MonthlyItemStat {
  itemId: string;
  sku: string;
  name: string;
  category: string;
  unitsSold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
}

export const MonthlyFinancialReports: React.FC<MonthlyFinancialReportsProps> = ({
  sales,
  epJcRecords,
  epJcTransactions,
  loadRecords,
  loadTransactions,
  items = [],
  currentUser,
  onNavigate,
}) => {
  // STRICT ACCESS CONTROL: Administrator Account Only
  const isAdmin = currentUser?.role === 'admin' || !currentUser?.role;
  if (!isAdmin) {
    return null;
  }

  // Current year-month default
  const defaultMonthStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  // Gather all available months across all modules
  const allAvailableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    monthSet.add(defaultMonthStr);

    sales.forEach((s) => {
      if (s.date && s.date.length >= 7) {
        monthSet.add(s.date.substring(0, 7));
      }
    });

    epJcRecords.forEach((r) => {
      if (r.date && r.date.length >= 7) {
        monthSet.add(r.date.substring(0, 7));
      }
    });

    epJcTransactions.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        monthSet.add(t.date.substring(0, 7));
      }
    });

    loadRecords.forEach((r) => {
      if (r.date && r.date.length >= 7) {
        monthSet.add(r.date.substring(0, 7));
      }
    });

    loadTransactions.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        monthSet.add(t.date.substring(0, 7));
      }
    });

    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [defaultMonthStr, sales, epJcRecords, epJcTransactions, loadRecords, loadTransactions]);

  const [selectedMonth, setSelectedMonth] = useState<string>(allAvailableMonths[0] || defaultMonthStr);
  const [activeReportTab, setActiveReportTab] = useState<'MONTHLY_DETAIL' | 'ALL_MONTHS_TABLE'>('MONTHLY_DETAIL');
  const [activeCategoryView, setActiveCategoryView] = useState<'ALL' | 'ITEMS' | 'EPJC' | 'LOAD'>('ALL');

  // Human-readable format of the selected month (e.g. "September 2026")
  const formatMonthTitle = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-').map(Number);
      const d = new Date(year, month - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return monthStr;
    }
  };

  // =========================================================================
  // 1. SALES, PROFIT AND ITEMS SOLD OF ITEMS (FOR SELECTED MONTH)
  // =========================================================================
  const monthlySalesData = useMemo(() => {
    const monthSales = sales.filter((s) => s.date.startsWith(selectedMonth));

    let totalRevenue = 0;
    let totalCost = 0;
    let totalUnitsSold = 0;
    const itemMap = new Map<string, MonthlyItemStat>();

    // Map item cost fallbacks from inventory items in case old sales have 0 costPrice
    const itemCostMap = new Map<string, number>();
    items.forEach((it) => {
      itemCostMap.set(it.id, it.costPrice || 0);
      if (it.sku) itemCostMap.set(it.sku, it.costPrice || 0);
    });

    monthSales.forEach((sale) => {
      totalRevenue += sale.totalAmount;

      sale.items.forEach((line) => {
        totalUnitsSold += line.quantity;
        const lineRevenue = line.soldPrice * line.quantity;
        const unitCost =
          line.costPrice > 0
            ? line.costPrice
            : itemCostMap.get(line.itemId) || itemCostMap.get(line.sku) || 0;
        const lineCost = unitCost * line.quantity;
        const lineProfit = lineRevenue - lineCost;

        totalCost += lineCost;

        const cleanSku = (line.sku || '').trim().toUpperCase();
        const key = cleanSku || (line.itemId || '').trim() || (line.name || '').trim();
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            itemId: line.itemId,
            sku: line.sku,
            name: line.name,
            category: 'General',
            unitsSold: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
          });
        }

        const stat = itemMap.get(key)!;
        stat.unitsSold += line.quantity;
        stat.totalRevenue += lineRevenue;
        stat.totalCost += lineCost;
        stat.totalProfit += lineProfit;
      });
    });

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const topItems = Array.from(itemMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      count: monthSales.length,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      totalUnitsSold,
      topItems,
    };
  }, [sales, selectedMonth, items]);

  // =========================================================================
  // 2. OPENING AND CLOSING AND PROFIT OF EP & JC SERVICE (FOR SELECTED MONTH)
  // =========================================================================
  const monthlyEpJcData = useMemo(() => {
    const monthRecords = epJcRecords.filter((r) => r.date.startsWith(selectedMonth));
    const monthTxs = epJcTransactions.filter((t) => t.date.startsWith(selectedMonth));

    let totalOpening = 0;
    let totalClosing = 0;
    let netDifference = 0;

    let totalEpOpening = 0;
    let totalJcOpening = 0;
    let totalCashOpening = 0;

    let totalEpClosing = 0;
    let totalJcClosing = 0;
    let totalCashClosing = 0;
    let totalExtraAddition = 0;
    let totalEpJcExpense = 0;

    let profitDaysCount = 0;
    let lossDaysCount = 0;

    monthRecords.forEach((r) => {
      totalOpening += r.totalOpening;
      totalClosing += r.totalClosing;
      netDifference += r.netDifference;

      totalEpOpening += r.epOpening || 0;
      totalJcOpening += r.jcOpening || 0;
      totalCashOpening +=
        r.epJcCashOpening !== undefined
          ? r.epJcCashOpening
          : (r.epCashOpening || 0) + (r.jcCashOpening || 0);
      totalExtraAddition += r.extraAddition || 0;

      totalEpClosing += r.epClosing || 0;
      totalJcClosing += r.jcClosing || 0;
      totalCashClosing +=
        r.epJcCashClosing !== undefined
          ? r.epJcCashClosing
          : (r.epCashClosing || 0) + (r.jcCashClosing || 0);
      totalEpJcExpense += r.epJcExpense || 0;

      if (r.netDifference > 0) profitDaysCount += 1;
      else if (r.netDifference < 0) lossDaysCount += 1;
    });

    // Transaction stats in this month
    let transferVolume = 0;
    let withdrawVolume = 0;
    let commissionEarned = 0;

    monthTxs.forEach((tx) => {
      if (tx.type === 'TRANSFER') transferVolume += tx.amount;
      if (tx.type === 'WITHDRAW') withdrawVolume += tx.amount;
      commissionEarned += tx.feeOrCommission || 0;
    });

    // Sort by date ascending to get start-of-month and end-of-month records
    const sorted = [...monthRecords].sort((a, b) => a.date.localeCompare(b.date));
    const firstDayRecord = sorted[0];
    const lastDayRecord = sorted[sorted.length - 1];

    return {
      daysCount: monthRecords.length,
      totalOpening,
      totalClosing,
      netProfit: netDifference,
      isProfit: netDifference > 0,
      isLoss: netDifference < 0,
      profitDaysCount,
      lossDaysCount,
      totalEpOpening,
      totalJcOpening,
      totalCashOpening,
      totalEpClosing,
      totalJcClosing,
      totalCashClosing,
      totalExtraAddition,
      totalEpJcExpense,
      firstDayOpening: firstDayRecord?.totalOpening || 0,
      lastDayClosing: lastDayRecord?.totalClosing || 0,
      monthTxsCount: monthTxs.length,
      transferVolume,
      withdrawVolume,
      commissionEarned,
    };
  }, [epJcRecords, epJcTransactions, selectedMonth]);

  // =========================================================================
  // 3. OPENING AND CLOSING AND TOTAL SALE OF LOAD (FOR SELECTED MONTH)
  // =========================================================================
  const monthlyLoadData = useMemo(() => {
    const monthRecords = loadRecords.filter((r) => r.date.startsWith(selectedMonth));
    const monthTxs = loadTransactions.filter((t) => t.date.startsWith(selectedMonth));

    let totalOpening = 0;
    let totalClosing = 0;
    let netDifference = 0;

    let jazzOpeningSum = 0;
    let telenorOpeningSum = 0;
    let zongOpeningSum = 0;
    let ufoneOpeningSum = 0;
    let loadCashOpeningSum = 0;

    let jazzClosingSum = 0;
    let telenorClosingSum = 0;
    let zongClosingSum = 0;
    let ufoneClosingSum = 0;
    let loadCashClosingSum = 0;

    monthRecords.forEach((r) => {
      totalOpening += r.totalOpening;
      totalClosing += r.totalClosing;
      netDifference += r.netDifference;

      jazzOpeningSum += r.jazzOpening || 0;
      telenorOpeningSum += r.telenorOpening || 0;
      zongOpeningSum += r.zongOpening || 0;
      ufoneOpeningSum += r.ufoneOpening || 0;
      loadCashOpeningSum += r.loadCashOpening || 0;

      jazzClosingSum += r.jazzClosing || 0;
      telenorClosingSum += r.telenorClosing || 0;
      zongClosingSum += r.zongClosing || 0;
      ufoneClosingSum += r.ufoneClosing || 0;
      loadCashClosingSum += r.loadCashClosing || 0;
    });

    // Total Sale of Load = sum of load transaction amounts in that month
    let totalLoadSales = 0;
    let totalCommissionOrProfit = 0;
    const networkSales = {
      JAZZ_WARID: 0,
      TELENOR: 0,
      ZONG: 0,
      UFONE: 0,
    };

    monthTxs.forEach((t) => {
      totalLoadSales += t.amount;
      totalCommissionOrProfit += t.commissionOrProfit || 0;
      if (t.network in networkSales) {
        networkSales[t.network] += t.amount;
      }
    });

    const sorted = [...monthRecords].sort((a, b) => a.date.localeCompare(b.date));
    const firstDayRecord = sorted[0];
    const lastDayRecord = sorted[sorted.length - 1];

    return {
      daysCount: monthRecords.length,
      totalOpening,
      totalClosing,
      netDifference,
      isProfit: netDifference > 0,
      isLoss: netDifference < 0,
      totalLoadSales,
      totalCommissionOrProfit,
      networkSales,
      firstDayOpening: firstDayRecord?.totalOpening || 0,
      lastDayClosing: lastDayRecord?.totalClosing || 0,
      totalTxsCount: monthTxs.length,
      jazzOpeningSum,
      telenorOpeningSum,
      zongOpeningSum,
      ufoneOpeningSum,
      loadCashOpeningSum,
      jazzClosingSum,
      telenorClosingSum,
      zongClosingSum,
      ufoneClosingSum,
      loadCashClosingSum,
    };
  }, [loadRecords, loadTransactions, selectedMonth]);

  // Combined Store Profit for the Selected Month
  const totalCombinedMonthlyProfit = useMemo(() => {
    return monthlySalesData.totalProfit + monthlyEpJcData.netProfit + monthlyLoadData.netDifference;
  }, [monthlySalesData.totalProfit, monthlyEpJcData.netProfit, monthlyLoadData.netDifference]);

  // =========================================================================
  // ALL MONTHS COMPARATIVE TABLE DATA GENERATOR
  // =========================================================================
  const allMonthsComparativeList = useMemo(() => {
    return allAvailableMonths.map((mStr) => {
      // 1. Sales
      const mSales = sales.filter((s) => s.date.startsWith(mStr));
      let sRevenue = 0;
      let sCost = 0;
      let sUnits = 0;
      mSales.forEach((s) => {
        sRevenue += s.totalAmount;
        s.items.forEach((line) => {
          sUnits += line.quantity;
          const uCost = line.costPrice > 0 ? line.costPrice : 0;
          sCost += uCost * line.quantity;
        });
      });
      const sProfit = sRevenue - sCost;

      // 2. EP & JC
      const mEpJc = epJcRecords.filter((r) => r.date.startsWith(mStr));
      let epjcOpening = 0;
      let epjcClosing = 0;
      let epjcProfit = 0;
      mEpJc.forEach((r) => {
        epjcOpening += r.totalOpening;
        epjcClosing += r.totalClosing;
        epjcProfit += r.netDifference;
      });

      // 3. Load
      const mLoadRecs = loadRecords.filter((r) => r.date.startsWith(mStr));
      const mLoadTxs = loadTransactions.filter((t) => t.date.startsWith(mStr));
      let loadOpening = 0;
      let loadClosing = 0;
      let loadProfit = 0;
      mLoadRecs.forEach((r) => {
        loadOpening += r.totalOpening;
        loadClosing += r.totalClosing;
        loadProfit += r.netDifference;
      });
      let loadSales = 0;
      mLoadTxs.forEach((t) => {
        loadSales += t.amount;
      });

      const combinedProfit = sProfit + epjcProfit + loadProfit;

      return {
        month: mStr,
        monthName: formatMonthTitle(mStr),
        // 1. Items
        itemsSalesRevenue: sRevenue,
        itemsProfit: sProfit,
        itemsSoldUnits: sUnits,
        // 2. EP & JC
        epJcOpening: epjcOpening,
        epJcClosing: epjcClosing,
        epJcProfit: epjcProfit,
        // 3. Load
        loadOpening: loadOpening,
        loadClosing: loadClosing,
        loadTotalSales: loadSales,
        loadNetDifference: loadProfit,
        // Combined
        combinedProfit,
      };
    });
  }, [allAvailableMonths, sales, epJcRecords, loadRecords, loadTransactions]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="printable-monthly-report"
      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none print:overflow-visible"
    >
      {/* Header with Admin Badge & Month Selector */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white shadow-2xs">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Administrator Executive Reports
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-xs font-semibold text-slate-500">Monthly Aggregations</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <span>Monthly Business Financial Breakdown</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive month-by-month tracking of Items Sales &amp; Profit, EP &amp; JC Balances, and Load Services
            </p>
          </div>

          {/* Month Selector & View Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Switcher: Detail vs All Months Table */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveReportTab('MONTHLY_DETAIL')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeReportTab === 'MONTHLY_DETAIL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Month Details
              </button>
              <button
                type="button"
                onClick={() => setActiveReportTab('ALL_MONTHS_TABLE')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeReportTab === 'ALL_MONTHS_TABLE'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Months Compare
              </button>
            </div>

            {/* Selected Month Dropdown */}
            {activeReportTab === 'MONTHLY_DETAIL' && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    id="select-admin-report-month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="pl-3 pr-8 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    {allAvailableMonths.map((m) => (
                      <option key={m} value={m}>
                        {formatMonthTitle(m)} {m === defaultMonthStr ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer print:hidden"
              title="Print Monthly Report"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Executive Summary Bar for Selected Month */}
        {activeReportTab === 'MONTHLY_DETAIL' && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-200">
            {/* Total Month Net Profit (All 3 streams combined) */}
            <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                Total Month Net Store Profit
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black font-mono text-emerald-700">
                  {totalCombinedMonthlyProfit >= 0 ? '+' : ''}
                  {formatPKR(totalCombinedMonthlyProfit)}
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 mt-1 block">
                Items Profit + EP/JC Variance + Load Profit
              </span>
            </div>

            {/* 1. Items Sales & Profit Metric */}
            <div className="p-3.5 rounded-lg bg-purple-50/70 border border-purple-200/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider block">
                  1. Items Sales &amp; Profit
                </span>
                <span className="text-[10px] font-mono text-purple-700 font-bold">
                  {monthlySalesData.totalUnitsSold} Units
                </span>
              </div>
              <div className="mt-1 font-mono font-bold text-purple-900 text-base">
                {formatPKR(monthlySalesData.totalRevenue)}
              </div>
              <div className="text-[11px] font-mono text-emerald-700 font-bold mt-0.5 flex items-center gap-1">
                <span>Profit: +{formatPKR(monthlySalesData.totalProfit)}</span>
                <span className="text-[10px] text-purple-600 font-normal">
                  ({monthlySalesData.profitMargin.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* 2. EP & JC Balances & Profit Metric */}
            <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">
                  2. EP &amp; JC Service
                </span>
                <span className="text-[10px] font-mono text-blue-700 font-bold">
                  {monthlyEpJcData.daysCount} Days Logged
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-700">
                <span>Open: {formatPKR(monthlyEpJcData.totalOpening)}</span>
                <span>Close: {formatPKR(monthlyEpJcData.totalClosing)}</span>
              </div>
              <div
                className={`text-[11px] font-mono font-bold mt-0.5 ${
                  monthlyEpJcData.isProfit
                    ? 'text-emerald-700'
                    : monthlyEpJcData.isLoss
                    ? 'text-rose-700'
                    : 'text-slate-700'
                }`}
              >
                Profit/Variance: {monthlyEpJcData.netProfit > 0 ? '+' : ''}
                {formatPKR(monthlyEpJcData.netProfit)}
              </div>
            </div>

            {/* 3. Load Balances & Total Sale Metric */}
            <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider block">
                  3. Load Service
                </span>
                <span className="text-[10px] font-mono text-amber-800 font-bold">
                  {monthlyLoadData.daysCount} Days Logged
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-700">
                <span>Open: {formatPKR(monthlyLoadData.totalOpening)}</span>
                <span>Close: {formatPKR(monthlyLoadData.totalClosing)}</span>
              </div>
              <div className="text-[11px] font-mono text-amber-900 font-bold mt-0.5">
                Total Load Sale: {formatPKR(monthlyLoadData.totalLoadSales)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* VIEW MODE 1: MONTHLY DETAIL FOR SELECTED MONTH */}
      {/* ===================================================================== */}
      {activeReportTab === 'MONTHLY_DETAIL' && (
        <div className="p-6 space-y-8">
          {/* Quick Sub-Navigation Category Filter */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveCategoryView('ALL')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeCategoryView === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All 3 Services
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryView('ITEMS')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeCategoryView === 'ITEMS'
                    ? 'bg-purple-900 text-white shadow-2xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                1. Items Sales &amp; Profit
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryView('EPJC')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeCategoryView === 'EPJC'
                    ? 'bg-blue-900 text-white shadow-2xs'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                2. EP &amp; JC Service
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryView('LOAD')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeCategoryView === 'LOAD'
                    ? 'bg-amber-900 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                3. Load Service
              </button>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Month: <strong className="text-slate-800">{formatMonthTitle(selectedMonth)}</strong>
            </div>
          </div>

          {/* ================================================================= */}
          {/* SECTION 1: SALES, PROFIT AND ITEMS SOLD OF ITEMS */}
          {/* ================================================================= */}
          {(activeCategoryView === 'ALL' || activeCategoryView === 'ITEMS') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-purple-100 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      1. Sales, Profit &amp; Items Sold of Items
                    </h3>
                    <p className="text-xs text-slate-500">
                      Product turnover, cost basis deductions, gross margins, and units sold in {formatMonthTitle(selectedMonth)}
                    </p>
                  </div>
                </div>

                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('sales')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 cursor-pointer self-start sm:self-auto"
                  >
                    <span>View Sales Register</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 3 Core KPI Cards for Item Sales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Sales Revenue */}
                <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200">
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 block">
                    Monthly Sales Revenue
                  </span>
                  <div className="mt-2 text-2xl font-black font-mono text-purple-900">
                    {formatPKR(monthlySalesData.totalRevenue)}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-purple-700 pt-2 border-t border-purple-200/60 font-mono">
                    <span>{monthlySalesData.count} Invoices</span>
                    <span>Cost: {formatPKR(monthlySalesData.totalCost)}</span>
                  </div>
                </div>

                {/* Monthly Profit */}
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 block">
                    Monthly Items Profit
                  </span>
                  <div className="mt-2 text-2xl font-black font-mono text-emerald-700">
                    +{formatPKR(monthlySalesData.totalProfit)}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-emerald-800 pt-2 border-t border-emerald-200/60 font-mono">
                    <span>Gross Margin:</span>
                    <span className="font-bold">{monthlySalesData.profitMargin.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Items Sold */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
                    Total Items Sold (Units)
                  </span>
                  <div className="mt-2 text-2xl font-black font-mono text-slate-900">
                    {formatNumber(monthlySalesData.totalUnitsSold)} <span className="text-sm font-sans font-medium text-slate-500">units</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 font-mono">
                    <span>Distinct SKUs Sold:</span>
                    <span className="font-bold text-slate-800">{monthlySalesData.topItems.length} SKUs</span>
                  </div>
                </div>
              </div>

              {/* Top Selling Items Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden mt-4">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Item-by-Item Breakdown ({monthlySalesData.topItems.length} Products Sold in {formatMonthTitle(selectedMonth)})
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Sorted by Highest Sales Revenue
                  </span>
                </div>

                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-base">
                    <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-800 font-bold text-sm uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="py-3.5 px-4">Item Name / SKU</th>
                        <th className="py-3.5 px-3 text-right">Units Sold</th>
                        <th className="py-3.5 px-3 text-right">Total Revenue</th>
                        <th className="py-3.5 px-3 text-right">Cost of Goods</th>
                        <th className="py-3.5 px-3 text-right text-emerald-700">Profit Earned</th>
                        <th className="py-3.5 px-4 text-right">Profit Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlySalesData.topItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No sales registered for items during {formatMonthTitle(selectedMonth)}.
                          </td>
                        </tr>
                      ) : (
                        monthlySalesData.topItems.map((item, idx) => {
                          const margin = item.totalRevenue > 0 ? (item.totalProfit / item.totalRevenue) * 100 : 0;
                          return (
                            <tr key={`item-stat-${item.sku || item.itemId || item.name || 'item'}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-4">
                                <div className="font-semibold text-slate-900">{item.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                                {item.unitsSold}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                                {formatPKR(item.totalRevenue)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                                {formatPKR(item.totalCost)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                +{formatPKR(item.totalProfit)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-700">
                                {margin.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SECTION 2: OPENING AND CLOSING AND PROFIT OF EP & JC SERVICE */}
          {/* ================================================================= */}
          {(activeCategoryView === 'ALL' || activeCategoryView === 'EPJC') && (
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-blue-100 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      2. Opening, Closing &amp; Profit of EP &amp; JC Service
                    </h3>
                    <p className="text-xs text-slate-500">
                      EasyPaisa &amp; JazzCash daily balance register, opening &amp; closing reconciliations, and net profit for {formatMonthTitle(selectedMonth)}
                    </p>
                  </div>
                </div>

                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('epjc')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer self-start sm:self-auto"
                  >
                    <span>View EP &amp; JC Register</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 3 Core KPI Cards for EP & JC */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Monthly Opening Balance */}
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 block">
                    Monthly Total Opening Balance
                  </span>
                  <div className="mt-2 text-2xl font-black font-mono text-blue-950">
                    {formatPKR(monthlyEpJcData.totalOpening)}
                  </div>
                  {monthlyEpJcData.totalExtraAddition > 0 && (
                    <div className="text-[10px] text-indigo-700 font-mono font-bold mt-1">
                      Includes +{formatPKR(monthlyEpJcData.totalExtraAddition)} Extra Capital Reloads
                    </div>
                  )}
                  <div className="mt-2 pt-2 border-t border-blue-200/60 grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-600">
                    <div>
                      <span className="block text-slate-400">EP App:</span>
                      <strong className="text-slate-800">{formatPKR(monthlyEpJcData.totalEpOpening)}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">JC App:</span>
                      <strong className="text-slate-800">{formatPKR(monthlyEpJcData.totalJcOpening)}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Cash:</span>
                      <strong className="text-slate-800">{formatPKR(monthlyEpJcData.totalCashOpening)}</strong>
                    </div>
                  </div>
                </div>

                {/* Total Monthly Closing Balance */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
                    Monthly Total Closing Balance
                  </span>
                  <div className="mt-2 text-2xl font-black font-mono text-slate-900">
                    {formatPKR(monthlyEpJcData.totalClosing)}
                  </div>
                  {monthlyEpJcData.totalEpJcExpense > 0 && (
                    <div className="text-[10px] text-rose-700 font-mono font-bold mt-1">
                      Includes +{formatPKR(monthlyEpJcData.totalEpJcExpense)} Operating Expenses
                    </div>
                  )}
                  <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-600">
                    <div>
                      <span className="block text-slate-400">EP App:</span>
                      <strong className="text-slate-800">{formatPKR(monthlyEpJcData.totalEpClosing)}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">JC App:</span>
                      <strong className="text-slate-800">{formatPKR(monthlyEpJcData.totalJcClosing)}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Cash:</span>
                      <strong className="text-slate-800">{formatPKR(monthlyEpJcData.totalCashClosing)}</strong>
                    </div>
                  </div>
                </div>

                {/* Monthly Profit (Net Difference) */}
                <div
                  className={`p-4 rounded-xl border ${
                    monthlyEpJcData.isProfit
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : monthlyEpJcData.isLoss
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wider ${
                        monthlyEpJcData.isProfit
                          ? 'text-emerald-800'
                          : monthlyEpJcData.isLoss
                          ? 'text-rose-800'
                          : 'text-slate-600'
                      }`}
                    >
                      Monthly EP &amp; JC Profit / Variance
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        monthlyEpJcData.isProfit
                          ? 'bg-emerald-100 text-emerald-800'
                          : monthlyEpJcData.isLoss
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {monthlyEpJcData.isProfit ? 'PROFIT' : monthlyEpJcData.isLoss ? 'LOSS' : 'BALANCED'}
                    </span>
                  </div>
                  <div
                    className={`mt-2 text-2xl font-black font-mono ${
                      monthlyEpJcData.isProfit
                        ? 'text-emerald-700'
                        : monthlyEpJcData.isLoss
                        ? 'text-rose-700'
                        : 'text-slate-800'
                    }`}
                  >
                    {monthlyEpJcData.netProfit > 0 ? '+' : ''}
                    {formatPKR(monthlyEpJcData.netProfit)}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600 font-mono">
                    <span>{monthlyEpJcData.profitDaysCount} Profit Days</span>
                    <span>{monthlyEpJcData.lossDaysCount} Loss Days</span>
                  </div>
                </div>
              </div>

              {/* EP & JC Monthly Transaction Flow Details */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">TOTAL TRANSFERS (SEND):</span>
                  <span className="font-bold text-slate-800 text-sm">{formatPKR(monthlyEpJcData.transferVolume)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">TOTAL WITHDRAWALS (CASH OUT):</span>
                  <span className="font-bold text-slate-800 text-sm">{formatPKR(monthlyEpJcData.withdrawVolume)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">TOTAL TRANSACTIONS LOGGED:</span>
                  <span className="font-bold text-indigo-700 text-sm">{monthlyEpJcData.monthTxsCount} Txs</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">RECORDED OPERATIONAL DAYS:</span>
                  <span className="font-bold text-slate-800 text-sm">{monthlyEpJcData.daysCount} Days in Month</span>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SECTION 3: OPENING AND CLOSING AND TOTAL SALE OF LOAD LOAD */}
          {/* ================================================================= */}
          {(activeCategoryView === 'ALL' || activeCategoryView === 'LOAD') && (
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-100 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      3. Opening, Closing &amp; Total Sale of Load Load
                    </h3>
                    <p className="text-xs text-slate-500">
                      Mobile Load balances across Jazz, Telenor, Zong, Ufone SIMs, and total customer top-up sales for {formatMonthTitle(selectedMonth)}
                    </p>
                  </div>
                </div>

                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('load')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-950 cursor-pointer self-start sm:self-auto"
                  >
                    <span>View Load Register</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 3 Core KPI Cards for Load Load */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Monthly Opening Balance */}
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-900 block">
                    Monthly Total Opening Balance
                  </span>
                  <div className="mt-2 text-2xl font-black font-mono text-amber-950">
                    {formatPKR(monthlyLoadData.totalOpening)}
                  </div>
                  <div className="mt-2 pt-2 border-t border-amber-200/60 grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px] font-mono text-slate-600">
                    <div>
                      <span className="block text-red-700 font-semibold">Jazz:</span>
                      <span>{formatPKR(monthlyLoadData.jazzOpeningSum)}</span>
                    </div>
                    <div>
                      <span className="block text-sky-700 font-semibold">Telenor:</span>
                      <span>{formatPKR(monthlyLoadData.telenorOpeningSum)}</span>
                    </div>
                    <div>
                      <span className="block text-emerald-700 font-semibold">Zong:</span>
                      <span>{formatPKR(monthlyLoadData.zongOpeningSum)}</span>
                    </div>
                    <div>
                      <span className="block text-amber-700 font-semibold">Ufone:</span>
                      <span>{formatPKR(monthlyLoadData.ufoneOpeningSum)}</span>
                    </div>
                  </div>
                </div>

                {/* Total Monthly Closing Balance */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
                    Monthly Total Closing Balance
                  </span>
                  <div className="mt-2 text-2xl font-black font-mono text-slate-900">
                    {formatPKR(monthlyLoadData.totalClosing)}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px] font-mono text-slate-600">
                    <div>
                      <span className="block text-red-700 font-semibold">Jazz:</span>
                      <span>{formatPKR(monthlyLoadData.jazzClosingSum)}</span>
                    </div>
                    <div>
                      <span className="block text-sky-700 font-semibold">Telenor:</span>
                      <span>{formatPKR(monthlyLoadData.telenorClosingSum)}</span>
                    </div>
                    <div>
                      <span className="block text-emerald-700 font-semibold">Zong:</span>
                      <span>{formatPKR(monthlyLoadData.zongClosingSum)}</span>
                    </div>
                    <div>
                      <span className="block text-amber-700 font-semibold">Ufone:</span>
                      <span>{formatPKR(monthlyLoadData.ufoneClosingSum)}</span>
                    </div>
                  </div>
                </div>

                {/* TOTAL SALE OF LOAD (Customer topups & packages) */}
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-900 block">
                      Total Sale of Load (Month)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                      {monthlyLoadData.totalTxsCount} Top-ups
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-black font-mono text-amber-950">
                    {formatPKR(monthlyLoadData.totalLoadSales)}
                  </div>
                  <div className="mt-2 pt-2 border-t border-amber-200 flex items-center justify-between text-xs text-amber-900 font-mono">
                    <span>Reconciliation Variance:</span>
                    <span
                      className={`font-bold ${
                        monthlyLoadData.netDifference >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {monthlyLoadData.netDifference > 0 ? '+' : ''}
                      {formatPKR(monthlyLoadData.netDifference)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Load Sales by Network Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-red-50/60 border border-red-200">
                  <div className="text-[11px] font-bold text-red-800">Jazz / Warid Load Sale</div>
                  <div className="text-base font-black font-mono text-red-900 mt-1">
                    {formatPKR(monthlyLoadData.networkSales.JAZZ_WARID)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-sky-50/60 border border-sky-200">
                  <div className="text-[11px] font-bold text-sky-800">Telenor Load Sale</div>
                  <div className="text-base font-black font-mono text-sky-900 mt-1">
                    {formatPKR(monthlyLoadData.networkSales.TELENOR)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
                  <div className="text-[11px] font-bold text-emerald-800">Zong Load Sale</div>
                  <div className="text-base font-black font-mono text-emerald-900 mt-1">
                    {formatPKR(monthlyLoadData.networkSales.ZONG)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200">
                  <div className="text-[11px] font-bold text-amber-800">Ufone Load Sale</div>
                  <div className="text-base font-black font-mono text-amber-900 mt-1">
                    {formatPKR(monthlyLoadData.networkSales.UFONE)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW MODE 2: ALL MONTHS COMPARATIVE TABLE */}
      {/* ===================================================================== */}
      {activeReportTab === 'ALL_MONTHS_TABLE' && (
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                All Months Financial Comparison
              </h3>
              <p className="text-xs text-slate-500">
                Side-by-side monthly history of Items Sales &amp; Profit, EP &amp; JC Balances, and Load Sales
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-base">
              <thead className="bg-slate-50/90 text-slate-800 font-bold uppercase text-sm tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-4 px-4 font-black text-slate-950">Month</th>
                  {/* 1. Items */}
                  <th className="py-4 px-3 text-purple-900 font-bold border-l border-slate-200">Items Sales</th>
                  <th className="py-4 px-3 text-purple-900">Items Sold</th>
                  <th className="py-4 px-3 text-emerald-700 font-bold">Items Profit</th>
                  {/* 2. EP & JC */}
                  <th className="py-4 px-3 text-blue-900 font-bold border-l border-slate-200">EP/JC Opening</th>
                  <th className="py-4 px-3 text-blue-900">EP/JC Closing</th>
                  <th className="py-4 px-3 text-blue-900 font-bold">EP/JC Profit</th>
                  {/* 3. Load */}
                  <th className="py-4 px-3 text-amber-900 font-bold border-l border-slate-200">Load Opening</th>
                  <th className="py-4 px-3 text-amber-900">Load Closing</th>
                  <th className="py-4 px-3 text-amber-950 font-bold">Total Sale (Load)</th>
                  {/* Total Combined */}
                  <th className="py-4 px-4 text-right font-black text-emerald-800 border-l border-slate-200 bg-emerald-50/50">
                    Combined Net Profit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {allMonthsComparativeList.map((row) => (
                  <tr
                    key={row.month}
                    onClick={() => {
                      setSelectedMonth(row.month);
                      setActiveReportTab('MONTHLY_DETAIL');
                    }}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-sans font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{row.monthName}</span>
                      </div>
                    </td>

                    {/* 1. Items */}
                    <td className="py-3 px-3 font-semibold text-purple-900 border-l border-slate-100 whitespace-nowrap">
                      {formatPKR(row.itemsSalesRevenue)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {row.itemsSoldUnits} units
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-700 whitespace-nowrap">
                      +{formatPKR(row.itemsProfit)}
                    </td>

                    {/* 2. EP & JC */}
                    <td className="py-3 px-3 text-slate-600 border-l border-slate-100 whitespace-nowrap">
                      {formatPKR(row.epJcOpening)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {formatPKR(row.epJcClosing)}
                    </td>
                    <td
                      className={`py-3 px-3 font-bold whitespace-nowrap ${
                        row.epJcProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {row.epJcProfit > 0 ? '+' : ''}
                      {formatPKR(row.epJcProfit)}
                    </td>

                    {/* 3. Load */}
                    <td className="py-3 px-3 text-slate-600 border-l border-slate-100 whitespace-nowrap">
                      {formatPKR(row.loadOpening)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {formatPKR(row.loadClosing)}
                    </td>
                    <td className="py-3 px-3 font-bold text-amber-900 whitespace-nowrap">
                      {formatPKR(row.loadTotalSales)}
                    </td>

                    {/* Combined Net Profit */}
                    <td className="py-3 px-4 text-right font-black border-l border-slate-100 bg-emerald-50/30 whitespace-nowrap">
                      <span className={row.combinedProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {row.combinedProfit > 0 ? '+' : ''}
                        {formatPKR(row.combinedProfit)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 italic">
            Click on any month in the table to inspect detailed item-by-item sales, EP &amp; JC cash registers, and network load sales.
          </p>
        </div>
      )}
    </div>
  );
};
