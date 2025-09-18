import { api } from "./api.js";
import { formatRupiah, showLoader, showNotification, openSalesDetailModal, setSalesDetailModalTitle } from './ui.js';
import { renderFactoryComparisonChart, renderFactoryTimeSeriesChart, destroyAllFactoryCharts, renderComparisonChart } from "./renderChart.js";
const appContent = document.getElementById('app-content');

// State untuk halaman analytics pabrik
export let factoryAnalyticsState = {
    mode: 'daily', // 'daily', 'weekly', 'monthly', 'custom'
    currentDate: new Date()
};

// Helper tanggal
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getPeriodDates(mode, date) {
    const d = new Date(date);
    if (mode === 'daily') {
        return { start: formatDate(d), end: formatDate(d) };
    }
    if (mode === 'weekly') {
        const dayOfWeek = d.getDay();
        const start = new Date(d);
        start.setDate(d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { start: formatDate(start), end: formatDate(end) };
    }
    if (mode === 'monthly') {
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return { start: formatDate(start), end: formatDate(end) };
    }
    return { start: '', end: '' };
}

// Render shell utama
export function renderFactoryAnalyticsShell() {
    appContent.innerHTML = `
        <div class="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mb-6">
            <nav id="factory-analytics-tabs" class="-mb-px flex flex-wrap gap-x-8 gap-y-2 px-4" aria-label="Tabs">
                <a href="#" data-mode="daily" class="tab-link whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-indigo-500 text-indigo-600 dark:text-indigo-400">Harian</a>
                <a href="#" data-mode="weekly" class="tab-link whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600">Mingguan</a>
                <a href="#" data-mode="monthly" class="tab-link whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600">Bulanan</a>
                <a href="#" data-mode="custom" class="tab-link whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600">Manual</a>
            </nav>
        </div>
        <div id="factory-analytics-content-area"></div>
    `;
    setupFactoryAnalyticsEventListeners();
    renderFactoryReportContent();
}

// Render konten utama sesuai mode
function renderFactoryReportContent() {
    const container = document.getElementById('factory-analytics-content-area');
    const customDateRangePicker = factoryAnalyticsState.mode === 'custom' ? `
        <div class="flex items-center justify-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <input type="date" id="factory-start-date-input" class="rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-sm">
            <span class="dark:text-gray-400">s/d</span>
            <input type="date" id="factory-end-date-input" class="rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-sm">
            <button id="factory-fetch-custom-range" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600">Tampilkan</button>
        </div>` : '';

    const timeSeriesChartContainer = factoryAnalyticsState.mode !== 'daily' ? `
        <div id="factory-timeseries-chart-container" class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow col-span-1 lg:col-span-2">
            <div style="height: 350px;"><canvas id="factoryTimeSeriesChart"></canvas></div>
        </div>` : '';

    container.innerHTML = `
        <div class="flex items-center justify-center mb-6">
            <button id="factory-prev-period-btn" class="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                <svg class="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <h2 id="factory-current-period-display" class="text-lg font-semibold mx-4 text-center text-gray-800 dark:text-gray-200">Memuat...</h2>
            <button id="factory-next-period-btn" class="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50">
                <svg class="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </div>
        ${customDateRangePicker}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div id="factory-summary-card" class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow col-span-1 lg:col-span-2"></div>
            ${timeSeriesChartContainer}
            <div id="factory-sales-chart-container" class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"><div style="height: 350px;"><canvas id="factorySalesComparisonChart"></canvas></div></div>
            <div id="factory-quantity-chart-container" class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"><div style="height: 350px;"><canvas id="factoryQuantityComparisonChart"></canvas></div></div>
            <div id="factory-recent-activity-card" class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow col-span-1 lg:col-span-2"></div>
        </div>
    `;
    updateFactoryPeriodDisplay();
    if (factoryAnalyticsState.mode !== 'custom') {
        fetchFactoryDataForPeriod();
    }
}

// Ringkasan
function renderFactorySummaryCard(data) {
    const container = document.getElementById('factory-summary-card');
    if (!container) return;
    const totals = data.total || {};
    container.innerHTML = `
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Ringkasan Penjualan Pabrik</h3>
        <div class="mt-2 flex flex-col md:flex-row items-baseline gap-x-4">
            <p class="text-3xl font-bold text-gray-900 dark:text-white">${formatRupiah(totals.total_penjualan || 0)}</p>
            <p class="text-lg font-medium text-gray-600 dark:text-gray-300">(${(totals.total_lusin || 0)} Lusin)</p>
        </div>`;
}

// Aktivitas Penjualan Pabrik Terbaru
function renderFactoryRecentActivity(data) {
    const container = document.getElementById('factory-recent-activity-card');
    if (!container) return;
    let tableHTML = `<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Aktivitas Penjualan Pabrik</h3><div class="responsive-table-container"><table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"><thead class="bg-gray-50 dark:bg-gray-700"><tr>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Waktu</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">No. Invoice</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Harga</th>
    </tr></thead><tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">`;
    if (data.recent && data.recent.length > 0) {
        data.recent.forEach(sale => {
            tableHTML += `<tr class="factory-sales-row-clickable hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" data-invno="${sale.InvNo}">
                <td data-label="Waktu" class="px-6 py-4 text-sm text-gray-800 dark:text-gray-300 break-words">${sale.Waktu || '-'}</td>
                <td data-label="Customer" class="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-300 break-words">${sale.Customer || '-'}</td>
                <td data-label="No. Invoice" class="px-6 py-4 text-sm text-gray-800 dark:text-gray-300 break-words">${sale.InvNo || '-'}</td>
                <td data-label="Total Harga" class="px-6 py-4 text-sm text-gray-800 dark:text-gray-300 break-words">${formatRupiah(sale.Amount)}</td>
            </tr>`;
        });
    } else {
        tableHTML += `<tr><td colspan="4" class="text-center py-4 text-gray-500 dark:text-gray-400">Tidak ada penjualan pada periode ini.</td></tr>`;
    }
    tableHTML += `</tbody></table></div>`;
    container.innerHTML = tableHTML;
}

function renderFactorySalesDetailInModal(details, header) {
    const contentContainer = document.getElementById('sales-detail-content');

    let headerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm text-gray-800 dark:text-gray-300">
            <div><strong class="font-semibold">No. Invoice:</strong> ${header.InvNo || '-'}</div>
            <div class="md:col-span-2"><strong class="font-semibold">Customer:</strong> ${header.Customer || '-'}</div>
        </div>
    `;

    if (!details || details.length === 0) {
        contentContainer.innerHTML = headerHTML + '<p class="text-center text-gray-500 dark:text-gray-400">Tidak ada item detail untuk penjualan ini.</p>';
        return;
    }

    const headers = ['Nama Barang', 'Ukuran', 'Qty', 'Harga/Qty', 'Jumlah'];
    let tableHTML = `<div class="responsive-table-container"><table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-700"><tr>
            ${headers.map(h => `<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">${h}</th>`).join('')}
        </tr></thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">`;

    let totalQty = 0;
    let totalAmount = 0;

    details.forEach(item => {
        totalQty += parseFloat(item.Qty) || 0;
        totalAmount += parseFloat(item.Amount) || 0;

        tableHTML += `<tr>
            <td data-label="Nama Barang" class="px-4 py-2 text-sm text-gray-800 dark:text-gray-300 break-words">${item.Name || '-'}</td>
            <td data-label="Ukuran" class="px-4 py-2 text-sm text-gray-800 dark:text-gray-300 break-words">${item.Size || '-'}</td>
            <td data-label="Qty" class="px-4 py-2 text-sm text-gray-800 dark:text-gray-300 break-words">${item.Qty || 0}</td>
            <td data-label="Harga/Qty" class="px-4 py-2 text-sm text-gray-800 dark:text-gray-300 break-words">${formatRupiah(item.HargaQty)}</td>
            <td data-label="Jumlah" class="px-4 py-2 text-sm text-gray-800 dark:text-gray-300 break-words">${formatRupiah(item.Amount)}</td>
        </tr>`;
    });

    tableHTML += `</tbody>
        <tfoot class="bg-gray-50 dark:bg-gray-700 font-bold text-gray-900 dark:text-white">
            <tr>
                <td colspan="2" class="px-4 py-2 text-right text-sm">Total</td>
                <td class="px-4 py-2 text-sm">${totalQty}</td>
                <td class="px-4 py-2 text-sm"></td>
                <td class="px-4 py-2 text-sm">${formatRupiah(totalAmount)}</td>
            </tr>
        </tfoot>
    </table></div>`;
    
    contentContainer.innerHTML = headerHTML + tableHTML;
}

async function handleShowFactorySalesDetail(invNo, customerName) {
    setSalesDetailModalTitle(`Detail Penjualan Pabrik: ${customerName}`);
    openSalesDetailModal();
    const result = await api.getFactorySalesDetail(invNo);
    renderFactorySalesDetailInModal(result.data, { InvNo: invNo, Customer: customerName });
}

// Event listeners
function setupFactoryAnalyticsEventListeners() {
    const contentArea = document.getElementById('factory-analytics-content-area');
    const tabs = document.getElementById('factory-analytics-tabs');

    contentArea.addEventListener('click', e => {
        const d = factoryAnalyticsState.currentDate;
        if (e.target.closest('#factory-prev-period-btn')) {
            if (factoryAnalyticsState.mode === 'daily') d.setDate(d.getDate() - 1);
            else if (factoryAnalyticsState.mode === 'weekly') d.setDate(d.getDate() - 7);
            else if (factoryAnalyticsState.mode === 'monthly') d.setMonth(d.getMonth() - 1);
            renderFactoryReportContent();
        }
        if (e.target.closest('#factory-next-period-btn')) {
            if (factoryAnalyticsState.mode === 'daily') d.setDate(d.getDate() + 1);
            else if (factoryAnalyticsState.mode === 'weekly') d.setDate(d.getDate() + 7);
            else if (factoryAnalyticsState.mode === 'monthly') d.setMonth(d.getMonth() + 1);
            renderFactoryReportContent();
        }
        if (e.target.closest('#factory-fetch-custom-range')) {
            fetchFactoryDataForPeriod(true);
        }
        const factorySalesRow = e.target.closest('.factory-sales-row-clickable');
        if (factorySalesRow) {
            const invNo = factorySalesRow.dataset.invno;
            const customerName = factorySalesRow.querySelector('[data-label="Customer"]').textContent;
            handleShowFactorySalesDetail(invNo, customerName);
        }
    });

    tabs.addEventListener('click', e => {
        e.preventDefault();
        const tab = e.target.closest('.tab-link');
        if (tab && !tab.classList.contains('border-indigo-500')) {
            const activeTab = tabs.querySelector('.border-indigo-500');
            if(activeTab) {
                activeTab.classList.remove('border-indigo-500', 'text-indigo-600', 'dark:text-indigo-400');
                activeTab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300', 'dark:text-gray-400', 'dark:hover:text-gray-200', 'dark:hover:border-gray-600');
            }
            tab.classList.add('border-indigo-500', 'text-indigo-600', 'dark:text-indigo-400');
            tab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300', 'dark:text-gray-400', 'dark:hover:text-gray-200', 'dark:hover:border-gray-600');
            
            factoryAnalyticsState.mode = tab.dataset.mode;
            factoryAnalyticsState.currentDate = new Date();
            renderFactoryReportContent();
        }
    });
}

// Update label periode
function updateFactoryPeriodDisplay() {
    const display = document.getElementById('factory-current-period-display');
    const nextBtn = document.getElementById('factory-next-period-btn');
    if (!display || !nextBtn) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(factoryAnalyticsState.currentDate); d.setHours(0, 0, 0, 0);
    let text = '';
    const { start, end } = getPeriodDates(factoryAnalyticsState.mode, d);

    if (factoryAnalyticsState.mode === 'daily') {
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        if (d.getTime() === today.getTime()) text = 'Hari Ini';
        else if (d.getTime() === yesterday.getTime()) text = 'Kemarin';
        else text = d.toLocaleDateString('id-ID', { dateStyle: 'full' });
        nextBtn.disabled = d >= today;
    } else if (factoryAnalyticsState.mode === 'weekly') {
        text = `${new Date(start+'T00:00:00').toLocaleDateString('id-ID', {day:'numeric',month:'short'})} - ${new Date(end+'T00:00:00').toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'})}`;
        nextBtn.disabled = new Date(end) >= today;
    } else if (factoryAnalyticsState.mode === 'monthly') {
        text = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        nextBtn.disabled = d.getFullYear() >= today.getFullYear() && d.getMonth() >= today.getMonth();
    } else {
        text = "Pilih Rentang Tanggal Manual";
        nextBtn.disabled = true;
        document.getElementById('factory-prev-period-btn').style.visibility = 'hidden';
        document.getElementById('factory-next-period-btn').style.visibility = 'hidden';
    }
    display.textContent = text;
}

// Fetch data sesuai periode
async function fetchFactoryDataForPeriod(isCustom = false) {
    let start, end;
    if (isCustom) {
        start = document.getElementById('factory-start-date-input').value;
        end = document.getElementById('factory-end-date-input').value;
        if (!start || !end) {
            showNotification('Silakan isi kedua tanggal.', 'error');
            return;
        }
    } else {
        ({ start, end } = getPeriodDates(factoryAnalyticsState.mode, factoryAnalyticsState.currentDate));
    }
    
    showLoader(document.getElementById('factory-summary-card'));
    showLoader(document.getElementById('factory-recent-activity-card'));
    destroyAllFactoryCharts();

    try {
        const result = await api.getFactoryAnalyticsByRange(start, end);
        if (result.status === 'success') {
            renderFactorySummaryCard(result.data);
            renderFactoryRecentActivity(result.data);
            renderFactoryComparisonChart(start, end, factoryAnalyticsState.mode);
            if (factoryAnalyticsState.mode !== 'daily') {
                // Panggil API untuk data time series secara terpisah
                const timeseriesResult = await api.getFactoryAnalyticsTimeSeries(start, end);
                if (timeseriesResult.status === 'success') renderFactoryTimeSeriesChart(start, end, timeseriesResult.data);
            }
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showNotification(`Gagal memuat data: ${error.message}`, 'error');
    }
}