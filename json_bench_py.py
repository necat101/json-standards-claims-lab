#!/usr/bin/env python3
import json, time, statistics, sys
print(f"Python {sys.version}")

s_int = "9007199254740993"
def bench_int():
    for _ in range(100000):
        json.loads(s_int)

s_dup = '{"x":1,"x":2}'
def bench_dup():
    for _ in range(100000):
        json.loads(s_dup)

s_scalar = "42"
def bench_scalar():
    for _ in range(100000):
        json.loads(s_scalar)

print("\n== Correctness ==")
v_int = json.loads(s_int)
print(f"int_parse('9007199254740993') = {v_int} type={type(v_int).__name__}")
v_dup = json.loads(s_dup)
print(f"dup_parse('{s_dup}') = {v_dup}")
v_scalar = json.loads(s_scalar)
print(f"scalar_parse('42') = {v_scalar}")

for val, name in [(float('nan'), 'NaN'), (float('inf'), 'Infinity'), (float('-inf'), '-Infinity')]:
    try:
        out = json.dumps(val)
        print(f"json.dumps({name}) = {out}")
    except Exception as e:
        print(f"json.dumps({name}) raised {e}")
    try:
        parsed = json.loads(name)
        print(f"json.loads('{name}') = {parsed}")
    except Exception as e:
        print(f"json.loads('{name}') raised {type(e).__name__}")

print(f"json.dumps(NaN, allow_nan=False) -> ", end="")
try:
    print(json.dumps(float('nan'), allow_nan=False))
except Exception as e:
    print(f"raises {type(e).__name__}")

def time_runs(fn, runs=7, warmup=1):
    for _ in range(warmup):
        fn()
    times = []
    for _ in range(runs):
        t0 = time.perf_counter()
        fn()
        t1 = time.perf_counter()
        times.append((t1-t0)*1000)
    times.sort()
    median = statistics.median(times)
    return median, times

print("\n== Timing (100,000 parses per run, median of 7 runs, ms) ==")
m, ts = time_runs(bench_int)
print(f"int_parse: median {m:.2f} ms, runs {', '.join(f'{x:.1f}' for x in ts)}")
m, ts = time_runs(bench_dup)
print(f"dup_parse: median {m:.2f} ms, runs {', '.join(f'{x:.1f}' for x in ts)}")
m, ts = time_runs(bench_scalar)
print(f"scalar_parse: median {m:.2f} ms, runs {', '.join(f'{x:.1f}' for x in ts)}")
