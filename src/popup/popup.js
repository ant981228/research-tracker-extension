document.addEventListener('DOMContentLoaded', init);

// UI Elements
let startBtn;
let pauseBtn;
let stopBtn;
let recordingStatus;
let sessionNameInput;
let sessionNameInputContainer;
let currentSessionName;
let sessionStartTime;
let eventCount;
let currentSessionSection;
let currentPageEl;
let recentPagesEl;
let recentSearchesEl;
let noteTargetEl;
let noteInput;
let addNoteBtn;
let sessionsList;
let noSessionsMsg;

// Current session state
let selectedPageUrl = null;
let addNoteInProgress = false;

// State
let isRecording = false;
let isPaused = false;
let currentSession = null;
let currentUrl = null;

function init() {
  // Initialize UI elements
  startBtn = document.getElementById('start-btn');
  pauseBtn = document.getElementById('pause-btn');
  stopBtn = document.getElementById('stop-btn');
  recordingStatus = document.getElementById('recording-status');
  sessionNameInput = document.getElementById('session-name');
  sessionNameInputContainer = document.getElementById('session-name-input');
  currentSessionName = document.getElementById('current-session-name');
  sessionStartTime = document.getElementById('session-start-time');
  eventCount = document.getElementById('event-count');
  currentSessionSection = document.getElementById('current-session');
  currentPageEl = document.getElementById('current-page');
  recentPagesEl = document.getElementById('recent-pages');
  recentSearchesEl = document.getElementById('recent-searches');
  noteTargetEl = document.getElementById('note-target');
  noteInput = document.getElementById('note-input');
  addNoteBtn = document.getElementById('add-note-btn');
  sessionsList = document.getElementById('sessions-list');
  noSessionsMsg = document.getElementById('no-sessions-msg');
  
  // Add event listeners
  startBtn.addEventListener('click', startRecording);
  pauseBtn.addEventListener('click', togglePauseRecording);
  stopBtn.addEventListener('click', stopRecording);
  addNoteBtn.addEventListener('click', addNote);
  
  // Get current status
  refreshStatus();
  
  // Get current URL for adding notes
  getCurrentTabUrl();
  
  // Load previous sessions
  loadSessionsAndDisplay();
}

function refreshStatus(resetSelection = false) {
  if (resetSelection) {
    // Clear the selected URL when requested (e.g., after adding a note)
    selectedPageUrl = null;
  }

  chrome.runtime.sendMessage({ action: 'getStatus' }, response => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    
    updateUI(response);
  });
}

function updateUI(status) {
  isRecording = status.isRecording;
  currentSession = status.currentSession;
  
  if (isRecording && currentSession) {
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
    
    // Hide session name input when recording
    sessionNameInputContainer.style.display = 'none';
    
    isPaused = currentSession.isPaused;
    
    if (isPaused) {
      recordingStatus.textContent = 'Paused';
      recordingStatus.className = 'recording-paused';
      pauseBtn.textContent = 'Resume';
    } else {
      recordingStatus.textContent = 'Recording';
      recordingStatus.className = 'recording-active';
      pauseBtn.textContent = 'Pause';
    }
    
    // Format date
    const startDate = new Date(currentSession.startTime);
    sessionStartTime.textContent = startDate.toLocaleString();
    eventCount.textContent = currentSession.events;
    
    // Display session name
    currentSessionName.textContent = currentSession.name;
    
    // Update current page and history
    updatePageDisplay(currentUrl);
    updateRecent(currentSession.recentPages, currentSession.recentSearches);
    
    // Show current session section
    currentSessionSection.classList.remove('hidden');
  } else {
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    
    // Show session name input when not recording
    sessionNameInputContainer.style.display = 'block';
    
    recordingStatus.textContent = 'Not Recording';
    recordingStatus.className = 'recording-stopped';
    
    // Reset URL selection
    selectedPageUrl = null;
    
    // Hide current session section
    currentSessionSection.classList.add('hidden');
  }
}

