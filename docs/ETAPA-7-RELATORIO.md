# Etapa 7 — Validação em produção

**Data:** 29/10/2026 · **Front:** https://estoquepay.vercel.app (deploy da `main` em c049f5c) · **API e banco:** Render e banco hospedado, acessados só pelo proxy `/api` da Vercel.

## Como foi feito
- **Pelo navegador (Chrome headless) no site publicado:** cadastro, login, logout, sessão expirada, onboarding, seleção e troca de loja, menu e rotas por papel, PDV (caixa, dinheiro, Pix com QR e simulação de pagamento), 404 e erro de rede.
- **Pela API hospedada, pelo mesmo endereço público do site (`/api`):** regras de negócio, papéis, limites do plano e erros, usando contas e cookies reais (Owner, Gestor e Caixa).
- **Contas de teste:** `teste-etapa7-*@exemplo.com` e `teste-front-*@exemplo.com`. O cenário 2 usou um e-mail real do dono do projeto.
- O Pix usa a rota de simulação da AbacatePay em modo de desenvolvimento.

## Resumo
| Resultado | Quantidade |
|---|---|
| ✅ PASSOU | 92 |
| ⚠️ DIVERGENTE | 3 |
| ❌ FALHOU | 3 |
| ℹ️ OBSERVAÇÃO | 3 |
| ⏸️ BLOQUEADO | 4 |
| ➖ FORA DO ESCOPO | 1 |

† Verificado na build local com as correções do PR #59 (mesma API hospedada); precisa ser repetido no site publicado depois do deploy dessas correções.

## O que foi encontrado
### Defeitos do front (corrigidos no PR #59)
1. **Logout não encerrava a sessão** (cenário 1): a requisição ia sem corpo e o servidor respondia 400.
2. **O Caixa via o menu inteiro e abria `/estoque`** (cenário 5): só Ajustes era barrado.
3. **API fora do ar levava ao login** em vez da tela de erro de conexão (cenário 17).

