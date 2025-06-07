// Helper functions for search engines
const SEARCH_EXTRACTORS = {
  GOOGLE: extractGoogleResults,
  GOOGLE_SCHOLAR: extractGoogleScholarResults,
  BING: extractBingResults,
  DUCKDUCKGO: extractDuckDuckGoResults,
  GOOGLE_NEWS: extractGoogleNewsResults,
  LEXIS: extractLexisResults
};

// Site-specific metadata extractors
const SITE_SPECIFIC_EXTRACTORS = {
  // Academic and research sites
  'arxiv.org': extractArxivMetadata,
  'pubmed.ncbi.nlm.nih.gov': extractPubMedMetadata,
  'ncbi.nlm.nih.gov': extractPubMedMetadata,
  'jstor.org': extractJstorMetadata,
  'www.jstor.org': extractJstorMetadata,
  'doi.org': extractDoiMetadata,
  'nber.org': extractNberMetadata,
  'www.nber.org': extractNberMetadata,
  'papers.ssrn.com': extractSSRNMetadata,
  
  // News sites
  'nytimes.com': extractNYTimesMetadata,
  'www.nytimes.com': extractNYTimesMetadata,
  'washingtonpost.com': extractWashingtonPostMetadata,
  'www.washingtonpost.com': extractWashingtonPostMetadata,
  'wsj.com': extractWSJMetadata,
  'www.wsj.com': extractWSJMetadata,
  'bloomberg.com': extractBloombergMetadata,
  'www.bloomberg.com': extractBloombergMetadata,
  'theguardian.com': extractGuardianMetadata,
  'www.theguardian.com': extractGuardianMetadata,
  'bbc.com': extractBBCMetadata,
  'www.bbc.com': extractBBCMetadata,
  'cnn.com': extractCNNMetadata,
  'www.cnn.com': extractCNNMetadata,
  'abcnews.go.com': extractABCNewsMetadata,
  'nbcnews.com': extractNBCNewsMetadata,
  'www.nbcnews.com': extractNBCNewsMetadata,
  'cbsnews.com': extractCBSNewsMetadata,
  'www.cbsnews.com': extractCBSNewsMetadata,
  'cnbc.com': extractCNBCMetadata,
  'www.cnbc.com': extractCNBCMetadata,
  'latimes.com': extractLATimesMetadata,
  'www.latimes.com': extractLATimesMetadata,
  'reuters.com': extractReutersMetadata,
  'www.reuters.com': extractReutersMetadata,
  'nationalreview.com': extractNationalReviewMetadata,
  'www.nationalreview.com': extractNationalReviewMetadata,
  'theglobeandmail.com': extractGlobeAndMailMetadata,
  'www.theglobeandmail.com': extractGlobeAndMailMetadata,
  'nypost.com': extractNYPostMetadata,
  'www.nypost.com': extractNYPostMetadata,
  'usnews.com': extractUSNewsMetadata,
  'www.usnews.com': extractUSNewsMetadata,
  'dw.com': extractDWMetadata,
  'www.dw.com': extractDWMetadata,
  'timesofindia.indiatimes.com': extractTimesOfIndiaMetadata,
  'indianexpress.com': extractIndianExpressMetadata,
  'www.indianexpress.com': extractIndianExpressMetadata,
  'hindustantimes.com': extractHindustanTimesMetadata,
  'www.hindustantimes.com': extractHindustanTimesMetadata,
  'thehill.com': extractTheHillMetadata,
  'www.thehill.com': extractTheHillMetadata,
  'thedailybeast.com': extractDailyBeastMetadata,
  'www.thedailybeast.com': extractDailyBeastMetadata,
  'newsweek.com': extractNewsweekMetadata,
  'www.newsweek.com': extractNewsweekMetadata,
  'bangkokpost.com': extractBangkokPostMetadata,
  'www.bangkokpost.com': extractBangkokPostMetadata,
  'japantimes.co.jp': extractJapanTimesMetadata,
  'www.japantimes.co.jp': extractJapanTimesMetadata,
  'apnews.com': extractAPNewsMetadata,
  'www.apnews.com': extractAPNewsMetadata,
  
  // Academic publishers
  'sciencedirect.com': extractScienceDirectMetadata,
  'www.sciencedirect.com': extractScienceDirectMetadata,
  'nature.com': extractNatureMetadata,
  'www.nature.com': extractNatureMetadata,
  'springer.com': extractSpringerMetadata,
  'link.springer.com': extractSpringerMetadata,
  'wiley.com': extractWileyMetadata,
  'onlinelibrary.wiley.com': extractWileyMetadata,
  'dukeupress.edu': extractDukeUPressMetadata,
  'www.dukeupress.edu': extractDukeUPressMetadata,
  'read.dukeupress.edu': extractDukeUPressMetadata,
  'sagepub.com': extractSageMetadata,
  'www.sagepub.com': extractSageMetadata,
  'journals.sagepub.com': extractSageMetadata,
  
  // Social media and forums
  'reddit.com': extractRedditMetadata,
  'www.reddit.com': extractRedditMetadata,
  'twitter.com': extractTwitterMetadata,
  'x.com': extractTwitterMetadata,
  
  // Think tanks and research organizations
  'brookings.edu': extractBrookingsMetadata,
  'www.brookings.edu': extractBrookingsMetadata,
  'rand.org': extractRandMetadata,
  'www.rand.org': extractRandMetadata,
  'pewresearch.org': extractPewMetadata,
  'www.pewresearch.org': extractPewMetadata,
  'cato.org': extractCatoMetadata,
  'www.cato.org': extractCatoMetadata,
  'carnegieendowment.org': extractCarnegieMetadata,
  'www.carnegieendowment.org': extractCarnegieMetadata,
  'heritage.org': extractHeritageMetadata,
  'www.heritage.org': extractHeritageMetadata,
  'urban.org': extractUrbanMetadata,
  'www.urban.org': extractUrbanMetadata,
  'taxpolicycenter.org': extractTaxPolicyCenterMetadata,
  'www.taxpolicycenter.org': extractTaxPolicyCenterMetadata,
  'americanprogress.org': extractAmericanProgressMetadata,
  'www.americanprogress.org': extractAmericanProgressMetadata,
  'atlanticcouncil.org': extractAtlanticCouncilMetadata,
  'www.atlanticcouncil.org': extractAtlanticCouncilMetadata,
  'hudson.org': extractHudsonMetadata,
  'www.hudson.org': extractHudsonMetadata,
  'cnas.org': extractCNASMetadata,
  'www.cnas.org': extractCNASMetadata,
  'bakerinstitute.org': extractBakerInstituteMetadata,
  'www.bakerinstitute.org': extractBakerInstituteMetadata,
  'rff.org': extractRFFMetadata,
  'www.rff.org': extractRFFMetadata,
  'resources.org': extractRFFMetadata,
  'www.resources.org': extractRFFMetadata,
  'hoover.org': extractHooverMetadata,
  'www.hoover.org': extractHooverMetadata,
  'fpri.org': extractFPRIMetadata,
  'www.fpri.org': extractFPRIMetadata,
  'reason.org': extractReasonMetadata,
  'www.reason.org': extractReasonMetadata,
  'cbpp.org': extractCBPPMetadata,
  'www.cbpp.org': extractCBPPMetadata,
  'mercatus.org': extractMercatusMetadata,
  'www.mercatus.org': extractMercatusMetadata,
  'epi.org': extractEPIMetadata,
  'www.epi.org': extractEPIMetadata,
  'milkeninstitute.org': extractMilkenMetadata,
  'www.milkeninstitute.org': extractMilkenMetadata,
  'thirdway.org': extractThirdWayMetadata,
  'www.thirdway.org': extractThirdWayMetadata,
  'cei.org': extractCEIMetadata,
  'www.cei.org': extractCEIMetadata,
  'rstreet.org': extractRStreetMetadata,
  'www.rstreet.org': extractRStreetMetadata,
  'aspeninstitute.org': extractAspenMetadata,
  'www.aspeninstitute.org': extractAspenMetadata,
  
  // Wikipedia
  'wikipedia.org': extractWikipediaMetadata,
  'en.wikipedia.org': extractWikipediaMetadata,
  
  // Other research sites
  'arcticresearch.wordpress.com': extractArcticResearchMetadata,
  'arctic-news.blogspot.com': extractArcticNewsMetadata,
  
  // News sites (additional)
  'news.mongabay.com': extractMongabayMetadata,
  'highnorthnews.com': extractHighNorthNewsMetadata
};

