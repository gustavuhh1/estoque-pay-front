import { DEMO_CUSTOMERS, DEMO_STORE_IDS } from "@/customers/demo"

export type Customer = {
  id: string
  name: string
  phone: string
  email: string
  cpf: string
  /** Data de nascimento (AAAA-MM-DD). */
  birthDate?: string
  notes?: string
  createdAt: number
}

const key = (storeId: string) => `estoquepay.demo.customers.${storeId}`

/** Clientes salvos da loja (armazenamento local de demonstração). */
export function readCustomers(storeId: string): Customer[] {
  try {
    const raw = localStorage.getItem(key(storeId))
    // Lojas de exemplo começam com clientes de demonstração até o primeiro cadastro.
    if (raw === null) return DEMO_STORE_IDS.has(storeId) ? DEMO_CUSTOMERS : []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (customer): customer is Customer =>
        Boolean(
          customer &&
            typeof customer.id === "string" &&
            typeof customer.name === "string" &&
            typeof customer.phone === "string" &&
            typeof customer.email === "string" &&
            typeof customer.cpf === "string" &&
            typeof customer.createdAt === "number",
        ),
    )
  } catch {
    return DEMO_STORE_IDS.has(storeId) ? DEMO_CUSTOMERS : []
  }
}

/** Salva a lista de clientes. Devolve false se o navegador não permitir. */
export function writeCustomers(storeId: string, customers: Customer[]) {
  try {
    localStorage.setItem(key(storeId), JSON.stringify(customers))
    return true
  } catch {
    return false
  }
}
