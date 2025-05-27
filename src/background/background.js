// Storage keys
const STORAGE_KEYS = {
  IS_RECORDING: 'isRecording',
  CURRENT_SESSION: 'currentSession',
  SESSIONS: 'sessions',
  LAST_SAVE_TIMESTAMP: 'lastSaveTimestamp',
  LAST_ACTIVITY_TIMESTAMP: 'lastActivityTimestamp',
  POPUP_WINDOW_ID: 'popupWindowId'
};

// Alarm names
const ALARM_NAMES = {
  KEEP_ALIVE: 'keepAliveAlarm',
  AUTOSAVE: 'autosaveAlarm',
  ACTIVITY_CHECK: 'activityCheckAlarm'
};

// State management
let isRecording = false;
let currentSession = null;
let autosaveInterval = null;
let activityMonitorInterval = null;

// Temporary metadata storage for when not recording
let tempMetadata = {};

// Rate limiting for adding notes
let lastNoteTimestamp = 0;
const NOTE_RATE_LIMIT_MS = 3000; // 3 seconds
const AUTOSAVE_INTERVAL_MS = 30000; // 30 seconds
const KEEP_ALIVE_INTERVAL_MS = 25000; // 25 seconds (slightly less than autosave)
const ACTIVITY_CHECK_INTERVAL_MS = 60000; // 1 minute
const INACTIVITY_WARNING_THRESHOLD_MS = 5 * 60000; // 5 minutes

// Search engine patterns
const SEARCH_ENGINES = {
  GOOGLE: {
    domains: ['google.com', 'www.google.com'],
    queryParam: 'q'
  },
  GOOGLE_SCHOLAR: {
    domains: ['scholar.google.com'],
    queryParam: 'q'
  },
  BING: {
    domains: ['bing.com', 'www.bing.com'],
    queryParam: 'q'
  },
  DUCKDUCKGO: {
    domains: ['duckduckgo.com'],
    queryParam: 'q'
  },
  GOOGLE_NEWS: {
    domains: ['news.google.com'],
    queryParam: 'q'
  }
};

// Initialize on extension startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get([STORAGE_KEYS.IS_RECORDING], (result) => {
    if (result[STORAGE_KEYS.IS_RECORDING] === undefined) {
      chrome.storage.local.set({ [STORAGE_KEYS.IS_RECORDING]: false });
    }
    
    isRecording = !!result[STORAGE_KEYS.IS_RECORDING];
  });
  
  chrome.storage.local.get([STORAGE_KEYS.SESSIONS], (result) => {
    if (result[STORAGE_KEYS.SESSIONS] === undefined) {
      chrome.storage.local.set({ [STORAGE_KEYS.SESSIONS]: [] });
    }
  });
  
  // Initialize the activity timestamp
  updateActivityTimestamp();
});

// Set up alarm listener - these don't create any visible notifications to users
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAMES.KEEP_ALIVE) {
    // This alarm just keeps the service worker alive, no action needed
    updateActivityTimestamp();
  } else if (alarm.name === ALARM_NAMES.AUTOSAVE) {
    if (isRecording && currentSession) {
      saveCurrentSession();
    } else {
      // If we're not recording anymore, clear the alarm
      chrome.alarms.clear(ALARM_NAMES.AUTOSAVE);
      chrome.alarms.clear(ALARM_NAMES.KEEP_ALIVE);
    }
  } else if (alarm.name === ALARM_NAMES.ACTIVITY_CHECK) {
    checkActivity();
    // Continue the alarm as long as we're recording
    if (!isRecording) {
      chrome.alarms.clear(ALARM_NAMES.ACTIVITY_CHECK);
    }
  }
});

// Check for interrupted sessions on browser startup
chrome.runtime.onStartup.addListener(() => {
  recoverInterruptedSession();
  updateActivityTimestamp();
  updateBadge();
});

// Set the badge color to red
chrome.action.setBadgeBackgroundColor({ color: '#DB4437' }); // Google Red

