import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as motion from "motion/react-client"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-secondary font-medium",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground font-medium",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium",
        ghost: "hover:bg-accent hover:text-accent-foreground font-medium",
        link: "text-primary underline-offset-4 hover:underline font-medium",
        primary:
          "bg-primary text-primary-foreground hover:bg-secondary font-bold py-3 px-8 uppercase shadow-md",
        "skeuomorphic-primary": [
          "bg-primary-accent text-on-primary-accent",
          "border-transparent",
          "rounded-[0.375em]",
          "shadow-[0.2em_0.2em_0.5em_rgba(0,0,0,0.47),0_-0.1em_0_0.1em_rgba(0,0,0,0.27),0_0.1em_0_0.1em_var(--skeu-highlight-soft-inset)_inset,-0.2em_0_0.2em_var(--primary-accent-shadow-dark)_inset,0_0.2em_0.2em_var(--skeu-highlight-strong-inset)_inset,0.2em_0_0.2em_var(--skeu-highlight-strong-inset)_inset,0_-0.2em_0.2em_var(--primary-accent-shadow-dark)_inset]",
          "active:shadow-[0.1em_0.1em_0.2em_rgba(0,0,0,0.47),0_-0.05em_0_0.05em_rgba(0,0,0,0.27),0_0.05em_0_0.05em_var(--skeu-highlight-soft-inset)_inset,-0.1em_0_0.1em_var(--primary-accent-shadow-dark)_inset,0_0.1em_0.1em_var(--skeu-highlight-strong-inset)_inset,0.1em_0_0.1em_var(--skeu-highlight-strong-inset)_inset,0_-0.1em_0.1em_var(--primary-accent-shadow-dark)_inset]",
          "focus:outline-none focus:[text-shadow:0_0_0.5em_var(--primary-accent-text-focus-shadow),0_0_1em_var(--primary-accent-text-focus-shadow)]",
          "bg-gradient-to-b from-[rgba(0,0,0,0)] to-[var(--skeu-shadow-soft-gradient-overlay)]",
          "[background-image:radial-gradient(90%_7%_at_50%_8%,rgba(255,255,255,0.27)_25%,transparent_50%),linear-gradient(rgba(0,0,0,0),var(--skeu-shadow-soft-gradient-overlay))]",
        ],
        "skeuomorphic-secondary": [
          "bg-secondary-accent text-on-secondary-accent",
          "border-transparent",
          "rounded-[0.375em]",
          "shadow-[0.2em_0.2em_0.5em_rgba(0,0,0,0.47),0_-0.1em_0_0.1em_rgba(0,0,0,0.27),0_0.1em_0_0.1em_var(--skeu-highlight-soft-inset)_inset,-0.2em_0_0.2em_var(--secondary-accent-shadow-dark)_inset,0_0.2em_0.2em_var(--skeu-highlight-strong-inset)_inset,0.2em_0_0.2em_var(--skeu-highlight-strong-inset)_inset,0_-0.2em_0.2em_var(--secondary-accent-shadow-dark)_inset]",
          "active:shadow-[0.1em_0.1em_0.2em_rgba(0,0,0,0.47),0_-0.05em_0_0.05em_rgba(0,0,0,0.27),0_0.05em_0_0.05em_var(--skeu-highlight-soft-inset)_inset,-0.1em_0_0.1em_var(--secondary-accent-shadow-dark)_inset,0_0.1em_0.1em_var(--skeu-highlight-strong-inset)_inset,0.1em_0_0.1em_var(--skeu-highlight-strong-inset)_inset,0_-0.1em_0.1em_var(--secondary-accent-shadow-dark)_inset]",
          "focus:outline-none focus:[text-shadow:0_0_0.5em_var(--secondary-accent-text-focus-shadow),0_0_1em_var(--secondary-accent-text-focus-shadow)]",
          "[background-image:radial-gradient(90%_7%_at_50%_8%,rgba(255,255,255,0.27)_25%,transparent_50%),linear-gradient(rgba(0,0,0,0),var(--skeu-shadow-soft-gradient-overlay))]",
        ],
        "skeuomorphic-highlight": [
          "bg-highlight-accent text-on-highlight-accent",
          "border-transparent",
          "rounded-[0.375em]",
          "shadow-[0.2em_0.2em_0.5em_rgba(0,0,0,0.47),0_-0.1em_0_0.1em_rgba(0,0,0,0.27),0_0.1em_0_0.1em_var(--skeu-highlight-soft-inset)_inset,-0.2em_0_0.2em_var(--highlight-accent-shadow-dark)_inset,0_0.2em_0.2em_var(--skeu-highlight-strong-inset)_inset,0.2em_0_0.2em_var(--skeu-highlight-strong-inset)_inset,0_-0.2em_0.2em_var(--highlight-accent-shadow-dark)_inset]",
          "active:shadow-[0.1em_0.1em_0.2em_rgba(0,0,0,0.47),0_-0.05em_0_0.05em_rgba(0,0,0,0.27),0_0.05em_0_0.05em_var(--skeu-highlight-soft-inset)_inset,-0.1em_0_0.1em_var(--highlight-accent-shadow-dark)_inset,0_0.1em_0.1em_var(--skeu-highlight-strong-inset)_inset,0.1em_0_0.1em_var(--skeu-highlight-strong-inset)_inset,0_-0.1em_0.1em_var(--highlight-accent-shadow-dark)_inset]",
          "focus:outline-none focus:[text-shadow:0_0_0.5em_var(--highlight-accent-text-focus-shadow),0_0_1em_var(--highlight-accent-text-focus-shadow)]",
          "[background-image:radial-gradient(90%_7%_at_50%_8%,rgba(255,255,255,0.27)_25%,transparent_50%),linear-gradient(rgba(0,0,0,0),var(--skeu-shadow-soft-gradient-overlay))]",
        ],
        "skeuomorphic-error": [
          "bg-error-accent text-on-error-accent",
          "border-transparent",
          "rounded-[0.375em]",
          "shadow-[0.2em_0.2em_0.5em_rgba(0,0,0,0.47),0_-0.1em_0_0.1em_rgba(0,0,0,0.27),0_0.1em_0_0.1em_var(--skeu-highlight-soft-inset)_inset,-0.2em_0_0.2em_var(--error-accent-shadow-dark)_inset,0_0.2em_0.2em_var(--skeu-highlight-strong-inset)_inset,0.2em_0_0.2em_var(--skeu-highlight-strong-inset)_inset,0_-0.2em_0.2em_var(--error-accent-shadow-dark)_inset]",
          "active:shadow-[0.1em_0.1em_0.2em_rgba(0,0,0,0.47),0_-0.05em_0_0.05em_rgba(0,0,0,0.27),0_0.05em_0_0.05em_var(--skeu-highlight-soft-inset)_inset,-0.1em_0_0.1em_var(--error-accent-shadow-dark)_inset,0_0.1em_0.1em_var(--skeu-highlight-strong-inset)_inset,0.1em_0_0.1em_var(--skeu-highlight-strong-inset)_inset,0_-0.1em_0.1em_var(--error-accent-shadow-dark)_inset]",
          "focus:outline-none focus:[text-shadow:0_0_0.5em_var(--error-accent-text-focus-shadow),0_0_1em_var(--error-accent-text-focus-shadow)]",
          "[background-image:radial-gradient(90%_7%_at_50%_8%,rgba(255,255,255,0.27)_25%,transparent_50%),linear-gradient(rgba(0,0,0,0),var(--skeu-shadow-soft-gradient-overlay))]",
        ],
        "skeuomorphic-success": [
          "bg-success-accent text-on-success-accent",
          "border-transparent",
          "rounded-[0.375em]",
          "shadow-[0.2em_0.2em_0.5em_rgba(0,0,0,0.47),0_-0.1em_0_0.1em_rgba(0,0,0,0.27),0_0.1em_0_0.1em_var(--skeu-highlight-soft-inset)_inset,-0.2em_0_0.2em_var(--success-accent-shadow-dark)_inset,0_0.2em_0.2em_var(--skeu-highlight-strong-inset)_inset,0.2em_0_0.2em_var(--skeu-highlight-strong-inset)_inset,0_-0.2em_0.2em_var(--success-accent-shadow-dark)_inset]",
          "active:shadow-[0.1em_0.1em_0.2em_rgba(0,0,0,0.47),0_-0.05em_0_0.05em_rgba(0,0,0,0.27),0_0.05em_0_0.05em_var(--skeu-highlight-soft-inset)_inset,-0.1em_0_0.1em_var(--success-accent-shadow-dark)_inset,0_0.1em_0.1em_var(--skeu-highlight-strong-inset)_inset,0.1em_0_0.1em_var(--skeu-highlight-strong-inset)_inset,0_-0.1em_0.1em_var(--success-accent-shadow-dark)_inset]",
          "focus:outline-none focus:[text-shadow:0_0_0.5em_var(--success-accent-text-focus-shadow),0_0_1em_var(--success-accent-text-focus-shadow)]",
          "[background-image:radial-gradient(90%_7%_at_50%_8%,rgba(255,255,255,0.27)_25%,transparent_50%),linear-gradient(rgba(0,0,0,0),var(--skeu-shadow-soft-gradient-overlay))]",
        ],
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
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

/**
 * A customizable button component with motion animations from motion/react-client.
 * Provides visual styles (variants) and sizes. 
 * Supports `asChild` for composition.
 * Includes hover (scale: 0.98) and tap (scale: 0.95) animations.
 * Forwards standard button attributes to the underlying button or child.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, ...otherProps }, ref) => {
    const animProps = {
      whileHover: { scale: 0.98 },
      whileTap: { scale: 0.95 },
    };

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...animProps}      // Pass animation props to Slot
          {...otherProps}     // Pass all other original props to Slot
        />
      );
    }

    const { children, disabled, ...rest } = otherProps;

    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...animProps}
        {...(rest as React.ComponentProps<typeof motion.button>)}
        disabled={disabled || loading}
      >
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
        )}
        {children}
      </motion.button>
    );
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
