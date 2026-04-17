# Mapeamento completo do sistema

## 1. Objetivo do produto

Criar um sistema desktop offline para Windows que permita controlar todo o ciclo financeiro operacional de uma empresa ou uso pessoal profissionalizado, incluindo contas a pagar, contas a receber, lancamentos, notificacoes, historico, relatorios e seguranca local.

## 2. Premissas do projeto

- O sistema funciona sem internet.
- Os dados ficam salvos localmente em banco SQLite.
- O aplicativo deve ser instalavel no Windows com interface desktop.
- O sistema deve permitir uso cotidiano rapido, com telas simples e filtros eficientes.
- As notificacoes precisam funcionar localmente para contas a vencer, vencidas e novos titulos cadastrados.

## 3. Modulos obrigatorios

### 3.1 Dashboard

- Resumo do total a pagar em aberto.
- Resumo do total a receber em aberto.
- Quantidade de contas vencidas.
- Quantidade de contas que vencem hoje.
- Quantidade de contas que vencem nos proximos dias.
- Agenda financeira por periodo.
- Ultimos lancamentos.
- Alertas pendentes.

### 3.2 Contas a pagar

- Cadastrar conta manualmente.
- Editar conta.
- Excluir conta com trilha de auditoria.
- Marcar como paga.
- Registrar pagamento parcial.
- Informar juros, multa, desconto e observacoes.
- Vincular fornecedor, categoria, conta financeira e comprovante.
- Filtrar por status, vencimento, fornecedor, categoria e periodo.

### 3.3 Contas a receber

- Cadastrar titulo a receber.
- Editar recebimento previsto.
- Excluir com historico.
- Marcar como recebido.
- Registrar recebimento parcial.
- Controlar inadimplencia.
- Filtrar por cliente, vencimento, categoria, status e periodo.

### 3.4 Lancamentos financeiros

- Lancamento avulso de despesa.
- Lancamento avulso de receita.
- Transferencia entre contas.
- Ajuste manual de saldo.
- Baixa vinculada a conta a pagar ou receber.
- Registro de data de competencia, emissao, vencimento e liquidacao.

### 3.5 Cadastros auxiliares

- Clientes.
- Fornecedores.
- Categorias.
- Centros de custo.
- Contas financeiras.
- Formas de pagamento.
- Tags e observacoes padronizadas.

### 3.6 Notificacoes

- Nova conta cadastrada.
- Conta a vencer hoje.
- Conta a vencer em X dias.
- Conta vencida.
- Conta a receber vencida.
- Resumo diario ao abrir o aplicativo.

### 3.7 Relatorios

- Contas a pagar por periodo.
- Contas a receber por periodo.
- Fluxo de caixa previsto.
- Fluxo de caixa realizado.
- Inadimplencia.
- Resumo por categoria.
- Resumo por cliente e fornecedor.
- Exportacao para CSV e PDF em fase posterior.

### 3.8 Recursos operacionais

- Backup manual.
- Backup automatico local.
- Restauracao de backup.
- Configuracoes de notificacao.
- Configuracoes de moeda e prazo de alerta.
- Historico de alteracoes.

## 4. Fluxos principais

### 4.1 Fluxo de conta a pagar

1. Usuario cria a conta.
2. Define fornecedor, valor, vencimento, categoria e observacoes.
3. Sistema registra status inicial como `open`.
4. Ao se aproximar do vencimento, gera alerta local.
5. Ao pagar, usuario informa data, valor pago, descontos, juros e conta utilizada.
6. Sistema atualiza saldo liquidado e status para `partial` ou `settled`.

### 4.2 Fluxo de conta a receber

1. Usuario cria o titulo a receber.
2. Define cliente, valor, vencimento e categoria.
3. Sistema monitora o prazo.
4. Ao receber, registra data e valor.
5. Se nao receber no vencimento, status vai para `overdue`.

### 4.3 Fluxo de recorrencia

1. Usuario cria um modelo recorrente.
2. Define frequencia semanal, mensal, anual ou personalizada.
3. Sistema gera novos lancamentos automaticamente na abertura do app ou em rotina local.
4. Usuario pode editar somente a parcela atual ou a serie futura.

### 4.4 Fluxo de exclusao

1. Usuario solicita exclusao.
2. Sistema pede confirmacao.
3. Registro e marcado como removido logicamente.
4. Auditoria guarda antes e depois da operacao.

## 5. Regras de negocio

- Toda conta precisa ter descricao, tipo, valor e vencimento.
- Conta a pagar e conta a receber usam a mesma base de lancamento, diferenciadas por `entry_type`.
- Exclusao deve ser logica para preservar historico.
- Status sugeridos:
  - `draft`
  - `open`
  - `partial`
  - `settled`
  - `overdue`
  - `cancelled`
- Conta vencida sem liquidacao total deve aparecer em destaque.
- Pagamento parcial nao encerra a conta.
- Valor total em aberto = valor total + juros + multa - desconto - valor liquidado.
- Notificacao deve considerar configuracao de dias de antecedencia.

## 6. Campos essenciais por lancamento

- Tipo: pagar ou receber.
- Descricao.
- Pessoa vinculada.
- Categoria.
- Centro de custo.
- Conta financeira.
- Forma de pagamento.
- Data de competencia.
- Data de emissao.
- Data de vencimento.
- Data de liquidacao.
- Valor principal.
- Desconto.
- Juros.
- Multa.
- Valor liquidado.
- Status.
- Observacoes.
- Anexos.

## 7. Telas recomendadas

- Login local opcional com PIN ou senha mestra.
- Dashboard.
- Lista de contas a pagar.
- Lista de contas a receber.
- Tela unica de cadastro/edicao de lancamento.
- Tela de baixa financeira.
- Cadastros auxiliares.
- Central de notificacoes.
- Relatorios.
- Configuracoes.
- Backup e restauracao.

## 8. Busca, filtros e produtividade

- Busca por texto em descricao, cliente e fornecedor.
- Filtro rapido por hoje, semana, mes, vencidas e em aberto.
- Filtro por categoria, conta, status e valor.
- Ordenacao por vencimento, valor e data de cadastro.
- Favoritos ou visoes salvas em fase futura.

## 9. Seguranca e confiabilidade

- Banco local protegido no perfil do usuario do Windows.
- Backup versionado.
- Auditoria de alteracoes importantes.
- Confirmacao em exclusoes e baixas.
- Validacao de campos obrigatorios.
- Travas para impedir valores negativos indevidos.

## 10. Requisitos nao funcionais

- Deve abrir rapido e funcionar sem internet.
- Deve ser simples de instalar e atualizar no Windows.
- Deve permitir manutencao futura sem reescrever o sistema inteiro.
- Deve suportar crescimento de dados sem travar em uso normal.
- Deve ter arquitetura modular para futuras integracoes.

## 11. MVP recomendado

- Dashboard.
- CRUD de contas a pagar.
- CRUD de contas a receber.
- Cadastros de clientes, fornecedores, categorias e contas.
- Baixa total e parcial.
- Notificacoes locais.
- Relatorio de vencidas, a vencer e fluxo previsto.
- Backup manual.

## 12. Segunda fase recomendada

- Recorrencia automatica.
- Parcelamento.
- Importacao de planilhas.
- Exportacao PDF/CSV.
- Centro de custo completo.
- Multiempresa local.
- Graficos e indicadores avancados.

