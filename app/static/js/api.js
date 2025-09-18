import { lazyLoadState, ITEMS_PER_PAGE, currentSort, getClientInfo, selectedStore, selectedWarehouse, selectedItemName } from './state.js';

async function fetchData(type, searchQuery = '') {
    let apiUrl = `/api/data/${type}?search=${searchQuery}&sort_by=${currentSort.column}&sort_order=${currentSort.order}&page=${lazyLoadState.currentPage}&limit=${ITEMS_PER_PAGE}`;
    if (['pajak-invoice'].includes(type)) {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        if (startDate && endDate) {
            apiUrl += `&start_date=${startDate}&end_date=${endDate}`;
        }
    }
    if (type === 'pajak-invoice' && selectedStore !== 'All') {
        apiUrl += `&toko=${encodeURIComponent(selectedStore)}`;
    }
    if (type === 'finish-good') {
        if (selectedWarehouse !== 'All') {
            apiUrl += `&warehouse=${encodeURIComponent(selectedWarehouse)}`;
        }
        if (selectedItemName !== 'All') {
            apiUrl += `&itemName=${encodeURIComponent(selectedItemName)}`;
        }
    }
    const response = await fetch(apiUrl);
    return await response.json();
}

async function getFormData() {
    const response = await fetch('/api/form-data');
    return await response.json();
}

async function addItem(data) {
    const payload = { ...data, clientInfo: getClientInfo() };
    const response = await fetch('/api/add-item', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
    });
    return await response.json();
}

async function addLookupItem(itemType, itemName) {
    const payload = { itemType, itemName, clientInfo: getClientInfo() }; // <-- Lakukan hal yang sama
    const response = await fetch('/api/add-lookup-item', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
    });
    return await response.json();
}

async function updateItem(id, data) {
    const payload = { ...data, clientInfo: getClientInfo() }; // <-- Lakukan hal yang sama
    const response = await fetch(`/api/data/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return await response.json();
}

async function deleteData(type, id) {
    const response = await fetch(`/api/data/${type}/${id}`, { method: 'DELETE' });
    return await response.json();
}

async function toggleActiveStatus(type, id) {
    const response = await fetch(`/api/data/${type}/${id}/toggle-active`, { method: 'PUT' });
    return await response.json();
}

async function getUserPermissions() {
    const response = await fetch('/api/user/permissions');
    return await response.json();
}

async function getSalesDetail(activityId) {
    const response = await fetch(`/api/penjualan/detail/${activityId}`);
    return await response.json();
}
async function getSalesHeader(activityId) {
    const response = await fetch(`/api/penjualan/header/${activityId}`);
    return await response.json();
}
async function getAnalyticsToday() {
    const response = await fetch('/api/analytics/today');
    return await response.json();
}
async function getDailyAnalytics(dateString) {
    const response = await fetch(`/api/analytics/daily?date=${dateString}`);
    return await response.json();
}

async function getMonthlyAnalytics() {
    const response = await fetch('/api/analytics/monthly');
    return await response.json();
}

async function getAnalyticsByRange(startDate, endDate) {
    const response = await fetch(`/api/analytics/range?start_date=${startDate}&end_date=${endDate}`);
    return await response.json();
}
async function getAnalyticsTimeSeries(startDate, endDate) {
    const response = await fetch(`/api/analytics/timeseries?start_date=${startDate}&end_date=${endDate}`);
    return await response.json();
}
async function deletePackingListItem(barcode) {
    const response = await fetch(`/api/packinglist/delete/${barcode}`, {
        method: 'DELETE'
    });
    return await response.json();
}

async function getPackingListDetail(idno) {
    const response = await fetch(`/api/packinglist/detail/${idno}`);
    return await response.json();
}

// ... (fungsi api.js lainnya)

// --- TAMBAHKAN DUA FUNGSI BARU INI ---
async function getSetting(key) {
    const response = await fetch(`/api/setting/${key}`);
    return await response.json();
}

async function updateSetting(key, value) {
    const response = await fetch('/api/setting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
    });
    return await response.json();
}
async function calculatePayrollChecksum(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/multipayroll/calculate-checksum', {
        method: 'POST',
        body: formData,
    });
    return await response.json();
}

async function getFactoryAnalyticsByRange(startDate, endDate) {
    const response = await fetch(`/api/analytics/factory-range?start_date=${startDate}&end_date=${endDate}`);
    return await response.json();
}

async function getFactoryAnalyticsTimeSeries(startDate, endDate) {
    const response = await fetch(`/api/analytics/factory-timeseries?start_date=${startDate}&end_date=${endDate}`);
    return await response.json();
}

async function getAnalyticsTimeseriesHourly(dateString) {
    const response = await fetch(`/api/analytics/timeseries-hourly?date=${dateString}`);
    return await response.json();
}
async function getFactorySalesDetail(invNo) {
    const response = await fetch(`/api/factory-sales/detail/${invNo}`);
    return await response.json();
}

async function getLookupItemDetails(type, id) {
    const response = await fetch(`/api/data/lookup/${type}/${id}`);
    return await response.json();
}

async function getPajakInvoiceStores() {
    const response = await fetch('/api/pajak-invoice/stores');
    return await response.json();
}

async function getFinishGoodWarehouses() {
    const response = await fetch('/api/gudang/warehouses');
    return await response.json();
}

async function getFinishGoodItemNames() {
    const response = await fetch('/api/gudang/itemnames');
    return await response.json();
}
export const api = {
    fetchData,
    getFormData,
    addItem,
    addLookupItem,
    updateItem,
    deleteData,
    toggleActiveStatus,
    getUserPermissions,
    getSalesDetail,
    getSalesHeader,
    getAnalyticsToday,
    getAnalyticsTimeseriesHourly,
    getDailyAnalytics,
    getMonthlyAnalytics,
    getAnalyticsByRange,
    getAnalyticsTimeSeries,
    deletePackingListItem,
    getPackingListDetail,
    getSetting,
    updateSetting,
    calculatePayrollChecksum,
    getFactoryAnalyticsByRange,
    getFactoryAnalyticsTimeSeries,
    getFactorySalesDetail,
    getLookupItemDetails,
    getPajakInvoiceStores,
    getFinishGoodWarehouses,
    getFinishGoodItemNames
};