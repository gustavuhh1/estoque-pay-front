import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Campo do Design System (Figma "Input", 11:399): fundo surface/nav sem borda, borda de marca + anel no foco,
 * borda vermelha com `aria-invalid` e fundo rebaixado quando desabilitado.
 */
export const fieldBase =
  "w-full rounded-xl border border-transparent bg-[var(--color-nav)] text-[15px] font-semibold text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(11,28,48,0.03)] transition-[border-color,box-shadow] outline-none placeholder:font-medium placeholder:text-[var(--color-faint)] focus-visible:border-[var(--color-green-500)] focus-visible:shadow-[0_0_0_3px_rgba(8,146,100,0.35)] aria-invalid:border-[var(--color-danger-border)] disabled:cursor-not-allowed disabled:bg-[var(--color-paper-dim)] disabled:text-[var(--color-slate)]"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn("flex h-12 px-4 py-2", fieldBase, className)}
      {...props}
    />
  )
}

export { Input }
