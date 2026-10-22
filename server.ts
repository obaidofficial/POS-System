import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { getBusinessDate } from './src/utils/businessDate';

const PORT = 3000;
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'stock_database.json');
const AUTH_FILE = path.join(DB_DIR, 'auth_config.json');

// ==========================================
// Authentication & User Management Configuration
// Default Admin Username: "obaid"
// Default Admin Name: "Syed Obaid Ullah Shah"
// Default Admin Password: "Saimakhan@love143"
// Stored in encrypted/hashed form using Node's cryptographic scrypt
// ==========================================

export interface ServerUserRecord {
  id: string;
  username: string; // lowercase, unique
  name: string;
  role: 'admin' | 'worker';
  permissions: ('sales' | 'epjc' | 'load')[];
  photo?: string;
  salt: string;
  passwordHash: string;
  twoFactorEmail?: string;
  twoFactorMobile?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthStorageData {
  username?: string;
  name?: string;
  photo?: string;
  salt?: string;
  passwordHash?: string;
  twoFactorEmail?: string;
  twoFactorMobile?: string;
  users?: ServerUserRecord[];
}

const DEFAULT_ADMIN_USER: ServerUserRecord = {
  id: 'user_admin',
  username: 'obaid',
  name: 'Syed Obaid Ullah Shah',
  role: 'admin',
  permissions: ['sales', 'epjc', 'load'],
  photo: '',
  salt: 'f69b02bd87ab3661a8de91eed9dc282e',
  passwordHash: '4673e440854df13d496ad25ca60bfaa53bada6ccf4b55b53f8f526dba9148ea692b08aa2a59fe15b63b81f9f511e97cb35c1e3cbd22e9ad96bdf27b536e3a6aa',
  twoFactorEmail: 'itsobaidofficial@gmail.com',
  twoFactorMobile: '03484600182',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

function getAllUsers(): ServerUserRecord[] {
  if (fs.existsSync(AUTH_FILE)) {
    try {
      const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
      const parsed: AuthStorageData = JSON.parse(raw);
      if (Array.isArray(parsed.users) && parsed.users.length > 0) {
        return parsed.users;
      }
      // Migrate legacy single user to users array
      if (parsed.username && parsed.salt && parsed.passwordHash) {
        const migratedAdmin: ServerUserRecord = {
          id: 'user_admin',
          username: parsed.username.toLowerCase(),
          name: parsed.name || DEFAULT_ADMIN_USER.name,
          role: 'admin',
          permissions: ['sales', 'epjc', 'load'],
          photo: parsed.photo || '',
          salt: parsed.salt,
          passwordHash: parsed.passwordHash,
          twoFactorEmail: parsed.twoFactorEmail !== undefined && parsed.twoFactorEmail !== '' ? parsed.twoFactorEmail : DEFAULT_ADMIN_USER.twoFactorEmail,
          twoFactorMobile: parsed.twoFactorMobile !== undefined && parsed.twoFactorMobile !== '' ? parsed.twoFactorMobile : DEFAULT_ADMIN_USER.twoFactorMobile,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
        };
        saveAllUsers([migratedAdmin]);
        return [migratedAdmin];
      }
    } catch (e) {
      console.error('Failed to read auth_config.json, falling back to default:', e);
    }
  }

  saveAllUsers([DEFAULT_ADMIN_USER]);
  return [DEFAULT_ADMIN_USER];
}

function saveAllUsers(users: ServerUserRecord[]) {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  const primaryAdmin = users.find(u => u.role === 'admin') || users[0] || DEFAULT_ADMIN_USER;
  const data: AuthStorageData = {
    username: primaryAdmin.username,
    name: primaryAdmin.name,
    photo: primaryAdmin.photo || '',
    salt: primaryAdmin.salt,
    passwordHash: primaryAdmin.passwordHash,
    twoFactorEmail: primaryAdmin.twoFactorEmail || '',
    twoFactorMobile: primaryAdmin.twoFactorMobile || '',
    users,
  };
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getUserByUsername(username: string): ServerUserRecord | undefined {
  if (!username) return undefined;
  const clean = username.trim().toLowerCase();
  return getAllUsers().find(u => u.username.toLowerCase() === clean);
}

function getUserById(id: string): ServerUserRecord | undefined {
  if (!id) return undefined;
  return getAllUsers().find(u => u.id === id);
}

function saveUser(user: ServerUserRecord): void {
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...user, updatedAt: new Date().toISOString() };
  } else {
    users.push({ ...user, createdAt: user.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  saveAllUsers(users);
}

function deleteUserById(id: string): boolean {
  const users = getAllUsers();
  const target = users.find(u => u.id === id);
  if (!target || target.role === 'admin') {
    return false;
  }
  const filtered = users.filter(u => u.id !== id);
  saveAllUsers(filtered);
  return true;
}

function sanitizeUser(u: ServerUserRecord) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    permissions: u.permissions || (u.role === 'admin' ? ['sales', 'epjc', 'load'] : ['sales', 'epjc', 'load']),
    photo: u.photo || '',
    twoFactorEmail: u.twoFactorEmail || '',
    twoFactorMobile: u.twoFactorMobile || '',
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function getAuthConfig(): { username: string; name: string; photo?: string; salt: string; passwordHash: string; twoFactorEmail?: string; twoFactorMobile?: string } {
  const users = getAllUsers();
  const admin = users.find(u => u.role === 'admin') || users[0] || DEFAULT_ADMIN_USER;
  return {
    username: admin.username,
    name: admin.name,
    photo: admin.photo || '',
    salt: admin.salt,
    passwordHash: admin.passwordHash,
    twoFactorEmail: admin.twoFactorEmail || DEFAULT_ADMIN_USER.twoFactorEmail,
    twoFactorMobile: admin.twoFactorMobile || DEFAULT_ADMIN_USER.twoFactorMobile,
  };
}

function updateAuthConfig(newConfig: { username: string; name: string; photo?: string; salt: string; passwordHash: string; twoFactorEmail?: string; twoFactorMobile?: string }) {
  const users = getAllUsers();
  const adminIdx = users.findIndex(u => u.role === 'admin');
  if (adminIdx >= 0) {
    users[adminIdx] = {
      ...users[adminIdx],
      username: newConfig.username,
      name: newConfig.name,
      photo: newConfig.photo || '',
      salt: newConfig.salt,
      passwordHash: newConfig.passwordHash,
      twoFactorEmail: newConfig.twoFactorEmail,
      twoFactorMobile: newConfig.twoFactorMobile,
      updatedAt: new Date().toISOString(),
    };
  }
  saveAllUsers(users);
}

interface SessionInfo {
  expiresAt: number;
  stayLoggedIn: boolean;
  createdAt: number;
  userId?: string;
  username?: string;
  role?: 'admin' | 'worker';
}

const SESSIONS_FILE = path.join(DB_DIR, 'sessions.json');

function loadSessions(): Map<string, SessionInfo> {
  const map = new Map<string, SessionInfo>();
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const now = Date.now();
      for (const [token, info] of Object.entries(parsed)) {
        const sInfo = info as SessionInfo;
        if (sInfo && sInfo.expiresAt && sInfo.expiresAt > now) {
          map.set(token, sInfo);
        }
      }
    } catch (e) {
      console.error('Failed to read sessions.json:', e);
    }
  }
  return map;
}

const activeSessions = loadSessions();

function saveSessions() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const obj: Record<string, SessionInfo> = {};
    const now = Date.now();
    for (const [token, info] of activeSessions.entries()) {
      if (info.expiresAt > now) {
        obj[token] = info;
      }
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to persist sessions.json:', e);
  }
}

function isValidSession(token: string): boolean {
  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() >= session.expiresAt) {
    activeSessions.delete(token);
    saveSessions();
    return false;
  }
  return true;
}

function getSessionUser(token: string): ServerUserRecord | null {
  if (!isValidSession(token)) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (session.userId) {
    const u = getUserById(session.userId);
    if (u) return u;
  }
  if (session.username) {
    const u = getUserByUsername(session.username);
    if (u) return u;
  }
  const all = getAllUsers();
  return all.find(u => u.role === 'admin') || all[0] || null;
}

interface RecoveryTokenInfo {
  expiresAt: number;
  username: string;
}

const recoveryTokens = new Map<string, RecoveryTokenInfo>();

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '';
  const atIdx = email.indexOf('@');
  const localPart = email.substring(0, atIdx);
  const domainPart = email.substring(atIdx + 1);
  const first3 = localPart.substring(0, 3);
  const dotCount = Math.max(localPart.length - first3.length, 7);
  const dots = '.'.repeat(dotCount);
  return `${first3}${dots}@${domainPart}`;
}

function maskMobile(mobile: string): string {
  if (!mobile) return '';
  const trimmed = mobile.trim();
  const last3 = trimmed.slice(-3);
  return `.......${last3}`;
}

function verifyEncryptedPassword(plainPassword: string, salt: string, expectedHash: string): boolean {
  try {
    const computedHash = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  } catch {
    return false;
  }
}

const DEFAULT_STORE_SETTINGS = {
  brandName: 'StockCore Retail & Wholesale',
  logoUrl: '',
  phoneNumber: '+92 300 1234567',
  phoneNumbers: ['+92 300 1234567'],
  address: 'Shop # 14-15, Commercial Plaza, Main Boulevard, Lahore',
  headerBriefText: 'Authorized Wholesale & Retail Distributors • NTN: 8941029-4',
  enableFbrTax: true,
  fbrLogoUrl: '',
  strn: '3277876123456',
  ntn: '8941029-4',
  fbrPosId: 'POS-894102',
  defaultTaxRate: 18,
  footerBriefText: 'Thank you for your valued business! We look forward to serving you again.',
  returnPolicyText: 'Items can be exchanged within 7 days in original condition with this receipt.',
  supportContact: 'Email: support@stockcore.pk • WhatsApp: +92 300 1234567',
  barcodeEnabled: true,
};

interface DatabaseSchema {
  version: string;
  storageType: string;
  lastUpdated: string;
  items: any[];
  bankTransactions?: any[];
  sales: any[];
  settings?: any;
  epJcDailyRecords?: any[];
  epJcTransactions?: any[];
  loadDailyRecords?: any[];
  loadTransactions?: any[];
  vendors?: any[];
  vendorPurchases?: any[];
  vendorPayments?: any[];
  expenses?: any[];
  cashbookAccounts?: any[];
  cashbookTransactions?: any[];
  protectors?: any[];
}

