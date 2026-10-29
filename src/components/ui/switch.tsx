import { cn } from "@/lib/utils"

type SwitchProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
  className?: string
}

/** Chave liga/desliga com rótulo e descrição opcional. */
function Switch({ checked, onChange, label, description, disabled, className }: SwitchProps) {
  return (
    <label className={cn("flex items-start gap-3", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green-500)]/40",
          checked ? "bg-[var(--color-amber)]" : "bg-[var(--color-border)]",
        )}
      >
        <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
      <span className="flex flex-col">
        <span className="text-[15px] font-bold">{label}</span>
        {description && <span className="text-[13px] text-[var(--color-slate)]">{description}</span>}
      </span>
    </label>
  )
}

export { Switch }
