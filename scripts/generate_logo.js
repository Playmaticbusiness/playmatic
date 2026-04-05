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
                width: 100vw; height: 100vh;
            }
            .logo { 
                font-family: 'Orbitron', sans-serif; 
                font-size: 100px; 
                font-weight: 800; 
                letter-spacing: 20px; /* Scaling letter spacing relative to 100px */
                color: #ffffff; 
                white-space: nowrap;
            }
        </style>
    </head>
    <body id="bdy">
        <div class="logo" id="logoText">PLAYMATIC</div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Set a very large viewport to allow rendering the big text
    await page.setViewport({ width: 2500, height: 600 });
    
    await page.setContent(htmlContent);
    
    // Wait for the font to be fully loaded
    await page.evaluateHandle('document.fonts.ready');
    
    // Let's get the bounding box of the logo to screenshot it tightly
    const logoElement = await page.$('#logoText');
    const boundingBox = await logoElement.boundingBox();

    if (boundingBox) {
        // We include some padding maybe? Or just the exact text box
        await page.screenshot({ 
            path: 'playmatic-logo.png', 
            clip: {
                x: boundingBox.x - 20,
                y: boundingBox.y - 20,
                width: boundingBox.width + 40,
                height: boundingBox.height + 40
            },
            omitBackground: true
        });
        console.log("Logo generated: playmatic-logo.png");
    } else {
        console.log("Could not find logo bounding box.");
    }
    
    await browser.close();
})();
