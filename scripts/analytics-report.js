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
                { name: 'eventName' },
                { name: 'pagePath' },
                { name: 'deviceCategory' },
                { name: 'sessionSource' },
                { name: 'city' }
            ],
            metrics: [
                { name: 'eventCount' },
                { name: 'activeUsers' },
                { name: 'sessions' },
                { name: 'engagementRate' },
                { name: 'averageSessionDuration' }
            ],
        });

        console.log('✅ Datos obtenidos de Analytics (incluyendo visitas y engagement).');

        // 2. Sincronizar con Google Sheets
        await syncToGoogleSheets(response);

        // 3. Generar Excel local de respaldo
        await generateExcel(response);

    } catch (error) {
        console.error('❌ Error en el proceso:', error.message);
    }
}

async function syncToGoogleSheets(reportData) {
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Preparar filas para Google Sheets
    const header = ['Fecha', 'Evento', 'Página/URL', 'Dispositivo', 'Fuente', 'Ciudad', 'Cant. Eventos', 'Usuarios Únicos', 'Visitas (Sesiones)', 'Tasa de Interacción', 'Dur. Media (s)'];
    const rows = reportData.rows.map(row => [
        row.dimensionValues[0].value,
        row.dimensionValues[1].value,
        row.dimensionValues[2].value,
        row.dimensionValues[3].value,
        row.dimensionValues[4].value,
        row.dimensionValues[5].value,
        row.metricValues[0].value,
        row.metricValues[1].value,
        row.metricValues[2].value,
        (parseFloat(row.metricValues[3].value) * 100).toFixed(2) + '%',
        parseFloat(row.metricValues[4].value).toFixed(2)
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

        console.log('✨ ¡Nube actualizada! Google Sheet sincronizada con éxito.');
    } catch (error) {
        console.error('⚠️ Error al actualizar Google Sheets:', error.message);
        console.log('¿Has compartido la hoja con el email del credentials.json?');
    }
}

async function generateExcel(reportData) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('backup_reporte');
    
    // (Mantenemos la lógica de Excel actual como backup)
    worksheet.columns = [
        { header: 'Fecha', key: 'date', width: 12 },
        { header: 'Evento', key: 'event', width: 20 },
        { header: 'Página/URL', key: 'page', width: 30 },
        { header: 'Dispositivo', key: 'device', width: 15 },
        { header: 'Fuente', key: 'source', width: 15 },
        { header: 'Cantidad', key: 'count', width: 10 },
        { header: 'Usuarios Únicos', key: 'users', width: 15 },
        { header: 'Duración Media (s)', key: 'duration', width: 18 }
    ];

    reportData.rows.forEach(row => {
        worksheet.addRow({
            date: row.dimensionValues[0].value,
            event: row.dimensionValues[1].value,
            page: row.dimensionValues[2].value,
            device: row.dimensionValues[3].value,
            source: row.dimensionValues[4].value,
            count: row.metricValues[0].value,
            users: row.metricValues[1].value,
            duration: parseFloat(row.metricValues[2].value).toFixed(2)
        });
    });

    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);
    
    const filePath = path.join(reportsDir, `backup_${new Date().toISOString().split('T')[0]}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    console.log(`💾 Backup local guardado en: ${filePath}`);
}

runReport();
