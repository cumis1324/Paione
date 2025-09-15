import { pageConfig, can, isSuperAdmin } from './state.js';
import { api } from './api.js';

// --- Element References ---
const elements = {
    appContent: document.getElementById('app-content'),
    pageTitle: document.getElementById('page-title'),
    notification: document.getElementById('notification'),
    sidebarContainer: document.getElementById('sidebar-container'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    mainContent: document.getElementById('main-content'),
    lookupModal: document.getElementById('lookup-edit-modal'),
    lookupModalTitle: document.getElementById('lookup-modal-title'),
    lookupModalLabel: document.getElementById('lookup-modal-label'),
    lookupModalInput: document.getElementById('lookup-edit-name'),
    itemEditModal: document.getElementById('item-edit-modal'),
    itemEditId: document.getElementById('item-edit-id'),
    itemEditName: document.getElementById('item-edit-name'),
    itemEditPrice: document.getElementById('item-edit-price'),
    itemEditSerial: document.getElementById('item-edit-serial'),
    itemEditMaterial: document.getElementById('item-edit-material'),
    itemEditSize: document.getElementById('item-edit-size'),
    itemEditBrand: document.getElementById('item-edit-brand'),
    itemEditModel: document.getElementById('item-edit-model'),
    salesDetailModal: document.getElementById('sales-detail-modal'),
    salesDetailContent: document.getElementById('sales-detail-content'),
    salesDetailModalTitle: document.getElementById('sales-detail-modal-title'),
    // --- PERUBAHAN DI SINI: Tambah elemen modal detail barang ---
    itemDetailModal: document.getElementById('item-detail-modal'),
    itemDetailTitle: document.getElementById('item-detail-title'),
    itemDetailContent: document.getElementById('item-detail-content'),
    itemDetailFooter: document.getElementById('item-detail-footer'),
    lookupDetailModal: document.getElementById('lookup-detail-modal'),
    lookupDetailTitle: document.getElementById('lookup-detail-title'),
    lookupDetailContent: document.getElementById('lookup-detail-content'),
    lookupDetailFooter: document.getElementById('lookup-detail-footer'),
};

let currentModalCallback = null;
let refreshDataCallback = null;

// --- PERUBAHAN DI SINI: Fungsi Baru untuk Format Rupiah ---
export function formatRupiah(number) {
    if (number === null || number === undefined || isNaN(Number(number))) {
        return 'Rp. 0,00';
    }
    const num = Number(number);
    const formattedNumber = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);

    return `Rp. ${formattedNumber}`;
}

export function openItemDetailModal() {
    elements.itemDetailModal.classList.remove('hidden');
    showLoader(elements.itemDetailContent);
    elements.itemDetailFooter.innerHTML = `<div class="flex justify-center items-center w-full"><svg class="animate-spin h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>`;
}

export function closeItemDetailModal() {
    elements.itemDetailModal.classList.add('hidden');
    elements.itemDetailContent.innerHTML = ''; // Kosongkan konten saat ditutup
    elements.itemDetailFooter.innerHTML = ''; // Kosongkan footer saat ditutup
}

