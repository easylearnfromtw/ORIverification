(function (root) {
  const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  function normalize(values) {
    const total = Object.values(values).reduce((sum, value) => sum + Number(value), 0);
    if (!(total > 0)) return {};
    return Object.fromEntries(Object.entries(values).map(([name, value]) => [name, Number(value) / total * 100]));
  }
  function grade(score, count, years) {
    if (!Number.isFinite(score) || count < 4) return '資料不足';
    if (score < 2) return '最為準確';
    if (score < 4) return '時常準確';
    if (score < 6) return '時有誤差';
    if (score < 8) return '常有誤差';
    return '完全不準確';
  }
  function canonicalBrand(name) {
    const s=String(name||'').trim().replace(/臺/g,'台');
    if (/^(民進黨|民主進步黨)(?:[（(].*[）)])?$/.test(s) || /^(民進黨|民主進步黨)(中央黨部|民調中心|民意調查中心)$/.test(s)) return '民進黨';
    if (/^(國民黨|中國國民黨)(?:[（(].*[）)])?$/.test(s) || /^(國民黨|中國國民黨)(中央黨部|民調中心|民意調查中心)$/.test(s)) return '國民黨';
    if (/^(民眾黨|台灣民眾黨)(?:[（(].*[）)])?$/.test(s)) return '民眾黨';
    if (/^(台灣民意基金會|臺灣民意基金會)$/.test(s)) return '台灣民意基金會';
    if (/^(風傳媒|風傳媒民調|風傳媒民調中心)$/.test(s)) return '風傳媒';
    if (/^(鏡新聞|鏡新聞民調|鏡新聞民調中心)$/.test(s)) return '鏡新聞';
    if (/^(美麗島|美麗島電子報|美麗島民調)$/.test(s)) return '美麗島';
    if (/^(TVBS|TVBS民調|TVBS民意調查中心)$/.test(s)) return 'TVBS';
    if (/^(ETtoday|ETtoday民調|ETtoday民調雲)$/.test(s)) return 'ETtoday';
    if (/^(全國公信力|全國公信力民意調查股份有限公司)$/.test(s)) return '全國公信力';
    if (/^(趨勢|趨勢民意調查|趨勢民意調查股份有限公司)$/.test(s)) return '趨勢民意調查';
    return s;
  }
  // Rank by predicted winner versus actual winner; percentage error remains diagnostic only.
  function outcomeHit(p) {
    const predicted=p.kind==='recall'&&Number.isFinite(p.recall?.likely_yes)&&Number.isFinite(p.recall?.likely_no)?{'同意罷免':p.recall.likely_yes,'不同意罷免':p.recall.likely_no}:p.normalized;
    const actual=p.actual_norm;
    if(!predicted||!actual)return null;
    const names=Object.keys(predicted).filter(n=>Number.isFinite(predicted[n])&&Number.isFinite(actual[n]));
    if(names.length<2)return null;
    const max=values=>Math.max(...names.map(n=>values[n]));
    if(names.filter(n=>predicted[n]===max(predicted)).length!==1||names.filter(n=>actual[n]===max(actual)).length!==1)return null;
    return names.find(n=>predicted[n]===max(predicted))===names.find(n=>actual[n]===max(actual));
  }
  function outcomeGrade(rate,count) {
    if(!Number.isFinite(rate)||count<4)return '資料不足';
    if(rate>=.9)return '最為準確';
    if(rate>=.75)return '時常準確';
    if(rate>=.55)return '時有誤差';
    if(rate>=.35)return '常有誤差';
    return '完全不準確';
  }
  function summarize(polls) {
    const groups = new Map();
    for (const poll of polls) {
      if (!Number.isFinite(poll.mae)) continue;
      const brand=canonicalBrand(poll.name);
      if (!groups.has(brand)) groups.set(brand, []);
      groups.get(brand).push(poll);
    }
    return [...groups].map(([name, entries]) => {
      const byYear = new Map();
      for (const poll of entries) {
        if (!byYear.has(poll.year)) byYear.set(poll.year, []);
        byYear.get(poll.year).push(poll.mae);
      }
      const evaluated=entries.map(outcomeHit).filter(x=>x!==null);
      const score=evaluated.length?evaluated.filter(Boolean).length/evaluated.length:NaN;
      return { name, n: entries.length, years: byYear.size, score,
        hitRate:score, evaluated:evaluated.length, diagnosticMae:average([...byYear.values()].map(average)),
        rating: outcomeGrade(score, evaluated.length), polls: entries };
    }).sort((a,b) => (a.rating === '資料不足') - (b.rating === '資料不足') || b.score - a.score || a.name.localeCompare(b.name,'zh-Hant'));
  }
  function selectPolls(polls, filters = {}) {
    const query = (filters.query || '').trim().toLocaleLowerCase();
    return polls.filter(p => {
      if (filters.year && String(p.year) !== String(filters.year)) return false;
      if (filters.race && p.race !== filters.race) return false;
      if (filters.kind === 'president' && p.race !== '總統') return false;
      if (filters.kind === 'local' && (p.race === '總統' || p.kind === 'recall' || p.kind === 'referendum')) return false;
      if (filters.kind === 'referendum' && p.kind !== 'referendum') return false;
      if (filters.kind === 'recall' && p.kind !== 'recall') return false;
      return !query || [p.name,canonicalBrand(p.name),p.sponsor,p.executor].some(v => String(v || '').toLocaleLowerCase().includes(query));
    });
  }
  function commonRaces(polls, leftName, rightName) {
    if (!leftName || !rightName || leftName === rightName) return [];
    const collect = name => {
      const grouped = new Map();
      for (const p of polls.filter(p => canonicalBrand(p.name) === name && Number.isFinite(p.mae))) {
        const key = `${p.year}|${p.race}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(p);
      }
      return new Map([...grouped].map(([key,entries]) => [key,{
        year:entries[0].year,race:entries[0].race,
        mae:average(entries.map(p=>p.mae)), hitRate:entries.map(outcomeHit).filter(x=>x!==null).filter(Boolean).length / (entries.map(outcomeHit).filter(x=>x!==null).length||1),
        count:entries.length,
        end_date:entries.map(p=>p.end_date||'').sort().at(-1)
      }]));
    };
    const left = collect(leftName), right = collect(rightName), result=[];
    for (const [key,poll] of left) if (right.has(key)) result.push({year:poll.year,race:poll.race,left:poll,right:right.get(key)});
    return result.sort((a,b) => b.year-a.year || a.race.localeCompare(b.race,'zh-Hant'));
  }
  function regression(points) {
    const valid = points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y) && (p.w === undefined || p.w > 0));
    if (valid.length < 2) return null;
    const total = valid.reduce((s,p) => s+(p.w ?? 1),0);
    const xMean = valid.reduce((s,p) => s+p.x*(p.w ?? 1),0)/total;
    const yMean = valid.reduce((s,p) => s+p.y*(p.w ?? 1),0)/total;
    const variance = valid.reduce((s,p) => s+(p.w ?? 1)*(p.x-xMean)**2,0);
    if (variance < 1e-12) return null;
    const slope = valid.reduce((s,p) => s+(p.w ?? 1)*(p.x-xMean)*(p.y-yMean),0)/variance;
    return {slope,intercept:yMean-slope*xMean};
  }
  function evaluateRecall(input) {
    const {pollYes,pollNo,voteYes,voteNo,electors}=input;
    const vals=[pollYes,pollNo,voteYes,voteNo,electors];
    if(vals.some(v=>!Number.isFinite(v))||pollYes<0||pollNo<0||pollYes+pollNo<=0||pollYes+pollNo>100||voteYes<0||voteNo<0||voteYes+voteNo<=0||electors<=0||!Number.isInteger(voteYes)||!Number.isInteger(voteNo)||!Number.isInteger(electors)||voteYes+voteNo>electors) return null;
    const pollShare=pollYes/(pollYes+pollNo)*100,actualShare=voteYes/(voteYes+voteNo)*100;
    const threshold=Math.ceil(electors/4),passed=voteYes>voteNo&&voteYes>=threshold;
    return {pollShare,actualShare,absoluteError:Math.abs(pollShare-actualShare),signedError:pollShare-actualShare,threshold,passed,pollMajorityYes:pollYes>pollNo,actualMajorityYes:voteYes>voteNo};
  }
  const api = {normalize,grade,outcomeHit,outcomeGrade,canonicalBrand,summarize,selectPolls,commonRaces,regression,evaluateRecall};
  if (typeof module !== 'undefined') module.exports = api;
  root.ORILogic = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
