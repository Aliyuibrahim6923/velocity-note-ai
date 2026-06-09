const DB_NAME = 'VelocityNoteDB';
const DB_VERSION = 1;
const STORE_NAME = 'velocity_items';

let dbInstance = null;

const initDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }
    };
  });
};

export const dbService = {
  async saveItem(item) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(item);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async queryItems({ searchTerm = '', category = 'ALL', sortOrder = 'desc', filterMonth = 'ALL', limit = 20, offset = 0 } = {}) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('created_at');
      const direction = sortOrder === 'desc' ? 'prev' : 'next';
      
      const request = index.openCursor(null, direction);
      const results = [];
      let matchCount = 0;
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          const item = cursor.value;
          
          let matches = true;
          if (category !== 'ALL' && item.category !== category) {
            matches = false;
          }
          if (filterMonth !== 'ALL') {
            const itemMonth = new Date(item.created_at).getMonth().toString();
            if (itemMonth !== filterMonth) {
              matches = false;
            }
          }
          if (searchTerm) {
            const term = searchTerm.toLowerCase();
            if (!item.raw_text.toLowerCase().includes(term)) {
              matches = false;
            }
          }
          
          if (matches) {
            if (matchCount >= offset) {
              results.push(item);
            }
            matchCount++;
          }
          
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  },

  async deleteItem(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
};
