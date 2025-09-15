import { api } from './api.js';
import { analyticsState } from './analytics.js';

// Variabel untuk grafik Analitik Toko
export let salesComparisonChart = null; 
export let quantityComparisonChart = null;
export let paymentComparisonChart = null;
export let timeSeriesChart = null;

// Variabel untuk grafik Analitik Pabrik
let factorySalesComparisonChart = null;
let factoryQuantityComparisonChart = null;
let factoryTimeSeriesChart = null;


// --- FUNGSI UNTUK ANALITIK TOKO ---

export function destroyAllCharts() {
    if (salesComparisonChart) {
        salesComparisonChart.destroy();
        salesComparisonChart = null;
    }
    if (quantityComparisonChart) {
        quantityComparisonChart.destroy();
        quantityComparisonChart = null;
    }
    if (paymentComparisonChart) {
        paymentComparisonChart.destroy();
        paymentComparisonChart = null;
    }
    if (timeSeriesChart) {
        timeSeriesChart.destroy();
        timeSeriesChart = null;
    }
}

function getPreviousPeriod(currentStartStr, currentEndStr, mode = 'daily') {
    const currentStart = new Date(currentStartStr + 'T00:00:00');
    const currentEnd = new Date(currentEndStr + 'T00:00:00');

    let prevStart = new Date(currentStart);
    let prevEnd = new Date(currentEnd);

    if (mode === 'daily') {
        prevStart.setDate(currentStart.getDate() - 1);
        prevEnd.setDate(currentEnd.getDate() - 1);
    } else if (mode === 'weekly') {
        prevStart.setDate(currentStart.getDate() - 7);
        prevEnd.setDate(currentEnd.getDate() - 7);
    } else if (mode === 'monthly') {
        prevStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);
        prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0);
    } else if (mode === 'custom') {
        const duration = (currentEnd.getTime() - currentStart.getTime());
        prevEnd.setDate(currentStart.getDate() - 1);
        prevStart = new Date(prevEnd.getTime() - duration);
    }
    
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return {
        start: formatDate(prevStart),
        end: formatDate(prevEnd)
    };
}
function getChartLabels(currentStartStr, currentEndStr, prevStartStr, prevEndStr, mode) {
    if (mode === 'daily') {
        return {
            currentLabel: new Date(currentStartStr+'T00:00:00').toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}),
            prevLabel: new Date(prevStartStr+'T00:00:00').toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})
        }
    }
    if (mode === 'weekly') return { currentLabel: "Minggu Ini", prevLabel: "Minggu Lalu" };
    if (mode === 'monthly') return { currentLabel: "Bulan Ini", prevLabel: "Bulan Lalu" };
    // Custom range
    const formatShort = (dateStr) => new Date(dateStr+'T00:00:00').toLocaleDateString('id-ID', {day:'numeric',month:'short'});
    return {
        currentLabel: `${formatShort(currentStartStr)} - ${formatShort(currentEndStr)}`,
        prevLabel: `${formatShort(prevStartStr)} - ${formatShort(prevEndStr)}`
    }
}

