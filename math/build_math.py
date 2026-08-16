#!/usr/bin/env python3
"""Build the SUPERMASSIVE math: calibrate -> simulate pools -> exact-RTP
weights -> emit Stake-format books/luts/index + mock library.

RTP target 96.5% of cost for every mode. Volatility: mid-high (verified in
the printed report: hit rate, std, percentiles, wincap count).

Usage: python3 build_math.py [--fast]   (--fast = smaller pools for smoke)
"""
import json
import os
import subprocess
import statistics
import sys
import random
import zlib

import engine

FAST = '--fast' in sys.argv
RTP = 0.965
# Mode order mirrors the frontend's betModes order in
# web-sdk/apps/acqua-alta/src/game/config.ts.
MODES = {
    'base': {'cost': 1.0, 'pool': 6000 if FAST else 60000},
    'ante': {'cost': 1.25, 'pool': 4000 if FAST else 40000},
    # wildshot/ejecta costs are RECOMMENDATIONS derived from their measured
    # natural mean (see the pricing note in the handoff); the 25x/200x in
    # config.ts were placeholders. Change the number here and rebuild.
    'wildshot': {'cost': 1.7, 'pool': 3000 if FAST else 40000},
    'bonus': {'cost': 120.0, 'pool': 2000 if FAST else 20000},
    'ejecta': {'cost': 225.0, 'pool': 2000 if FAST else 20000},
    'superbonus': {'cost': 400.0, 'pool': 2000 if FAST else 20000},
}
OUT_UPLOAD = os.path.join(os.path.dirname(__file__), '..', 'math upload')
OUT_LIB = os.path.join(os.path.dirname(__file__), '..', 'math-sdk', 'games', 'supermassive',
                       'library', 'books')
OUT_MANIFEST = os.path.join(os.path.dirname(OUT_LIB), 'build_manifest.json')


def validate_book(book, mode):
    """Fail the build on broken event sequencing, settlement, or Ejecta cells."""
    events = book.get('events', [])
    indices = [event.get('index') for event in events]
    if indices != list(range(len(events))):
        raise ValueError(f'{mode} book {book["id"]} has non-contiguous event indices: {indices}')
    if not events or events[-1].get('type') != 'finalWin':
        terminal = events[-1] if events else None
        raise ValueError(f'{mode} book {book["id"]} has no terminal finalWin: {terminal}')
    if events[-1].get('amount') != book.get('payoutMultiplier'):
        raise ValueError(
            f'{mode} book {book["id"]} settlement mismatch: finalWin '
            f'{events[-1].get("amount")} != payoutMultiplier {book.get("payoutMultiplier")}'
        )
    for event in events:
        if event['type'] != 'wildEjecta':
            continue
        positions = event.get('positions', [])
        invalid = [
            p for p in positions
            if not (0 <= p.get('reel', -1) < engine.REELS
                    and 1 <= p.get('row', -1) <= engine.ROWS)
        ]
        if not positions or invalid:
            raise ValueError(
                f'{mode} book {book["id"]} has invalid wildEjecta positions: '
                f'{invalid if invalid else positions}'
            )
        cells = [(p['reel'], p['row']) for p in positions]
        if len(cells) != len(set(cells)):
            raise ValueError(
                f'{mode} book {book["id"]} has duplicate wildEjecta positions: {positions}'
            )


def sim_pool(mode, n, seed_base, collect_events=True):
    books = []
    rng_master = random.Random(seed_base)
    for i in range(n):
        rng = random.Random(rng_master.random())
        b = engine.simulate_book(rng, mode, i)
        validate_book(b, mode)
        if not collect_events:
            b = {'id': i, 'payoutMultiplier': b['payoutMultiplier'], 'criteria': b['criteria']}
        books.append(b)
        if (i + 1) % 10000 == 0:
            print(f'  {mode}: {i + 1}/{n}', flush=True)
    return books


def probe_rtp(mode, n=4000, seed=777):
    pool = sim_pool(mode, n, seed, collect_events=False)
    pays = [b['payoutMultiplier'] for b in pool]
    return statistics.mean(pays), pool


def cat_income(mode):
    """Flat (PAY_SCALE-independent) Cat Rescue contribution, in bet-cents."""
    prize_mean = (sum(p * w for p, w in engine.CAT_PRIZES)
                  / sum(w for _, w in engine.CAT_PRIZES))
    p = (engine.CAT_RESCUE_P_FEATURE if mode in ('bonus', 'ejecta', 'superbonus')
         else engine.CAT_RESCUE_P_ROUND)
    return p * prize_mean


