// Helper functions for search engines
const SEARCH_EXTRACTORS = {
  GOOGLE: extractGoogleResults,
  GOOGLE_SCHOLAR: extractGoogleScholarResults,
  BING: extractBingResults,
  DUCKDUCKGO: extractDuckDuckGoResults,
  GOOGLE_NEWS: extractGoogleNewsResults
};

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'extractMetadata':
      const metadata = extractPageMetadata();
      sendResponse({ metadata });
      break;
    
    case 'extractSearchResults':
      if (message.engine && SEARCH_EXTRACTORS[message.engine]) {
        const results = SEARCH_EXTRACTORS[message.engine]();
        chrome.runtime.sendMessage({
          action: 'searchResultsExtracted',
          results,
          engine: message.engine,
          url: window.location.href
        });
      }
      sendResponse({ success: true });
      break;
  }
  
  return true; // Keep the message channel open for async responses
});

// Extract basic metadata from any page
function extractPageMetadata() {
  try {
    const metadata = {
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
    
    // Enhanced title extraction - try multiple strategies
    metadata.title = extractPageTitle();
    
    // Try to get author information (enhanced)
    metadata.author = extractAuthor();
    
    // Try to get publication date (enhanced)
    metadata.publishDate = extractPublicationDate();
    
    // Try to get description
    const descMeta = document.querySelector('meta[name="description"], meta[property="og:description"]');
    if (descMeta) {
      metadata.description = descMeta.getAttribute('content');
    }
    
    // Try to extract schema.org metadata
    extractSchemaMetadata(metadata);
    
    // Try to extract Open Graph or Twitter card metadata
    extractSocialMediaMetadata(metadata);
    
    console.log('Extracted metadata:', metadata);
    return metadata;
  } catch (e) {
    console.error('Error extracting page metadata:', e);
    return { 
      error: e.message,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      title: document.title || ''
    };
  }
}

// Enhanced title extraction
function extractPageTitle() {
  // Strategy 1: Look for article/page headline first (most reliable for articles)
  const headline = document.querySelector('h1, [itemprop="headline"], .article-title, .entry-title, .post-title, .headline, article h2, .article__title');
  if (headline && headline.textContent.trim()) {
    return headline.textContent.trim();
  }
  
  // Strategy 2: Try Open Graph title
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && ogTitle.getAttribute('content')) {
    return ogTitle.getAttribute('content');
  }
  
  // Strategy 3: Try Twitter card title
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle && twitterTitle.getAttribute('content')) {
    return twitterTitle.getAttribute('content');
  }
  
  // Strategy 4: Try various other meta titles
  const metaTitle = document.querySelector('meta[name="title"], meta[name="Title"]');
  if (metaTitle && metaTitle.getAttribute('content')) {
    return metaTitle.getAttribute('content');
  }
  
  // Fallback to document.title (least reliable but universally available)
  return document.title || '';
}

// Enhanced author extraction
function extractAuthor() {
  // Try multiple strategies to find author
  
  // Strategy 1: Check meta tags (most common and reliable)
  const authorMeta = document.querySelector('meta[name="author"], meta[property="article:author"], meta[property="og:author"], meta[name="twitter:creator"]');
  if (authorMeta && authorMeta.getAttribute('content')) {
    return authorMeta.getAttribute('content');
  }
  
  // Strategy 2: Look for author in schema.org markup
  const schemaAuthor = document.querySelector('[itemprop="author"] [itemprop="name"]');
  if (schemaAuthor && schemaAuthor.textContent.trim()) {
    return schemaAuthor.textContent.trim();
  }
  
  // Strategy 3: Look for common author classes/elements
  const authorElement = document.querySelector('.author, .byline, .article-author, .entry-author, .post-author, .writer, .article__author, .article-meta a[rel="author"]');
  if (authorElement && authorElement.textContent.trim()) {
    return authorElement.textContent.trim().replace(/^by\s+|^author[:\s]+/i, '');
  }
  
  return '';
}

