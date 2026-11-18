(function (root) {
  const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  function normalize(values) {
    const total = Object.values(values).reduce((sum, value) => sum + Number(value), 0);
    if (!(total > 0)) return {};
    return Object.fromEntries(Object.entries(values).map(([name, value]) => [name, Number(value) / total * 100]));
  }
  function grade(score, count, years) {
    if (!Number.isFinite(score) || count < 5 || years < 3) return '資料不足';
    if (score < 2) return '最為準確';
    if (score < 4) return '時常準確';
    if (score < 6) return '時有誤差';
    if (score < 8) return '常有誤差';
    return '完全不準確';
  }
  function summarize(polls) {
    const groups = new Map();
    for (const poll of polls) {
      if (!Number.isFinite(poll.mae)) continue;
      if (!groups.has(poll.name)) groups.set(poll.name, []);
      groups.get(poll.name).push(poll);
    }
    return [...groups].map(([name, entries]) => {
      const byYear = new Map();
      for (const poll of entries) {
        if (!byYear.has(poll.year)) byYear.set(poll.year, []);
        byYear.get(poll.year).push(poll.mae);
      }
      const score = average([...byYear.values()].map(average));
      return { name, n: entries.length, years: byYear.size, score,
        hitRate: entries.filter(p => p.winner_hit).length / entries.length,
        rating: grade(score, entries.length, byYear.size), polls: entries };
    }).sort((a,b) => (a.rating === '資料不足') - (b.rating === '資料不足') || a.score - b.score || a.name.localeCompare(b.name,'zh-Hant'));
  }
  function selectPolls(polls, filters = {}) {
    const query = (filters.query || '').trim().toLocaleLowerCase();
    return polls.filter(p => {
      if (filters.year && String(p.year) !== String(filters.year)) return false;
      if (filters.race && p.race !== filters.race) return false;
      if (filters.kind === 'president' && p.race !== '總統') return false;
      if (filters.kind === 'local' && (p.race === '總統' || p.kind === 'recall')) return false;
      if (filters.kind === 'recall' && p.kind !== 'recall') return false;
      return !query || [p.name,p.sponsor,p.executor].some(v => String(v || '').toLocaleLowerCase().includes(query));
    });
  }
  function commonRaces(polls, leftName, rightName) {
    if (!leftName || !rightName || leftName === rightName) return [];
    const collect = name => {
      const grouped = new Map();
      for (const p of polls.filter(p => p.name === name && Number.isFinite(p.mae))) {
        const key = `${p.year}|${p.race}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(p);
      }
      return new Map([...grouped].map(([key,entries]) => [key,{
        year:entries[0].year,race:entries[0].race,
        mae:average(entries.map(p=>p.mae)),
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
  const api = {normalize,grade,summarize,selectPolls,commonRaces,regression,evaluateRecall};
  if (typeof module !== 'undefined') module.exports = api;
  root.ORILogic = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
