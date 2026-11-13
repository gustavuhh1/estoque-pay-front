/** Dicas curtas, em linguagem simples, dos campos de Ajustes (usadas com <Field help> / <HelpTip>). */
export const HELP = {
  name: "É o nome pelo qual os clientes conhecem a loja, o da fachada. Pode ser diferente da razão social que aparece no CNPJ.",
  cnpj: "É o número de registro da sua empresa na Receita Federal, com 14 dígitos. Está no cartão CNPJ ou com o seu contador. Ex.: 12.345.678/0001-90.",
  ie: "É o cadastro da sua empresa na Secretaria da Fazenda (Sefaz) do estado, exigido de quem vende mercadorias e para emitir NFC-e. Peça ao seu contador ou consulte no site do Sintegra. Ex.: 06.123.456-7.",
  phone: "Número para clientes e fornecedores falarem com a loja, com DDD. Ex.: (85) 3333-4444.",
  address: "Rua, número e bairro onde a loja funciona. Use o mesmo endereço do cadastro do CNPJ, porque ele aparece nos comprovantes.",
  city: "Cidade onde a loja está registrada, a mesma do cadastro do CNPJ.",
  state: "Estado (UF) onde a loja está registrada. É ele que define as regras de imposto da Sefaz que valem para as suas notas.",
  nfce: "NFC-e (Nota Fiscal de Consumidor Eletrônica) é o cupom fiscal digital da venda no balcão. Ela é enviada à Sefaz na hora e substitui o antigo cupom da impressora fiscal.",
  certificate:
    "É a \"assinatura digital\" da empresa: um arquivo .pfx ou .p12 que assina as notas fiscais. Você compra numa certificadora (ex.: Serasa, Certisign, Valid) e ele vale 1 ano. O tipo A3 (cartão ou token) não serve aqui.",
  certificatePassword: "É a senha criada quando você comprou ou baixou o certificado A1. Sem ela o certificado não abre. Se esqueceu, fale com a certificadora ou com o seu contador.",
  cfop: "Código de 4 números que diz à Sefaz que tipo de venda é. Para venda comum dentro do estado, use 5102 (revenda) ou 5101 (produto que você mesmo fabrica). Na dúvida, confirme com o contador.",
  partner: "É a empresa que envia as suas notas para a Sefaz. Por enquanto as notas do EstoquePay são de teste (simuladas) e não têm valor fiscal.",
  role: "Define o que a pessoa pode fazer. Owner (dono) controla tudo, inclusive a assinatura; Gestor cuida do dia a dia e pode cadastrar Caixas; Caixa só usa o PDV para vender.",
  cvv: "Código de segurança de 3 números no verso do cartão (no American Express são 4, na frente).",
} as const
