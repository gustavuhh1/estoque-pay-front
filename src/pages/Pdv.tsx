import { Bell, Check, Clock, LayoutGrid, List, Minus, Package, Plus, Search, ShoppingCart, Trash2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { Link } from "react-router-dom"

import { useAuth } from "@/auth/useAuth"
import PdvCheckout from "@/components/pdv/PdvCheckout"
import PdvHelp from "@/components/pdv/PdvHelp"
import { Button } from "@/components/ui/button"
import { formatBRL, formatQuantity, normalizeText } from "@/lib/format"
import { lineTotalCents, roundQty } from "@/inventory/logic"
import { isFractionalUnit, type Product } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"
import { openShift, readShifts } from "@/caixa/caixa"
import { useStores } from "@/store/useStores"

type CartLine = { productId: string; quantity: number }
type ViewMode = "blocos" | "lista"

const STATUS = ["SEFAZ online", "Impressora conectada", "Leitor conectado"]
const label = "text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-slate)]"

/** Passo do botão +/−: unidades inteiras ou décimos para produtos fracionados. */
const stepOf = (product: Product) => (isFractionalUnit(product.unit) ? 0.1 : 1)

function Clock24() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20_000)
    return () => clearInterval(id)
  }, [])
  const hh = String(now.getHours()).padStart(2, "0")
  const mm = String(now.getMinutes()).padStart(2, "0")
  return (
    <span className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-base font-semibold">
      <Clock className="h-[17px] w-[17px] text-[var(--color-slate)]" />
      {hh}:{mm}
    </span>
  )
}

/** Foto do produto, ou um ícone quando ele não tem foto. */
function ProductImage({ product, iconClass }: { product: Product; iconClass: string }) {
  return product.image ? (
    <img src={product.image} alt="" loading="lazy" className="h-full w-full object-cover" />
  ) : (
    <Package className={iconClass} />
  )
}

