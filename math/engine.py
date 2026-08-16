#!/usr/bin/env python3
"""SUPERMASSIVE — real math engine (mid-high volatility tuning).

Honest simulation: weighted reels, true cluster detection with wilds, tumble
refills, the gravity ladder, wild ejecta, cat snap, scatter-triggered free
spins with a persistent ladder, 5000x wincap. Emits Stake-format books in the
exact event schema the frontend speaks.

GAME RULES (locked):
  Board 5x4. Cluster pays 5+ orthogonally connected; W joins every adjacent
  symbol cluster. Tumble until dry. Gravity ladder x1,2,3,5,8,12,20,30 per
  cascade step; applies to that cascade's wins; resets per base spin,
  PERSISTS through free spins (Event Horizon rule).
  Wild ejecta: a removed cluster of 6+ injects 1 visible wild into the refill
  (9+ -> 2).
  Scatters: base/ante reveals only; at most one per reel; 4+ triggers 10 FS.
  DARK MATTER (ante 1.25x): scatter odds x2 (pure trigger-hunter mode).
  THREE-WILD SHOT (wildshot): one paid spin whose REVEALED board already
  carries exactly 3 server-selected Wilds (scored, not an overlay).
  EVENT HORIZON (bonus 120x): guaranteed trigger.
  EJECTA REACTOR (ejecta): free spins that open by firing 3 Wilds onto the
  first playable board; clusters charge a 3-slot meter (6-8 -> +1, 9+ -> +2);
  a full meter resets and fires 3 more Wilds onto the current board.
  SINGULARITY (superbonus 400x): trigger + 15 FS + ladder starts at step 5
  (x12) + charged refills (heavy wilds/highs).

CAT RESCUE (locked contract, see NOTES.md):
  `catSnap` is a DEDICATED award, never an ordinary win and never a random
  reaction. Floor CAT_MIN_PRIZE = 2000 bet-cents (20x). At most ONE per book,
  i.e. one per paid round and one per Free Spins feature (NOT one per free
  spin). Armed once at book start; the prize is added to the spin it fires on
  so winInfo/setWin/setTotalWin/freeSpinEnd/finalWin all reconcile.

DETERMINISTIC ORDERING CONTRACT (wildshot / ejecta; the frontend's
bookEventHandlerMap replays exactly this order):

  wildshot, one paid spin:
    1. fill board -> place scatters -> place the 3 Wilds (never over a
       scatter). The Wilds are in the board BEFORE anything is scored.
    2. `reveal` (gameType basegame) carries that board verbatim.
    3. `wildEjecta` with the 3 Wild cells — a launch/landing visual for cells
       the scored board already owns (WildEjecta.svelte re-asserts 'W' there).
    4. normal cascade, then the Cat Rescue roll, then setWin/setTotalWin.
    5. a natural 4+ scatter reveal still runs free spins after the spin.

  ejecta, per free spin:
    1. fill board -> place retrigger scatters -> (spin 1 only) place the 3
       launch Wilds.
    2. `reveal` (freegame).
    3. (spin 1 only) `wildEjecta` with the 3 launch Wild cells.
    4. `freeSpinRetrigger` if 3+ scatters landed on that reveal.
    5. cascade loop, per step:
         a. find clusters on the CURRENT visible board; none -> stop.
         b. `gravityMult` (ladder step).
         c. `winInfo` — every result carries `clusterSize` — then
            `updateTumbleWin`.
         d. METER: charge = min(3, charge + sum(2 if size>=9 else 1 if
            6<=size<=8 else 0)). Charged at the winInfo point, exactly where
            bookEventHandlerMap.ts charges the client meter.
         e. `tumbleBoard` (remove scored cells, slide, refill). The ordinary
            per-cluster wild injection is DISABLED in ejecta so the Reactor is
            the only source of `wildEjecta` and the two meters cannot drift.
         f. if charge == 3: charge = 0, overwrite 3 cells of the CURRENT
            post-refill board with 'W', emit `wildEjecta` with exactly those
            cells. The Wilds are in the scored state before (a) runs again.
         g. ladder step += 1; back to (a) — the new Wilds are scored by the
            next iteration, never by the one that inserted them.
    6. after the cascade dries: the feature's single Cat Rescue may fire on
       this spin, then setWin/setTotalWin.
    7. ladder step += 1 (Event Horizon ratchet) and the meter CARRIES into the
       next free spin. Both retrigger paths (scatter and Reactor) repeat.

VOLATILITY SHAPE (owner: mid-high): stingy minimum clusters, steep growth to
size-20; the ladder and FS persistence carry the tail. Targets: base hit rate
~32-38%, base-game ~62% of RTP, features the rest; buys each ~96.5% of cost.
"""
import random
from collections import deque

