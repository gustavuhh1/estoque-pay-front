import { Check, UserPlus, X } from "lucide-react"

import Field from "@/components/Field"
import { Input } from "@/components/ui/input"
import { formatBRL } from "@/lib/format"
import type { useBuyer } from "@/pdv/useBuyer"

/** CPF na nota e cupom de desconto da venda do PDV com a API. */
export default function BuyerFields({ buyer }: { buyer: ReturnType<typeof useBuyer> }) {
  const { customer, match } = buyer
  return (
    <>
      <div>
        {customer && (
          <div className="mb-2.5 flex items-center gap-3 rounded-xl border border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] px-4 py-3 text-[var(--color-amber-dark)]">
            <Check className="h-[18px] w-[18px]" />
            <span className="flex-1 text-[15px] font-bold">{customer.name} anexado à venda</span>
            <button type="button" aria-label="Remover cliente" onClick={buyer.detach} className="p-2">
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        )}
        {match && (
          <button
            type="button"
            onClick={() => buyer.attach(match)}
            className="mb-2.5 flex w-full items-center gap-3 rounded-xl border border-[var(--color-green-100)] bg-white px-4 py-3 text-left shadow-sm"
          >
            <UserPlus className="h-[18px] w-[18px] text-[var(--color-amber)]" />
            <span className="flex flex-1 flex-col gap-0.5">
              <strong className="text-[15px]">{match.name} já está no CRM</strong>
              <span className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-slate)]">{match.cpf}</span>
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-amber-dark)]">Anexar</span>
          </button>
        )}
        <Field
          id="pdv-cpf"
          label="Cliente na nota (opcional)"
          hint={buyer.isUnknownCpf ? "CPF sem cadastro: cadastre o cliente em Clientes para colocá-lo na nota." : "Digite o CPF para buscar o cliente e colocá-lo na nota."}
        >
          <Input
            id="pdv-cpf"
            value={buyer.cpf}
            onChange={(event) => buyer.setCpf(event.target.value)}
            placeholder="000.000.000-00"
            inputMode="numeric"
            className="h-12 font-[family-name:var(--font-mono)] text-base"
          />
        </Field>
      </div>

      <Field
        id="pdv-coupon"
        label="Cupom de desconto (opcional)"
        error={buyer.couponError || undefined}
        hint={buyer.appliedCode ? `Cupom ${buyer.appliedCode}: desconto de ${formatBRL(buyer.discountCents)}.` : undefined}
      >
        <Input
          id="pdv-coupon"
          value={buyer.coupon}
          onChange={(event) => buyer.setCoupon(event.target.value)}
          placeholder="Digite o código do cupom"
          className="font-[family-name:var(--font-mono)]"
        />
      </Field>
    </>
  )
}
