import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Radio,
  User,
  Phone,
  DollarSign,
  Percent,
  CheckCircle,
  FileText,
  Hash,
  Sparkles,
  Info,
} from 'lucide-react';
import { LoadTransaction, LoadNetworkType, LoadTxType } from '../types';
import { formatPKR } from '../utils/currency';
import { getBusinessDate, getPakistanTime } from '../utils/businessDate';

interface LoadTxModalProps {
  isOpen: boolean;
  onClose: () => void;
  txToEdit: LoadTransaction | null;
  onSave: (tx: Omit<LoadTransaction, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  defaultDate?: string;
}

const NETWORK_CONFIGS: Record<
  LoadNetworkType,
  { label: string; color: string; badgeBg: string; border: string; activeClass: string; defaultCommissionRate: number }
> = {
  JAZZ_WARID: {
    label: 'Jazz / Warid',
    color: 'text-red-700',
    badgeBg: 'bg-red-50 text-red-700 border-red-200',
    border: 'border-red-300',
    activeClass: 'bg-red-600 text-white border-red-600 shadow-xs',
    defaultCommissionRate: 2.5,
  },
  TELENOR: {
    label: 'Telenor',
    color: 'text-sky-700',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    border: 'border-sky-300',
    activeClass: 'bg-sky-600 text-white border-sky-600 shadow-xs',
    defaultCommissionRate: 2.5,
  },
  ZONG: {
    label: 'Zong',
    color: 'text-emerald-700',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    border: 'border-emerald-300',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
    defaultCommissionRate: 2.5,
  },
  UFONE: {
    label: 'Ufone',
    color: 'text-amber-700',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    border: 'border-amber-300',
    activeClass: 'bg-amber-600 text-white border-amber-600 shadow-xs',
    defaultCommissionRate: 2.5,
  },
};

const TX_TYPES: { id: LoadTxType; label: string; desc: string }[] = [
  { id: 'EASYLOAD', label: 'Easyload / Topup', desc: 'Prepaid SIM balance reload' },
  { id: 'PACKAGE', label: 'Super Card / Package', desc: 'Monthly/Weekly bundle or card' },
  { id: 'POSTPAID_BILL', label: 'Postpaid Bill Payment', desc: 'Postpaid network bill payment' },
];

export const LoadTxModal: React.FC<LoadTxModalProps> = ({
  isOpen,
  onClose,
  txToEdit,
  onSave,
  defaultDate,
}) => {
  const todayStr = defaultDate || getBusinessDate();
  const nowTimeStr = getPakistanTime();

  const [date, setDate] = useState<string>(todayStr);
  const [time, setTime] = useState<string>(nowTimeStr);
  const [network, setNetwork] = useState<LoadNetworkType>('JAZZ_WARID');
  const [type, setType] = useState<LoadTxType>('EASYLOAD');
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [commissionOrProfit, setCommissionOrProfit] = useState<string>('');
  const [trxId, setTrxId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (txToEdit) {
      setDate(txToEdit.date);
      setTime(txToEdit.time || nowTimeStr);
      setNetwork(txToEdit.network);
      setType(txToEdit.type);
      setCustomerMobile(txToEdit.customerMobile || '');
      setCustomerName(txToEdit.customerName || '');
      setAmount((txToEdit.amount ?? '').toString());
      setCommissionOrProfit((txToEdit.commissionOrProfit ?? '').toString());
      setTrxId(txToEdit.trxId || '');
      setNotes(txToEdit.notes || '');
    } else {
      setDate(defaultDate || todayStr);
      setTime(nowTimeStr);
      setNetwork('JAZZ_WARID');
      setType('EASYLOAD');
      setCustomerMobile('');
      setCustomerName('');
      setAmount('');
      setCommissionOrProfit('');
      setTrxId('');
      setNotes('');
    }
    setErrorMsg('');
  }, [txToEdit, isOpen, defaultDate, todayStr, nowTimeStr]);

