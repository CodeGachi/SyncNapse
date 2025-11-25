import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "glass" | "brand";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#899649]",
          "disabled:pointer-events-none disabled:opacity-50",
          "active:scale-95", // Click animation

          {
            // Primary: Standard solid
            "bg-[#AFC02B] text-white hover:bg-[#9DB025] shadow-lg shadow-[#AFC02B]/20":
              variant === "primary",

            // Brand: The specific olive green used in the app
            "bg-[#899649] text-white hover:bg-[#9CA855] shadow-lg shadow-[#899649]/20":
              variant === "brand",

            // Secondary: Gray background
            "bg-white/10 text-white hover:bg-white/20":
              variant === "secondary",

            // Outline: Bordered
            "border-2 border-[#AFC02B] text-[#AFC02B] hover:bg-[#AFC02B]/10":
              variant === "outline",

            // Ghost: No background, hover effect
            "text-gray-400 hover:text-white hover:bg-white/5":
              variant === "ghost",

            // Glass: Trendy glassmorphism
            "bg-white/5 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 shadow-xl shadow-black/20":
              variant === "glass",
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