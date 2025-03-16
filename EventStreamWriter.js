/**
 * EventStreamWriter.js
 * Responsible for writing collected events and frames to storage
 */
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class EventStreamWriter extends EventEmitter {
  /**
   * Creates a new instance of the event writer
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    super();
    this.options = options;
    this.actionLog = [];
    this.videoWriter = null;
    this.outputPath = null;
    this.actionLogPath = null;
    this.isWriting = true;
  }

  /**
   * Starts the writer process with specified output path
   * @param {string} basePath - Base path for output files
   */
  async start(basePath) {
    if (this.isWriting) return;
    
    this.isWriting = true;
    
    // Set up paths
    this.outputPath = basePath;
    this.actionLogPath = this.options.actionLogPath || 
                        path.join(path.dirname(basePath), 
                                 `${path.basename(basePath, path.extname(basePath))}_actions.json`);
    
    // Create directories if needed
    await this.ensureDirectoryExist(path.dirname(this.outputPath));
    await this.ensureDirectoryExist(path.dirname(this.actionLogPath));
    
    // Initialize video writer if needed
    if (this.options.captureVideo) {
      await this.initializeVideoWriter();
    }
    
    this.emit('writerStarted', {
      outputPath: this.outputPath,
      actionLogPath: this.actionLogPath
    });
  }

  /**
   * Initializes the video writer based on options
   */
  async initializeVideoWriter() {
    // This would be an implementation to initialize a video writer
    // Could use ffmpeg or a similar library to handle video writing
    this.videoWriter = {
      // Placeholder for actual video writer implementation
      write: async (frameData) => {
        // Write frame to video file
        this.emit('frameWritten', {
          timestamp: frameData.timestamp
        });
      },
      close: async () => {
        // Close video file
        this.emit('videoWriterClosed');
      }
    };
  }

  /**
   * Records an action to the log
   * @param {Object} action - Action data to record
   */
  async recordAction(action) {
    if (!this.isWriting) return;
  
    // Add to in-memory log
    this.actionLog.push(action);
    
    // Write to file if configured for immediate writes
    if (this.options.immediateActionWrites) {
      await this.appendToActionLog(action);
    }
    
    this.emit('actionRecorded', {
      action,
      totalActions: this.actionLog.length
    });
    
  }

  /**
   * Records a video frame
   * @param {Object} frameData - Frame data to record
   */
  async recordFrame(frameData) {
    if (!this.isWriting || !this.videoWriter) return;
    
    try {
      await this.videoWriter.write(frameData);
    } catch (error) {
      this.emit('error', {
        type: 'frameWrite',
        error
      });
    }
  }

  /**
   * Stops the writer and finalizes all files
   */
  async stop() {
    if (!this.isWriting) return;
    
    // Save final action log
    await this.saveActionLog();
    
    // Close video writer if active
    if (this.videoWriter) {
      await this.videoWriter.close();
    }
    
    this.isWriting = false;
    
    this.emit('writerStopped', {
      outputPath: this.outputPath,
      actionLogPath: this.actionLogPath,
      totalActions: this.actionLog.length
    });
    
    return {
      videoPath: this.outputPath,
      actionLogPath: this.actionLogPath,
      actionLog: this.actionLog
    };
  }

  /**
   * Appends a single action to the log file
   * @param {Object} action - Action to append
   */
  async appendToActionLog(action) {
    try {
      // Read existing log or create new
      let existingLog = [];
      
      try {
        const fileContent = await fs.readFile(this.actionLogPath, 'utf8');
        existingLog = JSON.parse(fileContent);
      } catch (error) {
        // File doesn't exist or can't be read, use empty array
      }
      
      // Append new action and write back to file
      existingLog.push(action);
      await fs.writeFile(this.actionLogPath, JSON.stringify(existingLog, null, 2));
    } catch (error) {
      this.emit('error', {
        type: 'actionWrite',
        error
      });
    }
  }

  /**
   * Saves the complete action log to file
   */
  async saveActionLog() {
    console.log("saveActionLog called with", this.actionLog.length, "actions");
    try {
      await fs.writeFile(this.actionLogPath, JSON.stringify(this.actionLog, null, 2));
    } catch (error) {
        console.error("Error saving action log:", error);
      this.emit('error', {
        type: 'actionLogSave',
        error
      });
    }
    console.log('Saving action log with', this.actionLog.length, 'actions');
  }

  /**
   * Ensures a directory exists, creating it if necessary
   * @param {string} dirPath - Path to ensure exists
   */
  async ensureDirectoryExist(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return dirPath;
    } catch (error) {
      if (error.code !== 'EEXIST') {
        this.emit('error', {
          type: 'directoryCreate',
          error
        });
        throw error;
      }
    }
  }

  /**
   * Returns the current action log
   * @returns {Array} The action log
   */
  getActionLog() {
    return this.actionLog;
  }
}

module.exports = EventStreamWriter;