// Citation preview functionality
let citationPreview = null;
let citationPreviewEnabled = false;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'updateCitationPreviewSetting':
      citationPreviewEnabled = message.previewEnabled;
      if (citationPreviewEnabled) {
        createCitationPreview();
      } else {
        removeCitationPreview();
      }
      sendResponse({ success: true });
      break;
      
    case 'metadataUpdated':
      // Update citation preview when metadata is updated from popup
      if (citationPreview) {
        updateCitationPreview();
      }
      sendResponse({ success: true });
      break;
      
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
    
    // Check if we have a site-specific extractor for this domain
    const hostname = window.location.hostname;
    let siteExtractor = SITE_SPECIFIC_EXTRACTORS[hostname];
    
    // If not found, check if hostname contains key parts of registered domains
    if (!siteExtractor) {
      // Create a normalized version of hostname without punctuation
      const normalizedHostname = hostname.replace(/[-_.]/g, '');
      
      // Check each registered domain
      for (const [registeredDomain, extractor] of Object.entries(SITE_SPECIFIC_EXTRACTORS)) {
        // Normalize the registered domain too
        const normalizedRegistered = registeredDomain.replace(/[-_.]/g, '');
        
        // Check if the hostname contains all the key parts
        if (normalizedHostname.includes(normalizedRegistered)) {
          siteExtractor = extractor;
          break;
        }
      }
    }
    
    // Special case for Wiley subsidiaries (e.g., agupubs.onlinelibrary.wiley.com)
    if (!siteExtractor && hostname.endsWith('.onlinelibrary.wiley.com')) {
      siteExtractor = extractWileyMetadata;
    }
    
    // Also check hyphenated version for Wiley
    if (!siteExtractor && hostname.includes('-onlinelibrary-wiley-com')) {
      siteExtractor = extractWileyMetadata;
    }
    
    // Special case for CSIS subsidiaries (e.g., beyondparallel.csis.org)
    if (!siteExtractor && (hostname === 'csis.org' || hostname.endsWith('.csis.org'))) {
      siteExtractor = extractCSISMetadata;
    }
    
    // Also check hyphenated version for CSIS
    if (!siteExtractor && (hostname === 'csis-org' || hostname.includes('-csis-org'))) {
      siteExtractor = extractCSISMetadata;
    }
    
    if (siteExtractor) {
      console.log(`Using site-specific extractor for ${hostname}`);
      try {
        // Run the site-specific extractor
        const siteMetadata = siteExtractor();
        
        // Merge site-specific metadata with base metadata
        Object.assign(metadata, siteMetadata);
        
        // If site-specific extractor didn't get certain fields, try generic extractors
        if (!metadata.title) {
          metadata.title = extractPageTitle();
        }
        if (!metadata.author && !metadata.authors) {
          metadata.author = extractAuthor();
        }
        if (!metadata.publishDate) {
          metadata.publishDate = extractPublicationDate();
        }
        
        // Mark that we used a site-specific extractor
        metadata.extractorType = 'site-specific';
        metadata.extractorSite = hostname;
      } catch (e) {
        console.error(`Site-specific extractor failed for ${hostname}:`, e);
        // Fall back to generic extraction
      }
    }
    
    // If no site-specific extractor or it failed, use generic extraction
    if (!metadata.extractorType) {
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
      
      metadata.extractorType = 'generic';
    }
    
    console.log('Extracted metadata:', metadata);
    return metadata;
  } catch (e) {
    console.error('Error extracting page metadata:', e);
    return { 
      error: e.message,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      title: document.title || '',
      extractorType: 'error'
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

function extractLexisResults() {
  try {
    const results = [];
    
    // Get the search query from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    let query = urlParams.get('pdsearchterms');
    
    // Decode the query if it exists
    if (query) {
      try {
        query = decodeURIComponent(query);
      } catch (e) {
        // Keep original if decoding fails
      }
    }
    
    // Try different selectors for Lexis search results
    // Lexis uses various layouts depending on the search type
    const resultSelectors = [
      '.doc-title', // Common document title selector
      'h2.doc-title',
      'a.doc-title',
      '.result-title',
      '.document-title',
      '[data-document-title]',
      '.search-result-item h2',
      '.search-result-item a[href*="/document"]'
    ];
    
    let searchItems = [];
    for (const selector of resultSelectors) {
      searchItems = document.querySelectorAll(selector);
      if (searchItems.length > 0) break;
    }
    
    // If no results found with specific selectors, try more generic approach
    if (searchItems.length === 0) {
      // Look for links that contain document IDs
      searchItems = document.querySelectorAll('a[href*="/document/"]');
    }
    
    searchItems.forEach((item, index) => {
      try {
        let title = '';
        let url = '';
        let snippet = '';
        let source = '';
        
        // Extract title
        if (item.tagName === 'A') {
          title = item.textContent.trim();
          url = item.href;
        } else {
          // Look for a link within the element
          const linkEl = item.querySelector('a');
          if (linkEl) {
            title = linkEl.textContent.trim() || item.textContent.trim();
            url = linkEl.href;
          } else {
            title = item.textContent.trim();
          }
        }
        
        // Try to find snippet/abstract in parent or sibling elements
        const parentEl = item.closest('.search-result-item, .document-item, .result-item');
        if (parentEl) {
          const snippetEl = parentEl.querySelector('.snippet, .abstract, .excerpt, .document-snippet');
          if (snippetEl) {
            snippet = snippetEl.textContent.trim();
          }
          
          // Try to find source information
          const sourceEl = parentEl.querySelector('.source, .publication, .doc-source');
          if (sourceEl) {
            source = sourceEl.textContent.trim();
          }
        }
        
        if (title) {
          const result = {
            position: index + 1,
            title: title,
            url: url,
            snippet: snippet,
            source: source
          };
          
          results.push(result);
        }
      } catch (e) {
        console.error('Error processing Lexis result item:', e);
      }
    });
    
    return {
      query: query || 'Unknown query',
      count: results.length,
      results
    };
  } catch (e) {
    console.error('Error extracting Lexis results:', e);
    return { error: e.message };
  }
}

// Track clicks on search results
document.addEventListener('click', (event) => {
  // Only track if we're on a search engine
  const hostname = window.location.hostname;
  const searchEngineDomains = [
    'google.com', 'www.google.com', 'scholar.google.com', 
    'bing.com', 'www.bing.com', 'duckduckgo.com', 
    'news.google.com', 'advance.lexis.com', 'www.lexis.com',
    'lexisnexis.com', 'www.lexisnexis.com'
  ];
  
  // Check if current hostname is a search engine (including proxied versions)
  let isSearchEngine = false;
  if (searchEngineDomains.includes(hostname)) {
    isSearchEngine = true;
  } else {
    // Check for proxied versions
    const normalizedHostname = hostname.replace(/[-_.]/g, '').toLowerCase();
    for (const domain of searchEngineDomains) {
      const normalizedDomain = domain.replace(/[-_.]/g, '').toLowerCase();
      if (normalizedHostname.includes(normalizedDomain)) {
        isSearchEngine = true;
        break;
      }
      // Check hyphenated version
      const hyphenatedDomain = domain.replace(/\./g, '-');
      if (hostname.includes(hyphenatedDomain)) {
        isSearchEngine = true;
        break;
      }
    }
  }
  
  if (!isSearchEngine) return;
  
  let target = event.target;
  
  // Check if the click is on or within a search result link
  while (target && target !== document) {
    if (target.tagName === 'A' && target.href) {
      // This seems to be a link click
      // Get the appropriate query parameter based on the search engine
      let sourceQuery = new URLSearchParams(window.location.search).get('q');
      
      // For Lexis, check pdsearchterms parameter
      if (!sourceQuery) {
        sourceQuery = new URLSearchParams(window.location.search).get('pdsearchterms');
        if (sourceQuery) {
          try {
            sourceQuery = decodeURIComponent(sourceQuery);
          } catch (e) {
            // Keep encoded version if decode fails
          }
        }
      }
      
      const resultData = {
        url: target.href,
        text: target.textContent.trim(),
        timestamp: new Date().toISOString(),
        sourceUrl: window.location.href,
        sourceQuery: sourceQuery || ''
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

// Site-specific metadata extractors

// arXiv extractor
function extractArxivMetadata() {
  const metadata = {};
  
  try {
    // Extract arXiv ID from URL
    const arxivIdMatch = window.location.href.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)/);
    if (arxivIdMatch) {
      metadata.arxivId = arxivIdMatch[1];
      metadata.citationKey = `arxiv:${arxivIdMatch[1]}`;
    }
    
    // Extract arXiv ID from citation meta tag (alternative method)
    const citationArxivEl = document.querySelector('meta[name="citation_arxiv_id"]');
    if (citationArxivEl && citationArxivEl.getAttribute('content')) {
      const arxivId = citationArxivEl.getAttribute('content');
      metadata.arxivId = arxivId;
      metadata.citationKey = `arxiv:${arxivId}`;
      // For arXiv papers, we can construct a DOI-like identifier
      metadata.doi = `10.48550/arXiv.${arxivId}`;
    }
    
    // Title - arXiv has it in a specific h1 class
    const titleEl = document.querySelector('h1.title');
    if (titleEl) {
      metadata.title = titleEl.textContent.replace(/^Title:\s*/i, '').trim();
    }
    
    // Authors - arXiv lists them in a specific div
    const authorsEl = document.querySelector('.authors');
    if (authorsEl) {
      const authors = Array.from(authorsEl.querySelectorAll('a')).map(a => a.textContent.trim());
      metadata.author = authors.join(', ');
      metadata.authors = authors; // Also store as array
    }
    
    // Abstract
    const abstractEl = document.querySelector('.abstract');
    if (abstractEl) {
      metadata.abstract = abstractEl.textContent.replace(/^Abstract:\s*/i, '').trim();
      metadata.description = metadata.abstract; // Also use as description
    }
    
    // Submission date
    const datelineEl = document.querySelector('.dateline');
    if (datelineEl) {
      const dateMatch = datelineEl.textContent.match(/Submitted on (\d{1,2} \w+ \d{4})/);
      if (dateMatch) {
        metadata.publishDate = dateMatch[1];
      }
    }
    
    // Subject categories
    const subjectsEl = document.querySelector('.subjects');
    if (subjectsEl) {
      metadata.subjects = subjectsEl.textContent.trim();
      metadata.categories = metadata.subjects; // Alternative name
    }
    
    // PDF link
    const pdfLink = document.querySelector('.download-pdf');
    if (pdfLink) {
      metadata.pdfUrl = pdfLink.href;
    }
    
    // Content type
    metadata.contentType = 'preprint';
    metadata.publisher = 'arXiv';
    
  } catch (e) {
    console.error('Error in arXiv extractor:', e);
  }
  
  return metadata;
}

// PubMed/NCBI extractor
function extractPubMedMetadata() {
  const metadata = {};
  
  try {
    // PMID
    const pmidMatch = window.location.href.match(/pubmed\/(\d+)/);
    if (pmidMatch) {
      metadata.pmid = pmidMatch[1];
      metadata.citationKey = `pmid:${pmidMatch[1]}`;
    }
    
    // Title
    const titleEl = document.querySelector('h1.heading-title, .abstract h3');
    if (titleEl) {
      metadata.title = titleEl.textContent.trim();
    }
    
    // Authors - try citation meta tag first
    const citationAuthorsEl = document.querySelector('meta[name="citation_authors"]');
    if (citationAuthorsEl && citationAuthorsEl.getAttribute('content')) {
      const authorsContent = citationAuthorsEl.getAttribute('content');
      // Split by semicolon and clean up
      const authors = authorsContent.split(';').map(author => author.trim()).filter(author => author);
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    } else {
      // Fallback to DOM selectors
      const authorsEl = document.querySelector('.authors-list, .auths');
      if (authorsEl) {
        const authors = Array.from(authorsEl.querySelectorAll('a[class*="author"]')).map(a => a.textContent.trim());
        metadata.author = authors.join(', ');
        metadata.authors = authors;
      }
    }
    
    // Journal information - try citation meta tag first
    const citationJournalEl = document.querySelector('meta[name="citation_journal_title"]');
    if (citationJournalEl && citationJournalEl.getAttribute('content')) {
      metadata.journal = citationJournalEl.getAttribute('content');
    } else {
      // Fallback to DOM selector
      const citationEl = document.querySelector('.cit');
      if (citationEl) {
        metadata.journal = citationEl.textContent.trim();
      }
    }
    
    // Try to extract publication date from citation element
    const citationEl = document.querySelector('.cit');
    if (citationEl) {
      const dateMatch = citationEl.textContent.match(/(\d{4})\s+\w+/);
      if (dateMatch) {
        metadata.publishDate = dateMatch[0];
      }
    }
    
    // Abstract
    const abstractEl = document.querySelector('.abstract-content, div[id*="abstract"]');
    if (abstractEl) {
      metadata.abstract = abstractEl.textContent.trim();
      metadata.description = metadata.abstract;
    }
    
    // DOI
    const doiEl = document.querySelector('.doi a, .citation-doi');
    if (doiEl) {
      metadata.doi = doiEl.textContent.trim();
    }
    
    // Content type
    metadata.contentType = 'journal-article';
    metadata.publisher = 'PubMed';
    
  } catch (e) {
    console.error('Error in PubMed extractor:', e);
  }
  
  return metadata;
}

// JSTOR extractor
function extractJstorMetadata() {
  const metadata = {};
  
  try {
    // JSTOR stable URL/ID
    const stableUrlMatch = window.location.href.match(/stable\/(\d+)/);
    if (stableUrlMatch) {
      metadata.jstorId = stableUrlMatch[1];
      metadata.citationKey = `jstor:${stableUrlMatch[1]}`;
    }
    
    // Get title from page title and clean it
    let cleanTitle = document.title || '';
    // Remove " on JSTOR" suffix if present
    cleanTitle = cleanTitle.replace(/\s+on\s+JSTOR\s*$/i, '').trim();
    
    // Parse description meta tags to find citation information
    const descriptionTags = document.querySelectorAll('meta[name="description"]');
    let citationData = null;
    
    for (const tag of descriptionTags) {
      const content = tag.getAttribute('content');
      if (content && cleanTitle && content.includes(cleanTitle)) {
        citationData = content;
        break;
      }
    }
    
    if (citationData) {
      // Parse the citation format: "Author(s), Title, Journal, Vol. X, No. Y (Date), pp. Z-W"
      metadata.citation = citationData;
      
      // Find the title position in the citation
      const titleIndex = citationData.indexOf(cleanTitle);
      if (titleIndex > 0) {
        // Extract authors (everything before the title)
        const authorsText = citationData.substring(0, titleIndex).trim();
        if (authorsText.endsWith(',')) {
          const authors = authorsText.slice(0, -1).split(',').map(a => a.trim()).filter(a => a);
          metadata.authors = authors;
          metadata.author = authors.join(', ');
        }
        
        // Extract everything after the title
        const afterTitle = citationData.substring(titleIndex + cleanTitle.length).trim();
        if (afterTitle.startsWith(',')) {
          const remainder = afterTitle.slice(1).trim();
          
          // Parse journal and other info: "Journal, Vol. X, No. Y (Date), pp. Z-W"
          const parts = remainder.split(',');
          if (parts.length > 0) {
            metadata.journal = parts[0].trim();
          }
          
          // Extract publication date from parentheses
          const dateMatch = remainder.match(/\(([^)]+)\)/);
          if (dateMatch) {
            metadata.publishDate = dateMatch[1];
          }
          
          // Extract page numbers
          const pageMatch = remainder.match(/pp\.\s*(\d+[-–]\d+)/);
          if (pageMatch) {
            metadata.pages = pageMatch[1];
          }
          
          // Extract volume and issue
          const volMatch = remainder.match(/Vol\.\s*(\d+)/);
          if (volMatch) {
            metadata.volume = volMatch[1];
          }
          
          const issueMatch = remainder.match(/No\.\s*(\d+)/);
          if (issueMatch) {
            metadata.issue = issueMatch[1];
          }
        }
      }
      
      metadata.title = cleanTitle;
    } else {
      // Fallback to existing methods if citation parsing fails
      metadata.title = cleanTitle;
      
      // Use existing structured data which JSTOR provides well
      const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of ldJsonScripts) {
        try {
          const data = JSON.parse(script.textContent);
          if (data['@type'] === 'ScholarlyArticle' || data['@type'] === 'Article') {
            if (data.headline && !metadata.title) metadata.title = data.headline;
            if (data.author && !metadata.author) {
              if (Array.isArray(data.author)) {
                metadata.authors = data.author.map(a => a.name || a);
                metadata.author = metadata.authors.join(', ');
              } else if (data.author.name) {
                metadata.author = data.author.name;
              }
            }
            if (data.datePublished && !metadata.publishDate) metadata.publishDate = data.datePublished;
            if (data.publisher && !metadata.publisher) metadata.publisher = data.publisher.name || data.publisher;
            if (data.description && !metadata.description) metadata.description = data.description;
          }
        } catch (e) {
          // Continue with next script
        }
      }
    }
    
    metadata.contentType = 'journal-article';
    if (!metadata.publisher) metadata.publisher = 'JSTOR';
    
  } catch (e) {
    console.error('Error in JSTOR extractor:', e);
  }
  
  return metadata;
}

// DOI.org extractor
function extractDoiMetadata() {
  const metadata = {};
  
  try {
    // Extract DOI from URL
    const doiMatch = window.location.href.match(/doi\.org\/(10\.\d+\/[^\s]+)/);
    if (doiMatch) {
      metadata.doi = doiMatch[1];
      metadata.citationKey = `doi:${doiMatch[1]}`;
    }
    
    // DOI.org is usually a redirect service, but sometimes shows metadata
    // Try to get any displayed metadata
    const metaContainer = document.querySelector('.metadata, .citation');
    if (metaContainer) {
      metadata.citation = metaContainer.textContent.trim();
    }
    
    metadata.contentType = 'academic-article';
    
  } catch (e) {
    console.error('Error in DOI extractor:', e);
  }
  
  return metadata;
}

// New York Times extractor
function extractNYTimesMetadata() {
  const metadata = {};
  
  try {
    // First priority: meta byl tag
    const bylMeta = document.querySelector('meta[name="byl"]');
    if (bylMeta && bylMeta.getAttribute('content')) {
      const bylContent = bylMeta.getAttribute('content');
      // Remove "By " prefix if present
      const authorStr = bylContent.replace(/^By\s+/i, '');
      // Split by "and" or comma to get multiple authors
      const authors = authorStr.split(/\s+and\s+|,\s*/).map(a => a.trim()).filter(a => a);
      if (authors.length > 0) {
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
    }
    
    // If no author from meta tag, try byline structure (excluding Graphics by)
    if (!metadata.author) {
      const bylineEl = document.querySelector('.g-byline');
      if (bylineEl) {
        const bylineText = bylineEl.textContent.trim();
        // Only use if it starts with "By" (not "Graphics by")
        if (bylineText.match(/^By\s+/i)) {
          const authorText = bylineText.replace(/^By\s+/i, '');
          // Extract author names from links if available
          const authorLinks = bylineEl.querySelectorAll('a[href*="/by/"]');
          if (authorLinks.length > 0) {
            const authors = Array.from(authorLinks).map(link => link.textContent.trim());
            metadata.authors = authors;
            metadata.author = authors.join(', ');
          } else {
            // Parse text directly
            const authors = authorText.split(/\s+and\s+|,\s*/).map(a => a.trim()).filter(a => a);
            if (authors.length > 0) {
              metadata.authors = authors;
              metadata.author = authors.join(', ');
            }
          }
        }
      }
    }
    
    // Fallback to structured data
    if (!metadata.author) {
      const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of ldJsonScripts) {
        try {
          const data = JSON.parse(script.textContent);
          if (data['@type'] === 'NewsArticle') {
            if (data.headline) metadata.title = data.headline;
            if (!metadata.author && data.author) {
              if (Array.isArray(data.author)) {
                metadata.authors = data.author.map(a => a.name || a);
                metadata.author = metadata.authors.join(', ');
              } else if (data.author.name) {
                metadata.author = data.author.name;
              }
            }
            if (data.datePublished) metadata.publishDate = data.datePublished;
            if (data.description) metadata.description = data.description;
          }
        } catch (e) {
          // Continue with next script
        }
      }
    }
    
    // Get title from structured data if not already set
    if (!metadata.title) {
      const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of ldJsonScripts) {
        try {
          const data = JSON.parse(script.textContent);
          if (data['@type'] === 'NewsArticle' && data.headline) {
            metadata.title = data.headline;
            break;
          }
        } catch (e) {
          // Continue
        }
      }
    }
    
    // Section/Category
    const sectionEl = document.querySelector('[data-testid="section-link"], .section-name');
    if (sectionEl) {
      metadata.section = sectionEl.textContent.trim();
    }
    
    // Paywall status
    const paywallEl = document.querySelector('[data-testid="paywall"]');
    metadata.hasPaywall = !!paywallEl;
    
    metadata.contentType = 'news-article';
    metadata.publisher = 'The New York Times';
    
  } catch (e) {
    console.error('Error in NYTimes extractor:', e);
  }
  
  return metadata;
}

// Washington Post extractor
function extractWashingtonPostMetadata() {
  const metadata = {};
  
  try {
    // Title
    const titleEl = document.querySelector('h1[data-qa="headline"], h1.headline');
    if (titleEl) {
      metadata.title = titleEl.textContent.trim();
    }
    
    // Author
    const authorEl = document.querySelector('[data-qa="author-name"], .author-name');
    if (authorEl) {
      metadata.author = authorEl.textContent.trim();
    }
    
    // Publication date
    const dateEl = document.querySelector('[data-qa="display-date"], .display-date');
    if (dateEl) {
      metadata.publishDate = dateEl.textContent.trim();
    }
    
    // Section
    const sectionEl = document.querySelector('[data-qa="kicker"], .kicker');
    if (sectionEl) {
      metadata.section = sectionEl.textContent.trim();
    }
    
    metadata.contentType = 'news-article';
    metadata.publisher = 'The Washington Post';
    
  } catch (e) {
    console.error('Error in Washington Post extractor:', e);
  }
  
  return metadata;
}

// Wall Street Journal extractor
function extractWSJMetadata() {
  const metadata = {};
  
  try {
    // WSJ often has structured data
    const ldJsonEl = document.querySelector('script[type="application/ld+json"]');
    if (ldJsonEl) {
      try {
        const data = JSON.parse(ldJsonEl.textContent);
        if (data.headline) metadata.title = data.headline;
        if (data.author) metadata.author = data.author.name || data.author;
        if (data.datePublished) metadata.publishDate = data.datePublished;
        if (data.description) metadata.description = data.description;
      } catch (e) {
        // Fallback to DOM parsing
      }
    }
    
    // Article type/section
    const typeEl = document.querySelector('.article-type, [class*="article-type"]');
    if (typeEl) {
      metadata.articleType = typeEl.textContent.trim();
    }
    
    metadata.contentType = 'news-article';
    metadata.publisher = 'The Wall Street Journal';
    metadata.hasPaywall = true; // WSJ typically has paywall
    
  } catch (e) {
    console.error('Error in WSJ extractor:', e);
  }
  
  return metadata;
}

// Bloomberg extractor
function extractBloombergMetadata() {
  const metadata = {};
  
  try {
    // Extract authors from parsely-author meta tags
    const authorMetas = document.querySelectorAll('meta[name="parsely-author"]');
    if (authorMetas.length > 0) {
      const authors = Array.from(authorMetas).map(meta => meta.getAttribute('content')).filter(a => a);
      if (authors.length > 0) {
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'Bloomberg';
    metadata.hasPaywall = true; // Bloomberg typically has paywall
    
  } catch (e) {
    console.error('Error in Bloomberg extractor:', e);
  }
  
  return metadata;
}

// Guardian extractor
function extractGuardianMetadata() {
  const metadata = {};
  
  try {
    // First try article:author meta tag
    const authorMeta = document.querySelector('meta[property="article:author"]');
    if (authorMeta && authorMeta.getAttribute('content')) {
      const authorContent = authorMeta.getAttribute('content');
      // Check if it's a URL
      if (authorContent.startsWith('http')) {
        // Extract name from URL (last part after final slash)
        const urlParts = authorContent.split('/');
        const profileName = urlParts[urlParts.length - 1];
        if (profileName) {
          // Convert profile URL format to display name (e.g., "jose-olivares" -> "Jose Olivares")
          const displayName = profileName
            .replace(/-/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          // Only use this approach if we have more than one word (contains spaces)
          if (displayName.includes(' ')) {
            metadata.author = displayName;
          }
        }
      } else {
        // Not a URL, use content directly
        // Handle multiple authors separated by "and"
        const authors = authorContent.split(/\s+and\s+/).map(a => a.trim()).filter(a => a);
        if (authors.length > 0) {
          metadata.authors = authors;
          metadata.author = authors.join(', ');
        }
      }
    }
    
    // If no author yet, try byline link
    if (!metadata.author) {
      const bylineLink = document.querySelector('address[data-component="meta-byline"] a[rel="author"]');
      if (bylineLink) {
        metadata.author = bylineLink.textContent.trim();
      }
    }
    
    // If still no author, try the headline area
    if (!metadata.author) {
      const headlineAuthor = document.querySelector('[data-gu-name="headline"] .dcr-1ct8skw span');
      if (headlineAuthor) {
        const authorText = headlineAuthor.textContent.trim();
        // Handle multiple authors separated by "and"
        const authors = authorText.split(/\s+and\s+/).map(a => a.trim()).filter(a => a);
        if (authors.length > 0) {
          metadata.authors = authors;
          metadata.author = authors.join(', ');
        }
      }
    }
    
    // Section/Tags
    const sectionEl = document.querySelector('[data-link-name="article section"]');
    if (sectionEl) {
      metadata.section = sectionEl.textContent.trim();
    }
    
    // Tags
    const tags = Array.from(document.querySelectorAll('a[rel="tag"]')).map(t => t.textContent.trim());
    if (tags.length > 0) {
      metadata.tags = tags;
    }
    
    metadata.contentType = 'news-article';
    metadata.publisher = 'The Guardian';
    
  } catch (e) {
    console.error('Error in Guardian extractor:', e);
  }
  
  return metadata;
}

// BBC extractor
function extractBBCMetadata() {
  const metadata = {};
  
  try {
    // Title - BBC uses various selectors
    const titleEl = document.querySelector('h1[id*="main-heading"], h1.story-body__h1');
    if (titleEl) {
      metadata.title = titleEl.textContent.trim();
    }
    
    // Publication date
    const dateEl = document.querySelector('time[datetime], .date');
    if (dateEl) {
      if (dateEl.getAttribute('datetime')) {
        metadata.publishDate = dateEl.getAttribute('datetime');
      } else {
        metadata.publishDate = dateEl.textContent.trim();
      }
    }
    
    // Section
    const sectionEl = document.querySelector('.navigation-wide-list__link--current, [class*="section"]');
    if (sectionEl) {
      metadata.section = sectionEl.textContent.trim();
    }
    
    // Author (BBC often doesn't show authors prominently)
    const authorEl = document.querySelector('.byline__name, [class*="author"]');
    if (authorEl) {
      metadata.author = authorEl.textContent.trim();
    }
    
    metadata.contentType = 'news-article';
    metadata.publisher = 'BBC';
    
  } catch (e) {
    console.error('Error in BBC extractor:', e);
  }
  
  return metadata;
}

// CNN extractor
function extractCNNMetadata() {
  const metadata = {};
  
  try {
    // CNN structured data
    const ldJsonEl = document.querySelector('script[type="application/ld+json"]');
    if (ldJsonEl) {
      try {
        const data = JSON.parse(ldJsonEl.textContent);
        if (data.headline) metadata.title = data.headline;
        if (data.author) metadata.author = data.author.name || data.author;
        if (data.datePublished) metadata.publishDate = data.datePublished;
        if (data.description) metadata.description = data.description;
      } catch (e) {
        // Fallback to DOM
      }
    }
    
    // Section/Category
    const sectionEl = document.querySelector('.metadata__section, [class*="section"]');
    if (sectionEl) {
      metadata.section = sectionEl.textContent.trim();
    }
    
    // Updated timestamp
    const updatedEl = document.querySelector('.update-time');
    if (updatedEl) {
      metadata.lastUpdated = updatedEl.textContent.trim();
    }
    
    metadata.contentType = 'news-article';
    metadata.publisher = 'CNN';
    
  } catch (e) {
    console.error('Error in CNN extractor:', e);
  }
  
  return metadata;
}

// ABC News extractor
function extractABCNewsMetadata() {
  const metadata = {};
  
  try {
    // Extract authors from byline
    const authorLinks = document.querySelectorAll('[data-testid="prism-byline"] a[href*="/author/"]');
    if (authorLinks.length > 0) {
      const authors = Array.from(authorLinks).map(link => link.textContent.trim());
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'ABC News';
    
  } catch (e) {
    console.error('Error in ABC News extractor:', e);
  }
  
  return metadata;
}

// NBC News extractor
function extractNBCNewsMetadata() {
  const metadata = {};
  
  try {
    // Extract authors from branch:deeplink:authorName meta tags
    const authorMetas = document.querySelectorAll('meta[name^="branch:deeplink:authorName"]');
    if (authorMetas.length > 0) {
      const authors = Array.from(authorMetas)
        .map(meta => {
          const content = meta.getAttribute('content');
          if (content) {
            // Remove affiliation after comma (e.g., "Erin Doherty, CNBC" -> "Erin Doherty")
            return content.split(',')[0].trim();
          }
          return null;
        })
        .filter(a => a);
      if (authors.length > 0) {
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'NBC News';
    
  } catch (e) {
    console.error('Error in NBC News extractor:', e);
  }
  
  return metadata;
}

// CBS News extractor
function extractCBSNewsMetadata() {
  const metadata = {};
  
  try {
    // Extract author from byline - try link first, then text span
    const authorLink = document.querySelector('.byline__author__link');
    if (authorLink) {
      metadata.author = authorLink.textContent.trim();
    } else {
      // Fallback to text span when no link is present
      const authorText = document.querySelector('.byline__author__text');
      if (authorText) {
        metadata.author = authorText.textContent.trim();
      }
    }
    
    // Extract date from time element
    const timeEl = document.querySelector('.content__meta--timestamp time');
    if (timeEl) {
      const dateTime = timeEl.getAttribute('datetime');
      if (dateTime) {
        metadata.publishDate = dateTime;
      }
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'CBS News';
    
    // If no author found, use CBS News as author
    if (!metadata.author) {
      metadata.author = 'CBS News';
    }
    
  } catch (e) {
    console.error('Error in CBS News extractor:', e);
  }
  
  return metadata;
}

// CNBC extractor
function extractCNBCMetadata() {
  const metadata = {};
  
  try {
    // Extract author from meta tag, removing role designations
    const authorMeta = document.querySelector('meta[name="author"]');
    if (authorMeta && authorMeta.getAttribute('content')) {
      let authorContent = authorMeta.getAttribute('content');
      // Remove role designations like ", Contributor" or ", Reporter"
      authorContent = authorContent.replace(/,\s*(Contributor|Reporter|Editor|Correspondent|Analyst|Columnist|Writer)$/i, '');
      metadata.author = authorContent.trim();
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'CNBC';
    
  } catch (e) {
    console.error('Error in CNBC extractor:', e);
  }
  
  return metadata;
}

// LA Times extractor
function extractLATimesMetadata() {
  const metadata = {};
  
  try {
    // Extract title from og:title or structured data
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.getAttribute('content')) {
      metadata.title = ogTitle.getAttribute('content');
    }
    
    // Extract authors from byline structure
    // Look for both <a> tags and <span class="link"> for guest contributors
    const authorElements = document.querySelectorAll('.byline .author-name a, .byline .author-name .link');
    if (authorElements.length > 0) {
      const authors = Array.from(authorElements).map(el => el.textContent.trim());
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // Extract publish date
    const publishedDate = document.querySelector('.byline .published-date');
    if (publishedDate) {
      const dateTime = publishedDate.getAttribute('datetime');
      if (dateTime) {
        metadata.publishDate = dateTime;
      } else {
        // Parse from text content
        const dateText = publishedDate.textContent.trim();
        metadata.publishDate = dateText;
      }
    }
    
    // Extract description
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && ogDesc.getAttribute('content')) {
      metadata.description = ogDesc.getAttribute('content');
    }
    
    // Section/Category
    const sectionEl = document.querySelector('.page-section-label, .section-label');
    if (sectionEl) {
      metadata.section = sectionEl.textContent.trim();
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'Los Angeles Times';
    
  } catch (e) {
    console.error('Error in LA Times extractor:', e);
  }
  
  return metadata;
}

// Reuters extractor
function extractReutersMetadata() {
  const metadata = {};
  
  try {
    // Extract title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.getAttribute('content')) {
      metadata.title = ogTitle.getAttribute('content');
    }
    
    // Extract authors from meta tag
    const authorMeta = document.querySelector('meta[name="article:author"]');
    if (authorMeta && authorMeta.getAttribute('content')) {
      const authorContent = authorMeta.getAttribute('content');
      // Split by comma for multiple authors
      const authors = authorContent.split(',').map(a => a.trim()).filter(a => a);
      if (authors.length > 0) {
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
    }
    
    // Extract publish date
    const publishedMeta = document.querySelector('meta[property="article:published_time"]');
    if (publishedMeta && publishedMeta.getAttribute('content')) {
      metadata.publishDate = publishedMeta.getAttribute('content');
    }
    
    // Extract description
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && ogDesc.getAttribute('content')) {
      metadata.description = ogDesc.getAttribute('content');
    }
    
    // Extract section
    const sectionMeta = document.querySelector('meta[property="article:section"]');
    if (sectionMeta && sectionMeta.getAttribute('content')) {
      metadata.section = sectionMeta.getAttribute('content');
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'Reuters';
    
  } catch (e) {
    console.error('Error in Reuters extractor:', e);
  }
  
  return metadata;
}

// ScienceDirect extractor
function extractScienceDirectMetadata() {
  const metadata = {};
  
  try {
    // Article title
    const titleEl = document.querySelector('h1.title-text, .title-text');
    if (titleEl) {
      metadata.title = titleEl.textContent.trim();
    }
    
    // Authors - extract from given-name and surname spans
    const authorContainers = document.querySelectorAll('.react-xocs-alternative-link');
    if (authorContainers.length > 0) {
      const authors = [];
      authorContainers.forEach(container => {
        const givenName = container.querySelector('.given-name');
        const surname = container.querySelector('.surname');
        if (givenName && surname) {
          const fullName = `${givenName.textContent.trim()} ${surname.textContent.trim()}`;
          authors.push(fullName);
        }
      });
      if (authors.length > 0) {
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
    } else {
      // Fallback to original selector
      const authorElements = document.querySelectorAll('.author-group .author');
      if (authorElements.length > 0) {
        const authors = Array.from(authorElements).map(el => el.textContent.trim());
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
    }
    
    // Journal information - extract from publication title
    const journalEl = document.querySelector('.publication-title .anchor-text');
    if (journalEl) {
      metadata.journal = journalEl.textContent.trim();
    } else {
      // Fallback to original selector
      const fallbackJournalEl = document.querySelector('.journal-title');
      if (fallbackJournalEl) {
        metadata.journal = fallbackJournalEl.textContent.trim();
      }
    }
    
    // DOI
    const doiEl = document.querySelector('.doi');
    if (doiEl) {
      metadata.doi = doiEl.textContent.replace('https://doi.org/', '').trim();
    }
    
    // Abstract
    const abstractEl = document.querySelector('.abstract');
    if (abstractEl) {
      metadata.abstract = abstractEl.textContent.trim();
      metadata.description = metadata.abstract;
    }
    
    // Publication date - parse from volume/issue information
    const volumeInfoEl = document.querySelector('.text-xs');
    if (volumeInfoEl) {
      const volumeText = volumeInfoEl.textContent;
      // Look for date patterns like "October 2020" or "May 1987"
      const dateMatch = volumeText.match(/([A-Za-z]+\s+\d{4})/);
      if (dateMatch) {
        metadata.publishDate = dateMatch[1];
      }
      
      // Also extract volume and issue information
      const volumeMatch = volumeText.match(/Volume\s+(\d+)/);
      if (volumeMatch) {
        metadata.volume = volumeMatch[1];
      }
      
      const issueMatch = volumeText.match(/Issue\s+(\d+)/);
      if (issueMatch) {
        metadata.issue = issueMatch[1];
      }
      
      // Extract page numbers if present
      const pagesMatch = volumeText.match(/Pages?\s+(\d+[-–]\d+)/);
      if (pagesMatch) {
        metadata.pages = pagesMatch[1];
      }
    } else {
      // Fallback to original selector
      const dateEl = document.querySelector('.publication-date');
      if (dateEl) {
        metadata.publishDate = dateEl.textContent.trim();
      }
    }
    
    metadata.contentType = 'journal-article';
    metadata.publisher = 'Elsevier';
    
  } catch (e) {
    console.error('Error in ScienceDirect extractor:', e);
  }
  
  return metadata;
}

// Nature extractor
function extractNatureMetadata() {
  const metadata = {};
  
  try {
    // Authors - extract from dc.creator meta tags first
    const dcCreatorTags = document.querySelectorAll('meta[name="dc.creator"]');
    if (dcCreatorTags.length > 0) {
      const authors = [];
      dcCreatorTags.forEach(tag => {
        const content = tag.getAttribute('content');
        if (content) {
          // Format is "Last, First" - flip to "First Last"
          if (content.includes(',')) {
            const [lastName, firstName] = content.split(',').map(part => part.trim());
            authors.push(`${firstName} ${lastName}`);
          } else {
            // If no comma, use as-is
            authors.push(content.trim());
          }
        }
      });
      if (authors.length > 0) {
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
    }
    
    // Nature has good structured data
    const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of ldJsonScripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data['@type'] === 'ScholarlyArticle') {
          if (data.headline) metadata.title = data.headline;
          if (data.author && !metadata.author) {
            metadata.authors = Array.isArray(data.author) ? 
              data.author.map(a => a.name) : [data.author.name];
            metadata.author = metadata.authors.join(', ');
          }
          if (data.datePublished) metadata.publishDate = data.datePublished;
          if (data.description) metadata.description = data.description;
        }
      } catch (e) {
        // Continue
      }
    }
    
    // DOI - try prism.doi meta tag first
    const prismDoiEl = document.querySelector('meta[name="prism.doi"]');
    if (prismDoiEl && prismDoiEl.getAttribute('content')) {
      let doi = prismDoiEl.getAttribute('content');
      // Remove "doi:" prefix if present
      doi = doi.replace(/^doi:/, '');
      metadata.doi = doi;
    } else {
      // Fallback to original selector
      const doiEl = document.querySelector('[data-test="doi"]');
      if (doiEl) {
        metadata.doi = doiEl.textContent.trim();
      }
    }
    
    // Journal
    const journalEl = document.querySelector('[data-test="journal-title"]');
    if (journalEl) {
      metadata.journal = journalEl.textContent.trim();
    }
    
    metadata.contentType = 'journal-article';
    metadata.publisher = 'Nature Publishing Group';
    
  } catch (e) {
    console.error('Error in Nature extractor:', e);
  }
  
  return metadata;
}

// Springer extractor
function extractSpringerMetadata() {
  const metadata = {};
  
  try {
    // Title
    const titleEl = document.querySelector('h1.ArticleTitle, h1.ChapterTitle');
    if (titleEl) {
      metadata.title = titleEl.textContent.trim();
    }
    
    // Authors
    const authorElements = document.querySelectorAll('.authors__name');
    if (authorElements.length > 0) {
      const authors = Array.from(authorElements).map(el => el.textContent.trim());
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // DOI - try meta tag first
    const doiMetaEl = document.querySelector('meta[name="doi"]');
    if (doiMetaEl && doiMetaEl.getAttribute('content')) {
      metadata.doi = doiMetaEl.getAttribute('content');
    } else {
      // Fallback to original selector
      const doiEl = document.querySelector('.bibliographic-information__value--doi');
      if (doiEl) {
        metadata.doi = doiEl.textContent.trim();
      }
    }
    
    // Journal
    const journalEl = document.querySelector('.JournalTitle');
    if (journalEl) {
      metadata.journal = journalEl.textContent.trim();
    }
    
    // Abstract
    const abstractEl = document.querySelector('.Abstract');
    if (abstractEl) {
      metadata.abstract = abstractEl.textContent.trim();
      metadata.description = metadata.abstract;
    }
    
    // Content type from og:type meta tag
    const ogTypeEl = document.querySelector('meta[property="og:type"]');
    if (ogTypeEl && ogTypeEl.getAttribute('content')) {
      const ogType = ogTypeEl.getAttribute('content');
      metadata.contentType = ogType; // Will be 'book', 'article', etc.
    } else {
      metadata.contentType = 'journal-article'; // Default fallback
    }
    
    metadata.publisher = 'Springer';
    
  } catch (e) {
    console.error('Error in Springer extractor:', e);
  }
  
  return metadata;
}

// Wiley extractor
function extractWileyMetadata() {
  const metadata = {};
  
  try {
    // Title
    const titleEl = document.querySelector('h1.citation__title');
    if (titleEl) {
      metadata.title = titleEl.textContent.trim();
    }
    
    // Authors
    const authorElements = document.querySelectorAll('.author-name');
    if (authorElements.length > 0) {
      const authors = Array.from(authorElements).map(el => el.textContent.trim());
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // DOI
    const doiEl = document.querySelector('.epub-doi');
    if (doiEl) {
      metadata.doi = doiEl.textContent.replace('https://doi.org/', '').trim();
    }
    
    // Journal - try citation meta tag first
    const citationJournalEl = document.querySelector('meta[name="citation_journal_title"]');
    if (citationJournalEl && citationJournalEl.getAttribute('content')) {
      metadata.journal = citationJournalEl.getAttribute('content');
    } else {
      // Fallback to original selector
      const journalEl = document.querySelector('.journal-banner__title');
      if (journalEl) {
        metadata.journal = journalEl.textContent.trim();
      }
    }
    
    // Publication date
    const dateEl = document.querySelector('.epub-date');
    if (dateEl) {
      metadata.publishDate = dateEl.textContent.trim();
    }
    
    metadata.contentType = 'journal-article';
    metadata.publisher = 'Wiley';
    
  } catch (e) {
    console.error('Error in Wiley extractor:', e);
  }
  
  return metadata;
}

// Reddit extractor
function extractRedditMetadata() {
  const metadata = {};
  
  try {
    // Post title
    const titleEl = document.querySelector('h1');
    if (titleEl) {
      metadata.title = titleEl.textContent.trim();
    }
    
    // Author (Reddit username)
    const authorEl = document.querySelector('[data-click-id="user"]');
    if (authorEl) {
      metadata.author = authorEl.textContent.trim();
    }
    
    // Subreddit
    const subredditMatch = window.location.href.match(/\/r\/([^\/]+)/);
    if (subredditMatch) {
      metadata.subreddit = subredditMatch[1];
      metadata.section = `r/${subredditMatch[1]}`;
    }
    
    // Post type
    if (window.location.href.includes('/comments/')) {
      metadata.postType = 'post';
    } else {
      metadata.postType = 'listing';
    }
    
    // Upvotes (if visible)
    const scoreEl = document.querySelector('[class*="score"]');
    if (scoreEl) {
      metadata.score = scoreEl.textContent.trim();
    }
    
    // Post timestamp
    const timeEl = document.querySelector('time[datetime]');
    if (timeEl) {
      metadata.publishDate = timeEl.getAttribute('datetime');
    }
    
    metadata.contentType = 'social-media-post';
    metadata.publisher = 'Reddit';
    
  } catch (e) {
    console.error('Error in Reddit extractor:', e);
  }
  
  return metadata;
}

// Twitter/X extractor
function extractTwitterMetadata() {
  const metadata = {};
  
  try {
    // Tweet text (primary content)
    const tweetEl = document.querySelector('[data-testid="tweetText"]');
    if (tweetEl) {
      metadata.title = tweetEl.textContent.trim();
      metadata.tweetText = metadata.title;
    }
    
    // Author
    const authorEl = document.querySelector('[data-testid="User-Names"] span');
    if (authorEl) {
      metadata.author = authorEl.textContent.trim();
    }
    
    // Username/handle
    const usernameMatch = window.location.href.match(/twitter\.com\/([^\/]+)\/status|x\.com\/([^\/]+)\/status/);
    if (usernameMatch) {
      metadata.username = usernameMatch[1] || usernameMatch[2];
    }
    
    // Tweet ID
    const tweetIdMatch = window.location.href.match(/status\/(\d+)/);
    if (tweetIdMatch) {
      metadata.tweetId = tweetIdMatch[1];
      metadata.citationKey = `tweet:${tweetIdMatch[1]}`;
    }
    
    // Timestamp
    const timeEl = document.querySelector('time[datetime]');
    if (timeEl) {
      metadata.publishDate = timeEl.getAttribute('datetime');
    }
    
    metadata.contentType = 'social-media-post';
    metadata.publisher = 'Twitter/X';
    
  } catch (e) {
    console.error('Error in Twitter extractor:', e);
  }
  
  return metadata;
}

// Brookings Institution extractor
function extractBrookingsMetadata() {
  const metadata = {};
  
  try {
    // Title from og:title meta tag
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl && ogTitleEl.getAttribute('content')) {
      metadata.title = ogTitleEl.getAttribute('content');
    }
    
    // Authors from person-hover links
    const personHoverLinks = document.querySelectorAll('a[id*="person-hover"]');
    if (personHoverLinks.length > 0) {
      const authors = Array.from(personHoverLinks).map(link => link.textContent.trim());
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // Only fall back to JSON-LD if we're missing both title and authors
    if (!metadata.title || !metadata.author) {
      const ldJsonEl = document.querySelector('script[type="application/ld+json"]');
      if (ldJsonEl) {
        try {
          const data = JSON.parse(ldJsonEl.textContent);
          if (data.headline && !metadata.title) metadata.title = data.headline;
          if (data.author && !metadata.author) {
            if (Array.isArray(data.author)) {
              metadata.authors = data.author.map(a => a.name);
              metadata.author = metadata.authors.join(', ');
            } else {
              metadata.author = data.author.name || data.author;
            }
          }
          if (data.datePublished) metadata.publishDate = data.datePublished;
          if (data.description) metadata.description = data.description;
        } catch (e) {
          // Fallback
        }
      }
    }
    
    // Publication type
    const typeEl = document.querySelector('.report-meta__type, [class*="type"]');
    if (typeEl) {
      metadata.publicationType = typeEl.textContent.trim();
    }
    
    // Topics/Tags
    const topicElements = document.querySelectorAll('.topic-tag');
    if (topicElements.length > 0) {
      metadata.topics = Array.from(topicElements).map(el => el.textContent.trim());
    }
    
    metadata.contentType = 'report';
    metadata.publisher = 'Brookings Institution';
    
  } catch (e) {
    console.error('Error in Brookings extractor:', e);
  }
  
  return metadata;
}

// RAND Corporation extractor
function extractRandMetadata() {
  const metadata = {};
  
  try {
    // Title from citation_title meta tag
    const citationTitleEl = document.querySelector('meta[name="citation_title"]');
    if (citationTitleEl && citationTitleEl.getAttribute('content')) {
      metadata.title = citationTitleEl.getAttribute('content');
    } else {
      // Fallback to DOM selector
      const titleEl = document.querySelector('h1.title');
      if (titleEl) {
        metadata.title = titleEl.textContent.trim();
      }
    }
    
    // Authors from DC.Contributor meta tags
    const contributorTags = document.querySelectorAll('meta[name="DC.Contributor"]');
    if (contributorTags.length > 0) {
      const authors = Array.from(contributorTags).map(tag => {
        const content = tag.getAttribute('content');
        // Format is "Last, First" - flip to "First Last"
        if (content && content.includes(',')) {
          const [lastName, firstName] = content.split(',').map(part => part.trim());
          return `${firstName} ${lastName}`;
        } else {
          return content ? content.trim() : '';
        }
      }).filter(author => author);
      
      if (authors.length > 0) {
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
    } else {
      // Fallback to DOM selectors
      const authorElements = document.querySelectorAll('.authors a');
      if (authorElements.length > 0) {
        const authors = Array.from(authorElements).map(el => el.textContent.trim());
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
    }
    
    // Publication date from citation_publication_date meta tag
    const citationDateEl = document.querySelector('meta[name="citation_publication_date"]');
    if (citationDateEl && citationDateEl.getAttribute('content')) {
      metadata.publishDate = citationDateEl.getAttribute('content');
    } else {
      // Fallback to DOM selector
      const dateEl = document.querySelector('.date');
      if (dateEl) {
        metadata.publishDate = dateEl.textContent.trim();
      }
    }
    
    // Document type
    const typeEl = document.querySelector('.type');
    if (typeEl) {
      metadata.documentType = typeEl.textContent.trim();
    }
    
    // Abstract/Summary
    const summaryEl = document.querySelector('.summary, .abstract');
    if (summaryEl) {
      metadata.abstract = summaryEl.textContent.trim();
      metadata.description = metadata.abstract;
    }
    
    // RAND document number
    const docNumMatch = window.location.href.match(/\/([A-Z]+-\d+)/);
    if (docNumMatch) {
      metadata.randDocNumber = docNumMatch[1];
      metadata.citationKey = `rand:${docNumMatch[1]}`;
    }
    
    metadata.contentType = 'report';
    metadata.publisher = 'RAND Corporation';
    
  } catch (e) {
    console.error('Error in RAND extractor:', e);
  }
  
  return metadata;
}

// Pew Research extractor
function extractPewMetadata() {
  const metadata = {};
  
  try {
    // Title
    const titleEl = document.querySelector('h1.entry-title, h1');
    if (titleEl) {
      metadata.title = titleEl.textContent.trim();
    }
    
    // Authors
    const authorEl = document.querySelector('.authors, .byline');
    if (authorEl) {
      metadata.author = authorEl.textContent.trim();
    }
    
    // Publication date
    const dateEl = document.querySelector('.date, time[datetime]');
    if (dateEl) {
      if (dateEl.getAttribute('datetime')) {
        metadata.publishDate = dateEl.getAttribute('datetime');
      } else {
        metadata.publishDate = dateEl.textContent.trim();
      }
    }
    
    // Report type/category
    const categoryEl = document.querySelector('.category');
    if (categoryEl) {
      metadata.category = categoryEl.textContent.trim();
    }
    
    // Topics
    const topicElements = document.querySelectorAll('.topics a');
    if (topicElements.length > 0) {
      metadata.topics = Array.from(topicElements).map(el => el.textContent.trim());
    }
    
    metadata.contentType = 'report';
    metadata.publisher = 'Pew Research Center';
    
  } catch (e) {
    console.error('Error in Pew Research extractor:', e);
  }
  
  return metadata;
}

// Wikipedia extractor
function extractWikipediaMetadata() {
  const metadata = {};
  
  try {
    // Article title
    const titleEl = document.querySelector('#firstHeading');
    if (titleEl) {
      metadata.title = titleEl.textContent.trim();
    }
    
    // Get article categories
    const categoryElements = document.querySelectorAll('#mw-normal-catlinks ul li a');
    if (categoryElements.length > 0) {
      metadata.categories = Array.from(categoryElements).map(el => el.textContent.trim());
    }
    
    // Last modified date
    const lastModEl = document.querySelector('#footer-info-lastmod');
    if (lastModEl) {
      const dateMatch = lastModEl.textContent.match(/(\d{1,2} \w+ \d{4})/);
      if (dateMatch) {
        metadata.lastModified = dateMatch[1];
      }
    }
    
    // Language
    const langMatch = window.location.hostname.match(/^(\w+)\.wikipedia/);
    if (langMatch) {
      metadata.language = langMatch[1];
    }
    
    // Permanent link
    const permalinkEl = document.querySelector('#t-permalink a');
    if (permalinkEl) {
      metadata.permanentUrl = permalinkEl.href;
    }
    
    // First paragraph as description
    const firstPara = document.querySelector('#mw-content-text .mw-parser-output > p:not(.mw-empty-elt)');
    if (firstPara) {
      metadata.description = firstPara.textContent.trim();
    }
    
    metadata.contentType = 'encyclopedia-article';
    metadata.publisher = 'Wikipedia';
    metadata.isOpenAccess = true;
    
  } catch (e) {
    console.error('Error in Wikipedia extractor:', e);
  }
  
  return metadata;
}

// Arctic Research WordPress extractor
function extractArcticResearchMetadata() {
  const metadata = {};
  
  try {
    // Title from og:title meta tag
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl && ogTitleEl.getAttribute('content')) {
      metadata.title = ogTitleEl.getAttribute('content');
    }
    
    // Authors from og:description if it starts with "by"
    const ogDescEl = document.querySelector('meta[property="og:description"]');
    if (ogDescEl && ogDescEl.getAttribute('content')) {
      const description = ogDescEl.getAttribute('content');
      // Clean up HTML entities
      const cleanDesc = description.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
      
      if (cleanDesc.toLowerCase().startsWith('by ')) {
        // Extract the author part (everything after "by " until the first sentence or major break)
        let authorText = cleanDesc.substring(3); // Remove "by "
        
        // Find where the author list ends - look for common patterns
        const endPatterns = [
          /\s+Greetings\s+from/i,
          /\s+We\s+come\s+from/i,
          /\s+This\s+is/i,
          /\s+In\s+this/i,
          /\.\s+[A-Z]/,  // Period followed by capital letter (new sentence)
          /\s+[A-Z][a-z]+\s+from\s+the/i // "Something from the..."
        ];
        
        for (const pattern of endPatterns) {
          const match = authorText.search(pattern);
          if (match !== -1) {
            authorText = authorText.substring(0, match);
            break;
          }
        }
        
        // Clean up and parse authors
        authorText = authorText.trim();
        if (authorText) {
          // Split by "and" and clean up each author
          const authors = authorText.split(/\s+and\s+/i)
            .map(author => author.trim())
            .filter(author => author.length > 0)
            .map(author => {
              // Remove any trailing punctuation
              return author.replace(/[,;.]+$/, '').trim();
            });
          
          if (authors.length > 0) {
            metadata.authors = authors;
            metadata.author = authors.join(', ');
          }
        }
      }
    }
    
    // Publication date from article:published_time meta tag
    const publishedTimeEl = document.querySelector('meta[property="article:published_time"]');
    if (publishedTimeEl && publishedTimeEl.getAttribute('content')) {
      metadata.publishDate = publishedTimeEl.getAttribute('content');
    }
    
    // Set content type and publisher
    metadata.contentType = 'website';
    metadata.publisher = 'Arctic Research';
    
  } catch (e) {
    console.error('Error in Arctic Research extractor:', e);
  }
  
  return metadata;
}

// Arctic News Blogspot extractor
function extractArcticNewsMetadata() {
  const metadata = {};
  
  try {
    // Fixed author and content type as specified
    metadata.author = 'Sam Carana';
    metadata.authors = ['Sam Carana'];
    metadata.contentType = 'website';
    metadata.publisher = 'Arctic News';
    
    // Do not attempt to fill in the date as specified
    // Title will be handled by generic extractors
    
  } catch (e) {
    console.error('Error in Arctic News extractor:', e);
  }
  
  return metadata;
}

// Mongabay News extractor
function extractMongabayMetadata() {
  const metadata = {};
  
  try {
    // Title from <title> tag
    metadata.title = document.title || '';
    
    // Author - first try the about-author section
    const aboutAuthorEl = document.querySelector('.about-author .bylines a');
    if (aboutAuthorEl && aboutAuthorEl.textContent.trim()) {
      metadata.author = aboutAuthorEl.textContent.trim();
      metadata.authors = [metadata.author];
    } else {
      // Fallback: Author fuzzy matching from twitter:data1
      const twitterData1El = document.querySelector('meta[name="twitter:data1"]');
      if (twitterData1El && twitterData1El.getAttribute('content')) {
        const username = twitterData1El.getAttribute('content').toLowerCase();
        
        // Look for author names on the page that might match the username
        const authorSelectors = [
          '.author', '.byline', '.writer', '.article-author', '.post-author',
          '[class*="author"]', '[class*="byline"]', 'a[href*="author"]',
          '.article-meta a', '.meta a', '.credits a'
        ];
        
        let bestMatch = null;
        let bestScore = 0;
        
        // Search through potential author elements
        for (const selector of authorSelectors) {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const text = el.textContent.trim();
            if (text && text.length > 2 && text.length < 50) {
              // Calculate similarity score
              const score = calculateUsernameMatchScore(username, text);
              if (score > bestScore && score > 0.3) { // Minimum threshold
                bestMatch = text;
                bestScore = score;
              }
            }
          });
        }
        
        // If no good match found, also check all text on the page for names
        if (!bestMatch || bestScore < 0.6) {
          const bodyText = document.body.textContent;
          // Look for "By [Name]" patterns
          const byPatterns = [
            /By\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/g,
            /by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/g
          ];
          
          for (const pattern of byPatterns) {
            let match;
            while ((match = pattern.exec(bodyText)) !== null) {
              const name = match[1];
              const score = calculateUsernameMatchScore(username, name);
              if (score > bestScore && score > 0.3) {
                bestMatch = name;
                bestScore = score;
              }
            }
          }
        }
        
        if (bestMatch) {
          metadata.author = bestMatch;
          metadata.authors = [bestMatch];
        }
      }
    }
    
    metadata.contentType = 'news-article';
    metadata.publisher = 'Mongabay';
    
  } catch (e) {
    console.error('Error in Mongabay extractor:', e);
  }
  
  return metadata;
}

// Helper function to calculate similarity between username and full name
function calculateUsernameMatchScore(username, fullName) {
  const name = fullName.toLowerCase().replace(/[^a-z\s]/g, '');
  const parts = name.split(/\s+/).filter(part => part.length > 1);
  
  if (parts.length === 0) return 0;
  
  // Check if username contains parts of the name
  let score = 0;
  let totalChars = 0;
  
  for (const part of parts) {
    totalChars += part.length;
    if (username.includes(part)) {
      score += part.length;
    } else {
      // Check for partial matches (first few characters)
      for (let i = 3; i <= part.length; i++) {
        const substring = part.substring(0, i);
        if (username.includes(substring)) {
          score += substring.length * 0.7; // Partial match gets lower score
          break;
        }
      }
    }
  }
  
  // Check reverse: does the name contain the username?
  if (name.replace(/\s/g, '').includes(username)) {
    score += username.length;
    totalChars += username.length;
  }
  
  return totalChars > 0 ? score / totalChars : 0;
}

// High North News extractor
function extractHighNorthNewsMetadata() {
  const metadata = {};
  
  try {
    // Authors from byline-item__name spans
    const bylineElements = document.querySelectorAll('.byline-item__name a');
    if (bylineElements.length > 0) {
      const authors = Array.from(bylineElements).map(el => el.textContent.trim());
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // Let generic extractors handle title, date, etc.
    metadata.contentType = 'news-article';
    metadata.publisher = 'High North News';
    
  } catch (e) {
    console.error('Error in High North News extractor:', e);
  }
  
  return metadata;
}

// Cato Institute extractor
function extractCatoMetadata() {
  const metadata = {};
  
  try {
    // Authors from .authors div
    const authorsDiv = document.querySelector('.authors');
    if (authorsDiv) {
      // Find all author links within the div
      const authorLinks = authorsDiv.querySelectorAll('a[href*="/people/"]');
      if (authorLinks.length > 0) {
        const authors = Array.from(authorLinks).map(link => link.textContent.trim());
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      } else {
        // Fallback: look for any spans with property="author"
        const authorSpans = authorsDiv.querySelectorAll('span[property="author"]');
        if (authorSpans.length > 0) {
          const authors = Array.from(authorSpans).map(span => {
            const link = span.querySelector('a');
            return link ? link.textContent.trim() : span.textContent.trim();
          });
          metadata.authors = authors;
          metadata.author = authors.join(', ');
        }
      }
    }
    
    // Set content type and publisher
    metadata.contentType = 'website';
    metadata.publisher = 'Cato Institute';
    
    // Let generic extractors handle title, date, etc.
    
  } catch (e) {
    console.error('Error in Cato extractor:', e);
  }
  
  return metadata;
}

// CSIS extractor
function extractCSISMetadata() {
  const metadata = {};
  
  try {
    // Title from og:title meta tag
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl && ogTitleEl.getAttribute('content')) {
      metadata.title = ogTitleEl.getAttribute('content');
    }
    
    // Authors - first try byline block
    const bylineBlock = document.querySelector('.byline-block .contributor-list');
    if (bylineBlock) {
      const authorLinks = bylineBlock.querySelectorAll('.contributor--item a');
      if (authorLinks.length > 0) {
        const authors = Array.from(authorLinks).map(link => link.textContent.trim());
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
    } else {
      // Fallback: Authors from twitter:data1 meta tag
      const twitterData1El = document.querySelector('meta[name="twitter:data1"]');
      if (twitterData1El && twitterData1El.getAttribute('content')) {
        const authorsContent = twitterData1El.getAttribute('content');
        // Split by comma and clean up
        const authors = authorsContent.split(',').map(author => author.trim()).filter(author => author);
        if (authors.length > 0) {
          metadata.authors = authors;
          metadata.author = authors.join(', ');
        }
      }
    }
    
    // Publication date - first try byline block
    const bylineDateElements = document.querySelectorAll('.byline-block .contributors p, .byline-block .mt-xs');
    let foundDate = false;
    for (const el of bylineDateElements) {
      if (el.textContent.includes('Published')) {
        const dateText = el.textContent.trim();
        // Extract date from "Published May 20, 2025"
        const dateMatch = dateText.match(/Published\s+(.+)/);
        if (dateMatch) {
          metadata.publishDate = dateMatch[1];
          foundDate = true;
          break;
        }
      }
    }
    
    if (!foundDate) {
      // Fallback: Publication date from article:published_time meta tag
      const publishedTimeEl = document.querySelector('meta[property="article:published_time"]');
      if (publishedTimeEl && publishedTimeEl.getAttribute('content')) {
        metadata.publishDate = publishedTimeEl.getAttribute('content');
      }
    }
    
    // Set content type and publisher
    metadata.contentType = 'website';
    metadata.publisher = 'Center for Strategic and International Studies';
    
  } catch (e) {
    console.error('Error in CSIS extractor:', e);
  }
  
  return metadata;
}

// Carnegie Endowment extractor
function extractCarnegieMetadata() {
  const metadata = {};
  
  try {
    // Title from og:title meta tag
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl && ogTitleEl.getAttribute('content')) {
      metadata.title = ogTitleEl.getAttribute('content');
    }
    
    // Authors from contributors div
    const contributorsDiv = document.querySelector('.contributors');
    if (contributorsDiv) {
      const authorLinks = contributorsDiv.querySelectorAll('a.anchor');
      if (authorLinks.length > 0) {
        const authors = Array.from(authorLinks).map(link => link.textContent.trim());
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
    }
    
    // Publication date from publisher div
    const publisherDiv = document.querySelector('.publisher .bottom-meta span');
    if (publisherDiv && publisherDiv.textContent.includes('Published on')) {
      const dateText = publisherDiv.textContent.trim();
      // Extract date from "Published on May 21, 2025"
      const dateMatch = dateText.match(/Published on\s+(.+)/);
      if (dateMatch) {
        metadata.publishDate = dateMatch[1];
      }
    }
    
    // Set content type and publisher
    metadata.contentType = 'website';
    metadata.publisher = 'Carnegie Endowment for International Peace';
    
  } catch (e) {
    console.error('Error in Carnegie Endowment extractor:', e);
  }
  
  return metadata;
}

// Heritage Foundation extractor
function extractHeritageMetadata() {
  const metadata = {};
  
  try {
    // Title from og:title meta tag
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl && ogTitleEl.getAttribute('content')) {
      metadata.title = ogTitleEl.getAttribute('content');
    }
    
    // Author from author-card
    const authorCardEl = document.querySelector('.author-card__name span');
    if (authorCardEl) {
      metadata.author = authorCardEl.textContent.trim();
      metadata.authors = [metadata.author];
    }
    
    // Publication date from article-general-info
    const generalInfoEl = document.querySelector('.article-general-info');
    if (generalInfoEl) {
      const infoText = generalInfoEl.textContent.trim();
      // Extract date before the read time info
      const dateMatch = infoText.match(/^([A-Za-z]+ \d{1,2}, \d{4})/);
      if (dateMatch) {
        metadata.publishDate = dateMatch[1];
      }
    }
    
    // Set content type and publisher
    metadata.contentType = 'website';
    metadata.publisher = 'The Heritage Foundation';
    
  } catch (e) {
    console.error('Error in Heritage Foundation extractor:', e);
  }
  
  return metadata;
}

// Urban Institute extractor
function extractUrbanMetadata() {
  const metadata = {};
  
  try {
    // Title from citation_title meta tag
    const citationTitleEl = document.querySelector('meta[name="citation_title"]');
    if (citationTitleEl && citationTitleEl.getAttribute('content')) {
      metadata.title = citationTitleEl.getAttribute('content');
    }
    
    // Author from citation_author meta tag
    const citationAuthorEl = document.querySelector('meta[name="citation_author"]');
    if (citationAuthorEl && citationAuthorEl.getAttribute('content')) {
      metadata.author = citationAuthorEl.getAttribute('content');
      metadata.authors = [metadata.author];
    }
    
    // Publication date from citation_publication_date meta tag
    const citationDateEl = document.querySelector('meta[name="citation_publication_date"]');
    if (citationDateEl && citationDateEl.getAttribute('content')) {
      metadata.publishDate = citationDateEl.getAttribute('content');
    }
    
    // PDF URL from citation_pdf_url meta tag
    const citationPdfEl = document.querySelector('meta[name="citation_pdf_url"]');
    if (citationPdfEl && citationPdfEl.getAttribute('content')) {
      metadata.pdfUrl = citationPdfEl.getAttribute('content');
    }
    
    // Set content type and publisher
    metadata.contentType = 'report';
    metadata.publisher = 'Urban Institute';
    
  } catch (e) {
    console.error('Error in Urban Institute extractor:', e);
  }
  
  return metadata;
}

// Tax Policy Center extractor
function extractTaxPolicyCenterMetadata() {
  const metadata = {};
  
  try {
    // Author from lbj-link element
    const lbjLinkEl = document.querySelector('lbj-link[href*="/author/"]');
    if (lbjLinkEl && lbjLinkEl.textContent.trim()) {
      metadata.author = lbjLinkEl.textContent.trim();
      metadata.authors = [metadata.author];
    }
    
    // Set content type and publisher
    metadata.contentType = 'website';
    metadata.publisher = 'Tax Policy Center';
    
    // Let generic extractors handle title, date, etc.
    
  } catch (e) {
    console.error('Error in Tax Policy Center extractor:', e);
  }
  
  return metadata;
}

// American Progress extractor
function extractAmericanProgressMetadata() {
  const metadata = {};
  
  try {
    // Title from og:title meta tag
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl && ogTitleEl.getAttribute('content')) {
      metadata.title = ogTitleEl.getAttribute('content');
    }
    
    // Try to extract author and date from PageMap comment
    const pageSource = document.documentElement.outerHTML;
    const pageMapMatch = pageSource.match(/<!--\s*<PageMap>[\s\S]*?<\/PageMap>\s*-->/);
    
    if (pageMapMatch) {
      const pageMapContent = pageMapMatch[0];
      
      // Extract author from PageMap
      const authorMatch = pageMapContent.match(/<Attribute name="author">([^<]+)<\/Attribute>/);
      if (authorMatch) {
        const authorsContent = authorMatch[1];
        // Split by semicolon and clean up
        const authors = authorsContent.split(';').map(author => author.trim()).filter(author => author);
        if (authors.length > 0) {
          metadata.authors = authors;
          metadata.author = authors.join(', ');
        }
      }
      
      // Extract date from PageMap
      const dateMatch = pageMapContent.match(/<Attribute name="post_date">([^<]+)<\/Attribute>/);
      if (dateMatch) {
        metadata.publishDate = dateMatch[1];
      }
    }
    
    // Fallback: Author from parsely-author meta tags if PageMap didn't work
    if (!metadata.author) {
      const parselyAuthorTags = document.querySelectorAll('meta[name="parsely-author"]');
      if (parselyAuthorTags.length > 0) {
        const authors = Array.from(parselyAuthorTags).map(tag => tag.getAttribute('content')).filter(author => author);
        if (authors.length > 0) {
          metadata.authors = authors;
          metadata.author = authors.join(', ');
        }
      }
    }
    
    // Set content type and publisher
    metadata.contentType = 'website';
    metadata.publisher = 'Center for American Progress';
    
  } catch (e) {
    console.error('Error in American Progress extractor:', e);
  }
  
  return metadata;
}

// Atlantic Council extractor
function extractAtlanticCouncilMetadata() {
  const metadata = {};
  
  try {
    // Title from og:title meta tag
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl && ogTitleEl.getAttribute('content')) {
      metadata.title = ogTitleEl.getAttribute('content');
    }
    
    // Publication date from article:published_time meta tag
    const publishedTimeEl = document.querySelector('meta[property="article:published_time"]');
    if (publishedTimeEl && publishedTimeEl.getAttribute('content')) {
      metadata.publishDate = publishedTimeEl.getAttribute('content');
    }
    
    // Authors from expert author paragraph - specifically the one with "By"
    const expertAuthorEl = document.querySelector('.gta-site-banner--expert-author.lower');
    console.log('Atlantic Council: Found expert author element?', !!expertAuthorEl);
    
    if (expertAuthorEl) {
      // Check if this paragraph contains "By" to ensure it's the author byline
      const containsBy = expertAuthorEl.textContent.includes('By');
      console.log('Atlantic Council: Contains "By"?', containsBy);
      
      if (containsBy) {
        // Get author links within this specific paragraph
        const authorLinks = expertAuthorEl.querySelectorAll('a.gta-site-banner--tax--expert, a.gta-post-site-banner--tax--expert');
        console.log('Atlantic Council: Found author links:', authorLinks.length);
        
        if (authorLinks.length > 0) {
          const authors = Array.from(authorLinks).map(link => link.textContent.trim());
          console.log('Atlantic Council: Extracted authors:', authors);
          metadata.authors = authors;
          metadata.author = authors.join(', ');
        }
      }
    }
    
    // If that didn't work, try looking for any paragraph with "By" and expert links
    if (!metadata.author) {
      const allParagraphs = document.querySelectorAll('p');
      for (const p of allParagraphs) {
        if (p.textContent.includes('By') && p.querySelector('a[href*="/expert/"]')) {
          const authorLinks = p.querySelectorAll('a[href*="/expert/"]');
          if (authorLinks.length > 0) {
            const authors = Array.from(authorLinks).map(link => link.textContent.trim())
              .filter(text => text && text.length > 2 && text.length < 50);
            if (authors.length > 0) {
              console.log('Atlantic Council: Fallback extracted authors:', authors);
              metadata.authors = authors;
              metadata.author = authors.join(', ');
              break;
            }
          }
        }
      }
    }
    
    // Set content type and publisher
    metadata.contentType = 'website';
    metadata.publisher = 'Atlantic Council';
    
  } catch (e) {
    console.error('Error in Atlantic Council extractor:', e);
  }
  
  return metadata;
}

// Hudson Institute extractor
function extractHudsonMetadata() {
  const metadata = {};
  
  try {
    // Title from og:title meta tag
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl && ogTitleEl.getAttribute('content')) {
      metadata.title = ogTitleEl.getAttribute('content');
    }
    
    // Author from expert-author--names div within the experts region
    // First try to find author in the main experts region
    let authorDiv = document.querySelector('.layout__region--experts .expert-author--names');
    
    // If not found, try within the expert field block
    if (!authorDiv) {
      authorDiv = document.querySelector('.block-field-blocknodeshort-form-articlefield-expert .expert-author--names');
    }
    
    // Last resort: just get the first expert-author--names
    if (!authorDiv) {
      authorDiv = document.querySelector('.expert-author--names');
    }
    
    console.log('Hudson: Found author div?', !!authorDiv);
    
    if (authorDiv) {
      const authorLinks = authorDiv.querySelectorAll('a');
      console.log('Hudson: Found', authorLinks.length, 'author links');
      
      if (authorLinks.length > 0) {
        const authors = Array.from(authorLinks).map(link => link.textContent.trim());
        console.log('Hudson: Extracted authors:', authors);
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
    }
    
    // Date from field-date time element
    // Log all date elements to debug
    const allDateElements = document.querySelectorAll('.field-date time');
    console.log('Hudson: Found', allDateElements.length, 'date elements');
    allDateElements.forEach((el, index) => {
      console.log(`Hudson: Date ${index}:`, el.textContent.trim(), 'datetime:', el.getAttribute('datetime'));
    });
    
    // Try to find the article date specifically
    const dateTimeEl = document.querySelector('.block-field-blocknodeshort-form-articlefield-date .field-date time');
    if (dateTimeEl) {
      console.log('Hudson: Using article date:', dateTimeEl.textContent.trim());
      // First try datetime attribute
      if (dateTimeEl.getAttribute('datetime')) {
        metadata.publishDate = dateTimeEl.getAttribute('datetime');
      } else {
        // Fallback to text content
        metadata.publishDate = dateTimeEl.textContent.trim();
      }
    } else {
      // Fallback to first .field-date time element
      const firstDateEl = document.querySelector('.field-date time');
      if (firstDateEl) {
        console.log('Hudson: Using first date found:', firstDateEl.textContent.trim());
        if (firstDateEl.getAttribute('datetime')) {
          metadata.publishDate = firstDateEl.getAttribute('datetime');
        } else {
          metadata.publishDate = firstDateEl.textContent.trim();
        }
      }
    }
    
    // Set content type and publisher
    metadata.contentType = 'website';
    metadata.publisher = 'Hudson Institute';
    
  } catch (e) {
    console.error('Error in Hudson Institute extractor:', e);
  }
  
  return metadata;
}

// CNAS (Center for a New American Security) extractor
function extractCNASMetadata() {
  const metadata = {};
  
  try {
    // Authors from author-list
    const authorList = document.querySelector('.author-list');
    if (authorList) {
      const authorItems = authorList.querySelectorAll('.author-list__item');
      if (authorItems.length > 0) {
        const authors = [];
        authorItems.forEach(item => {
          // Look for author name in the h3 link
          const authorLink = item.querySelector('h3 a');
          if (authorLink && authorLink.textContent.trim()) {
            authors.push(authorLink.textContent.trim());
          }
        });
        
        if (authors.length > 0) {
          metadata.authors = authors;
          metadata.author = authors.join(', ');
        }
      }
    }
    
    // Fallback: Authors from article header meta byline
    if (!metadata.author) {
      const bylineEl = document.querySelector('.article__header__meta__byline');
      if (bylineEl) {
        const contributorLinks = bylineEl.querySelectorAll('a.contributor');
        if (contributorLinks.length > 0) {
          const authors = Array.from(contributorLinks).map(link => link.textContent.trim());
          metadata.authors = authors;
          metadata.author = authors.join(', ');
        }
      }
    }
    
    // Set content type and publisher
    metadata.contentType = 'website';
    metadata.publisher = 'Center for a New American Security';
    
    // Let generic extractors handle title, date, etc.
    
  } catch (e) {
    console.error('Error in CNAS extractor:', e);
  }
  
  return metadata;
}

// Baker Institute extractor
function extractBakerInstituteMetadata() {
  const metadata = {};
  
  try {
    // Extract date and authors from the specific div structure
    // Looking for: <div class="coh-inline-element print--show coh-ce-cpt_title_banner-a20975a1">May 19, 2025 | Ibrahim Al-Assil, Rana B. Khoury, David M. Satterfield</div>
    const dateAuthorEl = document.querySelector('.coh-inline-element.print--show[class*="cpt_title_banner"]');
    if (dateAuthorEl && dateAuthorEl.textContent) {
      const text = dateAuthorEl.textContent.trim();
      // Split by pipe to separate date from authors
      const parts = text.split('|').map(p => p.trim());
      
      if (parts.length >= 2) {
        // First part is the date
        const dateStr = parts[0];
        // Try to parse the date (format: "May 19, 2025")
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          metadata.publishDate = parsedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        } else {
          metadata.publishDate = dateStr; // Use original if parsing fails
        }
        
        // Second part contains authors separated by commas
        const authorsStr = parts[1];
        const authors = authorsStr.split(',').map(a => a.trim()).filter(a => a);
        if (authors.length > 0) {
          metadata.authors = authors;
          metadata.author = authors.join(', ');
        }
      } else if (parts.length === 1) {
        // Only date or only authors - try to determine which
        const text = parts[0];
        const parsedDate = new Date(text);
        if (!isNaN(parsedDate.getTime())) {
          metadata.publishDate = parsedDate.toISOString().split('T')[0];
        } else {
          // Assume it's authors
          const authors = text.split(',').map(a => a.trim()).filter(a => a);
          if (authors.length > 0) {
            metadata.authors = authors;
            metadata.author = authors.join(', ');
          }
        }
      }
    }
    
    // Set content type and publisher
    metadata.contentType = 'report'; // Baker Institute typically publishes research reports
    metadata.publisher = 'Baker Institute for Public Policy';
    
    // Let generic extractors handle title and other fields
    
  } catch (e) {
    console.error('Error in Baker Institute extractor:', e);
  }
  
  return metadata;
}

// RFF (Resources for the Future) extractor
function extractRFFMetadata() {
  const metadata = {};
  
  try {
    // Extract authors from hero-article__author span
    const authorSpan = document.querySelector('.hero-article__author');
    if (authorSpan) {
      // Get all author links within the span
      const authorLinks = authorSpan.querySelectorAll('a');
      if (authorLinks.length > 0) {
        const authors = Array.from(authorLinks).map(link => link.textContent.trim()).filter(a => a);
        if (authors.length > 0) {
          metadata.authors = authors;
          metadata.author = authors.join(', ');
        }
      } else {
        // Fallback: try to get text content and parse it
        const authorText = authorSpan.textContent.trim();
        if (authorText) {
          // Remove extra whitespace and "and" connectors
          const cleanedText = authorText.replace(/\s+and\s+/g, ', ').replace(/\s*,\s*/g, ', ').trim();
          const authors = cleanedText.split(',').map(a => a.trim()).filter(a => a && a !== 'and');
          if (authors.length > 0) {
            metadata.authors = authors;
            metadata.author = authors.join(', ');
          }
        }
      }
    }
    
    // Fallback: Check hero-meta structure if no authors found yet
    if (!metadata.author) {
      // Look for the hero-meta__column with "Authors" title
      const heroMetaColumns = document.querySelectorAll('.hero-meta__column');
      for (const column of heroMetaColumns) {
        const titleEl = column.querySelector('.hero-meta__column-title');
        if (titleEl && titleEl.textContent.trim().toLowerCase() === 'authors') {
          const contentEl = column.querySelector('.hero-meta__column-content');
          if (contentEl) {
            // Get all author links within the content
            const authorLinks = contentEl.querySelectorAll('a');
            if (authorLinks.length > 0) {
              const authors = Array.from(authorLinks).map(link => link.textContent.trim()).filter(a => a);
              if (authors.length > 0) {
                metadata.authors = authors;
                metadata.author = authors.join(', ');
                break;
              }
            } else {
              // Fallback: parse text content
              const authorText = contentEl.textContent.trim();
              if (authorText) {
                const cleanedText = authorText.replace(/\s+and\s+/g, ', ').replace(/\s*,\s*/g, ', ').trim();
                const authors = cleanedText.split(',').map(a => a.trim()).filter(a => a && a !== 'and');
                if (authors.length > 0) {
                  metadata.authors = authors;
                  metadata.author = authors.join(', ');
                  break;
                }
              }
            }
          }
        }
      }
    }
    
    // Set content type and publisher
    metadata.contentType = 'report'; // RFF typically publishes research reports and policy briefs
    metadata.publisher = 'Resources for the Future';
    
    // Let generic extractors handle title, date, and other fields
    
  } catch (e) {
    console.error('Error in RFF extractor:', e);
  }
  
  return metadata;
}

// Hoover Institution extractor
function extractHooverMetadata() {
  const metadata = {};
  
  try {
    // Extract title from dcterms.title meta tag
    const titleMeta = document.querySelector('meta[name="dcterms.title"]');
    if (titleMeta && titleMeta.getAttribute('content')) {
      metadata.title = titleMeta.getAttribute('content').trim();
    }
    
    // Extract authors from author-info span
    const authorInfo = document.querySelector('.author-info.view');
    if (authorInfo) {
      // Get all author links within the span
      const authorLinks = authorInfo.querySelectorAll('a');
      if (authorLinks.length > 0) {
        const authors = Array.from(authorLinks).map(link => link.textContent.trim()).filter(a => a);
        if (authors.length > 0) {
          metadata.authors = authors;
          metadata.author = authors.join(', ');
        }
      }
    }
    
    // Extract date from date span - try multiple approaches
    const dateSpan = document.querySelector('span.date');
    if (dateSpan) {
      // Clone the element and remove child elements to get just the text
      const clonedSpan = dateSpan.cloneNode(true);
      const childElements = clonedSpan.querySelectorAll('*');
      childElements.forEach(child => child.remove());
      
      let dateStr = clonedSpan.textContent.trim();
      
      // If that didn't work, try another approach
      if (!dateStr) {
        // Get the HTML and extract text before the first tag
        const html = dateSpan.innerHTML;
        const match = html.match(/^([^<]+)/);
        if (match) {
          dateStr = match[1].trim();
        }
      }
      
      // If we still don't have a date, try regex on full text
      if (!dateStr) {
        const fullText = dateSpan.textContent;
        // Look for common date patterns
        const datePatterns = [
          /(\w+day,\s+\w+\s+\d{1,2},\s+\d{4})/i,  // Thursday, May 8, 2025
          /(\w+\s+\d{1,2},\s+\d{4})/i,            // May 8, 2025
          /(\d{1,2}\/\d{1,2}\/\d{4})/              // 05/08/2025
        ];
        
        for (const pattern of datePatterns) {
          const match = fullText.match(pattern);
          if (match) {
            dateStr = match[1];
            break;
          }
        }
      }
      
      if (dateStr) {
        // Try to parse the date
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          metadata.publishDate = parsedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        } else {
          metadata.publishDate = dateStr; // Use original if parsing fails
        }
      }
    }
    
    // Fallback: check for date in meta tags
    if (!metadata.publishDate) {
      const dateMetaTags = [
        'meta[property="article:published_time"]',
        'meta[name="publish_date"]',
        'meta[name="publication_date"]',
        'meta[property="og:article:published_time"]'
      ];
      
      for (const selector of dateMetaTags) {
        const metaTag = document.querySelector(selector);
        if (metaTag && metaTag.getAttribute('content')) {
          const dateStr = metaTag.getAttribute('content');
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            metadata.publishDate = parsedDate.toISOString().split('T')[0];
            break;
          }
        }
      }
    }
    
    // Set content type and publisher
    metadata.contentType = 'report'; // Hoover Institution typically publishes research and policy papers
    metadata.publisher = 'Hoover Institution';
    
    // Let generic extractors handle any remaining fields
    
  } catch (e) {
    console.error('Error in Hoover extractor:', e);
  }
  
  return metadata;
}

// ===== KEYBOARD SHORTCUT FUNCTIONALITY =====

// Toast notification system
function showToast(message, type = 'success') {
  // Remove any existing toast
  const existingToast = document.querySelector('.research-tracker-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'research-tracker-toast';
  toast.textContent = message;
  
  // Set colors based on type
  let backgroundColor;
  switch (type) {
    case 'error':
      backgroundColor = '#dc3545'; // Red
      break;
    case 'warning':
      backgroundColor = '#ffc107'; // Yellow
      break;
    default: // 'success'
      backgroundColor = '#28a745'; // Green
  }
  
  // Calculate bottom position based on citation preview
  let bottomPosition = '20px';
  if (citationPreview && citationPreview.offsetHeight) {
    // Position above the citation preview with some spacing
    bottomPosition = `${citationPreview.offsetHeight + 30}px`;
  }
  
  // Add styles
  toast.style.cssText = `
    position: fixed;
    bottom: ${bottomPosition};
    right: 20px;
    background-color: ${backgroundColor};
    color: ${type === 'warning' ? '#000' : '#fff'};
    padding: 12px 20px;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    z-index: 10001;
    font-family: Arial, sans-serif;
    font-size: 14px;
    max-width: 300px;
    word-wrap: break-word;
    animation: slideIn 0.3s ease-out;
  `;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(toast);
  
  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      toast.remove();
      style.remove();
    }, 300);
  }, 3000);
}

// Text parsing functions
function parseTitle(text) {
  // Convert to title case
  const smallWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 
                      'in', 'into', 'nor', 'of', 'on', 'or', 'the', 'to', 'with'];
  
  return text.trim()
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Always capitalize first and last word
      if (index === 0 || index === text.trim().split(' ').length - 1) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      // Don't capitalize small words
      if (smallWords.includes(word)) {
        return word;
      }
      // Capitalize everything else
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function parseAuthors(text) {
  // Handle various author formats
  let authors = text.trim();
  
  // Replace "and" with comma
  authors = authors.replace(/\s+and\s+/gi, ', ');
  
  // Split by comma and clean each author
  const authorList = authors.split(',').map(a => a.trim()).filter(a => a);
  
  // Return as comma-separated string
  return authorList.join(', ');
}

function parseDate(text) {
  const dateStr = text.trim();
  
  // Try to parse the date
  const parsedDate = new Date(dateStr);
  
  if (!isNaN(parsedDate.getTime())) {
    // Return in YYYY-MM-DD format
    return parsedDate.toISOString().split('T')[0];
  }
  
  // Try some common date patterns
  const patterns = [
    // MM/DD/YYYY or MM-DD-YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    // DD/MM/YYYY or DD-MM-YYYY (European format)
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    // Month DD, YYYY
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,
    // DD Month YYYY
    /(\d{1,2})\s+(\w+)\s+(\d{4})/,
    // YYYY-MM-DD (ISO format)
    /(\d{4})-(\d{1,2})-(\d{1,2})/
  ];
  
  // If parsing failed, return original text
  return null;
}

function parseDOI(text) {
  const doiStr = text.trim();
  
  // Extract DOI from various formats
  const doiPattern = /10\.\d{4,}(?:\.\d+)*\/[-._;()\/:A-Za-z0-9]+/;
  const match = doiStr.match(doiPattern);
  
  if (match) {
    return match[0];
  }
  
  // If it's already a clean DOI
  if (doiStr.startsWith('10.')) {
    return doiStr;
  }
  
  // Return cleaned text
  return doiStr.replace(/^doi:\s*/i, '').trim();
}

// Check if currently recording
async function isCurrentlyRecording() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['isRecording'], (result) => {
      resolve(!!result.isRecording);
    });
  });
}

