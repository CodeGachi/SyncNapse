import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "glass" | "brand" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-secondary",
          "disabled:pointer-events-none disabled:opacity-50",
          "active:scale-95", // Click animation

          {
            // Primary: Standard solid
            "bg-brand text-black hover:bg-brand-hover shadow-lg shadow-brand/20":
              variant === "primary",

            // Brand: The specific olive green used in the app
            "bg-brand-secondary text-white hover:bg-brand-secondary/90 shadow-lg shadow-brand-secondary/20":
              variant === "brand",

            // Secondary: Gray background with border
            "bg-foreground/10 text-foreground hover:bg-foreground/20 border border-foreground/30":
              variant === "secondary",

            // Outline: Bordered
            "border-2 border-brand text-brand hover:bg-brand/10":
              variant === "outline",

            // Ghost: No background, hover effect
            "text-foreground-secondary hover:text-foreground hover:bg-foreground/5":
              variant === "ghost",

            // Glass: Trendy glassmorphism
            "bg-foreground/5 backdrop-blur-md border border-border-subtle text-foreground hover:bg-foreground/10 shadow-xl shadow-black/20":
              variant === "glass",

            // Danger: Red for destructive actions
            "bg-status-error/10 text-status-error hover:bg-status-error/20 border border-transparent hover:border-status-error/30":
              variant === "danger",
          },

          {
            "h-9 px-4 text-sm": size === "sm",
            "h-11 px-6 text-base": size === "md",
            "h-14 px-8 text-lg": size === "lg",
            "h-10 w-10 p-0": size === "icon",
          },

          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };