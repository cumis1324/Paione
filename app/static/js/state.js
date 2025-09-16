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

export const ITEMS_PER_PAGE = 50;

export const pageConfig = {
    '#analytics': { title: 'Real-time Analytics', type: 'analytics' },
    '#factory-analytics': { title: 'Penjualan Pabrik', type: 'factory-analytics' },
    '#multipayroll': { title: 'Multi Payroll Converter', type: 'multipayroll' },
    '#payroll-checksum': { title: 'Buat Checksum Payroll', type: 'payroll-checksum' },
    '#stock-in': { title: 'Stock In', type: 'stock-in', columns: [] },
    '#stock-out': { title: 'Stock Out', type: 'stock-out', columns: [] },
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
    'stock-in': {'R': 'RGudang', 'W': 'WStok'},
    'stock-out': {'R': 'RGudang', 'W': 'WStok'}
};

export function setUserPermissions(permissions) {
    userPermissions = permissions;
}

export function setSelectedStore(store) {
    selectedStore = store;
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