export async function renderComparisonChart(currentStartDate, currentEndDate, mode = 'daily') {
    const { start: prevStartDate, end: prevEndDate } = getPreviousPeriod(currentStartDate, currentEndDate, mode);
    
    try {
        const [currentResult, prevResult] = await Promise.all([
            api.getAnalyticsByRange(currentStartDate, currentEndDate),
            api.getAnalyticsByRange(prevStartDate, prevEndDate)
        ]);

        const currentData = currentResult.data.total || {};
        const prevData = prevResult.data.total || {};
        const { currentLabel, prevLabel } = getChartLabels(currentStartDate, currentEndDate, prevStartDate, prevEndDate, mode);
        
        salesComparisonChart = renderSingleChart(
            'salesComparisonChart', 'bar', ['Total Penjualan'], `Perbandingan Penjualan`,
            { label: prevLabel, data: [parseFloat(prevData.total_penjualan || 0)] },
            { label: currentLabel, data: [parseFloat(currentData.total_penjualan || 0)] },
            (value) => 'Rp ' + new Intl.NumberFormat('id-ID').format(value)
        );

        quantityComparisonChart = renderSingleChart(
            'quantityComparisonChart', 'bar', ['Total Kuantitas'], `Perbandingan Kuantitas`,
            {
                label: prevLabel, data: [parseFloat(prevData.total_lusin || 0)],
                backgroundColor: 'rgba(245, 158, 11, 0.5)', borderColor: 'rgba(217, 119, 6, 0.5)'
            },
            {
                label: currentLabel, data: [parseFloat(currentData.total_lusin || 0)],
                backgroundColor: 'rgba(239, 68, 68, 0.5)', borderColor: 'rgba(220, 38, 38, 0.5)'
            },
            (value) => value + ' Lusin'
        );

        paymentComparisonChart = renderSingleChart(
            'paymentComparisonChart', 'bar', ['EDC, CASH, TRANSFER', 'DEBT', 'Tidak Diketahui'], `Perbandingan Status Pembayaran`,
            { label: prevLabel, data: [parseFloat(prevData.lunas || 0), parseFloat(prevData.belum_lunas || 0), parseFloat(prevData.tidak_diketahui || 0)] },
            {
                label: currentLabel, data: [parseFloat(currentData.lunas || 0), parseFloat(currentData.belum_lunas || 0), parseFloat(currentData.tidak_diketahui || 0)],
                backgroundColor: 'rgba(16, 185, 129, 0.5)', borderColor: 'rgba(5, 150, 105, 0.5)'
            },
            (value) => 'Rp ' + new Intl.NumberFormat('id-ID').format(value)
        );

    } catch (error) {
        console.error("Gagal membuat grafik perbandingan toko:", error);
    }
}

