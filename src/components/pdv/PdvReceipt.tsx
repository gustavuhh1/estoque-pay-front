import { formatBRL, formatQuantity, formatReceiptNumber, maskCpf } from "@/lib/format"
import { lineTotalCents } from "@/inventory/logic"
import type { Sale } from "@/inventory/types"
import type { Store } from "@/store/store-context"

const mono = "font-[family-name:var(--font-mono)]"
const dash = "my-2.5 border-t border-dashed border-[var(--color-border)]"

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" })
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" })

const paymentLabels: Record<Sale["payment"], string> = {
  pix: "PAGAMENTO PIX",
  dinheiro: "DINHEIRO",
  cartao: "CARTÃO (MAQUININHA)",
}

type PdvReceiptProps = {
  sale: Sale
  store: Store
  operator: string
}

/** Espelho do cupom exibido ao concluir a venda (layout do design system). */
export default function PdvReceipt({ sale, store, operator }: PdvReceiptProps) {
  const paid = sale.receivedCents ?? sale.totalCents

  return (
    <div className={`print-receipt mx-auto w-[340px] max-w-full rounded-md border border-[var(--color-border)] bg-white px-5 py-[22px] shadow-sm ${mono}`}>
      <div className="flex flex-col gap-[3px] text-center text-[11px] text-[#444]">
        <strong className="text-xs uppercase tracking-[0.06em] text-[#111]">{store.name}</strong>
        <span>CNPJ {store.cnpj}</span>
        {store.city && (
          <span>
            {store.city}/{store.state}
          </span>
        )}
      </div>
      <div className={dash} />
      <div className="text-center text-[11px] leading-[1.6] text-[#111]">
        {sale.nfce === false ? (
          <>
            COMPROVANTE DE VENDA
            <br />
            (NÃO FISCAL)
            <br />
            Venda nº {formatReceiptNumber(sale.number)}
          </>
        ) : (
          <>
            DOCUMENTO AUXILIAR DA NOTA FISCAL
            <br />
            DE CONSUMIDOR ELETRÔNICA
            <br />
            NFC-e (SIMULADO) nº {formatReceiptNumber(sale.number)} · Série 001
          </>
        )}
        <br />
        {dateFormatter.format(sale.createdAt)} às {timeFormatter.format(sale.createdAt)}
      </div>
      <div className={dash} />
      <div className="flex justify-between text-[10px] text-[#666]">
        <span>ITEM / QTD × UNIT</span>
        <span>VALOR</span>
      </div>
      <div className="my-2 flex flex-col gap-2">
        {sale.items.map((item) => (
          <div key={item.productId} className="flex flex-col gap-px">
            <span className="text-[11px] uppercase text-[#111]">{item.name}</span>
            <div className="flex justify-between gap-3 text-[11px] text-[#333]">
              <span>
                {formatQuantity(item.quantity)} {item.unit ?? "UN"} × {formatBRL(item.unitCents)}
              </span>
              <span>{formatBRL(lineTotalCents(item.unitCents, item.quantity))}</span>
            </div>
          </div>
        ))}
      </div>
      <div className={dash} />
      <div className="flex justify-between text-[11px] text-[#333]">
        <span>QTD. TOTAL DE ITENS</span>
        <span>{sale.items.length}</span>
      </div>
      {sale.discountCents ? (
        <>
          <div className="mt-1.5 flex justify-between text-[11px] text-[#333]">
            <span>SUBTOTAL</span>
            <span>{formatBRL(sale.totalCents + sale.discountCents)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-[#333]">
            <span>DESCONTO CUPOM {sale.couponCode}</span>
            <span>-{formatBRL(sale.discountCents)}</span>
          </div>
        </>
      ) : null}
      <div className="mt-1.5 flex items-baseline justify-between text-[#111]">
        <strong className="text-[13px]">TOTAL</strong>
        <strong className="text-xl">{formatBRL(sale.totalCents).replace(/ /g, " ")}</strong>
      </div>
      <div className={dash} />
      <div className="flex justify-between text-[11px] text-[#333]">
        <span>{paymentLabels[sale.payment]}</span>
        <span>{formatBRL(paid)}</span>
      </div>
      {sale.payment === "dinheiro" && (
        <div className="mt-1 flex justify-between text-[11px] text-[#333]">
          <span>TROCO</span>
          <span>{formatBRL(sale.changeCents ?? 0)}</span>
        </div>
      )}
      <div className={dash} />
      <div className="text-center text-[11px] text-[#111]">
        {sale.cpf ? `CPF DO CONSUMIDOR: ${maskCpf(sale.cpf)}` : "CONSUMIDOR NÃO IDENTIFICADO"}
      </div>
      {sale.customerName && <div className="mt-0.5 text-center text-[11px] uppercase text-[#444]">{sale.customerName}</div>}
      <div className={dash} />
      <div className="rounded border border-dashed border-[#999] px-2 py-1.5 text-center text-[10px] font-bold leading-[1.5] text-[#111]">
        DOCUMENTO SEM VALOR FISCAL{sale.nfce === false ? "" : " — SIMULAÇÃO"}
        <br />
        {sale.nfce === false ? "(sem emissão de NFC-e neste plano)" : "(emissão real fora do escopo do projeto)"}
      </div>
      <div className="mt-2.5 text-center text-[10px] leading-[1.6] text-[#666]">
        ESPELHO PARA CONFERÊNCIA DO OPERADOR
        <br />
        Operador: {operator} · Caixa 01
      </div>
    </div>
  )
}
