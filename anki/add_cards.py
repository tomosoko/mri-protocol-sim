#!/usr/bin/env python3
"""
MRI Quiz → Anki 自動追加スクリプト
前提: Anki が起動中 + AnkiConnect アドオン(2055492159)がインストール済み

使い方:
  python anki/add_cards.py              # 全300問を追加（重複スキップ）
  python anki/add_cards.py --new-only   # 未追加分のみ（新規100問等）
  python anki/add_cards.py --dry-run    # 追加せず件数だけ確認
"""

import json
import urllib.request
import urllib.error
import sys
import os

ANKI_CONNECT_URL = "http://localhost:8765"
DECK_NAME = "MRI Protocol Simulator"
MODEL_NAME = "Basic"
QUIZ_FILE = os.path.join(os.path.dirname(__file__), "mri_quiz.txt")


def anki_request(action: str, **params):
    payload = json.dumps({"action": action, "version": 6, "params": params}).encode()
    req = urllib.request.Request(ANKI_CONNECT_URL, payload)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            result = json.load(resp)
    except urllib.error.URLError:
        print("ERROR: AnkiConnect に接続できません。")
        print("  → Anki を起動し、アドオン AnkiConnect (2055492159) をインストールしてください。")
        sys.exit(1)
    if result.get("error"):
        raise RuntimeError(result["error"])
    return result["result"]


def ensure_deck():
    decks = anki_request("deckNames")
    if DECK_NAME not in decks:
        anki_request("createDeck", deck=DECK_NAME)
        print(f"  デッキ作成: {DECK_NAME}")
    else:
        print(f"  デッキ確認: {DECK_NAME} (既存)")


def parse_quiz_file(path: str):
    notes = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if line.startswith("#") or not line.strip():
                continue
            parts = line.split("\t")
            if len(parts) < 2:
                continue
            front, back = parts[0], parts[1]
            tags = parts[2].split() if len(parts) > 2 else ["MRI"]
            notes.append({"front": front, "back": back, "tags": tags})
    return notes


def build_note(front: str, back: str, tags: list[str]) -> dict:
    return {
        "deckName": DECK_NAME,
        "modelName": MODEL_NAME,
        "fields": {"Front": front, "Back": back},
        "options": {"allowDuplicate": False, "duplicateScope": "deck"},
        "tags": tags,
    }


def main():
    dry_run = "--dry-run" in sys.argv
    new_only = "--new-only" in sys.argv

    print("=== MRI Quiz → Anki 追加スクリプト ===\n")

    # AnkiConnect 疎通確認
    try:
        version = anki_request("version")
        print(f"  AnkiConnect バージョン: {version}")
    except SystemExit:
        raise

    if not dry_run:
        ensure_deck()

    # クイズデータ読み込み
    if not os.path.exists(QUIZ_FILE):
        print(f"ERROR: {QUIZ_FILE} が見つかりません。")
        sys.exit(1)

    all_notes = parse_quiz_file(QUIZ_FILE)
    print(f"  読み込み: {len(all_notes)} 問\n")

    if new_only:
        # 既存カードのフロントを取得して差分だけ追加
        print("  既存カードを確認中...")
        note_ids = anki_request("findNotes", query=f'deck:"{DECK_NAME}"')
        if note_ids:
            existing_notes = anki_request("notesInfo", notes=note_ids)
            existing_fronts = {n["fields"]["Front"]["value"] for n in existing_notes}
        else:
            existing_fronts = set()
        notes = [n for n in all_notes if n["front"] not in existing_fronts]
        print(f"  既存: {len(existing_fronts)} 枚 / 新規対象: {len(notes)} 問\n")
    else:
        notes = all_notes

    if dry_run:
        print(f"[DRY RUN] {len(notes)} 問を追加予定（実際には追加しません）")
        for i, n in enumerate(notes[:3], 1):
            print(f"  例{i}: {n['front'][:60]}...")
        return

    if not notes:
        print("追加する問題がありません（全問インポート済みの可能性があります）。")
        return

    # 一括追加（canAddNotes で事前チェック）
    note_dicts = [build_note(n["front"], n["back"], n["tags"]) for n in notes]

    print(f"  {len(note_dicts)} 問を追加中...")
    can_add = anki_request("canAddNotes", notes=note_dicts)
    addable = [nd for nd, ok in zip(note_dicts, can_add) if ok]
    skipped = len(note_dicts) - len(addable)

    if skipped:
        print(f"  重複スキップ: {skipped} 問")

    if addable:
        result = anki_request("addNotes", notes=addable)
        added = sum(1 for r in result if r is not None)
        print(f"  追加完了: {added} 問")
    else:
        print("  追加できる新規問題がありませんでした。")

    print(f"\n完了。デッキ「{DECK_NAME}」を確認してください。")


if __name__ == "__main__":
    main()