// Enhanced publication date extraction
function extractPublicationDate() {
  // Strategy 1: Look for time elements with datetime attribute
  const timeElement = document.querySelector('time[datetime], [itemprop="datePublished"], [itemprop="dateModified"]');
  if (timeElement && timeElement.getAttribute('datetime')) {
    return timeElement.getAttribute('datetime');
  }
  
  // Strategy 2: Check meta tags
  const dateMeta = document.querySelector('meta[name="date"], meta[property="article:published_time"], meta[property="og:published_time"], meta[name="publication-date"]');
  if (dateMeta && dateMeta.getAttribute('content')) {
    return dateMeta.getAttribute('content');
  }
  
  // Strategy 3: Look for common date classes
  const dateElement = document.querySelector('.date, .published, .article-date, .entry-date, .post-date, .article__date');
  if (dateElement && dateElement.textContent.trim()) {
    const dateText = dateElement.textContent.trim();
    // Return as-is, browser will handle parsing
    return dateText;
  }
  
  return '';
}

// Extract structured data from schema.org JSON-LD
function extractSchemaMetadata(metadata) {
  try {
    const schemaElements = document.querySelectorAll('script[type="application/ld+json"]');
    if (schemaElements.length > 0) {
      for (const element of schemaElements) {
        try {
          const schemaData = JSON.parse(element.textContent);
          if (!schemaData) continue;
          
          // Store raw schema for debugging
          metadata.schema = schemaData;
          
          // Extract specific fields if they weren't already found
          if (schemaData.headline && !metadata.title) {
            metadata.title = schemaData.headline;
          }
          
          // Handle author from schema
          if (schemaData.author && !metadata.author) {
            if (typeof schemaData.author === 'string') {
              metadata.author = schemaData.author;
            } else if (schemaData.author.name) {
              metadata.author = schemaData.author.name;
            }
          }
          
          // Handle dates from schema
          if (schemaData.datePublished && !metadata.publishDate) {
            metadata.publishDate = schemaData.datePublished;
          }
          
          // If we found useful data, break out
          if (metadata.title && metadata.author && metadata.publishDate) {
            break;
          }
        } catch (e) {
          console.error('Error parsing schema.org data item:', e);
        }
      }
    }
  } catch (e) {
    console.error('Error processing schema.org data:', e);
  }
}

// Extract metadata from Open Graph and Twitter cards
function extractSocialMediaMetadata(metadata) {
  try {
    // Only use these if we don't already have the data
    if (!metadata.title) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        metadata.title = ogTitle.getAttribute('content');
      }
    }
    
    if (!metadata.description) {
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) {
        metadata.description = ogDesc.getAttribute('content');
      }
    }
    
    if (!metadata.title) {
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) {
        metadata.title = twitterTitle.getAttribute('content');
      }
    }
    
    if (!metadata.description) {
      const twitterDesc = document.querySelector('meta[name="twitter:description"]');
      if (twitterDesc) {
        metadata.description = twitterDesc.getAttribute('content');
      }
    }
    
    // Get site name as publisher
    const siteName = document.querySelector('meta[property="og:site_name"]');
    if (siteName) {
      metadata.publisher = siteName.getAttribute('content');
    }
  } catch (e) {
    console.error('Error extracting social media metadata:', e);
  }
}

// Search result extractors
function extractGoogleResults() {
  try {
    const results = [];
    const searchItems = document.querySelectorAll('div.g');
    
    searchItems.forEach((item, index) => {
      try {
        const titleElement = item.querySelector('h3');
        const linkElement = item.querySelector('a');
        const snippetElement = item.querySelector('.VwiC3b');
        
        if (titleElement && linkElement) {
          const result = {
            position: index + 1,
            title: titleElement.textContent.trim(),
            url: linkElement.href,
            snippet: snippetElement ? snippetElement.textContent.trim() : ''
          };
          
          results.push(result);
        }
      } catch (e) {
        console.error('Error processing search result item:', e);
      }
    });
    
    return {
      query: new URLSearchParams(window.location.search).get('q'),
      count: results.length,
      results
    };
  } catch (e) {
    console.error('Error extracting Google search results:', e);
    return { error: e.message };
  }
}

