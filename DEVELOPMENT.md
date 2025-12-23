# Development Guide

This document provides information for developers who want to modify or extend the Research Tracker Chrome extension.

## Project Structure

```
Research Tracker Extension/
├── manifest.json           # Extension configuration
├── css/
│   └── popup.css           # Styling for popup UI
├── images/
│   ├── icon16.svg          # 16x16 icon
│   ├── icon48.svg          # 48x48 icon
│   └── icon128.svg         # 128x128 icon
├── src/
│   ├── background/
│   │   ├── background.js   # Background service worker
│   │   └── indexeddb.js    # IndexedDB storage module
│   ├── content/
│   │   └── content.js      # Content script for web pages
│   └── popup/
│       ├── popup.html      # Popup UI HTML
│       └── popup.js        # Popup UI logic
├── README.md               # Project documentation
├── TROUBLESHOOTING.md      # Troubleshooting guide
└── DEVELOPMENT.md          # Development guide (this file)
```

## Key Components

### 1. Background Script (background.js)

The background script manages:
- Recording state (start/stop/pause/resume)
- Session data storage using hybrid approach (Chrome storage + IndexedDB)
- Web navigation tracking
- Search detection
- Communication with content scripts and popup

### 1.1. IndexedDB Storage Module (indexeddb.js)

A dedicated module for managing historical session storage:
- Database initialization and schema management
- Session persistence beyond storage quotas
- Structured data storage with indexing
- Error handling and fallback mechanisms

### 2. Content Script (content.js)

The content script runs on web pages and is responsible for:
- Extracting search results from search engines
- Collecting page metadata
- Tracking clicks on search results
- Sending data to the background script

### 3. Popup UI (popup.html, popup.js)

The popup UI provides:
- Controls for recording sessions
- Current session status
- Note-taking interface
- Session history
- Export functionality

## Storage Architecture: Chrome Storage + IndexedDB

### Background

The extension uses a dual-storage approach to optimize for different data access patterns:

1. **Chrome Storage Issues**: Chrome's local storage had a 10MB limit that could be exceeded by large research sessions
2. **Performance Requirements**: Need fast access to current session and recording state
3. **Scalability**: Need unlimited storage for historical sessions

### Storage Strategy

The extension implements a **dual-storage approach**:

```
┌─────────────────────────────────────────────────────────┐
│                   DUAL STORAGE                          │
├─────────────────────────────────────────────────────────┤
│  Chrome Storage (chrome.storage.local)                 │
│  ├── Current active session (fast access)              │
│  ├── Recording state flags                             │
│  ├── Activity timestamps                               │
│  └── Metadata objects cache                            │
├─────────────────────────────────────────────────────────┤
│  IndexedDB (unlimited storage)                         │
│  ├── Completed sessions (historical data)              │
│  └── Session metadata with indexing                    │
└─────────────────────────────────────────────────────────┘
```

### Implementation Details

#### 1. Storage Permissions
- Added `unlimitedStorage` permission to `manifest.json` to remove Chrome storage limits
- Provides fallback protection for current session storage

#### 2. IndexedDB Schema
```javascript
Database: "ResearchTrackerDB" (version 1)
├── Object Store: "sessions"
│   ├── keyPath: "id" (session ID)
│   ├── Index: "startTime" (for chronological queries)
│   ├── Index: "name" (for search functionality)
│   └── Index: "endTime" (for completed session queries)
└── Object Store: "metadata" 
    ├── keyPath: "id" (metadata ID)
    ├── Index: "url" (for URL-based lookups)
    └── Index: "sessionId" (for session associations)
```

#### 3. Session Lifecycle

```
Start Recording → Store in chrome.storage (current session)
                ↓
            Autosave to chrome.storage (for active session)
                ↓
            Stop Recording → Move to IndexedDB → Clear from chrome.storage
```

#### 4. Function Updates

**Session Management Functions:**
- `stopRecording()`: Saves completed sessions to IndexedDB
- `getSessions()`: Reads from IndexedDB only
- `exportSession()`: Retrieves sessions from IndexedDB
- `deleteSession()`: Removes from IndexedDB
- `resumeSession()`: Retrieves from IndexedDB and moves back to chrome.storage
- `renameSession()`: Updates sessions in IndexedDB

**Error Handling:**
- All IndexedDB operations include comprehensive error logging
- Failed operations reject with error messages
- IndexedDB initialization happens automatically on module load

#### 5. Performance Benefits

**Dual Storage Advantages:**
- Fast current session access (chrome.storage)
- Unlimited historical storage (IndexedDB)
- Indexed queries for fast session retrieval
- Isolated storage prevents cascading failures
- No storage quota errors

#### 6. Migration History

**Note**: Prior to v1.0 publication, migration code was removed from the extension:
- No users existed before IndexedDB implementation
- Migration functions removed in commit 9d015ae (December 2025)
- All new users start with IndexedDB from installation
- Cleaner codebase without legacy fallback paths
- Migration code preserved in git history if needed for reference

### Development Considerations

#### Working with IndexedDB Module

