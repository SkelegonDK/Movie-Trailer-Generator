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
}

const KEYS: KeyMeta[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    description: "Titles, scripts, and movie posters.",
    placeholder: "sk-or-v1-…",
  },
  {
    id: "elevenlabs",
    label: "ElevenLabs",
    description: "Narration for your trailer.",
    placeholder: "sk_…",
  },
]

export default function SettingsPage() {
  const { keys, loaded, error: vaultError, saveAll, clear } = useApiKeys()
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
      if (!res.ok) throw new Error("Could not check environment keys")
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
      await saveAll({
        ...keys,
        ...(draft.openrouter.trim() ? { openrouter: draft.openrouter.trim() } : {}),
        ...(draft.elevenlabs.trim() ? { elevenlabs: draft.elevenlabs.trim() } : {}),
      })
      toast({
        title: "Keys encrypted and saved",
        description: "Stored encrypted on this device and sent to the relevant provider when you generate content.",
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
    try {
      await clear()
      setDraft({ openrouter: "", elevenlabs: "" })
      toast({ title: "Vault cleared", description: "All stored API keys were removed." })
    } catch (error) {
      toast({ title: "Could not clear keys", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" })
    }
  }

  return (
    <div className="container mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="headline text-3xl sm:text-4xl">Settings</h1>
        <p className="text-muted-foreground leading-relaxed">
          Add your keys to start creating. They’re encrypted and saved in this browser,
          then sent only to the service you use to generate content.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Server keys
          </CardTitle>
          <CardDescription>
            These keys are configured for this app. Each service uses its server key
            unless you save a personal key below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3" aria-busy={checkingEnv}>
          {envStatus
            ? (["openrouter", "elevenlabs"] as const).map((service) => {
                const status = envStatus[service]
                return (
                  <div key={service} className="flex items-start gap-3">
                    {status.valid === true ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
                    )}
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-sm font-medium capitalize">
                        {(service === "openrouter" ? "OpenRouter" : "ElevenLabs")}: {status.valid === true ? "valid" : status.present ? "invalid" : "missing"}
                      </span>
                      <span className="text-sm leading-relaxed break-words text-muted-foreground">{status.detail}</span>
                    </div>
                  </div>
                )
              })
            : (
              <span className="text-sm text-muted-foreground">{checkingEnv ? "Checking environment keys…" : "Could not check environment keys. Try again."}</span>
            )}
          <Button variant="outline" size="sm" onClick={checkEnv} disabled={checkingEnv} className="self-start">
            <RefreshCw className={`h-4 w-4 ${checkingEnv ? "animate-spin" : ""}`} />
            {checkingEnv ? "Checking…" : "Check again"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Your API keys
          </CardTitle>
          <CardDescription>
            Use your own keys to generate with your accounts. Leave a field blank to keep its saved key.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {vaultError && <p role="alert" className="text-sm text-destructive">{vaultError}</p>}
          {KEYS.map((k) => (
            <div key={k.id} className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor={k.id} className="text-sm uppercase tracking-wide">
                  {k.label}
                </Label>
                <p id={`${k.id}-description`} className="text-sm leading-relaxed text-muted-foreground">{k.description}</p>
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
                  className="pr-14"
                  aria-describedby={`${k.id}-description`}
                  disabled={!loaded || saving}
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => setVisible((prev) => ({ ...prev, [k.id]: !prev[k.id] }))}
                  className="absolute right-0 top-0 text-muted-foreground hover:text-foreground"
                  disabled={!loaded || saving}
                  aria-pressed={visible[k.id]}
                  aria-label={`${visible[k.id] ? "Hide" : "Show"} ${k.label} key`}
                >
                  {visible[k.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
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
              <Trash2 className="h-4 w-4" /> Remove saved keys
            </Button>
            <Button onClick={handleSave} aria-busy={saving} disabled={!loaded || saving}>
              <Lock className="h-4 w-4" />
              {saving ? "Saving…" : "Save keys"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
