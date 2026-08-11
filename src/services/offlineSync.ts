import { DeathCertificate, NetworkSpeed, OfflineQueueItem } from '../types';

const STORAGE_KEY_OFFLINE_QUEUE = 'bidecel_offline_sync_queue_v1';

export class OfflineSyncEngine {
  private queue: OfflineQueueItem[] = [];

  constructor() {
    this.loadQueue();
  }

  private loadQueue(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OFFLINE_QUEUE);
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load offline queue:', e);
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(this.queue));
    } catch (e) {
      console.error('Failed to save offline queue:', e);
    }
  }

  public getQueue(): OfflineQueueItem[] {
    return this.queue;
  }

  public enqueueCertificate(
    certificate: DeathCertificate,
    action: 'CREATE' | 'SIGN' | 'APPROVE' | 'REVOKE'
  ): OfflineQueueItem {
    const rawDataStr = JSON.stringify(certificate);
    const rawDataSizeKb = Math.round((rawDataStr.length / 1024) * 10) / 10;
    // Simulated field compression for rural 2G/3G transmission
    const compressedSizeKb = Math.max(0.4, Math.round(rawDataSizeKb * 0.28 * 10) / 10);

    const item: OfflineQueueItem = {
      id: `QUEUE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      certificate,
      action,
      timestamp: Date.now(),
      status: 'PENDING',
      dataSizeKb: rawDataSizeKb,
      compressedSizeKb,
      retryCount: 0
    };

    this.queue.push(item);
    this.saveQueue();
    return item;
  }

  public removeFromQueue(queueId: string): void {
    this.queue = this.queue.filter(i => i.id !== queueId);
    this.saveQueue();
  }

  public clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Calculates time estimate for uploading pending queue based on network speed
   */
  public calculateSyncEstimate(network: NetworkSpeed): { totalKb: number; timeSeconds: number } {
    const pendingItems = this.queue.filter(i => i.status === 'PENDING' || i.status === 'SYNCING');
    const totalKb = pendingItems.reduce((acc, curr) => acc + curr.compressedSizeKb, 0);

    let kbps = 10000; // Default 5G (~10 MB/s)
    if (network === 'LOW_BANDWIDTH_3G') kbps = 384; // 384 kbps
    if (network === 'EDGE_2G') kbps = 48; // 48 kbps
    if (network === 'OFFLINE') return { totalKb, timeSeconds: Infinity };

    const timeSeconds = Math.max(0.5, Math.round((totalKb * 8 / kbps) * 10) / 10);
    return { totalKb, timeSeconds };
  }
}