// Also check when the extension itself starts (handles extension updates/reloads)
(function initializeExtension() {
  recoverInterruptedSession();
  updateActivityTimestamp();
  updateBadge();
})();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'startRecording':
      startRecording(message.sessionName);
      sendResponse({ success: true, isRecording });
      break;
    
    case 'stopRecording':
      stopRecording().then(session => {
        sendResponse({ success: true, isRecording, savedSession: session ? true : false });
      });
      return true; // Indicate that we'll respond asynchronously
      break;
    
    case 'pauseRecording':
      pauseRecording();
      sendResponse({ success: true, isRecording });
      break;
    
    case 'resumeRecording':
      resumeRecording();
      sendResponse({ success: true, isRecording });
      break;
    
    case 'forceAutosave':
      if (isRecording && currentSession) {
        saveCurrentSession();
      }
      // No response needed
      break;
      
    case 'checkActivity':
      // Update the activity timestamp when popup is opened or other events
      updateActivityTimestamp();
      checkActivity();
      sendResponse({ success: true });
      break;
      
    case 'updatePageMetadata':
      console.log('Received updatePageMetadata message:', message);
      try {
        if (message.url && message.metadata) {
          if (isRecording && currentSession) {
            // Update in the session
            const result = updatePageVisitMetadata(message.url, message.metadata);
            console.log('Metadata update complete, result:', result);
            sendResponse({ success: true });
          } else {
            // Store temporarily when not recording
            tempMetadata[message.url] = {
              ...tempMetadata[message.url],
              ...message.metadata,
              lastUpdated: new Date().toISOString()
            };
            console.log('Metadata stored temporarily for:', message.url);
            sendResponse({ success: true });
          }
        } else {
          console.warn('Cannot update metadata: missing URL or metadata');
          sendResponse({ success: false, error: 'Missing URL or metadata' });
        }
      } catch (e) {
        console.error('Error updating metadata:', e);
        sendResponse({ success: false, error: 'Exception: ' + e.message });
      }
      return true; // Keep the message channel open for async response
      break;
      
    case 'getPageMetadata':
      try {
        if (message.url) {
          let metadata = {};
          if (isRecording && currentSession) {
            // Get from session
            metadata = getPageMetadataForUrl(message.url);
          } else {
            // Get from temporary storage
            metadata = tempMetadata[message.url] || {};
          }
          sendResponse({ success: true, metadata });
        } else {
          sendResponse({ success: false, error: 'Missing URL', metadata: {} });
        }
      } catch (e) {
        console.error('Error in getPageMetadata:', e);
        sendResponse({ success: false, error: e.message, metadata: {} });
      }
      return true; // Keep the message channel open for async response
      break;
    
    case 'getStatus':
      if (currentSession) {
        // Get recent pages and searches for the UI
        const recentPages = currentSession.pageVisits.slice(-5).reverse();
        const recentSearches = currentSession.searches.slice(-5).reverse();
        
        sendResponse({ 
          isRecording,
          currentSession: {
            id: currentSession.id,
            name: currentSession.name,
            startTime: currentSession.startTime,
            isPaused: currentSession.isPaused,
            events: currentSession.events.length,
            recentPages,
            recentSearches
          }
        });
      } else {
        sendResponse({ 
          isRecording,
          currentSession: null
        });
      }
      break;
      
    case 'renameCurrentSession':
      if (isRecording && currentSession && message.newName) {
        currentSession.name = message.newName;
        // Update the current session in storage
        chrome.storage.local.set({ 
          [STORAGE_KEYS.CURRENT_SESSION]: currentSession,
          [STORAGE_KEYS.LAST_SAVE_TIMESTAMP]: Date.now()
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error saving renamed session:', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ success: true });
          }
        });
        return true; // Indicates async response
      } else {
        sendResponse({ success: false, error: 'Not recording or missing new name' });
      }
      break;
      
    case 'renameSession':
      if (message.sessionId && message.newName) {
        renameSession(message.sessionId, message.newName)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error }));
        return true; // Indicates async response
      } else {
        sendResponse({ success: false, error: 'Missing session ID or new name' });
      }
      break;
      
    case 'resumeSession':
      if (message.sessionId) {
        resumeSession(message.sessionId)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error }));
        return true; // Indicates async response
      } else {
        sendResponse({ success: false, error: 'No session ID provided' });
      }
      break;
    
    case 'deleteSession':
      if (message.sessionId) {
        deleteSession(message.sessionId)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error }));
        return true; // Indicates async response
      } else {
        sendResponse({ success: false, error: 'No session ID provided' });
      }
      break;
    
    case 'addNote':
      if (isRecording && currentSession && message.url && message.note) {
        // Check rate limiting
        const now = Date.now();
        if (now - lastNoteTimestamp < NOTE_RATE_LIMIT_MS) {
          sendResponse({ 
            success: false, 
            error: 'Please wait a moment before adding another note',
            rateLimited: true,
            waitTimeMs: NOTE_RATE_LIMIT_MS - (now - lastNoteTimestamp)
          });
        } else {
          // Update the timestamp and add the note
          lastNoteTimestamp = now;
          addNote(message.url, message.note);
          sendResponse({ success: true });
        }
      } else {
        sendResponse({ success: false, error: 'Not recording or missing data' });
      }
      break;
    
    case 'exportSession':
      if (message.sessionId) {
        exportSession(message.sessionId, message.format || 'json')
          .then(data => sendResponse({ success: true, data }))
          .catch(error => sendResponse({ success: false, error }));
        return true; // Indicates async response
      } else {
        sendResponse({ success: false, error: 'No session ID provided' });
      }
      break;
    
    case 'getSessions':
      getSessions().then(sessions => {
        sendResponse({ success: true, sessions });
      });
      return true; // Indicates async response
      
    case 'getWindowInfo':
      chrome.storage.local.get([STORAGE_KEYS.POPUP_WINDOW_ID], (result) => {
        const popupWindowId = result[STORAGE_KEYS.POPUP_WINDOW_ID];
        
        console.log('getWindowInfo: stored popup window ID:', popupWindowId);
        
        // Check if this window is our popup window
        chrome.windows.getCurrent((currentWindow) => {
          if (chrome.runtime.lastError) {
            console.error('Error getting current window:', chrome.runtime.lastError);
            sendResponse({ isPopout: false });
            return;
          }
          
          console.log('Current window ID:', currentWindow.id, 'Popup window ID:', popupWindowId);
          const isPopout = popupWindowId && currentWindow.id === popupWindowId;
          console.log('Window is popout:', isPopout);
          
          sendResponse({ isPopout });
        });
      });
      return true; // Indicates async response
      
    case 'createPopout':
      console.log('Received createPopout message from popup:', message);
      
      try {
        createPopoutWindow(message.width || 400, message.height || 600)
          .then((window) => {
            console.log('createPopoutWindow Promise resolved with window:', window);
            sendResponse({ success: true, windowId: window.id });
          })
          .catch(error => {
            console.error('Error creating popout window (caught in promise):', error);
            sendResponse({ 
              success: false, 
              error: error.message || 'Unknown error',
              stack: error.stack
            });
          });
      } catch(error) {
        console.error('Error starting createPopoutWindow (caught in try/catch):', error);
        sendResponse({ 
          success: false, 
          error: 'Exception before promise: ' + (error.message || 'Unknown error'),
          stack: error.stack
        });
      }
      
      console.log('createPopout message handler returning true for async response');
      return true; // Indicates async response
      
    case 'closePopout':
      console.log('Received closePopout message');
      
      try {
        closePopoutWindow()
          .then(() => {
            console.log('Successfully closed popout window');
            sendResponse({ success: true });
          })
          .catch(error => {
            console.error('Error closing popout window (caught in promise):', error);
            sendResponse({ 
              success: false, 
              error: error.message || 'Unknown error',
              stack: error.stack
            });
          });
      } catch(error) {
        console.error('Error in closePopout (caught in try/catch):', error);
        sendResponse({ 
          success: false, 
          error: 'Exception before promise: ' + (error.message || 'Unknown error'),
          stack: error.stack
        });
      }
      
      console.log('closePopout message handler returning true for async response');
      return true; // Indicates async response
      
    case 'copyCitationForCurrentPage':
      console.log('Received copyCitationForCurrentPage message');
      // Get the current active tab
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs.length === 0) {
          sendResponse({ success: false, error: 'No active tab found' });
          return;
        }
        
        const currentTab = tabs[0];
        const url = currentTab.url;
        
        // Get metadata for the current page
        let metadata = {};
        if (isRecording && currentSession) {
          metadata = getPageMetadataForUrl(url);
        } else {
          metadata = tempMetadata[url] || {};
        }
        
        // Get citation settings from storage
        chrome.storage.local.get(['citationSettings'], async (result) => {
          const settings = result.citationSettings || { format: 'apa', customTemplate: '' };
          
          try {
            // Inject a script to generate and copy the citation
            const result = await chrome.scripting.executeScript({
              target: { tabId: currentTab.id },
              func: (metadata, url, title, settings) => {
                // This function runs in the content script context
                // We need to recreate the citation generation logic here
                const citationFormats = {
                  apa: '{author} ({year}). {title}. {publisher}. {url ? "Retrieved {accessDate} from {url}" : ""}',
                  mla: '{author}. "{title}." {publisher}, {day} {month} {year}, {url}.',
                  chicago: '{author}. "{title}." {publisher}, {month} {day}, {year}. {url}.',
                  harvard: '{author} {year}, {title}, {publisher}, viewed {accessDate}, <{url}>.',
                  ieee: '{author}, "{title}," {publisher}, {year}. [Online]. Available: {url}. [Accessed: {accessDate}].'
                };
                
                // Helper functions (simplified versions)
                const formatDateParts = (dateStr) => {
                  if (!dateStr) return { year: 'n.d.', yearShort: 'n.d.', month: '', monthNum: '', day: '', date: 'n.d.' };
                  const date = new Date(dateStr);
                  if (isNaN(date.getTime())) return { year: dateStr, yearShort: dateStr, month: '', monthNum: '', day: '', date: dateStr };
                  
                  const year = date.getFullYear().toString();
                  const yearShort = year.slice(-2);
                  const monthNum = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  
                  return {
                    year: year,
                    yearShort: yearShort,
                    month: date.toLocaleDateString('en-US', { month: 'long' }),
                    monthNum: monthNum,
                    day: day,
                    date: `${monthNum}/${day}/${year}`
                  };
                };
                
                const formatAuthors = (authorStr, format) => {
                  if (!authorStr) return { full: 'Unknown Author', short: 'Unknown Author' };
                  const authors = authorStr.split(',').map(a => a.trim());
                  
                  let formattedAuthors = authors;
                  if (format === 'apa' || format === 'harvard') {
                    formattedAuthors = authors.map(author => {
                      const parts = author.split(' ');
                      if (parts.length >= 2) {
                        const lastName = parts[parts.length - 1];
                        const initials = parts.slice(0, -1).map(n => n[0] + '.').join(' ');
                        return `${lastName}, ${initials}`;
                      }
                      return author;
                    });
                  }
                  
                  let shortVersion;
                  if (authors.length === 1) {
                    shortVersion = formattedAuthors[0];
                  } else if (authors.length === 2) {
                    shortVersion = formattedAuthors.join(' & ');
                  } else {
                    shortVersion = formattedAuthors[0] + ' et al.';
                  }
                  
                  return { full: formattedAuthors.join(', '), short: shortVersion };
                };
                
                // Generate citation
                const template = settings.format === 'custom' ? settings.customTemplate : citationFormats[settings.format];
                const dateParts = formatDateParts(metadata.date || metadata.publishDate);
                const today = new Date();
                const accessDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                const accessDateShort = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
                const authorFormats = formatAuthors(metadata.author, settings.format);
                
                const variables = {
                  author: authorFormats.full,
                  authorShort: authorFormats.short,
                  year: dateParts.year,
                  yearShort: dateParts.yearShort,
                  month: dateParts.month,
                  monthNum: dateParts.monthNum,
                  day: dateParts.day,
                  date: dateParts.date,
                  title: metadata.title || title || 'Untitled',
                  publisher: metadata.publisher || metadata.journal || new URL(url).hostname.replace('www.', ''),
                  journal: metadata.journal || '',
                  doi: metadata.doi || '',
                  quals: metadata.quals || '',
                  url: url,
                  accessDate: accessDate,
                  accessDateShort: accessDateShort
                };
                
                let citation = template;
                Object.entries(variables).forEach(([key, value]) => {
                  const conditionalRegex = new RegExp(`{${key}\\s*\\?\\s*"([^"]*)"\\s*:\\s*"([^"]*)"\\s*}`, 'g');
                  citation = citation.replace(conditionalRegex, value ? '$1' : '$2');
                  citation = citation.replace(new RegExp(`{${key}}`, 'g'), value || '');
                });
                
                citation = citation.replace(/\s+/g, ' ').trim();
                citation = citation.replace(/\s+([.,])/g, '$1');
                
                // Check for missing fields
                const missingFields = [];
                if (!metadata.title && !title) missingFields.push('title');
                if (!metadata.author) missingFields.push('author');
                if (!metadata.date && !metadata.publishDate) missingFields.push('date');
                if (!metadata.publisher && !metadata.journal) missingFields.push('publisher/journal');
                
                // Copy to clipboard
                navigator.clipboard.writeText(citation);
                
                return {
                  citation: citation,
                  missingFields: missingFields
                };
              },
              args: [metadata, url, currentTab.title, settings]
            });
            
            // Extract the result from the script execution
            const scriptResult = result[0]?.result;
            if (scriptResult) {
              sendResponse({ 
                success: true, 
                missingFields: scriptResult.missingFields 
              });
            } else {
              sendResponse({ success: true });
            }
          } catch (error) {
            console.error('Error copying citation:', error);
            sendResponse({ success: false, error: error.message });
          }
        });
      });
      return true; // Indicates async response
  }
});

