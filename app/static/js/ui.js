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
            <div class="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div><strong>Nomor:</strong> ${header.Nomor || '-'}</div>
                <div><strong>Nama:</strong> ${header.Name || '-'}</div>
                <div><strong>Cabang:</strong> ${header.Cabang || '-'}</div>
            </div>
        `;
    }

    if (details.length === 0) {
        elements.salesDetailContent.innerHTML = headerHTML + '<p class="text-center text-gray-500">Tidak ada item detail untuk penjualan ini.</p>';
        return;
    }

    const headers = ['Nama Barang', 'Qty', 'Harga', 'Diskon', 'Subtotal', 'Note', 'Serial'];
    let tableHTML = `<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50"><tr>
            ${headers.map(h => `<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">${h}</th>`).join('')}
        </tr></thead>
        <tbody class="bg-white divide-y divide-gray-200">`;

    let totalQty = 0;
    let totalDiscount = 0;
    let totalSubtotal = 0;

    details.forEach(item => {
        totalQty += parseFloat(item.Qty) || 0;
        totalDiscount += parseFloat(item.Discount) || 0;
        totalSubtotal += parseFloat(item.Subtotal) || 0;

        tableHTML += `<tr>
            <td class="px-4 py-2 whitespace-nowrap text-sm">${item.NamaBarang || '-'}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm">${item.Qty || 0}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm">${formatRupiah(item.Price)}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm">${formatRupiah(item.Discount)}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm">${formatRupiah(item.Subtotal)}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm">${item.Note || '-'}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm">${item.Serial || '-'}</td>
        </tr>`;
    });

    tableHTML += `</tbody>
        <tfoot class="bg-gray-50 font-bold">
            <tr>
                <td class="px-4 py-2 text-right text-sm">Total</td>
                <td class="px-4 py-2 text-sm">${totalQty}</td>
                <td class="px-4 py-2 text-sm"></td> <td class="px-4 py-2 text-sm">${formatRupiah(totalDiscount)}</td>
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
    elements.notification.className = `p-4 rounded-md mb-6 ${type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
    elements.notification.classList.remove('hidden');
    setTimeout(() => elements.notification.classList.add('hidden'), 5000);
}

export function showLoader(container) {
    container.innerHTML = `<div class="flex justify-center items-center p-10"><svg class="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>`;
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
}