// Update metadata for current page
async function updateCurrentPageMetadata(field, value) {
  const url = window.location.href;
  
  try {
    // First, get existing metadata
    const existingResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'getPageMetadata',
        url: url
      }, resolve);
    });
    
    const existingMetadata = (existingResponse && existingResponse.success && existingResponse.metadata) ? existingResponse.metadata : {};
    
    // Create updated metadata object with all existing fields plus the new one
    const updatedMetadata = {
      ...existingMetadata,
      [field]: value
    };
    
    // Send the complete metadata object back
    const updateResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'updatePageMetadata',
        url: url,
        metadata: updatedMetadata
      }, resolve);
    });
    
    if (updateResponse && updateResponse.success) {
      console.log(`Updated ${field} to:`, value);
      
      // Update citation preview if it's visible
      if (citationPreview) {
        updateCitationPreview();
      }
    } else {
      console.error('Failed to update metadata:', updateResponse);
    }
  } catch (error) {
    console.error('Error in updateCurrentPageMetadata:', error);
  }
}

// Keyboard shortcut handler
document.addEventListener('keydown', async (e) => {
  console.log('Research Tracker: Key pressed:', e.key, 'Ctrl:', e.ctrlKey, 'Shift:', e.shiftKey, 'Alt:', e.altKey);
  
  // Check for Ctrl+[1-7]
  if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key >= '1' && e.key <= '7') {
    console.log('Research Tracker: Ctrl+' + e.key + ' detected');
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    // Keyboard shortcuts now work even when not recording
    // Metadata will be stored temporarily for the current page
    
    // Get selected text
    const selectedText = window.getSelection().toString();
    console.log('Research Tracker: Selected text:', selectedText);
    if (!selectedText) {
      showToast('No text selected', 'error');
      return;
    }
    
    let field, parsedValue, originalValue = selectedText.trim();
    
    switch (e.key) {
      case '1': // Author
        field = 'author';
        parsedValue = parseAuthors(selectedText);
        break;
        
      case '2': // Quals
        field = 'quals';
        parsedValue = originalValue; // Just trim, no parsing needed
        break;
        
      case '3': // Date
        field = 'publishDate';
        const parsedDate = parseDate(selectedText);
        if (parsedDate) {
          parsedValue = parsedDate;
        } else {
          parsedValue = originalValue;
          showToast(`Date parsing failed - stored as: ${originalValue}`, 'warning');
          await updateCurrentPageMetadata(field, parsedValue);
          return;
        }
        break;
        
      case '4': // Title
        field = 'title';
        parsedValue = parseTitle(selectedText);
        break;
        
      case '5': // Publisher
        field = 'publisher';
        parsedValue = originalValue; // Just trim
        break;
        
      case '6': // Journal (moved from 5)
        field = 'journal';
        parsedValue = originalValue; // Just trim
        break;
        
      case '7': // DOI (moved from 6)
        field = 'doi';
        parsedValue = parseDOI(selectedText);
        break;
        
      default:
        // Unknown shortcut
        return;
    }
    
    // Update metadata
    await updateCurrentPageMetadata(field, parsedValue);
    
    // Show success toast
    const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
    showToast(`${fieldName} updated: ${parsedValue}`);
  }
  
  // Check for Ctrl+q (copy citation)
  if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === 'q') {
    console.log('Research Tracker: Ctrl+q detected - Copy Citation');
    e.preventDefault();
    e.stopPropagation();
    
    // Send message to extension to copy citation for current page
    chrome.runtime.sendMessage({
      action: 'copyCitationForCurrentPage'
    }, (response) => {
      if (response && response.success) {
        if (response.missingFields && response.missingFields.length > 0) {
          // Yellow warning toast with missing fields
          const missingFieldsList = response.missingFields.join(', ');
          showToast(`Citation copied (missing: ${missingFieldsList})`, 'warning');
        } else {
          // Green success toast
          showToast('Citation copied to clipboard', 'success');
        }
      } else {
        // Red error toast
        const errorMsg = response?.error || 'Unknown error';
        showToast(`Failed to copy citation: ${errorMsg}`, 'error');
      }
    });
  }
}, true); // Use capture phase

