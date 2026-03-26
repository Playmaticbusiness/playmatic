const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { google } = require('googleapis');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// --- CONFIGURACIÓN ---
const PROPERTY_ID = '529708391'; 
const SPREADSHEET_ID = '1fU0JLLcORGhQmJRwGeHY_efUZZEnwlQhqEFWxNzI24g'; // Google Sheet del usuario
const KEY_FILE_PATH = path.join(__dirname, 'credentials.json');

const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: [
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/spreadsheets'
    ],
});

const analyticsDataClient = new BetaAnalyticsDataClient({
    auth: auth,
});

async function runReport() {
    console.log('🚀 Iniciando proceso de automatización (GA4 -> Google Sheets)...');

    if (!fs.existsSync(KEY_FILE_PATH)) {
        console.error('❌ Error: No se encuentra el archivo credentials.json');
        return;
    }

    try {
        // 1. Obtener datos de Google Analytics
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${PROPERTY_ID}`,
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            dimensions: [
                { name: 'date' },
                { name: 'pagePath' },
                { name: 'sessionSource' },
                { name: 'deviceCategory' },
                { name: 'city' }
            ],
            metrics: [
                { name: 'activeUsers' },
                { name: 'newUsers' },
                { name: 'sessions' },
                { name: 'screenPageViews' },
                { name: 'engagementRate' },
                { name: 'averageSessionDuration' }
            ],
        });

        console.log('✅ Datos obtenidos de Analytics (incluyendo visitas y engagement).');

        // 2. Sincronizar con Google Sheets
        await syncToGoogleSheets(response);

        // 3. Generar Excel local de respaldo
        await generateExcel(response);

        // 4. Generar Dashboard HTML automático (0 setup requerido por el usuario)
        await generateHTMLDashboard(response);

    } catch (error) {
        console.error('❌ Error en el proceso:', error.message);
    }
}

async function syncToGoogleSheets(reportData) {
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Preparar filas para Google Sheets
    const header = ['Fecha', 'Ruta de la Página', 'Origen del Tráfico', 'Dispositivo', 'Ciudad', 'Usuarios Activos', 'Nuevos Usuarios', 'Visitas (Sesiones)', 'Vistas de Página', 'Engagement (%)', 'Tiempo Medio (s)'];
    const rows = reportData.rows.map(row => [
        row.dimensionValues[0].value, // date
        row.dimensionValues[1].value, // pagePath
        row.dimensionValues[2].value, // sessionSource
        row.dimensionValues[3].value, // deviceCategory
        row.dimensionValues[4].value, // city
        row.metricValues[0].value,    // activeUsers
        row.metricValues[1].value,    // newUsers
        row.metricValues[2].value,    // sessions
        row.metricValues[3].value,    // screenPageViews
        (parseFloat(row.metricValues[4].value) * 100).toFixed(2) + '%', // engagementRate
        parseFloat(row.metricValues[5].value).toFixed(2) // averageSessionDuration
    ]);

    try {
        // Limpiar hoja y escribir datos
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Hoja 1!A1:Z1000',
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Hoja 1!A1',
            valueInputOption: 'RAW',
            requestBody: {
                values: [header, ...rows],
            },
        });

        console.log('✨ ¡Nube actualizada! Google Sheet sincronizada con éxito para Looker Studio.');
    } catch (error) {
        console.error('⚠️ Error al actualizar Google Sheets:', error.message);
        console.log('¿Has compartido la hoja con el email del credentials.json?');
    }
}

async function generateExcel(reportData) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('backup_reporte');
    
    // Columnas adaptadas para Looker Studio
    worksheet.columns = [
        { header: 'Fecha', key: 'date', width: 12 },
        { header: 'Ruta de la Página', key: 'page', width: 30 },
        { header: 'Origen del Tráfico', key: 'source', width: 20 },
        { header: 'Dispositivo', key: 'device', width: 15 },
        { header: 'Ciudad', key: 'city', width: 15 },
        { header: 'Usuarios Activos', key: 'activeUsers', width: 15 },
        { header: 'Nuevos Usuarios', key: 'newUsers', width: 15 },
        { header: 'Visitas (Sesiones)', key: 'sessions', width: 18 },
        { header: 'Vistas de Página', key: 'pageViews', width: 18 },
        { header: 'Engagement (%)', key: 'engagement', width: 15 },
        { header: 'Tiempo Medio (s)', key: 'duration', width: 18 }
    ];

    reportData.rows.forEach(row => {
        worksheet.addRow({
            date: row.dimensionValues[0].value,
            page: row.dimensionValues[1].value,
            source: row.dimensionValues[2].value,
            device: row.dimensionValues[3].value,
            city: row.dimensionValues[4].value,
            activeUsers: row.metricValues[0].value,
            newUsers: row.metricValues[1].value,
            sessions: row.metricValues[2].value,
            pageViews: row.metricValues[3].value,
            engagement: (parseFloat(row.metricValues[4].value) * 100).toFixed(2) + '%',
            duration: parseFloat(row.metricValues[5].value).toFixed(2)
        });
    });

    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);
    
    const filePath = path.join(reportsDir, `backup_${new Date().toISOString().split('T')[0]}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    console.log(`💾 Backup local guardado en: ${filePath}`);
}

async function generateHTMLDashboard(reportData) {
    const dateMap = {};
    const deviceMap = {};
    const sourceMap = {};
    const cityMap = {};
    const pageMap = {};
    
    let totalSessions = 0;
    let totalPageViews = 0;
    let sumEngagementRate = 0;
    let sumDuration = 0;
    let rowCount = 0;
    
    reportData.rows.forEach(row => {
        const date = row.dimensionValues[0].value; 
        const page = row.dimensionValues[1].value;
        const source = row.dimensionValues[2].value;
        const device = row.dimensionValues[3].value;
        const city = row.dimensionValues[4].value;
        
        const sess = parseInt(row.metricValues[2].value) || 0;
        const views = parseInt(row.metricValues[3].value) || 0;
        const engage = parseFloat(row.metricValues[4].value) || 0;
        const dur = parseFloat(row.metricValues[5].value) || 0;
        
        totalSessions += sess;
        totalPageViews += views;
        sumEngagementRate += engage;
        sumDuration += dur;
        rowCount++;
        
        if (!dateMap[date]) dateMap[date] = { sessions: 0, views: 0 };
        dateMap[date].sessions += sess;
        dateMap[date].views += views;

        if (!deviceMap[device]) deviceMap[device] = 0;
        deviceMap[device] += sess;

        if (!sourceMap[source]) sourceMap[source] = 0;
        sourceMap[source] += sess;

        if (city !== '(not set)') {
            if (!cityMap[city]) cityMap[city] = 0;
            cityMap[city] += sess;
        }

        if (!pageMap[page]) pageMap[page] = 0;
        pageMap[page] += views;
    });

    const avgEngagement = rowCount > 0 ? ((sumEngagementRate / rowCount) * 100).toFixed(1) + '%' : '0%';
    const avgDur = rowCount > 0 ? (sumDuration / rowCount).toFixed(0) + 's' : '0s';

    const sortedDates = Object.keys(dateMap).sort();
    const labels = sortedDates.map(d => `${d.substring(6,8)}/${d.substring(4,6)}`);
    const dataSessions = sortedDates.map(d => dateMap[d].sessions);
    const dataViews = sortedDates.map(d => dateMap[d].views);

    // Formatear dispositivo
    const devDict = { 'mobile': 'Móvil', 'desktop': 'Ordenador', 'tablet': 'Tablet' };
    const deviceLabels = Object.keys(deviceMap).map(d => devDict[d] || d);
    const deviceData = Object.values(deviceMap);

    const sourceLabels = Object.keys(sourceMap);
    const sourceData = Object.values(sourceMap);

    const topCities = Object.entries(cityMap).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const cityLabels = topCities.map(c => c[0]);
    const cityData = topCities.map(c => c[1]);

    const topPages = Object.entries(pageMap).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const pagesTableRows = topPages.map(p => `<div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:5px;"><span>${p[0]}</span><span style="color:#00f2fe; font-weight:bold;">${p[1]}</span></div>`).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Analítico Playmatic</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0d0d10; color: #f2f2f5; padding: 20px; margin:0; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { text-align: center; color: #4facfe; margin: 20px 0 40px; font-weight: 800; font-size: 2.2rem; }
        .scorecards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: rgba(25, 25, 30, 0.8); padding: 25px 20px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
        .card h3 { margin: 0 0 10px 0; color: #8a8d9b; font-size: 1rem; }
        .card p { margin: 0; font-size: 2.2rem; font-weight: bold; color: #00f2fe; }
        .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .chart-container { background: rgba(25, 25, 30, 0.8); padding: 25px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
        .full-width { grid-column: 1 / -1; }
        h2.box-title { color:#8a8d9b; font-size:1.1rem; text-align:center; margin-top:0; margin-bottom:20px; }
        .footer { text-align: center; margin-top: 40px; margin-bottom: 20px; color: #8a8d9b; font-size: 0.9rem; }
        @media (max-width: 768px) { .charts-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Analíticas Playmatic</h1>
        
        <div class="scorecards">
            <div class="card">
                <h3>👀 Vistas de Página</h3>
                <p>${totalPageViews}</p>
            </div>
            <div class="card">
                <h3>🚪 Visitas (Sesiones)</h3>
                <p>${totalSessions}</p>
            </div>
            <div class="card">
                <h3>⏱️ Tiempo Medio</h3>
                <p>${avgDur}</p>
            </div>
            <div class="card">
                <h3>🔥 Engagement</h3>
                <p>${avgEngagement}</p>
            </div>
        </div>

        <div class="charts-grid">
            <div class="chart-container full-width">
                <h2 class="box-title">Evolución del Tráfico</h2>
                <canvas id="trafficChart"></canvas>
            </div>
            
            <div class="chart-container">
                <h2 class="box-title">Dispositivos Utilizados</h2>
                <canvas id="deviceChart"></canvas>
            </div>

            <div class="chart-container">
                <h2 class="box-title">Orígenes del Tráfico</h2>
                <canvas id="sourceChart"></canvas>
            </div>
            
            <div class="chart-container">
                <h2 class="box-title">Top Ciudades</h2>
                <canvas id="cityChart"></canvas>
            </div>

            <div class="chart-container">
                <h2 class="box-title">Páginas Más Vistas</h2>
                <div style="margin-top:20px;">
                    ${pagesTableRows}
                </div>
            </div>
        </div>
        
        <div class="footer">
            Generado automáticamente el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}
        </div>
    </div>

    <script>
        Chart.defaults.color = '#8a8d9b';
        Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';

        // Tráfico Evolutivo
        new Chart(document.getElementById('trafficChart').getContext('2d'), {
            type: 'line',
            data: {
                labels: ${JSON.stringify(labels)},
                datasets: [
                    { label: 'Vistas de Página', data: ${JSON.stringify(dataViews)}, borderColor: '#00f2fe', backgroundColor: 'rgba(0, 242, 254, 0.1)', borderWidth: 3, tension: 0.4, fill: true },
                    { label: 'Sesiones', data: ${JSON.stringify(dataSessions)}, borderColor: '#4facfe', backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, borderDash: [5, 5] }
                ]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });

        // Dispositivos (Doughnut)
        new Chart(document.getElementById('deviceChart').getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ${JSON.stringify(deviceLabels)},
                datasets: [{
                    data: ${JSON.stringify(deviceData)},
                    backgroundColor: ['#00f2fe', '#4facfe', '#1a365d'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, cutout: '70%', plugins: { legend: { position: 'bottom' } } }
        });

        // Fuentes (Pie)
        new Chart(document.getElementById('sourceChart').getContext('2d'), {
            type: 'pie',
            data: {
                labels: ${JSON.stringify(sourceLabels)},
                datasets: [{
                    data: ${JSON.stringify(sourceData)},
                    backgroundColor: ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#9333ea'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });

        // Ciudades (Bar)
        new Chart(document.getElementById('cityChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(cityLabels)},
                datasets: [{
                    label: 'Sesiones',
                    data: ${JSON.stringify(cityData)},
                    backgroundColor: '#00f2fe',
                    borderRadius: 4
                }]
            },
            options: { responsive: true, plugins: { legend: { display:false } } }
        });
    </script>
</body>
</html>`;

    const rootPath = path.join(__dirname, '..', 'Dashboard_Analiticas.html');
    fs.writeFileSync(rootPath, htmlContent);
    console.log(`📊 Dashboard HTML generado automáticamente en: ${rootPath}`);
}

runReport();
