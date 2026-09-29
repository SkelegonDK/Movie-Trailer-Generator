import { NextResponse } from "next/server"

const TTS_VOICE_ID = "FF7KdobWPaiR0vkcALHF"

export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API?.trim()
  if (!key) {
    return NextResponse.json(
      { detail: "ELEVENLABS_API is not set in .env.local" },
      { status: 500 },
    )
  }

  const body = (await req.json().catch(() => null)) as { text?: string } | null

  if (!body?.text?.trim()) {
    return NextResponse.json({ detail: "text is required" }, { status: 400 })
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${TTS_VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: body.text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.6,
        similarity_boost: 0.8,
        style: 0.3,
        use_speaker_boost: true,
        speed: 1.0,
      },
    }),
  })

  if (!res.ok) {
    return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
  }

  return new NextResponse(new Uint8Array(await res.arrayBuffer()), {
    status: 200,
    headers: { "Content-Type": res.headers.get("content-type") ?? "audio/mpeg" },
  })
}
