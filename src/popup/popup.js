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
let sessionsList;
let noSessionsMsg;

// Window control elements
let popoutBtn;
let isPopout = false;

// Action buttons
let viewPagesBtn;
let viewSearchesBtn;

// Metadata Modal Elements
let metadataModal;
let metadataTitle;
let metadataAuthor;
let metadataDate;
let metadataType;
let metadataJournal;
let metadataPublicationInfo;
let metadataPages;
let metadataDoi;
let metadataQuals;
let metadataInfo;
let saveMetadataBtn;
let cancelMetadataBtn;
let closeMetadataBtn;
let fillFromDoiBtn;

// DOI Input Modal Elements
let doiInputModal;
let doiInput;
let fetchDoiBtn;
let cancelDoiBtn;
let closeDoiModalBtn;

// Note Modal Elements
let noteModal;
let noteTargetEl;
let noteInput;
let saveNoteBtn;
let cancelNoteBtn;
let closeNoteModalBtn;

// Pages Modal Elements
let pagesModal;
let closePagesModalBtn;
let closePagesBtn;

// Searches Modal Elements
let searchesModal;
let closeSearchesModalBtn;
let closeSearchesBtn;

// Settings Modal Elements
let settingsBtn;
let settingsModal;
let closeSettingsModalBtn;
let citationFormatSelect;
let customFormatSection;
let customFormatTemplate;
let citationPreviewEnabled;
let excludedDomainsInput;
let replaceUrlWithDoiCheckbox;
let replaceDatabaseUrlsCheckbox;
let customDatabaseDomainsInput;
let saveSettingsBtn;
let cancelSettingsBtn;
let exportAllMetadataBtn;
let clearAllMetadataBtn;

// Help Modal Elements
let helpBtn;
let helpModal;
let closeHelpModalBtn;
let closeHelpBtn;

// Current session state
let selectedPageUrl = null;
let addNoteInProgress = false;

// State
let isRecording = false;
let isPaused = false;
let currentSession = null;
let currentUrl = null;
let citationSettings = { 
  format: 'apa', 
  customTemplate: '', 
  previewEnabled: false, 
  excludedDomains: 'annas-archive.org, libgen.is, sci-hub.se, library.dartmouth.edu',
  replaceUrlWithDoi: false,
  replaceDatabaseUrls: false,
  customDatabaseDomains: ''
};

// Modal management system
let modalStack = [];

// Pending edits preservation
const PENDING_EDITS_KEY = 'pendingMetadataEdits';
let hasPendingEdits = false;

// Helper functions for modal management
function showModal(modal, type) {
  // Add current modal to stack if there's one already visible
  if (pagesModal.style.display === 'flex') {
    modalStack.push('pages');
    pagesModal.classList.add('hidden');
    pagesModal.style.display = 'none';
  } else if (searchesModal.style.display === 'flex') {
    modalStack.push('searches');
    searchesModal.classList.add('hidden');
    searchesModal.style.display = 'none';
  } else if (noteModal.style.display === 'flex') {
    modalStack.push('note');
    noteModal.classList.add('hidden');
    noteModal.style.display = 'none';
  } else if (metadataModal.style.display === 'flex') {
    modalStack.push('metadata');
    metadataModal.classList.add('hidden');
    metadataModal.style.display = 'none';
  } else if (settingsModal && settingsModal.style.display === 'flex') {
    modalStack.push('settings');
    settingsModal.classList.add('hidden');
    settingsModal.style.display = 'none';
  } else if (helpModal && helpModal.style.display === 'flex') {
    modalStack.push('help');
    helpModal.classList.add('hidden');
    helpModal.style.display = 'none';
  } else if (doiInputModal && doiInputModal.style.display === 'flex') {
    modalStack.push('doi-input');
    doiInputModal.classList.add('hidden');
    doiInputModal.style.display = 'none';
  }
  
  // Show the new modal
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  
  console.log('Modal stack after showing:', modalStack);
}

