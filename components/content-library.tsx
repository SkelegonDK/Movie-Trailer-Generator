"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, AudioLines, Clapperboard, Download, FileText, ImageIcon, Loader2, Plus, Search, Trash2, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { formatDuration } from "@/lib/audio-utils"
import { deleteLibraryItem, getLibrarySnapshot, importBrowserContent, importSessionAudio, LIBRARY_CHANGED_EVENT, type ContentType, type LibraryItem } from "@/lib/content-library"
import { PARAMETER_MODES } from "@/lib/parameter-modes"
import { cn } from "@/lib/utils"

const contentTypes = {
  script: { label: "Scripts", singular: "Script", icon: FileText },
  audio: { label: "Audio", singular: "Audio", icon: AudioLines },
  poster: { label: "Posters", singular: "Poster", icon: ImageIcon },
  video: { label: "Videos", singular: "Video", icon: Video },
}
const dateFormatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" })
const parameterLabels = { genre: "Genre", setting: "Setting", character: "Main character", conflict: "Conflict", plotTwist: "Plot twist" } as const

function useMediaUrl(media?: Blob, savedUrl?: string) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!media) { setUrl(undefined); return }
    const next = URL.createObjectURL(media)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [media])
  return savedUrl ?? url
}

function LibraryDownload({ item, compact = false }: { item: LibraryItem; compact?: boolean }) {
  const [scriptFile] = useState(() => item.type === "script" ? new Blob([item.script], { type: "text/plain;charset=utf-8" }) : undefined)
  const fallbackUrl = useMediaUrl(item.type === "script" ? scriptFile : item.media, item.mediaUrl)
  const url = item.downloadUrl ?? fallbackUrl
  const title = item.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "untitled-trailer"
  if (!url) return <Button variant="ghost" disabled aria-label="Saved file unavailable"><Download /></Button>
  return (
    <Button asChild variant={compact ? "ghost" : "outline"} size={compact ? "icon" : "default"}>
      <a href={url} download={`${title}_${item.type}.${item.extension}`} aria-label={`Download ${item.title} ${item.type}`}>
        <Download />{!compact && `Download ${contentTypes[item.type].singular.toLowerCase()}`}
      </a>
    </Button>
  )
}

