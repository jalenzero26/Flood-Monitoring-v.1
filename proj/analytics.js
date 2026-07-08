let masterDatabase = null;
const barangayList = ["Biñan", "Bungahan", "Canlalay", "Casile", "Timbao"]; // Add others here
const ctx = document.getElementById('floodChart').getContext('2d');
const floodChart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Water Depth (cm)', data: [], borderColor: '#0038a8', fill: true }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: '', font: { size: 24, weight: 'bold' }, color: '#0038a8' } } }
});

fetch('analytics_data.json').then(res => res.json()).then(data => { masterDatabase = data; updateAnalyticsDashboard(); });

function updateAnalyticsDashboard() {
    if (!masterDatabase) return;
    const name = document.getElementById('barangaySearch').value.trim() || "Default";
    const interval = document.getElementById('intervalSelect').value;
    const year = document.getElementById('yearSelect').value;
    const monthSelect = document.getElementById('monthSelect');
    
    document.getElementById('monthFilterGroup').style.display = (interval !== 'yearly') ? 'block' : 'none';
    const dbSource = masterDatabase.barangay_historical_data[name] || masterDatabase.barangay_historical_data["Default"];
    const node = dbSource?.[year]?.[interval];

    if (interval === 'yearly') {
        floodChart.options.plugins.title.text = year;
        floodChart.data.labels = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    } else {
        floodChart.options.plugins.title.text = monthSelect.options[monthSelect.selectedIndex].text.toUpperCase();
        floodChart.data.labels = node ? node.depths.map((_, i) => (i + 1).toString()) : [];
    }

    if (node) {
        floodChart.data.datasets[0].data = node.depths;
        document.getElementById('metricPeak').innerText = `${Math.max(...node.depths)} cm`;
        document.getElementById('metricAvg').innerText = `${Math.round(node.depths.reduce((a, b) => a + b, 0) / node.depths.length)} cm`;
    }
    document.getElementById('analyticsTitle').innerText = `Analytics: ${name}`;
    floodChart.update();
}

document.getElementById('barangaySearch').addEventListener('input', (e) => {
    const s = document.getElementById('suggestions');
    s.innerHTML = '';
    barangayList.filter(b => b.toLowerCase().includes(e.target.value.toLowerCase())).forEach(m => {
        const d = document.createElement('div'); d.className = 'suggestion-item'; d.textContent = m;
        d.onclick = () => { document.getElementById('barangaySearch').value = m; s.innerHTML = ''; updateAnalyticsDashboard(); };
        s.appendChild(d);
    });
});

document.addEventListener('click', (e) => { if (!e.target.closest('.search-container')) document.getElementById('suggestions').innerHTML = ''; });
document.querySelectorAll('select, input').forEach(el => el.addEventListener('change', updateAnalyticsDashboard));