def make_build_manifest(scale):
    """Capture the exact calibration inputs needed to audit shipped values."""
    return {
        'rtpTarget': RTP,
        'payScale': scale,
        'payScaleRepr': repr(scale),
        'paytableCents': {
            symbol: {str(size): engine.pay_for(symbol, size) for size in range(5, 21)}
            for symbol in engine.PAYS
        },
        'modes': {},
    }


# Modes whose price is locked by the shipped, approved frontend. wildshot and
# ejecta are deliberately absent: their cost is still a free variable, so they
# are priced FROM their natural mean instead of being forced onto one.
LOCKED_PRICE_MODES = ('base', 'ante', 'bonus', 'superbonus')


def calibrate():
    """Solve one PAY_SCALE for the whole package, in closed form.

    Cluster pays are exactly linear in PAY_SCALE and the win cap never binds,
    so a mode's mean payout is  mean(s) = s * K + cat_income(mode)  with K
    fixed by the reels/board. One probe per locked-price mode therefore pins K
    exactly, and that mode's ideal scale follows as
        s_mode = (target_mean - cat_income) / K.

    The locked modes disagree because their prices are fixed by the shipped,
    approved frontend, so no single scale puts them all on target and
    solve_weights() closes the rest. We take the MEDIAN of the ideal scales
    (geometric mean of the two middle values), which is robust to one mode
    sitting far from the rest.

    Robustness matters here because the modes are not equally sensitive. A
    mode's weight factor reacts to a scale change in proportion to how tightly
    its payouts cluster around its target: the buy modes are ~98-99% hit rate
    with a narrow distribution, so a few percent of mean shift moves their
    factor a lot, while base is ~75% zeros with a fat tail and absorbs the
    same shift almost for free. Anchoring on the extremes (an earlier
    sqrt(min*max) rule) therefore let base — the least sensitive mode, and the
    noisiest to estimate — drag the scale away from the cluster the sensitive
    modes agree on. Measured over the six shipped pools with bonus at 120x,
    sqrt(min*max) picks 1.89 for a total |ln f| of 0.868; the median picks
    1.76 for 0.19, against a true optimum of 0.16 at 1.77.

    (The previous 4-iteration secant on 8k base books did not converge: base
    payout variance is ~14x its mean, so every step was noise-dominated and
    the scale oscillated between 1.87 and 2.55 on consecutive iterations. A
    variant that instead scanned candidate scales and minimised the realised
    weight factors directly was tried and rejected: the same base variance
    makes those factors too noisy to optimise against, and it measured worse
    on the real build pools than this closed form.)
    """
    probe_n = {'base': 8000 if FAST else 60000, 'ante': 5000 if FAST else 40000,
               'bonus': 1500 if FAST else 10000, 'superbonus': 1500 if FAST else 10000}
    ideal = {}
    for mode in LOCKED_PRICE_MODES:
        cost = MODES[mode]['cost']
        mean, _ = probe_rtp(mode, n=probe_n[mode], seed=101 + len(ideal))
        cat = cat_income(mode)
        K = max(1e-9, (mean - cat) / engine.PAY_SCALE)
        s = (RTP * 100.0 * cost - cat) / K
        ideal[mode] = s
        print(f'  probe {mode:11s} n={probe_n[mode]:6d} mean {mean / 100:9.3f}x  '
              f'-> ideal PAY_SCALE {s:.4f}', flush=True)
    ordered = sorted(ideal.values())
    mid = len(ordered) // 2
    s = ((ordered[mid - 1] * ordered[mid]) ** 0.5 if len(ordered) % 2 == 0
         else ordered[mid])
    engine.PAY_SCALE = s
    spread = ordered[-1] / ordered[0]
    print(f'  locked-price modes disagree by {spread:.2f}x; median compromise scale = '
          f'{s:.4f} (from {[round(v, 4) for v in ordered]})', flush=True)
    return engine.PAY_SCALE