export function renderItemDetailModal(item) {
    elements.itemDetailTitle.textContent = item.Name || 'Detail Barang';

    const isActive = item.IsActive == 1;
    const statusHTML = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}">${isActive ? 'Aktif' : 'Nonaktif'}</span>`;

    elements.itemDetailContent.innerHTML = `
        <dl class="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-6 text-sm">
            <div class="sm:col-span-1"><dt class="font-medium text-gray-500 dark:text-gray-400">Barcode</dt><dd class="mt-1 text-gray-900 dark:text-gray-200">${item.Barcode || '-'}</dd></div>
            <div class="sm:col-span-2"><dt class="font-medium text-gray-500 dark:text-gray-400">Nama Item</dt><dd class="mt-1 text-gray-900 dark:text-gray-200">${item.Name || '-'}</dd></div>
            <div class="sm:col-span-1"><dt class="font-medium text-gray-500 dark:text-gray-400">Harga</dt><dd class="mt-1 text-gray-900 dark:text-gray-200">${formatRupiah(item.Price)}</dd></div>
            <div class="sm:col-span-1"><dt class="font-medium text-gray-500 dark:text-gray-400">Serial</dt><dd class="mt-1 text-gray-900 dark:text-gray-200">${item.Serial || '-'}</dd></div>
            <div class="sm:col-span-1"><dt class="font-medium text-gray-500 dark:text-gray-400">Status</dt><dd class="mt-1 text-gray-900 dark:text-gray-200">${statusHTML}</dd></div>
            <div class="sm:col-span-1"><dt class="font-medium text-gray-500 dark:text-gray-400">Bahan</dt><dd class="mt-1 text-gray-900 dark:text-gray-200">${item.MaterialName || '-'}</dd></div>
            <div class="sm:col-span-1"><dt class="font-medium text-gray-500 dark:text-gray-400">Ukuran</dt><dd class="mt-1 text-gray-900 dark:text-gray-200">${item.SizeName || '-'}</dd></div>
            <div class="sm:col-span-1"><dt class="font-medium text-gray-500 dark:text-gray-400">Merek</dt><dd class="mt-1 text-gray-900 dark:text-gray-200">${item.BrandName || '-'}</dd></div>
            <div class="sm:col-span-1"><dt class="font-medium text-gray-500 dark:text-gray-400">Model</dt><dd class="mt-1 text-gray-900 dark:text-gray-200">${item.ModelName || '-'}</dd></div>
        </dl>
    `;

    elements.itemDetailFooter.innerHTML = `
        ${isSuperAdmin() ? `<button class="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 toggle-active-btn" data-id="${item.Id}" title="${isActive ? 'Nonaktifkan' : 'Aktifkan'}">${isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>` : ''}
        ${can('W', 'items') ? `<button class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 edit-item-btn" data-id="${item.Id}">Edit</button>` : ''}
        ${can('D', 'items') ? `<button class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 delete-btn" data-id="${item.Id}">Hapus</button>` : ''}
        ${can('P', 'items') ? `<a href="/print/barcode/${item.Id}" target="_blank" class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300">Cetak Barcode</a>` : ''}
    `;
}

export function openLookupDetailModal() {
    elements.lookupDetailModal.classList.remove('hidden');
    showLoader(elements.lookupDetailContent);
    elements.lookupDetailFooter.innerHTML = `<div class="flex justify-center items-center w-full"><svg class="animate-spin h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>`;
}

export function closeLookupDetailModal() {
    elements.lookupDetailModal.classList.add('hidden');
    elements.lookupDetailContent.innerHTML = '';
    elements.lookupDetailFooter.innerHTML = '';
}

