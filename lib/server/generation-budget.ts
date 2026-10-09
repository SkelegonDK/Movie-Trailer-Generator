/** Process-local guard, shared across all provider routes. Not a distributed billing cap. */
export function createGenerationBudget(maxRequests = 30, windowMs = 15 * 60 * 1000, maxConcurrent = 2) {
  let windowStart = 0, requests = 0, active = 0
  return {
    acquire(now = Date.now()) {
      if (now - windowStart >= windowMs) { windowStart = now; requests = 0 }
      if (requests >= maxRequests || active >= maxConcurrent) return null
      requests++; active++
      let released = false
      return () => { if (!released) { released = true; active-- } }
    },
  }
}
// Route bundles can load separate copies of this module in one Node process.
const runtime = globalThis as typeof globalThis & { trailerGenerationBudget?: ReturnType<typeof createGenerationBudget> }
export const generationBudget = runtime.trailerGenerationBudget ??= createGenerationBudget()