// Log that keyboard shortcuts are initialized
console.log('Research Tracker: Keyboard shortcuts initialized.');
console.log('  Ctrl+1: Title | Ctrl+2: Author | Ctrl+3: Quals');
console.log('  Ctrl+4: Date | Ctrl+5: Publisher | Ctrl+6: Journal | Ctrl+7: DOI');
console.log('  Ctrl+q: Copy citation for current page');

// ===== CITATION PREVIEW FUNCTIONALITY =====

function shouldExcludeCitationPreview() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  // Check if URL ends with .pdf
  if (url.toLowerCase().endsWith('.pdf')) {
    return true;
  }
  
  // Check for specific GitHub subdirectory
  if (hostname === 'github.com' && url.includes('/ant981228')) {
    return true;
  }
  
  // Specific site exclusions
  const excludedDomains = [
    'ant981228.github.io',
    'youtube.com',
    'www.youtube.com',
    'facebook.com',
    'www.facebook.com',
    'google.com',
    'www.google.com',
    'scholar.google.com',
    'bing.com',
    'www.bing.com',
    'yahoo.com',
    'www.yahoo.com',
    'duckduckgo.com',
    'www.duckduckgo.com',
    // Social media sites (except reddit, twitter/x, linkedin, and tumblr)
    'instagram.com',
    'www.instagram.com',
    'tiktok.com',
    'www.tiktok.com',
    'pinterest.com',
    'www.pinterest.com',
    'snapchat.com',
    'www.snapchat.com',
    // SSRN download pages
    'download.ssrn.com'
  ];
  
  // Check if current hostname is in excluded list (exact match)
  if (excludedDomains.includes(hostname)) {
    return true;
  }
  
  // Check with normalized matching for proxy domains
  const normalizedHostname = hostname.replace(/[-_.]/g, '');
  for (const excludedDomain of excludedDomains) {
    const normalizedExcluded = excludedDomain.replace(/[-_.]/g, '');
    if (normalizedHostname.includes(normalizedExcluded)) {
      return true;
    }
  }
  
  // Check for Google search pages (various TLDs)
  if (hostname.match(/^(www\.)?google\.[a-z.]+$/) && url.includes('/search')) {
    return true;
  }
  
  // Check for Lexis search pages (but not document pages)
  const lexisDomains = ['advance.lexis.com', 'www.lexis.com', 'lexisnexis.com', 'www.lexisnexis.com'];
  const normalizedLexisDomains = lexisDomains.map(d => d.replace(/[-_.]/g, ''));
  
  // Check if this is a Lexis domain (including proxied versions)
  let isLexisDomain = false;
  if (lexisDomains.includes(hostname)) {
    isLexisDomain = true;
  } else {
    // Check normalized/proxied versions
    for (const normalizedLexis of normalizedLexisDomains) {
      if (normalizedHostname.includes(normalizedLexis)) {
        isLexisDomain = true;
        break;
      }
    }
  }
  
  // If it's a Lexis domain, only exclude if it's a search page
  if (isLexisDomain && url.includes('/search/')) {
    return true;
  }
  
  return false;
}

