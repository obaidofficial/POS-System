import React, { useState, useMemo } from 'react';
import {
  PackageCheck,
  Calendar,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  Download,
  Printer,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Tag,
  Boxes,
  DollarSign,
  Layers,
  ArrowUpDown,
  ShoppingBag,
  Sparkles,
  BarChart3,
  Clock,
  Eye,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Sale, InventoryItem, StoreSettings, AuthUser } from '../types';
import { formatPKR } from '../utils/currency';
import { getBusinessDate, getDateNDaysAgoBusiness } from '../utils/businessDate';
import { TablePagination } from './TablePagination';
import { getStoredPageSize, setStoredPageSize } from '../utils/pagination';

interface SoldItemsProps {
  sales: Sale[];
  inventoryItems: InventoryItem[];
  storeSettings?: StoreSettings;
  isWorker?: boolean;
  currentUser?: AuthUser | null;
  onQuickNewSale?: () => void;
}

export interface SoldItemAggregated {
  itemId: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  brand: string;
  unitsSold: number;
  avgSoldPrice: number;
  costPrice: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMarginPercent: number;
  salesCount: number;
}

export interface BrandSubBreakdown {
  brand: string;
  unitsSold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMarginPercent: number;
  percentOfCategoryUnits: number;
  items: SoldItemAggregated[];
}

export interface CategorySoldBreakdown {
  category: string;
  unitsSold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMarginPercent: number;
  percentOfTotalUnits: number;
  brands: Record<string, BrandSubBreakdown>;
  items: SoldItemAggregated[];
}

export interface CategorySubBreakdown {
  category: string;
  unitsSold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMarginPercent: number;
  percentOfBrandUnits: number;
  items: SoldItemAggregated[];
}

export interface BrandSoldBreakdown {
  brand: string;
  unitsSold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMarginPercent: number;
  percentOfTotalUnits: number;
  categories: Record<string, CategorySubBreakdown>;
  items: SoldItemAggregated[];
}

// Helper to format date offset based on Pakistan business date
function formatDateOffset(daysAgo: number): string {
  return getDateNDaysAgoBusiness(daysAgo);
}

