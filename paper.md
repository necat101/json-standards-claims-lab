# JSON standards: four common claims, checked against RFC 8259 / ECMA-404

## Summary

I checked four frequently-misquoted claims about JSON against RFC 8259, ECMA-404, the Python 3.12 json module documentation, and ECMAScript 2026 (ECMA-262, 17th edition, June 2026), with microbenchmarks in CPython 3.12.3 and Node.js v22.22.3.

Results: (1) a top-level JSON text does NOT have to be an object or array; (2) duplicate object names are valid JSON syntax but processor-dependent in semantics; (3) NaN and Infinity are NOT valid JSON, despite Python's json encoder emitting them by default; (4) the JSON number grammar sets no fixed precision bound, but RFC 8259 explicitly permits implementations to impose range and precision limits – IEEE-754 binary64 loss is a JavaScript runtime property, not a JSON property.

All four are areas where Wikipedia's summary is broadly correct but occasionally looser than the normative text, and where language-specific runtime behaviour is routinely confused with what the interchange format guarantees.

## Sources inspected

- Wikipedia, "JSON": https://en.wikipedia.org/wiki/JSON (accessed 2026-08-19)
- RFC 8259, "The JavaScript Object Notation (JSON) Data Interchange Format", T. Bray, Ed., December 2017: https://www.rfc-editor.org/rfc/rfc8259.txt
- ECMA-404, 2nd edition, December 2017: https://www.ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf
- Python 3.12 documentation, json — JSON encoder and decoder: https://docs.python.org/3.12/library/json.html (implementation tested: CPython 3.12.3)
- ECMAScript® 2026 Language Specification (ECMA-262, 17th edition, June 2026), §25.5 JSON: https://tc39.es/ecma262/2026/#sec-json-object (implementation tested: Node.js v22.22.3 / V8)
- Verification material / benchmark scripts / raw results: https://github.com/necat101/json-standards-claims-lab

RFC 8259 obsoletes RFC 7159, which obsoleted RFC 4627. ECMA-404 and ISO/IEC 21778:2017 describe the same grammar.

## Claim 1: "A JSON document must be an object or an array"

Common claim. Many tutorials, linters, and older libraries reject a top-level scalar such as 42 or "hello" as invalid JSON.

RFC 4627 (2006) did require a JSON text to be an object or array. That restriction was removed in RFC 7158 (2013) and remains removed in RFC 8259. RFC 8259 §2: "A JSON text is a serialized value. Note that certain previous specifications of JSON constrained a JSON text to be an object or an array. Implementations that generate only objects or arrays where a JSON text is called for will be interoperable in the sense that all implementations will accept these as conforming JSON texts." The grammar is `JSON-text = ws value ws`, where value includes object, array, number, string, false, null, true.

ECMA-404 §4 agrees: a JSON text conforms to the JSON value grammar, with no wrapper requirement.

ECMAScript 2026, §25.5.2 JSON.parse, parses a String as a JSON text per ECMA-404.

Wikipedia correctly notes: "Early versions of JSON … required that a valid JSON text must consist of only an object or an array type… This restriction was dropped in RFC 7158."

Local test: `json.loads("42")` / `JSON.parse("42")` both return 42. Timing (100,000 parses, median of 7): Python 122.5 ms, Node 17.6 ms.

RFC 8259 §2 notes that some implementations only accept objects/arrays, and that generating only objects/arrays maximizes compatibility with older implementations, but it does not impose a normative RFC 2119 SHOULD requiring that restriction.

## Claim 2: "Duplicate object names are invalid JSON"

Variants include "duplicate keys are forbidden", "duplicate keys are a syntax error", and "the first/last value wins – that's guaranteed."

Duplicate names are syntactically valid. RFC 8259 §4, "Objects": "The names within an object SHOULD be unique." When they are not, "the behavior of software implementations that receive such an object is unpredictable. Many implementations report the last name/value pair only. Other implementations report an error or fail to parse the object, and some implementations report all of the name/value pairs, including duplicates." The grammar allows repeated member productions with no uniqueness constraint.

RFC 8259 §9, "Parsers": "A JSON parser MUST accept all texts that conform to the JSON grammar." Duplicate names are permitted by that grammar, so a parser rejecting duplicate-name input is not conforming to RFC 8259 §9, even though the RFC notes some real implementations do reject them.