REELS, ROWS = 5, 4
PAD_ROWS = ROWS + 2
WINCAP = 2_500_000  # bet-cents == 25,000x (a design ceiling, not a Stake rule — never binds in practice)
LADDER = [1, 2, 3, 5, 8, 12, 20, 30, 40, 50, 75, 100]

BASE_WEIGHTS = {'L1': 27, 'L2': 24, 'L3': 20, 'L4': 16, 'H1': 3.2, 'H2': 4.6, 'H3': 6.4, 'H4': 8.4, 'W': 3.2}
CHARGED_WEIGHTS = {'L1': 27, 'L2': 24, 'L3': 20, 'L4': 16, 'H1': 5.4, 'H2': 7.8, 'H3': 10.8, 'H4': 14.2, 'W': 10.5}

# paytable anchors per symbol: (size5, size9, size13, size20) in bet-cents.
# Mid-high volatility: minimum clusters pay UNDER bet for lows; the top end
# and the ladder carry the excitement. PAY_SCALE is the calibration knob.
PAYS = {
    'L1': (10, 60, 260, 2200),
    'L2': (12, 75, 320, 2800),
    'L3': (16, 95, 420, 3600),
    'L4': (20, 125, 550, 4500),
    'H4': (35, 220, 950, 7000),
    'H3': (50, 320, 1400, 9000),
    'H2': (80, 500, 2200, 14000),
    'H1': (140, 900, 3800, 22000),
}
PAY_SCALE = 1.0

SCATTER_P = 0.18
ANTE_SCATTER_MULT = 1.19
FS_COUNT = 12
FS_COUNT_SUPER = 15
FS_RETRIGGER_ADD = 4
FS_SCATTER_P = 0.14
FS_WEIGHTS = {'L1': 27, 'L2': 24, 'L3': 20, 'L4': 16, 'H1': 3.6, 'H2': 5.2, 'H3': 7.2, 'H4': 9.4, 'W': 4.8}

# --- Cat Rescue (locked): >= 20x, at most once per book -----------------
CAT_MIN_PRIZE = 2000  # bet-cents == 20x. Nothing below this may emit catSnap.
CAT_PRIZES = [(2000, 40), (3000, 25), (5000, 18), (8000, 10), (12000, 5), (25000, 2)]
CAT_RESCUE_P_ROUND = 0.0022    # per PAID base/ante/wildshot round (~1 in 455)
CAT_RESCUE_P_FEATURE = 0.05    # per FREE SPINS FEATURE, not per free spin
assert min(p for p, _ in CAT_PRIZES) >= CAT_MIN_PRIZE

# --- THREE-WILD SHOT / EJECTA REACTOR -----------------------------------
WILDSHOT_WILDS = 3        # Wilds pre-placed on the scored wildshot board
EJECTA_LAUNCH_WILDS = 3   # Wilds fired onto the first playable free-spin board
EJECTA_RELOAD_WILDS = 3   # Wilds fired when the meter fills
EJECTA_CHARGE_TARGET = 3  # meter capacity; mirrors EjectaReactor.svelte
EJECTA_FS_COUNT = 15    # sized so the feature's natural value matches the 225x card
MAX_CASCADE_STEPS = 60    # safety guard: Reactor reloads can chain cascades


