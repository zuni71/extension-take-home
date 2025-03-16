const puppeteer = require('puppeteer');
const path = require('path');
const ActionTrackingRecorder = require('./ActionTrackingRecorder');

const outputPath = path.join(__dirname, 'chatgpt-actions.json');


async function trackChatGPT() {
  // Launch browser with GUI visible so you can interact with it
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null, // Use full window
    args: ['--start-maximized'] // Start with maximized window
  });
  
  // Create a new page
  const page = await browser.newPage();
  
  // Configure recorder - focus only on actions, no video
  const recorderOptions = {
    captureVideo: false, // Set to true if you want video as well
    includeConsoleMessages: true,
    includeNetworkRequests: true
  };
  
  // Create recorder
  const recorder = new ActionTrackingRecorder(page, recorderOptions);
  
  // Set output path for logs
  const outputDir = path.join(__dirname, 'logs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(outputDir, `chatgpt-session-${timestamp}.json`);
  
  // Start recording
  console.log('Starting to track ChatGPT actions...');
  await recorder.start(outputPath);

  recorder.writer.recordAction({
    type: 'test',
    timestamp: Date.now(),
    details: 'This is a test action'
  });

  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Expose the function to the browser context
    await page.exposeFunction('__puppeteerClick', (clickData) => {
      console.log('Click received:', clickData);
      // Process your click data here
      // You can emit events to your collector or write to a log
    });
    
    // Now navigate to the page
    await page.goto('https://chatgpt.com/login');
    
      // Initialize your tracking extension
  const recorder = new ActionTrackingRecorder(page, {
    // Add any options you need
  });

  await recorder.start(outputPath);
  console.log('Tracking initialized successfully');

  // Test that the recorder works by sending a manual event
  recorder.writer.recordAction({
    type: 'test',
    timestamp: Date.now(),
    details: 'This is a test action'
  });
    // Initialize your tracking extension after navigation
    // ...
  });
  
  try {
    // Navigate to ChatGPT
    await page.goto('https://chatgpt.com/');
    
    console.log('Logged in to ChatGPT. Start interacting with the page...');
    console.log('Press Ctrl+C when done to stop tracking and save the log.');
    
    // Wait for a very long time to allow manual interaction
    await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 60)); // 1 hour timeout
  } catch (error) {
    console.error('Error during tracking:', error);
  }
  
  // This code will run when the timeout completes or if there's an error
  console.log('Current action log:', recorder.getActionLog());
  const result = await recorder.stop();
  console.log('Tracking completed. Action log saved to:', result.actionLogPath);
  await browser.close();
}

// Run the function
trackChatGPT().catch(console.error);