"use client"

import dynamic from "next/dynamic"
import { MotionConfig } from "motion/react"
import type { ReactNode } from "react"

const PixelBlast = dynamic(() => import("@/components/backgrounds/PixelBlast"), { ssr: false })

export function StudioAtmosphere({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
      <div className="studio-background" aria-hidden="true">
        <PixelBlast variant="circle" pixelSize={4} color="#bfbfbf" patternScale={3}
          patternDensity={1.15} pixelSizeJitter={0.35} enableRipples rippleSpeed={0.35}
          rippleThickness={0.12} rippleIntensityScale={1.3} liquid liquidStrength={0.06}
          liquidRadius={1.2} liquidWobbleSpeed={3} speed={0.35} edgeFade={0.2} transparent />
      </div>
      {children}
    </MotionConfig>
  )
}
