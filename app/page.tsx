"use client"

import { ParameterSelection } from "@/components/parameter-selection"
import { ScriptEditor } from "@/components/script-editor"
import { AudioGenerator } from "@/components/audio-generator"
import { PosterGenerator } from "@/components/poster-generator"
import { VideoGenerator } from "@/components/video-generator"

export default function GeneratorPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-8">
        <ParameterSelection />
        <ScriptEditor />
        <AudioGenerator />
        <PosterGenerator />
        <VideoGenerator />
      </div>
    </div>
  )
}
