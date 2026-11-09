import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"

/**
 * Categorias numa linha só, rolando na horizontal: não quebra em várias linhas e não rouba altura dos produtos.
 * Roda do mouse rola para os lados; setas e esmaecido nas bordas aparecem quando há mais categorias escondidas.
 */
export default function CategoryScroller({ items, counts, active, onSelect }: { items: string[]; counts: Record<string, number>; active: string; onSelect: (item: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
    // Roda vertical do mouse vira rolagem horizontal (só quando há o que rolar).
    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      event.preventDefault()
      el.scrollLeft += event.deltaY
    }
    update()
    el.addEventListener("scroll", update, { passive: true })
    el.addEventListener("wheel", onWheel, { passive: false })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      el.removeEventListener("scroll", update)
      el.removeEventListener("wheel", onWheel)
      observer.disconnect()
    }
  }, [items.length])

  // A categoria escolhida fica sempre visível (ex.: escolhida pelo teclado ou depois de redimensionar).
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[aria-pressed=true]")?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" })
  }, [active])

  const step = (direction: 1 | -1) => ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.7, behavior: "smooth" })
  const arrow = "absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-ink)] shadow-sm transition hover:border-[var(--color-green-500)]/50 md:flex"

  return (
    <div className="relative">
      <div ref={ref} role="group" aria-label="Categorias" className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto scroll-px-1 px-1 py-0.5">
        {items.map((item) => {
          const selected = active === item
          return (
            <button
              key={item}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(item)}
              className={`flex h-10 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full border pl-4 pr-3 text-sm font-bold transition ${
                selected ? "border-[var(--color-amber)] bg-[var(--color-amber)] text-white" : "border-[var(--color-border)] bg-white hover:border-[var(--color-green-500)]/50"
              }`}
            >
              {item}
              <span className={`min-w-6 rounded-full px-1.5 text-center text-[11px] tabular-nums ${selected ? "bg-white/20" : "bg-[var(--color-nav)] text-[var(--color-slate)]"}`}>{counts[item] ?? 0}</span>
            </button>
          )
        })}
      </div>
      {edges.left && (
        <>
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[var(--color-paper)] to-transparent" />
          <button type="button" aria-label="Categorias anteriores" onClick={() => step(-1)} className={`${arrow} left-0`}>
            <ChevronLeft className="h-4 w-4" />
          </button>
        </>
      )}
      {edges.right && (
        <>
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--color-paper)] to-transparent" />
          <button type="button" aria-label="Próximas categorias" onClick={() => step(1)} className={`${arrow} right-0`}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  )
}
