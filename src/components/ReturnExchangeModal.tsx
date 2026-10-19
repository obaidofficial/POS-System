import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  RotateCcw,
  ArrowLeftRight,
  History,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Search,
  Trash2,
  Banknote,
  Boxes,
  User,
  Calendar,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { Sale, SaleReturn, SaleExchange, InventoryItem } from '../types';
import { formatPKR } from '../utils/currency';
import { storage } from '../services/storage';

interface ReturnExchangeModalProps {
  sale: Sale;
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (result: {
    type: 'RETURN' | 'EXCHANGE';
    record: SaleReturn | SaleExchange;
    newSale?: Sale;
    updatedSale?: Sale | null;
    invoiceDeleted?: boolean;
  }) => void;
  onViewPastSlip?: (type: 'RETURN' | 'EXCHANGE', record: SaleReturn | SaleExchange) => void;
}

export const ReturnExchangeModal: React.FC<ReturnExchangeModalProps> = ({
  sale,
  isOpen,
  onClose,
  onCompleted,
  onViewPastSlip,
}) => {
  const [activeTab, setActiveTab] = useState<'RETURN' | 'EXCHANGE' | 'HISTORY'>('RETURN');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteInvoiceOnReturn, setDeleteInvoiceOnReturn] = useState(false);

  // Return tab state
  const [returnSelections, setReturnSelections] = useState<
    Record<
      string,
      {
        selected: boolean;
        quantity: number;
        unitRefundPrice: number;
        condition: 'good' | 'damaged' | 'defective';
        restock: boolean;
      }
    >
  >(() => {
    const initial: Record<string, any> = {};
    sale.items.forEach((line) => {
      const returnable = Math.max(0, line.quantity - (line.returnedQuantity || 0));
      initial[line.itemId] = {
        selected: returnable > 0,
        quantity: returnable > 0 ? 1 : 0,
        unitRefundPrice: line.soldPrice,
        condition: 'good',
        restock: true,
      };
    });
    return initial;
  });

  const [returnReason, setReturnReason] = useState('Customer Changed Mind');
  const [returnNotes, setReturnNotes] = useState('');

  // Exchange tab state: Returned items
  const [exchangeReturnSelections, setExchangeReturnSelections] = useState<
    Record<
      string,
      {
        selected: boolean;
        quantity: number;
        unitCreditPrice: number;
        condition: 'good' | 'damaged' | 'defective';
        restock: boolean;
      }
    >
  >(() => {
    const initial: Record<string, any> = {};
    sale.items.forEach((line) => {
      const returnable = Math.max(0, line.quantity - (line.returnedQuantity || 0));
      initial[line.itemId] = {
        selected: returnable > 0,
        quantity: returnable > 0 ? 1 : 0,
        unitCreditPrice: line.soldPrice,
        condition: 'good',
        restock: true,
      };
    });
    return initial;
  });

  // Exchange tab state: Replacement items from inventory
  const [replacementSearch, setReplacementSearch] = useState('');
  const [replacementCart, setReplacementCart] = useState<
    {
      item: InventoryItem;
      quantity: number;
      pricePerUnit: number;
    }[]
  >([]);

  const [exchangeReason, setExchangeReason] = useState('Product / Model Exchange');
  const [exchangeNotes, setExchangeNotes] = useState('');

  // Inventory catalog for search
  const inventoryItems = useMemo(() => {
    try {
      return storage.getItems();
    } catch {
      return [];
    }
  }, [isOpen]);

  const filteredCatalog = useMemo(() => {
    if (!replacementSearch.trim()) return [];
    const q = replacementSearch.toLowerCase();
    return inventoryItems
      .filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          (i.barcode && i.barcode.toLowerCase().includes(q)) ||
          i.category.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [inventoryItems, replacementSearch]);

  if (!isOpen) return null;

  // Compute Return Calculations
  const returnSummary = useMemo(() => {
    let totalItems = 0;
    let totalRefund = 0;
    let totalPurchasedUnits = 0;

    sale.items.forEach((line) => {
      totalPurchasedUnits += line.quantity;
      const sel = returnSelections[line.itemId];
      if (sel && sel.selected && sel.quantity > 0) {
        totalItems += sel.quantity;
        totalRefund += sel.quantity * sel.unitRefundPrice;
      }
    });

    const remainingUnits = Math.max(0, totalPurchasedUnits - totalItems);
    const isAllItemsReturned = totalItems >= totalPurchasedUnits && totalItems > 0;
    const newSaleValue = Math.max(0, sale.totalAmount - totalRefund);

    return {
      totalItems,
      totalRefund,
      totalPurchasedUnits,
      remainingUnits,
      isAllItemsReturned,
      newSaleValue,
    };
  }, [sale.items, sale.totalAmount, returnSelections]);

  // Compute Exchange Calculations
  const exchangeSummary = useMemo(() => {
    let returnCreditTotal = 0;
    let returnUnitsCount = 0;

    sale.items.forEach((line) => {
      const sel = exchangeReturnSelections[line.itemId];
      if (sel && sel.selected && sel.quantity > 0) {
        returnUnitsCount += sel.quantity;
        returnCreditTotal += sel.quantity * sel.unitCreditPrice;
      }
    });

    let newItemsTotal = 0;
    let newUnitsCount = 0;

    replacementCart.forEach((entry) => {
      newUnitsCount += entry.quantity;
      newItemsTotal += entry.quantity * entry.pricePerUnit;
    });

    const netDifference = newItemsTotal - returnCreditTotal;
    let differenceType: 'CUSTOMER_PAID' | 'STORE_REFUNDED' | 'EVEN' = 'EVEN';
    if (netDifference > 0) {
      differenceType = 'CUSTOMER_PAID';
    } else if (netDifference < 0) {
      differenceType = 'STORE_REFUNDED';
    }

    return {
      returnCreditTotal,
      returnUnitsCount,
      newItemsTotal,
      newUnitsCount,
      netDifference: Math.abs(netDifference),
      differenceType,
    };
  }, [sale.items, exchangeReturnSelections, replacementCart]);

  // Handlers for Return Submission
  const handleProcessReturn = () => {
    setErrorMsg(null);
    const itemsToReturn: {
      itemId: string;
      quantity: number;
      unitRefundPrice: number;
      condition: 'good' | 'damaged' | 'defective';
      restockedToInventory: boolean;
    }[] = [];

    sale.items.forEach((line) => {
      const sel = returnSelections[line.itemId];
      if (sel && sel.selected && sel.quantity > 0) {
        itemsToReturn.push({
          itemId: line.itemId,
          quantity: sel.quantity,
          unitRefundPrice: sel.unitRefundPrice,
          condition: sel.condition,
          restockedToInventory: sel.restock,
        });
      }
    });

    if (itemsToReturn.length === 0) {
      setErrorMsg('Please select at least 1 item to return with quantity greater than 0.');
      return;
    }

    const res = storage.processSaleReturn(sale.id, {
      items: itemsToReturn,
      refundMethod: 'CASH',
      reason: returnReason,
      notes: returnNotes,
      deleteInvoice: deleteInvoiceOnReturn || returnSummary.isAllItemsReturned,
    });

    if (res.success && res.returnRecord) {
      onCompleted({
        type: 'RETURN',
        record: res.returnRecord,
        updatedSale: res.updatedSale,
        invoiceDeleted: res.invoiceDeleted,
      });
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to process return. Please check item stock.');
    }
  };

  // Handlers for Exchange Submission
  const handleProcessExchange = () => {
    setErrorMsg(null);
    const returnedItems: {
      itemId: string;
      quantity: number;
      unitCreditPrice: number;
      condition: 'good' | 'damaged' | 'defective';
      restockedToInventory: boolean;
    }[] = [];

    sale.items.forEach((line) => {
      const sel = exchangeReturnSelections[line.itemId];
      if (sel && sel.selected && sel.quantity > 0) {
        returnedItems.push({
          itemId: line.itemId,
          quantity: sel.quantity,
          unitCreditPrice: sel.unitCreditPrice,
          condition: sel.condition,
          restockedToInventory: sel.restock,
        });
      }
    });

    if (returnedItems.length === 0) {
      setErrorMsg('Please select at least 1 item being returned by the customer.');
      return;
    }

    if (replacementCart.length === 0) {
      setErrorMsg('Please search and add at least 1 replacement product from inventory.');
      return;
    }

    const newItems = replacementCart.map((c) => ({
      itemId: c.item.id,
      quantity: c.quantity,
      pricePerUnit: c.pricePerUnit,
    }));

    const res = storage.processSaleExchange(sale.id, {
      returnedItems,
      newItems,
      reason: exchangeReason,
      notes: exchangeNotes,
    });

    if (res.success && res.exchangeRecord) {
      onCompleted({
        type: 'EXCHANGE',
        record: res.exchangeRecord,
        newSale: res.newSale,
      });
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to process exchange. Please verify stock.');
    }
  };

  // Add item to replacement cart
  const handleAddReplacement = (item: InventoryItem) => {
    const existingIndex = replacementCart.findIndex((c) => c.item.id === item.id);
    if (existingIndex !== -1) {
      setReplacementCart((prev) =>
        prev.map((c, idx) =>
          idx === existingIndex ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setReplacementCart((prev) => [
        ...prev,
        { item, quantity: 1, pricePerUnit: item.sellingPrice },
      ]);
    }
    setReplacementSearch('');
  };

  const handleUpdateReplacementQty = (itemId: string, delta: number) => {
    setReplacementCart((prev) =>
      prev
        .map((c) => {
          if (c.item.id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as any
    );
  };

  const handleRemoveReplacement = (itemId: string) => {
    setReplacementCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const hasHistory = (sale.returns && sale.returns.length > 0) || (sale.exchanges && sale.exchanges.length > 0);
  const totalHistoryCount = (sale.returns?.length || 0) + (sale.exchanges?.length || 0);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-start justify-between gap-4 border-b border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg sm:text-xl font-bold tracking-tight">
                Item Return & Exchange Counter
              </span>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-bold border border-slate-700">
                {sale.invoiceNumber}
              </span>
              {sale.returnStatus && sale.returnStatus !== 'NONE' && (
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    sale.returnStatus === 'FULLY_RETURNED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : sale.returnStatus === 'PARTIAL_RETURN'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  }`}
                >
                  {sale.returnStatus.replace('_', ' ')}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1.5 font-medium">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Customer: <strong className="text-white">{sale.customerName}</strong>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date: {sale.date}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5 text-slate-400" />
                Original Total: <strong className="text-white font-mono">{formatPKR(sale.totalAmount)}</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('RETURN');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'RETURN'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-emerald-600" />
            <span>Return Item (Refund Cash)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('EXCHANGE');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'EXCHANGE'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 text-purple-600" />
            <span>Exchange Item (Swap Products)</span>
          </button>

          {hasHistory && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('HISTORY');
                setErrorMsg(null);
              }}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4 text-blue-600" />
              <span>History & Slips ({totalHistoryCount})</span>
            </button>
          )}
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* ========================================================= */}
          {/* TAB 1: RETURN ITEM                                        */}
          {/* ========================================================= */}
          {activeTab === 'RETURN' && (
            <div className="space-y-5">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex items-start gap-2.5">
                <RotateCcw className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-emerald-900 font-bold mb-0.5">
                    Customer Cash Return Workflow
                  </strong>
                  Select item(s) the customer is returning. Quantity will be restocked to inventory and cash refund will be logged. An official return voucher will be generated.
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Purchased Items in this Sale</span>
                  <span>Returnable Quantities</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {sale.items.map((line) => {
                    const alreadyReturned = line.returnedQuantity || 0;
                    const returnable = Math.max(0, line.quantity - alreadyReturned);
                    const sel = returnSelections[line.itemId] || {
                      selected: false,
                      quantity: 0,
                      unitRefundPrice: line.soldPrice,
                      condition: 'good',
                      restock: true,
                    };

                    const isFullyReturned = returnable === 0;

                    return (
                      <div
                        key={line.itemId}
                        className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isFullyReturned
                            ? 'bg-slate-50/70 opacity-60'
                            : sel.selected
                            ? 'bg-emerald-50/40'
                            : 'hover:bg-slate-50/40'
                        }`}
                      >
                        {/* Left: Checkbox + Product Name */}
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            disabled={isFullyReturned}
                            checked={sel.selected && !isFullyReturned}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setReturnSelections((prev) => ({
                                ...prev,
                                [line.itemId]: {
                                  ...prev[line.itemId],
                                  selected: checked,
                                  quantity: checked ? Math.max(1, prev[line.itemId]?.quantity || 1) : 0,
                                },
                              }));
                            }}
                            className="w-4 h-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{line.name}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>SKU: {line.sku}</span>
                              <span>·</span>
                              <span>Sold Price: {formatPKR(line.soldPrice)}</span>
                              <span>·</span>
                              <span>Purchased: {line.quantity} {line.unit}</span>
                              {alreadyReturned > 0 && (
                                <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  Already Returned: {alreadyReturned}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Quantity Stepper & Price */}
                        {isFullyReturned ? (
                          <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded">
                            Fully Returned
                          </span>
                        ) : (
                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            {/* Quantity control */}
                            <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                              <button
                                type="button"
                                disabled={!sel.selected || sel.quantity <= 1}
                                onClick={() => {
                                  setReturnSelections((prev) => ({
                                    ...prev,
                                    [line.itemId]: {
                                      ...prev[line.itemId],
                                      quantity: Math.max(1, prev[line.itemId].quantity - 1),
                                    },
                                  }));
                                }}
                                className="p-1.5 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5 text-slate-600" />
                              </button>
                              <span className="w-8 text-center text-xs font-mono font-bold text-slate-900">
                                {sel.quantity}
                              </span>
                              <button
                                type="button"
                                disabled={!sel.selected || sel.quantity >= returnable}
                                onClick={() => {
                                  setReturnSelections((prev) => ({
                                    ...prev,
                                    [line.itemId]: {
                                      ...prev[line.itemId],
                                      quantity: Math.min(returnable, prev[line.itemId].quantity + 1),
                                    },
                                  }));
                                }}
                                className="p-1.5 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 text-slate-600" />
                              </button>
                            </div>

                            <div className="text-right min-w-[90px]">
                              <span className="text-xs text-slate-500 block">Refund:</span>
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                {formatPKR(sel.quantity * sel.unitRefundPrice)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Return Options: Condition & Restock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Return Reason
                  </label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Customer Changed Mind">Customer Changed Mind</option>
                    <option value="Wrong Model / Item Purchased">Wrong Model / Item Purchased</option>
                    <option value="Defective / Damaged Item">Defective / Damaged Item</option>
                    <option value="Packaging Not As Expected">Packaging Not As Expected</option>
                    <option value="Found Cheaper Elsewhere">Found Cheaper Elsewhere</option>
                    <option value="Other / Customer Request">Other / Customer Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Internal Notes / Comment (Optional)
                  </label>
                  <input
                    type="text"
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="e.g. Seal opened, customer wanted black color"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Impact on Inventory & Invoice Summary */}
              {returnSummary.totalItems > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>Impact on Sale Order &amp; History Records:</span>
                    <span className="font-mono text-emerald-700 font-bold">
                      +{returnSummary.totalItems} Units to Restock
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-500 block text-[11px]">Units Sold:</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {returnSummary.totalPurchasedUnits} → {returnSummary.remainingUnits}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-500 block text-[11px]">Sale Value:</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {formatPKR(returnSummary.newSaleValue)}
                      </span>
                      <span className="text-[10px] text-rose-600 block">
                        -{formatPKR(returnSummary.totalRefund)}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-500 block text-[11px]">Units Dispatched:</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        -{returnSummary.totalItems} units
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-500 block text-[11px]">Gross Profit:</span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        Adjusts -1 Unit Cost
                      </span>
                    </div>
                  </div>

                  {returnSummary.isAllItemsReturned ? (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        <strong>All units refunded:</strong> Sale invoice{' '}
                        <span className="font-mono font-bold">{sale.invoiceNumber}</span> will be deleted from history, and cash refund logged in vouchers.
                      </span>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white hover:bg-slate-100/80 border border-slate-200 cursor-pointer text-xs text-slate-800 transition-colors">
                      <input
                        type="checkbox"
                        checked={deleteInvoiceOnReturn}
                        onChange={(e) => setDeleteInvoiceOnReturn(e.target.checked)}
                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <span>
                        <strong>Delete this sale invoice from history</strong> (otherwise invoice will update to {returnSummary.remainingUnits} units and {formatPKR(returnSummary.newSaleValue)}).
                      </span>
                    </label>
                  )}
                </div>
              )}

              {/* Total Refund Banner & Submit */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">
                    Total Cash Refund to Customer
                  </span>
                  <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
                    {formatPKR(returnSummary.totalRefund)}
                  </div>
                  <span className="text-xs text-slate-300">
                    {returnSummary.totalItems} item{returnSummary.totalItems !== 1 ? 's' : ''} to return · Stock will be auto-incremented
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-return"
                    disabled={returnSummary.totalItems === 0}
                    onClick={handleProcessReturn}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Return & Refund Cash</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: EXCHANGE ITEM                                      */}
          {/* ========================================================= */}
          {activeTab === 'EXCHANGE' && (
            <div className="space-y-5">
              <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3.5 text-xs text-purple-950 flex items-start gap-2.5">
                <ArrowLeftRight className="w-4 h-4 text-purple-700 mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-purple-900 font-bold mb-0.5">
                    Product Exchange Workflow
                  </strong>
                  Customer returns purchased item(s) and selects replacement products from store inventory. The original slip (<span className="font-mono font-bold text-slate-900">{sale.invoiceNumber}</span>) will be deleted, returned product stock will update (+1), cash data and all sales stats will update, and a <strong>new slip will generate</strong> for the replacement product with updated price.
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* STEP 1: Items Being Returned / Handed Back */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                        1
                      </span>
                      <span>Item(s) Handed Back by Customer</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">
                      Credit: {formatPKR(exchangeSummary.returnCreditTotal)}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden shadow-2xs max-h-60 overflow-y-auto">
                    {sale.items.map((line) => {
                      const alreadyReturned = line.returnedQuantity || 0;
                      const returnable = Math.max(0, line.quantity - alreadyReturned);
                      const sel = exchangeReturnSelections[line.itemId] || {
                        selected: false,
                        quantity: 0,
                        unitCreditPrice: line.soldPrice,
                        condition: 'good',
                        restock: true,
                      };

                      if (returnable === 0) {
                        return (
                          <div key={line.itemId} className="p-2.5 bg-slate-50 text-xs text-slate-400">
                            {line.name} (Fully Returned)
                          </div>
                        );
                      }

                      return (
                        <div
                          key={line.itemId}
                          className={`p-2.5 flex items-center justify-between gap-2 text-xs ${
                            sel.selected ? 'bg-purple-50/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={sel.selected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setExchangeReturnSelections((prev) => ({
                                  ...prev,
                                  [line.itemId]: {
                                    ...prev[line.itemId],
                                    selected: checked,
                                    quantity: checked ? Math.max(1, prev[line.itemId]?.quantity || 1) : 0,
                                  },
                                }));
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                            <div>
                              <div className="font-bold text-slate-900">{line.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                Val: {formatPKR(line.soldPrice)} · Max: {returnable}
                              </div>
                            </div>
                          </div>

                          {sel.selected && (
                            <div className="flex items-center border border-slate-200 rounded bg-white">
                              <button
                                type="button"
                                disabled={sel.quantity <= 1}
                                onClick={() => {
                                  setExchangeReturnSelections((prev) => ({
                                    ...prev,
                                    [line.itemId]: {
                                      ...prev[line.itemId],
                                      quantity: Math.max(1, prev[line.itemId].quantity - 1),
                                    },
                                  }));
                                }}
                                className="p-1 hover:bg-slate-100 cursor-pointer disabled:opacity-30"
                              >
                                <Minus className="w-3 h-3 text-slate-600" />
                              </button>
                              <span className="w-6 text-center font-mono font-bold text-xs">
                                {sel.quantity}
                              </span>
                              <button
                                type="button"
                                disabled={sel.quantity >= returnable}
                                onClick={() => {
                                  setExchangeReturnSelections((prev) => ({
                                    ...prev,
                                    [line.itemId]: {
                                      ...prev[line.itemId],
                                      quantity: Math.min(returnable, prev[line.itemId].quantity + 1),
                                    },
                                  }));
                                }}
                                className="p-1 hover:bg-slate-100 cursor-pointer disabled:opacity-30"
                              >
                                <Plus className="w-3 h-3 text-slate-600" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* STEP 2: Replacement Items from Inventory */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                        2
                      </span>
                      <span>Replacement Product(s) Chosen</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      New Total: {formatPKR(exchangeSummary.newItemsTotal)}
                    </span>
                  </div>

                  {/* Catalog Search */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={replacementSearch}
                      onChange={(e) => setReplacementSearch(e.target.value)}
                      placeholder="Search store inventory to add..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                    />

                    {/* Autocomplete Dropdown */}
                    {filteredCatalog.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {filteredCatalog.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleAddReplacement(item)}
                            className="p-2.5 hover:bg-purple-50 flex items-center justify-between gap-2 cursor-pointer transition-colors text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{item.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                SKU: {item.sku} · Stock: {item.currentStock} {item.unit}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">
                                {formatPKR(item.sellingPrice)}
                              </span>
                              <button
                                type="button"
                                className="px-2 py-1 bg-purple-600 text-white rounded text-[10px] font-bold"
                              >
                                Add +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Replacement Items List */}
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden shadow-2xs max-h-48 overflow-y-auto">
                    {replacementCart.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No replacement items added yet. Search above to add items.
                      </div>
                    ) : (
                      replacementCart.map((entry) => (
                        <div
                          key={entry.item.id}
                          className="p-2.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 truncate">{entry.item.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {formatPKR(entry.pricePerUnit)} each
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center border border-slate-200 rounded bg-white">
                              <button
                                type="button"
                                onClick={() => handleUpdateReplacementQty(entry.item.id, -1)}
                                className="p-1 hover:bg-slate-100 cursor-pointer"
                              >
                                <Minus className="w-3 h-3 text-slate-600" />
                              </button>
                              <span className="w-6 text-center font-mono font-bold text-xs">
                                {entry.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateReplacementQty(entry.item.id, 1)}
                                className="p-1 hover:bg-slate-100 cursor-pointer"
                              >
                                <Plus className="w-3 h-3 text-slate-600" />
                              </button>
                            </div>

                            <span className="font-mono font-bold text-slate-900 min-w-[60px] text-right">
                              {formatPKR(entry.quantity * entry.pricePerUnit)}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRemoveReplacement(entry.item.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Settlement Calculation Card */}
              <div className="p-4 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-slate-500 block">Total Return Credit:</span>
                    <span className="text-base font-black font-mono text-purple-900">
                      {formatPKR(exchangeSummary.returnCreditTotal)}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-slate-500 block">New Items Total:</span>
                    <span className="text-base font-black font-mono text-emerald-800">
                      {formatPKR(exchangeSummary.newItemsTotal)}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-2xs">
                    <span className="text-slate-700 font-bold block">
                      {exchangeSummary.differenceType === 'CUSTOMER_PAID' && 'Customer Pays Cash:'}
                      {exchangeSummary.differenceType === 'STORE_REFUNDED' && 'Store Refunds Cash:'}
                      {exchangeSummary.differenceType === 'EVEN' && 'Settlement Balance:'}
                    </span>
                    <span
                      className={`text-base font-black font-mono ${
                        exchangeSummary.differenceType === 'CUSTOMER_PAID'
                          ? 'text-emerald-700'
                          : exchangeSummary.differenceType === 'STORE_REFUNDED'
                          ? 'text-rose-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {exchangeSummary.differenceType === 'EVEN'
                        ? 'Rs. 0 (Even Exchange)'
                        : formatPKR(exchangeSummary.netDifference)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Exchange Reason</label>
                    <select
                      value={exchangeReason}
                      onChange={(e) => setExchangeReason(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white rounded-lg border border-purple-200 text-xs font-medium"
                    >
                      <option value="Product / Model Exchange">Product / Model Exchange</option>
                      <option value="Customer Upgrade to Higher Model">Customer Upgrade to Higher Model</option>
                      <option value="Customer Downsized Product">Customer Downsized Product</option>
                      <option value="Color or Size Variant Swap">Color or Size Variant Swap</option>
                      <option value="Defective Replacement">Defective Replacement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Notes (Optional)</label>
                    <input
                      type="text"
                      value={exchangeNotes}
                      onChange={(e) => setExchangeNotes(e.target.value)}
                      placeholder="e.g. Swapped black cable for white charger"
                      className="w-full px-3 py-1.5 bg-white rounded-lg border border-purple-200 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-exchange"
                  disabled={exchangeSummary.returnUnitsCount === 0 || exchangeSummary.newUnitsCount === 0}
                  onClick={handleProcessExchange}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Complete Product Exchange</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: PAST HISTORY & RECEIPTS                            */}
          {/* ========================================================= */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Recorded Return & Exchange Slips for this Invoice
              </span>

              {/* Past Returns */}
              {sale.returns && sale.returns.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Cash Returns ({sale.returns.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {sale.returns.map((ret) => (
                      <div
                        key={ret.id}
                        className="p-3 rounded-xl border border-rose-200 bg-rose-50/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 font-mono">{ret.returnNumber}</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            {ret.date} {ret.time} · {ret.items.length} items returned · Refunded: <strong className="text-rose-700 font-mono">{formatPKR(ret.totalRefundAmount)}</strong>
                          </div>
                        </div>

                        {onViewPastSlip && (
                          <button
                            type="button"
                            onClick={() => onViewPastSlip('RETURN', ret)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 font-bold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View / Print Slip</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Past Exchanges */}
              {sale.exchanges && sale.exchanges.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-purple-800 flex items-center gap-1.5">
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Product Exchanges ({sale.exchanges.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {sale.exchanges.map((exc) => (
                      <div
                        key={exc.id}
                        className="p-3 rounded-xl border border-purple-200 bg-purple-50/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 font-mono">{exc.exchangeNumber}</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            {exc.date} {exc.time} · Ret: {exc.returnedItems.length} items ({formatPKR(exc.returnCreditTotal)}) → New: {exc.newItems.length} items ({formatPKR(exc.newItemsTotal)})
                          </div>
                          <div className="text-[11px] font-bold text-purple-900 mt-0.5">
                            {exc.differenceType === 'CUSTOMER_PAID' && `Customer Paid: ${formatPKR(exc.differenceAmount)}`}
                            {exc.differenceType === 'STORE_REFUNDED' && `Store Refunded: ${formatPKR(exc.differenceAmount)}`}
                            {exc.differenceType === 'EVEN' && 'Even Exchange (Rs. 0)'}
                          </div>
                        </div>

                        {onViewPastSlip && (
                          <button
                            type="button"
                            onClick={() => onViewPastSlip('EXCHANGE', exc)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-purple-300 hover:bg-purple-100 text-purple-800 font-bold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View / Print Slip</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
