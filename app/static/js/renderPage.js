import { resetLazyLoadState, lazyLoadState, currentSort, setCurrentSort, pageConfig, can } from './state.js';
import { api } from './api.js';
import { showNotification, showLoader, openLookupModal, closeLookupModal, renderTableRows, formatRupiah} from './ui.js';
import { renderAnalyticsShell, stopRealtimeUpdates } from './analytics.js'


const appContent = document.getElementById('app-content');
const pageTitle = document.getElementById('page-title');
const debounce = (func, delay = 500) => {
        let timeout;
        return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); };
    };

    export async function loadTableData(type, searchQuery = '', append = false) {
        if (lazyLoadState.isLoading) return;
        lazyLoadState.isLoading = true;
    
        const dataContainer = document.getElementById('data-container');
        const loaderId = 'lazy-loader';
        
        if (!append) {
            showLoader(dataContainer);
        } else {
            const loaderDiv = document.createElement('div');
            loaderDiv.id = loaderId;
            loaderDiv.innerHTML = `<div class="flex justify-center items-center p-4"><svg class="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></div>`;
            const tableContainer = dataContainer.querySelector('.overflow-x-auto');
            if(tableContainer) tableContainer.appendChild(loaderDiv);
        }
        
        try {
            const result = await api.fetchData(type, searchQuery);
            if (result.status !== 'success') throw new Error(result.message);
            
            lazyLoadState.totalRecords = result.total_records;
            const config = pageConfig[`#${type}`];
    
            if (!append) {
                let headerHTML = '';
                config.columns.forEach(col => {
                    const isCurrentSortCol = currentSort.column === col.key;
                    const sortIcon = isCurrentSortCol ? (currentSort.order === 'asc' ? '▲' : '▼') : '';
                    headerHTML += `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer sortable-header" data-column="${col.key}">${col.label} <span class="sort-indicator">${sortIcon}</span></th>`;
                });
                const tableHTML = `<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr>${headerHTML}${!['penjualan', 'penerimaan', 'piutang', 'analytics'].includes(type) ? '<th class="relative px-6 py-3"><span class="sr-only">Actions</span></th>' : ''}</tr></thead><tbody class="bg-white divide-y divide-gray-200"></tbody></table></div>`;
                dataContainer.innerHTML = tableHTML;
    
                dataContainer.querySelectorAll('.sortable-header').forEach(header => {
                    header.addEventListener('click', () => {
                        const column = header.dataset.column;
                        if (currentSort.column === column) {
                            setCurrentSort(column, currentSort.order === 'asc' ? 'desc' : 'asc');
                        } else {
                            setCurrentSort(column, 'asc');
                        }
                        lazyLoadState.currentPage = 1;
                        loadTableData(type, document.getElementById('search-input').value, false);
                    });
                });
            }
            
            const tableBody = dataContainer.querySelector('tbody');
            if (result.data.length === 0 && !append) {
                tableBody.innerHTML = `<tr><td colspan="${config.columns.length + 1}" class="text-center py-4 text-gray-500">Tidak ada data ditemukan.</td></tr>`;
            } else {
                renderTableRows(tableBody, result.data, type);
            }
    
            if (lazyLoadState.observer) lazyLoadState.observer.disconnect();
            
            const lastRow = tableBody.querySelector('tr:last-child');
            if (lastRow) {
                lazyLoadState.observer = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting && !lazyLoadState.isLoading) {
                        const totalLoaded = lazyLoadState.currentPage * 50;
                        if (totalLoaded < lazyLoadState.totalRecords) {
                            lazyLoadState.currentPage++;
                            loadTableData(type, searchQuery, true);
                        }
                    }
                }, { threshold: 0.1 });
                lazyLoadState.observer.observe(lastRow);
            }
    
        } catch (error) {
            if (!append && dataContainer) dataContainer.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
        } finally {
            lazyLoadState.isLoading = false;
            const loader = document.getElementById(loaderId);
            if (loader) loader.remove();
        }
    }

    export function refreshData(type){
        lazyLoadState.currentPage = 1;
        loadTableData(type, document.getElementById('search-input')?.value || '', false);
    }
     
    export async function renderPage(hash) {
        resetLazyLoadState();
        stopRealtimeUpdates();
        
        const config = pageConfig[hash];
        if (!config) {
            appContent.innerHTML = '<h2>Selamat Datang</h2><p>Pilih menu di samping untuk memulai.</p>';
            pageTitle.textContent = 'Dashboard';
            return;
        }

        pageTitle.textContent = config.title;

        if (config.type === 'analytics') {
            renderAnalyticsShell();
            return;
        }
        if (config.type === 'multipayroll') {
        renderMultiPayrollPage();
        return;
        }
        if (config.type === 'payroll-checksum') {
        renderPayrollChecksumPage();
        return;
        }
        if (['piutang'].includes(config.type)) {
            appContent.innerHTML = `<div class="p-4 text-center bg-gray-50 rounded-lg">Fungsionalitas untuk <strong>${config.title}</strong> belum diimplementasikan.</div>`;
            return;
        }
        
        if (config.type === 'add-item') {
            renderAddItemForm();
            return;
        }
        const isLookupPage = ['materials', 'sizes', 'brands', 'models'].includes(config.type);
        const showAddNewBtn = can('W', config.type) && isLookupPage;
        const addNewBtnHTML = showAddNewBtn ? '<button id="add-new-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-md">Tambah Baru</button>' : '';


        let filtersHTML = '';
        if (config.type === 'penjualan' || config.type === 'penerimaan') {
            filtersHTML = `
                <div class="flex flex-wrap items-center gap-4 mb-4">
                    <input type="date" id="start-date" class="rounded-md border-gray-300 shadow-sm">
                    <span>s/d</span>
                    <input type="date" id="end-date" class="rounded-md border-gray-300 shadow-sm">
                    <button id="filter-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Filter</button>
                </div>`;
        }
        let uploadHTML = '';
        if (config.type === 'packinglist-barcode' && can('W', 'packinglist-barcode')) {
            uploadHTML = `
                <div class="mt-4 p-4 border-t border-gray-200">
                    <label for="csv-upload-input" class="block text-sm font-medium text-gray-700 mb-2">
                        Batch Insert / Update via CSV
                    </label>
                    <div class="flex items-center gap-4">
                        <input type="file" id="csv-upload-input" accept=".csv" class="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-indigo-50 file:text-indigo-700
                            hover:file:bg-indigo-100"
                        />
                        <button id="upload-csv-btn" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap">
                            Upload File
                        </button>
                    </div>
                </div>
            `;
        }
    
    // 3. Sisipkan HTML yang benar ke dalam template
    appContent.innerHTML = `
    ${uploadHTML}
        <div class="bg-white p-4 rounded-lg shadow-md">
            <div class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <input type="search" id="search-input" placeholder="Cari..." class="w-full sm:w-1/3 rounded-md border-gray-300 shadow-sm">
                <div class="flex gap-x-2">
                    <button id="refresh-btn" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Refresh</button>
                    ${addNewBtnHTML}
                </div>
            </div>
            ${filtersHTML}
            <div id="data-container" class="overflow-x-auto"></div>
            
        </div>`;
        // appContent.innerHTML = `
        //     <div class="bg-white p-4 rounded-lg shadow-md">
        //         <div class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        //             <input type="search" id="search-input" placeholder="Cari..." class="w-full sm:w-1/3 rounded-md border-gray-300 shadow-sm">
        //             <div class="flex gap-x-2">
        //                 <button id="refresh-btn" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Refresh</button>
        //                 ${can('W', config.type) && !['items', 'penjualan', 'penerimaan', 'piutang'].includes(config.type) ? '<button id="add-new-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-md">Tambah Baru</button>' : ''}
        //             </div>
        //         </div>
        //         ${filtersHTML}
        //         <div id="data-container"></div>
        //     </div>`;
        
        await loadTableData(config.type, '', false);
        
        const debouncedSearch = debounce(() => refreshData(config.type), 500);
        document.getElementById('search-input').addEventListener('input', debouncedSearch);

        document.getElementById('refresh-btn').addEventListener('click', () => refreshData(config.type));
        
        if (config.type === 'penjualan' || config.type === 'penerimaan') {
            document.getElementById('filter-btn').addEventListener('click', () => refreshData(config.type));
        }
        
        const addNewBtn = document.getElementById('add-new-btn');
        if (addNewBtn) addNewBtn.addEventListener('click', () => handleAddNew(config.type));

        const uploadBtn = document.getElementById('upload-csv-btn');
            if (uploadBtn) {
                uploadBtn.addEventListener('click', async () => {
                    const fileInput = document.getElementById('csv-upload-input');
                    const file = fileInput.files[0];

                    if (!file) {
                        showNotification('Silakan pilih file CSV terlebih dahulu.', 'error');
                        return;
                    }

                    uploadBtn.disabled = true;
                    uploadBtn.textContent = 'Mengunggah...';

                    const formData = new FormData();
                    formData.append('file', file);

                    try {
                        const response = await fetch('/api/packinglist/upload-csv', {
                            method: 'POST',
                            body: formData,
                        });
                        const result = await response.json();

                        if (response.ok) {
                            showNotification(result.message || 'File berhasil diproses.', 'success');
                            refreshData(config.type); // Muat ulang data tabel
                        } else {
                            throw new Error(result.message || result.error || 'Terjadi kesalahan saat mengunggah.');
                        }
                    } catch (error) {
                        showNotification(error.message, 'error');
                    } finally {
                        uploadBtn.disabled = false;
                        uploadBtn.textContent = 'Upload File';
                        fileInput.value = ''; // Reset input file
                    }
                });
            }
    }
    export function renderAddItemForm() {
        appContent.innerHTML = `
            <div class="bg-white p-6 md:p-8 rounded-lg shadow-md max-w-4xl mx-auto">
                <form id="addItemForm" class="space-y-6">
                    <div><label for="name" class="block text-sm font-medium text-gray-900">Nama Item</label><div class="mt-2"><input type="text" id="name" name="name" required class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300"></div></div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                        <div><label for="materialId" class="block text-sm font-medium text-gray-900">Bahan</label><div class="mt-2 flex rounded-md shadow-sm"><select id="materialId" name="materialId" required class="block w-full rounded-none rounded-l-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300"></select>${can('W', 'materials') ? '<button type="button" data-type="material" class="addNewLookupBtn relative -ml-px inline-flex items-center px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50">+</button>' : ''}</div></div>
                        <div><label for="sizeId" class="block text-sm font-medium text-gray-900">Ukuran</label><div class="mt-2 flex rounded-md shadow-sm"><select id="sizeId" name="sizeId" required class="block w-full rounded-none rounded-l-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300"></select>${can('W', 'sizes') ? '<button type="button" data-type="size" class="addNewLookupBtn relative -ml-px inline-flex items-center px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50">+</button>' : ''}</div></div>
                        <div><label for="brandId" class="block text-sm font-medium text-gray-900">Merek</label><div class="mt-2 flex rounded-md shadow-sm"><select id="brandId" name="brandId" required class="block w-full rounded-none rounded-l-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300"></select>${can('W', 'brands') ? '<button type="button" data-type="brand" class="addNewLookupBtn relative -ml-px inline-flex items-center px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50">+</button>' : ''}</div></div>
                        <div><label for="modelId" class="block text-sm font-medium text-gray-900">Model</label><div class="mt-2 flex rounded-md shadow-sm"><select id="modelId" name="modelId" required class="block w-full rounded-none rounded-l-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300"></select>${can('W', 'models') ? '<button type="button" data-type="model" class="addNewLookupBtn relative -ml-px inline-flex items-center px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50">+</button>' : ''}</div></div>
                    </div>
                    <div><label for="price" class="block text-sm font-medium text-gray-900">Harga</label><div class="relative mt-2 rounded-md shadow-sm"><input type="number" name="price" id="price" class="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300" placeholder="0.00" step="0.01" value="0.00"><div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span class="text-gray-500 sm:text-sm">Rp</span></div></div></div>
                    <div class="flex items-center justify-end gap-x-4 border-t pt-4 mt-4"><button type="button" id="resetBtn" class="text-sm font-semibold text-gray-900">Reset</button><button type="submit" id="submitBtn" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">Simpan Item</button></div>
                </form>
            </div>`;
        initializeAddItemForm();
    }
    
    export async function initializeAddItemForm() {
        const form = document.getElementById('addItemForm');
        if (!form) return;

        const populateSelect = (selectId, data) => {
            const select = document.getElementById(selectId);
            if (!select) return;
            select.innerHTML = `<option value="">-- Pilih --</option>`;
            data.forEach(item => { select.innerHTML += `<option value="${item.Id}">${item.Name}</option>`; });
        };

        try {
            const result = await api.getFormData();
            if (result.status !== 'success') throw new Error(result.message);
            populateSelect('materialId', result.data.materials);
            populateSelect('sizeId', result.data.sizes);
            populateSelect('brandId', result.data.brands);
            populateSelect('modelId', result.data.models);
        } catch (error) { showNotification(error.message, 'error'); }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true; submitBtn.textContent = 'Menyimpan...';
            const formData = new FormData(form);
            const data = { name: formData.get('name'), sizeId: formData.get('sizeId'), brandId: formData.get('brandId'), modelId: formData.get('modelId'), materialId: formData.get('materialId'), price: parseFloat(formData.get('price')) };
            try {
                const result = await api.addItem(data);
                if (result.status !== 'success') throw new Error(result.message);
                showNotification(result.message, 'success');
                form.reset();
            } catch (error) { showNotification(error.message, 'error'); } finally { submitBtn.disabled = false; submitBtn.textContent = 'Simpan Item'; }
        });

        document.getElementById('resetBtn').addEventListener('click', () => form.reset());
        document.querySelectorAll('.addNewLookupBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemType = e.currentTarget.dataset.type;
                const selectId = e.currentTarget.dataset.selectId;
                handleAddNew(itemType + 's', itemType, (newItem) => {
                    const select = document.getElementById(selectId);
                    select.innerHTML += `<option value="${newItem.Id}">${newItem.Name}</option>`;
                    select.value = newItem.Id;
                });
            });
        });
    }

    export function handleAddNew(type) {
    const typeName = type === 'materials' ? 'Bahan' : type.slice(0, -1);
    openLookupModal({
        title: `Tambah ${typeName} Baru`,
        label: `Nama ${typeName}:`,
        placeholder: 'Masukkan nama...',
        saveText: 'Simpan',
        onSave: async (name) => { // 'name' sekarang akan diterima dengan benar
            try {
                // Validasi sederhana di frontend
                if (!name) {
                    throw new Error('Nama tidak boleh kosong.');
                }
                const result = await api.addLookupItem(type.slice(0, -1), name);
                if (result.status !== 'success') {
                    throw new Error(result.message);
                }
                showNotification(result.message, 'success');
                refreshData(type);
                return true; // <-- Kembalikan 'true' jika berhasil
            } catch (error) {
                showNotification(error.message, 'error');
                return false; // <-- Kembalikan 'false' jika gagal
            }
        }
    });
}

    export function handleDeletePackingList(barcode) {
    openLookupModal({
        title: 'Konfirmasi Hapus',
        label: `Apakah Anda yakin ingin menghapus barcode ${barcode} dari Packing List?`,
        // Sembunyikan input field karena tidak diperlukan untuk konfirmasi
        inputVisible: false, 
        saveText: 'Ya, Hapus',
        // 'onSave' sekarang menjadi fungsi yang sangat fokus
        onSave: async (modal) => {
            try {
                const result = await api.deletePackingListItem(barcode);
                if (result.status !== 'success') {
                    throw new Error(result.message);
                } else{
                showNotification(result.message, 'success');
                refreshData('packinglist-barcode');
                return true;
                }
                
                 // Kembalikan 'true' untuk menandakan sukses

            } catch (error) {
                showNotification(error.message, 'error');
                return false; // Kembalikan 'false' jika gagal
            }
        }
    });
}
    export function handleDelete(type, id) {
        openLookupModal({
            title: 'Konfirmasi Hapus', label: 'Apakah Anda yakin ingin menghapus item ini?', saveText: 'Ya, Hapus',
            onSave: async () => {
                try {
                    const result = await api.deleteData(type, id);
                    if (result.status !== 'success') throw new Error(result.message);
                    showNotification(result.message, 'success');
                    closeLookupModal();
                    refreshData(type);
                } catch (error) { showNotification(error.message, 'error'); }
            }
        });
    }

    export async function handleToggleActive(type, id) {
        try {
            const result = await api.toggleActiveStatus(type, id);
            if (result.status !== 'success') throw new Error(result.message);
            showNotification(result.message, 'success');
            refreshData(type);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    export async function handleEditLookup(type, id, currentName) {
        const typeName = type === 'materials' ? 'Bahan' : type.slice(0, -1);
        openLookupModal({
            title: `Edit ${typeName}`, label: `Nama ${typeName} baru:`, value: currentName,
            onSave: async (newName) => {
                // Implementasi logika update untuk lookup item di sini jika diperlukan
                showNotification(`Logika untuk update ${typeName} belum diimplementasikan.`, 'error');
            }
        });
    }

    function renderMultiPayrollPage() {
    appContent.innerHTML = `
        <div class="max-w-6xl mx-auto space-y-6">
            <div id="upload-section" class="bg-white p-6 rounded-lg shadow-md">
                <h2 class="text-xl font-semibold mb-4 text-gray-800">1. Upload File Payroll (.xlsx)</h2>
                <input type="file" id="payroll-file-input" accept=".xlsx" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                <p id="file-info" class="text-xs text-gray-500 mt-2"></p>
            </div>

            <div id="settings-wrapper" class="hidden">
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-xl font-semibold mb-4 text-gray-800">2. Pengaturan Header</h2>
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                        <div><label class="block font-medium">Corporate ID</label><input type="text" id="corporate-id" value="ibsjasigun" class="mt-1 w-full rounded-md border-gray-300"></div>
                        <div><label class="block font-medium">Company Code</label><input type="text" id="company-code" value="57900100" class="mt-1 w-full rounded-md border-gray-300"></div>
                        <div><label class="block font-medium">File No (auto)</label><input type="number" id="file-no" value="91" class="mt-1 w-full rounded-md border-gray-300"></div>
                        <div><label class="block font-medium">Tgl. Transfer</label><input type="date" id="transfer-date" class="mt-1 w-full rounded-md border-gray-300"></div>
                        <div><label class="block font-medium">Jam Transfer</label>
                            <select id="transfer-time" class="mt-1 w-full rounded-md border-gray-300">
                                ${Array.from({length: 24}, (_, i) => `<option value="${String(i).padStart(2, '0')}">${String(i).padStart(2, '0')}:00</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-span-2 md:col-span-3 lg:col-span-5"><label class="block font-medium">Rekening Sumber</label><input type="text" id="source-account" value="5490412303" class="mt-1 w-full rounded-md border-gray-300"></div>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-lg shadow-md mt-6">
                    <h2 class="text-xl font-semibold mb-4 text-gray-800">3. Pemetaan Kolom (Column Mapping)</h2>
                    <p class="text-sm text-gray-600 mb-4">Pilih judul kolom dari file Excel Anda yang sesuai dengan setiap field yang dibutuhkan.</p>
                    <div id="column-mapping-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm"></div>
                    <button id="save-mapping-btn" class="text-sm px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                            Simpan Mapping
                        </button>
                </div>
            </div>

            <div id="action-wrapper" class="hidden text-center mt-6">
                <button id="convert-btn" class="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">Konversi ke TXT</button>
            </div>
            <div id="result-section" class="hidden"></div>
        </div>
    `;
    setupMultiPayrollEventListeners();
}


function setupMultiPayrollEventListeners() {
    const fileInput = document.getElementById('payroll-file-input');
    const settingsWrapper = document.getElementById('settings-wrapper');
    const actionWrapper = document.getElementById('action-wrapper');
    const mappingContainer = document.getElementById('column-mapping-container');
    const fileInfo = document.getElementById('file-info');
    const resultSection = document.getElementById('result-section');
    const convertBtn = document.getElementById('convert-btn');
    const fileNoInput = document.getElementById('file-no');
    const uploadSection = document.getElementById('upload-section');
    let savedMapping = null;
    const loadInitialFileNo = async () => {
        try {
            const result = await api.getSetting('payrollFileNo');
            if (result.status === 'success') {
                fileNoInput.value = result.value;
            } 
            const mappingResult = await api.getSetting('payrollColumnMapping');
            if (mappingResult.status === 'success') {
                savedMapping = JSON.parse(mappingResult.value);
            }
        } catch (error) {
            console.error('Gagal memuat nomor file dari server:', error);
        }
    };
    loadInitialFileNo();

    // Set tanggal hari ini
    document.getElementById('transfer-date').value = new Date().toISOString().split('T')[0];

    const requiredFields = [ "Credited Account", "Receiver Name", "Amount", "Remark" ];
    const allFields = [ "Transaction ID", "Transfer Type", "Beneficiary ID", "Credited Account", "Receiver Name", "Amount", "Employee ID", "Remark", "Email", "SWIFT", "Cust Type", "Cust Residence" ];

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        resultSection.classList.add('hidden'); // Sembunyikan hasil lama saat file baru dipilih
        if (!file) {
            settingsWrapper.classList.add('hidden');
            actionWrapper.classList.add('hidden');
            fileInfo.textContent = '';
            return;
        }
        fileInfo.textContent = `File dipilih: ${file.name}`;
        
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/multipayroll/get-headers', { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            const headers = result.headers;
            mappingContainer.innerHTML = '';
            
            allFields.forEach(field => {
                const isRequired = requiredFields.includes(field);
                let dropdownOptions = `<option value="">-- Abaikan Kolom Ini --</option>`;
                headers.forEach(header => {
                    const savedColumn = savedMapping ? savedMapping[field] : null;
                    const isSelected = header && savedColumn === header;
                    // const isSelected = header && (
                    //     field.toLowerCase().replace(/ /g, '') === header.toLowerCase().replace(/ /g, '') ||
                    //     (field === 'Credited Account' && header.toLowerCase().includes('rekening')) ||
                    //     (field === 'Receiver Name' && header.toLowerCase().includes('nama')) ||
                    //     (field === 'Amount' && header.toLowerCase().includes('amount')) ||
                    //     (field === 'Remark' && header.toLowerCase().includes('remark'))
                    // );
                    dropdownOptions += `<option value="${header}" ${isSelected ? 'selected' : ''}>${header}</option>`;
                });

                const div = document.createElement('div');
                div.innerHTML = `
                    <label class="block font-medium text-gray-700">${field} ${isRequired ? '<span class="text-red-500">*</span>' : ''}</label>
                    <select data-field="${field}" class="column-mapper mt-1 block w-full rounded-md border-gray-300 shadow-sm ${isRequired ? 'border-red-300' : ''}">
                        ${dropdownOptions}
                    </select>`;
                mappingContainer.appendChild(div);
            });

            settingsWrapper.classList.remove('hidden');
            actionWrapper.classList.remove('hidden');

        } catch (error) {
            showNotification(error.message, 'error');
            settingsWrapper.classList.add('hidden');
            actionWrapper.classList.add('hidden');
        }
    });

    document.body.addEventListener('click', async (e) => {
        if (e.target.id === 'save-mapping-btn') {
            const currentMapping = {};
            document.querySelectorAll('.column-mapper').forEach(select => {
                currentMapping[select.dataset.field] = select.value;
            });

            try {
                const result = await api.updateSetting('payrollColumnMapping', JSON.stringify(currentMapping));
                if (result.status !== 'success') throw new Error(result.message);
                
                showNotification('Pemetaan kolom berhasil disimpan.', 'success');
                savedMapping = currentMapping; // Update mapping yang tersimpan di memori
            } catch (error) {
                showNotification(`Gagal menyimpan mapping: ${error.message}`, 'error');
            }
        }
    });

    if (convertBtn) {
        convertBtn.addEventListener('click', async () => {
            const file = fileInput.files[0];
            if (!file) {
                showNotification('Silakan pilih file XLSX terlebih dahulu.', 'error');
                return;
            }

            // 1. Kumpulkan Pengaturan
            const settings = {
                corporate_id: document.getElementById('corporate-id').value,
                company_code: document.getElementById('company-code').value,
                file_no: parseInt(document.getElementById('file-no').value, 10),
                transfer_date: document.getElementById('transfer-date').value.replace(/-/g, ''),
                transfer_time: document.getElementById('transfer-time').value,
                source_account: document.getElementById('source-account').value,
            };

            // 2. Kumpulkan Mapping
            const mapping = {};
            document.querySelectorAll('.column-mapper').forEach(select => {
                mapping[select.dataset.field] = select.value;
            });
            
            // Validasi mapping
            for (const field of requiredFields) {
                if (!mapping[field]) {
                    showNotification(`Kolom untuk "${field}" wajib dipetakan.`, 'error');
                    return;
                }
            }

            // 3. Kirim data ke server
            const formData = new FormData();
            formData.append('file', file);
            formData.append('settings', JSON.stringify(settings));
            formData.append('mapping', JSON.stringify(mapping));

            convertBtn.disabled = true;
            convertBtn.textContent = 'Memproses...';

            try {
                const response = await fetch('/api/multipayroll/convert', { method: 'POST', body: formData });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Gagal melakukan konversi.');

                uploadSection.classList.add('hidden');
                settingsWrapper.classList.add('hidden');
                actionWrapper.classList.add('hidden');

                // 2. Tampilkan Hasil dengan tombol "Konversi Lagi"
                resultSection.innerHTML = `
                    <div class="bg-green-50 p-6 rounded-lg shadow-md space-y-4 border border-green-200">
                        <div class="flex justify-between items-center">
                            <h2 class="text-xl font-semibold text-gray-800">🎉 Konversi Berhasil!</h2>
                        </div>
                        <div class="flex justify-between items-center text-sm bg-white p-3 rounded">
                            <span>Total Data: <strong>${result.total_records} baris</strong></span>
                            <span>Total Nominal: <strong>${formatRupiah(result.total_amount)}</strong></span>
                        </div>
                        <div>
                            <textarea id="output-txt" rows="8" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm font-mono text-xs" readonly>${result.payroll_data}</textarea>
                        </div>
                        <div class="text-center">
                            <button id="download-txt-btn" class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Download File TXT</button>
                        </div>
                    </div>
                `;
                resultSection.classList.remove('hidden');

                const download = (filename, text) => {
                    const element = document.createElement('a');
                    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
                    element.setAttribute('download', filename);
                    element.style.display = 'none';
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                };

                  document.getElementById('download-txt-btn').addEventListener('click', () => {
                    // Ambil tanggal dari input field (format YYYY-MM-DD)
                    const dateInput = document.getElementById('transfer-date').value;
                    
                    // Buat objek tanggal dan format ke DD-Mon-YYYY
                    const dateObj = new Date(dateInput + 'T00:00:00'); // Tambahkan T00:00 untuk menghindari masalah timezone
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = dateObj.toLocaleString('en-GB', { month: 'short' });
                    const year = dateObj.getFullYear();
                    const formattedDate = `${day}-${month}-${year}`;

                    download(`MultiAutoTransfer-${formattedDate}.txt`, result.payroll_data);
                });

                 const newFileNo = settings.file_no + 1;
                fileNoInput.value = newFileNo;
                
                // Kirim nomor baru ke server untuk disimpan
                api.updateSetting('payrollFileNo', newFileNo).catch(err => {
                    console.error("Gagal menyimpan nomor file ke server:", err);
                    showNotification("Gagal menyimpan nomor urut file ke server.", "error");
                });

            } catch (error) {
                showNotification(error.message, 'error');
                resultSection.classList.add('hidden');
            } finally {
                convertBtn.disabled = false;
                convertBtn.textContent = 'Konversi ke TXT';
            }
        });
    }
}

function renderPayrollChecksumPage() {
    appContent.innerHTML = `
        <div class="max-w-xl mx-auto space-y-6">
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h2 class="text-xl font-semibold mb-4 text-gray-800">1. Upload File Payroll (TXT)</h2>
                <input type="file" id="checksum-file-input" accept=".txt" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
            </div>
            <div class="text-center">
                <button id="checksum-btn" class="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">
                    Buat File Checksum
                </button>
            </div>
            <div id="checksum-result-section" class="hidden bg-white p-6 rounded-lg shadow-md space-y-4">
                <h2 class="text-xl font-semibold text-gray-800">2. Hasil Checksum</h2>
                <div>
                    <textarea id="output-checksum" rows="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm font-mono text-xs" readonly></textarea>
                </div>
                <div class="text-center">
                    <button id="download-checksum-btn" class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Download File Checksum</button>
                </div>
            </div>
        </div>
    `;
    
    // Setup event listeners for this new page
    const checksumBtn = document.getElementById('checksum-btn');
    const fileInput = document.getElementById('checksum-file-input');
    const resultSection = document.getElementById('checksum-result-section');
    const outputChecksum = document.getElementById('output-checksum');

    checksumBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) {
            showNotification('Silakan pilih file TXT terlebih dahulu.', 'error');
            return;
        }
        
        checksumBtn.disabled = true;
        checksumBtn.textContent = 'Menghitung...';

        try {
            const result = await api.calculatePayrollChecksum(file);
            if (result.status !== 'success') throw new Error(result.message);

            outputChecksum.value = result.checksum;
            resultSection.classList.remove('hidden');

            document.getElementById('download-checksum-btn').onclick = () => {
                const download = (filename, text) => {
                    const element = document.createElement('a');
                    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
                    element.setAttribute('download', filename);
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                };
                download(`Checksum_${file.name}`, result.checksum);
            };

        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            checksumBtn.disabled = false;
            checksumBtn.textContent = 'Buat File Checksum';
        }
    });
}