"use client"

import { useCallback, useEffect, useState } from "react"
import {
  clearVault,
  loadKeys,
  saveKeys,
  updateKey,
  type KeyService,
  type StoredKeys,
} from "@/lib/vault"

export function useApiKeys() {
  const [keys, setKeys] = useState<StoredKeys>({})
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadKeys().then((loaded) => {
      if (!cancelled) {
        setKeys(loaded)
      }
    }).catch((error: unknown) => {
      if (!cancelled) setError(error instanceof Error ? error.message : "Could not load saved keys")
    }).finally(() => {
      if (!cancelled) setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setKey = useCallback(async (service: KeyService, value: string | null) => {
    await updateKey(service, value)
    const fresh = await loadKeys()
    setKeys(fresh)
    setError(null)
  }, [])

  const saveAll = useCallback(async (next: StoredKeys) => {
    await saveKeys(next)
    setKeys(next)
    setError(null)
  }, [])

  const clear = useCallback(async () => {
    clearVault()
    setKeys({})
    setError(null)
  }, [])

  return { keys, loaded, error, setKey, saveAll, clear }
}
