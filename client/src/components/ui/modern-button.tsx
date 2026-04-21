import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { LoadingSpinner } from "./loading"

const modernButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 shadow-lg hover:shadow-xl hover:scale-[1.02]",
        success: "bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg",
        warning: "bg-orange-600 text-white hover:bg-orange-700 shadow-md hover:shadow-lg",
        info: "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg",
        glass: "glass text-foreground hover:bg-white/30 dark:hover:bg-white/10 backdrop-blur-md",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-xl px-8",
        xl: "h-12 rounded-xl px-10 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-lg",
        "icon-lg": "h-12 w-12 rounded-xl",
      },
      animation: {
        none: "",
        bounce: "hover:animate-bounce-gentle",
        pulse: "hover:animate-pulse-slow",
        glow: "hover:shadow-[0_0_20px_rgba(var(--primary),0.3)]",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
    },
  }
)

export interface ModernButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof modernButtonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const ModernButton = React.forwardRef<HTMLButtonElement, ModernButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    animation,
    asChild = false, 
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(modernButtonVariants({ variant, size, animation, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" />
            {loadingText || children}
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </Comp>
    )
  }
)
ModernButton.displayName = "ModernButton"

// Specialized button components
export const GradientButton = React.forwardRef<HTMLButtonElement, ModernButtonProps>(
  (props, ref) => (
    <ModernButton ref={ref} variant="gradient" animation="glow" {...props} />
  )
)
GradientButton.displayName = "GradientButton"

export const GlassButton = React.forwardRef<HTMLButtonElement, ModernButtonProps>(
  (props, ref) => (
    <ModernButton ref={ref} variant="glass" {...props} />
  )
)
GlassButton.displayName = "GlassButton"

export const ActionButton = React.forwardRef<HTMLButtonElement, ModernButtonProps>(
  (props, ref) => (
    <ModernButton ref={ref} size="lg" animation="bounce" {...props} />
  )
)
ActionButton.displayName = "ActionButton"

// Button group component
interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: "horizontal" | "vertical"
}

export function ButtonGroup({ 
  children, 
  className, 
  orientation = "horizontal" 
}: ButtonGroupProps) {
  return (
    <div 
      className={cn(
        "flex",
        orientation === "horizontal" ? "flex-row" : "flex-col",
        "[&>*:not(:first-child)]:ml-0 [&>*:not(:last-child)]:rounded-r-none [&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0",
        orientation === "vertical" && "[&>*:not(:first-child)]:ml-0 [&>*:not(:last-child)]:rounded-b-none [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0",
        className
      )}
    >
      {children}
    </div>
  )
}

// Floating Action Button
export const FloatingActionButton = React.forwardRef<HTMLButtonElement, ModernButtonProps>(
  ({ className, ...props }, ref) => (
    <ModernButton
      ref={ref}
      variant="gradient"
      size="icon-lg"
      animation="glow"
      className={cn(
        "fixed bottom-6 right-6 z-50 shadow-2xl hover:shadow-3xl rounded-full",
        className
      )}
      {...props}
    />
  )
)
FloatingActionButton.displayName = "FloatingActionButton"

export { ModernButton, modernButtonVariants }
