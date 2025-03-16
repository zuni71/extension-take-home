const path = require('path');
const EventStreamPlayer = require('./EventStreamPlayer');

// Specify the path to your action log file
const actionLogPath = path.join(__dirname, 'logs', 'chatgpt-session-2025-03-16T03-48-22-216Z_actions.json');
// Replace 'YOUR-TIMESTAMP' with the actual timestamp in your log filename

async function playbackActions() {
  console.log('Loading action log from:', actionLogPath);
  
  // Create a player with options
  const playerOptions = {
    playbackSpeed: 1.0, // Normal speed
    debugMode: true     // Show detailed logs
  };
  
  // Create and configure the player
  const player = new EventStreamPlayer(playerOptions);
  
  // Set up event listeners to see what's happening
  player.on('loaded', (info) => {
    console.log(`Recording loaded: ${info.totalActions} actions, ${info.duration}ms duration`);
  });
  
  player.on('action', (action) => {
    console.log(`[${action.timestamp}ms] Action: ${action.type}`);
    
    // Print detailed information based on action type
    switch (action.type) {
      case 'click':
        console.log(`  Click at (${action.x}, ${action.y})`);
        if (action.target) {
          console.log(`  Target: ${action.target.tagName}${action.target.id ? ' #' + action.target.id : ''}${action.target.className ? ' .' + action.target.className : ''}`);
        }
        break;
      case 'input':
        console.log(`  Input: ${action.value?.substring(0, 30)}${action.value?.length > 30 ? '...' : ''}`);
        break;
      case 'navigation':
        console.log(`  Navigated to: ${action.url}`);
        break;
      case 'console':
        console.log(`  Console ${action.messageType}: ${action.text}`);
        break;
    }
  });
  
  player.on('error', (error) => {
    console.error('Playback error:', error);
  });
  
  // Load the recording
  console.log('Starting playback...');
  await player.load({ actionLogPath });
  
  // Automatically play when loaded
  player.play();
  
  // Example of controlling playback
  setTimeout(() => {
    console.log('\nPlayback controls demonstration:');
    console.log('- Pausing in 5 seconds');
    console.log('- Will resume at 2x speed after 3 seconds');
    console.log('- Will seek to middle after another 5 seconds');
    console.log('- Will stop after another 5 seconds');
  }, 1000);
  
  setTimeout(() => {
    console.log('\nPausing playback...');
    player.pause();
  }, 5000);
  
  setTimeout(() => {
    console.log('\nResuming at 2x speed...');
    player.setPlaybackSpeed(2.0);
    player.play();
  }, 8000);
  
  setTimeout(() => {
    console.log('\nSeeking to middle...');
    const duration = player.getDuration();
    player.seekTo(duration / 2);
  }, 13000);
  
  setTimeout(() => {
    console.log('\nStopping playback...');
    player.stop();
    
    console.log('\nPlayback complete. Here are some stats:');
    console.log('- Total actions:', player.actionLog.length);
    console.log('- Duration:', player.getDuration(), 'ms');
    
    // Group actions by type and count them
    const actionCounts = player.actionLog.reduce((counts, action) => {
      counts[action.type] = (counts[action.type] || 0) + 1;
      return counts;
    }, {});
    
    console.log('- Action breakdown:', actionCounts);
  }, 18000);
}

// Run the playback
playbackActions().catch(console.error);