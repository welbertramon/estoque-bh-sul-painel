(function(){
  let token = null, expires = null;
  const sessionKey = 'estoque-bh-sul:session';
  const sessionDuration = 15 * 60 * 1000;
  function saveSession(session) {
    try {
      if (session) sessionStorage.setItem(sessionKey, JSON.stringify(session));
      else sessionStorage.removeItem(sessionKey);
    } catch {}
  }
  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(sessionKey)); }
    catch { return null; }
  }
  const $ = id => document.getElementById(id);
  const settings = window.STOCK_CONFIG || {};
  const api = (settings.apiBaseUrl || '').replace(/\/$/, '');
  function lock(message = '') {
    token = null; clearTimeout(expires); saveSession(null);
    $('dashboard').hidden = true; $('app-nav').hidden = true; $('login').hidden = false;
    $('auth-status').textContent = message;
    window.dispatchEvent(new Event('stock-signout'));
  }
  async function request(path, options = {}) {
    const requestToken = token;
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', 'Bearer ' + token);
    const response = settings.backend === 'apps-script' ? await StockAppsScript.call(api,token,path,options) : await fetch(api + path, {...options, headers, cache: 'no-store'});
    if (response.status === 401 && token === requestToken) lock('Entre com o Google para continuar.');
    return response;
  }
  window.StockAuth = {fetch: request};
  $('logout').onclick = () => { window.google?.accounts.id.disableAutoSelect(); lock('Você saiu da conta.'); };
  async function signIn(credential, deadline = Date.now() + sessionDuration) {
    if (typeof credential !== 'string' || !Number.isFinite(deadline) || deadline <= Date.now()) {
      lock('Sua sessão expirou. Entre novamente.');
      return;
    }

    token = credential;
    $('auth-status').textContent = 'Verificando acesso…';
    try {
      const payload = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const tokenDeadline = Number(JSON.parse(atob(payload)).exp) * 1000;
      const sessionDeadline = Math.min(deadline, tokenDeadline, Date.now() + sessionDuration);
      if (!Number.isFinite(sessionDeadline) || sessionDeadline <= Date.now()) throw Error('Sua sessão expirou. Entre novamente.');

      const response = await request('/api/me');
      if (token !== credential) return;
      if (!response.ok) throw Error(response.status === 403 ? 'Este e-mail não está autorizado. Peça acesso ao administrador da loja.' : 'Não foi possível entrar. Tente novamente.');
      const user = await response.json();
      if (token !== credential) return;
      if (sessionDeadline <= Date.now()) throw Error('Sua sessão expirou. Entre novamente.');

      saveSession({credential, deadline:sessionDeadline});
      clearTimeout(expires);
      expires = setTimeout(() => lock('Sua sessão expirou. Entre novamente.'), sessionDeadline - Date.now());
      $('user-email').textContent = user.email;
      $('login').hidden = true; $('dashboard').hidden = false; $('app-nav').hidden = false;
      $('nav-upload').hidden = user.role !== 'admin'; $('upload').hidden = true;
      $('home').hidden = false; $('list').hidden = true;
      window.dispatchEvent(new Event('stock-signin'));
    } catch(e) {
      if (token === credential) lock(e.message);
    }
  }
  window.startGoogleLogin = async () => {
    try {
      let config;
      if(settings.backend === 'apps-script'){
        if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(api))throw Error('Falta configurar o endereço do Google Apps Script no GitHub.');
        config = {clientId:settings.googleClientId};
      }else{
        const response = await fetch(api + '/api/config', {cache:'no-store'});
        if (!response.ok) throw Error('Não foi possível carregar a configuração do login.');
        config = await response.json();
      }
      if (!config.clientId) throw Error('O login Google está aguardando configuração do administrador.');
      google.accounts.id.initialize({client_id:config.clientId, use_fedcm_for_prompt:true,
        callback: result => signIn(result.credential)});
      google.accounts.id.renderButton($('google-button'), {type:'standard', theme:'outline', size:'large', text:'signin_with', locale:'pt-BR'});
      $('auth-status').textContent = '';
      const session = readSession();
      if (session) await signIn(session.credential, session.deadline);
    } catch(e) { $('auth-status').textContent = e.message; }
  };
})();
