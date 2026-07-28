import {
  LayoutDashboard, ShoppingCart, ReceiptText, Package, Truck, ContactRound,
  Users, Clock3, WalletCards, BarChart3, ShoppingBag, Store, Printer,
  MonitorSmartphone, Settings, ListChecks, Gauge
} from 'lucide-react';

export const APP_VERSION = '5.2.2';
export const DB_KEY = 'bm_pos_freesync_v4_3';
export const MAIN_BRANCH_ID = 'BMP-001';

export const MODULES = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { id: 'controlCenter', label: 'Pusat Kontrol', icon: Gauge, permission: 'control.view' },
  { id: 'pos', label: 'Kasir', icon: ShoppingCart, permission: 'pos.use' },
  { id: 'openBills', label: 'Open Bill', icon: ListChecks, permission: 'pos.use' },
  { id: 'transactions', label: 'Transaksi', icon: ReceiptText, permission: 'transactions.view' },
  { id: 'products', label: 'Produk & Stok', icon: Package, permission: 'products.view' },
  { id: 'purchases', label: 'Pembelian', icon: Truck, permission: 'purchases.view' },
  { id: 'suppliers', label: 'Pemasok', icon: ContactRound, permission: 'suppliers.view' },
  { id: 'customers', label: 'Pelanggan', icon: Users, permission: 'customers.view' },
  { id: 'shifts', label: 'Shift & Kas', icon: Clock3, permission: 'shifts.view' },
  { id: 'finance', label: 'Keuangan', icon: WalletCards, permission: 'finance.view' },
  { id: 'reports', label: 'Laporan', icon: BarChart3, permission: 'reports.view' },
  { id: 'orders', label: 'Pesanan Online', icon: ShoppingBag, permission: 'orders.view' },
  { id: 'branches', label: 'Cabang', icon: Store, permission: 'branches.view' },
  { id: 'devices', label: 'Printer & Perangkat', icon: Printer, permission: 'devices.view' },
  { id: 'customerDisplay', label: 'Layar Pelanggan', icon: MonitorSmartphone, permission: 'display.view' },
  { id: 'settings', label: 'Pengaturan', icon: Settings, permission: 'settings.view' }
];

export const ROLE_PERMISSIONS = {
  owner: ['*'],
  manager: [
    'dashboard.view', 'control.view', 'payments.manage', 'pos.use', 'transactions.view', 'transactions.refund', 'transactions.void',
    'products.view', 'products.manage', 'inventory.view', 'inventory.manage', 'purchases.view',
    'purchases.manage', 'suppliers.view', 'suppliers.manage', 'customers.view', 'customers.manage',
    'shifts.view', 'shifts.manage', 'finance.view', 'finance.manage', 'reports.view', 'orders.view',
    'orders.manage', 'devices.view', 'devices.manage', 'display.view', 'display.manage',
    'settings.view', 'employees.view', 'employees.manage'
  ],
  kasir: [
    'pos.use', 'transactions.view', 'products.view', 'inventory.view', 'customers.view', 'customers.manage',
    'shifts.view', 'shifts.manage', 'openBills.view', 'orders.view', 'display.view'
  ]
};

export const can = (user, permission) => {
  if (!user || user.active === false) return false;
  const permissions = Array.isArray(user.permissions) && user.permissions.length
    ? user.permissions
    : (ROLE_PERMISSIONS[user.role] || []);
  return permissions.includes('*') || permissions.includes(permission);
};

export const UNITS = [
  { id: 'pcs', name: 'pcs/buah' }, { id: 'unit', name: 'unit' }, { id: 'box', name: 'box/dus' },
  { id: 'pack', name: 'pack/bungkus' }, { id: 'set', name: 'set' }, { id: 'pair', name: 'pasang' },
  { id: 'lusin', name: 'lusin' }, { id: 'roll', name: 'roll' }, { id: 'coil', name: 'coil' },
  { id: 'meter', name: 'meter' }, { id: 'cm', name: 'sentimeter' }, { id: 'batang', name: 'batang' },
  { id: 'lembar', name: 'lembar' }, { id: 'sak', name: 'sak' }, { id: 'kg', name: 'kilogram' },
  { id: 'gram', name: 'gram' }, { id: 'liter', name: 'liter' }, { id: 'kaleng', name: 'kaleng' },
  { id: 'botol', name: 'botol' }, { id: 'tube', name: 'tube' }
];

