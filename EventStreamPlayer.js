/**
 * EventStreamPlayer.js
 * Responsible for playing back recorded events and video
 */
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class EventStreamPlayer extends EventEmitter {
  /**
   * Creates a new instance of the event player
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    super();
    this.options = Object.assign({
      playbackSpeed: 1.0,
      autoPlay: false,
      loop: false,
      debugMode: false
    }, options);
    
    this.actionLog = [];
    this.videoPlayer = null;
    this.currentTimestamp = 0;
    this.startTime = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.actionIndex = 0;
    this.scheduledActions = [];
  }

  /**
   * Loads a recording from specified paths
   * @param {Object} paths - Object containing paths to recording files
   */
  async load(paths) {
    // Load action log
    try {
      const actionLogContent = await fs.readFile(paths.actionLogPath, 'utf8');
      this.actionLog = JSON.parse(actionLogContent);
      
      // Sort actions by timestamp
      this.actionLog.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      this.emit('error', {
        type: 'actionLogLoad',
        error
      });
      throw new Error(`Failed to load action log: ${error.message}`);
    }
    
    // Initialize video player if video path is provided
    if (paths.videoPath) {
      this.initializeVideoPlayer(paths.videoPath);
    }
    
    this.emit('loaded', {
      totalActions: this.actionLog.length,
      duration: this.getDuration()
    });
    
    // Auto-play if configured
    if (this.options.autoPlay) {
      this.play();
    }
  }

  /**
   * Initializes the video player
   * @param {string} videoPath - Path to video file
   */
  initializeVideoPlayer(videoPath) {
    // This would be an implementation to initialize a video player
    // Could use HTML5 video element or a similar approach
    this.videoPlayer = {
      // Placeholder for actual video player implementation
      play: () => {
        // Start playing the video
      },
      pause: () => {
        // Pause the video
      },
      seekTo: (timestamp) => {
        // Seek to a specific timestamp
      },
      getElement: () => {
        // Return the video element for UI display
        return null; // Placeholder
      }
    };
  }

  /**
   * Starts or resumes playback
   */
  play() {
    if (this.isPlaying && !this.isPaused) return;
    
    if (this.isPaused) {
      // Resume from pause
      this.isPaused = false;
      this.startTime = Date.now() - this.currentTimestamp / this.options.playbackSpeed;
    } else {
      // Start from beginning or from current position
      this.startTime = Date.now() - this.currentTimestamp / this.options.playbackSpeed;
      this.actionIndex = this.findActionIndex(this.currentTimestamp);
    }
    
    this.isPlaying = true;
    
    // Start video if available
    if (this.videoPlayer) {
      this.videoPlayer.play();
    }
    
    // Schedule actions playback
    this.scheduleNextActions();
    
    this.emit('play', {
      timestamp: this.currentTimestamp,
      actionIndex: this.actionIndex
    });
  }

  /**
   * Pauses playback
   */
  pause() {
    if (!this.isPlaying || this.isPaused) return;
    
    this.isPaused = true;
    this.currentTimestamp = this.calculateCurrentTimestamp();
    
    // Clear any scheduled actions
    this.clearScheduledActions();
    
    // Pause video if available
    if (this.videoPlayer) {
      this.videoPlayer.pause();
    }
    
    this.emit('pause', {
      timestamp: this.currentTimestamp,
      actionIndex: this.actionIndex
    });
  }

  /**
   * Stops playback
   */
  stop() {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    this.isPaused = false;
    this.currentTimestamp = 0;
    this.actionIndex = 0;
    
    // Clear any scheduled actions
    this.clearScheduledActions();
    
    // Pause video and seek to beginning if available
    if (this.videoPlayer) {
      this.videoPlayer.pause();
      this.videoPlayer.seekTo(0);
    }
    
    this.emit('stop');
  }

  /**
   * Seeks to a specific timestamp
   * @param {number} timestamp - Timestamp to seek to (in ms)
   */
  seekTo(timestamp) {
    // Ensure timestamp is within bounds
    const duration = this.getDuration();
    timestamp = Math.max(0, Math.min(timestamp, duration));
    
    const wasPlaying = this.isPlaying && !this.isPaused;
    
    // Pause playback if active
    if (wasPlaying) {
      this.pause();
    }
    
    // Update timestamp and find corresponding action index
    this.currentTimestamp = timestamp;
    this.actionIndex = this.findActionIndex(timestamp);
    
    // Update video position if available
    if (this.videoPlayer) {
      this.videoPlayer.seekTo(timestamp);
    }
    
    this.emit('seek', {
      timestamp: this.currentTimestamp,
      actionIndex: this.actionIndex
    });
    
    // Resume playback if it was playing before
    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Finds the index of the first action at or after the given timestamp
   * @param {number} timestamp - Timestamp to find action for
   * @returns {number} Index of the action
   */
  findActionIndex(timestamp) {
    // Find the first action at or after the given timestamp
    return this.actionLog.findIndex(action => action.timestamp >= timestamp);
  }

  /**
   * Schedules the next actions to be emitted based on timing
   */
  scheduleNextActions() {
    // Clear any existing scheduled actions
    this.clearScheduledActions();
    
    // If not playing or at the end, do nothing
    if (!this.isPlaying || this.isPaused || this.actionIndex >= this.actionLog.length) {
      if (this.actionIndex >= this.actionLog.length && this.options.loop) {
        // Loop back to beginning if configured
        this.currentTimestamp = 0;
        this.actionIndex = 0;
        this.startTime = Date.now();
        this.scheduleNextActions();
      }
      return;
    }
    
    // Calculate current playback position
    const currentTime = this.calculateCurrentTimestamp();
    
    // Schedule all upcoming actions
    for (let i = this.actionIndex; i < this.actionLog.length; i++) {
      const action = this.actionLog[i];
      const adjustedTime = action.timestamp / this.options.playbackSpeed;
      const delay = adjustedTime - currentTime;
      
      if (delay < 0) {
        // Action should have already happened, emit immediately
        if (this.options.debugMode) {
          this.emitAction(action);
        }
        this.actionIndex = i + 1;
      } else {
        // Schedule this action for future emission
        const timerId = setTimeout(() => {
          this.emitAction(action);
          this.actionIndex = i + 1;
          
          // If this was the last action, check for loop
          if (this.actionIndex >= this.actionLog.length) {
            if (this.options.loop) {
              this.currentTimestamp = 0;
              this.actionIndex = 0;
              this.startTime = Date.now();
              this.scheduleNextActions();
            } else {
              this.stop();
            }
          }
        }, delay);
        
        this.scheduledActions.push(timerId);
      }
    }
  }

  /**
   * Emits an action event
   * @param {Object} action - The action to emit
   */
  emitAction(action) {
    this.emit('action', action);
    
    // Also emit specific event type for easier listening
    this.emit(`action:${action.type}`, action);
  }

  /**
   * Clears all scheduled action timers
   */
  clearScheduledActions() {
    this.scheduledActions.forEach(timerId => clearTimeout(timerId));
    this.scheduledActions = [];
  }

  /**
   * Calculates the current timestamp based on playback time
   * @returns {number} Current timestamp in ms
   */
  calculateCurrentTimestamp() {
    if (!this.isPlaying) return this.currentTimestamp;
    if (this.isPaused) return this.currentTimestamp;
    
    return (Date.now() - this.startTime) * this.options.playbackSpeed;
  }

  /**
   * Gets the total duration of the recording
   * @returns {number} Duration in ms
   */
  getDuration() {
    if (this.actionLog.length === 0) return 0;
    return this.actionLog[this.actionLog.length - 1].timestamp;
  }

  /**
   * Changes the playback speed
   * @param {number} speed - New playback speed
   */
  setPlaybackSpeed(speed) {
    if (speed <= 0) return;
    
    const wasPlaying = this.isPlaying && !this.isPaused;
    
    // Pause playback temporarily
    if (wasPlaying) {
      this.pause();
    }
    
    this.options.playbackSpeed = speed;
    
    // Resume playback if it was playing
    if (wasPlaying) {
      this.play();
    }
    
    this.emit('speedChanged', {
      speed: this.options.playbackSpeed
    });
  }
  
  /**
   * Returns information about a specific action
   * @param {number} index - Index of the action
   * @returns {Object} Action data
   */
  getActionDetails(index) {
    if (index < 0 || index >= this.actionLog.length) return null;
    return this.actionLog[index];
  }
}

module.exports = EventStreamPlayer;