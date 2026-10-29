import { Boxes, LayoutDashboard, LogOut, Package, Receipt, Settings, ShoppingCart, Users, X } from "lucide-react"
import { NavLink, Link, useNavigate } from "react-router-dom"

import { useAuth } from "@/auth/useAuth"
import { useStores } from "@/store/useStores"

const navigation = [
  { label: "Painel", icon: LayoutDashboard, to: "/painel" },
  { label: "PDV", icon: ShoppingCart, to: "/pdv" },
  { label: "Estoque", icon: Boxes, to: "/estoque" },
  { label: "Produtos", icon: Package, to: "/produtos" },
  { label: "Clientes", icon: Users, to: "/clientes" },
  { label: "Vendas", icon: Receipt, to: "/vendas" },
  { label: "Ajustes", icon: Settings, to: "/ajustes" },
]

type DashboardSidebarProps = {
  open: boolean
  onClose: () => void
}

export default function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const { activeStore } = useStores()

  const name = session?.user.name ?? "Usuário"
  const initial = name.trim()[0]?.toUpperCase() ?? "U"

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
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[var(--color-border)] bg-[var(--color-nav)] py-6 text-[var(--color-ink)] shadow-2xl transition-transform duration-200 lg:translate-x-0 lg:shadow-none ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-6">
          <Link to="/painel" className="flex items-center gap-3" onClick={onClose}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-amber)] text-white">
              <Boxes className="h-5 w-5" />
            </span>
            <span className="leading-tight">
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
          {navigation.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={label}
              to={to}
              end
              onClick={onClose}
              className={({ isActive }) =>
                `flex h-[60px] items-center gap-4 border-l-[3px] px-6 text-[15px] ${
                  isActive
                    ? "border-[var(--color-amber)] bg-white font-bold text-[var(--color-ink)]"
                    : "border-transparent font-medium text-[var(--color-slate)] hover:bg-white/60 hover:text-[var(--color-ink)]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-5 w-5 ${isActive ? "text-[var(--color-amber)]" : ""}`} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-[18px]">
          <div className="rounded-2xl bg-[var(--color-stock-green-soft)] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-green-100)] text-sm font-bold text-[var(--color-amber)]">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold">{name}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-slate)]">{activeStore.role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-alert)]"
            >
              Encerrar sessão
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-slate)]">EstoquePay v1.02.4</p>
        </div>
      </aside>
    </>
  )
}