const defaultUsers = [
  {
    id: 'USR-OWNER', name: 'Bapak Owner', role: 'owner', branchId: MAIN_BRANCH_ID, active: true,
    pinHash: '16039fad30ca79e334f6f92471a26cc57179583e60ed6fbb5de4b58100c52902',
    pinSalt: 'c1f171ea5e0d4f86b3251ca9a89ff2b0', pinIterations: 120000, pinAlgorithm: 'PBKDF2-SHA256'
  },
  {
    id: 'USR-MANAGER', name: 'Manager Toko', role: 'manager', branchId: MAIN_BRANCH_ID, active: true,
    pinHash: 'aa81b9ffe4e7f6db25e2d8666a1241986e0ecda2fb05727a6766a3dadf20aa2b',
    pinSalt: 'ea9b501987a2f4ca13bec6bed9e77931', pinIterations: 120000, pinAlgorithm: 'PBKDF2-SHA256'
  },
  {
    id: 'USR-KASIR', name: 'Kasir Satu', role: 'kasir', branchId: MAIN_BRANCH_ID, active: true,
    pinHash: 'ef4a46cb53927ba6868ca1f6b1fa70c9b3fae46873296c43e691cbd2f298c2a5',
    pinSalt: '362d628c75cc85e9be79b8b45f926b33', pinIterations: 120000, pinAlgorithm: 'PBKDF2-SHA256'
  }
];

const defaultProducts = [
  {
    id: 'PRD-001', branchId: MAIN_BRANCH_ID, name: 'Kabel Listrik Eterna NYM 2x1.5', category: 'Listrik',
    sku: 'LST-001', barcode: '899000000001', baseUnit: 'meter', stock: 150, minStock: 25, rack: 'A-01',
    modalPrice: 7500, initialModalPrice: 7500, prices: { retail: 9000, wholesale: 8500, project: 8200 },
    variants: [{ id: 'VAR-001', name: 'Per Meter', barcode: '899000000001', factor: 1, priceDelta: 0 }],
    conversions: [{ unit: 'roll', factor: 50 }], allowFractional: true, quantityStep: 0.5, bundleItems: [], favorite: true, available: true, active: true, trackStock: true
  },
  {
    id: 'PRD-002', branchId: MAIN_BRANCH_ID, name: 'Lampu LED Philips 10W Putih', category: 'Listrik',
    sku: 'LST-002', barcode: '899000000002', baseUnit: 'pcs', stock: 45, minStock: 10, rack: 'A-05',
    modalPrice: 28000, initialModalPrice: 28000, prices: { retail: 35000, wholesale: 33000, project: 32000 },
    variants: [{ id: 'VAR-002', name: 'Putih', barcode: '899000000002', factor: 1, priceDelta: 0 }],
    conversions: [{ unit: 'box', factor: 12 }], bundleItems: [], allowFractional: false, quantityStep: 1, favorite: true, available: true, active: true, trackStock: true
  },
  {
    id: 'PRD-003', branchId: MAIN_BRANCH_ID, name: 'Pipa PVC Rucika 1/2 AW', category: 'Air & Pipa',
    sku: 'AIR-001', barcode: '899000000006', baseUnit: 'batang', stock: 200, minStock: 20, rack: 'B-02',
    modalPrice: 18000, initialModalPrice: 18000, prices: { retail: 22000, wholesale: 21000, project: 20000 },
    variants: [], conversions: [], bundleItems: [], allowFractional: false, quantityStep: 1, favorite: false, available: true, active: true, trackStock: true
  },
  {
    id: 'PRD-004', branchId: MAIN_BRANCH_ID, name: 'Sekrup Baja Ringan 10x19', category: 'Besi & Paku',
    sku: 'BS-001', barcode: '899000000009', baseUnit: 'box', stock: 40, minStock: 8, rack: 'C-03',
    modalPrice: 19000, initialModalPrice: 19000, prices: { retail: 25000, wholesale: 23500, project: 22500 },
    variants: [], conversions: [{ unit: 'pcs', factor: 0.01 }], bundleItems: [], allowFractional: false, quantityStep: 1, favorite: false, available: true, active: true, trackStock: true
  },
  {
    id: 'PRD-005', branchId: MAIN_BRANCH_ID, name: 'Semen Gresik 40kg', category: 'Material',
    sku: 'BGN-001', barcode: '899000000011', baseUnit: 'sak', stock: 100, minStock: 15, rack: 'GUDANG-1',
    modalPrice: 47000, initialModalPrice: 47000, prices: { retail: 52000, wholesale: 50500, project: 49500 },
    variants: [], conversions: [], bundleItems: [], allowFractional: false, quantityStep: 1, favorite: false, available: true, active: true, trackStock: true
  },
  {
    id: 'PRD-BUNDLE-1', branchId: MAIN_BRANCH_ID, name: 'Paket Instalasi Lampu Dasar', category: 'Paket',
    sku: 'PKT-001', barcode: '899000000099', baseUnit: 'set', stock: 999, minStock: 0, rack: '-',
    modalPrice: 43000, initialModalPrice: 43000, prices: { retail: 52000, wholesale: 50000, project: 48000 },
    variants: [], conversions: [], bundleItems: [{ productId: 'PRD-002', qty: 1 }, { productId: 'PRD-001', qty: 2 }],
    allowFractional: false, quantityStep: 1, favorite: true, available: true, active: true, trackStock: false
  }
];

