# Research Tracker Export Specification

This document provides detailed technical specifications for the Research Tracker Chrome extension's export formats. It is intended to serve as a guide for implementing an intake system for the visualization website that will process these exports.

**Version 1.1** - Updated to include site-specific metadata extraction fields

## Overview

The Research Tracker extension captures detailed information about a user's research process, including searches performed, pages visited, and notes added. The extension exports this data in two formats:

1. **JSON** - A structured data format optimized for programmatic processing
2. **TXT** - A human-readable text format that preserves the same information

Both formats contain identical information but are structured differently. This document focuses primarily on the JSON format, which is recommended for the visualization website's intake process.

## JSON Export Structure

The JSON export is a single JSON object with the following top-level structure:

```json
{
  "id": "string",                    // Unique session identifier
  "name": "string",                  // User-defined session name
  "startTime": "ISO8601 timestamp",  // When the session began
  "endTime": "ISO8601 timestamp",    // When the session ended
  "searches": [...],                 // Array of search objects
  "contentPages": [...],             // Array of page visit objects
  "chronologicalEvents": [...]       // Array of all events in time order
}
```

### Session Metadata

- `id`: A unique identifier for the session, generated as a combination of timestamp and random characters
- `name`: User-defined name for the session; if not provided, defaults to "Research Session" + date
- `startTime`: ISO 8601 timestamp when the recording session began
- `endTime`: ISO 8601 timestamp when the recording session ended

### Searches Array

The `searches` array contains objects representing each search performed during the session. Each search object has the following structure:

```json
{
  "type": "search",                  // Event type identifier
  "engine": "string",                // Search engine identifier (e.g., "GOOGLE")
  "domain": "string",                // Domain of the search engine (e.g., "google.com")
  "query": "string",                 // The search query text
  "params": {                        // All search parameters
    "q": "string",                   // Main query parameter
    "...": "..."                     // Any additional parameters from the search URL
  },
  "url": "string",                   // Full URL of the search
  "timestamp": "ISO8601 timestamp",  // When the search was performed
  "tabId": number,                   // Browser tab ID where search was performed
  "notes": [                         // Optional array of notes for this search
    {
      "content": "string",           // Note text content
      "timestamp": "ISO8601 timestamp" // When the note was added
    }
  ]
}
```

#### Search Engine Identifiers

The extension recognizes and tracks the following search engines:

- `GOOGLE`: Standard Google search
- `GOOGLE_SCHOLAR`: Google Scholar
- `BING`: Microsoft Bing search
- `DUCKDUCKGO`: DuckDuckGo search
- `GOOGLE_NEWS`: Google News search

These identifiers are used in the `engine` field of search objects.

### Content Pages Array

The `contentPages` array contains objects representing each web page visited during the session. Each page visit object has the following structure:

