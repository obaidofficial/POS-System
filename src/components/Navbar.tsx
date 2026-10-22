import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  Boxes,
  HardDrive,
  Plus,
  ShoppingCart,
  LogOut,
  Settings as SettingsIcon,
  Smartphone,
  Radio,
  Building2,
  Wallet,
  BookOpen,
  Shield,
  PackageCheck,
  Menu,
  X,
  ChevronRight,
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
  salesCount,
  currentUser,
  storeSettings,
  onLogout,
  onOpenBackupModal,
  onQuickNewItem,
  onQuickNewSale,
}) => {
  const isWorker = currentUser?.role === "worker";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close mobile drawer when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileMenuOpen]);

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    adminOnly?: boolean;
    section?: string;
  }[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      adminOnly: true,
      section: "POS & Counter",
    },
    {
      id: "sales",
      label: "Sales Orders",
      icon: ShoppingCart,
      section: "POS & Counter",
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Boxes,
      adminOnly: true,
      section: "POS & Counter",
    },
    {
      id: "epjc",
      label: "EP & JC Services",
      icon: Smartphone,
      section: "Telecom & Digital Services",
    },
    {
      id: "load",
      label: "Load Services",
      icon: Radio,
      section: "Telecom & Digital Services",
    },
    {
      id: "protectors",
      label: "Protectors",
      icon: Shield,
      section: "Telecom & Digital Services",
    },
    {
      id: "vendors",
      label: "Vendors & Khata",
      icon: Building2,
      adminOnly: true,
      section: "Accounts & Ledger",
    },
    {
      id: "expenses",
      label: "Expenses",
      icon: Wallet,
      adminOnly: true,
      section: "Accounts & Ledger",
    },
    {
      id: "cashbook",
      label: "Cash Book",
      icon: BookOpen,
      adminOnly: true,
      section: "Accounts & Ledger",
    },
    {
      id: "sold-items",
      label: "Sold Items",
      icon: PackageCheck,
      adminOnly: true,
      section: "Accounts & Ledger",
    },
    {
      id: "settings",
      label: isWorker ? "My Profile" : "Settings",
      icon: SettingsIcon,
      section: "System",
    },
  ];

  const visibleNavItems = navItems.filter((item) => !isWorker || !item.adminOnly);

  // Mobile Drawer rendered via Portal to escape header backdrop-filter stacking context
  const mobileDrawerContent = isMobileMenuOpen && isMounted && typeof document !== "undefined" ? (
    createPortal(
      <div className="fixed inset-0 z-[9999] lg:hidden">
        {/* Full-screen backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fadeIn"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Drawer container: full viewport height, pinned to left */}
        <aside
          id="mobile-nav-drawer"
          className="fixed inset-y-0 left-0 h-full h-[100dvh] max-h-[100dvh] w-[85vw] max-w-xs sm:max-w-sm bg-white shadow-2xl flex flex-col justify-between overflow-hidden animate-slideRight z-[10000]"
        >
          {/* 1. Drawer Header (Pinned at Top) */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200/90 bg-slate-50 shrink-0">
            {/* Drawer Logo (uses settings logoUrl if configured) */}
            <div
              onClick={() => handleTabClick(isWorker ? "sales" : "dashboard")}
              className="flex items-center cursor-pointer group py-0.5 max-w-[calc(100%-48px)]"
              title={storeSettings?.brandName || "POS"}
            >
              {storeSettings?.logoUrl ? (
                <div className="flex items-center justify-start p-0.5 max-w-[180px] sm:max-w-[210px] h-9 sm:h-10">
                  <img
                    src={storeSettings.logoUrl}
                    alt={storeSettings.brandName || "Brand Logo"}
                    className="w-full h-full object-contain object-left"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:bg-slate-800 transition-colors">
                    <Boxes className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="leading-tight">
                    <span className="font-bold text-slate-900 text-sm block truncate max-w-[160px] sm:max-w-[190px]">
                      {storeSettings?.brandName || "POS"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              id="btn-close-mobile-drawer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 active:bg-slate-300 transition-colors cursor-pointer touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          {/* 2. Scrollable Body: User Profile + Quick Actions + Navigation Tabs */}
          <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-100">
            {/* User Profile Card */}
            <div className="p-4 bg-gradient-to-br from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold shadow-xs overflow-hidden shrink-0">
                  {currentUser?.photo ? (
                    <img
                      src={currentUser.photo}
                      alt={currentUser.name || "User Photo"}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    (currentUser?.name || currentUser?.username || "O")[0].toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm truncate">
                      {currentUser?.name || "Obaid"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                        isWorker
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {currentUser?.role || "ADMIN"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono block truncate">
                    @{currentUser?.username || "obaid"}
                  </span>
                </div>
              </div>

              {/* Mobile Quick Action Buttons inside Drawer */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/70">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onQuickNewSale();
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-xs cursor-pointer touch-manipulation"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>New Sale</span>
                </button>

                {!isWorker ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onQuickNewItem();
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold shadow-xs cursor-pointer touch-manipulation"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Add Product</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTabClick("sales")}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold cursor-pointer touch-manipulation"
                  >
                    <span>Sales ({salesCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs List */}
            <div className="p-3 space-y-1">
              <span className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                All App Sections
              </span>

              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer touch-manipulation ${
                      isActive
                        ? "bg-slate-900 text-white font-bold shadow-xs"
                        : "text-slate-700 hover:bg-slate-100 active:bg-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? "text-emerald-400" : "text-slate-500"
                        }`}
                      />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 ${
                        isActive ? "text-emerald-400" : "text-slate-400"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Drawer Footer Actions (Pinned at Bottom) */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2 shrink-0">
            {!isWorker && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenBackupModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold hover:bg-orange-100 active:bg-orange-200 cursor-pointer touch-manipulation"
              >
                <HardDrive className="w-4 h-4" />
                <span>PC Disk Storage &amp; Backup</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onLogout();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 active:bg-red-800 shadow-xs cursor-pointer touch-manipulation"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out ({currentUser?.username || "obaid"})</span>
            </button>
          </div>
        </aside>
      </div>,
      document.body,
    )
  ) : null;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs antialiased">
        <div className="max-w-full mx-auto px-3 sm:px-5 lg:px-8">
          {/* Main Top Bar */}
          <div className="flex items-center justify-between min-h-[3.75rem] sm:min-h-[4.25rem] py-1.5 gap-2">
            {/* Left: Brand Logo */}
            <div
              onClick={() => handleTabClick(isWorker ? "sales" : "dashboard")}
              className="flex items-center gap-2.5 cursor-pointer group py-1 shrink-0"
            >
              {storeSettings?.logoUrl ? (
                <div className="flex items-center justify-center p-0.5 max-w-[150px] sm:max-w-[210px] h-9 sm:h-12">
                  <img
                    src={storeSettings.logoUrl}
                    alt={storeSettings.brandName || "Brand Logo"}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:bg-slate-800 transition-all duration-200 group-hover:scale-105">
                    <Boxes className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                  </div>
                  <div className="leading-tight">
                    <div className="font-bold text-slate-900 text-sm sm:text-lg tracking-tight group-hover:text-slate-800 transition-colors truncate max-w-[140px] sm:max-w-none">
                      {storeSettings?.brandName || "POS"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right on Mobile & Tablet: Hamburger Menu Toggle Button */}
            <div className="flex items-center lg:hidden">
              <button
                type="button"
                id="btn-mobile-menu-toggle"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 sm:p-2.5 rounded-xl text-slate-800 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors cursor-pointer touch-manipulation min-w-[42px] min-h-[42px] flex items-center justify-center border border-slate-200/80 shadow-2xs"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open navigation menu"}
                title={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-slate-900" />
                ) : (
                  <Menu className="w-5 h-5 text-slate-900" />
                )}
              </button>
            </div>

            {/* Right on Desktop: Action Buttons, Storage & User Profile (Hidden on Mobile & Tablet) */}
            <div className="hidden lg:flex items-center gap-2.5">
              {/* Quick Action: Record Sale */}
              <button
                id="btn-quick-new-sale"
                onClick={onQuickNewSale}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                title="Record New Sale (F9)"
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                <span>Record Sale</span>
              </button>

              {/* Quick Action: Add Product (Admin Only) */}
              {!isWorker && (
                <button
                  id="btn-quick-new-item"
                  onClick={onQuickNewItem}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-sm font-semibold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                  title="Add New Inventory Product"
                >
                  <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Add Product</span>
                </button>
              )}

              {/* Quick Action: PC Storage Backup (Admin Only) */}
              {!isWorker && (
                <button
                  id="btn-system-storage-backup"
                  onClick={onOpenBackupModal}
                  title="PC Storage File & Database Backups"
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#fe691e] hover:bg-[#ff8a05] active:bg-[#fe691e] text-white text-sm font-medium shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                >
                  <HardDrive className="w-4 h-4 text-white" />
                  <span>PC Storage</span>
                </button>
              )}

              {/* User Profile & Logout Area */}
              <div className="flex items-center pl-2.5 border-l border-slate-200 ml-1 gap-2">
                {/* User Profile Badge */}
                <button
                  type="button"
                  id="user-badge"
                  onClick={() => handleTabClick("settings")}
                  title={`User: ${currentUser?.name || "Obaid"} (@${currentUser?.username || "obaid"}) - Open Settings`}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 text-slate-800 text-sm font-medium cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-2xs overflow-hidden shrink-0">
                    {currentUser?.photo ? (
                      <img
                        src={currentUser.photo}
                        alt={currentUser.name || "User Photo"}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      (currentUser?.name || currentUser?.username || "O")[0].toUpperCase()
                    )}
                  </div>
                  <span className="font-semibold text-slate-900 text-sm truncate max-w-[110px]">
                    {currentUser?.name || "Obaid"}
                  </span>
                </button>

                {/* Sign Out Button */}
                <button
                  id="btn-nav-logout"
                  onClick={onLogout}
                  title="Sign Out"
                  className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-500 hover:text-red-600 text-sm font-semibold transition-colors border border-red-200 hover:border-red-300 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="ml-1.5">Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Horizontal Tabs (Hidden on Mobile & Tablet) */}
          <nav className="hidden lg:flex space-x-1.5 sm:space-x-2 border-t border-slate-100 overflow-x-auto py-1.5 sm:py-2 scrollbar-none">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? "text-emerald-400" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Render the drawer via Portal to guarantee top z-index above all page elements */}
      {mobileDrawerContent}
    </>
  );
};
