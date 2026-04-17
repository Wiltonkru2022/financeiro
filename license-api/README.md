# ContaCerta License API

API simples para vender o ContaCerta com ativacao por chave.

## Como rodar

```bash
node license-api/server.js
```

Por padrao a API abre em `http://localhost:3877`.

## Variaveis de ambiente

- `LICENSE_API_PORT`: porta HTTP.
- `LICENSE_SECRET`: segredo usado para assinar chaves e tokens.
- `LICENSE_DATA_DIR`: pasta onde o banco da API sera salvo.
- `LICENSE_DB_PATH`: caminho completo opcional do banco SQLite.

No Windows, por padrao o banco fica em `%LOCALAPPDATA%\ContaCertaLicenseApi\licenses.db`.

## Endpoints

- `GET /api/health`
- `POST /api/licenses/create`
- `POST /api/licenses/activate`
- `POST /api/licenses/validate`

## Criar uma licenca

```json
{
  "customerName": "Cliente Exemplo",
  "documentNumber": "000.000.000-00",
  "email": "cliente@email.com",
  "plan": "premium",
  "validUntil": "2027-04-17T23:59:59.000Z",
  "maxDevices": 1,
  "maxUsers": 3,
  "modules": ["finance", "reports", "backup", "health"]
}
```

A API responde com `productKey`. Essa chave e digitada no app desktop na primeira execucao.
