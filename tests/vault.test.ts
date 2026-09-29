import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { IDBFactory } from "fake-indexeddb"
import { clearVault, hasKey, loadKeys, saveKeys, updateKey } from "../lib/vault"

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage")
const originalIndexedDB = Object.getOwnPropertyDescriptor(globalThis, "indexedDB")
const values = new Map<string, string>()
const ciphertextKey = "trailer-vault:ciphertext"

beforeAll(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} })
  Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: new IDBFactory() })
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  })
})

afterAll(() => {
  for (const [name, descriptor] of [
    ["window", originalWindow],
    ["localStorage", originalStorage],
    ["indexedDB", originalIndexedDB],
  ] as const) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else Reflect.deleteProperty(globalThis, name)
  }
})

describe("encrypted API key vault", () => {
  it("preserves both keys across repeated reads without storing plaintext", async () => {
    const keys = { openrouter: "private-router-key", elevenlabs: "private-voice-key" }
    await saveKeys(keys)
    const ciphertext = values.get(ciphertextKey)!
    expect(ciphertext).not.toContain(keys.openrouter)
    expect(ciphertext).not.toContain(keys.elevenlabs)
    expect(await loadKeys()).toEqual(keys)
    expect(await loadKeys()).toEqual(keys)
    expect(values.get(ciphertextKey)).toBe(ciphertext)
  })

  it("updating or removing one key preserves the other provider", async () => {
    await saveKeys({ openrouter: "router", elevenlabs: "voice" })
    await updateKey("openrouter", "replacement")
    expect(await loadKeys()).toEqual({ openrouter: "replacement", elevenlabs: "voice" })
    await updateKey("elevenlabs", null)
    expect(await loadKeys()).toEqual({ openrouter: "replacement" })
    expect(await hasKey("openrouter")).toBe(true)
    expect(await hasKey("elevenlabs")).toBe(false)
  })

  it("reports damaged ciphertext without silently deleting it and allows recovery", async () => {
    values.set(ciphertextKey, "damaged")
    await expect(loadKeys()).rejects.toThrow("Clear the vault in Settings")
    expect(values.get(ciphertextKey)).toBe("damaged")
    clearVault()
    expect(await loadKeys()).toEqual({})
    await saveKeys({ openrouter: "recovered" })
    expect(await loadKeys()).toEqual({ openrouter: "recovered" })
  })
})
