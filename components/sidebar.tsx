"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Film, Menu, Settings } from "lucide-react"

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
    <nav className="flex flex-col gap-2">
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
                variant: isActive ? "skeuomorphic-primary" : "ghost",
                size: "default",
              }),
              "w-full justify-start text-sm uppercase",
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarBrand({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-6 border-b border-border pb-4", className)}>
      <Image
        src={logo}
        alt=""
        aria-hidden
        className="w-32 h-32 object-contain"
        loading="eager"
      />
      <p className="text-sm text-muted-foreground font-mono">
        by{" "}
        <a
          href="https://manuelito.tech"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
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
        className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-border bg-background/80 backdrop-blur-lg"
        aria-label="Primary navigation"
      >
        <SidebarBrand className="pt-6" />
        <div className="flex-1 px-6 py-8">
          <NavLinks pathname={pathname} />
        </div>
      </aside>

      {/* Mobile: top bar + sheet */}
      <header className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-lg">
        <Link href="/" className="flex items-center gap-2">
          <Image src={logo} alt="" aria-hidden loading="eager" className="h-8 w-8 object-contain" />
          <span className="headline text-sm">Trailer Generator</span>
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
