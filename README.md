# Research Tracker Extension

A browser extension that captures and exports your research journey, including searches, visited pages, and notes.

## Overview

Research Tracker helps you document your research process by automatically tracking:
- Search queries across multiple search engines
- Web pages visited during research
- Notes and annotations you add
- Metadata from visited pages (authors, dates, citations, etc.)
- The connections between searches and resulting page visits

## Features

### 🔍 Search Tracking
- Captures searches from Google, Google Scholar, Bing, DuckDuckGo, Google News, and LexisNexis
- Records search queries, parameters, and timestamps
- Links searches to pages visited from search results

### 📄 Page Visit Tracking
- Records all pages visited during research sessions
- Extracts metadata using site-specific extractors for 140+ academic, news, and research sites
- Captures standard metadata (title, author, date) from any website
- Maintains the relationship between searches and discovered content

### 📝 Note Taking
- Add notes to any page or search
- Notes are timestamped and associated with their context
- Export includes all notes with their relationships preserved

### 📋 Citation Generation
- Generate formatted citations in APA, MLA, Chicago, Harvard, and IEEE styles
- Custom citation template support with extensive variable substitution
- Copy citations to clipboard with keyboard shortcuts
- Optional floating citation preview on web pages
- Smart formatting: automatic "pp." prefix for page numbers
- Configurable URL replacement: use DOI instead of URLs, replace database URLs with database names

### ⚙️ Metadata Management
- Edit and enhance page metadata through keyboard shortcuts (Ctrl/Cmd+1-8)
- Manual metadata editing with automatic extraction protection
- DOI-based metadata enhancement from external APIs
- Pending edits preservation across popup sessions
- Cross-session metadata persistence

### 💾 Export Options
- **JSON format**: Structured data for programmatic processing
- **TXT format**: Human-readable summary of your research
- Both formats contain identical information

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The Research Tracker extension should now appear in your extensions list

## Usage

### Starting a Research Session
1. Click the Research Tracker icon in your browser toolbar
2. Click "Start Recording" 
3. Optionally name your session (default: "Research Session [date]")

### During Research
- The extension automatically tracks your searches and page visits
- Click the extension icon and use "Add Note" to annotate the current page
- **Recording Status Indicators:**
  - Red "REC" badge: Active recording
  - Yellow "REC" badge: Recording paused
  - No badge: Not recording
  - Red badge with time (e.g., "5m"): Recording but inactive for 5+ minutes
- Use keyboard shortcuts to quickly set metadata from selected text
- Copy citations with Ctrl+Q or use the citation preview for quick access

### Ending a Session
1. Click the extension icon
2. Click "Stop Recording"
3. Choose your export format (JSON or TXT)
4. Save the file for later analysis

### Reviewing Past Sessions
- The main popup displays your 20 most recent sessions for quick access
- Click "View All Sessions" to see all sessions in a larger, browsable modal
- Resume, rename, export (JSON/TXT), or delete any session
- Sessions are stored in IndexedDB for unlimited storage capacity

### Keyboard Shortcuts
- **Ctrl/Cmd+0**: Auto-fill metadata from DOI in selected text
- **Ctrl/Cmd+1**: Set author from selected text
- **Ctrl/Cmd+2**: Set quals from selected text
- **Ctrl/Cmd+3**: Set date from selected text
- **Ctrl/Cmd+4**: Set title from selected text
- **Ctrl/Cmd+5**: Set journal from selected text
- **Ctrl/Cmd+6**: Set publication info from selected text
- **Ctrl/Cmd+7**: Set pages from selected text
- **Ctrl/Cmd+8**: Set DOI from selected text
- **Ctrl+Q**: Copy citation for current page

