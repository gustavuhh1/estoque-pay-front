import { Ban, Bell, BellOff, CheckCheck, Clock, PackageX, QrCode, TriangleAlert, Wallet, type LucideIcon } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import { formatRelativeTime, useNotifications, type AppNotification, type NotificationType } from "@/notifications/useNotifications"

/** Ícone e cores de cada tipo de aviso (tons do próprio design system). */
const TYPE_STYLE: Record<NotificationType, { icon: LucideIcon; tone: string; label: string }> = {
  ESTOQUE_BAIXO: { icon: TriangleAlert, tone: "bg-[var(--color-warn-soft)] text-[var(--color-warn)]", label: "Estoque baixo" },
  ESTOQUE_ZERADO: { icon: PackageX, tone: "bg-[var(--color-alert-soft)] text-[var(--color-alert)]", label: "Estoque zerado" },
  VENDA_CANCELADA: { icon: Ban, tone: "bg-[var(--color-paper-dim)] text-[var(--color-body)]", label: "Venda cancelada" },
  PIX_CONFIRMADO: { icon: QrCode, tone: "bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]", label: "Pix confirmado" },
  PIX_PENDENTE: { icon: Clock, tone: "bg-[var(--color-info-soft)] text-[var(--color-info)]", label: "Pix pendente" },
  CAIXA_DIFERENCA: { icon: Wallet, tone: "bg-[var(--color-info-soft)] text-[var(--color-info)]", label: "Caixa" },
}

function NotificationItem({ item, onOpen }: { item: AppNotification; onOpen: (item: AppNotification) => void }) {
  const style = TYPE_STYLE[item.type]
  const Icon = style.icon
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className={`group relative flex w-full gap-3 rounded-xl px-3 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-amber)] ${item.read ? "hover:bg-[var(--color-paper)]" : "bg-[var(--color-stock-green-soft)]/60 hover:bg-[var(--color-stock-green-soft)]"}`}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.tone}`} aria-hidden="true">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span className={`min-w-0 flex-1 text-[13px] leading-snug text-[var(--color-ink)] ${item.read ? "font-medium" : "font-bold"}`}>{item.title}</span>
            <time dateTime={new Date(item.createdAt).toISOString()} title={new Date(item.createdAt).toLocaleString("pt-BR")} className="shrink-0 pt-px text-[11px] text-[var(--color-faint)]">
              {formatRelativeTime(item.createdAt)}
            </time>
          </span>
          <span className={`mt-0.5 block text-xs leading-relaxed ${item.read ? "text-[var(--color-slate)]" : "text-[var(--color-body)]"}`}>{item.message}</span>
        </span>
        {!item.read && (
          <>
            <span className="absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[var(--color-amber)]" aria-hidden="true" />
            <span className="sr-only">(não lida)</span>
          </>
        )}
      </button>
    </li>
  )
}

/** Sininho do topo: badge com as não lidas e painel com a lista de avisos da loja. */
export default function NotificationsMenu() {
  const { items, unread, isLoading, error, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const titleId = useId()
  const navigate = useNavigate()
  // Atualiza o "há 5 min" enquanto o painel está aberto.
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const timer = window.setInterval(() => setTick((value) => value + 1), 60_000)
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    // Foco no painel para leitores de tela anunciarem o título e o Tab seguir pela lista.
    panelRef.current?.focus()
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  function openItem(item: AppNotification) {
    if (!item.read) markRead(item.id)
    setOpen(false)
    if (item.link) navigate(item.link)
  }

  const badge = unread > 9 ? "9+" : String(unread)
  const label = unread > 0 ? `Notificações (${unread} não ${unread === 1 ? "lida" : "lidas"})` : "Notificações"

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title="Notificações"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-slate)] transition hover:bg-[var(--color-nav)] hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-[var(--color-amber)] ${open ? "bg-[var(--color-nav)] text-[var(--color-ink)]" : ""}`}
      >
        <Bell className={`h-5 w-5 ${unread > 0 && !open ? "origin-top motion-safe:animate-[bell-ring_1.2s_ease-in-out_1]" : ""}`} />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-alert)] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="notifications-enter fixed inset-x-3 top-[68px] z-40 flex max-h-[min(560px,calc(100dvh-84px))] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_20px_50px_rgba(13,28,46,0.16)] outline-none sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[380px]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-sm font-bold text-[var(--color-ink)]">Notificações</h2>
              <p className="text-[11px] text-[var(--color-slate)]" aria-live="polite">
                {unread > 0 ? `${unread} não ${unread === 1 ? "lida" : "lidas"}` : "Tudo em dia"}
              </p>
            </div>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-amber-dark)] transition hover:bg-[var(--color-stock-green-soft)] focus-visible:outline-2 focus-visible:outline-[var(--color-amber)]">
                <CheckCheck className="h-4 w-4" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {isLoading ? (
              <ul className="space-y-1" aria-label="Carregando notificações">
                {[0, 1, 2].map((index) => (
                  <li key={index} className="flex gap-3 px-3 py-3">
                    <span className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-[var(--color-paper-dim)]" />
                    <span className="flex-1 space-y-2 pt-1">
                      <span className="block h-3 w-2/3 animate-pulse rounded bg-[var(--color-paper-dim)]" />
                      <span className="block h-3 w-full animate-pulse rounded bg-[var(--color-paper-dim)]" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]">
                  <BellOff className="h-6 w-6" />
                </span>
                <p className="mt-4 text-sm font-bold text-[var(--color-ink)]">{error ? "Não foi possível carregar" : "Nenhuma notificação por aqui"}</p>
                <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-[var(--color-slate)]">
                  {error ?? "Avisamos quando um produto ficar abaixo do mínimo, um Pix for confirmado, uma venda for cancelada ou o caixa fechar com diferença."}
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {items.map((item) => (
                  <NotificationItem key={item.id} item={item} onOpen={openItem} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
