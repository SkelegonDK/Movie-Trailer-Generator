"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Film, Menu, Settings } from "lucide-react"
import { motion } from "motion/react"

import logo from "@/assets/coffe_movie_x2.png"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const navigation = [
  { name: "Generate", href: "/", icon: Film },
  { name: "Settings", href: "/settings", icon: Settings },
]

function NavLinks({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <nav aria-label="Studio" className="flex flex-col gap-2">
      {navigation.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              buttonVariants({
                variant: "ghost",
                size: "default",
              }),
              "relative w-full justify-start gap-3 text-sm",
              isActive ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {isActive && <motion.span layoutId="studio-navigation" className="absolute inset-0 rounded-md border border-white/10 bg-white/5" />}
            <item.icon className="relative w-4 h-4" />
            <span className="relative">{item.name}</span>
            {isActive && <span aria-hidden className="relative ml-auto h-1 w-1 rounded-full bg-foreground" />}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarBrand({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-5 px-6 pb-8", className)}>
      <Link href="/" aria-label="Manuelito trailer studio" className="flex items-center gap-3">
        <Image src={logo} alt="" aria-hidden className="h-12 w-12 rounded-sm object-contain grayscale" loading="eager" />
        <div>
          <p className="text-base font-medium tracking-tight">Manuelito</p>
          <p className="studio-eyebrow mt-1 text-muted-foreground">Trailer studio</p>
        </div>
      </Link>
      <p className="studio-eyebrow text-muted-foreground">
        A production by{" "}
        <a
          href="https://manuelito.tech"
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-1 tracking-normal normal-case text-muted-foreground transition-colors hover:text-foreground"
        >
          manuelito.tech
        </a>
      </p>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside
        className="hidden md:flex fixed inset-y-0 left-0 z-40 w-56 flex-col border-r border-border bg-[#101010]"
        aria-label="Primary navigation"
      >
        <SidebarBrand className="pt-8" />
        <div className="flex-1 px-4 py-3">
          <p className="studio-eyebrow px-3 pb-4 text-muted-foreground">Workspace</p>
          <NavLinks pathname={pathname} />
        </div>
        <div className="mx-6 border-t py-6">
          <p className="text-sm text-foreground">Serious cinema.<br /><span className="text-muted-foreground">Questionable premises.</span></p>
          <p className="studio-eyebrow mt-5 text-muted-foreground">Made for the big idea.</p>
        </div>
      </aside>

      {/* Mobile: top bar + sheet */}
      <header className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-lg">
        <Link href="/" className="flex items-center gap-2">
          <Image src={logo} alt="" aria-hidden loading="eager" className="h-8 w-8 object-contain grayscale" />
          <span className="text-sm font-medium tracking-tight">Manuelito / Trailer studio</span>
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>Choose the trailer generator or API key settings.</SheetDescription>
            </SheetHeader>
            <SidebarBrand className="pt-10" />
            <div className="px-6 py-6">
              <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </header>
    </>
  )
}
