import { generationBudget } from "@/lib/server/generation-budget"
import { requestError } from "./request"

/** Keep the concurrency slot until the response body is consumed by the handler. */
export async function withGenerationBudget(run: (signal: AbortSignal) => Promise<Response>) {
  const release = generationBudget.acquire()
  if (!release) {
    const response = requestError("Studio generation limit reached; try again later", 429)
    response.headers.set("Retry-After", "60")
    return response
  }
  try { return await run(AbortSignal.timeout(90_000)) }
  catch { return requestError("The provider request failed; try again later", 502) }
  finally { release() }
}