function extractGoogleScholarResults() {
  try {
    const results = [];
    const searchItems = document.querySelectorAll('.gs_ri');
    
    searchItems.forEach((item, index) => {
      try {
        const titleElement = item.querySelector('.gs_rt a');
        const authorsElement = item.querySelector('.gs_a');
        const snippetElement = item.querySelector('.gs_rs');
        
        if (titleElement) {
          const result = {
            position: index + 1,
            title: titleElement.textContent.trim(),
            url: titleElement.href,
            authors: authorsElement ? authorsElement.textContent.trim() : '',
            snippet: snippetElement ? snippetElement.textContent.trim() : ''
          };
          
          results.push(result);
        }
      } catch (e) {
        console.error('Error processing Scholar result item:', e);
      }
    });
    
    return {
      query: new URLSearchParams(window.location.search).get('q'),
      count: results.length,
      results
    };
  } catch (e) {
    console.error('Error extracting Google Scholar results:', e);
    return { error: e.message };
  }
}

function extractBingResults() {
  try {
    const results = [];
    const searchItems = document.querySelectorAll('.b_algo');
    
    searchItems.forEach((item, index) => {
      try {
        const titleElement = item.querySelector('h2 a');
        const snippetElement = item.querySelector('.b_caption p');
        
        if (titleElement) {
          const result = {
            position: index + 1,
            title: titleElement.textContent.trim(),
            url: titleElement.href,
            snippet: snippetElement ? snippetElement.textContent.trim() : ''
          };
          
          results.push(result);
        }
      } catch (e) {
        console.error('Error processing Bing result item:', e);
      }
    });
    
    return {
      query: new URLSearchParams(window.location.search).get('q'),
      count: results.length,
      results
    };
  } catch (e) {
    console.error('Error extracting Bing search results:', e);
    return { error: e.message };
  }
}

function extractDuckDuckGoResults() {
  try {
    const results = [];
    const searchItems = document.querySelectorAll('.result');
    
    searchItems.forEach((item, index) => {
      try {
        const titleElement = item.querySelector('.result__title a');
        const snippetElement = item.querySelector('.result__snippet');
        
        if (titleElement) {
          const result = {
            position: index + 1,
            title: titleElement.textContent.trim(),
            url: titleElement.href,
            snippet: snippetElement ? snippetElement.textContent.trim() : ''
          };
          
          results.push(result);
        }
      } catch (e) {
        console.error('Error processing DuckDuckGo result item:', e);
      }
    });
    
    return {
      query: new URLSearchParams(window.location.search).get('q'),
      count: results.length,
      results
    };
  } catch (e) {
    console.error('Error extracting DuckDuckGo search results:', e);
    return { error: e.message };
  }
}

function extractGoogleNewsResults() {
  try {
    const results = [];
    const searchItems = document.querySelectorAll('article');
    
    searchItems.forEach((item, index) => {
      try {
        const titleElement = item.querySelector('h3 a, h4 a');
        const sourceElement = item.querySelector('time');
        
        if (titleElement) {
          const result = {
            position: index + 1,
            title: titleElement.textContent.trim(),
            url: titleElement.href,
            source: sourceElement ? sourceElement.textContent.trim() : ''
          };
          
          results.push(result);
        }
      } catch (e) {
        console.error('Error processing Google News result item:', e);
      }
    });
    
    return {
      query: new URLSearchParams(window.location.search).get('q'),
      count: results.length,
      results
    };
  } catch (e) {
    console.error('Error extracting Google News results:', e);
    return { error: e.message };
  }
}

// Track clicks on search results
document.addEventListener('click', (event) => {
  // Only track if we're on a search engine
  const hostname = window.location.hostname;
  const isSearchEngine = ['google.com', 'www.google.com', 'scholar.google.com', 
                           'bing.com', 'www.bing.com', 'duckduckgo.com', 
                           'news.google.com'].includes(hostname);
  
  if (!isSearchEngine) return;
  
  let target = event.target;
  
  // Check if the click is on or within a search result link
  while (target && target !== document) {
    if (target.tagName === 'A' && target.href) {
      // This seems to be a link click
      const resultData = {
        url: target.href,
        text: target.textContent.trim(),
        timestamp: new Date().toISOString(),
        sourceUrl: window.location.href,
        sourceQuery: new URLSearchParams(window.location.search).get('q')
      };
      
      chrome.runtime.sendMessage({
        action: 'searchResultClicked',
        resultData
      });
      
      break;
    }
    target = target.parentNode;
  }
});