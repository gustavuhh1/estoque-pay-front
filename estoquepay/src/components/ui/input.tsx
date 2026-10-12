import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-md border border-[var(--color-ink)]/15 bg-white px-3.5 py-2 text-sm text-[var(--color-ink)] shadow-xs transition-colors placeholder:text-[var(--color-slate)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/30 focus-visible:border-[var(--color-ink)]/40 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
