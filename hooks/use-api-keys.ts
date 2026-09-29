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

  useEffect(() => {
    let cancelled = false
    loadKeys().then((loaded) => {
      if (!cancelled) {
        setKeys(loaded)
        setLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setKey = useCallback(async (service: KeyService, value: string | null) => {
    await updateKey(service, value)
    const fresh = await loadKeys()
    setKeys(fresh)
  }, [])

  const saveAll = useCallback(async (next: StoredKeys) => {
    await saveKeys(next)
    setKeys(next)
  }, [])

  const clear = useCallback(async () => {
    clearVault()
    setKeys({})
  }, [])

  return { keys, loaded, setKey, saveAll, clear }
}
