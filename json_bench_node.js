#!/usr/bin/env node
console.log(process.version);

const s_int = "9007199254740993";
const s_dup = '{"x":1,"x":2}';
const s_scalar = "42";

function bench_int() {
  for (let i=0;i<100000;i++) JSON.parse(s_int);
}
function bench_dup() {
  for (let i=0;i<100000;i++) JSON.parse(s_dup);
}
function bench_scalar() {
  for (let i=0;i<100000;i++) JSON.parse(s_scalar);
}

console.log("\n== Correctness ==");
let v_int = JSON.parse(s_int);
console.log(`int_parse('9007199254740993') = ${v_int} type=${typeof v_int}`);
let v_dup = JSON.parse(s_dup);
console.log(`dup_parse('${s_dup}') =`, v_dup);
let v_scalar = JSON.parse(s_scalar);
console.log(`scalar_parse('42') = ${v_scalar}`);

for (const [val, name] of [[NaN,'NaN'], [Infinity,'Infinity'], [-Infinity,'-Infinity']]) {
  try {
    let out = JSON.stringify(val);
    console.log(`JSON.stringify(${name}) = ${out}`);
  } catch(e) { console.log(`JSON.stringify(${name}) raised ${e}`); }
  try {
    let parsed = JSON.parse(name);
    console.log(`JSON.parse('${name}') = ${parsed}`);
  } catch(e) { console.log(`JSON.parse('${name}') raised ${e.name}: ${e.message}`); }
}

function time_runs(fn, runs=7, warmup=1) {
  for (let w=0; w<warmup; w++) fn();
  let times = [];
  for (let r=0; r<runs; r++) {
    let t0 = process.hrtime.bigint();
    fn();
    let t1 = process.hrtime.bigint();
    times.push(Number(t1-t0)/1e6);
  }
  times.sort((a,b)=>a-b);
  let median = times[Math.floor(times.length/2)];
  return {median, times};
}

console.log("\n== Timing (100,000 parses per run, median of 7 runs, ms) ==");
let r = time_runs(bench_int);
console.log(`int_parse: median ${r.median.toFixed(2)} ms, runs ${r.times.map(x=>x.toFixed(1)).join(', ')}`);
r = time_runs(bench_dup);
console.log(`dup_parse: median ${r.median.toFixed(2)} ms, runs ${r.times.map(x=>x.toFixed(1)).join(', ')}`);
r = time_runs(bench_scalar);
console.log(`scalar_parse: median ${r.median.toFixed(2)} ms, runs ${r.times.map(x=>x.toFixed(1)).join(', ')}`);