// Fallback initial dataset if file does not exist
const DEFAULT_INITIAL_DATA: DatabaseSchema = {
  version: '4.0.0',
  storageType: 'PC_DISK_FILE',
  lastUpdated: new Date().toISOString(),
  items: [
    {
      id: 'item_1',
      sku: 'ELC-KB-01',
      name: 'Wireless Mechanical Keyboard Pro',
      category: 'Electronics',
      unit: 'pcs',
      costPrice: 4500.0,
      sellingPrice: 8999.0,
      currentStock: 34,
      minStockAlert: 10,
      location: 'Aisle 3 - Shelf B',
      notes: 'Hot-swappable RGB mechanical switches',
      createdAt: '2026-03-01T08:00:00.000Z',
      updatedAt: '2026-03-01T08:00:00.000Z',
    },
    {
      id: 'item_2',
      sku: 'ELC-MS-02',
      name: 'Ergonomic Precision Mouse',
      category: 'Electronics',
      unit: 'pcs',
      costPrice: 2250.0,
      sellingPrice: 4950.0,
      currentStock: 6,
      minStockAlert: 8,
      location: 'Aisle 3 - Shelf C',
      notes: 'Dual 2.4GHz & Bluetooth 5.2',
      createdAt: '2026-03-01T08:15:00.000Z',
      updatedAt: '2026-03-01T08:15:00.000Z',
    },
    {
      id: 'item_3',
      sku: 'ACC-HUB-03',
      name: 'USB-C 8-in-1 Aluminium Hub',
      category: 'Accessories',
      unit: 'pcs',
      costPrice: 1800.0,
      sellingPrice: 3900.0,
      currentStock: 3,
      minStockAlert: 5,
      location: 'Aisle 2 - Shelf A',
      notes: 'Supports 4K 60Hz HDMI & 100W PD charging',
      createdAt: '2026-03-02T09:00:00.000Z',
      updatedAt: '2026-03-02T09:00:00.000Z',
    },
    {
      id: 'item_4',
      sku: 'OFF-CH-04',
      name: 'Mesh High-Back Ergonomic Chair',
      category: 'Furniture',
      unit: 'unit',
      costPrice: 18500.0,
      sellingPrice: 32000.0,
      currentStock: 12,
      minStockAlert: 4,
      location: 'Warehouse Floor Bay 4',
      notes: 'Adjustable lumbar support and 3D armrests',
      createdAt: '2026-03-02T10:30:00.000Z',
      updatedAt: '2026-03-02T10:30:00.000Z',
    },
    {
      id: 'item_5',
      sku: 'CAB-TB4-05',
      name: 'Braided Thunderbolt 4 Cable 2M',
      category: 'Accessories',
      unit: 'pcs',
      costPrice: 950.0,
      sellingPrice: 2499.0,
      currentStock: 0,
      minStockAlert: 15,
      location: 'Aisle 1 - Bin 12',
      notes: '40Gbps 240W high-speed charging',
      createdAt: '2026-03-03T11:00:00.000Z',
      updatedAt: '2026-03-03T11:00:00.000Z',
    },
    {
      id: 'item_6',
      sku: 'DSP-4K-06',
      name: '27-inch 4K UHD IPS Monitor',
      category: 'Displays',
      unit: 'unit',
      costPrice: 48000.0,
      sellingPrice: 78000.0,
      currentStock: 8,
      minStockAlert: 3,
      location: 'Aisle 4 - Shelf D',
      notes: '99% sRGB with factory calibration report',
      createdAt: '2026-03-03T11:30:00.000Z',
      updatedAt: '2026-03-03T11:30:00.000Z',
    },
  ],
  sales: [
    {
      id: 'sale_1',
      invoiceNumber: 'INV-10842',
      date: '2026-09-07',
      customerName: 'Ahmad Bilal Electronics',
      paymentMethod: 'CASH',
      items: [
        {
          itemId: 'item_1',
          sku: 'ELC-KB-01',
          name: 'Wireless Mechanical Keyboard Pro',
          unit: 'pcs',
          availableStock: 34,
          costPrice: 4500,
          soldPrice: 8500,
          quantity: 2,
          total: 17000,
        },
        {
          itemId: 'item_2',
          sku: 'ELC-MS-02',
          name: 'Ergonomic Precision Mouse',
          unit: 'pcs',
          availableStock: 6,
          costPrice: 2250,
          soldPrice: 4800,
          quantity: 1,
          total: 4800,
        },
      ],
      subtotal: 21800,
      totalAmount: 21800,
      notes: 'Store counter direct cash sale with package discount',
      createdAt: '2026-09-07T14:30:00.000Z',
    },
    {
      id: 'sale_2',
      invoiceNumber: 'INV-10843',
      date: '2026-09-08',
      customerName: 'Khyber Design Works',
      paymentMethod: 'CASH',
      items: [
        {
          itemId: 'item_6',
          sku: 'DSP-4K-06',
          name: '27-inch 4K UHD IPS Monitor',
          unit: 'unit',
          availableStock: 8,
          costPrice: 48000,
          soldPrice: 75000,
          quantity: 1,
          total: 75000,
        },
      ],
      subtotal: 75000,
      totalAmount: 75000,
      notes: 'Direct cash payment collected at store counter',
      createdAt: '2026-09-08T11:00:00.000Z',
    },
    {
      id: 'sale_3',
      invoiceNumber: 'INV-10844',
      date: '2026-09-09',
      customerName: 'Tariq Mahmood',
      paymentMethod: 'CASH',
      items: [
        {
          itemId: 'item_3',
          sku: 'ACC-HUB-03',
          name: 'USB-C 8-in-1 Aluminium Hub',
          unit: 'pcs',
          availableStock: 3,
          costPrice: 1800,
          soldPrice: 3800,
          quantity: 2,
          total: 7600,
        },
      ],
      subtotal: 7600,
      totalAmount: 7600,
      notes: 'Cash collected on pickup',
      createdAt: '2026-09-09T09:15:00.000Z',
    },
    {
      id: 'sale_4',
      invoiceNumber: 'INV-10845',
      date: '2026-09-09',
      customerName: 'Nexus Co-Working Labs',
      paymentMethod: 'CASH',
      items: [
        {
          itemId: 'item_4',
          sku: 'OFF-CH-04',
          name: 'Mesh High-Back Ergonomic Chair',
          unit: 'unit',
          availableStock: 12,
          costPrice: 18500,
          soldPrice: 24500,
          quantity: 1,
          total: 24500,
        },
      ],
      subtotal: 24500,
      totalAmount: 24500,
      notes: 'Cash payment settled on delivery',
      createdAt: '2026-09-09T10:30:00.000Z',
    },
  ],
  epJcDailyRecords: [
    {
      id: 'epjc_2026-09-08',
      date: '2026-09-08',
      epOpening: 45000,
      jcOpening: 55000,
      epJcCashOpening: 75000,
      epCashOpening: 35000,
      jcCashOpening: 40000,
      totalOpening: 175000,
      epClosing: 48500,
      jcClosing: 54000,
      epJcCashClosing: 75700,
      epCashClosing: 36200,
      jcCashClosing: 39500,
      totalClosing: 178200,
      netDifference: 3200,
      resultType: 'PROFIT',
      notes: 'Transfers & utility bills collection commissions',
      createdAt: '2026-09-08T08:00:00.000Z',
      updatedAt: '2026-09-08T22:00:00.000Z',
    },
    {
      id: 'epjc_2026-09-09',
      date: '2026-09-09',
      epOpening: 48500,
      jcOpening: 54000,
      epJcCashOpening: 75700,
      epCashOpening: 36200,
      jcCashOpening: 39500,
      totalOpening: 178200,
      epClosing: 46000,
      jcClosing: 53200,
      epJcCashClosing: 77500,
      epCashClosing: 36000,
      jcCashClosing: 41500,
      totalClosing: 176700,
      netDifference: -1500,
      resultType: 'LOSS',
      notes: 'Cash withdrawal fee deficit and bank load charges',
      createdAt: '2026-09-09T08:00:00.000Z',
      updatedAt: '2026-09-09T22:15:00.000Z',
    },
  ],
  epJcTransactions: [
    {
      id: 'epjc_tx_1',
      date: '2026-09-09',
      time: '11:15',
      service: 'EASYPAISA',
      type: 'TRANSFER',
      customerMobile: '03451234567',
      customerName: 'Muhammad Arshad',
      amount: 15000,
      feeOrCommission: 120,
      trxId: 'EP9921820491',
      notes: 'Family support transfer',
      createdAt: '2026-09-09T11:15:00.000Z',
    },
    {
      id: 'epjc_tx_2',
      date: '2026-09-09',
      time: '14:30',
      service: 'JAZZCASH',
      type: 'WITHDRAW',
      customerMobile: '03009876543',
      customerName: 'Kashif Mehmood',
      amount: 10000,
      feeOrCommission: 180,
      trxId: 'JC4481029411',
      notes: 'Cash out via biometric OTP',
      createdAt: '2026-09-09T14:30:00.000Z',
    },
  ],
  loadDailyRecords: [
    {
      id: 'load_2026-09-08',
      date: '2026-09-08',
      jazzOpening: 25000,
      telenorOpening: 18000,
      zongOpening: 22000,
      ufoneOpening: 15000,
      loadCashOpening: 30000,
      totalOpening: 110000,
      jazzClosing: 26200,
      telenorClosing: 17800,
      zongClosing: 23100,
      ufoneClosing: 15600,
      loadCashClosing: 30500,
      totalClosing: 113200,
      netDifference: 3200,
      resultType: 'PROFIT',
      notes: 'Super cards & balance load retail margins',
      createdAt: '2026-09-08T08:00:00.000Z',
      updatedAt: '2026-09-08T22:00:00.000Z',
    },
    {
      id: 'load_2026-09-09',
      date: '2026-09-09',
      jazzOpening: 26200,
      telenorOpening: 17800,
      zongOpening: 23100,
      ufoneOpening: 15600,
      loadCashOpening: 30500,
      totalOpening: 113200,
      jazzClosing: 25800,
      telenorClosing: 18400,
      zongClosing: 22600,
      ufoneClosing: 16200,
      loadCashClosing: 32000,
      totalClosing: 115000,
      netDifference: 1800,
      resultType: 'PROFIT',
      notes: 'Jazz weekly hybrid packages and Zong mega data activations',
      createdAt: '2026-09-09T08:00:00.000Z',
      updatedAt: '2026-09-09T22:30:00.000Z',
    },
  ],
  loadTransactions: [
    {
      id: 'load_tx_1',
      date: '2026-09-09',
      time: '10:30',
      network: 'JAZZ_WARID',
      type: 'EASYLOAD',
      customerMobile: '03001234567',
      customerName: 'Usman Ali',
      amount: 1000,
      commissionOrProfit: 25,
      trxId: 'JZ9921004',
      notes: 'Prepaid easyload balance',
      createdAt: '2026-09-09T10:30:00.000Z',
    },
    {
      id: 'load_tx_2',
      date: '2026-09-09',
      time: '12:15',
      network: 'ZONG',
      type: 'PACKAGE',
      customerMobile: '03129876543',
      customerName: 'Farhan Sheikh',
      amount: 1400,
      commissionOrProfit: 80,
      trxId: 'ZG7721832',
      notes: 'Zong Super Card Monthly',
      createdAt: '2026-09-09T12:15:00.000Z',
    },
    {
      id: 'load_tx_3',
      date: '2026-09-09',
      time: '15:45',
      network: 'TELENOR',
      type: 'EASYLOAD',
      customerMobile: '03456789012',
      customerName: 'Babar Azam',
      amount: 500,
      commissionOrProfit: 15,
      trxId: 'TN8839120',
      notes: 'Emergency balance reload',
      createdAt: '2026-09-09T15:45:00.000Z',
    },
    {
      id: 'load_tx_4',
      date: '2026-09-09',
      time: '18:20',
      network: 'UFONE',
      type: 'PACKAGE',
      customerMobile: '03335551234',
      customerName: 'Kamran Khan',
      amount: 1100,
      commissionOrProfit: 70,
      trxId: 'UF5519203',
      notes: 'Ufone Super Card Gold',
      createdAt: '2026-09-09T18:20:00.000Z',
    },
  ],
  vendors: [
    {
      id: 'vendor_1',
      name: 'Al-Madina Accessories & Cables (Hall Road)',
      contactPerson: 'Haji Muhammad Rafique',
      phone: '0300-8451234',
      email: 'madina.accessories@gmail.com',
      city: 'Lahore',
      address: 'Shop # 14, Basement, Madina Market, Hall Road, Lahore',
      totalBilled: 65000,
      totalPaid: 40000,
      currentBalance: 25000,
      notes: 'Wholesaler for Type-C fast cables and GaN chargers',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-10T16:00:00.000Z',
    },
    {
      id: 'vendor_2',
      name: 'Prime Protectors & Mobile Cases',
      contactPerson: 'Muhammad Usman',
      phone: '0321-4567890',
      email: 'prime.cases.lhr@gmail.com',
      city: 'Lahore',
      address: 'Shop # 32, 2nd Floor, Hafeez Center, Gulberg, Lahore',
      totalBilled: 38000,
      totalPaid: 38000,
      currentBalance: 0,
      notes: 'Premium 9D tempered glass and matte silicone covers supplier',
      createdAt: '2026-09-03T11:00:00.000Z',
      updatedAt: '2026-09-05T14:30:00.000Z',
    },
    {
      id: 'vendor_3',
      name: 'Pak Wholesale Devices & Audio',
      contactPerson: 'Shahid Afridi',
      phone: '0333-9876543',
      email: 'pakwholesale.devices@gmail.com',
      city: 'Rawalpindi',
      address: 'Shop # 5, City Center, Bank Road, Saddar, Rawalpindi',
      totalBilled: 120000,
      totalPaid: 50000,
      currentBalance: 70000,
      notes: 'TWS earbuds, power banks, and bluetooth speakers wholesale distributor',
      createdAt: '2026-09-05T09:30:00.000Z',
      updatedAt: '2026-09-08T15:00:00.000Z',
    },
  ],
  vendorPurchases: [
    {
      id: 'pur_1',
      vendorId: 'vendor_1',
      vendorName: 'Al-Madina Accessories & Cables (Hall Road)',
      billNumber: 'BILL-4821',
      date: '2026-09-02',
      itemsDescription: '100x Braided Type-C Fast Cables, 50x 65W GaN Chargers, 100x 9D Glass Protectors',
      totalAmount: 65000,
      paidAmount: 25000,
      remainingAmount: 40000,
      paymentMethod: 'CASH',
      paymentRef: 'Counter Cash',
      status: 'PARTIAL',
      notes: 'Bought accessories total Rs. 65,000, paid Rs. 25,000 cash, Rs. 40,000 remaining on credit',
      createdAt: '2026-09-02T11:30:00.000Z',
    },
    {
      id: 'pur_2',
      vendorId: 'vendor_2',
      vendorName: 'Prime Protectors & Mobile Cases',
      billNumber: 'PR-1092',
      date: '2026-09-05',
      itemsDescription: '150x Silicon Matte Phone Cases (iPhone & Samsung models)',
      totalAmount: 38000,
      paidAmount: 38000,
      remainingAmount: 0,
      paymentMethod: 'BANK_TRANSFER',
      paymentRef: 'MCB-99021',
      status: 'PAID',
      notes: 'Full payment made at time of delivery',
      createdAt: '2026-09-05T14:30:00.000Z',
    },
    {
      id: 'pur_3',
      vendorId: 'vendor_3',
      vendorName: 'Pak Wholesale Devices & Audio',
      billNumber: 'PT-771',
      date: '2026-09-08',
      itemsDescription: '20x 10,000mAh Power Banks, 40x Wireless Earbuds TWS',
      totalAmount: 120000,
      paidAmount: 50000,
      remainingAmount: 70000,
      paymentMethod: 'BANK_TRANSFER',
      paymentRef: 'HBL-Online-4421',
      status: 'PARTIAL',
      notes: 'Purchased accessories lot value Rs. 120,000, paid Rs. 50,000 advance, remaining Rs. 70,000 payable',
      createdAt: '2026-09-08T15:00:00.000Z',
    },
  ],
  vendorPayments: [
    {
      id: 'vpay_1',
      vendorId: 'vendor_1',
      vendorName: 'Al-Madina Accessories & Cables (Hall Road)',
      purchaseId: 'pur_1',
      billNumber: 'BILL-4821',
      date: '2026-09-02',
      time: '11:30',
      amount: 25000,
      paymentMethod: 'CASH',
      referenceNumber: 'Receipt # 104',
      notes: 'Initial cash payment at time of purchase bill',
      createdAt: '2026-09-02T11:30:00.000Z',
    },
    {
      id: 'vpay_2',
      vendorId: 'vendor_1',
      vendorName: 'Al-Madina Accessories & Cables (Hall Road)',
      purchaseId: 'pur_1',
      billNumber: 'BILL-4821',
      date: '2026-09-10',
      time: '16:00',
      amount: 15000,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'HABIB-TX-9902',
      notes: 'Partial payment sent via Bank Al-Habib online against remaining udhaar',
      createdAt: '2026-09-10T16:00:00.000Z',
    },
    {
      id: 'vpay_3',
      vendorId: 'vendor_2',
      vendorName: 'Prime Protectors & Mobile Cases',
      purchaseId: 'pur_2',
      billNumber: 'PR-1092',
      date: '2026-09-05',
      time: '14:30',
      amount: 38000,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'MCB-99021',
      notes: 'Full settlement payment on delivery',
      createdAt: '2026-09-05T14:30:00.000Z',
    },
    {
      id: 'vpay_4',
      vendorId: 'vendor_3',
      vendorName: 'Pak Wholesale Devices & Audio',
      purchaseId: 'pur_3',
      billNumber: 'PT-771',
      date: '2026-09-08',
      time: '15:00',
      amount: 50000,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'HBL-Online-4421',
      notes: 'Down payment paid when receiving stock lot',
      createdAt: '2026-09-08T15:00:00.000Z',
    },
  ],
  expenses: [
    {
      id: 'exp_1',
      date: '2026-10-01',
      time: '11:30',
      amount: 450,
      reason: 'Tea, Biscuits & Refreshments for Guests',
      category: 'Personal',
      paymentMethod: 'CASH',
      recordedBy: 'Obaid',
      createdAt: '2026-10-01T11:30:00.000Z',
    },
    {
      id: 'exp_2',
      date: '2026-10-01',
      time: '14:00',
      amount: 1800,
      reason: 'Jazz & Zong shop load balance transfer fee',
      category: 'Load Service',
      paymentMethod: 'CASH',
      recordedBy: 'Obaid',
      createdAt: '2026-10-01T14:00:00.000Z',
    },
    {
      id: 'exp_3',
      date: '2026-10-02',
      time: '10:15',
      amount: 300,
      reason: 'Easy Paisa retail agent balance replenishment fee',
      category: 'Easy Paisa / Jazz Cash',
      paymentMethod: 'CASH',
      recordedBy: 'Obaid',
      createdAt: '2026-10-02T10:15:00.000Z',
    },
    {
      id: 'exp_4',
      date: '2026-10-02',
      time: '13:45',
      amount: 850,
      reason: 'Staff Lunch & Personal Refreshments',
      category: 'Personal',
      paymentMethod: 'CASH',
      recordedBy: 'Obaid',
      createdAt: '2026-10-02T13:45:00.000Z',
    },
    {
      id: 'exp_5',
      date: '2026-09-28',
      time: '16:00',
      amount: 4500,
      reason: 'Jazz Cash retailer float transfer expense',
      category: 'Easy Paisa / Jazz Cash',
      paymentMethod: 'CASH',
      recordedBy: 'Obaid',
      createdAt: '2026-09-28T16:00:00.000Z',
    },
  ],
  cashbookAccounts: [
    {
      id: 'cb_acc_1',
      name: 'Farhan Malik (Customer)',
      phone: '0300-8844221',
      partyType: 'CUSTOMER',
      notes: 'iPhone 15 Pro purchase on credit + installments',
      address: 'Shop 14, Commercial Market',
      totalBorrowed: 240000,
      totalPaid: 140000,
      remainingBalance: 100000,
      lastTransactionDate: '2026-10-01',
      createdAt: '2026-09-10T10:00:00.000Z',
    },
    {
      id: 'cb_acc_2',
      name: 'Usman Ghani (Customer)',
      phone: '0321-9955443',
      partyType: 'CUSTOMER',
      notes: 'Mobile repair & display replacement udhar',
      address: 'Satellite Town, Rawalpindi',
      totalBorrowed: 75000,
      totalPaid: 45000,
      remainingBalance: 30000,
      lastTransactionDate: '2026-09-29',
      createdAt: '2026-09-15T11:30:00.000Z',
    },
    {
      id: 'cb_acc_3',
      name: 'Haji Tariq (Shop Investor / Capital Loan)',
      phone: '0333-5566778',
      partyType: 'MY_BORROWING',
      notes: 'Capital loan borrowed by me for buying stock inventory',
      address: 'Blue Area, Islamabad',
      totalBorrowed: 500000,
      totalPaid: 300000,
      remainingBalance: 200000,
      lastTransactionDate: '2026-09-25',
      createdAt: '2026-08-20T14:00:00.000Z',
    },
  ],
  cashbookTransactions: [
    {
      id: 'cb_tx_1',
      accountId: 'cb_acc_1',
      accountName: 'Farhan Malik (Customer)',
      partyType: 'CUSTOMER',
      type: 'BORROWED',
      amount: 200000,
      date: '2026-09-10',
      time: '11:00',
      paymentMethod: 'CASH',
      description: 'Customer took iPhone 15 Pro Max on credit',
      runningBalance: 200000,
      recordedBy: 'Obaid',
      createdAt: '2026-09-10T11:00:00.000Z',
    },
    {
      id: 'cb_tx_2',
      accountId: 'cb_acc_1',
      accountName: 'Farhan Malik (Customer)',
      partyType: 'CUSTOMER',
      type: 'PAID',
      amount: 50000,
      date: '2026-09-15',
      time: '15:30',
      paymentMethod: 'BANK',
      description: '1st installment paid via Meezan Bank Online Transfer',
      referenceNumber: 'MEEZAN-99238',
      runningBalance: 150000,
      recordedBy: 'Obaid',
      createdAt: '2026-09-15T15:30:00.000Z',
    },
    {
      id: 'cb_tx_3',
      accountId: 'cb_acc_1',
      accountName: 'Farhan Malik (Customer)',
      partyType: 'CUSTOMER',
      type: 'PAID',
      amount: 30000,
      date: '2026-09-22',
      time: '17:15',
      paymentMethod: 'CASH',
      description: '2nd installment cash received at shop counter',
      runningBalance: 120000,
      recordedBy: 'Obaid',
      createdAt: '2026-09-22T17:15:00.000Z',
    },
    {
      id: 'cb_tx_4',
      accountId: 'cb_acc_1',
      accountName: 'Farhan Malik (Customer)',
      partyType: 'CUSTOMER',
      type: 'BORROWED',
      amount: 40000,
      date: '2026-09-28',
      time: '13:00',
      paymentMethod: 'CASH',
      description: 'Customer borrowed additional cash for urgent travel',
      runningBalance: 160000,
      recordedBy: 'Obaid',
      createdAt: '2026-09-28T13:00:00.000Z',
    },
    {
      id: 'cb_tx_5',
      accountId: 'cb_acc_1',
      accountName: 'Farhan Malik (Customer)',
      partyType: 'CUSTOMER',
      type: 'PAID',
      amount: 60000,
      date: '2026-10-01',
      time: '16:45',
      paymentMethod: 'CASH',
      description: 'Cash installment paid at shop counter',
      runningBalance: 100000,
      recordedBy: 'Obaid',
      createdAt: '2026-10-01T16:45:00.000Z',
    },
    {
      id: 'cb_tx_6',
      accountId: 'cb_acc_3',
      accountName: 'Haji Tariq (Shop Investor / Capital Loan)',
      partyType: 'MY_BORROWING',
      type: 'BORROWED',
      amount: 500000,
      date: '2026-08-20',
      time: '14:00',
      paymentMethod: 'BANK',
      description: 'I borrowed business capital loan from Haji Tariq for stock',
      referenceNumber: 'HBL-Loan-5511',
      runningBalance: 500000,
      recordedBy: 'Obaid',
      createdAt: '2026-08-20T14:00:00.000Z',
    },
    {
      id: 'cb_tx_7',
      accountId: 'cb_acc_3',
      accountName: 'Haji Tariq (Shop Investor / Capital Loan)',
      partyType: 'MY_BORROWING',
      type: 'PAID',
      amount: 200000,
      date: '2026-09-10',
      time: '12:00',
      paymentMethod: 'BANK',
      description: 'I repaid 1st loan tranche via Bank Transfer',
      referenceNumber: 'HBL-Repay-8812',
      runningBalance: 300000,
      recordedBy: 'Obaid',
      createdAt: '2026-09-10T12:00:00.000Z',
    },
    {
      id: 'cb_tx_8',
      accountId: 'cb_acc_3',
      accountName: 'Haji Tariq (Shop Investor / Capital Loan)',
      partyType: 'MY_BORROWING',
      type: 'PAID',
      amount: 100000,
      date: '2026-09-25',
      time: '18:00',
      paymentMethod: 'CASH',
      description: 'I repaid 2nd loan tranche in cash',
      runningBalance: 200000,
      recordedBy: 'Obaid',
      createdAt: '2026-09-25T18:00:00.000Z',
    },
  ],
  settings: DEFAULT_STORE_SETTINGS,
  protectors: [
    {
      id: 'prot_go1',
      name: 'Go 1',
      category: '9D Super Tempered Glass',
      material: 'High-Alumina Glass',
      defaultPrice: 150,
      compatibleBrands: [
        {
          brand: 'Oppo',
          models: ['A15', 'A16', 'A35', 'A54', 'A5'],
        },
        {
          brand: 'Realme',
          models: ['C11', 'C12', 'C15'],
        },
      ],
      notes: '9D Full Glue, Black Border, Camera Waterdrop Notch Cutout',
      createdBy: 'System',
      createdAt: '2026-03-01T08:00:00.000Z',
      updatedAt: '2026-03-01T08:00:00.000Z',
    },
    {
      id: 'prot_og05',
      name: 'OG-05 Super D',
      category: 'OG Crystal Clear',
      material: '9H Hardness Glass',
      defaultPrice: 200,
      compatibleBrands: [
        {
          brand: 'Vivo',
          models: ['Y11', 'Y12', 'Y15', 'Y17', 'Y3'],
        },
        {
          brand: 'Oppo',
          models: ['A3s', 'A5', 'A5s', 'A12e', 'A5 2020'],
        },
        {
          brand: 'Realme',
          models: ['C1', 'C2'],
        },
      ],
      notes: 'High clarity crystal glass with smooth rounded 2.5D bevel edge',
      createdBy: 'System',
      createdAt: '2026-03-01T08:00:00.000Z',
      updatedAt: '2026-03-01T08:00:00.000Z',
    },
    {
      id: 'prot_go2',
      name: 'Go 2 / D+ 02',
      category: '11D Full Cover Glass',
      material: 'Tempered Glass',
      defaultPrice: 180,
      compatibleBrands: [
        {
          brand: 'Samsung',
          models: ['A12', 'A13', 'A02', 'A03', 'M12'],
        },
        {
          brand: 'Xiaomi',
          models: ['Redmi 9T', 'Poco M3'],
        },
      ],
      notes: 'Full coverage 0.33mm thickness, anti-fingerprint coating',
      createdBy: 'System',
      createdAt: '2026-03-01T08:00:00.000Z',
      updatedAt: '2026-03-01T08:00:00.000Z',
    },
  ],
};