def pay_for(sym, size):
    a5, a9, a13, a20 = PAYS[sym]
    if size >= 20:
        base = a20
    elif size >= 13:
        base = a13 + (a20 - a13) * (size - 13) / 7.0
    elif size >= 9:
        base = a9 + (a13 - a9) * (size - 9) / 4.0
    else:
        base = a5 + (a9 - a5) * (size - 5) / 4.0
    return max(1, int(base * PAY_SCALE))


def draw_symbol(rng, weights):
    total = sum(weights.values())
    r = rng.random() * total
    acc = 0.0
    for s, w in weights.items():
        acc += w
        if r < acc:
            return s
    return 'L1'


def fill_board(rng, weights):
    return [[{'name': draw_symbol(rng, weights)} for _ in range(PAD_ROWS)] for _ in range(REELS)]


def find_clusters(board):
    clusters = []
    for sym in PAYS:
        seen = [[False] * PAD_ROWS for _ in range(REELS)]
        for r0 in range(REELS):
            for w0 in range(1, ROWS + 1):
                if seen[r0][w0] or board[r0][w0]['name'] != sym:
                    continue
                comp = []
                q = deque([(r0, w0)])
                seen[r0][w0] = True
                while q:
                    r, w = q.popleft()
                    comp.append((r, w))
                    for dr, dw in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nr, nw = r + dr, w + dw
                        if 0 <= nr < REELS and 1 <= nw <= ROWS and not seen[nr][nw]:
                            n = board[nr][nw]['name']
                            if n == sym or n == 'W':
                                seen[nr][nw] = True
                                q.append((nr, nw))
                if len(comp) >= 5:
                    clusters.append({'symbol': sym, 'cells': sorted(comp)})
    return clusters


def apply_tumble(rng, board, dead_cells, weights, eject_wilds):
    """Remove wins, refill the board, and place ordinary Ejecta Wilds.

    Row 0 is the hidden feed/padding cell.  A generated refill list of length
    ``n`` lands at padded rows 0..n-1, so only indices 1..n-1 are visible.
    Select Ejecta reels/slots from that visible subset and keep the Wild in
    ``adds`` itself, making ``tumbleBoard.newSymbols``, the authoritative
    post-tumble board, and the following ``wildEjecta`` event agree.
    """
    new_symbols = []
    wild_slots = []
    dead_rows_by_reel = {
        reel: sorted(w for r, w in dead_cells if r == reel)
        for reel in range(REELS)
    }
    # add[0] remains in hidden row 0, while add[1:] land in rows 1..ROWS.
    # Select slots, not reels: a large cluster can validly return two Wilds to
    # different visible refill cells on the same reel.
    visible_refill_slots = [
        (reel, row)
        for reel, dead_rows in dead_rows_by_reel.items()
        for row in range(1, len(dead_rows))
    ]
    if eject_wilds > len(visible_refill_slots):
        raise AssertionError(
            f'cannot place {eject_wilds} visible refill Wilds into '
            f'{len(visible_refill_slots)} eligible slots'
        )
    eject_slots = set(rng.sample(visible_refill_slots, eject_wilds)) if eject_wilds else set()
    for reel in range(REELS):
        dead_rows = dead_rows_by_reel[reel]
        if not dead_rows:
            new_symbols.append([])
            continue
        col = [board[reel][w] for w in range(PAD_ROWS) if w not in dead_rows]
        adds = [{'name': draw_symbol(rng, weights)} for _ in dead_rows]
        for wi in range(1, len(adds)):
            if (reel, wi) in eject_slots:
                adds[wi] = {'name': 'W'}
                wild_slots.append((reel, wi))
        board[reel] = adds + col
        new_symbols.append(adds)
    return new_symbols, [{'reel': r, 'row': wi} for r, wi in wild_slots]


def win_level(total):
    if total <= 0:
        return 0
    if total < 100:
        return 2
    if total < 500:
        return 3
    if total < 2000:
        return 4
    return 5


