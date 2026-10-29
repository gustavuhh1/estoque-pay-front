import type { Customer } from "@/customers/customers"

/** Lojas de exemplo que já vêm com produtos, vendas, clientes e cupons de demonstração. */
export const DEMO_STORE_IDS = new Set(["ponto-certo", "centro", "shopping"])

const now = Date.now()

export const DEMO_CUSTOMERS: Customer[] = [
  { id: "seed-cus-marina", name: "Marina Duarte", cpf: "482.119.330-20", phone: "(81) 99812-4410", email: "", birthDate: "1991-03-14", createdAt: now - 90 * 86_400_000 },
  { id: "seed-cus-ricardo", name: "Ricardo Alves", cpf: "128.774.201-75", phone: "(81) 98877-1203", email: "", birthDate: "1984-09-02", createdAt: now - 70 * 86_400_000 },
  { id: "seed-cus-juliana", name: "Juliana Paz", cpf: "903.221.870-01", phone: "(81) 99654-0987", email: "", birthDate: "1996-12-21", createdAt: now - 40 * 86_400_000 },
]
