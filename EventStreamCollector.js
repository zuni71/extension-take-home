/**
 * EventStreamCollector.js
 * Responsible for collecting user actions and screen frames from a page
 */
const EventEmitter = require('events');

class EventStreamCollector extends EventEmitter {
  /**
   * Creates a new instance of the event collector
   * @param {Object} page - The page to track events on
   * @param {Object} options - Configuration options
   */
  constructor(page, options = {}) {
    super();
    this.page = page;
    this.options = options;
    this.startTimestamp = null;
    this.isCollecting = false;
  }

  /**
   * Starts collecting events from the page
   */
  start() {
    if (this.isCollecting) return;
    
    this.isCollecting = true;
    this.startTimestamp = Date.now();
    this.setupEventListeners();
    
    this.emit('collectorStarted', {
      timestamp: 0
    });
  }

  /**
   * Stops collecting events
   */
  async stop() {
    if (!this.isCollecting) return;
    
    this.isCollecting = false;
    await this.removeEventListeners();
    
    this.emit('collectorStopped', {
      timestamp: this.getElapsedTime()
    });
  }

  /**
   * Sets up all event listeners for tracking
   */
  async setupEventListeners() {
    // Track page close
    this.page.once('close', this.handlePageClose.bind(this));
    
    // Track video frames if enabled
    if (this.options.captureVideo) {
      this.setupVideoCapture();
    }
    
    // Track mouse clicks
    this.clickHandler = this.handleClick.bind(this);
    this.page.on('click', this.clickHandler);
    
    // Track form inputs
    this.inputHandler = this.handleInput.bind(this);
    this.page.on('input', this.inputHandler);

    
    // Track network requests if enabled
    if (this.options.includeNetworkRequests) {
      this.requestHandler = this.handleRequest.bind(this);
      this.page.on('request', this.requestHandler);
      
      this.responseHandler = this.handleResponse.bind(this);
      this.page.on('response', this.responseHandler);
    }

    // Set up direct DOM event listeners
  await this.page.evaluate(() => {
    document.addEventListener('click', (event) => {
      // Send the event data back to Node.js
      window.__puppeteerClick({
        x: event.clientX, 
        y: event.clientY,
        target: event.target.tagName
      });
    }, true); // Use capture phase to catch all clicks
  });

  // Create a handler in Node.js context to receive the events
  await this.page.exposeFunction('__puppeteerClick', (data) => {
    console.log('Click captured via DOM:', data);
    this.handleDOMClick(data);
  });
}

// Add a new handler for DOM clicks
async handleDOMClick(data) {
  const actionData = {
    type: 'click',
    x: data.x,
    y: data.y,
    timestamp: this.getElapsedTime(),
    target: { tagName: data.target }
  };
  
  console.log("Emitting DOM click action:", actionData);
  this.emit('action', actionData);
}


async setupNavigationTracking() {
    // Track network requests
    this.page.on('request', request => {
      const actionData = {
        type: 'request',
        url: request.url(),
        method: request.method(),
        timestamp: this.getElapsedTime()
      };
      
      console.log("Network request:", request.method(), request.url());
      this.emit('action', actionData);
    });
    
    // Track response data
    this.page.on('response', response => {
      const actionData = {
        type: 'response',
        url: response.url(),
        status: response.status(),
        timestamp: this.getElapsedTime()
      };
      
      console.log("Network response:", response.status(), response.url());
      this.emit('action', actionData);
    });
  }

  /**
   * Removes all event listeners
   */
  async removeEventListeners() {
    // Remove all handlers
    this.page.removeListener('click', this.clickHandler);
    this.page.removeListener('input', this.inputHandler);
    this.page.removeListener('navigation', this.navigationHandler);
    
    if (this.options.includeConsoleMessages) {
      this.page.removeListener('console', this.consoleHandler);
    }
    
    if (this.options.includeNetworkRequests) {
      this.page.removeListener('request', this.requestHandler);
      this.page.removeListener('response', this.responseHandler);
    }
  }

  /**
   * Sets up video capture if enabled
   */
  setupVideoCapture() {
    // Implementation would depend on how video is captured
    // This is a placeholder for the video capture logic
    const captureFrame = async () => {
      if (!this.isCollecting) return;
      
      try {
        const screenshot = await this.page.screenshot({
          type: 'jpeg',
          quality: this.options.screenshotQuality || 80
        });
        
        this.emit('frame', {
          timestamp: this.getElapsedTime(),
          data: screenshot
        });
        
        // Schedule next frame capture based on fps
        if (this.isCollecting) {
          setTimeout(captureFrame, 1000 / (this.options.fps || 25));
        }
      } catch (error) {
        this.emit('error', {
          type: 'frameCapture',
          error
        });
      }
    };
    
    // Start frame capture
    captureFrame();
  }

  /**
   * Handles page close event
   */
  async handlePageClose() {
    await this.stop();
  }

  /**
   * Handles click events
   * @param {Object} event - Click event
   */
  async handleClick(event) {
    const actionData = {
      type: 'click',
      x: event.x,
      y: event.y,
      timestamp: this.getElapsedTime(),
      target: await this.getElementInfo(event.target)
    };
    console.log('Click captured:', event.x, event.y);
    this.emit('action', actionData);
  }

  /**
   * Handles input events
   * @param {Object} event - Input event
   */
  async handleInput(event) {
    const actionData = {
      type: 'input',
      value: event.value,
      timestamp: this.getElapsedTime(),
      target: await this.getElementInfo(event.target)
    };
    
    this.emit('action', actionData);
  }

  /**
   * Handles navigation events
   * @param {string} url - Navigation URL
   */
  async handleNavigation(url) {
    const actionData = {
      type: 'navigation',
      url,
      timestamp: this.getElapsedTime()
    };
    
    this.emit('action', actionData);
  }

  /**
   * Handles console messages
   * @param {Object} message - Console message
   */
  handleConsole(message) {
    const actionData = {
      type: 'console',
      messageType: message.type(),
      text: message.text(),
      timestamp: this.getElapsedTime()
    };
    
    this.emit('action', actionData);
  }

  /**
   * Handles network requests
   * @param {Object} request - Network request
   */
  handleRequest(request) {
    const actionData = {
      type: 'request',
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      timestamp: this.getElapsedTime()
    };
    
    this.emit('action', actionData);
  }

  /**
   * Handles network responses
   * @param {Object} response - Network response
   */
  handleResponse(response) {
    const actionData = {
      type: 'response',
      url: response.url(),
      status: response.status(),
      timestamp: this.getElapsedTime()
    };
    
    this.emit('action', actionData);
  }

  /**
   * Gets information about a DOM element
   * @param {Element} element - DOM element
   * @returns {Object} Element information
   */
  async getElementInfo(element) {
    if (!element) return null;
    
    return await this.page.evaluate((el) => {
      return {
        tagName: el.tagName?.toLowerCase(),
        id: el.id,
        className: el.className,
        textContent: el.textContent?.trim().slice(0, 50),
        name: el.name,
        type: el.type,
        value: el.tagName === 'INPUT' ? el.value : null,
        attributes: Array.from(el.attributes || []).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {})
      };
    }, element);
  }

  /**
   * Calculates elapsed time since collection started
   * @returns {number} Elapsed time in milliseconds
   */
  getElapsedTime() {
    return this.startTimestamp ? Date.now() - this.startTimestamp : 0;
  }
}

module.exports = EventStreamCollector;