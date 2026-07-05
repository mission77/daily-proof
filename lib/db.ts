// Minimal, dependency-free IndexedDB layer.
// Stores: practices, sessions, settings, access.

const DB_NAME = "daily-proof";
const DB_VERSION = 1;

export const STORES = {
  practices: "practices",
  sessions: "sessions",
  settings: "settings",
  access: "access",
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

/** Creates any of our object stores that don't exist yet. Never touches
 *  stores it doesn't know about, so data from older builds is preserved. */
function ensureStores(db: IDBDatabase) {
  if (!db.objectStoreNames.contains(STORES.practices)) {
    const s = db.createObjectStore(STORES.practices, { keyPath: "id" });
    s.createIndex("order", "order");
  }
  if (!db.objectStoreNames.contains(STORES.sessions)) {
    const s = db.createObjectStore(STORES.sessions, { keyPath: "id" });
    s.createIndex("completedAt", "completedAt");
  }
  if (!db.objectStoreNames.contains(STORES.settings)) {
    db.createObjectStore(STORES.settings, { keyPath: "key" });
  }
  if (!db.objectStoreNames.contains(STORES.access)) {
    db.createObjectStore(STORES.access, { keyPath: "key" });
  }
}

function openAt(version?: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = version === undefined ? indexedDB.open(DB_NAME) : indexedDB.open(DB_NAME, version);
    req.onupgradeneeded = () => ensureStores(req.result);
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error ?? new Error("Failed to open database"));
  });
}

function hasAllStores(db: IDBDatabase): boolean {
  return Object.values(STORES).every((s) => db.objectStoreNames.contains(s));
}

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    let db: IDBDatabase;
    try {
      db = await openAt(DB_VERSION);
    } catch (err) {
      // A previous build on this origin may have left the database at a higher
      // version (VersionError). Recover by adopting whatever version exists:
      // open unversioned to discover it, then upgrade past it if our stores
      // are missing. Existing data is never deleted.
      if (err instanceof DOMException && err.name === "VersionError") {
        db = await openAt();
      } else {
        dbPromise = null;
        throw err;
      }
    }
    if (!hasAllStores(db)) {
      const nextVersion = db.version + 1;
      db.close();
      db = await openAt(nextVersion);
    }
    return db;
  })();
  dbPromise.catch(() => {
    dbPromise = null; // allow retry after a failure
  });
  return dbPromise;
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

export async function idbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDb();
  const tx = db.transaction(store, "readonly");
  return requestToPromise(tx.objectStore(store).get(key) as IDBRequest<T | undefined>);
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDb();
  const tx = db.transaction(store, "readonly");
  return requestToPromise(tx.objectStore(store).getAll() as IDBRequest<T[]>);
}

export async function idbPut<T>(store: StoreName, value: T): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).put(value as unknown as object);
  await txDone(tx);
}

export async function idbPutMany<T>(store: StoreName, values: T[]): Promise<void> {
  if (values.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  const os = tx.objectStore(store);
  for (const v of values) os.put(v as unknown as object);
  await txDone(tx);
}

export async function idbDelete(store: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).delete(key);
  await txDone(tx);
}

export async function idbClear(store: StoreName): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).clear();
  await txDone(tx);
}

/** Atomically replace the contents of several stores. Used by backup restore. */
export async function idbReplaceAll(data: Partial<Record<StoreName, unknown[]>>): Promise<void> {
  const db = await openDb();
  const names = Object.keys(data) as StoreName[];
  const tx = db.transaction(names, "readwrite");
  for (const name of names) {
    const os = tx.objectStore(name);
    os.clear();
    for (const v of data[name] ?? []) os.put(v as object);
  }
  await txDone(tx);
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
}
