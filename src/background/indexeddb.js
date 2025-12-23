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

  // Migrate sessions from chrome.storage to IndexedDB
  async migrateFromChromeStorage() {
    console.log('Starting migration from chrome.storage to IndexedDB...');
    
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['sessions'], async (result) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to read from chrome.storage:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        const sessions = result.sessions || [];
        console.log(`Found ${sessions.length} sessions to migrate`);

        let migrated = 0;
        let failed = 0;

        for (const session of sessions) {
          if (!session || !session.id) {
            console.warn('Skipping invalid session:', session);
            failed++;
            continue;
          }

          try {
            await this.saveSession(session);
            migrated++;
          } catch (error) {
            console.error(`Failed to migrate session ${session.id}:`, error);
            failed++;
          }
        }

        console.log(`Migration complete: ${migrated} sessions migrated, ${failed} failed`);

        // Only clear chrome.storage if migration was highly successful (>95% success rate)
        // This prevents data loss from partial migrations
        const successRate = sessions.length > 0 ? (migrated / sessions.length) : 0;
        const MIN_SUCCESS_RATE = 0.95; // 95% threshold

        if (successRate >= MIN_SUCCESS_RATE) {
          console.log(`Migration success rate: ${(successRate * 100).toFixed(1)}% - clearing chrome.storage`);
          chrome.storage.local.remove(['sessions'], () => {
            if (chrome.runtime.lastError) {
              console.error('Failed to clear chrome.storage sessions:', chrome.runtime.lastError);
            } else {
              console.log('Cleared sessions from chrome.storage');
            }
          });
        } else if (sessions.length > 0) {
          console.warn(
            `Migration success rate: ${(successRate * 100).toFixed(1)}% (below ${MIN_SUCCESS_RATE * 100}% threshold)\n` +
            `Keeping sessions in chrome.storage for safety. ${failed} sessions failed to migrate.\n` +
            `Please check browser console for errors and retry migration.`
          );
        }

        resolve({ migrated, failed, total: sessions.length, successRate });
      });
    });
  }

  // Check if migration is needed
  async needsMigration() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['sessions'], (result) => {
        const hasChromeStorageSessions = result.sessions && result.sessions.length > 0;
        resolve(hasChromeStorageSessions);
      });
    });
  }
}

// Create singleton instance
const researchTrackerDB = new ResearchTrackerDB();

// Initialize the database on module load
researchTrackerDB.init().catch(error => {
  console.error('Failed to initialize IndexedDB:', error);
});