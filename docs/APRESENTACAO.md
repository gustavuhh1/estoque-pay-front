# Roteiro de apresentação

## Endereços
- **Site:** https://estoquepay.vercel.app
- **Saúde da API (pelo proxy do site):** https://estoquepay.vercel.app/api/health → `{"status":"ok"}`
- **Documentação da API (Swagger):** https://estoquepay.vercel.app/api/apidocs
- **API direta:** https://estoquepay-api-csob.onrender.com

## Contas de apresentação (loja "Mercadinho Ponto Certo", plano Free)
| Papel | E-mail | Senha |
|---|---|---|
| Dono (Owner) | `apresentacao@exemplo.com` | `Apresenta@2026` |
| Gestor | `gestor-apresentacao@exemplo.com` | `Apresenta@2026` |
| Caixa | `caixa-apresentacao@exemplo.com` | `Apresenta@2026` |

A loja já tem 15 produtos em 6 categorias (dois abaixo do estoque mínimo, três vendidos por quilo), 4 clientes, vendas de exemplo (dinheiro, cartão e Pix, uma cancelada), o caixa aberto e um cupom de R$ 5,00 da cliente Marina Duarte: `FID-3Q7K-PUK4`.

## Para mostrar o plano Premium e a NFC-e simulada
Entre com `premium-teste@exemplo.com` / `Premium@teste123` e escolha uma das três lojas (o usuário é Owner de todas):

| Loja | Estado | Para mostrar |
|---|---|---|
| Loja Premium Ativa (cenário 16) | Premium ativo, NFC-e ligada, 3 produtos com NCM e CFOP | Venda em dinheiro, cartão ou Pix e a **NFC-e simulada** (aviso "sem valor fiscal", chave fictícia e a linha da taxa Pix de R$ 0,80) |
| Loja Premium Trial (cenário 14) | Trial de 7 dias | Ajustes > Assinatura com o trial |
| Loja Premium Inadimplente (cenário 15) | Pagamento recusado, modo restrito | NFC-e desligada e bloqueio de novos cadastros |

Se uma dessas lojas for gasta nos testes (cancelar a assinatura, por exemplo), a sessão da API restaura as três com `scripts/premium-teste.ts --confirmar` no repositório da API.

## Antes de começar
1. **Abra o site uns 2 minutos antes.** A API gratuita hiberna e a primeira chamada pode levar cerca de 1 minuto para acordar.
2. Confira `/api/health` e entre uma vez com a conta do Dono.
3. Se a loja de apresentação for perdida ou estiver bagunçada, `node scripts/seed-demo.mjs` recria o que faltar sem duplicar (a senha das contas é a da tabela).

## Roteiro sugerido (cerca de 10 minutos)
1. **Painel** (Dono): vendas do dia, lucro, formas de pagamento, top vendidos e a lista de reposição.
2. **Estoque:** alerta de reposição (Café e Leite abaixo do mínimo), categorias, produto vendido por quilo (queijo, 0,350 kg) e a auditoria das movimentações.
3. **PDV:** venda em dinheiro com troco; depois uma venda **Pix**: o QR Code aparece com a taxa de R$ 0,80 já somada ao total, e o botão "Simular pagamento" confirma e baixa o estoque. Mostre também o cliente (Marina) e o cupom `FID-3Q7K-PUK4` abatendo R$ 5,00.
4. **Vendas:** histórico, venda cancelada com estorno de estoque e fechamento do caixa.
5. **Clientes:** histórico de compras, produto favorito e cupons.
6. **Ajustes:** Equipe (o Gestor só atribui o cargo Caixa), Fiscal (pré-check da NFC-e) e Assinatura (o botão leva ao checkout real da AbacatePay).
7. **Controle por papel:** saia e entre como **Caixa**: o menu mostra só PDV e Vendas, e as outras telas dão "sem permissão".
8. **Esqueci a senha:** mostra o fluxo com e-mail real (Brevo).

## O que dizer sobre os limites
- A **NFC-e é simulada** (sem valor fiscal) e só existe no plano Premium; na loja Free o comprovante sai "sem valor fiscal".
- O **Pix e a assinatura** usam a AbacatePay em modo de desenvolvimento (sem dinheiro real).
- **Login com Google** ficou fora do escopo por causa do prazo (`docs/ESCOPO-FORA.md`).
- O relatório completo da validação em produção está em `docs/ETAPA-7-RELATORIO.md`.
