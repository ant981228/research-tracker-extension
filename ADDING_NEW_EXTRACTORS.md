# Guide for Adding New Site-Specific Extractors

This document provides a comprehensive guide for future LLMs and developers on how to add site-specific metadata extractors to the Research Tracker Extension.

## Overview

When adding support for a new website, you need to update multiple files to ensure the metadata is properly extracted, stored, and displayed. This guide lists all the locations that need to be modified.

## Files to Update

### 1. **content.js** - Add the Site-Specific Extractor

**Location**: `/Research Tracker Extension/src/content/content.js`

#### Step 1: Register the domain in SITE_SPECIFIC_EXTRACTORS object (lines ~11-60)
```javascript
const SITE_SPECIFIC_EXTRACTORS = {
  // ... existing extractors ...
  
  // Add your new domain(s)
  'example.com': extractExampleMetadata,
  'www.example.com': extractExampleMetadata,
};
```

#### Step 2: Create the extractor function (add at the end of the file)
```javascript
// Example.com extractor
function extractExampleMetadata() {
  const metadata = {};
  
  try {
    // Extract title
    const titleEl = document.querySelector('h1.article-title');
    if (titleEl) {
      metadata.title = titleEl.textContent.trim();
    }
    
    // Extract author
    const authorEl = document.querySelector('.author-name');
    if (authorEl) {
      metadata.author = authorEl.textContent.trim();
    }
    
    // Extract publication date
    const dateEl = document.querySelector('time[datetime]');
    if (dateEl) {
      metadata.publishDate = dateEl.getAttribute('datetime');
    }
    
    // Set content type
    metadata.contentType = 'article'; // or 'report', 'news-article', etc.
    metadata.publisher = 'Example Publisher';
    
    // Add any site-specific fields
    // metadata.customField = extractedValue;
    
  } catch (e) {
    console.error('Error in Example extractor:', e);
  }
  
  return metadata;
}
```

### 2. **visualizer.js** - Update Source Quality Assessment

**Location**: `/visualizer.js`

#### Update the assessSourceQuality function (lines ~527-594)
Add your domain to the appropriate quality category:

```javascript
// For academic/research sites (excellent quality)
if (domain.endsWith('.edu') || domain.endsWith('.gov') || 
    domain.includes('scholar.google') || domain.includes('jstor.org') ||
    domain.includes('example.com') || // ADD YOUR DOMAIN HERE
    // ... other domains
```

### 3. **Extension Popup** - Update Metadata Edit Form (if adding new fields)

**Location**: `/Research Tracker Extension/src/popup/`

If your extractor introduces new metadata fields that users should be able to edit:

#### Update popup.html (lines ~59-122)
Add form fields for any new metadata:
```html
<div class="form-group">
  <label for="metadata-customfield">Custom Field:</label>
  <input type="text" id="metadata-customfield" placeholder="Description of field">
</div>
```

#### Update popup.js
1. Add variable declaration (lines ~31-42):
```javascript
let metadataCustomField;
```

2. Initialize the element (lines ~165-177):
```javascript
metadataCustomField = document.getElementById('metadata-customfield');
```

3. Update openMetadataModal to display the field (lines ~1129-1187):
```javascript
metadataCustomField.value = currentPageMetadata.customField || '';
```

4. Update saveMetadata to save the field (lines ~1193-1235):
```javascript
customField: metadataCustomField.value.trim(),
```

### 4. **EXPORT_SPECIFICATION.md** - Document New Fields

**Location**: `/EXPORT_SPECIFICATION.md`

If your extractor adds any new metadata fields not already documented:

1. Add the field to the metadata object specification (lines ~92-148)
2. Add a description in the Site-Specific Extractors section (lines ~228-268)
3. Update the version number at the top if making significant changes

Example addition:
```markdown
// In the metadata object specification
"customField": "string",         // Description of what this field contains

// In the Site-Specific Extractors section
**Your Category:**
- example.com - Brief description of what metadata is extracted
```

## Standard Metadata Fields

