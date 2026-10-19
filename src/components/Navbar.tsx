import React from "react";
import {
  LayoutDashboard,
  Boxes,
  HardDrive,
  Plus,
  ShoppingCart,
  User,
  LogOut,
  Settings as SettingsIcon,
  Smartphone,
  Radio,
  Building2,
  Wallet,
  BookOpen,
  Shield,
  PackageCheck,
} from "lucide-react";
import { AuthUser, StoreSettings } from "../types";

export type ActiveTab =
  | "dashboard"
  | "inventory"
  | "sales"
  | "epjc"
  | "load"
  | "protectors"
  | "vendors"
  | "expenses"
  | "cashbook"
  | "sold-items"
  | "settings";

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  lowStockCount: number;
  salesCount: number;
  epJcCount?: number;
  loadCount?: number;
  protectorsCount?: number;
  vendorUdhaarCount?: number;
  todayExpensesCount?: number;
  cashbookCount?: number;
  currentUser: AuthUser | null;
  storeSettings?: StoreSettings;
  onLogout: () => void;
  onOpenBackupModal: () => void;
  onQuickNewItem: () => void;
  onQuickNewSale: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount,
  salesCount,
  epJcCount,
  loadCount,
  protectorsCount,
  vendorUdhaarCount,
  todayExpensesCount,
  cashbookCount,
  currentUser,
  storeSettings,
  onLogout,
  onOpenBackupModal,
  onQuickNewItem,
  onQuickNewSale,
}) => {
  const isWorker = currentUser?.role === "worker";

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[4.5rem] py-2">
          {/* Logo & App Branding */}
          <div
            onClick={() => setActiveTab(isWorker ? "sales" : "dashboard")}
            className="flex items-center gap-3.5 cursor-pointer group py-1"
          >
            {storeSettings?.logoUrl ? (
              <div className="flex items-center justify-center p-1 w-52 h-14">
                <img
                  src={storeSettings.logoUrl}
                  alt={storeSettings.brandName || "Brand Logo"}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:bg-slate-800 transition-all duration-200 group-hover:scale-105">
                  <Boxes className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="leading-tight">
                  <div className="font-bold text-slate-900 text-lg tracking-tight group-hover:text-slate-800 transition-colors">
                    {storeSettings?.brandName || "POS"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Record Sale: Allowed for both Worker and Admin */}
            <button
              id="btn-quick-new-sale"
              onClick={onQuickNewSale}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-medium shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Record Sale</span>
            </button>

            {/* Add Product: Admin Only (Workers do not have inventory permission) */}
            {!isWorker && (
              <button
                id="btn-quick-new-item"
                onClick={onQuickNewItem}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-sm font-medium shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Product</span>
              </button>
            )}

            {/* PC Storage File Backup: Admin Only */}
            {!isWorker && (
              <button
                id="btn-system-storage-backup"
                onClick={onOpenBackupModal}
                title="PC Storage File & Database Backups"
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-md bg-[#fe691e] hover:bg-[#ff8a05] active:bg-[#fe691e] text-white text-sm font-medium shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                <HardDrive className="w-4 h-4 text-white" />
                <span className="hidden md:inline">PC Storage</span>
              </button>
            )}

            {/* User Profile & Logout */}
            <div className="flex items-center pl-3 border-l border-slate-200 ml-1.5 gap-2.5">
              {/* User Profile Badge */}
              <button
                type="button"
                id="user-badge"
                onClick={() => setActiveTab("settings")}
                title={`User: ${currentUser?.name || "Obaid"} (@${currentUser?.username || "obaid"})`}
                className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-md bg-slate-200/90 hover:bg-slate-200/90 text-slate-800 text-sm font-medium cursor-pointer transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-2xs overflow-hidden shrink-0">
                  {currentUser?.photo ? (
                    <img
                      src={currentUser.photo}
                      alt={currentUser.name || "User Photo"}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    (currentUser?.name ||
                      currentUser?.username ||
                      "O")[0].toUpperCase()
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline font-semibold text-slate-900 text-base">
                    {currentUser?.name || "Obaid"}
                  </span>
                </div>
              </button>

              <button
                id="btn-nav-logout"
                onClick={onLogout}
                title="Sign Out"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 text-sm font-semibold transition-colors border border-red-200 hover:border-red-300 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden xl:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-2 border-t border-slate-100 overflow-x-auto py-2 scrollbar-none">
          {/* Dashboard: Admin Only */}
          {!isWorker && (
            <button
              id="nav-tab-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2.25 px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/90"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          )}

          {/* 1. Sale a product (Sales Tab) - Available for Worker & Admin */}
          <button
            id="nav-tab-sales"
            onClick={() => setActiveTab("sales")}
            className={`flex items-center gap-2.25 px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "sales"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/90"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Sales</span>
            {/* <span
              className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-mono tabular-nums rounded font-semibold ${
                activeTab === "sales"
                  ? "bg-slate-800 text-slate-200"
                  : "bg-slate-200/70 text-slate-700"
              }`}
            >
              {salesCount}
            </span> */}
          </button>

          {/* Inventory: Admin Only */}
          {!isWorker && (
            <button
              id="nav-tab-inventory"
              onClick={() => setActiveTab("inventory")}
              className={`flex items-center gap-2.25 px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "inventory"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/90"
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Inventory</span>
              {/* {lowStockCount > 0 && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold font-mono tabular-nums rounded bg-amber-500 text-white">
                  {lowStockCount}
                </span>
              )} */}
            </button>
          )}

          {/* 2. Use EP & JC Service - Available for Worker & Admin */}
          <button
            id="nav-tab-epjc"
            onClick={() => setActiveTab("epjc")}
            className={`flex items-center gap-2.25 px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "epjc"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/90"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>EP &amp; JC Services</span>
            {/* {epJcCount !== undefined && epJcCount > 0 && (
              <span
                className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-mono tabular-nums rounded ${
                  activeTab === "epjc"
                    ? "bg-slate-800 text-emerald-300 font-bold"
                    : "bg-emerald-100 text-emerald-800 font-medium"
                }`}
              >
                {epJcCount}
              </span>
            )} */}
          </button>

          {/* 3. Load Services - Available for Worker & Admin */}
          <button
            id="nav-tab-load"
            onClick={() => setActiveTab("load")}
            className={`flex items-center gap-2.25 px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "load"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/90"
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Load Services</span>
            {/* {loadCount !== undefined && loadCount > 0 && (
              <span
                className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-mono tabular-nums rounded ${
                  activeTab === "load"
                    ? "bg-slate-800 text-amber-300 font-bold"
                    : "bg-amber-100 text-amber-800 font-medium"
                }`}
              >
                {loadCount}
              </span>
            )} */}
          </button>

          {/* 4. Protectors Service Tab - Available for Worker & Admin Both */}
          <button
            id="nav-tab-protectors"
            onClick={() => setActiveTab("protectors")}
            className={`flex items-center gap-2.25 px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "protectors"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/90"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Protectors</span>
            {/* {protectorsCount !== undefined && protectorsCount > 0 && (
              <span
                className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-mono tabular-nums rounded ${
                  activeTab === "protectors"
                    ? "bg-slate-800 text-emerald-300 font-bold"
                    : "bg-emerald-100 text-emerald-800 font-medium"
                }`}
              >
                {protectorsCount}
              </span>
            )} */}
          </button>

          {/* Vendors & Khata: Admin Only */}
          {!isWorker && (
            <button
              id="nav-tab-vendors"
              onClick={() => setActiveTab("vendors")}
              className={`flex items-center gap-2.25 px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "vendors"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/90"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Vendors &amp; Khata</span>
              {/* {vendorUdhaarCount !== undefined && vendorUdhaarCount > 0 && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold rounded bg-amber-500 text-white font-mono tabular-nums">
                  {vendorUdhaarCount}
                </span>
              )} */}
            </button>
          )}

          {/* Expenses Tab: Admin Only */}
          {!isWorker && (
            <button
              id="nav-tab-expenses"
              onClick={() => setActiveTab("expenses")}
              className={`flex items-center gap-2.25 px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "expenses"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/90"
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Expenses</span>
              {/* {todayExpensesCount !== undefined && todayExpensesCount > 0 && (
                <span
                  className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-mono tabular-nums rounded font-semibold ${
                    activeTab === "expenses"
                      ? "bg-slate-800 text-rose-300"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {todayExpensesCount}
                </span>
              )} */}
            </button>
          )}

          {/* Cash Book / Khata Tab: Admin Only */}
          {!isWorker && (
            <button
              id="nav-tab-cashbook"
              onClick={() => setActiveTab("cashbook")}
              className={`flex items-center gap-2.25 px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "cashbook"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/90"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Cash Book</span>
              {/* {cashbookCount !== undefined && cashbookCount > 0 && (
                <span
                  className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-mono tabular-nums rounded font-semibold ${
                    activeTab === "cashbook"
                      ? "bg-slate-800 text-amber-300"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {cashbookCount}
                </span>
              )} */}
            </button>
          )}

          {/* Sold Items Tab: Before Settings Tab */}
          {!isWorker && (
            <button
              id="nav-tab-sold-items"
              onClick={() => setActiveTab("sold-items")}
              className={`flex items-center gap-2.25 px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "sold-items"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/90"
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>Sold Items</span>
            </button>
          )}

          {/* Settings / My Profile: Available for Worker & Admin */}
          <button
            id="nav-tab-settings"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2.25 px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/90"
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>{isWorker ? "My Profile" : "Settings"}</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
