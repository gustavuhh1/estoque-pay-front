import {
  Boxes,
  ChartNoAxesColumn,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"
import { NavLink, Link } from "react-router-dom"

const navigation: { label: string; icon: typeof Boxes; to?: string }[] = [
  { label: "Visão geral", icon: LayoutDashboard, to: "/painel" },
  { label: "Produtos", icon: Package, to: "/produtos" },
  { label: "Vendas", icon: ShoppingCart, to: "/vendas" },
  { label: "Estoque", icon: Boxes, to: "/estoque" },
  { label: "Pagamentos", icon: CircleDollarSign },
  { label: "Relatórios", icon: ChartNoAxesColumn },
]

type DashboardSidebarProps = {
  open: boolean
  onClose: () => void
}

const DESKTOP_QUERY = "(min-width: 1024px)"

export default function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => setIsDesktop(media.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  // Gaveta fechada no mobile fica só fora da tela (translate): inert tira do foco/leitor de tela.
  const hidden = !open && !isDesktop

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-[var(--color-ink)]/30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        inert={hidden}
        className={`fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col bg-[var(--color-ink)] px-4 py-5 text-white shadow-2xl transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-2">
          <Link to="/painel" className="flex items-center gap-2.5" onClick={onClose}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand)] text-white">
              <Boxes className="h-5 w-5" />
            </span>
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">EstoquePay</span>
          </Link>
          <button
            type="button"
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-8 px-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Operação</p>
        </div>

        <nav className="mt-3 space-y-1" aria-label="Navegação principal">
          {navigation.map(({ label, icon: Icon, to }) =>
            to ? (
              <NavLink
                key={label}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    isActive ? "bg-white/10 font-semibold text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-4 w-4 ${isActive ? "text-[var(--color-mint)]" : ""}`} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ) : (
              <button
                key={label}
                type="button"
                disabled
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/40"
                title="Tela planejada para uma próxima etapa"
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                <span className="ml-auto rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/25">
                  em breve
                </span>
              </button>
            ),
          )}
        </nav>

        <div className="mt-auto space-y-1">
          <div className="my-4 h-px bg-white/10" />
          <button
            type="button"
            disabled
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/40"
            title="Tela planejada para uma próxima etapa"
          >
            <Users className="h-4 w-4" />
            Funcionários
            <span className="ml-auto rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/25">
              em breve
            </span>
          </button>
          <button
            type="button"
            disabled
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/40"
            title="Tela planejada para uma próxima etapa"
          >
            <Settings className="h-4 w-4" />
            Configurações
            <span className="ml-auto rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/25">
              em breve
            </span>
          </button>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-mint)]/15 text-[var(--color-mint)]">
                <ClipboardList className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-white">Painel da loja</p>
                <p className="mt-0.5 text-[10px] text-white/45">Dados de demonstração</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
