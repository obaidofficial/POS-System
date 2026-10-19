/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Navbar, ActiveTab } from "./components/Navbar";
import { Dashboard } from "./components/Dashboard";
import { Inventory } from "./components/Inventory";
import { Sales } from "./components/Sales";
import { ItemModal } from "./components/ItemModal";
import { StockAdjustModal } from "./components/StockAdjustModal";
import { NewSaleModal } from "./components/NewSaleModal";
import { SaleReceiptModal } from "./components/SaleReceiptModal";
import { BackupModal } from "./components/BackupModal";
import { Login } from "./components/Login";
import { Settings } from "./components/Settings";
import { EpJcDashboard } from "./components/EpJcDashboard";
import { LoadDashboard } from "./components/LoadDashboard";
import { Protectors } from "./components/Protectors";
import { VendorDashboard } from "./components/VendorDashboard";
import { Expenses } from "./components/Expenses";
import { CashBook } from "./components/CashBook";
import { SoldItems } from "./components/SoldItems";
import { storage } from "./services/storage";
import { authService } from "./services/auth";
import {
  InventoryItem,
  DashboardMetrics,
  Sale,
  AuthUser,
  StoreSettings,
  EpJcDailyRecord,
  EpJcTransaction,
  LoadDailyRecord,
  LoadTransaction,
  ScreenProtector,
  Vendor,
  VendorPurchase,
  VendorPayment,
  ExpenseItem,
  CashBookAccount,
  CashBookTransaction,
} from "./types";
import { HardDrive, ShieldCheck, Boxes, Loader2 } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() =>
    authService.getStoredUser(),
  );
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => {
    try {
      const saved = localStorage.getItem(
        "stockcore_active_tab",
      ) as ActiveTab | null;
      const validTabs: ActiveTab[] = [
        "dashboard",
        "sales",
        "inventory",
        "epjc",
        "load",
        "protectors",
        "vendors",
        "expenses",
        "cashbook",
        "sold-items",
        "settings",
      ];
      if (saved && validTabs.includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return "dashboard";
  });

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem("stockcore_active_tab", tab);
    } catch {
      // ignore
    }
  }, []);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() =>
    storage.getStoreSettings(),
  );

  // Core Data States from local storage
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [epJcRecords, setEpJcRecords] = useState<EpJcDailyRecord[]>([]);
  const [epJcTransactions, setEpJcTransactions] = useState<EpJcTransaction[]>(
    [],
  );
  const [loadRecords, setLoadRecords] = useState<LoadDailyRecord[]>([]);
  const [loadTransactions, setLoadTransactions] = useState<LoadTransaction[]>(
    [],
  );
  const [protectors, setProtectors] = useState<ScreenProtector[]>(() =>
    storage.getProtectors(),
  );
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorPurchases, setVendorPurchases] = useState<VendorPurchase[]>([]);
  const [vendorPayments, setVendorPayments] = useState<VendorPayment[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [cashbookAccounts, setCashbookAccounts] = useState<CashBookAccount[]>(
    [],
  );
  const [cashbookTransactions, setCashbookTransactions] = useState<
    CashBookTransaction[]
  >([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalStockValueAtCost: 0,
    totalStockValueAtRetail: 0,
    potentialProfitInStock: 0,
    totalInventoryUnits: 0,
    totalProductsCount: 0,
    lowStockItemsCount: 0,
    outOfStockItemsCount: 0,
    totalCashSales: 0,
    totalSalesRevenue: 0,
    totalSalesCount: 0,
  });

  // Modal Dialog States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [itemToAdjust, setItemToAdjust] = useState<InventoryItem | null>(null);
  const [inventoryViewMode, setInventoryViewMode] = useState<
    "LIST" | "ADD_PRODUCTS"
  >("LIST");
  const [salesViewMode, setSalesViewMode] = useState<"LIST" | "NEW_SALE">(
    "LIST",
  );
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Check active authentication session on startup
  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      try {
        const res = await authService.verifySession();
        if (isMounted) {
          if (res.authenticated && res.user) {
            setCurrentUser(res.user);
            if (res.user.role === "worker") {
              const allowedWorkerTabs = [
                "sales",
                "epjc",
                "load",
                "protectors",
                "sold-items",
                "settings",
              ];
              setActiveTabState((prev) => {
                if (!allowedWorkerTabs.includes(prev)) {
                  try {
                    localStorage.setItem("stockcore_active_tab", "sales");
                  } catch {
                    // ignore
                  }
                  return "sales";
                }
                return prev;
              });
            }
          } else {
            setCurrentUser(null);
          }
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };
    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Periodic check for session expiration so login page shows automatically after session expiry (e.g. 48h)
  useEffect(() => {
    if (!currentUser) return;

    const checkExpiration = () => {
      if (authService.isSessionExpired()) {
        authService.clearSession();
        setCurrentUser(null);
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Sync state from storage
  const reloadData = useCallback(() => {
    setItems(storage.getItems());
    setSales(storage.getSales());
    setMetrics(storage.getDashboardMetrics());
    setEpJcRecords(storage.getEpJcDailyRecords());
    setEpJcTransactions(storage.getEpJcTransactions());
    setLoadRecords(storage.getLoadDailyRecords());
    setLoadTransactions(storage.getLoadTransactions());
    setProtectors(storage.getProtectors());
    setVendors(storage.getVendors());
    setVendorPurchases(storage.getVendorPurchases());
    setVendorPayments(storage.getVendorPayments());
    setExpenses(storage.getExpenses());
    setCashbookAccounts(storage.getCashBookAccounts());
    setCashbookTransactions(storage.getCashBookTransactions());
  }, []);

  useEffect(() => {
    setStoreSettings(storage.getStoreSettings());

    if (currentUser) {
      reloadData();
    }

    const unsubscribe = storage.subscribe(() => {
      setStoreSettings(storage.getStoreSettings());
      if (currentUser) {
        reloadData();
      }
    });

    // Auto-sync when user switches back to this browser or tab
    const handleFocus = () => {
      storage.forceSyncFromPcDisk();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, [reloadData, currentUser]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    if (user.role === "worker") {
      const allowedWorkerTabs = [
        "sales",
        "epjc",
        "load",
        "protectors",
        "settings",
      ];
      setActiveTabState((prev) => {
        if (!allowedWorkerTabs.includes(prev)) {
          try {
            localStorage.setItem("stockcore_active_tab", "sales");
          } catch {
            // ignore
          }
          return "sales";
        }
        return prev;
      });
    }
    reloadData();
    storage.forceSyncFromPcDisk();
  };

  // Guard restricted tabs if worker is logged in
  useEffect(() => {
    if (currentUser?.role === "worker") {
      const allowedWorkerTabs = [
        "sales",
        "epjc",
        "load",
        "protectors",
        "settings",
      ];
      if (!allowedWorkerTabs.includes(activeTab)) {
        setActiveTab("sales");
      }
    }
  }, [currentUser, activeTab, setActiveTab]);

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setActiveTab("dashboard");
  };

  // Handlers for modal interactions
  const handleOpenAddItem = () => {
    setItemToEdit(null);
    setActiveTab("inventory");
    setInventoryViewMode("ADD_PRODUCTS");
  };

  const handleOpenEditItem = (item: InventoryItem) => {
    setItemToEdit(item);
    setIsItemModalOpen(true);
  };

  const handleOpenAdjustStock = (item: InventoryItem) => {
    setItemToAdjust(item);
  };

  const handleOpenNewSale = () => {
    setActiveTab("sales");
    setSalesViewMode("NEW_SALE");
  };

  const handleSaleCompleted = (
    newSale?: Sale,
    shouldAutoPrintParam?: boolean,
  ) => {
    reloadData();
    if (newSale) {
      const isAutoPrint =
        shouldAutoPrintParam !== undefined ? shouldAutoPrintParam : true;
      setAutoPrintReceipt(isAutoPrint);
      setReceiptSale(newSale);
    }
  };

  const isWorker = currentUser?.role === "worker";
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const todaySalesCount = useMemo(
    () => sales.filter((s) => s.date === todayStr).length,
    [sales, todayStr],
  );
  const todayEpJcCount = useMemo(
    () => epJcTransactions.filter((t) => t.date === todayStr).length,
    [epJcTransactions, todayStr],
  );
  const todayLoadCount = useMemo(
    () => loadTransactions.filter((t) => t.date === todayStr).length,
    [loadTransactions, todayStr],
  );
  const todayExpensesCount = useMemo(
    () => expenses.filter((e) => e.date === todayStr).length,
    [expenses, todayStr],
  );

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-slate-900 selection:text-white">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-4 shadow-sm border border-slate-800 overflow-hidden">
          {storeSettings?.logoUrl ? (
            <img
              src={storeSettings.logoUrl}
              alt="Logo"
              className="w-full h-full object-contain p-1 bg-white"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Boxes className="w-6 h-6 text-emerald-400" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
          <span>Verifying security session...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        storeSettings={storeSettings}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lowStockCount={
          metrics.lowStockItemsCount + metrics.outOfStockItemsCount
        }
        salesCount={isWorker ? todaySalesCount : sales.length}
        epJcCount={isWorker ? todayEpJcCount : epJcRecords.length}
        loadCount={isWorker ? todayLoadCount : loadRecords.length}
        vendorUdhaarCount={vendors.filter((v) => v.currentBalance > 0).length}
        todayExpensesCount={todayExpensesCount}
        cashbookCount={
          cashbookAccounts.filter((a) => a.remainingBalance > 0).length
        }
        protectorsCount={protectors.length}
        currentUser={currentUser}
        storeSettings={storeSettings}
        onLogout={handleLogout}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onQuickNewItem={handleOpenAddItem}
        onQuickNewSale={handleOpenNewSale}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-full w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        {activeTab === "dashboard" && (
          <Dashboard
            metrics={metrics}
            items={items}
            sales={sales}
            epJcRecords={epJcRecords}
            epJcTransactions={epJcTransactions}
            loadRecords={loadRecords}
            loadTransactions={loadTransactions}
            currentUser={currentUser}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenNewItem={handleOpenAddItem}
            onOpenNewSale={handleOpenNewSale}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            onAdjustStock={handleOpenAdjustStock}
          />
        )}

        {activeTab === "sales" && (
          <Sales
            sales={sales}
            onOpenNewSale={handleOpenNewSale}
            onRefresh={reloadData}
            isWorker={isWorker}
            initialViewMode={salesViewMode}
            onViewModeChange={setSalesViewMode}
            onSaleRecorded={handleSaleCompleted}
          />
        )}

        {activeTab === "inventory" && (
          <Inventory
            items={items}
            onOpenAddItem={handleOpenAddItem}
            onEditItem={handleOpenEditItem}
            onAdjustStock={handleOpenAdjustStock}
            onDeleteSuccess={reloadData}
            initialViewMode={inventoryViewMode}
            onViewModeChange={setInventoryViewMode}
          />
        )}

        {activeTab === "epjc" && (
          <EpJcDashboard
            records={epJcRecords}
            transactions={epJcTransactions}
            isWorker={isWorker}
            onSaveDailyRecord={async (record) => {
              await storage.saveEpJcDailyRecord(record);
              reloadData();
            }}
            onDeleteDailyRecord={async (id) => {
              await storage.deleteEpJcDailyRecord(id);
              reloadData();
            }}
            onSaveTransaction={async (tx) => {
              await storage.saveEpJcTransaction(tx);
              reloadData();
            }}
            onDeleteTransaction={async (id) => {
              await storage.deleteEpJcTransaction(id);
              reloadData();
            }}
            onRefresh={reloadData}
          />
        )}

        {activeTab === "load" && (
          <LoadDashboard
            records={loadRecords}
            transactions={loadTransactions}
            isWorker={isWorker}
            onSaveDailyRecord={async (record) => {
              await storage.saveLoadDailyRecord(record);
              reloadData();
            }}
            onDeleteDailyRecord={async (id) => {
              await storage.deleteLoadDailyRecord(id);
              reloadData();
            }}
            onSaveTransaction={async (tx) => {
              await storage.saveLoadTransaction(tx);
              reloadData();
            }}
            onDeleteTransaction={async (id) => {
              await storage.deleteLoadTransaction(id);
              reloadData();
            }}
            onRefresh={reloadData}
          />
        )}

        {/* Protectors Service Tab: Shared for Worker and Admin Both */}
        {activeTab === "protectors" && (
          <Protectors
            protectors={protectors}
            currentUser={currentUser}
            onRefresh={reloadData}
            onSaveProtector={async (data) => {
              const res = await storage.saveProtector(data);
              reloadData();
              return res;
            }}
            onDeleteProtector={async (id) => {
              const res = await storage.deleteProtector(id);
              reloadData();
              return res;
            }}
            onAddModel={async (protectorId, brand, model) => {
              const res = await storage.addModelToProtector(
                protectorId,
                brand,
                model,
              );
              reloadData();
              return res;
            }}
            onRemoveModel={async (protectorId, brand, model) => {
              const res = await storage.removeModelFromProtector(
                protectorId,
                brand,
                model,
              );
              reloadData();
              return res;
            }}
            onQuickNewSale={handleOpenNewSale}
          />
        )}

        {activeTab === "vendors" && (
          <VendorDashboard
            vendors={vendors}
            purchases={vendorPurchases}
            payments={vendorPayments}
            inventoryItems={items}
            storeSettings={storeSettings}
            onSaveVendor={async (v) => {
              const res = await storage.saveVendor(v);
              reloadData();
              return res;
            }}
            onDeleteVendor={async (id) => {
              const res = await storage.deleteVendor(id);
              reloadData();
              return res;
            }}
            onSavePurchase={async (p) => {
              const res = await storage.saveVendorPurchase(p);
              reloadData();
              return res;
            }}
            onDeletePurchase={async (id) => {
              const res = await storage.deleteVendorPurchase(id);
              reloadData();
              return res;
            }}
            onSavePayment={async (pay) => {
              const res = await storage.saveVendorPayment(pay);
              reloadData();
              return res;
            }}
            onDeletePayment={async (id) => {
              const res = await storage.deleteVendorPayment(id);
              reloadData();
              return res;
            }}
            onRefresh={reloadData}
          />
        )}

        {activeTab === "expenses" && !isWorker && (
          <Expenses
            expenses={expenses}
            currentUser={currentUser}
            storeSettings={storeSettings}
            onRefresh={reloadData}
            onSaveDailyExpenses={async (date, items) => {
              const res = await storage.saveDailyExpenses(date, items);
              reloadData();
              return res;
            }}
            onDeleteExpense={async (id) => {
              const res = await storage.deleteExpense(id);
              reloadData();
              return res;
            }}
            onDeleteDailyExpenses={async (date) => {
              const res = await storage.deleteDailyExpenses(date);
              reloadData();
              return res;
            }}
          />
        )}

        {activeTab === "cashbook" && !isWorker && (
          <CashBook
            accounts={cashbookAccounts}
            transactions={cashbookTransactions}
            currentUser={currentUser}
            storeSettings={storeSettings}
            onRefresh={reloadData}
            onSaveAccount={async (acc) => {
              const res = await storage.saveCashBookAccount(acc);
              reloadData();
              return res;
            }}
            onDeleteAccount={async (id) => {
              const res = await storage.deleteCashBookAccount(id);
              reloadData();
              return res;
            }}
            onAddTransaction={async (tx) => {
              const res = await storage.addCashBookTransaction(tx);
              reloadData();
              return res;
            }}
            onDeleteTransaction={async (id) => {
              const res = await storage.deleteCashBookTransaction(id);
              reloadData();
              return res;
            }}
          />
        )}

        {activeTab === "sold-items" && (
          <SoldItems
            sales={sales}
            inventoryItems={items}
            storeSettings={storeSettings}
            isWorker={isWorker}
            currentUser={currentUser}
            onQuickNewSale={handleOpenNewSale}
          />
        )}

        {activeTab === "settings" && currentUser && (
          <Settings
            currentUser={currentUser}
            onRefresh={reloadData}
            onUserUpdated={setCurrentUser}
            onSettingsUpdated={setStoreSettings}
          />
        )}
      </main>

      {/* System Storage & Offline Status Footer */}
      <footer className="border-t border-slate-200/90 bg-white/95 py-5 px-4 sm:px-8 text-base text-slate-600">
        <div className="max-w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center flex-wrap gap-3 text-base">
            <span className="flex items-center gap-2.5 font-bold text-slate-800">
              <HardDrive className="w-5 h-5 text-emerald-600" />
              PC Disk Storage
            </span>
            <span aria-hidden="true" className="text-slate-300 font-bold">
              ·
            </span>
            <span className="text-slate-700 text-sm tabular-nums font-semibold">
              data/stock_database.json
            </span>
          </div>

          <div className="flex items-center gap-3.5 text-base">
            <span className="text-slate-700 font-medium flex items-center gap-2">
              {/* <ShieldCheck className="w-5 h-5 text-emerald-600" /> */}
              Designed &amp; Developed By{" "}
              <a
                href="https://obaidofficial.com"
                target="_blank"
                className="text-fuchsia-900 font-black"
              >
                Obaid
              </a>
            </span>
          </div>
        </div>
      </footer>

      {/* Item Add/Edit Modal */}
      <ItemModal
        isOpen={isItemModalOpen}
        itemToEdit={itemToEdit}
        onClose={() => {
          setIsItemModalOpen(false);
          setItemToEdit(null);
        }}
        onSaved={reloadData}
      />

      {/* Stock Adjust Modal */}
      {itemToAdjust && (
        <StockAdjustModal
          item={itemToAdjust}
          onClose={() => setItemToAdjust(null)}
          onAdjusted={reloadData}
        />
      )}

      {/* Sale Order Modal */}
      <NewSaleModal
        isOpen={isNewSaleModalOpen}
        onClose={() => setIsNewSaleModalOpen(false)}
        onSaleCompleted={handleSaleCompleted}
      />

      {/* Auto-Generated Sale Receipt Slip Modal */}
      {receiptSale && (
        <SaleReceiptModal
          sale={receiptSale}
          autoPrint={autoPrintReceipt}
          onClose={() => {
            setReceiptSale(null);
            setAutoPrintReceipt(false);
          }}
        />
      )}

      {/* System Storage Backup & Restore Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onDataChanged={reloadData}
      />
    </div>
  );
}