function hideCurrentModal() {
  if (pagesModal.style.display === 'flex') {
    pagesModal.classList.add('hidden');
    pagesModal.style.display = 'none';
  } else if (searchesModal.style.display === 'flex') {
    searchesModal.classList.add('hidden');
    searchesModal.style.display = 'none';
  } else if (noteModal.style.display === 'flex') {
    noteModal.classList.add('hidden');
    noteModal.style.display = 'none';
  } else if (metadataModal.style.display === 'flex') {
    metadataModal.classList.add('hidden');
    metadataModal.style.display = 'none';
  } else if (settingsModal && settingsModal.style.display === 'flex') {
    settingsModal.classList.add('hidden');
    settingsModal.style.display = 'none';
  } else if (helpModal && helpModal.style.display === 'flex') {
    helpModal.classList.add('hidden');
    helpModal.style.display = 'none';
  } else if (doiInputModal && doiInputModal.style.display === 'flex') {
    doiInputModal.classList.add('hidden');
    doiInputModal.style.display = 'none';
  }
  
  // If there's a previous modal in the stack, show it
  if (modalStack.length > 0) {
    const previousModal = modalStack.pop();
    
    if (previousModal === 'pages') {
      pagesModal.classList.remove('hidden');
      pagesModal.style.display = 'flex';
    } else if (previousModal === 'searches') {
      searchesModal.classList.remove('hidden');
      searchesModal.style.display = 'flex';
    } else if (previousModal === 'note') {
      noteModal.classList.remove('hidden');
      noteModal.style.display = 'flex';
    } else if (previousModal === 'metadata') {
      metadataModal.classList.remove('hidden');
      metadataModal.style.display = 'flex';
    } else if (previousModal === 'settings') {
      settingsModal.classList.remove('hidden');
      settingsModal.style.display = 'flex';
    } else if (previousModal === 'help') {
      helpModal.classList.remove('hidden');
      helpModal.style.display = 'flex';
    } else if (previousModal === 'doi-input') {
      doiInputModal.classList.remove('hidden');
      doiInputModal.style.display = 'flex';
    }
  }
  
  console.log('Modal stack after hiding:', modalStack);
}

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
  sessionsList = document.getElementById('sessions-list');
  noSessionsMsg = document.getElementById('no-sessions-msg');
  
  // Initialize window control elements
  popoutBtn = document.getElementById('popout-btn');
  
  // Initialize metadata modal elements
  metadataModal = document.getElementById('metadata-modal');
  metadataTitle = document.getElementById('metadata-title');
  metadataAuthor = document.getElementById('metadata-author');
  metadataDate = document.getElementById('metadata-date');
  metadataType = document.getElementById('metadata-type');
  metadataJournal = document.getElementById('metadata-journal');
  metadataPublicationInfo = document.getElementById('metadata-publication-info');
  metadataPages = document.getElementById('metadata-pages');
  metadataDoi = document.getElementById('metadata-doi');
  metadataQuals = document.getElementById('metadata-quals');
  metadataInfo = document.getElementById('metadata-info');
  saveMetadataBtn = document.getElementById('save-metadata-btn');
  cancelMetadataBtn = document.getElementById('cancel-metadata-btn');
  closeMetadataBtn = document.querySelector('.close-modal');
  fillFromDoiBtn = document.getElementById('fill-from-doi-btn');
  
  // Initialize DOI input modal elements
  doiInputModal = document.getElementById('doi-input-modal');
  doiInput = document.getElementById('doi-input');
  fetchDoiBtn = document.getElementById('fetch-doi-btn');
  cancelDoiBtn = document.getElementById('cancel-doi-btn');
  closeDoiModalBtn = document.querySelector('.close-doi-modal');
  
  // Initialize note modal elements
  noteModal = document.getElementById('note-modal');
  saveNoteBtn = document.getElementById('save-note-btn');
  cancelNoteBtn = document.getElementById('cancel-note-btn');
  closeNoteModalBtn = document.querySelector('.close-note-modal');
  
  // Initialize pages modal elements
  pagesModal = document.getElementById('pages-modal');
  closePagesModalBtn = document.querySelector('.close-pages-modal');
  closePagesBtn = document.getElementById('close-pages-btn');
  
  // Initialize searches modal elements
  searchesModal = document.getElementById('searches-modal');
  closeSearchesModalBtn = document.querySelector('.close-searches-modal');
  closeSearchesBtn = document.getElementById('close-searches-btn');
  
  // Initialize settings modal elements
  settingsBtn = document.getElementById('settings-btn');
  settingsModal = document.getElementById('settings-modal');
  closeSettingsModalBtn = document.querySelector('.close-settings-modal');
  citationFormatSelect = document.getElementById('citation-format');
  customFormatSection = document.getElementById('custom-format-section');
  customFormatTemplate = document.getElementById('custom-format-template');
  citationPreviewEnabled = document.getElementById('citation-preview-enabled');
  excludedDomainsInput = document.getElementById('excluded-domains');
  replaceUrlWithDoiCheckbox = document.getElementById('replace-url-with-doi');
  replaceDatabaseUrlsCheckbox = document.getElementById('replace-database-urls');
  customDatabaseDomainsInput = document.getElementById('custom-database-domains');
  saveSettingsBtn = document.getElementById('save-settings-btn');
  cancelSettingsBtn = document.getElementById('cancel-settings-btn');
  exportAllMetadataBtn = document.getElementById('export-all-metadata-btn');
  clearAllMetadataBtn = document.getElementById('clear-all-metadata-btn');
  
  // Initialize help modal elements
  helpBtn = document.getElementById('help-btn');
  helpModal = document.getElementById('help-modal');
  closeHelpModalBtn = document.querySelector('.close-help-modal');
  closeHelpBtn = document.getElementById('close-help-btn');
  
  // Action buttons
  viewPagesBtn = document.getElementById('view-pages-btn');
  viewSearchesBtn = document.getElementById('view-searches-btn');

  // Add event listeners for controls
  startBtn.addEventListener('click', startRecording);
  pauseBtn.addEventListener('click', togglePauseRecording);
  stopBtn.addEventListener('click', stopRecording);
  
  // Popout functionality removed
  // popoutBtn.addEventListener('click', togglePopout);
  
  /* Popout functionality removed
  // Check if we're already in a popup window
  chrome.runtime.sendMessage({ action: 'getWindowInfo' }, (response) => {
    console.log('getWindowInfo response:', response);
    
    if (chrome.runtime.lastError) {
      console.error('Error checking window info:', chrome.runtime.lastError);
      return;
    }
    
    if (response && response.isPopout) {
      console.log('This is a popup window');
      isPopout = true;
      popoutBtn.classList.add('active');
    } else {
      console.log('This is a regular extension popup');
      isPopout = false;
      popoutBtn.classList.remove('active');
    }
  });
  */
  
  // Always set to false since popout is disabled
  isPopout = false;
  
  // Add event listeners for action buttons
  viewPagesBtn.addEventListener('click', openPagesModal);
  viewSearchesBtn.addEventListener('click', openSearchesModal);
  
  // Metadata modal event listeners
  saveMetadataBtn.addEventListener('click', saveMetadata);
  cancelMetadataBtn.addEventListener('click', closeMetadataModal);
  closeMetadataBtn.addEventListener('click', closeMetadataModal);
  fillFromDoiBtn.addEventListener('click', openDoiInputModal);
  
  // DOI input modal event listeners
  fetchDoiBtn.addEventListener('click', fetchFromDoi);
  cancelDoiBtn.addEventListener('click', closeDoiInputModal);
  closeDoiModalBtn.addEventListener('click', closeDoiInputModal);
  
  // Note modal event listeners
  saveNoteBtn.addEventListener('click', saveNote);
  cancelNoteBtn.addEventListener('click', closeNoteModal);
  closeNoteModalBtn.addEventListener('click', closeNoteModal);
  
  // Pages modal event listeners
  closePagesBtn.addEventListener('click', closePagesModal);
  closePagesModalBtn.addEventListener('click', closePagesModal);
  
  // Searches modal event listeners
  closeSearchesBtn.addEventListener('click', closeSearchesModal);
  closeSearchesModalBtn.addEventListener('click', closeSearchesModal);
  
  // Settings button and modal event listeners
  settingsBtn.addEventListener('click', () => {
    showModal(settingsModal, 'settings');
    loadCitationSettings();
  });
  
  closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
  cancelSettingsBtn.addEventListener('click', closeSettingsModal);
  saveSettingsBtn.addEventListener('click', saveCitationSettings);
  exportAllMetadataBtn.addEventListener('click', exportAllMetadata);
  clearAllMetadataBtn.addEventListener('click', clearAllMetadata);
  
  // Add change listeners to metadata fields for auto-save detection
  const metadataFields = [
    metadataTitle, metadataAuthor, metadataDate, metadataType,
    metadataJournal, metadataPublicationInfo, metadataPages, 
    metadataDoi, metadataQuals
  ];
  
  metadataFields.forEach(field => {
    field.addEventListener('input', () => {
      // Debounced auto-save pending edits
      clearTimeout(field.saveTimeout);
      field.saveTimeout = setTimeout(() => {
        if (selectedPageUrl && !metadataModal.classList.contains('hidden')) {
          savePendingEdits(selectedPageUrl);
        }
      }, 500); // Save after half a second of no typing
    });
  });
  
  // Help button and modal event listeners
  helpBtn.addEventListener('click', () => {
    showModal(helpModal, 'help');
  });
  
  closeHelpModalBtn.addEventListener('click', closeHelpModal);
  closeHelpBtn.addEventListener('click', closeHelpModal);
  
  // Citation format dropdown change handler
  citationFormatSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      customFormatSection.style.display = 'block';
    } else {
      customFormatSection.style.display = 'none';
    }
  });
  
  // Update activity status when interacting with the popup
  document.addEventListener('click', updateActivityStatus);
  document.addEventListener('keydown', updateActivityStatus);
  
  // Add window unload handler to make sure data is saved before popup closes
  window.addEventListener('beforeunload', () => {
    // Save any pending notes
    if (isRecording && noteInput.value.trim() !== '' && selectedPageUrl) {
      // Send a message to save the current note before closing
      chrome.runtime.sendMessage({ 
        action: 'forceAutosave'
      });
    }
  });
  
  // Close modals when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === metadataModal) closeMetadataModal();
    if (event.target === noteModal) closeNoteModal();
    if (event.target === pagesModal) closePagesModal();
    if (event.target === searchesModal) closeSearchesModal();
    if (event.target === settingsModal) closeSettingsModal();
    if (event.target === helpModal) closeHelpModal();
  });
  
  // Save pending edits when popup is about to close
  window.addEventListener('beforeunload', () => {
    if (selectedPageUrl) {
      savePendingEdits(selectedPageUrl);
    }
  });
  
  // Add click handler for session renaming
  currentSessionName.addEventListener('click', renameCurrentSession);
  
  // Update activity when popup opens
  updateActivityStatus();
  
  // Get current status
  console.log('Popup: Initializing - getting current status...');
  refreshStatus();
  
  // Get current URL for adding notes
  getCurrentTabUrl();
  
  // Load previous sessions
  loadSessionsAndDisplay();
  
  // Load citation settings
  loadCitationSettings();
  
  // Check for and restore any pending editing session
  checkAndRestorePendingSession();
  
  // Check if we were asked to open metadata modal for a specific URL
  checkForPendingEditRequest();
}

// Function to update activity status in the background
function updateActivityStatus() {
  chrome.runtime.sendMessage({ 
    action: 'checkActivity'
  });
}

