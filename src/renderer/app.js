const api = window.contaCertaApi;

const state = {
  bootstrap: null,
  lookups: {},
  snapshot: null,
  settings: null,
  license: null,
  health: null,
  view: 'dashboard',
  entries: [],
  catalogKind: 'parties',
  catalogRows: [],
  audit: [],
  filters: {
    query: '',
    status: '',
    plan_type: '',
    due_from: '',
    due_to: ''
  }
};

const viewMeta = {
  dashboard: ['Home', 'Painel'],
  payable: ['Financeiro', 'Contas a Pagar'],
  receivable: ['Financeiro', 'Contas a Receber'],
  entries: ['Lancamentos', 'Todos os titulos financeiros'],
  catalogs: ['Cadastros', 'Clientes e Fornecedores'],
  catalog_parties: ['Cadastros', 'Clientes e Fornecedores'],
  catalog_categories: ['Cadastros', 'Categorias'],
  catalog_cost_centers: ['Cadastros', 'Centro de Custo'],
  reports: ['Relatorios', 'Relatorio Mensal'],
  health: ['Sistema', 'Licenca e Saude'],
  backup: ['Sistema', 'Configuracoes']
};

const statusLabels = {
  draft: 'Rascunho',
  open: 'Aberto',
  partial: 'Parcial',
  settled: 'Liquidado',
  overdue: 'Vencido',
  cancelled: 'Cancelado'
};

const typeLabels = {
  payable: 'Pagar',
  receivable: 'Receber'
};

const catalogViewKinds = {
  catalogs: 'parties',
  catalog_parties: 'parties',
  catalog_categories: 'categories',
  catalog_cost_centers: 'cost_centers'
};

const planLabels = {
  single: 'Unica',
  fixed: 'Fixa mensal',
  installment: 'Parcelada'
};

const catalogConfigs = {
  parties: {
    label: 'Clientes e fornecedores',
    fields: [
      {
        name: 'party_type',
        label: 'Tipo',
        type: 'select',
        options: [
          ['customer', 'Cliente'],
          ['supplier', 'Fornecedor'],
          ['both', 'Cliente e fornecedor']
        ]
      },
      { name: 'name', label: 'Nome', required: true },
      { name: 'document_number', label: 'Documento' },
      { name: 'phone', label: 'Telefone' },
      { name: 'email', label: 'Email' },
      { name: 'notes', label: 'Observacoes', type: 'textarea' }
    ],
    columns: [
      ['name', 'Nome'],
      ['party_type', 'Tipo'],
      ['phone', 'Telefone'],
      ['email', 'Email']
    ]
  },
  categories: {
    label: 'Categorias',
    fields: [
      { name: 'name', label: 'Nome', required: true },
      {
        name: 'kind',
        label: 'Uso',
        type: 'select',
        options: [
          ['payable', 'Pagar'],
          ['receivable', 'Receber'],
          ['both', 'Ambos']
        ]
      },
      { name: 'color', label: 'Cor', type: 'color' }
    ],
    columns: [
      ['name', 'Nome'],
      ['kind', 'Uso'],
      ['color', 'Cor']
    ]
  },
  accounts: {
    label: 'Contas financeiras',
    fields: [
      { name: 'name', label: 'Nome', required: true },
      {
        name: 'account_type',
        label: 'Tipo',
        type: 'select',
        options: [
          ['cash', 'Caixa'],
          ['bank', 'Banco'],
          ['wallet', 'Carteira'],
          ['card', 'Cartao'],
          ['loan', 'Emprestimo/financiamento'],
          ['store', 'Carne/loja'],
          ['other', 'Outra']
        ]
      },
      { name: 'institution', label: 'Instituicao' },
      { name: 'current_balance', label: 'Saldo atual', type: 'number' },
      { name: 'notes', label: 'Observacoes', type: 'textarea' }
    ],
    columns: [
      ['name', 'Nome'],
      ['account_type', 'Tipo'],
      ['institution', 'Instituicao'],
      ['current_balance', 'Saldo']
    ]
  },
  cost_centers: {
    label: 'Centros de custo',
    fields: [
      { name: 'name', label: 'Nome', required: true },
      { name: 'code', label: 'Codigo' }
    ],
    columns: [
      ['name', 'Nome'],
      ['code', 'Codigo']
    ]
  },
  payment_methods: {
    label: 'Formas de pagamento',
    fields: [{ name: 'name', label: 'Nome', required: true }],
    columns: [['name', 'Nome']]
  }
};

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function todayLocal() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function showToast(message, isError = false) {
  const toast = byId('toast');
  toast.textContent = message;
  toast.style.background = isError ? 'var(--danger)' : 'var(--olive-dark)';
  toast.hidden = false;

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 4200);
}

async function runSafely(work, successMessage) {
  try {
    const result = await work();

    if (successMessage) {
      showToast(successMessage);
    }

    return result;
  } catch (error) {
    showToast(error.message || 'Nao foi possivel concluir a operacao.', true);
    return null;
  }
}

function cleanFilters(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value !== null && value !== undefined));
}

function currentEntryFilters() {
  const filters = cleanFilters({ ...state.filters });

  if (state.view === 'payable') {
    filters.entry_type = 'payable';
  }

  if (state.view === 'receivable') {
    filters.entry_type = 'receivable';
  }

  return filters;
}

async function refreshAll() {
  state.bootstrap = await api.getBootstrap();
  state.lookups = state.bootstrap.lookups;
  state.snapshot = state.bootstrap.snapshot;
  state.settings = state.bootstrap.settings;
  state.license = state.bootstrap.license;
  state.health = state.bootstrap.health;
  byId('database-path').textContent = `Banco: ${state.bootstrap.databasePath}`;
  updateLicenseUi();

  await loadEntries();

  if (catalogViewKinds[state.view]) {
    state.catalogKind = catalogViewKinds[state.view];
    await loadCatalog();
  }

  if (state.view === 'reports') {
    state.audit = await api.listAudit(80);
  }

  if (state.view === 'health') {
    state.health = await api.getHealth();
  }

  renderNav();
  render();
}