// Core recording functions
function startRecording(sessionName = '') {
  if (isRecording && currentSession) {
    // Already recording, just resume if paused
    if (currentSession.isPaused) {
      resumeRecording();
    }
    return;
  }
  
  isRecording = true;
  
  currentSession = {
    id: generateSessionId(),
    name: sessionName || `Research Session ${new Date().toLocaleDateString()}`,
    startTime: new Date().toISOString(),
    endTime: null,
    isPaused: false,
    events: [],
    searches: [],
    pageVisits: []
  };
  
  // Save recording state
  chrome.storage.local.set({ 
    [STORAGE_KEYS.IS_RECORDING]: true,
    [STORAGE_KEYS.CURRENT_SESSION]: currentSession,
    [STORAGE_KEYS.LAST_SAVE_TIMESTAMP]: Date.now()
  });
  
  // Set up listeners
  setupRecordingListeners();
  
  // Start autosave
  startAutosave();
}

function stopRecording() {
  return new Promise((resolve) => {
    if (!isRecording) {
      resolve(false);
      return;
    }
    
    isRecording = false;
    
    // Stop the autosave interval
    stopAutosave();
    
    // Stop the activity monitoring
    stopActivityMonitoring();
    
    if (currentSession) {
      currentSession.endTime = new Date().toISOString();
      
      // Add session_ended event
      const endEvent = {
        type: 'session_ended',
        timestamp: currentSession.endTime
      };
      currentSession.events.push(endEvent);
      
      // Save session to storage
      chrome.storage.local.get([STORAGE_KEYS.SESSIONS], (result) => {
        const sessions = result[STORAGE_KEYS.SESSIONS] || [];
        sessions.push(currentSession);
        
        chrome.storage.local.set({ 
          [STORAGE_KEYS.IS_RECORDING]: false,
          [STORAGE_KEYS.SESSIONS]: sessions,
          [STORAGE_KEYS.CURRENT_SESSION]: null,
          [STORAGE_KEYS.LAST_SAVE_TIMESTAMP]: null,
          [STORAGE_KEYS.LAST_ACTIVITY_TIMESTAMP]: null
        }, () => {
          // After the session is saved, finalize cleanup
          const savedSession = { ...currentSession };
          currentSession = null;
          
          // Remove listeners
          removeRecordingListeners();
          
          // Clear the badge
          chrome.action.setBadgeText({ text: '' });
          
          // Resolve with the saved session
          resolve(savedSession);
        });
      });
    } else {
      resolve(false);
    }
  });
}