```javascript
// Initialize database (automatic on module load)
researchTrackerDB.init()

// Save completed session
await researchTrackerDB.saveSession(sessionObject)

// Get session summaries (for UI display)
const summaries = await researchTrackerDB.getAllSessions()

// Get full session data (for export)
const session = await researchTrackerDB.getSession(sessionId)

// Delete session
await researchTrackerDB.deleteSession(sessionId)
```

#### Adding New Session Operations

1. **Use IndexedDB for completed sessions** (all historical data)
2. **Use chrome.storage for current session** (active recording only)
3. **Use proper error handling** with try/catch blocks
4. **Log operations** for debugging

Example pattern:
```javascript
async function newSessionOperation(sessionId) {
  try {
    // Access IndexedDB directly for completed sessions
    const session = await researchTrackerDB.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Perform operation
    const result = await researchTrackerDB.someOperation(sessionId);
    return result;
  } catch (error) {
    console.error('Operation failed:', error);
    throw error;
  }
}
```

#### Database Schema Updates

To modify the IndexedDB schema:

1. **Increment DB_VERSION** in `indexeddb.js`
2. **Update onupgradeneeded handler** with migration logic
3. **Test with existing data** to ensure compatibility
4. **Document schema changes** in this file

### Troubleshooting Storage Issues

#### Common Issues:
1. **IndexedDB not initializing**: Check browser console for errors
2. **Sessions not appearing**: Verify IndexedDB operations in DevTools → Application → IndexedDB
3. **Performance issues**: Check browser DevTools for slow IndexedDB queries
4. **Data inconsistencies**: Clear IndexedDB via DevTools → Application → IndexedDB → Delete Database

#### Debugging Tools:
```javascript
// Manually query IndexedDB (in extension background script DevTools)
researchTrackerDB.getAllSessions().then(console.log);

// Get specific session
researchTrackerDB.getSession('session_id_here').then(console.log);

// Check chrome.storage usage (current session only)
chrome.storage.local.get(null, console.log);
```

## Adding Support for New Search Engines

To add a new search engine:

1. Update the `SEARCH_ENGINES` object in `background.js`:

```javascript
const SEARCH_ENGINES = {
  // Existing engines...
  NEW_ENGINE: {
    domains: ['newengine.com', 'www.newengine.com'],
    queryParam: 'q' // parameter used for search queries
  }
};
```

2. Create an extractor function in `content.js`:

```javascript
function extractNewEngineResults() {
  try {
    const results = [];
    // Use appropriate selectors for the search engine's results
    const searchItems = document.querySelectorAll('.result-selector');
    
    searchItems.forEach((item, index) => {
      // Extract relevant data
      // ...
      
      results.push(result);
    });
    
    return {
      query: new URLSearchParams(window.location.search).get('q'),
      count: results.length,
      results
    };
  } catch (e) {
    console.error('Error extracting results:', e);
    return { error: e.message };
  }
}
```

3. Add the extractor to the `SEARCH_EXTRACTORS` object:

```javascript
const SEARCH_EXTRACTORS = {
  // Existing extractors...
  NEW_ENGINE: extractNewEngineResults
};
```

## Extending Page Metadata Collection

To collect additional page metadata:

1. Update the `extractPageMetadata()` function in `content.js`:

```javascript
function extractPageMetadata() {
  // Existing metadata extraction...
  
  // Add new metadata extraction
  const newMetaTag = document.querySelector('meta[name="new-meta"]');
  if (newMetaTag) {
    metadata.newProperty = newMetaTag.getAttribute('content');
  }
  
  return metadata;
}
```

## Adding New Features

### Adding User Preferences

1. Create a new UI section in `popup.html`
2. Add storage and handlers in `popup.js`
3. Update the background script to use these preferences

### Enhancing Export Functionality

1. Add new format options in `popup.js`
2. Implement format converters in `background.js`

### Adding Visualization Features

1. Consider adding a new visualization tab to the popup
2. Implement visualization logic using a library like Chart.js

## Testing

To test your changes:

1. Make your modifications to the code
2. Go to `chrome://extensions/` in Chrome
3. Find the Research Tracker extension
4. Click the refresh icon to reload the extension
5. Open DevTools for background script by clicking "inspect" on the extension
6. Test the functionality and check for errors in the console

## Building for Production

For a production-ready extension:

1. Minify JavaScript files:
   - Use tools like Terser or UglifyJS
   - Example: `terser src/background/background.js -o dist/background.js`

2. Optimize CSS:
   - Use tools like cssnano
   - Example: `cssnano css/popup.css > dist/popup.css`

3. Update the manifest to point to optimized files

4. Package the extension:
   - Create a ZIP file containing all necessary files
   - Rename the extension to `.crx` if desired

## Future Development Ideas

- **Advanced search patterns**: Improve detection of search engines
- **Custom tracking rules**: Allow users to define what to track
- **Integration API**: For the future visualization website
- **Privacy enhancements**: Add options to exclude sensitive domains
- **Search result screenshots**: Capture visual snapshots of search results
- **PDF handling**: Better metadata extraction from academic PDFs
- **Citation format exports**: Export data in citation formats