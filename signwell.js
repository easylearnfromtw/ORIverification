(function(){
'use strict';
const d=window.ORI_DATA,logic=window.ORILogic;
const root=document.getElementById('signwell-map');
if(!root||!d||!logic)return;
const counties=[
['基隆市',278,54],['臺北市',253,75],['新北市',265,99],['桃園市',225,116],['新竹市',196,139],['新竹縣',232,155],['苗栗縣',200,182],['臺中市',194,216],['彰化縣',160,248],['南投縣',217,261],['雲林縣',155,291],['嘉義市',157,324],['嘉義縣',184,343],['臺南市',166,386],['高雄市',201,420],['屏東縣',227,460],['宜蘭縣',291,151],['花蓮縣',289,264],['臺東縣',275,373],['澎湖縣',79,342],['金門縣',45,259],['連江縣',54,96]];
const parties={'國民黨':'#4269a0','民進黨':'#399477','民眾黨':'#48aab0','其他／無黨籍':'#a58a6b'};
const baseline=new Map(d.events.filter(e=>e.year===2022).map(e=>[e.race.replace(/臺/g,'台'),e]));
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const official=county=>baseline.get(county.replace(/臺/g,'台'));
let localPolls=[];
const activeCounty={name:'臺北市'};
const validPolls=county=>[...d.polls,...localPolls].filter(p=>p.year===2026&&p.kind!=='recall'&&p.kind!=='referendum'&&p.race.replace(/臺/g,'台')===county.replace(/臺/g,'台')&&p.source_url&&p.normalized&&Object.keys(p.normalized).length>=2);
function estimate(county){
 const entries=validPolls(county);
 const groups=new Map();
 for(const p of entries){const brand=logic.canonicalBrand(p.name);if(!groups.has(brand))groups.set(brand,[]);groups.get(brand).push(p);}
 if(groups.size<2)return null;
 const all=logic.summarize(d.polls.filter(p=>p.year<2026));
 const reliability=new Map(all.map(s=>[s.name,s.evaluated>=4?s.hitRate:null]));
 const usable=[...groups].map(([brand,ps])=>({brand,ps,weight:reliability.get(brand)})).filter(x=>Number.isFinite(x.weight)&&x.weight>0);
 if(usable.length<2)return null;
 const signatures=usable.map(x=>Object.keys(x.ps.at(-1).normalized).sort().join('|'));
 if(new Set(signatures).size!==1)return null;
 const names=Object.keys(usable[0].ps.at(-1).normalized);
 const weights=usable.map(x=>x.weight),total=weights.reduce((a,b)=>a+b,0);
 const values=names.map(name=>({name,value:usable.reduce((s,x)=>s+x.weight*x.ps.reduce((t,p)=>t+p.normalized[name],0)/x.ps.length,0)/total}));
 return {values:values.sort((a,b)=>b.value-a.value),sources:usable.length,records:usable.reduce((s,x)=>s+x.ps.length,0)};
}
const fallbackMap='<svg viewBox="0 0 375 525" style="display:block;width:100%;max-width:540px;margin:auto" role="img" aria-label="台灣縣市位置互動示意"><path d="M252 42 Q304 71 313 141 Q326 217 302 290 Q299 354 263 419 Q253 464 235 492 Q214 476 198 442 Q167 413 159 365 Q146 318 154 263 Q163 221 188 178 Q203 126 231 85 Z" fill="#ece9e2" stroke="#c9c3b7" stroke-width="2"/>'+counties.map(([name,x,y])=>'<g class="sw-point" data-county="'+safe(name)+'" tabindex="0" role="button" aria-label="查看'+safe(name)+'" style="cursor:pointer"><circle cx="'+x+'" cy="'+y+'" r="14" fill="#fff" stroke="#74628b" stroke-width="1.5"/><circle cx="'+x+'" cy="'+y+'" r="5" fill="#74628b"/><text x="'+x+'" y="'+(y-19)+'" font-size="11" text-anchor="middle" fill="currentColor" font-weight="600">'+safe(name.replace('臺','台'))+'</text></g>').join('')+'</svg>';
root.classList.add('sw-map-frame');
let mapZoom=1;
let mapContent=null;
function setZoom(v){mapZoom=Math.max(1,Math.min(2.5,v));if(mapContent)mapContent.setAttribute('transform','translate('+((1-mapZoom)*245)+' '+((1-mapZoom)*280)+') scale('+mapZoom+')');}
document.getElementById('sw-zoom-in')?.addEventListener('click',()=>setZoom(mapZoom+.25));
document.getElementById('sw-zoom-out')?.addEventListener('click',()=>setZoom(mapZoom-.25));
document.getElementById('sw-reset')?.addEventListener('click',()=>setZoom(1));
const countyCodes={'63000':'臺北市','65000':'新北市','68000':'桃園市','66000':'臺中市','67000':'臺南市','64000':'高雄市','10017':'基隆市','10018':'新竹市','10020':'嘉義市','10004':'新竹縣','10005':'苗栗縣','10007':'彰化縣','10008':'南投縣','10009':'雲林縣','10010':'嘉義縣','10013':'屏東縣','10002':'宜蘭縣','10015':'花蓮縣','10014':'臺東縣','10016':'澎湖縣','09020':'金門縣','09007':'連江縣'};
function countyName(f){
 const p=f.properties||{};
 const raw=String(p.COUNTYNAME||p.COUNTY_NAME||p.name||p.NAME||p.county||p.COUNTY||'').replace(/台/g,'臺').replace(/巿/g,'市');
 const code=String(p.COUNTYCODE||p.COUNTYID||p.code||p.id||f.id||'').padStart(5,'0');
 return counties.some(x=>x[0]===raw)?raw:countyCodes[code]||'';
}
function coords(geom){const polys=geom.type==='Polygon'?[geom.coordinates]:geom.type==='MultiPolygon'?geom.coordinates:[];return polys.flat(2).filter(p=>Array.isArray(p)&&typeof p[0]==='number');}
function geoPath(geom,project){
 const polys=geom.type==='Polygon'?[geom.coordinates]:geom.type==='MultiPolygon'?geom.coordinates:[];
 return polys.map(poly=>poly.map(ring=>{
 const stride=Math.max(1,Math.floor(ring.length/950));
 return ring.filter((_,i)=>i%stride===0).map((p,i)=>{const xy=project(p);return(i?'L':'M')+xy[0].toFixed(1)+','+xy[1].toFixed(1)}).join('')+'Z';
 }).join('')).join('');
}
function mapColor(name){const e=official(name);if(!e)return '#e9e5df';const top=e.results.slice().sort((a,b)=>b.percent-a.percent)[0];return parties[top.party]||'#a58a6b';}
async function drawRealMap(){
 try{
  if(!window.topojson)throw Error('topojson unavailable');
  const response=await fetch('https://taiwan.md/assets/geo/taiwan-country.topo.json');
  if(!response.ok)throw Error('map unavailable');
  const topo=await response.json();
  const obj=topo.objects.map||topo.objects.counties||Object.values(topo.objects)[0];
  const features=window.topojson.feature(topo,obj).features;
  if(features.length!==22)throw Error('county count mismatch');
  const mainland=features.filter(f=>!['澎湖縣','金門縣','連江縣'].includes(countyName(f)));
  const allPoints=mainland.flatMap(f=>coords(f.geometry)).filter(p=>p[0]>119.5&&p[0]<122.3&&p[1]>21.7&&p[1]<25.6);
  const bounds={minX:Math.min(...allPoints.map(p=>p[0])),maxX:Math.max(...allPoints.map(p=>p[0])),minY:Math.min(...allPoints.map(p=>p[1])),maxY:Math.max(...allPoints.map(p=>p[1]))};
  const scale=Math.min(420/(bounds.maxX-bounds.minX),510/(bounds.maxY-bounds.minY));
  const project=p=>[245+(p[0]-(bounds.minX+bounds.maxX)/2)*scale,280-((p[1]-(bounds.minY+bounds.maxY)/2)*scale)];
  const insets={'澎湖縣':[62,340],'金門縣':[61,410],'連江縣':[65,245]};
  const shapes=features.map(f=>{
   const name=countyName(f);if(!name)return '';
   const island=insets[name];
   const pts=coords(f.geometry);
   const center=island&&pts.length?[pts.reduce((s,p)=>s+p[0],0)/pts.length,pts.reduce((s,p)=>s+p[1],0)/pts.length]:null;
   const projector=island?(p=>[island[0]+(p[0]-center[0])*75,island[1]-(p[1]-center[1])*75]):project;
   return '<path class="sw-county" data-county="'+safe(name)+'" role="button" tabindex="0" aria-label="查看'+safe(name)+'" d="'+geoPath(f.geometry,projector)+'" fill="'+mapColor(name)+'" fill-opacity=".86" stroke="#ffffff" stroke-width="1.1" vector-effect="non-scaling-stroke"/>';
  }).join('');
  if(shapes.match(/class="sw-county"/g)?.length!==22)throw Error('county names mismatch');
  root.innerHTML='<svg viewBox="0 0 490 560" aria-label="台灣22縣市行政區互動地圖" role="img"><text x="25" y="32" class="sw-map-title">SIGNWELL / ELECTORAL ATLAS</text><g id="sw-map-content">'+shapes+'</g><text x="25" y="536" font-size="11" fill="#817a74">2022 HISTORICAL BASELINE · NOT 2026 FORECAST</text></svg>';
  mapContent=root.querySelector('#sw-map-content');setZoom(1);select(activeCounty.name);
 }catch(e){root.innerHTML=fallbackMap;select(activeCounty.name);}
}
root.innerHTML=fallbackMap;
const title=document.getElementById('signwell-county'),status=document.getElementById('signwell-status'),results=document.getElementById('signwell-results'),method=document.getElementById('signwell-method');
function select(name){
 activeCounty.name=name;
 title.textContent=name.replace('臺','台');
 root.querySelectorAll('[data-county]').forEach(el=>{const active=el.dataset.county===name;const mark=el.querySelector('circle')||el;if(mark)mark.setAttribute('stroke-width',active?'3.5':'1.5');});
 const model=estimate(name),base=official(name);
 if(model){status.textContent='2026 欣緯模型試算 · 非實際民調';results.innerHTML=model.values.map(v=>'<div style="margin:13px 0"><div style="display:flex;justify-content:space-between"><strong>'+safe(v.name)+'</strong><b>'+v.value.toFixed(1)+'%</b></div><div style="height:8px;background:#e5e0db;border-radius:8px"><div style="width:'+v.value+'%;height:100%;background:#74628b;border-radius:8px"></div></div></div>').join('');method.textContent='由 '+model.sources+' 個不同主品牌、'+model.records+' 份2026同場調查，以各機構歷史方向命中率加權平均；未表態者按已表態者比例分配。';}
 else{status.textContent='2026 年尚無足夠已核實民調，暫不發布預測';results.innerHTML=base?'<p style="font-weight:700;margin-top:20px">2022 縣市長選舉 · 歷史開票基準</p>'+base.results.slice().sort((a,b)=>b.percent-a.percent).map(v=>'<div style="margin:12px 0"><div style="display:flex;justify-content:space-between;gap:8px"><span>'+safe(v.name)+' <small>('+safe(v.party)+')</small></span><strong>'+Number(v.percent).toFixed(1)+'%</strong></div><div style="height:7px;background:#e8e5e0;border-radius:8px"><div style="height:100%;width:'+Math.min(100,v.percent)+'%;background:'+(parties[v.party]||'#999')+';border-radius:8px"></div></div></div>').join(''):'<p>缺少可核實的歷史縣市長開票資料。</p>';method.innerHTML='<strong>注意：</strong>以上是 2022 實際開票，不是 2026 候選人預測。2026 模型至少需要兩個不同主品牌、相同候選人選項的可核實當期民調，且各品牌須有至少四筆歷史方向評分。<a href="https://db.cec.gov.tw/ElecTable/" target="_blank" rel="noopener noreferrer">中選會開票資料 ↗</a>';}
}
root.addEventListener('click',e=>{const el=e.target.closest('[data-county]');if(el)select(el.dataset.county)});
root.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const el=e.target.closest('[data-county]');if(el){e.preventDefault();select(el.dataset.county)}}});
const fileInput=document.getElementById('signwell-file');
const importStatus=document.getElementById('signwell-import-status');
if(fileInput)fileInput.addEventListener('change',async()=>{
 const file=fileInput.files&&fileInput.files[0];if(!file)return;
 if(file.size>1024*1024){importStatus.textContent='檔案超過 1MB，請拆分後重試。';return;}
 try{
  const raw=(await file.text()).replace(/^\uFEFF/,'').trim();
  const lines=raw.split(/\r?\n/).filter(Boolean).map(line=>line.split(',').map(s=>s.trim().replace(/^"|"$/g,'')));
  const header=lines.shift();const cols=['county','brand','candidate','support','source_url','end_date'];
  if(cols.some(k=>!header.includes(k)))throw Error('缺少必要欄位：'+cols.filter(k=>!header.includes(k)).join('、'));
  const rows=lines.map(row=>Object.fromEntries(header.map((k,i)=>[k,row[i]||''])));
  if(rows.length>500)throw Error('最多匯入 500 列');
  const groups=new Map();
  for(const row of rows){const v=Number(row.support);if(!counties.some(x=>x[0].replace(/臺/g,'台')===row.county.replace(/臺/g,'台'))||!row.brand||!row.candidate||!Number.isFinite(v)||v<0||v>100||!/^https:\/\//.test(row.source_url)||!/^2026-\d{2}-\d{2}$/.test(row.end_date))throw Error('縣市、支持率、日期或來源網址格式不正確');
   const key=[row.county,row.brand,row.end_date].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);
  }
  const imported=[];
  for(const group of groups.values()){const support=Object.fromEntries(group.map(x=>[x.candidate,Number(x.support)]));if(Object.keys(support).length<2||Object.keys(support).length!==group.length||Object.values(support).reduce((a,b)=>a+b,0)>100.5)throw Error('同份民調至少兩位候選人，且支持率合計不得超過100%');
   const total=Object.values(support).reduce((a,b)=>a+b,0);imported.push({year:2026,kind:'local',race:group[0].county,name:group[0].brand,end_date:group[0].end_date,source_url:group[0].source_url,support,normalized:Object.fromEntries(Object.entries(support).map(([k,v])=>[k,v/total*100]))});
  }
  localPolls=imported;importStatus.textContent='已在本機載入 '+imported.length+' 份調查；沒有上傳到網站或 GitHub。僅符合模型門檻的縣市會產生試算。';select(activeCounty.name);
 }catch(e){importStatus.textContent='匯入失敗：'+e.message;}
});
select('臺北市');
drawRealMap();
})();