function updateLicenseUi() {
  const active = state.license?.active;
  document.querySelector('.shell').hidden = !active;
  byId('activation-screen').hidden = Boolean(active);
  byId('license-pill').textContent = state.license?.label || 'Nao ativado';
  byId('license-pill').className = `db-pill license-pill ${active ? 'active' : 'blocked'}`;

  if (!active) {
    byId('activation-message').textContent = state.license?.message || 'Ative para liberar o painel.';
    byId('activation-api-url').value = state.settings?.license?.apiUrl || 'http://localhost:3877';
  }
}

async function loadEntries() {
  state.entries = await api.listEntries(currentEntryFilters());
}

async function loadCatalog() {
  state.catalogRows = await api.listCatalog(state.catalogKind);
}

async function setView(view) {
  state.view = view;

  if (['payable', 'receivable', 'entries'].includes(view)) {
    await loadEntries();
  }

  if (catalogViewKinds[view]) {
    state.catalogKind = catalogViewKinds[view];
    await loadCatalog();
  }

  if (view === 'reports') {
    state.audit = await api.listAudit(80);
  }

  if (view === 'health') {
    state.health = await api.getHealth();
  }

  renderNav();
  render();
}

function renderNav() {
  const menu = byId('module-menu');

  menu.innerHTML = state.bootstrap.modules
    .map(
      (module) => `
        <button class="menu-item ${state.view === module.id ? 'active' : ''}" data-view="${module.id}" type="button">
          <span class="menu-icon ${escapeHtml(module.icon || 'grid')}" aria-hidden="true"></span>
          <span>${escapeHtml(module.label)}</span>
        </button>
      `
    )
    .join('');
}

function render() {
  const [eyebrow, title] = viewMeta[state.view] || viewMeta.dashboard;
  byId('view-eyebrow').textContent = eyebrow;
  byId('view-title').textContent = title;

  const renderers = {
    dashboard: renderDashboard,
    payable: () => renderEntriesView('payable'),
    receivable: () => renderEntriesView('receivable'),
    entries: () => renderEntriesView('all'),
    catalogs: () => renderCatalogs('parties'),
    catalog_parties: () => renderCatalogs('parties'),
    catalog_categories: () => renderCatalogs('categories'),
    catalog_cost_centers: () => renderCatalogs('cost_centers'),
    reports: renderReports,
    health: renderHealth,
    backup: renderBackup
  };

  renderers[state.view]();
}

