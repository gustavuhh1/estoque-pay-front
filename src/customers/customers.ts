export type Customer = {
  id: string
  name: string
  phone: string
  email: string
  cpf: string
  createdAt: number
}

/** Clientes salvos da loja (armazenamento local de demonstração). */
export function readCustomers(storeId: string): Customer[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(`estoquepay.demo.customers.${storeId}`) ?? "[]")
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
    return []
  }
}
