import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Wallet,
  Plus,
  Trash2,
  Calendar,
  Filter,
  Printer,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  Tag,
  Clock,
  Building,
  CreditCard,
  Layers,
  CalendarDays,
  CalendarRange,
  ListOrdered,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  X,
} from 'lucide-react';
import { ExpenseItem, ExpensePaymentMethod, AuthUser, StoreSettings } from '../types';
import { formatPKR } from '../utils/currency';

interface ExpensesProps {
  expenses: ExpenseItem[];
  currentUser: AuthUser | null;
  storeSettings?: StoreSettings;
  onRefresh: () => void;
  onSaveDailyExpenses: (
    date: string,
    items: Array<{
      id?: string;
      amount: number;
      reason: string;
      category?: string;
      paymentMethod?: ExpensePaymentMethod;
      notes?: string;
      time?: string;
    }>
  ) => Promise<ExpenseItem[]>;
  onDeleteExpense: (id: string) => Promise<boolean>;
  onDeleteDailyExpenses: (date: string) => Promise<boolean>;
}

// Specified Expense Categories
const EXPENSE_CATEGORIES = [
  'Easy Paisa / Jazz Cash',
  'Load Service',
  'Personal',
];

interface RepeaterRow {
  id?: string;
  reason: string;
  amount: number | '';
  category: string;
  paymentMethod?: ExpensePaymentMethod;
  time?: string;
}

