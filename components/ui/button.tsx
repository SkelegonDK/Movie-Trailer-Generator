import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm ring-offset-background transition-[color,background-color,filter,transform] duration-200 ease-[var(--ease-out)] active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-md",
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
          "bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-3 px-8 uppercase shadow-md",
        "skeuomorphic-primary": [
          "bg-primary-accent text-primary-foreground",
          "border-transparent hover:brightness-110",
          "rounded-[0.375em]",
          "shadow-[0.2em_0.2em_0.5em_rgba(0,0,0,0.47),0_-0.1em_0_0.1em_rgba(0,0,0,0.27),0_0.1em_0_0.1em_var(--skeu-highlight-soft-inset)_inset,-0.2em_0_0.2em_var(--primary-accent-shadow-dark)_inset,0_0.2em_0.2em_var(--skeu-highlight-strong-inset)_inset,0.2em_0_0.2em_var(--skeu-highlight-strong-inset)_inset,0_-0.2em_0.2em_var(--primary-accent-shadow-dark)_inset]",
          "active:shadow-[0.1em_0.1em_0.2em_rgba(0,0,0,0.47),0_-0.05em_0_0.05em_rgba(0,0,0,0.27),0_0.05em_0_0.05em_var(--skeu-highlight-soft-inset)_inset,-0.1em_0_0.1em_var(--primary-accent-shadow-dark)_inset,0_0.1em_0.1em_var(--skeu-highlight-strong-inset)_inset,0.1em_0_0.1em_var(--skeu-highlight-strong-inset)_inset,0_-0.1em_0.1em_var(--primary-accent-shadow-dark)_inset]",
          "focus:outline-none focus:[text-shadow:0_0_0.5em_var(--primary-accent-text-focus-shadow),0_0_1em_var(--primary-accent-text-focus-shadow)]",
          "bg-gradient-to-b from-[rgba(0,0,0,0)] to-[var(--skeu-shadow-soft-gradient-overlay)]",
          "[background-image:radial-gradient(90%_7%_at_50%_8%,rgba(255,255,255,0.27)_25%,transparent_50%),linear-gradient(rgba(0,0,0,0),var(--skeu-shadow-soft-gradient-overlay))]",
        ],
        "skeuomorphic-secondary": [
          "bg-secondary-accent text-secondary-foreground",
          "border-transparent hover:brightness-110",
          "rounded-[0.375em]",
          "shadow-[0.2em_0.2em_0.5em_rgba(0,0,0,0.47),0_-0.1em_0_0.1em_rgba(0,0,0,0.27),0_0.1em_0_0.1em_var(--skeu-highlight-soft-inset)_inset,-0.2em_0_0.2em_var(--secondary-accent-shadow-dark)_inset,0_0.2em_0.2em_var(--skeu-highlight-strong-inset)_inset,0.2em_0_0.2em_var(--skeu-highlight-strong-inset)_inset,0_-0.2em_0.2em_var(--secondary-accent-shadow-dark)_inset]",
          "active:shadow-[0.1em_0.1em_0.2em_rgba(0,0,0,0.47),0_-0.05em_0_0.05em_rgba(0,0,0,0.27),0_0.05em_0_0.05em_var(--skeu-highlight-soft-inset)_inset,-0.1em_0_0.1em_var(--secondary-accent-shadow-dark)_inset,0_0.1em_0.1em_var(--skeu-highlight-strong-inset)_inset,0.1em_0_0.1em_var(--skeu-highlight-strong-inset)_inset,0_-0.1em_0.1em_var(--secondary-accent-shadow-dark)_inset]",
          "focus:outline-none focus:[text-shadow:0_0_0.5em_var(--secondary-accent-text-focus-shadow),0_0_1em_var(--secondary-accent-text-focus-shadow)]",
          "[background-image:radial-gradient(90%_7%_at_50%_8%,rgba(255,255,255,0.27)_25%,transparent_50%),linear-gradient(rgba(0,0,0,0),var(--skeu-shadow-soft-gradient-overlay))]",
        ],
        "skeuomorphic-highlight": [
          "bg-highlight-accent text-accent-foreground",
          "border-transparent hover:brightness-110",
          "rounded-[0.375em]",
          "shadow-[0.2em_0.2em_0.5em_rgba(0,0,0,0.47),0_-0.1em_0_0.1em_rgba(0,0,0,0.27),0_0.1em_0_0.1em_var(--skeu-highlight-soft-inset)_inset,-0.2em_0_0.2em_var(--highlight-accent-shadow-dark)_inset,0_0.2em_0.2em_var(--skeu-highlight-strong-inset)_inset,0.2em_0_0.2em_var(--skeu-highlight-strong-inset)_inset,0_-0.2em_0.2em_var(--highlight-accent-shadow-dark)_inset]",
          "active:shadow-[0.1em_0.1em_0.2em_rgba(0,0,0,0.47),0_-0.05em_0_0.05em_rgba(0,0,0,0.27),0_0.05em_0_0.05em_var(--skeu-highlight-soft-inset)_inset,-0.1em_0_0.1em_var(--highlight-accent-shadow-dark)_inset,0_0.1em_0.1em_var(--skeu-highlight-strong-inset)_inset,0.1em_0_0.1em_var(--skeu-highlight-strong-inset)_inset,0_-0.1em_0.1em_var(--highlight-accent-shadow-dark)_inset]",
          "focus:outline-none focus:[text-shadow:0_0_0.5em_var(--highlight-accent-text-focus-shadow),0_0_1em_var(--highlight-accent-text-focus-shadow)]",
          "[background-image:radial-gradient(90%_7%_at_50%_8%,rgba(255,255,255,0.27)_25%,transparent_50%),linear-gradient(rgba(0,0,0,0),var(--skeu-shadow-soft-gradient-overlay))]",
        ],
        "skeuomorphic-error": [
          "bg-error-accent text-destructive-foreground",
          "border-transparent hover:brightness-110",
          "rounded-[0.375em]",
          "shadow-[0.2em_0.2em_0.5em_rgba(0,0,0,0.47),0_-0.1em_0_0.1em_rgba(0,0,0,0.27),0_0.1em_0_0.1em_var(--skeu-highlight-soft-inset)_inset,-0.2em_0_0.2em_var(--error-accent-shadow-dark)_inset,0_0.2em_0.2em_var(--skeu-highlight-strong-inset)_inset,0.2em_0_0.2em_var(--skeu-highlight-strong-inset)_inset,0_-0.2em_0.2em_var(--error-accent-shadow-dark)_inset]",
          "active:shadow-[0.1em_0.1em_0.2em_rgba(0,0,0,0.47),0_-0.05em_0_0.05em_rgba(0,0,0,0.27),0_0.05em_0_0.05em_var(--skeu-highlight-soft-inset)_inset,-0.1em_0_0.1em_var(--error-accent-shadow-dark)_inset,0_0.1em_0.1em_var(--skeu-highlight-strong-inset)_inset,0.1em_0_0.1em_var(--skeu-highlight-strong-inset)_inset,0_-0.1em_0.1em_var(--error-accent-shadow-dark)_inset]",
          "focus:outline-none focus:[text-shadow:0_0_0.5em_var(--error-accent-text-focus-shadow),0_0_1em_var(--error-accent-text-focus-shadow)]",
          "[background-image:radial-gradient(90%_7%_at_50%_8%,rgba(255,255,255,0.27)_25%,transparent_50%),linear-gradient(rgba(0,0,0,0),var(--skeu-shadow-soft-gradient-overlay))]",
        ],
        "skeuomorphic-success": [
          "bg-success-accent text-success-foreground",
          "border-transparent hover:brightness-110",
          "rounded-[0.375em]",
          "shadow-[0.2em_0.2em_0.5em_rgba(0,0,0,0.47),0_-0.1em_0_0.1em_rgba(0,0,0,0.27),0_0.1em_0_0.1em_var(--skeu-highlight-soft-inset)_inset,-0.2em_0_0.2em_var(--success-accent-shadow-dark)_inset,0_0.2em_0.2em_var(--skeu-highlight-strong-inset)_inset,0.2em_0_0.2em_var(--skeu-highlight-strong-inset)_inset,0_-0.2em_0.2em_var(--success-accent-shadow-dark)_inset]",
          "active:shadow-[0.1em_0.1em_0.2em_rgba(0,0,0,0.47),0_-0.05em_0_0.05em_rgba(0,0,0,0.27),0_0.05em_0_0.05em_var(--skeu-highlight-soft-inset)_inset,-0.1em_0_0.1em_var(--success-accent-shadow-dark)_inset,0_0.1em_0.1em_var(--skeu-highlight-strong-inset)_inset,0.1em_0_0.1em_var(--skeu-highlight-strong-inset)_inset,0_-0.1em_0.1em_var(--success-accent-shadow-dark)_inset]",
          "focus:outline-none focus:[text-shadow:0_0_0.5em_var(--success-accent-text-focus-shadow),0_0_1em_var(--success-accent-text-focus-shadow)]",
          "[background-image:radial-gradient(90%_7%_at_50%_8%,rgba(255,255,255,0.27)_25%,transparent_50%),linear-gradient(rgba(0,0,0,0),var(--skeu-shadow-soft-gradient-overlay))]",
        ],
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
