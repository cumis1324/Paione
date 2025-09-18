export let userPermissions = [];
export let username = 'unknown'; 
export let currentSort = { column: 'CreatedDate', order: 'desc' };
export let lazyLoadState = {
    currentPage: 1,
    isLoading: false,
    totalRecords: 0,
    observer: null
};
export let selectedStore = 'All';
export let selectedItemName = 'All';
export let selectedWarehouse = 'All';

export const ITEMS_PER_PAGE = 50;

export const pageConfig = {
    '#analytics': { title: 'Real-time Analytics', type: 'analytics' },
    '#factory-analytics': { title: 'Penjualan Pabrik', type: 'factory-analytics' },
    '#multipayroll': { title: 'Multi Payroll Converter', type: 'multipayroll' },
    '#payroll-checksum': { title: 'Buat Checksum Payroll', type: 'payroll-checksum' },
    '#finish-good': { 
        title: 'Gudang - Finish Good', 
        type: 'finish-good', 
        columns: [
            { key: 'WareHouse', label: 'Gudang' },
            { key: 'ItemName', label: 'Nama Barang' },
            { key: 'Size', label: 'Ukuran' },
            { key: 'Qty', label: 'Total Qty' },
            { key: 'Unit', label: 'Unit' },
            { key: 'Lsn', label: 'Lsn' },
            { key: 'Pcs', label: 'Pcs' }
            ] 
    },
    '#stock-fabric': { title: 'Gudang - Stock Fabric', type: 'stock-fabric', columns: [] },
    '#wip': { title: 'Gudang - Work In Progress', type: 'wip', columns: [] },
    '#add-item': { title: 'Tambah Barang Baru', type: 'add-item' },
    '#packinglist-barcode': {
        title: 'Packing List - Barcode CMT',
        type: 'packinglist-barcode',
        columns: [
            { key: 'Barcode', label: 'Barcode' },
            { key: 'Item', label: 'Item' },
            { key: 'Color', label: 'Color' },
            { key: 'Size', label: 'Size' }
        ]
    },
    '#packinglist-riwayat': {
        title: 'Packing List - Riwayat',
        type: 'packinglist-riwayat',
        columns: [
            { key: 'IDNo', label: 'ID' },
            { key: 'CustomerName', label: 'Customer' },
            { key: 'DONo', label: 'No. DO' },
            { key: 'WONo', label: 'No. WO' }
        ]
    },
    '#items': { 
        title: 'Kelola Barang', 
        type: 'items', 
        columns: [
            { key: 'Barcode', label: 'Barcode' }, { key: 'Name', label: 'Nama Item' }, { key: 'BahanName', label: 'Bahan' },
            { key: 'SizeName', label: 'Ukuran' }, { key: 'BrandName', label: 'Merek' }, { key: 'ModelName', label: 'Model' },
            { key: 'Price', label: 'Harga' }, { key: 'Serial', label: 'Serial' }
        ] 
    },
    '#penjualan': {
        title: 'Laporan Penjualan', 
        type: 'penjualan',
        columns: [
            { key: 'Nomor', label: 'Nomor' }, { key: 'Cabang', label: 'Cabang' }, { key: 'Tanggal', label: 'Tanggal' },
            { key: 'Nama', label: 'Nama' }, { key: 'Daerah', label: 'Daerah' },
            { key: 'TotalPenjualanLusin', label: 'Total (Lusin)' },
            { key: 'TotalHargaPenjualan', label: 'Total Harga' }, { key: 'Pembayaran', label: 'Pembayaran' },
            { key: 'TanggalBayar', label: 'Tgl Bayar' }, { key: 'JatuhTempo', label: 'Jatuh Tempo' },
            { key: 'KeteranganPembayaran', label: 'Ket. Pembayaran' }
        ]
    },
    '#penerimaan': { 
        title: 'Penerimaan',
        type: 'penerimaan',
        columns: [
            { key: 'Nomor', label: 'Nomor' },
            { key: 'Cabang', label: 'Cabang' },
            { key: 'Dari', label: 'Dari' },
            { key: 'Tanggal', label: 'Tanggal' },
            { key: 'Scan', label: 'Scan' },
            { key: 'Keterangan', label: 'Keterangan' },
            { key: 'TotalPenjualanLusin', label: 'Total (Lusin)' },
            { key: 'TotalHargaPenjualan', label: 'Total Harga Penjualan' }
        ]
    },
    '#piutang': {
        title: 'Daftar Piutang Pelanggan',
        type: 'piutang',
        columns: []
    },
    '#pajak-invoice': {
        title: 'Pajak Invoice Penjualan',
        type: 'pajak-invoice',
        columns: [
            { key: 'InvNo', label: 'No. Invoice' },
            { key: 'InvDate', label: 'Tgl. Invoice' },
            { key: 'Toko', label: 'Toko' },
            { key: 'Customer', label: 'Customer' },
            { key: 'Qty', label: 'Qty' },
            { key: 'Up', label: 'Harga Satuan' },
            { key: 'Amount', label: 'Jumlah' },
            { key: 'Disc', label: 'Diskon' },
            { key: 'TotalAmount', label: 'Total' },
            { key: 'VatAmount', label: 'PPN' },
            { key: 'DppUp', label: 'DPP Harga' },
            { key: 'DppDisc', label: 'DPP Diskon' },
            { key: 'DppAmt', label: 'DPP Jumlah' },
            { key: 'DppNilaiLain', label: 'DPP Lain' },
            { key: 'Remark', label: 'Keterangan' }
        ]
    },
    '#materials': { title: 'Kelola Bahan', type: 'materials', columns: [{ key: 'Name', label: 'Nama' }, { key: 'Status', label: 'Status' }] },
    '#sizes': { title: 'Kelola Ukuran', type: 'sizes', columns: [{ key: 'Name', label: 'Nama' }, { key: 'Status', label: 'Status' }] },
    '#brands': { title: 'Kelola Merek', type: 'brands', columns: [{ key: 'Name', label: 'Nama' }, { key: 'Status', label: 'Status' }] },
    '#models': { title: 'Kelola Model', type: 'models', columns: [{ key: 'Name', label: 'Nama' }, { key: 'Status', label: 'Status' }] }
};