function refreshStatus(resetSelection = false) {
  if (resetSelection) {
    // Clear the selected URL when requested (e.g., after adding a note)
    selectedPageUrl = null;
  }

  console.log('Popup: Requesting status from background...');
  chrome.runtime.sendMessage({ action: 'getStatus' }, response => {
    if (chrome.runtime.lastError) {
      console.error('Popup: Error getting status:', chrome.runtime.lastError);
      return;
    }
    
    console.log('Popup: Received status response:', response);
    updateUI(response);
  });
}

function updateUI(status) {
  isRecording = status.isRecording;
  currentSession = status.currentSession;
  
  if (isRecording && currentSession) {
    // Update current page display only when recording
    updatePageDisplay(currentUrl);
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
    
    // Reset button text in case they were stuck in loading states
    startBtn.textContent = 'Record';
    stopBtn.textContent = 'Stop';
    
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
    
    // Display session name (clickable for renaming)
    currentSessionName.textContent = currentSession.name;
    currentSessionName.title = "Click to rename session";
    currentSessionName.style.cursor = "pointer";
    
    // Update history
    updateRecent(currentSession.recentPages, currentSession.recentSearches);
    
    // Show current session section
    currentSessionSection.classList.remove('hidden');
    
    // Show current page section when recording
    const currentPageSection = document.getElementById('current-page-section');
    if (currentPageSection) {
      currentPageSection.classList.remove('hidden');
    }
  } else {
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    
    // Reset button text when not recording
    startBtn.textContent = 'Record';
    pauseBtn.textContent = 'Pause';
    stopBtn.textContent = 'Stop';
    
    // Show session name input when not recording
    sessionNameInputContainer.style.display = 'block';
    
    recordingStatus.textContent = 'Not Recording';
    recordingStatus.className = 'recording-stopped';
    
    // Reset URL selection
    selectedPageUrl = null;
    
    // Hide current session section
    currentSessionSection.classList.add('hidden');
    
    // Hide current page section when not recording
    const currentPageSection = document.getElementById('current-page-section');
    if (currentPageSection) {
      currentPageSection.classList.add('hidden');
    }
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
      
      // Check if this is a search page first
      chrome.runtime.sendMessage({
        action: 'checkIfSearchPage',
        url: tab.url
      }, (searchResponse) => {
        const isSearchPage = searchResponse && searchResponse.isSearch;
        const searchQuery = searchResponse && searchResponse.query;
        
        // Get metadata if available
        chrome.runtime.sendMessage({
          action: 'getPageMetadata',
          url: tab.url
        }, (response) => {
          const metadata = (response && response.success && response.metadata) ? response.metadata : {};
          
          // Determine the page title
          let pageTitle;
          if (isSearchPage && searchQuery) {
            pageTitle = `Search: "${searchQuery}"`;
          } else {
            pageTitle = metadata.title || tab.title || 'Untitled';
          }
          
          // Determine which buttons to show
          const noteButton = isRecording ? '<button class="page-action-btn add-note-btn">Add Note</button>' : '';
          let actionButtons;
          
          if (isSearchPage) {
            // For search pages, only show Add Note button
            actionButtons = `
              <div class="page-actions">
                ${noteButton}
              </div>
            `;
          } else {
            // For regular pages, show all buttons
            actionButtons = `
              <div class="page-actions">
                ${noteButton}
                <button class="page-action-btn edit-metadata-btn">Edit Metadata</button>
                <button class="page-action-btn copy-citation-btn">Copy Citation</button>
              </div>
            `;
          }
          
          // Display current page
          currentPageEl.innerHTML = `
            <div class="page-title">${pageTitle}</div>
            <div class="page-url">${truncateUrl(tab.url)}</div>
            <div class="page-time">Current page</div>
            ${actionButtons}
          `;
          
          // Set up add note button handler (if recording)
          const addNoteBtn = currentPageEl.querySelector('.add-note-btn');
          if (addNoteBtn) {
            addNoteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            selectUrl(tab.url, pageTitle);
            document.querySelectorAll('.page-item.selected').forEach(el => {
              el.classList.remove('selected');
            });
            currentPageEl.classList.add('selected');
            
            // Open the note modal
            openNoteModal();
            });
          }
          
          // Set up edit metadata button handler (only for non-search pages)
          const editMetadataBtn = currentPageEl.querySelector('.edit-metadata-btn');
          if (editMetadataBtn) {
            editMetadataBtn.addEventListener('click', (e) => {
              e.stopPropagation(); // Prevent event bubbling
              selectUrl(tab.url, pageTitle);
              document.querySelectorAll('.page-item.selected').forEach(el => {
                el.classList.remove('selected');
              });
              currentPageEl.classList.add('selected');
              
              // Open the metadata modal
              openMetadataModal();
            });
          }
          
          // Set up copy citation button handler (only for non-search pages)
          const copyCitationBtn = currentPageEl.querySelector('.copy-citation-btn');
          if (copyCitationBtn) {
            copyCitationBtn.addEventListener('click', (e) => {
              e.stopPropagation(); // Prevent event bubbling
              copyCitation(tab.url, pageTitle, e.target);
            });
          }
        });
      });
      
      // The event handlers are now set up in the callback
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
      
      // First, get any metadata for this page
      chrome.runtime.sendMessage({
        action: 'getPageMetadata',
        url: page.url
      }, (response) => {
        const metadata = (response && response.success && response.metadata) ? response.metadata : {};
        const pageTitle = metadata.title || page.title || 'Untitled';
      
        const pageEl = document.createElement('div');
        pageEl.className = 'page-item';
        pageEl.innerHTML = `
          <div class="page-title">${pageTitle}</div>
          <div class="page-url">${truncateUrl(page.url)}</div>
          <div class="page-time">${formatTimeDifference(page.timestamp)}</div>
          <div class="page-actions">
            <button class="page-action-btn add-note-btn">Add Note</button>
            <button class="page-action-btn edit-metadata-btn">Edit Metadata</button>
          </div>
        `;
        
        // Add note button click handler
        pageEl.querySelector('.add-note-btn').addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent event bubbling
          selectUrl(page.url, pageTitle);
          
          // Mark this item as selected and remove selection from others
          document.querySelectorAll('.page-item.selected').forEach(el => {
            el.classList.remove('selected');
          });
          pageEl.classList.add('selected');
          
          // Focus the note textarea
          noteInput.focus();
        });
        
        // Add metadata button click handler
        pageEl.querySelector('.edit-metadata-btn').addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent event bubbling
          selectUrl(page.url, pageTitle);
          
          // Mark this item as selected and remove selection from others
          document.querySelectorAll('.page-item.selected').forEach(el => {
            el.classList.remove('selected');
          });
          pageEl.classList.add('selected');
          
          // Open the metadata modal
          openMetadataModal();
        });
        
        recentPagesEl.appendChild(pageEl);
      });
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
        <div class="page-actions">
          <button class="page-action-btn add-note-btn">Add Note</button>
          <button class="page-action-btn edit-metadata-btn">Edit Metadata</button>
        </div>
      `;
      
      // Add note button click handler
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
      
      // Add metadata button click handler
      searchEl.querySelector('.edit-metadata-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        selectUrl(search.url, `Search: "${search.query}"`);
        
        // Mark this item as selected and remove selection from others
        document.querySelectorAll('.page-item.selected').forEach(el => {
          el.classList.remove('selected');
        });
        searchEl.classList.add('selected');
        
        // Open the metadata modal
        openMetadataModal();
      });
      
      recentSearchesEl.appendChild(searchEl);
    });
  }
}

// Helper to select a URL for adding notes
function selectUrl(url, title) {
  // Clear pending edits if switching to a different URL
  if (selectedPageUrl && selectedPageUrl !== url) {
    clearPendingEdits();
  }
  
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

// Modal functions
function openNoteModal() {
  if (!selectedPageUrl && !currentUrl) {
    alert('No page selected to add a note for');
    return;
  }
  
  // Clear previous note text first
  noteInput.value = '';
  
  const targetUrl = selectedPageUrl || currentUrl;
  
  // Get existing note for this URL if any
  chrome.runtime.sendMessage({
    action: 'getExistingNote',
    url: targetUrl
  }, (noteResponse) => {
    // Set the existing note text if found
    if (noteResponse && noteResponse.success && noteResponse.note) {
      noteInput.value = noteResponse.note;
    }
    
    // Check if a title was already set by selectUrl() (e.g., for searches)
    const currentNoteTarget = noteTargetEl.textContent;
    const hasExistingTitle = currentNoteTarget && currentNoteTarget !== 'Selected Page' && currentNoteTarget !== 'Current Page';
    
    if (hasExistingTitle) {
      // Title was already set by selectUrl(), keep it and show the modal
      showModal(noteModal, 'note');
      noteInput.focus();
    } else {
      // No title set yet, get one from metadata/tab
      
      // Get metadata if available to get the best title
      chrome.runtime.sendMessage({
        action: 'getPageMetadata',
        url: targetUrl
      }, (response) => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          const tab = tabs[0];
          const metadata = (response && response.success && response.metadata) ? response.metadata : {};
          const pageTitle = metadata.title || (tab ? tab.title : 'Selected Page') || 'Selected Page';
          
          // Set the note target only if we don't have an existing title
          noteTargetEl.textContent = pageTitle;
          
          // Display the modal using our modal management system
          showModal(noteModal, 'note');
          
          // Focus the note input
          noteInput.focus();
        });
      });
    }
  });
}

function closeNoteModal() {
  hideCurrentModal();
}

function openPagesModal() {
  // Refresh the recent pages data
  if (currentSession && currentSession.recentPages) {
    updateRecentPages(currentSession.recentPages);
  }
  
  // Show the modal
  showModal(pagesModal, 'pages');
}

function closePagesModal() {
  hideCurrentModal();
}

function openSearchesModal() {
  // Refresh the recent searches data
  if (currentSession && currentSession.recentSearches) {
    updateRecentSearches(currentSession.recentSearches);
  }
  
  // Show the modal
  showModal(searchesModal, 'searches');
}

function closeSearchesModal() {
  hideCurrentModal();
}

// Helper to update recent pages display
// Function to rename the current active session
function renameCurrentSession() {
  if (!isRecording || !currentSession) {
    return; // Only works when recording is active
  }
  
  const currentName = currentSessionName.textContent;
  const newName = prompt('Enter a new name for this session:', currentName);
  
  if (newName && newName.trim() !== '' && newName !== currentName) {
    // Temporarily update UI
    currentSessionName.textContent = newName.trim();
    
    // Send request to update the session name
    chrome.runtime.sendMessage({
      action: 'renameCurrentSession',
      newName: newName.trim()
    }, response => {
      if (chrome.runtime.lastError) {
        console.error('Error renaming session:', chrome.runtime.lastError);
        // Revert to the old name on error
        currentSessionName.textContent = currentName;
        return;
      }
      
      if (response && response.success) {
        console.log('Session renamed successfully');
        // Name was updated in background.js, no need to update UI here
      } else {
        console.error('Failed to rename session:', response);
        // Revert to the old name
        currentSessionName.textContent = currentName;
      }
    });
  }
}

function updateRecentPages(recentPages) {
  // Clear existing elements
  recentPagesEl.innerHTML = '';
  
  if (!recentPages || recentPages.length === 0) {
    recentPagesEl.innerHTML = '<div class="page-item">No pages visited yet</div>';
    return;
  }
  
  // Add recent pages
  recentPages.forEach(page => {
    // First, get any metadata for this page
    chrome.runtime.sendMessage({
      action: 'getPageMetadata',
      url: page.url
    }, (response) => {
      const metadata = (response && response.success && response.metadata) ? response.metadata : {};
      const pageTitle = metadata.title || page.title || 'Untitled';
    
      const pageEl = document.createElement('div');
      pageEl.className = 'page-item';
      pageEl.innerHTML = `
        <div class="page-title">${pageTitle}</div>
        <div class="page-url">${truncateUrl(page.url)}</div>
        <div class="page-time">${formatTimeDifference(page.timestamp)}</div>
        <div class="page-actions">
          <button class="page-action-btn add-note-btn">Add Note</button>
          <button class="page-action-btn edit-metadata-btn">Edit Metadata</button>
          <button class="page-action-btn copy-citation-btn">Copy Citation</button>
        </div>
      `;
      
      // Add note button click handler
      pageEl.querySelector('.add-note-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        selectUrl(page.url, pageTitle);
        
        // Mark this item as selected and remove selection from others
        document.querySelectorAll('.page-item.selected').forEach(el => {
          el.classList.remove('selected');
        });
        pageEl.classList.add('selected');
        
        // Open the note modal using our modal management system
        openNoteModal();
      });
      
      // Add metadata button click handler
      pageEl.querySelector('.edit-metadata-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        selectUrl(page.url, pageTitle);
        
        // Mark this item as selected and remove selection from others
        document.querySelectorAll('.page-item.selected').forEach(el => {
          el.classList.remove('selected');
        });
        pageEl.classList.add('selected');
        
        // Open the metadata modal using our modal management system
        openMetadataModal();
      });
      
      // Add copy citation button click handler
      pageEl.querySelector('.copy-citation-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        copyCitation(page.url, pageTitle, e.target);
      });
      
      recentPagesEl.appendChild(pageEl);
    });
  });
}

// Helper to update recent searches display
function updateRecentSearches(recentSearches) {
  // Clear existing elements
  recentSearchesEl.innerHTML = '';
  
  if (!recentSearches || recentSearches.length === 0) {
    recentSearchesEl.innerHTML = '<div class="page-item">No searches yet</div>';
    return;
  }
  
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
      <div class="page-actions">
        <button class="page-action-btn add-note-btn">Add Note</button>
      </div>
    `;
    
    // Add note button click handler
    searchEl.querySelector('.add-note-btn').addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event bubbling
      selectUrl(search.url, `Search: "${search.query}"`);
      
      // Mark this item as selected and remove selection from others
      document.querySelectorAll('.page-item.selected').forEach(el => {
        el.classList.remove('selected');
      });
      searchEl.classList.add('selected');
      
      // Open the note modal using our modal management system
      openNoteModal();
    });
    
    recentSearchesEl.appendChild(searchEl);
  });
}

