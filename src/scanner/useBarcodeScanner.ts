import { useEffect, useRef } from "react"

/**
 * Leitor de código de barras USB/Bluetooth no modo teclado (HID), o padrão dos leitores de supermercado:
 * ele "digita" o código muito rápido e termina com Enter (ou Tab, ou nada, conforme a configuração).
 *
 * Um único ouvinte global separa a leitura da digitação humana pelo ritmo: pelo menos MIN_LENGTH
 * caracteres, sem pausa maior que MAX_GAP_MS entre eles e com média de até MAX_AVG_MS. Quando é
 * uma leitura, o texto que o leitor escreveu no campo com foco é desfeito, o Enter não envia
 * formulário e o código vai só para o handler ativo de maior prioridade (diálogo > página).
 */
const MIN_LENGTH = 6
const MAX_GAP_MS = 60
const MAX_AVG_MS = 35
/** Leitores configurados sem sufixo: a leitura termina quando os caracteres param de chegar. */
const SUFFIXLESS_IDLE_MS = 120

export const SCAN_PRIORITY = { page: 1, dialog: 2 } as const

type Entry = { id: number; priority: number; handler: { current: (code: string) => void } }

const entries: Entry[] = []
let nextId = 0

type Burst = {
  code: string
  times: number[]
  /** Campo de texto que recebeu a leitura e o valor que ele tinha antes dela. */
  field: HTMLInputElement | HTMLTextAreaElement | null
  before: string
}
let burst: Burst | null = null
let idleTimer: ReturnType<typeof setTimeout> | undefined

const isTextField = (target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement =>
  target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit", "file"].includes(target.type))

function looksLikeScan(current: Burst) {
  if (current.code.length < MIN_LENGTH) return false
  const gaps = current.times.slice(1).map((time, index) => time - current.times[index])
  return gaps.every((gap) => gap <= MAX_GAP_MS) && gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length <= MAX_AVG_MS
}

/** Devolve ao campo o valor de antes da leitura, avisando o React (que controla o valor) pelo evento input. */
function restoreField(current: Burst) {
  const { field, before } = current
  if (!field || field.value === before) return
  const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(field, before)
  field.dispatchEvent(new Event("input", { bubbles: true }))
}

function deliver(current: Burst) {
  const top = entries.reduce<Entry | null>((best, entry) => (!best || entry.priority >= best.priority ? entry : best), null)
  if (!top) return false
  restoreField(current)
  top.handler.current(current.code.trim())
  return true
}

function onKeyDown(event: KeyboardEvent) {
  if (event.ctrlKey || event.altKey || event.metaKey || event.repeat) return
  const now = event.timeStamp

  if (event.key === "Enter" || event.key === "Tab") {
    const current = burst
    burst = null
    clearTimeout(idleTimer)
    if (current && now - current.times[current.times.length - 1] <= MAX_GAP_MS * 2 && looksLikeScan(current) && deliver(current)) {
      event.preventDefault()
      event.stopPropagation()
    }
    return
  }
  if (event.key.length !== 1) return

  const last = burst?.times[burst.times.length - 1]
  if (!burst || last === undefined || now - last > MAX_GAP_MS) {
    // keydown chega antes do caractere entrar no campo: este é o valor "de antes".
    const field = isTextField(event.target) ? event.target : null
    burst = { code: "", times: [], field, before: field?.value ?? "" }
  }
  burst.code += event.key
  burst.times.push(now)

  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    const current = burst
    burst = null
    if (current && looksLikeScan(current)) deliver(current)
  }, SUFFIXLESS_IDLE_MS)
}

/**
 * Recebe cada código lido pelo leitor enquanto `enabled`. Com vários handlers montados, só o de maior
 * prioridade recebe (empate: o mais recente), então um diálogo aberto tem preferência sobre a página.
 */
export function useBarcodeScanner(onScan: (code: string) => void, { enabled = true, priority = SCAN_PRIORITY.page }: { enabled?: boolean; priority?: number } = {}) {
  const handler = useRef(onScan)
  useEffect(() => {
    handler.current = onScan
  })

  useEffect(() => {
    if (!enabled) return
    const entry: Entry = { id: nextId++, priority, handler }
    entries.push(entry)
    if (entries.length === 1) window.addEventListener("keydown", onKeyDown, true)
    return () => {
      entries.splice(entries.indexOf(entry), 1)
      if (entries.length === 0) {
        window.removeEventListener("keydown", onKeyDown, true)
        clearTimeout(idleTimer)
        burst = null
      }
    }
  }, [enabled, priority])
}
