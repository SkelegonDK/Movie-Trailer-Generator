import { describe, expect, test } from "bun:test"
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { parseOptions, safeEnvironment, setup } from "../scripts/cloudflare-setup.mjs"
const args = ["--name", "test-studio", "--account", "a".repeat(32)]
describe("Cloudflare setup", () => {
  test("default plan performs no commands or writes", async () => {
    let commands = 0
    await setup(parseOptions(args), { root: "/does-not-exist", log() {}, command() { commands++; return "" } })
    expect(commands).toBe(0)
  })
  test("rejects ambiguous modes, shell-like names and account guessing", () => {
    for (const input of [[...args, "--deploy", "--dry-run"], ["--name", "test;rm", "--account", "a".repeat(32)], ["--name", "test-studio"], [...args, "--name", "other"], [...args, "--deploy"], [...args, "--origin", "http://test-studio.example.workers.dev"], [...args, "--origin", "https://another.example.workers.dev"], [...args, "--origin", "https://test-studio.example.workers.dev/?secret=x"]]) expect(() => parseOptions(input)).toThrow()
  })
  test("strips provider and public env keys before build", () => {
    const result = safeEnvironment({ OPENROUTER_API_KEY: "secret", ELEVENLABS_API_KEY: "secret", NEXT_PUBLIC_BAD: "secret", VITE_BAD: "secret", TRAILER_ACCESS_PASSWORD: "secret", PATH: "keep" }, "a".repeat(32))
    expect(result.PATH).toBe("keep")
    expect(Object.keys(result).some(k => /API_KEY|PASSWORD|PUBLIC_|VITE_/.test(k))).toBe(false)
  })
  test("existing archive and secret survive a deploy rerun", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cloudflare-setup-"))
    const calls: string[][] = []
    try {
      await mkdir(path.join(root, "public")); await mkdir(path.join(root, "dist/server"), { recursive: true })
      await writeFile(path.join(root, "wrangler.jsonc"), await readFile(new URL("../wrangler.jsonc", import.meta.url)))
      await setup(parseOptions([...args, "--deploy", "--origin", "https://test-studio.example.workers.dev"]), { root, env: {}, log() {}, async command(tool: string, commands: string[]) {
        calls.push([tool, ...commands])
        if (tool === "vite") {
          const config = JSON.parse(await readFile(path.join(root, ".cloudflare/test-studio/wrangler.json"), "utf8"))
          await writeFile(path.join(root, "dist/server/wrangler.json"), JSON.stringify(config))
        }
        if (commands[0] === "secret") return JSON.stringify([{ name: "TRAILER_ACCESS_PASSWORD" }])
        if (commands.join(" ").startsWith("r2 bucket list")) return "Listing buckets...\nname:           test-studio-archive\ncreation_date:  2026-10-09\n"
        return ""
      } })
      expect(calls.some(c => c.includes("create") || c.includes("put"))).toBe(false)
      expect(calls.filter(c => c[1] === "deploy").length).toBe(2) // dry-run then explicit deploy
    } finally { await rm(root, { recursive: true, force: true }) }
  })
})

test("first deployment installs password by stdin only after publishing", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "cloudflare-first-"))
  const privateDirectory = await mkdtemp(path.join(tmpdir(), "cloudflare-password-"))
  const passwordFile = path.join(privateDirectory, "password")
  const password = "random-safe-password-0123456789"
  const calls: { commands: string[]; input?: string }[] = []
  try {
    await writeFile(passwordFile, password, { mode: 0o600 })
    await mkdir(path.join(root, "public")); await mkdir(path.join(root, "dist/server"), { recursive: true })
    await writeFile(path.join(root, "wrangler.jsonc"), await readFile(new URL("../wrangler.jsonc", import.meta.url)))
    await setup(parseOptions([...args, "--deploy", "--origin", "https://test-studio.example.workers.dev", "--password-file", passwordFile]), { root, env: {}, log() {}, async command(tool: string, commands: string[], input?: string) {
      calls.push({ commands, input })
      if (tool === "vite") await writeFile(path.join(root, "dist/server/wrangler.json"), await readFile(path.join(root, ".cloudflare/test-studio/wrangler.json")))
      if (commands[0] === "secret" && commands[1] === "list") throw Object.assign(new Error("missing"), { code: "WORKER_NOT_FOUND" })
      if (commands.join(" ").startsWith("r2 bucket list")) return "Listing buckets...\n"
      return ""
    } })
    expect(calls.at(-1)?.commands.slice(0, 3)).toEqual(["secret", "put", "TRAILER_ACCESS_PASSWORD"])
    expect(calls.at(-1)?.input).toBe(password)
    expect(calls.every(call => !call.commands.join(" ").includes(password))).toBe(true)
    expect(calls.some(call => call.commands.includes("create"))).toBe(true)
  } finally { await rm(root, { recursive: true, force: true }); await rm(privateDirectory, { recursive: true, force: true }) }
})