export const Expenses: React.FC<ExpensesProps> = ({
  expenses,
  currentUser,
  storeSettings,
  onRefresh,
  onSaveDailyExpenses,
  onDeleteExpense,
  onDeleteDailyExpenses,
}) => {
  // Navigation / Mode state
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('daily');

  // Today string YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = useMemo(() => getTodayStr(), []);

  // Selected date for the Daily Expense Repeater
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Repeater rows for the selected date
  const [repeaterRows, setRepeaterRows] = useState<RepeaterRow[]>([
    { reason: '', amount: '', category: 'Easy Paisa / Jazz Cash', paymentMethod: 'CASH' },
  ]);

  // Status message for save feedback
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filter State ("From Date" -> "To Date")
  const [filterFromDate, setFilterFromDate] = useState<string>(() => {
    // Default to start of current month
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [filterToDate, setFilterToDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Print Slip Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printScope, setPrintScope] = useState<'daily' | 'range'>('daily');

  // Single Item Edit Modal
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);

  // Sync repeater rows when selectedDate or expenses changes
  useEffect(() => {
    const dayItems = expenses.filter((e) => e.date === selectedDate);
    if (dayItems.length > 0) {
      setRepeaterRows(
        dayItems.map((it) => ({
          id: it.id,
          reason: it.reason,
          amount: it.amount,
          category: it.category || 'Easy Paisa / Jazz Cash',
          paymentMethod: it.paymentMethod || 'CASH',
          time: it.time,
        }))
      );
    } else {
      // Start with 1 empty row ready for entry
      setRepeaterRows([
        { reason: '', amount: '', category: 'Easy Paisa / Jazz Cash', paymentMethod: 'CASH' },
      ]);
    }
  }, [selectedDate, expenses]);

  // Set print-modal-active on document.body when print slip modal is open
  useEffect(() => {
    if (isPrintModalOpen) {
      document.body.classList.add('print-modal-active');
      return () => {
        document.body.classList.remove('print-modal-active');
      };
    }
  }, [isPrintModalOpen]);

  // Navigate Days
  const handleShiftDate = (offsetDays: number) => {
    const cur = new Date(selectedDate + 'T00:00:00');
    cur.setDate(cur.getDate() + offsetDays);
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // Repeater row handlers
  const handleAddRow = (initialData?: Partial<RepeaterRow>) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setRepeaterRows((prev) => [
      ...prev,
      {
        reason: initialData?.reason || '',
        amount: initialData?.amount !== undefined ? initialData.amount : '',
        category: initialData?.category || 'Easy Paisa / Jazz Cash',
        paymentMethod: initialData?.paymentMethod || 'CASH',
        time: timeStr,
      },
    ]);
  };

  const handleUpdateRow = (index: number, field: keyof RepeaterRow, value: any) => {
    setRepeaterRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveRow = (index: number) => {
    setRepeaterRows((prev) => {
      const copy = prev.filter((_, idx) => idx !== index);
      return copy.length > 0
        ? copy
        : [{ reason: '', amount: '', category: 'Easy Paisa / Jazz Cash', paymentMethod: 'CASH' }];
    });
  };

  // Real-time Total Day Expense calculation
  const totalDayExpense = useMemo(() => {
    return repeaterRows.reduce((sum, row) => {
      const val = typeof row.amount === 'number' ? row.amount : parseFloat(row.amount) || 0;
      return sum + Math.max(0, val);
    }, 0);
  }, [repeaterRows]);

  // Valid rows count
  const validRowCount = useMemo(() => {
    return repeaterRows.filter(
      (r) => (typeof r.amount === 'number' && r.amount > 0) || (r.reason && r.reason.trim().length > 0)
    ).length;
  }, [repeaterRows]);

  // Save Daily Expenses
  const handleSaveDailyExpenses = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      const itemsToSave = repeaterRows
        .filter(
          (r) =>
            (typeof r.amount === 'number' && r.amount > 0) ||
            (typeof r.amount === 'string' && parseFloat(r.amount) > 0) ||
            (r.reason && r.reason.trim().length > 0)
        )
        .map((r) => ({
          id: r.id,
          amount: typeof r.amount === 'number' ? r.amount : parseFloat(r.amount) || 0,
          reason: r.reason.trim() || 'Unspecified Expense',
          category: r.category,
          paymentMethod: r.paymentMethod,
          time: r.time,
        }));

      await onSaveDailyExpenses(selectedDate, itemsToSave);
      setSaveSuccessMsg(`Expenses for ${selectedDate} saved! Total: ${formatPKR(totalDayExpense)}`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to save expenses: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // KPI Calculations: Today, This Week, This Month, Filtered Range
  const todayExpensesList = useMemo(() => {
    return expenses.filter((e) => e.date === todayStr);
  }, [expenses, todayStr]);

  const todayTotal = useMemo(() => {
    return todayExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [todayExpensesList]);

  // This Week Expenses (Monday to Sunday)
  const { thisWeekTotal, thisWeekRangeStr, thisWeekExpenses } = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
    // Calculate Monday
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    mon.setHours(0, 0, 0, 0);

    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);

    const monStr = mon.toISOString().split('T')[0];
    const sunStr = sun.toISOString().split('T')[0];

    const weekList = expenses.filter((e) => e.date >= monStr && e.date <= sunStr);
    const sum = weekList.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    return {
      thisWeekTotal: sum,
      thisWeekRangeStr: `${monStr} to ${sunStr}`,
      thisWeekExpenses: weekList,
    };
  }, [expenses]);

  // This Month Expenses
  const { thisMonthTotal, thisMonthName, thisMonthExpenses } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${y}-${m}`;

    const monthList = expenses.filter((e) => e.date.startsWith(prefix));
    const sum = monthList.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    return {
      thisMonthTotal: sum,
      thisMonthName: monthName,
      thisMonthExpenses: monthList,
    };
  }, [expenses]);

  // Filtered Expenses according to "From Date" -> "To Date" + Category + Search Query
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // Date filter
      if (filterFromDate && e.date < filterFromDate) return false;
      if (filterToDate && e.date > filterToDate) return false;

      // Category filter
      if (selectedCategoryFilter !== 'ALL' && e.category !== selectedCategoryFilter) {
        return false;
      }

      // Search query filter (reason or category or recordedBy or date)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchReason = (e.reason || '').toLowerCase().includes(q);
        const matchCat = (e.category || '').toLowerCase().includes(q);
        const matchUser = (e.recordedBy || '').toLowerCase().includes(q);
        const matchDate = (e.date || '').includes(q);
        if (!matchReason && !matchCat && !matchUser && !matchDate) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, filterFromDate, filterToDate, selectedCategoryFilter, searchQuery]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  // Quick Preset Filters
  const applyPresetFilter = (preset: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'all') => {
    const now = new Date();
    const today = getTodayStr();

    if (preset === 'today') {
      setFilterFromDate(today);
      setFilterToDate(today);
    } else if (preset === 'yesterday') {
      const yDate = new Date();
      yDate.setDate(yDate.getDate() - 1);
      const yStr = yDate.toISOString().split('T')[0];
      setFilterFromDate(yStr);
      setFilterToDate(yStr);
    } else if (preset === 'this_week') {
      const dayOfWeek = now.getDay();
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diffToMon);
      setFilterFromDate(mon.toISOString().split('T')[0]);
      setFilterToDate(today);
    } else if (preset === 'last_week') {
      const dayOfWeek = now.getDay();
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const lastMon = new Date(now);
      lastMon.setDate(now.getDate() + diffToMon - 7);
      const lastSun = new Date(lastMon);
      lastSun.setDate(lastMon.getDate() + 6);
      setFilterFromDate(lastMon.toISOString().split('T')[0]);
      setFilterToDate(lastSun.toISOString().split('T')[0]);
    } else if (preset === 'this_month') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      setFilterFromDate(`${y}-${m}-01`);
      setFilterToDate(today);
    } else if (preset === 'last_month') {
      const lastMDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const y = lastMDate.getFullYear();
      const m = String(lastMDate.getMonth() + 1).padStart(2, '0');
      const endD = String(lastMEnd.getDate()).padStart(2, '0');
      setFilterFromDate(`${y}-${m}-01`);
      setFilterToDate(`${y}-${m}-${endD}`);
    } else if (preset === 'all') {
      setFilterFromDate('2026-01-01');
      setFilterToDate(today);
    }
  };

  // Group weekly data for the Weekly View
  const weeklyGroups = useMemo(() => {
    const groups: Record<string, { weekLabel: string; startDate: string; endDate: string; total: number; items: ExpenseItem[] }> = {};

    expenses.forEach((e) => {
      const itemDate = new Date(e.date + 'T00:00:00');
      if (isNaN(itemDate.getTime())) return;

      const dayOfWeek = itemDate.getDay();
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const mon = new Date(itemDate);
      mon.setDate(itemDate.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);

      const monStr = mon.toISOString().split('T')[0];
      const sunStr = sun.toISOString().split('T')[0];
      const key = `${monStr}_${sunStr}`;

      if (!groups[key]) {
        groups[key] = {
          weekLabel: `${mon.toLocaleDateString('default', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`,
          startDate: monStr,
          endDate: sunStr,
          total: 0,
          items: [],
        };
      }

      groups[key].total += Number(e.amount) || 0;
      groups[key].items.push(e);
    });

    return Object.values(groups).sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [expenses]);

  // Group monthly data for the Monthly View
  const monthlyGroups = useMemo(() => {
    const groups: Record<string, { monthKey: string; monthLabel: string; total: number; items: ExpenseItem[] }> = {};

    expenses.forEach((e) => {
      const monthKey = e.date.substring(0, 7); // YYYY-MM
      if (!groups[monthKey]) {
        const d = new Date(e.date + 'T00:00:00');
        const monthLabel = !isNaN(d.getTime())
          ? d.toLocaleDateString('default', { month: 'long', year: 'numeric' })
          : monthKey;

        groups[monthKey] = {
          monthKey,
          monthLabel,
          total: 0,
          items: [],
        };
      }

      groups[monthKey].total += Number(e.amount) || 0;
      groups[monthKey].items.push(e);
    });

    return Object.values(groups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [expenses]);

  // Export filtered expenses to CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Time', 'Reason / Where Used', 'Category', 'Expense Value (PKR)', 'Recorded By'];
    const rows = filteredExpenses.map((e) => [
      e.date,
      e.time || '',
      `"${(e.reason || '').replace(/"/g, '""')}"`,
      `"${(e.category || '').replace(/"/g, '""')}"`,
      e.amount,
      `"${(e.recordedBy || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expenses_${filterFromDate}_to_${filterToDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Launch Thermal or Standard Print
  const handlePrintExpenses = (scope: 'daily' | 'range') => {
    setPrintScope(scope);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & MAIN NAVIGATION TABS                     */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
            <Wallet className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Daily Shop &amp; Business Expenses</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Record daily expenses with repeater rows, track reason &amp; cost, view per-week &amp; per-month totals.
            </p>
          </div>
        </div>

        {/* View Switcher: Daily Entry | Per Week | Per Month | Date Range Filter */}
        <div className="flex items-center flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
          <button
            type="button"
            onClick={() => setActiveSubTab('daily')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'daily'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            <span>Daily Entry &amp; Repeater</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('weekly')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'weekly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CalendarRange className="w-4 h-4 text-indigo-600" />
            <span>Per Week Expense</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('monthly')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'monthly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-600" />
            <span>Per Month Expense</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Filter className="w-4 h-4 text-rose-600" />
            <span>Date Range Filter</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. STAT / KPI CARDS (Today, This Week, This Month, Filter) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Expense */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Today's Expense</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {formatPKR(todayTotal)}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {todayExpensesList.length} items
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Date: <strong className="text-slate-700 font-mono">{todayStr}</strong>
          </div>
        </div>

        {/* Card 2: Per Week Expense */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>This Week's Expense</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <CalendarRange className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-indigo-950 font-mono tracking-tight">
              {formatPKR(thisWeekTotal)}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono">
              {thisWeekExpenses.length} items
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium truncate" title={thisWeekRangeStr}>
            Week: <strong className="text-slate-700 font-mono">{thisWeekRangeStr}</strong>
          </div>
        </div>

        {/* Card 3: Per Month Expense */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>This Month's Expense</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-950 font-mono tracking-tight">
              {formatPKR(thisMonthTotal)}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-mono">
              {thisMonthExpenses.length} items
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Month: <strong className="text-slate-700">{thisMonthName}</strong>
          </div>
        </div>

        {/* Card 4: Date Filter Range Total */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Range Filter Total</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
              <Filter className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-950 font-mono tracking-tight">
              {formatPKR(filteredTotal)}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-mono">
              {filteredExpenses.length} records
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium truncate">
            From: <strong className="text-slate-700 font-mono">{filterFromDate}</strong> to <strong className="text-slate-700 font-mono">{filterToDate}</strong>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. SUBTAB CONTENT                                         */}
      {/* ========================================================= */}

      {/* --------------------------------------------------------- */}
      {/* SUBTAB 1: DAILY ENTRY & REPEATER                          */}
      {/* --------------------------------------------------------- */}
      {activeSubTab === 'daily' && (
        <div className="space-y-6">
          {/* Day Navigation & Calendar Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleShiftDate(-1)}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-900 font-mono focus:outline-hidden cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => handleShiftDate(1)}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedDate === todayStr
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Today
              </button>
            </div>

            {/* Quick Actions & Day Total Indicator */}
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-white flex items-center gap-2 shadow-2xs">
                <span className="text-[11px] font-bold uppercase text-slate-300">Total Day Expense:</span>
                <span className="font-mono font-extrabold text-sm text-emerald-400">
                  {formatPKR(totalDayExpense)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handlePrintExpenses('daily')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                title="Print slip for selected date"
              >
                <Printer className="w-4 h-4 text-slate-700" />
                <span>Print Day Slip</span>
              </button>
            </div>
          </div>

          {/* REPEATER FORM SECTION */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-emerald-600" />
                  <span>Daily Expense Repeater for {selectedDate}</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Add more than 1 expense using repeater rows. Enter Expense Value and Reason for where the amount was used.
                </p>
              </div>

              {/* Status Message */}
              {saveSuccessMsg && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold animate-fadeIn">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* Repeater Rows Table / List */}
            <div className="p-4 sm:p-5 space-y-3">
              {repeaterRows.map((row, idx) => {
                const rowAmount = typeof row.amount === 'number' ? row.amount : parseFloat(row.amount) || 0;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3"
                  >
                    {/* Index Badge */}
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0 font-mono">
                      #{idx + 1}
                    </div>

                    {/* 1. Reason / Where Amount Is Used */}
                    <div className="flex-1 min-w-[220px]">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Reason / Where That Amount Is Used <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={row.reason}
                        onChange={(e) => handleUpdateRow(idx, 'reason', e.target.value)}
                        placeholder="e.g. Daily shop expenditure, utility bill, transfer, lunch..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    {/* 2. Expense Value (Amount in PKR) */}
                    <div className="w-full sm:w-48">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Expense Value (PKR) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                          Rs.
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={row.amount}
                          onChange={(e) =>
                            handleUpdateRow(
                              idx,
                              'amount',
                              e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="0"
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                    </div>

                    {/* 3. Category */}
                    <div className="w-full sm:w-56">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={row.category}
                        onChange={(e) => handleUpdateRow(idx, 'category', e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
                      >
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Delete Row Button */}
                    <div className="pt-4 sm:pt-4 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={repeaterRows.length === 1 && !row.reason && row.amount === ''}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Remove expense row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Action Bar: Add Row & Prominent Day Total */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => handleAddRow()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-emerald-600 bg-slate-50 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-900 text-xs font-bold transition-all shadow-2xs cursor-pointer w-full sm:w-auto justify-center"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>+ Add Another Expense</span>
                </button>

                {/* Prominent Total Day Expense Callout */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Total Day Expense
                    </span>
                    <span className="text-2xl font-black font-mono text-slate-950 tracking-tight">
                      {formatPKR(totalDayExpense)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveDailyExpenses}
                    disabled={isSaving || validRowCount === 0}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{isSaving ? 'Saving...' : `Save Expenses for ${selectedDate}`}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SAVED EXPENSES HISTORY FOR THIS DAY */}
          {(() => {
            const savedDayExpenses = expenses.filter((e) => e.date === selectedDate);
            if (savedDayExpenses.length === 0) return null;

            return (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Saved Records for {selectedDate} ({savedDayExpenses.length} entries)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(`Are you sure you want to delete all expenses for ${selectedDate}?`)) {
                        await onDeleteDailyExpenses(selectedDate);
                        onRefresh();
                      }
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                  >
                    Delete All for this Day
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Reason / Purpose</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Expense Value</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {savedDayExpenses.map((it, idx) => (
                        <tr key={it.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono font-semibold text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">{it.time || '--:--'}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{it.reason}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {it.category || 'Personal'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-black text-slate-950 text-sm">
                            {formatPKR(it.amount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Delete expense "${it.reason}"?`)) {
                                  await onDeleteExpense(it.id);
                                  onRefresh();
                                }
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete this expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase text-slate-700">
                          Total Day Expense:
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-base text-slate-950">
                          {formatPKR(savedDayExpenses.reduce((s, it) => s + (Number(it.amount) || 0), 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* SUBTAB 2: PER WEEK EXPENSE VIEW                           */}
      {/* --------------------------------------------------------- */}
      {activeSubTab === 'weekly' && (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-indigo-600" />
                <span>Per Week Expense Breakdown</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Weekly expenditure aggregated by week (Monday to Sunday) with daily breakdowns.
              </p>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold">
              Current Week: <span className="font-mono text-sm">{formatPKR(thisWeekTotal)}</span>
            </div>
          </div>

          {weeklyGroups.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No weekly expense records found. Start adding daily expenses in the Daily Entry tab.
            </div>
          ) : (
            <div className="space-y-4">
              {weeklyGroups.map((grp, idx) => {
                const avgPerDay = grp.total / 7;
                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 hover:border-slate-300 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                          W
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{grp.weekLabel}</h3>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {grp.startDate} to {grp.endDate} • {grp.items.length} expense items
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Weekly Total</span>
                          <span className="text-xl font-black font-mono text-indigo-950">
                            {formatPKR(grp.total)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterFromDate(grp.startDate);
                            setFilterToDate(grp.endDate);
                            setActiveSubTab('all');
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </div>

                    {/* Quick Preview of items in this week */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {grp.items.slice(0, 6).map((it, iIdx) => (
                        <div
                          key={iIdx}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-slate-900 truncate">{it.reason}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{it.date}</div>
                          </div>
                          <span className="font-mono font-bold text-slate-950 shrink-0">
                            {formatPKR(it.amount)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {grp.items.length > 6 && (
                      <div className="text-center text-[11px] text-slate-500 font-semibold pt-1">
                        + {grp.items.length - 6} more expenses in this week. Click "View Details" to see full list.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* SUBTAB 3: PER MONTH EXPENSE VIEW                          */}
      {/* --------------------------------------------------------- */}
      {activeSubTab === 'monthly' && (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                <span>Per Month Expense Breakdown</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Monthly totals, category distribution, and daily expense averages.
              </p>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
              Current Month: <span className="font-mono text-sm">{formatPKR(thisMonthTotal)}</span>
            </div>
          </div>

          {monthlyGroups.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No monthly expense records found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {monthlyGroups.map((grp, idx) => {
                // Category breakdown for this month
                const catMap: Record<string, number> = {};
                grp.items.forEach((it) => {
                  const c = it.category || 'Personal';
                  catMap[c] = (catMap[c] || 0) + (Number(it.amount) || 0);
                });

                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
                            M
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">{grp.monthLabel}</h3>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {grp.items.length} expenses recorded
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Month Total</span>
                          <span className="text-xl font-black font-mono text-amber-950">
                            {formatPKR(grp.total)}
                          </span>
                        </div>
                      </div>

                      {/* Category Breakdown */}
                      <div className="pt-3 space-y-2">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                          Top Categories in {grp.monthLabel}
                        </span>
                        <div className="space-y-1.5">
                          {Object.entries(catMap)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 4)
                            .map(([cat, val], cIdx) => {
                              const pct = Math.round((val / grp.total) * 100);
                              return (
                                <div key={cIdx} className="space-y-1">
                                  <div className="flex justify-between text-xs font-semibold text-slate-800">
                                    <span>{cat}</span>
                                    <span className="font-mono">{formatPKR(val)} ({pct}%)</span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                      className="h-full bg-amber-500 rounded-full"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        Avg / Day: <strong className="font-mono text-slate-800">{formatPKR(grp.total / 30)}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const y = grp.monthKey.split('-')[0];
                          const m = grp.monthKey.split('-')[1];
                          setFilterFromDate(`${y}-${m}-01`);
                          // Last day of month
                          const lastD = new Date(parseInt(y), parseInt(m), 0).getDate();
                          setFilterToDate(`${y}-${m}-${String(lastD).padStart(2, '0')}`);
                          setActiveSubTab('all');
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Filter this Month
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* SUBTAB 4: ALL EXPENSES & DATE RANGE FILTER                */}
      {/* --------------------------------------------------------- */}
      {activeSubTab === 'all' && (
        <div className="space-y-6">
          {/* Filter Bar with "From Date" -> "To Date" */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-rose-600" />
                  <span>Custom Date Range Filter</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Select a "From Date" and "To Date" to check expenses for any specific period.
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPresetFilter('today')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetFilter('yesterday')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetFilter('this_week')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetFilter('last_week')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Last Week
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetFilter('this_month')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetFilter('last_month')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetFilter('all')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  All Time
                </button>
              </div>
            </div>

            {/* From Date -> To Date Inputs and Search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 items-end">
              {/* From Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-rose-600" />
                  <span>From Date</span>
                </label>
                <input
                  type="date"
                  value={filterFromDate}
                  onChange={(e) => setFilterFromDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 font-mono bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
                />
              </div>

              {/* To Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-rose-600" />
                  <span>To Date</span>
                </label>
                <input
                  type="date"
                  value={filterToDate}
                  onChange={(e) => setFilterToDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 font-mono bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
                />
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Category</span>
                </label>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search by Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  <span>Search Reason</span>
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. tea, rent, electricity..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Filter Result Banner */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-300">
                  Showing Expenses from <span className="text-emerald-400 font-mono font-black">{filterFromDate || 'Start'}</span> to <span className="text-emerald-400 font-mono font-black">{filterToDate || 'Today'}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {filteredExpenses.length} matching expense transactions found
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total In Range</span>
                  <span className="text-xl font-black font-mono text-emerald-400">
                    {formatPKR(filteredTotal)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handlePrintExpenses('range')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Print Report</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filtered Expenses Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No expenses match the selected date range ({filterFromDate} to {filterToDate}). Try picking different dates.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Reason / Where Used</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Recorded By</th>
                      <th className="px-4 py-3 text-right">Expense Value</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{it.date}</td>
                        <td className="px-4 py-3 font-mono text-slate-500">{it.time || '--:--'}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{it.reason}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {it.category || 'Personal'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{it.recordedBy || 'Admin'}</td>
                        <td className="px-4 py-3 text-right font-mono font-black text-slate-950 text-sm">
                          {formatPKR(it.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`Delete expense "${it.reason}" on ${it.date}?`)) {
                                await onDeleteExpense(it.id);
                                onRefresh();
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete this expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={5} className="px-4 py-3.5 text-right text-xs uppercase text-slate-800 font-bold">
                        Total Range Expense ({filterFromDate} to {filterToDate}):
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-black text-base text-slate-950">
                        {formatPKR(filteredTotal)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. PRINT SLIP MODAL (Zero margins, 80mm/58mm/A4 compatible)*/}
      {/* ========================================================= */}
      {isPrintModalOpen &&
        createPortal(
          <div
            id="printable-expense-slip-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto printable-modal-overlay"
          >
            {/* Zero Margin Print Style */}
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
                #printable-expense-slip-modal {
                  position: static !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  display: block !important;
                }
                #printable-expense-card {
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
              id="printable-expense-card"
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden my-4 printable-modal-card print:m-0 print:p-0 print:border-none print:shadow-none print:w-full"
            >
            {/* Modal Header (Hidden in Print) */}
            <div className="bg-slate-900 text-white px-4 py-3 print:hidden flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs uppercase tracking-wider">
                  {printScope === 'daily' ? `Expense Slip: ${selectedDate}` : `Expense Report: ${filterFromDate} to ${filterToDate}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Print Slip
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Slip Content */}
            <div className="p-4 sm:p-5 text-slate-950 font-sans print:p-1 text-xs space-y-3">
              {/* Slip Header */}
              <div className="text-center pb-2 border-b border-slate-300 print:border-black space-y-0.5">
                <h3 className="font-black text-sm uppercase tracking-wide">
                  {storeSettings?.brandName || 'OBAID ELECTRONICS & MOBILE CARE'}
                </h3>
                <p className="text-[10px] text-slate-600 print:text-black">
                  {storeSettings?.address || 'Main Commercial Market'}
                </p>
                <p className="text-[10px] font-mono font-semibold">
                  {storeSettings?.phoneNumber || '+92 300 1234567'}
                </p>
                <div className="pt-1 text-[11px] font-bold uppercase tracking-wider bg-slate-100 print:bg-transparent py-0.5 rounded">
                  *** {printScope === 'daily' ? 'DAILY EXPENSE SLIP' : 'EXPENSE AUDIT REPORT'} ***
                </div>
              </div>

              {/* Meta Info */}
              <div className="text-[10px] space-y-0.5 py-1 border-b border-dashed border-slate-300 print:border-black">
                {printScope === 'daily' ? (
                  <div className="flex justify-between">
                    <span>Date: <strong className="font-mono">{selectedDate}</strong></span>
                    <span>Total Items: <strong className="font-mono">{repeaterRows.length}</strong></span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>From: <strong className="font-mono">{filterFromDate}</strong></span>
                      <span>To: <strong className="font-mono">{filterToDate}</strong></span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Items: <strong className="font-mono">{filteredExpenses.length}</strong></span>
                      <span>Category: <strong className="font-mono">{selectedCategoryFilter}</strong></span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span>Auditor / Cashier: <strong>{currentUser?.name || 'Obaid'}</strong></span>
                  <span>Printed: <strong>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <table className="w-full text-[10px] text-left">
                  <thead className="border-b border-slate-300 print:border-black font-bold uppercase">
                    <tr>
                      <th className="py-1">Reason / Purpose</th>
                      <th className="py-1 text-right">Value (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-black">
                    {printScope === 'daily'
                      ? repeaterRows
                          .filter((r) => Number(r.amount) > 0 || (r.reason && r.reason.trim().length > 0))
                          .map((r, rIdx) => (
                            <tr key={rIdx}>
                              <td className="py-1 pr-2">
                                <span className="font-semibold block">{r.reason || 'Expense'}</span>
                                <span className="text-[9px] text-slate-500 print:text-black font-mono">
                                  {r.category}
                                </span>
                              </td>
                              <td className="py-1 text-right font-mono font-bold whitespace-nowrap">
                                {formatPKR(typeof r.amount === 'number' ? r.amount : parseFloat(r.amount) || 0)}
                              </td>
                            </tr>
                          ))
                      : filteredExpenses.map((it, itIdx) => (
                          <tr key={itIdx}>
                            <td className="py-1 pr-2">
                              <span className="font-semibold block">{it.reason}</span>
                              <span className="text-[9px] text-slate-500 print:text-black font-mono">
                                {it.date} • {it.category}
                              </span>
                            </td>
                            <td className="py-1 text-right font-mono font-bold whitespace-nowrap">
                              {formatPKR(it.amount)}
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>

              {/* Total Callout */}
              <div className="pt-2 border-t-2 border-slate-900 print:border-black space-y-1">
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>Total Number of Expenses:</span>
                  <span className="font-mono">
                    {printScope === 'daily'
                      ? repeaterRows.filter((r) => Number(r.amount) > 0 || (r.reason && r.reason.trim().length > 0)).length
                      : filteredExpenses.length}
                  </span>
                </div>
                <div className="flex items-center justify-between font-black text-sm pt-1 border-t border-slate-300 print:border-black">
                  <span>TOTAL EXPENSE:</span>
                  <span className="font-mono text-base">
                    {formatPKR(printScope === 'daily' ? totalDayExpense : filteredTotal)}
                  </span>
                </div>
              </div>

              {/* Slip Footer */}
              <div className="pt-2 text-center text-[9px] text-slate-600 print:text-black border-t border-dashed border-slate-300 print:border-black space-y-0.5">
                <p className="font-bold">*** VERIFIED STORE EXPENSE RECORD ***</p>
                <p>Retain this printed slip for shop accounts &amp; audit reconciliation.</p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
