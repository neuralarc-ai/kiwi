import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      style={variant === "default" ? { backgroundColor: 'oklch(62% .08 270)', color: 'white' } : undefined}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        {
          "text-white": variant === "default",
          "bg-secondary text-secondary-foreground": variant === "secondary",
          "bg-green-500/20 text-green-400 border border-green-500/30": variant === "success",
          "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30": variant === "warning",
          "bg-red-500/20 text-red-400 border border-red-500/30": variant === "destructive",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }

