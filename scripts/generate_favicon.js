const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@800&display=swap" rel="stylesheet">
        <style>
            body { 
                margin: 0; padding: 0; background: transparent; 
                display:flex; justify-content:center; align-items:center;
                width: 300px; height: 300px;
                overflow: hidden;
            }
            .logo { 
                font-family: 'Orbitron', sans-serif; 
                font-size: 220px; 
                font-weight: 800; 
                background: linear-gradient(135deg, #ffffff 0%, #7e7e85 100%);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                width: 100%;
                height: 100%;
            }
        </style>
    </head>
    <body>
        <div class="logo">P</div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.setViewport({ width: 300, height: 300, deviceScaleFactor: 2 });
    await page.setContent(htmlContent);
    await page.evaluateHandle('document.fonts.ready');
    
    await page.screenshot({ 
        path: 'favicon-playmatic.png', 
        omitBackground: true,
        type: 'png'
    });
    
    console.log("Transparent favicon generated: favicon-playmatic.png");
    await browser.close();
})();
