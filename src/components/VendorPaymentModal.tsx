import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CreditCard,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  FileText,
  ArrowRight,
  Search,
  Check,
} from 'lucide-react';
import { Vendor, VendorPayment, VendorPurchase, VendorPaymentMethod } from '../types';
import { formatRs } from '../utils/currency';

interface VendorPaymentModalProps {
  isOpen: boolean;
  vendors: Vendor[];
  purchases: VendorPurchase[];
  initialVendorId?: string;
  initialPurchaseId?: string;
  onClose: () => void;
  onSaved: (payment: Omit<VendorPayment, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
}

export const VendorPaymentModal: React.FC<VendorPaymentModalProps> = ({
  isOpen,
  vendors,
  purchases,
  initialVendorId,
  initialPurchaseId,
  onClose,
  onSaved,
}) => {
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorSearchInput, setVendorSearchInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const vendorInputContainerRef = useRef<HTMLDivElement>(null);

  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [time, setTime] = useState(() => new Date().toTimeString().substring(0, 5));
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<VendorPaymentMethod>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const initialV = initialVendorId ? vendors.find((v) => v.id === initialVendorId) : null;
      if (initialV) {
        setSelectedVendorId(initialV.id);
        setVendorSearchInput(initialV.name);
      } else {
        setSelectedVendorId('');
        setVendorSearchInput('');
      }
      setIsDropdownOpen(false);
      setSelectedPurchaseId(initialPurchaseId || '');
      setDate(new Date().toISOString().substring(0, 10));
      setTime(new Date().toTimeString().substring(0, 5));
      setPaymentMethod('CASH');
      setReferenceNumber('');
      setNotes('');
      setError('');

      // Auto-suggest payment amount if a specific purchase was selected
      if (initialPurchaseId) {
        const pur = purchases.find((p) => p.id === initialPurchaseId);
        if (pur && pur.remainingAmount > 0) {
          setAmount(pur.remainingAmount);
        } else {
          setAmount('');
        }
      } else if (initialV && initialV.currentBalance > 0) {
        setAmount(initialV.currentBalance);
      } else {
        setAmount('');
      }
    }
  }, [isOpen, initialVendorId, initialPurchaseId, vendors, purchases]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        vendorInputContainerRef.current &&
        !vendorInputContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Filter vendor list by typing 3 or more alphabets/characters
  const trimmedInput = vendorSearchInput.trim().toLowerCase();
  const shouldShowSuggestions = isDropdownOpen && trimmedInput.length >= 3;
  const filteredSuggestions = shouldShowSuggestions
    ? vendors.filter((v) =>
        v.name.toLowerCase().includes(trimmedInput) ||
        (v.city && v.city.toLowerCase().includes(trimmedInput)) ||
        (v.contactPerson && v.contactPerson.toLowerCase().includes(trimmedInput))
      )
    : [];

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);
  const vendorPurchases = purchases.filter((p) => p.vendorId === selectedVendorId);
  const selectedPurchase = purchases.find((p) => p.id === selectedPurchaseId);

  const numAmount = Number(amount) || 0;
  const currentBalance = selectedVendor ? selectedVendor.currentBalance : 0;
  const newBalance = Math.max(0, currentBalance - numAmount);

  const handleSelectVendor = (vendor: Vendor) => {
    setSelectedVendorId(vendor.id);
    setVendorSearchInput(vendor.name);
    setSelectedPurchaseId('');
    setIsDropdownOpen(false);
    setError('');
    if (vendor.currentBalance > 0) {
      setAmount(vendor.currentBalance);
    } else {
      setAmount('');
    }
  };

  const handlePurchaseChange = (pId: string) => {
    setSelectedPurchaseId(pId);
    if (pId) {
      const p = purchases.find((pur) => pur.id === pId);
      if (p && p.remainingAmount > 0) {
        setAmount(p.remainingAmount);
        return;
      }
    }
    if (selectedVendor && selectedVendor.currentBalance > 0) {
      setAmount(selectedVendor.currentBalance);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetVendorId = selectedVendorId;
    let targetVendorName = vendorSearchInput.trim();

    if (!targetVendorId) {
      const matched = vendors.find(
        (v) => v.name.toLowerCase() === vendorSearchInput.trim().toLowerCase()
      );
      if (matched) {
        targetVendorId = matched.id;
        targetVendorName = matched.name;
      } else {
        setError('Please select a valid saved vendor to pay');
        return;
      }
    }

    if (!numAmount || numAmount <= 0) {
      setError('Payment amount must be greater than Rs. 0');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      await onSaved({
        vendorId: targetVendorId,
        vendorName: selectedVendor ? selectedVendor.name : targetVendorName,
        purchaseId: selectedPurchaseId || undefined,
        billNumber: selectedPurchase ? selectedPurchase.billNumber : undefined,
        date,
        time,
        amount: numAmount,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim(),
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-base">Record Vendor Payment (Paid Udhaar / Cash)</h2>
              <p className="text-[11px] text-slate-300">
                Log when and how much you paid to clear your vendor credit balance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Vendor with 3-alphabet autocomplete */}
          <div ref={vendorInputContainerRef} className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Vendor / Supplier Name <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Type 3 letters to see saved vendors
              </span>
            </div>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                id="input-payment-vendor-name"
                type="text"
                autoComplete="off"
                required
                value={vendorSearchInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setVendorSearchInput(val);
                  setIsDropdownOpen(true);
                  if (selectedVendor && val.toLowerCase() !== selectedVendor.name.toLowerCase()) {
                    setSelectedVendorId('');
                  }
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Type vendor name (e.g. Al-Madina, Prime Cases...)"
                className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
              />
              {vendorSearchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setVendorSearchInput('');
                    setSelectedVendorId('');
                    setIsDropdownOpen(false);
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Clear vendor"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Suggestions list when >= 3 letters typed */}
            {shouldShowSuggestions && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                {filteredSuggestions.length > 0 ? (
                  <>
                    <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Matching Saved Vendors ({filteredSuggestions.length})
                    </div>
                    {filteredSuggestions.map((v) => {
                      const isSelected = v.id === selectedVendorId;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleSelectVendor(v)}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-emerald-50/80 transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected ? 'bg-emerald-50 font-semibold' : ''
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-slate-900 font-medium">{v.name}</span>
                            <span className="text-[10px] text-slate-500">
                              {v.city ? `${v.city} • ` : ''}Phone: {v.phone}
                            </span>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span
                              className={`text-[11px] font-semibold ${
                                v.currentBalance > 0 ? 'text-amber-700' : 'text-emerald-700'
                              }`}
                            >
                              {v.currentBalance > 0
                                ? `Udhaar: ${formatRs(v.currentBalance)}`
                                : 'All Clear'}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
                          </div>
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <div className="p-3 text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">No matching vendor found for "{vendorSearchInput}"</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Please enter the name of a registered vendor.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Outstanding Balance Banner */}
          {selectedVendor && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-amber-800">Current Outstanding Udhaar:</span>
                <p className="text-lg font-bold text-amber-900">
                  {formatRs(currentBalance)}
                </p>
              </div>
              <div className="text-right text-[11px] text-amber-700">
                <p>Total Billed: {formatRs(selectedVendor.totalBilled)}</p>
                <p>Total Paid So Far: {formatRs(selectedVendor.totalPaid)}</p>
              </div>
            </div>
          )}

          {/* Optional Bill Linkage */}
          {vendorPurchases.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Link to Purchase Bill (Optional)
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <select
                  value={selectedPurchaseId}
                  onChange={(e) => handlePurchaseChange(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">-- General Account Payment (All Bills) --</option>
                  {vendorPurchases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.billNumber} ({p.date}) — Bill Total: {formatRs(p.totalAmount)} | Remaining: {formatRs(p.remainingAmount)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Date & Time (When I paid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Amount (How much I paid) */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Amount Paid (How Much Paid) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">Rs.</span>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  setAmount(val);
                }}
                placeholder="Enter paid amount"
                className="w-full pl-10 pr-3 py-2 text-base font-extrabold text-emerald-700 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Quick Amount Presets */}
            {currentBalance > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2 text-[11px]">
                <span className="text-slate-500">Presets:</span>
                <button
                  type="button"
                  onClick={() => setAmount(currentBalance)}
                  className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors"
                >
                  Pay Full Balance ({formatRs(currentBalance)})
                </button>
                {currentBalance > 1000 && (
                  <button
                    type="button"
                    onClick={() => setAmount(Math.round(currentBalance / 2))}
                    className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    Pay 50% ({formatRs(Math.round(currentBalance / 2))})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAmount(5000)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Rs. 5,000
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(10000)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Rs. 10,000
                </button>
              </div>
            )}
          </div>

          {/* Real-time Balance Result Preview */}
          {selectedVendor && numAmount > 0 && (
            <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Before: {formatRs(currentBalance)}</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold text-emerald-800">
                  New Udhaar: {formatRs(newBalance)}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                newBalance === 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-800'
              }`}>
                {newBalance === 0 ? 'Account Cleared!' : 'Remaining Udhaar'}
              </span>
            </div>
          )}

          {/* Payment Method & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Channel <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as VendorPaymentMethod)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
              >
                <option value="CASH">Counter Cash</option>
                <option value="BANK_TRANSFER">Bank Online Transfer</option>
                <option value="EASYPAISA">EasyPaisa</option>
                <option value="JAZZCASH">JazzCash</option>
                <option value="CHEQUE">Bank Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reference / Trx ID / Receipt #
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. MCB-99021 / Receipt # 104"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Remarks / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Partial installment paid via mobile banking app"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Save Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
