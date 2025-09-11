import { api } from './api.js';
import { analyticsState } from './analytics.js'; // Impor state untuk mengetahui mode saat ini

export let timeSeriesChart = null;
export let salesComparisonChart = null; 
export let quantityComparisonChart = null;
export let paymentComparisonChart = null

// Fungsi helper untuk format tanggal ke YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// --- FUNGSI UTAMA YANG DIPERBAIKI ---
// Fungsi ini sekarang lebih pintar dalam menghitung periode sebelumnya
function getPreviousPeriod(currentStartStr, currentEndStr) {
    const mode = analyticsState.mode;
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
    
    return {
        start: formatDate(prevStart),
        end: formatDate(prevEnd)
    };
}

// Fungsi untuk membuat label yang lebih deskriptif
function getChartLabels(currentStartStr, currentEndStr, prevStartStr, prevEndStr) {
    const mode = analyticsState.mode;

    if (mode === 'daily') {
        return {
            currentLabel: new Date(currentStartStr+'T00:00:00').toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}),
            prevLabel: new Date(prevStartStr+'T00:00:00').toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})
        }
    }
    if (mode === 'weekly') return { currentLabel: "Minggu Ini", prevLabel: "Minggu Lalu" };
    if (mode === 'monthly') return { currentLabel: "Bulan Ini", prevLabel: "Bulan Lalu" };
    
    const formatShort = (dateStr) => new Date(dateStr+'T00:00:00').toLocaleDateString('id-ID', {day:'numeric',month:'short'});
    return {
        currentLabel: `${formatShort(currentStartStr)} - ${formatShort(currentEndStr)}`,
        prevLabel: `${formatShort(prevStartStr)} - ${formatShort(prevEndStr)}`
    }
}


export function destroyAllCharts() {
    if (timeSeriesChart) timeSeriesChart.destroy(); 
    if (salesComparisonChart) salesComparisonChart.destroy();
    if (quantityComparisonChart) quantityComparisonChart.destroy();
    if (paymentComparisonChart) paymentComparisonChart.destroy();
}

export async function renderComparisonChart(currentStartDate, currentEndDate) {
    const { start: prevStartDate, end: prevEndDate } = getPreviousPeriod(currentStartDate, currentEndDate);
    
    try {
        const [currentResult, prevResult] = await Promise.all([
            api.getAnalyticsByRange(currentStartDate, currentEndDate),
            api.getAnalyticsByRange(prevStartDate, prevEndDate)
        ]);

        const currentData = currentResult.data.total || {};
        const prevData = prevResult.data.total || {};
        
        const { currentLabel, prevLabel } = getChartLabels(currentStartDate, currentEndDate, prevStartDate, prevEndDate);
        
        //destroyAllCharts();

        // Chart 1: Total Penjualan (Rp)
        renderSingleChart(
            'salesComparisonChart', 'bar', ['Total Penjualan'], `Perbandingan Penjualan`,
            { label: prevLabel, data: [parseFloat(prevData.total_penjualan || 0)] },
            { label: currentLabel, data: [parseFloat(currentData.total_penjualan || 0)] },
            (value) => 'Rp ' + new Intl.NumberFormat('id-ID').format(value)
        );

        // Chart 2: Total Kuantitas (Lusin)
        renderSingleChart(
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

        // Chart 3: Status Pembayaran
        renderSingleChart(
            'paymentComparisonChart', 'bar', ['EDC, Cash, Transfer', 'Debt', 'Tidak Diketahui'], `Perbandingan Status Pembayaran`,
            { label: prevLabel, data: [parseFloat(prevData.lunas || 0), parseFloat(prevData.belum_lunas || 0), parseFloat(prevData.tidak_diketahui || 0)] },
            {
                label: currentLabel, data: [parseFloat(currentData.lunas || 0), parseFloat(currentData.belum_lunas || 0), parseFloat(currentData.tidak_diketahui || 0)],
                backgroundColor: 'rgba(16, 185, 129, 0.5)', borderColor: 'rgba(5, 150, 105, 0.5)'
            },
            (value) => 'Rp ' + new Intl.NumberFormat('id-ID').format(value)
        );

    } catch (error) {
        console.error("Gagal membuat grafik perbandingan:", error);
    }
}

function renderSingleChart(canvasId, type, labels, title, prevDataset, currentDataset, yTicksCallback) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const defaultPrevColors = { backgroundColor: 'rgba(156, 163, 175, 0.5)', borderColor: 'rgba(107, 114, 128, 0.5)' };
    const defaultCurrentColors = { backgroundColor: 'rgba(79, 70, 229, 0.5)', borderColor: 'rgba(67, 56, 202, 0.5)' };

    const chartInstance = new Chart(ctx, {
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
            scales: { y: { beginAtZero: true, ticks: { callback: yTicksCallback } } },
            plugins: { legend: { position: 'top' }, title: { display: true, text: title } }
        }
    });

    if (canvasId === 'salesComparisonChart') salesComparisonChart = chartInstance;
    else if (canvasId === 'quantityComparisonChart') quantityComparisonChart = chartInstance;
    else if (canvasId === 'paymentComparisonChart') paymentComparisonChart = chartInstance;
}

export async function renderTimeSeriesChart(startDate, endDate) {
    const container = document.getElementById('timeseries-chart-container');
    if (!container) return;
    
    try {
        const result = await api.getAnalyticsTimeSeries(startDate, endDate);
        if (result.status !== 'success') throw new Error(result.message);

        const data = result.data;
        const labels = data.map(d => new Date(d.tanggal+'T00:00:00').toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}));
        const values = data.map(d => parseFloat(d.total_penjualan));
        
        const canvas = document.getElementById('timeSeriesChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        timeSeriesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Penjualan',
                    data: values,
                    fill: true,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Tren Penjualan per Hari'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => 'Rp ' + new Intl.NumberFormat('id-ID').format(value)
                        }
                    }
                }
            }
        });

    } catch(error) {
        console.error("Gagal membuat grafik time series:", error);
        container.innerHTML = `<p class="text-center text-red-500">Gagal memuat data tren.</p>`;
    }
}