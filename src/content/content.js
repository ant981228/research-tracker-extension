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
      title: document.title || '',
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
    
    // Try to get author information
    const authorMeta = document.querySelector('meta[name="author"]');
    if (authorMeta) {
      metadata.author = authorMeta.getAttribute('content');
    }
    
    // Try to get publication date
    const dateMeta = document.querySelector('meta[name="date"], meta[property="article:published_time"]');
    if (dateMeta) {
      metadata.publishDate = dateMeta.getAttribute('content');
    }
    
    // Try to get description
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      metadata.description = descMeta.getAttribute('content');
    }
    
    // Try to extract schema.org metadata
    const schemaElements = document.querySelectorAll('script[type="application/ld+json"]');
    if (schemaElements.length > 0) {
      try {
        for (const element of schemaElements) {
          const schemaData = JSON.parse(element.textContent);
          if (schemaData) {
            metadata.schema = schemaData;
            break; // Use the first valid schema data found
          }
        }
      } catch (e) {
        console.error('Error parsing schema.org data:', e);
      }
    }
    
    return metadata;
  } catch (e) {
    console.error('Error extracting page metadata:', e);
    return { error: e.message };
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