import { setUserPermissions, setUsername,  pageConfig, can, isSuperAdmin, userPermissions } from './state.js';
import { api } from './api.js';
import { openSidebar, closeSidebar, showNotification, 
    handleEditItem, setupModalEventListeners, 
    setRefreshDataCallback, 
    openSalesDetailModal, closeSalesDetailModal, renderSalesDetail, 
    renderPackingListDetail, setSalesDetailModalTitle,
    // --- PERUBAHAN DI SINI: Impor fungsi modal baru ---
    openItemDetailModal, closeItemDetailModal, renderItemDetailModal,
    openLookupDetailModal, closeLookupDetailModal, renderLookupDetailModal
    // --- AKHIR PERUBAHAN ---
} from './ui.js';
import { handleDelete, handleDeletePackingList, handleEditLookup, handleToggleActive, refreshData, renderPage } from './renderPage.js';
import { initializeDarkMode } from './darkmode.js';
document.addEventListener('DOMContentLoaded', () => {
    const appContent = document.getElementById('app-content');
    const pageTitle = document.getElementById('page-title');
    const sidebarNav = document.getElementById('sidebar-nav');
    function router() {
        const hash = window.location.hash;
        const config = pageConfig[hash];

        if (!config) {
            renderPage('#'); // Render halaman default jika hash tidak valid
            return;
        }

        const type = config.type;
        const action = (type === 'add-item') ? 'W' : 'R';
        
        if (!can(action, type)) {
            appContent.innerHTML = `<div class="p-4 text-center text-red-700 bg-red-100 rounded-md">Akses Ditolak.</div>`;
            pageTitle.textContent = 'Akses Ditolak';
            return;
        }

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('bg-gray-700', link.getAttribute('href') === hash);
        });
        renderPage(hash);
        if (window.innerWidth < 768) closeSidebar();
    }
    
    // --- PERUBAHAN DI SINI: Logika Inisialisasi Diperbaiki Total ---
    async function initializeApp() {
        setRefreshDataCallback(refreshData);
        try {
            const result = await api.getUserPermissions();
            if (result.status !== 'success') throw new Error('Gagal memuat izin pengguna.');
            setUserPermissions(result.permissions);
            const usernameFromHTML = document.body.dataset.username;
            if (usernameFromHTML) {
                setUsername(usernameFromHTML);
            }
            // Tampilkan/sembunyikan elemen berdasarkan izin
            document.querySelectorAll('[data-permission]').forEach(element => {
                const required = element.dataset.permission;
                if (required && !userPermissions.includes(required)) {
                    element.style.display = 'none';
                } else {
                    element.style.display = '';
                }
            });

            // Sembunyikan dropdown jika kosong
            ['master', 'toko'].forEach(dropdownId => {
                const menu = document.getElementById(`${dropdownId}-dropdown-menu`);
                const button = document.getElementById(`${dropdownId}-dropdown-btn`);
                if (!menu || !button) return;
                const links = menu.querySelectorAll('a');
                const hasVisibleLink = Array.from(links).some(link => link.style.display !== 'none');
                button.style.display = hasVisibleLink ? '' : 'none';
            });
            
            // Tentukan halaman default berdasarkan izin
            let currentHash = window.location.hash;
            let defaultHash = '#';

            if (isSuperAdmin()) {
                defaultHash = '#analytics';
            } else {
                const firstVisibleLink = document.querySelector('#sidebar-nav a.nav-link:not([style*="display: none"])');
                if (firstVisibleLink) {
                    defaultHash = firstVisibleLink.getAttribute('href');
                }
            }

            // Jika hash saat ini tidak ada atau tidak dapat diakses, arahkan ke halaman default
            const currentLink = document.querySelector(`a[href="${currentHash}"]`);
            if (!currentHash || currentHash === '#' || (currentLink && currentLink.style.display === 'none')) {
                window.location.hash = defaultHash;
            }

            // Jika hash tidak berubah (karena sudah benar), panggil router secara manual
            if (window.location.hash === currentHash) {
                router();
            }

        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
    // --- Global Event Listeners & Init ---
    document.getElementById('hamburger-btn').addEventListener('click', openSidebar);
    document.getElementById('sidebar-close-btn').addEventListener('click', closeSidebar);
    document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);
    window.addEventListener('hashchange', router);
    initializeDarkMode();
    setupModalEventListeners();
    const masterDropdownBtn = document.getElementById('master-dropdown-btn');
    const masterDropdownMenu = document.getElementById('master-dropdown-menu');
    const masterDropdownIcon = document.getElementById('master-dropdown-icon');

    masterDropdownBtn.addEventListener('click', () => {
        masterDropdownMenu.classList.toggle('hidden');
        masterDropdownIcon.classList.toggle('rotate-180');
    });
     const tokoDropdownBtn = document.getElementById('toko-dropdown-btn');
    const tokoDropdownMenu = document.getElementById('toko-dropdown-menu');
    const tokoDropdownIcon = document.getElementById('toko-dropdown-icon');

    tokoDropdownBtn.addEventListener('click', () => {
        tokoDropdownMenu.classList.toggle('hidden');
        tokoDropdownIcon.classList.toggle('rotate-180');
    });

    const pajakDropdownBtn = document.getElementById('pajak-dropdown-btn');
    const pajakDropdownMenu = document.getElementById('pajak-dropdown-menu');
    const pajakDropdownIcon = document.getElementById('pajak-dropdown-icon');

    if (pajakDropdownBtn) {
        pajakDropdownBtn.addEventListener('click', () => {
            pajakDropdownMenu.classList.toggle('hidden');
            pajakDropdownIcon.classList.toggle('rotate-180');
        });
    }

    const packinglistDropdownBtn = document.getElementById('packinglist-dropdown-btn');
    const packinglistDropdownMenu = document.getElementById('packinglist-dropdown-menu');
    const packinglistDropdownIcon = document.getElementById('packinglist-dropdown-icon');

    if (packinglistDropdownBtn) {
        packinglistDropdownBtn.addEventListener('click', () => {
            packinglistDropdownMenu.classList.toggle('hidden');
            packinglistDropdownIcon.classList.toggle('rotate-180');
        });
    }
    


    // --- PERUBAHAN DI SINI: Event Delegation Global di document.body ---
    document.body.addEventListener('click', async (event) => {
        const target = event.target;
        const hash = window.location.hash || '#'; // Dapatkan hash saat ini
        const type = pageConfig[hash]?.type; // Dapatkan tipe halaman dari hash

        // --- Penanganan Tombol Aksi (bisa di dalam tabel atau modal) ---
        const deleteBtn = target.closest('.delete-btn');
        const editItemBtn = target.closest('.edit-item-btn');
        const toggleBtn = target.closest('.toggle-active-btn');
        const editLookupBtn = target.closest('.edit-lookup-btn');
        const deletePackingListBtn = target.closest('.delete-packinglist-btn');

        const lookupRow = target.closest('.lookup-row-clickable');
        if (lookupRow) {
            const lookupId = lookupRow.dataset.id;
            if (type) {
                openLookupDetailModal();
                try {
                    const result = await api.getLookupItemDetails(type, lookupId);
                    if (result.status === 'success') {
                        renderLookupDetailModal(result.data, type);
                    } else {
                        throw new Error(result.message);
                    }
                } catch (error) {
                    showNotification(error.message, 'error');
                    closeLookupDetailModal();
                }
            }
            return;
        }

        // --- Penanganan Klik pada Baris ---
        const itemRow = target.closest('.item-row-clickable');
        if (itemRow) {
            const itemId = itemRow.dataset.id;
            openItemDetailModal(); // Buka modal dengan loader
            try {
                const res = await fetch(`/api/data/items/${itemId}`);
                const result = await res.json();
                if (result.status === 'success') {
                    renderItemDetailModal(result.data);
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                showNotification(error.message, 'error');
                closeItemDetailModal();
            }
            return;
        }

        const salesRow = target.closest('.sales-row-clickable');
        const packinglistRow = target.closest('.packinglist-row-clickable');
        
        if (salesRow) {
            const activityId = salesRow.dataset.activityId;
            setSalesDetailModalTitle('Detail Penjualan');
            openSalesDetailModal();
            try {
                const [detailResult, headerResult] = await Promise.all([
                    api.getSalesDetail(activityId),
                    api.getSalesHeader(activityId)
                ]);
                if (detailResult.status === 'success' && headerResult.status === 'success') {
                    renderSalesDetail(detailResult.data, headerResult.data);
                } else {
                    throw new Error(detailResult.message || headerResult.message);
                }
            } catch (error) {
                showNotification(error.message, 'error');
                closeSalesDetailModal();
            }
            return;
        }

        if (packinglistRow) {
            const idno = packinglistRow.dataset.idno;
            const headerData = JSON.parse(packinglistRow.dataset.headerData);
            setSalesDetailModalTitle('Detail Packing List');
            openSalesDetailModal(); // Kita gunakan modal yang sama
            try {
                const result = await api.getPackingListDetail(idno);
                if (result.status === 'success') {
                    renderPackingListDetail(result.data, headerData);
                }else {
                    throw new Error(result.message);
                }
            } catch (error) {
                showNotification(error.message, 'error');
                closeSalesDetailModal();
            }
            return;
        } 
        
        if (deletePackingListBtn) {
           handleDeletePackingList(deletePackingListBtn.dataset.barcode);
        } else if (deleteBtn) {
            const itemType = target.closest('#item-detail-modal') ? 'items' : type;
            if (itemType) handleDelete(itemType, deleteBtn.dataset.id);
        } else if (editItemBtn) {
            closeItemDetailModal();
            handleEditItem(editItemBtn.dataset.id);
        } else if (toggleBtn) {
            const itemType = target.closest('#item-detail-modal') ? 'items' : type;
            if (itemType) handleToggleActive(itemType, toggleBtn.dataset.id);
        } else if (editLookupBtn) {
            // Tutup modal detail sebelum membuka modal edit
            if (target.closest('#lookup-detail-modal')) {
                closeLookupDetailModal();
            }
            if (type) handleEditLookup(type, editLookupBtn.dataset.id, editLookupBtn.dataset.name);
        }

        // --- Penanganan Tombol Tutup Modal ---
        if (target.closest('#item-detail-close-btn')) {
            closeItemDetailModal();
        }
        if (target.closest('#lookup-detail-close-btn')) {
            closeLookupDetailModal();
        }
        if (target.closest('#sales-detail-close-btn') || target.closest('#sales-detail-close-btn-bottom')) {
            closeSalesDetailModal();
        }
     });

    const multipayrollDropdownBtn = document.getElementById('multipayroll-dropdown-btn');
    const multipayrollDropdownMenu = document.getElementById('multipayroll-dropdown-menu');
    const multipayrollDropdownIcon = document.getElementById('multipayroll-dropdown-icon');

    if (multipayrollDropdownBtn) {
        multipayrollDropdownBtn.addEventListener('click', () => {
            multipayrollDropdownMenu.classList.toggle('hidden');
            multipayrollDropdownIcon.classList.toggle('rotate-180');
        });
    }
    const gudangDropdownBtn = document.getElementById('gudang-dropdown-btn');
    const gudangDropdownMenu = document.getElementById('gudang-dropdown-menu');
    const gudangDropdownIcon = document.getElementById('gudang-dropdown-icon');

    if (gudangDropdownBtn) {
        gudangDropdownBtn.addEventListener('click', () => {
            gudangDropdownMenu.classList.toggle('hidden');
            gudangDropdownIcon.classList.toggle('rotate-180');
        });
    }
    initializeApp();
});