export const permissionMap = {
    'analytics': {'R': 'RA'},
    'factory-analytics': {'R': 'RA'},
    'multipayroll': {'R': 'RA'},
    'payroll-checksum': {'R': 'RA'},
    'add-item': {'W': 'WNB'}, 
    'packinglist-barcode': {'R': 'RPL', 'W': 'WPL'},
    'packinglist-riwayat': {'R': 'RPL'},
    'items': {'R': 'RI', 'W': 'WI', 'D': 'DI', 'P': 'PB'}, 
    'penjualan': {'R': 'RP'},
    'penerimaan': {'R': 'RP'},
    'pajak-invoice': {'R': 'RPjk'},
    'piutang': {'R': 'RP'},
    'materials': {'R': 'RM', 'W': 'WM', 'D': 'DM'}, 
    'sizes': {'R': 'RSz', 'W': 'WSz', 'D': 'DSz'},
    'brands': {'R': 'RB', 'W': 'WB', 'D': 'DB'}, 
    'models': {'R': 'RM', 'W': 'WM', 'D': 'DM'},
    'gudang': {'R': 'RGudang'},
    'finish-good': {'R': 'RGudang'},
    'stock-fabric': {'R': 'RGudang'},
    'wip': {'R': 'RGudang'}
};

export function setUserPermissions(permissions) {
    userPermissions = permissions;
}

export function setSelectedStore(store) {
    selectedStore = store;
}

export function setSelectedWarehouse(warehouse) {
    selectedWarehouse = warehouse;
}

export function setSelectedItemName(itemName) {
    selectedItemName = itemName;
}

export function resetLazyLoadState() {
    if (lazyLoadState.observer) lazyLoadState.observer.disconnect();
    lazyLoadState = { currentPage: 1, isLoading: false, totalRecords: 0, observer: null };
}

export function setCurrentSort(column, order) {
    currentSort.column = column;
    currentSort.order = order;
}

// --- FUNGSI DIPINDAHKAN KE SINI ---
export function can(action, module) {
    const permCode = permissionMap[module]?.[action];
    return permCode ? userPermissions.includes(permCode) : false;
}

export function isSuperAdmin() {
    return userPermissions.includes('SA');
}
export function setUsername(name) {
    username = name;
}
export function getClientInfo() {
    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    let os = "Unknown OS";

    // Deteksi OS
    if (ua.includes("Win")) os = "Windows";
    if (ua.includes("Mac")) os = "Macintosh";
    if (ua.includes("Linux")) os = "Linux";
    if (ua.includes("Android")) os = "Android";
    if (ua.includes("like Mac") && ua.includes("iPad")) os = "iPadOS";
    if (ua.includes("like Mac") && ua.includes("iPhone")) os = "iOS";

    // Deteksi Browser (urutan penting)
    if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("Chrome/") && !ua.includes("Chromium")) browser = "Chrome";
    else if (ua.includes("Firefox/")) browser = "Firefox";
    else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
    
    // <-- 2. Perbarui baris ini -->
    return `${username}-${browser}-${os}`;
    }