function createCitationPreview() {
  // Check if this site should be excluded
  if (shouldExcludeCitationPreview()) {
    console.log('Research Tracker: Citation preview disabled for this site');
    return;
  }
  
  // Remove existing preview if it exists
  removeCitationPreview();
  
  // Create preview container
  citationPreview = document.createElement('div');
  citationPreview.id = 'research-tracker-citation-preview';
  citationPreview.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    max-width: 400px;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 12px;
    line-height: 1.4;
    opacity: 0.9;
    transition: opacity 0.2s;
  `;
  
  // Create header
  const header = document.createElement('div');
  header.style.cssText = `
    background: #f8f9fa;
    padding: 8px 12px;
    border-bottom: 1px solid #ddd;
    border-radius: 8px 8px 0 0;
    font-weight: bold;
    color: #495057;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  header.innerHTML = `
    <span>Citation Preview</span>
    <button id="citation-preview-close" style="
      background: none;
      border: none;
      color: #6c757d;
      cursor: pointer;
      font-size: 14px;
      padding: 0;
      line-height: 1;
    ">×</button>
  `;
  
  // Create content area
  const content = document.createElement('div');
  content.id = 'citation-preview-content';
  content.style.cssText = `
    padding: 12px;
    color: #333;
    word-wrap: break-word;
  `;
  content.textContent = 'Loading citation...';
  
  // Assemble preview
  citationPreview.appendChild(header);
  citationPreview.appendChild(content);
  
  // Add close button handler
  header.querySelector('#citation-preview-close').addEventListener('click', () => {
    removeCitationPreview();
  });
  
  // Add hover effects
  citationPreview.addEventListener('mouseenter', () => {
    citationPreview.style.opacity = '1';
  });
  
  citationPreview.addEventListener('mouseleave', () => {
    citationPreview.style.opacity = '0.9';
  });
  
  // Add to page
  document.body.appendChild(citationPreview);
  
  // Generate and display citation
  updateCitationPreview();
}

function removeCitationPreview() {
  if (citationPreview) {
    citationPreview.remove();
    citationPreview = null;
  }
}

async function updateCitationPreview() {
  if (!citationPreview) return;
  
  const contentEl = citationPreview.querySelector('#citation-preview-content');
  if (!contentEl) return;
  
  try {
    // Get citation settings
    const settingsResult = await new Promise(resolve => {
      chrome.storage.local.get(['citationSettings'], resolve);
    });
    const settings = settingsResult.citationSettings || { format: 'apa', customTemplate: '' };
    
    // Get stored metadata from background script
    const metadataResult = await new Promise(resolve => {
      chrome.runtime.sendMessage({
        action: 'getPageMetadata',
        url: window.location.href
      }, resolve);
    });
    
    // Fallback to extracted metadata if no stored metadata
    const storedMetadata = (metadataResult && metadataResult.success && metadataResult.metadata) ? metadataResult.metadata : {};
    const extractedMetadata = extractPageMetadata();
    
    // Merge stored metadata (priority) with extracted metadata (fallback)
    const metadata = {
      ...extractedMetadata,
      ...storedMetadata
    };
    
    // Generate citation
    const citation = generateCitationPreview(metadata, window.location.href, document.title, settings);
    
    contentEl.innerHTML = `<div style="font-style: italic;">${citation}</div>`;
  } catch (error) {
    console.error('Error updating citation preview:', error);
    contentEl.textContent = 'Error generating citation';
  }
}

function generateCitationPreview(metadata, url, title, settings) {
  // Reuse the same citation generation logic from background.js
  const citationFormats = {
    apa: '{author} ({year}). {title}. {publisher}. {url ? "Retrieved {accessDate} from {url}" : ""}',
    mla: '{author}. "{title}." {publisher}, {day} {month} {year}, {url}.',
    chicago: '{author}. "{title}." {publisher}, {month} {day}, {year}. {url}.',
    harvard: '{author} {year}, {title}, {publisher}, viewed {accessDate}, <{url}>.',
    ieee: '{author}, "{title}," {publisher}, {year}. [Online]. Available: {url}. [Accessed: {accessDate}].'
  };
  
  const template = settings.format === 'custom' ? settings.customTemplate : citationFormats[settings.format];
  
  // Helper functions (simplified)
  const formatDateParts = (dateStr) => {
    if (!dateStr) return { year: 'n.d.', yearShort: 'n.d.', month: '', monthNum: '', day: '', date: 'n.d.' };
    
    // Handle ISO date format (YYYY-MM-DD) by appending time to ensure local timezone interpretation
    let date;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // For ISO date without time, append noon time to avoid timezone issues
      date = new Date(dateStr + 'T12:00:00');
    } else {
      date = new Date(dateStr);
    }
    
    if (isNaN(date.getTime())) return { year: dateStr, yearShort: dateStr, month: '', monthNum: '', day: '', date: dateStr };
    
    const year = date.getFullYear().toString();
    const yearShort = year.slice(-2);
    const monthNum = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return {
      year: year,
      yearShort: yearShort,
      month: date.toLocaleDateString('en-US', { month: 'long' }),
      monthNum: monthNum,
      day: day,
      date: `${monthNum}/${day}/${year}`
    };
  };
  
  const formatAuthors = (authorStr, format) => {
    if (!authorStr) return { full: 'Unknown Author', short: 'Unknown Author' };
    const authors = authorStr.split(',').map(a => a.trim());
    
    let formattedAuthors = authors;
    if (format === 'apa' || format === 'harvard') {
      formattedAuthors = authors.map(author => {
        const parts = author.split(' ');
        if (parts.length >= 2) {
          const lastName = parts[parts.length - 1];
          const initials = parts.slice(0, -1).map(n => n[0] + '.').join(' ');
          return `${lastName}, ${initials}`;
        }
        return author;
      });
    }
    
    let shortVersion;
    if (authors.length === 1) {
      shortVersion = formattedAuthors[0];
    } else if (authors.length === 2) {
      shortVersion = formattedAuthors.join(' & ');
    } else {
      shortVersion = formattedAuthors[0] + ' et al.';
    }
    
    return { full: formattedAuthors.join(', '), short: shortVersion };
  };
  
  const dateParts = formatDateParts(metadata.date || metadata.publishDate);
  const today = new Date();
  const accessDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const accessDateShort = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
  const authorFormats = formatAuthors(metadata.author, settings.format);
  
  const variables = {
    author: authorFormats.full,
    authorShort: authorFormats.short,
    year: dateParts.year,
    yearShort: dateParts.yearShort,
    month: dateParts.month,
    monthNum: dateParts.monthNum,
    day: dateParts.day,
    date: dateParts.date,
    title: metadata.title || title || 'Untitled',
    publisher: metadata.publisher || metadata.journal || new URL(url).hostname.replace('www.', ''),
    journal: metadata.journal || '',
    doi: metadata.doi || '',
    quals: metadata.quals || '',
    url: url,
    accessDate: accessDate,
    accessDateShort: accessDateShort
  };
  
  let citation = template;
  Object.entries(variables).forEach(([key, value]) => {
    const conditionalRegex = new RegExp(`{${key}\\s*\\?\\s*"([^"]*)"\\s*:\\s*"([^"]*)"\\s*}`, 'g');
    citation = citation.replace(conditionalRegex, value ? '$1' : '$2');
    citation = citation.replace(new RegExp(`{${key}}`, 'g'), value || '');
  });
  
  citation = citation.replace(/\s+/g, ' ').trim();
  citation = citation.replace(/\s+([.,])/g, '$1');
  
  return citation;
}

// Initialize citation preview if setting is enabled
chrome.storage.local.get(['citationSettings'], (result) => {
  const settings = result.citationSettings || { format: 'apa', customTemplate: '', previewEnabled: false };
  citationPreviewEnabled = settings.previewEnabled;
  
  if (citationPreviewEnabled) {
    // Wait a bit for page to load
    setTimeout(() => {
      createCitationPreview();
    }, 1000);
  }
});

// Store extracted metadata automatically when page loads
// This ensures metadata is available for citation even when not recording
setTimeout(() => {
  const extractedMetadata = extractPageMetadata();
  if (extractedMetadata && Object.keys(extractedMetadata).length > 0) {
    // Send to background script to store temporarily
    chrome.runtime.sendMessage({
      action: 'updatePageMetadata',
      url: window.location.href,
      metadata: extractedMetadata
    }, (response) => {
      if (response && response.success) {
        console.log('Research Tracker: Page metadata auto-stored');
      }
    });
  }
}, 1500); // Wait a bit for page to fully load

// NBER extractor
function extractNberMetadata() {
  const metadata = {};
  
  try {
    // Extract title from citation meta tag
    const titleMeta = document.querySelector('meta[name="citation_title"]');
    if (titleMeta) {
      metadata.title = titleMeta.getAttribute('content').trim();
    }
    
    // Extract authors from citation meta tags (multiple possible)
    const authorMetas = document.querySelectorAll('meta[name="citation_author"]');
    if (authorMetas.length > 0) {
      const authors = Array.from(authorMetas).map(meta => meta.getAttribute('content').trim());
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // Extract DOI
    const doiMeta = document.querySelector('meta[name="citation_doi"]');
    if (doiMeta) {
      metadata.doi = doiMeta.getAttribute('content').trim();
    }
    
    // Extract PDF URL
    const pdfMeta = document.querySelector('meta[name="citation_pdf_url"]');
    if (pdfMeta) {
      metadata.pdfUrl = pdfMeta.getAttribute('content').trim();
    }
    
    // Extract publication date
    const dateMeta = document.querySelector('meta[name="citation_publication_date"]');
    if (dateMeta) {
      metadata.publishDate = dateMeta.getAttribute('content').trim();
    }
    
    // Extract publisher/institution
    const institutionMeta = document.querySelector('meta[name="citation_technical_report_institution"]');
    if (institutionMeta) {
      metadata.publisher = institutionMeta.getAttribute('content').trim();
    }
    
    // Set content type and other standard fields
    metadata.contentType = 'report';
    
    // Fallback publisher if not found in meta tag
    if (!metadata.publisher) {
      metadata.publisher = 'National Bureau of Economic Research';
    }
    
  } catch (e) {
    console.error('Error in NBER extractor:', e);
  }
  
  return metadata;
}

// SSRN extractor
function extractSSRNMetadata() {
  const metadata = {};
  
  try {
    // Extract title
    const titleMeta = document.querySelector('meta[name="citation_title"]');
    if (titleMeta) {
      metadata.title = titleMeta.getAttribute('content').trim();
    }
    
    // Extract authors with name inversion fix
    const authorMetas = document.querySelectorAll('meta[name="citation_author"]');
    if (authorMetas.length > 0) {
      const authors = Array.from(authorMetas).map(meta => {
        const authorText = meta.getAttribute('content').trim();
        // Check if name is in "Last, First" format
        if (authorText.includes(',')) {
          const parts = authorText.split(',').map(p => p.trim());
          if (parts.length === 2) {
            // Invert to "First Last" format
            return `${parts[1]} ${parts[0]}`;
          }
        }
        return authorText;
      });
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // Extract DOI
    const doiMeta = document.querySelector('meta[name="citation_doi"]');
    if (doiMeta) {
      metadata.doi = doiMeta.getAttribute('content').trim();
    }
    
    // Extract publication date
    const dateMeta = document.querySelector('meta[name="citation_publication_date"]');
    if (dateMeta) {
      metadata.publishDate = dateMeta.getAttribute('content').trim();
    }
    
    // Set publisher and content type
    metadata.publisher = 'SSRN';
    metadata.contentType = 'preprint';
    
  } catch (e) {
    console.error('Error in SSRN extractor:', e);
  }
  
  return metadata;
}

// Duke University Press extractor
function extractDukeUPressMetadata() {
  const metadata = {};
  
  try {
    // Extract title
    const titleMeta = document.querySelector('meta[name="citation_title"]');
    if (titleMeta) {
      metadata.title = titleMeta.getAttribute('content').trim();
    }
    
    // Extract authors with name inversion fix
    const authorMetas = document.querySelectorAll('meta[name="citation_author"]');
    if (authorMetas.length > 0) {
      const authors = Array.from(authorMetas).map(meta => {
        const authorText = meta.getAttribute('content').trim();
        // Check if name is in "Last, First" format
        if (authorText.includes(',')) {
          const parts = authorText.split(',').map(p => p.trim());
          if (parts.length === 2) {
            // Invert to "First Last" format
            return `${parts[1]} ${parts[0]}`;
          }
        }
        return authorText;
      });
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // Extract DOI
    const doiMeta = document.querySelector('meta[name="citation_doi"]');
    if (doiMeta) {
      metadata.doi = doiMeta.getAttribute('content').trim();
    }
    
    // Extract publication date
    const dateMeta = document.querySelector('meta[name="citation_publication_date"]');
    if (dateMeta) {
      metadata.publishDate = dateMeta.getAttribute('content').trim();
    }
    
    // Extract journal
    const journalMeta = document.querySelector('meta[name="citation_journal_title"]');
    if (journalMeta) {
      metadata.journal = journalMeta.getAttribute('content').trim();
    }
    
    // Extract volume, issue, pages
    const volumeMeta = document.querySelector('meta[name="citation_volume"]');
    if (volumeMeta) {
      metadata.volume = volumeMeta.getAttribute('content').trim();
    }
    
    const issueMeta = document.querySelector('meta[name="citation_issue"]');
    if (issueMeta) {
      metadata.issue = issueMeta.getAttribute('content').trim();
    }
    
    // Extract PDF URL
    const pdfMeta = document.querySelector('meta[name="citation_pdf_url"]');
    if (pdfMeta) {
      metadata.pdfUrl = pdfMeta.getAttribute('content').trim();
    }
    
    // Set publisher and content type
    metadata.publisher = 'Duke University Press';
    metadata.contentType = 'journal-article';
    
  } catch (e) {
    console.error('Error in Duke University Press extractor:', e);
  }
  
  return metadata;
}

// Sage Publications extractor
function extractSageMetadata() {
  const metadata = {};
  
  try {
    // Extract title from dc.Title
    const titleMeta = document.querySelector('meta[name="dc.Title"]');
    if (titleMeta) {
      metadata.title = titleMeta.getAttribute('content').trim();
    }
    
    // Extract authors from dc.Creator (may be multiple)
    const authorMetas = document.querySelectorAll('meta[name="dc.Creator"]');
    if (authorMetas.length > 0) {
      const authors = Array.from(authorMetas).map(meta => meta.getAttribute('content').trim());
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // Extract DOI from dc.Identifier
    const doiMeta = document.querySelector('meta[name="dc.Identifier"][scheme="doi"]');
    if (doiMeta) {
      metadata.doi = doiMeta.getAttribute('content').trim();
    }
    
    // Extract journal title
    const journalMeta = document.querySelector('meta[name="citation_journal_title"]');
    if (journalMeta) {
      metadata.journal = journalMeta.getAttribute('content').trim();
    }
    
    // Extract publication date from article:published_time
    const dateMeta = document.querySelector('meta[property="article:published_time - datetime"]');
    if (dateMeta) {
      const dateContent = dateMeta.getAttribute('content').trim();
      // Convert date format if needed (e.g., "February 18, 2025" to ISO format)
      try {
        const date = new Date(dateContent);
        if (!isNaN(date.getTime())) {
          metadata.publishDate = date.toISOString().split('T')[0];
        } else {
          metadata.publishDate = dateContent;
        }
      } catch (e) {
        metadata.publishDate = dateContent;
      }
    }
    
    // Set publisher and content type
    metadata.publisher = 'Sage Journals';
    metadata.contentType = 'journal-article';
    
  } catch (e) {
    console.error('Error in Sage extractor:', e);
  }
  
  return metadata;
}

// Reason extractor
function extractReasonMetadata() {
  const metadata = {};
  
  try {
    // Extract title from og:title or Twitter title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      metadata.title = ogTitle.getAttribute('content').trim();
    } else {
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) {
        metadata.title = twitterTitle.getAttribute('content').trim();
      }
    }
    
    // Extract author from Twitter meta tags
    // Look for twitter:label2="Written by" and twitter:data2="Author Name"
    const twitterLabels = document.querySelectorAll('meta[name^="twitter:label"]');
    for (let i = 0; i < twitterLabels.length; i++) {
      const label = twitterLabels[i];
      if (label.getAttribute('content') === 'Written by') {
        // Extract the number from the label name (e.g., "twitter:label2" -> "2")
        const labelNum = label.getAttribute('name').match(/twitter:label(\d+)/);
        if (labelNum) {
          // Find the corresponding data meta tag
          const dataTag = document.querySelector(`meta[name="twitter:data${labelNum[1]}"]`);
          if (dataTag) {
            metadata.author = dataTag.getAttribute('content').trim();
            break;
          }
        }
      }
    }
    
    // Extract publication date
    const datePublished = document.querySelector('meta[property="article:published_time"]');
    if (datePublished) {
      const dateContent = datePublished.getAttribute('content');
      try {
        const date = new Date(dateContent);
        if (!isNaN(date.getTime())) {
          metadata.publishDate = date.toISOString().split('T')[0];
        } else {
          metadata.publishDate = dateContent;
        }
      } catch (e) {
        metadata.publishDate = dateContent;
      }
    }
    
    // Extract description
    const description = document.querySelector('meta[property="og:description"]');
    if (description) {
      metadata.description = description.getAttribute('content').trim();
    }
    
    // Set publisher and content type
    metadata.publisher = 'Reason';
    metadata.contentType = 'article';
    
  } catch (e) {
    console.error('Error in Reason extractor:', e);
  }
  
  return metadata;
}

// CBPP (Center on Budget and Policy Priorities) extractor
function extractCBPPMetadata() {
  const metadata = {};
  
  try {
    // Extract title from og:title or page title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      let title = ogTitle.getAttribute('content').trim();
      // Remove "| Center on Budget and Policy Priorities" suffix if present
      title = title.replace(/\s*\|\s*Center on Budget and Policy Priorities\s*$/i, '');
      metadata.title = title;
    } else {
      const h1Title = document.querySelector('h1');
      if (h1Title) {
        metadata.title = h1Title.textContent.trim();
      }
    }
    
    // Extract date from time element in byline wrapper
    const timeElement = document.querySelector('.layout--wrapper--byline time.datetime');
    if (timeElement) {
      const dateContent = timeElement.getAttribute('datetime');
      if (dateContent) {
        try {
          const date = new Date(dateContent);
          if (!isNaN(date.getTime())) {
            metadata.publishDate = date.toISOString().split('T')[0];
          } else {
            metadata.publishDate = timeElement.textContent.trim();
          }
        } catch (e) {
          metadata.publishDate = timeElement.textContent.trim();
        }
      } else {
        metadata.publishDate = timeElement.textContent.trim();
      }
    }
    
    // Extract authors from individual-author spans
    const authorElements = document.querySelectorAll('.rich-content-author a[rel="author"] .individual-author');
    if (authorElements.length > 0) {
      const authors = Array.from(authorElements).map(el => el.textContent.trim());
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // Extract description
    const description = document.querySelector('meta[property="og:description"]');
    if (description) {
      metadata.description = description.getAttribute('content').trim();
    }
    
    // Set publisher and content type
    metadata.publisher = 'Center on Budget and Policy Priorities';
    metadata.contentType = 'report';
    
  } catch (e) {
    console.error('Error in CBPP extractor:', e);
  }
  
  return metadata;
}

// Mercatus Center extractor
function extractMercatusMetadata() {
  const metadata = {};
  
  try {
    // Extract authors from the byline container
    const authorLinks = document.querySelectorAll('.coh-style-byline ul.coh-style-comma-separated-elements li a');
    if (authorLinks.length > 0) {
      const authors = Array.from(authorLinks).map(link => link.textContent.trim());
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // Set publisher
    metadata.publisher = 'Mercatus Center';
    
    // Set content type - Mercatus produces mainly research papers and policy briefs
    metadata.contentType = 'report';
    
  } catch (e) {
    console.error('Error in Mercatus extractor:', e);
  }
  
  // Return metadata - generic extractors will handle title, date, etc.
  return metadata;
}

// EPI (Economic Policy Institute) extractor
function extractEPIMetadata() {
  const metadata = {};
  
  try {
    // Extract title from og:title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      metadata.title = ogTitle.getAttribute('content').trim();
    }
    
    // Extract author and date from entry-meta
    const entryMeta = document.querySelector('.entry-meta p.authors');
    if (entryMeta) {
      // Get the text content
      const metaText = entryMeta.textContent;
      
      // Extract authors - they appear after "By" and before the bullet point
      const authorLinks = entryMeta.querySelectorAll('a[href*="/people/"]');
      if (authorLinks.length > 0) {
        const authors = Array.from(authorLinks).map(link => link.textContent.trim());
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
      
      // Extract date - it appears after the bullet point (•)
      const dateMatch = metaText.match(/•[^•]*?(\w+\s+\d{1,2},\s+\d{4})/);
      if (dateMatch) {
        const dateText = dateMatch[1];
        try {
          const date = new Date(dateText);
          if (!isNaN(date.getTime())) {
            metadata.publishDate = date.toISOString().split('T')[0];
          } else {
            metadata.publishDate = dateText;
          }
        } catch (e) {
          metadata.publishDate = dateText;
        }
      }
    }
    
    // Fallback to blog-byline if entry-meta didn't work
    if (!metadata.author || !metadata.publishDate) {
      const blogByline = document.querySelector('.blog-byline');
      if (blogByline) {
        // Extract authors from loop-author span
        if (!metadata.author) {
          const authorLinks = blogByline.querySelectorAll('.loop-author a[href*="/people/"]');
          if (authorLinks.length > 0) {
            const authors = Array.from(authorLinks).map(link => link.textContent.trim());
            metadata.authors = authors;
            metadata.author = authors.join(', ');
          }
        }
        
        // Extract date from the text
        if (!metadata.publishDate) {
          const bylineText = blogByline.textContent;
          const dateMatch = bylineText.match(/Posted\s+(\w+\s+\d{1,2},\s+\d{4})/);
          if (dateMatch) {
            const dateText = dateMatch[1];
            try {
              const date = new Date(dateText);
              if (!isNaN(date.getTime())) {
                metadata.publishDate = date.toISOString().split('T')[0];
              } else {
                metadata.publishDate = dateText;
              }
            } catch (e) {
              metadata.publishDate = dateText;
            }
          }
        }
      }
    }
    
    // Set publisher and content type
    metadata.publisher = 'Economic Policy Institute';
    metadata.contentType = 'report';
    
  } catch (e) {
    console.error('Error in EPI extractor:', e);
  }
  
  return metadata;
}

// Milken Institute extractor
function extractMilkenMetadata() {
  const metadata = {};
  
  try {
    // Extract title from title tag and remove suffix
    const titleTag = document.querySelector('title');
    if (titleTag) {
      let title = titleTag.textContent.trim();
      // Remove " | Milken Institute" suffix
      title = title.replace(/\s*\|\s*Milken Institute\s*$/i, '');
      metadata.title = title;
    }
    
    // Extract publisher from og:site_name
    const siteName = document.querySelector('meta[property="og:site_name"]');
    if (siteName) {
      metadata.publisher = siteName.getAttribute('content').trim();
    } else {
      metadata.publisher = 'Milken Institute';
    }
    
    // Extract date from published-at field
    const timeElement = document.querySelector('.field--name-published-at time.datetime');
    if (timeElement) {
      const dateContent = timeElement.getAttribute('datetime');
      if (dateContent) {
        try {
          const date = new Date(dateContent);
          if (!isNaN(date.getTime())) {
            metadata.publishDate = date.toISOString().split('T')[0];
          } else {
            metadata.publishDate = timeElement.textContent.trim();
          }
        } catch (e) {
          metadata.publishDate = timeElement.textContent.trim();
        }
      } else {
        metadata.publishDate = timeElement.textContent.trim();
      }
    }
    
    // Extract authors from hero-article-authors - try multiple selectors
    const authors = [];
    
    // Method 1: Try finding authors in speaker-info sections (handles both internal and external)
    const speakerInfos = document.querySelectorAll('.hero-article-authors .speaker-info');
    speakerInfos.forEach(info => {
      // Check for internal author (field--name-title within h2 a)
      const internalAuthor = info.querySelector('h2 a .field--name-title');
      if (internalAuthor) {
        authors.push(internalAuthor.textContent.trim());
      } else {
        // Check for external author (field--name-field-expert-name)
        const externalAuthor = info.querySelector('.field--name-field-expert-name');
        if (externalAuthor) {
          authors.push(externalAuthor.textContent.trim());
        }
      }
    });
    
    if (authors.length > 0) {
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // Final fallback: try author-list div
    if (!metadata.author) {
      const authorList = document.querySelector('.hero-article-authors .author-list');
      if (authorList) {
        // First try to find links
        const authorLinks = authorList.querySelectorAll('a[href*="/experts/"], a[href*="/finance/"]');
        if (authorLinks.length > 0) {
          const authors = Array.from(authorLinks).map(link => link.textContent.trim());
          metadata.authors = authors;
          metadata.author = authors.join(', ');
        } else {
          // If no links, parse the text content
          // Clone the node to manipulate without affecting the DOM
          const authorListClone = authorList.cloneNode(true);
          
          // Remove the date/time div if present
          const dateDiv = authorListClone.querySelector('.teaser-subtitle');
          if (dateDiv) dateDiv.remove();
          
          // Get the text and clean it up
          let authorText = authorListClone.textContent.trim();
          
          // Split by common separators and clean up
          const authors = authorText
            .split(/\s+and\s+|\s*,\s*/)
            .map(name => name.trim())
            .filter(name => name && name.length > 2 && !name.match(/^\d/)); // Filter out empty strings and dates
          
          if (authors.length > 0) {
            metadata.authors = authors;
            metadata.author = authors.join(', ');
          }
        }
      }
    }
    
    // Set content type
    metadata.contentType = 'report';
    
  } catch (e) {
    console.error('Error in Milken Institute extractor:', e);
  }
  
  return metadata;
}

// Third Way extractor
function extractThirdWayMetadata() {
  const metadata = {};
  
  try {
    // Extract title from og:title or page title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      let title = ogTitle.getAttribute('content').trim();
      // Remove " – Third Way" suffix if present
      title = title.replace(/\s*–\s*Third Way\s*$/i, '');
      metadata.title = title;
    } else {
      const h1Title = document.querySelector('h1');
      if (h1Title) {
        let title = h1Title.textContent.trim();
        // Remove " – Third Way" suffix if present
        title = title.replace(/\s*–\s*Third Way\s*$/i, '');
        metadata.title = title;
      }
    }
    
    // Extract date from published-at div
    const publishedDiv = document.querySelector('.published-at');
    if (publishedDiv) {
      const dateText = publishedDiv.textContent.trim();
      // Extract date from "Published March 25, 2025" format
      const dateMatch = dateText.match(/Published\s+(\w+\s+\d{1,2},\s+\d{4})/);
      if (dateMatch) {
        const extractedDate = dateMatch[1];
        try {
          const date = new Date(extractedDate);
          if (!isNaN(date.getTime())) {
            metadata.publishDate = date.toISOString().split('T')[0];
          } else {
            metadata.publishDate = extractedDate;
          }
        } catch (e) {
          metadata.publishDate = extractedDate;
        }
      }
    }
    
    // Extract authors from Author divs
    const authorElements = document.querySelectorAll('.authors-list .Author .meta .title a');
    if (authorElements.length > 0) {
      const authors = Array.from(authorElements).map(el => el.textContent.trim());
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // Set publisher and content type
    metadata.publisher = 'Third Way';
    metadata.contentType = 'report';
    
  } catch (e) {
    console.error('Error in Third Way extractor:', e);
  }
  
  return metadata;
}

// CEI (Competitive Enterprise Institute) extractor
function extractCEIMetadata() {
  const metadata = {};
  
  try {
    // First run generic extraction to get the author with bullet point
    const genericExtractor = extractAuthor();
    if (genericExtractor) {
      // Remove trailing bullet point (•) and any whitespace
      const cleanedAuthor = genericExtractor.replace(/\s*•\s*$/, '').trim();
      metadata.author = cleanedAuthor;
      
      // Handle multiple authors if comma-separated
      if (cleanedAuthor.includes(',')) {
        metadata.authors = cleanedAuthor.split(',').map(name => name.trim());
      }
    }
    
    // Set publisher
    metadata.publisher = 'Competitive Enterprise Institute';
    
    // Set content type
    metadata.contentType = 'report';
    
  } catch (e) {
    console.error('Error in CEI extractor:', e);
  }
  
  // Return metadata - generic extractors will handle title, date, etc.
  return metadata;
}

// National Review extractor
function extractNationalReviewMetadata() {
  const metadata = {};
  
  try {
    // Extract authors from article-author__name links
    const authorLinks = document.querySelectorAll('.article-author__name');
    if (authorLinks.length > 0) {
      const authors = Array.from(authorLinks).map(link => {
        // Get only the direct text content, not including nested elements
        const textNodes = Array.from(link.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent.trim())
          .filter(text => text.length > 0);
        return textNodes.join(' ');
      });
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // Extract date from time element
    const timeElement = document.querySelector('.article-author__timestamp time');
    if (timeElement) {
      const dateContent = timeElement.getAttribute('datetime');
      if (dateContent) {
        try {
          const date = new Date(dateContent);
          if (!isNaN(date.getTime())) {
            metadata.publishDate = date.toISOString().split('T')[0];
          } else {
            metadata.publishDate = timeElement.textContent.trim();
          }
        } catch (e) {
          metadata.publishDate = timeElement.textContent.trim();
        }
      } else {
        metadata.publishDate = timeElement.textContent.trim();
      }
    }
    
    // Set publisher and content type
    metadata.publisher = 'National Review';
    metadata.contentType = 'news-article';
    
  } catch (e) {
    console.error('Error in National Review extractor:', e);
  }
  
  // Return metadata - generic extractors will handle title, etc.
  return metadata;
}

// Globe and Mail extractor
function extractGlobeAndMailMetadata() {
  const metadata = {};
  
  try {
    // Extract authors from article meta section
    // First try author links
    let authorLinks = document.querySelectorAll('.c-article-meta__author-info a[href*="/authors/"], .c-article-meta__bylines a[href*="/authors/"]');
    
    if (authorLinks.length > 0) {
      const authors = Array.from(authorLinks).map(link => {
        // Get the text content without the SVG icon
        const textNodes = Array.from(link.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent.trim())
          .filter(text => text.length > 0);
        return textNodes.join(' ');
      });
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    } else {
      // If no author links, try byline spans
      const bylineSpans = document.querySelectorAll('.c-article-meta__bylines span[class*="StyledByline"]');
      if (bylineSpans.length > 0) {
        const authors = Array.from(bylineSpans).map(span => span.textContent.trim());
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
    }
    
    // Extract publish date from the first time element
    const publishedTime = document.querySelector('.c-article-meta time[datetime]');
    if (publishedTime) {
      const dateTime = publishedTime.getAttribute('datetime');
      if (dateTime) {
        metadata.publishDate = dateTime;
      }
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'The Globe and Mail';
    
  } catch (e) {
    console.error('Error in Globe and Mail extractor:', e);
  }
  
  return metadata;
}

// NY Post extractor
function extractNYPostMetadata() {
  const metadata = {};
  
  try {
    // Extract authors from byline structure
    const authorLinks = document.querySelectorAll('.byline__author a[href*="/author/"]');
    if (authorLinks.length > 0) {
      const authors = Array.from(authorLinks).map(link => link.textContent.trim());
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'New York Post';
    
  } catch (e) {
    console.error('Error in NY Post extractor:', e);
  }
  
  return metadata;
}

// US News extractor
function extractUSNewsMetadata() {
  const metadata = {};
  
  try {
    // Extract authors from sailthru.author meta tag
    const authorMeta = document.querySelector('meta[property="sailthru.author"]');
    if (authorMeta && authorMeta.getAttribute('content')) {
      const authorContent = authorMeta.getAttribute('content');
      // Split by comma to handle multiple authors
      const authors = authorContent.split(',').map(a => a.trim()).filter(a => a);
      if (authors.length > 0) {
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
    }
    
    // Extract date from sailthru.date meta tag
    const dateMeta = document.querySelector('meta[property="sailthru.date"]');
    if (dateMeta && dateMeta.getAttribute('content')) {
      metadata.publishDate = dateMeta.getAttribute('content');
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'U.S. News & World Report';
    
  } catch (e) {
    console.error('Error in US News extractor:', e);
  }
  
  return metadata;
}

// DW (Deutsche Welle) extractor
function extractDWMetadata() {
  const metadata = {};
  
  try {
    // Extract title and date from the title tag
    const titleTag = document.querySelector('title');
    if (titleTag) {
      const titleContent = titleTag.textContent;
      // Pattern: "Title – DW – MM/DD/YYYY"
      const match = titleContent.match(/^(.+?)\s*–\s*DW\s*–\s*(\d{2}\/\d{2}\/\d{4})$/);
      if (match) {
        metadata.title = match[1].trim();
        // Convert MM/DD/YYYY to YYYY-MM-DD
        const dateParts = match[2].split('/');
        if (dateParts.length === 3) {
          metadata.publishDate = `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`;
        }
      }
    }
    
    // Extract author from author details
    const authorLink = document.querySelector('.author-details a.author');
    if (authorLink) {
      metadata.author = authorLink.textContent.trim();
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'Deutsche Welle';
    
  } catch (e) {
    console.error('Error in DW extractor:', e);
  }
  
  return metadata;
}

// Times of India extractor
function extractTimesOfIndiaMetadata() {
  const metadata = {};
  
  try {
    // Extract title from og:title and remove " - Times of India" suffix
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.getAttribute('content')) {
      let titleContent = ogTitle.getAttribute('content');
      // Remove " - Times of India" from the end
      titleContent = titleContent.replace(/\s*-\s*Times of India\s*$/i, '');
      metadata.title = titleContent.trim();
    }
    
    // Extract author from byline - everything before the first forward slash
    const bylineEl = document.querySelector('.byline');
    if (bylineEl) {
      const bylineText = bylineEl.textContent;
      // Get everything before the first forward slash
      const authorPart = bylineText.split('/')[0];
      if (authorPart) {
        // This may include multiple authors separated by commas or "and"
        const authors = authorPart.trim().split(/\s*,\s*|\s+and\s+/).filter(a => a);
        if (authors.length > 0) {
          metadata.authors = authors;
          metadata.author = authors.join(', ');
        }
      }
    }
    
    // Extract date from byline span
    const dateSpan = document.querySelector('.byline span');
    if (dateSpan) {
      const dateText = dateSpan.textContent;
      // Extract date after "Updated: " - capture month, day, and year (before the time)
      const match = dateText.match(/Updated:\s*(\w+\s+\d{1,2},\s+\d{4})/);
      if (match) {
        metadata.publishDate = match[1].trim();
      }
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'Times of India';
    
  } catch (e) {
    console.error('Error in Times of India extractor:', e);
  }
  
  return metadata;
}

// Indian Express extractor
function extractIndianExpressMetadata() {
  const metadata = {};
  
  try {
    // Extract author from itemprop="author" meta tag
    const authorMeta = document.querySelector('meta[itemprop="author"]');
    if (authorMeta && authorMeta.getAttribute('content')) {
      metadata.author = authorMeta.getAttribute('content').trim();
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'The Indian Express';
    
  } catch (e) {
    console.error('Error in Indian Express extractor:', e);
  }
  
  return metadata;
}

// Hindustan Times extractor
function extractHindustanTimesMetadata() {
  const metadata = {};
  
  try {
    // Extract title from h1.hdg1
    const titleEl = document.querySelector('h1.hdg1');
    if (titleEl) {
      metadata.title = titleEl.textContent.trim();
    }
    
    // Extract author and date from dataHolder attributes
    const dataHolder = document.getElementById('dataHolder');
    if (dataHolder) {
      // Extract author from data-author-name
      const authorName = dataHolder.getAttribute('data-author-name');
      if (authorName) {
        metadata.author = authorName.trim();
      }
      
      // Extract date from data-published-date (format: MMDDYYYY-HH:MM:SS)
      const publishedDate = dataHolder.getAttribute('data-published-date');
      if (publishedDate) {
        // Parse MMDDYYYY-HH:MM:SS format
        const match = publishedDate.match(/^(\d{2})(\d{2})(\d{4})-/);
        if (match) {
          const month = match[1];
          const day = match[2];
          const year = match[3];
          metadata.publishDate = `${year}-${month}-${day}`;
        }
      }
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'Hindustan Times';
    
  } catch (e) {
    console.error('Error in Hindustan Times extractor:', e);
  }
  
  return metadata;
}

// The Hill extractor
function extractTheHillMetadata() {
  const metadata = {};
  
  try {
    // Extract title from dcterms.title meta tag
    const titleMeta = document.querySelector('meta[name="dcterms.title"]');
    if (titleMeta && titleMeta.getAttribute('content')) {
      metadata.title = titleMeta.getAttribute('content');
    }
    
    // Extract author from dcterms.creator meta tag
    const authorMeta = document.querySelector('meta[name="dcterms.creator"]');
    if (authorMeta && authorMeta.getAttribute('content')) {
      let author = authorMeta.getAttribute('content');
      
      // Extract just the first line and clean it up
      author = author.split('\n')[0].trim();
      
      // Extract just the author part before the dash
      if (author.includes(' - ')) {
        author = author.split(' - ')[0].trim();
      }
      
      // If author is "TheHill.com", use just "The Hill"
      if (author === 'TheHill.com' || author.toLowerCase() === 'thehill.com') {
        metadata.author = 'The Hill';
      } else {
        metadata.author = author;
      }
    }
    
    // Also prevent the generic extractor from overwriting our author
    // by removing the dcterms.creator meta tag after we've used it
    if (authorMeta) {
      authorMeta.remove();
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'The Hill';
    
  } catch (e) {
    console.error('Error in The Hill extractor:', e);
  }
  
  return metadata;
}

// The Daily Beast extractor
function extractDailyBeastMetadata() {
  const metadata = {};
  
  try {
    // Extract author from byline structure
    const authorNameEl = document.querySelector('.Article-byline--single-author__author-name');
    if (authorNameEl) {
      metadata.author = authorNameEl.textContent.trim();
    }
    
    // Extract publish date from publication time
    const pubTimeEl = document.querySelector('.PublicationTime__pub-time');
    if (pubTimeEl) {
      const dateTime = pubTimeEl.getAttribute('datetime');
      if (dateTime) {
        // Extract just the date part (e.g., "May 25, 2025 at 10:13AM EDT" -> "May 25, 2025")
        const match = dateTime.match(/^(\w+\s+\d{1,2},\s+\d{4})/);
        if (match) {
          metadata.publishDate = match[1];
        }
      }
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'The Daily Beast';
    
  } catch (e) {
    console.error('Error in Daily Beast extractor:', e);
  }
  
  return metadata;
}

// Newsweek extractor
function extractNewsweekMetadata() {
  const metadata = {};
  
  try {
    // Extract author from article content byline only
    const articleContent = document.querySelector('.article-content');
    if (articleContent) {
      // First try author link within article content
      const authorLink = articleContent.querySelector('.byline .author-name');
      if (authorLink) {
        metadata.author = authorLink.textContent.trim();
      } else {
        // Fallback: look for author in simple span structure within article content
        const authorSpan = articleContent.querySelector('.byline .author > span:not(.tooltiptext)');
        if (authorSpan && authorSpan.textContent) {
          metadata.author = authorSpan.textContent.trim();
        }
      }
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'Newsweek';
    
  } catch (e) {
    console.error('Error in Newsweek extractor:', e);
  }
  
  return metadata;
}

// Bangkok Post extractor
function extractBangkokPostMetadata() {
  const metadata = {};
  
  try {
    // Extract author from lead:author meta tag
    const authorMeta = document.querySelector('meta[name="lead:author"]');
    if (authorMeta && authorMeta.getAttribute('content')) {
      metadata.author = authorMeta.getAttribute('content').trim();
    }
    
    // Extract date from lead:published_at meta tag
    const dateMeta = document.querySelector('meta[name="lead:published_at"]');
    if (dateMeta && dateMeta.getAttribute('content')) {
      metadata.publishDate = dateMeta.getAttribute('content').trim();
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'Bangkok Post';
    
  } catch (e) {
    console.error('Error in Bangkok Post extractor:', e);
  }
  
  return metadata;
}

// Japan Times extractor
function extractJapanTimesMetadata() {
  const metadata = {};
  
  try {
    // Extract author from cXenseParse:author meta tag
    const authorMeta = document.querySelector('meta[name="cXenseParse:author"]');
    if (authorMeta && authorMeta.getAttribute('content')) {
      const authorContent = authorMeta.getAttribute('content').trim();
      // Check if there's a data-separator attribute for multiple authors
      const separator = authorMeta.getAttribute('data-separator') || ',';
      if (authorContent.includes(separator)) {
        const authors = authorContent.split(separator).map(a => a.trim()).filter(a => a);
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      } else {
        metadata.author = authorContent;
      }
    }
    
    // Extract title from og:title meta tag
    const titleMeta = document.querySelector('meta[property="og:title"]');
    if (titleMeta && titleMeta.getAttribute('content')) {
      metadata.title = titleMeta.getAttribute('content').trim();
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'The Japan Times';
    
  } catch (e) {
    console.error('Error in Japan Times extractor:', e);
  }
  
  return metadata;
}

// AP News extractor
function extractAPNewsMetadata() {
  const metadata = {};
  
  try {
    // Extract author from byline structure
    const authorLinks = document.querySelectorAll('.Page-authors a');
    if (authorLinks.length > 0) {
      const authors = Array.from(authorLinks).map(link => link.textContent.trim());
      if (authors.length === 1) {
        metadata.author = authors[0];
      } else {
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
    }
    
    // Set standard fields
    metadata.contentType = 'news-article';
    metadata.publisher = 'Associated Press';
    
  } catch (e) {
    console.error('Error in AP News extractor:', e);
  }
  
  return metadata;
}

// R Street Institute extractor
function extractRStreetMetadata() {
  const metadata = {};
  
  try {
    // Extract authors from article-header__author links
    const authorLinks = document.querySelectorAll('.article-header__author a');
    if (authorLinks.length > 0) {
      const authors = Array.from(authorLinks).map(link => link.textContent.trim());
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    } else {
      // Fallback to generic extraction if specific selector doesn't work
      const genericAuthor = extractAuthor();
      if (genericAuthor) {
        // Check if it contains date pattern at the end and remove it
        const cleanedAuthor = genericAuthor
          .replace(/\s+\w+\s+\d{1,2},\s+\d{4}.*$/i, '') // Remove date at end
          .replace(/\s+AND\s+/g, ', ')  // Replace AND with comma
          .replace(/\s+and\s+/g, ', ')  // Also handle lowercase
          .trim();
        
        metadata.author = cleanedAuthor;
        
        // Split into authors array
        const authors = cleanedAuthor.split(',').map(name => name.trim()).filter(name => name);
        if (authors.length > 0) {
          metadata.authors = authors;
        }
      }
    }
    
    // Extract date from article-header__date
    const dateEl = document.querySelector('.article-header__date');
    if (dateEl) {
      const dateText = dateEl.textContent.trim();
      try {
        const date = new Date(dateText);
        if (!isNaN(date.getTime())) {
          metadata.publishDate = date.toISOString().split('T')[0];
        } else {
          metadata.publishDate = dateText;
        }
      } catch (e) {
        metadata.publishDate = dateText;
      }
    }
    
    // Set publisher
    metadata.publisher = 'R Street Institute';
    
    // Set content type
    metadata.contentType = 'report';
    
  } catch (e) {
    console.error('Error in R Street extractor:', e);
  }
  
  // Return metadata - generic extractors will handle title, date, etc.
  return metadata;
}

// Aspen Institute extractor
function extractAspenMetadata() {
  const metadata = {};
  
  try {
    // Extract title from og:title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      metadata.title = ogTitle.getAttribute('content').trim();
    }
    
    // Extract publication date from article:published_time
    const publishedMeta = document.querySelector('meta[property="article:published_time"]');
    if (publishedMeta) {
      const dateContent = publishedMeta.getAttribute('content');
      try {
        const date = new Date(dateContent);
        if (!isNaN(date.getTime())) {
          metadata.publishDate = date.toISOString().split('T')[0];
        } else {
          metadata.publishDate = dateContent;
        }
      } catch (e) {
        metadata.publishDate = dateContent;
      }
    }
    
    // Extract authors from PageMap comments
    // Get all comment nodes
    const commentWalker = document.createTreeWalker(
      document.documentElement,
      NodeFilter.SHOW_COMMENT,
      null,
      false
    );
    
    let comment;
    const authors = [];
    
    while (comment = commentWalker.nextNode()) {
      if (comment.nodeValue.includes('<PageMap>')) {
        // Extract author DataObjects
        const authorMatches = comment.nodeValue.matchAll(/<DataObject type="author">\s*<Attribute name="label" value="([^"]+)"/g);
        for (const match of authorMatches) {
          if (match[1]) {
            authors.push(match[1].trim());
          }
        }
      }
    }
    
    if (authors.length > 0) {
      metadata.authors = authors;
      metadata.author = authors.join(', ');
    }
    
    // Set publisher and content type
    metadata.publisher = 'Aspen Institute';
    metadata.contentType = 'report';
    
  } catch (e) {
    console.error('Error in Aspen Institute extractor:', e);
  }
  
  return metadata;
}

// FPRI (Foreign Policy Research Institute) extractor
function extractFPRIMetadata() {
  const metadata = {};
  
  try {
    // Extract title - try og:title first
    const ogTitleMeta = document.querySelector('meta[property="og:title"]');
    if (ogTitleMeta) {
      let title = ogTitleMeta.getAttribute('content').trim();
      // Remove " - Foreign Policy Research Institute" suffix if present
      title = title.replace(/\s*-\s*Foreign Policy Research Institute\s*$/i, '');
      metadata.title = title;
    }
    
    // If no og:title, try the h2 caption
    if (!metadata.title) {
      const h2Title = document.querySelector('h2.caption-article');
      if (h2Title) {
        metadata.title = h2Title.textContent.trim();
      }
    }
    
    // Extract authors and date from meta-desc list
    const metaDescList = document.querySelector('ul.meta-desc.meta-desc-article');
    if (metaDescList) {
      // Look for all author links
      const authorLinks = metaDescList.querySelectorAll('a.author');
      if (authorLinks.length > 0) {
        const authors = Array.from(authorLinks).map(link => link.textContent.trim());
        metadata.authors = authors;
        metadata.author = authors.join(', ');
      }
      
      // Look for date in span
      const listItems = metaDescList.querySelectorAll('li');
      for (const li of listItems) {
        const dateSpan = li.querySelector('span');
        if (dateSpan && !li.querySelector('a')) { // Make sure it's not part of a link
          const dateText = dateSpan.textContent.trim();
          // Parse date like "May 15, 2025" or "April 30, 2025"
          try {
            const date = new Date(dateText);
            if (!isNaN(date.getTime())) {
              metadata.publishDate = date.toISOString().split('T')[0];
            } else {
              metadata.publishDate = dateText;
            }
          } catch (e) {
            metadata.publishDate = dateText;
          }
          break;
        }
      }
    }
    
    // Set publisher and content type
    metadata.publisher = 'Foreign Policy Research Institute';
    metadata.contentType = 'report';
    
  } catch (e) {
    console.error('Error in FPRI extractor:', e);
  }
  
  return metadata;
}