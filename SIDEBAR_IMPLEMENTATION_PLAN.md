# Sidebar Support Implementation Plan

**Branch**: `sidebar-support`
**Goal**: Add Chrome Side Panel support with user-configurable default behavior
**Estimated Effort**: 1.5-2 hours

## Overview

Enable the extension to work as both a popup and a sidebar, with:
- User setting to choose default behavior (left-click icon)
- Right-click context menu to always access either mode
- Responsive UI that adapts to sidebar's variable width
- Backward compatibility with older Chrome versions

## Changes Required

### 1. Manifest.json Changes

**File**: `manifest.json`

**Changes**:
1. Remove `"default_popup"` from `action` (we'll handle clicks programmatically)
2. Add `side_panel` configuration
3. Add `"sidePanel"` and `"contextMenus"` permissions

**Before**:
```json
{
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    }
  },
  "permissions": [
    "activeTab",
    "storage",
    "unlimitedStorage"
  ]
}
```

**After**:
```json
{
  "action": {
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    }
  },
  "side_panel": {
    "default_path": "src/popup/popup.html"
  },
  "permissions": [
    "activeTab",
    "storage",
    "unlimitedStorage",
    "sidePanel",
    "contextMenus"
  ]
}
```

### 2. Background.js - Add Click Handlers

**File**: `src/background/background.js`

**Add at the end of file** (after all existing code):

```javascript
// ============================================================================
// SIDEBAR/POPUP MODE HANDLING
// ============================================================================

// Handle extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Get user preference for default mode
    const result = await chrome.storage.local.get(['preferSidePanel']);
    const useSidePanel = result.preferSidePanel ?? false; // Default to popup

    if (useSidePanel && chrome.sidePanel) {
      // Open as sidebar
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } else {
      // Open as popup window
      await chrome.windows.create({
        url: chrome.runtime.getURL('src/popup/popup.html'),
        type: 'popup',
        width: 400,
        height: 600
      });
    }
  } catch (error) {
    console.error('Error opening extension:', error);
    // Fallback to popup on error
    chrome.windows.create({
      url: chrome.runtime.getURL('src/popup/popup.html'),
      type: 'popup',
      width: 400,
      height: 600
    });
  }
});

// Create context menu options on install/update
chrome.runtime.onInstalled.addListener(() => {
  // Clear existing menu items to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    // Add "Open in sidebar" option
    chrome.contextMenus.create({
      id: 'openSidePanel',
      title: 'Open in sidebar',
      contexts: ['action']
    });

    // Add "Open in popup" option
    chrome.contextMenus.create({
      id: 'openPopup',
      title: 'Open in popup',
      contexts: ['action']
    });
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (info.menuItemId === 'openSidePanel' && chrome.sidePanel) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } else if (info.menuItemId === 'openPopup') {
      await chrome.windows.create({
        url: chrome.runtime.getURL('src/popup/popup.html'),
        type: 'popup',
        width: 400,
        height: 600
      });
    }
  } catch (error) {
    console.error('Error opening extension from context menu:', error);
  }
});
```

### 3. CSS Changes - Make UI Responsive

**File**: `css/popup.css`

**Line 32** - Change body width:
```css
/* BEFORE */
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f9f9f9;
  width: 400px;
  min-height: 300px;
  overflow-y: auto;
}

/* AFTER */
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f9f9f9;
  width: 100%; /* Changed from 400px */
  min-width: 320px; /* Add minimum width for very narrow sidebars */
  min-height: 300px;
  overflow-y: auto;
}
```

**Lines 606-614** - Make modals responsive:
```css
/* BEFORE */
.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 380px;
  max-height: 90vh;
  overflow-y: auto;
}

.wide-modal {
  max-width: 480px;
}

/* AFTER */
.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: min(600px, 90vw); /* Responsive to viewport width */
  max-height: 90vh;
  overflow-y: auto;
}

.wide-modal {
  max-width: min(700px, 95vw); /* Responsive to viewport width */
}
```

**Add at end of file** - Responsive media queries:
```css
/* ============================================================================
   RESPONSIVE LAYOUT FOR SIDEBAR MODE
   ============================================================================ */

/* Narrow sidebar mode (<350px) */
@media (max-width: 350px) {
  /* Stack session actions vertically */
  .session-actions {
    flex-direction: column;
  }

  /* Make buttons full width */
  .session-actions button {
    width: 100%;
  }

  /* Stack action buttons */
  .action-buttons {
    grid-template-columns: 1fr;
  }

  /* Single column metadata form */
  .metadata-form-grid {
    grid-template-columns: 1fr;
  }

  .metadata-form-grid .form-group.full-width {
    grid-column: span 1;
  }

  /* Smaller font for very narrow widths */
  body {
    font-size: 12px;
  }

  h1 {
    font-size: 18px;
  }

  h2 {
    font-size: 14px;
  }
}

/* Medium sidebar mode (350px-450px) - default popup size */
@media (min-width: 351px) and (max-width: 450px) {
  /* This is the existing popup size, no changes needed */
}

/* Wide sidebar mode (>450px) */
@media (min-width: 451px) {
  /* Show more sessions before scrolling */
  #sessions-list {
    max-height: 300px; /* Increased from 200px */
  }

  .history-list {
    max-height: 180px; /* Increased from 120px */
  }

  .modal-list {
    max-height: 400px; /* Increased from 300px */
  }

  /* Optionally show metadata form in 3 columns for very wide sidebars */
  @media (min-width: 600px) {
    .metadata-form-grid {
      grid-template-columns: 1fr 1fr 1fr;
    }

    .metadata-form-grid .form-group.full-width {
      grid-column: span 3;
    }
  }
}
```

### 4. Settings UI - Add Preference Toggle

**File**: `src/popup/popup.html`

**Location**: In the settings modal, after the debug mode checkbox (around line 353)

**Add**:
```html
      <div class="form-group">
        <label for="prefer-side-panel" style="cursor: pointer;">
          Open in sidebar by default:
          <input type="checkbox" id="prefer-side-panel">
        </label>
        <div class="setting-description">
          When enabled, clicking the extension icon opens it as a sidebar instead of a popup. You can always access the other mode by right-clicking the extension icon. (Requires Chrome 114+ for sidebar support)
        </div>
      </div>
```

### 5. Settings JavaScript - Save/Load Preference

**File**: `src/popup/popup.js`

**Step 1**: Add variable declaration (around line 90, with other variables):
```javascript
let preferSidePanelCheckbox;
```

**Step 2**: Initialize the checkbox (around line 334, in the init() function after other checkboxes):
```javascript
preferSidePanelCheckbox = document.getElementById('prefer-side-panel');
```

**Step 3**: Load setting in loadCitationSettings() function (around line 2519):
```javascript
// Inside loadCitationSettings(), after loading other settings
chrome.storage.local.get([
  'citationSettings',
  'preferSidePanel'  // Add this
], (result) => {
  // ... existing code to load citation settings ...

  // Load sidebar preference
  if (preferSidePanelCheckbox) {
    preferSidePanelCheckbox.checked = result.preferSidePanel ?? false;
  }
});
```

**Step 4**: Save setting in saveCitationSettings() function (around line 2543):
```javascript
// Inside saveCitationSettings(), when building the settings object
const citationSettings = {
  // ... all existing settings ...
};

// Save both citation settings and sidebar preference
chrome.storage.local.set({
  citationSettings: citationSettings,
  preferSidePanel: preferSidePanelCheckbox ? preferSidePanelCheckbox.checked : false
}, () => {
  // ... existing success callback ...
});
```

## Testing Checklist

After implementing all changes:

### Functionality Tests
- [ ] Left-click icon with setting OFF → Opens popup
- [ ] Left-click icon with setting ON → Opens sidebar (Chrome 114+)
- [ ] Right-click → "Open in sidebar" → Opens sidebar (Chrome 114+)
- [ ] Right-click → "Open in popup" → Opens popup
- [ ] Setting persists after closing/reopening extension
- [ ] All features work in popup mode (citations, tracking, etc.)
- [ ] All features work in sidebar mode (citations, tracking, etc.)
- [ ] Modals display correctly in both modes

### Responsive Tests
- [ ] Sidebar at 320px width (minimum) - UI is usable
- [ ] Sidebar at 400px width (default popup) - matches popup appearance
- [ ] Sidebar at 600px width (wide) - uses extra space well
- [ ] Popup mode still works at 400px width
- [ ] Metadata form stacks appropriately at narrow widths
- [ ] Session actions buttons adapt to width
- [ ] Modals don't overflow viewport in any width

### Edge Cases
- [ ] Works on Chrome 113 and below (falls back to popup)
- [ ] Works on Chrome 114+ (sidebar available)
- [ ] No errors in console in either mode
- [ ] Switching between modes doesn't lose data
- [ ] Context menu appears on extension icon right-click

## Rollback Plan

If issues arise:
1. Switch back to main branch: `git checkout main`
2. The main branch retains the popup-only implementation
3. No data loss - all storage logic unchanged

## Deployment Notes

When ready to merge:
1. Test thoroughly on Chrome 114+ and Chrome 113-
2. Update README.md to mention sidebar support
3. Update release notes to highlight new feature
4. Consider bumping version to 1.1.0 (minor feature addition)

## Known Limitations

1. **Chrome Version Requirement**: Sidebar requires Chrome 114+ (June 2023)
   - Extension still works as popup on older versions
   - Setting toggle shows regardless but has no effect on old Chrome

2. **Sidebar Resizability**: Users can resize sidebar, but extension can't control default width
   - CSS media queries adapt to whatever width user sets

3. **Context Menu**: Only appears when right-clicking the extension icon in toolbar
   - Not visible in Chrome's extension menu

## Future Enhancements (Not in This Branch)

- Remember last sidebar width preference
- Different layouts optimized specifically for wide sidebars
- Keyboard shortcut to toggle between modes
- Sidebar-specific features (e.g., always-visible citation preview)

---

**End of Implementation Plan**