function LibraryCard({ item, onReview, onDelete }: {
  item: LibraryItem
  onReview: (item: LibraryItem, button: HTMLButtonElement) => void
  onDelete: (item: LibraryItem, button: HTMLButtonElement) => void
}) {
  const url = useMediaUrl(item.media, item.mediaUrl)
  const Icon = contentTypes[item.type].icon
  return (
    <article className="group min-w-0 overflow-hidden rounded-lg border bg-card transition-colors hover:border-white/30">
      <button onClick={(event) => onReview(item, event.currentTarget)} aria-label={`Review ${item.title} ${contentTypes[item.type].singular.toLowerCase()}`} className="library-frame relative flex aspect-[16/10] w-full cursor-pointer items-center justify-center overflow-hidden border-b bg-[#101010] px-6 text-left">
        {item.type === "poster" && url ? (
          // Local library files are served directly from the app server.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`${item.title} poster`} className="h-full w-full object-contain" loading="lazy" />
        ) : item.type === "video" && url ? (
          <><video src={url} muted playsInline preload="metadata" className="h-full w-full object-contain" /><span className="absolute flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-black/70"><Video className="h-5 w-5" /></span></>
        ) : item.type === "script" ? (
          <div className="w-full max-w-[260px] py-7">
            <p className="studio-eyebrow mb-4 text-muted-foreground">Trailer script</p>
            <p className="line-clamp-5 whitespace-pre-line font-mono text-xs leading-relaxed text-foreground/80">{item.script}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <AudioLines className="h-16 w-16 stroke-[1] text-foreground/65" />
            <span className="studio-eyebrow text-muted-foreground">Narration & music</span>
          </div>
        )}
        {item.duration !== undefined && <span className="absolute bottom-3 right-4 rounded bg-black/80 px-2 py-1 font-mono text-[10px]">{formatDuration(item.duration)}</span>}
      </button>
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="studio-eyebrow flex items-center gap-2 text-muted-foreground"><Icon className="h-3 w-3" />{contentTypes[item.type].singular}</span>
          <span className="truncate text-xs text-muted-foreground">{item.parameters.genre || "Original production"}</span>
        </div>
        <h2 className="truncate text-base font-medium tracking-tight" title={item.title}>{item.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{dateFormatter.format(item.createdAt)}</p>
        <div className="mt-4 flex items-center justify-between border-t pt-2">
          <Button variant="ghost" className="-ml-3" onClick={(event) => onReview(item, event.currentTarget)}>Review <ArrowRight /></Button>
          <div className="flex">
            <LibraryDownload item={item} compact />
            <Button variant="ghost" size="icon" aria-label={`Delete ${item.title} ${item.type}`} onClick={(event) => onDelete(item, event.currentTarget)}><Trash2 /></Button>
          </div>
        </div>
      </div>
    </article>
  )
}

function ContentReview({ item }: { item: LibraryItem }) {
  const url = useMediaUrl(item.media, item.mediaUrl)
  const [mediaError, setMediaError] = useState(false)
  return (
    <>
      <DialogHeader className="pr-9 text-left">
        <p className="studio-eyebrow mb-2 text-muted-foreground">{contentTypes[item.type].singular} / {dateFormatter.format(item.createdAt)}</p>
        <DialogTitle className="headline text-2xl leading-tight [overflow-wrap:anywhere]">{item.title}</DialogTitle>
        <DialogDescription>{[item.parameters.genre, item.mode ? PARAMETER_MODES[item.mode].label : undefined].filter(Boolean).join(" · ") || "Original production"}</DialogDescription>
      </DialogHeader>
      {url && item.type === "poster" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`${item.title} poster`} onError={() => setMediaError(true)} className="max-h-[55dvh] w-full rounded-md bg-black object-contain" />
      )}
      {url && item.type === "audio" && <audio src={url} controls aria-label={`${item.title} audio`} onError={() => setMediaError(true)} className="w-full" />}
      {url && item.type === "video" && <video src={url} controls playsInline preload="metadata" aria-label={`${item.title} trailer`} onError={() => setMediaError(true)} className="max-h-[55dvh] w-full rounded-md bg-black" />}
      {mediaError && <p role="alert" className="text-sm text-muted-foreground">This browser could not preview the file. Download it to review it in another player.</p>}
      <div className="flex justify-end"><LibraryDownload item={item} /></div>
      {item.script && <section className="space-y-3 border-t pt-5"><h3 className="studio-eyebrow text-muted-foreground">{item.type === "script" ? "Trailer script" : "Source script"}</h3><pre className="whitespace-pre-wrap break-words rounded-md bg-white/[0.03] p-4 font-mono text-sm leading-relaxed">{item.script}</pre></section>}
      <dl className="grid gap-4 border-t pt-5 sm:grid-cols-2">
        {Object.entries(parameterLabels).map(([key, label]) => {
          const value = item.parameters[key as keyof typeof parameterLabels]
          return value ? <div key={key}><dt className="studio-eyebrow text-muted-foreground">{label}</dt><dd className="mt-1 text-sm [overflow-wrap:anywhere]">{value}</dd></div> : null
        })}
      </dl>
    </>
  )
}

