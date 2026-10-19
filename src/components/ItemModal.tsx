import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Package,
  Layers,
  MapPin,
  AlertTriangle,
  Barcode as BarcodeIcon,
  ScanLine,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  TrendingUp,
  Boxes,
} from 'lucide-react';
import { InventoryItem } from '../types';
import { storage } from '../services/storage';
import { generateRandomBarcode, renderBarcodeSvg } from '../utils/barcode';
import { formatPKR } from '../utils/currency';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface ItemModalProps {
  isOpen: boolean;
  itemToEdit: InventoryItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  itemToEdit,
  onClose,
  onSaved,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      if (itemToEdit) {
        setSku(itemToEdit.sku);
        setBarcode(itemToEdit.barcode || itemToEdit.sku || '');
        setName(itemToEdit.name);
        setCategory(itemToEdit.category || 'General');
        setBrand(itemToEdit.brand || '');
        setUnit(itemToEdit.unit || 'pcs');
        setCostPrice(itemToEdit.costPrice || 0);
        setSellingPrice(itemToEdit.sellingPrice || 0);
        setCurrentStock(itemToEdit.currentStock || 0);
        setMinStockAlert(itemToEdit.minStockAlert || 5);
        setLocation(itemToEdit.location || '');
        setNotes(itemToEdit.notes || '');
      } else {
        // Auto-generate a friendly SKU prefix and barcode
        const rand = Math.floor(100 + Math.random() * 900);
        const generatedSku = `SKU-${rand}`;
        setSku(generatedSku);
        setBarcode(generateRandomBarcode());
        setName('');
        let initialCat = '';
        try {
          const stored = localStorage.getItem('pos_custom_categories');
          const cats: string[] = stored ? JSON.parse(stored) : [];
          if (cats.length > 0) initialCat = cats[0];
        } catch {
          // ignore
        }
        setCategory(initialCat);
        setBrand('');
        setUnit('pcs');
        setCostPrice(2500);
        setSellingPrice(4500);
        setCurrentStock(15);
        setMinStockAlert(5);
        setLocation('Aisle 1 - Shelf A');
        setNotes('');
      }
      setError('');
    }
  }, [itemToEdit, isOpen]);

  // Update live barcode preview whenever barcode/sku changes
  useEffect(() => {
    const val = barcode.trim() || sku.trim();
    if (val && barcodeSvgRef.current) {
      renderBarcodeSvg(barcodeSvgRef.current, val, {
        height: 36,
        width: 1.4,
        fontSize: 10,
      });
    }
  }, [barcode, sku, currentStep]);

  if (!isOpen) return null;

  // Step validation before advancing
  const handleNextStep = () => {
    setError('');
    if (currentStep === 1) {
      if (!sku.trim()) {
        setError('Stock SKU code is required.');
        return;
      }
      if (!name.trim()) {
        setError('Product Name is required.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (costPrice < 0 || sellingPrice < 0) {
        setError('Prices cannot be negative.');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setError('');
    if (currentStep === 3) setCurrentStep(2);
    else if (currentStep === 2) setCurrentStep(1);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setCurrentStep(1);
      setError('Product Name is required.');
      return;
    }
    if (!sku.trim()) {
      setCurrentStep(1);
      setError('SKU is required.');
      return;
    }

    if (itemToEdit) {
      storage.updateItem(itemToEdit.id, {
        sku: sku.trim(),
        barcode: barcode.trim() || sku.trim(),
        name: name.trim(),
        category: category.trim(),
        brand: brand.trim() || undefined,
        unit: unit.trim(),
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        minStockAlert: Number(minStockAlert) || 0,
        location: location.trim(),
        notes: notes.trim(),
      });
    } else {
      storage.addItem({
        sku: sku.trim(),
        barcode: barcode.trim() || sku.trim(),
        name: name.trim(),
        category: category.trim(),
        brand: brand.trim() || undefined,
        unit: unit.trim(),
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        currentStock: Number(currentStock) || 0,
        minStockAlert: Number(minStockAlert) || 0,
        location: location.trim(),
        notes: notes.trim(),
      });
    }

    const trimmedCat = category.trim();
    if (trimmedCat) {
      try {
        const stored = localStorage.getItem('pos_custom_categories');
        const cats: string[] = stored ? JSON.parse(stored) : [];
        if (!cats.includes(trimmedCat)) {
          localStorage.setItem('pos_custom_categories', JSON.stringify([trimmedCat, ...cats]));
          localStorage.setItem('pos_categories_cleared', 'true');
        }
      } catch {
        // ignore
      }
    }

    const trimmedBrand = brand.trim();
    if (trimmedBrand) {
      try {
        const storedB = localStorage.getItem('pos_custom_brands');
        const brandsList: string[] = storedB ? JSON.parse(storedB) : [];
        if (!brandsList.includes(trimmedBrand)) {
          localStorage.setItem('pos_custom_brands', JSON.stringify([trimmedBrand, ...brandsList]));
          localStorage.setItem('pos_brands_cleared', 'true');
        }
      } catch {
        // ignore
      }
    }

    onSaved();
    onClose();
  };

  const profitPerUnit = sellingPrice - costPrice;
  const marginPercent = sellingPrice > 0 ? ((profitPerUnit / sellingPrice) * 100).toFixed(1) : '0.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header with Title & Stepper */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <Package className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {itemToEdit ? 'Edit Product SKU' : 'Register New Product'}
                </h3>
                <p className="text-xs text-slate-500">
                  Step {currentStep} of 3: {currentStep === 1 ? 'Product Identity & Barcode' : currentStep === 2 ? 'Pricing & Stock Levels' : 'Storage & Review'}
                </p>
              </div>
            </div>

            <button
              id="btn-close-item-modal"
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { num: 1, label: 'Identity & Code' },
              { num: 2, label: 'Pricing & Stock' },
              { num: 3, label: 'Storage & Save' },
            ].map((s) => {
              const isDone = currentStep > s.num;
              const isActive = currentStep === s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num === 1) setCurrentStep(1);
                    else if (s.num === 2 && sku.trim() && name.trim()) setCurrentStep(2);
                    else if (s.num === 3 && sku.trim() && name.trim()) setCurrentStep(3);
                  }}
                  className={`flex items-center gap-2 p-2 rounded-xl text-left transition-colors ${
                    isActive
                      ? 'bg-white shadow-2xs border border-slate-200 font-semibold text-slate-900'
                      : isDone
                      ? 'text-emerald-700 hover:bg-white/50'
                      : 'text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold shrink-0 ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span className="text-xs font-semibold truncate hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2.5 shrink-0">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Step Body */}
        <div className="flex-1 overflow-y-auto p-6 text-sm space-y-5">
          {/* STEP 1: Product Identity & Barcode */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Stock SKU Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-item-sku"
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. ELC-KB-01"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 font-mono text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Category
                  </label>
                  <input
                    id="input-item-category"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Enter product category..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-item-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ergonomic Office Wireless Keyboard"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Brand
                  </label>
                  <input
                    id="input-item-brand"
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Apple, Samsung, Anker, Ronin..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Unit of Measure
                  </label>
                  <input
                    id="input-item-unit"
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="pcs, box, kg, pack"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Quick Sample Barcode
                  </label>
                  <button
                    type="button"
                    onClick={() => setBarcode(generateRandomBarcode())}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Generate New 12-Digit Code</span>
                  </button>
                </div>
              </div>

              {/* Barcode Section with Scanner & Live Visual Preview */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <BarcodeIcon className="w-4 h-4 text-indigo-600" />
                    <span>Barcode / UPC / EAN-13</span>
                  </label>

                  {storage.isBarcodeEnabled() && (
                    <button
                      type="button"
                      id="btn-scan-item-barcode"
                      onClick={() => setIsScannerOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-[11px] font-medium transition-colors"
                    >
                      <ScanLine className="w-3 h-3 text-indigo-600" />
                      <span>Scan Package</span>
                    </button>
                  )}
                </div>

                <input
                  id="input-item-barcode"
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or enter 12-digit barcode number..."
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
                />

                {/* Live Visual Barcode Preview */}
                <div className="pt-2 flex flex-col items-center justify-center bg-white rounded border border-slate-200 p-2">
                  <svg ref={barcodeSvgRef} className="max-w-full h-auto" />
                  <span className="text-[10px] text-slate-400 font-mono mt-1">
                    Scannable Code-128 Format (Laser & Scanner Compatible)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Pricing & Stock Levels */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cost Price (PKR)
                  </label>
                  <input
                    id="input-item-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-slate-400 font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Purchase/supplier cost</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Selling Price (PKR)
                  </label>
                  <input
                    id="input-item-selling"
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-slate-400 font-mono text-xs font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Retail / counter price</span>
                </div>
              </div>

              {/* Profit & Margin Indicator */}
              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                  </div>
                  <div>
                    <span className="font-semibold text-emerald-950 block">Unit Gross Margin</span>
                    <span className="text-[11px] text-emerald-700">
                      Profit: <strong>{formatPKR(profitPerUnit)}</strong> per {unit}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-emerald-800 text-sm">{marginPercent}%</span>
                  <span className="text-[10px] text-emerald-600 block">Margin</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {!itemToEdit && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Initial Opening Stock
                    </label>
                    <input
                      id="input-item-stock"
                      type="number"
                      min="0"
                      value={currentStock}
                      onChange={(e) => setCurrentStock(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-slate-400 font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Units on hand</span>
                  </div>
                )}
                <div className={itemToEdit ? 'col-span-2' : ''}>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Low-Stock Alert Level <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-item-min-alert"
                    type="number"
                    min="0"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-slate-400 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Triggers warning when stock drops to or below this.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Warehouse Location, Notes & Final Review */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Storage Warehouse / Shelf Location
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="input-item-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Aisle 3 - Shelf B, Rack 2"
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes & Specifications (Optional)
                </label>
                <textarea
                  id="input-item-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional supplier details, technical specs, or warranty terms..."
                  className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                />
              </div>

              {/* Product Review Summary Card */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Product Confirmation Summary
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Name:</span>{' '}
                    <strong className="text-slate-900">{name || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">SKU:</span>{' '}
                    <strong className="font-mono text-slate-900">{sku}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Barcode:</span>{' '}
                    <strong className="font-mono text-slate-900">{barcode || sku}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Category:</span>{' '}
                    <strong className="text-slate-900">{category || 'General'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Brand:</span>{' '}
                    <strong className="text-slate-900">{brand || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Selling Price:</span>{' '}
                    <strong className="font-mono text-emerald-800">{formatPKR(sellingPrice)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Cost Price:</span>{' '}
                    <strong className="font-mono text-slate-700">{formatPKR(costPrice)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Unit:</span>{' '}
                    <strong className="text-slate-900">{unit}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Stock Alert:</span>{' '}
                    <strong className="text-slate-900">{minStockAlert} {unit}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pinned Footer with Navigation Controls */}
        <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-slate-700 text-sm sm:text-base font-semibold transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                id="btn-cancel-item-modal"
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-slate-700 text-sm sm:text-base font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < 3 ? (
              <button
                id="btn-next-item-step"
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm sm:text-base font-semibold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                id="btn-save-item-modal"
                type="button"
                onClick={() => handleSubmit()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm sm:text-base font-semibold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                <Check className="w-5 h-5 text-emerald-400" />
                <span>{itemToEdit ? 'Save Changes' : 'Register Product'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal for Scanning Physical Item Box */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        title="Scan Physical Product Barcode"
        subtitle="Aim your USB/Bluetooth barcode gun or enter code to fill barcode."
        onClose={() => setIsScannerOpen(false)}
        onRawCodeScanned={(code) => {
          setBarcode(code);
          setIsScannerOpen(false);
        }}
      />
    </div>
  );
};