export function renderTableRows(tableBody, data, type) {
    const config = pageConfig[`#${type}`];
    data.forEach(item => {
        const isActive = item.IsActive == 1;
        const statusHTML = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${isActive ? 'Aktif' : 'Nonaktif'}</span>`;
        const isActionable = !['penjualan', 'penerimaan', 'piutang', 'packinglist-barcode'].includes(type);
        // const actions = isActionable ? `<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        //     ${isSuperAdmin() ? `<button class="text-gray-500 hover:text-gray-800 toggle-active-btn" data-id="${item.Id}" title="${isActive ? 'Nonaktifkan' : 'Aktifkan'}">${isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>` : ''}
        //     ${can('W', 'items') && type === 'items' ? `<button class="text-indigo-600 hover:text-indigo-900 ml-4 edit-item-btn" data-id="${item.Id}">Edit</button>` : ''}
        //     ${can('W', type) && type !== 'items' ? `<button class="text-indigo-600 hover:text-indigo-900 ml-4 edit-lookup-btn" data-id="${item.Id}" data-name="${item.Name}">Edit</button>` : ''}
        //     ${can('D', type) ? `<button class="text-red-600 hover:text-red-900 ml-4 delete-btn" data-id="${item.Id}">Hapus</button>` : ''}
        //     ${can('P', 'items') && type === 'items' ? `<a href="/print/barcode/${item.Id}" target="_blank" class="text-green-600 hover:text-green-900 ml-4">Cetak Barcode</a>` : ''}
        // </td>` : '';
        let actions = '';
        const isLookupPage = ['materials', 'sizes', 'brands', 'models'].includes(type);
        if (type === 'packinglist-barcode') {
            // Aksi khusus untuk halaman Packing List
            actions = `<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                ${can('W', 'packinglist-barcode') ? `<button class="text-red-600 hover:text-red-900 delete-packinglist-btn" data-barcode="${item.Barcode}">Hapus</button>` : ''}
            </td>`;
        } else if (isLookupPage || type === 'items') {
            // Aksi untuk halaman Master Data
            actions = `<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                ${isSuperAdmin() ? `<button class="text-gray-500 hover:text-gray-800 toggle-active-btn" data-id="${item.Id}" title="${isActive ? 'Nonaktifkan' : 'Aktifkan'}">${isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>` : ''}
                ${can('W', 'items') && type === 'items' ? `<button class="text-indigo-600 hover:text-indigo-900 ml-4 edit-item-btn" data-id="${item.Id}">Edit</button>` : ''}
                ${can('W', type) && isLookupPage ? `<button class="text-indigo-600 hover:text-indigo-900 ml-4 edit-lookup-btn" data-id="${item.Id}" data-name="${item.Name}">Edit</button>` : ''}
                ${can('D', type) ? `<button class="text-red-600 hover:text-red-900 ml-4 delete-btn" data-id="${item.Id}">Hapus</button>` : ''}
                ${can('P', 'items') && type === 'items' ? `<a href="/print/barcode/${item.Id}" target="_blank" class="text-green-600 hover:text-green-900 ml-4">Cetak Barcode</a>` : ''}
            </td>`;
        }
        // --- PERUBAHAN DI SINI: Logika untuk memformat harga ---
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
            rowData += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${cellValue}</td>`;
        });
        // --- AKHIR PERUBAHAN ---
        const newRow = document.createElement('tr');
        if (type === 'packinglist-riwayat') {
            newRow.classList.add('cursor-pointer', 'hover:bg-gray-50', 'packinglist-row-clickable');
            newRow.dataset.idno = item.IDNo;
            // Simpan data baris untuk digunakan nanti di modal
            newRow.dataset.headerData = JSON.stringify(item);
        }
        if (type === 'penjualan') {
            newRow.classList.add('cursor-pointer', 'hover:bg-gray-50', 'sales-row-clickable');
            newRow.dataset.activityId = item.Id; // Tambahkan ID aktivitas
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

    // Buat header modal dari data yang kita simpan di baris
    let headerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm border-b pb-3">
            <div><strong>ID:</strong> ${headerData.IDNo || '-'}</div>
            <div><strong>Customer:</strong> ${headerData.CustomerName || '-'}</div>
            <div><strong>No. DO:</strong> ${headerData.DONo || '-'}</div>
            <div><strong>No. WO:</strong> ${headerData.WONo || '-'}</div>
        </div>
    `;

    if (!details || details.length === 0) {
        contentContainer.innerHTML = headerHTML + '<p class="text-center text-gray-500">Tidak ada item detail untuk packing list ini.</p>';
        return;
    }

    // Buat tabel untuk item detail
    const headers = ['InvId', 'Size', 'Color', 'Qty'];
    let tableHTML = `<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50"><tr>
            ${headers.map(h => `<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">${h}</th>`).join('')}
        </tr></thead>
        <tbody class="bg-white divide-y divide-gray-200">`;

    let totalQty = 0;
    details.forEach(item => {
        totalQty += parseInt(item.Qty, 10) || 0;
        tableHTML += `<tr>
            <td class="px-4 py-2 text-sm">${item.InvId || '-'}</td>
            <td class="px-4 py-2 text-sm">${item.Size || '-'}</td>
            <td class="px-4 py-2 text-sm">${item.Color || '-'}</td>
            <td class="px-4 py-2 text-sm">${item.Qty || 0}</td>
        </tr>`;
    });

    tableHTML += `</tbody>
        <tfoot class="bg-gray-50 font-bold">
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