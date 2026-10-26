// Warehouse photo uploads survive a weak network (design 07): each photo is stored in IndexedDB first, then uploaded
// through a signed Storage URL; failures stay queued and are retried with back-off, and at once when the tablet is back
// online. Listeners get metadata only; photo bytes are read just for the upload and the thumbnail.
import { fetchClient } from "@/lib/api/client";

export type PhotoKind = "label" | "overview" | "damage";
export type QueueState = "pending" | "uploaded" | "failed";

export type QueueItem = {
  id: string;
  contentType: string;
  kind: PhotoKind;
  /** Set when the parcel already exists: the upload is then attached to it. Null for photos taken before receiving. */
  parcelId: string | null;
  state: QueueState;
  fileId: string | null;
  attempts: number;
  createdAt: number;
  nextAttemptAt: number;
};

type Uploader = (url: string, blob: Blob, contentType: string) => Promise<void>;

const DB_NAME = "ce-warehouse";
const ITEMS = "photo-items";
// Raw bytes rather than Blobs: Blobs in IndexedDB have been unreliable on iOS Safari.
const BYTES = "photo-bytes";
const MAX_BACKOFF_MS = 5 * 60_000;
// Photos taken for a receive that was never submitted are dropped after a day.
const STALE_MS = 24 * 60 * 60_000;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of [...db.objectStoreNames]) db.deleteObjectStore(name);
      db.createObjectStore(ITEMS, { keyPath: "id" });
      db.createObjectStore(BYTES);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function read<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const putToStorage: Uploader = async (url, blob, contentType) => {
  const response = await fetch(url, { method: "PUT", body: blob, headers: { "Content-Type": contentType } });
  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
};

export class UploadQueue {
  private db: Promise<IDBDatabase>;
  private meta: Promise<Map<string, QueueItem>>;
  private listeners = new Set<(items: QueueItem[]) => void>();
  private running: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private upload: Uploader = putToStorage, private now: () => number = Date.now) {
    this.db = openDb();
    this.meta = this.load();
  }

  async items(): Promise<QueueItem[]> {
    return [...(await this.meta).values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  async bytes(id: string): Promise<ArrayBuffer | undefined> {
    return read((await this.db).transaction(BYTES).objectStore(BYTES).get(id) as IDBRequest<ArrayBuffer | undefined>);
  }

  subscribe(listener: (items: QueueItem[]) => void): () => void {
    this.listeners.add(listener);
    void this.items().then(listener);
    return () => this.listeners.delete(listener);
  }

  async enqueue({ blob, ...input }: { blob: Blob; contentType: string; kind: PhotoKind; parcelId: string | null }): Promise<QueueItem> {
    const at = this.now();
    const item: QueueItem = { ...input, id: crypto.randomUUID(), state: "pending", fileId: null, attempts: 0, createdAt: at, nextAttemptAt: at };
    // Read everything first: awaiting anything else while a transaction is open lets the browser auto-commit it.
    const [db, bytes] = await Promise.all([this.db, blob.arrayBuffer()]);
    const tx = db.transaction([ITEMS, BYTES], "readwrite");
    tx.objectStore(ITEMS).put(item);
    tx.objectStore(BYTES).put(bytes, item.id);
    await done(tx);
    (await this.meta).set(item.id, item);
    this.emit();
    void this.process();
    return item;
  }

  /** Drop items the caller has used (e.g. photos sent with a receive request). One transaction. */
  async remove(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const tx = (await this.db).transaction([ITEMS, BYTES], "readwrite");
    for (const id of ids) {
      tx.objectStore(ITEMS).delete(id);
      tx.objectStore(BYTES).delete(id);
    }
    await done(tx);
    const meta = await this.meta;
    ids.forEach((id) => meta.delete(id));
    this.emit();
  }

  /** Upload what is due (or everything waiting, with `force`, e.g. when the network returns). Concurrent calls share one run. */
  process({ force = false } = {}): Promise<void> {
    this.running ??= this.drain(force).finally(() => {
      this.running = null;
      void this.schedule();
    });
    return this.running;
  }

  private async drain(force: boolean) {
    for (const item of await this.items()) {
      if (item.state === "uploaded" || (!force && item.nextAttemptAt > this.now())) continue;
      try {
        const bytes = await this.bytes(item.id);
        if (!bytes) throw new Error("Photo bytes missing");
        const { data, error } = await fetchClient.POST("/files/upload-url", {
          body: { purpose: "parcel_photo", contentType: item.contentType, sizeBytes: Math.max(1, bytes.byteLength) },
        });
        if (error || !data) throw new Error("No upload URL");
        await this.upload(data.uploadUrl, new Blob([bytes], { type: item.contentType }), item.contentType);
        if (item.parcelId) {
          const attached = await fetchClient.POST("/wh/parcels/{parcelId}/photos", {
            params: { path: { parcelId: item.parcelId }, header: { "Idempotency-Key": item.id } },
            body: { fileId: data.fileId, kind: item.kind },
          });
          if (attached.error) throw new Error("Attach failed");
          await this.remove([item.id]); // attached to its parcel: nothing left to keep
          continue;
        }
        await this.save({ ...item, state: "uploaded", fileId: data.fileId, attempts: item.attempts + 1 });
      } catch {
        const attempts = item.attempts + 1;
        await this.save({ ...item, state: "failed", attempts, nextAttemptAt: this.now() + Math.min(MAX_BACKOFF_MS, 5_000 * 2 ** attempts) });
      }
    }
  }

  /** One timer for the whole queue, armed only while something is waiting. */
  private async schedule() {
    clearTimeout(this.timer);
    const waiting = (await this.items()).filter((i) => i.state !== "uploaded");
    if (waiting.length === 0) return;
    const due = Math.min(...waiting.map((i) => i.nextAttemptAt));
    this.timer = setTimeout(() => void this.process(), Math.max(0, due - this.now()));
  }

  private async load(): Promise<Map<string, QueueItem>> {
    const db = await this.db;
    const all = await read(db.transaction(ITEMS).objectStore(ITEMS).getAll() as IDBRequest<QueueItem[]>);
    const stale = all.filter((i) => i.state === "uploaded" && this.now() - i.createdAt > STALE_MS).map((i) => i.id);
    if (stale.length) {
      const tx = db.transaction([ITEMS, BYTES], "readwrite");
      stale.forEach((id) => { tx.objectStore(ITEMS).delete(id); tx.objectStore(BYTES).delete(id); });
      await done(tx);
    }
    return new Map(all.filter((i) => !stale.includes(i.id)).map((i) => [i.id, i]));
  }

  private async save(item: QueueItem) {
    const tx = (await this.db).transaction(ITEMS, "readwrite");
    tx.objectStore(ITEMS).put(item);
    await done(tx);
    (await this.meta).set(item.id, item);
    this.emit();
  }

  private emit() {
    void this.items().then((items) => this.listeners.forEach((listener) => listener(items)));
  }
}

let shared: UploadQueue | undefined;

/** The tablet's single queue (browser only); retries at once when the network comes back. */
export function getUploadQueue(): UploadQueue {
  if (!shared) {
    const queue = new UploadQueue();
    window.addEventListener("online", () => void queue.process({ force: true }));
    void queue.process();
    shared = queue;
  }
  return shared;
}
