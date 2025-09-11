import { api } from "./api.js";
import { showNotification, showLoader, formatRupiah } from './ui.js';
import { renderComparisonChart, destroyAllCharts, renderTimeSeriesChart, timeSeriesChart, salesComparisonChart, quantityComparisonChart, paymentComparisonChart } from "./renderChart.js";

const appContent = document.getElementById('app-content');
let realtimeIntervalId = null;

// State untuk halaman analytics
export let analyticsState = {
    mode: 'daily', // 'daily', 'weekly', 'monthly', 'custom'
    currentDate: new Date() // Titik acuan untuk navigasi
};

// --- Helper Fungsi Tanggal ---
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
        const start = new Date(d.setDate(d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))); // Senin
        const end = new Date(start);
        end.setDate(start.getDate() + 6); // Minggu
        return { start: formatDate(start), end: formatDate(end) };
    }
    if (mode === 'monthly') {
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return { start: formatDate(start), end: formatDate(end) };
    }
    return { start: '', end: '' };
}

// --- Fungsi Render Utama ---

export function renderAnalyticsShell() {
    appContent.innerHTML = `
        <div class="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mb-6 overflow-x-auto">
            <nav id="analytics-tabs" class="-mb-px flex space-x-8 px-4" aria-label="Tabs">
                <a href="#" data-mode="daily" class="tab-link whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-indigo-500 text-indigo-600 dark:text-indigo-400">Harian</a>
                <a href="#" data-mode="weekly" class="tab-link whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600">Mingguan</a>
                <a href="#" data-mode="monthly" class="tab-link whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600">Bulanan</a>
                <a href="#" data-mode="custom" class="tab-link whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600">Manual</a>
            </nav>
        </div>

        <div class="flex items-right justify-center mb-6">
        <button id="print-report-btn" class="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600">
                Cetak Laporan
            </button>
            </div>
        
        <div id="analytics-content-area"></div>
        
    `;
    setupAnalyticsEventListeners(); 
    // Pasang event listener setelah shell dirender
    renderReportContent();
    
}

function renderReportContent() {
    const container = document.getElementById('analytics-content-area');
    const customDateRangePicker = analyticsState.mode === 'custom' ? `
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <input type="date" id="start-date-input" class="w-full sm:w-auto rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-sm">
            <span class="dark:text-gray-400">s/d</span>
            <input type="date" id="end-date-input" class="w-full sm:w-auto rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-sm">
            <button id="fetch-custom-range" class="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600">Tampilkan</button>
        </div>` : '';
    // Selalu tampilkan chart container
    const timeSeriesChartContainer = `
        <div id="timeseries-chart-container" class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow col-span-1 lg:col-span-2">
            <div style="height: 350px;"><canvas id="timeSeriesChart"></canvas></div>
        </div>
    `;

    container.innerHTML = `
        <div class="flex items-center justify-center mb-6">
            <button id="prev-period-btn" class="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"><svg class="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg></button>
            <h2 id="current-period-display" class="text-lg font-semibold mx-4 text-center text-gray-800 dark:text-gray-200">Memuat...</h2>
            <button id="next-period-btn" class="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"><svg class="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></button>
        </div>
        ${customDateRangePicker}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div id="summary-card" class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow col-span-1 lg:col-span-2"></div>
            ${timeSeriesChartContainer}
            <div id="sales-chart-container" class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"><div style="height: 350px;"><canvas id="salesComparisonChart"></canvas></div></div>
            <div id="quantity-chart-container" class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"><div style="height: 350px;"><canvas id="quantityComparisonChart"></canvas></div></div>
            <div id="payment-chart-container" class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow col-span-1 lg:col-span-2"><div style="height: 350px;"><canvas id="paymentComparisonChart"></canvas></div></div>
            <div id="recent-activity-card" class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow col-span-1 lg:col-span-2"></div>
        </div>`;
    updatePeriodDisplay();
    if (analyticsState.mode !== 'custom') {
        fetchDataForPeriod();
    }
    startRealtimeUpdates();
}
function renderSummaryCard(data) {
    const container = document.getElementById('summary-card');
    if (!container) return;
    const totals = data.total || {};
    container.innerHTML = `
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Ringkasan Penjualan Toko</h3>
        <div class="mt-2 flex flex-col md:flex-row items-baseline gap-x-4">
            <p class="text-3xl font-bold text-gray-900 dark:text-white">${formatRupiah(totals.total_penjualan || 0)}</p>
            <p class="text-lg font-medium text-gray-600 dark:text-gray-300">(${(totals.total_lusin || 0)} Lusin)</p>
        </div>
        <div class="mt-4 border-t dark:border-gray-700 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div><p class="text-gray-500 dark:text-gray-400">Edc, Cash, Transfer</p><p class="font-semibold text-green-600 dark:text-green-400">${formatRupiah(totals.lunas || 0)}</p></div>
            <div><p class="text-gray-500 dark:text-gray-400">Debt</p><p class="font-semibold text-red-600 dark:text-red-400">${formatRupiah(totals.belum_lunas || 0)}</p></div>
            <div><p class="text-gray-500 dark:text-gray-400">Tidak Diketahui</p><p class="font-semibold text-gray-600 dark:text-gray-300">${formatRupiah(totals.tidak_diketahui || 0)}</p></div>
        </div>`;
}