### Divergências entre o plano e a API (decisão do dono)
- **Caixa abre e fecha o turno** (cenário 9): o plano diz só Owner e Gestor, mas a API deixa qualquer cargo, de propósito (`CaixaService`, #54). O front impede o Caixa na tela de Vendas, mas a regra não está no servidor.
- **Produto já vendido pode ser excluído definitivamente** (cenário 6): `DELETE /produto/:id` devolve 204 mesmo com vendas. O histórico de vendas continua, porque o nome fica gravado na venda; só a inativação preserva o cadastro.
- **Menu do Caixa:** o plano diz só PDV; o front mostra PDV e Vendas (consulta).

### Comportamentos da API que valem registro
- Limites do Free respondem **409** (`PLANO_LIMITE_PRODUTOS`, `PLANO_LIMITE_MEMBROS`, `PLANO_RECURSO_PREMIUM`), não 403.
- **Convite pendente ocupa vaga** no limite de 3 membros do Free.
- Cadastro, login e redefinição de senha têm limite de 3 requisições a cada 10 s no Better Auth (usuários reais não chegam lá; testes automáticos sim).

### Não validados ponta a ponta
- Cenários 14, 15 e 16 dependem de uma **loja Premium de teste** (checkout da AbacatePay em modo dev e webhook). O front já leva ao checkout; falta o pós-pagamento.
- Cenário 6 (switch fiscal ligado sem NCM/CFOP) também exige Premium.
- Login com Google: fora do escopo (`docs/ESCOPO-FORA.md`).

## Resultado por cenário

### 1. Cadastro e-mail/senha; login Google; logout e sessão expirada

| | Verificação | Evidência |
|---|---|---|
| ✅ PASSOU | Cadastro com e-mail e senha | HTTP 200, conta teste-etapa7-01711-owner@exemplo.com, 1095 ms |
| ✅ PASSOU | Cadastro com e-mail repetido é recusado | HTTP 422 {"message":"User already exists. Use another email.","code":"USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"} |
| ✅ PASSOU | Sessão ativa após o cadastro | get-session devolve teste-etapa7-01711-owner@exemplo.com |
| ✅ PASSOU | Senha errada recusada (401) | HTTP 401 {"message":"Invalid email or password","code":"INVALID_EMAIL_OR_PASSWORD"} |
| ✅ PASSOU | Logout encerra a sessão e a rota protegida passa a dar 401 (sessão expirada) | sign-out 200; depois do logout GET /estabelecimento 401; sem cookie 401 |
| ✅ PASSOU | Login com e-mail e senha | HTTP 200, 817 ms |
| ✅ PASSOU | Cadastro pela tela leva ao onboarding (site publicado) | caminho /onboarding |
| ✅ PASSOU | Encerrar sessão volta para a tela de login | caminho /login |
| ✅ PASSOU | Login pela tela entra no sistema | caminho /painel |
| ✅ PASSOU | Sessão expirada (cookie apagado) leva ao login ao usar o sistema | caminho /login |
| ✅ PASSOU | Logout encerra a sessão no servidor e a rota protegida volta para o login (versão corrigida) † | get-session null; /painel → /login |
| ❌ FALHOU | Logout encerra a sessão (site publicado, antes da correção) | O front mandava JSON sem corpo; o servidor respondia 400 FST_ERR_CTP_EMPTY_JSON_BODY e o get-session seguia válido: a tela deslogava, mas ao recarregar a pessoa voltava logada. Corrigido no PR #59. |
| ➖ FORA DO ESCOPO | Login com Google | Cortado por decisão do dono por causa do prazo (docs/ESCOPO-FORA.md). |

### 2. Esqueci a senha → e-mail (Brevo) → redefinição → novo login

| | Verificação | Evidência |
|---|---|---|
| ✅ PASSOU | Esqueci a senha → e-mail (Brevo) → redefinição → novo login | E-mail "Redefinição de senha" recebido (remetente brevosend.com); o link do e-mail abriu a tela de redefinição no site publicado e a troca funcionou; o login com a senha nova deu 200 e com a antiga 401. Token inválido/ausente/vencido mostram "link expirado". |
| ℹ️ OBSERVAÇÃO | Token colado à mão | Um token copiado manualmente do e-mail foi recusado como inválido (provável caractere trocado ao copiar); o link do e-mail, que é o caminho real do usuário, funcionou. |

### 3. Onboarding: criar loja (CNPJ válido/duplicado) → vira OWNER

| | Verificação | Evidência |
|---|---|---|
| ✅ PASSOU | Criar loja com CNPJ válido vira OWNER automaticamente | HTTP 201, papel OWNER |
| ✅ PASSOU | CNPJ duplicado é recusado (409) | HTTP 409 {"code":"CNPJ_ALREADY_IN_USE","message":"Este CNPJ já está cadastrado na plataforma.","details":{"field":"cnpj"},"requestId":"req-xf"} |
| ✅ PASSOU | CNPJ inválido é recusado (400) | HTTP 400 {"code":"VALIDATION_ERROR","message":"Erro de validação.","details":{"issues":[{"field":"cnpj","message":"CNPJ inválido."}]},"requestId":"req-xh"} |
| ✅ PASSOU | O mesmo usuário cria uma segunda loja e também vira OWNER dela | HTTP 201 |
| ✅ PASSOU | CNPJ inválido mostra erro na tela | caminho /onboarding; texto: ais \| Comece identificando o estabelecimento. \| Nome da loja \| CNPJ \| Inscrição estadual (opcional) \| CNPJ inválido. \| Voltar para lojas \| Criar estabelecimento |
| ✅ PASSOU | CNPJ válido cria a loja e leva ao painel como Owner | A tela mostrou "Estabelecimento criado — Sua loja está pronta para o painel. Você já é o Owner desta loja" com o botão "Ir para o Dashboard" (o CNPJ ficou gravado: o segundo cadastro do mesmo CNPJ foi recusado). |
| ✅ PASSOU | CNPJ duplicado mostra erro na tela | caminho /onboarding; texto: dos principais \| Comece identificando o estabelecimento. \| Nome da loja \| CNPJ \| Inscrição estadual (opcional) \| Este CNPJ já está cadastrado na plataforma. \| Voltar para lojas \| Criar estabelecimento |

### 4. Multi-loja: usuário em duas lojas com papéis diferentes; troca de contexto

| | Verificação | Evidência |
|---|---|---|
| ✅ PASSOU | Usuário em duas lojas com papéis diferentes (Gestor na A, Owner na C) | GET /estabelecimento 200, inclui A: true, inclui C: true |
| ✅ PASSOU | Troca de contexto: na C o usuário é Owner e atribui Gestor; na A é Gestor e não pode | loja C 202; loja A 403 |
| ✅ PASSOU | Isolamento: Caixa da loja A não acessa a loja C pelo header | HTTP 403 {"code":"TENANT_ACCESS_DENIED","message":"Você não tem vínculo com este estabelecimento.","requestId":"req-yd"} |
| ✅ PASSOU | Tela de seleção lista as lojas do usuário | SEUS ESTABELECIMENTOS \| Onde você quer trabalhar hoje? \| Selecione uma loja para abrir o Dashboard no contexto correto. \| Nova loja \| Ativa \| Loja A 01711 \| 39.920.974/0001-29 \| Gestor \| Abrir Dashboard \| Loja B 01711 \| 17.534.885/0001-01 \| Gestor \| Abrir Dash |
| ✅ PASSOU | Troca de loja pela tela muda o papel exibido (Owner na C, Gestor na A) | loja C → Gestor Etapa7 \| OWNER \| ENCERRAR SESSÃO \| ESTOQUEPAY V1.02.4; loja A → estor Etapa7 \| GESTOR \| ENCERRAR SESSÃO \| ESTOQUEPAY V1.02.4 |

### 5. Equipe e papéis (RN02, RN03, RN06; Caixa só vê o PDV)

| | Verificação | Evidência |
|---|---|---|
| ✅ PASSOU | Owner adiciona Gestor que já tem conta (vínculo imediato) | HTTP 201 {"id":"7b67b906-59c2-4f7c-bb4b-f7ac99126feb","userId":"XrXQi4RqpbdwfPkOyHABcn904Hrr64Yh","nome":"Gestor Etapa7","email":"teste-etapa7-01711-gestor@exe |
| ✅ PASSOU | Owner adiciona Caixa que já tem conta | HTTP 201 {"id":"0ed95e20-d2a2-4ee0-b1ef-644e5e42cd71","userId":"0Af5qcVaPaLCqnkM46v2Zqp4UFhAVlEs","nome":"Caixa Etapa7","email":"teste-etapa7-01711-caixa@exemp |
| ✅ PASSOU | Gestor enxerga a loja ao entrar | GET /estabelecimento 200 |
| ✅ PASSOU | Caixa enxerga a loja ao entrar | GET /estabelecimento 200 |
| ✅ PASSOU | Gestor atribui só Caixa: tentar criar MANAGER é recusado (403) | HTTP 403 {"code":"ROLE_CANNOT_ASSIGN_ROLE","message":"Usuários com o cargo Gestor só podem atribuir o cargo Caixa.","requestId":"req-xv"} |
| ✅ PASSOU | Gestor atribui só Caixa: tentar criar OWNER é recusado (403) | HTTP 403 {"code":"ROLE_CANNOT_ASSIGN_ROLE","message":"Usuários com o cargo Gestor só podem atribuir o cargo Caixa.","requestId":"req-xw"} |
| ✅ PASSOU | Convite para e-mail sem conta fica pendente (Gestor convida Caixa) | HTTP 202; convite pendente na lista: true |
| ✅ PASSOU | Gestor não edita o Owner (RN02) | HTTP 403 {"code":"ROLE_CANNOT_EDIT_OWNER","message":"Usuários com o cargo Gestor não podem editar um Owner.","requestId":"req-xz"} |
| ✅ PASSOU | Gestor não exclui o Owner (RN02) | HTTP 403 {"code":"ROLE_CANNOT_EDIT_OWNER","message":"Usuários com o cargo Gestor não podem excluir um Owner.","requestId":"req-y0"} |
| ✅ PASSOU | Último Owner não sai da loja (RN03) | HTTP 403 {"code":"LAST_OWNER_CANNOT_BE_REMOVED","message":"Não é possível remover o último Owner da loja.","requestId":"req-y1"} |
| ✅ PASSOU | Quem se cadastra depois com o e-mail convidado entra na loja sozinho | lojas do convidado: 200 inclui a loja B |
| ✅ PASSOU | Caixa não lista produtos do estoque (403) | HTTP 403 {"code":"ROLE_CANNOT_MANAGE_PRODUCTS","message":"Usuários com o cargo Caixa não podem gerenciar produtos.","requestId":"req-13c"} |
| ✅ PASSOU | Caixa usa a busca do PDV | HTTP 200, 1 resultado(s) |
| ✅ PASSOU | Na tela, o Gestor só vê o cargo Caixa ao adicionar membro | opções do cargo: Caixa |
| ✅ PASSOU | Caixa que abre /estoque pela URL é barrado † | caminho /403; texto:  |
| ✅ PASSOU | Caixa que abre /ajustes pela URL | caminho /403; texto:  |
| ✅ PASSOU | Funcionário removido perde o acesso na hora (RN06) | antes 200; remoção 204; logo depois 401 UNAUTHORIZED; a loja some da lista dele: true |
| ⚠️ DIVERGENTE | Caixa só vê o PDV no menu † | Depois da correção o menu do Caixa mostra PDV e Vendas (consulta), sem Painel, Estoque, Clientes nem Ajustes; as telas bloqueadas dão /403 pela URL. O plano diz só PDV; Vendas ficou por decisão das fases de design (o Caixa consulta e o Gestor abre e fecha o caixa). |
| ❌ FALHOU | Caixa só vê o PDV: menu e rotas (site publicado, antes da correção) | O menu do Caixa mostrava Painel, PDV, Estoque, Clientes, Vendas e Ajustes e /estoque abria pela URL (só /ajustes dava 403). Corrigido no PR #59. |

### 6. Produtos: CRUD, EAN duplicado, exclusão lógica e definitiva, switch fiscal

| | Verificação | Evidência |
|---|---|---|
| ✅ PASSOU | Criar produto | HTTP 201, ativo true |
| ✅ PASSOU | EAN/GTIN duplicado é recusado (409) | HTTP 409 {"code":"EAN_GTIN_ALREADY_IN_USE","message":"Já existe um produto com este código de barras nesta loja.","details":{"field":"ean_gtin"},"requestId":"req-137"} |
| ✅ PASSOU | Editar produto | HTTP 200, preço 13.5 |
| ✅ PASSOU | Inativar e reativar (exclusão lógica) | inativar 200/false; reativar 200/true |
| ✅ PASSOU | Exclusão definitiva de produto sem histórico (DELETE) e exclusão lógica (inativar) coexistem | DELETE 204; produto some da lista: true; a inativação já foi validada antes (200) |
| ℹ️ OBSERVAÇÃO | Excluir definitivamente um produto que já foi vendido | DELETE devolveu 204 e o produto saiu do cadastro. O histórico de vendas continua: 4 venda(s) ainda listam "Café Etapa7" pelo nome gravado na venda. A API não bloqueia a exclusão definitiva de produto já vendido (só a inativação preserva o cadastro). |
| ⏸️ BLOQUEADO | Chave fiscal ligada sem NCM/CFOP: o produto nasce inativo e não reativa (RN09.1/2) | Exige loja Premium com a chave fiscal ligada (cenários 14 a 16). |

### 7. Categorias N:N; excluir categoria não apaga produtos

| | Verificação | Evidência |
|---|---|---|
| ✅ PASSOU | Criar categorias | ids 043162ef, 939f463e |
| ✅ PASSOU | Mesmo produto em duas categorias (N:N) | vínculos 200/200; categorias com o produto: 2 |
| ✅ PASSOU | Excluir categoria não apaga os produtos | DELETE 204; produto existe: true; continua em Frios: true |

### 8. Estoque: entrada/saída com motivo, fração, auditoria imutável, alerta

| | Verificação | Evidência |
|---|---|---|
| ✅ PASSOU | Saída fracionada de 0,300 kg com motivo | HTTP 201, saldo 4.7 (esperado 4,7) |
| ✅ PASSOU | Entrada com motivo atualiza o saldo | HTTP 201, saldo 25 (esperado 25) |
| ✅ PASSOU | Motivo é obrigatório (400) | HTTP 400 {"code":"VALIDATION_ERROR","message":"Erro de validação.","details":{"issues":[{"field":"motivo","message":"Invalid option: expected one of \"REABASTECIMENTO\"\| |
| ✅ PASSOU | Mais de 3 casas decimais é recusado (400) | HTTP 400 {"code":"VALIDATION_ERROR","message":"Erro de validação.","details":{"issues":[{"field":"quantidade","message":"A quantidade aceita no máximo 3 casas decimais." |
| ✅ PASSOU | Motivo VENDA não pode ser forjado à mão (400) | HTTP 400 {"code":"VALIDATION_ERROR","message":"Erro de validação.","details":{"issues":[{"field":"motivo","message":"Invalid option: expected one of \"REABASTECIMENTO\"\| |
| ✅ PASSOU | Saída maior que o saldo é recusada e o saldo não muda | HTTP 409 {"code":"ESTOQUE_INSUFICIENTE","message":"Estoque insuficiente: saldo atual de 4.7, solicitado 999.","details":{"field":"quantidade","saldo_atual":4.7,"solicita; saldo continua 4.7 |
| ✅ PASSOU | Auditoria: histórico registra quem, quando e o motivo | 1 movimentação(ões); 1ª: DESCARTE por Dono Etapa7 |
| ✅ PASSOU | Auditoria imutável: não há edição nem exclusão de movimentação | PATCH 404, DELETE 404 |
| ✅ PASSOU | Alerta de estoque mínimo | HTTP 200, 1 alerta(s), inclui o produto abaixo do mínimo: true |

### 9. Caixa: abrir e fechar turno

| | Verificação | Evidência |
|---|---|---|
| ✅ PASSOU | Gestor abre o turno | HTTP 201 {"id":"a4d59cd5-d926-4a95-8040-b7b53be80c04","estabelecimento_id":"0eef4685-75ff-4b92-8a12-d5f55d262295","status":"ABERTO","valor_abertura":100,"valor_fechament |
| ✅ PASSOU | Segundo turno aberto é recusado | HTTP 409 {"code":"TURNO_JA_ABERTO","message":"Esta loja já possui um turno de caixa aberto. Feche o turno atual antes de abrir outro.","requestId":"req-135"} |
| ✅ PASSOU | Gestor fecha o turno | HTTP 200 |
| ✅ PASSOU | Owner abre o caixa pela tela (site publicado) | turno ABERTO, abertura 100 |
| ✅ PASSOU | Owner fecha o caixa pela tela | GET /caixa/turno/atual → 404 (sem turno aberto) |
| ⚠️ DIVERGENTE | Caixa não abre turno (403) | A API devolveu 201: o módulo do caixa (#54) deixa qualquer cargo abrir e fechar o turno de propósito (comentário em CaixaService). O plano diz só Owner/Gestor. |
| ⚠️ DIVERGENTE | Caixa não fecha o turno (403) | A API devolveu 200: mesma decisão do #54, qualquer cargo fecha o turno. |

### 10. Vendas: dinheiro, cartão, Pix (taxa R$ 0,80, polling, simulação), RN01 e RNF01

| | Verificação | Evidência |
|---|---|---|
| ✅ PASSOU | Venda em dinheiro com troco (feita pelo Caixa) | HTTP 201, total 25.8, troco 74.2 (esperado 74,2), estoque 23 (esperado 23) |
| ✅ PASSOU | Venda no cartão de débito baixa o estoque | HTTP 201, estoque 22 (esperado 22) |
| ✅ PASSOU | Pix: QR gerado, total = itens + R$ 0,80, venda PENDENTE e estoque intacto (RN01) | HTTP 201, total_cobrado 13.7, taxa 0.8, QR true, estoque 22 (esperado 22) |
| ✅ PASSOU | Pix: status consultado por polling continua PENDENTE | HTTP 200 {"payment_id":"pix_char_CqpsLUpeHKPeMZSr1JgcPZAC","status":"PENDING","pago":false,"expira_em":"2026-10-29T19:35:38.166Z","venda_id":"b9d9870d-c76a-44ce-a11f-dbe |
| ✅ PASSOU | Pix: simular pagamento (modo dev) confirma a venda e só então baixa o estoque | simular 200; status {"payment_id":"pix_char_CqpsLUpeHKPeMZSr1JgcPZAC","status":"PAID","pago":true,"e; estoque 21 (esperado 21) |
| ✅ PASSOU | Falha derruba a transação inteira (RNF01): item sem estoque não baixa o outro | HTTP 409 {"code":"ESTOQUE_INSUFICIENTE","message":"Estoque insuficiente: saldo atual de 3, solicitado 99.","details":{"field":"quantidade","saldo_atual":3,"solicitado":9; estoque do 1º item continua 21 |
| ✅ PASSOU | Venda em dinheiro pela tela: troco, recibo e baixa de estoque | Recibo com DINHEIRO R$ 20,00 e TROCO R$ 14,00 para o item de R$ 6,00; estoque 3 → 2 (o critério automático falhou só pelo espaço sem quebra do formato de moeda). |
| ✅ PASSOU | Pix pela tela: taxa de R$ 0,80 à vista, QR Code e estoque intacto enquanto pendente | resumo: Pagamento \| Total dos itens R$ 6,00 \| PIX \| DINHEIRO \| CARTÃO \| Gerar o QR Code do Pix \| A venda fica pendente e só é aprovada quando o Pix cair. \| Itens \| R$ 6; QR true; estoque 2 (antes 2) |
| ✅ PASSOU | Pix pago: comprovante com a taxa e baixa de estoque só depois do pagamento | estoque 2 → 1; recibo: LOJA D 01711 \| CNPJ 96.783.874/0001-31 \| COMPROVANTE DE VENDA \| (NÃO FISCAL) \| Venda 4AA6BA8D \| 29/10/2026 às 16:46 \| ITEM / QTD × UNIT \| VALOR \| LEITE ETAPA7 \| 1 UN × R$ 6,00 \| R$ 6,00 \| QTD. TOTAL D |

### 11. Cancelamento de venda com estorno

| | Verificação | Evidência |
|---|---|---|
| ✅ PASSOU | Caixa não cancela venda (403) | HTTP 403 {"code":"ROLE_CANNOT_CANCEL_VENDA","message":"Usuários com o cargo Caixa não podem cancelar vendas.","requestId":"req-14l"} |
| ✅ PASSOU | Owner cancela: estoque volta e a movimentação 'Estorno de venda' é gravada | HTTP 200, estoque 21 → 22, movimentação ESTORNO_VENDA |
| ✅ PASSOU | Cancelar de novo é recusado | HTTP 409 {"code":"VENDA_JA_CANCELADA","message":"Esta venda já foi cancelada.","requestId":"req-14q"} |

### 12. CRM: CPF, histórico, favoritos, cupom

| | Verificação | Evidência |
|---|---|---|
| ✅ PASSOU | Cadastro de cliente com CPF válido | cliente 9714c4d4, cpf 65188228300 |
| ✅ PASSOU | CPF duplicado na mesma loja é recusado (409) | HTTP 409 {"code":"CLIENTE_CPF_ALREADY_IN_USE","message":"Já existe um cliente com este CPF nesta loja.","details":{"field":"cpf"},"requestId":"req-14t"} |
| ✅ PASSOU | CPF inválido é recusado (400) | HTTP 400 {"code":"VALIDATION_ERROR","message":"Erro de validação.","details":{"issues":[{"field":"cpf","message":"CPF inválido."}]},"requestId":"req-14u"} |
| ✅ PASSOU | Venda com cliente e cupom: desconto aplicado e cupom resgatado | HTTP 201, desconto 2, cupom RESGATADO |
| ✅ PASSOU | Reuso do cupom é recusado (409) | HTTP 409 {"code":"CUPOM_JA_RESGATADO","message":"Este cupom já foi resgatado.","details":{"field":"cupom_codigo"},"requestId":"req-14y"} |
| ✅ PASSOU | Histórico e produto favorito do cliente | 1 compra(s); favorito Café Etapa7; ticket médio 10.9 |

### 13. Plano Free: 51º produto, 4º membro, CRM, switch fiscal

| | Verificação | Evidência |
|---|---|---|
| ✅ PASSOU | 4º membro bloqueado no plano Free | HTTP 409 {"code":"PLANO_LIMITE_MEMBROS","message":"O plano Free permite no máximo 3 membros na equipe, contando o Owner (esta loja tem 3). Remova alguém ou ass |
| ✅ PASSOU | CRM no Free: telefone/observação/nascimento bloqueados (403) | HTTP 409 {"code":"PLANO_RECURSO_PREMIUM","message":"O cadastro completo de clientes não está disponível no plano Free: telefone. Assine o Premium para usar.","details":{ |
| ✅ PASSOU | Switch fiscal indisponível no Free | PATCH 409 {"code":"NFCE_PRE_CHECK_REPROVADO","message":"A loja não cumpre os requisitos para emitir ; pre-check apto false |
| ✅ PASSOU | 51º produto ativo bloqueado no Free | bloqueou ao tentar o 51º (ativos agora 50); resposta 409 {"code":"PLANO_LIMITE_PRODUTOS","message":"O plano Free permite no máximo 50 pro |

### 14. Trial com cartão e assinatura

| | Verificação | Evidência |
|---|---|---|
| ⏸️ BLOQUEADO | Trial com cartão (modo dev) vira Premium; sem cartão válido não ativa; Pix não vale para assinatura | Precisa concluir o checkout da AbacatePay em modo dev com cartão de teste. O front já redireciona para app.abacatepay.com (POST /billing/assinatura devolve a checkout_url); o pós-pagamento depende do webhook e de uma loja de teste. |

### 15. Inadimplência e cancelamento

| | Verificação | Evidência |
|---|---|---|
| ⏸️ BLOQUEADO | Inadimplência e cancelamento: modo restrito, switch fiscal desligado, bloqueio acima do limite | Depende de uma loja Premium e de simular o webhook (a API não expõe rota para isso ao front). |

### 16. NFC-e simulada

| | Verificação | Evidência |
|---|---|---|
| ✅ PASSOU | Loja Free: nenhuma NFC-e é gerada (comprovante não fiscal) | Recibo "COMPROVANTE DE VENDA (NÃO FISCAL)" com "DOCUMENTO SEM VALOR FISCAL (sem emissão de NFC-e neste plano)"; GET /nfce/vendas/:id da venda devolve 404. |
| ⏸️ BLOQUEADO | NFC-e simulada após venda paga com switch ativo (aviso SEM VALOR FISCAL, linha da taxa R$ 0,80, CPF opcional, visualização e impressão) | Exige loja Premium com certificado, inscrição estadual e produtos com NCM/CFOP; o espelho está integrado ao PDV e à tela de Vendas, mas sem teste ponta a ponta. |

### 17. Estados de erro: 401/403/404, API fora do ar, cold start

| | Verificação | Evidência |
|---|---|---|
| ✅ PASSOU | 401 sem sessão | HTTP 401 {"code":"UNAUTHORIZED","message":"Autenticação necessária.","requestId":"req-16k"} |
| ✅ PASSOU | 403 sem permissão (Caixa em /produto) | HTTP 403 {"code":"ROLE_CANNOT_MANAGE_PRODUCTS","message":"Usuários com o cargo Caixa não podem gerenciar produtos.","requestId":"req-16l"} |
| ✅ PASSOU | 404 para recurso inexistente | HTTP 404 {"code":"ROUTE_NOT_FOUND","message":"Rota GET /produto/00000000-0000-4000-8000-000000000000 não encontrada.","requestId":"req-16m"} |
| ✅ PASSOU | 400 de validação com detalhes por campo | HTTP 400 {"code":"VALIDATION_ERROR","message":"Erro de validação.","details":{"issues":[{"field":"nome","message":"O nome do produto é obrigatório."},{"field":"preco_cus |
| ✅ PASSOU | Página 404 para rota inexistente | 404 \| Página não encontrada. \| O endereço não corresponde a nenhuma tela disponível no EstoquePay. \| Voltar ao início |
| ✅ PASSOU | API fora do ar mostra a tela de erro de rede † | caminho /painel; texto: Não foi possível conectar ao servidor \| Confira sua conexão. Se estiver tudo certo, o servidor pode estar iniciando ou fora do ar: tente de novo em instantes. \| Tentar de novo |
| ❌ FALHOU | API fora do ar mostra a tela de erro de rede (site publicado, antes da correção) | Com /api bloqueada, o front mandava para /login em vez de mostrar o erro de conexão. Corrigido no PR #59. |
| ℹ️ OBSERVAÇÃO | Cold start da hospedagem | Não dá para forçar sob demanda. Nas rodadas de hoje a Render respondeu em cerca de 1 s (instância já acordada). A tela "Verificando sua sessão..." traz o aviso de que o servidor gratuito hiberna e a primeira abertura pode levar cerca de 1 minuto; o limite de espera das chamadas é de 90 s. |

## Dados de teste deixados em produção
Contas `teste-etapa7-*` e `teste-front-*`, lojas "Loja A/B/C/D" e "Loja UI", produtos, vendas, clientes e cupons de teste, e a conta criada com o e-mail real do dono para o cenário 2 (senha trocada por ele). Não há rota para apagar lojas, então esses dados ficam até uma limpeza no banco.
