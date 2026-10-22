import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  User,
  Phone,
  Hash,
  DollarSign,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { EpJcTransaction, EpJcServiceType, EpJcTxType } from '../types';
import { formatPKR } from '../utils/currency';
import { getBusinessDate, getPakistanTime } from '../utils/businessDate';

interface EpJcTxModalProps {
  isOpen: boolean;
  onClose: () => void;
  txToEdit: EpJcTransaction | null;
  onSave: (tx: Omit<EpJcTransaction, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  defaultDate?: string;
}

export const EpJcTxModal: React.FC<EpJcTxModalProps> = ({
  isOpen,
  onClose,
  txToEdit,
  onSave,
  defaultDate,
}) => {
  const todayStr = defaultDate || getBusinessDate();
  const currentTimeStr = getPakistanTime();

  const [service, setService] = useState<EpJcServiceType>('EASYPAISA');
  const [type, setType] = useState<EpJcTxType>('TRANSFER');
  const [date, setDate] = useState<string>(todayStr);
  const [time, setTime] = useState<string>(currentTimeStr);
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [feeOrCommission, setFeeOrCommission] = useState<string>('');
  const [trxId, setTrxId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (txToEdit) {
      setService(txToEdit.service);
      setType(txToEdit.type);
      setDate(txToEdit.date);
      setTime(txToEdit.time || currentTimeStr);
      setCustomerMobile(txToEdit.customerMobile);
      setCustomerName(txToEdit.customerName || '');
      setAmount(txToEdit.amount.toString());
      setFeeOrCommission(txToEdit.feeOrCommission ? txToEdit.feeOrCommission.toString() : '');
      setTrxId(txToEdit.trxId || '');
      setNotes(txToEdit.notes || '');
    } else {
      setService('EASYPAISA');
      setType('TRANSFER');
      setDate(defaultDate || todayStr);
      setTime(currentTimeStr);
      setCustomerMobile('');
      setCustomerName('');
      setAmount('');
      setFeeOrCommission('');
      setTrxId('');
      setNotes('');
    }
    setErrorMsg('');
  }, [txToEdit, isOpen, defaultDate, todayStr, currentTimeStr]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid positive transaction amount.');
      return;
    }

    if (!customerMobile.trim()) {
      setErrorMsg('Customer mobile number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        id: txToEdit ? txToEdit.id : undefined,
        service,
        type,
        date,
        time,
        customerMobile: customerMobile.trim(),
        customerName: customerName.trim() || undefined,
        amount: numAmount,
        feeOrCommission: parseFloat(feeOrCommission) || 0,
        trxId: trxId.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              {txToEdit ? 'Edit Transaction' : 'Record EP / JC Transaction'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Log Cash Transfer (Cash In / Send) or Cash Withdraw (Cash Out).
            </p>
          </div>
          <button
            id="close-epjc-tx-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Service Selector (EasyPaisa vs JazzCash) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Digital Service
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="select-service-easypaisa"
                onClick={() => setService('EASYPAISA')}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  service === 'EASYPAISA'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                EasyPaisa (EP)
              </button>
              <button
                type="button"
                id="select-service-jazzcash"
                onClick={() => setService('JAZZCASH')}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  service === 'JAZZCASH'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                JazzCash (JC)
              </button>
            </div>
          </div>

          {/* Type Selector (Transfer vs Withdraw) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Transaction Action
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="select-type-transfer"
                onClick={() => setType('TRANSFER')}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'TRANSFER'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-blue-600" />
                Transfer / Send (Cash In)
              </button>
              <button
                type="button"
                id="select-type-withdraw"
                onClick={() => setType('WITHDRAW')}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'WITHDRAW'
                    ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-purple-600" />
                Withdraw / Cash Out
              </button>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Date
              </label>
              <input
                id="epjc-tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Time
              </label>
              <input
                id="epjc-tx-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Customer Mobile & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Customer Mobile <span className="text-red-500">*</span>
              </label>
              <input
                id="epjc-tx-mobile"
                type="text"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                placeholder="03001234567"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Customer Name (Optional)
              </label>
              <input
                id="epjc-tx-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Tariq Mehmood"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Amount & Fee / Commission */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Amount (PKR) <span className="text-red-500">*</span>
              </label>
              <input
                id="epjc-tx-amount"
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Commission / Fee (PKR)
              </label>
              <input
                id="epjc-tx-fee"
                type="number"
                min="0"
                step="any"
                value={feeOrCommission}
                onChange={(e) => setFeeOrCommission(e.target.value)}
                placeholder="e.g. 50"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Telco Transaction ID & Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Telco Transaction ID (TRX / TID)
            </label>
            <input
              id="epjc-tx-tid"
              type="text"
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
              placeholder="e.g. EP902918381 or JC839201948"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Purpose / Notes
            </label>
            <input
              id="epjc-tx-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Utility bill payment or emergency cash"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              id="save-epjc-tx-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : txToEdit ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
