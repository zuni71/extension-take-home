/**
 * ActionTrackingRecorder.js
 * Main module that integrates the collector, writer, and player
 */
const EventStreamCollector = require('./EventStreamCollector');
const EventStreamWriter = require('./EventStreamWriter');
const EventStreamPlayer = require('./EventStreamPlayer');
const path = require('path');

class ActionTrackingRecorder {
  /**
   * Creates a new instance of the action tracking recorder
   * @param {Object} page - The page to record
   * @param {Object} options - Configuration options
   */
  constructor(page, options = {}) {
    this.page = page;
    this.options = Object.assign({}, defaultRecorderOptions, options);
    this.isRecording = false;
    this.recordingResult = null;
    
    // Initialize components
    this.collector = new EventStreamCollector(page, this.options);
    this.writer = new EventStreamWriter(this.options);
    
    // Connect collector events to writer
    this.setupEventRouting();
  }

  /**
   * Sets up routing of events between components
   */
  setupEventRouting() {
    // Route action events from collector to writer
    console.log("Writing");
    this.collector.on('action', (action) => {
      this.writer.recordAction(action);
    });
    
    // Route frame events from collector to writer if video capture is enabled
    if (this.options.captureVideo) {
      this.collector.on('frame', (frameData) => {
        this.writer.recordFrame(frameData);
      });
    }
    
    // Handle collector errors
    this.collector.on('error', (error) => {
      console.error('Collector error:', error);
    });
    
    // Handle writer errors
    this.writer.on('error', (error) => {
      console.error('Writer error:', error);
    });
  }

  /**
   * Starts recording
   * @param {string} outputPath - Path for the recording output
   * @returns {Promise<Object>} Recording session info
   */
  async start(outputPath) {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }
    
    this.isRecording = true;
    
    // Ensure output path has the correct extension
    if (this.options.captureVideo && !outputPath.endsWith(this.options.videoFormat)) {
      outputPath = `${outputPath.replace(/\.[^/.]+$/, '')}.${this.options.videoFormat}`;
    }
    
    // Start writer first
    await this.writer.start(outputPath);
    
    // Then start collector
    this.collector.start();
    
    // Set up page close handler
    this.page.once('close', async () => {
      if (this.isRecording) {
        await this.stop();
      }
    });
    
    return {
      outputPath,
      actionLogPath: this.writer.actionLogPath,
      options: this.options
    };
  }

  /**
   * Stops recording
   * @returns {Promise<Object>} Recording result
   */
  async stop() {
    if (!this.isRecording) {
      console.log("Not Recording, nothing to stop");
      return this.recordingResult;
    }
    console.log("Stopping recording...");
    this.isRecording = false;
    
    // Stop collector first
    console.log("Stopping collector...");
    await this.collector.stop();
    
    // Then stop writer
    console.log("Stopping writer...");
    const result = await this.writer.stop();
    
    console.log("Writer stopped, result:", result);
    this.recordingResult = result;
    return result;
  }

  /**
   * Creates a player for a recording
   * @param {Object} recordingPaths - Paths to recording files
   * @param {Object} playerOptions - Player options
   * @returns {EventStreamPlayer} Player instance
   */
  static createPlayer(recordingPaths, playerOptions = {}) {
    const player = new EventStreamPlayer(playerOptions);
    
    // Load recording (but don't wait for it to complete)
    player.load(recordingPaths).catch(error => {
      console.error('Failed to load recording:', error);
    });
    
    return player;
  }

  /**
   * Gets the current action log
   * @returns {Array} The action log
   */
  getActionLog() {
    return this.writer.getActionLog();
  }
}

// Default recorder options
const defaultRecorderOptions = {
  captureVideo: false,
  fps: 25,
  videoFormat: 'mp4',
  videoCodec: 'h264',
  screenshotQuality: 80,
  saveActionLog: true,
  immediateActionWrites: false,
  includeConsoleMessages: true,
  includeNetworkRequests: false
};

module.exports = ActionTrackingRecorder;