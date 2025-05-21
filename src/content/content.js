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

// Greatly enhanced title extraction
function extractPageTitle() {
  let title = '';
  
  // Strategy 1: Look for article/page headlines (most reliable for articles)
  const headlineSelectors = [
    // Common article title selectors
    'h1.article-title', 'h1.entry-title', 'h1.post-title', 'h1.title', 'h1.main-title',
    'article h1', '.article h1', '.post h1', '.entry h1', 
    
    // Schema.org markup
    '[itemprop="headline"]', 
    
    // Common CSS classes for headlines
    '.article-title', '.entry-title', '.post-title', '.headline', '.article__title', 
    '.story-headline', '.content-headline', '.page-headline', '.story-title',
    '.news-article-title', '.card-title', '.blog-post-title', '.content-title',
    
    // Generic h1
    'h1'
  ];
  
  // Try each selector until we find one that works
  for (const selector of headlineSelectors) {
    const headlineElement = document.querySelector(selector);
    if (headlineElement && headlineElement.textContent.trim()) {
      title = headlineElement.textContent.trim();
      // Verify this isn't a website name (usually shorter than 3 words)
      if (title.split(/\s+/).length >= 3) {
        return title;
      }
      // If it's shorter, store it but keep looking for a better option
      if (!title) {
        title = headlineElement.textContent.trim();
      }
    }
  }
  
  // Strategy 2: Try multiple h1 elements (sometimes multiple exist, get the most relevant one)
  const h1Elements = document.querySelectorAll('h1');
  if (h1Elements.length > 1) {
    // Find the h1 with the most text content (usually the main title)
    let longestH1 = '';
    h1Elements.forEach(h1 => {
      const text = h1.textContent.trim();
      if (text.length > longestH1.length) {
        longestH1 = text;
      }
    });
    
    if (longestH1 && (!title || longestH1.length > title.length)) {
      title = longestH1;
    }
  }
  
  // Strategy 3: Try meta tags (very reliable when available)
  const metaSelectors = [
    // Open Graph
    'meta[property="og:title"]',
    'meta[property="og:site_name"]',
    
    // Twitter card
    'meta[name="twitter:title"]',
    
    // Various meta titles
    'meta[name="title"]',
    'meta[name="Title"]',
    'meta[name="dc.title"]',
    'meta[property="article:title"]',
    'meta[property="headline"]'
  ];
  
  for (const selector of metaSelectors) {
    const metaElement = document.querySelector(selector);
    if (metaElement && metaElement.getAttribute('content')) {
      const metaContent = metaElement.getAttribute('content').trim();
      // Only use if it's reasonably long (to avoid just getting the site name)
      if (metaContent.length > 10 && (!title || metaContent.length > title.length)) {
        title = metaContent;
        break;
      }
    }
  }
  
  // Strategy 4: Try JSON-LD and other structured data directly
  try {
    const scriptElements = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scriptElements) {
      try {
        const data = JSON.parse(script.textContent);
        if (data && data.headline) {
          title = data.headline;
          break;
        }
        
        // Handle Article type
        if (data && data['@type'] === 'Article' && data.name) {
          title = data.name;
          break;
        }
        
        // Handle WebPage type
        if (data && data['@type'] === 'WebPage' && data.name) {
          title = data.name;
          break;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  } catch (e) {
    // Ignore errors in script parsing
  }
  
  // Strategy 5: Look for title in ld+json or application/json scripts
  if (!title) {
    try {
      const jsonScripts = document.querySelectorAll('script:not([type]), script[type="text/javascript"], script[type="application/json"]');
      for (const script of jsonScripts) {
        try {
          // Try to find JSON-like content that mentions "title"
          const text = script.textContent;
          if (text.includes('"title"') || text.includes('"headline"')) {
            const titleMatch = text.match(/"(?:title|headline)"\s*:\s*"([^"]+)"/);
            if (titleMatch && titleMatch[1]) {
              title = titleMatch[1];
              break;
            }
          }
        } catch (e) {
          // Ignore errors
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }
  
  // Strategy 6: Analyze page structure for likely titles (for sites with non-standard layouts)
  if (!title) {
    // Look for large, prominent text near the top of the page
    const contentArea = document.querySelector('main, article, .content, .article, #content, .main, .post');
    if (contentArea) {
      // Get all heading elements in the content area
      const headings = contentArea.querySelectorAll('h1, h2, h3');
      
      if (headings.length > 0) {
        // Use the first heading in the content area
        title = headings[0].textContent.trim();
      }
    }
  }
  
  // Fallback to document.title but clean it up
  if (!title) {
    title = document.title || '';
    
    // Clean up document.title by removing site name (usually comes after a separator)
    const separators = [' - ', ' | ', ' » ', ' : ', ' – ', ' :: ', ' // '];
    for (const separator of separators) {
      if (title.includes(separator)) {
        // Typically, the title is before the separator, site name after
        title = title.split(separator)[0].trim();
        break;
      }
    }
  }
  
  // Final cleaning - truncate and sanitize
  return title.replace(/\s+/g, ' ').trim();
}

// Greatly enhanced author extraction
function extractAuthor() {
  let author = '';
  
  // Strategy 1: Check meta tags (most common and reliable)
  const authorMetaSelectors = [
    'meta[name="author"]', 
    'meta[property="article:author"]', 
    'meta[property="og:author"]', 
    'meta[name="twitter:creator"]',
    'meta[name="dc.creator"]',
    'meta[name="book:author"]',
    'meta[property="book:author"]'
  ];
  
  for (const selector of authorMetaSelectors) {
    const metaElement = document.querySelector(selector);
    if (metaElement && metaElement.getAttribute('content')) {
      author = metaElement.getAttribute('content').trim();
      if (author) return author;
    }
  }
  
  // Strategy 2: Look for author in schema.org markup (more thorough)
  const schemaAuthorSelectors = [
    '[itemprop="author"][itemscope] [itemprop="name"]', 
    '[itemprop="author"] [itemprop="name"]',
    '[itemprop="author"]',
    '[itemtype*="Person"] [itemprop="name"]'
  ];
  
  for (const selector of schemaAuthorSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      if (element.getAttribute('content')) {
        author = element.getAttribute('content').trim();
      } else if (element.textContent) {
        author = element.textContent.trim();
      }
      
      if (author) return author;
    }
  }
  
  // Strategy 3: Look for common author classes/elements (expanded list)
  const authorElementSelectors = [
    '.author', '.byline', '.article-author', '.entry-author', '.post-author', 
    '.writer', '.article__author', '.article-meta a[rel="author"]',
    '.auth', '.creator', '.submitted-by', '.contributor', '.username',
    '.article__byline', '.c-byline__author', '.story-meta .name',
    '.ArticlePage-authorName', '.author-name', '.author-link',
    '.o-author__name', '.c-author', '[rel="author"]'
  ];
  
  for (const selector of authorElementSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      author = element.textContent.trim()
        // Clean up common prefixes
        .replace(/^by\s+|^author[:\s]+|^written by\s+|^posted by\s+|^[Bb]y:?\s*/i, '')
        // Clean up suffixes
        .replace(/\s*\|\s*.*$|\s*\d{1,2}\/\d{1,2}\/\d{2,4}.*$/, '');
      
      if (author) return author;
    }
  }
  
  // Strategy 4: Look for authors in JSON-LD data (which might have been missed)
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        
        // Check common author patterns in JSON-LD
        if (data && data.author) {
          if (typeof data.author === 'string') {
            return data.author;
          } else if (data.author.name) {
            return data.author.name;
          } else if (Array.isArray(data.author) && data.author.length > 0) {
            if (typeof data.author[0] === 'string') {
              return data.author[0];
            } else if (data.author[0].name) {
              return data.author[0].name;
            }
          }
        }
        
        // Check creator in schema.org CreativeWork
        if (data && data.creator) {
          if (typeof data.creator === 'string') {
            return data.creator;
          } else if (data.creator.name) {
            return data.creator.name;
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  // Strategy 5: Look for bylines near the title or at the beginning of content
  if (!author) {
    // First try to find the content area
    const contentArea = document.querySelector('main, article, .content, .article, #content, .main, .post');
    if (contentArea) {
      // Look for elements that might contain author info near the top
      const possibleAuthorElements = contentArea.querySelectorAll('p, div, span, a');
      
      for (let i = 0; i < Math.min(10, possibleAuthorElements.length); i++) {
        const element = possibleAuthorElements[i];
        const text = element.textContent.trim();
        
        // Look for text that matches common author patterns
        if (/^by\s+|^author[:\s]+|^written by\s+|published by\s+/i.test(text) ||
            /^[A-Z][a-z]+ [A-Z][a-z]+,?\s+(?:[A-Za-z]+\s+)?(?:Staff|Editor|Writer|Reporter|Contributor)/i.test(text)) {
          
          author = text.replace(/^by\s+|^author[:\s]+|^written by\s+|^published by\s+/i, '')
                      .replace(/,?\s+(?:Staff|Editor|Writer|Reporter|Contributor).*$/i, '')
                      .trim();
          
          if (author && author.split(/\s+/).length <= 5) {
            return author;
          }
        }
      }
    }
  }
  
  return author;
}

// Greatly enhanced publication date extraction
function extractPublicationDate() {
  let dateStr = '';
  
  // Strategy 1: Look for time elements with datetime attribute
  const timeSelectors = [
    'time[datetime]', 
    '[itemprop="datePublished"]', 
    '[itemprop="dateModified"]',
    '[property="datePublished"]',
    '[property="dateModified"]'
  ];
  
  for (const selector of timeSelectors) {
    const timeElement = document.querySelector(selector);
    if (timeElement) {
      if (timeElement.getAttribute('datetime')) {
        dateStr = timeElement.getAttribute('datetime');
        if (dateStr) return dateStr;
      } else if (timeElement.getAttribute('content')) {
        dateStr = timeElement.getAttribute('content');
        if (dateStr) return dateStr;
      } else if (timeElement.textContent.trim()) {
        // Check if time element has child text
        const text = timeElement.textContent.trim();
        // Simple check for plausible date formats
        if (/\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(text) || 
            /\d{1,2} [A-Za-z]+ \d{4}/.test(text)) {
          return text;
        }
      }
    }
  }
  
  // Strategy 2: Check meta tags (greatly expanded)
  const dateMetaSelectors = [
    'meta[name="date"]',
    'meta[property="article:published_time"]',
    'meta[property="og:published_time"]',
    'meta[name="publication-date"]',
    'meta[name="publish-date"]',
    'meta[name="pub_date"]',
    'meta[name="published_at"]',
    'meta[name="release_date"]',
    'meta[name="date.issued"]',
    'meta[property="article:published"]',
    'meta[name="dc.date.issued"]',
    'meta[name="dc.date.published"]',
    'meta[name="dc.date.created"]',
    'meta[name="article:published_time"]'
  ];
  
  for (const selector of dateMetaSelectors) {
    const metaElement = document.querySelector(selector);
    if (metaElement && metaElement.getAttribute('content')) {
      dateStr = metaElement.getAttribute('content');
      if (dateStr) return dateStr;
    }
  }
  
  // Strategy 3: Try to find structured data in JSON-LD
  try {
    const scriptElements = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scriptElements) {
      try {
        const data = JSON.parse(script.textContent);
        // Check for datePublished in various JSON-LD formats
        if (data) {
          if (data.datePublished) {
            return data.datePublished;
          } else if (data.dateCreated) {
            return data.dateCreated;
          } else if (data.dateModified) {
            return data.dateModified;
          } else if (data.publishedDate) {
            return data.publishedDate;
          } else if (data['@graph'] && Array.isArray(data['@graph'])) {
            // Some sites use @graph array for structured data
            for (const item of data['@graph']) {
              if (item.datePublished) return item.datePublished;
              if (item.dateCreated) return item.dateCreated;
            }
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  } catch (e) {
    // Ignore errors in script parsing
  }
  
  // Strategy 4: Look for common date classes and containers (expanded list)
  const dateSelectors = [
    '.date', '.published', '.article-date', '.entry-date', '.post-date', '.article__date',
    '.publish-date', '.article_date', '.article-info time', '.post-meta time', 
    '.meta-date', '.story-date', '.story-time', '.timestamp', '.dateline',
    '.article__meta-date', '.pub-date', '.published-date', '.byline-date',
    '.date-published', '.post__date', '.c-byline__item--date'
  ];
  
  for (const selector of dateSelectors) {
    const dateElement = document.querySelector(selector);
    if (dateElement && dateElement.textContent.trim()) {
      const dateText = dateElement.textContent.trim();
      
      // Clean up the date text
      // Remove words like "published" or "updated" and other common patterns
      let cleanDate = dateText
          .replace(/^(?:published|updated|posted|created)(?:on|at|:)?/i, '')
          .replace(/^(?:date|as of)[:;]\s*/i, '')
          .trim();
      
      if (cleanDate) return cleanDate;
    }
  }
  
  // Strategy 5: Look for dates in the document text with regex (last resort)
  // Look for the first few paragraphs for date patterns
  const contentArea = document.querySelector('article, .content, main, .article, #content');
  if (contentArea) {
    const paragraphs = contentArea.querySelectorAll('p');
    
    // Check only the first few paragraphs to avoid false positives
    for (let i = 0; i < Math.min(3, paragraphs.length); i++) {
      const text = paragraphs[i].textContent;
      
      // Common date patterns: MMM DD, YYYY or DD MMM YYYY
      const monthNamePattern = /(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i;
      const match = text.match(monthNamePattern);
      
      if (match) {
        return match[0];
      }
    }
  }
  
  return dateStr;
}

// Greatly enhanced structured data extraction from schema.org JSON-LD
function extractSchemaMetadata(metadata) {
  try {
    const schemaElements = document.querySelectorAll('script[type="application/ld+json"]');
    if (schemaElements.length > 0) {
      for (const element of schemaElements) {
        try {
          const schemaData = JSON.parse(element.textContent);
          if (!schemaData) continue;
          
          // Store raw schema for debugging (optional - disabled to reduce data size)
          // metadata.schema = schemaData;
          
          // Handle different schema structures
          let effectiveData = schemaData;
          
          // Some sites use @graph array for multiple entities
          if (schemaData['@graph'] && Array.isArray(schemaData['@graph'])) {
            // Look for the most relevant item (Article, NewsArticle, etc.)
            for (const item of schemaData['@graph']) {
              if (item['@type'] === 'Article' || 
                  item['@type'] === 'NewsArticle' || 
                  item['@type'] === 'BlogPosting' || 
                  item['@type'] === 'WebPage') {
                effectiveData = item;
                break;
              }
            }
          }
          
          // Handle array of objects
          if (Array.isArray(schemaData)) {
            // Try to find the most relevant item
            for (const item of schemaData) {
              if (item['@type'] === 'Article' || 
                  item['@type'] === 'NewsArticle' || 
                  item['@type'] === 'BlogPosting' || 
                  item['@type'] === 'WebPage') {
                effectiveData = item;
                break;
              }
            }
            
            // If no specific type found, use the first item
            if (effectiveData === schemaData && schemaData.length > 0) {
              effectiveData = schemaData[0];
            }
          }
          
          // Extract title (try multiple properties)
          if (!metadata.title) {
            if (effectiveData.headline) {
              metadata.title = effectiveData.headline;
            } else if (effectiveData.name) {
              metadata.title = effectiveData.name;
            } else if (effectiveData.title) {
              metadata.title = effectiveData.title;
            }
          }
          
          // Extract author (handle all possible formats)
          if (!metadata.author) {
            if (effectiveData.author) {
              if (typeof effectiveData.author === 'string') {
                metadata.author = effectiveData.author;
              } else if (effectiveData.author.name) {
                metadata.author = effectiveData.author.name;
              } else if (Array.isArray(effectiveData.author) && effectiveData.author.length > 0) {
                // Multiple authors - use the first one or join them
                if (typeof effectiveData.author[0] === 'string') {
                  metadata.author = effectiveData.author[0];
                } else if (effectiveData.author[0].name) {
                  metadata.author = effectiveData.author[0].name;
                }
              }
            } else if (effectiveData.creator) {
              // Handle creator property
              if (typeof effectiveData.creator === 'string') {
                metadata.author = effectiveData.creator;
              } else if (effectiveData.creator.name) {
                metadata.author = effectiveData.creator.name;
              }
            }
          }
          
          // Extract publisher
          if (!metadata.publisher) {
            if (effectiveData.publisher) {
              if (typeof effectiveData.publisher === 'string') {
                metadata.publisher = effectiveData.publisher;
              } else if (effectiveData.publisher.name) {
                metadata.publisher = effectiveData.publisher.name;
              } else if (effectiveData.publisher.brand && effectiveData.publisher.brand.name) {
                metadata.publisher = effectiveData.publisher.brand.name;
              }
            } else if (effectiveData.sourceOrganization) {
              // Sometimes publisher is in sourceOrganization
              if (typeof effectiveData.sourceOrganization === 'string') {
                metadata.publisher = effectiveData.sourceOrganization;
              } else if (effectiveData.sourceOrganization.name) {
                metadata.publisher = effectiveData.sourceOrganization.name;
              }
            }
          }
          
          // Extract dates (try multiple properties)
          if (!metadata.publishDate) {
            if (effectiveData.datePublished) {
              metadata.publishDate = effectiveData.datePublished;
            } else if (effectiveData.dateCreated) {
              metadata.publishDate = effectiveData.dateCreated;
            } else if (effectiveData.dateModified) {
              metadata.publishDate = effectiveData.dateModified;
            } else if (effectiveData.publishedDate) {
              metadata.publishDate = effectiveData.publishedDate;
            }
          }
          
          // Extract content type
          if (!metadata.contentType) {
            if (effectiveData['@type']) {
              const type = effectiveData['@type'];
              // Map schema types to friendly content types
              if (type === 'NewsArticle' || type === 'Article') {
                metadata.contentType = 'article';
              } else if (type === 'BlogPosting') {
                metadata.contentType = 'blogpost';
              } else if (type === 'ScholarlyArticle') {
                metadata.contentType = 'academic';
              } else if (type === 'Book') {
                metadata.contentType = 'book';
              } else if (type === 'Report') {
                metadata.contentType = 'report';
              }
            }
          }
          
          // If we found all the main data, break out for efficiency
          if (metadata.title && metadata.author && metadata.publishDate && metadata.publisher) {
            break;
          }
        } catch (e) {
          // Ignore JSON parse errors and continue with other schema blocks
        }
      }
    }
  } catch (e) {
    // Ignore overall errors and continue with other extraction methods
  }
}

// Greatly enhanced metadata extraction from Open Graph and Twitter cards
function extractSocialMediaMetadata(metadata) {
  try {
    // Look for most common metadata in order of reliability
    
    // Title extraction
    if (!metadata.title) {
      // Open Graph title (very reliable)
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle && ogTitle.getAttribute('content')) {
        metadata.title = ogTitle.getAttribute('content');
      }
      
      // Twitter title (also reliable)
      if (!metadata.title) {
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitle && twitterTitle.getAttribute('content')) {
          metadata.title = twitterTitle.getAttribute('content');
        }
      }
    }
    
    // Description extraction
    if (!metadata.description) {
      // Open Graph description
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc && ogDesc.getAttribute('content')) {
        metadata.description = ogDesc.getAttribute('content');
      }
      
      // Twitter description
      if (!metadata.description) {
        const twitterDesc = document.querySelector('meta[name="twitter:description"]');
        if (twitterDesc && twitterDesc.getAttribute('content')) {
          metadata.description = twitterDesc.getAttribute('content');
        }
      }
      
      // Standard HTML description
      if (!metadata.description) {
        const standardDesc = document.querySelector('meta[name="description"]');
        if (standardDesc && standardDesc.getAttribute('content')) {
          metadata.description = standardDesc.getAttribute('content');
        }
      }
    }
    
    // Author extraction from social media meta tags
    if (!metadata.author) {
      // Twitter creator
      const twitterCreator = document.querySelector('meta[name="twitter:creator"], meta[name="twitter:creator:name"]');
      if (twitterCreator && twitterCreator.getAttribute('content')) {
        const creator = twitterCreator.getAttribute('content');
        // Don't use Twitter handles as authors (they start with @)
        if (creator && !creator.startsWith('@')) {
          metadata.author = creator;
        }
      }
      
      // Article author
      if (!metadata.author) {
        const articleAuthor = document.querySelector('meta[property="article:author"]');
        if (articleAuthor && articleAuthor.getAttribute('content')) {
          metadata.author = articleAuthor.getAttribute('content');
        }
      }
      
      // Standard HTML author
      if (!metadata.author) {
        const standardAuthor = document.querySelector('meta[name="author"]');
        if (standardAuthor && standardAuthor.getAttribute('content')) {
          metadata.author = standardAuthor.getAttribute('content');
        }
      }
    }
    
    // Publisher extraction
    if (!metadata.publisher) {
      // Open Graph site name is the most common source
      const siteName = document.querySelector('meta[property="og:site_name"]');
      if (siteName && siteName.getAttribute('content')) {
        metadata.publisher = siteName.getAttribute('content');
      }
      
      // Twitter site
      if (!metadata.publisher) {
        const twitterSite = document.querySelector('meta[name="twitter:site:name"], meta[name="twitter:site"]');
        if (twitterSite && twitterSite.getAttribute('content')) {
          const site = twitterSite.getAttribute('content');
          // Don't use Twitter handles as publishers (they start with @)
          if (site && !site.startsWith('@')) {
            metadata.publisher = site;
          }
        }
      }
      
      // Try application name as a fallback
      if (!metadata.publisher) {
        const appName = document.querySelector('meta[name="application-name"]');
        if (appName && appName.getAttribute('content')) {
          metadata.publisher = appName.getAttribute('content');
        }
      }
      
      // Last resort: extract from domain
      if (!metadata.publisher) {
        try {
          const domain = window.location.hostname;
          // Convert domain to publisher name (remove TLD and www)
          let domainParts = domain.split('.');
          if (domainParts.length >= 2) {
            let publisherName = domainParts[domainParts.length - 2];
            // Clean up and capitalize
            publisherName = publisherName.charAt(0).toUpperCase() + publisherName.slice(1);
            metadata.publisher = publisherName;
          }
        } catch (e) {
          // Ignore domain parsing errors
        }
      }
    }
    
    // Publication date from article published time
    if (!metadata.publishDate) {
      const articlePublished = document.querySelector('meta[property="article:published_time"]');
      if (articlePublished && articlePublished.getAttribute('content')) {
        metadata.publishDate = articlePublished.getAttribute('content');
      }
    }
    
    // Content type from Open Graph
    if (!metadata.contentType) {
      const ogType = document.querySelector('meta[property="og:type"]');
      if (ogType && ogType.getAttribute('content')) {
        const type = ogType.getAttribute('content');
        // Map OG types to our content types
        if (type === 'article') {
          metadata.contentType = 'article';
        } else if (type === 'book') {
          metadata.contentType = 'book';
        } else if (type === 'profile') {
          metadata.contentType = 'profile';
        } else if (type === 'website') {
          metadata.contentType = 'website';
        } else if (type === 'video.other') {
          metadata.contentType = 'video';
        }
      }
    }
  } catch (e) {
    // Ignore errors and continue with other extraction methods
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