function updatePageDisplay(url) {
  if (!url) {
    currentPageEl.innerHTML = '<div class="page-title">No page currently active</div>';
    return;
  }
  
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs && tabs.length > 0) {
      const tab = tabs[0];
      
      // Don't automatically select this URL anymore - wait for user action
      // We'll use currentUrl for auto-selecting during initial load only
      if (!selectedPageUrl) {
        selectUrl(tab.url, tab.title || 'Untitled');
      }
      
      // Display current page
      currentPageEl.innerHTML = `
        <div class="page-title">${tab.title || 'Untitled'}</div>
        <div class="page-url">${truncateUrl(tab.url)}</div>
        <div class="page-time">Current page</div>
        <button class="page-action-btn add-note-btn">Add Note</button>
      `;
      
      // Set up button handler
      currentPageEl.querySelector('.add-note-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        selectUrl(tab.url, tab.title || 'Untitled');
        document.querySelectorAll('.page-item.selected').forEach(el => {
          el.classList.remove('selected');
        });
        currentPageEl.classList.add('selected');
        
        // Focus the note textarea
        noteInput.focus();
      });
    }
  });
}

function updateRecent(recentPages, recentSearches) {
  // Clear existing elements
  recentPagesEl.innerHTML = '';
  recentSearchesEl.innerHTML = '';
  
  if (!recentPages || recentPages.length === 0) {
    recentPagesEl.innerHTML = '<div class="page-item">No pages visited yet</div>';
  } else {
    // Add recent pages (skipping the current page)
    recentPages.forEach(page => {
      if (page.url === currentUrl) return; // Skip current page
      
      const pageEl = document.createElement('div');
      pageEl.className = 'page-item';
      pageEl.innerHTML = `
        <div class="page-title">${page.title || 'Untitled'}</div>
        <div class="page-url">${truncateUrl(page.url)}</div>
        <div class="page-time">${formatTimeDifference(page.timestamp)}</div>
        <button class="page-action-btn add-note-btn">Add Note</button>
      `;
      
      // Add button click handler
      pageEl.querySelector('.add-note-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        selectUrl(page.url, page.title || 'Untitled');
        
        // Mark this item as selected and remove selection from others
        document.querySelectorAll('.page-item.selected').forEach(el => {
          el.classList.remove('selected');
        });
        pageEl.classList.add('selected');
        
        // Focus the note textarea
        noteInput.focus();
      });
      
      recentPagesEl.appendChild(pageEl);
    });
  }
  
  if (!recentSearches || recentSearches.length === 0) {
    recentSearchesEl.innerHTML = '<div class="page-item">No searches yet</div>';
  } else {
    // Add recent searches
    recentSearches.forEach(search => {
      const searchEl = document.createElement('div');
      searchEl.className = 'page-item';
      
      searchEl.innerHTML = `
        <div class="search-query">"${search.query}"</div>
        <div>
          <span class="search-engine">${search.engine}</span>
          <span class="page-time">${formatTimeDifference(search.timestamp)}</span>
        </div>
        <button class="page-action-btn add-note-btn">Add Note</button>
      `;
      
      // Add button click handler
      searchEl.querySelector('.add-note-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        selectUrl(search.url, `Search: "${search.query}"`);
        
        // Mark this item as selected and remove selection from others
        document.querySelectorAll('.page-item.selected').forEach(el => {
          el.classList.remove('selected');
        });
        searchEl.classList.add('selected');
        
        // Focus the note textarea
        noteInput.focus();
      });
      
      recentSearchesEl.appendChild(searchEl);
    });
  }
}

// Helper to select a URL for adding notes
function selectUrl(url, title) {
  selectedPageUrl = url;
  noteTargetEl.textContent = title || 'Selected Page';
}

function startRecording() {
  const sessionName = sessionNameInput.value.trim();
  
  chrome.runtime.sendMessage({ 
    action: 'startRecording',
    sessionName: sessionName
  }, response => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    
    refreshStatus();
  });
}

function togglePauseRecording() {
  const action = isPaused ? 'resumeRecording' : 'pauseRecording';
  
  chrome.runtime.sendMessage({ action }, response => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    
    refreshStatus();
  });
}

