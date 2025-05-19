// Storage keys
const STORAGE_KEYS = {
  IS_RECORDING: 'isRecording',
  CURRENT_SESSION: 'currentSession',
  SESSIONS: 'sessions'
};

// State management
let isRecording = false;
let currentSession = null;

// Rate limiting for adding notes
let lastNoteTimestamp = 0;
const NOTE_RATE_LIMIT_MS = 3000; // 3 seconds

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
});

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
    [STORAGE_KEYS.CURRENT_SESSION]: currentSession
  });
  
  // Set up listeners
  setupRecordingListeners();
}

function stopRecording() {
  return new Promise((resolve) => {
    if (!isRecording) {
      resolve(false);
      return;
    }
    
    isRecording = false;
    
    if (currentSession) {
      currentSession.endTime = new Date().toISOString();
      
      // Save session to storage
      chrome.storage.local.get([STORAGE_KEYS.SESSIONS], (result) => {
        const sessions = result[STORAGE_KEYS.SESSIONS] || [];
        sessions.push(currentSession);
        
        chrome.storage.local.set({ 
          [STORAGE_KEYS.IS_RECORDING]: false,
          [STORAGE_KEYS.SESSIONS]: sessions,
          [STORAGE_KEYS.CURRENT_SESSION]: null
        }, () => {
          // After the session is saved, finalize cleanup
          const savedSession = { ...currentSession };
          currentSession = null;
          
          // Remove listeners
          removeRecordingListeners();
          
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
  chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_SESSION]: currentSession });
  
  // We don't change isRecording, just pause event collection
}

function resumeRecording() {
  if (!isRecording || !currentSession) return;
  
  currentSession.isPaused = false;
  chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_SESSION]: currentSession });
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
  
  chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_SESSION]: currentSession });
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
  
  chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_SESSION]: currentSession });
}

function updatePageVisitMetadata(url, metadata) {
  if (!currentSession) return;
  
  // Find the page visit for this URL (most recent first)
  for (let i = currentSession.pageVisits.length - 1; i >= 0; i--) {
    const visit = currentSession.pageVisits[i];
    if (visit.url === url) {
      // Update with metadata
      currentSession.pageVisits[i] = {
        ...visit,
        metadata
      };
      
      // Also update in events array
      for (let j = currentSession.events.length - 1; j >= 0; j--) {
        const event = currentSession.events[j];
        if (event.type === 'pageVisit' && event.url === url) {
          currentSession.events[j] = {
            ...event,
            metadata
          };
          break;
        }
      }
      
      chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_SESSION]: currentSession });
      break;
    }
  }
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
  
  // Save the updated session
  chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_SESSION]: currentSession });
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
          
          if (visit.metadata && visit.metadata.author) {
            text += `   Author: ${visit.metadata.author}\n`;
          }
          
          if (visit.metadata && visit.metadata.publishDate) {
            text += `   Published: ${visit.metadata.publishDate}\n`;
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
          } else if (event.type === 'pageVisit') {
            text += `${time} - Visit: ${event.title || 'Untitled'}\n`;
          } else if (event.type === 'note') {
            text += `${time} - Note added: "${event.content.substring(0, 50)}${event.content.length > 50 ? '...' : ''}"\n`;
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