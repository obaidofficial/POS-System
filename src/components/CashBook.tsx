import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Plus,
  Trash2,
  Calendar,
  Filter,
  Printer,
  Download,
  Search,
  Check,
  User,
  Phone,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Building,
  Share2,
  Clock,
  FileText,
  AlertCircle,
  HelpCircle,
  X,
  ChevronRight,
  Layers,
  ArrowRightLeft,
  BadgePercent,
  Wallet,
  CheckCircle,
  Users,
} from "lucide-react";
import {
  CashBookAccount,
  CashBookTransaction,
  CashBookPartyType,
  CashBookTxType,
  CashBookPaymentMethod,
  AuthUser,
  StoreSettings,
} from "../types";
import { formatPKR } from "../utils/currency";
import { TablePagination } from "./TablePagination";
import {
  getStoredPageSize,
  setStoredPageSize,
  PageSizeOption,
} from "../utils/pagination";

// Helper to determine exact Khata Status:
// 1. When Payment is Cleared -> Show "Cleared"
// 2. Outstanding Balance -> Show "Remaining Balance"
export type KhataAccountStatus = "ACTIVE" | "CLEARED";

export function getAccountKhataStatus(acc: CashBookAccount): {
  status: KhataAccountStatus;
  label: string;
  amount: number; // absolute numerical balance
  explanation: string;
} {
  const net = (Number(acc.totalBorrowed) || 0) - (Number(acc.totalPaid) || 0);

  if (net === 0) {
    return {
      status: "CLEARED",
      label: "Cleared",
      amount: 0,
      explanation: "Account settled (Rs 0)",
    };
  }

  return {
    status: "ACTIVE",
    label: "Remaining Balance",
    amount: Math.abs(net),
    explanation: `Outstanding balance of ${net > 0 ? "receivable" : "excess"}`,
  };
}

interface CashBookProps {
  accounts: CashBookAccount[];
  transactions: CashBookTransaction[];
  currentUser: AuthUser | null;
  storeSettings?: StoreSettings;
  onRefresh: () => void;
  onSaveAccount: (
    account: Partial<CashBookAccount> & { name: string },
  ) => Promise<CashBookAccount>;
  onDeleteAccount: (id: string) => Promise<boolean>;
  onAddTransaction: (
    tx: Omit<CashBookTransaction, "id" | "createdAt">,
  ) => Promise<CashBookTransaction>;
  onDeleteTransaction: (id: string) => Promise<boolean>;
}

