// static/app.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Element Definitions ---
    const appContent = document.getElementById('app-content');
    const pageTitle = document.getElementById('page-title');
    const notification = document.getElementById('notification');
    
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebarContainer = document.getElementById('sidebar-container');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    const mainContent = document.getElementById('main-content');
    const sidebarNav = document.getElementById('sidebar-nav');

    const lookupModal = document.getElementById('lookup-edit-modal');
    const lookupModalTitle = document.getElementById('lookup-modal-title');
    const lookupModalLabel = document.getElementById('lookup-modal-label');
    const lookupModalInput = document.getElementById('lookup-edit-name');
    const lookupModalCancelBtn = document.getElementById('lookup-modal-cancel');
    const lookupModalSaveBtn = document.getElementById('lookup-modal-save');
    
    const itemEditModal = document.getElementById('item-edit-modal');
    const itemEditId = document.getElementById('item-edit-id');
    const itemEditName = document.getElementById('item-edit-name');
    const itemEditPrice = document.getElementById('item-edit-price');
    const itemEditMaterial = document.getElementById('item-edit-material');
    const itemEditSize = document.getElementById('item-edit-size');
    const itemEditBrand = document.getElementById('item-edit-brand');
    const itemEditModel = document.getElementById('item-edit-model');
    const itemEditSerial = document.getElementById('item-edit-serial');
    const itemModalCancelBtn = document.getElementById('item-modal-cancel');
    const itemModalSaveBtn = document.getElementById('item-modal-save');
    
    // --- Application State ---
    let userPermissions = [];
    let currentModalCallback = null;
    let currentSort = { column: 'CreatedDate', order: 'desc' };
    let lazyLoadState = {
        currentPage: 1,
        isLoading: false,
        totalRecords: 0,
        observer: null
    };
    const ITEMS_PER_PAGE = 50;

    // --- Configurations ---
    const pageConfig = {
        '#add-item': { title: 'Tambah Barang Baru', type: 'add-item' },
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
                { key: 'Salesman', label: 'Salesman' }, { key: 'Nama', label: 'Nama' }, { key: 'Daerah', label: 'Daerah' },
                { key: 'Telepon', label: 'Telepon' }, { key: 'TotalPenjualanLusin', label: 'Total (Lusin)' },
                { key: 'TotalHargaPenjualan', label: 'Total Harga' }, { key: 'Pembayaran', label: 'Pembayaran' },
                { key: 'TanggalBayar', label: 'Tgl Bayar' }, { key: 'JatuhTempo', label: 'Jatuh Tempo' },
                { key: 'KeteranganPembayaran', label: 'Ket. Pembayaran' }, { key: 'Bypass', label: 'Bypass?' },
                { key: 'BypassDiterima', label: 'Bypass Diterima' }
            ]
        },
        '#materials': { 
            title: 'Kelola Bahan', type: 'materials', columns: [{ key: 'Name', label: 'Nama' }, { key: 'Status', label: 'Status' }] 
        },
        '#sizes': { 
            title: 'Kelola Ukuran', type: 'sizes', columns: [{ key: 'Name', label: 'Nama' }, { key: 'Status', label: 'Status' }] 
        },
        '#brands': { 
            title: 'Kelola Merek', type: 'brands', columns: [{ key: 'Name', label: 'Nama' }, { key: 'Status', label: 'Status' }] 
        },
        '#models': { 
            title: 'Kelola Model', type: 'models', columns: [{ key: 'Name', label: 'Nama' }, { key: 'Status', label: 'Status' }] 
        }
    };

    const permissionMap = {
        'add-item': {'W': 'WNB'}, 'items': {'R': 'RI', 'W': 'WI', 'D': 'DI', 'P': 'PB'}, 'penjualan': {'R': 'RP'},
        'materials': {'R': 'RM', 'W': 'WM', 'D': 'DM'}, 'sizes': {'R': 'RSz', 'W': 'WSz', 'D': 'DSz'},
        'brands': {'R': 'RB', 'W': 'WB', 'D': 'DB'}, 'models': {'R': 'RM', 'W': 'WM', 'D': 'DM'}
    };
    
    const can = (action, module) => userPermissions.includes(permissionMap[module]?.[action]);
    const isSuperAdmin = () => userPermissions.includes('SA');

    // --- Helper & Utility Functions ---
    function openSidebar() {
        sidebarContainer.classList.remove('-translate-x-full');
        if (window.innerWidth < 768) sidebarOverlay.classList.remove('hidden');
        else mainContent.style.marginLeft = '16rem';
    }

    function closeSidebar() {
        sidebarContainer.classList.add('-translate-x-full');
        if (window.innerWidth < 768) sidebarOverlay.classList.add('hidden');
        else mainContent.style.marginLeft = '0';
    }

    function showNotification(message, type) {
        notification.textContent = message;
        notification.className = `p-4 rounded-md mb-6 transition-transform transform-gpu ${type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
        notification.classList.remove('hidden');
        setTimeout(() => notification.classList.add('hidden'), 5000);
    }

    function showLoader(container) {
        container.innerHTML = `<div class="flex justify-center items-center p-10"><svg class="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>`;
    }
    
    const debounce = (func, delay = 300) => {
        let timeout;
        return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); };
    };
    
    function openLookupModal({ title, label, value = '', placeholder = '', saveText = 'Simpan', onSave }) {
        lookupModalTitle.textContent = title;
        lookupModalLabel.textContent = label;
        lookupModalInput.value = value;
        lookupModalInput.placeholder = placeholder;
        lookupModalSaveBtn.textContent = saveText;
        currentModalCallback = onSave;
        lookupModal.classList.remove('hidden');
        lookupModalInput.focus();
    }

    function closeLookupModal() { lookupModal.classList.add('hidden'); currentModalCallback = null; }
    function closeItemEditModal() { itemEditModal.classList.add('hidden'); }

    // --- Core Rendering Logic ---
    async function renderPage(hash) {
        if (lazyLoadState.observer) lazyLoadState.observer.disconnect();
        lazyLoadState = { currentPage: 1, isLoading: false, totalRecords: 0, observer: null };
        
        const config = pageConfig[hash];
        if (!config) {
            appContent.innerHTML = '<h2>Selamat Datang di Admin Panel</h2><p>Pilih menu di samping untuk memulai.</p>';
            pageTitle.textContent = 'Dashboard';
            return;
        }

        pageTitle.textContent = config.title;
        if (config.type === 'add-item') {
            renderAddItemForm();
            return;
        }

        let filtersHTML = '';
        if (config.type === 'penjualan') {
            filtersHTML = `
                <div class="flex flex-wrap items-center gap-4 mb-4">
                    <input type="date" id="start-date" class="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                    <span>s/d</span>
                    <input type="date" id="end-date" class="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                    <button id="filter-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Filter</button>
                </div>`;
        }
        
        appContent.innerHTML = `
            <div class="bg-white p-4 rounded-lg shadow-md">
                <div class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <input type="search" id="search-input" placeholder="Cari..." class="w-full sm:w-1/3 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                    <div class="flex gap-x-2">
                        <button id="refresh-btn" class="w-full sm:w-auto px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Refresh</button>
                        ${can('W', config.type) && !['items', 'penjualan'].includes(config.type) ? '<button id="add-new-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Tambah Baru</button>' : ''}
                    </div>
                </div>
                ${filtersHTML}
                <div id="data-container"></div>
            </div>`;
        
        await loadTableData(config.type, '', false);
        
        const debouncedSearch = debounce((e) => {
            lazyLoadState.currentPage = 1;
            loadTableData(config.type, e.target.value, false)
        }, 500);
        document.getElementById('search-input').addEventListener('input', debouncedSearch);

        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                lazyLoadState.currentPage = 1;
                loadTableData(config.type, document.getElementById('search-input').value, false);
            });
        }
        
        if (config.type === 'penjualan') {
            document.getElementById('filter-btn').addEventListener('click', () => {
                lazyLoadState.currentPage = 1;
                loadTableData(config.type, '', false);
            });
        }
        
        const addNewBtn = document.getElementById('add-new-btn');
        if (addNewBtn) {
            addNewBtn.addEventListener('click', () => handleAddNew(config.type));
        }
    }
    
    // --- FUNGSI PERBAIKAN: Fungsi ini hilang pada versi sebelumnya ---
    function renderAddItemForm() {
        appContent.innerHTML = `
            <div class="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
                <form id="addItemForm" class="space-y-6">
                    <div><label for="name" class="block text-sm font-medium text-gray-900">Nama Item</label><div class="mt-2"><input type="text" id="name" name="name" required class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300"></div></div>
                    <div class="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
                        <div><label for="materialId" class="block text-sm font-medium text-gray-900">Bahan</label><div class="mt-2 flex rounded-md shadow-sm"><select id="materialId" name="materialId" required class="block w-full rounded-none rounded-l-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300"></select>${can('W', 'materials') ? '<button type="button" data-type="material" data-select-id="materialId" title="Tambah Bahan Baru" class="addNewLookupBtn relative -ml-px inline-flex items-center px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50">+</button>' : ''}</div></div>
                        <div><label for="sizeId" class="block text-sm font-medium text-gray-900">Ukuran</label><div class="mt-2 flex rounded-md shadow-sm"><select id="sizeId" name="sizeId" required class="block w-full rounded-none rounded-l-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300"></select>${can('W', 'sizes') ? '<button type="button" data-type="size" data-select-id="sizeId" title="Tambah Ukuran Baru" class="addNewLookupBtn relative -ml-px inline-flex items-center px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50">+</button>' : ''}</div></div>
                        <div><label for="brandId" class="block text-sm font-medium text-gray-900">Merek</label><div class="mt-2 flex rounded-md shadow-sm"><select id="brandId" name="brandId" required class="block w-full rounded-none rounded-l-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300"></select>${can('W', 'brands') ? '<button type="button" data-type="brand" data-select-id="brandId" title="Tambah Merek Baru" class="addNewLookupBtn relative -ml-px inline-flex items-center px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50">+</button>' : ''}</div></div>
                        <div><label for="modelId" class="block text-sm font-medium text-gray-900">Model</label><div class="mt-2 flex rounded-md shadow-sm"><select id="modelId" name="modelId" required class="block w-full rounded-none rounded-l-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300"></select>${can('W', 'models') ? '<button type="button" data-type="model" data-select-id="modelId" title="Tambah Model Baru" class="addNewLookupBtn relative -ml-px inline-flex items-center px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50">+</button>' : ''}</div></div>
                    </div>
                    <div><label for="price" class="block text-sm font-medium text-gray-900">Harga</label><div class="relative mt-2 rounded-md shadow-sm"><input type="number" name="price" id="price" class="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300" placeholder="0.00" step="0.01" value="0.00"><div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span class="text-gray-500 sm:text-sm">Rp</span></div></div></div>
                    <div class="flex items-center justify-end gap-x-4 border-t pt-4 mt-4"><button type="button" id="resetBtn" class="text-sm font-semibold text-gray-900 hover:text-gray-700">Reset</button><button type="submit" id="submitBtn" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">Simpan Item</button></div>
                </form>
            </div>`;
        initializeAddItemForm();
    }
    
    // --- FUNGSI PERBAIKAN: Fungsi ini hilang pada versi sebelumnya ---
    async function initializeAddItemForm() {
        const form = document.getElementById('addItemForm');
        if (!form) return;

        const populateSelect = (selectId, data) => {
            const select = document.getElementById(selectId);
            select.innerHTML = `<option value="">-- Pilih --</option>`;
            data.forEach(item => { select.innerHTML += `<option value="${item.Id}">${item.Name}</option>`; });
        };

        try {
            const response = await fetch('/api/form-data');
            const result = await response.json();
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
                const response = await fetch('/api/add-item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                const result = await response.json();
                if (result.status !== 'success') throw new Error(result.message);
                showNotification(result.message, 'success');
                form.reset();
            } catch (error) { showNotification(error.message, 'error'); } finally { submitBtn.disabled = false; submitBtn.textContent = 'Simpan Item'; }
        });

        document.getElementById('resetBtn').addEventListener('click', () => form.reset());
        document.querySelectorAll('.addNewLookupBtn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemType = btn.dataset.type;
                const selectId = btn.dataset.selectId;
                const typeName = itemType === 'material' ? 'Bahan' : itemType.charAt(0).toUpperCase() + itemType.slice(1);
                handleAddNew(itemType + 's', typeName, (newItem) => {
                    const select = document.getElementById(selectId);
                    select.innerHTML += `<option value="${newItem.Id}">${newItem.Name}</option>`;
                    select.value = newItem.Id;
                });
            });
        });
    }

    async function loadTableData(type, searchQuery = '', append = false) {
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
            let apiUrl = `/api/data/${type}?search=${searchQuery}&sort_by=${currentSort.column}&sort_order=${currentSort.order}&page=${lazyLoadState.currentPage}&limit=${ITEMS_PER_PAGE}`;
            if (type === 'penjualan') {
                const startDate = document.getElementById('start-date').value;
                const endDate = document.getElementById('end-date').value;
                if (startDate && endDate) {
                    apiUrl += `&start_date=${startDate}&end_date=${endDate}`;
                }
            }

            const response = await fetch(apiUrl);
            const result = await response.json();
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
                const tableHTML = `<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr>${headerHTML}${type !== 'penjualan' ? '<th class="relative px-6 py-3"><span class="sr-only">Actions</span></th>' : ''}</tr></thead><tbody class="bg-white divide-y divide-gray-200"></tbody></table></div>`;
                dataContainer.innerHTML = tableHTML;

                dataContainer.querySelectorAll('.sortable-header').forEach(header => {
                    header.addEventListener('click', () => {
                        const column = header.dataset.column;
                        if (currentSort.column === column) {
                            currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
                        } else {
                            currentSort.column = column;
                            currentSort.order = 'asc';
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
                result.data.forEach(item => {
                    const isActive = item.IsActive == 1;
                    const statusHTML = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${isActive ? 'Aktif' : 'Nonaktif'}</span>`;
                    const actions = type === 'penjualan' ? '' : `<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        ${isSuperAdmin() ? `<button class="text-gray-500 hover:text-gray-800 toggle-active-btn" data-id="${item.Id}" title="${isActive ? 'Nonaktifkan' : 'Aktifkan'}">${isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>` : ''}
                        ${can('W', 'items') && type === 'items' ? `<button class="text-indigo-600 hover:text-indigo-900 ml-4 edit-item-btn" data-id="${item.Id}">Edit</button>` : ''}
                        ${can('W', type) && type !== 'items' ? `<button class="text-indigo-600 hover:text-indigo-900 ml-4 edit-lookup-btn" data-id="${item.Id}" data-name="${item.Name}">Edit</button>` : ''}
                        ${can('D', type) ? `<button class="text-red-600 hover:text-red-900 ml-4 delete-btn" data-id="${item.Id}">Hapus</button>` : ''}
                        ${can('P', 'items') && type === 'items' ? `<a href="/print/barcode/${item.Id}" target="_blank" class="text-green-600 hover:text-green-900 ml-4">Cetak Barcode</a>` : ''}
                    </td>`;
                    
                    let rowData = '';
                    config.columns.forEach(col => {
                        rowData += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${col.key === 'Status' ? statusHTML : (item[col.key] || '-')}</td>`;
                    });

                    const newRow = document.createElement('tr');
                    newRow.innerHTML = rowData + actions;
                    tableBody.appendChild(newRow);
                });

                if (type !== 'penjualan') {
                    tableBody.querySelectorAll('.delete-btn:not([data-listener-attached])').forEach(btn => {
                        btn.addEventListener('click', (e) => handleDelete(type, e.currentTarget.dataset.id));
                        btn.dataset.listenerAttached = true;
                    });
                    tableBody.querySelectorAll('.edit-lookup-btn:not([data-listener-attached])').forEach(btn => {
                         btn.addEventListener('click', (e) => handleEditLookup(type, e.currentTarget.dataset.id, e.currentTarget.dataset.name));
                         btn.dataset.listenerAttached = true;
                    });
                    tableBody.querySelectorAll('.edit-item-btn:not([data-listener-attached])').forEach(btn => {
                         btn.addEventListener('click', (e) => handleEditItem(e.currentTarget.dataset.id));
                         btn.dataset.listenerAttached = true;
                    });
                    tableBody.querySelectorAll('.toggle-active-btn:not([data-listener-attached])').forEach(btn => {
                         btn.addEventListener('click', (e) => handleToggleActive(type, e.currentTarget.dataset.id));
                         btn.dataset.listenerAttached = true;
                    });
                }
            }

            if (lazyLoadState.observer) lazyLoadState.observer.disconnect();
            
            const lastRow = tableBody.querySelector('tr:last-child');
            if (lastRow) {
                lazyLoadState.observer = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting && !lazyLoadState.isLoading) {
                        const totalLoaded = lazyLoadState.currentPage * ITEMS_PER_PAGE;
                        if (totalLoaded < lazyLoadState.totalRecords) {
                            lazyLoadState.currentPage++;
                            loadTableData(type, searchQuery, true);
                        }
                    }
                }, { threshold: 0.1 });
                lazyLoadState.observer.observe(lastRow);
            }

        } catch (error) {
            if (!append) dataContainer.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
        } finally {
            lazyLoadState.isLoading = false;
            const loader = document.getElementById(loaderId);
            if (loader) loader.remove();
        }
    }

    async function handleEditItem(id) {
        try {
            const [itemRes, formRes] = await Promise.all([
                fetch(`/api/data/items/${id}`),
                fetch('/api/form-data')
            ]);
            const itemResult = await itemRes.json();
            const formResult = await formRes.json();

            if (itemResult.status !== 'success') throw new Error(itemResult.message);
            if (formResult.status !== 'success') throw new Error(formResult.message);

            const item = itemResult.data;
            const { materials, sizes, brands, models } = formResult.data;

            const populateEditSelect = (element, data, selectedId) => {
                element.innerHTML = data.map(d => `<option value="${d.Id}" ${d.Id === selectedId ? 'selected' : ''}>${d.Name}</option>`).join('');
            };

            itemEditId.value = id;
            itemEditName.value = item.Name;
            itemEditPrice.value = item.Price;
            itemEditSerial.value = item.Serial || '';
            populateEditSelect(itemEditMaterial, materials, item.MaterialId);
            populateEditSelect(itemEditSize, sizes, item.SizeId);
            populateEditSelect(itemEditBrand, brands, item.BrandId);
            populateEditSelect(itemEditModel, models, item.ModelId);
            
            itemEditModal.classList.remove('hidden');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
    
    // The rest of the functions (saveItemChanges, handleDelete, handleAddNew, etc.) are here and unchanged.
    // They are included for completeness.
    async function saveItemChanges() {
        const id = itemEditId.value;
        const data = {
            Name: itemEditName.value,
            Price: parseFloat(itemEditPrice.value),
            MaterialId: itemEditMaterial.value,
            SizeId: itemEditSize.value,
            BrandId: itemEditBrand.value,
            ModelId: itemEditModel.value,
            Serial: itemEditSerial.value
        };
        try {
            const response = await fetch(`/api/data/items/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message);
            showNotification(result.message, 'success');
            closeItemEditModal();
            lazyLoadState.currentPage = 1;
            loadTableData('items', document.getElementById('search-input').value, false);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    function handleDelete(type, id) {
        openLookupModal({
            title: 'Konfirmasi Hapus', label: 'Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan.', saveText: 'Ya, Hapus',
            onSave: async () => {
                try {
                    const response = await fetch(`/api/data/${type}/${id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (result.status !== 'success') throw new Error(result.message);
                    showNotification(result.message, 'success');
                    closeLookupModal();
                    lazyLoadState.currentPage = 1;
                    loadTableData(type, document.getElementById('search-input').value, false);
                } catch (error) { showNotification(error.message, 'error'); }
            }
        });
        lookupModalInput.style.display = 'none';
        lookupModalLabel.className = 'text-gray-600';
    }

    function handleAddNew(type, typeName = null, callback = null) {
        typeName = typeName || (type === 'materials' ? 'Bahan' : type.charAt(0).toUpperCase() + type.slice(1, -1));
        openLookupModal({
            title: `Tambah ${typeName} Baru`, label: `Nama ${typeName}:`, placeholder: 'Masukkan nama...',
            onSave: async (name) => {
                try {
                    const response = await fetch('/api/add-lookup-item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemType: type.slice(0, -1), itemName: name }) });
                    const result = await response.json();
                    if (result.status !== 'success') throw new Error(result.message);
                    showNotification(result.message, 'success');
                    closeLookupModal();
                    if (callback) {
                        callback(result.newItem);
                    } else {
                        lazyLoadState.currentPage = 1;
                        loadTableData(type, '', false);
                    }
                } catch (error) { showNotification(error.message, 'error'); }
            }
        });
        lookupModalInput.style.display = 'block';
        lookupModalLabel.className = 'block text-sm font-medium text-gray-700 text-left mb-1';
    }
    
    async function handleToggleActive(type, id) {
        try {
            const response = await fetch(`/api/data/${type}/${id}/toggle-active`, { method: 'PUT' });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message);
            showNotification(result.message, 'success');
            lazyLoadState.currentPage = 1;
            loadTableData(type, document.getElementById('search-input').value, false);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    function router() {
        const hash = window.location.hash || '#add-item';
        const type = pageConfig[hash]?.type;
        const requiredReadPerm = permissionMap[type]?.['R'];
        
        if (type === 'add-item' && !can('W', 'add-item')) {
            appContent.innerHTML = `<div class="p-4 text-center text-red-700 bg-red-100 rounded-md">Akses Ditolak.</div>`;
            return;
        }
        if (requiredReadPerm && !can('R', type)) {
            appContent.innerHTML = `<div class="p-4 text-center text-red-700 bg-red-100 rounded-md">Akses Ditolak.</div>`;
            return;
        }

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('bg-gray-900', link.getAttribute('href') === hash);
        });
        renderPage(hash);
        if (window.innerWidth < 768) closeSidebar();
    }
    
    async function initializeApp() {
        try {
            const response = await fetch('/api/user/permissions');
            const result = await response.json();
            if (result.status !== 'success') throw new Error('Gagal memuat izin pengguna.');
            userPermissions = result.permissions;

            sidebarNav.querySelectorAll('a.nav-link').forEach(link => {
                const permCode = link.dataset.permission;
                if (!permCode) return;
                
                const hash = link.getAttribute('href');
                const type = pageConfig[hash]?.type;
                if (!type) return;

                const action = (type === 'add-item') ? 'W' : 'R';
                const requiredPermission = permissionMap[type]?.[action];
                
                if (requiredPermission && !userPermissions.includes(requiredPermission)) {
                    link.style.display = 'none';
                }
            });

            let hash = window.location.hash;
            const currentLink = sidebarNav.querySelector(`a[href="${hash}"]`);
            if (!hash || (currentLink && currentLink.style.display === 'none')) {
                const firstVisibleLink = sidebarNav.querySelector('a.nav-link:not([style*="display: none"])');
                window.location.hash = firstVisibleLink ? firstVisibleLink.hash : '#';
            }
            router();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    hamburgerBtn.addEventListener('click', openSidebar);
    sidebarCloseBtn.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);
    window.addEventListener('hashchange', router);

    lookupModalCancelBtn.addEventListener('click', closeLookupModal);
    lookupModalSaveBtn.addEventListener('click', () => {
        const value = lookupModalInput.value.trim();
        if (currentModalCallback) {
            if (lookupModalInput.style.display !== 'none' && !value) {
                showNotification('Nama tidak boleh kosong.', 'error'); return;
            }
            currentModalCallback(value);
        }
    });

    itemModalCancelBtn.addEventListener('click', closeItemEditModal);
    itemModalSaveBtn.addEventListener('click', saveItemChanges);
    
    initializeApp();
});