export const SoldItems: React.FC<SoldItemsProps> = ({
  sales,
  inventoryItems,
  storeSettings,
  isWorker = false,
  currentUser,
  onQuickNewSale,
}) => {
  const todayStr = useMemo(() => getBusinessDate(), []);
  const yesterdayStr = useMemo(() => formatDateOffset(1), []);

  // Filter States
  const [dateFilterType, setDateFilterType] = useState<
    'TODAY' | 'YESTERDAY' | 'LAST_7' | 'LAST_8' | 'LAST_15' | 'LAST_30' | 'THIS_MONTH' | 'LAST_MONTH' | 'RANGE' | 'ALL'
  >('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // View presentation mode: 'CATEGORY' | 'BRAND' | 'TABLE'
  const [viewGrouping, setViewGrouping] = useState<'CATEGORY' | 'BRAND' | 'TABLE'>('CATEGORY');

  // Expanded items in category view
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  // Sorting for detailed table
  const [sortField, setSortField] = useState<'unitsSold' | 'totalRevenue' | 'totalProfit' | 'name' | 'brand' | 'category'>('unitsSold');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination for detailed table
  const [pageSize, setPageSize] = useState<number>(() => getStoredPageSize('sold_items', 20));
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Quick lookup map for inventory items to retrieve brand, category, and cost if missing on historical sales
  const inventoryMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    inventoryItems.forEach((item) => {
      map.set(item.id, item);
      if (item.sku) map.set(item.sku, item);
      if (item.barcode) map.set(item.barcode, item);
    });
    return map;
  }, [inventoryItems]);

  // Available brands list
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    inventoryItems.forEach((item) => {
      if (item.brand && item.brand.trim()) {
        set.add(item.brand.trim());
      }
    });
    sales.forEach((s) => {
      s.items.forEach((line) => {
        const item = inventoryMap.get(line.itemId) || inventoryMap.get(line.sku);
        const b = line.brand || item?.brand;
        if (b && b.trim()) set.add(b.trim());
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [inventoryItems, sales, inventoryMap]);

  // Available categories list
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    inventoryItems.forEach((item) => {
      if (item.category && item.category.trim()) {
        set.add(item.category.trim());
      }
    });
    sales.forEach((s) => {
      s.items.forEach((line) => {
        const item = inventoryMap.get(line.itemId) || inventoryMap.get(line.sku);
        const c = line.category || item?.category;
        if (c && c.trim()) set.add(c.trim());
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [inventoryItems, sales, inventoryMap]);

  // Quick date preset handlers
  const handleApplyPreset = (preset: typeof dateFilterType) => {
    setDateFilterType(preset);
    setCurrentPage(1);

    if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'YESTERDAY') {
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
    } else if (preset === 'LAST_7') {
      setStartDate(formatDateOffset(6));
      setEndDate(todayStr);
    } else if (preset === 'LAST_8') {
      setStartDate(formatDateOffset(7));
      setEndDate(todayStr);
    } else if (preset === 'LAST_15') {
      setStartDate(formatDateOffset(14));
      setEndDate(todayStr);
    } else if (preset === 'LAST_30') {
      setStartDate(formatDateOffset(29));
      setEndDate(todayStr);
    } else if (preset === 'THIS_MONTH') {
      const now = new Date();
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'LAST_MONTH') {
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const firstDay = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = `${lastDayPrevMonth.getFullYear()}-${String(lastDayPrevMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDayPrevMonth.getDate()).padStart(2, '0')}`;
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleResetFilters = () => {
    setDateFilterType('ALL');
    setStartDate('');
    setEndDate('');
    setSelectedBrand('ALL');
    setSelectedCategory('ALL');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Filter sales by date range
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      if (!sale.date) return true;
      if (startDate && sale.date < startDate) return false;
      if (endDate && sale.date > endDate) return false;
      return true;
    });
  }, [sales, startDate, endDate]);

  // Aggregate line items sold
  const {
    itemsList,
    categoriesList,
    brandsList,
    totalUnitsSold,
    totalSalesRevenue,
    totalCostValue,
    totalNetProfit,
    overallProfitMargin,
  } = useMemo(() => {
    const itemAggMap = new Map<string, SoldItemAggregated>();
    let grandUnits = 0;
    let grandRevenue = 0;
    let grandCost = 0;

    filteredSales.forEach((sale) => {
      if (!sale.items || !Array.isArray(sale.items)) return;

      sale.items.forEach((line) => {
        const netQty = Math.max(0, line.quantity - (line.returnedQuantity || 0));
        if (netQty <= 0) return;

        const inv = inventoryMap.get(line.itemId) || inventoryMap.get(line.sku);
        const resolvedCategory = (line.category || inv?.category || 'General').trim() || 'General';
        const resolvedBrand = (line.brand || inv?.brand || 'Generic / Other').trim() || 'Generic / Other';
        const resolvedCost = line.costPrice !== undefined && line.costPrice > 0 ? line.costPrice : (inv?.costPrice || 0);
        const lineSoldPrice = line.soldPrice !== undefined && line.soldPrice > 0 ? line.soldPrice : (line.total / line.quantity) || 0;

        // Apply brand filter
        if (selectedBrand !== 'ALL' && resolvedBrand.toLowerCase() !== selectedBrand.toLowerCase()) {
          return;
        }

        // Apply category filter
        if (selectedCategory !== 'ALL' && resolvedCategory.toLowerCase() !== selectedCategory.toLowerCase()) {
          return;
        }

        // Apply search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = (line.name || '').toLowerCase().includes(q);
          const matchSku = (line.sku || '').toLowerCase().includes(q);
          const matchBarcode = (line.barcode || inv?.barcode || '').toLowerCase().includes(q);
          const matchBrand = resolvedBrand.toLowerCase().includes(q);
          const matchCat = resolvedCategory.toLowerCase().includes(q);
          if (!matchName && !matchSku && !matchBarcode && !matchBrand && !matchCat) {
            return;
          }
        }

        const lineRev = netQty * lineSoldPrice;
        const lineCost = netQty * resolvedCost;
        const lineProfit = lineRev - lineCost;

        grandUnits += netQty;
        grandRevenue += lineRev;
        grandCost += lineCost;

        const aggKey = `${line.itemId || line.sku || line.name}_${resolvedBrand}_${resolvedCategory}`;
        const existing = itemAggMap.get(aggKey);

        if (existing) {
          existing.unitsSold += netQty;
          existing.totalRevenue += lineRev;
          existing.totalCost += lineCost;
          existing.totalProfit += lineProfit;
          existing.salesCount += 1;
          existing.avgSoldPrice = existing.totalRevenue / existing.unitsSold;
          existing.profitMarginPercent = existing.totalRevenue > 0 ? (existing.totalProfit / existing.totalRevenue) * 100 : 0;
        } else {
          itemAggMap.set(aggKey, {
            itemId: line.itemId || line.sku || `item_${Date.now()}`,
            name: line.name || inv?.name || 'Unnamed Product',
            sku: line.sku || inv?.sku || 'N/A',
            barcode: line.barcode || inv?.barcode,
            category: resolvedCategory,
            brand: resolvedBrand,
            unitsSold: netQty,
            avgSoldPrice: lineSoldPrice,
            costPrice: resolvedCost,
            totalRevenue: lineRev,
            totalCost: lineCost,
            totalProfit: lineProfit,
            profitMarginPercent: lineRev > 0 ? (lineProfit / lineRev) * 100 : 0,
            salesCount: 1,
          });
        }
      });
    });

    const grandProfit = grandRevenue - grandCost;
    const grandMargin = grandRevenue > 0 ? (grandProfit / grandRevenue) * 100 : 0;

    const itemsArr = Array.from(itemAggMap.values());

    // Group by Category
    const catMap: Record<string, CategorySoldBreakdown> = {};
    itemsArr.forEach((item) => {
      if (!catMap[item.category]) {
        catMap[item.category] = {
          category: item.category,
          unitsSold: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          profitMarginPercent: 0,
          percentOfTotalUnits: 0,
          brands: {},
          items: [],
        };
      }
      const c = catMap[item.category];
      c.unitsSold += item.unitsSold;
      c.totalRevenue += item.totalRevenue;
      c.totalCost += item.totalCost;
      c.totalProfit += item.totalProfit;
      c.items.push(item);

      if (!c.brands[item.brand]) {
        c.brands[item.brand] = {
          brand: item.brand,
          unitsSold: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          profitMarginPercent: 0,
          percentOfCategoryUnits: 0,
          items: [],
        };
      }
      const b = c.brands[item.brand];
      b.unitsSold += item.unitsSold;
      b.totalRevenue += item.totalRevenue;
      b.totalCost += item.totalCost;
      b.totalProfit += item.totalProfit;
      b.items.push(item);
    });

    const catsArr: CategorySoldBreakdown[] = Object.values(catMap).map((cat) => {
      const margin = cat.totalRevenue > 0 ? (cat.totalProfit / cat.totalRevenue) * 100 : 0;
      const unitShare = grandUnits > 0 ? (cat.unitsSold / grandUnits) * 100 : 0;

      // Calculate brand shares inside category
      (Object.values(cat.brands) as BrandSubBreakdown[]).forEach((b) => {
        b.profitMarginPercent = b.totalRevenue > 0 ? (b.totalProfit / b.totalRevenue) * 100 : 0;
        b.percentOfCategoryUnits = cat.unitsSold > 0 ? (b.unitsSold / cat.unitsSold) * 100 : 0;
        b.items.sort((a, b) => b.unitsSold - a.unitsSold);
      });

      cat.items.sort((a, b) => b.unitsSold - a.unitsSold);

      return {
        ...cat,
        profitMarginPercent: margin,
        percentOfTotalUnits: unitShare,
      };
    });
    catsArr.sort((a, b) => b.unitsSold - a.unitsSold);

    // Group by Brand
    const bMap: Record<string, BrandSoldBreakdown> = {};
    itemsArr.forEach((item) => {
      if (!bMap[item.brand]) {
        bMap[item.brand] = {
          brand: item.brand,
          unitsSold: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          profitMarginPercent: 0,
          percentOfTotalUnits: 0,
          categories: {},
          items: [],
        };
      }
      const b = bMap[item.brand];
      b.unitsSold += item.unitsSold;
      b.totalRevenue += item.totalRevenue;
      b.totalCost += item.totalCost;
      b.totalProfit += item.totalProfit;
      b.items.push(item);

      if (!b.categories[item.category]) {
        b.categories[item.category] = {
          category: item.category,
          unitsSold: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          profitMarginPercent: 0,
          percentOfBrandUnits: 0,
          items: [],
        };
      }
      const c = b.categories[item.category];
      c.unitsSold += item.unitsSold;
      c.totalRevenue += item.totalRevenue;
      c.totalCost += item.totalCost;
      c.totalProfit += item.totalProfit;
      c.items.push(item);
    });

    const brandsArr: BrandSoldBreakdown[] = (Object.values(bMap) as BrandSoldBreakdown[]).map((brand) => {
      const margin = brand.totalRevenue > 0 ? (brand.totalProfit / brand.totalRevenue) * 100 : 0;
      const unitShare = grandUnits > 0 ? (brand.unitsSold / grandUnits) * 100 : 0;

      (Object.values(brand.categories) as CategorySubBreakdown[]).forEach((c) => {
        c.profitMarginPercent = c.totalRevenue > 0 ? (c.totalProfit / c.totalRevenue) * 100 : 0;
        c.percentOfBrandUnits = brand.unitsSold > 0 ? (c.unitsSold / brand.unitsSold) * 100 : 0;
        c.items.sort((a, b) => b.unitsSold - a.unitsSold);
      });

      brand.items.sort((a, b) => b.unitsSold - a.unitsSold);

      return {
        ...brand,
        profitMarginPercent: margin,
        percentOfTotalUnits: unitShare,
      };
    });
    brandsArr.sort((a, b) => b.unitsSold - a.unitsSold);

    return {
      itemsList: itemsArr,
      categoriesList: catsArr,
      brandsList: brandsArr,
      totalUnitsSold: grandUnits,
      totalSalesRevenue: grandRevenue,
      totalCostValue: grandCost,
      totalNetProfit: grandProfit,
      overallProfitMargin: grandMargin,
    };
  }, [filteredSales, inventoryMap, selectedBrand, selectedCategory, searchQuery]);

  // Sorted items list for table view
  const sortedItems = useMemo(() => {
    return [...itemsList].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'unitsSold') cmp = a.unitsSold - b.unitsSold;
      else if (sortField === 'totalRevenue') cmp = a.totalRevenue - b.totalRevenue;
      else if (sortField === 'totalProfit') cmp = a.totalProfit - b.totalProfit;
      else if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'brand') cmp = a.brand.localeCompare(b.brand);
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }, [itemsList, sortField, sortOrder]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleCategoryExpand = (catName: string) => {
    setExpandedCats((prev) => ({ ...prev, [catName]: !prev[catName] }));
  };

  const toggleBrandExpand = (brandName: string) => {
    setExpandedBrands((prev) => ({ ...prev, [brandName]: !prev[brandName] }));
  };

  const handleExpandAll = (expanded: boolean) => {
    const nextCat: Record<string, boolean> = {};
    const nextBrand: Record<string, boolean> = {};
    categoriesList.forEach((c) => {
      nextCat[c.category] = expanded;
    });
    brandsList.forEach((b) => {
      nextBrand[b.brand] = expanded;
    });
    setExpandedCats(nextCat);
    setExpandedBrands(nextBrand);
  };

  // Export report to CSV
  const handleExportCSV = () => {
    const headers = [
      'Item Name',
      'SKU',
      'Category',
      'Brand',
      'Units Sold',
      'Avg Sold Price (PKR)',
      'Cost Price (PKR)',
      'Total Revenue (PKR)',
      'Total Cost (PKR)',
      'Net Profit (PKR)',
      'Profit Margin (%)',
      'Invoices Count',
    ];

    const rows = sortedItems.map((item) => [
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.sku.replace(/"/g, '""')}"`,
      `"${item.category.replace(/"/g, '""')}"`,
      `"${item.brand.replace(/"/g, '""')}"`,
      item.unitsSold,
      item.avgSoldPrice.toFixed(2),
      item.costPrice.toFixed(2),
      item.totalRevenue.toFixed(2),
      item.totalCost.toFixed(2),
      item.totalProfit.toFixed(2),
      item.profitMarginPercent.toFixed(1),
      item.salesCount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateTag = startDate && endDate ? `${startDate}_to_${endDate}` : 'all_time';
    link.setAttribute('download', `sold_items_report_${dateTag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  // Dynamic Date Range Badge Label
  const periodLabel = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) return `Date: ${startDate}`;
      return `${startDate} to ${endDate}`;
    }
    if (startDate) return `From ${startDate}`;
    if (endDate) return `Until ${endDate}`;
    return 'All Time History';
  }, [startDate, endDate]);

  const topCategory = categoriesList.length > 0 ? categoriesList[0] : null;
  const topBrand = brandsList.length > 0 ? brandsList[0] : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Sold Items Analytics &amp; Breakdown
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono">
                    Category · Brand · Profit
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  See how many units of inventory category items are sold with brand filters, custom date ranges, and exact profit margins.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Tools */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              id="btn-sold-items-export-csv"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              title="Download CSV spreadsheet of sold items"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              id="btn-sold-items-print"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              title="Print report or save as PDF"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Report</span>
            </button>

            {onQuickNewSale && (
              <button
                type="button"
                id="btn-sold-items-new-sale"
                onClick={onQuickNewSale}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Record New Sale</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
          {/* Preset Date Range Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Quick Date:
            </span>
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'LAST_7', label: 'Last 7 Days' },
              { id: 'LAST_8', label: 'Last 8 Days' },
              { id: 'LAST_15', label: 'Last 15 Days' },
              { id: 'LAST_30', label: 'Last 30 Days' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'LAST_MONTH', label: 'Last Month' },
            ].map((preset) => {
              const active = dateFilterType === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  id={`btn-preset-${preset.id.toLowerCase()}`}
                  onClick={() => handleApplyPreset(preset.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Granular Filters Grid: Date Inputs, Brand, Category & Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            {/* Start Date */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                From Date:
              </label>
              <input
                id="input-sold-items-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateFilterType('RANGE');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50/70 hover:bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                To Date:
              </label>
              <input
                id="input-sold-items-end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateFilterType('RANGE');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50/70 hover:bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              />
            </div>

            {/* Brands Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Brand Filter:
              </label>
              <select
                id="select-sold-items-brand"
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50/70 hover:bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              >
                <option value="ALL">All Brands ({availableBrands.length})</option>
                {availableBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                Category Filter:
              </label>
              <select
                id="select-sold-items-category"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50/70 hover:bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              >
                <option value="ALL">All Categories ({availableCategories.length})</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Query */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-indigo-600" />
                Search Product / SKU:
              </label>
              <div className="relative">
                <input
                  id="input-sold-items-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Filter name or SKU..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50/70 hover:bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Active Filter Chips & Reset */}
          {(startDate || endDate || selectedBrand !== 'ALL' || selectedCategory !== 'ALL' || searchQuery) && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="font-bold text-slate-500">Active Filters:</span>
                {(startDate || endDate) && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[11px] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {periodLabel}
                  </span>
                )}
                {selectedBrand !== 'ALL' && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[11px] flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Brand: {selectedBrand}
                  </span>
                )}
                {selectedCategory !== 'ALL' && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px] flex items-center gap-1">
                    <Boxes className="w-3 h-3" />
                    Category: {selectedCategory}
                  </span>
                )}
                {searchQuery && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[11px] flex items-center gap-1">
                    <Search className="w-3 h-3" />
                    "{searchQuery}"
                  </span>
                )}
              </div>

              <button
                type="button"
                id="btn-sold-items-reset-filters"
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards: Units Sold, Sales Revenue, Cost Value, and Net Profit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Units Sold */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Units Sold
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {totalUnitsSold.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">units</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span>Across <strong>{categoriesList.length}</strong> categories</span>
              <span>·</span>
              <span><strong>{brandsList.length}</strong> brands</span>
            </div>
          </div>
        </div>

        {/* Total Sales Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sales Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-blue-900 tracking-tight">
              {formatPKR(totalSalesRevenue)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Gross sales for {periodLabel}
            </div>
          </div>
        </div>

        {/* Total Cost Value */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cost of Goods Sold
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-slate-800 tracking-tight">
              {formatPKR(totalCostValue)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Stock purchase cost of units sold
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Net Profit on Sold Items
            </span>
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              {overallProfitMargin.toFixed(1)}% Margin
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
              {formatPKR(totalNetProfit)}
            </div>
            <div className="text-[11px] text-emerald-800 mt-1 font-medium">
              Sales Revenue minus Inventory Cost
            </div>
          </div>
        </div>
      </div>

      {/* Highlights: Top Selling Category & Top Selling Brand */}
      {(topCategory || topBrand) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topCategory && (
            <div className="p-4 bg-gradient-to-r from-indigo-50/80 to-blue-50/60 rounded-xl border border-indigo-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
                  Top Selling Category
                </span>
                <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                  {topCategory.category}
                </span>
                <span className="text-xs text-slate-600 mt-0.5 font-medium">
                  {topCategory.unitsSold} units sold ({topCategory.percentOfTotalUnits.toFixed(1)}% of all units)
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Category Profit:</span>
                <span className="text-base font-black font-mono text-emerald-700">
                  {formatPKR(topCategory.totalProfit)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  Rev: {formatPKR(topCategory.totalRevenue)}
                </span>
              </div>
            </div>
          )}

          {topBrand && (
            <div className="p-4 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 rounded-xl border border-emerald-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Top Selling Brand
                </span>
                <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                  {topBrand.brand}
                </span>
                <span className="text-xs text-slate-600 mt-0.5 font-medium">
                  {topBrand.unitsSold} units sold ({topBrand.percentOfTotalUnits.toFixed(1)}% of all units)
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Brand Profit:</span>
                <span className="text-base font-black font-mono text-emerald-700">
                  {formatPKR(topBrand.totalProfit)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  Rev: {formatPKR(topBrand.totalRevenue)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Breakdown Section with View Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Navigation Tabs between Breakdown Views */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Grouping View:
            </span>
            <div className="inline-flex rounded-xl p-1 bg-slate-200/70">
              <button
                type="button"
                id="btn-group-by-category"
                onClick={() => setViewGrouping('CATEGORY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewGrouping === 'CATEGORY'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>By Category</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-50 text-indigo-700 font-mono">
                  {categoriesList.length}
                </span>
              </button>

              <button
                type="button"
                id="btn-group-by-brand"
                onClick={() => setViewGrouping('BRAND')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewGrouping === 'BRAND'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>By Brand</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-50 text-indigo-700 font-mono">
                  {brandsList.length}
                </span>
              </button>

              <button
                type="button"
                id="btn-group-by-table"
                onClick={() => setViewGrouping('TABLE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewGrouping === 'TABLE'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Detailed Items Table</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-50 text-indigo-700 font-mono">
                  {itemsList.length}
                </span>
              </button>
            </div>
          </div>

          {/* Quick expand/collapse controls for accordion views */}
          {(viewGrouping === 'CATEGORY' || viewGrouping === 'BRAND') && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-expand-all"
                onClick={() => handleExpandAll(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                Expand All
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                id="btn-collapse-all"
                onClick={() => handleExpandAll(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>

        {/* VIEW 1: CATEGORY BREAKDOWN WITH BRAND SUB-BREAKDOWN */}
        {viewGrouping === 'CATEGORY' && (
          <div className="p-6 space-y-4">
            {categoriesList.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Boxes className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No sold items found for this selection.</p>
                <p className="text-xs text-slate-500 mt-1">Try adjusting the date range or brand filter.</p>
              </div>
            ) : (
              categoriesList.map((cat) => {
                const isExpanded = !!expandedCats[cat.category];
                const brandKeys = Object.keys(cat.brands);

                return (
                  <div
                    key={cat.category}
                    className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all hover:border-slate-300"
                  >
                    {/* Category Header Row */}
                    <div
                      onClick={() => toggleCategoryExpand(cat.category)}
                      className="p-4 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs shrink-0"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-extrabold text-slate-900">{cat.category}</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono">
                              {cat.unitsSold} units sold
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              ({cat.percentOfTotalUnits.toFixed(1)}% of total volume)
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {brandKeys.length} brands present · {cat.items.length} distinct products sold
                          </div>
                        </div>
                      </div>

                      {/* Financials & Progress */}
                      <div className="flex items-center gap-6 justify-between md:justify-end">
                        <div className="w-28 hidden sm:block">
                          <div className="flex justify-between text-[10px] text-slate-500 font-bold mb-1">
                            <span>Share</span>
                            <span>{cat.percentOfTotalUnits.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(4, cat.percentOfTotalUnits))}%` }}
                            />
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-slate-500 block">Sales:</span>
                          <span className="text-sm font-bold font-mono text-blue-900">
                            {formatPKR(cat.totalRevenue)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-slate-500 block">Net Profit:</span>
                          <span className="text-sm font-black font-mono text-emerald-700">
                            {formatPKR(cat.totalProfit)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Brand Sub-breakdown */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-indigo-600" />
                            Brands breakdown in "{cat.category}":
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            Sorted by units sold
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(Object.values(cat.brands) as BrandSubBreakdown[]).map((brandStat) => (
                            <div
                              key={brandStat.brand}
                              className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/90 space-y-2 hover:bg-indigo-50/30 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                                  <span className="text-xs font-bold text-slate-900">{brandStat.brand}</span>
                                </div>
                                <span className="text-xs font-black font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                                  {brandStat.unitsSold} units ({brandStat.percentOfCategoryUnits.toFixed(0)}%)
                                </span>
                              </div>

                              {/* Progress bar inside category */}
                              <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-1 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(3, brandStat.percentOfCategoryUnits))}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 font-mono">
                                <span className="text-slate-600">
                                  Sales: <strong>{formatPKR(brandStat.totalRevenue)}</strong>
                                </span>
                                <span className="text-emerald-700 font-bold">
                                  Profit: {formatPKR(brandStat.totalProfit)} ({brandStat.profitMarginPercent.toFixed(0)}%)
                                </span>
                              </div>

                              {/* Nested items sold for this brand */}
                              <div className="pt-1.5 space-y-1">
                                {brandStat.items.map((item) => (
                                  <div
                                    key={item.itemId}
                                    className="flex items-center justify-between text-[11px] text-slate-600 py-0.5 border-b border-slate-200/40 last:border-none"
                                  >
                                    <span className="truncate max-w-[200px]" title={item.name}>
                                      • {item.name}
                                    </span>
                                    <div className="flex items-center gap-2 font-mono">
                                      <span className="font-bold text-slate-900">{item.unitsSold} pcs</span>
                                      <span className="text-emerald-700 font-semibold">+{formatPKR(item.totalProfit)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VIEW 2: BRAND BREAKDOWN WITH CATEGORY SUB-BREAKDOWN */}
        {viewGrouping === 'BRAND' && (
          <div className="p-6 space-y-4">
            {brandsList.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Tag className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No sold brands found for this selection.</p>
                <p className="text-xs text-slate-500 mt-1">Try adjusting the date range or filters.</p>
              </div>
            ) : (
              brandsList.map((b) => {
                const isExpanded = !!expandedBrands[b.brand];
                const catKeys = Object.keys(b.categories);

                return (
                  <div
                    key={b.brand}
                    className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all hover:border-slate-300"
                  >
                    {/* Brand Header Row */}
                    <div
                      onClick={() => toggleBrandExpand(b.brand)}
                      className="p-4 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs shrink-0"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-extrabold text-slate-900">{b.brand}</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono">
                              {b.unitsSold} units sold
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              ({b.percentOfTotalUnits.toFixed(1)}% of total volume)
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Present in {catKeys.length} categories · {b.items.length} distinct products sold
                          </div>
                        </div>
                      </div>

                      {/* Financials & Progress */}
                      <div className="flex items-center gap-6 justify-between md:justify-end">
                        <div className="w-28 hidden sm:block">
                          <div className="flex justify-between text-[10px] text-slate-500 font-bold mb-1">
                            <span>Share</span>
                            <span>{b.percentOfTotalUnits.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(4, b.percentOfTotalUnits))}%` }}
                            />
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-slate-500 block">Sales:</span>
                          <span className="text-sm font-bold font-mono text-blue-900">
                            {formatPKR(b.totalRevenue)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-slate-500 block">Net Profit:</span>
                          <span className="text-sm font-black font-mono text-emerald-700">
                            {formatPKR(b.totalProfit)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Category Sub-breakdown */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Boxes className="w-3.5 h-3.5 text-blue-600" />
                            Categories for brand "{b.brand}":
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            Sorted by units sold
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(Object.values(b.categories) as CategorySubBreakdown[]).map((catStat) => (
                            <div
                              key={catStat.category}
                              className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/90 space-y-2 hover:bg-blue-50/30 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                  <span className="text-xs font-bold text-slate-900">{catStat.category}</span>
                                </div>
                                <span className="text-xs font-black font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                  {catStat.unitsSold} units ({catStat.percentOfBrandUnits.toFixed(0)}%)
                                </span>
                              </div>

                              <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                                <div
                                  className="bg-blue-600 h-1 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(3, catStat.percentOfBrandUnits))}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 font-mono">
                                <span className="text-slate-600">
                                  Sales: <strong>{formatPKR(catStat.totalRevenue)}</strong>
                                </span>
                                <span className="text-emerald-700 font-bold">
                                  Profit: {formatPKR(catStat.totalProfit)} ({catStat.profitMarginPercent.toFixed(0)}%)
                                </span>
                              </div>

                              {/* Nested items sold */}
                              <div className="pt-1.5 space-y-1">
                                {catStat.items.map((item) => (
                                  <div
                                    key={item.itemId}
                                    className="flex items-center justify-between text-[11px] text-slate-600 py-0.5 border-b border-slate-200/40 last:border-none"
                                  >
                                    <span className="truncate max-w-[200px]" title={item.name}>
                                      • {item.name}
                                    </span>
                                    <div className="flex items-center gap-2 font-mono">
                                      <span className="font-bold text-slate-900">{item.unitsSold} pcs</span>
                                      <span className="text-emerald-700 font-semibold">+{formatPKR(item.totalProfit)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VIEW 3: DETAILED SOLD ITEMS TABLE */}
        {viewGrouping === 'TABLE' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/70 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Product Name &amp; SKU</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="py-3.5 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Category</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="py-3.5 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors"
                      onClick={() => handleSort('brand')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Brand</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="py-3.5 px-3 text-right cursor-pointer hover:bg-slate-200/70 transition-colors"
                      onClick={() => handleSort('unitsSold')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Units Sold</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3.5 px-3 text-right">Avg Sold Price</th>
                    <th className="py-3.5 px-3 text-right">Unit Cost</th>
                    <th
                      className="py-3.5 px-3 text-right cursor-pointer hover:bg-slate-200/70 transition-colors"
                      onClick={() => handleSort('totalRevenue')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Total Revenue</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-200/70 transition-colors"
                      onClick={() => handleSort('totalProfit')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Net Profit</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No sold items found matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, idx) => (
                      <tr key={`${item.itemId}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-xs">{item.name}</div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            SKU: {item.sku} {item.barcode && `· Barcode: ${item.barcode}`}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-semibold">
                            {item.brand}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                          {item.unitsSold} <span className="text-[10px] text-slate-500 font-sans font-normal">pcs</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {formatPKR(item.avgSoldPrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          {formatPKR(item.costPrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-blue-900">
                          {formatPKR(item.totalRevenue)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono font-black text-emerald-700 text-sm">
                            {formatPKR(item.totalProfit)}
                          </div>
                          <div className="text-[10px] text-emerald-800 font-mono font-semibold">
                            {item.profitMarginPercent.toFixed(1)}% margin
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <TablePagination
              idPrefix="sold-items-table"
              totalItems={sortedItems.length}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setStoredPageSize('sold_items', newSize);
                setCurrentPage(1);
              }}
              itemLabel="sold products"
            />
          </div>
        )}
      </div>
    </div>
  );
};
