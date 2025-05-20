# Research Tracker Chrome Extension

This Chrome extension automatically records your research process, tracking searches, visited pages, and allowing you to add notes during your research sessions.

## Features

- Tracks searches across multiple platforms (Google, Google Scholar, Bing, DuckDuckGo, Google News)
- Records search queries, results shown, and pages clicked
- Captures metadata for every webpage visited
- Allows adding notes to specific pages during research
- Supports pausing and resuming recording sessions
- Exports session data as JSON or TXT for further analysis

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The Research Tracker extension should now appear in your extensions list

## Usage

### Starting a Session

1. Click the Research Tracker icon in your browser toolbar
2. Click "Start Recording" to begin a new research session
3. The extension will now track your searches and page visits

### During Research

- Use the web normally - the extension will automatically track your searches and page visits
- Add notes about specific pages by clicking the extension icon and entering text in the notes section
- You can pause recording temporarily using the "Pause" button
- Resume recording with the "Resume" button when ready

### Ending a Session

1. Click the Research Tracker icon
2. Click "Stop" to end the current session
3. Your session will be saved and appear in the "Previous Sessions" list

### Exporting Data

1. Click the Research Tracker icon
2. Under "Previous Sessions," find the session you want to export
3. Click "Export JSON" or "Export TXT" to download your research data
4. Use this data with compatible visualization tools

## Data Collected

The extension collects:

- Search queries and the platform used
- Search results shown (titles, URLs, snippets)
- Pages clicked and visited
- Page metadata (title, URL, author, publication date when available)
- User-added notes
- Timestamps for all events

## Privacy

- All data is stored locally in your browser
- No data is sent to any server
- You control when to start and stop recording
- Export and delete your data at any time

## License

MIT License