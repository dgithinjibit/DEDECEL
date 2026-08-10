import { BirthRecord, OfflineQueueItem } from '../types';

const DB_NAME = 'BirthChainLocalDB';
const DB_VERSION = 1;
const QUEUE_STORE = 'offlineQueue';
const RECORDS_STORE = 'cachedRecords';

export class OfflineSyncEngine {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = true;
  private listeners: Array<(online: boolean) => void> = [];

  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  public async init(): Promise<void> {
    if (!window.indexedDB) {
      console.warn('IndexedDB not available in this environment');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(RECORDS_STORE)) {
          db.createObjectStore(RECORDS_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        console.error('IndexedDB init error:', request.error);
        reject(request.error);
      };
    });
  }

  public setOnlineSimulated(online: boolean) {
    this.handleNetworkChange(online);
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public subscribeStatus(callback: (online: boolean) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private handleNetworkChange(online: boolean) {
    this.isOnline = online;
    this.listeners.forEach(l => l(online));
  }

  // Queue an offline birth registration
  public async queueOfflineRecord(record: BirthRecord): Promise<OfflineQueueItem> {
    if (!this.db) await this.init();
    
    const queueItem: OfflineQueueItem = {
      id: `QUEUE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      record: {
        ...record,
        syncState: 'Queued_Offline'
      },
      queuedAt: new Date().toISOString(),
      status: 'Pending',
      attempts: 0
    };

    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const req = store.put(queueItem);

      req.onsuccess = () => resolve(queueItem);
      req.onerror = () => reject(req.error);
    });
  }

  // Get all items in offline queue
  public async getQueue(): Promise<OfflineQueueItem[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      const transaction = this.db.transaction([QUEUE_STORE], 'readonly');
      const store = transaction.objectStore(QUEUE_STORE);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // Remove item from offline queue
  public async removeFromQueue(id: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      const transaction = this.db.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Clear offline queue
  public async clearQueue(): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      const transaction = this.db.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const offlineEngine = new OfflineSyncEngine();