export async function renderTimeSeriesChart(startDate, endDate, mode = 'daily', data = null) {
    const container = document.getElementById('timeseries-chart-container');
    if (!container) return;

    let labels = [];
    let values = [];

    if (mode === 'daily') {
        // Jam 06.00 sampai 15.00 (06:00 - 15:00)
        labels = Array.from({length: 10}, (_, i) => `${i + 6}:00`);
        if (data && data.timeseries && Array.isArray(data.timeseries)) {
            values = labels.map((label, idx) => {
                const jam = idx + 6;
                const jamData = data.timeseries.find(ts => parseInt(ts.hour) === jam);
                return jamData ? parseFloat(jamData.total_penjualan) : 0;
            });
        } else {
            values = Array(10).fill(0);
        }
    } else {
        if (data && data.data && Array.isArray(data.data)) {
            labels = data.data.map(ts => new Date(ts.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
            values = data.data.map(ts => parseFloat(ts.total_penjualan));
        }
    }

    timeSeriesChart = renderLineChart('timeSeriesChart', labels, values, 'Tren Penjualan Toko');
}

// --- FUNGSI HELPER YANG DIPERBARUI & FUNGSI BARU UNTUK PABRIK ---

function renderSingleChart(canvasId, type, labels, title, prevDataset, currentDataset, yTicksCallback) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.documentElement.classList.contains('dark');
    const textColor = isDarkMode ? 'rgba(229, 231, 235, 0.8)' : 'rgba(107, 114, 128, 1)';

    const defaultPrevColors = { backgroundColor: 'rgba(156, 163, 175, 0.5)', borderColor: 'rgba(107, 114, 128, 0.5)' };
    const defaultCurrentColors = { backgroundColor: 'rgba(79, 70, 229, 0.5)', borderColor: 'rgba(67, 56, 202, 0.5)' };

    return new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [
                { ...defaultPrevColors, ...prevDataset, borderWidth: 1 },
                { ...defaultCurrentColors, ...currentDataset, borderWidth: 1 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { 
                y: { beginAtZero: true, ticks: { callback: yTicksCallback, color: textColor }, grid: { color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' } },
                x: { ticks: { color: textColor }, grid: { color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' } }
            },
            plugins: { 
                legend: { position: 'top', labels: { color: textColor } }, 
                title: { display: true, text: title, color: textColor } 
            }
        }
    });
}

export function renderLineChart(canvasId, labels, values, titleText = 'Tren Penjualan') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.documentElement.classList.contains('dark');
    const textColor = isDarkMode ? 'rgba(229, 231, 235, 0.8)' : 'rgba(107, 114, 128, 1)';

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Penjualan',
                data: values,
                fill: true, borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)', tension: 0.1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { 
                legend: { display: false }, 
                title: { display: true, text: titleText, color: textColor } 
            },
            scales: { 
                y: { beginAtZero: true, ticks: { callback: (value) => 'Rp ' + new Intl.NumberFormat('id-ID').format(value), color: textColor }, grid: { color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' } },
                x: { ticks: { color: textColor }, grid: { color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' } }
            }
        }
    });
}
export function destroyAllFactoryCharts() {
    if (factorySalesComparisonChart) factorySalesComparisonChart.destroy();
    if (factoryQuantityComparisonChart) factoryQuantityComparisonChart.destroy();
    if (factoryTimeSeriesChart) factoryTimeSeriesChart.destroy();
}

export async function renderFactoryComparisonChart(currentStartDate, currentEndDate, mode = 'daily') {
    const { start: prevStartDate, end: prevEndDate } = getPreviousPeriod(currentStartDate, currentEndDate, mode);
    
    try {
        const [currentResult, prevResult] = await Promise.all([
            api.getFactoryAnalyticsByRange(currentStartDate, currentEndDate),
            api.getFactoryAnalyticsByRange(prevStartDate, prevEndDate)
        ]);

        const currentData = currentResult.data.total || {};
        const prevData = prevResult.data.total || {};
        const { currentLabel, prevLabel } = getChartLabels(currentStartDate, currentEndDate, prevStartDate, prevEndDate, mode);
        
        destroyAllFactoryCharts();

        factorySalesComparisonChart = renderSingleChart(
            'factorySalesComparisonChart', 'bar', ['Total Penjualan'], `Perbandingan Penjualan`,
            { label: prevLabel, data: [parseFloat(prevData.total_penjualan || 0)] },
            { label: currentLabel, data: [parseFloat(currentData.total_penjualan || 0)] },
            (value) => 'Rp ' + new Intl.NumberFormat('id-ID').format(value)
        );

        factoryQuantityComparisonChart = renderSingleChart(
            'factoryQuantityComparisonChart', 'bar', ['Total Kuantitas'], `Perbandingan Kuantitas`,
            {
                label: prevLabel, data: [parseFloat(prevData.total_lusin || 0)],
                backgroundColor: 'rgba(245, 158, 11, 0.5)', borderColor: 'rgba(217, 119, 6, 0.5)'
            },
            {
                label: currentLabel, data: [parseFloat(currentData.total_lusin || 0)],
                backgroundColor: 'rgba(239, 68, 68, 0.5)', borderColor: 'rgba(220, 38, 38, 0.5)'
            },
            (value) => value + ' Lusin'
        );

    } catch (error) {
        console.error("Gagal membuat grafik perbandingan pabrik:", error);
    }
}
export async function renderFactoryTimeSeriesChart(startDate, endDate) {
    const container = document.getElementById('factory-timeseries-chart-container');
    if (!container) return;
    
    try {
        const result = await api.getFactoryAnalyticsTimeSeries(startDate, endDate);
        if (result.status !== 'success') throw new Error(result.message);

        const data = result.data;
        const labels = data.map(d => new Date(d.tanggal+'T00:00:00').toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}));
        const values = data.map(d => parseFloat(d.total_penjualan));
        
        factoryTimeSeriesChart = renderLineChart('factoryTimeSeriesChart', labels, values, 'Tren Penjualan Pabrik');

    } catch(error) {
        console.error("Gagal membuat grafik time series pabrik:", error);
        container.innerHTML = `<p class="text-center text-red-500">Gagal memuat data tren.</p>`;
    }
}