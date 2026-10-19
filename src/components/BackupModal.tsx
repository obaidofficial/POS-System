import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  FolderSync,
  FileCode,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { storage } from '../services/storage';
import { StorageInfo } from '../types';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    actionType: 'RESET_DEMO' | 'CLEAR_ALL';
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      storage.fetchStorageInfo().then((info) => {
        if (info) setStorageInfo(info);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const storageUsageKB = storage.getStorageUsageKB();
  const itemCount = storage.getItems().length;
  const salesCount = storage.getSales().length;
  const pcFilePath = storage.getPcStoragePath();

  const handleSyncFromDisk = async () => {
    setIsSyncing(true);
    try {
      const ok = await storage.forceSyncFromPcDisk();
      const updatedInfo = await storage.fetchStorageInfo();
      if (updatedInfo) setStorageInfo(updatedInfo);
      onDataChanged();
      if (ok) {
        setStatusMessage({
          type: 'success',
          text: `Successfully reloaded latest database directly from PC storage (${pcFilePath})!`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Could not contact PC storage server, current cached data is preserved.',
        });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: `Sync failed: ${e.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadBackup = () => {
    try {
      const json = storage.exportSystemStorageJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `stock_system_database_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatusMessage({
        type: 'success',
        text: 'PC database exported successfully! Saved to your Downloads/Computer storage.',
      });
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: `Failed to export backup: ${e.message}` });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await storage.importSystemStorageJSON(content);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Database successfully restored and written to PC disk (${pcFilePath})!`,
        });
        const updatedInfo = await storage.fetchStorageInfo();
        if (updatedInfo) setStorageInfo(updatedInfo);
        onDataChanged();
      } else {
        setStatusMessage({
          type: 'error',
          text: `Failed to restore: ${res.error}`,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    setConfirmAction({
      isOpen: true,
      title: 'Reset to Sample Catalog Dataset',
      description: 'Are you sure you want to reset all inventory items and sales records to the sample catalog dataset on your PC disk?',
      confirmText: 'Yes, Reset Database',
      actionType: 'RESET_DEMO',
    });
  };

  const handleClearAll = () => {
    setConfirmAction({
      isOpen: true,
      title: 'Erase All PC Disk Records',
      description: 'WARNING: Are you sure you want to permanently erase ALL records from PC disk storage across Sales, Inventory, Categories & Brands, Dashboard, EP & JC Services, Load Services, Protectors, Vendors & Khata, Expenses, and Cashbook? All brands and categories will be deleted just like all products. This action cannot be undone.',
      confirmText: 'Yes, Erase All Data',
      actionType: 'CLEAR_ALL',
    });
  };

  const handleExecuteConfirmedAction = async () => {
    if (!confirmAction) return;
    const type = confirmAction.actionType;
    setConfirmAction(null);

    if (type === 'RESET_DEMO') {
      await storage.resetToSampleData();
      const updatedInfo = await storage.fetchStorageInfo();
      if (updatedInfo) setStorageInfo(updatedInfo);
      setStatusMessage({
        type: 'success',
        text: 'Database restored to initial catalog dataset on PC disk.',
      });
      onDataChanged();
    } else if (type === 'CLEAR_ALL') {
      await storage.clearAllData();
      const updatedInfo = await storage.fetchStorageInfo();
      if (updatedInfo) setStorageInfo(updatedInfo);
      setStatusMessage({
        type: 'success',
        text: 'All data across Sales, Inventory, Categories & Brands, Dashboard, EP & JC Services, Load Services, Protectors, Vendors & Khata, Expenses, and Cashbook cleared from PC disk storage.',
      });
      onDataChanged();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-md max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                PC Storage & Database File
              </h3>
              <p className="text-xs text-slate-500">
                Data saved permanently to your PC hard drive
              </p>
            </div>
          </div>
          <button
            id="btn-close-backup-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-md text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* PC Disk Storage Box */}
        <div className="p-4 rounded-md bg-slate-900 text-white space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">PC Storage Location:</span>
            </div>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Disk File Synced
            </span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-md font-mono text-xs text-emerald-300 border border-slate-800 break-all flex items-center justify-between gap-2">
            <span>{storageInfo?.relativePath || pcFilePath}</span>
            <button
              id="btn-reload-from-pc-disk"
              onClick={handleSyncFromDisk}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-sans font-medium transition-colors shrink-0"
              title="Re-read directly from PC storage file"
            >
              <FolderSync className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Reload Disk'}</span>
            </button>
          </div>

          <div className="flex items-start gap-2 text-slate-400 text-[11px] leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Cross-Browser Protection:</strong> Your stock and sales records are written directly to this file on your computer disk. When you open this project in Chrome, Firefox, Edge, Safari, or an Incognito window, your data is loaded directly from this PC file.
            </span>
          </div>
        </div>

        {/* Storage Stats Grid */}
        <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white rounded-md border border-slate-200/80 shadow-xs">
              <span className="text-sm font-bold text-slate-900 block font-mono">{itemCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">Products</span>
            </div>
            <div className="p-2 bg-white rounded-md border border-slate-200/80 shadow-xs">
              <span className="text-sm font-bold text-slate-900 block font-mono">{salesCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">Sales</span>
            </div>
            <div className="p-2 bg-white rounded-md border border-slate-200/80 shadow-xs">
              <span className="text-sm font-bold text-slate-900 block font-mono">
                {storageInfo?.fileSizeKB ? `${storageInfo.fileSizeKB} KB` : `~${storageUsageKB} KB`}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">File Size</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 text-xs">
          {/* Export JSON */}
          <div className="p-3 rounded-md border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-900">Export Database File (.JSON)</div>
              <div className="text-slate-500 text-[11px]">
                Download a standalone JSON backup to keep an extra safe copy on your PC.
              </div>
            </div>
            <button
              id="btn-download-json-backup"
              onClick={handleDownloadBackup}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-3 rounded-md border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-900">Import / Restore File (.JSON)</div>
              <div className="text-slate-500 text-[11px]">
                Load a JSON file from your PC and overwrite the disk database.
              </div>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="file-input-backup"
              />
              <button
                id="btn-upload-json-backup"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold shrink-0"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Restore</span>
              </button>
            </div>
          </div>

          {/* Reset Demo Data */}
          <div className="p-3 rounded-md border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-900">Load Sample Catalog Data</div>
              <div className="text-slate-500 text-[11px]">
                Populate PC database file with realistic demo products, sales, and bank wires.
              </div>
            </div>
            <button
              id="btn-load-demo-data"
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
              <span>Load Demo</span>
            </button>
          </div>

          {/* Wipe data */}
          <div className="p-3 rounded-md border border-rose-100 bg-rose-50/30 flex items-center justify-between">
            <div>
              <div className="font-semibold text-rose-900">Erase All Records</div>
              <div className="text-rose-700/80 text-[11px]">
                Permanently empty PC disk storage database and clear all records across Sales, Inventory, Categories & Brands, Dashboard, EP & JC, Load, Protectors, Vendors & Khata, Expenses, and Cashbook.
              </div>
            </div>
            <button
              id="btn-clear-all-data"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            id="btn-close-backup-modal-bottom"
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* In-App Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5 mb-3.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                confirmAction.actionType === 'CLEAR_ALL' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
              }`}>
                {confirmAction.actionType === 'CLEAR_ALL' ? <Trash2 className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">{confirmAction.title}</h3>
                <p className="text-xs text-rose-600 font-semibold mt-0.5">Permanent Disk Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              {confirmAction.description}
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedAction}
                className={`px-4 py-2 rounded-lg text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs ${
                  confirmAction.actionType === 'CLEAR_ALL' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {confirmAction.actionType === 'CLEAR_ALL' ? <Trash2 className="w-4 h-4" /> : <RotateCcw className="w-4 h-4 text-emerald-400" />}
                <span>{confirmAction.confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