When creating your extractor, try to use these standard fields when applicable:

### Basic Fields
- `title` - Article/page title
- `author` - Single author name
- `authors` - Array of author names (when multiple)
- `publishDate` - Publication date (ISO format preferred)
- `publisher` - Publisher or website name
- `description` - Brief description or abstract
- `contentType` - Type of content (see below)

### Academic Fields
- `doi` - Digital Object Identifier
- `pmid` - PubMed ID
- `arxivId` - arXiv paper ID
- `jstorId` - JSTOR stable ID
- `citationKey` - Formatted citation (e.g., "doi:10.1234/xyz")
- `journal` - Journal name
- `abstract` - Full abstract text
- `subjects` - Subject categories
- `categories` - Categories as array
- `pdfUrl` - Direct PDF link

### News Fields
- `section` - News section/category
- `hasPaywall` - Boolean indicating if paywalled
- `lastUpdated` - Last update timestamp
- `tags` - Array of article tags

### Social Media Fields
- `username` - Username/handle
- `postType` - Type of post
- `score` - Upvotes/likes/score

## Content Types

Use one of these standard content types:
- `journal-article` - Academic journal article
- `preprint` - Preprint (arXiv, bioRxiv, etc.)
- `news-article` - News article
- `report` - Research report, white paper
- `book` - Book or book chapter
- `encyclopedia-article` - Encyclopedia entry
- `social-media-post` - Social media content
- `website` - Generic website
- `academic-article` - Generic academic content
- `legal-document` - Legal documents, court cases, statutes

## Testing Your Extractor

1. Load the extension in Chrome developer mode
2. Visit the target website
3. Start a recording session
4. Navigate to a page on the site
5. Check the console for extraction logs
6. Export the session data and verify metadata fields
7. Check the visualization website displays the metadata correctly

## Best Practices

1. **Graceful Degradation**: Always use try-catch blocks and check if elements exist
2. **Multiple Selectors**: Try multiple selectors for important fields (title, author)
3. **Clean Data**: Trim whitespace and remove unnecessary prefixes/suffixes
4. **Consistent Types**: Ensure dates are strings, authors can be string or array
5. **Console Logging**: Add console.log for debugging but remove for production
6. **Fallback Values**: Let generic extractors handle fields you can't extract

## Common Patterns

### Extracting from JSON-LD
```javascript
const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
for (const script of ldJsonScripts) {
  try {
    const data = JSON.parse(script.textContent);
    if (data['@type'] === 'Article') {
      if (data.headline) metadata.title = data.headline;
      // ... extract other fields
    }
  } catch (e) {
    // Continue with next script
  }
}
```

### Handling Multiple Authors
```javascript
const authorElements = document.querySelectorAll('.author-name');
if (authorElements.length > 0) {
  const authors = Array.from(authorElements).map(el => el.textContent.trim());
  metadata.authors = authors;
  metadata.author = authors.join(', ');
}
```

### Extracting Dates
```javascript
// From datetime attribute
const dateEl = document.querySelector('time[datetime]');
if (dateEl) {
  metadata.publishDate = dateEl.getAttribute('datetime');
}

// From text content with cleaning
const dateText = dateEl.textContent.trim();
const dateMatch = dateText.match(/(\d{4}-\d{2}-\d{2})/);
if (dateMatch) {
  metadata.publishDate = dateMatch[1];
}
```

## Debugging Tips

1. Use Chrome DevTools Console while on the target site
2. Test your selectors: `document.querySelector('your-selector')`
3. Check if the extension is injecting content script: Look for "Extracted metadata:" in console
4. Verify the extractor is registered: Check if your domain is in SITE_SPECIFIC_EXTRACTORS
5. Test with multiple pages on the same site to ensure consistency

## Future Considerations

When adding extractors, consider:
- Will the site's HTML structure change frequently?
- Are there multiple page types that need different extraction logic?
- Should certain page types be filtered out?
- Are there APIs available instead of scraping?

Remember to test thoroughly and update all necessary files to ensure a smooth user experience!