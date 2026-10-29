import { useMemo, useState, type FormEvent } from "react"
import { Mail, Pencil, Plus, Search, Trash2, Users } from "lucide-react"

import Field from "@/components/Field"
import PageHeader from "@/components/PageHeader"
import StatCard from "@/components/StatCard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Toast } from "@/components/ui/toast"
import { readCustomers, type Customer } from "@/customers/customers"
import { normalizeText } from "@/lib/format"
import { useStores } from "@/store/useStores"

type CustomerFormData = Omit<Customer, "id" | "createdAt">

const emptyForm: CustomerFormData = { name: "", phone: "", email: "", cpf: "" }

function CustomerForm({
  customer,
  onSave,
  onCancel,
}: {
  customer?: Customer
  onSave: (data: CustomerFormData) => boolean
  onCancel: () => void
}) {
  const [form, setForm] = useState<CustomerFormData>(() =>
    customer
      ? { name: customer.name, phone: customer.phone, email: customer.email, cpf: customer.cpf }
      : emptyForm,
  )
  const [error, setError] = useState("")

  const update = (key: keyof CustomerFormData) => (event: { target: { value: string } }) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setError("")
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = { ...form, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), cpf: form.cpf.trim() }
    if (data.name.length < 2) return setError("Informe o nome completo do cliente.")
    if (!onSave(data)) return setError("Não foi possível salvar os dados neste navegador.")
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field id="customer-name" label="Nome completo">
        <Input id="customer-name" value={form.name} onChange={update("name")} autoComplete="name" minLength={2} required autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="customer-phone" label="Telefone">
          <Input id="customer-phone" type="tel" value={form.phone} onChange={update("phone")} autoComplete="tel" placeholder="(85) 99999-9999" required />
        </Field>
        <Field id="customer-email" label="E-mail" hint="Opcional">
          <Input id="customer-email" type="email" value={form.email} onChange={update("email")} autoComplete="email" />
        </Field>
      </div>
      <Field id="customer-cpf" label="CPF" hint="Opcional">
        <Input id="customer-cpf" value={form.cpf} onChange={update("cpf")} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" />
      </Field>
      {error && <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert)]">{error}</p>}
      <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="accent">{customer ? "Salvar alterações" : "Cadastrar cliente"}</Button>
      </div>
    </form>
  )
}

export default function Customers() {
  const { activeStore, activeStoreId } = useStores()
  return <CustomerManager key={activeStoreId} storeId={activeStoreId} storeName={activeStore.name} />
}

function CustomerManager({ storeId, storeName }: { storeId: string; storeName: string }) {
  const [customers, setCustomers] = useState(() => readCustomers(storeId))
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<Customer | "new" | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)
  const [storageError, setStorageError] = useState("")
  const [toast, setToast] = useState("")

  const filtered = useMemo(() => {
    const term = normalizeText(query)
    return [...customers]
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .filter((customer) => !term || normalizeText(`${customer.name} ${customer.phone} ${customer.email} ${customer.cpf}`).includes(term))
  }, [customers, query])

  function persist(next: Customer[]) {
    try {
      localStorage.setItem(`estoquepay.demo.customers.${storeId}`, JSON.stringify(next))
      setCustomers(next)
      setStorageError("")
      return true
    } catch {
      setStorageError("O navegador não permitiu salvar os clientes. Verifique o espaço disponível e as permissões de armazenamento.")
      return false
    }
  }

  function saveCustomer(data: CustomerFormData) {
    const next = editing === "new"
      ? [...customers, { ...data, id: crypto.randomUUID(), createdAt: Date.now() }]
      : customers.map((customer) => (customer.id === editing?.id ? { ...customer, ...data } : customer))
    if (!persist(next)) return false
    setToast(editing === "new" ? "Cliente cadastrado." : "Dados do cliente atualizados.")
    setEditing(null)
    return true
  }

  function removeCustomer() {
    if (!deleting) return
    if (!persist(customers.filter((customer) => customer.id !== deleting.id))) return
    setDeleting(null)
    setToast("Cliente removido.")
  }

  return (
    <>
      <PageHeader
        eyebrow="Relacionamento"
        title="Clientes"
        description={<>Consulte e mantenha o cadastro de clientes de <strong className="font-semibold text-[var(--color-ink)]">{storeName}</strong>.</>}
        actions={<Button variant="accent" onClick={() => setEditing("new")}><Plus className="h-4 w-4" />Novo cliente</Button>}
      />

      <section className="mt-7 grid gap-4 sm:grid-cols-2">
        <StatCard label="Clientes cadastrados" value={String(customers.length)} meta="Nesta loja" icon={Users} />
        <StatCard label="Com e-mail" value={String(customers.filter((customer) => customer.email).length)} meta="Disponíveis para contato" icon={Mail} />
      </section>

      <Card className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
        <div className="border-b border-[var(--color-border)] p-4 sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]" />
            <Input aria-label="Buscar cliente" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, telefone, e-mail ou CPF" className="pl-9" />
          </div>
        </div>

        {storageError && <p role="alert" className="mx-5 mt-4 rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert)]">{storageError}</p>}
        {customers.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Users className="mx-auto h-9 w-9 text-[var(--color-slate)]" />
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-semibold">Nenhum cliente cadastrado</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-slate)]">Cadastre clientes para manter os dados de contato organizados nesta loja.</p>
            <Button variant="accent" className="mt-6" onClick={() => setEditing("new")}><Plus className="h-4 w-4" />Cadastrar primeiro cliente</Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm font-semibold">Nenhum cliente encontrado com essa busca.</p>
        ) : (
          <Table>
            <caption className="sr-only">Clientes cadastrados nesta loja</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Cliente</TableHead>
                <TableHead scope="col">Telefone</TableHead>
                <TableHead scope="col">E-mail</TableHead>
                <TableHead scope="col">CPF</TableHead>
                <TableHead scope="col" className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-semibold">{customer.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{customer.phone}</TableCell>
                  <TableCell className="text-[var(--color-slate)]">{customer.email || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{customer.cpf || "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setEditing(customer)} aria-label={`Editar ${customer.name}`}><Pencil className="h-3.5 w-3.5" />Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(customer)} aria-label={`Remover ${customer.name}`}><Trash2 className="h-3.5 w-3.5" />Remover</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Novo cliente" : "Editar cliente"}
        description="Os dados ficam associados à loja selecionada."
      >
        {editing !== null && (
          <CustomerForm
            key={editing === "new" ? "new-customer" : editing.id}
            customer={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSave={saveCustomer}
          />
        )}
      </Dialog>

      <Dialog open={deleting !== null} onClose={() => setDeleting(null)} title="Remover cliente" description={`Deseja remover ${deleting?.name ?? "este cliente"} do cadastro desta loja?`}>
        {storageError && <p role="alert" className="mb-4 rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert)]">{storageError}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
          <Button variant="outline" className="border-[var(--color-alert)]/30 text-[var(--color-alert)] hover:bg-[var(--color-alert-soft)]" onClick={removeCustomer}>Remover cliente</Button>
        </div>
      </Dialog>

      <Toast open={Boolean(toast)} title={toast} tone="success" onClose={() => setToast("")} />
    </>
  )
}
