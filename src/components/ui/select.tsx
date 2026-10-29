import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "flex h-11 w-full appearance-none rounded-md border border-[var(--color-ink)]/15 bg-white px-3.5 py-2 pr-10 text-sm text-[var(--color-ink)] shadow-xs outline-none transition focus-visible:border-[var(--color-amber)] focus-visible:ring-2 focus-visible:ring-[var(--color-amber)]/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]" />
    </div>
  )
}

export { Select }
