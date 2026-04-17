function normalizeUrl(value) {
  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

async function ping(url, options = {}) {
  const target = normalizeUrl(url);

  if (!target) {
    return { ok: false, url: '', status: 0, message: 'URL nao informada.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(target, {
      method: options.method || 'GET',
      headers: options.headers || {},
      signal: controller.signal
    });

    return {
      ok: response.ok,
      url: target,
      status: response.status,
      message: response.ok ? 'Conectado.' : `Retornou HTTP ${response.status}.`
    };
  } catch (error) {
    return {
      ok: false,
      url: target,
      status: 0,
      message: error.name === 'AbortError' ? 'Tempo esgotado.' : error.message
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function testOnlineConnection(settings = {}) {
  const results = [];

  if (settings.licenseApiUrl) {
    const apiUrl = normalizeUrl(settings.licenseApiUrl).replace(/\/$/, '');
    results.push({
      kind: 'api',
      ...(await ping(`${apiUrl}/api/health`))
    });
  }

  if (settings.siteUrl) {
    results.push({
      kind: 'site',
      ...(await ping(settings.siteUrl))
    });
  }

  if (settings.supabaseUrl) {
    const baseUrl = normalizeUrl(settings.supabaseUrl).replace(/\/$/, '');
    results.push({
      kind: 'supabase',
      ...(await ping(`${baseUrl}/auth/v1/health`, {
        headers: {
          apikey: settings.supabaseAnonKey || '',
          Authorization: settings.supabaseAnonKey ? `Bearer ${settings.supabaseAnonKey}` : ''
        }
      }))
    });
  }

  return {
    ok: results.length > 0 && results.every((result) => result.ok),
    results
  };
}

module.exports = {
  testOnlineConnection
};
