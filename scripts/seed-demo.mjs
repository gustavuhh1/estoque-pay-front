/**
 * Prepara uma loja de apresentação no ambiente hospedado, pela própria API (sem acesso ao banco).
 * É repetível: o que já existe é reaproveitado e nada é duplicado (produtos, clientes e equipe pelo nome ou e-mail,
 * vendas só se a loja ainda não tiver nenhuma).
 *
 * Uso:  node scripts/seed-demo.mjs
 * Outro ambiente: BASE=http://localhost:3333 node scripts/seed-demo.mjs
 */
const BASE = process.env.BASE ?? "https://estoquepay.vercel.app/api"
const SENHA = "Apresenta@2026"
const OWNER = "apresentacao@exemplo.com"
const GESTOR = "gestor-apresentacao@exemplo.com"
const CAIXA = "caixa-apresentacao@exemplo.com"
const CNPJ = "55443322000105"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Client {
  constructor(email) {
    this.email = email
    this.cookies = new Map()
    this.store = null
  }
  async raw(method, path, body) {
    const headers = { Origin: "https://estoquepay.vercel.app", Accept: "application/json" }
    if (body !== undefined) headers["Content-Type"] = "application/json"
    if (this.store) headers["x-estabelecimento-id"] = this.store
    if (this.cookies.size) headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ")
    const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(150000) })
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(";")
      const i = pair.indexOf("=")
      const name = pair.slice(0, i).trim()
      const value = pair.slice(i + 1).trim()
      if (value === "") this.cookies.delete(name)
      else this.cookies.set(name, value)
    }
    const text = await res.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = text
    }
    return { status: res.status, body: json }
  }
  get = (p) => this.raw("GET", p)
  post = (p, b) => this.raw("POST", p, b ?? {})
  async entrar(nome) {
    // O Better Auth limita cadastro e login (3 a cada 10 s): espera entre as chamadas.
    await sleep(3500)
    let r = await this.raw("POST", "/auth/sign-up/email", { name: nome, email: this.email, password: SENHA })
    if (r.status === 429) {
      await sleep(11000)
      r = await this.raw("POST", "/auth/sign-up/email", { name: nome, email: this.email, password: SENHA })
    }
    if (r.status === 200) return "criada"
    await sleep(3500)
    r = await this.raw("POST", "/auth/sign-in/email", { email: this.email, password: SENHA })
    if (r.status !== 200) throw new Error(`não consegui entrar com ${this.email}: ${r.status} ${JSON.stringify(r.body)}`)
    return "existente"
  }
}

const log = (...a) => console.log(...a)
const ok = (r, what) => {
  if (r.status >= 300) throw new Error(`${what}: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`)
  return r.body
}

const PRODUTOS = [
  // nome, categoria, tipo, custo, venda, estoque, mínimo
  ["Café Torrado 500g", "Mercearia", "UNIDADE", 11.0, 18.9, 4, 10],
  ["Arroz Branco 5kg", "Mercearia", "UNIDADE", 20.0, 27.9, 40, 10],
  ["Feijão Carioca 1kg", "Mercearia", "UNIDADE", 6.0, 8.9, 55, 12],
  ["Açúcar Refinado 1kg", "Mercearia", "UNIDADE", 3.4, 4.99, 60, 12],
  ["Óleo de Soja 900ml", "Mercearia", "UNIDADE", 5.5, 7.49, 48, 10],
  ["Biscoito Recheado 140g", "Mercearia", "UNIDADE", 2.5, 3.99, 70, 15],
  ["Leite Integral 1L", "Laticínios e Frios", "UNIDADE", 3.6, 5.49, 6, 12],
  ["Queijo Mussarela (kg)", "Laticínios e Frios", "FRACIONADO_KG", 30.0, 42.0, 8.5, 2],
  ["Presunto Fatiado (kg)", "Laticínios e Frios", "FRACIONADO_KG", 25.0, 36.0, 6, 2],
  ["Refrigerante 2L", "Bebidas", "UNIDADE", 6.2, 9.9, 36, 12],
  ["Água Mineral 500ml", "Bebidas", "UNIDADE", 1.0, 2.5, 120, 24],
  ["Sabão em Pó 1kg", "Limpeza", "UNIDADE", 9.0, 12.9, 30, 8],
  ["Detergente 500ml", "Limpeza", "UNIDADE", 1.7, 2.99, 80, 15],
  ["Banana Prata (kg)", "Hortifruti", "FRACIONADO_KG", 4.0, 6.9, 25, 5],
  ["Pão Francês (kg)", "Padaria", "FRACIONADO_KG", 8.0, 14.9, 15, 4],
]

const CLIENTES = [
  ["Marina Duarte", "48211933020"],
  ["Ricardo Alves", "12877420175"],
  ["Juliana Paz", "90322187001"],
  ["Carlos Santos", "52998224725"],
]

const owner = new Client(OWNER)
log("Dono:", await owner.entrar("Mercadinho Ponto Certo (apresentação)"))

// ---- loja ----
const lojas = (await owner.get("/estabelecimento")).body
const existente = Array.isArray(lojas) ? lojas.find((l) => JSON.stringify(l).includes(CNPJ) || JSON.stringify(l).includes("Mercadinho Ponto Certo")) : null
let storeId = existente?.id ?? existente?.estabelecimento?.id ?? existente?.estabelecimento_id
if (!storeId) {
  const criada = ok(await owner.post("/estabelecimento", { nome: "Mercadinho Ponto Certo", cnpj: CNPJ, ie: "082114550119" }), "criar loja")
  storeId = criada.estabelecimento.id
  log("Loja criada:", storeId)
} else log("Loja já existia:", storeId)
owner.store = storeId