function pauseRecording() {
  if (!isRecording || !currentSession) return;
  
  currentSession.isPaused = true;
  chrome.storage.local.set({ 
    [STORAGE_KEYS.CURRENT_SESSION]: currentSession,
    [STORAGE_KEYS.LAST_SAVE_TIMESTAMP]: Date.now()
  });
  
  // We don't change isRecording, just pause event collection
}

function resumeRecording() {
  if (!isRecording || !currentSession) return;
  
  currentSession.isPaused = false;
  chrome.storage.local.set({ 
    [STORAGE_KEYS.CURRENT_SESSION]: currentSession,
    [STORAGE_KEYS.LAST_SAVE_TIMESTAMP]: Date.now()
  });
}

// Autosave functionality using alarms
function startAutosave() {
  // Clear any existing alarms first
  stopAutosave();
  
  // Create the autosave alarm
  chrome.alarms.create(ALARM_NAMES.AUTOSAVE, {
    periodInMinutes: AUTOSAVE_INTERVAL_MS / (60 * 1000)  // Convert ms to minutes
  });
  
  // Create the keep-alive alarm (runs more frequently to prevent suspension)
  chrome.alarms.create(ALARM_NAMES.KEEP_ALIVE, {
    periodInMinutes: KEEP_ALIVE_INTERVAL_MS / (60 * 1000)  // Convert ms to minutes
  });
  
  // Also start the activity monitoring
  startActivityMonitoring();
}

function stopAutosave() {
  // Clear the autosave alarm
  chrome.alarms.clear(ALARM_NAMES.AUTOSAVE);
  
  // Clear the keep-alive alarm
  chrome.alarms.clear(ALARM_NAMES.KEEP_ALIVE);
  
  // For backward compatibility, also clear any existing interval
  if (autosaveInterval) {
    clearInterval(autosaveInterval);
    autosaveInterval = null;
  }
}

function saveCurrentSession() {
  if (!currentSession) return;
  
  console.log('Autosaving current session...', new Date().toISOString());
  
  chrome.storage.local.set({ 
    [STORAGE_KEYS.CURRENT_SESSION]: currentSession,
    [STORAGE_KEYS.LAST_SAVE_TIMESTAMP]: Date.now()
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error autosaving session:', chrome.runtime.lastError);
    }
  });
  
  // Update activity timestamp since we're doing something
  updateActivityTimestamp();
}

// Activity monitoring functionality using alarms
function startActivityMonitoring() {
  // Clear any existing monitor
  stopActivityMonitoring();
  
  // Set initial badge state
  updateBadge();
  
  // Create the activity check alarm
  chrome.alarms.create(ALARM_NAMES.ACTIVITY_CHECK, {
    periodInMinutes: ACTIVITY_CHECK_INTERVAL_MS / (60 * 1000)  // Convert ms to minutes
  });
}

function stopActivityMonitoring() {
  // Clear the activity check alarm
  chrome.alarms.clear(ALARM_NAMES.ACTIVITY_CHECK);
  
  // For backward compatibility, also clear any existing interval
  if (activityMonitorInterval) {
    clearInterval(activityMonitorInterval);
    activityMonitorInterval = null;
  }
  
  // Clear badge when stopping monitoring
  chrome.action.setBadgeText({ text: '' });
}

function updateActivityTimestamp() {
  const now = Date.now();
  chrome.storage.local.set({ [STORAGE_KEYS.LAST_ACTIVITY_TIMESTAMP]: now });
  return now;
}