```json
{
  "type": "pageVisit",               // Event type identifier
  "url": "string",                   // Full URL of the page
  "title": "string",                 // Page title
  "timestamp": "ISO8601 timestamp",  // When the page was visited
  "tabId": number,                   // Browser tab ID where page was opened
  "sourceSearch": {                  // Optional: search that led to this page
    "engine": "string",              // Search engine identifier
    "query": "string",               // Search query text
    "url": "string",                 // Full URL of the search
    "timestamp": "ISO8601 timestamp" // When the search was performed
  },
  "metadata": {                      // Optional page metadata
    "title": "string",               // Page title (may be more accurate than top-level)
    "url": "string",                 // URL (canonical URL if available)
    "author": "string",              // Author information if available
    "authors": ["string"],           // Array of authors (when multiple)
    "publishDate": "string",         // Publication date if available
    "description": "string",         // Page description/excerpt
    "publisher": "string",           // Publisher or website name
    "contentType": "string",         // Type of content (article, report, etc.)
    "extractorType": "string",       // "site-specific" or "generic"
    "extractorSite": "string",       // Hostname if site-specific extractor used
    
    // Academic/Research fields
    "abstract": "string",            // Academic abstract
    "doi": "string",                 // Digital Object Identifier
    "pmid": "string",                // PubMed ID
    "arxivId": "string",             // arXiv paper ID
    "jstorId": "string",             // JSTOR stable ID
    "citationKey": "string",         // Formatted citation key (e.g., "doi:10.1234/xyz")
    "journal": "string",             // Journal name
    "subjects": "string",            // Subject categories
    "categories": ["string"],        // Categories as array
    "pdfUrl": "string",              // Direct PDF link if available
    
    // News fields
    "section": "string",             // News section/category
    "hasPaywall": boolean,           // Whether content is paywalled
    "lastUpdated": "string",         // Last update timestamp
    "tags": ["string"],              // Article tags
    
    // Social media fields
    "subreddit": "string",           // Reddit subreddit
    "postType": "string",            // Type of post
    "score": "string",               // Upvotes/score
    "username": "string",            // Username/handle
    "tweetId": "string",             // Twitter/X tweet ID
    "tweetText": "string",           // Full tweet text
    
    // Think tank/Research org fields
    "publicationType": "string",     // Type of publication
    "documentType": "string",        // Document type
    "topics": ["string"],            // Research topics
    "randDocNumber": "string",       // RAND document number
    "category": "string",            // Report category
    
    // Wikipedia fields
    "language": "string",            // Wikipedia language code
    "lastModified": "string",        // Last modification date
    "permanentUrl": "string",        // Permanent Wikipedia URL
    "isOpenAccess": boolean,         // Whether content is open access
    
    // Metadata editing fields
    "manuallyEdited": boolean,       // Whether metadata was manually edited
    "editTimestamp": "string",       // When metadata was edited
    
    "schema": {}                     // Optional schema.org structured data if present
  },
  "notes": [                         // Optional array of notes for this page
    {
      "content": "string",           // Note text content
      "timestamp": "ISO8601 timestamp" // When the note was added
    }
  ]
}
```

### Chronological Events Array

The `chronologicalEvents` array contains all events in chronological order. This array includes searches, page visits, and standalone notes. Each event has a `type` field that determines its structure:

- For events with `type: "search"`, the structure matches the objects in the `searches` array
- For events with `type: "pageVisit"`, the structure matches the objects in the `contentPages` array
- For events with `type: "note"`, the structure is:

```json
{
  "type": "note",                    // Event type identifier
  "url": "string",                   // URL where the note was added
  "content": "string",               // Note text content
  "timestamp": "ISO8601 timestamp",  // When the note was added
  "orphaned": boolean                // Optional: true if note couldn't be associated with a page or search
}
```

- For events with `type: "session_ended"`, the structure is:

```json
{
  "type": "session_ended",           // Event type identifier
  "timestamp": "ISO8601 timestamp"   // When the session was stopped
}
```

- For events with `type: "session_resumed"`, the structure is:

```json
{
  "type": "session_resumed",         // Event type identifier
  "timestamp": "ISO8601 timestamp",  // When the session was resumed
  "previousEndTime": "ISO8601 timestamp" // When the session was previously ended
}
```

## Data Relationships

The data model establishes several important relationships:

1. **Source-Target Relationship**: The `sourceSearch` field in content page objects establishes a relationship between a search and any pages visited as a result of that search.

2. **Chronological Ordering**: Each object has a `timestamp` field allowing all events to be ordered chronologically in a timeline.

3. **Page-Note Association**: Notes are associated with specific pages or searches via the `notes` array in each object.

4. **Tab Context**: The `tabId` field allows reconstruction of research activity across multiple browser tabs.

## Technical Notes

### Timestamps

All timestamps in the export are ISO 8601 formatted strings (e.g., "2025-05-18T20:15:30.123Z"). They include millisecond precision and are in UTC timezone.

### URLs

All URLs are stored as complete, absolute URLs including protocol, domain, path, and query parameters.

### Duplicate Notes Handling

The export process automatically deduplicates notes that have:
1. Identical content
2. Timestamps within 5 seconds of each other

