// Import IndexedDB module
importScripts('./indexeddb.js');

// Storage keys
const STORAGE_KEYS = {
  IS_RECORDING: 'isRecording',
  CURRENT_SESSION: 'currentSession',
  SESSIONS: 'sessions',
  LAST_SAVE_TIMESTAMP: 'lastSaveTimestamp',
  LAST_ACTIVITY_TIMESTAMP: 'lastActivityTimestamp',
  POPUP_WINDOW_ID: 'popupWindowId',
  METADATA_OBJECTS: 'metadataObjects'
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

// Metadata objects storage (persistent across sessions)
let metadataObjects = {};
// URL to metadata ID index for fast lookups
let urlToMetadataIndex = {};

// Rate limiting for adding notes
let lastNoteTimestamp = 0;
const NOTE_RATE_LIMIT_MS = 3000; // 3 seconds
const AUTOSAVE_INTERVAL_MS = 30000; // 30 seconds
const KEEP_ALIVE_INTERVAL_MS = 25000; // 25 seconds (slightly less than autosave)
const ACTIVITY_CHECK_INTERVAL_MS = 60000; // 1 minute
const INACTIVITY_WARNING_THRESHOLD_MS = 5 * 60000; // 5 minutes

// Search engine patterns
const SEARCH_ENGINES = {
  GOOGLE_SCHOLAR: {
    domains: ['scholar.google.com'],
    queryParam: 'q'
  },
  GOOGLE_NEWS: {
    domains: ['news.google.com'],
    queryParam: 'q'
  },
  GOOGLE: {
    domains: ['google.com', 'www.google.com'],
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
  LEXIS: {
    domains: ['advance.lexis.com', 'www.lexis.com', 'lexisnexis.com', 'www.lexisnexis.com'],
    queryParam: 'pdsearchterms' // Lexis uses pdsearchterms parameter
  }
};

// URL normalization function for consistent metadata object IDs
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // Normalize protocol to https
    urlObj.protocol = 'https:';
    
    // Normalize hostname (remove www prefix)
    if (urlObj.hostname.startsWith('www.')) {
      urlObj.hostname = urlObj.hostname.substring(4);
    }
    
    // Remove common tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'gclid', 'fbclid', 'mc_cid', 'mc_eid', '_ga', '_gid', 'ref', 'referer',
      'source', 'campaign', 'medium', 'content'
    ];
    
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Remove trailing slash from pathname
    if (urlObj.pathname.endsWith('/') && urlObj.pathname.length > 1) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    
    return urlObj.toString();
  } catch (e) {
    console.warn('Failed to normalize URL:', url, e);
    return url;
  }
}

// Generate unique metadata object ID
function generateMetadataId() {
  return 'meta_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Create or retrieve metadata object for a URL
async function getOrCreateMetadataObject(url) {
  const normalizedUrl = normalizeUrl(url);
  
  // Fast lookup using URL index
  const existingId = urlToMetadataIndex[normalizedUrl];
  if (existingId && metadataObjects[existingId]) {
    return { id: existingId, metadataObj: metadataObjects[existingId] };
  }
  
  // Create new metadata object
  const id = generateMetadataId();
  const metadataObj = {
    id: id,
    url: normalizedUrl,
    originalUrl: url,
    created: new Date().toISOString(),
    metadata: {},
    sessions: {},
    searchContexts: []
  };
  
  metadataObjects[id] = metadataObj;
  urlToMetadataIndex[normalizedUrl] = id;
  await saveMetadataObjects();
  
  return { id, metadataObj };
}

// Update metadata for a metadata object
async function updateMetadataObject(metadataId, metadataUpdates) {
  if (!metadataObjects[metadataId]) {
    console.warn('Metadata object not found:', metadataId);
    return false;
  }
  
  metadataObjects[metadataId].metadata = {
    ...metadataObjects[metadataId].metadata,
    ...metadataUpdates,
    lastUpdated: new Date().toISOString()
  };
  
  await saveMetadataObjects();
  return true;
}

// Add session data to metadata object
async function addSessionDataToMetadataObject(metadataId, sessionId, sessionData) {
  if (!metadataObjects[metadataId]) {
    console.warn('Metadata object not found:', metadataId);
    return false;
  }
  
  if (!metadataObjects[metadataId].sessions[sessionId]) {
    metadataObjects[metadataId].sessions[sessionId] = {
      timestamps: [],
      notes: [],
      searchContexts: []
    };
  }
  
  const sessionObj = metadataObjects[metadataId].sessions[sessionId];
  
  if (sessionData.timestamp) {
    sessionObj.timestamps.push(sessionData.timestamp);
  }
  
  if (sessionData.note) {
    sessionObj.notes.push({
      text: sessionData.note,
      timestamp: new Date().toISOString()
    });
  }
  
  if (sessionData.searchContext) {
    sessionObj.searchContexts.push({
      ...sessionData.searchContext,
      timestamp: new Date().toISOString()
    });
  }
  
  await saveMetadataObjects();
  return true;
}

// Save metadata objects to storage
async function saveMetadataObjects() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.METADATA_OBJECTS]: metadataObjects }, () => {
      resolve();
    });
  });
}

// Load metadata objects from storage
async function loadMetadataObjects() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.METADATA_OBJECTS], (result) => {
      metadataObjects = result[STORAGE_KEYS.METADATA_OBJECTS] || {};
      
      // Rebuild URL index for fast lookups
      urlToMetadataIndex = {};
      for (const [id, metadataObj] of Object.entries(metadataObjects)) {
        if (metadataObj.url) {
          urlToMetadataIndex[metadataObj.url] = id;
        }
      }
      
      resolve();
    });
  });
}