function renderRecentActivity(data) {
    const container = document.getElementById('recent-activity-card');
    if (!container) return;
    let tableHTML = `<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Aktivitas Penjualan</h3><div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"><thead class="bg-gray-50 dark:bg-gray-700"><tr>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Waktu</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nama Pelanggan</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cabang</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Harga</th>
    </tr></thead><tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">`;
    if (data.recent && data.recent.length > 0) {
        data.recent.forEach(sale => {
            tableHTML += `<tr class="sales-row-clickable hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" data-activity-id="${sale.Id}">
                <td class="px-6 py-4 text-sm text-gray-800 dark:text-gray-300">${sale.Waktu || '-'}</td>
                <td class="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-300">${sale.Name || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-800 dark:text-gray-300">${sale.Cabang || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-800 dark:text-gray-300">${formatRupiah(sale.TotalPrice)}</td>
            </tr>`;
        });
    } else {
        tableHTML += `<tr><td colspan="4" class="text-center py-4 text-gray-500 dark:text-gray-400">Tidak ada penjualan pada periode ini.</td></tr>`;
    }
    tableHTML += `</tbody></table></div>`;
    container.innerHTML = tableHTML;
}

// --- Fungsi Event Listener & Update ---

function setupAnalyticsEventListeners() {
    const contentArea = document.getElementById('analytics-content-area');
    const tabs = document.getElementById('analytics-tabs');
    const printBtn = document.getElementById('print-report-btn');
    if(printBtn) {
        printBtn.addEventListener('click', () => {
            const reportTitle = document.getElementById('current-period-display').textContent;
            const summaryCard = document.getElementById('summary-card');
            
            // Buat form sementara untuk mengirim data
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/print/analytics';
            form.target = '_blank'; // Buka di tab baru
            
            const addField = (name, value) => {
                if(value) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = name;
                    input.value = value;
                    form.appendChild(input);
                }
            };
            
            // Kumpulkan data
            addField('title', reportTitle);
            addField('summary_html', summaryCard ? summaryCard.innerHTML : '');
            if(timeSeriesChart) addField('timeseries_img', timeSeriesChart.toBase64Image());
            if(salesComparisonChart) addField('sales_img', salesComparisonChart.toBase64Image());
            if(quantityComparisonChart) addField('quantity_img', quantityComparisonChart.toBase64Image());
            if(paymentComparisonChart) addField('payment_img', paymentComparisonChart.toBase64Image());

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        });
    }
    // Listener untuk Navigasi Periode (Chevron)
    contentArea.addEventListener('click', e => {
        const d = analyticsState.currentDate;
        if (e.target.closest('#prev-period-btn')) {
            if (analyticsState.mode === 'daily') d.setDate(d.getDate() - 1);
            else if (analyticsState.mode === 'weekly') d.setDate(d.getDate() - 7);
            else if (analyticsState.mode === 'monthly') d.setMonth(d.getMonth() - 1);
            renderReportContent();
        }
        if (e.target.closest('#next-period-btn')) {
            if (analyticsState.mode === 'daily') d.setDate(d.getDate() + 1);
            else if (analyticsState.mode === 'weekly') d.setDate(d.getDate() + 7);
            else if (analyticsState.mode === 'monthly') d.setMonth(d.getMonth() + 1);
            renderReportContent();
        }
        if (e.target.closest('#fetch-custom-range')) {
             const start = document.getElementById('start-date-input').value;
             const end = document.getElementById('end-date-input').value;
             if (start && end) {
                 fetchDataForPeriod(true); // true menandakan custom range
             } else {
                 showNotification('Silakan isi kedua tanggal.', 'error');
             }
        }
    });

    // Listener untuk Pindah Tab
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
            
            analyticsState.mode = tab.dataset.mode;
            analyticsState.currentDate = new Date();
            renderReportContent();
        }
    });
}

