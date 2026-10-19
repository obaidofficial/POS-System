import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  Sparkles,
  Info,
  CheckCircle,
  Radio,
  Coins,
  Plus,
  PlusCircle,
  Receipt,
} from "lucide-react";
import { LoadDailyRecord } from "../types";
import { formatPKR } from "../utils/currency";

interface LoadDailyModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit: LoadDailyRecord | null;
  onSave: (
    record: Partial<LoadDailyRecord> & { date: string },
  ) => Promise<void>;
  existingDates: string[];
}

export const LoadDailyModal: React.FC<LoadDailyModalProps> = ({
  isOpen,
  onClose,
  recordToEdit,
  onSave,
  existingDates,
}) => {
  const todayStr = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState<string>(todayStr);

  // Digital Load Opening Balances
  const [jazzOpening, setJazzOpening] = useState<string>("0");
  const [telenorOpening, setTelenorOpening] = useState<string>("0");
  const [zongOpening, setZongOpening] = useState<string>("0");
  const [ufoneOpening, setUfoneOpening] = useState<string>("0");
  const [loadCashOpening, setLoadCashOpening] = useState<string>("0");
  // New Field: Extra Addition in Opening
  const [extraAddition, setExtraAddition] = useState<string>("0");

  // Digital Load Closing Balances
  const [jazzClosing, setJazzClosing] = useState<string>("0");
  const [telenorClosing, setTelenorClosing] = useState<string>("0");
  const [zongClosing, setZongClosing] = useState<string>("0");
  const [ufoneClosing, setUfoneClosing] = useState<string>("0");
  const [loadCashClosing, setLoadCashClosing] = useState<string>("0");
  // New Field: Load Expense in Closing
  const [loadExpense, setLoadExpense] = useState<string>("0");

  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Sub-modal state for "+" Add Amount to specific network or cash opening
  const [addExtraTarget, setAddExtraTarget] = useState<{
    network: "JAZZ" | "TELENOR" | "ZONG" | "UFONE" | "CASH";
    networkName: string;
    badgeColor: string;
  } | null>(null);
  const [extraAddAmount, setExtraAddAmount] = useState<string>("");
  const [extraAddError, setExtraAddError] = useState<string>("");
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  useEffect(() => {
    if (recordToEdit) {
      setDate(recordToEdit.date);
      setJazzOpening((recordToEdit.jazzOpening ?? 0).toString());
      setTelenorOpening((recordToEdit.telenorOpening ?? 0).toString());
      setZongOpening((recordToEdit.zongOpening ?? 0).toString());
      setUfoneOpening((recordToEdit.ufoneOpening ?? 0).toString());
      setLoadCashOpening((recordToEdit.loadCashOpening ?? 0).toString());
      setExtraAddition((recordToEdit.extraAddition ?? 0).toString());

      setJazzClosing((recordToEdit.jazzClosing ?? 0).toString());
      setTelenorClosing((recordToEdit.telenorClosing ?? 0).toString());
      setZongClosing((recordToEdit.zongClosing ?? 0).toString());
      setUfoneClosing((recordToEdit.ufoneClosing ?? 0).toString());
      setLoadCashClosing((recordToEdit.loadCashClosing ?? 0).toString());
      setLoadExpense((recordToEdit.loadExpense ?? 0).toString());

      setNotes(recordToEdit.notes || "");
    } else {
      setDate(todayStr);
      setJazzOpening("0");
      setTelenorOpening("0");
      setZongOpening("0");
      setUfoneOpening("0");
      setLoadCashOpening("0");
      setExtraAddition("0");

      setJazzClosing("0");
      setTelenorClosing("0");
      setZongClosing("0");
      setUfoneClosing("0");
      setLoadCashClosing("0");
      setLoadExpense("0");

      setNotes("");
    }
    setErrorMsg("");
    setNotificationMsg(null);
    setAddExtraTarget(null);
  }, [recordToEdit, isOpen, todayStr]);

  if (!isOpen) return null;

  // Real-time calculations
  const numJazzOpening = Math.max(0, parseFloat(jazzOpening) || 0);
  const numTelenorOpening = Math.max(0, parseFloat(telenorOpening) || 0);
  const numZongOpening = Math.max(0, parseFloat(zongOpening) || 0);
  const numUfoneOpening = Math.max(0, parseFloat(ufoneOpening) || 0);
  const numLoadCashOpening = Math.max(0, parseFloat(loadCashOpening) || 0);
  const numExtraAddition = Math.max(0, parseFloat(extraAddition) || 0);
  const totalOpening =
    numJazzOpening +
    numTelenorOpening +
    numZongOpening +
    numUfoneOpening +
    numLoadCashOpening +
    numExtraAddition;

  const numJazzClosing = Math.max(0, parseFloat(jazzClosing) || 0);
  const numTelenorClosing = Math.max(0, parseFloat(telenorClosing) || 0);
  const numZongClosing = Math.max(0, parseFloat(zongClosing) || 0);
  const numUfoneClosing = Math.max(0, parseFloat(ufoneClosing) || 0);
  const numLoadCashClosing = Math.max(0, parseFloat(loadCashClosing) || 0);
  const numLoadExpense = Math.max(0, parseFloat(loadExpense) || 0);
  const totalClosing =
    numJazzClosing +
    numTelenorClosing +
    numZongClosing +
    numUfoneClosing +
    numLoadCashClosing +
    numLoadExpense;

  const netDifference = totalClosing - totalOpening;
  const isProfit = netDifference > 0;
  const isLoss = netDifference < 0;
  const isBalanced = netDifference === 0;

  // Open Add Amount Modal
  const handleOpenAddExtra = (
    network: "JAZZ" | "TELENOR" | "ZONG" | "UFONE" | "CASH",
    networkName: string,
    badgeColor: string,
  ) => {
    setAddExtraTarget({ network, networkName, badgeColor });
    setExtraAddAmount("");
    setExtraAddError("");
  };

  // Current balance helper for modal
  const getCurrentTargetOpening = (): number => {
    if (!addExtraTarget) return 0;
    if (addExtraTarget.network === "JAZZ") return parseFloat(jazzOpening) || 0;
    if (addExtraTarget.network === "TELENOR")
      return parseFloat(telenorOpening) || 0;
    if (addExtraTarget.network === "ZONG") return parseFloat(zongOpening) || 0;
    if (addExtraTarget.network === "UFONE")
      return parseFloat(ufoneOpening) || 0;
    if (addExtraTarget.network === "CASH")
      return parseFloat(loadCashOpening) || 0;
    return 0;
  };

  // Confirm Value Addition directly to the selected opening balance
  const handleConfirmAddExtra = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!addExtraTarget) return;
    const addAmt = parseFloat(extraAddAmount);
    if (isNaN(addAmt) || addAmt <= 0) {
      setExtraAddError("Please enter a valid amount greater than 0.");
      return;
    }

    let prevVal = 0;
    let newVal = 0;

    if (addExtraTarget.network === "JAZZ") {
      prevVal = parseFloat(jazzOpening) || 0;
      newVal = prevVal + addAmt;
      setJazzOpening(newVal.toString());
    } else if (addExtraTarget.network === "TELENOR") {
      prevVal = parseFloat(telenorOpening) || 0;
      newVal = prevVal + addAmt;
      setTelenorOpening(newVal.toString());
    } else if (addExtraTarget.network === "ZONG") {
      prevVal = parseFloat(zongOpening) || 0;
      newVal = prevVal + addAmt;
      setZongOpening(newVal.toString());
    } else if (addExtraTarget.network === "UFONE") {
      prevVal = parseFloat(ufoneOpening) || 0;
      newVal = prevVal + addAmt;
      setUfoneOpening(newVal.toString());
    } else if (addExtraTarget.network === "CASH") {
      prevVal = parseFloat(loadCashOpening) || 0;
      newVal = prevVal + addAmt;
      setLoadCashOpening(newVal.toString());
    }

    setNotificationMsg(
      `Added ${formatPKR(addAmt)} to ${addExtraTarget.networkName} Opening! (Updated: ${formatPKR(prevVal)} → ${formatPKR(newVal)})`,
    );

    setAddExtraTarget(null);
    setExtraAddAmount("");
    setExtraAddError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!date) {
      setErrorMsg("Please select a valid date.");
      return;
    }

    if (!recordToEdit && existingDates.includes(date)) {
      setErrorMsg(
        `A daily record for ${date} already exists. Please select another date or edit the existing record.`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        id: recordToEdit ? recordToEdit.id : undefined,
        date,
        jazzOpening: numJazzOpening,
        telenorOpening: numTelenorOpening,
        zongOpening: numZongOpening,
        ufoneOpening: numUfoneOpening,
        loadCashOpening: numLoadCashOpening,
        extraAddition: numExtraAddition,
        totalOpening,
        jazzClosing: numJazzClosing,
        telenorClosing: numTelenorClosing,
        zongClosing: numZongClosing,
        ufoneClosing: numUfoneClosing,
        loadCashClosing: numLoadCashClosing,
        loadExpense: numLoadExpense,
        totalClosing,
        netDifference,
        resultType: isProfit ? "PROFIT" : isLoss ? "LOSS" : "BALANCED",
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save daily record");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              {recordToEdit ? "Edit Mobile Load Record" : "Mobile Load Record"}
            </h2>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {notificationMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{notificationMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotificationMsg(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold px-1.5 py-0.5 rounded hover:bg-emerald-100"
              >
                ✕
              </button>
            </div>
          )}

          {/* Date Picker */}
          <div className="flex justify-between items-center">
            <label className="block text-xs font-semibold text-slate-700">
              Record Date <span className="text-red-500">*</span>
            </label>
            <div className="relative max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Opening & Closing Dual Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Opening Panel */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                    Opening
                  </h3>
                </div>
              </div>

              {/* 1. Jazz / Warid Load Opening with '+' Icon */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <label
                      onClick={() =>
                        handleOpenAddExtra("JAZZ", "Jazz / Warid", "bg-red-600")
                      }
                      className="text-xs font-semibold text-red-700 flex items-center gap-1.5 cursor-pointer hover:underline"
                    >
                      <span className="w-2 h-2 rounded-full bg-red-600"></span>
                      Jazz / Warid
                    </label>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={jazzOpening}
                    onChange={(e) => setJazzOpening(e.target.value)}
                    className="w-full pl-9 pr-14 py-2 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenAddExtra("JAZZ", "Jazz / Warid", "bg-red-600")
                    }
                    className="absolute right-1 px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-bold rounded flex items-center gap-0.5 border border-red-200 transition-all hover:scale-105 cursor-pointer"
                    title="Add to Jazz / Warid Opening"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* 2. Telenor Load Opening with '+' Icon */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <label
                      onClick={() =>
                        handleOpenAddExtra("TELENOR", "Telenor", "bg-sky-500")
                      }
                      className="text-xs font-semibold text-sky-700 flex items-center gap-1.5 cursor-pointer hover:underline"
                    >
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                      Telenor
                    </label>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={telenorOpening}
                    onChange={(e) => setTelenorOpening(e.target.value)}
                    className="w-full pl-9 pr-14 py-2 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenAddExtra("TELENOR", "Telenor", "bg-sky-500")
                    }
                    className="absolute right-1 px-2 py-1 bg-sky-100 hover:bg-sky-200 text-sky-700 text-[10px] font-bold rounded flex items-center gap-0.5 border border-sky-200 transition-all hover:scale-105 cursor-pointer"
                    title="Add to Telenor Opening"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* 3. Zong Load Opening with '+' Icon */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <label
                      onClick={() =>
                        handleOpenAddExtra("ZONG", "Zong", "bg-emerald-600")
                      }
                      className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 cursor-pointer hover:underline"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      Zong
                    </label>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={zongOpening}
                    onChange={(e) => setZongOpening(e.target.value)}
                    className="w-full pl-9 pr-14 py-2 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenAddExtra("ZONG", "Zong", "bg-emerald-600")
                    }
                    className="absolute right-1 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-bold rounded flex items-center gap-0.5 border border-emerald-200 transition-all hover:scale-105 cursor-pointer"
                    title="Add to Zong Opening"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* 4. Ufone Load Opening with '+' Icon */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <label
                      onClick={() =>
                        handleOpenAddExtra("UFONE", "Ufone", "bg-amber-500")
                      }
                      className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 cursor-pointer hover:underline"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Ufone
                    </label>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={ufoneOpening}
                    onChange={(e) => setUfoneOpening(e.target.value)}
                    className="w-full pl-9 pr-14 py-2 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenAddExtra("UFONE", "Ufone", "bg-amber-500")
                    }
                    className="absolute right-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 text-[10px] font-bold rounded flex items-center gap-0.5 border border-amber-200 transition-all hover:scale-105 cursor-pointer"
                    title="Add to Ufone Opening"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Physical Load Cash Opening */}
              <div className="pt-2 border-t border-blue-100">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <label
                      onClick={() =>
                        handleOpenAddExtra(
                          "CASH",
                          "Load Cash in Hand",
                          "bg-emerald-600",
                        )
                      }
                      className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5 cursor-pointer hover:underline"
                    >
                      <Coins className="w-3.5 h-3.5 text-emerald-600" />
                      Cash
                    </label>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={loadCashOpening}
                    onChange={(e) => setLoadCashOpening(e.target.value)}
                    className="w-full pl-9 pr-14 py-2 text-xs font-mono font-semibold bg-emerald-50/50 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenAddExtra(
                        "CASH",
                        "Load Cash in Hand",
                        "bg-emerald-600",
                      )
                    }
                    className="absolute right-1 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-bold rounded flex items-center gap-0.5 border border-emerald-200 transition-all hover:scale-105 cursor-pointer"
                    title="Add to Load Cash Opening"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* New Field: Extra Addition in Opening */}
              <div className="pt-2 border-t border-blue-100">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                    Extra Addition
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={extraAddition}
                    onChange={(e) => setExtraAddition(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-semibold bg-indigo-50/50 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-indigo-950"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Total Opening Highlight */}
              <div className="p-3 bg-white rounded-lg border border-blue-200 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-xs font-semibold text-slate-600 block">
                    Total Opening:
                  </span>
                </div>
                <span className="text-sm font-bold font-mono text-blue-700">
                  {formatPKR(totalOpening)}
                </span>
              </div>
            </div>

            {/* Closing Panel */}
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-purple-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                  <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wide">
                    Closing
                  </h3>
                </div>
              </div>

              {/* Jazz / Warid Closing */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-red-700">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                    Jazz / Warid
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={jazzClosing}
                    onChange={(e) => setJazzClosing(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Telenor Closing */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-sky-700">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    Telenor
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={telenorClosing}
                    onChange={(e) => setTelenorClosing(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Zong Closing */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Zong
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={zongClosing}
                    onChange={(e) => setZongClosing(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Ufone Closing */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-amber-700">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Ufone
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={ufoneClosing}
                    onChange={(e) => setUfoneClosing(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Physical Load Cash Closing */}
              <div className="pt-2 border-t border-purple-100">
                <label className="block text-xs font-medium text-slate-800 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Coins className="w-3.5 h-3.5 text-emerald-600" />
                    Cash
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={loadCashClosing}
                    onChange={(e) => setLoadCashClosing(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-semibold bg-emerald-50/50 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* New Field: Load Expense in Closing */}
              <div className="pt-2 border-t border-purple-100">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-rose-600" />
                    Expense
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={loadExpense}
                    onChange={(e) => setLoadExpense(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-semibold bg-rose-50/50 border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-rose-950"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Total Closing Highlight */}
              <div className="p-3 bg-white rounded-lg border border-purple-200 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-xs font-semibold text-slate-600 block">
                    Total Closing:
                  </span>
                </div>
                <span className="text-sm font-bold font-mono text-purple-700">
                  {formatPKR(totalClosing)}
                </span>
              </div>
            </div>
          </div>

          {/* Live Net Result Calculation Card */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isProfit
                ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                : isLoss
                  ? "bg-red-50 border-red-200 text-red-950"
                  : "bg-slate-50 border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {isProfit ? "Profit" : isLoss ? "Loss" : "Balanced"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-xl font-extrabold font-mono tracking-tight ${
                    isProfit
                      ? "text-emerald-700"
                      : isLoss
                        ? "text-red-700"
                        : "text-slate-700"
                  }`}
                >
                  {netDifference > 0 ? "+" : ""}
                  {formatPKR(netDifference)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 text-amber-400" />
              <span>
                {isSubmitting ? "Saving..." : "Save Load Daily Record"}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Sub-modal: Add Extra Load Value */}
      {addExtraTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            {/* Sub-modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${addExtraTarget.badgeColor}`}
                ></span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Add Amount — {addExtraTarget.networkName} Opening
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Adds amount directly into {addExtraTarget.networkName}{" "}
                    opening balance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddExtraTarget(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-modal Content */}
            <form onSubmit={handleConfirmAddExtra} className="p-5 space-y-4">
              {extraAddError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{extraAddError}</span>
                </div>
              )}

              {/* Current Value Display */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block">
                    Current Opening Balance
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {addExtraTarget.networkName} Opening
                  </span>
                </div>
                <span className="text-base font-bold font-mono text-slate-900">
                  {formatPKR(getCurrentTargetOpening())}
                </span>
              </div>

              {/* Amount to Add Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount to Add (PKR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    autoFocus
                    required
                    value={extraAddAmount}
                    onChange={(e) => {
                      setExtraAddAmount(e.target.value);
                      if (extraAddError) setExtraAddError("");
                    }}
                    placeholder="e.g. 2000"
                    className="w-full pl-9 pr-3 py-2.5 text-sm font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Quick Preset Addition Chips */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                  Quick Amount Presets:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[500, 1000, 2000, 3000, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(extraAddAmount) || 0;
                        setExtraAddAmount(amt.toString());
                        if (extraAddError) setExtraAddError("");
                      }}
                      className="px-2 py-1.5 text-xs font-mono font-medium rounded-md border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 transition-colors text-center cursor-pointer"
                    >
                      +{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Calculation Preview */}
              {parseFloat(extraAddAmount) > 0 && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between text-xs text-emerald-900 mb-1">
                    <span className="font-medium">Calculation Summary:</span>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">
                      After Addition
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-xs text-slate-700">
                    <span>
                      {formatPKR(getCurrentTargetOpening())} +{" "}
                      {formatPKR(parseFloat(extraAddAmount) || 0)} =
                    </span>
                    <span className="text-sm font-extrabold text-emerald-800">
                      {formatPKR(
                        getCurrentTargetOpening() +
                          (parseFloat(extraAddAmount) || 0),
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Sub-modal Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddExtraTarget(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
                  <span>
                    Add to {addExtraTarget.networkName} Opening
                    {parseFloat(extraAddAmount) > 0
                      ? ` (+${formatPKR(parseFloat(extraAddAmount) || 0)})`
                      : ""}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