export function renderLookupDetailModal(item, type) {
    const typeName = pageConfig[`#${type}`]?.title || 'Detail';
    elements.lookupDetailTitle.textContent = typeName;

    const isActive = item.IsActive == 1;
    const statusHTML = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}">${isActive ? 'Aktif' : 'Nonaktif'}</span>`;

    elements.lookupDetailContent.innerHTML = `
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 text-sm">
            <div class="sm:col-span-1"><dt class="font-medium text-gray-500 dark:text-gray-400">Nama</dt><dd class="mt-1 text-gray-900 dark:text-gray-200">${item.Name || '-'}</dd></div>
            <div class="sm:col-span-1"><dt class="font-medium text-gray-500 dark:text-gray-400">Status</dt><dd class="mt-1 text-gray-900 dark:text-gray-200">${statusHTML}</dd></div>
        </dl>
    `;

    elements.lookupDetailFooter.innerHTML = `
        ${isSuperAdmin() ? `<button class="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 toggle-active-btn" data-id="${item.Id}" title="${isActive ? 'Nonaktifkan' : 'Aktifkan'}">${isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>` : ''}
        ${can('W', type) ? `<button class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 edit-lookup-btn" data-id="${item.Id}" data-name="${item.Name}">Edit</button>` : ''}
        ${can('D', type) ? `<button class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 delete-btn" data-id="${item.Id}">Hapus</button>` : ''}
    `;
}
// --- AKHIR PERUBAHAN ---
export function openSalesDetailModal() {
    elements.salesDetailModal.classList.remove('hidden');
    showLoader(elements.salesDetailContent);
}

export function closeSalesDetailModal() {
    elements.salesDetailModal.classList.add('hidden');
}

export function renderSalesDetail(details, header) {
    let headerHTML = '<p class="text-gray-500">Gagal memuat header.</p>';
    if (header) {
        headerHTML = `
            <div class="grid grid-cols-3 gap-4 mb-4 text-sm text-gray-800 dark:text-gray-300">
                <div><strong class="font-semibold">Nomor:</strong> ${header.Nomor || '-'}</div>
                <div><strong class="font-semibold">Nama:</strong> ${header.Name || '-'}</div>
                <div><strong class="font-semibold">Cabang:</strong> ${header.Cabang || '-'}</div>
                <div><strong class="font-semibold">Pembayaran:</strong> ${header.Pembayaran || '-'}</div>
            </div>
        `;
    }

    if (details.length === 0) {
        elements.salesDetailContent.innerHTML = headerHTML + '<p class="text-center text-gray-500">Tidak ada item detail untuk penjualan ini.</p>';
        return;
    }

    const headers = ['Nama Barang', 'Qty', 'Harga', 'Diskon', 'Subtotal', 'Note', 'Serial'];
    let tableHTML = `<div class="responsive-table-container"><table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-700"><tr>
            ${headers.map(h => `<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">${h}</th>`).join('')}
        </tr></thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">`;

    let totalQty = 0;
    let totalDiscount = 0;
    let totalSubtotal = 0;

    details.forEach(item => {
        totalQty += parseFloat(item.Qty) || 0;
        totalDiscount += parseFloat(item.Discount) || 0;
        totalSubtotal += parseFloat(item.Subtotal) || 0;

        tableHTML += `<tr>
            <td data-label="Nama Barang" class="px-4 py-2 text-sm text-gray-800 dark:text-gray-300 break-words">${item.NamaBarang || '-'}</td>
            <td data-label="Qty" class="px-4 py-2 text-sm text-gray-800 dark:text-gray-300 break-words">${item.Qty || 0}</td>
            <td data-label="Harga" class="px-4 py-2 text-sm text-gray-800 dark:text-gray-300 break-words">${formatRupiah(item.Price)}</td>
            <td data-label="Diskon" class="px-4 py-2 text-sm text-gray-800 dark:text-gray-300 break-words">${formatRupiah(item.Discount)}</td>
            <td data-label="Subtotal" class="px-4 py-2 text-sm text-gray-800 dark:text-gray-300 break-words">${formatRupiah(item.Subtotal)}</td>
            <td data-label="Note" class="px-4 py-2 text-sm text-gray-800 dark:text-gray-300 break-words">${item.Note || '-'}</td>
            <td data-label="Serial" class="px-4 py-2 text-sm text-gray-800 dark:text-gray-300 break-words">${item.Serial || '-'}</td>
        </tr>`;
    });

    tableHTML += `</tbody>
        <tfoot class="bg-gray-50 dark:bg-gray-700 font-bold text-gray-900 dark:text-white">
            <tr>
                <td class="px-4 py-2 text-right text-sm">Total</td>
                <td class="px-4 py-2 text-sm">${totalQty}</td>
                <td class="px-4 py-2 text-sm"></td>
                <td class="px-4 py-2 text-sm">${formatRupiah(totalDiscount)}</td>
                <td class="px-4 py-2 text-sm">${formatRupiah(totalSubtotal)}</td>
                <td colspan="2" class="px-4 py-2 text-sm"></td> </tr>
        </tfoot>
    </table></div>`;
    
    elements.salesDetailContent.innerHTML = headerHTML + tableHTML;
}

export function setRefreshDataCallback(callback) {
    refreshDataCallback = callback;
}

export function openSidebar() {
    document.body.classList.add('sidebar-is-open');
}

export function closeSidebar() {
    document.body.classList.remove('sidebar-is-open');
}

export function showNotification(message, type) {
    elements.notification.textContent = message;
    elements.notification.className = `p-4 rounded-md mb-6 ${type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`;
    elements.notification.classList.remove('hidden');
    setTimeout(() => elements.notification.classList.add('hidden'), 5000);
}

export function showLoader(container) {
    container.innerHTML = `<div class="flex justify-center items-center p-10"><svg class="animate-spin h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>`;
}

export function openLookupModal(options) {
    const { 
        title, 
        label, 
        value = '', 
        placeholder = '', 
        saveText = 'Simpan', 
        inputVisible = true, // Opsi baru untuk menyembunyikan input
        onSave 
    } = options;

    elements.lookupModalTitle.textContent = title;
    elements.lookupModalLabel.textContent = label;
    elements.lookupModalInput.value = value;
    elements.lookupModalInput.placeholder = placeholder;
    document.getElementById('lookup-modal-save').textContent = saveText;

    // Logika untuk menampilkan/menyembunyikan input
    if (inputVisible) {
        elements.lookupModalInput.style.display = 'block';
        elements.lookupModalLabel.classList.add('text-left', 'mb-1');
    } else {
        elements.lookupModalInput.style.display = 'none';
        elements.lookupModalLabel.classList.remove('text-left', 'mb-1');
    }
    
    currentModalCallback = onSave;
    elements.lookupModal.classList.remove('hidden');
    if (inputVisible) elements.lookupModalInput.focus();
}

