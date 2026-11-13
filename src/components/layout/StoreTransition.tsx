import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"

import { StoreTransitionContext } from "@/components/layout/store-transition"
import { useInventory } from "@/inventory/useInventory"
import { useStores } from "@/store/useStores"

/** Quando a loja muda de fato: com a tela já coberta, para os dados não trocarem à vista. */
const SWAP_AT_MS = 420
/** Tempo mínimo na tela: o suficiente para a cena terminar (a lojinha nova acende e abre). */
const MIN_MS = 2000
const MIN_REDUCED_MS = 1100
/** Se os dados da nova loja demorarem demais, a animação sai mesmo assim: nunca trava a tela. */
const MAX_MS = 8000
const EXIT_MS = 420

type Transition = { id: number; storeId: string; from: string; to: string; reduced: boolean }

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true

/**
 * Troca de loja com uma animação em tela cheia: a fachada da loja atual apaga, o carrinho viaja pela rua
 * até a próxima e entra quando ela abre. Fica na tela até o estoque da nova loja carregar (com limite).
 */
export function StoreTransitionProvider({ children }: { children: ReactNode }) {
  const { stores, activeStore, setActiveStore, isLoading: storesLoading } = useStores()
  const { isLoading: inventoryLoading } = useInventory()
  const [transition, setTransition] = useState<Transition | null>(null)
  const [swapped, setSwapped] = useState(false)
  const [minDone, setMinDone] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const counter = useRef(0)

  const switchStore = useCallback(
    (storeId: string) => {
      const target = stores.find((store) => store.id === storeId)
      // Sem loja de origem (primeira escolha), mesma loja ou animação já rodando: troca direto, sem cena.
      if (!target || !activeStore.id || storeId === activeStore.id || transition) {
        if (!transition) setActiveStore(storeId)
        return
      }
      counter.current += 1
      setSwapped(false)
      setMinDone(false)
      setTimedOut(false)
      setTransition({ id: counter.current, storeId, from: activeStore.name, to: target.name, reduced: prefersReducedMotion() })
    },
    [activeStore.id, activeStore.name, setActiveStore, stores, transition],
  )

  // Linha do tempo da troca: cobre a tela, troca a loja, garante o mínimo e o limite.
  useEffect(() => {
    if (!transition) return
    const timers = [
      window.setTimeout(() => {
        setActiveStore(transition.storeId)
        setSwapped(true)
      }, transition.reduced ? 200 : SWAP_AT_MS),
      window.setTimeout(() => setMinDone(true), transition.reduced ? MIN_REDUCED_MS : MIN_MS),
      window.setTimeout(() => setTimedOut(true), MAX_MS),
    ]
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [transition, setActiveStore])

  const leaving = transition !== null && (timedOut || (swapped && minDone && !storesLoading && !inventoryLoading))

  useEffect(() => {
    if (!leaving) return
    const timer = window.setTimeout(() => setTransition(null), EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [leaving])

  // Durante a animação nada atrás dela responde: nem clique (o overlay cobre tudo) nem teclado, nem rolagem.
  const active = transition !== null
  useEffect(() => {
    if (!active) return
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    const block = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", block, true)
    return () => {
      window.removeEventListener("keydown", block, true)
      document.body.style.overflow = overflow
    }
  }, [active])

  const value = useMemo(() => ({ switchStore, switching: active }), [active, switchStore])

  return (
    <StoreTransitionContext.Provider value={value}>
      {children}
      {/* Sempre montada: leitores de tela anunciam a mudança de texto numa região que já existia. */}
      <p role="status" aria-live="polite" className="sr-only">
        {transition ? `Saindo de ${transition.from}. Entrando em ${transition.to}…` : ""}
      </p>
      {transition && <StoreTransitionOverlay key={transition.id} from={transition.from} to={transition.to} leaving={leaving} />}
    </StoreTransitionContext.Provider>
  )
}

const signName = (name: string) => (name.length > 26 ? `${name.slice(0, 25)}…` : name)

const STRIPES = Array.from({ length: 8 }, (_, index) => index)
const DASHES = Array.from({ length: 42 }, (_, index) => index)

/** Fachada de loja com toldo listrado. `kind` decide se ela está fechando (origem) ou abrindo (destino). */
function Storefront({ x, name, kind }: { x: number; name: string; kind: "from" | "to" }) {
  const stripeWidth = 164 / STRIPES.length
  const radius = stripeWidth / 2
  return (
    <g transform={`translate(${x} 48)`}>
      {/* Corpo e letreiro */}
      <rect x="4" y="34" width="156" height="88" rx="3" className="fill-white stroke-border" strokeWidth="1.5" />
      <rect x="0" y="8" width="164" height="26" rx="5" className="fill-brand-deep" />
      <text x="82" y="25" textAnchor="middle" className="fill-white font-[family-name:var(--font-display)]" fontSize="9.5" fontWeight="800" letterSpacing="0.3">
        {signName(name)}
      </text>

      {/* Toldo: listras verde/branco com a borda recortada em ondas */}
      <g className={kind === "to" ? "st-awning-in" : undefined}>
        {STRIPES.map((index) => {
          const left = index * stripeWidth
          return (
            <path
              key={index}
              d={`M${left} 34 h${stripeWidth} v12 a${radius} ${radius} 0 0 1 ${-stripeWidth} 0 z`}
              className={index % 2 === 0 ? "fill-amber" : "fill-white stroke-green-200"}
              strokeWidth="0.8"
            />
          )
        })}
      </g>

      {/* Vitrine com prateleiras: a luz apaga na loja que fica e acende na que chega */}
      <rect x="14" y="68" width="72" height="44" rx="3" className="fill-paper-dim stroke-border" strokeWidth="1.2" />
      <rect x="15" y="69" width="70" height="42" rx="2.5" className={`fill-green-100 ${kind === "from" ? "st-lights-off" : "st-lights-on"}`} />
      <path d="M18 88 H82 M18 104 H82" className="stroke-green-400" strokeWidth="1.2" strokeOpacity="0.55" />
      <rect x="22" y="78" width="8" height="10" rx="1.5" className="fill-amber" opacity="0.8" />
      <rect x="33" y="80" width="10" height="8" rx="1.5" className="fill-warn" opacity="0.75" />
      <rect x="47" y="76" width="7" height="12" rx="1.5" className="fill-info" opacity="0.6" />
      <rect x="58" y="80" width="12" height="8" rx="1.5" className="fill-green-400" opacity="0.8" />
      <rect x="26" y="96" width="12" height="8" rx="1.5" className="fill-green-400" opacity="0.7" />
      <rect x="42" y="94" width="8" height="10" rx="1.5" className="fill-amber" opacity="0.7" />
      <rect x="54" y="97" width="14" height="7" rx="1.5" className="fill-warn" opacity="0.6" />

      {/* Porta com plaquinha */}
      <rect x="98" y="64" width="50" height="58" rx="3" className="fill-amber" />
      <rect x="106" y="71" width="34" height="22" rx="2" className="fill-white" opacity="0.22" />
      <circle cx="140" cy="98" r="2.2" className="fill-white" />
      {kind === "from" ? (
        <g>
          <path d="M116 93 L123 86 L130 93" fill="none" className="stroke-white" strokeWidth="0.8" />
          <rect x="108" y="93" width="30" height="11" rx="2" className="fill-white" />
          <text x="123" y="100.6" textAnchor="middle" fontSize="5.6" fontWeight="800" className="fill-amber st-sign-old">ABERTO</text>
          <text x="123" y="100.6" textAnchor="middle" fontSize="5.6" fontWeight="800" className="fill-alert st-sign-new">FECHADO</text>
        </g>
      ) : (
        <g className="st-sign-swing">
          <path d="M116 93 L123 86 L130 93" fill="none" className="stroke-white" strokeWidth="0.8" />
          <rect x="108" y="93" width="30" height="11" rx="2" className="fill-white" />
          <text x="123" y="100.6" textAnchor="middle" fontSize="5.6" fontWeight="800" className="fill-amber">ABERTO</text>
        </g>
      )}
      <rect x="94" y="120" width="58" height="3" rx="1.5" className="fill-border" />
    </g>
  )
}

/** A rua com as duas fachadas, cada uma com o nome real no letreiro: a loja que fica e a que chega. */
function StoreScene({ from, to }: { from: string; to: string }) {
  const clipId = useId()
  return (
    <svg viewBox="0 0 360 200" className="st-scene h-auto w-[min(440px,86vw)] drop-shadow-[0_24px_40px_rgba(6,65,44,0.16)]" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clipId}>
          <rect width="360" height="200" rx="22" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="360" height="200" className="fill-stock-green-soft" />
        <circle cx="300" cy="44" r="16" className="fill-green-100" />

        {/* Nuvens andam mais devagar que a rua: dá profundidade à viagem */}
        <g className="st-clouds">
          {[
            [40, 40],
            [230, 26],
            [380, 48],
            [560, 30],
          ].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`} className="fill-white" opacity="0.95">
              <ellipse cx={cx} cy={cy} rx="18" ry="7" />
              <ellipse cx={cx + 10} cy={cy - 5} rx="11" ry="8" />
              <ellipse cx={cx - 8} cy={cy - 3} rx="8" ry="6" />
            </g>
          ))}
        </g>

        {/* A rua inteira: loja de origem, poste e árvore no caminho, loja de destino */}
        <g className="st-track">
          <rect x="-40" y="170" width="960" height="30" className="fill-paper-dim" />
          <rect x="-40" y="169" width="960" height="2" className="fill-border" />
          {DASHES.map((index) => (
            <rect key={index} x={index * 24 - 40} y="184" width="12" height="3" rx="1.5" className="fill-border" />
          ))}

          <Storefront x={98} name={from} kind="from" />

          <rect x="350" y="108" width="4" height="62" rx="2" className="fill-ink-light" />
          <rect x="342" y="104" width="20" height="6" rx="3" className="fill-ink-light" />
          <circle cx="352" cy="114" r="5" className="fill-green-200" />
          <rect x="434" y="140" width="5" height="30" rx="2" className="fill-brand-deep" opacity="0.7" />
          <circle cx="436" cy="132" r="18" className="fill-green-400" opacity="0.55" />
          <circle cx="448" cy="142" r="12" className="fill-green-400" opacity="0.45" />

          <Storefront x={518} name={to} kind="to" />
        </g>

        {/* Brilhinhos quando a loja nova abre */}
        <g className="fill-green-400">
          <path className="st-sparkle" style={{ animationDelay: "1750ms" }} d="M252 92 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" />
          <path className="st-sparkle" style={{ animationDelay: "1850ms" }} d="M266 112 l1.4 3.6 3.6 1.4 -3.6 1.4 -1.4 3.6 -1.4 -3.6 -3.6 -1.4 3.6 -1.4 z" />
          <path className="st-sparkle fill-warn" style={{ animationDelay: "1950ms" }} d="M236 80 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2 z" />
        </g>

        {/* O carrinho fica no centro enquanto a rua passa; no fim ele entra pela porta da loja nova */}
        <g className="st-cart-enter">
          <g className="st-cart-bob">
            <g transform="translate(150 133)">
              <rect x="20" y="-2" width="12" height="10" rx="1.5" className="fill-warn" />
              <path d="M30 8 v-9 a5 5 0 0 1 10 0 v9 z" className="fill-green-400" />
              <path d="M0 2 h7 l6 22" fill="none" className="stroke-ink" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 7 H47 L42 25 H14 Z" className="fill-amber" />
              <path d="M20 7 L21 25 M29 7 V25 M38 7 L36 25 M11 16 H45" className="stroke-white" strokeOpacity="0.45" strokeWidth="1" />
              <path d="M14 29 H43" className="stroke-ink" strokeWidth="2.4" strokeLinecap="round" />
              {[19, 38].map((cx) => (
                <g key={cx} className="st-wheel">
                  <circle cx={cx} cy="32" r="4.5" className="fill-ink" />
                  <path d={`M${cx - 3} 32 H${cx + 3} M${cx} 29 V35`} className="stroke-white" strokeWidth="1" />
                </g>
              ))}
            </g>
          </g>
        </g>
      </g>
    </svg>
  )
}

function StoreTransitionOverlay({ from, to, leaving }: { from: string; to: string; leaving: boolean }) {
  return (
    <div
      className={`st-overlay fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden bg-[var(--color-paper)] px-4 ${leaving ? "st-leaving" : ""}`}
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_35%,rgba(16,185,129,0.14),transparent_70%),radial-gradient(40%_40%_at_85%_90%,rgba(0,108,73,0.08),transparent_70%)]" />
      <div className="st-stage relative flex w-full max-w-xl flex-col items-center text-center">
        <StoreScene from={from} to={to} />
        <div className="st-spinner hidden h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-stock-green-soft)]">
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--color-green-200)] border-t-[var(--color-amber)]" />
        </div>

        <p className="st-from mt-8 max-w-full truncate text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-slate)]">
          Saindo de {from}
        </p>
        <h2 className="st-to mt-2 max-w-full font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
          Entrando em <span className="text-[var(--color-amber)]">{to}</span>
          <span className="st-dots inline-flex w-6 justify-start" aria-hidden="true">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </h2>
        <p className="st-to mt-2 text-sm text-[var(--color-slate)]">Arrumando a vitrine: estoque, vendas e caixa desta loja.</p>
        <div className="st-to st-progress-track mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-[var(--color-green-100)]">
          <span className="st-progress block h-full w-1/3 rounded-full bg-[var(--color-amber)]" />
        </div>
      </div>
    </div>
  )
}
