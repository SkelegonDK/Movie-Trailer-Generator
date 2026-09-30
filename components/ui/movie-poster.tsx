"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon, Maximize2 } from "lucide-react";
import { Skeleton } from "./skeleton";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
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
    <Dialog open={expanded} onOpenChange={setExpanded}>
      <div>
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg">
        {posterStatus === 'loading' ? (
          <Skeleton className="h-full w-full" />
        ) : posterUrl ? (
          <>
            <Image
              src={posterUrl}
              alt={`${movieTitle || "Your movie"} poster`}
              sizes="(max-width: 640px) calc(100vw - 4rem), 384px"
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
            <DialogTrigger asChild>
              <Button variant="secondary" size="icon" className="absolute right-2 top-2" aria-label="Expand poster">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted px-6">
            <ImageIcon aria-hidden className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm leading-relaxed text-muted-foreground text-center">
              {posterDataError || "Your movie deserves a poster. Generate or paste a script, then bring it to life."}
            </p>
          </div>
        )}
      </div>
      {posterUrl && posterStatus !== 'loading' && (
          <Button asChild variant="skeuomorphic-success" className="mt-4 w-full">
          <a
            href={posterUrl}
            download={posterFileName(movieTitle)}
            aria-label="Download generated poster"
          >
            Download poster
          </a>
          </Button>
        )}
      {posterUrl && (
        <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl border-0 bg-background p-4 pt-16" aria-describedby="expanded-poster-description">
          <DialogHeader className="sr-only">
            <DialogTitle>{movieTitle || "Your movie"} poster</DialogTitle>
            <DialogDescription id="expanded-poster-description">Full-size generated movie artwork.</DialogDescription>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={posterUrl}
            alt={`${movieTitle || "Movie"} poster, expanded`}
            className="mx-auto max-h-[calc(100dvh-8rem)] max-w-full object-contain"
          />
        </DialogContent>
      )}
      </div>
    </Dialog>
  );
}
