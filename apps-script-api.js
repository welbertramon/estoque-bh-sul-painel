(function(root){
  async function call(endpoint,token,path,options={}) {
    const method = (options.method || 'GET').toUpperCase();
    const action = path === '/api/me' ? 'me' : path === '/api/stock' ? (method === 'POST' ? 'import' : 'stock') : null;
    if (!action) throw Error('Operação não reconhecida.');
    const form = new URLSearchParams({action,id_token:token || ''});
    if (action === 'import') form.set('payload',options.body || '{}');
    // Formulário simples: o mesmo modelo de comunicação usado pelo Serviços.
    const response = await fetch(endpoint,{method:'POST',body:form,redirect:'follow',cache:'no-store'});
    if (!response.ok) throw Error('Não foi possível acessar o Google Apps Script.');
    let result;
    try { result = await response.json(); } catch { throw Error('O Apps Script não retornou JSON. Confira a implantação e as permissões.'); }
    if (!result || !Number.isInteger(result.status) || result.status < 200 || result.status > 599) throw Error('Resposta inválida do Apps Script. Confira o Code.gs implantado.');
    return new Response(JSON.stringify(result.status === 200 ? result.data : {error:result.error}),{status:result.status,headers:{'Content-Type':'application/json'}});
  }
  root.StockAppsScript={call};
})(typeof window!=='undefined'?window:globalThis);
