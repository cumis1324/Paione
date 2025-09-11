import { api } from "./api.js";
import { formatRupiah, showLoader, showNotification } from './ui.js';
import { renderFactoryComparisonChart, renderFactoryTimeSeriesChart, destroyAllFactoryCharts, renderComparisonChart } from "./renderChart.js";
import { analyticsState } from "./analytics.js";
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
        <div class="border-b border-gray-200 bg-white mb-6 overflow-x-auto">
            <nav id="factory-analytics-tabs" class="-mb-px flex space-x-8 px-4" aria-label="Tabs">
                <a href="#" data-mode="daily" class="tab-link whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-indigo-500 text-indigo-600">Harian</a>
                <a href="#" data-mode="weekly" class="tab-link whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">Mingguan</a>
                <a href="#" data-mode="monthly" class="tab-link whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">Bulanan</a>
                <a href="#" data-mode="custom" class="tab-link whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">Manual</a>
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
        <div class="flex items-center justify-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <input type="date" id="factory-start-date-input" class="rounded-md border-gray-300 shadow-sm">
            <span>s/d</span>
            <input type="date" id="factory-end-date-input" class="rounded-md border-gray-300 shadow-sm">
            <button id="factory-fetch-custom-range" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Tampilkan</button>
        </div>` : '';

    const timeSeriesChartContainer = factoryAnalyticsState.mode !== 'daily' ? `
        <div id="factory-timeseries-chart-container" class="bg-white p-6 rounded-lg shadow col-span-1 lg:col-span-2">
            <div style="height: 350px;"><canvas id="factoryTimeSeriesChart"></canvas></div>
        </div>` : '';

    container.innerHTML = `
        <div class="flex items-center justify-center mb-6">
            <button id="factory-prev-period-btn" class="p-2 rounded-md hover:bg-gray-200">
                <svg class="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <h2 id="factory-current-period-display" class="text-lg font-semibold mx-4 text-center text-gray-800">Memuat...</h2>
            <button id="factory-next-period-btn" class="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50">
                <svg class="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </div>
        ${customDateRangePicker}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div id="factory-summary-card" class="bg-white p-6 rounded-lg shadow col-span-1 lg:col-span-2"></div>
            ${timeSeriesChartContainer}
            <div id="factory-sales-chart-container" class="bg-white p-6 rounded-lg shadow"><div style="height: 350px;"><canvas id="factorySalesComparisonChart"></canvas></div></div>
            <div id="factory-quantity-chart-container" class="bg-white p-6 rounded-lg shadow"><div style="height: 350px;"><canvas id="factoryQuantityComparisonChart"></canvas></div></div>
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
        <h3 class="text-sm font-medium text-gray-500">Ringkasan Penjualan Pabrik</h3>
        <div class="mt-2 flex flex-col md:flex-row items-baseline gap-x-4">
            <p class="text-3xl font-bold text-gray-900">${formatRupiah(totals.total_penjualan || 0)}</p>
            <p class="text-lg font-medium text-gray-600">(${(totals.total_lusin || 0)} Lusin)</p>
        </div>`;
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
    });

    tabs.addEventListener('click', e => {
        e.preventDefault();
        const tab = e.target.closest('.tab-link');
        if (tab && !tab.classList.contains('border-indigo-500')) {
            const activeTab = tabs.querySelector('.border-indigo-500');
            if(activeTab) {
                activeTab.classList.remove('border-indigo-500', 'text-indigo-600');
                activeTab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            }
            tab.classList.add('border-indigo-500', 'text-indigo-600');
            tab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            
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
    destroyAllFactoryCharts();

    try {
        const result = await api.getFactoryAnalyticsByRange(start, end);
        if (result.status === 'success') {
            renderFactorySummaryCard(result.data);
            renderFactoryComparisonChart(start, end, factoryAnalyticsState.mode);
            if (factoryAnalyticsState.mode !== 'daily') {
                renderFactoryTimeSeriesChart(start, end, result.data);
            }
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showNotification(`Gagal memuat data: ${error.message}`, 'error');
    }
}