function saveNote() {
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
  const originalText = saveNoteBtn.textContent;
  saveNoteBtn.disabled = true;
  saveNoteBtn.textContent = 'Saving...';
  
  chrome.runtime.sendMessage({ 
    action: 'addNote',
    url: targetUrl,
    note: note
  }, response => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      addNoteInProgress = false;
      saveNoteBtn.disabled = false;
      saveNoteBtn.textContent = originalText;
      return;
    }
    
    if (response.success) {
      // Show success feedback on the save button
      saveNoteBtn.textContent = '✓ Saved';
      saveNoteBtn.classList.add('saved');
      
      // Re-enable the button after a short delay
      setTimeout(() => {
        addNoteInProgress = false;
        saveNoteBtn.disabled = false;
        saveNoteBtn.textContent = originalText;
        saveNoteBtn.classList.remove('saved');
      }, 1000); // 1 second delay for UI feedback
      
    } else {
      // Check if this is a rate limit error
      if (response.rateLimited) {
        // Calculate wait time in seconds (rounded up)
        const waitTime = Math.ceil(response.waitTimeMs / 1000);
        saveNoteBtn.textContent = `Wait ${waitTime}s...`;
        
        // Enable after the wait time
        setTimeout(() => {
          addNoteInProgress = false;
          saveNoteBtn.disabled = false;
          saveNoteBtn.textContent = originalText;
        }, response.waitTimeMs);
      } else {
        // Other error
        alert('Error adding note: ' + (response.error || 'Unknown error'));
        addNoteInProgress = false;
        saveNoteBtn.disabled = false;
        saveNoteBtn.textContent = originalText;
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
    
    const resumeBtn = document.createElement('button');
    resumeBtn.className = 'resume-btn';
    resumeBtn.textContent = 'Resume';
    resumeBtn.addEventListener('click', () => resumeSession(session.id));
    
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
    
    sessionActions.appendChild(resumeBtn);
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
      // Generate a meaningful filename using session name and ID
      const sessionName = response.data.sessionName || 'Unnamed Session';
      const sessionId = response.data.sessionId || sessionId;
      
      // Clean session name for filename (remove invalid characters)
      const cleanSessionName = sessionName.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '-');
      
      // Create filename: session-name_sessionId.format
      const filename = `${cleanSessionName}_${sessionId}.${format}`;
      
      downloadData(response.data.data, filename);
    }
  });
}

