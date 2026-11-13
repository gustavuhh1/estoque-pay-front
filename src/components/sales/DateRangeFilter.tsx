import { CalendarDays, ChevronDown, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { PRESETS, daysAgo, rangeLabel, type DateRange } from "@/lib/dateRange"

type Props = { value: DateRange | null; onChange: (range: DateRange | null) => void }

/** Botão "Período" com atalhos de um clique e um intervalo livre (de/até) com o calendário do próprio aparelho. */
export default function DateRangeFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange>(() => value ?? PRESETS[2].range())
  const wrapper = useRef<HTMLDivElement>(null)
  const today = daysAgo(0)
  const invalid = !draft.from || !draft.to || draft.from > draft.to

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  function toggle() {
    if (!open) setDraft(value ?? PRESETS[2].range())
    setOpen(!open)
  }

  function pick(range: DateRange | null) {
    onChange(range)
    setOpen(false)
  }

  const dateInput =
    "h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm font-semibold text-[var(--color-ink)] outline-none transition focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/20 cursor-pointer"

  return (
    <div ref={wrapper} className="relative">
      <div className="flex">
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={`flex h-11 w-full items-center gap-2 border bg-white px-3.5 text-sm font-bold transition hover:bg-[var(--color-paper)] lg:w-auto ${
            value ? "rounded-l-xl border-[var(--color-amber)]/40 text-[var(--color-amber-dark)]" : "rounded-xl border-[var(--color-border)] text-[var(--color-ink)]"
          }`}
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">{rangeLabel(value)}</span>
          <ChevronDown className={`ml-auto h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Limpar período"
            title="Ver todas as datas"
            className="flex h-11 w-10 shrink-0 items-center justify-center rounded-r-xl border border-l-0 border-[var(--color-amber)]/40 bg-white text-[var(--color-slate)] transition hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Escolher período das vendas"
          className="absolute left-0 top-[calc(100%+8px)] z-40 w-[min(560px,calc(100vw-32px))] rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_20px_50px_rgba(13,28,46,0.15)] sm:flex sm:gap-5"
        >
          <div className="flex flex-wrap gap-2 sm:w-40 sm:shrink-0 sm:flex-col sm:flex-nowrap sm:gap-1">
            <p className="hidden pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-slate)] sm:block">Atalhos</p>
            {PRESETS.map((preset) => {
              const active = value && rangeLabel(value) === preset.label
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => pick(preset.range())}
                  className={`rounded-full px-3 py-1.5 text-left text-sm font-semibold transition sm:rounded-lg ${
                    active ? "bg-[var(--color-amber)] text-white" : "bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-[var(--color-stock-green-soft)] sm:bg-transparent"
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => pick(null)}
              className={`rounded-full px-3 py-1.5 text-left text-sm font-semibold transition sm:rounded-lg ${
                value ? "bg-[var(--color-paper)] hover:bg-[var(--color-stock-green-soft)] sm:bg-transparent" : "bg-[var(--color-amber)] text-white"
              }`}
            >
              Todas as datas
            </button>
          </div>

          <form
            className="mt-4 border-t border-[var(--color-border)] pt-4 sm:mt-0 sm:flex-1 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0"
            onSubmit={(event) => {
              event.preventDefault()
              if (!invalid) pick(draft)
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-slate)]">Escolher os dias</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="space-y-1.5 text-xs font-semibold text-[var(--color-slate)]">
                De
                <input type="date" value={draft.from} max={today} onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))} className={dateInput} />
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-[var(--color-slate)]">
                Até
                <input type="date" value={draft.to} max={today} min={draft.from || undefined} onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} className={dateInput} />
              </label>
            </div>
            <p className={`mt-2 min-h-5 text-xs ${invalid && draft.from && draft.to ? "font-medium text-[var(--color-alert-dark)]" : "text-[var(--color-slate)]"}`}>
              {invalid && draft.from && draft.to ? "A data inicial precisa ser antes da final." : "Vale do primeiro minuto do dia inicial ao último do dia final."}
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-xl px-4 text-sm font-bold text-[var(--color-slate)] hover:bg-[var(--color-paper)]">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={invalid}
                className="h-10 rounded-xl bg-[var(--color-amber)] px-5 text-sm font-bold text-white transition hover:bg-[var(--color-amber-dark)] disabled:opacity-40"
              >
                Aplicar período
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
