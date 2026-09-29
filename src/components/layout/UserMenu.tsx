import { ChevronDown, LogOut, UserRound } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { useAuth } from "@/auth/AuthContext"

export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { session, signOut } = useAuth()

  const name = session?.user.name ?? "Usuário"
  const email = session?.user.email ?? ""
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  const handleLogout = async () => {
    await signOut()
    navigate("/login", { replace: true })
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-2.5 py-2 text-left shadow-sm transition hover:border-[var(--color-amber)]/30"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-ink)] text-xs font-semibold text-white">
          {initials || <UserRound className="h-4 w-4" />}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-[140px] truncate text-xs font-semibold text-[var(--color-ink)]">{name}</span>
          <span className="block max-w-[140px] truncate text-[11px] text-[var(--color-slate)]">{email}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-[var(--color-slate)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <button type="button" aria-label="Fechar menu do usuário" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-[var(--color-border)] bg-white p-2 shadow-[0_20px_50px_rgba(13,28,46,0.14)]">
            <div className="rounded-xl bg-[var(--color-paper)] px-3 py-3">
              <p className="text-xs font-semibold text-[var(--color-ink)]">Sessão ativa</p>
              <p className="mt-1 text-xs leading-5 text-[var(--color-slate)]">Sua sessão permanece disponível enquanto a autenticação estiver válida.</p>
            </div>
            <button type="button" onClick={handleLogout} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-alert)] transition hover:bg-[var(--color-alert-soft)]">
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </div>
        </>
      )}
    </div>
  )
}
