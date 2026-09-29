const DB_NAME = "trailer-vault"
const STORE_NAME = "keys"
const MASTER_KEY_ID = "master"
const LS_KEY = "trailer-vault:ciphertext"

export type KeyService = "openrouter" | "elevenlabs"

export interface StoredKeys {
  openrouter?: string
  elevenlabs?: string
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined"
}

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet<T>(db: IDBDatabase, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
  })
}

async function storeMasterKey(db: IDBDatabase, candidate: CryptoKey): Promise<CryptoKey> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(MASTER_KEY_ID)
    let key = candidate
    req.onsuccess = () => {
      // Keep the first key if two tabs initialize the vault together.
      if (req.result) key = req.result
      else store.put(candidate, MASTER_KEY_ID)
    }
    tx.oncomplete = () => resolve(key)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error("Vault transaction aborted"))
  })
}

let masterKeyPromise: Promise<CryptoKey> | null = null

async function getMasterKey(): Promise<CryptoKey> {
  if (masterKeyPromise) return masterKeyPromise
  masterKeyPromise = (async () => {
    const db = await openDb()
    try {
      const existing = await idbGet<CryptoKey>(db, MASTER_KEY_ID)
      if (existing) return existing
      const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      )
      return await storeMasterKey(db, key)
    } finally {
      db.close()
    }
  })().catch((error) => {
    masterKeyPromise = null
    throw error
  })
  return masterKeyPromise
}

function toBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function loadKeys(): Promise<StoredKeys> {
  if (!isBrowser()) return {}
  const stored = localStorage.getItem(LS_KEY)
  if (!stored) return {}
  try {
    const combined = fromBase64(stored)
    const key = await getMasterKey()
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: combined.slice(0, 12) },
      key,
      combined.slice(12),
    )
    const parsed: unknown = JSON.parse(new TextDecoder().decode(plaintext))
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid vault data")
    }
    const keys: StoredKeys = {}
    for (const service of ["openrouter", "elevenlabs"] as const) {
      const value = (parsed as Record<string, unknown>)[service]
      if (value !== undefined && typeof value !== "string") throw new Error("Invalid vault key")
      if (typeof value === "string" && value.trim()) keys[service] = value
    }
    return keys
  } catch {
    throw new Error("Could not read saved API keys. Clear the vault in Settings and save your keys again.")
  }
}

export async function saveKeys(keys: StoredKeys): Promise<void> {
  if (!isBrowser()) throw new Error("saveKeys is browser-only")
  const key = await getMasterKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(keys))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext),
  )
  const combined = new Uint8Array(iv.length + ciphertext.length)
  combined.set(iv, 0)
  combined.set(ciphertext, iv.length)
  localStorage.setItem(LS_KEY, toBase64(combined))
}

export async function updateKey(service: KeyService, value: string | null): Promise<void> {
  const existing = await loadKeys()
  if (value === null || value === "") delete existing[service]
  else existing[service] = value
  await saveKeys(existing)
}

export function clearVault(): void {
  if (!isBrowser()) return
  localStorage.removeItem(LS_KEY)
}

export async function hasKey(service: KeyService): Promise<boolean> {
  const keys = await loadKeys()
  return Boolean(keys[service])
}
