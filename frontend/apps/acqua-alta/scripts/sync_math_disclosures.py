#!/usr/bin/env python3
"""Synchronize SUPERMASSIVE frontend disclosures with a production math build.

The math build writes an audit manifest beside its raw books.  This script uses
integer bet-cents from that manifest so the frontend never has to reconstruct
the paytable from a rounded PAY_SCALE.  It also refreshes the compact local
preview library from the same raw books.

Run from anywhere:

    python3 apps/acqua-alta/scripts/sync_math_disclosures.py
    python3 apps/acqua-alta/scripts/sync_math_disclosures.py --check
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


APP_DIR = Path(__file__).resolve().parent.parent
WEB_SDK_DIR = APP_DIR.parents[1]
WORKSPACE_DIR = WEB_SDK_DIR.parent

MANIFEST_PATH = (
    WORKSPACE_DIR
    / "math-sdk"
    / "games"
    / "supermassive"
    / "library"
    / "build_manifest.json"
)
BOOKS_DIR = MANIFEST_PATH.parent / "books"

CONFIG_PATH = APP_DIR / "src" / "game" / "config.ts"
MOCK_BOOKS_PATH = APP_DIR / "src" / "game" / "mockBooks.json"
PAYTABLE_PATH = (
    WEB_SDK_DIR
    / "packages"
    / "components-ui-html"
    / "src"
    / "components"
    / "ModalPayTable.svelte"
)
RULES_PATH = PAYTABLE_PATH.with_name("ModalGameRules.svelte")

MODE_ORDER = ("base", "ante", "wildshot", "bonus", "ejecta", "superbonus")
MODE_LIBRARY_SIZE = {
    "base": 24,
    "ante": 8,
    "wildshot": 12,
    "bonus": 8,
    "ejecta": 10,
    "superbonus": 8,
}
SYMBOL_ORDER = ("H1", "H2", "H3", "H4", "L4", "L3", "L2", "L1")
RULE_MODE_NAMES = {
    "base": "Base game",
    "ante": "DARK MATTER",
    "wildshot": "THREE-WILD SHOT",
    "bonus": "EVENT HORIZON",
    "ejecta": "EJECTA REACTOR",
    "superbonus": "SINGULARITY",
}
CRITERIA_ORDER = {"0": 0, "basegame": 1, "freegame": 2}
REPRESENTATIVE_EVENTS = (
    "wildEjecta",
    "freeSpinTrigger",
    "freeSpinRetrigger",
    "catSnap",
)
EVENT_BITS = {event_type: 1 << index for index, event_type in enumerate(REPRESENTATIVE_EVENTS)}


@dataclass(frozen=True, slots=True)
class BookSummary:
    book_id: int
    payout: int
    criteria: str
    offset: int
    event_mask: int

    def has_event(self, event_type: str) -> bool:
        return bool(self.event_mask & EVENT_BITS[event_type])


def fail(message: str) -> None:
    raise ValueError(message)


def load_manifest() -> dict[str, Any]:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    paytable = manifest.get("paytableCents")
    modes = manifest.get("modes")
    if set(paytable or {}) != set(SYMBOL_ORDER):
        fail(f"manifest symbols are not exactly {SYMBOL_ORDER}: {sorted(paytable or {})}")
    if set(modes or {}) != set(MODE_ORDER):
        fail(f"manifest modes are not exactly {MODE_ORDER}: {sorted(modes or {})}")

    expected_sizes = {str(size) for size in range(5, 21)}
    for symbol in SYMBOL_ORDER:
        values = paytable[symbol]
        if set(values) != expected_sizes:
            fail(f"{symbol} paytable does not contain exactly sizes 5..20")
        if not all(isinstance(values[str(size)], int) and values[str(size)] > 0 for size in range(5, 21)):
            fail(f"{symbol} paytable contains a non-positive or non-integer value")

    for mode in MODE_ORDER:
        mode_data = modes[mode]
        for key in ("bookCount", "maxBookId", "maxPayoutMultiplier"):
            if not isinstance(mode_data.get(key), int):
                fail(f"manifest {mode}.{key} must be an integer")
    return manifest


def scan_book_file(mode: str, manifest_mode: dict[str, Any]) -> tuple[Path, list[BookSummary]]:
    path = BOOKS_DIR / f"books_{mode}.jsonl"
    summaries: list[BookSummary] = []
    seen_ids: set[int] = set()

    with path.open("rb") as handle:
        while True:
            offset = handle.tell()
            line = handle.readline()
            if not line:
                break
            if not line.strip():
                continue
            book = json.loads(line)
            book_id = book.get("id")
            payout = book.get("payoutMultiplier")
            criteria = str(book.get("criteria", ""))
            if not isinstance(book_id, int) or not isinstance(payout, int):
                fail(f"{path.name} has a non-integer id or payout at byte {offset}")
            if book_id in seen_ids:
                fail(f"{path.name} contains duplicate book id {book_id}")
            seen_ids.add(book_id)

            mask = 0
            for event in book.get("events", []):
                mask |= EVENT_BITS.get(event.get("type"), 0)
            summaries.append(BookSummary(book_id, payout, criteria, offset, mask))

    if len(summaries) != manifest_mode["bookCount"]:
        fail(
            f"{path.name} count {len(summaries)} does not match manifest "
            f"{manifest_mode['bookCount']}"
        )
    maximum = max(summaries, key=lambda summary: (summary.payout, -summary.book_id))
    if maximum.payout != manifest_mode["maxPayoutMultiplier"]:
        fail(
            f"{mode} raw-book maximum {maximum.payout} does not match manifest "
            f"{manifest_mode['maxPayoutMultiplier']}"
        )
    manifest_max_id = manifest_mode["maxBookId"]
    manifest_max = next((summary for summary in summaries if summary.book_id == manifest_max_id), None)
    if manifest_max is None or manifest_max.payout != maximum.payout:
        fail(f"{mode} manifest maxBookId {manifest_max_id} is not a maximum raw book")
    return path, summaries


def middle(candidates: list[BookSummary]) -> BookSummary:
    ordered = sorted(candidates, key=lambda summary: (summary.payout, summary.book_id))
    return ordered[(len(ordered) - 1) // 2]


def select_representative_ids(
    mode: str,
    summaries: list[BookSummary],
    manifest_mode: dict[str, Any],
) -> list[int]:
    target = MODE_LIBRARY_SIZE[mode]
    by_id = {summary.book_id: summary for summary in summaries}
    selected: list[int] = []

    def add(book_id: int) -> None:
        if len(selected) >= target or book_id in selected:
            return
        if book_id not in by_id:
            fail(f"required {mode} book id {book_id} is absent")
        selected.append(book_id)

    # Release evidence first: the exact mode ceiling and the reviewer's ante
    # reproduction remain easy to locate in the compact library.
    add(manifest_mode["maxBookId"])
    if mode == "ante":
        add(3692)

    zero_books = [summary for summary in summaries if summary.payout == 0]
    if zero_books:
        add(min(zero_books, key=lambda summary: summary.book_id).book_id)

    criteria = sorted(
        {summary.criteria for summary in summaries},
        key=lambda value: (CRITERIA_ORDER.get(value, 99), value),
    )
    for value in criteria:
        candidates = [summary for summary in summaries if summary.criteria == value]
        add(middle(candidates).book_id)

    for event_type in REPRESENTATIVE_EVENTS:
        candidates = [summary for summary in summaries if summary.has_event(event_type)]
        if candidates:
            add(middle(candidates).book_id)

    # Fill the remaining slots across the complete payout distribution.  Using
    # many evenly spaced targets before the final linear fallback keeps the set
    # stable and representative even when a large share of books pay zero.
    ordered = sorted(summaries, key=lambda summary: (summary.payout, summary.book_id))
    sample_points = max(target * 8, 2)
    for index in range(sample_points):
        position = round(index * (len(ordered) - 1) / (sample_points - 1))
        add(ordered[position].book_id)
        if len(selected) == target:
            break
    for summary in ordered:
        add(summary.book_id)
        if len(selected) == target:
            break

    if len(selected) != target:
        fail(f"selected {len(selected)} {mode} books, expected {target}")
    if manifest_mode["maxBookId"] not in selected:
        fail(f"{mode} preview selection omitted max book")
    if mode == "ante" and 3692 not in selected:
        fail("ante preview selection omitted reviewer book 3692")
    return selected


def load_selected_books(
    path: Path,
    summaries: list[BookSummary],
    selected_ids: list[int],
) -> list[dict[str, Any]]:
    by_id = {summary.book_id: summary for summary in summaries}
    books: list[dict[str, Any]] = []
    with path.open("rb") as handle:
        for book_id in selected_ids:
            handle.seek(by_id[book_id].offset)
            book = json.loads(handle.readline())
            if book.get("id") != book_id:
                fail(f"byte offset for {path.name} book {book_id} is stale")
            for event in book.get("events", []):
                if event.get("type") != "wildEjecta":
                    continue
                positions = event.get("positions", [])
                invalid = [
                    position
                    for position in positions
                    if not (
                        0 <= position.get("reel", -1) < 5
                        and 1 <= position.get("row", -1) <= 4
                    )
                ]
                if not positions or invalid:
                    fail(f"selected {path.name} book {book_id} has invalid Wild Ejecta: {invalid}")
            books.append(book)
    return books


def build_mock_library(manifest: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    library: dict[str, list[dict[str, Any]]] = {}
    for mode in MODE_ORDER:
        path, summaries = scan_book_file(mode, manifest["modes"][mode])
        selected_ids = select_representative_ids(mode, summaries, manifest["modes"][mode])
        library[mode] = load_selected_books(path, summaries, selected_ids)
    if sum(len(books) for books in library.values()) != 70:
        fail("preview library must contain exactly 70 books")
    return library


def cents_literal(cents: int) -> str:
    value = f"{cents / 100:.2f}".rstrip("0")
    return value + "0" if value.endswith(".") else value


def replace_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.DOTALL | re.MULTILINE)
    if count != 1:
        fail(f"could not locate exactly one {label} block")
    return updated


def render_config(text: str, manifest: dict[str, Any]) -> str:
    mode_lines = [
        f"\t{mode}: {cents_literal(manifest['modes'][mode]['maxPayoutMultiplier'])},"
        for mode in MODE_ORDER
    ]
    max_block = "export const modeMaxWin = {\n" + "\n".join(mode_lines) + "\n} as const;"
    text = replace_once(
        text,
        r"^export const modeMaxWin = \{.*?^\} as const;",
        max_block,
        "config modeMaxWin",
    )

    paytable = manifest["paytableCents"]
    for symbol in SYMBOL_ORDER:
        lines: list[str] = []
        for size in range(5, 21):
            lines.extend(
                (
                    "\t\t\t\t{",
                    f"\t\t\t\t\t'{size}': {cents_literal(paytable[symbol][str(size)])},",
                    "\t\t\t\t},",
                )
            )
        pattern = (
            rf"(?P<prefix>^\t\t{symbol}: \{{\n\t\t\tpaytable: \[\n)"
            rf".*?"
            rf"(?P<suffix>^\t\t\t\],\n\t\t\}},)"
        )
        replacement = rf"\g<prefix>{chr(10).join(lines)}{chr(10)}\g<suffix>"
        text = replace_once(text, pattern, replacement, f"config {symbol} paytable")
    return text


def render_modal_paytable(text: str, manifest: dict[str, Any]) -> str:
    paytable = manifest["paytableCents"]
    for symbol in SYMBOL_ORDER:
        values = [f"\t\t\t\t'{paytable[symbol][str(size)] / 100:.2f}'," for size in range(5, 21)]
        pattern = (
            rf"(?P<prefix>img: sym\('symbol_{symbol}\.webp'\),.*?pays: \[\n)"
            rf".*?"
            rf"(?P<suffix>^\t\t\t\],)"
        )
        replacement = rf"\g<prefix>{chr(10).join(values)}{chr(10)}\g<suffix>"
        text = replace_once(text, pattern, replacement, f"modal {symbol} paytable")
    return text


def render_rules(text: str, manifest: dict[str, Any]) -> str:
    lines = [
        f"\t\t{{ name: '{RULE_MODE_NAMES[mode]}', "
        f"max: '{manifest['modes'][mode]['maxPayoutMultiplier'] / 100:,.2f}×' }},"
        for mode in MODE_ORDER
    ]
    block = "\tconst MODE_MAX_WIN = [\n" + "\n".join(lines) + "\n\t];"
    return replace_once(
        text,
        r"^\tconst MODE_MAX_WIN = \[.*?^\t\];",
        block,
        "rules MODE_MAX_WIN",
    )


def synchronize_text(path: Path, expected: str, check: bool, stale: list[Path]) -> None:
    current = path.read_text(encoding="utf-8")
    if current == expected:
        return
    stale.append(path)
    if not check:
        path.write_text(expected, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="report drift without writing files",
    )
    args = parser.parse_args()

    manifest = load_manifest()
    mock_library = build_mock_library(manifest)
    stale: list[Path] = []

    config_current = CONFIG_PATH.read_text(encoding="utf-8")
    paytable_current = PAYTABLE_PATH.read_text(encoding="utf-8")
    rules_current = RULES_PATH.read_text(encoding="utf-8")
    synchronize_text(CONFIG_PATH, render_config(config_current, manifest), args.check, stale)
    synchronize_text(
        PAYTABLE_PATH,
        render_modal_paytable(paytable_current, manifest),
        args.check,
        stale,
    )
    synchronize_text(RULES_PATH, render_rules(rules_current, manifest), args.check, stale)

    expected_mock = json.dumps(mock_library, separators=(",", ":")) + "\n"
    try:
        current_mock = MOCK_BOOKS_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        current_mock = None
    if current_mock != expected_mock:
        stale.append(MOCK_BOOKS_PATH)
        if not args.check:
            MOCK_BOOKS_PATH.write_text(expected_mock, encoding="utf-8")

    operation = "would update" if args.check else "updated"
    for path in stale:
        print(f"{operation}: {path.relative_to(WEB_SDK_DIR)}")

    print(
        "math sync: "
        f"PAY_SCALE={manifest['payScaleRepr']}, "
        "128 pay values, 6 mode maxima, 70 preview books"
    )
    if args.check and stale:
        print(f"FAILED: {len(stale)} synchronized file(s) are stale")
        return 1
    print("OK: frontend math disclosures and preview library are synchronized")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