const now = new Date().toISOString();

export const createSeedDb = () => ({
  meta: { version: APP_VERSION, createdAt: now, updatedAt: now, lastBackupAt: null, lastSyncAt: null, hybridMode: true, sparkOnly: true, hosting: 'cloudflare-pages' },
  configs: {
    companyName: 'BUMI MAKMUR', address: 'Jl. Pembangunan No. 88, Surabaya', phone: '031-0000000',
    loginAppearance: {
      headerText: '',
      subheaderTemplate: '{branch} · POS Professional v{version}',
      chooserTitle: 'Pilih jenis akun',
      chooserSubtitle: 'Owner dan karyawan memiliki alur login terpisah.',
      ownerTitle: 'Login Owner',
      ownerSubtitle: 'Seluruh cabang, laporan, pengaturan, dan hak akses.',
      employeeTitle: 'Login Karyawan',
      employeeSubtitle: 'Pilih cabang, pilih nama karyawan, lalu masukkan PIN 4 digit.',
      onlineTitle: 'Internet tersedia',
      onlineSubtitle: 'Login cloud dan sinkronisasi siap digunakan.',
      offlineTitle: 'Mode offline aktif',
      offlineSubtitle: 'Login offline tersedia untuk akun yang sebelumnya sudah tersimpan pada perangkat ini.',
      footerLead: 'Firebase Spark gratis.',
      footerText: 'Karyawan cukup memilih nama dari daftar dan memasukkan PIN setelah akun dibuat Owner atau Store Manager.'
    },
    activeBranchId: MAIN_BRANCH_ID, darkMode: false, printAuto: false, taxEnabled: false, taxRate: 11,
    cameraPermissionOnStartup: true, shiftWarningHours: 14, reorderMultiplier: 2,
    serviceEnabled: false, serviceRate: 0, roundingStep: 0, loyaltyEnabled: true, pointRate: 10000,
    pointValue: 100, refundApprovalLimit: 500000, requireShiftForCash: true,
    receiptHeader: 'NOTA PEMBELIAN', receiptFooter: 'Terima kasih telah berbelanja.',
    receiptMessage: 'Barang yang sudah dibeli harap diperiksa kembali. Simpan nota sebagai bukti transaksi.',
    receiptWhatsappNote: 'Terima kasih. Bumi Makmur siap melayani kebutuhan bangunan, listrik, dan air Anda.',
    receiptLogo: '/logo-bm.svg', receiptShowLogo: true, receiptShowCustomer: true, receiptShowCashier: true,
    receiptShowPayment: true, receiptShowStorePhone: true, receiptPaperWidth: 80,
    whatsappCountryCode: '62', whatsappReceiptEnabled: true,
    qrisMerchantName: 'BUMI MAKMUR', qrisImage: '', qrisInstruction: 'Scan QR lalu tunjukkan bukti pembayaran kepada kasir.',
    paymentMethods: [
      { id: 'cash', name: 'Tunai', type: 'cash', brand: 'cash', active: true },
      { id: 'qris', name: 'QRIS', type: 'digital', brand: 'qris', active: true },
      { id: 'shopeepay', name: 'ShopeePay', type: 'digital', brand: 'shopeepay', active: true },
      { id: 'ovo', name: 'OVO', type: 'digital', brand: 'ovo', active: true },
      { id: 'gopay', name: 'GoPay', type: 'digital', brand: 'gopay', active: true },
      { id: 'dana', name: 'DANA', type: 'digital', brand: 'dana', active: true },
      { id: 'transfer', name: 'Transfer Bank', type: 'bank', brand: 'bank', active: true },
      { id: 'card', name: 'Kartu/EDC', type: 'card', brand: 'card', active: true },
      { id: 'tempo', name: 'Tempo/Piutang', type: 'credit', brand: 'credit', active: true },
      { id: 'other', name: 'Lainnya', type: 'other', brand: 'other', active: true }
    ],
    bankAccounts: [
      { id: 'BCA', bank: 'BCA', number: '1234567890', holder: 'Bumi Makmur' },
      { id: 'MANDIRI', bank: 'Mandiri', number: '0987654321', holder: 'Bumi Makmur' }
    ]
  },
  branches: [{ id: MAIN_BRANCH_ID, name: 'Pusat BUMI MAKMUR', address: 'Jl. Pembangunan No. 88, Surabaya', phone: '031-0000000', status: 'Online', active: true }],
  users: defaultUsers,
  categories: ['Listrik', 'Air & Pipa', 'Besi & Paku', 'Perkakas', 'Material', 'Paket'],
  units: UNITS,
  products: defaultProducts,
  promotions: [],
  suppliers: [
    { id: 'SUP-001', branchId: MAIN_BRANCH_ID, name: 'Sumber Listrik Jaya', phone: '081234567890', email: '', address: 'Surabaya', taxNo: '', notes: '', active: true },
    { id: 'SUP-002', branchId: MAIN_BRANCH_ID, name: 'Distributor Bangunan Makmur', phone: '081298765432', email: '', address: 'Sidoarjo', taxNo: '', notes: '', active: true }
  ],
  customers: [
    { id: 'CUS-GENERAL', branchId: MAIN_BRANCH_ID, name: 'Umum (Non-Member)', phone: '-', email: '', type: 'Reguler', priceTier: 'retail', creditLimit: 0, points: 0, address: '', project: '', notes: '', active: true },
    { id: 'CUS-001', branchId: MAIN_BRANCH_ID, name: 'Pak Budi Tukang', phone: '081111111111', email: '', type: 'Tukang', priceTier: 'wholesale', creditLimit: 3000000, points: 120, address: 'Surabaya', project: 'Renovasi Rumah', notes: '', active: true }
  ],
  sales: [], heldSales: [], purchases: [], stockMovements: [], stockAdjustments: [], stockOpnames: [], stockTransfers: [],
  branchPaymentProfiles: [{ id: MAIN_BRANCH_ID, branchId: MAIN_BRANCH_ID, merchantName: 'BUMI MAKMUR', qrisImage: '', qrisInstruction: 'Scan QR lalu tunjukkan bukti pembayaran kepada kasir.', qrisAssetMeta: null, enabled: true, updatedAt: now, updatedBy: 'SYSTEM' }],
  expenses: [], receivables: [], payables: [], refunds: [], shifts: [
    { id: 'SHIFT-DEMO', branchId: MAIN_BRANCH_ID, userId: 'USR-KASIR', userName: 'Kasir Satu', startAt: now, endAt: null, startingCash: 500000, actualEndingCash: null, expectedEndingCash: null, difference: null, status: 'OPEN', notes: 'Shift demo awal' }
  ],
  cashMovements: [{ id: 'CASH-DEMO', branchId: MAIN_BRANCH_ID, shiftId: 'SHIFT-DEMO', type: 'START', amount: 500000, note: 'Modal awal', createdAt: now, userId: 'USR-KASIR' }],
  onlineOrders: [], printerProfiles: [
    { id: 'PRN-001', name: 'Printer Kasir Utama', type: 'browser', paperWidth: 80, address: '', encoding: 'CP437', autoCut: true, cashDrawer: false, active: true }
  ],
  campaigns: [{ id: 'CMP-001', title: 'Promo Bumi Makmur', message: 'Harga terbaik untuk kebutuhan bangunan, listrik, dan air.', active: true }],
  feedback: [], auditLogs: []
});
