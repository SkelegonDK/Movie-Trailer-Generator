import type { Metadata } from "next"
import { ContentLibrary } from "@/components/content-library"

export const metadata: Metadata = {
  title: "Library | Manuelito Trailer Studio",
  description: "Review your generated scripts, audio, posters, and trailer videos.",
}

export default function LibraryPage() {
  return <ContentLibrary />
}