function resumeSession(sessionId) {
  chrome.runtime.sendMessage({ 
    action: 'resumeSession',
    sessionId
  }, response => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    
    if (response.success) {
      // Refresh UI to show resumed session as current
      refreshStatus();
      loadSessionsAndDisplay();
    } else {
      alert('Error resuming session: ' + (response.error || 'Unknown error'));
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

// Pending Edits Functions
async function savePendingEdits(url) {
  if (!metadataModal || metadataModal.classList.contains('hidden')) {
    return; // Not editing metadata
  }

  const pendingEdits = {
    url: url,
    timestamp: Date.now(),
    modalWasOpen: true, // Track that metadata modal was open
    edits: {
      title: metadataTitle.value,
      author: metadataAuthor.value,
      date: metadataDate.value,
      type: metadataType.value,
      journal: metadataJournal.value,
      publicationInfo: metadataPublicationInfo.value,
      pages: metadataPages.value,
      doi: metadataDoi.value,
      quals: metadataQuals.value
    }
  };

  // Check if any fields have been modified from original metadata
  let hasChanges = false;
  if (currentPageMetadata) {
    // Compare against original metadata to detect actual changes
    hasChanges = (
      (pendingEdits.edits.title !== (currentPageMetadata.title || '')) ||
      (pendingEdits.edits.author !== (currentPageMetadata.author || '')) ||
      (pendingEdits.edits.date !== (currentPageMetadata.publishDate || '')) ||
      (pendingEdits.edits.type !== (currentPageMetadata.contentType || '')) ||
      (pendingEdits.edits.journal !== (currentPageMetadata.journal || '')) ||
      (pendingEdits.edits.publicationInfo !== (currentPageMetadata.publicationInfo || '')) ||
      (pendingEdits.edits.pages !== (currentPageMetadata.pages || '')) ||
      (pendingEdits.edits.doi !== (currentPageMetadata.doi || '')) ||
      (pendingEdits.edits.quals !== (currentPageMetadata.quals || ''))
    );
  } else {
    // No original metadata, check if any fields have content
    hasChanges = Object.values(pendingEdits.edits).some(value => value.trim() !== '');
  }
  
  if (hasChanges) {
    chrome.storage.local.set({ [PENDING_EDITS_KEY]: pendingEdits });
    console.log('Research Tracker: Saved pending edits for', url);
  }
}

async function restorePendingEdits(url) {
  return new Promise((resolve) => {
    chrome.storage.local.get([PENDING_EDITS_KEY], (result) => {
      const pendingEdits = result[PENDING_EDITS_KEY];
      
      if (pendingEdits && pendingEdits.url === url) {
        // Check if edits are recent (within 24 hours)
        const ageHours = (Date.now() - pendingEdits.timestamp) / (1000 * 60 * 60);
        if (ageHours < 24) {
          console.log('Research Tracker: Restoring pending edits for', url);
          
          // Restore field values
          metadataTitle.value = pendingEdits.edits.title || '';
          metadataAuthor.value = pendingEdits.edits.author || '';
          metadataDate.value = pendingEdits.edits.date || '';
          metadataType.value = pendingEdits.edits.type || '';
          metadataJournal.value = pendingEdits.edits.journal || '';
          metadataPublicationInfo.value = pendingEdits.edits.publicationInfo || '';
          metadataPages.value = pendingEdits.edits.pages || '';
          metadataDoi.value = pendingEdits.edits.doi || '';
          metadataQuals.value = pendingEdits.edits.quals || '';
          
          hasPendingEdits = true;
          showPendingEditsIndicator();
          resolve(true);
        } else {
          // Clear old edits
          clearPendingEdits();
          resolve(false);
        }
      } else {
        resolve(false);
      }
    });
  });
}

function clearPendingEdits() {
  chrome.storage.local.remove([PENDING_EDITS_KEY]);
  hasPendingEdits = false;
  hidePendingEditsIndicator();
  console.log('Research Tracker: Cleared pending edits');
}

function showPendingEditsIndicator() {
  // Add visual indicator to modal header
  const modalHeader = metadataModal.querySelector('h3');
  if (modalHeader && !modalHeader.querySelector('.pending-indicator')) {
    const indicator = document.createElement('span');
    indicator.className = 'pending-indicator';
    indicator.style.cssText = `
      color: #f39c12;
      font-size: 0.8em;
      margin-left: 10px;
      font-weight: normal;
    `;
    indicator.textContent = '(unsaved changes)';
    modalHeader.appendChild(indicator);
  }
}

function hidePendingEditsIndicator() {
  const indicator = metadataModal.querySelector('.pending-indicator');
  if (indicator) {
    indicator.remove();
  }
}

async function checkAndRestorePendingSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get([PENDING_EDITS_KEY], (result) => {
      const pendingEdits = result[PENDING_EDITS_KEY];
      
      if (pendingEdits && pendingEdits.modalWasOpen) {
        // Check if edits are recent (within 24 hours)
        const ageHours = (Date.now() - pendingEdits.timestamp) / (1000 * 60 * 60);
        if (ageHours < 24) {
          console.log('Research Tracker: Restoring editing session for', pendingEdits.url);
          
          // Set the selected URL to match the pending edits
          selectedPageUrl = pendingEdits.url;
          
          // Update the note target to show which page is selected
          noteTargetEl.textContent = `Restoring edits for ${new URL(pendingEdits.url).hostname}`;
          
          // Open the metadata modal automatically
          setTimeout(() => {
            openMetadataModal();
          }, 100); // Small delay to ensure UI is ready
          
          resolve(true);
        } else {
          // Clear old edits
          clearPendingEdits();
          resolve(false);
        }
      } else {
        resolve(false);
      }
    });
  });
}

