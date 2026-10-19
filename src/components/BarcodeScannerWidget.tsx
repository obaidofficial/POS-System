import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  AlertCircle,
  CheckCircle2,
  Zap,
  ScanLine,
  Barcode,
} from 'lucide-react';
import { formatPKR } from '../utils/currency';

export type ScannerMode = 'HARDWARE';

interface BarcodeScannerWidgetProps {
  onScan: (barcode: string) => void;
  lastScannedCode?: string;
  lastScannedStatus?: {
    success: boolean;
    message: string;
    itemName?: string;
    itemPrice?: number;
  } | null;
  activeMode?: string;
  onModeChange?: (mode: ScannerMode) => void;
  compact?: boolean;
}

export const BarcodeScannerWidget: React.FC<BarcodeScannerWidgetProps> = ({
  onScan,
  lastScannedCode,
  lastScannedStatus,
  compact = false,
}) => {
  const [manualCode, setManualCode] = useState('');
  const lastScannedTimeRef = useRef<number>(0);
  const lastScannedValueRef = useRef<string>('');
  const hardwareInputRef = useRef<HTMLInputElement | null>(null);

  // Safe scan processor with debounce cooldown
  const processScan = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      const now = Date.now();
      // If scanning same code repeatedly within 1s, ignore to prevent accidental multi-scan
      if (
        trimmed === lastScannedValueRef.current &&
        now - lastScannedTimeRef.current < 1000
      ) {
        return;
      }

      lastScannedValueRef.current = trimmed;
      lastScannedTimeRef.current = now;

      // Trigger callback to add item
      onScan(trimmed);
      setManualCode('');
    },
    [onScan]
  );

  // ============================================================
  // USB / BLUETOOTH HARDWARE SCANNER LOGIC (KEYBOARD WEDGE)
  // ============================================================
  useEffect(() => {
    let keyBuffer = '';
    let lastKeyTime = 0;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in regular text inputs (except hardware scanner input)
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        target.id !== 'usb-bluetooth-scanner-input';

      if (isInput) return;

      const now = Date.now();
      const timeDiff = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (keyBuffer.length >= 2) {
          e.preventDefault();
          processScan(keyBuffer);
          keyBuffer = '';
        }
        return;
      }

      // Printable characters
      if (e.key.length === 1) {
        // Hardware scanners typically dump characters < 50ms apart
        if (timeDiff > 250) {
          keyBuffer = e.key;
        } else {
          keyBuffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [processScan]);

  return (
    <div className="space-y-2.5">
      {/* Hardware Barcode Scanner Interface */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5 text-indigo-600" />
              <span>USB / Bluetooth Barcode Gun Ready</span>
            </span>
          </div>

          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            Listening for Scans
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={hardwareInputRef}
              id="usb-bluetooth-scanner-input"
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualCode.trim()) {
                  e.preventDefault();
                  processScan(manualCode);
                }
              }}
              placeholder="Aim USB or Bluetooth barcode gun & trigger, or type code..."
              className="w-full pl-9 pr-3 py-2 text-xs font-mono font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <button
            type="button"
            id="btn-submit-manual-barcode"
            onClick={() => {
              if (manualCode.trim()) {
                processScan(manualCode);
              }
            }}
            disabled={!manualCode.trim()}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
          >
            Enter
          </button>
        </div>

        <p className="text-[11px] text-slate-500 flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>
            Works with any standard <strong>USB cable</strong> or <strong>Bluetooth wireless</strong> barcode laser gun. Simply pull the trigger on any item's barcode label.
          </span>
        </p>
      </div>

      {/* SCAN STATUS BANNER / FEEDBACK */}
      {lastScannedStatus && (
        <div
          className={`flex items-center justify-between p-2.5 rounded-md text-xs border transition-all ${
            lastScannedStatus.success
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {lastScannedStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <div>
              <div className="font-semibold">{lastScannedStatus.message}</div>
              {lastScannedStatus.itemName && (
                <div className="text-[11px] text-slate-600 font-mono">
                  {lastScannedStatus.itemName}
                  {lastScannedStatus.itemPrice !== undefined &&
                    ` • ${formatPKR(lastScannedStatus.itemPrice)}`}
                </div>
              )}
            </div>
          </div>

          {lastScannedCode && (
            <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-white/80 border border-slate-200">
              {lastScannedCode}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