ECMA-404 §6 Objects: "The JSON syntax does not impose any restrictions on the strings used as names, does not require that name strings be unique, and does not assign any significance to the ordering of name/value pairs." Name uniqueness and ordering significance are semantic matters left to processors or specifications using JSON.

In short: duplicate names are valid syntax. The resulting semantics are processor-dependent / not defined by JSON syntax, and RFC 8259 calls receiver behavior "unpredictable". Don't produce duplicates, and don't rely on which value a parser keeps.

Local test: parsing `{"x":1,"x":2}` in Python 3.12.3 and Node v22.22.3 yields `{"x": 2}` – last wins. Timing: Python 147.4 ms, Node 80.6 ms (100,000 parses). A conforming parser must accept the input; how it exposes duplicates is processor-dependent.

## Claim 3: "JSON supports NaN and Infinity"

Often phrased as "JSON is JavaScript, so NaN/Infinity work", or shown using `json.dumps(float('nan'))`.

NaN and Infinity are explicitly NOT valid JSON. RFC 8259 §6: "Numeric values that cannot be represented … (such as Infinity and NaN) are not permitted." ECMA-404 §8 is identical.

Confusion comes from JavaScript-the-language (not JSON-the-format), and Python's json module defaults.

ECMAScript JSON.stringify serializes NaN/±Infinity as `null`. `JSON.stringify(NaN)` → `"null"`, `JSON.stringify({x: NaN})` → `{"x":null}`. (Properties are omitted for `undefined`/functions, not for NaN.) `JSON.parse` rejects `NaN`/`Infinity` with SyntaxError.

Python's json defaults to `allow_nan=True` and emits `NaN`/`Infinity` – documented as "not JSON specification compliant". With `allow_nan=False`, encoding raises `ValueError`. Python's decoder accepts NaN/Infinity as extensions – RFC 8259 permits parsers to accept extensions.

Local test: Python: `json.dumps(float('nan'))` → `"NaN"`, `json.loads('NaN')` → `nan`. Node: `JSON.stringify(NaN)` → `"null"`, `JSON.parse('NaN')` → SyntaxError. The Node/V8 behaviors tested match ECMAScript 2026 for those operations.

If exchanging JSON with Python services, pass `allow_nan=False` when encoding, or you will produce documents a standards-compliant parser rightfully rejects.

## Claim 4: "JSON loses integer precision above 2^53"

Frequently stated as "JSON can't represent integers larger than 9007199254740991", or "JSON numbers are IEEE-754 doubles."

The JSON number grammar sets no fixed precision bound, but RFC 8259 explicitly permits implementations to impose range and precision limits. RFC 8259 §6: "This specification allows implementations to set limits on the range and precision of numbers accepted. … numbers that are integers and are in the range `[-(2^53)+1, (2^53)-1]` are interoperable in the sense that implementations will agree exactly on their numeric values." That is an interoperability recommendation, not a format restriction.

ECMA-404 §8 is similar: "JSON does not make any claims about … precision … it is recommended that … numbers … be expressed with no more than 15 decimal digits … so that they can be … represented as IEEE 754 binary64 numbers."

The 2^53 limit is JavaScript's Number type, not JSON.

Local test, parsing `9007199254740993` (2^53+1): Python 3.12.3 → exact `9007199254740993`; Node v22.22.3 → `9007199254740992` (binary64 round). Timing: Python 127.3 ms, Node 85.7 ms. Same conforming JSON document, different numeric values – exactly as RFC 8259 predicts. Note: Python 3.11+ applies an integer-string conversion length limit, so this single-value result is not evidence that arbitrarily long JSON integers will always be accepted.

If you need integers beyond IEEE-754 safe range to survive a JavaScript consumer, encode them as strings.

## Benchmark table

100,000 parses per run, median of 7 runs, 1 warm-up.

| Operation | Python 3.12.3 | Node v22.22.3 | py ms | node ms |
|---|---|---|---|---|
| Parse 9007199254740993 | 9007199254740993 | 9007199254740992 | 127.3 | 85.7 |
| Parse {"x":1,"x":2} | {"x": 2} | {x: 2} | 147.4 | 80.6 |
| Parse scalar 42 | 42 | 42 | 122.5 | 17.6 |
| Emit NaN | "NaN" (allow_nan=True; ValueError with allow_nan=False) | "null" | – | – |
| Parse NaN | nan | SyntaxError | – | – |
| Emit Infinity | "Infinity" | "null" | – | – |
| Parse Infinity | inf | SyntaxError | – | – |

