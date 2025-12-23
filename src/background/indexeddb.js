// IndexedDB module for Research Tracker Extension
// Handles storage of historical sessions while current session remains in chrome.storage

const DB_NAME = 'ResearchTrackerDB';
const DB_VERSION = 1;

// Object store names
const STORES = {
  SESSIONS: 'sessions',
  METADATA: 'metadata'
};

class ResearchTrackerDB {
  constructor() {
    this.db = null;
  }

  // Initialize database connection
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create sessions store if it doesn't exist
        if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
          const sessionStore = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
          sessionStore.createIndex('startTime', 'startTime', { unique: false });
          sessionStore.createIndex('name', 'name', { unique: false });
          sessionStore.createIndex('endTime', 'endTime', { unique: false });
        }

        // Create metadata store if it doesn't exist
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          const metadataStore = db.createObjectStore(STORES.METADATA, { keyPath: 'id' });
          metadataStore.createIndex('url', 'url', { unique: false });
          metadataStore.createIndex('sessionId', 'sessionId', { unique: false });
        }
      };
    });
  }

  // Ensure database is connected
  async ensureConnection() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  // Save a completed session to IndexedDB
  async saveSession(session) {
    const db = await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SESSIONS], 'readwrite');
      const store = transaction.objectStore(STORES.SESSIONS);
      
      const request = store.put(session);
      
      request.onsuccess = () => {
        console.log(`Session ${session.id} saved to IndexedDB`);
        resolve(session.id);
      };
      
      request.onerror = () => {
        console.error('Failed to save session:', request.error);
        reject(request.error);
      };
    });
  }

  // Get all sessions (summary only for performance)
  async getAllSessions() {
    const db = await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SESSIONS], 'readonly');
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const sessions = request.result || [];
        // Return summary info only
        const summaries = sessions.map(session => ({
          id: session.id,
          name: session.name || `Research Session ${new Date(session.startTime).toLocaleDateString()}`,
          startTime: session.startTime,
          endTime: session.endTime,
          events: session.events ? session.events.length : 0,
          searches: session.searches ? session.searches.length : 0,
          pageVisits: session.pageVisits ? session.pageVisits.length : 0
        }));
        resolve(summaries);
      };
      
      request.onerror = () => {
        console.error('Failed to get sessions:', request.error);
        reject(request.error);
      };
    });
  }

  // Get a specific session by ID
  async getSession(sessionId) {
    const db = await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SESSIONS], 'readonly');
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.get(sessionId);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Failed to get session:', request.error);
        reject(request.error);
      };
    });
  }

  // Delete a session
  async deleteSession(sessionId) {
    const db = await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SESSIONS], 'readwrite');
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.delete(sessionId);
      
      request.onsuccess = () => {
        console.log(`Session ${sessionId} deleted from IndexedDB`);
        resolve();
      };
      
      request.onerror = () => {
        console.error('Failed to delete session:', request.error);
        reject(request.error);
      };
    });
  }

  // Clear all sessions (use with caution)
  async clearAllSessions() {
    const db = await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SESSIONS], 'readwrite');
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('All sessions cleared from IndexedDB');
        resolve();
      };
      
      request.onerror = () => {
        console.error('Failed to clear sessions:', request.error);
        reject(request.error);
      };
    });
  }

  // Save metadata
  async saveMetadata(metadata) {
    const db = await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.METADATA], 'readwrite');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.put(metadata);
      
      request.onsuccess = () => resolve(metadata.id);
      request.onerror = () => reject(request.error);
    });
  }

  // Get metadata by URL
  async getMetadataByUrl(url) {
    const db = await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.METADATA], 'readonly');
      const store = transaction.objectStore(STORES.METADATA);
      const index = store.index('url');
      const request = index.getAll(url);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Create singleton instance
const researchTrackerDB = new ResearchTrackerDB();

// Initialize the database on module load
researchTrackerDB.init().catch(error => {
  console.error('Failed to initialize IndexedDB:', error);
});