function checkActivity() {
  if (!isRecording) {
    // Not recording, no need to monitor
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  
  chrome.storage.local.get([STORAGE_KEYS.LAST_ACTIVITY_TIMESTAMP], (result) => {
    const lastActivity = result[STORAGE_KEYS.LAST_ACTIVITY_TIMESTAMP] || Date.now();
    const now = Date.now();
    const inactiveTime = now - lastActivity;
    
    // Update the badge based on inactive time
    updateBadge(inactiveTime);
    
    // Log to console for debugging
    console.log(`Extension inactive for: ${Math.round(inactiveTime / 1000)} seconds`);
  });
}

function updateBadge(inactiveTimeMs = 0) {
  if (!isRecording) {
    // Clear badge when not recording
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  
  if (inactiveTimeMs > INACTIVITY_WARNING_THRESHOLD_MS) {
    // Calculate minutes of inactivity
    const inactiveMinutes = Math.round(inactiveTimeMs / 60000);
    chrome.action.setBadgeText({ text: `${inactiveMinutes}m` });
    
    // Change badge color to red for warning
    chrome.action.setBadgeBackgroundColor({ color: '#DB4437' }); // Google Red
  } else {
    // Recording and active - show "REC"
    chrome.action.setBadgeText({ text: 'REC' });
    
    // Red for normal recording
    chrome.action.setBadgeBackgroundColor({ color: '#DB4437' }); // Google Red
  }
}

// Recovery functionality
function recoverInterruptedSession() {
  chrome.storage.local.get([
    STORAGE_KEYS.IS_RECORDING, 
    STORAGE_KEYS.CURRENT_SESSION,
    STORAGE_KEYS.LAST_SAVE_TIMESTAMP
  ], (result) => {
    // Check if we were recording when the extension crashed/browser closed
    if (result[STORAGE_KEYS.IS_RECORDING] && result[STORAGE_KEYS.CURRENT_SESSION]) {
      const savedSession = result[STORAGE_KEYS.CURRENT_SESSION];
      const lastSaveTime = result[STORAGE_KEYS.LAST_SAVE_TIMESTAMP];
      
      // Resume the session
      isRecording = true;
      currentSession = savedSession;
      
      // Check when the last save was and consider session dead if too old
      const now = Date.now();
      const lastSaveAge = now - (lastSaveTime || 0);
      
      if (lastSaveAge > 24 * 60 * 60 * 1000) { // 24 hours
        console.log('Last save was more than 24 hours ago, stopping session automatically');
        stopRecording();
        return;
      }
      
      // Start the autosave again using alarms
      startAutosave();
      
      // Setup listeners again
      setupRecordingListeners();
      
      console.log('Recovered interrupted recording session', savedSession.id);
    }
  });
}

// Event listeners
function setupRecordingListeners() {
  chrome.tabs.onUpdated.addListener(handleTabUpdated);
  chrome.webNavigation.onCompleted.addListener(handleNavigationCompleted);
  // We don't need to register for runtime.onMessage since that's always active
}

function removeRecordingListeners() {
  chrome.tabs.onUpdated.removeListener(handleTabUpdated);
  chrome.webNavigation.onCompleted.removeListener(handleNavigationCompleted);
}

// Event handlers
function handleTabUpdated(tabId, changeInfo, tab) {
  if (!isRecording || !currentSession || currentSession.isPaused) return;
  if (!changeInfo.url) return;
  
  // Update activity timestamp since we detected user navigation
  updateActivityTimestamp();
  updateBadge();
  
  // Check if this is a search engine
  const isSearchEngine = checkForSearch(tab);
  
  // Only log as a page visit if it's not a search engine
  if (!isSearchEngine) {
    logPageVisit({
      url: tab.url,
      title: tab.title || '',
      timestamp: new Date().toISOString(),
      tabId: tabId
    });
  }
}

function handleNavigationCompleted(details) {
  if (!isRecording || !currentSession || currentSession.isPaused) return;
  if (details.frameId !== 0) return; // Only track main frame
  
  // Update activity timestamp since navigation completed
  updateActivityTimestamp();
  updateBadge();
  
  // Send message to content script to extract page metadata
  chrome.tabs.get(details.tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    
    // Check if this is a search engine page
    const isSearchEngine = checkForSearch(tab);
    
    // Only extract and update metadata for non-search pages
    if (!isSearchEngine) {
      chrome.tabs.sendMessage(details.tabId, { action: 'extractMetadata' }, (response) => {
        if (chrome.runtime.lastError || !response) return;
        
        // Update page visit with metadata
        updatePageVisitMetadata(details.url, response.metadata);
      });
    }
  });
}

// Helpers
function checkForSearch(tab) {
  try {
    const url = new URL(tab.url);
    
    // Check if this is a known search engine
    for (const [engine, config] of Object.entries(SEARCH_ENGINES)) {
      if (config.domains.includes(url.hostname)) {
        const searchQuery = url.searchParams.get(config.queryParam);
        
        if (searchQuery) {
          // Gather all search parameters
          const searchParams = {};
          for (const [key, value] of url.searchParams.entries()) {
            searchParams[key] = value;
          }
          
          // Log search
          logSearch({
            engine,
            domain: url.hostname,
            query: searchQuery,
            params: searchParams,
            url: tab.url,
            timestamp: new Date().toISOString(),
            tabId: tab.id
          });
          
          // Send message to content script to extract search results
          chrome.tabs.sendMessage(tab.id, { 
            action: 'extractSearchResults',
            engine: engine
          });
          
          return true; // This is a search engine page
        }
      }
    }
    
    // Special case: check if this is a search engine domain even without a query
    // (like homepage of Google, Bing, etc.)
    for (const config of Object.values(SEARCH_ENGINES)) {
      if (config.domains.includes(url.hostname)) {
        // This is a search engine, but without search parameters
        return true;
      }
    }
    
    return false; // This is not a search engine page
  } catch (e) {
    console.error('Error checking for search:', e);
    return false;
  }
}

function logSearch(searchData) {
  if (!currentSession) return;
  
  const searchEvent = {
    type: 'search',
    ...searchData
  };
  
  currentSession.events.push(searchEvent);
  currentSession.searches.push(searchEvent);
  
  // Save to storage and update last save timestamp
  chrome.storage.local.set({ 
    [STORAGE_KEYS.CURRENT_SESSION]: currentSession,
    [STORAGE_KEYS.LAST_SAVE_TIMESTAMP]: Date.now()
  });
}

function logPageVisit(visitData) {
  if (!currentSession) return;
  
  // Try to find the search that led to this page
  let sourceSearch = null;
  const searchesReversed = [...currentSession.searches].reverse();
  
  for (const search of searchesReversed) {
    if (search.timestamp < visitData.timestamp) {
      sourceSearch = {
        engine: search.engine,
        query: search.query,
        url: search.url,
        timestamp: search.timestamp
      };
      break;
    }
  }
  
  const visitEvent = {
    type: 'pageVisit',
    ...visitData,
    sourceSearch,
    notes: []
  };
  
  currentSession.events.push(visitEvent);
  currentSession.pageVisits.push(visitEvent);
  
  // Save to storage and update last save timestamp
  chrome.storage.local.set({ 
    [STORAGE_KEYS.CURRENT_SESSION]: currentSession,
    [STORAGE_KEYS.LAST_SAVE_TIMESTAMP]: Date.now()
  });
}

function updatePageVisitMetadata(url, metadata) {
  if (!currentSession) return;
  
  console.log('Updating metadata for URL:', url, metadata);
  let updated = false;
  
  // Try to find the URL in page visits
  for (let i = currentSession.pageVisits.length - 1; i >= 0; i--) {
    const visit = currentSession.pageVisits[i];
    if (visit.url === url) {
      updated = true;
      console.log('Found URL in page visits at index', i);
      
      // Merge with existing metadata if present
      const mergedMetadata = {
        ...(visit.metadata || {}),
        ...metadata
      };
      
      // Update with metadata
      currentSession.pageVisits[i] = {
        ...visit,
        metadata: mergedMetadata
      };
      
      // Also update in events array
      for (let j = currentSession.events.length - 1; j >= 0; j--) {
        const event = currentSession.events[j];
        if (event.type === 'pageVisit' && event.url === url) {
          currentSession.events[j] = {
            ...event,
            metadata: mergedMetadata
          };
          break;
        }
      }
      
      break;
    }
  }
  
  // If not found in page visits, try to find in searches
  if (!updated) {
    for (let i = currentSession.searches.length - 1; i >= 0; i--) {
      const search = currentSession.searches[i];
      if (search.url === url) {
        updated = true;
        console.log('Found URL in searches at index', i);
        
        // Merge with existing metadata if present
        const mergedMetadata = {
          ...(search.metadata || {}),
          ...metadata
        };
        
        // Update with metadata
        currentSession.searches[i] = {
          ...search,
          metadata: mergedMetadata
        };
        
        // Also update in events array
        for (let j = currentSession.events.length - 1; j >= 0; j--) {
          const event = currentSession.events[j];
          if (event.type === 'search' && event.url === url) {
            currentSession.events[j] = {
              ...event,
              metadata: mergedMetadata
            };
            break;
          }
        }
        
        break;
      }
    }
  }
  
  // If still not found, add as a standalone metadata entry
  if (!updated) {
    console.log('URL not found in existing records, creating new entry');
    // Create a new event with this metadata
    const metadataEvent = {
      type: 'metadata',
      url: url,
      timestamp: new Date().toISOString(),
      metadata: metadata
    };
    
    // Add to events array
    currentSession.events.push(metadataEvent);
  }
  
  // Save to storage and update last save timestamp
  console.log('Saving updated session to storage');
  chrome.storage.local.set({ 
    [STORAGE_KEYS.CURRENT_SESSION]: currentSession,
    [STORAGE_KEYS.LAST_SAVE_TIMESTAMP]: Date.now()
  });
  
  return true; // Indicate success
}

function getPageMetadataForUrl(url) {
  if (!currentSession) return {};
  
  console.log('Looking for metadata for URL:', url);
  
  // Find the page visit for this URL (most recent first)
  for (let i = currentSession.pageVisits.length - 1; i >= 0; i--) {
    const visit = currentSession.pageVisits[i];
    if (visit.url === url) {
      console.log('Found metadata in page visits:', visit.metadata);
      return visit.metadata || {};
    }
  }
  
  // Check in search results too
  for (let i = currentSession.searches.length - 1; i >= 0; i--) {
    const search = currentSession.searches[i];
    if (search.url === url) {
      console.log('Found metadata in searches:', search.metadata);
      return search.metadata || {};
    }
  }
  
  // Check in standalone metadata events
  for (let i = currentSession.events.length - 1; i >= 0; i--) {
    const event = currentSession.events[i];
    if ((event.type === 'metadata' || event.type === 'pageVisit' || event.type === 'search') && 
        event.url === url && event.metadata) {
      console.log('Found metadata in events:', event.metadata);
      return event.metadata;
    }
  }
  
  console.log('No metadata found for URL:', url);
  return {};
}

function addNote(url, note) {
  if (!currentSession) return;
  
  const timestamp = new Date().toISOString();
  
  // Create a single note object to reuse
  const noteObj = {
    content: note,
    timestamp: timestamp
  };
  
  // First check if this is a search page
  let isSearchPage = false;
  let pageFound = false;
  
  // Check for search page match
  for (let i = currentSession.searches.length - 1; i >= 0; i--) {
    const search = currentSession.searches[i];
    if (search.url === url) {
      isSearchPage = true;
      pageFound = true;
      
      // Initialize notes array if needed
      if (!search.notes) {
        search.notes = [];
      }
      
      // Add note to the search
      search.notes.push(noteObj);
      
      // Also update in events array - find the search event
      for (let j = currentSession.events.length - 1; j >= 0; j--) {
        const event = currentSession.events[j];
        if (event.type === 'search' && event.url === url) {
          if (!event.notes) {
            event.notes = [];
          }
          event.notes.push(noteObj);
          
          // Add a note_added property to the event to indicate it has notes
          event.has_notes = true;
          
          console.log(`Added note to search: ${search.query}`);
          break;
        }
      }
      
      break;
    }
  }
  
  // If not a search page, then try to find a content page visit
  if (!isSearchPage) {
    for (let i = currentSession.pageVisits.length - 1; i >= 0; i--) {
      const visit = currentSession.pageVisits[i];
      if (visit.url === url) {
        pageFound = true;
        
        // Initialize notes array if needed
        if (!visit.notes) {
          visit.notes = [];
        }
        
        // Add note to the page visit
        visit.notes.push(noteObj);
        
        // Also update in events array - find the page visit event
        for (let j = currentSession.events.length - 1; j >= 0; j--) {
          const event = currentSession.events[j];
          if (event.type === 'pageVisit' && event.url === url) {
            if (!event.notes) {
              event.notes = [];
            }
            event.notes.push(noteObj);
            
            // Add a note_added property to the event to indicate it has notes
            event.has_notes = true;
            
            console.log(`Added note to page visit: ${visit.title}`);
            break;
          }
        }
        
        break;
      }
    }
  }
  
  // If we couldn't find any matching page or search, add as standalone note
  if (!pageFound) {
    console.warn(`Could not find any record for URL: ${url}`);
    
    // Add a standalone note event
    const noteEvent = {
      type: 'note',
      url,
      content: note,
      timestamp: timestamp,
      orphaned: true
    };
    
    currentSession.events.push(noteEvent);
  }
  
  // Save the updated session and update last save timestamp
  chrome.storage.local.set({ 
    [STORAGE_KEYS.CURRENT_SESSION]: currentSession,
    [STORAGE_KEYS.LAST_SAVE_TIMESTAMP]: Date.now()
  });
}

// Helper functions
function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

async function getSessions() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.SESSIONS], (result) => {
      const sessions = result[STORAGE_KEYS.SESSIONS] || [];
      // Return summary info only
      const sessionSummaries = sessions.map(session => ({
        id: session.id,
        name: session.name || `Research Session ${new Date(session.startTime).toLocaleDateString()}`,
        startTime: session.startTime,
        endTime: session.endTime,
        events: session.events.length,
        searches: session.searches.length,
        pageVisits: session.pageVisits.length
      }));
      
      resolve(sessionSummaries);
    });
  });
}

