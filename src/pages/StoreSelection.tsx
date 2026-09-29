import { ArrowRight, Boxes, Building2, Check, Plus, Store } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useStores } from "@/store/StoreContext"

export default function StoreSelection() {
  const navigate = useNavigate()
  const { stores, activeStoreId, setActiveStore } = useStores()

  const selectStore = (id: string) => {
    setActiveStore(id)
    navigate("/painel")
  }

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-amber)] text-white"><Boxes className="h-5 w-5" /></span>
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold">EstoquePay</span>
          </Link>
          <span className="text-xs text-[var(--color-slate)]">Escolha um estabelecimento para continuar</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-6 md:py-16">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-amber-dark)]">Seus estabelecimentos</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">Onde você quer trabalhar hoje?</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-slate)]">Selecione uma loja para abrir o Dashboard no contexto correto.</p>
          </div>
          <Button asChild variant="accent"><Link to="/onboarding"><Plus className="h-4 w-4" />Nova loja</Link></Button>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {stores.map((store) => {
            const active = store.id === activeStoreId
            return (
              <button key={store.id} type="button" onClick={() => selectStore(store.id)} className="text-left">
                <Card className={`h-full rounded-2xl border bg-white p-6 shadow-[0_10px_35px_rgba(13,28,46,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_45px_rgba(13,28,46,0.09)] ${active ? "border-[var(--color-amber)]/50 ring-2 ring-[var(--color-amber)]/10" : "border-[var(--color-border)]"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]"><Store className="h-5 w-5" /></span>
                    {active && <span className="flex items-center gap-1 rounded-full bg-[var(--color-stock-green-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--color-stock-green)]"><Check className="h-3 w-3" />Ativa</span>}
                  </div>
                  <h2 className="mt-6 font-[family-name:var(--font-display)] text-xl font-semibold">{store.name}</h2>
                  <p className="mt-2 text-xs text-[var(--color-slate)]">{store.cnpj}</p>
                  <div className="mt-5 space-y-2 text-xs text-[var(--color-slate)]">
                    <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" />{store.role}</div>
                    <div>{store.city} / {store.state}</div>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-[var(--color-border)] pt-5 text-xs font-semibold text-[var(--color-ink)]">
                    <span>Abrir Dashboard</span><ArrowRight className="h-4 w-4" />
                  </div>
                </Card>
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