function updatePeriodDisplay() {
    const display = document.getElementById('current-period-display');
    const nextBtn = document.getElementById('next-period-btn');
    if (!display || !nextBtn) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(analyticsState.currentDate); d.setHours(0, 0, 0, 0);
    let text = '';
    if (analyticsState.mode === 'daily') {
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        if (d.getTime() === today.getTime()) text = 'Hari Ini';
        else if (d.getTime() === yesterday.getTime()) text = 'Kemarin';
        else text = d.toLocaleDateString('id-ID', { dateStyle: 'full' });
        nextBtn.disabled = d >= today;
    } else if (analyticsState.mode === 'weekly') {
        const { start, end } = getPeriodDates('weekly', d);
        text = `${new Date(start+'T00:00:00').toLocaleDateString('id-ID', {day:'numeric',month:'short'})} - ${new Date(end+'T00:00:00').toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'})}`;
        nextBtn.disabled = new Date(end) >= today;
    } else if (analyticsState.mode === 'monthly') {
        text = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        nextBtn.disabled = d.getFullYear() >= today.getFullYear() && d.getMonth() >= today.getMonth();
    } else {
        text = "Pilih Rentang Tanggal Manual";
        nextBtn.disabled = true;
        document.getElementById('prev-period-btn').style.visibility = 'hidden';
        document.getElementById('next-period-btn').style.visibility = 'hidden';
    }
    display.textContent = text;
}

async function fetchDataForPeriod(isCustom = false) {
    let start, end;
    if (isCustom) {
        start = document.getElementById('start-date-input').value;
        end = document.getElementById('end-date-input').value;
    } else {
        ({ start, end } = getPeriodDates(analyticsState.mode, analyticsState.currentDate));
    }
    if (!start || !end) return;

    showLoader(document.getElementById('summary-card'));
    showLoader(document.getElementById('recent-activity-card'));
    destroyAllCharts();

    try {
        const result = await api.getAnalyticsByRange(start, end);
        if (result.status === 'success') {
            renderSummaryCard(result.data);
            renderRecentActivity(result.data);
            renderComparisonChart(start, end, analyticsState.mode);

            // --- MODIFIKASI DI SINI ---
            if (analyticsState.mode === 'daily') {
                // Ambil timeseries per jam dari API khusus
                const timeseriesResult = await api.getAnalyticsTimeseriesHourly(start);
                renderTimeSeriesChart(start, end, analyticsState.mode, timeseriesResult);
            } else {
                renderTimeSeriesChart(start, end, analyticsState.mode, result.data);
            }
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showNotification(`Gagal memuat data: ${error.message}`, 'error');
    }
}
export function stopRealtimeUpdates() {
    if (realtimeIntervalId) clearInterval(realtimeIntervalId);
    realtimeIntervalId = null;
}

export function startRealtimeUpdates() {
    stopRealtimeUpdates();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const currentDate = new Date(analyticsState.currentDate); currentDate.setHours(0, 0, 0, 0);
    if (analyticsState.mode === 'daily' && currentDate.getTime() === today.getTime()) {
        realtimeIntervalId = setInterval(fetchDataForPeriod, 15000);
    }
}