def validate_wild_ejecta_positions(positions):
    """Reject empty, duplicate, or off-grid Wild Ejecta coordinates."""
    if not positions:
        raise ValueError('wildEjecta requires at least one position')
    invalid = [
        p for p in positions
        if not (0 <= p.get('reel', -1) < REELS and 1 <= p.get('row', -1) <= ROWS)
    ]
    if invalid:
        raise ValueError(f'wildEjecta positions must be on the visible grid: {invalid}')
    cells = [(p['reel'], p['row']) for p in positions]
    if len(cells) != len(set(cells)):
        raise ValueError(f'wildEjecta positions must be unique: {positions}')


class _Ev:
    __slots__ = ('events',)

    def __init__(self):
        self.events = []

    def add(self, type_, **fields):
        if type_ == 'wildEjecta':
            validate_wild_ejecta_positions(fields.get('positions'))
        self.events.append({'index': len(self.events), 'type': type_, **fields})


def emit_wild_ejecta(ev, board, positions):
    """Emit only visible, unique Wild cells owned by the scored board state."""
    validate_wild_ejecta_positions(positions)
    mismatches = [
        p for p in positions if board[p['reel']][p['row']]['name'] != 'W'
    ]
    if mismatches:
        raise ValueError(f'wildEjecta positions must contain Wilds: {mismatches}')
    ev.add('wildEjecta', positions=positions)


def emit_reveal(rng, ev, board, game_type):
    ev.add('reveal', board=[[dict(c) for c in reel] for reel in board],
           paddingPositions=[rng.randrange(200) for _ in range(REELS)],
           gameType=game_type, anticipation=[0] * REELS)