**Note:** The Ctrl+Q citation shortcut is interoperable with the [Fast Debate Paste utility](https://debate-decoded.ghost.io/leveling-up-verbatim/), allowing seamless integration with debate research workflows.

### Settings & Configuration
- **Citation Settings**: Choose citation format (APA, MLA, Chicago, Harvard, IEEE, or custom)
- **Citation Preview**: Enable/disable floating citation preview on web pages
- **URL Replacement**: Replace URLs with DOIs or database names in citations
- **Custom Database Domains**: Add your own database domain mappings
- **Excluded Domains**: Specify domains to exclude from research tracking
- **Debug Mode**: Enable detailed console logging for troubleshooting issues

### Additional Utilities

The extension includes additional utilities to enhance your research experience:

#### Always On Top Manager
Due to Chrome extension security limitations, the extension cannot set windows to be "always on top" directly. However, we've included an AutoHotkey script in the `/utilities/` folder that provides this functionality.

To use the Always On Top Manager:
1. Install [AutoHotkey](https://www.autohotkey.com/) on your computer
2. Run the `AlwaysOnTopManager.ahk` script from the `/utilities/` folder
3. Use the interface to select which windows should stay on top of others
4. Double-click any window in the list to toggle its always-on-top state

## Privacy

- All data is stored locally in your browser
- No data is sent to external servers
- You control when to export and share your research data
- Sessions can be deleted at any time

## Export Format

See [EXPORT_SPECIFICATION.md](EXPORT_SPECIFICATION.md) for detailed information about the export format and fields.

## Development

### Project Structure
```
Research Tracker Extension/
├── manifest.json          # Extension configuration
├── src/
│   ├── background/       # Background service worker
│   ├── content/          # Content scripts for metadata extraction
│   └── popup/            # Extension popup interface
├── css/                  # Styling
└── images/               # Extension icons
```

### Adding New Extractors
See [ADDING_NEW_EXTRACTORS.md](ADDING_NEW_EXTRACTORS.md) for instructions on adding site-specific metadata extractors.

### Development Setup
1. Clone the repository
2. Make your changes
3. Load the extension in developer mode
4. Test thoroughly across different websites

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

## Support

For issues, feature requests, or questions:
- Check existing documentation
- Review the troubleshooting guide
- Submit an issue on GitHub (if applicable)

## Site-Specific Extractors

Enhanced metadata extraction for:

**Academic & Research Sites:**
- arXiv.org - Preprint papers with abstracts and author lists
- PubMed/NCBI - Medical and life science research
- JSTOR - Academic journal articles
- DOI.org - Digital Object Identifier resolution
- NBER - National Bureau of Economic Research papers
- SSRN - Social Science Research Network

**Academic Publishers:**
- ScienceDirect/Elsevier - Scientific journals
- Nature - Nature Publishing Group journals
- Springer - Academic books and journals
- Wiley - Scientific and technical content
- Duke University Press - Academic publications
- SAGE Publications - Academic journals

**Major News Organizations:**
- New York Times, Washington Post, Wall Street Journal
- BBC, CNN, ABC News, NBC News, CBS News, CNBC
- The Guardian, Reuters, Bloomberg
- Los Angeles Times, USA Today, Newsweek
- Associated Press (AP News)

**International News:**
- Deutsche Welle (DW) - German international broadcaster
- The Globe and Mail - Canadian news
- Times of India, Indian Express, Hindustan Times
- Bangkok Post - Thai news
- The Japan Times - Japanese news in English

**Political News:**
- The Hill, National Review, The Daily Beast
- New York Post

**Think Tanks & Research Organizations:**
- Brookings Institution, RAND Corporation, Pew Research Center
- Cato Institute, Heritage Foundation, Urban Institute
- Carnegie Endowment, Atlantic Council, Hudson Institute
- Center for a New American Security (CNAS)
- American Progress, Hoover Institution
- Tax Policy Center, Baker Institute
- Resources for the Future (RFF)
- Foreign Policy Research Institute (FPRI)
- Reason Foundation, Mercatus Center
- Center on Budget and Policy Priorities (CBPP)
- Economic Policy Institute (EPI)
- Milken Institute, Third Way
- Competitive Enterprise Institute (CEI)
- R Street Institute, Aspen Institute

**Legal Research:**
- LexisNexis - Legal documents and case law

**Social Media & Forums:**
- Reddit - Subreddit posts and comments
- Twitter/X - Tweets and threads

**Other Sites:**
- Wikipedia - Encyclopedia articles
- Arctic Research WordPress - Arctic research blog
- Arctic News Blogspot - Arctic climate news
- Mongabay - Environmental news
- High North News - Arctic region news

## License

MIT License