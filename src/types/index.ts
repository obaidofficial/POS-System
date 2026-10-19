export interface InventoryItem {
  id: string;
  sku: string;
  barcode?: string; // Barcode / UPC / EAN for physical scanning
  name: string;
  category: string;
  brand?: string; // Brand (e.g. Apple, Samsung, Anker, Ronin, etc.)
  unit: string; // e.g. pcs, box, kg, liter
  costPrice: number; // purchase price per unit
  sellingPrice: number; // retail price per unit
  currentStock: number;
  minStockAlert: number; // low-stock alert threshold
  location?: string; // warehouse aisle or shelf
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'CASH';

export interface SaleItemLine {
  itemId: string;
  sku: string;
  barcode?: string;
  name: string;
  category?: string;
  brand?: string;
  unit: string;
  availableStock: number;
  costPrice: number;
  originalPrice?: number; // Regular catalog/item price before discount in PKR (e.g. 2000)
  discountPerUnit?: number; // Discount per unit in PKR (e.g. 200)
  discountType?: 'fixed' | 'percentage'; // Discount unit: 'fixed' PKR or 'percentage' %
  discountPercent?: number; // Percentage discount if applicable (e.g. 10%)
  soldPrice: number; // Final discounted selling price per unit in PKR (e.g. 1800)
  quantity: number;
  total: number; // quantity * soldPrice
  returnedQuantity?: number; // Quantity returned or exchanged from this line
}

export interface ReturnedItemRecord {
  itemId: string;
  sku: string;
  barcode?: string;
  name: string;
  unit: string;
  quantity: number;
  unitRefundPrice: number;
  totalRefund: number;
  condition: 'good' | 'damaged' | 'defective';
  restockedToInventory: boolean;
}

export interface SaleReturn {
  id: string; // e.g. "ret_..."
  returnNumber: string; // e.g. "RET-INV-10928-1"
  date: string; // YYYY-MM-DD
  time?: string;
  items: ReturnedItemRecord[];
  totalRefundAmount: number;
  refundMethod: 'CASH';
  reason?: string;
  notes?: string;
  processedBy?: string;
  createdAt: string;
}

export interface ExchangedItemRecord {
  itemId: string;
  sku: string;
  barcode?: string;
  name: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
}

export interface SaleExchange {
  id: string; // e.g. "exc_..."
  exchangeNumber: string; // e.g. "EXC-INV-10928-1"
  date: string; // YYYY-MM-DD
  time?: string;
  returnedItems: ReturnedItemRecord[];
  newItems: ExchangedItemRecord[];
  returnCreditTotal: number; // Value of returned items credited
  newItemsTotal: number; // Value of newly taken replacement items
  differenceAmount: number; // Absolute value difference
  differenceType: 'CUSTOMER_PAID' | 'STORE_REFUNDED' | 'EVEN';
  paymentMethod?: 'CASH';
  reason?: string;
  notes?: string;
  processedBy?: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string; // e.g. "INV-10928"
  date: string; // YYYY-MM-DD
  time?: string; // e.g. "02:45 PM"
  customerName: string;
  cashierName?: string; // Cashier / Salesperson name who processed this sale
  paymentMethod: PaymentMethod;
  items: SaleItemLine[];
  subtotal: number; // Gross total before discounts (sum of originalPrice * quantity)
  discountTotal?: number; // Total discount given in PKR (line item discounts + order discount)
  orderDiscount?: number; // Optional overall invoice level discount in PKR
  totalAmount: number; // Final net total payable in PKR (subtotal - discountTotal)
  notes?: string;
  returnStatus?: 'NONE' | 'PARTIAL_RETURN' | 'FULLY_RETURNED' | 'EXCHANGED' | 'PARTIAL_EXCHANGE';
  returns?: SaleReturn[];
  exchanges?: SaleExchange[];
  createdAt: string;
}

export interface DashboardMetrics {
  totalStockValueAtCost: number;
  totalStockValueAtRetail: number;
  potentialProfitInStock: number;
  totalInventoryUnits: number;
  totalProductsCount: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  totalCashSales: number;
  totalSalesRevenue: number;
  totalSalesCount: number;
}

export interface StorageInfo {
  storageType: string;
  absolutePath: string;
  relativePath: string;
  fileSizeBytes: number;
  fileSizeKB: string;
  lastModified: string;
  totalItems: number;
  totalSales: number;
  isPersistedToPc: boolean;
}

export type UserRole = 'admin' | 'worker';
export type UserPermission = 'sales' | 'epjc' | 'load' | 'protectors' | 'expenses' | 'cashbook';

export interface AuthUser {
  id?: string;
  username: string;
  name: string;
  role?: UserRole;
  permissions?: UserPermission[];
  photo?: string;
  twoFactorEmail?: string;
  twoFactorMobile?: string;
  createdAt?: string;
}

export interface ManagedUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  permissions: UserPermission[];
  photo?: string;
  twoFactorEmail?: string;
  twoFactorMobile?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PrinterModelPreset =
  | 'bc-96ac'        // BC-96AC Mini Printer (58mm Thermal Roll)
  | 'thermal-58mm'   // Generic 58mm / 57mm Thermal POS Slip Printer
  | 'thermal-80mm'   // 80mm / 3-inch POS Thermal Receipt Printer
  | 'a4'             // A4 Standard Laser / Inkjet Printer (Full Sheet)
  | 'a5'             // A5 Compact Half-Sheet Printer
  | 'custom';        // Custom Width Thermal / POS Printer

export type InvoicePaperSize = '58mm' | '80mm' | 'a4' | 'a5' | 'custom';

export interface PrinterSettings {
  printerPreset: PrinterModelPreset;
  printerName: string; // e.g. "BC-96AC Mini Printer"
  paperSize: InvoicePaperSize;
  customWidthMm?: number; // Custom paper width in mm (e.g. 48, 58, 72, 80)
  printCopies: number; // Number of copies to print (1 = single, 2 = Customer + Store, etc.)
  copyLabelsEnabled: boolean; // Show "Customer Copy", "Store Copy", "Accounts Copy" headers
  autoPrintOnSale: boolean; // Automatically generate and trigger printout upon completing sale
  autoCutFeedLines: number; // Blank lines to feed after footer for clean tear / auto-cut (0, 2, 3, 4, 6)
  showLogoOnSlip: boolean; // Print company logo on receipt
  showBarcodeOnSlip: boolean; // Print barcode/SKU per line item
  showInvoiceBarcode: boolean; // Print scannable Code128 barcode for invoice number
  showCashierName: boolean; // Print cashier / salesperson name
  cashierName?: string; // Default or custom cashier name to show on invoice slip
  showTimeOnSlip: boolean; // Print transaction time on invoice slip
  timeFormat?: '12h' | '24h'; // Time display format (12-hour AM/PM vs 24-hour)
  fontSize: 'compact' | 'normal' | 'large'; // Print font density
  darkPrintOptimization: boolean; // Force 100% solid dark black text and borders for thermal heads
  invoicePrefix?: string; // Prefix for invoice number (default "INV-")
}

export interface StoreSettings {
  brandName: string;
  logoUrl?: string;
  // Details to add above the invoice slip
  phoneNumber: string;
  phoneNumbers?: string[];
  address: string;
  headerBriefText: string;
  // Details to add below the invoice slip
  footerBriefText: string;
  returnPolicyText: string;
  returnPolicies?: string[];
  supportContact: string;
  // Barcode Scanning Configuration
  barcodeEnabled?: boolean;
  // Auto Print Slip Configuration
  autoPrintSlip?: boolean; // Automatically generate and trigger printout upon completing sale
  // Comprehensive Printer & Invoice Sizing Settings
  printerSettings?: PrinterSettings;
}

export type EpJcServiceType = 'EASYPAISA' | 'JAZZCASH';
export type EpJcTxType = 'TRANSFER' | 'WITHDRAW'; // TRANSFER (Cash In / Send to customer account), WITHDRAW (Cash Out / Cash given to customer)

export interface EpJcCustomAccount {
  id: string;
  name: string; // Bank or Account Name e.g. "Meezan Bank", "SadaPay", "HBL", etc.
  openingBalance: number;
  closingBalance: number;
}

export interface EpJcDailyRecord {
  id: string; // e.g. "epjc_2026-09-21"
  date: string; // YYYY-MM-DD
  
  // Opening Balances
  epOpening: number;          // EasyPaisa App/Account Digital Opening Balance (PKR)
  jcOpening: number;          // JazzCash App/Account Digital Opening Balance (PKR)
  epJcCashOpening: number;    // EP and JC Cash Opening (PKR) (Combined physical cash in hand)
  epCashOpening?: number;     // Legacy individual EP Cash in hand Opening (PKR)
  jcCashOpening?: number;     // Legacy individual JC Cash in hand Opening (PKR)
  extraAddition?: number;     // Extra Addition in Opening (Load / Capital reload)
  customAccounts?: EpJcCustomAccount[]; // Custom Bank / Digital Accounts (e.g. Meezan Bank, SadaPay, HBL)
  totalOpening: number;       // epOpening + jcOpening + epJcCashOpening + extraAddition + sum(customAccounts.opening)

  // Closing Balances
  epClosing: number;          // EasyPaisa App/Account Digital Closing Balance (PKR)
  jcClosing: number;          // JazzCash App/Account Digital Closing Balance (PKR)
  epJcCashClosing: number;    // EP and JC Cash Closing (PKR) (Combined physical cash in hand)
  epCashClosing?: number;     // Legacy individual EP Cash in hand Closing (PKR)
  jcCashClosing?: number;     // Legacy individual JC Cash in hand Closing (PKR)
  epJcExpense?: number;       // EP/JC Expense in Closing (Operating expenses from EP/JC cash)
  totalClosing: number;       // epClosing + jcClosing + epJcCashClosing + epJcExpense + sum(customAccounts.closing)

  // Calculated Net & Result
  netDifference: number;  // totalClosing - totalOpening
  resultType: 'PROFIT' | 'LOSS' | 'BALANCED'; // PROFIT if totalClosing > totalOpening, LOSS if totalClosing < totalOpening

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EpJcTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  service: EpJcServiceType; // 'EASYPAISA' | 'JAZZCASH'
  type: EpJcTxType; // 'TRANSFER' (Send/Cash In) | 'WITHDRAW' (Cash Out)
  customerMobile: string; // 03XXXXXXXXX
  customerName?: string;
  amount: number; // PKR
  feeOrCommission: number; // PKR
  trxId?: string; // e.g. 12-digit Telco TRX / ID
  notes?: string;
  createdAt: string;
}

export type LoadNetworkType = 'JAZZ_WARID' | 'TELENOR' | 'ZONG' | 'UFONE';
export type LoadTxType = 'EASYLOAD' | 'PACKAGE' | 'POSTPAID_BILL';

export interface LoadDailyRecord {
  id: string; // e.g. "load_2026-09-21"
  date: string; // YYYY-MM-DD

  // Opening Digital Load SIM Balances (PKR)
  jazzOpening: number;      // Jazz / Warid SIM Opening Balance
  telenorOpening: number;   // Telenor SIM Opening Balance
  zongOpening: number;      // Zong SIM Opening Balance
  ufoneOpening: number;     // Ufone SIM Opening Balance

  // Physical Cash Opening for Load Service
  loadCashOpening: number;  // Physical drawer cash opening balance

  // Extra Addition in Opening (Load purchases / capital reloads)
  extraAddition?: number;

  // Total Opening Balance
  totalOpening: number;     // Sum of all 4 network openings + cash opening + extra addition

  // Closing Digital Load SIM Balances (PKR)
  jazzClosing: number;      // Jazz / Warid SIM Closing Balance
  telenorClosing: number;   // Telenor SIM Closing Balance
  zongClosing: number;      // Zong SIM Closing Balance
  ufoneClosing: number;     // Ufone SIM Closing Balance

  // Physical Cash Closing for Load Service
  loadCashClosing: number;  // Physical drawer cash closing balance

  // Load Expense in Closing (Day operational expenses from load cash)
  loadExpense?: number;

  // Total Closing Balance
  totalClosing: number;     // Sum of all 4 network closings + cash closing + load expense

  // Calculated Net & Result
  netDifference: number;    // totalClosing - totalOpening
  resultType: 'PROFIT' | 'LOSS' | 'BALANCED';

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoadTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  network: LoadNetworkType; // 'JAZZ_WARID' | 'TELENOR' | 'ZONG' | 'UFONE'
  type: LoadTxType; // 'EASYLOAD' | 'PACKAGE' | 'POSTPAID_BILL'
  customerMobile: string; // 03XXXXXXXXX
  customerName?: string;
  amount: number; // PKR
  commissionOrProfit: number; // PKR
  trxId?: string; // e.g. Telco Ref ID
  notes?: string;
  createdAt: string;
}

// ==========================================
// Vendor & Supplier Credit / Khata Types
// (For purchasing accessories/items on credit,
// tracking remaining balance, and payment history)
// ==========================================

export type VendorPaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'EASYPAISA' | 'JAZZCASH' | 'CHEQUE' | 'OTHER';

export interface Vendor {
  id: string;
  name: string; // e.g. "Al-Madina Accessories Hall Road"
  contactPerson?: string; // e.g. "Haji Rafiq"
  phone: string; // WhatsApp / Phone
  email?: string;
  city?: string; // e.g. "Lahore"
  address?: string; // e.g. "Shop # 18, Hall Road, Lahore"
  totalBilled: number; // Total actual purchase value of all bills
  totalPaid: number; // Total amount paid (upfront + subsequent payments)
  currentBalance: number; // totalBilled - totalPaid (Remaining payable / Udhaar)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorPurchaseItem {
  itemId?: string;
  itemName: string;
  costPrice: number; // Unit Cost Price
  salePrice: number; // Unit Sale/Retail Price
  quantity: number;
  totalCost: number; // costPrice * quantity
  isNewItem?: boolean;
}

export interface VendorPurchase {
  id: string;
  vendorId: string;
  vendorName: string;
  billNumber: string; // e.g. "BILL-908" or "Parche # 45"
  date: string; // YYYY-MM-DD
  itemsDescription: string; // e.g. "50x 65W Fast Chargers, 100x Glass Protectors, 30x Handsfree"
  items?: VendorPurchaseItem[];
  totalAmount: number; // Actual value of items / accessories
  paidAmount: number; // How much was paid at time of purchase
  remainingAmount: number; // totalAmount - paidAmount
  paymentMethod?: VendorPaymentMethod;
  paymentRef?: string;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  notes?: string;
  createdAt: string;
}

export interface VendorPayment {
  id: string;
  vendorId: string;
  vendorName: string;
  purchaseId?: string; // Optional link to specific bill
  billNumber?: string;
  date: string; // YYYY-MM-DD (when paid)
  time?: string; // HH:mm
  amount: number; // How much was paid
  paymentMethod: VendorPaymentMethod;
  referenceNumber?: string; // Cheque #, Bank Tx ID, receipt #
  notes?: string;
  createdAt: string;
}

// ==========================================
// Shop & Business Daily Expenses Types
// ==========================================

export type ExpensePaymentMethod = 'CASH' | 'EASYPAISA' | 'JAZZCASH' | 'BANK_TRANSFER' | 'OTHER';

export interface ExpenseItem {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // e.g. "14:30"
  amount: number; // Expense Value (PKR)
  reason: string; // Where That amount is used / purpose
  category?: string; // e.g. "Tea & Refreshments", "Shop Rent", "Utilities / Electricity", etc.
  paymentMethod?: ExpensePaymentMethod;
  recordedBy?: string; // Who recorded this expense
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DailyExpenseGroup {
  date: string; // YYYY-MM-DD
  totalAmount: number;
  itemsCount: number;
  items: ExpenseItem[];
}

// ==========================================
// Cash Book & Khata Ledger Types
// ==========================================

export type CashBookPartyType = 'CUSTOMER' | 'MY_BORROWING';
// 'CUSTOMER' = Customer owes me (He borrowed from me / Mene Lene Hain / Receivable)
// 'MY_BORROWING' = I owe someone (I borrowed from him / Mene Dene Hain / Payable)

export type CashBookTxType = 'BORROWED' | 'PAID';
// 'BORROWED' = Value borrowed / credit given (Red color, increases debt)
// 'PAID' = Value paid / installment settled (Green color, decreases debt)

export type CashBookPaymentMethod = 'CASH' | 'BANK' | 'EASYPAISA' | 'JAZZCASH' | 'OTHER';

export interface CashBookAccount {
  id: string;
  name: string;
  phone?: string;
  partyType: CashBookPartyType;
  notes?: string;
  address?: string;
  totalBorrowed: number; // Sum of all BORROWED entries
  totalPaid: number;     // Sum of all PAID entries
  remainingBalance: number; // totalBorrowed - totalPaid
  lastTransactionDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CashBookTransaction {
  id: string;
  accountId: string;
  accountName: string;
  partyType: CashBookPartyType;
  type: CashBookTxType; // 'BORROWED' (Red) | 'PAID' (Green)
  amount: number;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  paymentMethod?: CashBookPaymentMethod;
  description?: string;
  referenceNumber?: string;
  runningBalance?: number;
  recordedBy?: string;
  createdAt: string;
}

export interface ProtectorBrandCompatibility {
  brand: string;
  models: string[];
}

export interface ScreenProtector {
  id: string;
  name: string; // e.g. "Go 1"
  category?: string; // e.g. "9D Glass", "OG 11D", "Matte Anti-Spy", "Ceramic Full Glue", "Curved UV"
  material?: string;
  defaultPrice?: number; // PKR
  compatibleBrands: ProtectorBrandCompatibility[];
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

