"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, RefreshCw, Trash2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useApiKeys } from "@/hooks/use-api-keys"
import type { KeyService } from "@/lib/vault"

interface KeyStatus {
  present: boolean
  valid: boolean | null
  detail: string
}

interface EnvStatusResponse {
  openrouter: KeyStatus
  elevenlabs: KeyStatus
}

interface KeyMeta {
  id: KeyService
  label: string
  description: string
  placeholder: string
  required: boolean
}

const KEYS: KeyMeta[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    description: "Generates titles, scripts, poster specs, and poster images.",
    placeholder: "sk-or-v1-…",
    required: true,
  },
  {
    id: "elevenlabs",
    label: "ElevenLabs",
    description: "Synthesizes trailer voiceovers.",
    placeholder: "sk_…",
    required: true,
  },
]

export default function SettingsPage() {
  const { keys, loaded, setKey, clear } = useApiKeys()
  const { toast } = useToast()
  const [draft, setDraft] = useState<Record<KeyService, string>>({
    openrouter: "",
    elevenlabs: "",
  })
  const [visible, setVisible] = useState<Record<KeyService, boolean>>({
    openrouter: false,
    elevenlabs: false,
  })
  const [saving, setSaving] = useState(false)
  const [envStatus, setEnvStatus] = useState<EnvStatusResponse | null>(null)
  const [checkingEnv, setCheckingEnv] = useState(false)

  const checkEnv = useCallback(async () => {
    setCheckingEnv(true)
    try {
      const res = await fetch("/api/keys-status")
      setEnvStatus((await res.json()) as EnvStatusResponse)
    } catch {
      setEnvStatus(null)
    } finally {
      setCheckingEnv(false)
    }
  }, [])

  useEffect(() => {
    checkEnv()
  }, [checkEnv])

  useEffect(() => {
    if (!loaded) return
    setDraft({
      openrouter: keys.openrouter ?? "",
      elevenlabs: keys.elevenlabs ?? "",
    })
  }, [loaded, keys])

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const { id } of KEYS) {
        const value = draft[id].trim()
        if (value) await setKey(id, value)
      }
      toast({
        title: "Keys encrypted and saved",
        description: "They stay on this device and decrypt only in this browser.",
      })
    } catch (error) {
      toast({
        title: "Could not save keys",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    await clear()
    setDraft({ openrouter: "", elevenlabs: "" })
    toast({ title: "Vault cleared", description: "All stored API keys were removed." })
  }

  return (
    <div className="container mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="headline text-5xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Your API keys are encrypted with AES-GCM and stored locally. The decryption key is a
          non-extractable <code>CryptoKey</code> held in IndexedDB — keys never leave this browser.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Environment Keys
          </CardTitle>
          <CardDescription>
            The server reads OPENROUTER_API and ELEVENLABS_API from .env.local. Keys stay
            server-side and are used automatically when the vault is empty.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {envStatus
            ? (["openrouter", "elevenlabs"] as const).map((service) => {
                const status = envStatus[service]
                return (
                  <div key={service} className="flex items-center gap-3">
                    {status.valid === true ? (
                      <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" aria-hidden />
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium capitalize">
                        {service}: {status.valid === true ? "valid" : status.present ? "invalid" : "missing"}
                      </span>
                      <span className="text-xs text-muted-foreground">{status.detail}</span>
                    </div>
                  </div>
                )
              })
            : (
              <span className="text-sm text-muted-foreground">Checking environment keys…</span>
            )}
          <Button variant="outline" size="sm" onClick={checkEnv} disabled={checkingEnv} className="self-start">
            <RefreshCw className={`mr-2 h-4 w-4 ${checkingEnv ? "animate-spin" : ""}`} />
            {checkingEnv ? "Checking…" : "Re-check"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> API Keys
          </CardTitle>
          <CardDescription>
            Enter the keys for the services you want to use. Blank fields are ignored.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {KEYS.map((k) => (
            <div key={k.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={k.id} className="text-sm uppercase tracking-wide">
                  {k.label}
                  {k.required ? <span className="ml-1 text-primary">*</span> : null}
                </Label>
                <span className="text-xs text-muted-foreground">{k.description}</span>
              </div>
              <div className="relative">
                <Input
                  id={k.id}
                  type={visible[k.id] ? "text" : "password"}
                  value={draft[k.id]}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, [k.id]: event.target.value }))
                  }
                  placeholder={k.placeholder}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setVisible((prev) => ({ ...prev, [k.id]: !prev[k.id] }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  aria-label={visible[k.id] ? "Hide key" : "Show key"}
                >
                  {visible[k.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              onClick={handleClear}
              disabled={!loaded || saving}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Clear vault
            </Button>
            <Button onClick={handleSave} disabled={!loaded || saving}>
              <Lock className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Encrypt & Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
