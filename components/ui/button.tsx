import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm cursor-pointer ring-offset-background transition-[color,background-color,border-color,transform] duration-200 ease-[var(--ease-out)] active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 font-medium",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium",
        outline:
          "border border-input bg-background hover:bg-muted hover:text-foreground font-medium",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium",
        ghost: "hover:bg-muted hover:text-foreground font-medium",
        link: "text-primary underline-offset-4 hover:underline font-medium",
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-3 px-8 tracking-wide",
        // Preserve the existing variant API while giving all controls the studio finish.
        "skeuomorphic-primary": "border border-primary bg-primary text-primary-foreground font-medium hover:bg-primary/85",
        "skeuomorphic-secondary": "border border-border bg-white/5 text-foreground font-medium hover:bg-white/10 hover:border-white/30",
        "skeuomorphic-highlight": "border border-border bg-accent text-accent-foreground font-medium hover:bg-accent/85",
        "skeuomorphic-error": "border border-destructive/40 bg-destructive/10 text-foreground font-medium hover:bg-destructive/20",
        "skeuomorphic-success": "border border-border bg-primary text-primary-foreground font-medium hover:bg-primary/85",
      },
      size: {
        default: "min-h-11 px-4 py-2",
        sm: "min-h-11 px-3 py-2",
        lg: "h-11 px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? children : (
          <>
            {loading && <span aria-hidden className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {children}
          </>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
