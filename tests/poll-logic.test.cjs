const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('../core.js');

test('normalizes only the selected candidates to a common 100 percent denominator', () => {
  assert.deepEqual(logic.normalize({ 賴: 32, 侯: 27, 柯: 21 }), { 賴: 40, 侯: 33.75, 柯: 26.25 });
});

test('uses year-weighted averages rather than allowing a year with more polls to dominate', () => {
  const polls = [
    { name: 'A', year: 2018, mae: 1, winner_hit: true },
    { name: 'A', year: 2018, mae: 3, winner_hit: false },
    { name: 'A', year: 2020, mae: 8, winner_hit: true },
    { name: 'A', year: 2022, mae: 6, winner_hit: true },
    { name: 'A', year: 2022, mae: 6, winner_hit: true },
  ];
  const result = logic.summarize(polls)[0];
  assert.ok(Math.abs(result.score - 16 / 3) < 1e-10);
  assert.equal(result.rating, '時有誤差');
  assert.equal(result.n, 5);
  assert.equal(result.years, 3);
});

test('does not grade institutions with too few observations or years', () => {
  assert.equal(logic.grade(1, 4, 3), '資料不足');
  assert.equal(logic.grade(1, 20, 2), '資料不足');
  assert.equal(logic.grade(1.99, 5, 3), '最為準確');
  assert.equal(logic.grade(4, 5, 3), '時有誤差');
  assert.equal(logic.grade(8, 5, 3), '完全不準確');
});

test('filters by actual year, location, election kind and source keyword together', () => {
  const polls = [
    { name: 'TVBS', year: 2022, race: '臺北市', sponsor: 'TVBS', executor: '' },
    { name: 'TVBS', year: 2022, race: '桃園市', sponsor: 'TVBS', executor: '' },
    { name: '聯合報', year: 2024, race: '總統', sponsor: '', executor: '' },
  ];
  assert.deepEqual(logic.selectPolls(polls, { year: '2022', race: '臺北市', kind: 'local', query: 'tvbs' }), [polls[0]]);
});

test('compares only overlapping year-and-race pairs', () => {
  const polls = [
    { name: 'A', year: 2022, race: '臺北市', mae: 1 },
    { name: 'B', year: 2022, race: '臺北市', mae: 2 },
    { name: 'A', year: 2022, race: '桃園市', mae: 4 },
    { name: 'B', year: 2018, race: '桃園市', mae: 5 },
  ];
  const result = logic.commonRaces(polls, 'A', 'B');
  assert.deepEqual(result.map(x => [x.year, x.race, x.left.mae, x.right.mae]), [[2022, '臺北市', 1, 2]]);
});

test('fits a straight line when the data have variation and returns null otherwise', () => {
  const line = logic.regression([{x:1,y:3},{x:2,y:5},{x:3,y:7}]);
  assert.ok(Math.abs(line.slope - 2) < 1e-10);
  assert.ok(Math.abs(line.intercept - 1) < 1e-10);
  assert.equal(logic.regression([{x:1,y:2},{x:1,y:3}]), null);
});

test('the published dataset reproduces the report benchmark for TVBS and preserves every charted election', () => {
  const data=require('../data.js');
  assert.equal(data.polls.length,237);
  assert.equal(data.events.length,79);
  const tvbs=logic.summarize(data.polls).find(s=>s.name==='TVBS');
  assert.equal(tvbs.n,23);
  assert.equal(tvbs.years,10);
  assert.ok(Math.abs(tvbs.score-3.6984819469828616)<1e-10);
});

test('the 2024 United Daily News example matches the report after proportional adjustment', () => {
  const data=require('../data.js');
  const p=data.polls.find(p=>p.year===2024&&p.race==='總統'&&p.name==='聯合報');
  const estimate=logic.normalize(p.support);
  assert.deepEqual(Object.values(estimate),[40,33.75,26.25]);
  assert.ok(Math.abs(p.mae-0.173)<0.01);
});

test('the overview regression gives equal total weight to each election', () => {
  const data=require('../data.js');
  const counts=new Map();
  for(const p of data.polls){const k=`${p.year}|${p.race}`;counts.set(k,(counts.get(k)||0)+1);}
  const points=data.polls.flatMap(p=>Object.keys(p.normalized).map(name=>({x:p.normalized[name],y:p.actual_norm[name],w:1/(counts.get(`${p.year}|${p.race}`)*Object.keys(p.normalized).length)})));
  const fit=logic.regression(points);
  assert.ok(Math.abs(fit.intercept-12.103697384232035)<1e-9);
  assert.ok(Math.abs(fit.slope-0.7238700216525009)<1e-9);
});
