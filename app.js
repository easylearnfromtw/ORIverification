(function () {
  'use strict';
  const data = window.ORI_DATA;
  const logic = window.ORILogic;
  if (!data || !logic) return;
  const $ = id => document.getElementById(id);
  const polls = data.polls;
  const verifiedArchive = [{"id":"MIRROR-20250714-1","publisher":"鏡新聞","executor":"大地民意研究公司","sponsor":"鏡新聞","published":"2025-07-14","fieldwork":"2025-07-09 至 2025-07-12","kind":"罷免態度","target":"顏寬恒","race":"臺中市第二選區","yes":27.6,"no":58.7,"likelyYes":41.2,"likelyNo":56.7,"sample":345,"source_url":"https://www.mnews.tw/story/20250714nm001","note":"同意／不同意：全體受訪者；『一定會投票』數字為該子群組內的條件比例，兩者不可混用或直接當作實際有效票率。"},{"id":"MIRROR-20250714-2","publisher":"鏡新聞","executor":"大地民意研究公司","sponsor":"鏡新聞","published":"2025-07-14","fieldwork":"2025-07-09 至 2025-07-12","kind":"罷免態度","target":"楊瓊瓔","race":"臺中市第三選區","yes":34.9,"no":43.7,"likelyYes":56.9,"likelyNo":40,"sample":308,"source_url":"https://www.mnews.tw/story/20250714nm001","note":"同意／不同意：全體受訪者；『一定會投票』數字為該子群組內的條件比例，兩者不可混用或直接當作實際有效票率。"},{"id":"MIRROR-20250714-3","publisher":"鏡新聞","executor":"大地民意研究公司","sponsor":"鏡新聞","published":"2025-07-14","fieldwork":"2025-07-09 至 2025-07-12","kind":"罷免態度","target":"廖偉翔","race":"臺中市第四選區","yes":33.2,"no":46.4,"likelyYes":43.6,"likelyNo":46.8,"sample":358,"source_url":"https://www.mnews.tw/story/20250714nm001","note":"同意／不同意：全體受訪者；『一定會投票』數字為該子群組內的條件比例，兩者不可混用或直接當作實際有效票率。"},{"id":"MIRROR-20250714-4","publisher":"鏡新聞","executor":"大地民意研究公司","sponsor":"鏡新聞","published":"2025-07-14","fieldwork":"2025-07-09 至 2025-07-12","kind":"罷免態度","target":"黃健豪","race":"臺中市第五選區","yes":34.2,"no":47.4,"likelyYes":43.3,"likelyNo":52.6,"sample":477,"source_url":"https://www.mnews.tw/story/20250714nm001","note":"同意／不同意：全體受訪者；『一定會投票』數字為該子群組內的條件比例，兩者不可混用或直接當作實際有效票率。"},{"id":"MIRROR-20250714-5","publisher":"鏡新聞","executor":"大地民意研究公司","sponsor":"鏡新聞","published":"2025-07-14","fieldwork":"2025-07-09 至 2025-07-12","kind":"罷免態度","target":"羅廷瑋","race":"臺中市第六選區","yes":38,"no":41.2,"likelyYes":51.1,"likelyNo":36.8,"sample":409,"source_url":"https://www.mnews.tw/story/20250714nm001","note":"同意／不同意：全體受訪者；『一定會投票』數字為該子群組內的條件比例，兩者不可混用或直接當作實際有效票率。"},{"id":"MIRROR-20250714-6","publisher":"鏡新聞","executor":"大地民意研究公司","sponsor":"鏡新聞","published":"2025-07-14","fieldwork":"2025-07-09 至 2025-07-12","kind":"罷免態度","target":"江啟臣","race":"臺中市第八選區","yes":31.4,"no":51.8,"likelyYes":50.7,"likelyNo":40.9,"sample":273,"source_url":"https://www.mnews.tw/story/20250714nm001","note":"同意／不同意：全體受訪者；『一定會投票』數字為該子群組內的條件比例，兩者不可混用或直接當作實際有效票率。"}];
  const events = data.events;
  const allInstitutions = logic.summarize(polls);
  const allNames = allInstitutions.map(x => x.name);
  const state = { institution: 'TVBS' };
  const f2 = n => Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '—';
  const fp = n => Number.isFinite(Number(n)) ? `${Number(n).toFixed(1)}%` : '—';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const signed = n => `${Number(n) > 0 ? '+' : ''}${f2(n)}`;
  const safeUrl = value => { try { const u = new URL(value); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch (_) { return ''; } };
  const opts = (values, selected) => values.map(v => `<option value="${esc(v)}"${String(v)===String(selected)?' selected':''}>${esc(v)}</option>`).join('');
  const pp = p => `${p.year} ${p.race}`;
  const badge = grade => grade === '資料不足' ? 'insufficient' : grade === '完全不準確' || grade === '常有誤差' ? 'caution' : '';
  const totalAvg = polls.reduce((s,p) => s+p.mae,0)/polls.length;

  $('hero-mae').innerHTML = `${f2(totalAvg)}<small> pp</small>`;
  $('metric-polls').textContent = polls.length;
  $('metric-races').textContent = new Set(polls.map(p => `${p.year}|${p.race}`)).size;
  $('metric-institutions').textContent = allNames.length;
  $('metric-hit').textContent = fp(polls.filter(p=>p.winner_hit).length/polls.length*100);

  // The editorial overview is generated from the real candidate observations.
  const heroCounts=new Map();
  for(const p of polls){const key=`${p.year}|${p.race}`;heroCounts.set(key,(heroCounts.get(key)||0)+1);}
  const heroPoints=[];
  for(const p of polls)for(const name of Object.keys(p.normalized))heroPoints.push({x:p.normalized[name],y:p.actual_norm[name],w:1/(heroCounts.get(`${p.year}|${p.race}`)*Object.keys(p.normalized).length)});
  const heroFit=logic.regression(heroPoints),hx=v=>5+v*3.5,hy=v=>160-v*1.45;
  $('hero-plot').innerHTML=`<defs><clipPath id="hero-clip"><rect x="5" y="15" width="350" height="145"/></clipPath></defs><path class="hero-ideal" d="M${hx(0)} ${hy(0)} L${hx(100)} ${hy(100)}"/>${heroFit?`<path class="hero-reg" clip-path="url(#hero-clip)" d="M${hx(0)} ${hy(heroFit.intercept)} L${hx(100)} ${hy(heroFit.intercept+heroFit.slope*100)}"/>`:''}<g clip-path="url(#hero-clip)">${heroPoints.map(p=>`<circle cx="${hx(p.x)}" cy="${hy(p.y)}" r="1.8"/>`).join('')}</g>`;

  const years = [...new Set(polls.map(p=>p.year))].sort((a,b)=>b-a);
  const races = [...new Set(polls.map(p=>p.race))].sort((a,b)=>a==='總統'?-1:b==='總統'?1:a.localeCompare(b,'zh-Hant'));
  $('filter-year').insertAdjacentHTML('beforeend',opts(years,''));
  $('filter-race').insertAdjacentHTML('beforeend',opts(races,''));
  $('compare-a').innerHTML=opts(allNames,'TVBS');
  $('compare-b').innerHTML=opts(allNames,'聯合報');
  $('election-year').innerHTML=opts([...new Set(events.map(e=>e.year))].sort((a,b)=>b-a),2024);

  function filters(includeQuery=true) {
    return {kind:$('filter-kind').value,year:$('filter-year').value,race:$('filter-race').value,query:includeQuery?$('source-search').value:''};
  }

  function renderRankings() {
    const selected=logic.selectPolls(polls,filters());
    const summaries=logic.summarize(selected);
    const eligible=summaries.filter(s=>s.rating!=='資料不足').length;
    $('filter-summary').textContent=`完整顯示 ${summaries.length} 個來源系列（${selected.length} 份民調）；${eligible} 個達評級門檻，${summaries.length - eligible} 個資料不足、不列正式名次。依平均誤差由低至高排列。`;
    // Every observed source is visible immediately, including those without enough data to grade.
    $('rank-body').innerHTML=summaries.map((s,i)=>`<tr class="${s.rating==='資料不足'?'rank-unrated':'rank-rated'}"><td class="rank-index">${s.rating==='資料不足'?'—':String(i+1).padStart(2,'0')}</td><td><span class="source-name">${esc(s.name)}</span></td><td><span class="score-num">${f2(s.score)}</span></td><td>${s.n} 份 <span class="muted">/ ${s.years} 年</span></td><td>${fp(s.hitRate*100)}</td><td><span class="pill ${badge(s.rating)}">${esc(s.rating)}</span></td><td><button class="row-link" type="button" data-institution="${esc(s.name)}" aria-label="查看 ${esc(s.name)} 的逐筆資料">查看 →</button></td></tr>`).join('');
    $('rank-empty').hidden=!!summaries.length;
    if (!summaries.some(s=>s.name===state.institution)) state.institution=summaries[0]?.name || '';
    $('institution-select').innerHTML=summaries.length?opts(summaries.map(s=>s.name),state.institution):'<option value="">沒有符合的資料</option>';
    renderInstitution(summaries.find(s=>s.name===state.institution));
    renderComparison();
  }

  function scatterPlot(entries) {
    if (!entries.length) return '<div class="empty-state">目前條件沒有可繪製的資料。</div>';
    const counts=new Map();
    for (const p of entries) {const k=`${p.year}|${p.race}`;counts.set(k,(counts.get(k)||0)+1);}
    const points=[];
    for (const p of entries) for (const name of Object.keys(p.normalized)) {
      points.push({x:p.normalized[name],y:p.actual_norm[name],w:1/(counts.get(`${p.year}|${p.race}`)*Object.keys(p.normalized).length),p,name});
    }
    const fit=entries.length>=3?logic.regression(points):null;
    const x0=52,y0=18,w=448,h=187,x=v=>x0+v/100*w,y=v=>y0+h-v/100*h;
    let grid='';
    for(let v=0;v<=100;v+=20){grid+=`<line class="grid-line" x1="${x(v)}" y1="${y0}" x2="${x(v)}" y2="${y0+h}"/><line class="grid-line" x1="${x0}" y1="${y(v)}" x2="${x0+w}" y2="${y(v)}"/><text x="${x(v)}" y="${y0+h+17}" text-anchor="middle">${v}</text><text x="${x0-9}" y="${y(v)+3}" text-anchor="end">${v}</text>`;}
    const line=fit?`<line class="fit-line" x1="${x(0)}" y1="${y(fit.intercept)}" x2="${x(100)}" y2="${y(fit.intercept+fit.slope*100)}" clip-path="url(#plot-clip)"/>`:'';
    const dots=points.map(z=>`<circle class="data-point" cx="${x(z.x)}" cy="${y(z.y)}" r="3.4"><title>${esc(pp(z.p))} ${esc(z.name)}：民調 ${f2(z.x)}%，開票 ${f2(z.y)}%</title></circle>`).join('');
    return `<svg viewBox="0 0 540 255" aria-hidden="true"><defs><clipPath id="plot-clip"><rect x="${x0}" y="${y0}" width="${w}" height="${h}"/></clipPath></defs>${grid}<line class="ideal-line" x1="${x(0)}" y1="${y(0)}" x2="${x(100)}" y2="${y(100)}"/>${line}${dots}<text x="${x0+w/2}" y="248" text-anchor="middle">比例化民調支持率（%）</text><text transform="translate(14 113) rotate(-90)" text-anchor="middle">比較用實際票率（%）</text></svg>${fit?'': '<p class="graph-foot">本範圍少於 3 份民調，未繪製回歸線。</p>'}`;
  }

  function yearBars(entries) {
    const years=new Map();
    for(const p of entries){if(!years.has(p.year))years.set(p.year,[]);years.get(p.year).push(p.mae);}
    const vals=[...years].map(([year,a])=>({year,avg:a.reduce((s,x)=>s+x,0)/a.length,n:a.length})).sort((a,b)=>b.year-a.year);
    const max=Math.max(8,...vals.map(x=>x.avg));
    return vals.length?vals.map(v=>`<div class="year-row" title="${v.n} 份民調"><span>${v.year}</span><span class="year-track"><i style="width:${Math.max(0,Math.min(100,v.avg/max*100))}%"></i></span><span class="year-value">${f2(v.avg)}</span></div>`).join(''):'<div class="empty-state">沒有符合的資料。</div>';
  }

  function pollDetail(p) {
    const candidates=Object.keys(p.normalized).sort((a,b)=>p.actual_norm[b]-p.actual_norm[a]);
    const url=safeUrl(p.source_url);
    return `<details class="record" id="record-${esc(p.id)}"><summary><span class="record-date">${esc(p.end_date)}</span><strong>${esc(pp(p))}</strong><span class="record-mae">${f2(p.mae)} <small class="muted">pp</small></span><span class="record-arrow">＋</span></summary><div class="record-body"><div class="table-scroll"><table class="data-table candidate-table"><thead><tr><th>候選人</th><th>原始支持率</th><th>比例化民調</th><th>原始得票率</th><th>比較用票率</th><th>方向差</th></tr></thead><tbody>${candidates.map(name=>`<tr><td>${esc(name)}</td><td>${f2(p.support[name])}%</td><td>${f2(p.normalized[name])}%</td><td>${f2(p.actual[name])}%</td><td>${f2(p.actual_norm[name])}%</td><td>${signed(p.error[name])} pp</td></tr>`).join('')}</tbody></table></div><div class="record-meta"><span>樣本：${p.sample?esc(p.sample)+' 人':'未查證'}</span><span>委託：${esc(p.sponsor||'未查證')}</span><span>執行：${esc(p.executor||'未查證')}</span></div>${url?`<a class="source-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">查看資料來源 ↗</a>`:''}<p class="evidence">${esc(p.evidence||'原始發布時間與執行身分待核查。')}</p></div></details>`;
  }

  function renderInstitution(summary) {
    if(!summary){$('institution-name').textContent='無符合來源';$('institution-sub').textContent='請調整上方篩選條件。';$('institution-score').textContent='—';$('institution-grade').textContent='資料不足';$('institution-grade-note').textContent='';$('scatter').innerHTML='';$('year-bars').innerHTML='';$('records').innerHTML='';$('record-count').textContent='0 份';return;}
    const entries=summary.polls.slice().sort((a,b)=>b.year-a.year||String(b.end_date).localeCompare(String(a.end_date))||a.race.localeCompare(b.race,'zh-Hant'));
    $('institution-name').textContent=summary.name;
    $('institution-sub').textContent=`${summary.n} 份民調 · ${summary.years} 個選舉年份 · 第一名一致 ${fp(summary.hitRate*100)}`;
    $('institution-score').textContent=f2(summary.score);
    $('institution-grade').textContent=summary.rating;
    $('institution-grade-note').textContent=summary.rating==='資料不足'?'少於 5 份或未跨 3 年':'僅依目前樣本自訂';
    $('scatter').innerHTML=scatterPlot(entries);
    $('year-bars').innerHTML=yearBars(entries);
    $('record-count').textContent=`${entries.length} 份民調`;
    $('records').innerHTML=entries.map(pollDetail).join('');
  }

  function renderComparison() {
    const left=$('compare-a').value,right=$('compare-b').value;
    $('compare-head-a').textContent=left||'來源 A';$('compare-head-b').textContent=right||'來源 B';
    const shared=logic.commonRaces(logic.selectPolls(polls,filters(false)),left,right);
    $('compare-empty').hidden=!!shared.length;
    if(!shared.length){$('compare-summary').textContent=left===right?'請選擇不同的兩個來源系列。':'目前篩選下沒有共同場次。';$('compare-body').innerHTML='';return;}
    const a=shared.reduce((s,x)=>s+x.left.mae,0)/shared.length,b=shared.reduce((s,x)=>s+x.right.mae,0)/shared.length;
    $('compare-summary').innerHTML=`<span>共同選舉 <strong>${shared.length}</strong></span><span>${esc(left)} 平均 <strong>${f2(a)}</strong> pp</span><span>${esc(right)} 平均 <strong>${f2(b)}</strong> pp</span>`;
    $('compare-body').innerHTML=shared.map(x=>{const dif=x.left.mae-x.right.mae;const win=Math.abs(dif)<0.005?'接近':dif<0?left:right;return `<tr><td><strong class="source-name">${esc(pp(x))}</strong></td><td><strong>${f2(x.left.mae)}</strong> pp<span class="date-sub">${x.left.count} 份調查平均</span></td><td><strong>${f2(x.right.mae)}</strong> pp<span class="date-sub">${x.right.count} 份調查平均</span></td><td class="better">${esc(win)}</td></tr>`;}).join('');
  }

  function updateElectionRaces() {
    const year=Number($('election-year').value);
    const values=events.filter(e=>e.year===year).map(e=>e.race).sort((a,b)=>a==='總統'?-1:b==='總統'?1:a.localeCompare(b,'zh-Hant'));
    $('election-race').innerHTML=opts(values,values.includes('總統')?'總統':values[0]);
    updateElectionPolls();
  }
  function updateElectionPolls() {
    const year=Number($('election-year').value),race=$('election-race').value;
    const entries=polls.filter(p=>p.year===year&&p.race===race).sort((a,b)=>a.name.localeCompare(b.name,'zh-Hant'));
    $('election-poll').innerHTML=entries.length?entries.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.end_date)}</option>`).join(''):'<option value="">本次未納入民調</option>';
    $('election-poll').disabled=!entries.length;
    renderElection();
  }
  function bar(label,value,actual=false){const width=Math.max(0,Math.min(100,Number(value)||0));return `<div class="bar-row ${actual?'actual':''}"><span>${label}</span><div class="candidate-track"><i style="width:${width}%"></i></div><b>${f2(value)}%</b></div>`;}
  function renderElection() {
    const year=Number($('election-year').value),race=$('election-race').value,entry=events.find(e=>e.year===year&&e.race===race),p=polls.find(z=>z.id===$('election-poll').value);
    if(!entry)return;
    $('election-title').textContent=`${year} ${race==='總統'?'總統選舉':race+'首長選舉'}`;
    $('election-badge').textContent=p?'民調 × 開票':'僅開票資料';
    $('election-caption').textContent=p?`${p.name} · 資料日期 ${p.end_date} · 平均絕對差 ${f2(p.mae)} 個百分點`:'此場次尚未納入符合條件的民調';
    if(p){const names=Object.keys(p.normalized).sort((a,b)=>p.actual_norm[b]-p.actual_norm[a]);$('candidate-bars').innerHTML=names.map(n=>`<div class="candidate-line"><div class="candidate-name">${esc(n)}<small>原始有效票 ${f2(p.actual[n])}%</small></div><div class="bar-pair">${bar('民調比例化',p.normalized[n])}${bar('實際比例化',p.actual_norm[n],true)}</div></div>`).join('');$('election-note').textContent=`圖中僅比較此研究納入的主要候選人，涵蓋 ${f2(p.result_coverage)}% 的有效票。實際與民調均按相同候選人比例化；未表態分配是假設。`;}
    else{$('candidate-bars').innerHTML=entry.results.map(c=>`<div class="candidate-line"><div class="candidate-name">${esc(c.name)}<small>${esc(c.party)}</small></div><div class="bar-pair">${bar('實際得票',c.percent,true)}</div></div>`).join('');$('election-note').textContent='本研究目前沒有納入此場次的可比民調，不代表當時沒有進行或公布民調。';}
    $('election-all').innerHTML=`<details class="record"><summary><strong>查看全部候選人開票數字</strong><span></span><span></span><span class="record-arrow">＋</span></summary><div class="record-body"><div class="table-scroll"><table class="data-table candidate-table"><thead><tr><th>候選人</th><th>政黨</th><th>得票數</th><th>有效票率</th><th>來源</th></tr></thead><tbody>${entry.results.map(c=>{const u=safeUrl(c.source);return `<tr><td>${esc(c.name)}</td><td>${esc(c.party)}</td><td>${Number(c.votes).toLocaleString('zh-TW')}</td><td>${f2(c.percent)}%</td><td>${u?`<a class="source-link" href="${esc(u)}" target="_blank" rel="noopener noreferrer">來源 ↗</a>`:'待核'}</td></tr>`;}).join('')}</tbody></table></div><p class="evidence">多數地方開票為二手轉錄，尚未逐筆與中選會原始檔核對。</p></div></details>`;
  }

  function renderParty(){ $('party-body').innerHTML=data.paired.map(m=>`<tr><td>${esc(m.event[0])} ${esc(m.event[1])}</td><td>${signed(m.dpp_gap)}</td><td>${signed(m.kmt_gap)}</td><td class="better">${signed(m.difference)}</td></tr>`).join(''); }
  function downloadCsv() {
    const header=['民調ID','來源系列','選舉年','選區','資料日期','候選人','原始支持率','比例化民調','原始得票率','比較用實際率','方向差（百分點）','單份平均絕對差','樣本數','委託者','執行者','來源網址','資料品質註記'];
    const lines=[header];
    for(const p of polls)for(const name of Object.keys(p.support))lines.push([p.id,p.name,p.year,p.race,p.end_date,name,p.support[name],p.normalized[name],p.actual[name],p.actual_norm[name],p.error[name],p.mae,p.sample??'',p.sponsor||'',p.executor||'',p.source_url||'',p.evidence||'']);
    const quoteCell=v=>{let s=String(v??'');if(typeof v==='string'&&/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
    const blob=new Blob(['\uFEFF'+lines.map(row=>row.map(quoteCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='ori-poll-records.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  for(const id of ['filter-kind','filter-year','filter-race'])$(id).addEventListener('change',()=>{renderRankings();});
  $('source-search').addEventListener('input',()=>{renderRankings();});
  $('reset-filters').addEventListener('click',()=>{for(const id of ['filter-kind','filter-year','filter-race','source-search'])$(id).value='';renderRankings();});
  $('rank-body').addEventListener('click',e=>{const button=e.target.closest('[data-institution]');if(!button)return;state.institution=button.dataset.institution;$('institution-select').value=state.institution;renderInstitution(logic.summarize(logic.selectPolls(polls,filters())).find(x=>x.name===state.institution));$('institution').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
  $('institution-select').addEventListener('change',()=>{state.institution=$('institution-select').value;renderInstitution(logic.summarize(logic.selectPolls(polls,filters())).find(x=>x.name===state.institution));});
  $('compare-a').addEventListener('change',renderComparison);$('compare-b').addEventListener('change',renderComparison);
  $('election-year').addEventListener('change',updateElectionRaces);$('election-race').addEventListener('change',updateElectionPolls);$('election-poll').addEventListener('change',renderElection);
  $('download-csv').addEventListener('click',downloadCsv);
  function renderRecallCalculator() {
    const names=['recall-poll-yes','recall-poll-no','recall-vote-yes','recall-vote-no','recall-electors'];
    if(names.some(id=>$(id).value.trim()==='')) { $('recall-output').textContent='請填寫同一罷免案的全部五項數字。'; return; }
    const values=names.map(id=>Number($(id).value));
    const r=logic.evaluateRecall({pollYes:values[0],pollNo:values[1],voteYes:values[2],voteNo:values[3],electors:values[4]});
    $('recall-output').textContent=r?`民調同意票率（已表態比例化）${f2(r.pollShare)}% ｜實際同意有效票率 ${f2(r.actualShare)}% ｜絕對誤差 ${f2(r.absoluteError)} 個百分點 ｜同意票門檻 ${r.threshold.toLocaleString('zh-TW')} 票 ｜實際結果：${r.passed?'罷免通過':'罷免未通過'}。`:'輸入無效：比例需介於 0–100%，票數須為非負整數，且有效票數不能超過選舉人總數。';
  }
  for(const id of ['recall-poll-yes','recall-poll-no','recall-vote-yes','recall-vote-no','recall-electors'])$(id).addEventListener('input',renderRecallCalculator);
  if($('verified-archive')) {
    $('verified-archive').innerHTML='<table class="data-table"><thead><tr><th>選區／罷免對象</th><th>全體贊成</th><th>全體反對</th><th>一定投票者贊成</th><th>一定投票者反對</th><th>樣本數</th><th>原文</th></tr></thead><tbody>'+verifiedArchive.map(p=>'<tr><td>'+esc(p.race)+'<br><strong>'+esc(p.target)+'</strong></td><td>'+f2(p.yes)+'%</td><td>'+f2(p.no)+'%</td><td>'+f2(p.likelyYes)+'%</td><td>'+f2(p.likelyNo)+'%</td><td>'+p.sample+'</td><td><a class="source-link" target="_blank" rel="noopener noreferrer" href="'+esc(p.source_url)+'">原始報導 ↗</a></td></tr>').join('')+'</tbody></table><p class="table-caption">調查 2025/7/9–12，發布 7/14；鏡新聞委託大地民意研究公司執行。數據取自原始報導，非開票結果；樣本為各選區總完訪數，非一定投票子群組人數。</p>';
  }
  renderRankings();updateElectionRaces();renderParty();
})();
