"use client";

import { useState } from "react";
import Image from "next/image";
import { Maximize2, X } from "lucide-react";
import { Card } from "./card";
import { Skeleton } from "./skeleton";
import { Button } from "./button";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

function posterFileName(title: string): string {
  const safe = (title || "untitled-movie")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${safe || "untitled-movie"}.png`
}

export function MoviePoster() {
  const { posterDataError, posterStatus, posterUrl, setPosterUrl, setPosterDataError, movieTitle } = useStore()
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="p-4">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg">
        {posterStatus === 'loading' ? (
          <Skeleton className="h-full w-full" />
        ) : posterUrl ? (
          <>
            <Image
              src={posterUrl}
              alt="Generated movie poster"
              fill
              className="object-contain"
              onError={() => {
                setPosterDataError("Failed to load the generated image");
                setPosterUrl(null);
                toast({
                  title: "Image loading error",
                  description: "Failed to load the generated poster. Please try generating again.",
                  variant: "destructive",
                });
              }}
            />
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
              aria-label="Click to expand poster"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground text-center px-4">
              {posterDataError || "No poster generated yet"}
            </p>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-col items-center gap-2">
        {posterUrl && posterStatus !== 'loading' && (
          <a
            href={posterUrl}
            download={posterFileName(movieTitle)}
            className="w-full max-w-[200px]"
            aria-label="Download generated poster"
          >
            <Button variant="skeuomorphic-success" className="w-full" type="button">
              Download Poster
            </Button>
          </a>
        )}
      </div>
      {expanded && posterUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setExpanded(false)}
          role="dialog"
          aria-label="Expanded movie poster"
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Close expanded poster"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={posterUrl}
            alt={`${movieTitle || "Movie"} poster, expanded`}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Card>
  );
}