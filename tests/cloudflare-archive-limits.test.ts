import { beforeAll, expect, mock, test } from "bun:test"
import { libraryAssetSchema } from "../lib/library-schema"

// Execute the actual coordinator; only replace the Workers base class and IO.
mock.module("cloudflare:workers", () => ({ DurableObject: class {
  ctx: unknown; env: unknown
  constructor(ctx: unknown, env: unknown) { this.ctx = ctx; this.env = env }
} }))
let ArchiveCoordinator: typeof import("../cloudflare/archive").ArchiveCoordinator
beforeAll(async () => { ({ ArchiveCoordinator } = await import("../cloudflare/archive")) })
type Stored = { state: string; size: number; item?: object }
const item = (id: string) => libraryAssetSchema.parse({ id, type: "script", title: "Capacity test", script: "Test", parameters: {}, createdAt: 1, extension: "txt" })
function fixture(deleted: number) {
  const records = new Map<string, Stored>(Array.from({ length: deleted }, (_, n) => [`item:deleted-${n}`, { state: "deleted", size: 0 }]))
  let writes = 0, removals = 0
  const storage = { async list() { return new Map(records) }, async put(key: string, value: Stored) { records.set(key, value) } }
  const bucket = { async put() { writes++ }, async delete() { removals++ } }
  const archive = new ArchiveCoordinator({ storage } as never, { ARCHIVE_BUCKET: bucket } as never)
  const remove = (id: string) => archive.fetch(new Request(`https://internal/api/library/content/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" } }))
  const save = (id: string) => {
    const form = new FormData(); form.set("metadata", JSON.stringify(item(id))); form.set("media", new Blob(["Test"]), "script.txt")
    return archive.fetch(new Request("https://internal/api/library/content", { method: "POST", body: form }))
  }
  return { records, remove, save, effects: () => ({ writes, removals }) }
}
test("last admitted asset reserves capacity for deletion and cannot reopen lifetime quota", async () => {
  const f = fixture(2047)
  expect((await f.save("last")).status).toBe(201)
  expect((await f.save("last")).status).toBe(201)
  expect((await f.save("overflow")).status).toBe(507)
  expect((await f.remove("unknown")).status).toBe(507)
  expect((await f.remove("last")).status).toBe(204)
  expect((await f.remove("last")).status).toBe(204)
  expect((await f.save("last")).status).toBe(410)
  expect((await f.save("new-after-delete")).status).toBe(507)
  expect(f.records.size).toBe(2048)
  expect(f.effects().writes).toBe(1)
})
test("pending uploads can finish or be deleted at reserved capacity", async () => {
  const f = fixture(2047)
  f.records.set("item:pending", { state: "pending", size: 4, item: item("pending") })
  expect((await f.save("pending")).status).toBe(201)
  expect((await f.remove("pending")).status).toBe(204)
  expect(f.records.size).toBe(2048)
})
test("preexisting oversized archives cannot add tombstones through ready or pending assets", async () => {
  for (const state of ["ready", "pending"]) {
    const f = fixture(2048)
    f.records.set("item:old", { state, size: 4, item: item("old") })
    expect((await f.remove("old")).status).toBe(507)
    expect(f.records.get("item:old")?.state).toBe(state)
    expect(f.effects().removals).toBe(0)
    expect((await f.save("new")).status).toBe(507)
    expect((await f.remove("deleted-0")).status).toBe(204)
  }
})
