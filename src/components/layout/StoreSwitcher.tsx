import { Check, ChevronDown, Store } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useStores } from "@/store/StoreContext"

export default function StoreSwitcher() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { stores, activeStore, setActiveStore } = useStores()

  return (
    <div className="relative min-w-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex w-full max-w-[320px] items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-[var(--color-amber)]/35 sm:min-w-[250px]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]"><Store className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[var(--color-ink)]">{activeStore.name}</span><span className="block truncate text-[11px] text-[var(--color-slate)]">Loja ativa</span></span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--color-slate)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <><button type="button" aria-label="Fechar seleção de loja" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} /><div className="absolute left-0 z-30 mt-2 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-[var(--color-border)] bg-white p-2 shadow-[0_20px_50px_rgba(13,28,46,0.14)]"><div className="flex items-center justify-between px-3 py-2"><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-slate)]">Trocar estabelecimento</span><button type="button" className="text-[10px] font-semibold text-[var(--color-amber-dark)]" onClick={() => { setOpen(false); navigate("/lojas") }}>Ver todos</button></div><div className="space-y-1">{stores.map((store) => { const selected = store.id === activeStore.id; return <button key={store.id} type="button" onClick={() => { setActiveStore(store.id); setOpen(false) }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selected ? "bg-[var(--color-stock-green-soft)]" : "hover:bg-[var(--color-paper)]"}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-[var(--color-amber)] text-white" : "bg-[var(--color-paper)] text-[var(--color-slate)]"}`}><Store className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[var(--color-ink)]">{store.name}</span><span className="mt-0.5 block truncate text-[10px] text-[var(--color-slate)]">{store.role} • {store.city}/{store.state}</span></span>{selected && <Check className="h-4 w-4 shrink-0 text-[var(--color-stock-green)]" />}</button> })}</div></div></>}
    </div>
  )
}