async function checkForPendingEditRequest() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['pendingEditUrl'], (result) => {
      const pendingEditUrl = result.pendingEditUrl;
      
      if (pendingEditUrl) {
        console.log('Research Tracker: Opening metadata modal for requested URL:', pendingEditUrl);
        
        // Clear the pending edit request
        chrome.storage.local.remove(['pendingEditUrl']);
        
        // Set the selected URL
        selectedPageUrl = pendingEditUrl;
        
        // Update the note target to show which page is selected
        try {
          noteTargetEl.textContent = `Editing metadata for ${new URL(pendingEditUrl).hostname}`;
        } catch (e) {
          noteTargetEl.textContent = 'Editing metadata';
        }
        
        // Open the metadata modal automatically
        setTimeout(() => {
          openMetadataModal();
        }, 200); // Slightly longer delay to ensure everything is ready
        
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

// Metadata Modal Functions
let currentPageMetadata = null;

function openMetadataModal() {
  if (!selectedPageUrl) {
    alert('Please select a page first to edit its metadata.');
    return;
  }
  
  // Reset form
  metadataTitle.value = '';
  metadataAuthor.value = '';
  metadataDate.value = '';
  metadataType.value = '';
  metadataJournal.value = '';
  metadataPublicationInfo.value = '';
  metadataPages.value = '';
  metadataDoi.value = '';
  metadataQuals.value = '';
  metadataInfo.innerHTML = '';
  
  // Fetch the current metadata for this URL if available
  chrome.runtime.sendMessage({
    action: 'getPageMetadata',
    url: selectedPageUrl
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    
    if (response && response.success && response.metadata) {
      currentPageMetadata = response.metadata;
      
      // Fill the form with current values
      metadataTitle.value = currentPageMetadata.title || '';
      
      // Handle authors - could be string or array
      if (currentPageMetadata.authors && Array.isArray(currentPageMetadata.authors)) {
        metadataAuthor.value = currentPageMetadata.authors.join(', ');
      } else {
        metadataAuthor.value = currentPageMetadata.author || '';
      }
      
      metadataDate.value = currentPageMetadata.publishDate || '';
      metadataType.value = currentPageMetadata.contentType || '';
      metadataJournal.value = currentPageMetadata.journal || '';
      metadataPublicationInfo.value = currentPageMetadata.publicationInfo || '';
      metadataPages.value = currentPageMetadata.pages || '';
      metadataDoi.value = currentPageMetadata.doi || '';
      metadataQuals.value = currentPageMetadata.quals || '';
      
      // Show comprehensive metadata source information
      displayMetadataSourceInfo(currentPageMetadata);
    }
    
    // Check for and restore pending edits after loading current metadata
    restorePendingEdits(selectedPageUrl).then((restored) => {
      if (!restored) {
        // No pending edits, clear any indicator
        hidePendingEditsIndicator();
      }
      
      // Show the modal using our modal management system
      showModal(metadataModal, 'metadata');
    });
  });
}

function closeMetadataModal() {
  // Clear pending edits when modal is explicitly closed
  clearPendingEdits();
  hideCurrentModal();
}

function saveMetadata() {
  if (!selectedPageUrl) {
    alert('No page selected.');
    closeMetadataModal();
    return;
  }
  
  // Create metadata object - include all fields, even if empty
  const metadata = {
    title: metadataTitle.value.trim(),
    author: metadataAuthor.value.trim(),
    publishDate: metadataDate.value.trim(),
    contentType: metadataType.value,
    journal: metadataJournal.value.trim(),
    publicationInfo: metadataPublicationInfo.value.trim(),
    pages: metadataPages.value.trim(),
    doi: metadataDoi.value.trim(),
    quals: metadataQuals.value.trim(),
    manuallyEdited: true,
    editTimestamp: new Date().toISOString()
  };
  
  // Handle authors as array if multiple authors separated by commas
  if (metadata.author && metadata.author.includes(',')) {
    metadata.authors = metadata.author.split(',').map(a => a.trim()).filter(a => a);
  }
  
  // Disable the save button and show saving indicator
  saveMetadataBtn.disabled = true;
  saveMetadataBtn.textContent = 'Saving...';
  
  try {
    // Save the metadata asynchronously
    chrome.runtime.sendMessage({
      action: 'updatePageMetadata',
      url: selectedPageUrl,
      metadata,
      isManualUpdate: true // Flag to prevent DOI override
    }, (response) => {
      // Check for runtime errors (connection issues)
      if (chrome.runtime.lastError) {
        console.error('Error in save metadata:', chrome.runtime.lastError);
        
        // Close the modal anyway (fallback)
        closeMetadataModal();
        
        // Show error in a non-blocking way
        noteTargetEl.textContent = 'Warning: Metadata may not have saved';
        
        setTimeout(() => {
          // Try to refresh status after
          refreshStatus();
        }, 1500);
        
        return;
      }
      
      // Process normal response
      if (response && response.success) {
        // Close the modal
        closeMetadataModal();
        
        // Show success message
        const originalText = noteTargetEl.textContent;
        noteTargetEl.textContent = 'Metadata saved successfully';
        
        // Notify content script to update citation preview
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'metadataUpdated'
            }).catch(() => {
              // Ignore errors for tabs that don't have content scripts
            });
          }
        });
        
        // Reset after a short delay
        setTimeout(() => {
          noteTargetEl.textContent = originalText;
          
          // Refresh the status to show updated metadata
          refreshStatus();
        }, 1500);
      } else {
        alert('Error saving metadata: ' + (response && response.error ? response.error : 'Unknown error'));
        saveMetadataBtn.disabled = false;
        saveMetadataBtn.textContent = 'Save Metadata';
      }
    });
    
    // As a fallback, close the modal and update UI after a timeout
    // This ensures the UI doesn't get stuck even if the messaging fails
    setTimeout(() => {
      // Reset the button no matter what
      saveMetadataBtn.disabled = false;
      saveMetadataBtn.textContent = 'Save Metadata';
      
      if (metadataModal.style.display !== 'none') {
        // Modal is still open, likely due to response callback not executing
        console.log('Closing modal via fallback timeout');
        closeMetadataModal();
        noteTargetEl.textContent = 'Metadata update attempted';
        
        // Try to refresh status
        setTimeout(refreshStatus, 500);
      }
    }, 1500);
  } catch (e) {
    console.error('Exception in saveMetadata:', e);
    closeMetadataModal();
    alert('Error: ' + e.message);
  }
}

// DOI Input Modal Functions
function openDoiInputModal() {
  showModal(doiInputModal, 'doi-input');
  doiInput.value = ''; // Clear previous input
  doiInput.focus();
  
  // Remove any existing keypress listeners to avoid duplicates
  doiInput.removeEventListener('keypress', handleDoiInputKeypress);
  // Allow Enter key to trigger fetch
  doiInput.addEventListener('keypress', handleDoiInputKeypress);
}

function handleDoiInputKeypress(e) {
  if (e.key === 'Enter') {
    fetchFromDoi();
  }
}

function closeDoiInputModal() {
  hideCurrentModal();
}

async function fetchFromDoi() {
  const doi = doiInput.value.trim();
  
  if (!doi) {
    alert('Please enter a DOI');
    return;
  }
  
  // Validate DOI format (basic check)
  if (!doi.match(/^10\.\d{4,}(?:\.\d+)*\/[^\s]+/)) {
    alert('Please enter a valid DOI (e.g., 10.1038/nature12373)');
    return;
  }
  
  // Disable button and show loading state
  fetchDoiBtn.disabled = true;
  fetchDoiBtn.textContent = 'Fetching...';
  
  try {
    // Send message to background script to fetch DOI metadata
    chrome.runtime.sendMessage({
      action: 'fetchDOIMetadata',
      doi: doi
    }, (response) => {
      // Reset button state
      fetchDoiBtn.disabled = false;
      fetchDoiBtn.textContent = 'Fetch Metadata';
      
      if (chrome.runtime.lastError) {
        console.error('Error fetching DOI metadata:', chrome.runtime.lastError);
        alert('Error communicating with background script');
        return;
      }
      
      if (response && response.success && response.metadata) {
        // Fill the metadata form with the fetched data
        fillMetadataForm(response.metadata);
        
        // Close the DOI input modal and return to metadata modal
        closeDoiInputModal();
        
        // Show success message
        alert('Metadata fetched successfully from DOI!');
      } else {
        // On error, stay in the DOI modal so user can try again
        const errorMsg = response?.error || 'Failed to fetch metadata for this DOI';
        alert('Error: ' + errorMsg);
        // DOI modal remains open for user to correct input or try again
      }
    });
  } catch (e) {
    fetchDoiBtn.disabled = false;
    fetchDoiBtn.textContent = 'Fetch Metadata';
    console.error('Exception in fetchFromDoi:', e);
    alert('Error: ' + e.message);
    // DOI modal remains open for user to try again
  }
}