def solve_weights(pays, target_mean):
    """Uniform weights, then scale the >target books' weights by f for an
    exact weighted mean. Returns integer weights."""
    N = len(pays)
    hi = [i for i, p in enumerate(pays) if p > target_mean]
    lo = [i for i, p in enumerate(pays) if p <= target_mean]
    S_hi = sum(pays[i] for i in hi)
    S_lo = sum(pays[i] for i in lo)
    N_hi, N_lo = len(hi), len(lo)
    if N_hi == 0:
        raise RuntimeError('no books above target — resim with hotter params')
    denom = target_mean * N_hi - S_hi
    if abs(denom) < 1e-9:
        f = 1.0
    else:
        f = (S_lo - target_mean * N_lo) / denom
    if f <= 0:
        raise RuntimeError(f'infeasible weight solve (f={f:.3f})')
    BASE_W = 1_000_000
    weights = [BASE_W] * N
    for i in hi:
        weights[i] = max(1, int(BASE_W * f))
    got = sum(w * p for w, p in zip(weights, pays)) / sum(weights)
    print(f'  weight solve: f={f:.4f} -> weighted mean {got:.2f}c (target {target_mean:.2f})',
          flush=True)
    return weights


def report(mode, pays, weights, cost):
    tw = sum(weights)
    wmean = sum(w * p for w, p in zip(weights, pays)) / tw
    rtp = wmean / (100 * cost)
    hit = sum(w for w, p in zip(weights, pays) if p > 0) / tw
    var = sum(w * (p - wmean) ** 2 for w, p in zip(weights, pays)) / tw
    std_x = (var ** 0.5) / (100 * cost)
    spool = sorted(pays)
    caps = sum(1 for p in pays if p >= engine.WINCAP)
    print(f'[{mode}] RTP {rtp * 100:.3f}%  hit {hit * 100:.1f}%  std {std_x:.1f}x  '
          f'p50 {spool[len(spool)//2]/100:.2f}x  p99 {spool[int(len(spool)*0.99)]/(100):.1f}x  '
          f'max {max(pays)/100:.1f}x  wincaps {caps}', flush=True)
    return rtp


def main():
    print('calibrating…', flush=True)
    scale = calibrate()
    print(f'locked PAY_SCALE {scale!r}', flush=True)

    os.makedirs(OUT_UPLOAD, exist_ok=True)
    os.makedirs(OUT_LIB, exist_ok=True)
    index = {'modes': []}
    # This audit manifest deliberately lives beside (not inside) `books/`, so
    # Stake's upload remains index.json + six books + six lookup tables. JSON's
    # float encoder preserves the full round-trippable PAY_SCALE; the string is
    # included as an explicit human-readable guard against rounded build logs.
    build_manifest = make_build_manifest(scale)

    for mode, spec in MODES.items():
        print(f'simulating {mode} pool ({spec["pool"]})…', flush=True)
        # zlib.crc32, not hash(): str hashing is salted per process (PYTHONHASHSEED),
        # so hash(mode) made every regeneration of the shipped artifacts unreproducible.
        pool = sim_pool(mode, spec['pool'], seed_base=zlib.crc32(mode.encode()))
        pays = [b['payoutMultiplier'] for b in pool]
        target_mean = RTP * 100.0 * spec['cost']
        weights = solve_weights(pays, target_mean)
        weighted_rtp = report(mode, pays, weights, spec['cost'])
        max_index = max(range(len(pool)), key=lambda i: pays[i])
        build_manifest['modes'][mode] = {
            'cost': spec['cost'],
            'bookCount': len(pool),
            'weightedRtp': weighted_rtp,
            'maxPayoutMultiplier': pays[max_index],
            'maxPayoutX': pays[max_index] / 100.0,
            'maxBookId': pool[max_index]['id'],
        }

        books_path = os.path.join(OUT_LIB, f'books_{mode}.jsonl')
        with open(books_path, 'w') as f:
            for b in pool:
                f.write(json.dumps(b, separators=(',', ':')) + '\n')
        lut_path = os.path.join(OUT_UPLOAD, f'lookUpTable_{mode}_0.csv')
        with open(lut_path, 'w') as f:
            for b, w in zip(pool, weights):
                f.write(f'{b["id"]},{w},{b["payoutMultiplier"]}\n')
        subprocess.run(['zstd', '-f', '-q', books_path, '-o',
                        os.path.join(OUT_UPLOAD, f'books_{mode}.jsonl.zst')], check=True)
        index['modes'].append({
            'name': mode, 'cost': spec['cost'],
            'events': f'books_{mode}.jsonl.zst',
            'weights': f'lookUpTable_{mode}_0.csv',
        })

    with open(os.path.join(OUT_UPLOAD, 'index.json'), 'w') as f:
        json.dump(index, f, indent=4)
    with open(OUT_MANIFEST, 'w') as f:
        json.dump(build_manifest, f, indent=2, sort_keys=True)
    print('math upload written:', os.path.abspath(OUT_UPLOAD), flush=True)
    print('build manifest written:', os.path.abspath(OUT_MANIFEST), flush=True)


if __name__ == '__main__':
    main()
