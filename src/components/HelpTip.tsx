import { CircleHelp } from "lucide-react"
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

type HelpTipProps = {
  /** Explicação curta (1–3 frases). Pode vir como filho: <HelpTip>texto</HelpTip>. */
  text?: ReactNode
  children?: ReactNode
  /** Nome do campo, para o leitor de tela anunciar "Ajuda sobre {label}". */
  label?: string
  className?: string
}

const GAP = 8
const MARGIN = 8

/**
 * Ícone "?" que mostra uma dica curta ao passar o mouse, focar pelo teclado ou tocar no celular.
 * O balão vai para o `body` (portal) com posição fixa, então nenhum container com overflow o corta.
 */
export default function HelpTip({ text, children, label, className }: HelpTipProps) {
  const content = text ?? children
  const id = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const lastPointer = useRef("")
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // Posiciona acima do ícone (ou abaixo, se não couber), sempre dentro da tela.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const anchor = buttonRef.current?.getBoundingClientRect()
      const tip = tipRef.current
      if (!anchor || !tip) return
      const { width, height } = tip.getBoundingClientRect()
      const left = Math.min(Math.max(anchor.left + anchor.width / 2 - width / 2, MARGIN), window.innerWidth - width - MARGIN)
      const above = anchor.top - height - GAP
      const top = above >= MARGIN ? above : anchor.bottom + GAP
      setPos({ top, left })
    }
    place()
    window.addEventListener("resize", place)
    window.addEventListener("scroll", place, true)
    return () => {
      window.removeEventListener("resize", place)
      window.removeEventListener("scroll", place, true)
    }
  }, [open])

  // Fecha com Esc ou ao tocar/clicar fora.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!buttonRef.current?.contains(target) && !tipRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onDown)
    }
  }, [open])

  if (!content) return null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label ? `Ajuda sobre ${label}` : "Ajuda"}
        aria-describedby={open ? id : undefined}
        onPointerDown={(event) => {
          lastPointer.current = event.pointerType
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setOpen(true)
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse" && document.activeElement !== buttonRef.current) setOpen(false)
        }}
        onFocus={() => {
          // No toque quem abre/fecha é o clique; aqui é só o foco pelo teclado.
          if (lastPointer.current !== "touch" && lastPointer.current !== "pen") setOpen(true)
        }}
        onBlur={() => setOpen(false)}
        onClick={(event) => {
          event.preventDefault()
          if (lastPointer.current !== "mouse") setOpen((current) => !current)
          lastPointer.current = ""
        }}
        className={cn(
          "inline-flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full text-[var(--color-slate)] transition hover:text-[var(--color-ink)] focus-visible:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-green-500)]/40",
          className,
        )}
      >
        <CircleHelp className="h-4 w-4" aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? "visible" : "hidden" }}
            className="fixed z-[95] w-max max-w-[min(280px,calc(100vw-16px))] rounded-xl bg-[var(--color-ink)] px-3.5 py-2.5 text-[13px] font-normal normal-case leading-5 tracking-normal text-white shadow-[0_12px_32px_rgba(13,28,46,0.25)]"
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  )
}
