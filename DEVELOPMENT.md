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
│   │   └── background.js   # Background service worker
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
- Session data storage
- Web navigation tracking
- Search detection
- Communication with content scripts and popup

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