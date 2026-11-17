(function(root){
function isSquareMeter(name){
 const description=String(name??'').trim();
 if(/(?:^|[^a-z0-9])m[²2](?=$|[^a-z0-9])/i.test(description))return true;
 return /^\*?\s*rev\s+/i.test(description)&&/\s+m$/i.test(description);
}
function isExcludedSection(section) {
 return /^0?608(?=\s|[-–—:]|$)/.test(String(section??'').trim());
}
function parse(rows,filename){
 const columns=['Data','Centro','Subseção','LM','Descrição LM','Estoque Disponível','Preço de Venda Unitário'];
 const headerIndex=rows.findIndex(r=>columns.every(c=>r.map(v=>String(v??'').trim()).includes(c)));
 if(headerIndex<0)throw Error('Formato inválido. Confira as colunas obrigatórias do relatório.');
 const h=rows[headerIndex].map(v=>String(v??'').trim()),idx=c=>h.indexOf(c);
 const number=v=>{if(typeof v==='number')return v;if(typeof v!=='string'||!v.trim())return NaN;const s=v.trim();return Number(s.includes(',')?s.replace(/\./g,'').replace(',','.'):s)};
 function date(v){let d;if(v instanceof Date)d=v;else if(typeof v==='number')d=new Date(Date.UTC(1899,11,30)+Math.round(v)*86400000);else{const m=String(v??'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!m)throw Error('A coluna Data deve conter uma data válida.');d=new Date(Date.UTC(+m[3],+m[2]-1,+m[1]));if(d.getUTCDate()!==+m[1]||d.getUTCMonth()!==+m[2]-1)throw Error('Data inválida.');}if(!Number.isFinite(d.getTime()))throw Error('Data inválida.');return String(d.getUTCDate()).padStart(2,'0')+'/'+String(d.getUTCMonth()+1).padStart(2,'0')+'/'+d.getUTCFullYear()}
 const products=[],seen=new Set(),dates=new Set();let excluded=0,total=0;
 for(let i=headerIndex+1;i<rows.length;i++){const r=rows[i];if(r.every(v=>v===null||v===undefined||String(v).trim()===''))continue;total++;const line=i+1;const lm=String(r[idx('LM')]??'').trim(),name=String(r[idx('Descrição LM')]??'').trim(),section=String(r[idx('Subseção')]??'').trim();const available=number(r[idx('Estoque Disponível')]),price=number(r[idx('Preço de Venda Unitário')]);if(!lm||!name||!section||!Number.isFinite(available)||!Number.isFinite(price)||price<0)throw Error('Dados ausentes ou inválidos na linha '+line+'.');if(!/bh\s*sul/i.test(String(r[idx('Centro')])))throw Error('A linha '+line+' não pertence à BH Sul. Envie apenas a base da loja.');if(seen.has(lm))throw Error('LM '+lm+' repetido. Envie uma linha por produto para evitar duplicidade.');seen.add(lm);dates.add(date(r[idx('Data')]));if(available<=0){excluded++;continue;}if(isExcludedSection(section))continue;products.push({lm,name,section,available,price,m2:isSquareMeter(name)});}
 if(!total)throw Error('A planilha não contém produtos.');if(dates.size!==1)throw Error('A planilha deve conter uma única data de referência.');if(!products.length)throw Error('Nenhum produto com saldo positivo nas subseções trabalhadas. A base atual será mantida.');
 return {date:[...dates][0],products,excluded,total,filename};
}
root.StockImport={parse,isSquareMeter,isExcludedSection};
})(typeof window!=='undefined'?window:globalThis);