function metricCard(label, value, detail, tone = '') {
  return `
    <article class="metric-card ${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function sumRows(rows, field) {
  return (rows || []).reduce((total, row) => total + Number(row[field] || 0), 0);
}

function monthLabel() {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());
}

function renderFinanceChart(rows) {
  const fallbackRows = rows?.length
    ? rows
    : [
        { due_date: '2026-04-01', receivable: 1200, payable: 800, balance: 400 },
        { due_date: '2026-04-06', receivable: 1800, payable: 1000, balance: 800 },
        { due_date: '2026-04-11', receivable: 1600, payable: 1250, balance: 350 },
        { due_date: '2026-04-16', receivable: 2600, payable: 980, balance: 1620 },
        { due_date: '2026-04-21', receivable: 3200, payable: 1500, balance: 1700 },
        { due_date: '2026-04-26', receivable: 2800, payable: 1100, balance: 1700 },
        { due_date: '2026-04-30', receivable: 3600, payable: 1400, balance: 2200 }
      ];
  const limited = fallbackRows.slice(0, 18);
  const maxValue = Math.max(
    1,
    ...limited.map((row) => Math.max(Number(row.receivable || 0), Number(row.payable || 0), Math.abs(Number(row.balance || 0))))
  );
  const points = limited
    .map((row, index) => {
      const x = limited.length === 1 ? 50 : (index / (limited.length - 1)) * 100;
      const y = 100 - Math.max(8, (Math.abs(Number(row.balance || 0)) / maxValue) * 82);
      return `${x},${y}`;
    })
    .join(' ');

  return `
    <div class="finance-chart">
      <div class="chart-bars-row">
        ${limited
          .map((row) => {
            const amount = Math.max(Number(row.receivable || 0), Number(row.payable || 0));
            const height = Math.max(12, Math.round((amount / maxValue) * 100));
            const kind = Number(row.payable || 0) > Number(row.receivable || 0) ? 'payable' : 'receivable';
            return `<span class="flow-bar ${kind}" style="height:${height}%"></span>`;
          })
          .join('')}
      </div>
      <svg class="chart-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points="${points}"></polyline>
      </svg>
    </div>
  `;
}

function renderMiniBars(values, className = '') {
  const numbers = values.map((value) => Math.max(0, Number(value || 0)));
  const max = Math.max(1, ...numbers);

  return `
    <div class="mini-bars ${className}">
      ${numbers.map((value) => `<span style="height:${Math.max(18, Math.round((value / max) * 100))}%"></span>`).join('')}
    </div>
  `;
}

function renderDashboard() {
  const { totals, counts, nextEntries, cashFlow, planSummary } = state.snapshot;
  const root = byId('view-root');
  const totalOverdue = counts.overduePayables + counts.overdueReceivables;
  const totalDueToday = counts.dueTodayPayables + counts.dueTodayReceivables;
  const receivableFlow = sumRows(cashFlow, 'receivable');
  const payableFlow = sumRows(cashFlow, 'payable');
  const overdueAmount = state.entries
    .filter((entry) => entry.status === 'overdue')
    .reduce((total, entry) => total + Number(entry.amount_open || 0), 0);

  root.innerHTML = `
    <section class="metrics">
      ${metricCard('A Receber Hoje', formatCurrency(totals.totalReceivableOpen), `${counts.dueTodayReceivables} vencem hoje`, 'moss')}
      ${metricCard('A Pagar Hoje', formatCurrency(totals.totalPayableOpen), `${counts.dueTodayPayables} vencem hoje`, 'clay')}
      ${metricCard('Vencidos', formatCurrency(overdueAmount), `${totalOverdue} titulo(s) em atraso`, '')}
      ${metricCard('Saldo do Caixa', formatCurrency(totals.projectedBalance), 'Previsto pelos lancamentos', 'slate')}
    </section>

    ${renderAlertCenter(counts)}

    <section class="dashboard-grid">
      <article class="panel">
        <div class="panel-header">
          <h3>Fluxo de Caixa</h3>
          <span class="muted">Proximos 45 dias</span>
        </div>
        ${renderFinanceChart(cashFlow)}
        <div class="chart-legend">
          <span><i class="legend-dot"></i>Recebimentos</span>
          <span><i class="legend-dot red"></i>Despesas</span>
        </div>
        <div class="dashboard-totals">
          <span>Recebido: <strong class="money-in">${formatCurrency(totals.receivedThisMonth)}</strong></span>
          <span>A vencer: <strong>${formatCurrency(receivableFlow)}</strong></span>
          <span>A pagar: <strong class="money-out">${formatCurrency(payableFlow)}</strong></span>
        </div>
      </article>

      <div class="side-stack">
        <article class="panel">
          <div class="panel-header">
            <h3>Contas Vencidas</h3>
            <span class="muted">${totalOverdue} alerta(s)</span>
          </div>
          <p class="money-out" style="font-size:1.55rem;margin:0 0 4px">${formatCurrency(overdueAmount)}</p>
          <p class="muted" style="margin:0">Regularize ou reprograme os vencimentos.</p>
        </article>

        <article class="panel">
          <div class="panel-header">
            <h3>Resumo do Mes</h3>
            <span class="muted">${escapeHtml(monthLabel())}</span>
          </div>
          <p class="muted" style="margin:0">Recebido</p>
          <p class="money-in" style="font-size:1.4rem;margin:6px 0 10px">${formatCurrency(totals.receivedThisMonth)}</p>
          ${renderMiniBars([totals.receivedThisMonth, receivableFlow, totals.totalReceivableOpen, totals.projectedBalance], 'received')}
          <p class="muted" style="margin:14px 0 0">Vencidos</p>
          <p class="money-out" style="font-size:1.2rem;margin:4px 0 0">${formatCurrency(overdueAmount)}</p>
        </article>
      </div>
    </section>

    <section class="grid-two">
      <article class="panel">
        <div class="panel-header">
          <h3>Proximos vencimentos</h3>
          <button class="ghost" data-action="new-entry" data-type="payable" type="button">Novo lancamento</button>
        </div>
        ${renderNextEntries(nextEntries)}
      </article>

      <article class="panel">
        <div class="panel-header">
          <h3>Fluxo previsto</h3>
          <span class="muted">Detalhado por data</span>
        </div>
        ${renderCashFlow(cashFlow)}
      </article>
    </section>

    <section class="panel premium-strip">
      <div>
        <p class="eyebrow">FinancePro</p>
        <h3>Separacao por contas unicas, fixas e parceladas</h3>
      </div>
      <div class="plan-chips">
        ${renderPlanChips(planSummary)}
      </div>
    </section>
  `;
}

function renderAlertCenter(counts) {
  const alerts = [];

  if (counts.overduePayables > 0) alerts.push(['danger', `${counts.overduePayables} conta(s) a pagar vencida(s)`]);
  if (counts.overdueReceivables > 0) alerts.push(['danger', `${counts.overdueReceivables} recebimento(s) vencido(s)`]);
  if (counts.dueTodayPayables > 0) alerts.push(['warning', `${counts.dueTodayPayables} conta(s) a pagar vencem hoje`]);
  if (counts.dueTodayReceivables > 0) alerts.push(['success', `${counts.dueTodayReceivables} recebimento(s) vencem hoje`]);
  if (counts.dueSoonPayables > 0) alerts.push(['warning', `${counts.dueSoonPayables} conta(s) a pagar vencem em breve`]);
  if (counts.dueSoonReceivables > 0) alerts.push(['success', `${counts.dueSoonReceivables} recebimento(s) vencem em breve`]);

  if (!alerts.length) {
    alerts.push(['success', 'Tudo certo agora: nenhum alerta critico em aberto.']);
  }

  return `
    <section class="alert-center">
      ${alerts.map(([tone, text]) => `<div class="alert-pill ${tone}">${escapeHtml(text)}</div>`).join('')}
    </section>
  `;
}

function renderPlanChips(rows) {
  const byPlan = Object.fromEntries((rows || []).map((row) => [row.plan_type || 'single', row]));

  return ['single', 'fixed', 'installment']
    .map((plan) => {
      const row = byPlan[plan] || { entry_count: 0, amount_open: 0 };
      return `
        <div class="plan-chip ${plan}">
          <strong>${planLabels[plan]}</strong>
          <span>${row.entry_count} titulo(s)</span>
          <small>${formatCurrency(row.amount_open)}</small>
        </div>
      `;
    })
    .join('');
}

function renderNextEntries(entries) {
  if (!entries.length) {
    return `<div class="empty-state">Nenhum titulo em aberto. Cadastre uma conta para iniciar o controle.</div>`;
  }

  return `
    <div class="entry-list">
      ${entries
        .map(
          (entry) => `
            <div class="entry-item">
              <div>
                <h4>${escapeHtml(entry.description)}</h4>
                <p>${typeLabels[entry.entry_type]} | ${planLabels[entry.plan_type || 'single']} | ${formatDate(entry.due_date)} | ${escapeHtml(entry.party_name || 'Sem pessoa')}</p>
              </div>
              <div>
                <span class="status ${entry.status}">${statusLabels[entry.status]}</span>
                <p><strong>${formatCurrency(entry.amount_open)}</strong></p>
              </div>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

function renderCashFlow(rows) {
  if (!rows.length) {
    return `<div class="empty-state">Sem fluxo previsto para os proximos 45 dias.</div>`;
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Receber</th>
          <th>Pagar</th>
          <th>Saldo</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td>${formatDate(row.due_date)}</td>
                <td>${formatCurrency(row.receivable)}</td>
                <td>${formatCurrency(row.payable)}</td>
                <td><strong>${formatCurrency(row.balance)}</strong></td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderEntriesView(type) {
  const root = byId('view-root');
  const title = type === 'payable' ? 'Contas a pagar' : type === 'receivable' ? 'Contas a receber' : 'Lancamentos';
  const newType = type === 'receivable' ? 'receivable' : 'payable';

  root.innerHTML = `
    <section class="table-card">
      <div class="list-header">
        <div>
          <h3>${title}</h3>
          <p class="muted">${state.entries.length} registro(s) encontrado(s)</p>
        </div>
        <div class="topbar-actions">
          <button class="ghost" data-action="export-csv" type="button">Exportar CSV</button>
          <button class="primary" data-action="new-entry" data-type="${newType}" type="button">Novo</button>
        </div>
      </div>

      <div class="toolbar">
        <label class="field-inline">
          Busca
          <input id="filter-query" value="${escapeHtml(state.filters.query)}" placeholder="Descricao, pessoa ou categoria" />
        </label>
        <label class="field-inline">
          Status
          <select id="filter-status">
            ${option('', 'Todos', state.filters.status)}
            ${option('open', 'Aberto', state.filters.status)}
            ${option('partial', 'Parcial', state.filters.status)}
            ${option('overdue', 'Vencido', state.filters.status)}
            ${option('settled', 'Liquidado', state.filters.status)}
            ${option('cancelled', 'Cancelado', state.filters.status)}
          </select>
        </label>
        <label class="field-inline">
          Modelo
          <select id="filter-plan-type">
            ${option('', 'Todos', state.filters.plan_type)}
            ${option('single', 'Unica', state.filters.plan_type)}
            ${option('fixed', 'Fixa mensal', state.filters.plan_type)}
            ${option('installment', 'Parcelada', state.filters.plan_type)}
          </select>
        </label>
        <label class="field-inline">
          De
          <input id="filter-due-from" type="date" value="${escapeHtml(state.filters.due_from)}" />
        </label>
        <label class="field-inline">
          Ate
          <input id="filter-due-to" type="date" value="${escapeHtml(state.filters.due_to)}" />
        </label>
        <button class="soft-button" data-action="apply-filters" type="button">Filtrar</button>
        <button class="ghost" data-action="clear-filters" type="button">Limpar</button>
      </div>

      ${renderEntriesTable(state.entries)}
    </section>
  `;
}

function renderEntriesTable(entries) {
  if (!entries.length) {
    return `<div class="empty-state">Nenhum lancamento encontrado para os filtros atuais.</div>`;
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Vencimento</th>
          <th>Descricao</th>
          <th>Pessoa</th>
          <th>Modelo</th>
          <th>Categoria</th>
          <th>Valor</th>
          <th>Aberto</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${entries
          .map(
            (entry) => `
              <tr>
                <td>${formatDate(entry.due_date)}</td>
                <td>
                  <strong>${escapeHtml(entry.description)}</strong>
                  <div class="muted">${typeLabels[entry.entry_type]} | ${escapeHtml(entry.account_name || 'Sem conta')}</div>
                  ${entry.cancellation_reason ? `<div class="muted">Cancelado: ${escapeHtml(entry.cancellation_reason)}</div>` : ''}
                </td>
                <td>${escapeHtml(entry.party_name || '-')}</td>
                <td>
                  <span class="badge plan ${entry.plan_type || 'single'}">${planLabelWithInstallment(entry)}</span>
                </td>
                <td>${escapeHtml(entry.category_name || '-')}</td>
                <td>${formatCurrency(entry.amount_total)}</td>
                <td><strong>${formatCurrency(entry.amount_open)}</strong></td>
                <td><span class="status ${entry.status}">${statusLabels[entry.status]}</span></td>
                <td class="actions">
                  ${
                    ['open', 'partial', 'overdue'].includes(entry.status)
                      ? `<button class="soft-button" data-action="settle-entry" data-id="${entry.id}" type="button">Baixar</button>`
                      : ''
                  }
                  ${
                    entry.status !== 'cancelled'
                      ? `<button class="ghost" data-action="edit-entry" data-id="${entry.id}" type="button">Editar</button>`
                      : ''
                  }
                  ${
                    entry.status !== 'cancelled'
                      ? `<button class="danger" data-action="delete-entry" data-id="${entry.id}" type="button">Cancelar</button>`
                      : ''
                  }
                </td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function planLabelWithInstallment(entry) {
  const plan = entry.plan_type || 'single';

  if (plan === 'installment' && entry.installment_total) {
    return `${planLabels[plan]} ${entry.installment_number}/${entry.installment_total}`;
  }

  return planLabels[plan] || planLabels.single;
}

function renderCatalogs(kind = state.catalogKind) {
  state.catalogKind = kind;
  const root = byId('view-root');
  const showTabs = state.view === 'catalogs';

  root.innerHTML = `
    <section class="table-card">
      ${
        showTabs
          ? `<div class="tabs">
              ${Object.entries(catalogConfigs)
                .map(
                  ([catalogKind, config]) => `
                    <button class="tab ${state.catalogKind === catalogKind ? 'active' : ''}" data-action="catalog-tab" data-kind="${catalogKind}" type="button">
                      ${escapeHtml(config.label)}
                    </button>
                  `
                )
                .join('')}
            </div>`
          : ''
      }

      <div class="list-header">
        <div>
          <h3>${catalogConfigs[state.catalogKind].label}</h3>
          <p class="muted">${state.catalogRows.length} registro(s)</p>
        </div>
        <button class="primary" data-action="catalog-new" type="button">Novo cadastro</button>
      </div>

      ${renderCatalogTable()}
    </section>
  `;
}

function renderCatalogTable() {
  const config = catalogConfigs[state.catalogKind];

  if (!state.catalogRows.length) {
    return `<div class="empty-state">Nenhum cadastro encontrado.</div>`;
  }

  return `
    <table>
      <thead>
        <tr>
          ${config.columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join('')}
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${state.catalogRows
          .map(
            (row) => `
              <tr>
                ${config.columns.map(([field]) => `<td>${formatCatalogValue(field, row[field])}</td>`).join('')}
                <td><span class="status ${row.is_active ? 'settled' : 'cancelled'}">${row.is_active ? 'Ativo' : 'Inativo'}</span></td>
                <td class="actions">
                  <button class="ghost" data-action="catalog-edit" data-id="${row.id}" type="button">Editar</button>
                  <button class="danger" data-action="catalog-delete" data-id="${row.id}" type="button">Inativar</button>
                </td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function formatCatalogValue(field, value) {
  if (field === 'current_balance') {
    return formatCurrency(value);
  }

  if (field === 'color') {
    return `<span class="badge" style="background:${escapeHtml(value || '#ddd')}">${escapeHtml(value || '-')}</span>`;
  }

  return escapeHtml(value || '-');
}

function renderReports() {
  const { categorySummary, accounts, totals } = state.snapshot;
  const root = byId('view-root');

  root.innerHTML = `
    <section class="metrics">
      ${metricCard('Recebido no mes', formatCurrency(totals.receivedThisMonth), 'Baixas de entrada', 'moss')}
      ${metricCard('Pago no mes', formatCurrency(totals.paidThisMonth), 'Baixas de saida', 'clay')}
      ${metricCard('Saldo previsto', formatCurrency(totals.projectedBalance), 'Aberto liquido', 'slate')}
      ${metricCard('Contas ativas', String(accounts.length), 'Caixas e bancos', '')}
    </section>

    <section class="grid-two">
      <article class="panel">
        <div class="panel-header">
          <h3>Resumo por categoria</h3>
          <span class="muted">Somente em aberto</span>
        </div>
        ${renderCategorySummary(categorySummary)}
      </article>

      <article class="panel">
        <div class="panel-header">
          <h3>Saldos das contas</h3>
          <span class="muted">Atualizado nas baixas</span>
        </div>
        ${renderAccounts(accounts)}
      </article>
    </section>

    <section class="table-card" style="margin-top:16px">
      <div class="panel-header">
        <h3>Auditoria recente</h3>
        <span class="muted">Criacoes, edicoes, baixas e exclusoes</span>
      </div>
      ${renderAudit()}
    </section>
  `;
}

function renderHealth() {
  const health = state.health || {};
  const license = state.license || {};
  const root = byId('view-root');

  root.innerHTML = `
    <section class="metrics">
      ${metricCard('Saude geral', healthLabel(health.status), `Verificado em ${health.checkedAt || '-'}`, healthTone(health.status))}
      ${metricCard('Banco local', healthLabel(health.database), 'SQLite offline', healthTone(health.database))}
      ${metricCard('Licenca', license.label || 'Nao ativado', license.plan ? `Plano ${license.plan}` : 'Controle comercial', license.active ? 'moss' : 'clay')}
      ${metricCard('Erros 5 min', String(health.errorsLast5min || 0), `${health.warningsLast5min || 0} alerta(s) recentes`, health.errorsLast5min ? 'clay' : 'slate')}
    </section>

    <section class="grid-two">
      <article class="panel">
        <div class="panel-header">
          <h3>Estado do produto</h3>
          <button class="ghost" data-action="refresh-health" type="button">Reverificar</button>
        </div>
        <div class="health-board">
          ${healthRow('Sistema', health.status)}
          ${healthRow('Banco de dados', health.database)}
          ${healthRow('Licenca', health.license)}
          ${healthRow('Versao', health.appVersion || '-')}
          ${healthRow('Dispositivo', license.deviceId ? `${license.deviceId.slice(0, 12)}...` : '-')}
        </div>
        ${renderRecommendations(health.recommendations || [])}
      </article>

      <article class="panel">
        <div class="panel-header">
          <h3>Licenca comercial</h3>
          <span class="status ${license.active ? 'settled' : 'overdue'}">${license.label || 'Nao ativado'}</span>
        </div>
        <div class="license-card">
          <p><strong>Cliente:</strong> ${escapeHtml(license.customerName || '-')}</p>
          <p><strong>Email:</strong> ${escapeHtml(license.customerEmail || '-')}</p>
          <p><strong>Plano:</strong> ${escapeHtml(license.plan || '-')}</p>
          <p><strong>Validade:</strong> ${license.expiresAt ? escapeHtml(new Date(license.expiresAt).toLocaleString('pt-BR')) : '-'}</p>
          <p><strong>Modulos:</strong> ${escapeHtml((license.modules || []).join(', ') || '-')}</p>
        </div>
        <div class="modal-actions">
          <button class="danger" data-action="clear-license" type="button">Remover licenca local</button>
        </div>
      </article>
    </section>

    <section class="table-card" style="margin-top:16px">
      <div class="panel-header">
        <h3>Logs operacionais</h3>
        <span class="muted">Acoes, erros, licenca e health</span>
      </div>
      <div id="logs-container">${renderLogs([])}</div>
    </section>
  `;

  loadLogsIntoPanel();
}

function healthLabel(value) {
  const labels = {
    ok: 'Verde',
    warning: 'Amarelo',
    critical: 'Vermelho',
    unknown: 'Desconhecido'
  };

  return labels[value] || String(value || 'Desconhecido');
}

function healthTone(value) {
  if (value === 'critical') return 'clay';
  if (value === 'warning') return '';
  return 'moss';
}

function healthRow(label, value) {
  const stateValue = ['ok', 'warning', 'critical'].includes(value) ? value : 'unknown';
  return `
    <div class="health-row">
      <span>${escapeHtml(label)}</span>
      <strong class="health-dot ${stateValue}">${escapeHtml(healthLabel(value))}</strong>
    </div>
  `;
}

function renderRecommendations(items) {
  if (!items.length) {
    return `<div class="empty-state">Nenhuma recomendacao critica agora.</div>`;
  }

  return `<ul class="recommendations">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

async function loadLogsIntoPanel() {
  const logs = await api.listLogs({ limit: 120 });
  const container = byId('logs-container');

  if (container) {
    container.innerHTML = renderLogs(logs);
  }
}

function renderLogs(logs) {
  if (!logs.length) {
    return `<div class="empty-state">Carregando logs...</div>`;
  }

  return `
    <table>
      <thead>
        <tr><th>Data</th><th>Nivel</th><th>Tipo</th><th>Mensagem</th></tr>
      </thead>
      <tbody>
        ${logs
          .map(
            (log) => `
              <tr>
                <td>${escapeHtml(log.created_at)}</td>
                <td><span class="status ${log.level === 'error' || log.level === 'critical' ? 'overdue' : log.level === 'warning' ? 'partial' : 'settled'}">${escapeHtml(log.level)}</span></td>
                <td>${escapeHtml(log.log_type)}</td>
                <td>${escapeHtml(log.message)}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderCategorySummary(rows) {
  if (!rows.length) {
    return `<div class="empty-state">Sem valores em aberto por categoria.</div>`;
  }

  return `
    <table>
      <thead>
        <tr><th>Tipo</th><th>Categoria</th><th>Qtd</th><th>Aberto</th></tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td>${typeLabels[row.entry_type]}</td>
                <td>${escapeHtml(row.category_name)}</td>
                <td>${row.entry_count}</td>
                <td><strong>${formatCurrency(row.amount_open)}</strong></td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderAccounts(accounts) {
  if (!accounts.length) {
    return `<div class="empty-state">Nenhuma conta financeira ativa.</div>`;
  }

  return `
    <table>
      <thead>
        <tr><th>Conta</th><th>Tipo</th><th>Saldo</th></tr>
      </thead>
      <tbody>
        ${accounts
          .map(
            (account) => `
              <tr>
                <td>${escapeHtml(account.name)}</td>
                <td>${escapeHtml(account.account_type)}</td>
                <td><strong>${formatCurrency(account.current_balance)}</strong></td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderAudit() {
  if (!state.audit.length) {
    return `<div class="empty-state">Nenhum evento de auditoria ainda.</div>`;
  }

  return `
    <table>
      <thead>
        <tr><th>Data</th><th>Entidade</th><th>Acao</th><th>ID</th></tr>
      </thead>
      <tbody>
        ${state.audit
          .map(
            (item) => `
              <tr>
                <td>${escapeHtml(item.created_at)}</td>
                <td>${escapeHtml(item.entity_name)}</td>
                <td>${escapeHtml(item.action)}</td>
                <td>${item.entity_id}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderBackup() {
  const notifications = state.settings.notifications;
  const root = byId('view-root');

  root.innerHTML = `
    <section class="backup-grid">
      <article class="backup-card">
        <h3>Backup local</h3>
        <p class="muted">Cria uma copia completa do banco `.db` para guardar em pendrive, nuvem ou outra pasta.</p>
        <button class="primary" data-action="create-backup" type="button">Criar backup</button>
      </article>
      <article class="backup-card">
        <h3>Exportacao CSV</h3>
        <p class="muted">Exporta os lancamentos filtrados para planilha CSV.</p>
        <button class="ghost" data-action="export-csv" type="button">Exportar lancamentos</button>
      </article>
      <article class="backup-card">
        <h3>Restauracao</h3>
        <p class="muted">Restaura um backup `.db`. O sistema cria uma copia de seguranca antes.</p>
        <button class="danger" data-action="restore-backup" type="button">Restaurar backup</button>
      </article>
    </section>

    <section class="table-card" style="margin-top:16px">
      <div class="panel-header">
        <h3>Configuracoes de notificacao</h3>
        <span class="muted">Alertas nativos do Windows</span>
      </div>
      <div class="form-grid three">
        <label>
          Notificacoes ativas
          <select id="setting-notifications-enabled">
            ${option('true', 'Sim', String(notifications.enabled !== false))}
            ${option('false', 'Nao', String(notifications.enabled !== false))}
          </select>
        </label>
        <label>
          Avisar com antecedencia
          <input id="setting-due-soon-days" type="number" min="0" max="60" value="${Number(notifications.dueSoonDays || 3)}" />
        </label>
        <label>
          Resumo ao abrir
          <select id="setting-daily-summary">
            ${option('true', 'Sim', String(notifications.dailySummaryOnStartup !== false))}
            ${option('false', 'Nao', String(notifications.dailySummaryOnStartup !== false))}
          </select>
        </label>
      </div>
      <div class="modal-actions">
        <button class="primary" data-action="save-settings" type="button">Salvar configuracoes</button>
      </div>
    </section>
  `;
}

function option(value, label, selectedValue) {
  return `<option value="${escapeHtml(value)}" ${String(value) === String(selectedValue) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}

function fillSelect(id, items, selectedValue, labelField = 'name') {
  const select = byId(id);
  select.innerHTML = [
    '<option value="">Sem vinculo</option>',
    ...items.map((item) => option(item.id, item[labelField], selectedValue))
  ].join('');
}

function openEntryDialog(type = 'payable', entry = null) {
  const isEditing = Boolean(entry);
  const today = todayLocal();
  const dialog = byId('entry-dialog');
  byId('entry-dialog-title').textContent = isEditing ? 'Editar lancamento' : 'Novo lancamento';
  byId('entry-submit-button').textContent = isEditing ? 'Salvar alteracoes' : 'Salvar lancamento';
  byId('entry-id').value = entry?.id || '';
  byId('entry-type').value = entry?.entry_type || type;
  byId('entry-plan-type').value = entry?.plan_type || 'single';
  byId('entry-description').value = entry?.description || '';
  byId('entry-issue-date').value = entry?.issue_date || today;
  byId('entry-competence-date').value = entry?.competence_date || today;
  byId('entry-due-date').value = entry?.due_date || today;
  byId('entry-amount-total').value = entry?.amount_total || '';
  byId('entry-discount').value = entry?.amount_discount || 0;
  byId('entry-interest').value = entry?.amount_interest || 0;
  byId('entry-penalty').value = entry?.amount_penalty || 0;
  byId('entry-status').value = entry?.status || 'open';
  byId('entry-installments').value = entry?.installment_total || 1;
  byId('entry-installment-interval').value = 1;
  byId('entry-fixed-months').value = 24;
  byId('entry-notes').value = entry?.notes || '';

  fillSelect('entry-party', state.lookups.parties || [], entry?.party_id);
  fillSelect('entry-category', state.lookups.categories || [], entry?.category_id);
  fillSelect('entry-cost-center', state.lookups.cost_centers || [], entry?.cost_center_id);
  fillSelect('entry-account', state.lookups.accounts || [], entry?.account_id);
  fillSelect('entry-payment-method', state.lookups.payment_methods || [], entry?.payment_method_id);

  refreshPlanFields(isEditing);
  updateInstallmentPreview();
  dialog.showModal();
}

function refreshPlanFields(isEditing = Boolean(byId('entry-id').value)) {
  const planType = byId('entry-plan-type').value;

  document.querySelectorAll('.installment-field').forEach((field) => {
    field.style.display = !isEditing && planType === 'installment' ? 'grid' : 'none';
  });

  document.querySelectorAll('.fixed-field').forEach((field) => {
    field.style.display = !isEditing && planType === 'fixed' ? 'grid' : 'none';
  });
}

function updateInstallmentPreview() {
  const total = Number(byId('entry-amount-total').value || 0);
  const installments = Math.max(1, Number(byId('entry-installments').value || 1));
  const preview = byId('installment-preview');
  const amount = installments > 0 ? total / installments : 0;
  preview.textContent = total > 0 && installments > 1 ? `${formatCurrency(total)} em ${installments}x de ${formatCurrency(amount)}` : 'Use para compras parceladas, como cama, cartao ou carne.';
}

function serializeForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function saveEntryForm() {
  const form = byId('entry-form');

  if (!form.reportValidity()) {
    return;
  }

  const payload = serializeForm(form);
  const id = payload.id;
  delete payload.id;

  await runSafely(async () => {
    if (id) {
      await api.updateEntry(Number(id), payload);
    } else {
      await api.createEntry(payload);
    }

    byId('entry-dialog').close();
    await refreshAll();
  }, id ? 'Lancamento atualizado.' : 'Lancamento criado.');
}

async function editEntry(id) {
  const result = await runSafely(() => api.getEntry(Number(id)));

  if (result?.entry) {
    openEntryDialog(result.entry.entry_type, result.entry);
  }
}

async function openCancelDialog(id) {
  const result = await runSafely(() => api.getEntry(Number(id)));

  if (!result?.entry) {
    return;
  }

  byId('cancel-entry-id').value = result.entry.id;
  byId('cancel-entry-info').textContent = `${result.entry.description} | ${formatCurrency(result.entry.amount_open)} em aberto | ${formatDate(result.entry.due_date)}`;
  byId('cancel-reason').value = '';
  byId('cancel-dialog').showModal();
}

async function saveCancelForm() {
  const form = byId('cancel-form');

  if (!form.reportValidity()) {
    return;
  }

  const payload = serializeForm(form);
  const id = payload.id;
  delete payload.id;

  await runSafely(async () => {
    await api.deleteEntry(Number(id), payload);
    byId('cancel-dialog').close();
    await refreshAll();
  }, 'Lancamento cancelado com motivo registrado.');
}

async function openSettleDialog(id) {
  const result = await runSafely(() => api.getEntry(Number(id)));

  if (!result?.entry) {
    return;
  }

  const entry = result.entry;
  byId('settle-entry-id').value = entry.id;
  byId('settle-title').textContent = entry.entry_type === 'payable' ? 'Registrar pagamento' : 'Registrar recebimento';
  byId('settle-entry-info').textContent = `${entry.description} | Aberto: ${formatCurrency(entry.amount_open)}`;
  byId('settle-date').value = todayLocal();
  byId('settle-amount').value = Math.max(0, Number(entry.amount_open || 0)).toFixed(2);
  byId('settle-discount').value = 0;
  byId('settle-interest').value = 0;
  byId('settle-penalty').value = 0;
  byId('settle-notes').value = '';
  byId('settle-dialog').showModal();
}

async function saveSettlementForm() {
  const form = byId('settle-form');

  if (!form.reportValidity()) {
    return;
  }

  const payload = serializeForm(form);
  const id = payload.id;
  delete payload.id;

  await runSafely(async () => {
    await api.settleEntry(Number(id), payload);
    byId('settle-dialog').close();
    await refreshAll();
  }, 'Baixa registrada.');
}

function openCatalogDialog(kind, row = null) {
  const config = catalogConfigs[kind];
  const dialog = byId('catalog-dialog');
  byId('catalog-title').textContent = row ? `Editar ${config.label}` : `Novo em ${config.label}`;
  byId('catalog-kind').value = kind;
  byId('catalog-id').value = row?.id || '';
  byId('catalog-fields').innerHTML = config.fields
    .map((field) => renderCatalogField(field, row?.[field.name]))
    .join('');
  dialog.showModal();
}

function renderCatalogField(field, value) {
  if (field.type === 'select') {
    const selectedValue = value ?? field.options?.[0]?.[0] ?? '';

    return `
      <label>
        ${escapeHtml(field.label)}
        <select name="${field.name}" ${field.required ? 'required' : ''}>
          ${(field.options || []).map(([optionValue, label]) => option(optionValue, label, selectedValue)).join('')}
        </select>
      </label>
    `;
  }

  if (field.type === 'textarea') {
    return `
      <label class="span-2">
        ${escapeHtml(field.label)}
        <textarea name="${field.name}" rows="3">${escapeHtml(value || '')}</textarea>
      </label>
    `;
  }

  const inputType = field.type || 'text';

  return `
    <label>
      ${escapeHtml(field.label)}
      <input name="${field.name}" type="${inputType}" value="${escapeHtml(value ?? (inputType === 'color' ? '#4E5B31' : ''))}" ${
        field.required ? 'required' : ''
      } ${inputType === 'number' ? 'step="0.01"' : ''} />
    </label>
  `;
}

async function saveCatalogForm() {
  const form = byId('catalog-form');

  if (!form.reportValidity()) {
    return;
  }

  const payload = serializeForm(form);
  const kind = payload.kind;
  const id = payload.id;
  delete payload.kind;
  delete payload.id;

  await runSafely(async () => {
    if (id) {
      await api.updateCatalog(kind, Number(id), payload);
    } else {
      await api.createCatalog(kind, payload);
    }

    byId('catalog-dialog').close();
    await refreshAll();
  }, 'Cadastro salvo.');
}

async function changeCatalog(kind) {
  state.catalogKind = kind;
  await loadCatalog();
  render();
}

async function deleteCatalog(id) {
  if (!window.confirm('Deseja inativar este cadastro?')) {
    return;
  }

  await runSafely(async () => {
    await api.deleteCatalog(state.catalogKind, Number(id));
    await refreshAll();
  }, 'Cadastro inativado.');
}

async function applyFilters() {
  state.filters.query = byId('filter-query')?.value || '';
  state.filters.status = byId('filter-status')?.value || '';
  state.filters.plan_type = byId('filter-plan-type')?.value || '';
  state.filters.due_from = byId('filter-due-from')?.value || '';
  state.filters.due_to = byId('filter-due-to')?.value || '';
  await loadEntries();
  render();
}

async function clearFilters() {
  state.filters = { query: '', status: '', plan_type: '', due_from: '', due_to: '' };
  await loadEntries();
  render();
}

async function createBackup() {
  const result = await runSafely(() => api.createBackup());

  if (result && !result.canceled) {
    showToast(`Backup criado: ${result.backupPath}`);
  }
}

async function exportCsv() {
  const result = await runSafely(() => api.exportCsv(currentEntryFilters()));

  if (result && !result.canceled) {
    showToast(`CSV exportado com ${result.rows} registro(s).`);
  }
}

async function restoreBackup() {
  if (!window.confirm('Restaurar um backup substitui o banco atual. Uma copia de seguranca sera criada antes. Continuar?')) {
    return;
  }

  const result = await runSafely(() => api.restoreBackup());

  if (result && !result.canceled) {
    await refreshAll();
    showToast('Backup restaurado com sucesso.');
  }
}

async function saveSettings() {
  const notifications = {
    enabled: byId('setting-notifications-enabled').value === 'true',
    dueSoonDays: Number(byId('setting-due-soon-days').value || 3),
    dailySummaryOnStartup: byId('setting-daily-summary').value === 'true'
  };

  await runSafely(async () => {
    await api.updateSettings('notifications', notifications);
    await refreshAll();
  }, 'Configuracoes salvas.');
}

async function activateProduct() {
  const payload = {
    email: byId('activation-email').value,
    productKey: byId('activation-key').value,
    apiUrl: byId('activation-api-url').value
  };

  byId('activation-message').textContent = 'Validando chave com a API de licencas...';

  try {
    state.license = await api.activateLicense(payload);
    await refreshAll();
    showToast('Produto ativado com sucesso.');
  } catch (error) {
    byId('activation-message').textContent = error.message || 'Nao foi possivel ativar.';
  }
}

async function startTrial() {
  try {
    state.license = await api.startTrial();
    await refreshAll();
    showToast('Avaliacao de 7 dias iniciada.');
  } catch (error) {
    byId('activation-message').textContent = error.message || 'Nao foi possivel iniciar a avaliacao.';
  }
}

async function clearLicense() {
  if (!window.confirm('Remover a licenca local vai voltar para a tela de ativacao. Continuar?')) {
    return;
  }

  await runSafely(async () => {
    state.license = await api.clearLicense();
    await refreshAll();
  }, 'Licenca local removida.');
}

async function refreshHealth() {
  state.health = await api.getHealth();
  render();
}

async function scanNotifications() {
  const result = await runSafely(() => api.runNotificationScan({ force: true }));

  if (result) {
    showToast(result.hasAlerts ? result.messages.join(' | ') : 'Nenhum alerta pendente agora.');
  }
}

function bindGlobalEvents() {
  byId('module-menu').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-view]');

    if (button) {
      await setView(button.dataset.view);
    }
  });

  document.querySelectorAll('[data-window-action]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.windowAction === 'minimize') {
        api.minimizeWindow();
      }

      if (button.dataset.windowAction === 'close') {
        api.closeWindow();
      }
    });
  });

  byId('global-search').addEventListener('input', async (event) => {
    state.filters.query = event.target.value;

    if (['payable', 'receivable', 'entries'].includes(state.view)) {
      await loadEntries();
      render();
    }
  });

  byId('scan-button').addEventListener('click', scanNotifications);
  byId('refresh-button').addEventListener('click', () => runSafely(refreshAll, 'Dados atualizados.'));
  byId('activate-button').addEventListener('click', activateProduct);
  byId('trial-button').addEventListener('click', startTrial);
  byId('entry-submit-button').addEventListener('click', saveEntryForm);
  byId('settle-submit-button').addEventListener('click', saveSettlementForm);
  byId('cancel-submit-button').addEventListener('click', saveCancelForm);
  byId('catalog-submit-button').addEventListener('click', saveCatalogForm);
  byId('entry-plan-type').addEventListener('change', () => refreshPlanFields());
  byId('entry-amount-total').addEventListener('input', updateInstallmentPreview);
  byId('entry-installments').addEventListener('input', updateInstallmentPreview);

  byId('view-root').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');

    if (!button) {
      return;
    }

    const { action, id, type, kind } = button.dataset;

    const actions = {
      'new-entry': () => openEntryDialog(type || 'payable'),
      'edit-entry': () => editEntry(id),
      'delete-entry': () => openCancelDialog(id),
      'settle-entry': () => openSettleDialog(id),
      'apply-filters': applyFilters,
      'clear-filters': clearFilters,
      'catalog-tab': () => changeCatalog(kind),
      'catalog-new': () => openCatalogDialog(state.catalogKind),
      'catalog-edit': () => openCatalogDialog(state.catalogKind, state.catalogRows.find((row) => String(row.id) === String(id))),
      'catalog-delete': () => deleteCatalog(id),
      'create-backup': createBackup,
      'export-csv': exportCsv,
      'restore-backup': restoreBackup,
      'save-settings': saveSettings,
      'refresh-health': refreshHealth,
      'clear-license': clearLicense
    };

    if (actions[action]) {
      await actions[action]();
    }
  });

  api.onMenuCreateBackup(() => createBackup());
  api.onMenuExportCsv(() => exportCsv());
}

async function bootstrap() {
  bindGlobalEvents();
  await refreshAll();
}

window.addEventListener('DOMContentLoaded', () => {
  runSafely(bootstrap);
});