function stopRecording() {
  // Disable buttons to prevent multiple clicks
  stopBtn.disabled = true;
  stopBtn.textContent = 'Stopping...';
  
  chrome.runtime.sendMessage({ action: 'stopRecording' }, response => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      stopBtn.disabled = false;
      stopBtn.textContent = 'Stop';
      return;
    }
    
    // If the session was successfully saved, update the UI
    if (response && response.success) {
      console.log('Session successfully stopped and saved');
      
      // First update the UI state
      refreshStatus();
      
      // Then ensure the sessions list is refreshed
      loadSessionsAndDisplay();
    } else {
      console.error('Failed to stop session:', response);
      stopBtn.disabled = false;
      stopBtn.textContent = 'Stop';
    }
  });
}

// Enhanced function to ensure sessions list is loaded and displayed
function loadSessionsAndDisplay() {
  // Show loading state
  sessionsList.innerHTML = '<div class="loading">Loading sessions...</div>';
  
  chrome.runtime.sendMessage({ action: 'getSessions' }, response => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      sessionsList.innerHTML = '<div class="error">Error loading sessions</div>';
      return;
    }
    
    if (response && response.success) {
      console.log(`Loaded ${response.sessions.length} sessions`);
      displaySessions(response.sessions);
    } else {
      console.error('Failed to load sessions:', response);
      sessionsList.innerHTML = '<div class="error">Error loading sessions</div>';
    }
  });
}

function getCurrentTabUrl() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs && tabs.length > 0) {
      currentUrl = tabs[0].url;
    }
  });
}

function addNote() {
  // Prevent duplicate submissions
  if (addNoteInProgress) {
    return;
  }
  
  const note = noteInput.value.trim();
  
  // Use selectedPageUrl if available, fallback to currentUrl
  const targetUrl = selectedPageUrl || currentUrl;
  
  if (!note || !targetUrl) {
    alert('Please enter a note and select a page.');
    return;
  }
  
  // Set flag to prevent multiple submissions
  addNoteInProgress = true;
  addNoteBtn.disabled = true;
  addNoteBtn.textContent = 'Adding...';
  
  chrome.runtime.sendMessage({ 
    action: 'addNote',
    url: targetUrl,
    note: note
  }, response => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      addNoteInProgress = false;
      addNoteBtn.disabled = false;
      addNoteBtn.textContent = 'Add Note';
      return;
    }
    
    if (response.success) {
      noteInput.value = '';
      // Reset selection after adding note to prevent duplicate notes
      refreshStatus(true);
      
      // Reset UI selection state
      document.querySelectorAll('.page-item.selected').forEach(el => {
        el.classList.remove('selected');
      });
      
      // Update note target label back to default
      noteTargetEl.textContent = 'Current Page';
      
      // Re-enable the button after a short delay
      setTimeout(() => {
        addNoteInProgress = false;
        addNoteBtn.disabled = false;
        addNoteBtn.textContent = 'Add Note';
      }, 1000); // 1 second delay for UI feedback
      
    } else {
      // Check if this is a rate limit error
      if (response.rateLimited) {
        // Calculate wait time in seconds (rounded up)
        const waitTime = Math.ceil(response.waitTimeMs / 1000);
        addNoteBtn.textContent = `Wait ${waitTime}s...`;
        
        // Enable after the wait time
        setTimeout(() => {
          addNoteInProgress = false;
          addNoteBtn.disabled = false;
          addNoteBtn.textContent = 'Add Note';
        }, response.waitTimeMs);
      } else {
        // Other error
        alert('Error adding note: ' + (response.error || 'Unknown error'));
        addNoteInProgress = false;
        addNoteBtn.disabled = false;
        addNoteBtn.textContent = 'Add Note';
      }
    }
  });
}

function loadSessions() {
  chrome.runtime.sendMessage({ action: 'getSessions' }, response => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    
    if (response.success) {
      displaySessions(response.sessions);
    }
  });
}

