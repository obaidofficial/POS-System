import {
  InventoryItem,
  DashboardMetrics,
  Sale,
  SaleItemLine,
  SaleReturn,
  SaleExchange,
  ReturnedItemRecord,
  ExchangedItemRecord,
  StorageInfo,
  StoreSettings,
  PrinterSettings,
  EpJcDailyRecord,
  EpJcCustomAccount,
  EpJcTransaction,
  EpJcServiceType,
  EpJcTxType,
  LoadDailyRecord,
  LoadTransaction,
  LoadNetworkType,
  LoadTxType,
  Vendor,
  VendorPurchase,
  VendorPurchaseItem,
  VendorPayment,
  VendorPaymentMethod,
  ExpenseItem,
  ExpensePaymentMethod,
  CashBookAccount,
  CashBookTransaction,
  CashBookPartyType,
  CashBookTxType,
  CashBookPaymentMethod,
  ScreenProtector,
  ProtectorBrandCompatibility,
} from '../types';
import { authService } from './auth';

const STORAGE_KEYS = {
  ITEMS: 'offline_stock_items_v4',
  SALES: 'offline_stock_sales_v4',
  SETTINGS: 'offline_stock_settings_v4',
  EPJC_RECORDS: 'offline_stock_epjc_records_v4',
  EPJC_TXS: 'offline_stock_epjc_txs_v4',
  LOAD_RECORDS: 'offline_stock_load_records_v4',
  LOAD_TXS: 'offline_stock_load_txs_v4',
  VENDORS: 'offline_stock_vendors_v4',
  VENDOR_PURCHASES: 'offline_stock_vendor_purchases_v4',
  VENDOR_PAYMENTS: 'offline_stock_vendor_payments_v4',
  EXPENSES: 'offline_stock_expenses_v4',
  CASHBOOK_ACCOUNTS: 'offline_stock_cashbook_accounts_v4',
  CASHBOOK_TXS: 'offline_stock_cashbook_txs_v4',
  PROTECTORS: 'offline_stock_protectors_v4',
  INITIALIZED: 'offline_stock_initialized_v4',
};

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  printerPreset: 'bc-96ac',
  printerName: 'BC-96AC Mini Printer',
  paperSize: '58mm',
  customWidthMm: 58,
  printCopies: 1,
  copyLabelsEnabled: true,
  autoPrintOnSale: true,
  autoCutFeedLines: 3,
  showLogoOnSlip: true,
  showBarcodeOnSlip: true,
  showInvoiceBarcode: true,
  showCashierName: true,
  cashierName: 'Counter Cashier',
  showTimeOnSlip: true,
  timeFormat: '12h',
  fontSize: 'normal',
  darkPrintOptimization: true,
  invoicePrefix: 'INV-',
};

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  brandName: 'StockCore Retail & Wholesale',
  logoUrl: '',
  phoneNumber: '+92 300 1234567',
  phoneNumbers: ['+92 300 1234567'],
  address: 'Shop # 14-15, Commercial Plaza, Main Boulevard, Lahore',
  headerBriefText: 'Authorized Wholesale & Retail Distributors',
  footerBriefText: 'Thank you for your valued business! We look forward to serving you again.',
  returnPolicyText: 'Items can be exchanged within 7 days in original condition with this receipt.',
  returnPolicies: ['Items can be exchanged within 7 days in original condition with this receipt.'],
  supportContact: 'Email: support@stockcore.pk • WhatsApp: +92 300 1234567',
  barcodeEnabled: true,
  autoPrintSlip: true,
  printerSettings: { ...DEFAULT_PRINTER_SETTINGS },
};

// Realistic initial inventory items with PKR pricing for immediate offline usability
const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: 'item_1',
    sku: 'ELC-KB-01',
    name: 'Wireless Mechanical Keyboard Pro',
    category: 'Electronics',
    brand: 'Logitech',
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
    brand: 'Logitech',
    unit: 'pcs',
    costPrice: 2250.0,
    sellingPrice: 4950.0,
    currentStock: 6, // Low stock! (threshold 8)
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
    brand: 'Anker',
    unit: 'pcs',
    costPrice: 1800.0,
    sellingPrice: 3900.0,
    currentStock: 3, // Low stock alert!
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
    brand: 'Sihoo',
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
    brand: 'Baseus',
    unit: 'pcs',
    costPrice: 950.0,
    sellingPrice: 2499.0,
    currentStock: 0, // Out of stock!
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
    brand: 'Dell',
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
];

const INITIAL_SALES: Sale[] = [
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
    notes: 'In-store cash counter sale with bundle discount',
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
];

const INITIAL_EPJC_RECORDS: EpJcDailyRecord[] = [
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
];

const INITIAL_EPJC_TXS: EpJcTransaction[] = [
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
];

const INITIAL_LOAD_RECORDS: LoadDailyRecord[] = [
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
];

const INITIAL_LOAD_TXS: LoadTransaction[] = [
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
];

const INITIAL_VENDORS: Vendor[] = [
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
];

const INITIAL_VENDOR_PURCHASES: VendorPurchase[] = [
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
];

const INITIAL_VENDOR_PAYMENTS: VendorPayment[] = [
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
];

const INITIAL_EXPENSES: ExpenseItem[] = [
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
];

const INITIAL_CASHBOOK_ACCOUNTS: CashBookAccount[] = [
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
];

const INITIAL_CASHBOOK_TXS: CashBookTransaction[] = [
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
];

const INITIAL_PROTECTORS: ScreenProtector[] = [
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
    id: 'prot_matte01',
    name: 'Matte Anti-Spy M-01',
    category: 'Matte Privacy Glass',
    material: 'Privacy Anti-Peeping',
    defaultPrice: 250,
    compatibleBrands: [
      {
        brand: 'Infinix',
        models: ['Hot 10', 'Hot 10 Play', 'Hot 11', 'Hot 12 Play'],
      },
      {
        brand: 'Tecno',
        models: ['Spark 6', 'Spark 7', 'Spark 8', 'Pova'],
      },
    ],
    notes: '28-degree privacy angle, anti-glare matte gaming finish',
    createdBy: 'System',
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-03-01T08:00:00.000Z',
  },
  {
    id: 'prot_kk08',
    name: 'King Kong Super D 08',
    category: 'High Impact Protection',
    material: 'Double Tempered Glass',
    defaultPrice: 250,
    compatibleBrands: [
      {
        brand: 'Xiaomi',
        models: ['Redmi Note 10', 'Redmi Note 10s', 'Redmi Note 11'],
      },
      {
        brand: 'Poco',
        models: ['Poco M5s', 'Poco X3', 'Poco X3 Pro'],
      },
    ],
    notes: 'Reinforced shatterproof edges with dust-proof earpiece mesh',
    createdBy: 'System',
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-03-01T08:00:00.000Z',
  },
  {
    id: 'prot_ip13',
    name: 'Apple Edge-to-Edge 13',
    category: 'ESD Anti-Static Full Glass',
    material: 'Japanese Asahi Glass',
    defaultPrice: 300,
    compatibleBrands: [
      {
        brand: 'Apple',
        models: ['iPhone 13', 'iPhone 13 Pro', 'iPhone 14'],
      },
    ],
    notes: 'Precise speaker cutout, seamless notch fit, anti-oil oleophobic coating',
    createdBy: 'System',
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-03-01T08:00:00.000Z',
  },
  {
    id: 'prot_uv09',
    name: 'Curved UV Diamond 09',
    category: 'UV Liquid Adhesive',
    material: 'Optical Curved Glass',
    defaultPrice: 350,
    compatibleBrands: [
      {
        brand: 'Samsung',
        models: ['A52', 'A53', 'A72', 'S20 FE', 'S21 FE'],
      },
    ],
    notes: 'Requires UV lamp curing, 100% in-display fingerprint sensor response',
    createdBy: 'System',
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-03-01T08:00:00.000Z',
  },
];

class StorageService {
  private listeners: (() => void)[] = [];
  private itemsCache: InventoryItem[] = [];
  private salesCache: Sale[] = [];
  private settingsCache: StoreSettings = { ...DEFAULT_STORE_SETTINGS };
  private epJcRecordsCache: EpJcDailyRecord[] = [];
  private epJcTxsCache: EpJcTransaction[] = [];
  private loadRecordsCache: LoadDailyRecord[] = [];
  private loadTxsCache: LoadTransaction[] = [];
  private vendorsCache: Vendor[] = [];
  private vendorPurchasesCache: VendorPurchase[] = [];
  private vendorPaymentsCache: VendorPayment[] = [];
  private expensesCache: ExpenseItem[] = [];
  private cashbookAccountsCache: CashBookAccount[] = [];
  private cashbookTxsCache: CashBookTransaction[] = [];
  private protectorsCache: ScreenProtector[] = [];
  private isPcConnected: boolean = false;
  private pcFilePath: string = 'data/stock_database.json';
  private lastSyncedTime: string = '';