This ensures that exports don't contain accidental duplicate notes from double-clicks or other UI interactions.

### Note Format

Notes are simple text strings with no formatting. The extension does not support rich text or markdown in notes.

### Search Parameters

The `params` object in search events contains all query parameters from the search URL. The most important is typically `q` which contains the main search query, but other parameters may include:
- `tbm`: Google search type filter
- `start`: Pagination offset
- `hl`: Language
- `filter`: Various filtering options

### Session Resumption

Sessions can be resumed after they have been completed. When a session is resumed:

1. The completed session is removed from the completed sessions list
2. A `session_resumed` event is added to the timeline showing when resumption occurred
3. The session's `endTime` is cleared to indicate it's active again
4. New activity continues to be appended to the existing session data
5. When stopped again, a new `session_ended` event is recorded

This allows for discontinuous research sessions while maintaining a complete timeline of all activity. The session break periods are clearly marked in both JSON and TXT exports.

### Metadata Extraction

Page metadata is extracted through:
1. Site-specific extractors for major websites (when available)
2. Standard HTML meta tags
3. Open Graph protocol tags
4. Schema.org JSON-LD structured data

The availability and completeness of metadata varies considerably depending on the website visited.

#### Site-Specific Extractors

The extension includes specialized metadata extractors for the following domains:

**Academic/Research Sites:**
- arXiv.org - Extracts arXiv ID, authors array, abstract, subjects, PDF links
- PubMed/NCBI - Extracts PMID, journal info, DOI, medical abstracts
- JSTOR - Extracts JSTOR ID, scholarly article metadata
- DOI.org - Extracts DOI identifiers

**News Organizations:**
- New York Times - Enhanced article metadata, section info, paywall status
- Washington Post - Article metadata with sections
- Wall Street Journal - Article type, paywall indicator
- The Guardian - Tags, sections, high-quality structured data
- BBC - Section categorization
- CNN - Last updated timestamps

**Academic Publishers:**
- ScienceDirect/Elsevier - Journal info, DOI, abstracts
- Nature - Scientific article metadata
- Springer - Academic paper details
- Wiley - Journal article information

**Social Media:**
- Reddit - Subreddit, post type, scores, usernames
- Twitter/X - Tweet ID, full text, usernames

**Think Tanks/Research Organizations:**
- Brookings Institution - Report types, topics
- RAND Corporation - Document numbers, report metadata
- Pew Research - Research categories, topics

**Legal Research:**
- LexisNexis (advance.lexis.com, lexis.com, lexisnexis.com) - Document title, source publication, author/byline, publish date, content type classification

**Other:**
- Wikipedia - Categories, language, last modified date, permanent URLs

When a site-specific extractor is used, the metadata will include:
- `extractorType`: "site-specific" 
- `extractorSite`: The hostname where the extractor was applied

This allows the visualization system to know which metadata fields are likely to be available and accurate.

## TXT Export Format

The TXT export presents the same information in a human-readable format with the following sections:

1. **Session Summary**: Basic information about the session
2. **Research Summary**: Count of searches, pages, and events
3. **Searches**: List of all searches with timestamps and notes
4. **Content Pages**: List of all pages visited with metadata and notes
5. **Chronological Events**: List of all events in time order

Session breaks are clearly marked in the chronological events section with visual separators:
- `======= SESSION ENDED =======` when a session is stopped
- `======= SESSION RESUMED =======` when a session is resumed, including the timestamp of when it was previously ended

While the TXT format is human-readable, the JSON format is recommended for intake processing due to its structured nature.

## Visualization Website Integration Guidelines

When developing the visualization website's intake system:

1. **JSON Parsing**: Use standard JSON parsing libraries to process the export files.

2. **Data Validation**: Validate that required fields are present before processing.

3. **Timeline Construction**: Use the `chronologicalEvents` array for building the research timeline.

4. **Graph Construction**: Use the relationships between searches and content pages to build a graph of the research journey.