function fillMetadataForm(metadata) {
  // Fill the form fields with the fetched metadata
  if (metadata.title) metadataTitle.value = metadata.title;
  if (metadata.author) metadataAuthor.value = metadata.author;
  if (metadata.publishDate) metadataDate.value = metadata.publishDate;
  if (metadata.journal) metadataJournal.value = metadata.journal;
  if (metadata.publicationInfo) metadataPublicationInfo.value = metadata.publicationInfo;
  if (metadata.pages) metadataPages.value = metadata.pages;
  if (metadata.doi) metadataDoi.value = metadata.doi;
  if (metadata.contentType) metadataType.value = metadata.contentType;
  if (metadata.abstract) metadataQuals.value = metadata.abstract;
  
  // Update metadata info to show DOI source
  const updatedMetadata = { ...metadata, doiMetadata: true };
  displayMetadataSourceInfo(updatedMetadata);
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

// Window control functions removed

/* Popout functionality removed 
function togglePopout() {
  console.log('togglePopout called, isPopout:', isPopout);
  
  try {
    if (isPopout) {
      console.log('Closing popout window...');
      // Close the current popup window and reopen as a regular extension popup
      chrome.runtime.sendMessage({ action: 'closePopout' }, (response) => {
        console.log('closePopout response:', response);
        if (chrome.runtime.lastError) {
          console.error('Error in closePopout response:', chrome.runtime.lastError);
        }
        window.close();
      });
    } else {
      console.log('Creating popout window...');
      // Get the current dimensions of the popup
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      console.log('Window dimensions:', width, height);
      console.log('Always on top:', isAlwaysOnTop);
      
      // Add visual feedback that button was clicked
      popoutBtn.classList.add('clicked');
      
      // Create a new popup window
      chrome.runtime.sendMessage({ 
        action: 'createPopout',
        width: width + 30, // Add some extra width to prevent horizontal scrollbar
        height: height + 50 // Add some extra height for window frame
      }, (response) => {
        console.log('createPopout callback entered');
        
        if (chrome.runtime.lastError) {
          console.error('Error sending createPopout message:', chrome.runtime.lastError);
          popoutBtn.classList.remove('clicked');
          return;
        }
        
        console.log('createPopout response:', response);
        
        // Only close if we got a successful response
        if (response && response.success) {
          console.log('Closing current popup after successful popout creation');
          window.close();
        } else {
          console.error('Failed to create popout window:', response);
          popoutBtn.classList.remove('clicked');
        }
      });
      
      console.log('createPopout message sent');
    }
  } catch (err) {
    console.error('Exception in togglePopout:', err);
    alert('Error toggling popout: ' + err.message);
  }
}
*/

// Citation format templates - matches citation preview exactly
const citationFormats = {
  apa: '{author} ({year}). {title}. {journal}, {publicationInfo}, {pages}. {url ? "Retrieved {accessDate} from {url}" : ""}',
  mla: '{author}. "{title}." {journal}, {publicationInfo}, {pages}, {day} {month} {year}, {url}.',
  chicago: '{author}. "{title}." {journal}, {publicationInfo}, {pages}, {month} {day}, {year}. {url}.',
  harvard: '{author} {year}, {title}, {journal}, {publicationInfo}, {pages}, viewed {accessDate}, <{url}>.',
  ieee: '{author}, "{title}," {journal}, {publicationInfo}, {pages}, {year}. [Online]. Available: {url}. [Accessed: {accessDate}].'
};

// Function to format date parts
function formatDateParts(dateStr) {
  if (!dateStr) return { 
    year: 'n.d.', 
    yearShort: 'n.d.',
    month: '', 
    monthNum: '',
    day: '',
    date: 'n.d.'
  };
  
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
    // Try to use Date parsing as last resort, but parse components directly
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      year = date.getFullYear().toString();
      monthNum = String(date.getMonth() + 1).padStart(2, '0');
      day = String(date.getDate()).padStart(2, '0');
    } else {
      // If all parsing fails, return the original string
      return { 
        year: dateStr, 
        yearShort: dateStr,
        month: '', 
        monthNum: '',
        day: '',
        date: dateStr
      };
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
}

// Function to format author names
function formatAuthors(authorStr, format) {
  if (!authorStr) return { full: 'Unknown Author', short: 'Unknown Author' };
  
  const authors = authorStr.split(',').map(a => a.trim());
  
  let formattedAuthors;
  if (format === 'apa' || format === 'harvard') {
    // Last name, First initial format
    formattedAuthors = authors.map(author => {
      const parts = author.split(' ');
      if (parts.length >= 2) {
        const lastName = parts[parts.length - 1];
        const initials = parts.slice(0, -1).map(n => n[0] + '.').join(' ');
        return `${lastName}, ${initials}`;
      }
      return author;
    });
  } else {
    formattedAuthors = authors;
  }
  
  // Create short version
  let shortVersion;
  if (authors.length === 1) {
    shortVersion = formattedAuthors[0];
  } else if (authors.length === 2) {
    shortVersion = formattedAuthors.join(' & ');
  } else {
    // 3 or more authors: first author et al.
    shortVersion = formattedAuthors[0] + ' et al.';
  }
  
  return {
    full: formattedAuthors.join(', '),
    short: shortVersion
  };
}

// Function to generate citation from metadata
function generateCitation(metadata, url, format, customTemplate) {
  const template = format === 'custom' ? customTemplate : citationFormats[format];
  if (!template) return 'Citation format not found';
  
  const dateParts = formatDateParts(metadata.date || metadata.publishDate);
  const today = new Date();
  const accessDate = today.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const accessDateShort = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
  
  const authorFormats = formatAuthors(metadata.author, format);
  
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
  
  // Prepare variables
  const variables = {
    author: authorFormats.full,
    authorShort: authorFormats.short,
    year: dateParts.year,
    yearShort: dateParts.yearShort,
    month: dateParts.month,
    monthNum: dateParts.monthNum,
    day: dateParts.day,
    date: dateParts.date,
    title: metadata.title || 'Untitled',
    publisher: metadata.publisher || metadata.journal || new URL(url).hostname.replace('www.', ''),
    journal: metadata.journal || '',
    publicationInfo: metadata.publicationInfo || '',
    pages: formatPages(metadata.pages),
    doi: metadata.doi || '',
    quals: metadata.quals || '',
    url: replaceUrl(url, metadata, citationSettings),
    accessDate: accessDate,
    accessDateShort: accessDateShort
  };
  
  // Replace variables in template
  let citation = template;
  Object.entries(variables).forEach(([key, value]) => {
    // Handle conditional expressions like {url ? "text" : ""}
    const conditionalRegex = new RegExp(`{${key}\\s*\\?\\s*"([^"]*)"\\s*:\\s*"([^"]*)"\\s*}`, 'g');
    citation = citation.replace(conditionalRegex, value ? '$1' : '$2');
    
    // Replace simple variables
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
  
  return citation;
}

// Copy citation function
async function copyCitation(url, title, buttonElement) {
  try {
    // Get metadata for the URL
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'getPageMetadata',
        url: url
      }, resolve);
    });
    
    const metadata = (response && response.success && response.metadata) ? response.metadata : {};
    
    // Ensure we have at least a title
    if (!metadata.title) {
      metadata.title = title || 'Untitled';
    }
    
    // Generate citation based on current settings
    const citation = generateCitation(metadata, url, citationSettings.format, citationSettings.customTemplate);
    
    // Copy to clipboard
    await navigator.clipboard.writeText(citation);
    
    // Visual feedback
    if (buttonElement) {
      const originalText = buttonElement.textContent;
      buttonElement.textContent = '✓ Copied';
      buttonElement.classList.add('copied');
      
      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.classList.remove('copied');
      }, 1500);
    }
    
    console.log('Citation copied:', citation);
  } catch (error) {
    console.error('Error copying citation:', error);
    alert('Failed to copy citation: ' + error.message);
  }
}