async function renameSession(sessionId, newName) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEYS.SESSIONS], (result) => {
      const sessions = result[STORAGE_KEYS.SESSIONS] || [];
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex === -1) {
        reject('Session not found');
        return;
      }
      
      // Update the session name
      sessions[sessionIndex].name = newName;
      
      // Save back to storage
      chrome.storage.local.set({ [STORAGE_KEYS.SESSIONS]: sessions }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  });
}

async function resumeSession(sessionId) {
  return new Promise((resolve, reject) => {
    // Don't allow resuming if already recording
    if (isRecording && currentSession) {
      reject('Cannot resume session while another session is active. Please stop the current session first.');
      return;
    }
    
    chrome.storage.local.get([STORAGE_KEYS.SESSIONS], (result) => {
      const sessions = result[STORAGE_KEYS.SESSIONS] || [];
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex === -1) {
        reject('Session not found');
        return;
      }
      
      const sessionToResume = sessions[sessionIndex];
      
      // Validate session data integrity
      if (!validateSessionData(sessionToResume)) {
        reject('Session data is corrupted and cannot be resumed');
        return;
      }
      
      // Remove session from completed sessions list
      sessions.splice(sessionIndex, 1);
      
      // Prepare session for resumption
      const resumedSession = {
        ...sessionToResume,
        endTime: null, // Clear end time
        isPaused: false
      };
      
      // Add session_resumed event
      const resumeEvent = {
        type: 'session_resumed',
        timestamp: new Date().toISOString(),
        previousEndTime: sessionToResume.endTime
      };
      
      resumedSession.events.push(resumeEvent);
      
      // Set as current session
      currentSession = resumedSession;
      isRecording = true;
      
      // Save updated state
      chrome.storage.local.set({ 
        [STORAGE_KEYS.IS_RECORDING]: true,
        [STORAGE_KEYS.CURRENT_SESSION]: currentSession,
        [STORAGE_KEYS.SESSIONS]: sessions,
        [STORAGE_KEYS.LAST_SAVE_TIMESTAMP]: Date.now()
      }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          // Set up listeners and autosave
          setupRecordingListeners();
          startAutosave();
          updateBadge();
          
          console.log('Session resumed:', sessionId);
          resolve();
        }
      });
    });
  });
}