function calculateEpJcTotals(record: any): any {
  if (!record) return record;

  const epOpening = Number(record.epOpening) || 0;
  const jcOpening = Number(record.jcOpening) || 0;
  const epJcCashOpening =
    record.epJcCashOpening !== undefined
      ? Number(record.epJcCashOpening) || 0
      : (Number(record.epCashOpening) || 0) + (Number(record.jcCashOpening) || 0);
  const extraAddition = Number(record.extraAddition) || 0;

  const customAccounts = Array.isArray(record.customAccounts)
    ? record.customAccounts.map((ca: any, idx: number) => ({
        id: ca.id || `ca_${idx}_${Date.now()}`,
        name: (ca.name || '').trim() || `Account ${idx + 1}`,
        openingBalance: Number(ca.openingBalance) || 0,
        closingBalance: Number(ca.closingBalance) || 0,
      }))
    : [];

  const customOpening = customAccounts.reduce(
    (sum: number, ca: any) => sum + (Number(ca.openingBalance) || 0),
    0
  );
  const customClosing = customAccounts.reduce(
    (sum: number, ca: any) => sum + (Number(ca.closingBalance) || 0),
    0
  );

  const totalOpening = epOpening + jcOpening + epJcCashOpening + extraAddition + customOpening;

  const epClosing = Number(record.epClosing) || 0;
  const jcClosing = Number(record.jcClosing) || 0;
  const epJcCashClosing =
    record.epJcCashClosing !== undefined
      ? Number(record.epJcCashClosing) || 0
      : (Number(record.epCashClosing) || 0) + (Number(record.jcCashClosing) || 0);
  const epJcExpense = Number(record.epJcExpense) || 0;
  const totalClosing = epClosing + jcClosing + epJcCashClosing + epJcExpense + customClosing;

  const netDifference = totalClosing - totalOpening;
  const resultType: 'PROFIT' | 'LOSS' | 'BALANCED' =
    netDifference > 0 ? 'PROFIT' : netDifference < 0 ? 'LOSS' : 'BALANCED';

  return {
    ...record,
    id: record.id || `epjc_${record.date}`,
    date: record.date,
    epOpening,
    jcOpening,
    epJcCashOpening,
    epCashOpening: record.epCashOpening !== undefined ? Number(record.epCashOpening) : epJcCashOpening,
    jcCashOpening: record.jcCashOpening !== undefined ? Number(record.jcCashOpening) : 0,
    extraAddition,
    customAccounts,
    totalOpening,
    epClosing,
    jcClosing,
    epJcCashClosing,
    epCashClosing: record.epCashClosing !== undefined ? Number(record.epCashClosing) : epJcCashClosing,
    jcCashClosing: record.jcCashClosing !== undefined ? Number(record.jcCashClosing) : 0,
    epJcExpense,
    totalClosing,
    netDifference,
    resultType,
    updatedAt: record.updatedAt || new Date().toISOString(),
    createdAt: record.createdAt || new Date().toISOString(),
  };
}

