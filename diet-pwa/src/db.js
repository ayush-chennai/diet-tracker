// ─── IndexedDB Storage Layer ─────────────────────────────────────────────────
// Drop-in replacement for window.storage — uses IndexedDB which persists
// across Safari sessions on iPhone even when the browser cache is cleared.

const DB_NAME = 'DietTrackerDB'
const DB_VERSION = 1
const STORE_NAME = 'keyval'

let _db = null

async function getDB() {
  if (_db) return _db
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db) }
    req.onerror   = (e) => reject(e.target.error)
  })
}

export async function dbGet(key) {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror   = () => reject(req.error)
  })
}

export async function dbSet(key, value) {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).put(value, key)
    req.onsuccess = () => resolve(true)
    req.onerror   = () => reject(req.error)
  })
}

export async function dbDelete(key) {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).delete(key)
    req.onsuccess = () => resolve(true)
    req.onerror   = () => reject(req.error)
  })
}
