import { formatBRL, formatQuantity, formatReceiptNumber, maskCpf } from "@/lib/format"
import type { Espelho } from "@/pdv/pdvApi"

const mono = "font-[family-name:var(--font-mono)]"
const dash = "my-2.5 border-t border-dashed border-[var(--color-border)]"

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" })
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" })

const PAYMENT: Record<Espelho["forma_pagamento"], string> = {
  PIX: "PAGAMENTO PIX",
  DINHEIRO: "DINHEIRO",
  DEBITO: "CARTÃO DE DÉBITO",
  CREDITO: "CARTÃO DE CRÉDITO",
}

/** Espelho da NFC-e simulada, exatamente como a API devolve (inclusive o aviso de que não tem valor fiscal). */
export default function EspelhoReceipt({ espelho }: { espelho: Espelho }) {
  const emitted = new Date(espelho.emitida_em)
  return (
    <div className={`print-receipt mx-auto w-[340px] max-w-full rounded-md border border-[var(--color-border)] bg-white px-5 py-[22px] shadow-sm ${mono}`}>
      <div className="flex flex-col gap-[3px] text-center text-[11px] text-[#444]">
        <strong className="text-xs uppercase tracking-[0.06em] text-[#111]">{espelho.estabelecimento.nome}</strong>
        <span>CNPJ {espelho.estabelecimento.cnpj}</span>
        {espelho.estabelecimento.ie && <span>IE {espelho.estabelecimento.ie}</span>}
      </div>
      <div className={dash} />
      <div className="text-center text-[11px] leading-[1.6] text-[#111]">
        DOCUMENTO AUXILIAR DA NOTA FISCAL
        <br />
        DE CONSUMIDOR ELETRÔNICA
        <br />
        NFC-e (SIMULADO) nº {formatReceiptNumber(espelho.numero)} · Série {String(espelho.serie).padStart(3, "0")}
        <br />
        {dateFormatter.format(emitted)} às {timeFormatter.format(emitted)}
      </div>
      <div className={dash} />
      <div className="flex justify-between text-[10px] text-[#666]">
        <span>ITEM / QTD × UNIT</span>
        <span>VALOR</span>
      </div>
      <div className="my-2 flex flex-col gap-2">
        {espelho.itens.map((item, index) => (
          <div key={`${item.nome}-${index}`} className="flex flex-col gap-px">
            <span className="text-[11px] uppercase text-[#111]">{item.nome}</span>
            <div className="flex justify-between gap-3 text-[11px] text-[#333]">
              <span>
                {formatQuantity(item.quantidade)} × {formatBRL(Math.round(item.preco_unitario * 100))}
              </span>
              <span>{formatBRL(Math.round(item.total * 100))}</span>
            </div>
          </div>
        ))}
      </div>
      <div className={dash} />
      <div className="flex justify-between text-[11px] text-[#333]">
        <span>QTD. TOTAL DE ITENS</span>
        <span>{espelho.itens.length}</span>
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-[#333]">
        <span>SUBTOTAL</span>
        <span>{formatBRL(Math.round(espelho.subtotal_itens * 100))}</span>
      </div>
      {espelho.desconto > 0 && (
        <div className="flex justify-between text-[11px] text-[#333]">
          <span>DESCONTO</span>
          <span>-{formatBRL(Math.round(espelho.desconto * 100))}</span>
        </div>
      )}
      {espelho.taxa_pix !== null && (
        <div className="flex justify-between text-[11px] text-[#333]">
          <span>TAXA PIX (PAGA PELO CLIENTE)</span>
          <span>{formatBRL(Math.round(espelho.taxa_pix * 100))}</span>
        </div>
      )}
      <div className="mt-1.5 flex items-baseline justify-between text-[#111]">
        <strong className="text-[13px]">TOTAL</strong>
        <strong className="text-xl">{formatBRL(Math.round(espelho.total_cobrado * 100)).replace(/ /g, " ")}</strong>
      </div>
      <div className={dash} />
      <div className="flex justify-between text-[11px] text-[#333]">
        <span>{PAYMENT[espelho.forma_pagamento]}</span>
        <span>{formatBRL(Math.round(espelho.total_cobrado * 100))}</span>
      </div>
      <div className={dash} />
      <div className="text-center text-[11px] text-[#111]">
        {espelho.consumidor.identificado && espelho.consumidor.cpf ? `CPF DO CONSUMIDOR: ${maskCpf(espelho.consumidor.cpf)}` : "CONSUMIDOR NÃO IDENTIFICADO"}
      </div>
      {espelho.consumidor.nome && <div className="mt-0.5 text-center text-[11px] uppercase text-[#444]">{espelho.consumidor.nome}</div>}
      <div className={dash} />
      <div className="break-all text-center text-[9px] leading-[1.5] text-[#666]">CHAVE (FICTÍCIA): {espelho.chave_de_acesso}</div>
      <div className="mt-2.5 rounded border border-dashed border-[#999] px-2 py-1.5 text-center text-[10px] font-bold leading-[1.5] text-[#111]">{espelho.aviso}</div>
    </div>
  )
}
