import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          
          {
            "bg-[#AFC02B] text-white hover:bg-[#9DB025] focus-visible:ring-[#AFC02B]":
              variant === "primary",
            "bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-400":
              variant === "secondary",
            "border-2 border-[#AFC02B] text-[#AFC02B] hover:bg-[#AFC02B]/10 focus-visible:ring-[#AFC02B]":
              variant === "outline",
          },
          
          {
            "h-9 px-4 text-sm": size === "sm",
            "h-11 px-6 text-base": size === "md",
            "h-14 px-8 text-lg": size === "lg",
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