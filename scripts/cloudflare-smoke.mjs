// Run against the local workerd preview only. No provider calls or cloud writes.
import assert from "node:assert/strict"
const base = process.env.TRAILER_PREVIEW_URL || "http://127.0.0.1:4178"
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw new Error("Smoke tests only support a local preview")
const password = process.env.TRAILER_PREVIEW_PASSWORD
if (!password) throw new Error("Set TRAILER_PREVIEW_PASSWORD to your local .dev.vars password")
const auth = `Basic ${Buffer.from(`studio:${password}`).toString("base64")}`
const request = (pathname, options = {}) => fetch(base + pathname, { ...options, headers: { Authorization: auth, Origin: new URL(base).origin, ...options.headers } })
assert.equal((await fetch(base + "/")).status, 401)
assert.equal((await fetch(base + "/music/sample.wav")).status, 401)
assert.equal((await request("/")).status, 200)
const staticAsset = await request("/placeholder-logo.svg")
assert.equal(staticAsset.status, 200); assert.equal(staticAsset.headers.get("cache-control"), "private, no-store")
assert.equal((await request("/api/library/content", { headers: { Origin: "https://evil.example" } })).status, 403)
const id = `smoke-${crypto.randomUUID()}`, script = "A tiny local test trailer."
const item = { id, type: "script", title: "Cloud smoke", script, parameters: {}, createdAt: Date.now(), extension: "txt" }
const form = () => { const data = new FormData(); data.set("metadata", JSON.stringify(item)); data.set("media", new Blob([script]), "script.txt"); return data }
assert.equal((await request("/api/library/content", { method: "POST", body: form() })).status, 201)
assert.equal((await request("/api/library/content", { method: "POST", body: form() })).status, 201)
assert.equal(await (await request(`/api/library/content/${id}`)).text(), script)
const range = await request(`/api/library/content/${id}`, { headers: { Range: "bytes=2-5" } })
assert.equal(range.status, 206); assert.equal(await range.text(), script.slice(2, 6))
assert.equal((await request(`/api/library/content/${id}`, { headers: { Range: "bytes=500-600" } })).status, 416)
const head = await request(`/api/library/content/${id}`, { method: "HEAD" })
assert.equal(head.status, 200); assert.equal(head.headers.get("content-length"), String(script.length)); assert.equal(await head.text(), "")
assert.equal((await request(`/api/library/audio/${id}`)).status, 404)
const listing = await (await request("/api/library/content")).json()
assert.ok(listing.items.some(value => value.id === id))
assert.equal((await request(`/api/library/content/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" } })).status, 204)
assert.equal((await request(`/api/library/content/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" } })).status, 204)
assert.equal((await request(`/api/library/content/${id}`)).status, 404)
assert.equal((await request("/api/library/content", { method: "POST", body: form() })).status, 410)
assert.ok((await (await request("/api/library/content")).json()).deletedIds.includes(id))
const oversized = await request("/api/library/content", { method: "POST", body: new Uint8Array(10 * 1024 * 1024 + 65 * 1024), headers: { "Content-Type": "multipart/form-data; boundary=test" } })
assert.equal(oversized.status, 413)
console.log("Local Workers smoke passed: auth, cross-origin denial, durable archive, duplicate save, range/HEAD, tombstones, upload limit.")
