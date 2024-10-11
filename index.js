import express from 'express';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher'; 
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path'; // Import the path module

// Define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT =   3002;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the reports directory
app.use('/reports', express.static(__dirname));

// Function to launch Chrome and run Lighthouse
const runLighthouse = async (url) => {
    const chrome = await launch({ chromeFlags: ['--headless'] });
    const options = {
        logLevel: 'info',
        output: 'json',
        onlyCategories: ['performance'], // You can adjust the categories as needed
        port: chrome.port,
        maxWaitForLoad: 60000, // Set timeout to 60 seconds
    };

    const runnerResult = await lighthouse(url, options);
    await chrome.kill();

    return runnerResult.lhr; // Lighthouse result
};

// API endpoint to analyze a URL
app.post('/analyze', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const report = await runLighthouse(url);
        const reportPath = path.join(__dirname, `${new URL(url).hostname}-report.json`);

        // Save report to a file
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Construct the URL for the report
        const reportUrl = `http://localhost:${PORT}/reports/${new URL(url).hostname}-report.json`;

        return res.status(200).json({
            message: 'Lighthouse report generated',
            report: reportUrl, // Return the report URL
            data: report // Return the report data if needed
        });
    } catch (error) {
        console.error('Error generating report:', error);
        return res.status(500).json({ error: 'An error occurred while generating the report', details: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
