# Arquitetura proposta

## 1. Stack recomendada

### Aplicacao desktop

- Electron
- Interface HTML, CSS e JavaScript modular

### Persistencia local

- SQLite
- SQLite nativo do runtime Node/Electron para evitar dependencia nativa externa

### Empacotamento

- `electron-builder`
- Alvos sugeridos: `nsis` e `portable`

## 2. Motivos da escolha

- Funciona offline com facilidade.
- Permite gerar `.exe` instalavel para Windows.
- Facilita notificacoes locais.
- Mantem banco local `.db`, backup simples e menos risco de falha de compilacao no Windows.
- E uma boa base para evoluir depois para relatorios, importacao e automacoes locais.

## 3. Camadas do sistema

### Renderer

Responsavel pela interface do usuario.

- Dashboard
- Listagens
- Formularios
- Filtros
- Relatorios

### Main process

Responsavel por orquestrar recursos do desktop.

- Criacao de janela
- Notificacoes do Windows
- Acesso a arquivos
- Backup e restauracao
- Inicializacao do banco
- IPC seguro com a interface

### Services

Responsaveis pelas regras de negocio.

- Dashboard
- Financeiro
- Notificacoes
- Recorrencia
- Backup

### Database

Responsavel pela persistencia local.

- Schema SQL
- Migracoes futuras
- Queries encapsuladas

## 4. Estrutura de pastas sugerida

```text
src/
  db/
    schema.sql
    database.js
  main/
    main.js
    preload.js
  services/
    dashboardService.js
    notificationService.js
  renderer/
    index.html
    app.js
    styles.css
docs/
  mapeamento-sistema.md
  arquitetura.md
  roadmap.md
```

## 5. Modelo de dados inicial

### Tabelas principais

- `parties`
  - clientes, fornecedores ou ambos
- `categories`
  - categorias financeiras
- `cost_centers`
  - centros de custo
- `accounts`
  - caixa, banco, carteira ou conta operacional
- `payment_methods`
  - pix, dinheiro, boleto, cartao, transferencia
- `financial_entries`
  - contas a pagar e receber
- `recurring_templates`
  - modelos recorrentes
- `reminders`
  - lembretes e notificacoes
- `attachments`
  - comprovantes e arquivos
- `audit_log`
  - historico de alteracoes
- `app_settings`
  - configuracoes do sistema

## 6. Padrao de status

- `draft`: cadastro iniciado e ainda nao confirmado
- `open`: lancamento ativo e em aberto
- `partial`: parcialmente liquidado
- `settled`: liquidado totalmente
- `overdue`: vencido e nao liquidado totalmente
- `cancelled`: cancelado sem efeito financeiro

## 7. Regras de notificacao

- Ler configuracao local de antecedencia.
- Ao iniciar o app, verificar contas vencidas e a vencer.
- Exibir notificacao nativa do Windows quando houver pendencias.
- Registrar lembretes enviados para evitar repeticao excessiva.

## 8. Regras de instalacao

- Banco salvo em `%APPDATA%` ou pasta de dados do usuario do Electron.
- Backup em pasta escolhida pelo usuario.
- Instalador `.exe` com atalhos no menu iniciar e area de trabalho em fase de build.

## 9. Evolucao recomendada

### Fase 1

- Base do desktop
- Schema inicial
- Dashboard
- CRUD principal

### Fase 2

- Relatorios
- Recorrencia
- Backup e restauracao

### Fase 3

- Importacao/exportacao
- Multiempresa
- Controle de usuarios locais