5. **Citation Matching**: When matching citations to visited pages:
   - Match by URL (exact or domain-based matching)
   - Match by title (fuzzy matching may be necessary)
   - Consider using metadata like author and publication date for additional matching precision

6. **Handle Missing Data**: Some fields may be empty or missing depending on the websites visited and browser behavior.

7. **Cross-Browser Compatibility**: The extension tracks data consistently across browsers, but some browser-specific information like tab IDs may vary.

## Example JSON Export

```json
{
  "id": "loj2zpmqr6bs3",
  "name": "Research on Climate Change",
  "startTime": "2025-05-18T19:30:45.123Z",
  "endTime": "2025-05-18T20:45:12.456Z",
  "searches": [
    {
      "type": "search",
      "engine": "GOOGLE",
      "domain": "google.com",
      "query": "climate change impact sea levels",
      "params": {
        "q": "climate change impact sea levels",
        "tbm": "nws"
      },
      "url": "https://www.google.com/search?q=climate+change+impact+sea+levels&tbm=nws",
      "timestamp": "2025-05-18T19:31:02.789Z",
      "tabId": 12345,
      "notes": [
        {
          "content": "Starting my research on sea level rise",
          "timestamp": "2025-05-18T19:31:15.123Z"
        }
      ]
    }
  ],
  "contentPages": [
    {
      "type": "pageVisit",
      "url": "https://www.scientificamerican.com/article/sea-level-rise-projections/",
      "title": "New Sea Level Rise Projections Alarm Scientists",
      "timestamp": "2025-05-18T19:32:45.789Z",
      "tabId": 12345,
      "sourceSearch": {
        "engine": "GOOGLE",
        "query": "climate change impact sea levels",
        "url": "https://www.google.com/search?q=climate+change+impact+sea+levels&tbm=nws",
        "timestamp": "2025-05-18T19:31:02.789Z"
      },
      "metadata": {
        "title": "New Sea Level Rise Projections Alarm Scientists",
        "url": "https://www.scientificamerican.com/article/sea-level-rise-projections/",
        "author": "Jane Smith",
        "publishDate": "2025-05-10",
        "description": "Recent studies show sea levels rising faster than previously predicted..."
      },
      "notes": [
        {
          "content": "Important data on acceleration of sea level rise",
          "timestamp": "2025-05-18T19:35:12.456Z"
        }
      ]
    }
  ],
  "chronologicalEvents": [
    {
      "type": "search",
      "engine": "GOOGLE",
      "domain": "google.com",
      "query": "climate change impact sea levels",
      "params": {
        "q": "climate change impact sea levels",
        "tbm": "nws"
      },
      "url": "https://www.google.com/search?q=climate+change+impact+sea+levels&tbm=nws",
      "timestamp": "2025-05-18T19:31:02.789Z",
      "tabId": 12345,
      "notes": [
        {
          "content": "Starting my research on sea level rise",
          "timestamp": "2025-05-18T19:31:15.123Z"
        }
      ]
    },
    {
      "type": "pageVisit",
      "url": "https://www.scientificamerican.com/article/sea-level-rise-projections/",
      "title": "New Sea Level Rise Projections Alarm Scientists",
      "timestamp": "2025-05-18T19:32:45.789Z",
      "tabId": 12345,
      "sourceSearch": {
        "engine": "GOOGLE",
        "query": "climate change impact sea levels",
        "url": "https://www.google.com/search?q=climate+change+impact+sea+levels&tbm=nws",
        "timestamp": "2025-05-18T19:31:02.789Z"
      },
      "metadata": {
        "title": "New Sea Level Rise Projections Alarm Scientists",
        "url": "https://www.scientificamerican.com/article/sea-level-rise-projections/",
        "author": "Jane Smith",
        "publishDate": "2025-05-10",
        "description": "Recent studies show sea levels rising faster than previously predicted..."
      },
      "notes": [
        {
          "content": "Important data on acceleration of sea level rise",
          "timestamp": "2025-05-18T19:35:12.456Z"
        }
      ]
    }
  ]
}
```