function displaySessions(sessions) {
  // Clear previous sessions
  sessionsList.innerHTML = '';
  
  if (!sessions || sessions.length === 0) {
    sessionsList.appendChild(noSessionsMsg);
    return;
  }
  
  // Sort sessions by start time (newest first)
  sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  
  sessions.forEach(session => {
    const sessionItem = document.createElement('div');
    sessionItem.className = 'session-item';
    sessionItem.dataset.sessionId = session.id;
    
    const startDate = new Date(session.startTime);
    const endDate = session.endTime ? new Date(session.endTime) : null;
    
    const sessionHeader = document.createElement('div');
    sessionHeader.className = 'session-header';
    
    const sessionTitle = document.createElement('div');
    sessionTitle.className = 'session-title';
    sessionTitle.textContent = session.name || `Session: ${formatDate(startDate)}`;
    sessionTitle.title = 'Click to rename';
    sessionTitle.addEventListener('click', function() {
      const currentName = this.textContent;
      const newName = prompt('Enter a new name for this session:', currentName);
      
      if (newName && newName.trim() !== '' && newName !== currentName) {
        chrome.runtime.sendMessage({ 
          action: 'renameSession',
          sessionId: session.id,
          newName: newName.trim()
        }, response => {
          if (response.success) {
            this.textContent = newName.trim();
            loadSessions(); // Refresh the list to ensure everything is updated
          }
        });
      }
    });
    
    sessionHeader.appendChild(sessionTitle);
    
    const sessionDetails = document.createElement('div');
    sessionDetails.className = 'session-details';
    
    const duration = endDate 
      ? `Duration: ${formatDuration(startDate, endDate)}`
      : 'Not completed';
    
    sessionDetails.textContent = `${formatDate(startDate)} | ${duration} | ${session.searches} searches | ${session.pageVisits} pages`;
    
    const sessionActions = document.createElement('div');
    sessionActions.className = 'session-actions';
    
    const exportJsonBtn = document.createElement('button');
    exportJsonBtn.className = 'export-btn';
    exportJsonBtn.textContent = 'Export JSON';
    exportJsonBtn.addEventListener('click', () => exportSession(session.id, 'json'));
    
    const exportTxtBtn = document.createElement('button');
    exportTxtBtn.className = 'export-btn';
    exportTxtBtn.textContent = 'Export TXT';
    exportTxtBtn.addEventListener('click', () => exportSession(session.id, 'txt'));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete this session?\n\n"${session.name || 'Unnamed session'}"\n\nThis action cannot be undone.`)) {
        deleteSession(session.id);
      }
    });
    
    sessionActions.appendChild(exportJsonBtn);
    sessionActions.appendChild(exportTxtBtn);
    sessionActions.appendChild(deleteBtn);
    
    sessionItem.appendChild(sessionHeader);
    sessionItem.appendChild(sessionDetails);
    sessionItem.appendChild(sessionActions);
    
    sessionsList.appendChild(sessionItem);
  });
}

function exportSession(sessionId, format) {
  chrome.runtime.sendMessage({ 
    action: 'exportSession',
    sessionId,
    format
  }, response => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    
    if (response.success) {
      downloadData(response.data, `research-session-${sessionId}.${format}`);
    }
  });
}

function deleteSession(sessionId) {
  chrome.runtime.sendMessage({ 
    action: 'deleteSession',
    sessionId
  }, response => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    
    if (response.success) {
      loadSessions(); // Refresh the sessions list
    } else {
      alert('Error deleting session: ' + (response.error || 'Unknown error'));
    }
  });
}

function downloadData(data, filename) {
  // Extract format from filename
  const format = filename.split('.').pop();
  const mimeType = format === 'json' ? 'application/json' : 'text/plain';
  
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper functions
function formatDate(date) {
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(start, end) {
  const diff = Math.floor((end - start) / 1000); // seconds
  
  if (diff < 60) {
    return `${diff}s`;
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes}m`;
  } else {
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

function formatTimeDifference(isoTime) {
  const timestamp = new Date(isoTime);
  const now = new Date();
  const diffMs = now - timestamp;
  
  // Convert to seconds
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) {
    return 'Just now';
  } else if (diffSec < 3600) {
    const minutes = Math.floor(diffSec / 60);
    return `${minutes} min ago`;
  } else if (diffSec < 86400) { // 24 hours
    const hours = Math.floor(diffSec / 3600);
    return `${hours} hr ago`;
  } else {
    const days = Math.floor(diffSec / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

function truncateUrl(url) {
  try {
    const urlObj = new URL(url);
    let path = urlObj.pathname;
    
    // Truncate path if too long
    if (path.length > 30) {
      path = path.substring(0, 27) + '...';
    }
    
    return urlObj.hostname + path;
  } catch (e) {
    // If URL parsing fails, just truncate the string
    return url.length > 40 ? url.substring(0, 37) + '...' : url;
  }
}