export const CashBook: React.FC<CashBookProps> = ({
  accounts,
  transactions,
  currentUser,
  storeSettings,
  onRefresh,
  onSaveAccount,
  onDeleteAccount,
  onAddTransaction,
  onDeleteTransaction,
}) => {
  // Navigation: Unified Khata Ledger OR Chronological Cash Flow Stream
  const [activeMainTab, setActiveMainTab] = useState<"KHATA" | "ALL_STREAM">(
    "KHATA",
  );

  // Filter within Khata: All, Pending Balance, Cleared
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "CLEARED"
  >("ALL");

  // Selected account for ledger timeline details
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    () => {
      return accounts[0]?.id || null;
    },
  );

  // Search state for accounts list
  const [searchAccountQuery, setSearchAccountQuery] = useState("");

  // Date range filter for ledger transactions
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");

  // Pagination states (20 rows default, persistent row size, arrow navigation when > 20 rows)
  const [accountsPage, setAccountsPage] = useState<number>(1);
  const [accountsPageSize, setAccountsPageSize] = useState<number>(() =>
    getStoredPageSize("cashbook_accounts", 20 as PageSizeOption),
  );

  const [detailPage, setDetailPage] = useState<number>(1);
  const [detailPageSize, setDetailPageSize] = useState<number>(() =>
    getStoredPageSize("cashbook_detail", 20 as PageSizeOption),
  );

  const [allCashFlowPage, setAllCashFlowPage] = useState<number>(1);
  const [allCashFlowPageSize, setAllCashFlowPageSize] = useState<number>(() =>
    getStoredPageSize("cashbook_all_cash_flow", 20 as PageSizeOption),
  );

  // Modals state
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [txModalMode, setTxModalMode] = useState<CashBookTxType>("BORROWED"); // 'BORROWED' = Red, 'PAID' = Green
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Set print-modal-active on document.body when print slip modal is open
  useEffect(() => {
    if (isPrintModalOpen) {
      document.body.classList.add("print-modal-active");
      return () => {
        document.body.classList.remove("print-modal-active");
      };
    }
  }, [isPrintModalOpen]);

  // In-App Delete Confirmation Modal state (Replaces window.confirm)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: "account" | "transaction";
    id: string;
    title: string;
    description: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // In-App Notification / Feedback Banner state (Replaces window.alert)
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // New Account Form state
  const [newAccName, setNewAccName] = useState("");
  const [newAccPhone, setNewAccPhone] = useState("");
  const [newAccPartyType, setNewAccPartyType] =
    useState<CashBookPartyType>("CUSTOMER");
  const [newAccAddress, setNewAccAddress] = useState("");
  const [newAccNotes, setNewAccNotes] = useState("");
  const [newAccInitialBorrowed, setNewAccInitialBorrowed] = useState<
    number | ""
  >("");
  const [accountFormError, setAccountFormError] = useState("");

  // New Transaction Form state
  const [txAmount, setTxAmount] = useState<number | "">("");
  const [txDate, setTxDate] = useState<string>(
    () => new Date().toISOString().split("T")[0],
  );
  const [txTime, setTxTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [txPaymentMethod, setTxPaymentMethod] =
    useState<CashBookPaymentMethod>("CASH");
  const [txDescription, setTxDescription] = useState("");
  const [txReference, setTxReference] = useState("");
  const [txFormError, setTxFormError] = useState("");

  // Auto-dismiss notification after 4 seconds
  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Visible accounts filtered by search query and exact Khata status
  const visibleAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const info = getAccountKhataStatus(acc);

      // Status filter
      if (statusFilter === "CLEARED" && info.status !== "CLEARED") {
        return false;
      }
      if (statusFilter === "PENDING" && info.status === "CLEARED") {
        return false;
      }

      // Search query
      if (searchAccountQuery.trim()) {
        const q = searchAccountQuery.toLowerCase().trim();
        const matchName = (acc.name || "").toLowerCase().includes(q);
        const matchPhone = (acc.phone || "").toLowerCase().includes(q);
        const matchNotes = (acc.notes || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchNotes) return false;
      }

      return true;
    });
  }, [accounts, statusFilter, searchAccountQuery]);

  // Ensure an account is selected if available
  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) {
      return accounts[0] || null;
    }
    return (
      accounts.find((a) => a.id === selectedAccountId) || accounts[0] || null
    );
  }, [accounts, selectedAccountId]);

  // Overall Global KPI Metrics across all merged accounts
  const overallMetrics = useMemo(() => {
    const totalBorrowed = accounts.reduce(
      (sum, a) => sum + (Number(a.totalBorrowed) || 0),
      0,
    );
    const totalPaid = accounts.reduce(
      (sum, a) => sum + (Number(a.totalPaid) || 0),
      0,
    );

    let activeBalanceCount = 0;
    let clearedCount = 0;

    accounts.forEach((acc) => {
      const s = getAccountKhataStatus(acc);
      if (s.status === "ACTIVE") {
        activeBalanceCount++;
      } else {
        clearedCount++;
      }
    });

    const netRemaining = totalBorrowed - totalPaid;

    return {
      totalRemaining: netRemaining,
      totalPaid,
      totalBorrowed,
      count: accounts.length,
      activeBalanceCount,
      clearedCount,
    };
  }, [accounts]);

  // Transactions for selected account
  const accountTransactions = useMemo(() => {
    if (!selectedAccount) return [];
    return transactions
      .filter((t) => t.accountId === selectedAccount.id)
      .sort((a, b) => {
        const dtA = `${a.date}T${a.time || "00:00"}`;
        const dtB = `${b.date}T${b.time || "00:00"}`;
        return dtB.localeCompare(dtA);
      });
  }, [transactions, selectedAccount]);

  // Filtered transactions for selected account (date range)
  const filteredAccountTxs = useMemo(() => {
    return accountTransactions.filter((tx) => {
      if (filterFromDate && tx.date < filterFromDate) return false;
      if (filterToDate && tx.date > filterToDate) return false;
      return true;
    });
  }, [accountTransactions, filterFromDate, filterToDate]);

  // Reset accounts page when search or status filter changes
  useEffect(() => {
    setAccountsPage(1);
  }, [searchAccountQuery, statusFilter]);

  // Reset detail transactions page when selected account or date filters change
  useEffect(() => {
    setDetailPage(1);
  }, [selectedAccountId, filterFromDate, filterToDate]);

  // Paginated accounts
  const paginatedAccounts = useMemo(() => {
    const startIndex = (accountsPage - 1) * accountsPageSize;
    return visibleAccounts.slice(startIndex, startIndex + accountsPageSize);
  }, [visibleAccounts, accountsPage, accountsPageSize]);

  // Paginated detail transactions
  const paginatedAccountTxs = useMemo(() => {
    const startIndex = (detailPage - 1) * detailPageSize;
    return filteredAccountTxs.slice(startIndex, startIndex + detailPageSize);
  }, [filteredAccountTxs, detailPage, detailPageSize]);

  // Sorted all transactions for All Cash Flows feed
  const sortedAllTransactions = useMemo(() => {
    return [...transactions].sort((a, b) =>
      `${b.date}T${b.time || "00:00"}`.localeCompare(
        `${a.date}T${a.time || "00:00"}`,
      ),
    );
  }, [transactions]);

  // Paginated all transactions feed
  const paginatedAllTransactions = useMemo(() => {
    const startIndex = (allCashFlowPage - 1) * allCashFlowPageSize;
    return sortedAllTransactions.slice(
      startIndex,
      startIndex + allCashFlowPageSize,
    );
  }, [sortedAllTransactions, allCashFlowPage, allCashFlowPageSize]);

  // Open add transaction modal
  const handleOpenAddTxModal = (mode: CashBookTxType) => {
    if (!selectedAccount) {
      showToast("Please select or create an account first.", "error");
      return;
    }
    setTxFormError("");
    setTxModalMode(mode);
    setTxAmount("");
    setTxDate(new Date().toISOString().split("T")[0]);
    const d = new Date();
    setTxTime(
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
    );
    setTxPaymentMethod("CASH");
    setTxDescription("");
    setTxReference("");
    setIsAddTxModalOpen(true);
  };

  // Submit new transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    const numAmount = Number(txAmount);
    if (!numAmount || numAmount <= 0) {
      setTxFormError("Please enter a valid amount greater than 0.");
      return;
    }

    setIsSaving(true);
    setTxFormError("");
    try {
      await onAddTransaction({
        accountId: selectedAccount.id,
        accountName: selectedAccount.name,
        partyType: selectedAccount.partyType,
        type: txModalMode,
        amount: numAmount,
        date: txDate,
        time: txTime,
        paymentMethod: txPaymentMethod,
        description:
          txDescription.trim() ||
          (txModalMode === "BORROWED" ? "Cash In" : "Cash Out"),
        referenceNumber: txReference.trim() || undefined,
        recordedBy: currentUser?.name || "Counter Cashier",
      });
      setIsAddTxModalOpen(false);
      onRefresh();
      showToast(
        txModalMode === "BORROWED"
          ? `Recorded Cash In of ${formatPKR(numAmount)} successfully!`
          : `Recorded Cash Out of ${formatPKR(numAmount)} successfully!`,
      );
    } catch (err: any) {
      setTxFormError(
        `Error recording transaction: ${err.message || "Unknown error"}`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Submit new account
  const handleSaveNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) {
      setAccountFormError("Please enter a name for the customer or party.");
      return;
    }

    setIsSaving(true);
    setAccountFormError("");
    try {
      const initialAmt =
        typeof newAccInitialBorrowed === "number" && newAccInitialBorrowed > 0
          ? newAccInitialBorrowed
          : 0;
      const createdAcc = await onSaveAccount({
        name: newAccName.trim(),
        phone: newAccPhone.trim(),
        partyType: newAccPartyType,
        address: newAccAddress.trim(),
        notes: newAccNotes.trim(),
        initialBorrowed: initialAmt,
        totalBorrowed: initialAmt,
        totalPaid: 0,
        remainingBalance: initialAmt,
      });

      // If initial borrowed was set, also record opening transaction
      if (initialAmt > 0 && createdAcc && createdAcc.id) {
        await onAddTransaction({
          accountId: createdAcc.id,
          accountName: createdAcc.name,
          partyType: createdAcc.partyType,
          type: "BORROWED",
          amount: initialAmt,
          date: new Date().toISOString().split("T")[0],
          time: new Date().toTimeString().substring(0, 5),
          paymentMethod: "CASH",
          description:
            newAccPartyType === "CUSTOMER"
              ? "Opening Udhar / Credit Borrowed"
              : "Opening Loan Borrowed by Me",
          recordedBy: currentUser?.name || "Counter Cashier",
        });
      }

      setIsAddAccountModalOpen(false);
      setSelectedAccountId(createdAcc.id);
      onRefresh();
      showToast(`Account "${newAccName.trim()}" created successfully!`);

      // Reset form
      setNewAccName("");
      setNewAccPhone("");
      setNewAccPartyType("CUSTOMER");
      setNewAccAddress("");
      setNewAccNotes("");
      setNewAccInitialBorrowed("");
    } catch (err: any) {
      setAccountFormError(
        `Error saving account: ${err.message || "Unknown error"}`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger Delete Account Modal
  const requestDeleteAccount = (acc: CashBookAccount, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const info = getAccountKhataStatus(acc);
    setDeleteModal({
      isOpen: true,
      type: "account",
      id: acc.id,
      title: `Delete Account "${acc.name}"?`,
      description: `This will permanently remove this account (${info.label}: ${formatPKR(
        info.amount,
      )}) and all its recorded transactions.`,
    });
  };

  // Trigger Delete Transaction Modal
  const requestDeleteTransaction = (
    tx: CashBookTransaction,
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();
    const isBorrowed = tx.type === "BORROWED";
    setDeleteModal({
      isOpen: true,
      type: "transaction",
      id: tx.id,
      title: "Delete Transaction Record?",
      description: `Permanently delete this ${isBorrowed ? "borrowed (+credit)" : "payment (-paid)"} record of ${formatPKR(
        tx.amount,
      )} from ${tx.date}? The balance will be automatically recalculated.`,
    });
  };

  // Execute in-app confirmed deletion
  const handleExecuteDelete = async () => {
    if (!deleteModal) return;
    setIsDeleting(true);
    try {
      if (deleteModal.type === "account") {
        const ok = await onDeleteAccount(deleteModal.id);
        if (ok) {
          if (selectedAccountId === deleteModal.id) {
            const nextAcc = accounts.find((a) => a.id !== deleteModal.id);
            setSelectedAccountId(nextAcc ? nextAcc.id : null);
          }
          onRefresh();
          showToast("Account deleted successfully.");
        } else {
          showToast("Failed to delete account.", "error");
        }
      } else if (deleteModal.type === "transaction") {
        const ok = await onDeleteTransaction(deleteModal.id);
        if (ok) {
          onRefresh();
          showToast("Transaction deleted successfully.");
        } else {
          showToast("Failed to delete transaction.", "error");
        }
      }
    } catch (err: any) {
      showToast(`Delete failed: ${err.message || "Unknown error"}`, "error");
    } finally {
      setIsDeleting(false);
      setDeleteModal(null);
    }
  };

  // WhatsApp Share helper
  const handleShareWhatsApp = () => {
    if (!selectedAccount) return;
    const phoneClean = (selectedAccount.phone || "").replace(/[^0-9]/g, "");
    const storeName = storeSettings?.brandName || "Mobile Shop & Cash Book";
    const s = getAccountKhataStatus(selectedAccount);

    let statusLine = "";
    if (s.status === "CLEARED") {
      statusLine = `🟢 *STATUS:* Cleared (Remaining Balance: Rs 0) - All payments settled.`;
    } else {
      statusLine = `*REMAINING BALANCE:* ${formatPKR(s.amount)}`;
    }

    const msg =
      `*${storeName} - Khata Statement*\n\n` +
      `Dear *${selectedAccount.name}*,\n` +
      `Your Khata account summary is as follows:\n\n` +
      `🟢 *Total Cash In:* ${formatPKR(selectedAccount.totalBorrowed)}\n` +
      `🔴 *Total Cash Out:* ${formatPKR(selectedAccount.totalPaid)}\n` +
      `${statusLine}\n\n` +
      `Kindly keep this for your records. Thank you!`;

    const encoded = encodeURIComponent(msg);
    const url = phoneClean
      ? `https://wa.me/${phoneClean}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    try {
      window.open(url, "_blank");
    } catch {
      // Safe fallback
    }
  };

  // Export filtered transactions to CSV
  const handleExportCSV = () => {
    if (!selectedAccount || filteredAccountTxs.length === 0) {
      showToast("No transactions to export for this account.", "error");
      return;
    }
    const headers = [
      "Date",
      "Time",
      "Account Name",
      "Party Type",
      "Transaction Type",
      "Amount (PKR)",
      "Payment Method",
      "Reason / Description",
      "Reference / Slip ID",
      "Recorded By",
    ];
    const rows = filteredAccountTxs.map((t) => [
      t.date,
      t.time || "",
      `"${selectedAccount.name}"`,
      selectedAccount.partyType,
      t.type,
      t.amount,
      t.paymentMethod || "CASH",
      `"${(t.description || "").replace(/"/g, '""')}"`,
      `"${(t.referenceNumber || "").replace(/"/g, '""')}"`,
      `"${t.recordedBy || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Khata_${selectedAccount.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Khata ledger statement exported to CSV!");
  };

  // Determine top box numbers:
  const isDetailView = Boolean(selectedAccount && activeMainTab === "KHATA");
  const selectedStatus = selectedAccount
    ? getAccountKhataStatus(selectedAccount)
    : null;

  return (
    <div className="space-y-6">
      {/* In-App Notification Toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 shadow-md border animate-fadeIn ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. TOP HEADER & MAIN NAVIGATION                          */}
      {/* ========================================================= */}
      <div className="space-y-4">
        {/* Main Tab Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Cash Book &amp; Khata Ledger
                </h1>
              </div>
            </div>
          </div>

          {/* Navigation: Unified Khata vs Live Stream */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 self-start md:self-auto">
            <button
              type="button"
              id="btn-nav-unified-khata"
              onClick={() => setActiveMainTab("KHATA")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeMainTab === "KHATA"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Khata Accounts ({accounts.length})</span>
            </button>

            <button
              type="button"
              id="btn-nav-cash-stream"
              onClick={() => setActiveMainTab("ALL_STREAM")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeMainTab === "ALL_STREAM"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-4 h-4 text-slate-600" />
              <span>All Cash Flow ({transactions.length})</span>
            </button>
          </div>
        </div>

        {/* --------------------------------------------------------- */}
        {/* THREE MANDATORY BOXES REQUESTED BY USER                   */}
        {/* 1. "Total Ammount Remaining"                              */}
        {/* 2. "Total Ammount Paid" (Green)                           */}
        {/* 3. "Total Ammount Borrowd" (Red)                          */}
        {/* --------------------------------------------------------- */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> */}
        {/* Box 1: Total Ammount Remaining */}
        {/* <div className="p-5 rounded-2xl bg-white border-2 border-slate-900 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Amount Remaining
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  {isDetailView && selectedAccount && selectedStatus ? (
                    <span className="flex items-center gap-1.5">
                      <span>{selectedAccount.name}</span>
                      {selectedStatus.status === "CLEARED" && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-800">
                          Cleared
                        </span>
                      )}
                    </span>
                  ) : (
                    "Net Outstanding Balance"
                  )}
                </span>
              </div>
              <span className="p-2 rounded-xl bg-slate-900 text-white">
                <DollarSign className="w-5 h-5 text-amber-400" />
              </span>
            </div>

            <div className="pt-3">
              {isDetailView && selectedAccount && selectedStatus ? (
                <>
                  <div
                    className={`text-3xl font-black font-mono tracking-tight ${
                      selectedStatus.status === "CLEARED"
                        ? "text-emerald-600"
                        : "text-slate-950"
                    }`}
                  >
                    {formatPKR(selectedStatus.amount)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-slate-600">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        selectedStatus.status === "CLEARED"
                          ? "bg-emerald-500"
                          : "bg-slate-700"
                      }`}
                    />
                    <span>
                      {selectedStatus.status === "CLEARED"
                        ? "Payment is Cleared (Account fully settled)"
                        : `Current Balance: ${formatPKR(selectedStatus.amount)}`}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-black font-mono text-slate-950 tracking-tight">
                    {formatPKR(Math.abs(overallMetrics.totalRemaining))}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-slate-600">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        overallMetrics.totalRemaining !== 0
                          ? "bg-slate-700"
                          : "bg-emerald-500"
                      }`}
                    />
                    <span>
                      Net Outstanding Balance across all khata accounts:{" "}
                      <strong className="text-slate-900 font-mono">
                        {formatPKR(Math.abs(overallMetrics.totalRemaining))}
                      </strong>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div> */}

        {/* Box 2: Total Ammount Paid (Green Color) */}
        {/* <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Total Ammount Paid
                </span>
                <span className="text-xs font-semibold text-emerald-800">
                  {isDetailView && selectedAccount
                    ? "Installments & Payments Received"
                    : "Total Cash Received / Repaid"}
                </span>
              </div>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
              </span>
            </div>

            <div className="pt-3">
              <div className="text-3xl font-black font-mono text-emerald-600 tracking-tight">
                {formatPKR(
                  isDetailView && selectedAccount
                    ? selectedAccount.totalPaid
                    : overallMetrics.totalPaid,
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-700">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>
                  {isDetailView && selectedAccount
                    ? "Total amount customer paid"
                    : "Total settlements recorded across all khata accounts"}
                </span>
              </div>
            </div>
          </div> */}

        {/* Box 3: Total Ammount Borrowd (Red Color) */}
        {/* <div className="p-5 rounded-2xl bg-white border border-rose-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-rose-100">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
                  Total Ammount Borrowd
                </span>
                <span className="text-xs font-semibold text-rose-800">
                  {isDetailView && selectedAccount
                    ? "Total Principal Credit Borrowed"
                    : "Total Credit Borrowed"}
                </span>
              </div>
              <span className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                <ArrowUpRight className="w-5 h-5 text-rose-600" />
              </span>
            </div>

            <div className="pt-3">
              <div className="text-3xl font-black font-mono text-rose-600 tracking-tight">
                {formatPKR(
                  isDetailView && selectedAccount
                    ? selectedAccount.totalBorrowed
                    : overallMetrics.totalBorrowed,
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>
                  {isDetailView && selectedAccount
                    ? "Total principal value borrowed by customer"
                    : "Total borrowed value recorded across all accounts"}
                </span>
              </div>
            </div>
          </div> */}
        {/* </div> */}
      </div>

      {/* ========================================================= */}
      {/* 2. UNIFIED KHATA LEDGER VIEW (MERGED VIEW)                */}
      {/* ========================================================= */}
      {activeMainTab === "KHATA" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT SIDEBAR: MERGED ACCOUNTS LIST (4 COLS) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              {/* Header with Add Account button */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    <span>Khata Accounts</span>
                  </h2>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Showing {visibleAccounts.length} of {accounts.length}
                  </span>
                </div>

                <button
                  type="button"
                  id="btn-open-add-account-modal"
                  onClick={() => {
                    setAccountFormError("");
                    setIsAddAccountModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Account</span>
                </button>
              </div>

              {/* Search bar */}
              <div className="p-3 border-b border-slate-100 bg-white">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchAccountQuery}
                    onChange={(e) => setSearchAccountQuery(e.target.value)}
                    placeholder="Search by name, phone or notes..."
                    className="w-full pl-8.5 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                  {searchAccountQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchAccountQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Accounts list items */}
              <div className="max-h-[640px] overflow-y-auto divide-y divide-slate-100 p-1.5 space-y-1">
                {visibleAccounts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No accounts found matching search.
                    {searchAccountQuery && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSearchAccountQuery("");
                          }}
                          className="text-xs font-bold text-slate-800 underline cursor-pointer"
                        >
                          Clear search
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  paginatedAccounts.map((acc) => {
                    const isSelected = acc.id === selectedAccount?.id;
                    const info = getAccountKhataStatus(acc);

                    return (
                      <div
                        key={acc.id}
                        onClick={() => setSelectedAccountId(acc.id)}
                        className={`p-3 rounded-xl transition-all cursor-pointer group flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-slate-900 text-white shadow-xs"
                            : "hover:bg-slate-50 text-slate-900"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center flex-wrap">
                            <span className="font-bold text-md truncate">
                              {acc.name}
                            </span>
                          </div>

                          <div
                            className={`text-[10px] flex items-center gap-2 truncate ${
                              isSelected ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            {acc.phone && (
                              <span className="font-mono flex items-center gap-1 mt-1">
                                <Phone className="w-2.5 h-2.5" />
                                {acc.phone}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Balance Badge & Card Delete Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Quick delete icon on account card */}
                          <button
                            type="button"
                            onClick={(e) => requestDeleteAccount(acc, e)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isSelected
                                ? "text-slate-400 hover:text-rose-300 hover:bg-white/10"
                                : "text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-60 group-hover:opacity-100"
                            }`}
                            title={`Delete account "${acc.name}"`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination for Accounts list */}
              {visibleAccounts.length > 0 && (
                <div className="border-t border-slate-200">
                  <TablePagination
                    idPrefix="cashbook-accounts"
                    totalItems={visibleAccounts.length}
                    currentPage={accountsPage}
                    pageSize={accountsPageSize}
                    onPageChange={setAccountsPage}
                    onPageSizeChange={(newSize) => {
                      setAccountsPageSize(newSize);
                      setStoredPageSize("cashbook_accounts", newSize);
                      setAccountsPage(1);
                    }}
                    itemLabel="accounts"
                  />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: DETAILED LEDGER & TRANSACTIONS (8 COLS) */}
          <div className="lg:col-span-8 space-y-4">
            {selectedAccount && selectedStatus ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
                {/* Selected Account Action Header */}
                <div className="p-4 sm:p-5 bg-slate-50/90 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <span>{selectedAccount.name}</span>
                      </h2>

                      {/* Prominent Status Badges */}
                      {selectedStatus.status === "CLEARED" && (
                        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Cleared</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      {selectedAccount.phone && (
                        <span className="flex items-center gap-1 font-mono font-medium">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {selectedAccount.phone}
                        </span>
                      )}
                      {selectedAccount.address && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {selectedAccount.address}
                        </span>
                      )}
                      {selectedAccount.notes && (
                        <span className="text-slate-500 italic">
                          "{selectedAccount.notes}"
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Primary Action Buttons: Cash In (Green) & Cash Out (Red) */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* GREEN BUTTON: Cash In */}
                    <button
                      type="button"
                      id="btn-cash-in"
                      onClick={() => handleOpenAddTxModal("BORROWED")}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                      title="Record Cash In"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Cash In</span>
                    </button>

                    {/* RED BUTTON: Cash Out */}
                    <button
                      type="button"
                      id="btn-cash-out"
                      onClick={() => handleOpenAddTxModal("PAID")}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                      title="Record Cash Out"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Cash Out</span>
                    </button>

                    {/* WhatsApp Reminder Share */}
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-emerald-700 transition-colors cursor-pointer"
                      title="Share Statement on WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    {/* Print Khata Slip */}
                    <button
                      type="button"
                      onClick={() => setIsPrintModalOpen(true)}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                      title="Print Customer Ledger Slip"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {/* Export CSV */}
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                      title="Export Account Transactions to CSV"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Delete Account */}
                    <button
                      type="button"
                      id="btn-delete-current-account"
                      onClick={() => requestDeleteAccount(selectedAccount)}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:border-rose-300 text-rose-600 transition-colors cursor-pointer"
                      title="Delete this entire account and all transactions"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Filter and Date Range Bar */}
                <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                      Filter Dates:
                    </span>
                    <input
                      type="date"
                      value={filterFromDate}
                      onChange={(e) => setFilterFromDate(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-slate-900 cursor-pointer"
                      title="From date"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="date"
                      value={filterToDate}
                      onChange={(e) => setFilterToDate(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-slate-900 cursor-pointer"
                      title="To date"
                    />
                    {(filterFromDate || filterToDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterFromDate("");
                          setFilterToDate("");
                        }}
                        className="text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="text-slate-500 font-medium">
                    Showing{" "}
                    <strong className="text-slate-900">
                      {filteredAccountTxs.length}
                    </strong>{" "}
                    transactions
                  </div>
                </div>

                {/* Transactions Table for Selected Account */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Date &amp; Time</th>
                        <th className="px-4 py-3">Reason / Where Used</th>
                        <th className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <span>Cash In</span>
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          </span>
                        </th>
                        <th className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                            <span>Cash Out</span>
                            <ArrowUpRight className="w-3 h-3 text-rose-600" />
                          </span>
                        </th>
                        <th className="px-4 py-3 text-right">Balance</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAccountTxs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-12 text-center text-slate-400"
                          >
                            <div className="space-y-2">
                              <FileText className="w-8 h-8 mx-auto text-slate-300" />
                              <p className="font-semibold text-xs">
                                No transactions recorded yet.
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Click <strong>Cash In</strong> or{" "}
                                <strong>Cash Out</strong> to add an entry.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedAccountTxs.map((tx) => {
                          const isBorrowed = tx.type === "BORROWED";
                          const runBal = Number(tx.runningBalance) || 0;

                          return (
                            <tr
                              key={tx.id}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              {/* Date & Time */}
                              <td className="px-4 py-3 whitespace-nowrap font-mono">
                                <span className="font-bold text-slate-900 block">
                                  {tx.date}
                                </span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {tx.time || "--:--"}
                                </span>
                              </td>

                              {/* Description / Notes / Ref */}
                              <td className="px-4 py-3">
                                <span className="font-semibold text-slate-900 block">
                                  {tx.description ||
                                    (isBorrowed ? "Cash In" : "Cash Out")}
                                </span>
                                {tx.referenceNumber && (
                                  <span className="text-[10px] font-mono text-slate-500 block">
                                    Ref: {tx.referenceNumber}
                                  </span>
                                )}
                                {tx.recordedBy && (
                                  <span className="text-[9px] text-slate-400 block">
                                    By: {tx.recordedBy}
                                  </span>
                                )}
                              </td>

                              {/* Cash In (Green) */}
                              <td className="px-4 py-3 text-right font-mono font-black text-sm whitespace-nowrap">
                                {isBorrowed ? (
                                  <span className="text-emerald-600">
                                    + {formatPKR(tx.amount)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">--</span>
                                )}
                              </td>

                              {/* Cash Out (Red) */}
                              <td className="px-4 py-3 text-right font-mono font-black text-sm whitespace-nowrap">
                                {!isBorrowed ? (
                                  <span className="text-rose-600">
                                    - {formatPKR(tx.amount)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">--</span>
                                )}
                              </td>

                              {/* Balance (Black for positive, Yellow with minus for negative) */}
                              <td className="px-4 py-3 text-right font-mono font-black text-xs whitespace-nowrap">
                                {runBal === 0 ? (
                                  <span className="text-slate-900 font-bold">
                                    Rs 0
                                  </span>
                                ) : runBal < 0 ? (
                                  <span className="text-yellow-600 font-black">
                                    -{formatPKR(Math.abs(runBal))}
                                  </span>
                                ) : (
                                  <span className="text-slate-900 font-black">
                                    {formatPKR(runBal)}
                                  </span>
                                )}
                              </td>

                              {/* Action: Delete Transaction */}
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    requestDeleteTransaction(tx, e)
                                  }
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete this transaction record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td
                          colSpan={2}
                          className="px-4 py-3 text-right uppercase text-[10px] text-slate-600"
                        >
                          Current Account Status:
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-sm text-emerald-600">
                          {formatPKR(selectedAccount.totalBorrowed)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-sm text-rose-600">
                          {formatPKR(selectedAccount.totalPaid)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-sm">
                          {selectedStatus.status === "CLEARED" ||
                          selectedStatus.amount === 0 ? (
                            <span className="text-slate-900">Rs 0</span>
                          ) : selectedAccount.totalPaid >
                            selectedAccount.totalBorrowed ? (
                            <span className="text-yellow-600">
                              -{formatPKR(Math.abs(selectedStatus.amount))}
                            </span>
                          ) : (
                            <span className="text-slate-900">
                              {formatPKR(Math.abs(selectedStatus.amount))}
                            </span>
                          )}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Pagination for Account Detail Transactions Table */}
                {filteredAccountTxs.length > 0 && (
                  <div className="border-t border-slate-200">
                    <TablePagination
                      idPrefix="cashbook-detail"
                      totalItems={filteredAccountTxs.length}
                      currentPage={detailPage}
                      pageSize={detailPageSize}
                      onPageChange={setDetailPage}
                      onPageSizeChange={(newSize) => {
                        setDetailPageSize(newSize);
                        setStoredPageSize("cashbook_detail", newSize);
                        setDetailPage(1);
                      }}
                      itemLabel="transactions"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
                <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
                <h3 className="font-bold text-slate-700 text-base">
                  Select or Add an Account
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Pick a customer or khata account from the left sidebar to view
                  their borrowing timeline, installment repayments, and live
                  status.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Account</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* ALL CASH FLOW FEED (CHRONOLOGICAL STREAM)                 */
        /* ========================================================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-600" />
                <span>All Cash In &amp; Cash Out Ledger Transactions</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Real-time chronological log of all money borrowed (Cash Out) and
                payments received (Cash In) across all accounts.
              </p>
            </div>
            <div className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              Total Records:{" "}
              <strong className="font-mono text-slate-900">
                {transactions.length}
              </strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Date &amp; Time</th>
                  <th className="px-4 py-3">Account / Party</th>
                  <th className="px-4 py-3">Party Type</th>
                  <th className="px-4 py-3">Reason / Description</th>
                  <th className="px-4 py-3 text-right font-bold text-emerald-700">
                    Cash In
                  </th>
                  <th className="px-4 py-3 text-right font-bold text-rose-700">
                    Cash Out
                  </th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-400 text-xs"
                    >
                      No cash book transactions found.
                    </td>
                  </tr>
                ) : (
                  paginatedAllTransactions.map((tx) => {
                    const isBorrowed = tx.type === "BORROWED";
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono">
                          <span className="font-bold text-slate-900 block">
                            {tx.date}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {tx.time || "--:--"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {tx.accountName}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                              tx.partyType === "CUSTOMER"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-slate-100 text-slate-800 border border-slate-200"
                            }`}
                          >
                            {tx.partyType === "CUSTOMER"
                              ? "Customer"
                              : "Account"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {tx.description || "--"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-sm whitespace-nowrap">
                          {isBorrowed ? (
                            <span className="text-emerald-600">
                              + {formatPKR(tx.amount)}
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-sm whitespace-nowrap">
                          {!isBorrowed ? (
                            <span className="text-rose-600">
                              - {formatPKR(tx.amount)}
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => requestDeleteTransaction(tx, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete transaction record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination for All Cash Flows feed */}
          {transactions.length > 0 && (
            <div className="border-t border-slate-200">
              <TablePagination
                idPrefix="cashbook-all-stream"
                totalItems={transactions.length}
                currentPage={allCashFlowPage}
                pageSize={allCashFlowPageSize}
                onPageChange={setAllCashFlowPage}
                onPageSizeChange={(newSize) => {
                  setAllCashFlowPageSize(newSize);
                  setStoredPageSize("cashbook_all_cash_flow", newSize);
                  setAllCashFlowPage(1);
                }}
                itemLabel="transactions"
              />
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MODAL: ADD TRANSACTION (BORROW MORE OR RECORD PAYMENT) */}
      {/* ========================================================= */}
      {isAddTxModalOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden my-6 animate-fadeIn">
            {/* Modal Header */}
            <div
              className={`p-4 text-white flex items-center justify-between ${
                txModalMode === "BORROWED" ? "bg-emerald-600" : "bg-rose-600"
              }`}
            >
              <div className="flex items-center gap-2">
                {txModalMode === "BORROWED" ? (
                  <Plus className="w-5 h-5" />
                ) : (
                  <ArrowUpRight className="w-5 h-5" />
                )}
                <div>
                  <h3 className="font-bold text-sm">
                    {txModalMode === "BORROWED"
                      ? "Record Cash In"
                      : "Record Cash Out"}
                  </h3>
                  <p className="text-[11px] opacity-90">
                    Party: {selectedAccount.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTxModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {txFormError && (
              <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{txFormError}</span>
              </div>
            )}

            {/* Form Body */}
            <form onSubmit={handleSaveTransaction} className="p-5 space-y-4">
              {/* Type Switcher inside modal */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTxModalMode("BORROWED")}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    txModalMode === "BORROWED"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cash In</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTxModalMode("PAID")}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    txModalMode === "PAID"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Cash Out</span>
                </button>
              </div>

              {/* Amount (PKR) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amount (PKR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={txAmount}
                    onChange={(e) =>
                      setTxAmount(
                        e.target.value === ""
                          ? ""
                          : parseFloat(e.target.value) || 0,
                      )
                    }
                    placeholder="e.g. 50000"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-base font-mono font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={txTime}
                    onChange={(e) => setTxTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Note
                </label>
                <input
                  type="text"
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder={
                    txModalMode === "BORROWED"
                      ? "e.g. Took mobile on installment, cash advance, repair credit..."
                      : "e.g. Random installment payment, counter cash, bank transfer..."
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Real-time Status Preview Box */}
              {(() => {
                const currentNet =
                  (Number(selectedAccount.totalBorrowed) || 0) -
                  (Number(selectedAccount.totalPaid) || 0);
                const enteredAmt = Number(txAmount) || 0;
                const newNet =
                  txModalMode === "BORROWED"
                    ? currentNet + enteredAmt
                    : currentNet - enteredAmt;

                let previewLabel = "Account Settled (Cleared)";
                let previewColor =
                  "bg-emerald-50 border-emerald-200 text-emerald-900";
                if (newNet !== 0) {
                  previewLabel = "Updated Running Balance";
                  previewColor = "bg-slate-50 border-slate-200 text-slate-900";
                }

                return (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${previewColor}`}
                  >
                    <div>
                      <span className="font-bold block">
                        Status After This Transaction:
                      </span>
                      <span className="text-[11px] font-semibold opacity-90">
                        {previewLabel}
                      </span>
                    </div>
                    <span className="text-base font-black font-mono text-slate-950">
                      {formatPKR(Math.abs(newNet))}
                    </span>
                  </div>
                );
              })()}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTxModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !txAmount || Number(txAmount) <= 0}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    txModalMode === "BORROWED"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {isSaving
                    ? "Saving..."
                    : txModalMode === "BORROWED"
                      ? "Save Cash In"
                      : "Save Cash Out"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MODAL: ADD NEW KHATA ACCOUNT                           */}
      {/* ========================================================= */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden my-6 animate-fadeIn">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Add New Khata Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAccountModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {accountFormError && (
              <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{accountFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewAccount} className="p-5 space-y-4">
              {/* Title / Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="e.g. Farhan Malik, Haji Aslam, Sheikh Tariq..."
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile / WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={newAccPhone}
                  onChange={(e) => setNewAccPhone(e.target.value)}
                  placeholder="e.g. 0300-1234567"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Address / City */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Address / Location
                </label>
                <input
                  type="text"
                  value={newAccAddress}
                  onChange={(e) => setNewAccAddress(e.target.value)}
                  placeholder="e.g. Shop # 14, Commercial Market, Rawalpindi"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newAccName.trim()}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-40"
                >
                  {isSaving ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MODAL: IN-APP CONFIRMATION FOR DELETION (NO WINDOW.CONFIRM) */}
      {/* ========================================================= */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 p-6 space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                {deleteModal.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {deleteModal.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-action"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODAL: PRINT KHATA SLIP / STATEMENT                    */}
      {/* ========================================================= */}
      {isPrintModalOpen &&
        selectedAccount &&
        selectedStatus &&
        createPortal(
          <div
            id="printable-khata-slip-modal"
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto printable-modal-overlay"
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
                #printable-khata-slip-modal {
                  position: static !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  display: block !important;
                }
                #printable-khata-slip {
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
              id="printable-khata-slip"
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden my-4 printable-modal-card print:m-0 print:p-0 print:border-none print:shadow-none print:w-full"
            >
              {/* Modal Header (Hidden in Print) */}
              <div className="bg-slate-900 text-white px-4 py-3 print:hidden flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Print Khata Statement Slip
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
                    {storeSettings?.brandName ||
                      "OBAID ELECTRONICS & MOBILE CARE"}
                  </h3>
                  <p className="text-[10px] text-slate-600 print:text-black">
                    {storeSettings?.address || "Main Commercial Market"}
                  </p>
                  <p className="text-[10px] font-mono font-semibold">
                    {storeSettings?.phoneNumber || "+92 300 1234567"}
                  </p>
                  <div className="pt-1 text-[11px] font-bold uppercase tracking-wider bg-slate-100 print:bg-transparent py-0.5 rounded">
                    *** KHATA &amp; CASH BOOK STATEMENT ***
                  </div>
                </div>

                {/* Customer Info */}
                <div className="text-[10px] space-y-0.5 py-1 border-b border-dashed border-slate-300 print:border-black">
                  <div className="flex justify-between">
                    <span>
                      Account: <strong>{selectedAccount.name}</strong>
                    </span>
                    <span>
                      Status:{" "}
                      <strong>
                        {selectedStatus.status === "CLEARED"
                          ? "Cleared"
                          : "Active Balance"}
                      </strong>
                    </span>
                  </div>
                  {selectedAccount.phone && (
                    <div className="flex justify-between">
                      <span>
                        Phone:{" "}
                        <strong className="font-mono">
                          {selectedAccount.phone}
                        </strong>
                      </span>
                      <span>
                        Date:{" "}
                        <strong className="font-mono">
                          {new Date().toISOString().split("T")[0]}
                        </strong>
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>
                      Printed By:{" "}
                      <strong>{currentUser?.name || "Counter Cashier"}</strong>
                    </span>
                    <span>
                      Time:{" "}
                      <strong>
                        {new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Three Mandatory Boxes in Slip */}
                <div className="grid grid-cols-3 gap-1.5 py-2 border-b border-slate-300 print:border-black text-center">
                  <div className="p-1 rounded bg-slate-100 print:bg-transparent">
                    <span className="text-[8px] uppercase font-bold block text-slate-600 print:text-black">
                      {selectedStatus.label}
                    </span>
                    <span className="font-mono font-black text-xs block text-slate-900 print:text-black">
                      {selectedStatus.status === "CLEARED"
                        ? "Rs 0"
                        : formatPKR(selectedStatus.amount)}
                    </span>
                  </div>
                  <div className="p-1 rounded bg-slate-100 print:bg-transparent">
                    <span className="text-[8px] uppercase font-bold block text-slate-600 print:text-black">
                      Cash Out
                    </span>
                    <span className="font-mono font-black text-xs block text-emerald-700 print:text-black">
                      {formatPKR(selectedAccount.totalPaid)}
                    </span>
                  </div>
                  <div className="p-1 rounded bg-slate-100 print:bg-transparent">
                    <span className="text-[8px] uppercase font-bold block text-slate-600 print:text-black">
                      Cash In
                    </span>
                    <span className="font-mono font-black text-xs block text-rose-700 print:text-black">
                      {formatPKR(selectedAccount.totalBorrowed)}
                    </span>
                  </div>
                </div>

                {/* Transactions List */}
                <div>
                  <table className="w-full text-[9px] text-left">
                    <thead className="border-b border-slate-300 print:border-black font-bold uppercase">
                      <tr>
                        <th className="py-1">Date</th>
                        <th className="py-1">Description / How</th>
                        <th className="py-1 text-right">Cash In</th>
                        <th className="py-1 text-right">Cash Out</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-black font-mono">
                      {filteredAccountTxs.map((t) => (
                        <tr key={t.id}>
                          <td className="py-1 whitespace-nowrap">{t.date}</td>
                          <td className="py-1 font-sans">
                            <span className="font-semibold block truncate max-w-[140px]">
                              {t.description}
                            </span>
                            <span className="text-[8px] text-slate-500 print:text-black font-mono">
                              {t.paymentMethod || "CASH"}
                            </span>
                          </td>
                          <td className="py-1 text-right text-emerald-600 print:text-black font-bold">
                            {t.type === "BORROWED" ? formatPKR(t.amount) : "--"}
                          </td>
                          <td className="py-1 text-right text-rose-600 print:text-black font-bold">
                            {t.type === "PAID" ? formatPKR(t.amount) : "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Final Balance Box */}
                <div className="pt-2 border-t-2 border-slate-900 print:border-black space-y-1">
                  <div className="flex items-center justify-between font-black text-sm pt-1">
                    <span>
                      {selectedStatus.status === "CLEARED"
                        ? "ACCOUNT SETTLED:"
                        : "REMAINING BALANCE:"}
                    </span>
                    <span className="font-mono text-base">
                      {selectedStatus.status === "CLEARED"
                        ? "Rs 0"
                        : formatPKR(selectedStatus.amount)}
                    </span>
                  </div>
                </div>

                {/* Signature lines */}
                <div className="pt-6 grid grid-cols-2 gap-4 text-center text-[9px]">
                  <div className="border-t border-dashed border-slate-400 pt-1">
                    Customer / Party Signature
                  </div>
                  <div className="border-t border-dashed border-slate-400 pt-1">
                    Authorized Shop Stamp
                  </div>
                </div>

                {/* Slip Footer */}
                <div className="pt-2 text-center text-[8px] text-slate-500 print:text-black border-t border-dashed border-slate-300 print:border-black space-y-0.5">
                  <p className="font-bold">
                    *** OFFICIAL STORE KHATA RECORD ***
                  </p>
                  <p>
                    Please preserve this receipt for your records and
                    reconciliation.
                  </p>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
