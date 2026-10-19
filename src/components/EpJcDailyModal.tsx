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
  Plus,
  PlusCircle,
  Receipt,
  Coins,
  Building2,
  Trash2,
} from "lucide-react";
import { EpJcDailyRecord, EpJcCustomAccount } from "../types";
import { formatPKR } from "../utils/currency";

export interface FormCustomAccount {
  id: string;
  name: string;
  openingBalance: string;
  closingBalance: string;
}

interface EpJcDailyModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit: EpJcDailyRecord | null;
  onSave: (
    record: Partial<EpJcDailyRecord> & { date: string },
  ) => Promise<void>;
  existingDates: string[];
}

export const EpJcDailyModal: React.FC<EpJcDailyModalProps> = ({
  isOpen,
  onClose,
  recordToEdit,
  onSave,
  existingDates,
}) => {
  const todayStr = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState<string>(todayStr);
  const [epOpening, setEpOpening] = useState<string>("0");
  const [jcOpening, setJcOpening] = useState<string>("0");
  const [epJcCashOpening, setEpJcCashOpening] = useState<string>("0");
  // New Field: Extra Addition in Opening
  const [extraAddition, setExtraAddition] = useState<string>("0");

  // Custom Accounts (e.g. Meezan Bank, SadaPay, HBL when EP or JC is not working)
  const [customAccounts, setCustomAccounts] = useState<FormCustomAccount[]>([]);

  const [epClosing, setEpClosing] = useState<string>("0");
  const [jcClosing, setJcClosing] = useState<string>("0");
  const [epJcCashClosing, setEpJcCashClosing] = useState<string>("0");
  // New Field: EP/JC Expense in Closing
  const [epJcExpense, setEpJcExpense] = useState<string>("0");

  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleAddCustomAccount = () => {
    const newAccount: FormCustomAccount = {
      id: `ca_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: "",
      openingBalance: "0",
      closingBalance: "0",
    };
    setCustomAccounts((prev) => [...prev, newAccount]);
  };

  const handleUpdateCustomAccount = (
    id: string,
    field: "name" | "openingBalance" | "closingBalance",
    value: string,
  ) => {
    setCustomAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, [field]: value } : acc)),
    );
  };

  const handleRemoveCustomAccount = (id: string) => {
    setCustomAccounts((prev) => prev.filter((acc) => acc.id !== id));
  };

  // Sub-modal state for "+" Add Extra Value to specific opening
  const [addExtraTarget, setAddExtraTarget] = useState<{
    network: "EASYPAISA" | "JAZZCASH" | "CASH";
    title: string;
    badgeColor: string;
    textCol: string;
  } | null>(null);
  const [extraAddAmount, setExtraAddAmount] = useState<string>("");
  const [extraAddError, setExtraAddError] = useState<string>("");
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  useEffect(() => {
    if (recordToEdit) {
      setDate(recordToEdit.date);
      setEpOpening((recordToEdit.epOpening ?? 0).toString());
      setJcOpening((recordToEdit.jcOpening ?? 0).toString());
      const combinedCashOpening =
        recordToEdit.epJcCashOpening !== undefined
          ? recordToEdit.epJcCashOpening
          : (recordToEdit.epCashOpening || 0) +
            (recordToEdit.jcCashOpening || 0);
      setEpJcCashOpening(combinedCashOpening.toString());
      setExtraAddition((recordToEdit.extraAddition ?? 0).toString());

      if (
        recordToEdit.customAccounts &&
        Array.isArray(recordToEdit.customAccounts)
      ) {
        setCustomAccounts(
          recordToEdit.customAccounts.map((ca, idx) => ({
            id: ca.id || `ca_${idx}_${Date.now()}`,
            name: ca.name || "",
            openingBalance: (ca.openingBalance ?? 0).toString(),
            closingBalance: (ca.closingBalance ?? 0).toString(),
          })),
        );
      } else {
        setCustomAccounts([]);
      }

      setEpClosing((recordToEdit.epClosing ?? 0).toString());
      setJcClosing((recordToEdit.jcClosing ?? 0).toString());
      const combinedCashClosing =
        recordToEdit.epJcCashClosing !== undefined
          ? recordToEdit.epJcCashClosing
          : (recordToEdit.epCashClosing || 0) +
            (recordToEdit.jcCashClosing || 0);
      setEpJcCashClosing(combinedCashClosing.toString());
      setEpJcExpense((recordToEdit.epJcExpense ?? 0).toString());

      setNotes(recordToEdit.notes || "");
    } else {
      setDate(todayStr);
      setEpOpening("0");
      setJcOpening("0");
      setEpJcCashOpening("0");
      setExtraAddition("0");
      setCustomAccounts([]);
      setEpClosing("0");
      setJcClosing("0");
      setEpJcCashClosing("0");
      setEpJcExpense("0");
      setNotes("");
    }
    setErrorMsg("");
    setNotificationMsg(null);
    setAddExtraTarget(null);
  }, [recordToEdit, isOpen, todayStr]);

  if (!isOpen) return null;

  // Real-time calculations
  const numEpOpening = Math.max(0, parseFloat(epOpening) || 0);
  const numJcOpening = Math.max(0, parseFloat(jcOpening) || 0);
  const numEpJcCashOpening = Math.max(0, parseFloat(epJcCashOpening) || 0);
  const numExtraAddition = Math.max(0, parseFloat(extraAddition) || 0);
  const numCustomOpening = customAccounts.reduce(
    (sum, acc) => sum + Math.max(0, parseFloat(acc.openingBalance) || 0),
    0,
  );
  const totalOpening =
    numEpOpening +
    numJcOpening +
    numEpJcCashOpening +
    numExtraAddition +
    numCustomOpening;

  const numEpClosing = Math.max(0, parseFloat(epClosing) || 0);
  const numJcClosing = Math.max(0, parseFloat(jcClosing) || 0);
  const numEpJcCashClosing = Math.max(0, parseFloat(epJcCashClosing) || 0);
  const numEpJcExpense = Math.max(0, parseFloat(epJcExpense) || 0);
  const numCustomClosing = customAccounts.reduce(
    (sum, acc) => sum + Math.max(0, parseFloat(acc.closingBalance) || 0),
    0,
  );
  const totalClosing =
    numEpClosing +
    numJcClosing +
    numEpJcCashClosing +
    numEpJcExpense +
    numCustomClosing;

  const netDifference = totalClosing - totalOpening;
  const isProfit = netDifference > 0;
  const isLoss = netDifference < 0;
  const isBalanced = netDifference === 0;

  // Open Add Extra Value Modal
  const handleOpenAddExtra = (
    network: "EASYPAISA" | "JAZZCASH" | "CASH",
    title: string,
    badgeColor: string,
    textCol: string,
  ) => {
    setAddExtraTarget({ network, title, badgeColor, textCol });
    setExtraAddAmount("");
    setExtraAddError("");
  };

  // Current balance helper for modal
  const getCurrentTargetOpening = (): number => {
    if (!addExtraTarget) return 0;
    if (addExtraTarget.network === "EASYPAISA")
      return parseFloat(epOpening) || 0;
    if (addExtraTarget.network === "JAZZCASH")
      return parseFloat(jcOpening) || 0;
    if (addExtraTarget.network === "CASH")
      return parseFloat(epJcCashOpening) || 0;
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

    if (addExtraTarget.network === "EASYPAISA") {
      prevVal = parseFloat(epOpening) || 0;
      newVal = prevVal + addAmt;
      setEpOpening(newVal.toString());
    } else if (addExtraTarget.network === "JAZZCASH") {
      prevVal = parseFloat(jcOpening) || 0;
      newVal = prevVal + addAmt;
      setJcOpening(newVal.toString());
    } else if (addExtraTarget.network === "CASH") {
      prevVal = parseFloat(epJcCashOpening) || 0;
      newVal = prevVal + addAmt;
      setEpJcCashOpening(newVal.toString());
    }

    setNotificationMsg(
      `Added ${formatPKR(addAmt)} to ${addExtraTarget.title}! (Updated: ${formatPKR(prevVal)} → ${formatPKR(newVal)})`,
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

    const finalCustomAccounts: EpJcCustomAccount[] = customAccounts
      .filter(
        (acc) =>
          acc.name.trim() ||
          (parseFloat(acc.openingBalance) || 0) > 0 ||
          (parseFloat(acc.closingBalance) || 0) > 0,
      )
      .map((acc, idx) => ({
        id: acc.id,
        name: acc.name.trim() || `Custom Account ${idx + 1}`,
        openingBalance: Math.max(0, parseFloat(acc.openingBalance) || 0),
        closingBalance: Math.max(0, parseFloat(acc.closingBalance) || 0),
      }));

    setIsSubmitting(true);
    try {
      await onSave({
        id: recordToEdit ? recordToEdit.id : undefined,
        date,
        epOpening: numEpOpening,
        jcOpening: numJcOpening,
        epJcCashOpening: numEpJcCashOpening,
        epCashOpening: numEpJcCashOpening,
        jcCashOpening: 0,
        extraAddition: numExtraAddition,
        customAccounts: finalCustomAccounts,
        totalOpening,
        epClosing: numEpClosing,
        jcClosing: numJcClosing,
        epJcCashClosing: numEpJcCashClosing,
        epCashClosing: numEpJcCashClosing,
        jcCashClosing: 0,
        epJcExpense: numEpJcExpense,
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
              {recordToEdit ? "Edit EP & JC Record" : "EP & JC Record"}
            </h2>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {notificationMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{notificationMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotificationMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold px-1.5 py-0.5 rounded hover:bg-emerald-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Date Selector */}
          <div className="bg-slate-50 px-3.5 py-1.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Record Date:
            </label>
            <input
              id="epjc-record-date"
              type="date"
              value={date}
              disabled={!!recordToEdit}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Grid of Opening & Closing Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OPENING SECTION */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Opening
                  </span>
                </div>
              </div>

              <div className="space-y-3.5 flex-1">
                {/* 1. EasyPaisa (EP) App Opening (PKR) with '+' Icon */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <label
                        onClick={() =>
                          handleOpenAddExtra(
                            "EASYPAISA",
                            "EasyPaisa (EP) App Opening",
                            "bg-emerald-600",
                            "text-emerald-700",
                          )
                        }
                        className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5 cursor-pointer hover:underline"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        EasyPaisa
                      </label>
                    </div>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                      Rs.
                    </span>
                    <input
                      id="epjc-input-ep-opening"
                      type="number"
                      min="0"
                      step="any"
                      value={epOpening}
                      onChange={(e) => setEpOpening(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-14 py-2 border border-slate-300 rounded-lg text-xs font-mono font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenAddExtra(
                          "EASYPAISA",
                          "EasyPaisa (EP) App Opening",
                          "bg-emerald-600",
                          "text-emerald-700",
                        )
                      }
                      className="absolute right-1 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-bold rounded flex items-center gap-0.5 border border-emerald-200 transition-all hover:scale-105 cursor-pointer"
                      title="Add to EasyPaisa Opening"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* 2. JazzCash (JC) App Opening (PKR) with '+' Icon */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <label
                        onClick={() =>
                          handleOpenAddExtra(
                            "JAZZCASH",
                            "JazzCash (JC) App Opening",
                            "bg-amber-600",
                            "text-amber-700",
                          )
                        }
                        className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 cursor-pointer hover:underline"
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                        JazzCash
                      </label>
                    </div>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                      Rs.
                    </span>
                    <input
                      id="epjc-input-jc-opening"
                      type="number"
                      min="0"
                      step="any"
                      value={jcOpening}
                      onChange={(e) => setJcOpening(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-14 py-2 border border-slate-300 rounded-lg text-xs font-mono font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenAddExtra(
                          "JAZZCASH",
                          "JazzCash (JC) App Opening",
                          "bg-amber-600",
                          "text-amber-700",
                        )
                      }
                      className="absolute right-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 text-[10px] font-bold rounded flex items-center gap-0.5 border border-amber-200 transition-all hover:scale-105 cursor-pointer"
                      title="Add to JazzCash Opening"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* 3. EP and JC Cash Opening (PKR) with '+' Icon */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <label
                        onClick={() =>
                          handleOpenAddExtra(
                            "CASH",
                            "EP and JC Cash Opening",
                            "bg-blue-600",
                            "text-blue-700",
                          )
                        }
                        className="text-xs font-semibold text-blue-900 flex items-center gap-1.5 cursor-pointer hover:underline"
                      >
                        <Coins className="w-3.5 h-3.5 text-blue-600" />
                        Cash
                      </label>
                    </div>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                      Rs.
                    </span>
                    <input
                      id="epjc-input-cash-opening"
                      type="number"
                      min="0"
                      step="any"
                      value={epJcCashOpening}
                      onChange={(e) => setEpJcCashOpening(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-14 py-2 border border-blue-300 bg-blue-50/30 rounded-lg text-xs font-mono font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenAddExtra(
                          "CASH",
                          "EP and JC Cash Opening",
                          "bg-blue-600",
                          "text-blue-700",
                        )
                      }
                      className="absolute right-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-[10px] font-bold rounded flex items-center gap-0.5 border border-blue-200 transition-all hover:scale-105 cursor-pointer"
                      title="Add to EP and JC Cash Opening"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Custom Bank Accounts (Opening) */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      Custom Accounts
                    </label>
                    <button
                      type="button"
                      id="btn-epjc-add-custom-account-list"
                      onClick={handleAddCustomAccount}
                      className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Add Custom Bank if JazzCash or EasyPaisa is not working"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3] text-indigo-600" />
                    </button>
                  </div>

                  {customAccounts.length > 0 ? (
                    <div className="space-y-3">
                      {customAccounts.map((acc, index) => (
                        <div
                          key={acc.id}
                          className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-3 relative shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                              <input
                                type="text"
                                value={acc.name}
                                onChange={(e) =>
                                  handleUpdateCustomAccount(
                                    acc.id,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                placeholder="Bank Name"
                                className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                              />
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomAccount(acc.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove this custom account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">
                              Amount
                            </label>
                            <div className="relative flex items-center">
                              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                                Rs.
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={acc.openingBalance}
                                onChange={(e) =>
                                  handleUpdateCustomAccount(
                                    acc.id,
                                    "openingBalance",
                                    e.target.value,
                                  )
                                }
                                placeholder="0.00"
                                className="w-full pl-9 pr-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={handleAddCustomAccount}
                      className="p-3 bg-indigo-50/70 hover:bg-indigo-50 border-2 border-dashed border-indigo-300 hover:border-indigo-400 rounded-xl cursor-pointer transition-all group flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div>
                          <p className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                            Custom Account
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        + Add
                      </span>
                    </div>
                  )}
                </div>

                {/* Field: Extra Addition in Opening */}
                <div className="pt-2 border-t border-slate-100">
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
                      id="epjc-input-extra-addition"
                      type="number"
                      min="0"
                      step="any"
                      value={extraAddition}
                      onChange={(e) => setExtraAddition(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 border border-indigo-300 bg-indigo-50/40 rounded-lg text-xs font-mono font-semibold text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Total Opening Card */}
              <div className="mt-4 pt-3 border-t border-slate-100 bg-blue-50/60 p-3 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between text-xs text-blue-900 font-semibold mb-1">
                  <div>
                    <span className="block font-bold">Total Opening:</span>
                  </div>
                  <span className="text-sm font-bold">{totalOpening}</span>
                </div>
              </div>
            </div>

            {/* CLOSING SECTION */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  Closing
                </span>
              </div>

              <div className="space-y-3.5 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      EasyPaisa
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                      Rs.
                    </span>
                    <input
                      id="epjc-input-ep-closing"
                      type="number"
                      min="0"
                      step="any"
                      value={epClosing}
                      onChange={(e) => setEpClosing(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-amber-800">
                      <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                      JazzCash
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                      Rs.
                    </span>
                    <input
                      id="epjc-input-jc-closing"
                      type="number"
                      min="0"
                      step="any"
                      value={jcClosing}
                      onChange={(e) => setJcClosing(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <Coins className="w-3.5 h-3.5 text-emerald-600" />
                      Cash
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                      Rs.
                    </span>
                    <input
                      id="epjc-input-cash-closing"
                      type="number"
                      min="0"
                      step="any"
                      value={epJcCashClosing}
                      onChange={(e) => setEpJcCashClosing(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Auto-synced Custom Bank Accounts in Closing (Same Bank Name with Amount field) */}
                {customAccounts.length > 0 ? (
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        Custom Accounts
                      </label>
                    </div>

                    {customAccounts.map((acc, index) => {
                      const bankTitle = acc.name.trim()
                        ? acc.name.trim()
                        : `Custom Account #${index + 1}`;
                      const openingVal = parseFloat(acc.openingBalance) || 0;
                      const closingVal = parseFloat(acc.closingBalance) || 0;
                      const diff = closingVal - openingVal;

                      return (
                        <div
                          key={acc.id}
                          className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                              <span className="font-extrabold">
                                {bankTitle}
                              </span>
                            </label>
                          </div>

                          <div>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                                Rs.
                              </span>
                              <input
                                id={`epjc-closing-custom-${acc.id}`}
                                type="number"
                                min="0"
                                step="any"
                                value={acc.closingBalance}
                                onChange={(e) =>
                                  handleUpdateCustomAccount(
                                    acc.id,
                                    "closingBalance",
                                    e.target.value,
                                  )
                                }
                                placeholder="0.00"
                                className="w-full pl-9 pr-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-1">
                      <div className="flex items-center justify-center gap-1.5 text-slate-600 text-xs font-bold">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Custom Bank Closing Field</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        If EasyPaisa or JazzCash is not working, use{" "}
                        <strong className="text-indigo-700 font-bold">
                          + Custom Account
                        </strong>{" "}
                        in Opening. The same bank name with its closing amount
                        field will automatically show here!
                      </p>
                    </div>
                  </div>
                )}

                {/* Field: EP/JC Expense in Closing */}
                <div className="pt-2 border-t border-slate-100">
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
                      id="epjc-input-expense"
                      type="number"
                      min="0"
                      step="any"
                      value={epJcExpense}
                      onChange={(e) => setEpJcExpense(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 border border-rose-300 bg-rose-50/40 rounded-lg text-xs font-mono font-semibold text-rose-950 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Total Closing Card with required Green (Profit) or Red (Loss) styling */}
              <div
                className={`mt-4 pt-3 border-t p-3 rounded-lg transition-all ${
                  isProfit
                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                    : isLoss
                      ? "bg-red-50/80 border-red-300 text-red-950"
                      : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <div>
                    <span className="block">Total Closing:</span>
                  </div>
                  <span className="font-mono text-sm">{totalClosing}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Comparison Banner: Profit (Green) vs Loss (Red) */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isProfit
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : isLoss
                  ? "bg-red-50 border-red-300 text-red-900"
                  : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {isProfit
                      ? "Daily Result: Profit"
                      : isLoss
                        ? "Daily Result: Loss"
                        : "Daily Result: Balanced"}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div
                className={`text-lg font-bold font-mono ${
                  isProfit
                    ? "text-emerald-700"
                    : isLoss
                      ? "text-red-700"
                      : "text-slate-700"
                }`}
              >
                {isProfit
                  ? `+${formatPKR(netDifference)}`
                  : isLoss
                    ? `-${formatPKR(Math.abs(netDifference))}`
                    : formatPKR(0)}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-epjc-daily-record-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {isSubmitting
                ? "Saving..."
                : recordToEdit
                  ? "Update Record"
                  : "Save Daily Record"}
            </button>
          </div>
        </form>
      </div>

      {/* Sub-modal: Add Extra Value to Opening */}
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
                    Add Amount — {addExtraTarget.title.replace(" (PKR)", "")}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Adds amount directly into{" "}
                    {addExtraTarget.title.replace(" (PKR)", "")}
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
                    {addExtraTarget.title}
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
                    className="w-full pl-9 pr-3 py-2.5 text-sm font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
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
                        setExtraAddAmount(amt.toString());
                        if (extraAddError) setExtraAddError("");
                      }}
                      className="px-2 py-1.5 text-xs font-mono font-medium rounded-md border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-colors text-center cursor-pointer"
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
                  <Plus className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <span>
                    Add to {addExtraTarget.title.replace(" (PKR)", "")}
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
