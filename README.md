# JSON Standards: Four Common Claims, Checked Against RFC 8259 / ECMA-404

Four frequently-misquoted claims about JSON, checked against the primary standards – RFC 8259, ECMA-404, the Python 3.12 json module documentation, and ECMAScript 2026 (ECMA-262, 17th edition, June 2026) – with microbenchmarks in CPython 3.12.3 and Node.js v22.22.3.

## Findings

1. **A top-level JSON text does NOT have to be an object or array.** RFC 8259 §2: `JSON-text = ws value ws`. The object/array-only restriction was RFC 4627 and was removed in RFC 7158 (2013).

2. **Duplicate object names are valid JSON syntax but processor-dependent in semantics.** RFC 8259 §4 / §9: duplicate names are permitted by the grammar, a conforming parser MUST accept them, but receiver behavior is "unpredictable".

3. **NaN and Infinity are NOT valid JSON.** RFC 8259 §6 / ECMA-404 §8 explicitly forbid them. Python's json encoder emits them by default (`allow_nan=True`, documented non-compliant); Node/V8 serializes them as `null`.

4. **The JSON number grammar sets no fixed precision bound, but RFC 8259 explicitly permits implementations to impose range/precision limits.** IEEE-754 binary64 fidelity loss is a JavaScript runtime property, not a JSON property.

Full paper (Google Doc): https://docs.google.com/document/d/1x8H_z0I-xNT3kW9uvV6x62S44i3m5_NtL96BJmXcIKE/edit

## Reproducing

```bash
python3 json_bench_py.py
node json_bench_node.js
```

- 100,000 parses per timed run
- 1 warm-up run, 7 measured runs, median reported
- No external dependencies

Runtimes tested:
- CPython 3.12.3
- Node.js v22.22.3 / V8

See `results/` for captured output.

## License

MIT