// Settings functions
function loadCitationSettings() {
  chrome.storage.local.get(['citationSettings'], (result) => {
    if (result.citationSettings) {
      // Merge saved settings with defaults to ensure new properties exist
      citationSettings = {
        format: 'apa',
        customTemplate: '',
        previewEnabled: false,
        excludedDomains: 'annas-archive.org, libgen.is, sci-hub.se, library.dartmouth.edu',
        replaceUrlWithDoi: false,
        replaceDatabaseUrls: false,
        customDatabaseDomains: '',
        ...result.citationSettings
      };
    }
    // If no saved settings, citationSettings already has the defaults
    
    citationFormatSelect.value = citationSettings.format;
    customFormatTemplate.value = citationSettings.customTemplate || '';
    citationPreviewEnabled.checked = citationSettings.previewEnabled || false;
    excludedDomainsInput.value = citationSettings.excludedDomains || 'annas-archive.org, libgen.is, sci-hub.se, library.dartmouth.edu';
    replaceUrlWithDoiCheckbox.checked = citationSettings.replaceUrlWithDoi || false;
    replaceDatabaseUrlsCheckbox.checked = citationSettings.replaceDatabaseUrls || false;
    customDatabaseDomainsInput.value = citationSettings.customDatabaseDomains || '';
    
    if (citationSettings.format === 'custom') {
      customFormatSection.style.display = 'block';
    } else {
      customFormatSection.style.display = 'none';
    }
  });
}

function saveCitationSettings() {
  citationSettings.format = citationFormatSelect.value;
  citationSettings.customTemplate = customFormatTemplate.value;
  citationSettings.previewEnabled = citationPreviewEnabled.checked;
  citationSettings.excludedDomains = excludedDomainsInput.value;
  citationSettings.replaceUrlWithDoi = replaceUrlWithDoiCheckbox.checked;
  citationSettings.replaceDatabaseUrls = replaceDatabaseUrlsCheckbox.checked;
  citationSettings.customDatabaseDomains = customDatabaseDomainsInput.value;
  
  chrome.storage.local.set({ citationSettings }, () => {
    console.log('Citation settings saved');
    
    // Notify all content scripts about the preview setting change
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateCitationPreviewSetting',
          previewEnabled: citationSettings.previewEnabled
        }).catch(() => {
          // Ignore errors for tabs that don't have content scripts
        });
      });
    });
    
    closeSettingsModal();
  });
}

function closeSettingsModal() {
  hideCurrentModal();
}

function closeHelpModal() {
  hideCurrentModal();
}

// Export all metadata functionality
function exportAllMetadata() {
  // Disable button and show loading state
  exportAllMetadataBtn.disabled = true;
  exportAllMetadataBtn.textContent = 'Exporting...';
  
  chrome.runtime.sendMessage({
    action: 'exportAllMetadata'
  }, (response) => {
    // Re-enable button
    exportAllMetadataBtn.disabled = false;
    exportAllMetadataBtn.textContent = 'Export All Metadata';
    
    if (chrome.runtime.lastError) {
      console.error('Error exporting metadata:', chrome.runtime.lastError);
      alert('Error exporting metadata. Please try again.');
      return;
    }
    
    if (response && response.success) {
      // Create and download the file
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Show success message
      alert(`Successfully exported ${response.count} metadata records to ${response.filename}`);
    } else {
      console.error('Export failed:', response?.error);
      alert(response?.error || 'Failed to export metadata. Please try again.');
    }
  });
}

// Display comprehensive metadata source information
function displayMetadataSourceInfo(metadata) {
  if (!metadataInfo || !metadata) {
    return;
  }
  
  const infoItems = [];
  
  // Check if metadata came from DOI API
  if (metadata.doiMetadata) {
    infoItems.push({
      text: 'Metadata fetched from DOI registry',
      color: '#2e7d32',
      icon: '✓'
    });
  }
  // Check if this is from an automatic extractor
  else if (metadata.extractorType) {
    let extractorText = `Metadata extracted via ${metadata.extractorType}`;
    if (metadata.extractorSite) {
      extractorText += ` from ${metadata.extractorSite}`;
    }
    infoItems.push({
      text: extractorText,
      color: '#666',
      icon: '⚙'
    });
  }
  
  // Check if this is a repeat visit (has creation timestamp vs current visit)
  if (metadata.created && metadata.lastUpdated) {
    const created = new Date(metadata.created);
    const lastUpdated = new Date(metadata.lastUpdated);
    
    // If last updated is significantly after creation, this is likely a repeat visit
    if (lastUpdated.getTime() - created.getTime() > 60000) { // More than 1 minute difference
      infoItems.push({
        text: 'Metadata loaded from previous session',
        color: '#1976d2',
        icon: '↻'
      });
    }
  }
  
  // Check if manual edits were made
  if (metadata.manuallyEdited) {
    const editTime = metadata.editTimestamp ? new Date(metadata.editTimestamp) : null;
    let editText = 'Manual edits applied';
    if (editTime) {
      const now = new Date();
      const diffMinutes = Math.round((now.getTime() - editTime.getTime()) / 60000);
      if (diffMinutes < 1) {
        editText += ' (just now)';
      } else if (diffMinutes < 60) {
        editText += ` (${diffMinutes}m ago)`;
      } else if (diffMinutes < 1440) {
        editText += ` (${Math.round(diffMinutes / 60)}h ago)`;
      } else {
        editText += ` (${Math.round(diffMinutes / 1440)}d ago)`;
      }
    }
    infoItems.push({
      text: editText,
      color: '#f57c00',
      icon: '✏'
    });
  }
  
  // Render the info items
  if (infoItems.length > 0) {
    const infoHtml = infoItems.map(item => 
      `<div style="color: ${item.color}; font-size: 0.85em; margin: 2px 0; line-height: 1.3;">
        <span style="margin-right: 6px;">${item.icon}</span>${item.text}
      </div>`
    ).join('');
    
    metadataInfo.innerHTML = `<div style="border: 1px solid #e0e0e0; background: #f9f9f9; padding: 8px; border-radius: 4px; margin-top: 8px;">${infoHtml}</div>`;
  } else {
    metadataInfo.innerHTML = '';
  }
}

// Clear all metadata functionality
function clearAllMetadata() {
  // Show confirmation dialog
  const confirmed = confirm(
    'Are you sure you want to permanently delete ALL metadata records?\n\n' +
    'This will remove all page metadata collected across all sessions. ' +
    'Session data (page visits, searches, notes) will not be affected, but ' +
    'metadata details (titles, authors, dates, etc.) will be lost.\n\n' +
    'This action cannot be undone.'
  );
  
  if (!confirmed) {
    return;
  }
  
  // Disable button and show loading state
  clearAllMetadataBtn.disabled = true;
  clearAllMetadataBtn.textContent = 'Clearing...';
  
  chrome.runtime.sendMessage({
    action: 'clearAllMetadata'
  }, (response) => {
    // Re-enable button
    clearAllMetadataBtn.disabled = false;
    clearAllMetadataBtn.textContent = 'Clear All Metadata';
    
    if (chrome.runtime.lastError) {
      console.error('Error clearing metadata:', chrome.runtime.lastError);
      alert('Error clearing metadata. Please try again.');
      return;
    }
    
    if (response && response.success) {
      alert(`Successfully cleared ${response.count} metadata records.`);
    } else {
      console.error('Clear failed:', response?.error);
      alert(response?.error || 'Failed to clear metadata. Please try again.');
    }
  });
}