def cascade(rng, ev, board, weights, step, running_total, reactor=None):
    """Run the tumble chain on `board` until dry. Returns (spin_win, step).

    With a `reactor` (ejecta only) the per-cluster wild injection is disabled
    and the Reactor becomes the sole source of `wildEjecta`; see the ordering
    contract in the module docstring.
    """
    spin_win = 0
    guard = 0
    while True:
        guard += 1
        if guard > MAX_CASCADE_STEPS:
            break
        clusters = find_clusters(board)
        if not clusters:
            break
        mult = LADDER[min(step, len(LADDER) - 1)]
        ev.add('gravityMult', mult=mult, step=step)
        wins_payload = []
        dead = set()
        biggest = 0
        step_base = 0
        for cl in clusters:
            size = len(cl['cells'])
            biggest = max(biggest, size)
            bw = pay_for(cl['symbol'], size)
            step_base += bw
            dead.update(cl['cells'])
            positions = [{'reel': r, 'row': w} for r, w in cl['cells']]
            wins_payload.append({
                'symbol': cl['symbol'], 'clusterSize': size, 'win': bw * mult,
                'positions': positions,
                'meta': {'globalMult': mult, 'clusterMult': 1, 'winWithoutMult': bw,
                         'overlay': positions[len(positions) // 2]},
            })
        spin_win += step_base * mult
        ev.add('winInfo', totalWin=running_total + spin_win, wins=wins_payload)
        ev.add('updateTumbleWin', amount=spin_win)
        # (d) charge the Reactor at the winInfo point — same rule, same moment
        # as the client meter in bookEventHandlerMap.ts.
        if reactor is not None:
            reactor.add(len(cl['cells']) for cl in clusters)
        # (e) refill. In ejecta the ordinary per-cluster wild injection is off:
        # every `wildEjecta` in that mode is a Reactor launch, so the on-screen
        # meter and the math meter stay identical.
        eject = 0 if reactor is not None else (2 if biggest >= 9 else (1 if biggest >= 6 else 0))
        ns, wp = apply_tumble(rng, board, dead, weights, eject)
        ev.add('tumbleBoard', newSymbols=ns,
               explodingSymbols=[{'reel': r, 'row': w} for r, w in sorted(dead)])
        if wp:
            emit_wild_ejecta(ev, board, wp)
        # (f) full meter -> reset -> insert Wilds into the CURRENT post-refill
        # board -> emit their exact cells. They are scored by the NEXT pass.
        if reactor is not None and reactor.ready():
            reactor.charge = 0
            reactor.fires += 1
            emit_wild_ejecta(ev, board, place_wilds(rng, board, EJECTA_RELOAD_WILDS))
        step += 1
    return spin_win, step


def place_scatters(rng, board, p):
    positions = []
    for reel in range(REELS):
        if rng.random() < p:
            row = rng.randrange(1, ROWS + 1)
            board[reel][row] = {'name': 'S'}
            positions.append({'reel': reel, 'row': row})
    return positions


def place_wilds(rng, board, count):
    """Overwrite `count` VISIBLE cells with Wilds; return their positions.

    Prefers cells that are not already Wild and never covers a scatter, so the
    positions handed to `wildEjecta` are exactly the cells a Wild occupies in
    the scored math state (WildEjecta.svelte re-asserts 'W' at each of them).
    """
    free = [(r, w) for r in range(REELS) for w in range(1, ROWS + 1)
            if board[r][w]['name'] not in ('W', 'S')]
    if len(free) < count:  # 20 visible cells — only reachable on a Wild-flooded board
        free += [(r, w) for r in range(REELS) for w in range(1, ROWS + 1)
                 if board[r][w]['name'] == 'W']
    picks = sorted(rng.sample(free, min(count, len(free))))
    for r, w in picks:
        board[r][w] = {'name': 'W'}
    return [{'reel': r, 'row': w} for r, w in picks]


class Reactor:
    """EJECTA REACTOR meter. Charged from the cluster sizes of each winInfo and
    clamped at EJECTA_CHARGE_TARGET — byte-for-byte the rule
    bookEventHandlerMap.ts uses for the on-screen meter, so client and math can
    never disagree. Persists across free spins."""
    __slots__ = ('charge', 'fires')

    def __init__(self):
        self.charge = 0
        self.fires = 0

    def add(self, cluster_sizes):
        gained = sum(2 if s >= 9 else 1 if s >= 6 else 0 for s in cluster_sizes)
        self.charge = min(EJECTA_CHARGE_TARGET, self.charge + gained)

    def ready(self):
        return self.charge >= EJECTA_CHARGE_TARGET


class CatRescue:
    """At most ONE Cat Rescue award per book — one per paid round, one per Free
    Spins feature. Armed (and its firing spin chosen) once at book start."""
    __slots__ = ('armed', 'spin', 'fired', 'prize')

    def __init__(self, rng, p, spins=1):
        self.armed = rng.random() < p
        self.spin = rng.randint(1, spins) if self.armed else 0
        self.fired = False
        self.prize = 0

    def fire(self, rng, ev, spin=1):
        if not self.armed or self.fired or spin != self.spin:
            return 0
        self.fired = True
        self.prize = rng.choices([x for x, _ in CAT_PRIZES],
                                 weights=[w for _, w in CAT_PRIZES])[0]
        ev.add('catSnap', amount=self.prize)
        return self.prize


def run_free_spins(rng, ev, total, scatter_positions, start_step, charged, fs_count=FS_COUNT,
                   reactor=None, launch_wilds=0, cat=None):
    weights = CHARGED_WEIGHTS if charged else FS_WEIGHTS
    ev.add('freeSpinTrigger', totalFs=fs_count, positions=scatter_positions)
    step = start_step
    capped = False
    total_fs = fs_count
    i = 0
    while i < total_fs:
        i += 1
        ev.add('updateFreeSpin', amount=i, total=total_fs)
        board = fill_board(rng, weights)
        # retrigger: scatters keep landing beyond the horizon — 3+ adds spins
        fs_scatters = place_scatters(rng, board, FS_SCATTER_P)
        # EJECTA step 1: the launch Wilds go into the board BEFORE the reveal,
        # so the revealed board is the scored board (never a client overlay).
        launched = place_wilds(rng, board, launch_wilds) if (launch_wilds and i == 1) else []
        emit_reveal(rng, ev, board, 'freegame')
        if launched:
            emit_wild_ejecta(ev, board, launched)
        if len(fs_scatters) >= 3:
            total_fs += FS_RETRIGGER_ADD
            ev.add('freeSpinRetrigger', totalFs=total_fs, positions=fs_scatters)
        spin_win, step = cascade(rng, ev, board, weights, step, total, reactor=reactor)
        # the feature's single Cat Rescue, on its pre-drawn spin
        if cat is not None:
            spin_win += cat.fire(rng, ev, spin=i)
        total += spin_win
        step += 1  # EVENT HORIZON RATCHET: the ladder climbs every free spin
        if spin_win > 0:
            ev.add('setWin', amount=spin_win, winLevel=win_level(spin_win))
        ev.add('setTotalWin', amount=min(total, WINCAP))
        if total >= WINCAP:
            total = WINCAP
            ev.add('wincap', amount=total)
            capped = True
            break
    if not capped:
        ev.add('freeSpinEnd', amount=total, winLevel=win_level(total))
    ev.add('setTotalWin', amount=total)
    return total


def simulate_book(rng, mode, book_id):
    ev = _Ev()
    total = 0
    ante = mode == 'ante'
    start_step = 0

    if mode in ('base', 'ante', 'wildshot'):
        board = fill_board(rng, BASE_WEIGHTS)
        scatters = place_scatters(rng, board, SCATTER_P * (ANTE_SCATTER_MULT if ante else 1.0))
        # THREE-WILD SHOT: exactly 3 Wilds enter the board before the reveal,
        # so they are part of the authoritative scored board.
        shot = place_wilds(rng, board, WILDSHOT_WILDS) if mode == 'wildshot' else []
        triggered = len(scatters) >= 4
        emit_reveal(rng, ev, board, 'basegame')
        if shot:
            emit_wild_ejecta(ev, board, shot)
        # one paid round -> at most one Cat Rescue, covering the free spins too
        cat = CatRescue(rng, CAT_RESCUE_P_ROUND)
        spin_win, _ = cascade(rng, ev, board, BASE_WEIGHTS, start_step, 0)
        total += spin_win
        total += cat.fire(rng, ev)
        if spin_win > 0:
            ev.add('setWin', amount=spin_win, winLevel=win_level(spin_win))
        ev.add('setTotalWin', amount=total)
        if triggered:
            total = run_free_spins(rng, ev, total, scatters, start_step=start_step, charged=False)
        ev.add('finalWin', amount=min(total, WINCAP))
        criteria = 'freegame' if triggered else ('basegame' if total > 0 else '0')
    else:
        board = fill_board(rng, BASE_WEIGHTS)
        cells = [(r, w) for r in range(REELS) for w in range(1, ROWS + 1)]
        scatters = []
        for reel, row in rng.sample(cells, 4):
            board[reel][row] = {'name': 'S'}
            scatters.append({'reel': reel, 'row': row})
        emit_reveal(rng, ev, board, 'basegame')
        ev.add('setTotalWin', amount=0)
        fs_count = (FS_COUNT_SUPER if mode == 'superbonus'
                    else EJECTA_FS_COUNT if mode == 'ejecta' else FS_COUNT)
        # one Cat Rescue for the WHOLE feature, on a pre-drawn free spin
        cat = CatRescue(rng, CAT_RESCUE_P_FEATURE, spins=fs_count)
        total = run_free_spins(rng, ev, 0, scatters,
                               start_step=5 if mode == 'superbonus' else 0,
                               charged=(mode == 'superbonus'),
                               fs_count=fs_count,
                               reactor=Reactor() if mode == 'ejecta' else None,
                               launch_wilds=EJECTA_LAUNCH_WILDS if mode == 'ejecta' else 0,
                               cat=cat)
        ev.add('finalWin', amount=min(total, WINCAP))
        criteria = 'freegame'

    return {'id': book_id, 'payoutMultiplier': min(total, WINCAP), 'criteria': criteria,
            'events': ev.events}