  constructor() {
    this.ensureInitialized();
    this.loadFromLocalCache();
    // Connect to PC storage file on disk immediately
    this.initFromPcStorage();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Storage listener error', e);
      }
    });
  }

  private ensureInitialized(): void {
    try {
      const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
      if (!initialized) {
        localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_ITEMS));
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(INITIAL_SALES));
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_STORE_SETTINGS));
        localStorage.setItem(STORAGE_KEYS.EPJC_RECORDS, JSON.stringify(INITIAL_EPJC_RECORDS));
        localStorage.setItem(STORAGE_KEYS.EPJC_TXS, JSON.stringify(INITIAL_EPJC_TXS));
        localStorage.setItem(STORAGE_KEYS.LOAD_RECORDS, JSON.stringify(INITIAL_LOAD_RECORDS));
        localStorage.setItem(STORAGE_KEYS.LOAD_TXS, JSON.stringify(INITIAL_LOAD_TXS));
        localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(INITIAL_VENDORS));
        localStorage.setItem(STORAGE_KEYS.VENDOR_PURCHASES, JSON.stringify(INITIAL_VENDOR_PURCHASES));
        localStorage.setItem(STORAGE_KEYS.VENDOR_PAYMENTS, JSON.stringify(INITIAL_VENDOR_PAYMENTS));
        localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
        localStorage.setItem(STORAGE_KEYS.CASHBOOK_ACCOUNTS, JSON.stringify(INITIAL_CASHBOOK_ACCOUNTS));
        localStorage.setItem(STORAGE_KEYS.CASHBOOK_TXS, JSON.stringify(INITIAL_CASHBOOK_TXS));
        localStorage.setItem(STORAGE_KEYS.PROTECTORS, JSON.stringify(INITIAL_PROTECTORS));
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      }
    } catch (e) {
      console.error('LocalStorage not available or full', e);
    }
  }

  private loadFromLocalCache(): void {
    try {
      const rawItems = localStorage.getItem(STORAGE_KEYS.ITEMS);
      const rawSales = localStorage.getItem(STORAGE_KEYS.SALES);
      const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const rawEpJcRecords = localStorage.getItem(STORAGE_KEYS.EPJC_RECORDS);
      const rawEpJcTxs = localStorage.getItem(STORAGE_KEYS.EPJC_TXS);
      const rawLoadRecords = localStorage.getItem(STORAGE_KEYS.LOAD_RECORDS);
      const rawLoadTxs = localStorage.getItem(STORAGE_KEYS.LOAD_TXS);
      const rawVendors = localStorage.getItem(STORAGE_KEYS.VENDORS);
      const rawPurchases = localStorage.getItem(STORAGE_KEYS.VENDOR_PURCHASES);
      const rawPayments = localStorage.getItem(STORAGE_KEYS.VENDOR_PAYMENTS);
      const rawExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      const rawCashbookAccounts = localStorage.getItem(STORAGE_KEYS.CASHBOOK_ACCOUNTS);
      const rawCashbookTxs = localStorage.getItem(STORAGE_KEYS.CASHBOOK_TXS);
      const rawProtectors = localStorage.getItem(STORAGE_KEYS.PROTECTORS);

      const parsedItems: InventoryItem[] = rawItems ? JSON.parse(rawItems) : [...INITIAL_ITEMS];
      this.itemsCache = parsedItems.map((item, idx) => ({
        ...item,
        barcode: item.barcode || `890100${String(idx + 1).padStart(5, '0')}`,
      }));
      this.salesCache = rawSales ? JSON.parse(rawSales) : [...INITIAL_SALES];
      this.settingsCache = rawSettings ? { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(rawSettings) } : { ...DEFAULT_STORE_SETTINGS };
      this.epJcRecordsCache = rawEpJcRecords ? JSON.parse(rawEpJcRecords) : [...INITIAL_EPJC_RECORDS];
      this.epJcTxsCache = rawEpJcTxs ? JSON.parse(rawEpJcTxs) : [...INITIAL_EPJC_TXS];
      this.loadRecordsCache = rawLoadRecords ? JSON.parse(rawLoadRecords) : [...INITIAL_LOAD_RECORDS];
      this.loadTxsCache = rawLoadTxs ? JSON.parse(rawLoadTxs) : [...INITIAL_LOAD_TXS];
      this.vendorsCache = rawVendors ? JSON.parse(rawVendors) : [...INITIAL_VENDORS];
      this.vendorPurchasesCache = rawPurchases ? JSON.parse(rawPurchases) : [...INITIAL_VENDOR_PURCHASES];
      this.vendorPaymentsCache = rawPayments ? JSON.parse(rawPayments) : [...INITIAL_VENDOR_PAYMENTS];
      this.expensesCache = rawExpenses ? JSON.parse(rawExpenses) : [...INITIAL_EXPENSES];
      this.cashbookAccountsCache = rawCashbookAccounts ? JSON.parse(rawCashbookAccounts) : [...INITIAL_CASHBOOK_ACCOUNTS];
      this.cashbookTxsCache = rawCashbookTxs ? JSON.parse(rawCashbookTxs) : [...INITIAL_CASHBOOK_TXS];
      this.protectorsCache = rawProtectors ? JSON.parse(rawProtectors) : [...INITIAL_PROTECTORS];
    } catch {
      this.itemsCache = [...INITIAL_ITEMS];
      this.salesCache = [...INITIAL_SALES];
      this.settingsCache = { ...DEFAULT_STORE_SETTINGS };
      this.epJcRecordsCache = [...INITIAL_EPJC_RECORDS];
      this.epJcTxsCache = [...INITIAL_EPJC_TXS];
      this.loadRecordsCache = [...INITIAL_LOAD_RECORDS];
      this.loadTxsCache = [...INITIAL_LOAD_TXS];
      this.vendorsCache = [...INITIAL_VENDORS];
      this.vendorPurchasesCache = [...INITIAL_VENDOR_PURCHASES];
      this.vendorPaymentsCache = [...INITIAL_VENDOR_PAYMENTS];
      this.expensesCache = [...INITIAL_EXPENSES];
      this.cashbookAccountsCache = [...INITIAL_CASHBOOK_ACCOUNTS];
      this.cashbookTxsCache = [...INITIAL_CASHBOOK_TXS];
      this.protectorsCache = [...INITIAL_PROTECTORS];
    }
  }

  private saveToLocalCache(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(this.itemsCache));
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(this.salesCache));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settingsCache));
      localStorage.setItem(STORAGE_KEYS.EPJC_RECORDS, JSON.stringify(this.epJcRecordsCache));
      localStorage.setItem(STORAGE_KEYS.EPJC_TXS, JSON.stringify(this.epJcTxsCache));
      localStorage.setItem(STORAGE_KEYS.LOAD_RECORDS, JSON.stringify(this.loadRecordsCache));
      localStorage.setItem(STORAGE_KEYS.LOAD_TXS, JSON.stringify(this.loadTxsCache));
      localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(this.vendorsCache));
      localStorage.setItem(STORAGE_KEYS.VENDOR_PURCHASES, JSON.stringify(this.vendorPurchasesCache));
      localStorage.setItem(STORAGE_KEYS.VENDOR_PAYMENTS, JSON.stringify(this.vendorPaymentsCache));
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(this.expensesCache));
      localStorage.setItem(STORAGE_KEYS.CASHBOOK_ACCOUNTS, JSON.stringify(this.cashbookAccountsCache));
      localStorage.setItem(STORAGE_KEYS.CASHBOOK_TXS, JSON.stringify(this.cashbookTxsCache));
      localStorage.setItem(STORAGE_KEYS.PROTECTORS, JSON.stringify(this.protectorsCache));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    } catch (e) {
      console.error('Failed to write to local storage cache', e);
    }
  }

  /**
   * Load data directly from the PC storage disk file (data/stock_database.json).
   * Ensures that opening in any new browser or tab pulls the latest data from the computer's hard drive.
   */
  public async initFromPcStorage(): Promise<boolean> {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          this.itemsCache = Array.isArray(json.data.items)
            ? json.data.items.map((item: InventoryItem, idx: number) => ({
                ...item,
                barcode: item.barcode || `890100${String(idx + 1).padStart(5, '0')}`,
              }))
            : [];
          this.salesCache = Array.isArray(json.data.sales) ? json.data.sales : [];
          if (json.data.settings) {
            this.settingsCache = { ...DEFAULT_STORE_SETTINGS, ...json.data.settings };
          }
          if (Array.isArray(json.data.epJcDailyRecords)) {
            this.epJcRecordsCache = json.data.epJcDailyRecords;
          }
          if (Array.isArray(json.data.epJcTransactions)) {
            this.epJcTxsCache = json.data.epJcTransactions;
          }
          if (Array.isArray(json.data.loadDailyRecords)) {
            this.loadRecordsCache = json.data.loadDailyRecords;
          }
          if (Array.isArray(json.data.loadTransactions)) {
            this.loadTxsCache = json.data.loadTransactions;
          }
          if (Array.isArray(json.data.vendors)) {
            this.vendorsCache = json.data.vendors;
          }
          if (Array.isArray(json.data.vendorPurchases)) {
            this.vendorPurchasesCache = json.data.vendorPurchases;
          }
          if (Array.isArray(json.data.vendorPayments)) {
            this.vendorPaymentsCache = json.data.vendorPayments;
          }
          if (Array.isArray(json.data.expenses)) {
            this.expensesCache = json.data.expenses;
          }
          if (Array.isArray(json.data.cashbookAccounts)) {
            this.cashbookAccountsCache = json.data.cashbookAccounts;
          }
          if (Array.isArray(json.data.cashbookTransactions)) {
            this.cashbookTxsCache = json.data.cashbookTransactions;
          }
          if (Array.isArray(json.data.protectors)) {
            this.protectorsCache = json.data.protectors;
          }
          this.isPcConnected = true;
          this.pcFilePath = json.filePath || 'data/stock_database.json';
          this.lastSyncedTime = json.lastUpdated || new Date().toISOString();

          // Sync to local browser cache as well
          this.saveToLocalCache();
          this.notify();
          return true;
        }
      }
    } catch (err) {
      console.warn('PC Disk Storage API unavailable, using cached local copy:', err);
    }
    return false;
  }

  /**
   * Persist current state immediately to the PC disk file on the host machine.
   */
  private async persistToPcDisk(): Promise<void> {
    this.saveToLocalCache();
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: this.itemsCache,
          bankTransactions: [],
          sales: this.salesCache,
          settings: this.settingsCache,
          epJcDailyRecords: this.epJcRecordsCache,
          epJcTransactions: this.epJcTxsCache,
          loadDailyRecords: this.loadRecordsCache,
          loadTransactions: this.loadTxsCache,
          vendors: this.vendorsCache,
          vendorPurchases: this.vendorPurchasesCache,
          vendorPayments: this.vendorPaymentsCache,
          expenses: this.expensesCache,
          cashbookAccounts: this.cashbookAccountsCache,
          cashbookTransactions: this.cashbookTxsCache,
          protectors: this.protectorsCache,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        this.isPcConnected = true;
        this.lastSyncedTime = json.lastUpdated || new Date().toISOString();
        if (json.filePath) {
          this.pcFilePath = json.filePath;
        }
      }
    } catch (err) {
      console.warn('Could not persist directly to PC disk API:', err);
    }
  }

  public getStoreSettings(): StoreSettings {
    const s = this.settingsCache;
    const phoneNumbers = s.phoneNumbers && s.phoneNumbers.length > 0
      ? s.phoneNumbers
      : (s.phoneNumber ? [s.phoneNumber] : ['+92 300 1234567']);
    
    const returnPolicies = s.returnPolicies && s.returnPolicies.length > 0
      ? s.returnPolicies
      : (s.returnPolicyText ? [s.returnPolicyText] : ['Items can be exchanged within 7 days in original condition with this receipt.']);
    
    const mergedPrinterSettings: PrinterSettings = {
      ...DEFAULT_PRINTER_SETTINGS,
      ...(s.printerSettings || {}),
      cashierName: s.printerSettings?.cashierName !== undefined ? s.printerSettings.cashierName : DEFAULT_PRINTER_SETTINGS.cashierName,
      showCashierName: s.printerSettings?.showCashierName !== undefined ? s.printerSettings.showCashierName : true,
      showTimeOnSlip: s.printerSettings?.showTimeOnSlip !== undefined ? s.printerSettings.showTimeOnSlip : true,
      timeFormat: s.printerSettings?.timeFormat || '12h',
      // Keep autoPrintOnSale consistent with autoPrintSlip
      autoPrintOnSale: s.printerSettings?.autoPrintOnSale !== undefined 
        ? s.printerSettings.autoPrintOnSale 
        : (s.autoPrintSlip !== false),
    };

    return {
      ...s,
      phoneNumbers,
      returnPolicies,
      barcodeEnabled: s.barcodeEnabled !== false,
      autoPrintSlip: mergedPrinterSettings.autoPrintOnSale,
      printerSettings: mergedPrinterSettings,
    };
  }

  public isAutoPrintSlipEnabled(): boolean {
    const s = this.getStoreSettings();
    if (s.printerSettings?.autoPrintOnSale !== undefined) {
      return s.printerSettings.autoPrintOnSale;
    }
    return s.autoPrintSlip !== false;
  }

  public isBarcodeEnabled(): boolean {
    return this.settingsCache.barcodeEnabled !== false;
  }

  public async updateStoreSettings(newSettings: Partial<StoreSettings>): Promise<StoreSettings> {
    const current = this.getStoreSettings();
    let autoPrintVal = newSettings.autoPrintSlip;
    if (newSettings.printerSettings?.autoPrintOnSale !== undefined) {
      autoPrintVal = newSettings.printerSettings.autoPrintOnSale;
    } else if (newSettings.autoPrintSlip !== undefined) {
      autoPrintVal = newSettings.autoPrintSlip;
    }

    const mergedPrinterSettings: PrinterSettings = {
      ...DEFAULT_PRINTER_SETTINGS,
      ...(current.printerSettings || {}),
      ...(newSettings.printerSettings || {}),
    };

    if (autoPrintVal !== undefined) {
      mergedPrinterSettings.autoPrintOnSale = autoPrintVal;
    }

    let returnPolicyText = newSettings.returnPolicyText;
    if (newSettings.returnPolicies && returnPolicyText === undefined) {
      returnPolicyText = newSettings.returnPolicies.filter(Boolean).join(' • ');
    }

    this.settingsCache = {
      ...current,
      ...newSettings,
      ...(returnPolicyText !== undefined ? { returnPolicyText } : {}),
      autoPrintSlip: autoPrintVal !== undefined ? autoPrintVal : (mergedPrinterSettings.autoPrintOnSale ?? true),
      printerSettings: mergedPrinterSettings,
    };
    this.notify();
    await this.persistToPcDisk();
    return this.getStoreSettings();
  }

  public isPcStorageConnected(): boolean {
    return this.isPcConnected;
  }

  public getPcStoragePath(): string {
    return this.pcFilePath;
  }

  public getLastSyncedTime(): string {
    return this.lastSyncedTime;
  }

  public async fetchStorageInfo(): Promise<StorageInfo | null> {
    try {
      const res = await fetch('/api/storage-info');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.isPcConnected = true;
          return json as StorageInfo;
        }
      }
    } catch (err) {
      console.warn('Failed to retrieve PC storage info:', err);
    }
    return null;
  }

  public async forceSyncFromPcDisk(): Promise<boolean> {
    return this.initFromPcStorage();
  }


  // --- INVENTORY ITEMS ---
  public getItems(): InventoryItem[] {
    return [...this.itemsCache];
  }

  public getItemById(id: string): InventoryItem | undefined {
    return this.itemsCache.find((item) => item.id === id);
  }

  public addItem(
    data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>
  ): InventoryItem {
    const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newItem: InventoryItem = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.itemsCache.push(newItem);
    this.notify();
    this.persistToPcDisk();
    return newItem;
  }

  public addItems(
    itemsList: Array<Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>>
  ): InventoryItem[] {
    const now = new Date().toISOString();
    const newItems: InventoryItem[] = itemsList.map((data, index) => ({
      ...data,
      id: `item_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    }));

    this.itemsCache.push(...newItems);
    this.notify();
    this.persistToPcDisk();
    return newItems;
  }

  public updateItem(
    id: string,
    updates: Partial<Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>>
  ): InventoryItem | null {
    const index = this.itemsCache.findIndex((i) => i.id === id);
    if (index === -1) return null;

    const oldItem = this.itemsCache[index];
    const now = new Date().toISOString();

    const updatedItem: InventoryItem = {
      ...oldItem,
      ...updates,
      updatedAt: now,
    };

    this.itemsCache[index] = updatedItem;
    this.notify();
    this.persistToPcDisk();
    return updatedItem;
  }

  public adjustStock(
    itemId: string,
    quantityDelta: number
  ): boolean {
    const index = this.itemsCache.findIndex((i) => i.id === itemId);
    if (index === -1) return false;

    const item = this.itemsCache[index];
    const stockBefore = item.currentStock;
    const stockAfter = Math.max(0, stockBefore + quantityDelta);

    item.currentStock = stockAfter;
    item.updatedAt = new Date().toISOString();
    this.itemsCache[index] = item;

    this.notify();
    this.persistToPcDisk();
    return true;
  }

  public deleteItem(id: string): boolean {
    const item = this.itemsCache.find((i) => i.id === id);
    if (!item) return false;

    this.itemsCache = this.itemsCache.filter((i) => i.id !== id);
    this.notify();
    this.persistToPcDisk();
    return true;
  }

  public deleteItems(ids: string[]): number {
    if (!ids || ids.length === 0) return 0;
    const idSet = new Set(ids);
    const initialCount = this.itemsCache.length;
    this.itemsCache = this.itemsCache.filter((i) => !idSet.has(i.id));
    const removed = initialCount - this.itemsCache.length;
    if (removed > 0) {
      this.notify();
      this.persistToPcDisk();
    }
    return removed;
  }

  // --- SALES METHODS ---
  public getSales(): Sale[] {
    return [...this.salesCache].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  public getSaleById(id: string): Sale | undefined {
    return this.salesCache.find((s) => s.id === id);
  }

  public generateNextInvoiceNumber(): string {
    const settings = this.getStoreSettings();
    const prefix = settings.printerSettings?.invoicePrefix || 'INV-';
    let maxNum = 0;
    for (const s of this.salesCache) {
      const match = s.invoiceNumber?.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum && num < 10000000) maxNum = num;
      }
    }
    const nextSeq = maxNum > 0 ? maxNum + 1 : Math.floor(10000 + Math.random() * 90000);
    return `${prefix}${nextSeq}`;
  }

  public recordSale(saleData: Omit<Sale, 'id' | 'createdAt'>): Sale {
    const id = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Automatically update inventory stock for each sold item
    for (const line of saleData.items) {
      const itemIndex = this.itemsCache.findIndex((i) => i.id === line.itemId);
      if (itemIndex !== -1) {
        this.itemsCache[itemIndex].currentStock = Math.max(
          0,
          this.itemsCache[itemIndex].currentStock - line.quantity
        );
        this.itemsCache[itemIndex].updatedAt = now;
      }
    }

    // Ensure subtotal, discountTotal, and totalAmount are normalized with discount math
    const normalizedItems: SaleItemLine[] = saleData.items.map((line) => {
      const originalPrice = Number(line.originalPrice ?? line.soldPrice) || 0;
      const soldPrice = Math.max(0, Number(line.soldPrice) || 0);
      const discountPerUnit = line.discountPerUnit !== undefined
        ? Math.max(0, Number(line.discountPerUnit))
        : Math.max(0, originalPrice - soldPrice);
      const quantity = Math.max(1, Number(line.quantity) || 1);
      const total = Number(line.total ?? (quantity * soldPrice));
      const stockItem = this.itemsCache.find((i) => i.id === line.itemId);
      const barcode = line.barcode?.trim() || stockItem?.barcode?.trim() || undefined;
      return {
        ...line,
        barcode,
        originalPrice,
        discountPerUnit,
        soldPrice,
        quantity,
        total,
      };
    });

    const grossSubtotal = normalizedItems.reduce((sum, line) => sum + (line.originalPrice * line.quantity), 0);
    const lineDiscounts = normalizedItems.reduce((sum, line) => sum + ((line.discountPerUnit || 0) * line.quantity), 0);
    const orderDiscount = Math.max(0, Number(saleData.orderDiscount) || 0);
    const calculatedDiscountTotal = lineDiscounts + orderDiscount;
    const finalDiscountTotal = saleData.discountTotal !== undefined
      ? Math.max(0, Number(saleData.discountTotal))
      : calculatedDiscountTotal;
    const finalSubtotal = saleData.subtotal !== undefined
      ? Math.max(0, Number(saleData.subtotal))
      : grossSubtotal;
    const finalTotalAmount = saleData.totalAmount !== undefined
      ? Math.max(0, Number(saleData.totalAmount))
      : Math.max(0, finalSubtotal - finalDiscountTotal);

    const settings = this.getStoreSettings();
    const format = settings.printerSettings?.timeFormat || '12h';
    const time = saleData.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: format !== '24h' });
    const userProfileName = authService.getStoredUser()?.name;
    const cashierName = saleData.cashierName || userProfileName || 'Counter Cashier';

    // Save Sale Record
    const newSale: Sale = {
      ...saleData,
      time,
      cashierName,
      items: normalizedItems,
      subtotal: finalSubtotal,
      discountTotal: finalDiscountTotal,
      orderDiscount,
      totalAmount: finalTotalAmount,
      id,
      createdAt: now,
    };

    this.salesCache.unshift(newSale);
    this.notify();
    this.persistToPcDisk();
    return newSale;
  }

  public deleteSale(id: string, restoreStock = true): boolean {
    const sale = this.salesCache.find((s) => s.id === id);
    if (!sale) return false;

    if (restoreStock) {
      for (const line of sale.items) {
        const itemIndex = this.itemsCache.findIndex((i) => i.id === line.itemId);
        if (itemIndex !== -1) {
          this.itemsCache[itemIndex].currentStock += line.quantity;
          this.itemsCache[itemIndex].updatedAt = new Date().toISOString();
        }
      }
    }

    this.salesCache = this.salesCache.filter((s) => s.id !== id);
    this.notify();
    this.persistToPcDisk();
    return true;
  }

  public deleteSales(ids: string[], restoreStock = true): number {
    if (!ids || ids.length === 0) return 0;
    const idSet = new Set(ids);
    let removedCount = 0;

    for (const id of ids) {
      const sale = this.salesCache.find((s) => s.id === id);
      if (!sale) continue;

      if (restoreStock) {
        for (const line of sale.items) {
          const itemIndex = this.itemsCache.findIndex((i) => i.id === line.itemId);
          if (itemIndex !== -1) {
            this.itemsCache[itemIndex].currentStock += line.quantity;
            this.itemsCache[itemIndex].updatedAt = new Date().toISOString();
          }
        }
      }
      removedCount++;
    }

    this.salesCache = this.salesCache.filter((s) => !idSet.has(s.id));
    if (removedCount > 0) {
      this.notify();
      this.persistToPcDisk();
    }
    return removedCount;
  }

  public processSaleReturn(
    saleId: string,
    returnData: {
      items: {
        itemId: string;
        quantity: number;
        unitRefundPrice: number;
        condition: 'good' | 'damaged' | 'defective';
        restockedToInventory: boolean;
      }[];
      refundMethod?: 'CASH';
      reason?: string;
      notes?: string;
      processedBy?: string;
      deleteInvoice?: boolean;
    }
  ): {
    success: boolean;
    returnRecord?: SaleReturn;
    updatedSale?: Sale | null;
    invoiceDeleted?: boolean;
    error?: string;
  } {
    const saleIndex = this.salesCache.findIndex((s) => s.id === saleId);
    if (saleIndex === -1) {
      return { success: false, error: 'Sale order not found' };
    }

    const sale = { ...this.salesCache[saleIndex] };
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const settings = this.getStoreSettings();
    const format = settings.printerSettings?.timeFormat || '12h';
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: format !== '24h' });
    const nowIso = now.toISOString();

    const returnCount = (sale.returns?.length || 0) + 1;
    const returnNumber = `RET-${sale.invoiceNumber}-${returnCount}`;
    const returnId = `ret_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const returnedItemRecords: ReturnedItemRecord[] = [];
    let totalRefundAmount = 0;

    // Clone sale items
    const updatedSaleItems: SaleItemLine[] = sale.items.map((line) => ({ ...line }));

    for (const retItem of returnData.items) {
      if (retItem.quantity <= 0) continue;
      const saleLine = updatedSaleItems.find((i) => i.itemId === retItem.itemId);
      if (!saleLine) continue;

      const actualQtyToReturn = Math.min(retItem.quantity, saleLine.quantity);
      if (actualQtyToReturn <= 0) continue;

      // 1. ADD BACK IN STOCK
      const invIndex = this.itemsCache.findIndex((i) => i.id === retItem.itemId);
      if (invIndex !== -1) {
        this.itemsCache[invIndex].currentStock += actualQtyToReturn;
        this.itemsCache[invIndex].updatedAt = nowIso;
      }

      // 2. UPDATE SOLD UNITS AND LINE TOTAL IN THE SALE
      saleLine.quantity -= actualQtyToReturn;
      saleLine.returnedQuantity = (saleLine.returnedQuantity || 0) + actualQtyToReturn;
      saleLine.total = Math.max(0, saleLine.quantity * saleLine.soldPrice);

      const unitRefundPrice = Math.max(0, retItem.unitRefundPrice);
      const lineRefundTotal = unitRefundPrice * actualQtyToReturn;
      totalRefundAmount += lineRefundTotal;

      returnedItemRecords.push({
        itemId: retItem.itemId,
        sku: saleLine.sku,
        barcode: saleLine.barcode,
        name: saleLine.name,
        unit: saleLine.unit,
        quantity: actualQtyToReturn,
        unitRefundPrice,
        totalRefund: lineRefundTotal,
        condition: retItem.condition,
        restockedToInventory: true,
      });
    }

    if (returnedItemRecords.length === 0) {
      return { success: false, error: 'No valid items selected for return' };
    }

    const userProfileName = authService.getStoredUser()?.name;
    const returnRecord: SaleReturn = {
      id: returnId,
      returnNumber,
      date: dateStr,
      time: timeStr,
      items: returnedItemRecords,
      totalRefundAmount,
      refundMethod: 'CASH',
      reason: returnData.reason || 'Customer Return',
      notes: returnData.notes || '',
      processedBy: returnData.processedBy || userProfileName || sale.cashierName || 'Counter Cashier',
      createdAt: nowIso,
    };

    // Check remaining items in the invoice
    const remainingLines = updatedSaleItems.filter((line) => line.quantity > 0);
    const shouldDeleteInvoice = returnData.deleteInvoice || remainingLines.length === 0;

    if (shouldDeleteInvoice) {
      // All units refunded or delete requested: Delete sale invoice from history!
      this.salesCache = this.salesCache.filter((s) => s.id !== saleId);
      this.notify();
      this.persistToPcDisk();
      return { success: true, returnRecord, updatedSale: null, invoiceDeleted: true };
    } else {
      // Partial units refunded: update the existing invoice
      sale.items = remainingLines;
      sale.subtotal = sale.items.reduce((sum, line) => sum + (line.originalPrice * line.quantity), 0);
      const grossLineTotal = sale.items.reduce((sum, line) => sum + line.total, 0);
      const cappedOrderDiscount = Math.min(sale.orderDiscount || 0, grossLineTotal);
      sale.orderDiscount = cappedOrderDiscount;
      sale.totalAmount = Math.max(0, grossLineTotal - cappedOrderDiscount);
      sale.discountTotal = Math.max(0, sale.subtotal - sale.totalAmount);
      sale.returns = sale.returns ? [...sale.returns, returnRecord] : [returnRecord];
      sale.returnStatus = 'PARTIAL_RETURN';

      this.salesCache[saleIndex] = sale;
      this.notify();
      this.persistToPcDisk();
      return { success: true, returnRecord, updatedSale: sale, invoiceDeleted: false };
    }
  }

  public processSaleExchange(
    saleId: string,
    exchangeData: {
      returnedItems: {
        itemId: string;
        quantity: number;
        unitCreditPrice: number;
        condition: 'good' | 'damaged' | 'defective';
        restockedToInventory: boolean;
      }[];
      newItems: {
        itemId: string;
        quantity: number;
        pricePerUnit: number;
      }[];
      reason?: string;
      notes?: string;
      processedBy?: string;
    }
  ): {
    success: boolean;
    exchangeRecord?: SaleExchange;
    newSale?: Sale;
    oldSaleDeleted?: boolean;
    error?: string;
  } {
    const saleIndex = this.salesCache.findIndex((s) => s.id === saleId);
    if (saleIndex === -1) {
      return { success: false, error: 'Sale order not found' };
    }

    const sale = { ...this.salesCache[saleIndex] };
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const settings = this.getStoreSettings();
    const format = settings.printerSettings?.timeFormat || '12h';
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: format !== '24h' });
    const nowIso = now.toISOString();

    const exchangeCount = (sale.exchanges?.length || 0) + 1;
    const exchangeNumber = `EXC-${sale.invoiceNumber}-${exchangeCount}`;
    const exchangeId = `exc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Process returned items -> RESTOCK IN INVENTORY (+quantity)
    const returnedItemRecords: ReturnedItemRecord[] = [];
    let returnCreditTotal = 0;
    const updatedSaleItems: SaleItemLine[] = sale.items.map((line) => ({ ...line }));

    for (const ret of exchangeData.returnedItems) {
      if (ret.quantity <= 0) continue;
      const saleLine = updatedSaleItems.find((i) => i.itemId === ret.itemId);
      if (!saleLine) continue;

      const actualQtyToReturn = Math.min(ret.quantity, saleLine.quantity);
      if (actualQtyToReturn <= 0) continue;

      // Stock restores (+actualQtyToReturn)
      const invIndex = this.itemsCache.findIndex((i) => i.id === ret.itemId);
      if (invIndex !== -1) {
        this.itemsCache[invIndex].currentStock += actualQtyToReturn;
        this.itemsCache[invIndex].updatedAt = nowIso;
      }

      saleLine.quantity -= actualQtyToReturn;
      const unitCreditPrice = Math.max(0, ret.unitCreditPrice);
      const lineCredit = unitCreditPrice * actualQtyToReturn;
      returnCreditTotal += lineCredit;

      returnedItemRecords.push({
        itemId: ret.itemId,
        sku: saleLine.sku,
        barcode: saleLine.barcode,
        name: saleLine.name,
        unit: saleLine.unit,
        quantity: actualQtyToReturn,
        unitRefundPrice: unitCreditPrice,
        totalRefund: lineCredit,
        condition: ret.condition,
        restockedToInventory: true,
      });
    }

    // 2. Process newly chosen replacement items -> DEDUCT FROM INVENTORY (-quantity)
    const newItemRecords: ExchangedItemRecord[] = [];
    let newItemsTotal = 0;
    const newSaleItemLines: SaleItemLine[] = [];

    for (const newItem of exchangeData.newItems) {
      if (newItem.quantity <= 0) continue;
      const invIndex = this.itemsCache.findIndex((i) => i.id === newItem.itemId);
      if (invIndex === -1) continue;
      const invItem = this.itemsCache[invIndex];

      const price = Math.max(0, newItem.pricePerUnit);
      const lineTotal = price * newItem.quantity;
      newItemsTotal += lineTotal;

      // Deduct from inventory
      this.itemsCache[invIndex].currentStock = Math.max(0, this.itemsCache[invIndex].currentStock - newItem.quantity);
      this.itemsCache[invIndex].updatedAt = nowIso;

      newItemRecords.push({
        itemId: newItem.itemId,
        sku: invItem.sku,
        barcode: invItem.barcode,
        name: invItem.name,
        unit: invItem.unit,
        quantity: newItem.quantity,
        pricePerUnit: price,
        total: lineTotal,
      });

      newSaleItemLines.push({
        itemId: invItem.id,
        sku: invItem.sku,
        barcode: invItem.barcode,
        name: invItem.name,
        unit: invItem.unit,
        availableStock: this.itemsCache[invIndex].currentStock,
        costPrice: invItem.costPrice || 0,
        originalPrice: invItem.sellingPrice || price,
        soldPrice: price,
        quantity: newItem.quantity,
        total: lineTotal,
      });
    }

    if (returnedItemRecords.length === 0 && newItemRecords.length === 0) {
      return { success: false, error: 'No items selected for exchange' };
    }

    const netDiff = newItemsTotal - returnCreditTotal;
    let differenceType: 'CUSTOMER_PAID' | 'STORE_REFUNDED' | 'EVEN' = 'EVEN';
    if (netDiff > 0) {
      differenceType = 'CUSTOMER_PAID';
    } else if (netDiff < 0) {
      differenceType = 'STORE_REFUNDED';
    }

    const userProfileName = authService.getStoredUser()?.name;
    const exchangeRecord: SaleExchange = {
      id: exchangeId,
      exchangeNumber,
      date: dateStr,
      time: timeStr,
      returnedItems: returnedItemRecords,
      newItems: newItemRecords,
      returnCreditTotal,
      newItemsTotal,
      differenceAmount: Math.abs(netDiff),
      differenceType,
      paymentMethod: 'CASH',
      reason: exchangeData.reason || 'Product Exchange',
      notes: exchangeData.notes || '',
      processedBy: exchangeData.processedBy || userProfileName || sale.cashierName || 'Counter Cashier',
      createdAt: nowIso,
    };

    // 3. DELETE OLD SALE INVOICE (e.g. TV slip is deleted from history)
    this.salesCache = this.salesCache.filter((s) => s.id !== saleId);

    // 4. GENERATE NEW SALE INVOICE (e.g. Mobile Phone slip is generated)
    // Any remaining items from the old sale that were not returned are preserved
    const nonReturnedOldItems = updatedSaleItems.filter((line) => line.quantity > 0);
    const combinedNewItems = [...nonReturnedOldItems, ...newSaleItemLines];

    const newGrossSubtotal = combinedNewItems.reduce((sum, line) => sum + (line.originalPrice * line.quantity), 0);
    const newTotalAmount = combinedNewItems.reduce((sum, line) => sum + line.total, 0);
    const newDiscountTotal = Math.max(0, newGrossSubtotal - newTotalAmount);

    const newInvoiceNumber = this.generateNextInvoiceNumber();
    const newSaleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newSale: Sale = {
      id: newSaleId,
      invoiceNumber: newInvoiceNumber,
      date: dateStr,
      time: timeStr,
      customerName: sale.customerName || 'Walk-in Customer',
      cashierName: exchangeData.processedBy || userProfileName || sale.cashierName || 'Counter Cashier',
      paymentMethod: 'CASH',
      items: combinedNewItems,
      subtotal: newGrossSubtotal,
      discountTotal: newDiscountTotal,
      totalAmount: newTotalAmount,
      notes: `Exchanged from ${sale.invoiceNumber}. ${exchangeData.notes || ''}`.trim(),
      exchanges: [exchangeRecord],
      returnStatus: 'EXCHANGED',
      createdAt: nowIso,
    };

    // Add new sale to history
    this.salesCache.unshift(newSale);

    this.notify();
    this.persistToPcDisk();

    return { success: true, exchangeRecord, newSale, oldSaleDeleted: true };
  }

  // --- DASHBOARD METRICS ---
  public getDashboardMetrics(): DashboardMetrics {
    const items = this.getItems();
    const sales = this.getSales();

    const totalStockValueAtCost = items.reduce(
      (acc, item) => acc + item.currentStock * item.costPrice,
      0
    );
    const totalStockValueAtRetail = items.reduce(
      (acc, item) => acc + item.currentStock * item.sellingPrice,
      0
    );
    const potentialProfitInStock = totalStockValueAtRetail - totalStockValueAtCost;
    const totalInventoryUnits = items.reduce((acc, item) => acc + item.currentStock, 0);

    const lowStockItemsCount = items.filter(
      (item) => item.currentStock > 0 && item.currentStock <= item.minStockAlert
    ).length;
    const outOfStockItemsCount = items.filter((item) => item.currentStock === 0).length;

    const totalCashSales = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalSalesRevenue = totalCashSales;
    const totalSalesCount = sales.length;

    return {
      totalStockValueAtCost,
      totalStockValueAtRetail,
      potentialProfitInStock,
      totalInventoryUnits,
      totalProductsCount: items.length,
      lowStockItemsCount,
      outOfStockItemsCount,
      totalCashSales,
      totalSalesRevenue,
      totalSalesCount,
    };
  }

  // --- EASYPAISA (EP) & JAZZCASH (JC) SERVICES ---

  public getEpJcDailyRecords(): EpJcDailyRecord[] {
    return [...this.epJcRecordsCache].sort((a, b) => b.date.localeCompare(a.date));
  }

  public getEpJcDailyRecord(date: string): EpJcDailyRecord | undefined {
    return this.epJcRecordsCache.find((r) => r.date === date || r.id === date);
  }

  public async saveEpJcDailyRecord(record: Partial<EpJcDailyRecord> & { date: string }): Promise<EpJcDailyRecord> {
    const epOpening = Number(record.epOpening) || 0;
    const jcOpening = Number(record.jcOpening) || 0;
    const epJcCashOpening =
      record.epJcCashOpening !== undefined
        ? Number(record.epJcCashOpening) || 0
        : (Number(record.epCashOpening) || 0) + (Number(record.jcCashOpening) || 0);
    const customAccounts: EpJcCustomAccount[] = Array.isArray(record.customAccounts)
      ? record.customAccounts.map((ca, idx) => ({
          id: ca.id || `ca_${idx}_${Date.now()}`,
          name: (ca.name || '').trim() || `Account ${idx + 1}`,
          openingBalance: Number(ca.openingBalance) || 0,
          closingBalance: Number(ca.closingBalance) || 0,
        }))
      : [];

    const customOpening = customAccounts.reduce((sum, ca) => sum + ca.openingBalance, 0);
    const customClosing = customAccounts.reduce((sum, ca) => sum + ca.closingBalance, 0);

    const extraAddition = Number(record.extraAddition) || 0;
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

    const now = new Date().toISOString();
    const existingIndex = this.epJcRecordsCache.findIndex((r) => r.date === record.date || r.id === record.id);

    let processedRecord: EpJcDailyRecord;
    if (existingIndex >= 0) {
      const existing = this.epJcRecordsCache[existingIndex];
      processedRecord = {
        ...existing,
        ...record,
        id: existing.id,
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
        updatedAt: now,
      };
      this.epJcRecordsCache[existingIndex] = processedRecord;
    } else {
      processedRecord = {
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
        notes: record.notes || '',
        createdAt: record.createdAt || now,
        updatedAt: now,
      };
      this.epJcRecordsCache.unshift(processedRecord);
    }

    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch('/api/ep-jc/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedRecord),
      });
    } catch (e) {
      console.warn('Could not sync EP JC record to server', e);
    }

    return processedRecord;
  }

  public async deleteEpJcDailyRecord(idOrDate: string): Promise<boolean> {
    const idx = this.epJcRecordsCache.findIndex((r) => r.id === idOrDate || r.date === idOrDate);
    if (idx === -1) return false;

    this.epJcRecordsCache.splice(idx, 1);
    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch(`/api/ep-jc/daily/${encodeURIComponent(idOrDate)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Could not delete EP JC record on server', e);
    }

    return true;
  }

  public getEpJcTransactions(date?: string): EpJcTransaction[] {
    let list = [...this.epJcTxsCache];
    if (date) {
      list = list.filter((t) => t.date === date);
    }
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  public async saveEpJcTransaction(tx: Omit<EpJcTransaction, 'id' | 'createdAt'> & { id?: string }): Promise<EpJcTransaction> {
    const now = new Date().toISOString();
    const processedTx: EpJcTransaction = {
      ...tx,
      id: tx.id || `epjc_tx_${Date.now()}`,
      amount: Number(tx.amount) || 0,
      feeOrCommission: Number(tx.feeOrCommission) || 0,
      createdAt: now,
    };

    const existingIndex = this.epJcTxsCache.findIndex((t) => t.id === processedTx.id);
    if (existingIndex >= 0) {
      this.epJcTxsCache[existingIndex] = processedTx;
    } else {
      this.epJcTxsCache.unshift(processedTx);
    }

    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch('/api/ep-jc/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedTx),
      });
    } catch (e) {
      console.warn('Could not sync EP JC transaction to server', e);
    }

    return processedTx;
  }

  public async deleteEpJcTransaction(id: string): Promise<boolean> {
    const idx = this.epJcTxsCache.findIndex((t) => t.id === id);
    if (idx === -1) return false;

    this.epJcTxsCache.splice(idx, 1);
    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch(`/api/ep-jc/transaction/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Could not delete EP JC transaction on server', e);
    }

    return true;
  }

  // --- MOBILE LOAD (Jazz/Warid, Telenor, Zong, Ufone) ---
  public getLoadDailyRecords(): LoadDailyRecord[] {
    return [...this.loadRecordsCache].sort((a, b) => b.date.localeCompare(a.date));
  }

  public getLoadDailyRecordByDate(date: string): LoadDailyRecord | undefined {
    return this.loadRecordsCache.find((r) => r.date === date);
  }

  public async saveLoadDailyRecord(record: Partial<LoadDailyRecord> & { date: string }): Promise<LoadDailyRecord> {
    const now = new Date().toISOString();
    const existingIndex = this.loadRecordsCache.findIndex(
      (r) => r.date === record.date || (record.id && r.id === record.id)
    );

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
    const resultType: 'PROFIT' | 'LOSS' | 'BALANCED' =
      netDifference > 0 ? 'PROFIT' : netDifference < 0 ? 'LOSS' : 'BALANCED';

    let processedRecord: LoadDailyRecord;
    if (existingIndex >= 0) {
      const existing = this.loadRecordsCache[existingIndex];
      processedRecord = {
        ...existing,
        ...record,
        id: existing.id,
        date: record.date,
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
        updatedAt: now,
      };
      this.loadRecordsCache[existingIndex] = processedRecord;
    } else {
      processedRecord = {
        id: record.id || `load_${record.date}`,
        date: record.date,
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
        notes: record.notes || '',
        createdAt: record.createdAt || now,
        updatedAt: now,
      };
      this.loadRecordsCache.unshift(processedRecord);
    }

    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch('/api/load/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedRecord),
      });
    } catch (e) {
      console.warn('Could not sync Mobile Load record to server', e);
    }

    return processedRecord;
  }

  public async deleteLoadDailyRecord(idOrDate: string): Promise<boolean> {
    const idx = this.loadRecordsCache.findIndex((r) => r.id === idOrDate || r.date === idOrDate);
    if (idx === -1) return false;

    this.loadRecordsCache.splice(idx, 1);
    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch(`/api/load/daily/${encodeURIComponent(idOrDate)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Could not delete Mobile Load record on server', e);
    }

    return true;
  }

  public getLoadTransactions(date?: string): LoadTransaction[] {
    let list = [...this.loadTxsCache];
    if (date) {
      list = list.filter((t) => t.date === date);
    }
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  public async saveLoadTransaction(tx: Omit<LoadTransaction, 'id' | 'createdAt'> & { id?: string }): Promise<LoadTransaction> {
    const now = new Date().toISOString();
    const processedTx: LoadTransaction = {
      ...tx,
      id: tx.id || `load_tx_${Date.now()}`,
      amount: Number(tx.amount) || 0,
      commissionOrProfit: Number(tx.commissionOrProfit) || 0,
      createdAt: now,
    };

    const existingIndex = this.loadTxsCache.findIndex((t) => t.id === processedTx.id);
    if (existingIndex >= 0) {
      this.loadTxsCache[existingIndex] = processedTx;
    } else {
      this.loadTxsCache.unshift(processedTx);
    }

    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch('/api/load/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedTx),
      });
    } catch (e) {
      console.warn('Could not sync Mobile Load transaction to server', e);
    }

    return processedTx;
  }

  public async deleteLoadTransaction(id: string): Promise<boolean> {
    const idx = this.loadTxsCache.findIndex((t) => t.id === id);
    if (idx === -1) return false;

    this.loadTxsCache.splice(idx, 1);
    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch(`/api/load/transaction/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Could not delete Mobile Load transaction on server', e);
    }

    return true;
  }

  // ==========================================
  // VENDOR / SUPPLIER KHATA & PAYABLES METHODS
  // ==========================================

  public getVendors(): Vendor[] {
    return [...this.vendorsCache];
  }

  public getVendorById(id: string): Vendor | undefined {
    return this.vendorsCache.find((v) => v.id === id);
  }

  public getVendorPurchases(vendorId?: string): VendorPurchase[] {
    if (vendorId) {
      return this.vendorPurchasesCache.filter((p) => p.vendorId === vendorId);
    }
    return [...this.vendorPurchasesCache];
  }

  public getVendorPayments(vendorId?: string): VendorPayment[] {
    if (vendorId) {
      return this.vendorPaymentsCache.filter((p) => p.vendorId === vendorId);
    }
    return [...this.vendorPaymentsCache];
  }

  public recalculateVendorBalances(vendorId: string): void {
    const vIndex = this.vendorsCache.findIndex((v) => v.id === vendorId);
    if (vIndex === -1) return;

    const vendorPurchases = this.vendorPurchasesCache.filter((p) => p.vendorId === vendorId);
    const vendorPayments = this.vendorPaymentsCache.filter((p) => p.vendorId === vendorId);

    const totalBilled = vendorPurchases.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
    const totalPaid = vendorPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const currentBalance = totalBilled - totalPaid;

    this.vendorsCache[vIndex] = {
      ...this.vendorsCache[vIndex],
      totalBilled,
      totalPaid,
      currentBalance,
      updatedAt: new Date().toISOString(),
    };
  }

  public async saveVendor(vendorData: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt' | 'totalBilled' | 'totalPaid' | 'currentBalance'> & { id?: string }): Promise<Vendor> {
    const now = new Date().toISOString();
    const id = vendorData.id || `vendor_${Date.now()}`;
    const existingIndex = this.vendorsCache.findIndex((v) => v.id === id);

    const processedVendor: Vendor = {
      id,
      name: vendorData.name,
      contactPerson: vendorData.contactPerson || '',
      phone: vendorData.phone,
      email: vendorData.email || '',
      city: vendorData.city || '',
      address: vendorData.address || '',
      totalBilled: 0,
      totalPaid: 0,
      currentBalance: 0,
      notes: vendorData.notes || '',
      createdAt: existingIndex >= 0 ? this.vendorsCache[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      this.vendorsCache[existingIndex] = processedVendor;
    } else {
      this.vendorsCache.push(processedVendor);
    }

    this.recalculateVendorBalances(id);
    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedVendor),
      });
    } catch (e) {
      console.warn('Could not sync vendor to server', e);
    }

    return this.vendorsCache.find((v) => v.id === id) || processedVendor;
  }

  public async deleteVendor(id: string): Promise<boolean> {
    const idx = this.vendorsCache.findIndex((v) => v.id === id);
    if (idx === -1) return false;

    this.vendorsCache.splice(idx, 1);
    this.vendorPurchasesCache = this.vendorPurchasesCache.filter((p) => p.vendorId !== id);
    this.vendorPaymentsCache = this.vendorPaymentsCache.filter((p) => p.vendorId !== id);

    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch(`/api/vendors/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Could not delete vendor on server', e);
    }

    return true;
  }

  public async saveVendorPurchase(purchaseData: Omit<VendorPurchase, 'id' | 'createdAt' | 'status' | 'remainingAmount'> & { id?: string }): Promise<VendorPurchase> {
    const now = new Date().toISOString();
    const id = purchaseData.id || `pur_${Date.now()}`;
    const totalAmount = Number(purchaseData.totalAmount) || 0;
    const paidAmount = Number(purchaseData.paidAmount) || 0;
    const remainingAmount = Math.max(0, totalAmount - paidAmount);
    const status: 'PAID' | 'PARTIAL' | 'UNPAID' = remainingAmount === 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

    // Update or add inventory items from purchase repeater items
    const processedItems: VendorPurchaseItem[] = [];
    if (Array.isArray(purchaseData.items) && purchaseData.items.length > 0) {
      for (const pItem of purchaseData.items) {
        if (!pItem.itemName || !pItem.itemName.trim()) continue;
        const cleanName = pItem.itemName.trim();
        const costPrice = Number(pItem.costPrice) || 0;
        const salePrice = Number(pItem.salePrice) || 0;
        const qty = Number(pItem.quantity) || 0;
        const lineTotal = costPrice * qty;

        // Check if item exists in inventory (by id or exact name match)
        let existingIndex = -1;
        if (pItem.itemId) {
          existingIndex = this.itemsCache.findIndex((i) => i.id === pItem.itemId);
        }
        if (existingIndex === -1) {
          existingIndex = this.itemsCache.findIndex(
            (i) => i.name.trim().toLowerCase() === cleanName.toLowerCase()
          );
        }

        if (existingIndex !== -1) {
          // Existing item in inventory: update stock and prices
          const existing = this.itemsCache[existingIndex];
          const newStock = Math.max(0, (existing.currentStock || 0) + qty);
          const updatedItem: InventoryItem = {
            ...existing,
            currentStock: newStock,
            costPrice: costPrice > 0 ? costPrice : existing.costPrice,
            sellingPrice: salePrice > 0 ? salePrice : existing.sellingPrice,
            updatedAt: now,
          };
          this.itemsCache[existingIndex] = updatedItem;

          processedItems.push({
            itemId: existing.id,
            itemName: existing.name,
            costPrice,
            salePrice: salePrice > 0 ? salePrice : existing.sellingPrice,
            quantity: qty,
            totalCost: lineTotal,
            isNewItem: false,
          });
        } else {
          // New item: automatically add to inventory
          const newItemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const randomSkuSuffix = Math.floor(1000 + Math.random() * 9000);
          const newItem: InventoryItem = {
            id: newItemId,
            sku: `ACC-${randomSkuSuffix}`,
            barcode: `890100${String(this.itemsCache.length + 1).padStart(5, '0')}`,
            name: cleanName,
            category: 'Accessories',
            unit: 'pcs',
            costPrice: costPrice,
            sellingPrice: salePrice > 0 ? salePrice : Math.round(costPrice * 1.3),
            currentStock: qty,
            minStockAlert: 5,
            notes: `Added from Vendor Purchase Bill: ${purchaseData.billNumber} (${purchaseData.vendorName})`,
            createdAt: now,
            updatedAt: now,
          };
          this.itemsCache.push(newItem);

          processedItems.push({
            itemId: newItemId,
            itemName: cleanName,
            costPrice,
            salePrice: newItem.sellingPrice,
            quantity: qty,
            totalCost: lineTotal,
            isNewItem: true,
          });
        }
      }
    }

    // Auto-generate itemsDescription if not explicitly provided or if items exist
    let itemsDescription = purchaseData.itemsDescription || '';
    if (processedItems.length > 0) {
      itemsDescription = processedItems
        .map((p) => `${p.itemName} (${p.quantity}x @ Rs. ${p.costPrice.toLocaleString()})`)
        .join(', ');
    }

    const processedPurchase: VendorPurchase = {
      ...purchaseData,
      id,
      itemsDescription: itemsDescription || 'Stock / Items Purchase',
      items: processedItems.length > 0 ? processedItems : purchaseData.items,
      totalAmount,
      paidAmount,
      remainingAmount,
      status,
      createdAt: now,
    };

    const existingIndex = this.vendorPurchasesCache.findIndex((p) => p.id === id);
    if (existingIndex >= 0) {
      this.vendorPurchasesCache[existingIndex] = processedPurchase;
    } else {
      this.vendorPurchasesCache.unshift(processedPurchase);

      // If new purchase and user paid upfront, record initial payment record
      if (paidAmount > 0) {
        const upfrontPayment: VendorPayment = {
          id: `vpay_upfront_${Date.now()}`,
          vendorId: purchaseData.vendorId,
          vendorName: purchaseData.vendorName,
          purchaseId: id,
          billNumber: purchaseData.billNumber,
          date: purchaseData.date,
          time: new Date().toTimeString().substring(0, 5),
          amount: paidAmount,
          paymentMethod: purchaseData.paymentMethod || 'CASH',
          referenceNumber: purchaseData.paymentRef || 'Initial Down-Payment',
          notes: `Upfront payment made at time of purchase (${purchaseData.itemsDescription || 'Accessories/Items'})`,
          createdAt: now,
        };
        this.vendorPaymentsCache.unshift(upfrontPayment);
      }
    }

    this.recalculateVendorBalances(purchaseData.vendorId);
    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch('/api/vendors/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedPurchase),
      });
    } catch (e) {
      console.warn('Could not sync vendor purchase to server', e);
    }

    return processedPurchase;
  }

  public async deleteVendorPurchase(id: string): Promise<boolean> {
    const purchase = this.vendorPurchasesCache.find((p) => p.id === id);
    if (!purchase) return false;

    const vendorId = purchase.vendorId;
    this.vendorPurchasesCache = this.vendorPurchasesCache.filter((p) => p.id !== id);
    this.vendorPaymentsCache = this.vendorPaymentsCache.filter((p) => p.purchaseId !== id);

    this.recalculateVendorBalances(vendorId);
    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch(`/api/vendors/purchases/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Could not delete vendor purchase on server', e);
    }

    return true;
  }

  public async saveVendorPayment(paymentData: Omit<VendorPayment, 'id' | 'createdAt'> & { id?: string }): Promise<VendorPayment> {
    const now = new Date().toISOString();
    const id = paymentData.id || `vpay_${Date.now()}`;
    const amount = Number(paymentData.amount) || 0;

    const processedPayment: VendorPayment = {
      ...paymentData,
      id,
      amount,
      createdAt: now,
    };

    const existingIndex = this.vendorPaymentsCache.findIndex((p) => p.id === id);
    if (existingIndex >= 0) {
      this.vendorPaymentsCache[existingIndex] = processedPayment;
    } else {
      this.vendorPaymentsCache.unshift(processedPayment);
    }

    this.recalculateVendorBalances(paymentData.vendorId);
    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch('/api/vendors/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedPayment),
      });
    } catch (e) {
      console.warn('Could not sync vendor payment to server', e);
    }

    return processedPayment;
  }

  public async deleteVendorPayment(id: string): Promise<boolean> {
    const payment = this.vendorPaymentsCache.find((p) => p.id === id);
    if (!payment) return false;

    const vendorId = payment.vendorId;
    this.vendorPaymentsCache = this.vendorPaymentsCache.filter((p) => p.id !== id);

    this.recalculateVendorBalances(vendorId);
    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch(`/api/vendors/payments/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Could not delete vendor payment on server', e);
    }

    return true;
  }

  // --- EXPENSE MANAGEMENT ---
  public getExpenses(): ExpenseItem[] {
    return [...this.expensesCache].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.time || '').localeCompare(a.time || '');
    });
  }

  public getExpensesByDate(date: string): ExpenseItem[] {
    return this.expensesCache
      .filter((e) => e.date === date)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }

  public async saveExpense(
    expenseData: Partial<ExpenseItem> & { date: string; amount: number; reason: string }
  ): Promise<ExpenseItem> {
    const id = expenseData.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    const timeStr = expenseData.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const processedExpense: ExpenseItem = {
      id,
      date: expenseData.date,
      time: timeStr,
      amount: Math.max(0, Number(expenseData.amount) || 0),
      reason: String(expenseData.reason || '').trim(),
      category: expenseData.category || 'Other',
      paymentMethod: expenseData.paymentMethod || 'CASH',
      recordedBy: expenseData.recordedBy || 'Admin',
      notes: expenseData.notes || '',
      createdAt: expenseData.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const idx = this.expensesCache.findIndex((e) => e.id === id);
    if (idx >= 0) {
      this.expensesCache[idx] = processedExpense;
    } else {
      this.expensesCache.unshift(processedExpense);
    }

    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedExpense),
      });
    } catch (e) {
      console.warn('Could not sync expense to server', e);
    }

    return processedExpense;
  }

  public async saveDailyExpenses(
    date: string,
    items: Array<{
      id?: string;
      amount: number;
      reason: string;
      category?: string;
      paymentMethod?: ExpensePaymentMethod;
      notes?: string;
      time?: string;
    }>
  ): Promise<ExpenseItem[]> {
    const now = new Date();
    const otherExpenses = this.expensesCache.filter((e) => e.date !== date);
    const validItems = items.filter(
      (it) => it && (Number(it.amount) > 0 || (it.reason && it.reason.trim().length > 0))
    );

    const newDayExpenses: ExpenseItem[] = validItems.map((it, idx) => {
      const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      return {
        id: it.id || `exp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        date,
        time: it.time || defaultTime,
        amount: Math.max(0, Number(it.amount) || 0),
        reason: String(it.reason || '').trim(),
        category: it.category || 'Other',
        paymentMethod: it.paymentMethod || 'CASH',
        recordedBy: 'Admin',
        notes: it.notes || '',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    });

    this.expensesCache = [...newDayExpenses, ...otherExpenses];
    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch('/api/expenses/day-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, items: newDayExpenses }),
      });
    } catch (e) {
      console.warn('Could not sync daily expenses bulk to server', e);
    }

    return newDayExpenses;
  }

  public async deleteExpense(id: string): Promise<boolean> {
    const exists = this.expensesCache.some((e) => e.id === id);
    if (!exists) return false;

    this.expensesCache = this.expensesCache.filter((e) => e.id !== id);
    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch(`/api/expenses/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Could not delete expense on server', e);
    }

    return true;
  }

  public async deleteDailyExpenses(date: string): Promise<boolean> {
    this.expensesCache = this.expensesCache.filter((e) => e.date !== date);
    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch(`/api/expenses/date/${encodeURIComponent(date)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Could not delete daily expenses on server', e);
    }

    return true;
  }

  // --- SYSTEM STORAGE BACKUP & RESTORE ---
  public exportSystemStorageJSON(): string {
    const bundle = {
      exportTimestamp: new Date().toISOString(),
      app: 'Offline Stock Management System',
      version: '4.0.0',
      storageType: 'PC_DISK_FILE',
      filePath: this.pcFilePath,
      data: {
        items: this.getItems(),
        sales: this.getSales(),
        settings: this.getStoreSettings(),
        epJcDailyRecords: this.getEpJcDailyRecords(),
        epJcTransactions: this.getEpJcTransactions(),
        loadDailyRecords: this.getLoadDailyRecords(),
        loadTransactions: this.getLoadTransactions(),
        vendors: this.getVendors(),
        vendorPurchases: this.getVendorPurchases(),
        vendorPayments: this.getVendorPayments(),
        expenses: this.getExpenses(),
        cashbookAccounts: this.getCashBookAccounts(),
        cashbookTransactions: this.getCashBookTransactions(),
        protectors: this.getProtectors(),
      },
    };
    return JSON.stringify(bundle, null, 2);
  }

  public async importSystemStorageJSON(jsonString: string): Promise<{ success: boolean; error?: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      const items = parsed.data?.items || parsed.items;
      const sales = parsed.data?.sales || parsed.sales;
      const settings = parsed.data?.settings || parsed.settings;
      const epJcRecords = parsed.data?.epJcDailyRecords || parsed.epJcDailyRecords;
      const epJcTxs = parsed.data?.epJcTransactions || parsed.epJcTransactions;
      const loadRecords = parsed.data?.loadDailyRecords || parsed.loadDailyRecords;
      const loadTxs = parsed.data?.loadTransactions || parsed.loadTransactions;
      const vendors = parsed.data?.vendors || parsed.vendors;
      const vendorPurchases = parsed.data?.vendorPurchases || parsed.vendorPurchases;
      const vendorPayments = parsed.data?.vendorPayments || parsed.vendorPayments;
      const expenses = parsed.data?.expenses || parsed.expenses;
      const cashbookAccounts = parsed.data?.cashbookAccounts || parsed.cashbookAccounts;
      const cashbookTransactions = parsed.data?.cashbookTransactions || parsed.cashbookTransactions;
      const protectors = parsed.data?.protectors || parsed.protectors;

      if (!Array.isArray(items)) {
        return { success: false, error: 'Invalid file format: Missing items array.' };
      }

      this.itemsCache = items;
      this.salesCache = Array.isArray(sales) ? sales : [];
      if (settings && typeof settings === 'object') {
        this.settingsCache = { ...DEFAULT_STORE_SETTINGS, ...settings };
      }
      if (Array.isArray(epJcRecords)) {
        this.epJcRecordsCache = epJcRecords;
      }
      if (Array.isArray(epJcTxs)) {
        this.epJcTxsCache = epJcTxs;
      }
      if (Array.isArray(loadRecords)) {
        this.loadRecordsCache = loadRecords;
      }
      if (Array.isArray(loadTxs)) {
        this.loadTxsCache = loadTxs;
      }
      if (Array.isArray(vendors)) {
        this.vendorsCache = vendors;
      }
      if (Array.isArray(vendorPurchases)) {
        this.vendorPurchasesCache = vendorPurchases;
      }
      if (Array.isArray(vendorPayments)) {
        this.vendorPaymentsCache = vendorPayments;
      }
      if (Array.isArray(expenses)) {
        this.expensesCache = expenses;
      }
      if (Array.isArray(cashbookAccounts)) {
        this.cashbookAccountsCache = cashbookAccounts;
      }
      if (Array.isArray(cashbookTransactions)) {
        this.cashbookTxsCache = cashbookTransactions;
      }
      if (Array.isArray(protectors)) {
        this.protectorsCache = protectors;
      }

      this.saveToLocalCache();
      this.notify();
      await this.persistToPcDisk();

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Malformed JSON file' };
    }
  }

  public async resetToSampleData(): Promise<void> {
    this.itemsCache = [...INITIAL_ITEMS];
    this.salesCache = [...INITIAL_SALES];
    this.settingsCache = { ...DEFAULT_STORE_SETTINGS };
    this.epJcRecordsCache = [...INITIAL_EPJC_RECORDS];
    this.epJcTxsCache = [...INITIAL_EPJC_TXS];
    this.loadRecordsCache = [...INITIAL_LOAD_RECORDS];
    this.loadTxsCache = [...INITIAL_LOAD_TXS];
    this.vendorsCache = [...INITIAL_VENDORS];
    this.vendorPurchasesCache = [...INITIAL_VENDOR_PURCHASES];
    this.vendorPaymentsCache = [...INITIAL_VENDOR_PAYMENTS];
    this.expensesCache = [...INITIAL_EXPENSES];
    this.cashbookAccountsCache = [...INITIAL_CASHBOOK_ACCOUNTS];
    this.cashbookTxsCache = [...INITIAL_CASHBOOK_TXS];
    this.protectorsCache = [...INITIAL_PROTECTORS];

    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pos_categories_cleared');
        localStorage.removeItem('pos_brands_cleared');
        window.dispatchEvent(new CustomEvent('pos_categories_reset'));
        window.dispatchEvent(new CustomEvent('pos_brands_reset'));
      }
    } catch {
      // ignore
    }

    this.saveToLocalCache();
    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch('/api/backup/reset', { method: 'POST' });
    } catch (e) {
      console.warn('Reset API call error', e);
    }
  }

  public async clearAllData(): Promise<void> {
    this.itemsCache = [];
    this.salesCache = [];
    this.epJcRecordsCache = [];
    this.epJcTxsCache = [];
    this.loadRecordsCache = [];
    this.loadTxsCache = [];
    this.vendorsCache = [];
    this.vendorPurchasesCache = [];
    this.vendorPaymentsCache = [];
    this.expensesCache = [];
    this.cashbookAccountsCache = [];
    this.cashbookTxsCache = [];
    this.protectorsCache = [];

    // Erase all custom and saved categories and brands so user can enter only their own categories and brands
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pos_custom_categories');
        localStorage.removeItem('pos_custom_brands');
        localStorage.setItem('pos_categories_cleared', 'true');
        localStorage.setItem('pos_brands_cleared', 'true');
        window.dispatchEvent(new CustomEvent('pos_categories_cleared'));
        window.dispatchEvent(new CustomEvent('pos_brands_cleared'));
      }
    } catch {
      // ignore
    }

    this.saveToLocalCache();
    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch('/api/backup/clear', { method: 'POST' });
    } catch (e) {
      console.warn('Clear API call error', e);
    }
  }

  public isCategoriesCleared(): boolean {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('pos_categories_cleared') === 'true';
    } catch {
      return false;
    }
  }

  public isBrandsCleared(): boolean {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('pos_brands_cleared') === 'true';
    } catch {
      return false;
    }
  }

  public clearAllCategories(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pos_custom_categories');
        localStorage.setItem('pos_categories_cleared', 'true');
        window.dispatchEvent(new CustomEvent('pos_categories_cleared'));
      }
    } catch {
      // ignore
    }
  }

  public clearAllBrands(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pos_custom_brands');
        localStorage.setItem('pos_brands_cleared', 'true');
        window.dispatchEvent(new CustomEvent('pos_brands_cleared'));
      }
    } catch {
      // ignore
    }
  }

  // ==========================================
  // Cash Book & Khata Ledger Methods
  // ==========================================

  public getCashBookAccounts(): CashBookAccount[] {
    return [...this.cashbookAccountsCache];
  }

  public getCashBookTransactions(): CashBookTransaction[] {
    return [...this.cashbookTxsCache];
  }

  public async saveCashBookAccount(account: Partial<CashBookAccount> & { name: string }): Promise<CashBookAccount> {
    const id = account.id || `cb_acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const existingIdx = this.cashbookAccountsCache.findIndex((a) => a.id === id);

    // Calculate totals from existing transactions if any
    const accountTxs = this.cashbookTxsCache.filter((t) => t.accountId === id);
    const totalBorrowed = accountTxs
      .filter((t) => t.type === 'BORROWED')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), account.totalBorrowed || 0);
    const totalPaid = accountTxs
      .filter((t) => t.type === 'PAID')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), account.totalPaid || 0);

    const processed: CashBookAccount = {
      id,
      name: account.name.trim(),
      phone: account.phone?.trim() || '',
      partyType: account.partyType === 'MY_BORROWING' ? 'MY_BORROWING' : 'CUSTOMER',
      notes: account.notes?.trim() || '',
      address: account.address?.trim() || '',
      totalBorrowed,
      totalPaid,
      remainingBalance: totalBorrowed - totalPaid,
      lastTransactionDate: account.lastTransactionDate || new Date().toISOString().split('T')[0],
      createdAt: account.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      this.cashbookAccountsCache[existingIdx] = processed;
    } else {
      this.cashbookAccountsCache.unshift(processed);
    }

    try {
      await fetch('/api/cashbook/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processed),
      });
    } catch (e) {
      console.warn('Backend cashbook account sync error:', e);
    }

    await this.persistToPcDisk();
    this.notify();
    return processed;
  }

  public async deleteCashBookAccount(id: string): Promise<boolean> {
    this.cashbookAccountsCache = this.cashbookAccountsCache.filter((a) => a.id !== id);
    this.cashbookTxsCache = this.cashbookTxsCache.filter((t) => t.accountId !== id);

    try {
      await fetch(`/api/cashbook/account/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Backend delete cashbook account failed:', e);
    }

    await this.persistToPcDisk();
    this.notify();
    return true;
  }

  public async addCashBookTransaction(
    tx: Omit<CashBookTransaction, 'id' | 'createdAt'>
  ): Promise<CashBookTransaction> {
    const id = `cb_tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const acc = this.cashbookAccountsCache.find((a) => a.id === tx.accountId);
    if (!acc) throw new Error('Account not found');

    const amount = Math.max(0, Number(tx.amount) || 0);
    const isPaid = tx.type === 'PAID';

    const newBorrowed = isPaid ? acc.totalBorrowed : acc.totalBorrowed + amount;
    const newPaid = isPaid ? acc.totalPaid + amount : acc.totalPaid;
    const newRemaining = newBorrowed - newPaid;

    const newTx: CashBookTransaction = {
      ...tx,
      id,
      amount,
      accountName: acc.name,
      partyType: acc.partyType,
      type: isPaid ? 'PAID' : 'BORROWED',
      runningBalance: newRemaining,
      createdAt: new Date().toISOString(),
    };

    this.cashbookTxsCache.unshift(newTx);

    // Update account totals
    acc.totalBorrowed = newBorrowed;
    acc.totalPaid = newPaid;
    acc.remainingBalance = newRemaining;
    acc.lastTransactionDate = tx.date;
    acc.updatedAt = new Date().toISOString();

    const accIdx = this.cashbookAccountsCache.findIndex((a) => a.id === acc.id);
    if (accIdx >= 0) {
      this.cashbookAccountsCache[accIdx] = { ...acc };
    }

    try {
      await fetch('/api/cashbook/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx),
      });
    } catch (e) {
      console.warn('Backend cashbook transaction sync failed:', e);
    }

    await this.persistToPcDisk();
    this.notify();
    return newTx;
  }

  public async deleteCashBookTransaction(id: string): Promise<boolean> {
    const tx = this.cashbookTxsCache.find((t) => t.id === id);
    if (!tx) return false;

    this.cashbookTxsCache = this.cashbookTxsCache.filter((t) => t.id !== id);

    // Recalculate account
    const acc = this.cashbookAccountsCache.find((a) => a.id === tx.accountId);
    if (acc) {
      const remainingTxs = this.cashbookTxsCache.filter((t) => t.accountId === acc.id);
      const totalBorrowed = remainingTxs
        .filter((t) => t.type === 'BORROWED')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const totalPaid = remainingTxs
        .filter((t) => t.type === 'PAID')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      acc.totalBorrowed = totalBorrowed;
      acc.totalPaid = totalPaid;
      acc.remainingBalance = totalBorrowed - totalPaid;
      acc.updatedAt = new Date().toISOString();

      const accIdx = this.cashbookAccountsCache.findIndex((a) => a.id === acc.id);
      if (accIdx >= 0) {
        this.cashbookAccountsCache[accIdx] = { ...acc };
      }
    }

    try {
      await fetch(`/api/cashbook/transaction/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Backend delete transaction failed:', e);
    }

    await this.persistToPcDisk();
    this.notify();
    return true;
  }

  // ==========================================
  // Screen Protectors & Mobile Models Methods
  // ==========================================

  public getProtectors(): ScreenProtector[] {
    return [...this.protectorsCache];
  }

  public getProtectorById(id: string): ScreenProtector | undefined {
    return this.protectorsCache.find((p) => p.id === id);
  }

  public async saveProtector(
    protectorData: Partial<ScreenProtector> & { name: string }
  ): Promise<ScreenProtector> {
    const now = new Date().toISOString();
    const id = protectorData.id || `prot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const currentUser = authService.getStoredUser();
    const createdBy = protectorData.createdBy || currentUser?.name || 'Admin';

    // Normalize brands and models (trim, remove duplicates, ignore blanks)
    const normalizedBrands: ProtectorBrandCompatibility[] = (protectorData.compatibleBrands || [])
      .map((b) => ({
        brand: (b.brand || '').trim(),
        models: Array.from(
          new Set(
            (b.models || [])
              .map((m) => (m || '').trim())
              .filter((m) => m.length > 0)
          )
        ),
      }))
      .filter((b) => b.brand.length > 0 && b.models.length > 0);

    const processedProtector: ScreenProtector = {
      id,
      name: protectorData.name.trim(),
      category: protectorData.category?.trim() || '9D Super Tempered Glass',
      material: protectorData.material?.trim() || 'Tempered Glass',
      defaultPrice: Math.max(0, Number(protectorData.defaultPrice) || 0),
      compatibleBrands: normalizedBrands,
      notes: protectorData.notes?.trim() || '',
      createdBy,
      createdAt: protectorData.createdAt || now,
      updatedAt: now,
    };

    const idx = this.protectorsCache.findIndex((p) => p.id === id);
    if (idx >= 0) {
      this.protectorsCache[idx] = processedProtector;
    } else {
      this.protectorsCache.unshift(processedProtector);
    }

    this.saveToLocalCache();
    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch('/api/protectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedProtector),
      });
    } catch (e) {
      console.warn('Could not sync protector to server', e);
    }

    return processedProtector;
  }

  public async deleteProtector(id: string): Promise<boolean> {
    const exists = this.protectorsCache.some((p) => p.id === id);
    if (!exists) return false;

    this.protectorsCache = this.protectorsCache.filter((p) => p.id !== id);
    this.saveToLocalCache();
    this.notify();
    await this.persistToPcDisk();

    try {
      await fetch(`/api/protectors/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Could not delete protector on server', e);
    }

    return true;
  }

  public async addModelToProtector(
    protectorId: string,
    brandName: string,
    modelName: string
  ): Promise<ScreenProtector | null> {
    const cleanBrand = brandName.trim();
    const cleanModel = modelName.trim();
    if (!cleanBrand || !cleanModel) return null;

    const protector = this.protectorsCache.find((p) => p.id === protectorId);
    if (!protector) return null;

    const brandIndex = protector.compatibleBrands.findIndex(
      (b) => b.brand.toLowerCase() === cleanBrand.toLowerCase()
    );

    let updatedBrands: ProtectorBrandCompatibility[];
    if (brandIndex >= 0) {
      const existing = protector.compatibleBrands[brandIndex];
      if (!existing.models.some((m) => m.toLowerCase() === cleanModel.toLowerCase())) {
        const updatedBrand = {
          ...existing,
          models: [...existing.models, cleanModel],
        };
        updatedBrands = [...protector.compatibleBrands];
        updatedBrands[brandIndex] = updatedBrand;
      } else {
        return protector;
      }
    } else {
      updatedBrands = [
        ...protector.compatibleBrands,
        { brand: cleanBrand, models: [cleanModel] },
      ];
    }

    return this.saveProtector({
      ...protector,
      compatibleBrands: updatedBrands,
    });
  }

  public async removeModelFromProtector(
    protectorId: string,
    brandName: string,
    modelName: string
  ): Promise<ScreenProtector | null> {
    const protector = this.protectorsCache.find((p) => p.id === protectorId);
    if (!protector) return null;

    const updatedBrands = protector.compatibleBrands
      .map((b) => {
        if (b.brand.toLowerCase() === brandName.trim().toLowerCase()) {
          return {
            ...b,
            models: b.models.filter((m) => m.toLowerCase() !== modelName.trim().toLowerCase()),
          };
        }
        return b;
      })
      .filter((b) => b.models.length > 0);

    return this.saveProtector({
      ...protector,
      compatibleBrands: updatedBrands,
    });
  }

  public getAllProtectorBrands(): string[] {
    const brandSet = new Set<string>();
    const standardBrands = [
      'Oppo',
      'Realme',
      'Samsung',
      'Vivo',
      'Xiaomi',
      'Infinix',
      'Tecno',
      'Apple',
      'Huawei',
      'OnePlus',
      'Google Pixel',
      'Nokia',
      'Honor',
      'Motorola',
    ];
    standardBrands.forEach((b) => brandSet.add(b));

    this.protectorsCache.forEach((p) => {
      p.compatibleBrands.forEach((b) => {
        if (b.brand && b.brand.trim()) {
          brandSet.add(b.brand.trim());
        }
      });
    });

    return Array.from(brandSet);
  }

  public getStorageUsageKB(): number {
    const str = JSON.stringify({
      items: this.itemsCache,
      sales: this.salesCache,
    });
    return Math.round((str.length * 2) / 1024);
  }
}

export const storage = new StorageService();
