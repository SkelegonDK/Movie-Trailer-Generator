import { renderTrailerVideo } from "../../lib/video-generator"
import { DEFAULT_CAPTION_STYLE } from "../../lib/caption-style"

const button = document.querySelector<HTMLButtonElement>("button")!
const status = document.querySelector<HTMLElement>("#status")!
button.addEventListener("click", async () => {
  button.disabled = true
  const context = new AudioContext()
  let url: string | undefined
  try {
    await context.resume()
    const [music, script] = await Promise.all([
      fetch("music.mp3").then((res) => res.arrayBuffer()),
      fetch("script.txt").then((res) => res.text()),
    ])
    const decoded = await context.decodeAudioData(music)
    const audio = context.createBuffer(decoded.numberOfChannels, 12 * decoded.sampleRate, decoded.sampleRate)
    for (let channel = 0; channel < audio.numberOfChannels; channel++) {
      audio.copyToChannel(decoded.getChannelData(channel).subarray(0, audio.length), channel)
      const samples = audio.getChannelData(channel)
      for (let i = audio.length - decoded.sampleRate; i < audio.length; i++) samples[i] *= (audio.length - i) / decoded.sampleRate
    }
    const video = await renderTrailerVideo({
      posterUrl: new URL("poster.svg", location.href).href,
      audioBuffer: audio, script, style: DEFAULT_CAPTION_STYLE, audioCtx: context,
      onProgress: (fraction) => { status.textContent = `Rendering ${Math.round(fraction * 100)}%` },
    })
    url = video.url
    const link = document.createElement("a")
    link.href = video.url
    link.download = `the-last-espresso.${video.extension}`
    document.body.append(link)
    link.click()
    link.remove()
    status.textContent = "Download ready. This sample uses captions and original music, with no voiceover or provider calls."
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Rendering failed"
  } finally {
    await context.close()
    // Allow the browser to start the download before releasing its URL.
    if (url) setTimeout(() => URL.revokeObjectURL(url!), 60_000)
    button.disabled = false
  }
})