Local observations only; no general "X is faster" claim.

## Limitations

Two runtimes only (CPython 3.12.3, Node/V8 v22.22.3), one Linux x86-64 host, one input per case. Timing includes loop/call overhead, no CI, median-of-7 only.

Other JSON edge cases not covered: Unicode normalization in duplicate keys, unpaired surrogates (`"\uDEAD"`, RFC 8259 §8.2), number formats, UTF-8/BOM (RFC 8259 §8.1).

ECMAScript behaviour verified against Node.js and ECMAScript 2026 (17th edition, June 2026), §25.5 / §25.5.2 / §25.5.4.

Python's json module documentation references RFC 7159 in its header (docs.python.org, 2026-08-19); RFC 8259 is a clarifying revision with identical grammar.

Wikipedia was used only to locate RFC 8259 / ECMA-404; all normative claims were checked against the primary standards.

## Takeaways

Valid JSON syntax ≠ interoperable JSON. RFC 8259 explicitly distinguishes the two.

Python's default encoder can produce non-JSON output when `allow_nan=True`: use `json.dumps(obj, allow_nan=False)`. Its decoder accepting NaN/infinities is permitted – RFC 8259 allows parsers to accept extensions.

JavaScript's Number limits and `JSON.stringify`'s NaN/Infinity → null mapping are ECMAScript runtime choices, not JSON format restrictions.

If you need exact integers above 2^53 to survive a JavaScript consumer, encode them as strings.

A bare `42` is valid JSON under RFC 8259. A parser that rejects top-level scalars is not accepting the full RFC 8259 grammar; it may be enforcing an older or application-specific restriction.

---

## Appendix A: Benchmark scripts

### Python – json_bench_py.py

```
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
```

### Node.js – json_bench_node.js

```
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
```

Iteration count is hard-coded at 100,000 in each bench_* function. The unused `iters` parameter has been removed from `time_runs` in both scripts.

## Appendix B: Raw benchmark output

### Runtime versions

```
$ python3 --version
Python 3.12.3
$ node --version
v22.22.3
```

### Python 3.12.3

```
Python 3.12.3 (main, Jun 19 2026, 12:46:00) [GCC 13.3.0]

== Correctness ==
int_parse('9007199254740993') = 9007199254740993 type=int
dup_parse('{"x":1,"x":2}') = {'x': 2}
scalar_parse('42') = 42
json.dumps(NaN) = NaN
json.loads('NaN') = nan
json.dumps(Infinity) = Infinity
json.loads('Infinity') = inf
json.dumps(-Infinity) = -Infinity
json.loads('-Infinity') = -inf
json.dumps(NaN, allow_nan=False) -> raises ValueError

== Timing (100,000 parses per run, median of 7 runs, ms) ==
int_parse: median 127.26 ms, runs 123.6, 124.3, 126.5, 127.3, 130.1, 130.6, 131.5
dup_parse: median 147.44 ms, runs 145.4, 146.1, 147.4, 147.4, 147.5, 148.4, 150.0
scalar_parse: median 122.48 ms, runs 119.3, 120.6, 121.3, 122.5, 124.4, 124.9, 126.0
```

### Node.js v22.22.3

```
v22.22.3

== Correctness ==
int_parse('9007199254740993') = 9007199254740992 type=number
dup_parse('{"x":1,"x":2}') = { x: 2 }
scalar_parse('42') = 42
JSON.stringify(NaN) = null
JSON.parse('NaN') raised SyntaxError: "NaN" is not valid JSON
JSON.stringify(Infinity) = null
JSON.parse('Infinity') raised SyntaxError: "Infinity" is not valid JSON
JSON.stringify(-Infinity) = null
JSON.parse('-Infinity') raised SyntaxError: No number after minus sign in JSON at position 1 (line 1 column 2)

== Timing (100,000 parses per run, median of 7 runs, ms) ==
int_parse: median 85.70 ms, runs 83.6, 84.0, 84.3, 85.7, 86.4, 86.4, 87.1
dup_parse: median 80.58 ms, runs 77.7, 78.6, 79.6, 80.6, 81.6, 83.7, 83.9
scalar_parse: median 17.57 ms, runs 17.0, 17.3, 17.4, 17.6, 17.6, 18.0, 18.4
```

Median = 4th of 7 sorted runs. Warm-up: 1 untimed run. 100,000 iterations per timed run.
