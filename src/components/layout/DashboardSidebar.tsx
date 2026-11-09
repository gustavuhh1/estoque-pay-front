import { Boxes, LayoutDashboard, LogOut, Receipt, Settings, ShoppingCart, Users, X } from "lucide-react"
import { NavLink, Link, useNavigate } from "react-router-dom"

import { useAuth } from "@/auth/useAuth"
import Avatar from "@/components/Avatar"
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
  open: boolean
  onClose: () => void
  /** Só ícones a partir de lg (usado no PDV, que precisa da largura para os produtos). O menu do celular continua completo. */
  compact?: boolean
}

export default function DashboardSidebar({ open, onClose, compact = false }: DashboardSidebarProps) {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const { activeStore } = useStores()
  // Com a API, o Caixa (Colaborador) só vê o PDV e as vendas.
  const items = config.useApi && activeStore.role === "Colaborador" ? navigation.filter((item) => item.to === "/pdv" || item.to === "/vendas") : navigation

  const name = session?.user.name ?? "Usuário"
  // No modo compacto, os textos somem só a partir de lg (continuam lidos por leitores de tela).
  const hideText = compact ? "lg:sr-only" : ""

  const handleLogout = async () => {
    await signOut()
    navigate("/login", { replace: true })
  }

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
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r ${compact ? "lg:w-[84px]" : ""} border-[var(--color-border)] bg-[var(--color-nav)] py-6 text-[var(--color-ink)] shadow-2xl transition-transform duration-200 lg:translate-x-0 lg:shadow-none ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`flex items-center justify-between px-6 ${compact ? "lg:justify-center lg:px-0" : ""}`}>
          <Link to="/painel" className="flex items-center gap-3" onClick={onClose} title={compact ? "EstoquePay" : undefined}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-amber)] text-white">
              <Boxes className="h-5 w-5" />
            </span>
            <span className={`leading-tight ${hideText}`}>
              <span className="block text-sm font-extrabold uppercase tracking-[0.14em]">EstoquePay</span>
              <span className="block text-[8px] font-semibold uppercase tracking-[0.14em] text-[var(--color-slate)]">Digital Atelier</span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-lg p-1.5 text-[var(--color-slate)] hover:bg-white lg:hidden"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-9" aria-label="Navegação principal">
          {items.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={label}
              to={to}
              end
              onClick={onClose}
              title={compact ? label : undefined}
              className={({ isActive }) =>
                `flex h-[60px] items-center gap-4 border-l-[3px] px-6 text-[15px] ${compact ? "lg:justify-center lg:px-0" : ""} ${
                  isActive
                    ? "border-[var(--color-amber)] bg-white font-bold text-[var(--color-ink)]"
                    : "border-transparent font-medium text-[var(--color-slate)] hover:bg-white/60 hover:text-[var(--color-ink)]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-5 w-5 ${isActive ? "text-[var(--color-amber)]" : ""}`} />
                  <span className={hideText}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={`mt-auto px-[18px] ${compact ? "lg:px-3" : ""}`}>
          <div className={`rounded-2xl bg-[var(--color-stock-green-soft)] p-4 ${compact ? "lg:p-2.5" : ""}`}>
            <Link to="/perfil" onClick={onClose} aria-label="Meu perfil" title={compact ? `${name} · Meu perfil` : undefined} className={`flex items-center gap-3 rounded-xl transition hover:opacity-80 ${compact ? "lg:justify-center" : ""}`}>
              <Avatar name={name} src={session?.user.image} size={36} />
              <div className={`min-w-0 ${hideText}`}>
                <p className="truncate text-[13px] font-bold">{name}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-slate)]">{activeStore.role}</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              title={compact ? "Encerrar sessão" : undefined}
              className={`mt-3 flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-alert)] ${compact ? "lg:justify-center" : ""}`}
            >
              <span className={hideText}>Encerrar sessão</span>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <p className={`mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-slate)] ${hideText}`}>EstoquePay v1.02.4</p>
        </div>
      </aside>
    </>
  )
}