function validateSessionData(session) {
  // Check required fields exist
  if (!session || typeof session !== 'object') return false;
  if (!session.id || !session.name || !session.startTime) return false;
  if (!Array.isArray(session.events)) return false;
  if (!Array.isArray(session.searches)) return false;
  if (!Array.isArray(session.pageVisits)) return false;
  
  // Validate timestamp format
  try {
    new Date(session.startTime);
    if (session.endTime) new Date(session.endTime);
  } catch (e) {
    return false;
  }
  
  // Basic validation of events structure
  for (const event of session.events) {
    if (!event.type || !event.timestamp) return false;
    try {
      new Date(event.timestamp);
    } catch (e) {
      return false;
    }
  }
  
  return true;
}

async function deleteSession(sessionId) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEYS.SESSIONS], (result) => {
      const sessions = result[STORAGE_KEYS.SESSIONS] || [];
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex === -1) {
        reject('Session not found');
        return;
      }
      
      // Remove the session
      sessions.splice(sessionIndex, 1);
      
      // Save back to storage
      chrome.storage.local.set({ [STORAGE_KEYS.SESSIONS]: sessions }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  });
}

async function exportSession(sessionId, format = 'json') {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEYS.SESSIONS], (result) => {
      const sessions = result[STORAGE_KEYS.SESSIONS] || [];
      // Deep clone the session to avoid modifying the original
      const session = JSON.parse(JSON.stringify(sessions.find(s => s.id === sessionId)));
      
      if (!session) {
        reject('Session not found');
        return;
      }
      
      // Deduplicate notes in searches
      if (session.searches) {
        session.searches.forEach(search => {
          if (search.notes && search.notes.length > 1) {
            search.notes = deduplicateNotes(search.notes);
          }
        });
      }
      
      // Deduplicate notes in page visits
      if (session.pageVisits) {
        session.pageVisits.forEach(visit => {
          if (visit.notes && visit.notes.length > 1) {
            visit.notes = deduplicateNotes(visit.notes);
          }
        });
      }
      
      // Deduplicate notes in events
      if (session.events) {
        session.events.forEach(event => {
          if (event.notes && event.notes.length > 1) {
            event.notes = deduplicateNotes(event.notes);
          }
        });
      }
      
      if (format === 'json') {
        // Create a clean version of the session for export
        const exportData = {
          id: session.id,
          name: session.name || `Research Session ${new Date(session.startTime).toLocaleDateString()}`,
          startTime: session.startTime,
          endTime: session.endTime,
          searches: session.searches,
          contentPages: session.pageVisits,
          chronologicalEvents: session.events
        };
        
        resolve(JSON.stringify(exportData, null, 2));
      } else if (format === 'txt') {
        // Simple text format
        const sessionName = session.name || `Research Session ${new Date(session.startTime).toLocaleDateString()}`;
        let text = `Research Session: ${sessionName}\n`;
        text += `ID: ${session.id}\n`;
        text += `Started: ${session.startTime}\n`;
        text += `Ended: ${session.endTime || 'Not finished'}\n\n`;
        
        text += `RESEARCH SUMMARY:\n`;
        text += `Total searches: ${session.searches.length}\n`;
        text += `Total content pages visited: ${session.pageVisits.length}\n`;
        text += `Total events: ${session.events.length}\n\n`;
        
        text += `SEARCHES (${session.searches.length}):\n`;
        session.searches.forEach((search, i) => {
          text += `${i+1}. [${search.engine}] "${search.query}" - ${formatTimestamp(search.timestamp)}\n`;
          
          // Add notes for searches if they exist
          if (search.notes && search.notes.length > 0) {
            text += `   Notes:\n`;
            search.notes.forEach(note => {
              text += `   - ${note.content} [${formatTimestamp(note.timestamp)}]\n`;
            });
          }
        });
        
        text += `\nCONTENT PAGES (${session.pageVisits.length}):\n`;
        session.pageVisits.forEach((visit, i) => {
          text += `${i+1}. ${visit.title || 'Untitled'} - ${visit.url}\n`;
          text += `   Visited: ${formatTimestamp(visit.timestamp)}\n`;
          
          if (visit.sourceSearch) {
            text += `   From search: "${visit.sourceSearch.query}" (${visit.sourceSearch.engine})\n`;
          }
          
          // Include all available metadata fields
          if (visit.metadata) {
            text += `   Metadata:\n`;
            
            if (visit.metadata.title) {
              text += `   - Title: ${visit.metadata.title}\n`;
            }
            
            if (visit.metadata.author) {
              text += `   - Author: ${visit.metadata.author}\n`;
            }
            
            if (visit.metadata.publishDate) {
              text += `   - Published: ${visit.metadata.publishDate}\n`;
            }
            
            if (visit.metadata.publisher) {
              text += `   - Publisher: ${visit.metadata.publisher}\n`;
            }
            
            if (visit.metadata.journal) {
              text += `   - Journal: ${visit.metadata.journal}\n`;
            }
            
            if (visit.metadata.doi) {
              text += `   - DOI: ${visit.metadata.doi}\n`;
            }
            
            if (visit.metadata.contentType) {
              text += `   - Content Type: ${visit.metadata.contentType}\n`;
            }
            
            if (visit.metadata.quals) {
              text += `   - Quals: ${visit.metadata.quals}\n`;
            }
            
            if (visit.metadata.description) {
              text += `   - Description: ${visit.metadata.description}\n`;
            }
            
            // Check for any manually edited flag
            if (visit.metadata.manuallyEdited) {
              text += `   - Manually Edited: Yes (${formatTimestamp(visit.metadata.editTimestamp || '')})\n`;
            }
          }
          
          if (visit.notes && visit.notes.length > 0) {
            text += `   Notes:\n`;
            visit.notes.forEach(note => {
              text += `   - ${note.content} [${formatTimestamp(note.timestamp)}]\n`;
            });
          }
          
          text += '\n';
        });
        
        text += `\nCHRONOLOGICAL EVENTS:\n`;
        session.events.forEach((event, i) => {
          const time = formatTimestamp(event.timestamp);
          
          if (event.type === 'search') {
            text += `${time} - Search: [${event.engine}] "${event.query}"\n`;
            
            // Add any notes for this search event
            if (event.notes && event.notes.length > 0) {
              event.notes.forEach(note => {
                text += `    Note: "${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}" [${formatTimestamp(note.timestamp)}]\n`;
              });
            }
          } else if (event.type === 'pageVisit') {
            text += `${time} - Visit: ${event.title || 'Untitled'}\n`;
            
            // Add brief metadata summary
            if (event.metadata) {
              const metadataParts = [];
              
              if (event.metadata.author) metadataParts.push(`Author: ${event.metadata.author}`);
              if (event.metadata.publishDate) metadataParts.push(`Published: ${event.metadata.publishDate}`);
              if (event.metadata.publisher) metadataParts.push(`Publisher: ${event.metadata.publisher}`);
              if (event.metadata.contentType) metadataParts.push(`Type: ${event.metadata.contentType}`);
              
              if (metadataParts.length > 0) {
                text += `    Metadata: ${metadataParts.join(', ')}\n`;
              }
            }
            
            // Add any notes for this page visit
            if (event.notes && event.notes.length > 0) {
              event.notes.forEach(note => {
                text += `    Note: "${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}" [${formatTimestamp(note.timestamp)}]\n`;
              });
            }
          } else if (event.type === 'note') {
            text += `${time} - Note added: "${event.content.substring(0, 50)}${event.content.length > 50 ? '...' : ''}"\n`;
          } else if (event.type === 'metadata') {
            // Standalone metadata events
            text += `${time} - Metadata updated for page: ${event.url}\n`;
            if (event.metadata && event.metadata.title) {
              text += `    Title: ${event.metadata.title}\n`;
            }
          } else if (event.type === 'session_ended') {
            text += `${time} - ======= SESSION ENDED =======\n`;
          } else if (event.type === 'session_resumed') {
            text += `${time} - ======= SESSION RESUMED =======\n`;
            if (event.previousEndTime) {
              text += `    Previous session ended: ${formatTimestamp(event.previousEndTime)}\n`;
            }
          }
        });
        
        resolve(text);
      } else {
        reject('Unsupported export format');
      }
    });
  });
}