// ---- equipe ----
const gestor = new Client(GESTOR)
const caixa = new Client(CAIXA)
log("Gestor:", await gestor.entrar("Ana Lima (Gestora)"))
log("Caixa:", await caixa.entrar("Mário Enrique (Caixa)"))
const equipe = ok(await owner.get("/equipe"), "listar equipe")
for (const [c, role] of [[gestor, "MANAGER"], [caixa, "CASHIER"]]) {
  if (equipe.membros.some((m) => m.email === c.email) || equipe.convitesPendentes.some((m) => m.email === c.email)) continue
  ok(await owner.post("/equipe", { email: c.email, role }), `adicionar ${c.email}`)
}
gestor.store = storeId
caixa.store = storeId

// ---- categorias e produtos ----
const categorias = new Map(ok(await owner.get("/categoria"), "listar categorias").map((c) => [c.nome, c.id]))
for (const nome of new Set(PRODUTOS.map((p) => p[1]))) {
  if (!categorias.has(nome)) categorias.set(nome, ok(await owner.post("/categoria", { nome }), `categoria ${nome}`).id)
}
const atuais = new Map(ok(await owner.get("/produto"), "listar produtos").map((p) => [p.nome, p]))
let n = 0
for (const [nome, cat, tipo, custo, venda, estoque, minimo] of PRODUTOS) {
  n++
  if (atuais.has(nome)) continue
  const criado = ok(
    await owner.post("/produto", { nome, ean_gtin: `78910000${String(n).padStart(5, "0")}`, tipo_medida: tipo, preco_custo: custo, preco_venda: venda, quantidade_atual: estoque, quantidade_minima: minimo }),
    `produto ${nome}`,
  )
  ok(await owner.post(`/categoria/${categorias.get(cat)}/produtos`, { produto_ids: [criado.id] }), `vincular ${nome}`)
  atuais.set(nome, criado)
}
log(`Produtos: ${atuais.size}`)

// ---- clientes ----
const clientes = new Map(ok(await owner.get("/crm/clientes?limit=100"), "listar clientes").data.map((c) => [c.nome, c]))
for (const [nome, cpf] of CLIENTES) {
  if (!clientes.has(nome)) clientes.set(nome, ok(await owner.post("/crm/clientes", { nome, cpf }), `cliente ${nome}`))
}
log(`Clientes: ${clientes.size}`)

// ---- caixa e vendas (só na primeira vez) ----
const turno = await owner.get("/caixa/turno/atual")
if (turno.status === 404) ok(await gestor.post("/caixa/turno", { valor_abertura: 150 }), "abrir caixa")
const jaTemVendas = (ok(await owner.get("/venda?limite=1"), "listar vendas").itens ?? []).length > 0
let cupom = null
if (!jaTemVendas) {
  const p = (nome) => atuais.get(nome).id
  const item = (nome, q = 1) => ({ produto_id: p(nome), quantidade: q })
  const marina = clientes.get("Marina Duarte").id
  const ricardo = clientes.get("Ricardo Alves").id
  const pagar = async (body) => ok(await caixa.post("/pagamento", body), "venda")
  await pagar({ itens: [item("Arroz Branco 5kg"), item("Feijão Carioca 1kg", 2), item("Óleo de Soja 900ml")], metodo_pagamento: "DINHEIRO", valor_pago: 100, cliente_id: marina })
  await pagar({ itens: [item("Refrigerante 2L", 2), item("Biscoito Recheado 140g", 3)], metodo_pagamento: "DEBITO" })
  await pagar({ itens: [item("Queijo Mussarela (kg)", 0.35), item("Presunto Fatiado (kg)", 0.25), item("Pão Francês (kg)", 0.5)], metodo_pagamento: "CREDITO", cliente_id: ricardo })
  await pagar({ itens: [item("Água Mineral 500ml", 6), item("Detergente 500ml", 2)], metodo_pagamento: "DINHEIRO", valor_pago: 50 })
  const aCancelar = await pagar({ itens: [item("Sabão em Pó 1kg")], metodo_pagamento: "DEBITO" })
  const pix = ok(await caixa.post("/pagamento/pix", { itens: [item("Banana Prata (kg)", 1.2), item("Açúcar Refinado 1kg", 2)], cliente_id: marina }), "pix")
  ok(await caixa.post(`/pagamento/pix/${pix.payment_id}/simular-pagamento`), "simular pix")
  ok(await owner.post(`/venda/${aCancelar.venda_id}/cancelar`), "cancelar venda")
  cupom = ok(await owner.post("/crm/cupons", { cliente_id: marina, valor_desconto: 5 }), "cupom")
  log("Vendas de exemplo criadas (uma cancelada) e cupom emitido:", cupom.codigo)
} else log("A loja já tinha vendas: nada a criar.")

log("\n=== PRONTO ===")
log("Site:", BASE.replace(/\/api$/, ""))
log("Dono   :", OWNER, "/", SENHA)
log("Gestor :", GESTOR, "/", SENHA)
log("Caixa  :", CAIXA, "/", SENHA)
log("Loja   :", storeId, "(plano Free, caixa aberto)")
if (cupom) log("Cupom  :", cupom.codigo, "(R$ 5,00, da cliente Marina Duarte)")