function ensureDbFile(): DatabaseSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_INITIAL_DATA, null, 2), 'utf-8');
    return DEFAULT_INITIAL_DATA;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    let modified = false;
    if (!parsed.settings) {
      parsed.settings = DEFAULT_STORE_SETTINGS;
      modified = true;
    }
    if (!Array.isArray(parsed.epJcDailyRecords)) {
      parsed.epJcDailyRecords = DEFAULT_INITIAL_DATA.epJcDailyRecords || [];
      modified = true;
    } else {
      let epJcRepaired = false;
      parsed.epJcDailyRecords = parsed.epJcDailyRecords.map((r: any) => {
        const recalculated = calculateEpJcTotals(r);
        if (
          recalculated.totalOpening !== r.totalOpening ||
          recalculated.totalClosing !== r.totalClosing ||
          recalculated.netDifference !== r.netDifference ||
          recalculated.resultType !== r.resultType
        ) {
          epJcRepaired = true;
          return recalculated;
        }
        return r;
      });
      if (epJcRepaired) {
        modified = true;
      }
    }
    if (!Array.isArray(parsed.epJcTransactions)) {
      parsed.epJcTransactions = DEFAULT_INITIAL_DATA.epJcTransactions || [];
      modified = true;
    }
    if (!Array.isArray(parsed.loadDailyRecords)) {
      parsed.loadDailyRecords = DEFAULT_INITIAL_DATA.loadDailyRecords || [];
      modified = true;
    }
    if (!Array.isArray(parsed.loadTransactions)) {
      parsed.loadTransactions = DEFAULT_INITIAL_DATA.loadTransactions || [];
      modified = true;
    }
    if (!Array.isArray(parsed.vendors)) {
      parsed.vendors = DEFAULT_INITIAL_DATA.vendors || [];
      modified = true;
    }
    if (!Array.isArray(parsed.vendorPurchases)) {
      parsed.vendorPurchases = DEFAULT_INITIAL_DATA.vendorPurchases || [];
      modified = true;
    }
    if (!Array.isArray(parsed.vendorPayments)) {
      parsed.vendorPayments = DEFAULT_INITIAL_DATA.vendorPayments || [];
      modified = true;
    }
    if (!Array.isArray(parsed.expenses)) {
      parsed.expenses = DEFAULT_INITIAL_DATA.expenses || [];
      modified = true;
    }
    if (!Array.isArray(parsed.cashbookAccounts)) {
      parsed.cashbookAccounts = DEFAULT_INITIAL_DATA.cashbookAccounts || [];
      modified = true;
    }
    if (!Array.isArray(parsed.cashbookTransactions)) {
      parsed.cashbookTransactions = DEFAULT_INITIAL_DATA.cashbookTransactions || [];
      modified = true;
    }
    if (!Array.isArray(parsed.protectors)) {
      parsed.protectors = DEFAULT_INITIAL_DATA.protectors || [];
      modified = true;
    }
    if (modified) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch (err) {
    console.error('Error reading database file, recreating fallback:', err);
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_INITIAL_DATA, null, 2), 'utf-8');
    return DEFAULT_INITIAL_DATA;
  }
}

function writeDbFile(data: DatabaseSchema): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