// Helper function to deduplicate consecutive identical notes
function deduplicateNotes(notes) {
  if (!notes || notes.length <= 1) return notes;
  
  // Sort by timestamp to ensure chronological order
  notes.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  // Filter out duplicates (same content and timestamp or very close timestamps)
  const uniqueNotes = [];
  let prevNote = null;
  
  for (const note of notes) {
    if (!prevNote) {
      // First note is always included
      uniqueNotes.push(note);
      prevNote = note;
      continue;
    }
    
    // Check if this is a duplicate note (same content and close timestamp)
    const prevTime = new Date(prevNote.timestamp).getTime();
    const currentTime = new Date(note.timestamp).getTime();
    const timeDiffSeconds = Math.abs(currentTime - prevTime) / 1000;
    
    // If content is the same and timestamps are within 5 seconds, consider it a duplicate
    if (note.content === prevNote.content && timeDiffSeconds < 5) {
      // Skip this note (it's a duplicate)
      console.log('Filtered out duplicate note:', note.content);
    } else {
      uniqueNotes.push(note);
      prevNote = note;
    }
  }
  
  return uniqueNotes;
}

// Helper function to format timestamps in a readable way
function formatTimestamp(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleString();
  } catch (e) {
    return isoString;
  }
}

// Window management functions
async function createPopoutWindow(width = 400, height = 600) {
  console.log('createPopoutWindow called with:', { width, height });
  
  try {
    // Clean up any existing popup window first
    console.log('Attempting to close any existing popout window...');
    await closePopoutWindow();
    console.log('Successfully closed any existing popout window');
    
    return new Promise((resolve, reject) => {
      try {
        // Try both with and without leading slash to make sure we get the right URL
        // Remove the leading slash as it might cause issues
        const popupUrl = chrome.runtime.getURL('src/popup/popup.html');
        console.log('Creating popup window with URL:', popupUrl);
        
        // Just check if we have a URL at all
        if (!popupUrl) {
          console.error('Invalid popup URL generated - URL is empty');
          reject(new Error('Invalid popup URL: empty'));
          return;
        }
        
        // Create a new popup window
        console.log('Calling chrome.windows.create...');
        chrome.windows.create({
          url: popupUrl,
          type: 'popup',
          width: width + 10, // Add a bit of extra padding to avoid scrollbars
          height: height + 10, // Add a bit of extra padding to avoid scrollbars
          focused: true
        }, (window) => {
          console.log('chrome.windows.create callback received with window:', window);
          
          if (chrome.runtime.lastError) {
            console.error('Error creating window:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }
          
          if (!window) {
            console.error('Window creation failed - no window object returned');
            reject(new Error('No window object returned'));
            return;
          }
          
          console.log('Popup window created successfully:', window);
          
          // Save the window ID to storage
          console.log('Saving window ID to storage:', window.id);
          chrome.storage.local.set({
            [STORAGE_KEYS.POPUP_WINDOW_ID]: window.id
          }, () => {
            if (chrome.runtime.lastError) {
              console.error('Error saving window ID:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
              return;
            }
            
            console.log('Window ID saved to storage successfully:', window.id);
            resolve(window);
          });
        });
        console.log('chrome.windows.create call made');
      } catch (innerError) {
        console.error('Exception in createPopoutWindow Promise:', innerError);
        reject(innerError);
      }
    });
  } catch (outerError) {
    console.error('Exception in createPopoutWindow:', outerError);
    throw outerError;
  }
}

async function closePopoutWindow() {
  console.log('closePopoutWindow called');
  
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get([STORAGE_KEYS.POPUP_WINDOW_ID], (result) => {
        console.log('Retrieved stored popup window ID:', result);
        const windowId = result[STORAGE_KEYS.POPUP_WINDOW_ID];
        
        if (!windowId) {
          console.log('No popup window ID found in storage, nothing to close');
          resolve(); // No popup window to close
          return;
        }
        
        console.log('Attempting to close window with ID:', windowId);
        chrome.windows.remove(windowId, () => {
          if (chrome.runtime.lastError) {
            // Ignore errors about windows that don't exist
            console.warn('Window removal error:', chrome.runtime.lastError);
          } else {
            console.log('Window successfully closed');
          }
          
          // Clear the window ID from storage
          console.log('Removing window ID from storage');
          chrome.storage.local.remove([STORAGE_KEYS.POPUP_WINDOW_ID], () => {
            if (chrome.runtime.lastError) {
              console.warn('Error removing window ID from storage:', chrome.runtime.lastError);
            } else {
              console.log('Window ID successfully removed from storage');
            }
            
            resolve();
          });
        });
      });
    } catch (error) {
      console.error('Exception in closePopoutWindow:', error);
      // Resolve anyway to avoid blocking subsequent operations
      resolve();
    }
  });
}

// Always-on-top functionality removed as it's not supported by Chrome extensions API