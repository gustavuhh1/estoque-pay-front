import { Boxes, ChevronsLeft, ChevronsRight, LayoutDashboard, LogOut, Receipt, Settings, ShoppingCart, Users, X } from "lucide-react"
import { NavLink, Link, useNavigate } from "react-router-dom"

import { useAuth } from "@/auth/useAuth"
import Avatar from "@/components/Avatar"
import { SIDEBAR_WIDTH, type SidebarMode } from "@/components/layout/useSidebar"
import { config } from "@/config"
import { useStores } from "@/store/useStores"

const navigation = [
  { label: "Painel", icon: LayoutDashboard, to: "/painel" },
  { label: "PDV", icon: ShoppingCart, to: "/pdv" },
  { label: "Estoque", icon: Boxes, to: "/estoque" },
  { label: "Clientes", icon: Users, to: "/clientes" },
  { label: "Vendas", icon: Receipt, to: "/vendas" },
  { label: "Ajustes", icon: Settings, to: "/ajustes" },
]

type DashboardSidebarProps = {
  mode: SidebarMode
  /** Menu do celular aberto (só no modo drawer). */
  open: boolean
  onClose: () => void
  /** Recolher/expandir: ausente quando a tela não permite (tablet é sempre só ícones). */
  onToggle?: () => void
}

export default function DashboardSidebar({ mode, open, onClose, onToggle }: DashboardSidebarProps) {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const { activeStore } = useStores()
  // Com a API, o Caixa (Colaborador) só vê o PDV e as vendas.
  const items = config.useApi && activeStore.role === "Colaborador" ? navigation.filter((item) => item.to === "/pdv" || item.to === "/vendas") : navigation

  const name = session?.user.name ?? "Usuário"
  const rail = mode === "rail"
  const drawer = mode === "drawer"
  // Só ícones: os textos saem da tela mas continuam lidos por leitores de tela; o nome aparece ao passar o mouse.
  const hideText = rail ? "sr-only" : ""
  const tip = (text: string) => (rail ? text : undefined)

  const handleLogout = async () => {
    await signOut()
    navigate("/login", { replace: true })
  }

  return (
    <>
      {drawer && open && <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-40 bg-[var(--color-ink)]/30" onClick={onClose} />}

      <aside
        aria-label="Menu"
        className={`fixed inset-y-0 left-0 z-50 border-r border-[var(--color-border)] bg-[var(--color-nav)] text-[var(--color-ink)] transition-[width,transform] duration-200 ${SIDEBAR_WIDTH[mode]} ${
          drawer ? `shadow-2xl ${open ? "translate-x-0" : "-translate-x-full"}` : "translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden py-6">
          <div className={`flex items-center justify-between ${rail ? "justify-center" : "px-6"}`}>
            <Link to="/painel" className="flex items-center gap-3" onClick={onClose} title={tip("EstoquePay")}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-amber)] text-white">
                <Boxes className="h-5 w-5" />
              </span>
              <span className={`whitespace-nowrap leading-tight ${hideText}`}>
                <span className="block text-sm font-extrabold uppercase tracking-[0.14em]">EstoquePay</span>
                <span className="block text-[8px] font-semibold uppercase tracking-[0.14em] text-[var(--color-slate)]">Digital Atelier</span>
              </span>
            </Link>
            {drawer && (
              <button type="button" className="rounded-lg p-1.5 text-[var(--color-slate)] hover:bg-white" onClick={onClose} aria-label="Fechar menu">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <nav className="mt-9" aria-label="Navegação principal">
            {items.map(({ label, icon: Icon, to }) => (
              <NavLink
                key={label}
                to={to}
                end
                onClick={onClose}
                title={tip(label)}
                className={({ isActive }) =>
                  `flex h-[60px] items-center gap-4 whitespace-nowrap border-l-[3px] text-[15px] ${rail ? "justify-center" : "px-6"} ${
                    isActive
                      ? "border-[var(--color-amber)] bg-white font-bold text-[var(--color-ink)]"
                      : "border-transparent font-medium text-[var(--color-slate)] hover:bg-white/60 hover:text-[var(--color-ink)]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-[var(--color-amber)]" : ""}`} />
                    <span className={hideText}>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className={`mt-auto pt-6 ${rail ? "px-3" : "px-[18px]"}`}>
            <div className={`rounded-2xl bg-[var(--color-stock-green-soft)] ${rail ? "p-2.5" : "p-4"}`}>
              <Link
                to="/perfil"
                onClick={onClose}
                aria-label="Meu perfil"
                title={tip(`${name} · Meu perfil`)}
                className={`flex items-center gap-3 rounded-xl transition hover:opacity-80 ${rail ? "justify-center" : ""}`}
              >
                <Avatar name={name} src={session?.user.image} size={36} />
                <div className={`min-w-0 ${hideText}`}>
                  <p className="truncate text-[13px] font-bold">{name}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-slate)]">{activeStore.role}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title={tip("Encerrar sessão")}
                className={`mt-3 flex w-full items-center whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-alert)] ${rail ? "justify-center" : "justify-between"}`}
              >
                <span className={hideText}>Encerrar sessão</span>
                <LogOut className="h-4 w-4 shrink-0" />
              </button>
            </div>
            <p className={`mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-slate)] ${hideText}`}>EstoquePay v1.02.4</p>
          </div>
        </div>

        {/* Fica na borda, fora da área que rola, para aparecer igual nos dois estados. */}
        {onToggle && !drawer && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={rail ? "Expandir menu" : "Recolher menu"}
            aria-expanded={!rail}
            title={rail ? "Expandir menu" : "Recolher menu"}
            className="absolute -right-3.5 top-[34px] flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-slate)] shadow-sm transition hover:border-[var(--color-amber)]/50 hover:text-[var(--color-amber)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-amber)]"
          >
            {rail ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        )}
      </aside>
    </>
  )
}