export function closeLookupModal() {
    elements.lookupModal.classList.add('hidden');
    currentModalCallback = null;
}

export function closeItemEditModal() {
    elements.itemEditModal.classList.add('hidden');
}

export function setupModalEventListeners() {
    document.getElementById('lookup-modal-cancel').addEventListener('click', closeLookupModal);

    const saveBtn = document.getElementById('lookup-modal-save');
    saveBtn.addEventListener('click', async () => {
        const value = elements.lookupModalInput.value.trim();
        
        if (currentModalCallback) {
            // Tampilkan status loading di tombol
            saveBtn.disabled = true;
            saveBtn.textContent = 'Memproses...';

            // Jalankan fungsi onSave dan tunggu hasilnya (true/false)
            // --- PERBAIKAN DI SINI: Kirim 'value' ke callback ---
            const success = await currentModalCallback(value);
            // --- AKHIR PERBAIKAN ---
            
            // Hanya tutup modal jika prosesnya berhasil
            if (success) {
                closeLookupModal();
            }

            // Kembalikan tombol ke keadaan normal
            saveBtn.disabled = false;
            // Teks tombol akan di-reset saat modal dibuka lagi
        }
    });

    document.getElementById('item-modal-cancel').addEventListener('click', closeItemEditModal);
    document.getElementById('item-modal-save').addEventListener('click', saveItemChanges);

    const itemDetailCloseBtn = document.getElementById('item-detail-close-btn');
    if (itemDetailCloseBtn) {
        itemDetailCloseBtn.addEventListener('click', closeItemDetailModal);
    }

    const lookupDetailCloseBtn = document.getElementById('lookup-detail-close-btn');
    if (lookupDetailCloseBtn) {
        lookupDetailCloseBtn.addEventListener('click', closeLookupDetailModal);
    }
}

export function renderTableRows(tableBody, data, type) {
    const config = pageConfig[`#${type}`];
    data.forEach(item => {
        const isActive = item.IsActive == 1;
        const statusHTML = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}">${isActive ? 'Aktif' : 'Nonaktif'}</span>`;
        const isActionable = !['penjualan', 'penerimaan', 'piutang', 'packinglist-barcode'].includes(type);
        let actions = '';
        const isLookupPage = ['materials', 'sizes', 'brands', 'models'].includes(type);
        if (type === 'packinglist-barcode') {
            actions = `<td data-label="Aksi" class="px-6 py-4 text-right text-sm font-medium">
                <div class="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
                    ${can('W', 'packinglist-barcode') ? `<button class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 delete-packinglist-btn" data-barcode="${item.Barcode}">Hapus</button>` : ''}
                </div>
            </td>`;
        }
        let rowData = '';
        config.columns.forEach(col => {
            let cellValue;
            if (col.key === 'Price' || col.key === 'TotalHargaPenjualan') {
                cellValue = formatRupiah(item[col.key]);
            } else if (col.key === 'Status') {
                cellValue = statusHTML;
            } else {
                cellValue = item[col.key] || '-';
            }
            rowData += `<td data-label="${col.label}" class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 break-words">${cellValue}</td>`;
        });
        const newRow = document.createElement('tr');
        if (type === 'packinglist-riwayat') {
            newRow.classList.add('cursor-pointer', 'hover:bg-gray-50', 'dark:hover:bg-gray-700', 'packinglist-row-clickable');
            newRow.dataset.idno = item.IDNo;
            newRow.dataset.headerData = JSON.stringify(item);
        }
        if (type === 'penjualan') {
            newRow.classList.add('cursor-pointer', 'hover:bg-gray-50', 'dark:hover:bg-gray-700', 'sales-row-clickable');
            newRow.dataset.activityId = item.Id;
        }
        if (type === 'items') {
            newRow.classList.add('cursor-pointer', 'hover:bg-gray-50', 'dark:hover:bg-gray-700', 'item-row-clickable');
            newRow.dataset.id = item.Id;
        }
        if (isLookupPage) {
            newRow.classList.add('cursor-pointer', 'hover:bg-gray-50', 'dark:hover:bg-gray-700', 'lookup-row-clickable');
            newRow.dataset.id = item.Id;
        }
        newRow.innerHTML = rowData + actions;
        tableBody.appendChild(newRow);
    });
}


