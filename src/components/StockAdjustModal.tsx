import React, { useState } from 'react';
import { X, SlidersHorizontal, Plus, Minus, ArrowRight } from 'lucide-react';
import { InventoryItem } from '../types';
import { storage } from '../services/storage';

interface StockAdjustModalProps {
  item: InventoryItem;
  onClose: () => void;
  onAdjusted: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  item,
  onClose,
  onAdjusted,
}) => {
  const [mode, setMode] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('');

  const delta = mode === 'ADD' ? quantity : -quantity;
  const newStock = Math.max(0, item.currentStock + delta);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;

    storage.adjustStock(item.id, delta);
    onAdjusted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-md max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-slate-800" />
            <h3 className="text-base font-bold text-slate-900">
              Adjust Stock Level
            </h3>
          </div>
          <button
            id="btn-close-adjust-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item Info Summary */}
        <div className="my-3 p-3 bg-slate-50 rounded-md flex items-center justify-between text-xs">
          <div>
            <div className="font-semibold text-slate-900">{item.name}</div>
            <div className="text-slate-400 font-mono text-[11px]">{item.sku}</div>
          </div>
          <div className="text-right">
            <span className="text-slate-400 text-[10px] block">Current On-Hand</span>
            <span className="font-bold font-mono text-slate-900 text-sm">
              {item.currentStock} {item.unit}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Add / Deduct Switcher */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Adjustment Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-adjust-mode-add"
                onClick={() => setMode('ADD')}
                className={`py-2 px-3 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  mode === 'ADD'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add Stock (+)</span>
              </button>

              <button
                type="button"
                id="btn-adjust-mode-deduct"
                onClick={() => setMode('DEDUCT')}
                className={`py-2 px-3 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  mode === 'DEDUCT'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Minus className="w-4 h-4" />
                <span>Deduct Stock (-)</span>
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Quantity to {mode === 'ADD' ? 'Add' : 'Deduct'} ({item.unit}) *
            </label>
            <input
              id="input-adjust-qty"
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full px-3 py-2 text-sm font-mono font-bold rounded-md border border-slate-200 focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Remarks Notes */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Remarks / Reason (Optional)
            </label>
            <input
              id="input-adjust-notes"
              type="text"
              placeholder="e.g. Physical inventory count, damaged box, supplier shipment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Projected Result */}
          <div className="p-3 bg-slate-100/70 rounded-md flex items-center justify-between">
            <span className="text-slate-600 font-medium">New Projected Stock:</span>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-500">{item.currentStock}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-sm font-bold text-slate-900">
                {newStock} {item.unit}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
            <button
              id="btn-cancel-adjust"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-adjust"
              type="submit"
              className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs"
            >
              Apply Stock Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
