import { Check, CircleHelp, Clock, LayoutGrid, List, Minus, Package, Plus, ScanBarcode, Search, ShoppingCart, Trash2, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { Link } from "react-router-dom"

import CategoryScroller from "@/components/CategoryScroller"
import PdvCheckout from "@/components/pdv/PdvCheckout"
import PdvCheckoutApi from "@/components/pdv/PdvCheckoutApi"
import PdvHelp from "@/components/pdv/PdvHelp"
import { Button } from "@/components/ui/button"
import { formatBRL, formatQuantity, normalizeText } from "@/lib/format"
import { lineTotalCents, roundQty } from "@/inventory/logic"
import { isFractionalUnit, type Product } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"
import { useCash } from "@/caixa/useCash"
import { config } from "@/config"
import { searchProducts } from "@/pdv/pdvApi"
import { beep } from "@/scanner/beep"
import { useBarcodeScanner } from "@/scanner/useBarcodeScanner"
import { useStores } from "@/store/useStores"

type CartLine = { productId: string; quantity: number }
type ViewMode = "blocos" | "lista"

// Sem SEFAZ: a NFC-e é simulada (D3).
const STATUS = ["Impressora conectada", "Leitor conectado"]
const label = "text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-slate)]"

/** Produto cujo código de barras (EAN) ou SKU é exatamente o código lido/digitado. */
const findByCode = (products: Product[], code: string) => {
  const wanted = code.trim().toLowerCase()
  return wanted ? products.find((product) => product.ean.toLowerCase() === wanted || product.sku.toLowerCase() === wanted) : undefined
}

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

const Checkout = config.useApi ? PdvCheckoutApi : PdvCheckout

export default function Pdv() {
  const { activeStore } = useStores()
  const { products, isLoading } = useInventory()
  const searchRef = useRef<HTMLInputElement>(null)

  const [category, setCategory] = useState("Todos")
  const [mode, setMode] = useState<ViewMode>("blocos")
  const [query, setQuery] = useState("")
  const [cart, setCart] = useState<CartLine[]>([])
  const [message, setMessage] = useState("")
  const [paying, setPaying] = useState(false)
  // O PDV só vende com o caixa (turno) aberto; a abertura fica na tela de Vendas.
  const cash = useCash()
  const cashOpen = Boolean(cash.shift)
  const [helpOpen, setHelpOpen] = useState(false)
  // Abaixo de md o carrinho fica escondido atrás da barra do total e abre em tela cheia.
  const [cartOpen, setCartOpen] = useState(false)

  // Com a API o Caixa não lista produtos (403): ele vende pela busca do PDV, por nome ou código de barras.
  const remoteOnly = config.useApi && activeStore.role === "Colaborador"
  const [remote, setRemote] = useState<Product[]>([])
  const [known, setKnown] = useState<Record<string, Product>>({})
  const term = query.trim()
  useEffect(() => {
    if (!remoteOnly || !term) return
    const timer = setTimeout(() => {
      searchProducts(term).then(
        (found) => {
          setRemote(found)
          setKnown((current) => ({ ...current, ...Object.fromEntries(found.map((product) => [product.id, product])) }))
        },
        () => setRemote([]),
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [remoteOnly, term])

  const source = useMemo(() => (remoteOnly ? (term ? remote : []) : products), [remoteOnly, term, remote, products])
  const active = useMemo(() => source.filter((product) => product.active), [source])
  const categories = useMemo(() => ["Todos", ...new Set(active.map((product) => product.category).filter(Boolean))], [active])
  const byId = (id: string) => known[id] ?? products.find((product) => product.id === id)

  // Produtos que batem com a busca (antes do filtro de categoria): base da lista e da contagem em cada categoria.
  const matching = useMemo(() => {
    const term = remoteOnly ? "" : normalizeText(query)
    return active.filter((product) => normalizeText(`${product.name} ${product.sku} ${product.ean}`).includes(term))
  }, [active, query, remoteOnly])
  const counts = useMemo(() => {
    const result: Record<string, number> = { Todos: matching.length }
    for (const product of matching) result[product.category] = (result[product.category] ?? 0) + 1
    return result
  }, [matching])
  const list = useMemo(() => (category === "Todos" ? matching : matching.filter((product) => product.category === category)), [matching, category])

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
    if (remaining <= 0) {
      setMessage(`Sem estoque disponível de "${product.name}".`)
      return false
    }
    const quantity = Math.min(amount, remaining)
    setMessage("")
    setCart((current) =>
      current.some((line) => line.productId === product.id)
        ? current.map((line) => (line.productId === product.id ? { ...line, quantity: roundQty(line.quantity + quantity) } : line))
        : [...current, { productId: product.id, quantity }],
    )
    return true
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

  // Enter com um EAN ou SKU exato digitado na busca coloca o produto no carrinho.
  function onSearchEnter() {
    const exact = findByCode(active, query)
    if (exact) {
      add(exact)
      setQuery("")
    }
  }

  // Leitor de código de barras: bipou, entrou no carrinho, com o foco em qualquer lugar da tela.
  // O Caixa não tem a lista de produtos (API), então a leitura consulta a busca da API na hora.
  const [scanned, setScanned] = useState<{ text: string; ok: boolean; at: number } | null>(null)
  useEffect(() => {
    if (!scanned) return
    const timer = setTimeout(() => setScanned(null), 2500)
    return () => clearTimeout(timer)
  }, [scanned])

  async function onScan(code: string) {
    let found = findByCode(remoteOnly ? [] : source, code)
    if (remoteOnly) {
      const remoteFound = await searchProducts(code).catch(() => [])
      setKnown((current) => ({ ...current, ...Object.fromEntries(remoteFound.map((product) => [product.id, product])) }))
      found = findByCode(remoteFound, code)
    }
    const fail = (text: string) => {
      beep("erro")
      setScanned({ text, ok: false, at: Date.now() })
    }
    if (!found) return fail(`Código ${code} não cadastrado.`)
    if (!found.active) return fail(`${found.name} está inativo.`)
    if (!add(found)) return fail(`Sem estoque de ${found.name}.`)
    beep("ok")
    setScanned({ text: `${found.name} adicionado`, ok: true, at: Date.now() })
  }
  useBarcodeScanner((code) => void onScan(code), { enabled: !paying && !helpOpen })

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-w-0 flex-col">
      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Barra única do PDV: busca, modo de exibição, ajuda e relógio na mesma linha; categorias rolando na horizontal logo abaixo. */}
          <div className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-paper)] px-4 pb-3 pt-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2.5">
            <div className="relative min-w-0 flex-1">
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
              <div className="hidden shrink-0 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-dim)] p-1 sm:flex">
                {([
                  ["blocos", LayoutGrid, "Blocos"],
                  ["lista", List, "Lista"],
                ] as const).map(([id, Icon, text]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={mode === id}
                    aria-label={`Ver em ${text.toLowerCase()}`}
                    title={text}
                    onClick={() => setMode(id)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${mode === id ? "bg-white text-[var(--color-amber)] shadow-xs" : "text-[var(--color-slate)] hover:text-[var(--color-ink)]"}`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-label="Ajuda do PDV"
                title="Ajuda do PDV"
                onClick={() => setHelpOpen(true)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-slate)] transition hover:text-[var(--color-ink)]"
              >
                <CircleHelp className="h-5 w-5" />
              </button>
              <span className="hidden shrink-0 pl-1 lg:block">
                <Clock24 />
              </span>
            </div>

            <CategoryScroller items={categories} counts={counts} active={category} onSelect={setCategory} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-4 sm:px-6 md:pb-6 lg:px-8">
            {/* Retorno do leitor: flutua no topo da lista (sem ocupar espaço nem cobrir a busca). */}
            <div className="pointer-events-none sticky top-0 z-10 -mb-11 flex h-11 justify-center">
              {scanned && (
                <p
                  key={scanned.at}
                  role="status"
                  className={`search-item-enter flex max-w-full items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold shadow-[0_10px_30px_rgba(13,28,46,0.14)] ${
                    scanned.ok
                      ? "border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] text-[var(--color-amber-dark)]"
                      : "border-[var(--color-alert)]/20 bg-[var(--color-alert-soft)] text-[var(--color-alert-dark)]"
                  }`}
                >
                  <ScanBarcode className="h-4 w-4 shrink-0" />
                  <span className="truncate">{scanned.text}</span>
                </p>
              )}
            </div>
            {!cashOpen && !cash.isLoading && (
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
                <h2 className="mt-4 text-lg font-bold">{remoteOnly && !term ? "Busque um produto" : isLoading ? "Carregando produtos..." : "Nenhum produto encontrado"}</h2>
                <p className="mt-1 text-sm text-[var(--color-slate)]">
                  {remoteOnly && !term ? "Digite o nome ou bipe o código de barras." : isLoading ? "A primeira abertura pode levar até 1 minuto." : "Confira o nome ou tente outra categoria."}
                </p>
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
                      data-product-card
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

        <aside
          className={`${cartOpen ? "fixed inset-0 z-50 flex" : "hidden"} w-full shrink-0 flex-col border-l border-[var(--color-border)] bg-white md:static md:z-auto md:flex md:w-[340px] xl:w-[380px]`}
        >
          <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
            <span className="flex items-baseline gap-2.5">
              <h2 className="text-xl font-bold leading-tight">Carrinho</h2>
              <span className={label}>
                {formatQuantity(units)} {units === 1 ? "item" : "itens"}
              </span>
            </span>
            <span className="flex items-center gap-1">
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                  <Trash2 className="h-4 w-4" />
                  Limpar
                </Button>
              )}
              <button type="button" aria-label="Fechar carrinho" onClick={() => setCartOpen(false)} className="rounded-lg p-2 text-[var(--color-slate)] hover:bg-[var(--color-paper)] md:hidden">
                <X className="h-5 w-5" />
              </button>
            </span>
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

          <div className="border-t border-[var(--color-border)] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
            <div className="mb-4 flex items-baseline justify-between">
              <span className={`${label} text-[var(--color-ink)]`}>Total</span>
              <strong className="text-[38px] font-extrabold tracking-[-0.03em] text-[var(--color-amber)]">{formatBRL(total)}</strong>
            </div>
            <Button variant="accent" size="lg" className="w-full uppercase tracking-[0.08em]" disabled={cart.length === 0 || !cashOpen} onClick={() => setPaying(true)}>
              <Check className="h-4 w-4" />
              Cobrar
            </Button>
            <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {STATUS.map((item) => (
                <span key={item} className="flex items-center gap-[7px] whitespace-nowrap text-[12px] text-[var(--color-slate)]">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-amber)]" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Celular/tablet: o carrinho vira uma barra fixa com o total; tocar abre o carrinho em tela cheia. */}
      {!cartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-[var(--color-border)] bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(13,28,46,0.08)] md:hidden">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={label}>
              {formatQuantity(units)} {units === 1 ? "item" : "itens"}
            </span>
            <strong className="text-2xl font-extrabold tracking-[-0.02em] text-[var(--color-amber)]">{formatBRL(total)}</strong>
          </span>
          <Button variant="accent" size="lg" className="uppercase tracking-[0.08em]" disabled={cart.length === 0} onClick={() => setCartOpen(true)}>
            <ShoppingCart className="h-4 w-4" />
            Ver carrinho
          </Button>
        </div>
      )}

      <PdvHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      {paying && (
        <Checkout
          cart={cart}
          totalCents={total}
          onClose={() => setPaying(false)}
          onFinish={() => {
            setPaying(false)
            setCartOpen(false)
            setCart([])
          }}
        />
      )}
    </div>
  )
}