// Initialize on extension startup
chrome.runtime.onInstalled.addListener(async () => {
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
  
  // Initialize metadata objects storage
  await loadMetadataObjects();
  
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
chrome.runtime.onStartup.addListener(async () => {
  await loadMetadataObjects();
  recoverInterruptedSession();
  updateActivityTimestamp();
  updateBadge();
});

// Set the badge color to red
chrome.action.setBadgeBackgroundColor({ color: '#DB4437' }); // Google Red

// Also check when the extension itself starts (handles extension updates/reloads)
(async function initializeExtension() {
  await loadMetadataObjects();
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
      (async () => {
        try {
          if (message.url && message.metadata) {
            // Only process if recording is active
            if (!isRecording) {
              console.log('Not recording, ignoring metadata update');
              sendResponse({ success: false, error: 'Not recording' });
              return;
            }
            
            // Check if this is a manual update (from popup) vs automatic
            const isManualUpdate = message.isManualUpdate || false;
            const isAutomaticUpdate = message.isAutomaticUpdate || false;
            
            // Get or create metadata object
            const { id: metadataId, metadataObj } = await getOrCreateMetadataObject(message.url);
            
            // Protect manual edits from automatic updates
            if (isAutomaticUpdate && metadataObj.metadata.manuallyEdited) {
              console.log('Skipping automatic update - metadata was manually edited');
              sendResponse({ success: false, error: 'Manual edits protected from automatic updates' });
              return;
            }
            
            let metadataToUpdate = message.metadata;
            
            // Add manual edit flags for manual updates
            if (isManualUpdate) {
              metadataToUpdate = {
                ...metadataToUpdate,
                manuallyEdited: true,
                editTimestamp: new Date().toISOString()
              };
            }
            
            // Only enhance with identifier if not a manual update and not already from an identifier API
            if (!isManualUpdate && !message.metadata.doiMetadata && !message.metadata.sourceIdentifier) {
              metadataToUpdate = await enhanceMetadataWithDOI(message.url, message.metadata);
            }
            
            // Update the metadata object
            await updateMetadataObject(metadataId, metadataToUpdate);
            
            console.log('Metadata update complete for:', metadataId);
            sendResponse({ success: true, metadataId });
          } else {
            console.warn('Cannot update metadata: missing URL or metadata');
            sendResponse({ success: false, error: 'Missing URL or metadata' });
          }
        } catch (e) {
          console.error('Error updating metadata:', e);
          sendResponse({ success: false, error: 'Exception: ' + e.message });
        }
      })();
      return true; // Keep the message channel open for async response
      break;
      
    case 'getPageMetadata':
      (async () => {
        try {
          if (message.url) {
            const normalizedUrl = normalizeUrl(message.url);
            
            // Fast lookup using URL index
            const metadataId = urlToMetadataIndex[normalizedUrl];
            const metadataObj = metadataId ? metadataObjects[metadataId] : null;
            
            if (metadataObj) {
              // Include metadata plus object-level information for source tracking
              const metadata = {
                ...metadataObj.metadata,
                created: metadataObj.created,
                originalUrl: metadataObj.originalUrl
              };
              sendResponse({ success: true, metadata, metadataId: metadataObj.id });
            } else {
              sendResponse({ success: true, metadata: {}, metadataId: null });
            }
          } else {
            sendResponse({ success: false, error: 'Missing URL', metadata: {} });
          }
        } catch (e) {
          console.error('Error in getPageMetadata:', e);
          sendResponse({ success: false, error: e.message, metadata: {} });
        }
      })();
      return true; // Keep the message channel open for async response
      break;
    
    case 'checkIfSearchPage':
      try {
        if (message.url) {
          const url = new URL(message.url);
          
          // Check if this is a known search engine
          for (const [engine, config] of Object.entries(SEARCH_ENGINES)) {
            if (isProxiedDomain(url.hostname, config.domains)) {
              // Special handling for different search engines
              if (engine === 'LEXIS') {
                // Only treat as search if URL contains /search/
                if (!url.pathname.includes('/search/')) {
                  // This is a Lexis document page, not a search page
                  continue;
                }
              } else if (engine === 'GOOGLE' || engine === 'GOOGLE_NEWS') {
                // For Google domains, only treat as search if on search paths
                if (!isGoogleSearchPath(url.pathname)) {
                  // This is a Google content page (Books, Drive, Docs, etc.), not a search page
                  continue;
                }
              }
              
              const searchQuery = config.queryParam ? url.searchParams.get(config.queryParam) : null;
              
              if (searchQuery) {
                // Clean up the query for Lexis (decode URL encoding)
                let cleanQuery = searchQuery;
                if (engine === 'LEXIS') {
                  try {
                    cleanQuery = decodeURIComponent(searchQuery);
                  } catch (e) {
                    // If decoding fails, use the original
                    cleanQuery = searchQuery;
                  }
                }
                
                sendResponse({ 
                  isSearch: true, 
                  engine: engine,
                  query: cleanQuery 
                });
                return true;
              }
              
              // For Google domains, only return true if on search paths (even without query)
              if (engine === 'GOOGLE' || engine === 'GOOGLE_NEWS') {
                if (isGoogleSearchPath(url.pathname)) {
                  sendResponse({ 
                    isSearch: true, 
                    engine: engine,
                    query: null 
                  });
                  return true;
                }
                continue;
              }
              
              // For other non-Lexis search engines, still return true even without query
              // (e.g., Bing homepage, DuckDuckGo homepage)
              if (engine !== 'LEXIS') {
                sendResponse({ 
                  isSearch: true, 
                  engine: engine,
                  query: null 
                });
                return true;
              }
            }
          }
          
          // Not a search page
          sendResponse({ isSearch: false });
        } else {
          sendResponse({ isSearch: false, error: 'Missing URL' });
        }
      } catch (e) {
        console.error('Error in checkIfSearchPage:', e);
        sendResponse({ isSearch: false, error: e.message });
      }
      return true; // Keep the message channel open for async response
      break;
    
    case 'getStatus':
      // Ensure state is loaded before responding
      ensureStateLoaded().then(() => {
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
      });
      return true; // Async response
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
    
    case 'getExistingNote':
      if (message.url) {
        const existingNote = getExistingNoteForUrl(message.url);
        sendResponse({ success: true, note: existingNote });
      } else {
        sendResponse({ success: false, error: 'No URL provided' });
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
        
        // Only work when recording is active
        if (!isRecording) {
          sendResponse({ success: false, error: 'Recording must be active to copy citations' });
          return;
        }
        
        // Get metadata from metadata objects
        const normalizedUrl = normalizeUrl(url);
        let metadata = {};
        
        // Fast lookup using URL index
        const metadataId = urlToMetadataIndex[normalizedUrl];
        if (metadataId && metadataObjects[metadataId]) {
          metadata = metadataObjects[metadataId].metadata;
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
                  apa: '{author} ({year}). {title}. {journal}, {publicationInfo}, {pages}. {url ? "Retrieved {accessDate} from {url}" : ""}',
                  mla: '{author}. "{title}." {journal}, {publicationInfo}, {pages}, {day} {month} {year}, {url}.',
                  chicago: '{author}. "{title}." {journal}, {publicationInfo}, {pages}, {month} {day}, {year}. {url}.',
                  harvard: '{author} {year}, {title}, {journal}, {publicationInfo}, {pages}, viewed {accessDate}, <{url}>.',
                  ieee: '{author}, "{title}," {journal}, {publicationInfo}, {pages}, {year}. [Online]. Available: {url}. [Accessed: {accessDate}].'
                };
                
                // Helper functions (simplified versions)
                const formatDateParts = (dateStr) => {
                  if (!dateStr) return { year: 'n.d.', yearShort: 'n.d.', month: '', monthNum: '', day: '', date: 'n.d.' };
                  
                  // Parse date components directly without timezone conversion
                  let year, monthNum, day;
                  
                  // Try to extract year, month, day from various formats
                  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); // YYYY-MM-DD
                  const yearOnlyMatch = dateStr.match(/^(\d{4})$/); // YYYY
                  const yearMonthMatch = dateStr.match(/^(\d{4})-(\d{1,2})$/); // YYYY-MM
                  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // MM/DD/YYYY
                  
                  if (isoMatch) {
                    year = isoMatch[1];
                    monthNum = isoMatch[2].padStart(2, '0');
                    day = isoMatch[3].padStart(2, '0');
                  } else if (yearOnlyMatch) {
                    year = yearOnlyMatch[1];
                    monthNum = '';
                    day = '';
                  } else if (yearMonthMatch) {
                    year = yearMonthMatch[1];
                    monthNum = yearMonthMatch[2].padStart(2, '0');
                    day = '';
                  } else if (slashMatch) {
                    year = slashMatch[3];
                    monthNum = slashMatch[1].padStart(2, '0');
                    day = slashMatch[2].padStart(2, '0');
                  } else {
                    // Try to extract just a 4-digit year from the string as a fallback
                    const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
                    if (yearMatch) {
                      year = yearMatch[0];
                      monthNum = '';
                      day = '';
                    } else {
                      // Try to use Date parsing as last resort, but avoid timezone issues
                      const date = new Date(dateStr);
                      if (!isNaN(date.getTime())) {
                        year = date.getFullYear().toString();
                        monthNum = String(date.getMonth() + 1).padStart(2, '0');
                        day = String(date.getDate()).padStart(2, '0');
                      } else {
                        // If all parsing fails, return the original string
                        return { year: dateStr, yearShort: dateStr, month: '', monthNum: '', day: '', date: dateStr };
                      }
                    }
                  }
                  
                  const yearShort = year.slice(-2);
                  
                  // Generate month name from month number
                  let month = '';
                  if (monthNum) {
                    const monthNames = [
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ];
                    const monthIndex = parseInt(monthNum) - 1;
                    if (monthIndex >= 0 && monthIndex < 12) {
                      month = monthNames[monthIndex];
                    }
                  }
                  
                  // Format the date string
                  let formattedDate;
                  if (monthNum && day) {
                    formattedDate = `${monthNum}/${day}/${year}`;
                  } else if (monthNum) {
                    formattedDate = `${monthNum}/${year}`;
                  } else {
                    formattedDate = year;
                  }
                  
                  return {
                    year: year,
                    yearShort: yearShort,
                    month: month,
                    monthNum: monthNum,
                    day: day,
                    date: formattedDate
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
                
                // Helper function to replace URL based on citation settings
                const replaceUrl = (originalUrl, metadata, settings) => {
                  // Priority 1: Replace with DOI if enabled and available
                  if (settings.replaceUrlWithDoi && metadata.doi) {
                    return metadata.doi.startsWith('http') ? metadata.doi : `https://doi.org/${metadata.doi}`;
                  }
                  
                  // Priority 2: Replace with database name if enabled
                  if (settings.replaceDatabaseUrls) {
                    const hostname = new URL(originalUrl).hostname;
                    
                    // Built-in database mappings
                    const builtInDatabases = {
                      'heinonline.org': 'HeinOnline',
                      'www.heinonline.org': 'HeinOnline',
                      'advance.lexis.com': 'Lexis',
                      'www.lexis.com': 'Lexis', 
                      'lexisnexis.com': 'Lexis',
                      'www.lexisnexis.com': 'Lexis',
                      'jstor.org': 'JSTOR',
                      'www.jstor.org': 'JSTOR'
                    };
                    
                    // Check built-in databases first
                    if (builtInDatabases[hostname]) {
                      return builtInDatabases[hostname];
                    }
                    
                    // Check normalized/proxied versions for built-in databases
                    const normalizedHostname = hostname.replace(/[-_.]/g, '');
                    for (const [domain, dbName] of Object.entries(builtInDatabases)) {
                      const normalizedDomain = domain.replace(/[-_.]/g, '');
                      if (normalizedHostname.includes(normalizedDomain)) {
                        return dbName;
                      }
                    }
                    
                    // Check custom database domains
                    if (settings.customDatabaseDomains) {
                      const customMappings = settings.customDatabaseDomains
                        .split(/[,\n]/)
                        .map(mapping => mapping.trim())
                        .filter(mapping => mapping.includes('|'))
                        .map(mapping => {
                          const [domain, name] = mapping.split('|').map(s => s.trim());
                          return { domain, name };
                        });
                      
                      for (const { domain, name } of customMappings) {
                        // Exact match first
                        if (hostname === domain) {
                          return name;
                        }
                        
                        // Proxy detection using normalized comparison
                        const normalizedDomain = domain.replace(/[-_.]/g, '');
                        if (normalizedHostname.includes(normalizedDomain)) {
                          return name;
                        }
                        
                        // Also check hyphenated versions (common in EZProxy)
                        const hyphenatedDomain = domain.replace(/\./g, '-');
                        if (hostname.includes(hyphenatedDomain)) {
                          return name;
                        }
                      }
                    }
                  }
                  
                  // Return original URL if no replacements apply
                  return originalUrl;
                };
                
                const displayUrl = replaceUrl(url, metadata, settings);
                
                // Helper function to format pages field
                const formatPages = (pages) => {
                  if (!pages || pages.trim() === '') return '';
                  const trimmed = pages.trim();
                  // Check if first and last characters are digits
                  if (/^\d/.test(trimmed) && /\d$/.test(trimmed)) {
                    return `pp. ${trimmed}`;
                  }
                  return trimmed;
                };
                
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
                  publicationInfo: metadata.publicationInfo || '',
                  pages: formatPages(metadata.pages),
                  doi: metadata.doi || '',
                  quals: metadata.quals || '',
                  url: displayUrl,
                  accessDate: accessDate,
                  accessDateShort: accessDateShort
                };
                
                let citation = template;
                Object.entries(variables).forEach(([key, value]) => {
                  const conditionalRegex = new RegExp(`{${key}\\s*\\?\\s*"([^"]*)"\\s*:\\s*"([^"]*)"\\s*}`, 'g');
                  citation = citation.replace(conditionalRegex, value ? '$1' : '$2');
                  citation = citation.replace(new RegExp(`{${key}}`, 'g'), value || '');
                });
                
                // Clean up formatting
                citation = citation.replace(/\s+/g, ' ').trim();
                citation = citation.replace(/\s+([.,])/g, '$1');
                
                // Clean up multiple commas and empty sections
                citation = citation.replace(/,\s*,/g, ','); // Remove double commas
                citation = citation.replace(/,\s*\./g, '.'); // Remove comma before period
                citation = citation.replace(/,\s*$/, ''); // Remove trailing comma
                citation = citation.replace(/\.\s*,/g, '.'); // Remove comma after period
                
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
      
    case 'fetchMetadata':
      console.log('Received fetchMetadata message:', message);
      (async () => {
        try {
          if (!message.identifierType || !message.identifier) {
            sendResponse({ success: false, error: 'Missing identifier type or identifier' });
            return;
          }

          let metadata = null;
          
          switch (message.identifierType) {
            case 'DOI':
              metadata = await fetchDOIMetadata(message.identifier);
              break;
            case 'ISBN':
              metadata = await fetchISBNMetadata(message.identifier);
              break;
            case 'PMID':
              metadata = await fetchPMIDMetadata(message.identifier);
              break;
            case 'arXiv':
              metadata = await fetchArxivMetadata(message.identifier);
              break;
            default:
              sendResponse({ success: false, error: `${message.identifierType} lookup not yet implemented` });
              return;
          }
          
          if (metadata) {
            sendResponse({ success: true, metadata });
          } else {
            sendResponse({ success: false, error: `Failed to fetch metadata for this ${message.identifierType}` });
          }
        } catch (e) {
          console.error(`Error in fetch${message.identifierType}Metadata:`, e);
          sendResponse({ success: false, error: e.message });
        }
      })();
      return true; // Keep the message channel open for async response
      break;
      
    case 'fetchDOIMetadata':
      console.log('Received fetchDOIMetadata message:', message);
      (async () => {
        try {
          if (!message.doi) {
            sendResponse({ success: false, error: 'Missing DOI' });
            return;
          }

          // Fetch metadata using our existing function
          const metadata = await fetchDOIMetadata(message.doi);
          
          if (metadata) {
            sendResponse({ success: true, metadata });
          } else {
            sendResponse({ success: false, error: 'Failed to fetch metadata for this DOI' });
          }
        } catch (e) {
          console.error('Error in fetchDOIMetadata:', e);
          sendResponse({ success: false, error: e.message });
        }
      })();
      return true; // Keep the message channel open for async response
      break;
      
    case 'fetchIdentifierMetadata':
      console.log('Received fetchIdentifierMetadata message:', message);
      (async () => {
        try {
          if (!message.identifierType || !message.identifier) {
            sendResponse({ success: false, error: 'Missing identifier type or identifier' });
            return;
          }

          let metadata = null;
          
          // Route to appropriate fetcher based on identifier type
          switch (message.identifierType) {
            case 'DOI':
              metadata = await fetchDOIMetadata(message.identifier);
              break;
            case 'ISBN':
              metadata = await fetchISBNMetadata(message.identifier);
              break;
            case 'PMID':
              metadata = await fetchPMIDMetadata(message.identifier);
              break;
            case 'arXiv':
              metadata = await fetchArxivMetadata(message.identifier);
              break;
            default:
              sendResponse({ success: false, error: `Unsupported identifier type: ${message.identifierType}` });
              return;
          }
          
          if (metadata) {
            sendResponse({ success: true, metadata });
          } else {
            sendResponse({ success: false, error: `Failed to fetch metadata for this ${message.identifierType}` });
          }
        } catch (e) {
          console.error('Error in fetchIdentifierMetadata:', e);
          sendResponse({ success: false, error: e.message });
        }
      })();
      return true; // Keep the message channel open for async response
      break;
      
    case 'getRecordingStatus':
      sendResponse({ success: true, isRecording });
      break;
      
    case 'exportAllMetadata':
      (async () => {
        try {
          const count = Object.keys(metadataObjects).length;
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `research-tracker-metadata-${timestamp}.json`;
          
          const exportData = {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            type: 'metadata',
            count: count,
            metadata: metadataObjects
          };
          
          const jsonData = JSON.stringify(exportData, null, 2);
          
          sendResponse({
            success: true,
            data: jsonData,
            filename: filename,
            count: count
          });
        } catch (e) {
          console.error('Error exporting metadata:', e);
          sendResponse({ success: false, error: e.message });
        }
      })();
      return true; // Keep the message channel open for async response
      break;
      
    case 'clearAllMetadata':
      (async () => {
        try {
          const count = Object.keys(metadataObjects).length;
          
          // Clear both the in-memory objects and the index
          metadataObjects = {};
          urlToMetadataIndex = {};
          
          // Save the cleared state to storage
          await saveMetadataObjects();
          
          sendResponse({
            success: true,
            count: count
          });
        } catch (e) {
          console.error('Error clearing metadata:', e);
          sendResponse({ success: false, error: e.message });
        }
      })();
      return true; // Keep the message channel open for async response
      break;
      
    case 'openPopupAndEditMetadata':
      (async () => {
        try {
          // Store the URL that should be edited
          chrome.storage.local.set({ 'pendingEditUrl': message.url });
          
          // Open the popup window
          chrome.action.openPopup();
          
          sendResponse({ success: true });
        } catch (e) {
          console.error('Error opening popup for editing:', e);
          sendResponse({ success: false, error: e.message });
        }
      })();
      return true; // Keep the message channel open for async response
      break;
      
    case 'clearCorruptedData':
      (async () => {
        try {
          const result = await clearCorruptedData();
          sendResponse({ success: true, ...result });
        } catch (e) {
          console.error('Error clearing corrupted data:', e);
          sendResponse({ success: false, error: e.message });
        }
      })();
      return true; // Keep the message channel open for async response
      break;
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
  
  // Capture the current page as the first entry in the session
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs.length > 0) {
      const currentTab = tabs[0];
      const currentTime = new Date().toISOString();
      
      // Check if current page is a search engine (this will automatically log the search if it is one)
      const isSearchEngine = checkForSearch(currentTab);
      
      if (!isSearchEngine) {
        // Check if this page should be excluded from logging
        const isExcludedPage = await isExcludedFromLoggingAsync(currentTab.url);
        
        if (!isExcludedPage) {
          // Log the page visit using the existing function
          try {
            await logPageVisit({
              url: currentTab.url,
              title: currentTab.title || '',
              timestamp: currentTime,
              tabId: currentTab.id
            });
            console.log('Captured current content page as first event');
          } catch (error) {
            console.error('Error logging current page visit:', error);
          }
        }
      }
    }
  });
  
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
      
      // Save session to IndexedDB instead of chrome.storage
      researchTrackerDB.saveSession(currentSession).then(() => {
        // Clear current session from chrome.storage
        chrome.storage.local.set({ 
          [STORAGE_KEYS.IS_RECORDING]: false,
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
      }).catch(error => {
        console.error('Failed to save session to IndexedDB:', error);
        // Fall back to chrome.storage if IndexedDB fails
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
            const savedSession = { ...currentSession };
            currentSession = null;
            removeRecordingListeners();
            chrome.action.setBadgeText({ text: '' });
            resolve(savedSession);
          });
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
  
  // Update badge to show yellow "REC" when paused
  updateBadge();
  
  // We don't change isRecording, just pause event collection
}

function resumeRecording() {
  if (!isRecording || !currentSession) return;
  
  currentSession.isPaused = false;
  chrome.storage.local.set({ 
    [STORAGE_KEYS.CURRENT_SESSION]: currentSession,
    [STORAGE_KEYS.LAST_SAVE_TIMESTAMP]: Date.now()
  });
  
  // Update badge to show red "REC" when resumed
  updateBadge();
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

// Ensures state is loaded from storage if not already in memory
function ensureStateLoaded() {
  return new Promise((resolve) => {
    // Always load from storage to ensure we have the latest state
    // This is especially important when the service worker wakes up from sleep
    console.log('Loading state from storage...');
    chrome.storage.local.get([
      STORAGE_KEYS.IS_RECORDING,
      STORAGE_KEYS.CURRENT_SESSION
    ], (result) => {
      const wasRecording = isRecording;
      const hadSession = !!currentSession;
      
      isRecording = result[STORAGE_KEYS.IS_RECORDING] || false;
      currentSession = result[STORAGE_KEYS.CURRENT_SESSION] || null;
      
      console.log('State loaded from storage:', { 
        isRecording, 
        hasSession: !!currentSession,
        wasRecording,
        hadSession
      });
      
      // If we're recording and have a session, and we weren't already set up, re-setup listeners
      if (isRecording && currentSession && (!wasRecording || !hadSession)) {
        console.log('Setting up recording listeners after state recovery');
        setupRecordingListeners();
        startAutosave();
      }
      
      resolve();
    });
  });
}

function updateBadge(inactiveTimeMs = 0) {
  if (!isRecording) {
    // Clear badge when not recording
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  
  // Check if recording is paused
  if (currentSession && currentSession.isPaused) {
    // Recording but paused - show "REC" in yellow
    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#F57C00' }); // Amber/Orange
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
  
  // Check if this is a new tab page or other browser page that shouldn't be logged
  isExcludedFromLoggingAsync(tab.url).then(async isExcludedPage => {
    // Only log as a page visit if it's not a search engine and not an excluded page
    if (!isSearchEngine && !isExcludedPage) {
      try {
        await logPageVisit({
          url: tab.url,
          title: tab.title || '',
          timestamp: new Date().toISOString(),
          tabId: tabId
        });
      } catch (error) {
        console.error('Error logging page visit:', error);
      }
    }
  }).catch(error => {
    console.error('Error checking if page should be excluded from logging:', error);
  });
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
    
    // Check if this is an excluded page
    isExcludedFromLoggingAsync(tab.url).then(async isExcludedPage => {
      // Only extract and update metadata for non-search pages and non-excluded pages
      if (!isSearchEngine && !isExcludedPage) {
        // Get or create metadata object first
        const { id: metadataId, metadataObj } = await getOrCreateMetadataObject(tab.url);
        
        // If metadata object already has metadata or was manually edited, don't re-extract
        if (Object.keys(metadataObj.metadata).length > 0 || metadataObj.metadata.manuallyEdited) {
          console.log('Metadata already exists or was manually edited for URL, skipping extraction:', tab.url);
          return;
        }
        
        chrome.tabs.sendMessage(details.tabId, { action: 'extractMetadata' }, async (response) => {
          if (chrome.runtime.lastError || !response) return;
          
          // Process metadata with new DOI-first approach
          const finalMetadata = await processMetadataWithDOIPriority(details.url, response.metadata);
          
          // Update metadata object with processed metadata
          await updatePageVisitMetadata(details.url, finalMetadata);
        });
      }
    });
  });
}

// Helpers
function isExcludedFromLogging(url) {
  if (!url) return true;
  
  try {
    // Common browser pages that shouldn't be logged
    const excludedSchemes = [
      'chrome:',
      'chrome-extension:',
      'edge:',
      'safari:',
      'firefox:',
      'moz-extension:',
      'about:',
      'data:',
      'blob:',
      'file:'
    ];
    
    // Check for excluded schemes
    for (const scheme of excludedSchemes) {
      if (url.startsWith(scheme)) {
        return true;
      }
    }
    
    // Specific new tab page URLs
    const newTabUrls = [
      'chrome://newtab/',
      'chrome://new-tab-page/',
      'edge://newtab/',
      'about:newtab',
      'about:home',
      'about:blank'
    ];
    
    // Check for exact new tab URLs
    for (const newTabUrl of newTabUrls) {
      if (url === newTabUrl || url.startsWith(newTabUrl)) {
        return true;
      }
    }
    
    // Check for empty or very short URLs that are likely browser pages
    if (url.length < 10) {
      return true;
    }
    
    // Check custom excluded domains (async - will be handled separately)
    return false;
  } catch (e) {
    console.error('Error checking excluded URL:', e);
    return true; // If there's an error, exclude it to be safe
  }
}

// Async version that checks custom domains from settings
function isExcludedFromLoggingAsync(url) {
  return new Promise((resolve) => {
    // First check the synchronous exclusions
    if (isExcludedFromLogging(url)) {
      resolve(true);
      return;
    }
    
    // Then check custom domains from settings
    chrome.storage.local.get(['citationSettings'], (result) => {
      try {
        const settings = result.citationSettings || {};
        const excludedDomains = settings.excludedDomains || 'annas-archive.org, libgen.is, sci-hub.se, library.dartmouth.edu';
        
        if (!excludedDomains.trim()) {
          resolve(false);
          return;
        }
        
        // Parse the comma-separated domains
        const domains = excludedDomains.split(',').map(d => d.trim()).filter(d => d);
        
        if (domains.length === 0) {
          resolve(false);
          return;
        }
        
        // Extract hostname from URL
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        // Check if hostname matches any excluded domain
        for (const domain of domains) {
          const cleanDomain = domain.toLowerCase();
          
          // Exact match
          if (hostname === cleanDomain) {
            resolve(true);
            return;
          }
          
          // Subdomain match (e.g., "example.com" matches "www.example.com")
          if (hostname.endsWith('.' + cleanDomain)) {
            resolve(true);
            return;
          }
        }
        
        resolve(false);
      } catch (e) {
        console.error('Error checking custom excluded domains:', e);
        resolve(false); // Don't exclude on error for custom domains
      }
    });
  });
}

function isProxiedDomain(hostname, targetDomains) {
  // Check direct match first
  if (targetDomains.includes(hostname)) {
    return true;
  }
  
  // Normalize hostname by removing common proxy patterns
  const normalizedHostname = hostname
    .replace(/[-_.]/g, '') // Remove punctuation
    .toLowerCase();
  
  // Check each target domain
  for (const domain of targetDomains) {
    const normalizedDomain = domain.replace(/[-_.]/g, '').toLowerCase();
    
    // Check if the hostname contains the normalized domain
    if (normalizedHostname.includes(normalizedDomain)) {
      return true;
    }
    
    // Also check for hyphenated versions (common in EZProxy)
    const hyphenatedDomain = domain.replace(/\./g, '-');
    if (hostname.includes(hyphenatedDomain)) {
      return true;
    }
  }
  
  return false;
}

// Helper function to determine if a Google path is a search page
function isGoogleSearchPath(pathname) {
  // Google search paths
  const googleSearchPaths = [
    '/search',     // Main search results
    '/webhp',      // Search homepage
    '/',           // Google homepage
    ''             // Empty path (homepage)
  ];
  
  // Check for exact matches
  if (googleSearchPaths.includes(pathname)) {
    return true;
  }
  
  // Check if it starts with /search (for parameterized search URLs)
  if (pathname.startsWith('/search')) {
    return true;
  }
  
  // These are NOT search pages (content/service pages)
  const nonSearchPaths = [
    '/books',      // Google Books
    '/drive',      // Google Drive  
    '/docs',       // Google Docs
    '/sheets',     // Google Sheets
    '/slides',     // Google Slides
    '/forms',      // Google Forms
    '/maps',       // Google Maps
    '/gmail',      // Gmail
    '/calendar',   // Google Calendar
    '/photos',     // Google Photos
    '/translate',  // Google Translate
    '/youtube',    // YouTube
    '/scholar',    // Google Scholar (handled separately)
    '/news',       // Google News (handled separately)
    '/images',     // Google Images (this is actually search, but handled by main search)
    '/videos',     // Google Videos (this is actually search, but handled by main search)
    '/shopping',   // Google Shopping (this is actually search, but handled by main search)
    '/finance',    // Google Finance
    '/flights',    // Google Flights
    '/travel',     // Google Travel
    '/keep',       // Google Keep
    '/analytics',  // Google Analytics
    '/ads',        // Google Ads
    '/chrome',     // Chrome Web Store
    '/play',       // Google Play
    '/store',      // Google Store
    '/workspace',  // Google Workspace
    '/cloud',      // Google Cloud
    '/developer',  // Google Developers
    '/support',    // Google Support
    '/about',      // About Google
    '/policies',   // Google Policies
    '/account',    // Google Account
    '/settings'    // Google Settings
  ];
  
  // Check if the path starts with any non-search path
  for (const nonSearchPath of nonSearchPaths) {
    if (pathname.startsWith(nonSearchPath)) {
      return false;
    }
  }
  
  // Default to true for unknown Google paths (conservative approach for search detection)
  return true;
}

function checkForSearch(tab) {
  try {
    const url = new URL(tab.url);
    
    // Check if this is a known search engine
    for (const [engine, config] of Object.entries(SEARCH_ENGINES)) {
      if (isProxiedDomain(url.hostname, config.domains)) {
        // Special handling for different search engines
        if (engine === 'LEXIS') {
          // Only treat as search if URL contains /search/
          if (!url.pathname.includes('/search/')) {
            // This is a Lexis document page, not a search page
            return false;
          }
        } else if (engine === 'GOOGLE' || engine === 'GOOGLE_NEWS') {
          // For Google domains, only treat as search if on search paths
          if (!isGoogleSearchPath(url.pathname)) {
            // This is a Google content page (Books, Drive, Docs, etc.), not a search page
            return false;
          }
        }
        
        const searchQuery = config.queryParam ? url.searchParams.get(config.queryParam) : null;
        
        if (searchQuery) {
          // Gather all search parameters
          const searchParams = {};
          for (const [key, value] of url.searchParams.entries()) {
            searchParams[key] = value;
          }
          
          // Clean up the query for Lexis (decode URL encoding)
          let cleanQuery = searchQuery;
          if (engine === 'LEXIS') {
            try {
              cleanQuery = decodeURIComponent(searchQuery);
            } catch (e) {
              // If decoding fails, use the original
              cleanQuery = searchQuery;
            }
          }
          
          // Log search
          logSearch({
            engine,
            domain: url.hostname,
            query: cleanQuery,
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
        
        // For Google domains, only return true if on search paths (even without query)
        if (engine === 'GOOGLE' || engine === 'GOOGLE_NEWS') {
          return isGoogleSearchPath(url.pathname);
        }
        
        // For other non-Lexis search engines, still return true even without query
        // (e.g., Bing homepage, DuckDuckGo homepage)
        if (engine !== 'LEXIS') {
          return true;
        }
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

async function logPageVisit(visitData) {
  if (!currentSession) return;
  
  // Get or create metadata object for this URL
  const { id: metadataId } = await getOrCreateMetadataObject(visitData.url);
  
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
  
  // Add session data to metadata object
  const sessionData = {
    timestamp: visitData.timestamp
  };
  
  if (sourceSearch) {
    sessionData.searchContext = sourceSearch;
  }
  
  await addSessionDataToMetadataObject(metadataId, currentSession.id, sessionData);
  
  const visitEvent = {
    type: 'pageVisit',
    ...visitData,
    metadataId,
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

async function updatePageVisitMetadata(url, metadata) {
  if (!currentSession) return;
  
  console.log('Updating metadata for URL:', url, metadata);
  
  // Get or create metadata object and update it
  const { id: metadataId } = await getOrCreateMetadataObject(url);
  await updateMetadataObject(metadataId, metadata);
  
  console.log('Metadata object updated:', metadataId);
  
  return true; // Indicate success
}

// DOI detection and metadata fetching
function extractDOIFromURL(url) {
  try {
    // Common DOI patterns in URLs - based on comprehensive research
    const patterns = [
      // Standard DOI URLs (including dx.doi.org and various mirror sites)
      /(?:(?:https?:\/\/)?(?:(?:dx|www)\.)?doi\.org\/)(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // URLs with doi parameter (various formats)
      /[?&]doi=(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)[&\s]?/i,
      /[?&]DOI=(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)[&\s]?/i,
      /[?&]id=doi:(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)[&\s]?/i,
      
      // Publisher-specific patterns
      
      // Wiley Online Library
      /onlinelibrary\.wiley\.com\/doi\/(?:abs|full|pdf|epdf)\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // Springer (various formats)
      /link\.springer\.com\/article\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      /link\.springer\.com\/chapter\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      /link\.springer\.com\/book\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // Nature Publishing Group
      /nature\.com\/articles\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // ScienceDirect/Elsevier
      /sciencedirect\.com\/science\/article\/[^/]*\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // PLOS journals
      /journals\.plos\.org\/[^/]+\/article\?id=(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // JSTOR
      /jstor\.org\/stable\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // SAGE Publications
      /journals\.sagepub\.com\/doi\/(?:abs|full|pdf)\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // Taylor & Francis
      /tandfonline\.com\/doi\/(?:abs|full|pdf)\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // Oxford Academic
      /academic\.oup\.com\/[^/]+\/article\/[^/]*\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // Cambridge Core
      /cambridge\.org\/core\/journals\/[^/]+\/article\/[^/]*\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // MDPI
      /mdpi\.com\/[^/]+\/[^/]+\/[^/]+\/[^/]*\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // Frontiers
      /frontiersin\.org\/articles\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // Hindawi
      /hindawi\.com\/journals\/[^/]+\/[^/]*\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // BioMed Central
      /biomedcentral\.com\/articles\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // PeerJ
      /peerj\.com\/articles\/(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // arXiv (though arXiv doesn't use DOIs directly, some references include them)
      /arxiv\.org\/[^/]*\/[^/]*(?:\?.*)?.*doi[=:]?(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i,
      
      // Generic DOI embedded in path (comprehensive pattern covering 97% of DOIs)
      /\b(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)\b/,
      
      // Handle URL-encoded DOIs
      /\b(10\.%[0-9A-F]{2}[0-9A-F%]*\/[-._;()/:a-zA-Z0-9%]+)\b/i
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // Clean up the DOI
        let doi = match[1];
        
        // URL decode if needed
        try {
          doi = decodeURIComponent(doi);
        } catch (e) {
          // If decode fails, use original
        }
        
        // Remove any trailing punctuation that's not part of the DOI
        doi = doi.replace(/[.,;:!?)\]}>]+$/, '');
        
        // Remove any query parameters or fragments that got captured
        doi = doi.replace(/[?#].*$/, '');
        
        // Validate it looks like a proper DOI
        if (/^10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+$/.test(doi)) {
          console.log(`Extracted DOI from URL: ${doi}`);
          return doi;
        }
      }
    }
  } catch (e) {
    console.error('Error extracting DOI from URL:', e);
  }
  return null;
}

async function fetchDOIMetadata(doi) {
  try {
    console.log('Fetching metadata for DOI:', doi);
    
    // Use doi.org (not dx.doi.org) and request CSL JSON with fallback options
    const response = await fetch(`https://doi.org/${doi}`, {
      headers: {
        'Accept': 'application/vnd.citationstyles.csl+json;q=1.0, application/x-bibtex;q=0.5',
        'User-Agent': 'Research-Tracker-Extension/1.0'
      },
      redirect: 'follow' // Explicitly follow redirects
    });

    // Handle specific error cases
    if (response.status === 404) {
      console.error('DOI not found:', doi);
      return null;
    }
    
    if (response.status === 204) {
      console.error('No metadata available for DOI:', doi);
      return null;
    }
    
    if (response.status === 406) {
      console.error('Content type not acceptable for DOI:', doi);
      return null;
    }

    if (!response.ok) {
      console.error('DOI fetch failed:', response.status, response.statusText);
      return null;
    }

    // Check content type to ensure we got JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('json')) {
      console.error('Unexpected content type:', contentType);
      return null;
    }

    const data = await response.json();
    console.log('DOI metadata received:', data);

    // Convert CSL JSON to our metadata format
    const metadata = {
      doi: doi, // Keep for backward compatibility
      doiMetadata: true, // Keep for backward compatibility
      sourceIdentifier: { type: 'DOI', value: doi },
      identifiers: [{ type: 'DOI', value: doi }],
      title: data.title,
      authors: [],
      publishDate: null,
      journal: data['container-title'],
      publicationInfo: null, // Will be set below from volume/issue
      pages: data.page,
      abstract: data.abstract,
      contentType: mapCSLTypeToContentType(data.type)
    };
    
    // Create publication info from volume and issue
    if (data.volume || data.issue) {
      const parts = [];
      if (data.volume) parts.push(`Vol. ${data.volume}`);
      if (data.issue) parts.push(`No. ${data.issue}`);
      metadata.publicationInfo = parts.join(', ');
    }

    // Process authors
    if (data.author && Array.isArray(data.author)) {
      metadata.authors = data.author.map(author => {
        if (author.given && author.family) {
          return `${author.given} ${author.family}`;
        } else if (author.name) {
          return author.name;
        } else if (author.family) {
          return author.family;
        }
        return '';
      }).filter(name => name);
      
      metadata.author = metadata.authors.join(', ');
    }

    // Process publication date
    if (data.published && data.published['date-parts']) {
      const dateParts = data.published['date-parts'][0];
      if (dateParts && dateParts.length > 0) {
        const year = dateParts[0];
        const month = dateParts[1] || 1;
        const day = dateParts[2] || 1;
        metadata.publishDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    } else if (data.issued && data.issued['date-parts']) {
      const dateParts = data.issued['date-parts'][0];
      if (dateParts && dateParts.length > 0) {
        const year = dateParts[0];
        const month = dateParts[1] || 1;
        const day = dateParts[2] || 1;
        metadata.publishDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // Add URL if available
    if (data.URL) {
      metadata.doiUrl = data.URL;
    }

    return metadata;
  } catch (e) {
    console.error('Error fetching DOI metadata:', e);
    return null;
  }
}

// ISBN Metadata Fetching
async function fetchISBNMetadata(isbn) {
  try {
    console.log('Fetching metadata for ISBN:', isbn);
    
    // Try Open Library API first (completely free, no auth required)
    try {
      console.log('Trying Open Library API...');
      const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=details&format=json`);
      
      if (response.ok) {
        const data = await response.json();
        const bookKey = `ISBN:${isbn}`;
        if (data[bookKey]) {
          console.log('Open Library data received:', data[bookKey]);
          return convertOpenLibraryToMetadata(data[bookKey], isbn);
        }
      }
    } catch (e) {
      console.log('Open Library API failed:', e.message);
    }
    
    // Try Google Books API as fallback
    try {
      console.log('Trying Google Books API...');
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.totalItems > 0 && data.items && data.items[0]) {
          console.log('Google Books data received:', data.items[0]);
          return convertGoogleBooksToMetadata(data.items[0], isbn);
        }
      }
    } catch (e) {
      console.log('Google Books API failed:', e.message);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching ISBN metadata:', error);
    return null;
  }
}

function convertOpenLibraryToMetadata(data, isbn) {
  const details = data.details || {};
  const metadata = {
    title: details.title || '',
    author: '',
    publishDate: '',
    publisher: '',
    pages: '',
    isbn: isbn, // Keep for backward compatibility
    contentType: 'book',
    isbnMetadata: true, // Keep for backward compatibility
    sourceIdentifier: { type: 'ISBN', value: isbn },
    identifiers: [{ type: 'ISBN', value: isbn }]
  };
  
  // Process authors
  if (details.authors && details.authors.length > 0) {
    metadata.author = details.authors.map(a => a.name || '').join(', ');
  }
  
  // Process publication date
  if (details.publish_date) {
    metadata.publishDate = details.publish_date;
  }
  
  // Process publishers
  if (details.publishers && details.publishers.length > 0) {
    metadata.publisher = details.publishers.join(', ');
  }
  
  // Process page count
  if (details.number_of_pages) {
    metadata.pages = details.number_of_pages.toString();
  }
  
  return metadata;
}

function convertGoogleBooksToMetadata(data, isbn) {
  const volumeInfo = data.volumeInfo || {};
  const metadata = {
    title: volumeInfo.title || '',
    author: '',
    publishDate: '',
    publisher: volumeInfo.publisher || '',
    pages: '',
    isbn: isbn, // Keep for backward compatibility
    contentType: 'book',
    isbnMetadata: true, // Keep for backward compatibility
    sourceIdentifier: { type: 'ISBN', value: isbn },
    identifiers: [{ type: 'ISBN', value: isbn }]
  };
  
  // Process authors
  if (volumeInfo.authors && volumeInfo.authors.length > 0) {
    metadata.author = volumeInfo.authors.join(', ');
  }
  
  // Process publication date
  if (volumeInfo.publishedDate) {
    metadata.publishDate = volumeInfo.publishedDate;
  }
  
  // Process page count
  if (volumeInfo.pageCount) {
    metadata.pages = volumeInfo.pageCount.toString();
  }
  
  return metadata;
}

// PMID Metadata Fetching
async function fetchPMIDMetadata(pmid) {
  try {
    console.log('Fetching metadata for PMID:', pmid);
    
    // Use NCBI E-utilities API
    const response = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.result && data.result[pmid]) {
        console.log('PubMed data received:', data.result[pmid]);
        return convertPubMedToMetadata(data.result[pmid], pmid);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching PMID metadata:', error);
    return null;
  }
}

function convertPubMedToMetadata(data, pmid) {
  const metadata = {
    title: data.title || '',
    author: '',
    publishDate: '',
    journal: data.fulljournalname || data.source || '',
    publicationInfo: '',
    pages: data.pages || '',
    pmid: pmid, // Keep for backward compatibility
    contentType: 'journal-article',
    pmidMetadata: true, // Keep for backward compatibility
    sourceIdentifier: { type: 'PMID', value: pmid },
    identifiers: [{ type: 'PMID', value: pmid }]
  };
  
  // Process authors
  if (data.authors && data.authors.length > 0) {
    metadata.author = data.authors.map(a => a.name || '').join(', ');
  }
  
  // Process publication date
  if (data.pubdate) {
    metadata.publishDate = data.pubdate;
  } else if (data.epubdate) {
    metadata.publishDate = data.epubdate;
  }
  
  // Process publication info (volume, issue)
  const pubInfo = [];
  if (data.volume) pubInfo.push(`Vol. ${data.volume}`);
  if (data.issue) pubInfo.push(`No. ${data.issue}`);
  if (pubInfo.length > 0) {
    metadata.publicationInfo = pubInfo.join(', ');
  }
  
  // Add DOI if available
  if (data.elocationid) {
    const doiMatch = data.elocationid.match(/doi:\s*(.+)/);
    if (doiMatch) {
      const doiValue = doiMatch[1];
      metadata.doi = doiValue; // Keep for backward compatibility
      // Add DOI to identifiers array
      metadata.identifiers.push({ type: 'DOI', value: doiValue });
    }
  }
  
  return metadata;
}

// arXiv Metadata Fetching
async function fetchArxivMetadata(arxivId) {
  try {
    console.log('Fetching metadata for arXiv:', arxivId);
    
    // Use arXiv API
    const response = await fetch(`https://export.arxiv.org/api/query?id_list=${arxivId}`);
    
    if (!response.ok) {
      console.error('arXiv API request failed:', response.status, response.statusText);
      return null;
    }
    
    const text = await response.text();
    console.log('arXiv API response received, length:', text.length);
    
    // Parse XML using text methods (DOMParser not available in service worker)
    const result = parseArxivXML(text, arxivId);
    console.log('arXiv metadata result:', result);
    return result;
  } catch (error) {
    console.error('Error fetching arXiv metadata:', error);
    return null;
  }
}

function parseArxivXML(xmlText, arxivId) {
  try {
    // Extract title from entry (not the query title)
    // Look for <entry> section first, then find title within it
    const entryMatch = xmlText.match(/<entry[^>]*>(.*?)<\/entry>/s);
    let title = '';
    if (entryMatch) {
      const entryContent = entryMatch[1];
      const titleMatch = entryContent.match(/<title[^>]*>(.*?)<\/title>/s);
      title = titleMatch ? titleMatch[1].trim() : '';
    }
    
    // Extract authors - look for all author name elements within entry
    let authors = [];
    if (entryMatch) {
      const entryContent = entryMatch[1];
      const authorMatches = entryContent.match(/<author[^>]*>.*?<name[^>]*>(.*?)<\/name>.*?<\/author>/gs);
      if (authorMatches) {
        authors = authorMatches.map(match => {
          const nameMatch = match.match(/<name[^>]*>(.*?)<\/name>/s);
          return nameMatch ? nameMatch[1].trim() : '';
        }).filter(name => name);
      }
    }
    
    // Extract publication date from entry
    let publishDate = '';
    if (entryMatch) {
      const entryContent = entryMatch[1];
      const publishedMatch = entryContent.match(/<published[^>]*>(.*?)<\/published>/s);
      if (publishedMatch) {
        const date = new Date(publishedMatch[1].trim());
        publishDate = date.toISOString().split('T')[0];
      }
    }
    
    // Extract abstract/summary from entry
    let abstract = '';
    if (entryMatch) {
      const entryContent = entryMatch[1];
      const summaryMatch = entryContent.match(/<summary[^>]*>(.*?)<\/summary>/s);
      abstract = summaryMatch ? summaryMatch[1].trim() : '';
    }
    
    // Check if we found any entry data
    if (!title && authors.length === 0) {
      console.error('No arXiv entry data found in XML');
      return null;
    }
    
    const metadata = {
      title: title,
      author: authors.join(', '),
      publishDate: publishDate,
      abstract: abstract,
      arxivId: arxivId, // Keep for backward compatibility
      contentType: 'preprint',
      arxivMetadata: true, // Keep for backward compatibility
      sourceIdentifier: { type: 'arXiv', value: arxivId },
      identifiers: [{ type: 'arXiv', value: arxivId }]
    };
    
    return metadata;
  } catch (error) {
    console.error('Error parsing arXiv XML:', error);
    return null;
  }
}


function mapCSLTypeToContentType(cslType) {
  const mapping = {
    // CrossRef API types
    'journal-article': 'journal-article',
    'book-chapter': 'book-chapter',
    'book': 'book',
    'monograph': 'monograph',
    'report': 'report',
    'thesis': 'thesis',
    'conference-paper': 'conference-paper',
    'proceedings-article': 'proceedings-article',
    'dataset': 'dataset',
    'reference-entry': 'reference-entry',
    'posted-content': 'preprint',
    'dissertation': 'dissertation',
    
    // CSL JSON types
    'article-journal': 'journal-article',
    'article-magazine': 'article-magazine',
    'article-newspaper': 'article-newspaper',
    'chapter': 'book-chapter',
    'paper-conference': 'conference-paper',
    'webpage': 'webpage',
    'post-weblog': 'webpage',
    'post': 'webpage',
    'manuscript': 'preprint',
    'interview': 'interview',
    'personal_communication': 'personal-communication',
    'speech': 'speech',
    'treaty': 'treaty',
    'legal_case': 'legal-case',
    'legislation': 'legislation',
    'entry-dictionary': 'book-chapter',
    'entry-encyclopedia': 'book-chapter',
    
    // Legacy mappings for backwards compatibility
    'news-article': 'article-newspaper',
    'encyclopedia-article': 'book-chapter',
    'social-media-post': 'webpage',
    'website': 'webpage',
    'other': 'webpage',
    'academic-article': 'journal-article',
    'blog-post': 'webpage',
    'magazine-article': 'article-magazine',
    'newspaper-article': 'article-newspaper'
  };
  
  return mapping[cslType] || 'webpage';
}

async function enhanceMetadataWithDOI(url, metadata) {
  try {
    // First check if metadata already has a DOI
    let doi = metadata.doi;
    
    // If not, try to extract from URL
    if (!doi) {
      doi = extractDOIFromURL(url);
    }
    
    if (!doi) {
      return metadata; // No DOI found
    }

    // Fetch DOI metadata
    const doiMetadata = await fetchDOIMetadata(doi);
    
    if (!doiMetadata) {
      return metadata; // Failed to fetch
    }

    // Merge metadata with DOI data taking precedence
    const enhancedMetadata = {
      ...metadata,
      ...doiMetadata,
      // Preserve some original metadata that might be more specific
      url: metadata.url || url,
      timestamp: metadata.timestamp
    };

    console.log('Enhanced metadata with DOI:', enhancedMetadata);
    return enhancedMetadata;
  } catch (e) {
    console.error('Error enhancing metadata with DOI:', e);
    return metadata;
  }
}

// New DOI-first metadata processing function
async function processMetadataWithDOIPriority(url, extractedMetadata) {
  try {
    console.log('Processing metadata with DOI priority for:', url);
    
    // Step 1: Check if content script found a DOI
    let doi = extractedMetadata.doi;
    let doiMetadata = null;
    
    // Step 2: If no DOI from content, try extracting from URL
    if (!doi) {
      console.log('No DOI from content script, trying URL extraction...');
      doi = extractDOIFromURL(url);
      if (doi) {
        console.log(`DOI extracted from URL: ${doi}`);
        extractedMetadata.doi = doi;
      }
    }
    
    // Step 3: If we have a DOI, fetch metadata from DOI API
    if (doi) {
      console.log(`Fetching DOI metadata for: ${doi}`);
      doiMetadata = await fetchDOIMetadata(doi);
      
      if (doiMetadata) {
        console.log('Successfully fetched DOI metadata, using it as primary source');
        
        // Use DOI metadata as primary source, fill gaps with extracted metadata
        const finalMetadata = {
          ...extractedMetadata, // Base metadata from page extraction
          ...doiMetadata,       // DOI metadata takes precedence
          
          // Always preserve these from original
          url: extractedMetadata.url || url,
          timestamp: extractedMetadata.timestamp,
          
          // Fill gaps where DOI API didn't provide data
          title: doiMetadata.title || extractedMetadata.title,
          author: doiMetadata.author || extractedMetadata.author,
          publishDate: doiMetadata.publishDate || doiMetadata.date || extractedMetadata.publishDate,
          journal: doiMetadata.journal || extractedMetadata.journal,
          publicationInfo: doiMetadata.publicationInfo || extractedMetadata.publicationInfo,
          pages: doiMetadata.pages || extractedMetadata.pages,
          contentType: doiMetadata.contentType || extractedMetadata.contentType,
          
          // Mark the extraction source priority
          extractionSource: 'doi-primary',
          doiApiSuccess: true
        };
        
        console.log('Final metadata (DOI-primary):', finalMetadata);
        return finalMetadata;
      } else {
        console.log('Failed to fetch DOI metadata, using extracted metadata with DOI');
        extractedMetadata.extractionSource = 'extracted-with-doi';
        extractedMetadata.doiApiSuccess = false;
      }
    } else {
      console.log('No DOI found, using extracted metadata only');
      extractedMetadata.extractionSource = 'extracted-only';
    }
    
    // If no DOI or DOI fetch failed, return extracted metadata
    return extractedMetadata;
    
  } catch (e) {
    console.error('Error in processMetadataWithDOIPriority:', e);
    return extractedMetadata;
  }
}


function getExistingNoteForUrl(url) {
  if (!currentSession) return null;
  
  // Check searches first
  for (let i = currentSession.searches.length - 1; i >= 0; i--) {
    const search = currentSession.searches[i];
    if (search.url === url && search.notes && search.notes.length > 0) {
      // Return the most recent note
      return search.notes[search.notes.length - 1].content;
    }
  }
  
  // Check page visits
  for (let i = currentSession.pageVisits.length - 1; i >= 0; i--) {
    const visit = currentSession.pageVisits[i];
    if (visit.url === url && visit.notes && visit.notes.length > 0) {
      // Return the most recent note
      return visit.notes[visit.notes.length - 1].content;
    }
  }
  
  // Also check in the general pages array
  if (currentSession.pages) {
    for (let i = currentSession.pages.length - 1; i >= 0; i--) {
      const page = currentSession.pages[i];
      if (page.url === url && page.notes && page.notes.length > 0) {
        // Return the most recent note
        return page.notes[page.notes.length - 1].content;
      }
    }
  }
  
  return null;
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
      
      // Replace existing note or add new one (only one note per item)
      search.notes = [noteObj];
      
      // Also update in events array - find the search event
      for (let j = currentSession.events.length - 1; j >= 0; j--) {
        const event = currentSession.events[j];
        if (event.type === 'search' && event.url === url) {
          if (!event.notes) {
            event.notes = [];
          }
          event.notes = [noteObj];
          
          // Add a note_added property to the event to indicate it has notes
          event.has_notes = true;
          
          console.log(`Updated note for search: ${search.query}`);
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
        
        // Replace existing note or add new one (only one note per item)
        visit.notes = [noteObj];
        
        // Also update in events array - find the page visit event
        for (let j = currentSession.events.length - 1; j >= 0; j--) {
          const event = currentSession.events[j];
          if (event.type === 'pageVisit' && event.url === url) {
            if (!event.notes) {
              event.notes = [];
            }
            event.notes = [noteObj];
            
            // Add a note_added property to the event to indicate it has notes
            event.has_notes = true;
            
            console.log(`Updated note for page visit: ${visit.title}`);
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
  try {
    // Get sessions from IndexedDB
    const sessionSummaries = await researchTrackerDB.getAllSessions();
    return sessionSummaries;
  } catch (error) {
    console.error('Failed to get sessions from IndexedDB:', error);
    // Fall back to chrome.storage if IndexedDB fails
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.SESSIONS], (result) => {
        const sessions = result[STORAGE_KEYS.SESSIONS] || [];
        // Filter out null/corrupted sessions and return summary info only
        const sessionSummaries = sessions
          .filter(session => session && session.id) // Skip null or invalid sessions
          .map(session => ({
            id: session.id,
            name: session.name || `Research Session ${new Date(session.startTime).toLocaleDateString()}`,
            startTime: session.startTime,
            endTime: session.endTime,
            events: session.events ? session.events.length : 0,
            searches: session.searches ? session.searches.length : 0,
            pageVisits: session.pageVisits ? session.pageVisits.length : 0
          }));
        
        resolve(sessionSummaries);
      });
    });
  }
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
  try {
    // Delete from IndexedDB
    await researchTrackerDB.deleteSession(sessionId);
    return Promise.resolve();
  } catch (error) {
    console.error('Failed to delete session from IndexedDB:', error);
    // Fall back to chrome.storage if IndexedDB fails
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
}

async function exportSession(sessionId, format = 'json') {
  return new Promise(async (resolve, reject) => {
    try {
      // Try to get session from IndexedDB first
      let session = await researchTrackerDB.getSession(sessionId);
      
      if (!session) {
        // Fall back to chrome.storage if not found in IndexedDB
        chrome.storage.local.get([STORAGE_KEYS.SESSIONS], (result) => {
          const sessions = result[STORAGE_KEYS.SESSIONS] || [];
          session = sessions.find(s => s.id === sessionId);
          
          if (!session) {
            reject('Session not found');
            return;
          }
          
          processSessionForExport(session, format, resolve, reject);
        });
        return;
      }
      
      processSessionForExport(session, format, resolve, reject);
    } catch (error) {
      console.error('Failed to get session from IndexedDB:', error);
      reject(error);
    }
  });
}

// Helper function to process session for export
function processSessionForExport(session, format, resolve, reject) {
  chrome.storage.local.get([STORAGE_KEYS.METADATA_OBJECTS], async (result) => {
    const metadataObjects = result[STORAGE_KEYS.METADATA_OBJECTS] || {};
    
    // Deep clone the session to avoid modifying the original
    session = JSON.parse(JSON.stringify(session));
    
    if (!session) {
      reject('Session not found');
      return;
    }
      
      // Resolve metadata objects for page visits
      if (session.pageVisits) {
        session.pageVisits = session.pageVisits.map(visit => {
          if (visit.metadataId && metadataObjects[visit.metadataId]) {
            const metadataObj = metadataObjects[visit.metadataId];
            const sessionData = metadataObj.sessions[sessionId] || {};
            
            // Merge metadata with session-specific notes
            return {
              ...visit,
              metadata: metadataObj.metadata,
              notes: [...(visit.notes || []), ...(sessionData.notes || [])]
            };
          } else {
            // Legacy page visit without metadata object
            return visit;
          }
        });
      }
      
      // Resolve metadata objects for events
      if (session.events) {
        session.events = session.events.map(event => {
          if (event.type === 'pageVisit' && event.metadataId && metadataObjects[event.metadataId]) {
            const metadataObj = metadataObjects[event.metadataId];
            const sessionData = metadataObj.sessions[sessionId] || {};
            
            // Merge metadata with session-specific notes
            return {
              ...event,
              metadata: metadataObj.metadata,
              notes: [...(event.notes || []), ...(sessionData.notes || [])]
            };
          } else {
            // Legacy event or non-pageVisit event
            return event;
          }
        });
      }
      
      // Deduplicate notes in searches
      if (session.searches) {
        session.searches.forEach(search => {
          if (search.notes && search.notes.length > 1) {
            search.notes = deduplicateNotes(search.notes);
          }
        });
      }
      
      // Deduplicate notes in page visits (after metadata resolution)
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
        
        resolve({
          data: JSON.stringify(exportData, null, 2),
          sessionName: exportData.name,
          sessionId: session.id
        });
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
        
        resolve({
          data: text,
          sessionName: sessionName,
          sessionId: session.id
        });
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

// Cleanup function to clear corrupted data from chrome.storage
async function clearCorruptedData() {
  return new Promise((resolve, reject) => {
    console.log('Starting cleanup of corrupted data...');
    
    chrome.storage.local.get([STORAGE_KEYS.SESSIONS], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error reading storage:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      
      const sessions = result[STORAGE_KEYS.SESSIONS] || [];
      console.log(`Found ${sessions.length} sessions in chrome.storage`);
      
      // Filter out corrupted sessions
      const validSessions = sessions.filter(session => {
        if (!session || !session.id) {
          console.log('Removing corrupted session (null or missing ID)');
          return false;
        }
        if (!validateSessionData(session)) {
          console.log('Removing invalid session:', session.id);
          return false;
        }
        return true;
      });
      
      console.log(`${validSessions.length} valid sessions remaining`);
      
      // Clear the sessions array in chrome.storage since we're moving to IndexedDB
      chrome.storage.local.remove([STORAGE_KEYS.SESSIONS], () => {
        if (chrome.runtime.lastError) {
          console.error('Error clearing sessions:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log('Successfully cleared sessions from chrome.storage');
          resolve({ removed: sessions.length - validSessions.length, valid: validSessions });
        }
      });
    });
  });
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