export function ContentLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [archiveAvailable, setArchiveAvailable] = useState(true)
  const [browserStorageAvailable, setBrowserStorageAvailable] = useState(true)
  const [browserOnlyCount, setBrowserOnlyCount] = useState(0)
  const [reload, setReload] = useState(0)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ContentType | "all">("all")
  const [sort, setSort] = useState("newest")
  const [selected, setSelected] = useState<LibraryItem | null>(null)
  const [toDelete, setToDelete] = useState<LibraryItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const reviewButton = useRef<HTMLButtonElement | null>(null)
  const deleteButton = useRef<HTMLButtonElement | null>(null)
  const searchInput = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    let alive = true
    let revision = 0
    const refresh = async () => {
      const current = ++revision
      try {
        const saved = await getLibrarySnapshot()
        if (alive && current === revision) {
          setItems(saved.items); setArchiveAvailable(saved.archiveAvailable)
          setBrowserStorageAvailable(saved.browserStorageAvailable)
          setBrowserOnlyCount(saved.browserOnlyCount); setError(false)
        }
      } catch {
        if (alive && current === revision) setError(true)
      } finally {
        if (alive && current === revision) setLoading(false)
      }
    }
    const initialize = async () => {
      try { await importSessionAudio() } catch { /* refresh reports storage errors */ }
      try { await importBrowserContent() } catch { /* refresh reports archive availability */ }
      if (alive) void refresh()
    }
    void initialize()
    window.addEventListener(LIBRARY_CHANGED_EVENT, refresh)
    window.addEventListener("focus", refresh)
    return () => {
      alive = false
      window.removeEventListener(LIBRARY_CHANGED_EVENT, refresh)
      window.removeEventListener("focus", refresh)
    }
  }, [reload])

  const search = query.trim().toLowerCase()
  const filtered = items.filter((item) => (filter === "all" || item.type === filter) && [item.title, item.script, ...Object.values(item.parameters)].join(" ").toLowerCase().includes(search))
    .sort((a, b) => sort === "oldest" ? a.createdAt - b.createdAt : sort === "title" ? a.title.localeCompare(b.title) : b.createdAt - a.createdAt)
  const remove = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteLibraryItem(toDelete.id, toDelete.type)
      setItems((current) => current.filter((item) => item.id !== toDelete.id))
      setToDelete(null)
      toast({ title: "Removed from Library" })
    } catch {
      toast({ title: "Couldn't delete this item", description: "Library storage is unavailable. Try again when the server and browser storage are available.", variant: "destructive" })
    } finally { setDeleting(false) }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 p-4 sm:p-7 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b pb-7">
        <div>
          <p className="studio-eyebrow mb-3 text-muted-foreground">The trailer studio / Library</p>
          <h1 className="headline text-3xl sm:text-4xl">Your screening room.</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Scripts, sound, artwork, and the final cut. Keep your productions close.</p>
        </div>
        <Button asChild><Link href="/"><Plus />Create a trailer</Link></Button>
      </header>

      <section aria-label="Library filters" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1" aria-label="Content type">
            {(["all", "script", "audio", "poster", "video"] as const).map((type) => (
              <Button key={type} variant="ghost" aria-pressed={filter === type} onClick={() => setFilter(type)} className={cn("gap-2 px-3", filter === type && "bg-white/10 text-foreground", filter !== type && "text-muted-foreground")}>
                {type === "all" ? "All content" : contentTypes[type].label}
                <span className="font-mono text-[10px] text-muted-foreground">{type === "all" ? items.length : items.filter((item) => item.type === type).length}</span>
              </Button>
            ))}
          </div>
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input ref={searchInput} type="search" aria-label="Search library" placeholder="Search titles, scripts, or genres…" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-10" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" aria-live="polite" className="studio-eyebrow text-muted-foreground">{loading ? "Opening the archive…" : `${filtered.length} ${filtered.length === 1 ? "item" : "items"}${search || filter !== "all" ? ` of ${items.length}` : ""}`}</p>
          <select aria-label="Sort library" value={sort} onChange={(event) => setSort(event.target.value)} className="min-h-11 rounded-md border bg-card px-3 text-xs text-muted-foreground">
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option>
          </select>
        </div>
      </section>

      {!loading && !error && !archiveAvailable && <p role="alert" className="rounded-lg border p-4 text-sm text-muted-foreground">The server archive is unavailable. Showing browser copies only; reconnect to the server to see your saved files.</p>}
      {!loading && !error && archiveAvailable && browserOnlyCount > 0 && <p role="alert" className="rounded-lg border p-4 text-sm text-muted-foreground">{browserOnlyCount} {browserOnlyCount === 1 ? "file is" : "files are"} only in this browser and could not be backed up. Download a copy before clearing browser data. Reopen Library to retry the backup.</p>}
      {!loading && !error && !browserStorageAvailable && <p role="alert" className="rounded-lg border p-4 text-sm text-muted-foreground">Browser storage is unavailable. Files saved on the server are still available.</p>}

      {loading ? <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading your library…</div>
        : error ? <div role="alert" className="studio-panel space-y-4 rounded-lg border p-8"><h2 className="text-lg">Your library couldn't be opened.</h2><p className="text-sm text-muted-foreground">Check the server connection and allow browser storage, then try again.</p><Button variant="outline" onClick={() => { setLoading(true); setReload((value) => value + 1) }}>Try again</Button></div>
        : items.length === 0 ? <div className="studio-panel flex min-h-[380px] flex-col items-center justify-center rounded-lg border px-6 py-12 text-center">
          <Clapperboard className="mb-6 h-14 w-14 stroke-[1] text-muted-foreground" />
          <p className="studio-eyebrow mb-3 text-muted-foreground">The archive starts with an idea</p>
          <h2 className="headline text-2xl">Your first production belongs here.</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">Generate a script, audio, poster, or video in the studio. Each new creation is saved here automatically.</p>
          <Button asChild className="mt-6"><Link href="/">Create your first trailer <ArrowRight /></Link></Button>
          <div className="mt-9 flex flex-wrap justify-center gap-5 border-t pt-6 text-xs text-muted-foreground">{Object.entries(contentTypes).map(([type, { singular, icon: Icon }]) => <span key={type} className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{singular}</span>)}</div>
        </div>
        : filtered.length === 0 ? <div className="studio-panel space-y-3 rounded-lg border px-6 py-16 text-center"><Search className="mx-auto mb-5 h-8 w-8 text-muted-foreground" /><h2 className="headline text-2xl">No matching content.</h2><p className="text-sm text-muted-foreground">Try another search or content type.</p><Button variant="outline" onClick={() => { setQuery(""); setFilter("all") }}>Clear filters</Button></div>
        : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{filtered.map((item) => <LibraryCard key={item.id} item={item} onReview={(next, button) => { reviewButton.current = button; setSelected(next) }} onDelete={(next, button) => { deleteButton.current = button; setToDelete(next) }} />)}</div>}

      <footer className="flex items-center gap-2 border-t pt-4 text-xs leading-relaxed text-muted-foreground"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />Archived files are saved on this server and available across browsers, even after clearing browser data.</footer>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-3xl" onCloseAutoFocus={(event) => { event.preventDefault(); reviewButton.current?.focus() }}>
          {selected && <ContentReview key={selected.id} item={selected} />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!toDelete} onOpenChange={(open) => { if (!open && !deleting) setToDelete(null) }}>
        <AlertDialogContent className="w-[calc(100vw-2rem)]" onCloseAutoFocus={(event) => { event.preventDefault(); if (deleteButton.current?.isConnected) deleteButton.current.focus(); else searchInput.current?.focus() }}>
          <AlertDialogHeader><AlertDialogTitle>Remove from Library?</AlertDialogTitle><AlertDialogDescription className="[overflow-wrap:anywhere]">“{toDelete?.title}” will be removed from the server archive and this browser. Download a copy first if you want to keep it.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><Button variant="destructive" loading={deleting} onClick={remove}>Delete {toDelete?.type}</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