function StockBadge({ product }: { product: Product }) {
  const out = product.stock <= 0
  const low = !out && product.stock <= product.minStock
  const tone = out
    ? "bg-[var(--color-ink)] text-white"
    : low
      ? "bg-[var(--color-warn-soft)] text-[var(--color-warn)] border border-[#fde68a]"
      : "bg-[var(--color-nav)] text-[var(--color-slate)]"
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${tone}`}>
      {out ? "Sem estoque" : `${formatQuantity(product.stock)} ${product.unit}`}
    </span>
  )
}

export default function Pdv() {
  const { session } = useAuth()
  const { activeStore } = useStores()
  const { products } = useInventory()
  const searchRef = useRef<HTMLInputElement>(null)

  const [category, setCategory] = useState("Todos")
  const [mode, setMode] = useState<ViewMode>("blocos")
  const [query, setQuery] = useState("")
  const [cart, setCart] = useState<CartLine[]>([])
  const [message, setMessage] = useState("")
  const [paying, setPaying] = useState(false)
  // O PDV só vende com o caixa (turno) aberto; a abertura fica na tela de Vendas.
  const [cashOpen] = useState(() => Boolean(openShift(readShifts(activeStore.id))))
  const [helpOpen, setHelpOpen] = useState(false)

  const active = useMemo(() => products.filter((product) => product.active), [products])
  const categories = useMemo(() => ["Todos", ...new Set(active.map((product) => product.category))], [active])
  const byId = (id: string) => products.find((product) => product.id === id)

  const list = useMemo(() => {
    const term = normalizeText(query)
    return active.filter(
      (product) => (category === "Todos" || product.category === category) && normalizeText(`${product.name} ${product.sku} ${product.ean}`).includes(term),
    )
  }, [active, category, query])

  const total = cart.reduce((sum, line) => sum + lineTotalCents(byId(line.productId)?.priceCents ?? 0, line.quantity), 0)
  const units = roundQty(cart.reduce((sum, line) => sum + line.quantity, 0))

  // F2 leva o foco para a busca (o leitor de código de barras digita ali).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function add(product: Product, amount = 1) {
    const inCart = cart.find((line) => line.productId === product.id)?.quantity ?? 0
    const remaining = roundQty(product.stock - inCart)
    if (remaining <= 0) return setMessage(`Sem estoque disponível de "${product.name}".`)
    const quantity = Math.min(amount, remaining)
    setMessage("")
    setCart((current) =>
      current.some((line) => line.productId === product.id)
        ? current.map((line) => (line.productId === product.id ? { ...line, quantity: roundQty(line.quantity + quantity) } : line))
        : [...current, { productId: product.id, quantity }],
    )
  }

  function change(product: Product, direction: 1 | -1) {
    if (direction === 1) return add(product, stepOf(product))
    setCart((current) =>
      current.flatMap((line) => {
        if (line.productId !== product.id) return [line]
        const next = roundQty(line.quantity - stepOf(product))
        return next <= 0 ? [] : [{ ...line, quantity: next }]
      }),
    )
  }

  // Leitor de código: Enter com um EAN ou SKU exato coloca o produto no carrinho.
  function onSearchEnter() {
    const code = query.trim().toLowerCase()
    if (!code) return
    const exact = active.find((product) => product.ean === code || product.sku.toLowerCase() === code)
    if (exact) {
      add(exact)
      setQuery("")
    }
  }

  const name = session?.user.name ?? "Usuário"

  return (
    <div className="flex h-screen min-w-0 flex-col">
      <header className="flex h-[84px] shrink-0 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-white px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-[18px]">
          <span className="flex flex-col gap-0.5">
            <span className={label}>PDV</span>
            <strong className="whitespace-nowrap text-lg font-bold">{cart.length > 0 ? "Venda em andamento" : "Nenhuma venda aberta"}</strong>
          </span>
          <span className="h-[34px] w-px bg-[var(--color-border)]" />
          <Clock24 />
        </div>
        <div className="flex items-center gap-4">
          <button type="button" aria-label="Notificações" className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-slate)] hover:bg-[var(--color-nav)]">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[var(--color-alert)]" />
          </button>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-green-100)] text-base font-bold text-[var(--color-amber)]" title={`${name} · ${activeStore.role}`}>
            {name.trim()[0]?.toUpperCase() ?? "U"}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-col gap-4 border-b border-[var(--color-border)] bg-[var(--color-paper)] px-6 pb-[18px] pt-6 lg:px-10">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && onSearchEnter()}
                aria-label="Buscar produto por nome ou código de barras"
                placeholder="Bipe o código de barras ou digite o nome do produto"
                className="h-12 w-full rounded-xl bg-[var(--color-nav)] pl-11 pr-14 text-sm font-medium outline-none placeholder:text-[var(--color-slate)] focus-visible:ring-2 focus-visible:ring-[var(--color-green-500)]/35"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-white px-2 py-0.5 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-slate)]">F2</kbd>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap gap-2.5">
                {categories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`min-h-11 rounded-full border px-5 text-[15px] font-bold transition ${
                      category === item
                        ? "border-[var(--color-amber)] bg-[var(--color-amber)] text-white"
                        : "border-[var(--color-border)] bg-white hover:border-[var(--color-green-500)]/50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-dim)] p-1">
                {([
                  ["blocos", LayoutGrid, "Blocos"],
                  ["lista", List, "Lista"],
                ] as const).map(([id, Icon, text]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={mode === id}
                    onClick={() => setMode(id)}
                    className={`flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-[13px] font-bold ${mode === id ? "bg-white shadow-xs" : "text-[var(--color-slate)]"}`}
                  >
                    <Icon className={`h-[17px] w-[17px] ${mode === id ? "text-[var(--color-amber)]" : ""}`} />
                    {text}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-7 pt-5 lg:px-10">
            {!cashOpen && (
              <p role="alert" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[var(--color-warn-soft)] px-4 py-3 text-sm font-medium text-[var(--color-warn)]">
                Caixa fechado: abra o caixa para registrar vendas.
                <Link to="/vendas" className="font-bold underline">
                  Ir para Vendas
                </Link>
              </p>
            )}
            {message && (
              <p role="alert" className="mb-4 rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
                {message}
              </p>
            )}
            {list.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-nav)] text-[var(--color-slate)]">
                  <Search className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-lg font-bold">Nenhum produto encontrado</h2>
                <p className="mt-1 text-sm text-[var(--color-slate)]">Confira o nome ou tente outra categoria.</p>
              </div>
            ) : mode === "lista" ? (
              <div className="flex flex-col gap-2">
                {list.map((product) => {
                  const out = product.stock <= 0
                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={out}
                      onClick={() => add(product)}
                      className={`flex min-h-[72px] items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-left transition hover:border-[var(--color-green-500)]/50 ${out ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-paper-dim)] text-[var(--color-slate)]">
                        <ProductImage product={product} iconClass="h-[22px] w-[22px]" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <strong className="truncate text-[15px]">{product.name}</strong>
                        <span className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-slate)]">{product.ean || product.sku}</span>
                      </span>
                      <StockBadge product={product} />
                      <strong className="min-w-24 text-right text-xl font-extrabold text-[var(--color-amber)]">{formatBRL(product.priceCents)}</strong>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${out ? "bg-[var(--color-paper-dim)] text-[var(--color-slate)]" : "bg-[var(--color-amber)] text-white"}`}>
                        <Plus className="h-5 w-5" />
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(165px,1fr))] gap-3.5">
                {list.map((product) => {
                  const out = product.stock <= 0
                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={out}
                      onClick={() => add(product)}
                      className={`flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white text-left shadow-sm transition hover:border-[var(--color-green-500)]/50 ${out ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <span className="relative flex h-[104px] items-center justify-center overflow-hidden bg-[var(--color-paper-dim)] text-[var(--color-slate)]">
                        <ProductImage product={product} iconClass="h-[34px] w-[34px]" />
                        <span className="absolute left-2.5 top-2.5">
                          <StockBadge product={product} />
                        </span>
                      </span>
                      <span className="flex flex-1 flex-col gap-2.5 px-3.5 pb-4 pt-3.5">
                        <strong className="text-[15px] leading-[1.3]">{product.name}</strong>
                        <span className="mt-auto flex items-center justify-between gap-1.5">
                          <strong className="text-[19px] font-extrabold text-[var(--color-amber)]">{formatBRL(product.priceCents)}</strong>
                          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${out ? "bg-[var(--color-paper-dim)] text-[var(--color-slate)]" : "bg-[var(--color-amber)] text-white"}`}>
                            <Plus className="h-5 w-5" />
                          </span>
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="hidden w-[360px] shrink-0 flex-col border-l border-[var(--color-border)] bg-white md:flex">
          <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-6 pb-4 pt-6">
            <span className="flex flex-col gap-0.5">
              <h2 className="text-[26px] font-bold leading-tight">Carrinho</h2>
              <span className={label}>
                {formatQuantity(units)} {units === 1 ? "item" : "itens"}
              </span>
            </span>
            {cart.length > 0 && (
              <Button variant="ghost" onClick={() => setCart([])}>
                <Trash2 className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </header>

          <div className="flex min-h-40 flex-1 flex-col gap-2.5 overflow-y-auto px-5 py-4">
            {cart.length === 0 ? (
              <div className="m-auto flex flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-nav)] text-[var(--color-slate)]">
                  <ShoppingCart className="h-6 w-6" />
                </span>
                <h3 className="mt-3 text-base font-bold">Nada no carrinho</h3>
                <p className="mt-1 text-sm text-[var(--color-slate)]">Toque em um produto ao lado para começar a venda.</p>
              </div>
            ) : (
              cart.map((line) => {
                const product = byId(line.productId)
                if (!product) return null
                return (
                  <div key={line.productId} className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2.5">
                    <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-paper-dim)] text-[var(--color-slate)]">
                      <ProductImage product={product} iconClass="h-5 w-5" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <strong className="truncate text-[13px]">{product.name}</strong>
                      <span className="text-[13px] text-[var(--color-slate)]">
                        {formatQuantity(line.quantity)} × {formatBRL(product.priceCents)}
                      </span>
                      <strong className="text-[15px] text-[var(--color-amber)]">{formatBRL(lineTotalCents(product.priceCents, line.quantity))}</strong>
                    </span>
                    <span className="flex flex-col items-center overflow-hidden rounded-xl bg-[var(--color-nav)]">
                      <button type="button" aria-label={`Aumentar ${product.name}`} onClick={() => change(product, 1)} className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-ink)]">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-6 text-center text-[13px] font-bold tabular-nums">{formatQuantity(line.quantity)}</span>
                      <button type="button" aria-label={`Diminuir ${product.name}`} onClick={() => change(product, -1)} className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-ink)]">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                )
              })
            )}
          </div>

          <div className="border-t border-[var(--color-border)] px-6 pb-24 pt-[18px]">
            <div className={`mb-2.5 flex justify-between ${label}`}>
              <span>Subtotal</span>
              <span>{formatBRL(total)}</span>
            </div>
            <div className="mb-4 flex items-baseline justify-between">
              <span className={`${label} text-[var(--color-ink)]`}>Total</span>
              <strong className="text-[38px] font-extrabold tracking-[-0.03em] text-[var(--color-amber)]">{formatBRL(total)}</strong>
            </div>
            <Button variant="accent" size="lg" className="w-full uppercase tracking-[0.08em]" disabled={cart.length === 0 || !cashOpen} onClick={() => setPaying(true)}>
              <Check className="h-4 w-4" />
              Cobrar
            </Button>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--color-border)] pt-3.5">
              {STATUS.map((item) => (
                <span key={item} className="flex items-center gap-[7px] whitespace-nowrap text-[13px] text-[var(--color-slate)]">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-amber)]" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <button
        type="button"
        aria-label="Ajuda do PDV"
        title="Ajuda do PDV"
        onClick={() => setHelpOpen(true)}
        className="fixed bottom-[26px] right-[26px] z-40 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-amber)] text-[30px] font-extrabold leading-none text-white shadow-[0_12px_28px_rgba(0,0,0,0.26)]"
      >
        ?
      </button>

      <PdvHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      {paying && (
        <PdvCheckout
          cart={cart}
          totalCents={total}
          onClose={() => setPaying(false)}
          onFinish={() => {
            setPaying(false)
            setCart([])
          }}
        />
      )}
    </div>
  )
}