  if (!isOpen) return null;

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      // Calculate suggested commission based on selected network rate (2.5%) or package flat estimate
      if (type === 'EASYLOAD') {
        const rate = NETWORK_CONFIGS[network].defaultCommissionRate;
        const comm = Math.round((num * rate) / 100);
        setCommissionOrProfit(comm.toString());
      } else if (type === 'PACKAGE') {
        // Packages often have Rs. 50 - 100 margin
        const comm = Math.round(num * 0.05);
        setCommissionOrProfit(comm.toString());
      }
    }
  };

  const handleApplyPresetCommission = (ratePercent: number) => {
    const num = parseFloat(amount);
    if (!isNaN(num) && num > 0) {
      const comm = Math.round((num * ratePercent) / 100);
      setCommissionOrProfit(comm.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid sale amount in PKR.');
      return;
    }

    const cleanMobile = customerMobile.trim().replace(/[-\s]/g, '');
    if (!cleanMobile || cleanMobile.length < 10) {
      setErrorMsg('Please enter a valid customer mobile number (e.g. 03001234567).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        id: txToEdit ? txToEdit.id : undefined,
        date,
        time,
        network,
        type,
        customerMobile: cleanMobile,
        customerName: customerName.trim() || undefined,
        amount: numAmount,
        commissionOrProfit: Math.max(0, parseFloat(commissionOrProfit) || 0),
        trxId: trxId.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save load transaction');
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
              <Radio className="w-5 h-5 text-amber-600" />
              {txToEdit ? 'Edit Load Sale Record' : 'Record Mobile Load Sale'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record easyload, packages, or postpaid payments with retail commission
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Network Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mobile Network / Telco <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['JAZZ_WARID', 'TELENOR', 'ZONG', 'UFONE'] as LoadNetworkType[]).map((net) => {
                const cfg = NETWORK_CONFIGS[net];
                const isSelected = network === net;
                return (
                  <button
                    key={net}
                    type="button"
                    onClick={() => {
                      setNetwork(net);
                      if (amount) {
                        const num = parseFloat(amount);
                        if (!isNaN(num) && num > 0 && type === 'EASYLOAD') {
                          setCommissionOrProfit(Math.round((num * cfg.defaultCommissionRate) / 100).toString());
                        }
                      }
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? cfg.activeClass
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Load Service Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TX_TYPES.map((t) => {
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50/50 ring-1 ring-amber-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-xs font-bold text-slate-900">{t.label}</span>
                    <span className="block text-[10px] text-slate-500 truncate">{t.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Time
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Customer Mobile & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Mobile <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="tel"
                  required
                  placeholder="03001234567"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name (Optional)
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. Tariq Mehmood"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Amount & Commission */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Load Amount (PKR) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                  Rs.
                </span>
                <input
                  type="number"
                  min="10"
                  step="any"
                  required
                  placeholder="e.g. 500"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
              {/* Quick Amount presets */}
              <div className="flex gap-1 mt-1.5">
                {[100, 200, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAmountChange(preset.toString())}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    Rs.{preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Commission / Profit (PKR)</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Retail Margin</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                  Rs.
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={commissionOrProfit}
                  onChange={(e) => setCommissionOrProfit(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs font-mono font-bold text-emerald-700 bg-emerald-50/30 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              {/* Quick Commission Rate presets */}
              <div className="flex gap-1 mt-1.5">
                {[2, 2.5, 3, 5].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleApplyPresetCommission(pct)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors font-semibold"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Trx ID / Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Telco Transaction ID / Ref # (Optional)
            </label>
            <div className="relative">
              <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="e.g. JZ-889104 or USSD confirmation #"
                value={trxId}
                onChange={(e) => setTrxId(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Weekly All In One bundle, customer paid cash"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
          </div>

          {/* Live Preview Summary */}
          {parseFloat(amount) > 0 && (
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-800">
                  {NETWORK_CONFIGS[network].label} • {type.replace('_', ' ')}
                </span>
                <span className="block text-[11px] text-slate-500">
                  Target: {customerMobile || '03XXXXXXXXX'}
                </span>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-sm font-mono text-slate-900 block">
                  {formatPKR(parseFloat(amount) || 0)}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 block">
                  Profit: +{formatPKR(parseFloat(commissionOrProfit) || 0)}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4 text-amber-400" />
              <span>{isSubmitting ? 'Recording...' : 'Record Load Sale'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
