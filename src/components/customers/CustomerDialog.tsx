import { useState, type FormEvent } from "react"

import Field from "@/components/Field"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { Customer } from "@/customers/customers"
import { isValidCpf } from "@/lib/cpf"
import { digitsOf, formatBirthDate, maskCpf, maskDate, maskPhone, parseBirthDate } from "@/lib/format"

export type CustomerData = Pick<Customer, "name" | "cpf" | "phone" | "email" | "birthDate" | "notes">

type Errors = Partial<Record<"cpf" | "name" | "phone" | "birth", string>>

const mono = "font-[family-name:var(--font-mono)]"

type CustomerDialogProps = {
  /** Cliente em edição, ou null para cadastrar. */
  customer: Customer | null
  /** Clientes da loja, para impedir CPF repetido. */
  customers: Customer[]
  onSave: (data: CustomerData) => boolean
  onDelete?: () => void
  onClose: () => void
}

export default function CustomerDialog({ customer, customers, onSave, onDelete, onClose }: CustomerDialogProps) {
  const [cpf, setCpf] = useState(customer?.cpf ?? "")
  const [name, setName] = useState(customer?.name ?? "")
  const [phone, setPhone] = useState(customer?.phone ?? "")
  const [birth, setBirth] = useState(formatBirthDate(customer?.birthDate))
  const [notes, setNotes] = useState(customer?.notes ?? "")
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState("")

  const aria = (key: keyof Errors) => ({ "aria-invalid": Boolean(errors[key]), "aria-describedby": errors[key] ? `customer-${key}-msg` : undefined })

  function submit(event: FormEvent) {
    event.preventDefault()
    const found: Errors = {}
    if (!isValidCpf(cpf)) found.cpf = "Informe um CPF válido."
    else if (customers.some((item) => item.id !== customer?.id && digitsOf(item.cpf) === digitsOf(cpf))) found.cpf = "Já existe um cliente com este CPF nesta loja."
    if (name.trim().length < 2) found.name = "Informe o nome completo."
    if (phone.trim() && ![10, 11].includes(digitsOf(phone).length)) found.phone = "Informe DDD e número (ex.: (81) 99999-0000)."
    const birthDate = birth.trim() ? parseBirthDate(birth) : undefined
    if (birth.trim() && !birthDate) found.birth = "Use uma data válida no formato 00/00/0000."
    setErrors(found)
    if (Object.keys(found).length > 0) return
    const saved = onSave({
      cpf: maskCpf(cpf),
      name: name.trim(),
      phone: phone.trim(),
      email: customer?.email ?? "",
      birthDate: birthDate ?? undefined,
      notes: notes.trim() || undefined,
    })
    if (!saved) setFormError("Não foi possível salvar os dados neste navegador.")
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={customer ? "Editar cliente" : "Novo cliente"}
      description="CPF e nome são os únicos campos disponíveis no plano Free."
      widthClass="max-w-[560px]"
    >
      <form onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="customer-cpf" label="CPF *" error={errors.cpf}>
            <Input id="customer-cpf" value={cpf} onChange={(event) => { setCpf(maskCpf(event.target.value)); setErrors((e) => ({ ...e, cpf: undefined })) }} inputMode="numeric" placeholder="000.000.000-00" className={mono} autoFocus {...aria("cpf")} />
          </Field>
          <Field id="customer-name" label="Nome completo *" error={errors.name}>
            <Input id="customer-name" value={name} onChange={(event) => { setName(event.target.value); setErrors((e) => ({ ...e, name: undefined })) }} placeholder="Ex: Marina Duarte" autoComplete="off" {...aria("name")} />
          </Field>
          <Field id="customer-phone" label="Telefone" error={errors.phone}>
            <Input id="customer-phone" value={phone} onChange={(event) => { setPhone(maskPhone(event.target.value)); setErrors((e) => ({ ...e, phone: undefined })) }} inputMode="tel" placeholder="(00) 00000-0000" className={mono} {...aria("phone")} />
          </Field>
          <Field id="customer-birth" label="Data de nascimento" error={errors.birth}>
            <Input id="customer-birth" value={birth} onChange={(event) => { setBirth(maskDate(event.target.value)); setErrors((e) => ({ ...e, birth: undefined })) }} inputMode="numeric" placeholder="00/00/0000" className={mono} {...aria("birth")} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="customer-notes" label="Observação">
              <Input id="customer-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Preferências, restrições, combinados com a loja..." maxLength={200} />
            </Field>
          </div>
        </div>

        {formError && (
          <p role="alert" className="mt-4 rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
            {formError}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse items-stretch gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:items-center">
          {customer && onDelete && (
            <button type="button" onClick={onDelete} className="text-sm font-bold text-[var(--color-alert)] hover:underline sm:mr-auto">
              Remover cliente
            </button>
          )}
          <div className="flex flex-col-reverse gap-3 sm:ml-auto sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="accent">
              {customer ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