export async function handleEditItem(id) {
    try {
        const itemRes = await fetch(`/api/data/items/${id}`);
        const itemResult = await itemRes.json();
        if (itemResult.status !== 'success') throw new Error(itemResult.message);

        const formRes = await fetch('/api/form-data');
        const formResult = await formRes.json();
        if (formResult.status !== 'success') throw new Error(formResult.message);

        const item = itemResult.data;
        const { materials, sizes, brands, models } = formResult.data;

        const populateEditSelect = (element, data, selectedId) => {
            element.innerHTML = data.map(d => `<option value="${d.Id}" ${d.Id === selectedId ? 'selected' : ''}>${d.Name}</option>`).join('');
        };

        elements.itemEditId.value = id;
        elements.itemEditName.value = item.Name;
        elements.itemEditPrice.value = item.Price;
        elements.itemEditSerial.value = item.Serial || '';
        populateEditSelect(elements.itemEditMaterial, materials, item.MaterialId);
        populateEditSelect(elements.itemEditSize, sizes, item.SizeId);
        populateEditSelect(elements.itemEditBrand, brands, item.BrandId);
        populateEditSelect(elements.itemEditModel, models, item.ModelId);
        
        elements.itemEditModal.classList.remove('hidden');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}
export function renderPackingListDetail(details, headerData) {
    const contentContainer = elements.salesDetailContent;

    let headerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm border-b pb-3 dark:border-gray-700 text-gray-800 dark:text-gray-300">
            <div><strong class="font-semibold">ID:</strong> ${headerData.IDNo || '-'}</div>
            <div><strong class="font-semibold">Customer:</strong> ${headerData.CustomerName || '-'}</div>
            <div><strong class="font-semibold">No. DO:</strong> ${headerData.DONo || '-'}</div>
            <div><strong class="font-semibold">No. WO:</strong> ${headerData.WONo || '-'}</div>
        </div>
    `;

    if (!details || details.length === 0) {
        contentContainer.innerHTML = headerHTML + '<p class="text-center text-gray-500 dark:text-gray-400">Tidak ada item detail untuk packing list ini.</p>';
        return;
    }

    const headers = ['InvId', 'Size', 'Color', 'Qty'];
    let tableHTML = `<div class="responsive-table-container"><table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-700"><tr>
            ${headers.map(h => `<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">${h}</th>`).join('')}
        </tr></thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">`;

    let totalQty = 0;
    details.forEach(item => {
        totalQty += parseInt(item.Qty, 10) || 0;
        tableHTML += `<tr>
            <td data-label="InvId" class="px-4 py-2 text-sm text-gray-800 dark:text-gray-300">${item.InvId || '-'}</td>
            <td data-label="Size" class="px-4 py-2 text-sm text-gray-800 dark:text-gray-300">${item.Size || '-'}</td>
            <td data-label="Color" class="px-4 py-2 text-sm text-gray-800 dark:text-gray-300">${item.Color || '-'}</td>
            <td data-label="Qty" class="px-4 py-2 text-sm text-gray-800 dark:text-gray-300">${item.Qty || 0}</td>
        </tr>`;
    });

    tableHTML += `</tbody>
        <tfoot class="bg-gray-50 dark:bg-gray-700 font-bold text-gray-900 dark:text-white">
            <tr>
                <td colspan="3" class="px-4 py-2 text-right text-sm">Total Kuantitas</td>
                <td class="px-4 py-2 text-sm">${totalQty}</td>
            </tr>
        </tfoot>
    </table></div>`;
    
    contentContainer.innerHTML = headerHTML + tableHTML;
}

async function saveItemChanges() {
    const id = elements.itemEditId.value;
    const data = {
        Name: elements.itemEditName.value,
        Price: parseFloat(elements.itemEditPrice.value),
        MaterialId: elements.itemEditMaterial.value,
        SizeId: elements.itemEditSize.value,
        BrandId: elements.itemEditBrand.value,
        ModelId: elements.itemEditModel.value,
        Serial: elements.itemEditSerial.value
    };
    try {
        const result = await api.updateItem(id, data);
        if (result.status !== 'success') throw new Error(result.message);
        showNotification(result.message, 'success');
        closeItemEditModal();
        if (refreshDataCallback) {
            refreshDataCallback('items');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}
export function setSalesDetailModalTitle(title) {
    if (elements.salesDetailModalTitle) {
        elements.salesDetailModalTitle.textContent = title;
    }
}