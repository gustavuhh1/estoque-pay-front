import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { ArrowRight, Package, Search } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { formatBRL, formatQuantity, normalizeText } from "@/lib/format"
import { stockStatus } from "@/inventory/logic"
import type { Product } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"

const MAX_RESULTS = 5

/** Sem acentos e em minúsculas, mantendo o comprimento do texto para achar o trecho a destacar. */
const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR")

/** Nome que começa com o termo vem antes de nome que só contém o termo, e esse antes de SKU/código de barras. */
function rank(product: Product, term: string) {
  const name = fold(product.name)
  if (name.startsWith(term)) return 0
  if (name.split(/\s+/).some((word) => word.startsWith(term))) return 1
  if (name.includes(term)) return 2
  if (normalizeText(`${product.sku} ${product.ean}`).includes(term)) return 3
  return -1
}

function Highlight({ text, term }: { text: string; term: string }) {
  const start = fold(text).indexOf(term)
  if (start < 0 || !term) return <>{text}</>
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded bg-[var(--color-green-100)] px-0.5 text-[var(--color-amber-dark)]">{text.slice(start, start + term.length)}</mark>
      {text.slice(start + term.length)}
    </>
  )
}

const stockTone = (product: Product) => {
  if (!product.active) return "text-[var(--color-slate)]"
  const status = stockStatus(product)
  return status === "zerado" ? "text-[var(--color-alert)]" : status === "baixo" ? "text-[var(--color-warn)]" : "text-[var(--color-stock-green)]"
}

/** Busca do cabeçalho: mostra até 5 produtos enquanto a pessoa digita; Enter sem escolher abre o Estoque filtrado. */
export default function GlobalSearch() {
  const { products } = useInventory()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const term = normalizeText(query)
  const { results, total } = useMemo(() => {
    if (!term) return { results: [], total: 0 }
    const matches = products
      .map((product) => ({ product, score: rank(product, term) }))
      .filter((match) => match.score >= 0)
      .sort((a, b) => a.score - b.score || Number(b.product.active) - Number(a.product.active) || a.product.name.localeCompare(b.product.name, "pt-BR"))
    return { results: matches.slice(0, MAX_RESULTS).map((match) => match.product), total: matches.length }
  }, [products, term])

  const visible = open && term.length > 0

  // "/" em qualquer lugar (fora de um campo) leva o foco para a busca.
  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement
      if (event.key !== "/" || target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function go(product?: Product) {
    const busca = product ? product.name : query.trim()
    if (!busca) return
    navigate(`/estoque?busca=${encodeURIComponent(busca)}`)
    setQuery("")
    setOpen(false)
    setActive(-1)
    inputRef.current?.blur()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      setOpen(true)
      if (results.length === 0) return
      const step = event.key === "ArrowDown" ? 1 : -1
      // Percorre -1 (nenhum, Enter abre o Estoque filtrado) e os resultados, em círculo.
      setActive((current) => {
        const next = current + step
        return next >= results.length ? -1 : next < -1 ? results.length - 1 : next
      })
    } else if (event.key === "Enter") {
      event.preventDefault()
      go(results[active])
    } else if (event.key === "Escape") {
      if (query) setQuery("")
      else inputRef.current?.blur()
      setOpen(false)
      setActive(-1)
    }
  }

  return (
    <div className="relative hidden w-full max-w-[450px] md:block">
      <Search className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${visible ? "text-[var(--color-green-500)]" : "text-[var(--color-slate)]"}`} />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Buscar produtos globalmente"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={visible && active >= 0 && active < results.length ? `${listId}-${active}` : undefined}
        placeholder="Buscar produtos globalmente..."
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        className={`h-12 w-full rounded-xl bg-[var(--color-nav)] pl-11 pr-12 text-sm font-medium outline-none transition-[box-shadow,background-color] duration-200 placeholder:text-[var(--color-slate)] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[var(--color-green-500)]/35 ${visible ? "bg-white shadow-[0_10px_30px_rgba(13,28,46,0.10)]" : ""}`}
      />
      {!query && (
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-[var(--color-border)] bg-white px-2 py-0.5 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-slate)]">/</kbd>
      )}

      <div
        className={`absolute left-0 right-0 top-[calc(100%+8px)] z-40 origin-top overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_24px_60px_rgba(13,28,46,0.16)] transition duration-200 ease-out ${
          visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0"
        }`}
      >
        <ul id={listId} role="listbox" aria-label="Produtos encontrados" className="p-2">
          {results.map((product, index) => (
            <li
              key={product.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={active === index}
              // O mousedown escolhe antes do blur do campo fechar a lista.
              onMouseDown={(event) => {
                event.preventDefault()
                go(product)
              }}
              onMouseEnter={() => setActive(index)}
              className={`search-item-enter flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${active === index ? "bg-[var(--color-nav)]" : ""}`}
              style={{ animationDelay: `${index * 35}ms` }}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-paper)] text-[var(--color-slate)]">
                {product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : <Package className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
                  <Highlight text={product.name} term={term} />
                </span>
                <span className="block truncate font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-slate)]">
                  {product.sku} · {product.category}
                  {!product.active && " · Inativo"}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-bold">{formatBRL(product.priceCents)}</span>
                <span className={`block text-[11px] font-semibold ${stockTone(product)}`}>
                  {formatQuantity(product.stock)} {product.unit.toLowerCase()}
                </span>
              </span>
            </li>
          ))}
        </ul>
        {results.length === 0 ? (
          <p className="px-5 pb-5 pt-2 text-center text-sm text-[var(--color-slate)]">Nenhum produto encontrado para “{query.trim()}”.</p>
        ) : (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(event) => {
              event.preventDefault()
              go()
            }}
            className="flex w-full items-center justify-between border-t border-[var(--color-border)] px-5 py-3 text-[13px] font-semibold text-[var(--color-amber-dark)] transition hover:bg-[var(--color-paper)]"
          >
            {total > results.length ? `Ver todos os ${total} resultados no Estoque` : "Abrir no Estoque"}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