async function startServer() {
  const app = express();

  // Allow parsing JSON requests
  app.use(express.json({ limit: '50mb' }));

  // Ensure database file exists on disk
  ensureDbFile();

  // ==========================================
  // Authentication Endpoints
  // ==========================================

  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password, stayLoggedIn } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password are required' });
      }

      const user = getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid username or password' });
      }

      const isValid = verifyEncryptedPassword(password.trim(), user.salt, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid username or password' });
      }

      // Generate cryptographically secure session token
      const token = crypto.randomBytes(32).toString('hex');
      const is48h = Boolean(stayLoggedIn);
      const sessionDuration = is48h ? 48 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
      const expiresAt = Date.now() + sessionDuration;

      activeSessions.set(token, {
        expiresAt,
        stayLoggedIn: is48h,
        createdAt: Date.now(),
        userId: user.id,
        username: user.username,
        role: user.role,
      });
      saveSessions();

      res.json({
        success: true,
        token,
        expiresAt,
        stayLoggedIn: is48h,
        user: sanitizeUser(user),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/auth/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

    if (token && isValidSession(token)) {
      const user = getSessionUser(token);
      if (user) {
        const session = activeSessions.get(token);
        return res.json({
          authenticated: true,
          expiresAt: session?.expiresAt,
          stayLoggedIn: session?.stayLoggedIn,
          user: sanitizeUser(user),
        });
      }
    }

    res.status(401).json({ authenticated: false, error: 'Invalid or expired session' });
  });

  app.post('/api/auth/update-user', (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.body?.token as string);

      if (!token || !isValidSession(token)) {
        return res.status(401).json({ success: false, error: 'Unauthorized. Please log in first.' });
      }

      const user = getSessionUser(token);
      if (!user) {
        return res.status(401).json({ success: false, error: 'User session not found.' });
      }

      const { name, username, photo } = req.body || {};
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Name is required.' });
      }

      if (!username || typeof username !== 'string' || !username.trim()) {
        return res.status(400).json({ success: false, error: 'Username is required.' });
      }

      const trimmedName = name.trim();
      const trimmedUsername = username.trim().toLowerCase().replace(/\s+/g, '');

      if (trimmedUsername.length < 3) {
        return res.status(400).json({ success: false, error: 'Username must be at least 3 characters long.' });
      }

      const existing = getUserByUsername(trimmedUsername);
      if (existing && existing.id !== user.id) {
        return res.status(400).json({ success: false, error: `Username @${trimmedUsername} is already taken by another account.` });
      }

      user.name = trimmedName;
      user.username = trimmedUsername;
      if (typeof photo === 'string') {
        user.photo = photo;
      }
      user.updatedAt = new Date().toISOString();

      saveUser(user);

      // Update session username if changed
      const session = activeSessions.get(token);
      if (session) {
        session.username = user.username;
        saveSessions();
      }

      res.json({
        success: true,
        message: 'User profile updated successfully.',
        user: sanitizeUser(user),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/auth/update-2fa', (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.body?.token as string);

      if (!token || !isValidSession(token)) {
        return res.status(401).json({ success: false, error: 'Unauthorized. Please log in first.' });
      }

      const user = getSessionUser(token);
      if (!user) {
        return res.status(401).json({ success: false, error: 'User session not found.' });
      }

      const { email, mobileNumber } = req.body || {};

      if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ success: false, error: 'Email is required for Two-Factor Authentication.' });
      }

      if (!mobileNumber || typeof mobileNumber !== 'string' || !mobileNumber.trim()) {
        return res.status(400).json({ success: false, error: 'Mobile Number is required for Two-Factor Authentication.' });
      }

      const trimmedEmail = email.trim();
      const trimmedMobile = mobileNumber.trim();

      user.twoFactorEmail = trimmedEmail;
      user.twoFactorMobile = trimmedMobile;
      user.updatedAt = new Date().toISOString();

      saveUser(user);

      res.json({
        success: true,
        message: 'Two-Factor Authentication configuration saved successfully.',
        user: sanitizeUser(user),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/auth/change-password', (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.body?.token as string);

      if (!token || !isValidSession(token)) {
        return res.status(401).json({ success: false, error: 'Unauthorized. Please log in first.' });
      }

      const user = getSessionUser(token);
      if (!user) {
        return res.status(401).json({ success: false, error: 'User session not found.' });
      }

      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Both current password and new password are required.' });
      }

      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
      }

      const isValid = verifyEncryptedPassword(currentPassword.trim(), user.salt, user.passwordHash);
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Current password does not match our records.' });
      }

      // Generate new cryptographic salt and scrypt hash
      const newSalt = crypto.randomBytes(16).toString('hex');
      const newPasswordHash = crypto.scryptSync(newPassword.trim(), newSalt, 64).toString('hex');

      user.salt = newSalt;
      user.passwordHash = newPasswordHash;
      user.updatedAt = new Date().toISOString();

      saveUser(user);

      res.json({
        success: true,
        message: 'Password successfully changed and encrypted in backend storage.',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.body?.token as string);

    if (token) {
      activeSessions.delete(token);
      saveSessions();
    }

    res.json({ success: true, message: 'Signed out successfully' });
  });

  // Public endpoint for 2FA masked hints used by Forgot Password (supports specific username or general default)
  app.get('/api/auth/2fa-hints', (req, res) => {
    try {
      const usernameQuery = req.query.username ? String(req.query.username).trim().toLowerCase() : '';
      let targetUser: ServerUserRecord | undefined;

      if (usernameQuery) {
        targetUser = getUserByUsername(usernameQuery);
      }

      if (!targetUser) {
        const allUsers = getAllUsers();
        targetUser = allUsers.find(u => u.twoFactorEmail && u.twoFactorMobile) || allUsers[0];
      }

      if (!targetUser) {
        return res.json({
          success: true,
          has2FA: false,
          maskedEmail: '',
          maskedMobile: '',
        });
      }

      const has2FA = Boolean(targetUser.twoFactorEmail && targetUser.twoFactorMobile);
      res.json({
        success: true,
        has2FA,
        username: targetUser.username,
        name: targetUser.name,
        maskedEmail: targetUser.twoFactorEmail ? maskEmail(targetUser.twoFactorEmail) : '',
        maskedMobile: targetUser.twoFactorMobile ? maskMobile(targetUser.twoFactorMobile) : '',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Verify 2FA credentials for Forgot Password
  app.post('/api/auth/verify-2fa-recovery', (req, res) => {
    try {
      const { username, email, mobileNumber } = req.body || {};
      if (!email || !mobileNumber) {
        return res.status(400).json({ success: false, error: 'Provided Data is invalid.' });
      }

      const inputEmail = String(email).trim().toLowerCase();
      const cleanDigits = (s: string) => s.replace(/[^\d+]/g, '');
      const inputMobile = cleanDigits(String(mobileNumber));

      let matchedUser: ServerUserRecord | undefined;

      if (username && String(username).trim()) {
        const u = getUserByUsername(String(username).trim());
        if (u && u.twoFactorEmail && u.twoFactorMobile) {
          const targetEmail = u.twoFactorEmail.trim().toLowerCase();
          const targetMobile = cleanDigits(u.twoFactorMobile);
          const rawMobileMatch = String(mobileNumber).trim() === u.twoFactorMobile.trim();
          if (inputEmail === targetEmail && (rawMobileMatch || inputMobile === targetMobile)) {
            matchedUser = u;
          }
        }
      } else {
        const allUsers = getAllUsers();
        matchedUser = allUsers.find(u => {
          if (!u.twoFactorEmail || !u.twoFactorMobile) return false;
          const targetEmail = u.twoFactorEmail.trim().toLowerCase();
          const targetMobile = cleanDigits(u.twoFactorMobile);
          const rawMobileMatch = String(mobileNumber).trim() === u.twoFactorMobile.trim();
          return inputEmail === targetEmail && (rawMobileMatch || inputMobile === targetMobile);
        });
      }

      if (!matchedUser) {
        return res.status(400).json({ success: false, error: 'Provided Data is invalid.' });
      }

      const recoveryToken = crypto.randomBytes(32).toString('hex');
      recoveryTokens.set(recoveryToken, {
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins expiry
        username: matchedUser.username,
      });

      res.json({
        success: true,
        recoveryToken,
        username: matchedUser.username,
        message: '2FA verification successful. You can now set your new password.',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Set new password after successful 2FA recovery
  app.post('/api/auth/reset-password', (req, res) => {
    try {
      const { recoveryToken, username, email, mobileNumber, newPassword } = req.body || {};
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
      }

      let targetUser: ServerUserRecord | undefined;

      if (recoveryToken && recoveryTokens.has(recoveryToken)) {
        const rec = recoveryTokens.get(recoveryToken);
        if (rec && rec.expiresAt > Date.now()) {
          targetUser = getUserByUsername(rec.username);
          recoveryTokens.delete(recoveryToken);
        }
      }

      if (!targetUser && email && mobileNumber) {
        const cleanDigits = (s: string) => s.replace(/[^\d+]/g, '');
        const inputEmail = String(email).trim().toLowerCase();
        const inputMobile = cleanDigits(String(mobileNumber));

        if (username) {
          const u = getUserByUsername(String(username).trim());
          if (u && u.twoFactorEmail && u.twoFactorMobile) {
            const targetEmail = u.twoFactorEmail.trim().toLowerCase();
            const targetMobile = cleanDigits(u.twoFactorMobile);
            const rawMobileMatch = String(mobileNumber).trim() === u.twoFactorMobile.trim();
            if (inputEmail === targetEmail && (rawMobileMatch || inputMobile === targetMobile)) {
              targetUser = u;
            }
          }
        } else {
          const allUsers = getAllUsers();
          targetUser = allUsers.find(u => {
            if (!u.twoFactorEmail || !u.twoFactorMobile) return false;
            const targetEmail = u.twoFactorEmail.trim().toLowerCase();
            const targetMobile = cleanDigits(u.twoFactorMobile);
            const rawMobileMatch = String(mobileNumber).trim() === u.twoFactorMobile.trim();
            return inputEmail === targetEmail && (rawMobileMatch || inputMobile === targetMobile);
          });
        }
      }

      if (!targetUser) {
        return res.status(400).json({ success: false, error: 'Provided Data is invalid.' });
      }

      // Generate new cryptographic salt and scrypt hash
      const newSalt = crypto.randomBytes(16).toString('hex');
      const newPasswordHash = crypto.scryptSync(newPassword.trim(), newSalt, 64).toString('hex');

      targetUser.salt = newSalt;
      targetUser.passwordHash = newPasswordHash;
      targetUser.updatedAt = new Date().toISOString();

      saveUser(targetUser);

      // Invalidate active sessions for this user so they log in with the new password
      for (const [sToken, sInfo] of activeSessions.entries()) {
        if (sInfo.username === targetUser.username || sInfo.userId === targetUser.id) {
          activeSessions.delete(sToken);
        }
      }
      saveSessions();

      res.json({
        success: true,
        message: 'Password successfully updated. You can now sign in with your new password.',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // User Management Endpoints (Admin Only)
  // Allows Owner/Admin to Create, View, Edit, and Delete Worker accounts
  // Worker Permissions: 1. Sale a product, 2. Use EP & JC Service, 3. Load Services
  // ==========================================

  app.get('/api/users', (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

      const caller = getSessionUser(token);
      if (!caller || caller.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Access denied. Administrator privileges required.' });
      }

      const users = getAllUsers().map(sanitizeUser);
      res.json({ success: true, users });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/users', (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.body?.token as string);

      const caller = getSessionUser(token);
      if (!caller || caller.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Access denied. Administrator privileges required.' });
      }

      const { name, username, password, photo, twoFactorEmail, twoFactorMobile } = req.body || {};

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Worker Full Name is required.' });
      }

      if (!username || typeof username !== 'string' || !username.trim()) {
        return res.status(400).json({ success: false, error: 'Worker Username is required.' });
      }

      const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
      if (cleanUsername.length < 3) {
        return res.status(400).json({ success: false, error: 'Username must be at least 3 characters long.' });
      }

      if (getUserByUsername(cleanUsername)) {
        return res.status(400).json({ success: false, error: `Username @${cleanUsername} is already registered.` });
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
      }

      const newSalt = crypto.randomBytes(16).toString('hex');
      const newPasswordHash = crypto.scryptSync(password.trim(), newSalt, 64).toString('hex');

      const newWorker: ServerUserRecord = {
        id: `user_worker_${Date.now()}`,
        username: cleanUsername,
        name: name.trim(),
        role: 'worker',
        permissions: ['sales', 'epjc', 'load'], // 1. Sale a product, 2. Use EP & JC Service, 3. Load Services
        photo: typeof photo === 'string' ? photo : '',
        salt: newSalt,
        passwordHash: newPasswordHash,
        twoFactorEmail: typeof twoFactorEmail === 'string' ? twoFactorEmail.trim() : '',
        twoFactorMobile: typeof twoFactorMobile === 'string' ? twoFactorMobile.trim() : '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveUser(newWorker);

      res.json({
        success: true,
        user: sanitizeUser(newWorker),
        message: `Worker account @${cleanUsername} created successfully.`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/users/:id', (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.body?.token as string);

      const caller = getSessionUser(token);
      if (!caller || caller.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Access denied. Administrator privileges required.' });
      }

      const targetId = req.params.id;
      const targetUser = getUserById(targetId);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'User account not found.' });
      }

      const { name, username, password, photo, twoFactorEmail, twoFactorMobile } = req.body || {};

      if (name && typeof name === 'string' && name.trim()) {
        targetUser.name = name.trim();
      }

      if (username && typeof username === 'string' && username.trim()) {
        const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
        if (cleanUsername.length < 3) {
          return res.status(400).json({ success: false, error: 'Username must be at least 3 characters long.' });
        }
        const conflict = getUserByUsername(cleanUsername);
        if (conflict && conflict.id !== targetUser.id) {
          return res.status(400).json({ success: false, error: `Username @${cleanUsername} is already in use by another user.` });
        }
        targetUser.username = cleanUsername;
      }

      if (photo !== undefined && typeof photo === 'string') {
        targetUser.photo = photo;
      }

      if (twoFactorEmail !== undefined && typeof twoFactorEmail === 'string') {
        targetUser.twoFactorEmail = twoFactorEmail.trim();
      }

      if (twoFactorMobile !== undefined && typeof twoFactorMobile === 'string') {
        targetUser.twoFactorMobile = twoFactorMobile.trim();
      }

      if (password && typeof password === 'string' && password.trim()) {
        if (password.length < 6) {
          return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
        }
        const newSalt = crypto.randomBytes(16).toString('hex');
        const newPasswordHash = crypto.scryptSync(password.trim(), newSalt, 64).toString('hex');
        targetUser.salt = newSalt;
        targetUser.passwordHash = newPasswordHash;
      }

      targetUser.updatedAt = new Date().toISOString();
      saveUser(targetUser);

      res.json({
        success: true,
        user: sanitizeUser(targetUser),
        message: `User @${targetUser.username} updated successfully.`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/users/:id', (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (queryToken || (req.body?.token as string));

      const caller = getSessionUser(token);
      if (!caller || caller.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Access denied. Administrator privileges required.' });
      }

      const targetId = req.params.id;
      const targetUser = getUserById(targetId);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }

      if (targetUser.role === 'admin') {
        return res.status(400).json({ success: false, error: 'Cannot delete primary administrator user.' });
      }

      deleteUserById(targetId);

      // Invalidate active sessions
      for (const [sToken, sInfo] of activeSessions.entries()) {
        if (sInfo.userId === targetId || sInfo.username === targetUser.username) {
          activeSessions.delete(sToken);
        }
      }
      saveSessions();

      res.json({
        success: true,
        message: `Worker account @${targetUser.username} has been deleted.`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // API Routes for Persistent PC Disk Storage
  // ==========================================

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', storage: 'PC_DISK_FILE', path: DB_FILE });
  });

  // Fetch full data from PC storage file
  app.get('/api/data', (req, res) => {
    try {
      const data = ensureDbFile();
      res.json({
        success: true,
        data,
        storageType: 'PC_DISK_FILE',
        filePath: DB_FILE,
        lastUpdated: data.lastUpdated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Save updated data to PC storage file
  app.post('/api/data', (req, res) => {
    try {
      const {
        items,
        bankTransactions,
        sales,
        settings,
        epJcDailyRecords,
        epJcTransactions,
        loadDailyRecords,
        loadTransactions,
        vendors,
        vendorPurchases,
        vendorPayments,
        expenses,
        cashbookAccounts,
        cashbookTransactions,
        protectors,
      } = req.body;
      const current = ensureDbFile();

      const updatedData: DatabaseSchema = {
        version: current.version || '4.0.0',
        storageType: 'PC_DISK_FILE',
        lastUpdated: new Date().toISOString(),
        items: items !== undefined ? items : current.items,
        bankTransactions: bankTransactions !== undefined ? bankTransactions : current.bankTransactions,
        sales: sales !== undefined ? sales : current.sales,
        settings: settings !== undefined ? settings : (current.settings || DEFAULT_STORE_SETTINGS),
        epJcDailyRecords: epJcDailyRecords !== undefined ? epJcDailyRecords.map(calculateEpJcTotals) : (current.epJcDailyRecords || []),
        epJcTransactions: epJcTransactions !== undefined ? epJcTransactions : (current.epJcTransactions || []),
        loadDailyRecords: loadDailyRecords !== undefined ? loadDailyRecords : (current.loadDailyRecords || []),
        loadTransactions: loadTransactions !== undefined ? loadTransactions : (current.loadTransactions || []),
        vendors: vendors !== undefined ? vendors : (current.vendors || []),
        vendorPurchases: vendorPurchases !== undefined ? vendorPurchases : (current.vendorPurchases || []),
        vendorPayments: vendorPayments !== undefined ? vendorPayments : (current.vendorPayments || []),
        expenses: expenses !== undefined ? expenses : (current.expenses || []),
        cashbookAccounts: cashbookAccounts !== undefined ? cashbookAccounts : (current.cashbookAccounts || []),
        cashbookTransactions: cashbookTransactions !== undefined ? cashbookTransactions : (current.cashbookTransactions || []),
        protectors: protectors !== undefined ? protectors : (current.protectors || []),
      };

      writeDbFile(updatedData);

      res.json({
        success: true,
        message: 'Data successfully persisted to PC disk storage file',
        filePath: DB_FILE,
        lastUpdated: updatedData.lastUpdated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Dedicated EP & JC Endpoints
  app.get('/api/ep-jc', (req, res) => {
    try {
      const data = ensureDbFile();
      res.json({
        success: true,
        dailyRecords: (data.epJcDailyRecords || []).map(calculateEpJcTotals),
        transactions: data.epJcTransactions || [],
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/ep-jc/daily', (req, res) => {
    try {
      const record = req.body;
      if (!record || !record.date) {
        return res.status(400).json({ success: false, error: 'Date is required for EP & JC daily record.' });
      }

      const current = ensureDbFile();
      const records = current.epJcDailyRecords || [];

      const processedRecord = calculateEpJcTotals({
        ...record,
        updatedAt: new Date().toISOString(),
      });

      const existingIndex = records.findIndex((r: any) => r.date === record.date || r.id === processedRecord.id);
      if (existingIndex >= 0) {
        records[existingIndex] = processedRecord;
      } else {
        records.unshift(processedRecord);
      }

      current.epJcDailyRecords = records;
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({
        success: true,
        record: processedRecord,
        message: `EP & JC record for ${record.date} saved successfully. Result: ${processedRecord.resultType} (Rs. ${Math.abs(processedRecord.netDifference).toLocaleString()})`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/ep-jc/daily/:id', (req, res) => {
    try {
      const { id } = req.params;
      const current = ensureDbFile();
      current.epJcDailyRecords = (current.epJcDailyRecords || []).filter((r: any) => r.id !== id && r.date !== id);
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);
      res.json({ success: true, message: 'EP & JC daily record deleted.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/ep-jc/transaction', (req, res) => {
    try {
      const tx = req.body;
      if (!tx || !tx.amount || !tx.customerMobile) {
        return res.status(400).json({ success: false, error: 'Mobile number and amount are required.' });
      }

      const current = ensureDbFile();
      const txs = current.epJcTransactions || [];
      const processedTx = {
        ...tx,
        id: tx.id || `epjc_tx_${Date.now()}`,
        date: tx.date || getBusinessDate(),
        amount: Number(tx.amount) || 0,
        feeOrCommission: Number(tx.feeOrCommission) || 0,
        createdAt: tx.createdAt || new Date().toISOString(),
      };

      const existingIndex = txs.findIndex((t: any) => t.id === processedTx.id);
      if (existingIndex >= 0) {
        txs[existingIndex] = processedTx;
      } else {
        txs.unshift(processedTx);
      }

      current.epJcTransactions = txs;
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({ success: true, transaction: processedTx, message: 'Transaction recorded successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/ep-jc/transaction/:id', (req, res) => {
    try {
      const { id } = req.params;
      const current = ensureDbFile();
      current.epJcTransactions = (current.epJcTransactions || []).filter((t: any) => t.id !== id);
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);
      res.json({ success: true, message: 'Transaction deleted.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Dedicated Mobile Load Endpoints (Jazz/Warid, Telenor, Zong, Ufone)
  app.get('/api/load', (req, res) => {
    try {
      const data = ensureDbFile();
      res.json({
        success: true,
        dailyRecords: data.loadDailyRecords || [],
        transactions: data.loadTransactions || [],
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/load/daily', (req, res) => {
    try {
      const record = req.body;
      if (!record || !record.date) {
        return res.status(400).json({ success: false, error: 'Date is required for Mobile Load daily record.' });
      }

      const current = ensureDbFile();
      const records = current.loadDailyRecords || [];

      // Calculate totals
      const jazzOpening = Number(record.jazzOpening) || 0;
      const telenorOpening = Number(record.telenorOpening) || 0;
      const zongOpening = Number(record.zongOpening) || 0;
      const ufoneOpening = Number(record.ufoneOpening) || 0;
      const loadCashOpening = Number(record.loadCashOpening) || 0;
      const extraAddition = Number(record.extraAddition) || 0;
      const totalOpening = jazzOpening + telenorOpening + zongOpening + ufoneOpening + loadCashOpening + extraAddition;

      const jazzClosing = Number(record.jazzClosing) || 0;
      const telenorClosing = Number(record.telenorClosing) || 0;
      const zongClosing = Number(record.zongClosing) || 0;
      const ufoneClosing = Number(record.ufoneClosing) || 0;
      const loadCashClosing = Number(record.loadCashClosing) || 0;
      const loadExpense = Number(record.loadExpense) || 0;
      const totalClosing = jazzClosing + telenorClosing + zongClosing + ufoneClosing + loadCashClosing + loadExpense;

      const netDifference = totalClosing - totalOpening;
      const resultType = netDifference > 0 ? 'PROFIT' : netDifference < 0 ? 'LOSS' : 'BALANCED';

      const processedRecord = {
        ...record,
        id: record.id || `load_${record.date}`,
        jazzOpening,
        telenorOpening,
        zongOpening,
        ufoneOpening,
        loadCashOpening,
        extraAddition,
        totalOpening,
        jazzClosing,
        telenorClosing,
        zongClosing,
        ufoneClosing,
        loadCashClosing,
        loadExpense,
        totalClosing,
        netDifference,
        resultType,
        updatedAt: new Date().toISOString(),
        createdAt: record.createdAt || new Date().toISOString(),
      };

      const existingIndex = records.findIndex((r: any) => r.date === record.date || r.id === processedRecord.id);
      if (existingIndex >= 0) {
        records[existingIndex] = processedRecord;
      } else {
        records.unshift(processedRecord);
      }

      current.loadDailyRecords = records;
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({
        success: true,
        record: processedRecord,
        message: `Mobile Load record for ${record.date} saved successfully. Result: ${resultType} (Rs. ${Math.abs(netDifference).toLocaleString()})`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/load/daily/:id', (req, res) => {
    try {
      const { id } = req.params;
      const current = ensureDbFile();
      current.loadDailyRecords = (current.loadDailyRecords || []).filter((r: any) => r.id !== id && r.date !== id);
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);
      res.json({ success: true, message: 'Mobile Load daily record deleted.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/load/transaction', (req, res) => {
    try {
      const tx = req.body;
      if (!tx || !tx.amount || !tx.customerMobile || !tx.network) {
        return res.status(400).json({ success: false, error: 'Network, Mobile number, and amount are required.' });
      }

      const current = ensureDbFile();
      const txs = current.loadTransactions || [];
      const processedTx = {
        ...tx,
        id: tx.id || `load_tx_${Date.now()}`,
        date: tx.date || getBusinessDate(),
        amount: Number(tx.amount) || 0,
        commissionOrProfit: Number(tx.commissionOrProfit) || 0,
        createdAt: tx.createdAt || new Date().toISOString(),
      };

      const existingIndex = txs.findIndex((t: any) => t.id === processedTx.id);
      if (existingIndex >= 0) {
        txs[existingIndex] = processedTx;
      } else {
        txs.unshift(processedTx);
      }

      current.loadTransactions = txs;
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({ success: true, transaction: processedTx, message: 'Load transaction recorded successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/load/transaction/:id', (req, res) => {
    try {
      const { id } = req.params;
      const current = ensureDbFile();
      current.loadTransactions = (current.loadTransactions || []).filter((t: any) => t.id !== id);
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);
      res.json({ success: true, message: 'Load transaction deleted.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // Vendor / Supplier Khata & Payables Endpoints
  // ==========================================

  function recalculateVendorBalances(current: DatabaseSchema, vendorId: string) {
    if (!current.vendors) current.vendors = [];
    const vIndex = current.vendors.findIndex((v: any) => v.id === vendorId);
    if (vIndex === -1) return;

    const vendorPurchases = (current.vendorPurchases || []).filter((p: any) => p.vendorId === vendorId);
    const vendorPayments = (current.vendorPayments || []).filter((p: any) => p.vendorId === vendorId);

    const totalBilled = vendorPurchases.reduce((acc: number, p: any) => acc + (Number(p.totalAmount) || 0), 0);
    const totalPaid = vendorPayments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
    const currentBalance = totalBilled - totalPaid;

    current.vendors[vIndex] = {
      ...current.vendors[vIndex],
      totalBilled,
      totalPaid,
      currentBalance,
      updatedAt: new Date().toISOString(),
    };
  }

  // Get all vendors, purchase bills, and payments
  app.get('/api/vendors', (req, res) => {
    try {
      const data = ensureDbFile();
      res.json({
        success: true,
        vendors: data.vendors || [],
        purchases: data.vendorPurchases || [],
        payments: data.vendorPayments || [],
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create or update a vendor
  app.post('/api/vendors', (req, res) => {
    try {
      const vendorData = req.body;
      if (!vendorData || !vendorData.name || !vendorData.phone) {
        return res.status(400).json({ success: false, error: 'Vendor name and phone number are required.' });
      }

      const current = ensureDbFile();
      if (!current.vendors) current.vendors = [];

      const id = vendorData.id || `vendor_${Date.now()}`;
      const existingIndex = current.vendors.findIndex((v: any) => v.id === id);

      const processedVendor = {
        ...vendorData,
        id,
        totalBilled: Number(vendorData.totalBilled) || 0,
        totalPaid: Number(vendorData.totalPaid) || 0,
        currentBalance: Number(vendorData.currentBalance) || 0,
        createdAt: vendorData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        current.vendors[existingIndex] = processedVendor;
      } else {
        current.vendors.push(processedVendor);
      }

      recalculateVendorBalances(current, id);
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      const updatedVendor = current.vendors.find((v: any) => v.id === id);
      res.json({ success: true, vendor: updatedVendor, message: 'Vendor profile saved successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete vendor
  app.delete('/api/vendors/:id', (req, res) => {
    try {
      const { id } = req.params;
      const current = ensureDbFile();
      current.vendors = (current.vendors || []).filter((v: any) => v.id !== id);
      current.vendorPurchases = (current.vendorPurchases || []).filter((p: any) => p.vendorId !== id);
      current.vendorPayments = (current.vendorPayments || []).filter((p: any) => p.vendorId !== id);
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);
      res.json({ success: true, message: 'Vendor and associated records deleted.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Record a vendor purchase / bill (Buying accessories/items on credit or cash)
  app.post('/api/vendors/purchases', (req, res) => {
    try {
      const purchaseData = req.body;
      if (!purchaseData || !purchaseData.vendorId || !purchaseData.totalAmount) {
        return res.status(400).json({ success: false, error: 'Vendor ID and bill total amount are required.' });
      }

      const current = ensureDbFile();
      if (!current.vendorPurchases) current.vendorPurchases = [];
      if (!current.vendorPayments) current.vendorPayments = [];

      const vendor = (current.vendors || []).find((v: any) => v.id === purchaseData.vendorId);
      const vendorName = vendor ? vendor.name : purchaseData.vendorName || 'Unknown Vendor';

      const totalAmount = Number(purchaseData.totalAmount) || 0;
      const paidAmount = Number(purchaseData.paidAmount) || 0;
      const remainingAmount = Math.max(0, totalAmount - paidAmount);
      const isNew = !purchaseData.id;
      const id = purchaseData.id || `pur_${Date.now()}`;

      const status = remainingAmount === 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

      const processedPurchase = {
        ...purchaseData,
        id,
        vendorName,
        totalAmount,
        paidAmount,
        remainingAmount,
        status,
        createdAt: purchaseData.createdAt || new Date().toISOString(),
      };

      const existingIndex = current.vendorPurchases.findIndex((p: any) => p.id === id);
      if (existingIndex >= 0) {
        current.vendorPurchases[existingIndex] = processedPurchase;
      } else {
        current.vendorPurchases.unshift(processedPurchase);

        // If new purchase and user paid something upfront, record the payment in payment history
        if (paidAmount > 0) {
          const upfrontPayment = {
            id: `vpay_upfront_${Date.now()}`,
            vendorId: purchaseData.vendorId,
            vendorName,
            purchaseId: id,
            billNumber: purchaseData.billNumber || '',
            date: purchaseData.date || new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().substring(0, 5),
            amount: paidAmount,
            paymentMethod: purchaseData.paymentMethod || 'CASH',
            referenceNumber: purchaseData.paymentRef || 'Initial Down-Payment',
            notes: `Upfront payment made at time of purchase (${purchaseData.itemsDescription || 'Accessories/Items'})`,
            createdAt: new Date().toISOString(),
          };
          current.vendorPayments.unshift(upfrontPayment);
        }
      }

      recalculateVendorBalances(current, purchaseData.vendorId);
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({
        success: true,
        purchase: processedPurchase,
        message: `Purchase bill recorded. Total: Rs. ${totalAmount.toLocaleString()}, Paid: Rs. ${paidAmount.toLocaleString()}, Remaining: Rs. ${remainingAmount.toLocaleString()}`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete a vendor purchase bill
  app.delete('/api/vendors/purchases/:id', (req, res) => {
    try {
      const { id } = req.params;
      const current = ensureDbFile();
      const purchase = (current.vendorPurchases || []).find((p: any) => p.id === id);
      const vendorId = purchase ? purchase.vendorId : null;

      current.vendorPurchases = (current.vendorPurchases || []).filter((p: any) => p.id !== id);
      // Remove any upfront payment associated with this purchase bill
      current.vendorPayments = (current.vendorPayments || []).filter((p: any) => p.purchaseId !== id);

      if (vendorId) {
        recalculateVendorBalances(current, vendorId);
      }
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({ success: true, message: 'Vendor purchase bill deleted.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Record a payment to a vendor ("when and how much I paid")
  app.post('/api/vendors/payments', (req, res) => {
    try {
      const paymentData = req.body;
      if (!paymentData || !paymentData.vendorId || !paymentData.amount) {
        return res.status(400).json({ success: false, error: 'Vendor ID and payment amount are required.' });
      }

      const current = ensureDbFile();
      if (!current.vendorPayments) current.vendorPayments = [];

      const vendor = (current.vendors || []).find((v: any) => v.id === paymentData.vendorId);
      const vendorName = vendor ? vendor.name : paymentData.vendorName || 'Unknown Vendor';

      const amount = Number(paymentData.amount) || 0;
      const id = paymentData.id || `vpay_${Date.now()}`;

      const processedPayment = {
        ...paymentData,
        id,
        vendorName,
        amount,
        createdAt: paymentData.createdAt || new Date().toISOString(),
      };

      const existingIndex = current.vendorPayments.findIndex((p: any) => p.id === id);
      if (existingIndex >= 0) {
        current.vendorPayments[existingIndex] = processedPayment;
      } else {
        current.vendorPayments.unshift(processedPayment);
      }

      recalculateVendorBalances(current, paymentData.vendorId);
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({
        success: true,
        payment: processedPayment,
        message: `Payment of Rs. ${amount.toLocaleString()} recorded for ${vendorName}.`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete a vendor payment
  app.delete('/api/vendors/payments/:id', (req, res) => {
    try {
      const { id } = req.params;
      const current = ensureDbFile();
      const payment = (current.vendorPayments || []).find((p: any) => p.id === id);
      const vendorId = payment ? payment.vendorId : null;

      current.vendorPayments = (current.vendorPayments || []).filter((p: any) => p.id !== id);

      if (vendorId) {
        recalculateVendorBalances(current, vendorId);
      }
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({ success: true, message: 'Vendor payment record deleted.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // Daily Shop Expenses Endpoints
  // ==========================================

  // Get all expenses
  app.get('/api/expenses', (req, res) => {
    try {
      const data = ensureDbFile();
      res.json({
        success: true,
        expenses: data.expenses || [],
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create or update a single expense
  app.post('/api/expenses', (req, res) => {
    try {
      const item = req.body;
      if (!item || !item.date || item.amount === undefined || !item.reason) {
        return res.status(400).json({ success: false, error: 'Date, expense amount, and reason are required.' });
      }

      const current = ensureDbFile();
      if (!current.expenses) current.expenses = [];

      const id = item.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const existingIdx = current.expenses.findIndex((e: any) => e.id === id);

      const processedExpense = {
        ...item,
        id,
        amount: Math.max(0, Number(item.amount) || 0),
        reason: String(item.reason).trim(),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        current.expenses[existingIdx] = processedExpense;
      } else {
        current.expenses.unshift(processedExpense);
      }

      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({
        success: true,
        expense: processedExpense,
        message: 'Expense saved successfully.',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Bulk save or replace all expenses for a specific date (repeater save)
  app.post('/api/expenses/day-bulk', (req, res) => {
    try {
      const { date, items } = req.body;
      if (!date || !Array.isArray(items)) {
        return res.status(400).json({ success: false, error: 'Date and items array are required.' });
      }

      const current = ensureDbFile();
      if (!current.expenses) current.expenses = [];

      // Keep expenses from other dates
      const otherExpenses = current.expenses.filter((e: any) => e.date !== date);

      const newDayExpenses = items
        .filter((it: any) => it && (Number(it.amount) > 0 || (it.reason && it.reason.trim().length > 0)))
        .map((it: any, idx: number) => ({
          ...it,
          id: it.id || `exp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          date,
          amount: Math.max(0, Number(it.amount) || 0),
          reason: String(it.reason || '').trim(),
          createdAt: it.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

      current.expenses = [...newDayExpenses, ...otherExpenses];
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({
        success: true,
        date,
        items: newDayExpenses,
        totalDayExpense: newDayExpenses.reduce((sum: number, it: any) => sum + it.amount, 0),
        message: `Saved ${newDayExpenses.length} expense(s) for ${date}.`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete a specific expense by ID
  app.delete('/api/expenses/:id', (req, res) => {
    try {
      const { id } = req.params;
      const current = ensureDbFile();
      current.expenses = (current.expenses || []).filter((e: any) => e.id !== id);
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({ success: true, message: 'Expense deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete all expenses for a date
  app.delete('/api/expenses/date/:date', (req, res) => {
    try {
      const { date } = req.params;
      const current = ensureDbFile();
      current.expenses = (current.expenses || []).filter((e: any) => e.date !== date);
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({ success: true, message: `All expenses for ${date} deleted successfully.` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // Dedicated Cash Book & Khata Endpoints
  // ==========================================

  app.get('/api/cashbook', (req, res) => {
    try {
      const data = ensureDbFile();
      res.json({
        success: true,
        accounts: data.cashbookAccounts || [],
        transactions: data.cashbookTransactions || [],
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/cashbook/account', (req, res) => {
    try {
      const acc = req.body;
      if (!acc || !acc.name) {
        return res.status(400).json({ success: false, error: 'Account / Customer name is required.' });
      }

      const current = ensureDbFile();
      if (!current.cashbookAccounts) current.cashbookAccounts = [];

      const id = acc.id || `cb_acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const existingIdx = current.cashbookAccounts.findIndex((a: any) => a.id === id);

      const processedAccount = {
        ...acc,
        id,
        name: String(acc.name).trim(),
        partyType: acc.partyType === 'MY_BORROWING' ? 'MY_BORROWING' : 'CUSTOMER',
        totalBorrowed: Math.max(0, Number(acc.totalBorrowed) || 0),
        totalPaid: Math.max(0, Number(acc.totalPaid) || 0),
        remainingBalance: (Number(acc.totalBorrowed) || 0) - (Number(acc.totalPaid) || 0),
        createdAt: acc.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        current.cashbookAccounts[existingIdx] = processedAccount;
      } else {
        current.cashbookAccounts.push(processedAccount);
      }

      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({
        success: true,
        account: processedAccount,
        message: 'Account saved successfully.',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/cashbook/account/:id', (req, res) => {
    try {
      const { id } = req.params;
      const current = ensureDbFile();
      current.cashbookAccounts = (current.cashbookAccounts || []).filter((a: any) => a.id !== id);
      current.cashbookTransactions = (current.cashbookTransactions || []).filter((t: any) => t.accountId !== id);
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({ success: true, message: 'Account and associated records deleted.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/cashbook/transaction', (req, res) => {
    try {
      const tx = req.body;
      if (!tx || !tx.accountId || !tx.amount || !tx.date) {
        return res.status(400).json({ success: false, error: 'Account ID, amount, and date are required.' });
      }

      const current = ensureDbFile();
      if (!current.cashbookAccounts) current.cashbookAccounts = [];
      if (!current.cashbookTransactions) current.cashbookTransactions = [];

      const accountIdx = current.cashbookAccounts.findIndex((a: any) => a.id === tx.accountId);
      if (accountIdx < 0) {
        return res.status(404).json({ success: false, error: 'Account not found.' });
      }

      const acc = current.cashbookAccounts[accountIdx];
      const id = tx.id || `cb_tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const amount = Math.max(0, Number(tx.amount) || 0);
      const isPaid = tx.type === 'PAID';

      const processedTx = {
        ...tx,
        id,
        amount,
        accountName: acc.name,
        partyType: acc.partyType,
        type: isPaid ? 'PAID' : 'BORROWED',
        createdAt: tx.createdAt || new Date().toISOString(),
      };

      current.cashbookTransactions.push(processedTx);

      // Recalculate account totals
      const accountTxs = current.cashbookTransactions.filter((t: any) => t.accountId === acc.id);
      const totalBorrowed = accountTxs
        .filter((t: any) => t.type === 'BORROWED')
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
      const totalPaid = accountTxs
        .filter((t: any) => t.type === 'PAID')
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

      acc.totalBorrowed = totalBorrowed;
      acc.totalPaid = totalPaid;
      acc.remainingBalance = totalBorrowed - totalPaid;
      acc.lastTransactionDate = tx.date;
      acc.updatedAt = new Date().toISOString();

      current.cashbookAccounts[accountIdx] = acc;
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({
        success: true,
        transaction: processedTx,
        account: acc,
        message: 'Transaction recorded successfully.',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/cashbook/transaction/:id', (req, res) => {
    try {
      const { id } = req.params;
      const current = ensureDbFile();
      const tx = (current.cashbookTransactions || []).find((t: any) => t.id === id);
      if (!tx) {
        return res.status(404).json({ success: false, error: 'Transaction not found.' });
      }

      current.cashbookTransactions = (current.cashbookTransactions || []).filter((t: any) => t.id !== id);

      // Recalculate account totals
      const accountIdx = (current.cashbookAccounts || []).findIndex((a: any) => a.id === tx.accountId);
      if (accountIdx >= 0) {
        const acc = current.cashbookAccounts[accountIdx];
        const accountTxs = current.cashbookTransactions.filter((t: any) => t.accountId === acc.id);
        const totalBorrowed = accountTxs
          .filter((t: any) => t.type === 'BORROWED')
          .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
        const totalPaid = accountTxs
          .filter((t: any) => t.type === 'PAID')
          .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

        acc.totalBorrowed = totalBorrowed;
        acc.totalPaid = totalPaid;
        acc.remainingBalance = totalBorrowed - totalPaid;
        acc.updatedAt = new Date().toISOString();
        current.cashbookAccounts[accountIdx] = acc;
      }

      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({ success: true, message: 'Transaction deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Dedicated Settings endpoints
  app.get('/api/settings', (req, res) => {
    try {
      const data = ensureDbFile();
      res.json({
        success: true,
        settings: data.settings || DEFAULT_STORE_SETTINGS,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/settings', (req, res) => {
    try {
      const newSettings = req.body;
      const current = ensureDbFile();
      current.settings = { ...(current.settings || DEFAULT_STORE_SETTINGS), ...newSettings };
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);
      res.json({
        success: true,
        settings: current.settings,
        message: 'Store settings successfully saved.',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // Dedicated Screen Protectors Endpoints
  // ==========================================

  app.get('/api/protectors', (req, res) => {
    try {
      const data = ensureDbFile();
      res.json({
        success: true,
        protectors: data.protectors || [],
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/protectors', (req, res) => {
    try {
      const protector = req.body;
      if (!protector || !protector.name) {
        return res.status(400).json({ success: false, error: 'Protector name is required.' });
      }

      const current = ensureDbFile();
      current.protectors = current.protectors || [];

      const id = protector.id || `prot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const processed = {
        ...protector,
        id,
        updatedAt: new Date().toISOString(),
      };

      const idx = current.protectors.findIndex((p: any) => p.id === id);
      if (idx >= 0) {
        current.protectors[idx] = processed;
      } else {
        current.protectors.unshift(processed);
      }

      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({
        success: true,
        protector: processed,
        message: 'Screen protector saved successfully.',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/protectors/:id', (req, res) => {
    try {
      const { id } = req.params;
      const current = ensureDbFile();
      current.protectors = (current.protectors || []).filter((p: any) => p.id !== id);
      current.lastUpdated = new Date().toISOString();
      writeDbFile(current);

      res.json({ success: true, message: 'Protector deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Storage diagnosis & hardware disk file stats
  app.get('/api/storage-info', (req, res) => {
    try {
      ensureDbFile();
      const stats = fs.statSync(DB_FILE);
      const data = ensureDbFile();

      res.json({
        success: true,
        storageType: 'PC_DISK_STORAGE',
        absolutePath: path.resolve(DB_FILE),
        relativePath: 'data/stock_database.json',
        fileSizeBytes: stats.size,
        fileSizeKB: (stats.size / 1024).toFixed(2),
        lastModified: stats.mtime.toISOString(),
        totalItems: data.items.length,
        totalSales: data.sales.length,
        isPersistedToPc: true,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reset PC database file to clean initial dataset
  app.post('/api/backup/reset', (req, res) => {
    try {
      const resetData: DatabaseSchema = {
        ...DEFAULT_INITIAL_DATA,
        lastUpdated: new Date().toISOString(),
      };
      writeDbFile(resetData);
      res.json({ success: true, message: 'Database file reset to initial sample dataset on PC disk' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Clear all data in PC database file
  app.post('/api/backup/clear', (req, res) => {
    try {
      const current = ensureDbFile();
      const emptyData: DatabaseSchema = {
        version: '4.0.0',
        storageType: 'PC_DISK_FILE',
        lastUpdated: new Date().toISOString(),
        settings: current.settings || DEFAULT_STORE_SETTINGS,
        items: [],
        bankTransactions: [],
        sales: [],
        epJcDailyRecords: [],
        epJcTransactions: [],
        loadDailyRecords: [],
        loadTransactions: [],
        vendors: [],
        vendorPurchases: [],
        vendorPayments: [],
        expenses: [],
        cashbookAccounts: [],
        cashbookTransactions: [],
        protectors: [],
      };
      writeDbFile(emptyData);
      res.json({ success: true, message: 'PC database file wiped clean across all datasets' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Import JSON file directly into PC storage file
  app.post('/api/backup/import', (req, res) => {
    try {
      const imported = req.body;
      if (!imported || (!Array.isArray(imported.items) && !Array.isArray(imported.bankTransactions))) {
        return res.status(400).json({ success: false, error: 'Invalid backup file format' });
      }

      const updatedData: DatabaseSchema = {
        version: imported.version || '4.0.0',
        storageType: 'PC_DISK_FILE',
        lastUpdated: new Date().toISOString(),
        items: Array.isArray(imported.items) ? imported.items : [],
        bankTransactions: Array.isArray(imported.bankTransactions) ? imported.bankTransactions : [],
        sales: Array.isArray(imported.sales) ? imported.sales : [],
        settings: imported.settings || DEFAULT_STORE_SETTINGS,
        epJcDailyRecords: Array.isArray(imported.epJcDailyRecords) ? imported.epJcDailyRecords : [],
        epJcTransactions: Array.isArray(imported.epJcTransactions) ? imported.epJcTransactions : [],
        loadDailyRecords: Array.isArray(imported.loadDailyRecords) ? imported.loadDailyRecords : [],
        loadTransactions: Array.isArray(imported.loadTransactions) ? imported.loadTransactions : [],
        vendors: Array.isArray(imported.vendors) ? imported.vendors : [],
        vendorPurchases: Array.isArray(imported.vendorPurchases) ? imported.vendorPurchases : [],
        vendorPayments: Array.isArray(imported.vendorPayments) ? imported.vendorPayments : [],
        expenses: Array.isArray(imported.expenses) ? imported.expenses : [],
        cashbookAccounts: Array.isArray(imported.cashbookAccounts) ? imported.cashbookAccounts : [],
        cashbookTransactions: Array.isArray(imported.cashbookTransactions) ? imported.cashbookTransactions : [],
        protectors: Array.isArray(imported.protectors) ? imported.protectors : [],
      };

      writeDbFile(updatedData);
      res.json({ success: true, message: 'Backup successfully imported into PC disk storage' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Download raw PC disk file
  app.get('/api/backup/export', (req, res) => {
    try {
      ensureDbFile();
      res.download(DB_FILE, 'stock_database.json');
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware setup (development vs production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: process.env.DISABLE_HMR === 'true' ? null : {
          ignored: [
            '**/data/**',
            '**/data/*',
            '**/stock_database.json',
            '**/auth_config.json',
            '**/sessions.json',
            '**/*.json',
          ],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running with PC Disk Storage at http://localhost:${PORT}`);
    console.log(`PC Database File Path: ${path.resolve(DB_FILE)}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
