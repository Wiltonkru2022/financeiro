# Supabase - FinancePro

Base pronta para criar o backend online do sistema.

## Como aplicar

1. Crie um projeto no Supabase com o nome `financeiro`.
2. Abra o SQL Editor.
3. Execute o arquivo `supabase/schema.sql`.
4. Copie a `Project URL` e a `anon public key`.
5. No FinancePro, abra `Configuracoes > Conexao online` e preencha:
   - Site online
   - Supabase URL
   - Supabase anon key
6. Clique em `Testar conexao`.

## Tabelas principais

- `financial_entries`: contas a pagar e receber.
- `settlements`: pagamentos e recebimentos baixados.
- `parties`: clientes e fornecedores.
- `categories`: categorias.
- `accounts`: contas financeiras.
- `cost_centers`: centros de custo.
- `payment_methods`: formas de pagamento.
- `profiles`: usuarios.
- `license_keys`: chaves de produto.
- `license_activations`: ativacoes por computador.
- `reminders`: alertas e notificacoes.
- `audit_log` e `app_logs`: historico e diagnostico.

As tabelas financeiras usam RLS por `owner_id = auth.uid()`. As tabelas de licenca ficam preparadas para serem usadas por uma API com service role.
