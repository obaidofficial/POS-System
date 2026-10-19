import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Banknote,
  ShoppingCart,
  Receipt,
  History,
  CalendarCheck,
  ChevronRight,
} from 'lucide-react';
import { Sale } from '../types';
import { formatPKR } from '../utils/currency';
import { ActiveTab } from './Navbar';

interface FinancialPeriodBreakdownProps {
  sales: Sale[];
  onNavigate?: (tab: ActiveTab) => void;
  onOpenNewSale?: () => void;
}

export const FinancialPeriodBreakdown: React.FC<FinancialPeriodBreakdownProps> = ({
  sales,
  onNavigate,
  onOpenNewSale,
}) => {
  // Today's date string in YYYY-MM-DD format
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // State for reference Present Date (defaults to today)
  const [presentDate, setPresentDate] = useState<string>(todayStr);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'present_details' | 'previous_details'>('overview');

  // Human-readable formatted date
  const formattedPresentDate = useMemo(() => {
    try {
      const [y, m, d] = presentDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return presentDate;
    }
  }, [presentDate]);

  const isToday = presentDate === todayStr;

  // Split Sales into Present Date vs Total Previous
  const { presentSales, previousSales } = useMemo(() => {
    const present: Sale[] = [];
    const previous: Sale[] = [];

    sales.forEach((s) => {
      if (s.date === presentDate) {
        present.push(s);
      } else {
        previous.push(s);
      }
    });

    return { presentSales: present, previousSales: previous };
  }, [sales, presentDate]);

  // Cash sales calculations (all sales are cash)
  const presentCashAmount = useMemo(
    () => presentSales.reduce((sum, s) => sum + s.totalAmount, 0),
    [presentSales]
  );
  const previousCashAmount = useMemo(
    () => previousSales.reduce((sum, s) => sum + s.totalAmount, 0),
    [previousSales]
  );
  const totalCashAmount = presentCashAmount + previousCashAmount;

  const presentSalesUnits = useMemo(
    () => presentSales.reduce((sum, s) => sum + s.items.reduce((iSum, line) => iSum + line.quantity, 0), 0),
    [presentSales]
  );
  const previousSalesUnits = useMemo(
    () => previousSales.reduce((sum, s) => sum + s.items.reduce((iSum, line) => iSum + line.quantity, 0), 0),
    [previousSales]
  );
  const totalSalesUnits = presentSalesUnits + previousSalesUnits;

  // Percentage calculations
  const cashPresentPercent = totalCashAmount > 0 ? Math.round((presentCashAmount / totalCashAmount) * 100) : 0;
  const cashPreviousPercent = 100 - cashPresentPercent;

  // Quick preset helper
  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setPresentDate(`${year}-${month}-${day}`);
  };

  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden space-y-0">
      {/* Section Header with Date Selector */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CalendarCheck className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white tracking-tight">
              Cash Sales Breakdown: Present Date vs. Total Previous
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Track daily counter cash revenue and compare against cumulative historical sales
          </p>
        </div>

        {/* Date Selector Controls */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-md border border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400 font-medium">Present Date:</span>
            <input
              id="input-financial-present-date"
              type="date"
              value={presentDate}
              onChange={(e) => e.target.value && setPresentDate(e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded px-2 py-0.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            id="btn-set-present-today"
            onClick={() => setPresentDate(todayStr)}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              isToday
                ? 'bg-emerald-500 text-white font-semibold shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            {isToday ? '● Today (Present)' : 'Today'}
          </button>

          <button
            id="btn-set-present-yesterday"
            onClick={handleSetYesterday}
            className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition-colors"
          >
            Yesterday
          </button>
        </div>
      </div>

      {/* Period Banner Indicator */}
      <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-600 font-medium">
          <span className="flex items-center gap-1.5 text-slate-900 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Present Date: <span className="font-bold">{formattedPresentDate}</span>
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="flex items-center gap-1.5 text-emerald-800">
            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
            Present Date Cash: <strong className="font-mono font-bold tabular-nums text-emerald-700">{formatPKR(presentCashAmount)}</strong>
          </span>
          <span aria-hidden="true" className="text-slate-300 hidden md:inline">·</span>
          <span className="flex items-center gap-1.5 text-slate-700">
            <History className="w-3.5 h-3.5 text-slate-500" />
            Total Previous Cash: <strong className="font-mono font-bold tabular-nums text-slate-900">{formatPKR(previousCashAmount)}</strong>
          </span>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200/80 text-[11px] shadow-2xs">
          <button
            id="btn-subtab-overview"
            onClick={() => setActiveSubTab('overview')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              activeSubTab === 'overview'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Comparative Matrix
          </button>
          <button
            id="btn-subtab-present-details"
            onClick={() => setActiveSubTab('present_details')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              activeSubTab === 'present_details'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Present Date Ledger ({presentSales.length})
          </button>
          <button
            id="btn-subtab-previous-details"
            onClick={() => setActiveSubTab('previous_details')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              activeSubTab === 'previous_details'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Previous History ({previousSales.length})
          </button>
        </div>
      </div>

      {/* MAIN VIEW 1: COMPARATIVE OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="p-5 space-y-6">
          {/* Top 3 Core Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. PRESENT DATE CASH SALES */}
            <div className="rounded-md border border-emerald-200 bg-white shadow-xs overflow-hidden flex flex-col justify-between">
              <div className="p-4 border-b border-slate-100 bg-emerald-50/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Present Date Cash
                    </h3>
                    <p className="text-[11px] text-emerald-700 font-medium">{formattedPresentDate}</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  {cashPresentPercent}% share
                </span>
              </div>

              <div className="p-4 space-y-3 flex-1">
                <div>
                  <div className="text-2xl font-bold font-mono text-emerald-700">
                    {formatPKR(presentCashAmount)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {presentSales.length} cash sale{presentSales.length !== 1 ? 's' : ''} ({presentSalesUnits} unit{presentSalesUnits !== 1 ? 's' : ''})
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Counter register:</span>
                    <span className="font-semibold text-emerald-700">In-hand physical cash</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Record cash counter sale</span>
                <button
                  id="btn-record-cash-sale-shortcut-present"
                  onClick={onOpenNewSale}
                  className="font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
                >
                  <span>+ New Cash Sale</span>
                </button>
              </div>
            </div>

            {/* 2. TOTAL PREVIOUS CASH SALES */}
            <div className="rounded-md border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col justify-between">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Total Previous Cash
                    </h3>
                    <p className="text-[11px] text-slate-500">Prior to {formattedPresentDate}</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {cashPreviousPercent}% share
                </span>
              </div>

              <div className="p-4 space-y-3 flex-1">
                <div>
                  <div className="text-2xl font-bold font-mono text-slate-900">
                    {formatPKR(previousCashAmount)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {previousSales.length} historical sale{previousSales.length !== 1 ? 's' : ''} ({previousSalesUnits} units)
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Archived receipts:</span>
                    <span className="font-semibold text-slate-700">{previousSales.length} invoices</span>
                  </div>
                </div>
              </div>

              {onNavigate && (
                <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Review sales orders</span>
                  <button
                    id="btn-view-sales-from-breakdown"
                    onClick={() => onNavigate('sales')}
                    className="font-medium text-slate-700 hover:text-slate-900 flex items-center gap-0.5"
                  >
                    <span>View All Sales</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* 3. COMBINED TOTAL CASH REVENUE */}
            <div className="rounded-md border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col justify-between">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Total Cash Turnover
                    </h3>
                    <p className="text-[11px] text-slate-500">Combined all-time sales</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {sales.length} total orders
                </span>
              </div>

              <div className="p-4 space-y-3 flex-1">
                <div>
                  <div className="text-2xl font-bold font-mono text-purple-800">
                    {formatPKR(totalCashAmount)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {totalSalesUnits} units sold across all invoices
                  </p>
                </div>

                {/* Visual Proportion Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Present: {cashPresentPercent}%</span>
                    <span>Previous: {cashPreviousPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-md overflow-hidden flex">
                    <div
                      className="bg-emerald-500 transition-all duration-300"
                      style={{ width: `${cashPresentPercent}%` }}
                      title={`Present: ${formatPKR(presentCashAmount)}`}
                    />
                    <div
                      className="bg-slate-400 transition-all duration-300"
                      style={{ width: `${cashPreviousPercent}%` }}
                      title={`Previous: ${formatPKR(previousCashAmount)}`}
                    />
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">100% Cash-only store model</span>
                <span className="font-semibold text-emerald-700">Cash Verified</span>
              </div>
            </div>
          </div>

          {/* Comparative Summary Table (Exact Side-by-Side Breakdown) */}
          <div className="rounded-md border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-700" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Side-by-Side Cash Sales Performance Matrix
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">All figures in Pakistani Rupees (PKR)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-base">
                <thead>
                  <tr className="border-b border-slate-200 bg-white text-sm font-bold text-slate-800 uppercase tracking-wider">
                    <th className="py-4 px-4">Metric</th>
                    <th className="py-4 px-4 bg-emerald-50/50 text-emerald-950 font-bold">
                      Present Date ({formattedPresentDate})
                    </th>
                    <th className="py-4 px-4 bg-slate-50/70 text-slate-900 font-bold">
                      Total Previous (Past History)
                    </th>
                    <th className="py-4 px-4 bg-slate-100/50 text-slate-950 font-black">
                      Combined Total
                    </th>
                    <th className="py-4 px-4 text-center">Present Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-base font-mono">
                  {/* Row 1: Cash Inflow */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-sans font-medium text-slate-900 flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-semibold block">Cash Sales Revenue</span>
                        <span className="text-[11px] text-slate-400 font-sans">
                          Received in counter register
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 bg-emerald-50/40 font-bold text-emerald-700 text-sm">
                      {formatPKR(presentCashAmount)}
                    </td>
                    <td className="py-3 px-4 bg-slate-50/40 font-bold text-slate-900 text-sm">
                      {formatPKR(previousCashAmount)}
                    </td>
                    <td className="py-3 px-4 bg-slate-100/30 font-bold text-slate-900 text-sm">
                      {formatPKR(totalCashAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md font-sans font-semibold text-[11px] bg-emerald-100 text-emerald-800">
                        {cashPresentPercent}%
                      </span>
                    </td>
                  </tr>

                  {/* Row 2: Invoices Count */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-sans font-medium text-slate-900 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-semibold block">Sales Invoices</span>
                        <span className="text-[11px] text-slate-400 font-sans">
                          Customer transactions completed
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 bg-emerald-50/40 font-bold text-slate-900">
                      {presentSales.length} invoice{presentSales.length !== 1 ? 's' : ''}
                    </td>
                    <td className="py-3 px-4 bg-slate-50/40 font-bold text-slate-900">
                      {previousSales.length} invoice{previousSales.length !== 1 ? 's' : ''}
                    </td>
                    <td className="py-3 px-4 bg-slate-100/30 font-bold text-slate-900">
                      {sales.length} invoices total
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md font-sans font-semibold text-[11px] bg-slate-100 text-slate-800">
                        {sales.length > 0 ? Math.round((presentSales.length / sales.length) * 100) : 0}%
                      </span>
                    </td>
                  </tr>

                  {/* Row 3: Units Sold */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-sans font-medium text-slate-900 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-purple-600 shrink-0" />
                      <div>
                        <span className="font-semibold block">Inventory Units Sold</span>
                        <span className="text-[11px] text-slate-400 font-sans">
                          Stock items deducted from PC database
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 bg-emerald-50/40 font-bold text-purple-700">
                      {presentSalesUnits} units
                    </td>
                    <td className="py-3 px-4 bg-slate-50/40 font-bold text-slate-900">
                      {previousSalesUnits} units
                    </td>
                    <td className="py-3 px-4 bg-slate-100/30 font-bold text-slate-900">
                      {totalSalesUnits} units total
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md font-sans font-semibold text-[11px] bg-purple-100 text-purple-800">
                        {totalSalesUnits > 0 ? Math.round((presentSalesUnits / totalSalesUnits) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEW 2: PRESENT DATE DETAILED LEDGER */}
      {activeSubTab === 'present_details' && (
        <div className="p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Present Date Entries: {formattedPresentDate}</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Every cash sale invoice recorded specifically on {presentDate}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-new-sale-present-tab"
                onClick={onOpenNewSale}
                className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>+ Record Sale Today</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar for Present Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-md bg-emerald-50/80 border border-emerald-200">
              <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold uppercase">
                <span className="flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  Present Date Cash Received
                </span>
                <span className="px-1.5 py-0.2 rounded-md bg-emerald-200/70 text-[10px] font-bold">
                  {presentSales.length} receipts
                </span>
              </div>
              <div className="mt-1 font-mono font-bold text-xl text-emerald-800">
                {formatPKR(presentCashAmount)}
              </div>
            </div>

            <div className="p-3.5 rounded-md bg-purple-50/80 border border-purple-200">
              <div className="flex items-center justify-between text-xs text-purple-800 font-semibold uppercase">
                <span className="flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-purple-600" />
                  Items Dispatched Today
                </span>
                <span className="px-1.5 py-0.2 rounded-md bg-purple-200/70 text-[10px] font-bold">
                  {presentSalesUnits} units
                </span>
              </div>
              <div className="mt-1 font-mono font-bold text-xl text-purple-800">
                {presentSalesUnits} <span className="text-xs font-normal text-slate-600">units sold</span>
              </div>
            </div>
          </div>

          {/* Present Date Sales List */}
          <div className="p-4 rounded-md border border-slate-200 bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900 uppercase">
                  Cash Sales Recorded on {formattedPresentDate} ({presentSales.length})
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700">
                {formatPKR(presentCashAmount)}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {presentSales.map((sale) => (
                <div key={sale.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>{sale.customerName}</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Cash
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {sale.invoiceNumber} • {sale.items.length} SKU{sale.items.length !== 1 ? 's' : ''} (
                      {sale.items.reduce((s, i) => s + i.quantity, 0)} units)
                    </div>
                  </div>
                  <div className="font-mono font-bold text-emerald-700 text-sm">
                    {formatPKR(sale.totalAmount)}
                  </div>
                </div>
              ))}

              {presentSales.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No cash sales recorded yet for {formattedPresentDate}.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEW 3: PREVIOUS HISTORY SUMMARY */}
      {activeSubTab === 'previous_details' && (
        <div className="p-5 space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                <span>Total Previous Records (Prior to {formattedPresentDate})</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Cumulative historical cash sales prior to the current selected date
              </p>
            </div>
            <span className="px-3 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-bold">
              {previousSales.length} Historical Sales
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
            <div className="p-4 rounded-md bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold block uppercase">
                Previous Cash Sales Revenue
              </span>
              <span className="text-lg font-bold text-slate-900 font-mono mt-1 block">
                {formatPKR(previousCashAmount)}
              </span>
              <span className="text-[11px] text-slate-500 font-sans">
                {previousSales.length} orders
              </span>
            </div>

            <div className="p-4 rounded-md bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold block uppercase">
                Previous Units Sold
              </span>
              <span className="text-lg font-bold text-purple-700 font-mono mt-1 block">
                {previousSalesUnits} units
              </span>
              <span className="text-[11px] text-slate-500 font-sans">
                Dispatched from inventory
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
