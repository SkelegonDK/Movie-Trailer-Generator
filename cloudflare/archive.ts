import { DurableObject } from "cloudflare:workers"
import type { DurableObjectState } from "@cloudflare/workers-types"
import { audioAssetIdSchema } from "../lib/audio-library-schema"
import { libraryAssetSchema, type LibraryAsset } from "../lib/library-schema"
import { error } from "./access"
import type { CloudflareEnv } from "./types"

export const UPLOAD_BYTES = 10 * 1024 * 1024
export const ARCHIVE_BYTES = 256 * 1024 * 1024
export const ARCHIVE_ITEMS = 128
const MAX_TOMBSTONES = 2048
const MIME = { txt: "text/plain;charset=utf-8", wav: "audio/wav", mp4: "video/mp4", webm: "video/webm", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif" }
type Record = { item?: LibraryAsset; size: number; state: "pending" | "ready" | "deleted" }
const key = (id: string) => `assets/${id}`

function validMedia(item: LibraryAsset, bytes: Uint8Array) {
  const text = (a: number, b: number) => new TextDecoder().decode(bytes.subarray(a, b))
  const starts = (...values: number[]) => values.every((value, i) => bytes[i] === value)
  switch (item.extension) {
    case "txt": return bytes.length > 0 && text(0, bytes.length) === item.script
    case "wav": return bytes.length >= 44 && text(0, 4) === "RIFF" && text(8, 12) === "WAVE"
    case "mp4": return bytes.length >= 12 && text(4, 8) === "ftyp"
    case "webm": return starts(0x1a, 0x45, 0xdf, 0xa3)
    case "png": return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
    case "jpg": case "jpeg": return starts(0xff, 0xd8, 0xff)
    case "webp": return text(0, 4) === "RIFF" && text(8, 12) === "WEBP"
    case "gif": return ["GIF87a", "GIF89a"].includes(text(0, 6))
    case "avif": return text(4, 8) === "ftyp" && /avif|avis/.test(text(8, 32))
  }
}

// One object per deployment serializes archive mutations and generation admission.
// Metadata reserves quota BEFORE R2 writes, so interruption cannot create unaccounted objects.
export class ArchiveCoordinator extends DurableObject<CloudflareEnv> {
  private busy = false
  constructor(ctx: DurableObjectState, env: CloudflareEnv) { super(ctx as never, env) }
  async fetch(request: Request): Promise<Response> {
    // Reject overlap rather than buffering multiple multipart uploads in this isolate.
    if (this.busy) return error("Archive is busy; retry shortly", 429)
    this.busy = true
    try { return await this.handle(request) }
    catch { return error("The archive is unavailable", 503) }
    finally { this.busy = false }
  }
  private async handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith("/auth/")) return this.auth(url.pathname.slice(6))
    if (url.pathname.startsWith("/generation/")) return this.generation(request, url.pathname.slice(12))
    const match = /^\/api\/library\/(content|audio)(?:\/([^/]+))?\/?$/.exec(url.pathname)
    if (!match) return error("Archive route not found", 404)
    const audio = match[1] === "audio", id = match[2]
    if (id && !audioAssetIdSchema.safeParse(id).success) return error("Invalid asset ID")
    const records = await this.ctx.storage.list<Record>({ prefix: "item:" })
    if (!id && request.method === "GET") {
      const items = [...records.values()].filter(r => r.state === "ready" && r.item && (!audio || r.item.type === "audio")).map(r => r.item!).sort((a, b) => b.createdAt - a.createdAt)
      const deletedIds = [...records].filter(([,r]) => r.state === "deleted").map(([k]) => k.slice(5))
      return Response.json({ items, deletedIds }, { headers: { "Cache-Control": "private, no-store" } })
    }
    if (!id && request.method === "POST") return this.save(request, audio, records)
    if (!id) return error("Method not allowed", 405)
    const record = records.get(`item:${id}`)
    if (request.method === "DELETE") {
      if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return error("Content-Type must be application/json", 415)
      if (audio && record?.item && record.item.type !== "audio") return error("Asset not found", 404)
      if (!record && [...records.values()].filter(r => r.state === "deleted").length >= MAX_TOMBSTONES) return error("Archive tombstone limit reached", 507)
      // Tombstone is committed first: failed deletion never makes a file visible again.
      await this.ctx.storage.put(`item:${id}`, { ...record, size: record?.size || 0, state: "deleted" })
      await this.env.ARCHIVE_BUCKET.delete(key(id))
      await this.ctx.storage.put(`item:${id}`, { size: 0, state: "deleted" })
      return new Response(null, { status: 204 })
    }
    if (!["GET", "HEAD"].includes(request.method)) return error("Method not allowed", 405)
    if (!record || record.state !== "ready" || !record.item || (audio && record.item.type !== "audio")) return error("Asset not found", 404)
    return this.serve(request, record.item, record.size)
  }
  private async save(request: Request, audio: boolean, records: Map<string, Record>) {
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) return error("A multipart upload is required", 415)
    const limit = UPLOAD_BYTES + 64 * 1024
    const length = request.headers.get("content-length")
    if (length && (!/^\d+$/.test(length) || Number(length) > limit)) return error("Cloud uploads must be at most 10 MB", 413)
    const reader = request.body?.getReader()
    if (!reader) return error("A file is required")
    const chunks: Uint8Array[] = []; let size = 0
    try {
      while (true) {
        const result = await reader.read(); if (result.done) break
        size += result.value.length
        if (size > limit) { await reader.cancel(); return error("Cloud uploads must be at most 10 MB", 413) }
        chunks.push(result.value)
      }
    } finally { reader.releaseLock() }
    let form: FormData
    try { form = await new Response(new Blob(chunks as BlobPart[]), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData() }
    catch { return error("Invalid multipart upload") }
    let item: LibraryAsset
    try { item = libraryAssetSchema.parse(JSON.parse(String(form.get("metadata")))) } catch { return error("Valid metadata is required") }
    if (audio && item.type !== "audio") return error("Audio metadata is required")
    if (new TextEncoder().encode(JSON.stringify(item)).length > 32 * 1024) return error("Cloud metadata must be at most 32 KB", 413)
    const file = form.get(audio ? "audio" : "media")
    if (!(file instanceof Blob)) return error("A file is required")
    if (file.size > UPLOAD_BYTES) return error("Cloud uploads must be at most 10 MB", 413)
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!validMedia(item, bytes)) return error("The file does not match its declared format")
    const existing = records.get(`item:${item.id}`)
    if (existing?.state === "deleted") return error("This asset was deleted", 410)
    if (existing?.state === "ready") return Response.json(existing.item, { status: 201 })
    if (existing && JSON.stringify(existing.item) !== JSON.stringify(item)) return error("Asset ID is already reserved", 409)
    const usedBytes = [...records.values()].reduce((total, r) => total + r.size, 0)
    const active = [...records.values()].filter(r => r.state !== "deleted").length
    if ((!existing && active >= ARCHIVE_ITEMS) || usedBytes - (existing?.size || 0) + bytes.length > ARCHIVE_BYTES) return error("Cloud archive quota reached; delete assets first", 507)
    await this.ctx.storage.put(`item:${item.id}`, { item, size: bytes.length, state: "pending" })
    await this.env.ARCHIVE_BUCKET.put(key(item.id), bytes, { httpMetadata: { contentType: MIME[item.extension] } })
    await this.ctx.storage.put(`item:${item.id}`, { item, size: bytes.length, state: "ready" })
    return Response.json(item, { status: 201, headers: { "Cache-Control": "private, no-store" } })
  }
  private async serve(request: Request, item: LibraryAsset, size: number) {
    const headers = new Headers({ "Content-Type": MIME[item.extension], "Cache-Control": "private, no-store", "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff" })
    if (new URL(request.url).searchParams.get("download") === "1") headers.set("Content-Disposition", `attachment; filename="${item.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 120) || "trailer"}_${item.type}.${item.extension}"`)
    let start = 0, end = size - 1
    const range = request.headers.get("range")
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range)
      if (match && (match[1] || match[2])) {
        if (!match[1]) start = Math.max(0, size - Number(match[2]))
        else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])) }
      } else start = size
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size || (match?.[1] === "" && Number(match[2]) === 0)) {
        headers.set("Content-Range", `bytes */${size}`); return new Response(null, { status: 416, headers })
      }
      headers.set("Content-Range", `bytes ${start}-${end}/${size}`)
    }
    const length = Math.max(0, end - start + 1)
    headers.set("Content-Length", String(length))
    if (request.method === "HEAD") {
      const object = await this.env.ARCHIVE_BUCKET.head(key(item.id))
      if (!object) return error("Asset not found", 404)
      if (object.size !== size) return error("Archive media does not match its metadata", 503)
      return new Response(null, { status: range ? 206 : 200, headers })
    }
    const object = await this.env.ARCHIVE_BUCKET.get(key(item.id), range ? { range: { offset: start, length } } : undefined)
    if (!object) return error("Asset not found", 404)
    if (object.size !== size) return error("Archive media does not match its metadata", 503)
    return new Response(object.body as unknown as ReadableStream, { status: range ? 206 : 200, headers })
  }
  private async auth(hash: string) {
    if (!/^[a-f0-9]{64}$/.test(hash)) return error("Invalid authentication request")
    const minute = Math.floor(Date.now() / 60_000)
    const entries = await this.ctx.storage.list<{ minute: number; count: number }>({ prefix: "auth:" })
    for (const [k, value] of entries) if (value.minute < minute) { await this.ctx.storage.delete(k); entries.delete(k) }
    const previous = entries.get(`auth:${hash}`)
    if ((!previous && entries.size >= 512) || (previous?.count || 0) >= 20) return error("Too many sign-in attempts; retry later", 429)
    await this.ctx.storage.put(`auth:${hash}`, { minute, count: (previous?.count || 0) + 1 })
    return new Response(null, { status: 204 })
  }
  private async generation(request: Request, token: string) {
    if (!/^[a-f0-9-]{36}$/.test(token)) return error("Invalid admission token")
    if (request.method === "DELETE") { await this.ctx.storage.delete(`generation:${token}`); return new Response(null, { status: 204 }) }
    const now = Date.now(), day = new Date(now).toISOString().slice(0, 10)
    const leases = await this.ctx.storage.list<number>({ prefix: "generation:" })
    for (const [k, expires] of leases) if (expires <= now) { await this.ctx.storage.delete(k); leases.delete(k) }
    const budget = await this.ctx.storage.get<{ day: string; count: number }>("budget")
    const count = budget?.day === day ? budget.count : 0
    if (leases.size >= 2 || count >= 100) return error("Hosted generation limit reached; retry later", 429)
    await this.ctx.storage.put({ [`generation:${token}`]: now + 180_000, budget: { day, count: count + 1 } })
    return new Response(null, { status: 204 })
  }
}
