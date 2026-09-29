#!/usr/bin/env python3
"""Build data/cards.js from the HolodoriDB master data dumps.

Usage: python3 scripts/build_data.py --eng <holodori-db-eng-diff> --jpn <holodori-db-jpn-diff>

The output is a single JS file (window.HOLO_DATA = {...}) so the static site
works from any host, including file://.
"""
import argparse
import json
import os
import re
import subprocess
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ATTR = {"ATTRIBUTE_1": "cute", "ATTRIBUTE_2": "pure", "ATTRIBUTE_3": "happy"}

# Costume "order" values encode the release wave; map them to the gacha banner.
LAUNCH_DATE = "2026-07-23"
BANNERS = [
    # id, costume order, start date (JST)
    ("launch", (26070002, 26070003), LAUNCH_DATE),
    ("pickup-260728", (26081001,), "2026-07-28"),
    ("pickup-260807", (26082001,), "2026-08-07"),
    ("pickup-260817", (26083001,), "2026-08-17"),
    ("pickup-260829", (26091001,), "2026-08-29"),
    ("pickup-260908", (26092001,), "2026-09-08"),
    ("pickup-260919", (26093001,), "2026-09-19"),
]

EFFECT_KEYS = {
    "SCORE_UP_PERMIL_UP": "score_up",
    "SCORE_UP_EFFECT_UP_PERMIL_UP": "score_support",
    "LIVE_ACTIVE_SKILL_ACTIVATION_PROBABILITY_UP_PERMIL_UP": "skill_rate_up",
    "LIFE_RECOVERY": "life_recovery",
    "JUDGEMENT_ENHANCE": "judgement_boost",
    "PERFORMANCE_UP_PERMIL_UP": "performance_up",
    "TECHNIQUE_UP_PERMIL_UP": "technique_up",
    "SENSE_UP_PERMIL_UP": "sense_up",
    "ALL_PARAMETER_UP_PERMIL_UP": "all_stats_up",
    "LIVE_ACTIVE_SKILL_EFFECT_UP_PERMIL_UP": "skill_effect_up",
}

TRIGGER_KEYS = {
    "DECK_CARD_ATTRIBUTE": "deck_attribute",
    "DECK_CARD_CHARACTER_GROUPING": "deck_group",
    "DECK_LEADER_CHARACTER": "leader_talent",
    "DECK_LEADER_CHARACTER_GROUPING": "leader_group",
    "MUSIC_CHARACTER": "song_talent",
    "COMBO_GTE": "combo",
    "LIFE_GTE": "life_high",
    "LIFE_LTE": "life_low",
    "JUDGEMENT_TYPE_GTE": "judgement",
}


def enum_tail(value, marker):
    return value.split(marker, 1)[1] if value and marker in value else value


def load(base, name):
    path = os.path.join(base, name)
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def by_id(base, name):
    return {x["id"]: x["data"] for x in load(base, name)}


def lang(base, *names):
    out = {}
    for name in names:
        for x in load(base, name):
            out[x["id"]] = x["data"].get("text", "").strip()
    return out


def grouped(base, name, key):
    out = defaultdict(list)
    for x in load(base, name):
        out[x[key]].append(x["data"])
    return out


def first_seen(base):
    """Date each card id first appeared in the master data git history."""
    try:
        log = subprocess.check_output(
            ["git", "-C", base, "log", "--reverse", "--format=%H %ad", "--date=short", "--", "Card.json"],
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return {}
    seen = {}
    for line in log.splitlines():
        sha, date = line.split()
        try:
            blob = subprocess.check_output(["git", "-C", base, "show", f"{sha}:Card.json"])
        except subprocess.CalledProcessError:
            continue
        for x in json.loads(blob):
            seen.setdefault(x["id"], date)
    return seen


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--eng", required=True)
    ap.add_argument("--jpn", required=True)
    ap.add_argument("--out", default=os.path.join(ROOT, "data", "cards.js"))
    args = ap.parse_args()
    E, J = args.eng, args.jpn

    en = lang(E, "LangCard_Eng.json", "LangCharacter_Eng.json", "LangCostume_Eng.json",
              "LangCharacterGrouping_Eng.json", "LangCharacterProduction_Eng.json",
              "LangGeneratedLiveActiveSkillLevel_Eng.json", "LangGeneratedLivePassiveSkillLevel_Eng.json",
              "LangGeneratedLiveSpecialSkillLevel_Eng.json", "LangGeneratedLiveLeaderSkill_Eng.json",
              "LangGeneratedSkillTreeConnectEffect_Eng.json", "LangGachaPoint_Eng.json")
    ja = lang(J, "LangCard_Jpn.json", "LangCharacter_Jpn.json", "LangCostume_Jpn.json",
              "LangCharacterGrouping_Jpn.json", "LangCharacterProduction_Jpn.json",
              "LangGeneratedLiveActiveSkillLevel_Jpn.json", "LangGeneratedLivePassiveSkillLevel_Jpn.json",
              "LangGeneratedLiveSpecialSkillLevel_Jpn.json", "LangGeneratedLiveLeaderSkill_Jpn.json",
              "LangGeneratedSkillTreeConnectEffect_Jpn.json", "LangGachaPoint_Jpn.json")

    def t(lang_id):
        return {"en": en.get(lang_id, ""), "ja": ja.get(lang_id, "") or en.get(lang_id, "")}

    cards_raw = [x["data"] for x in load(E, "Card.json")]
    chars = by_id(E, "Character.json")
    groups = by_id(E, "CharacterGrouping.json")
    productions = by_id(E, "CharacterProduction.json")
    costumes = by_id(E, "Costume.json")
    leader = by_id(E, "LiveLeaderSkill.json")
    active_lv = grouped(E, "LiveActiveSkillLevel.json", "live_active_skill_id")
    passive_lv = grouped(E, "LivePassiveSkillLevel.json", "live_passive_skill_id")
    special_lv = grouped(E, "LiveSpecialSkillLevel.json", "live_special_skill_id")
    connect = grouped(E, "SkillTreeConnectEffect.json", "id")
    active_eff = grouped(E, "LiveActiveSkillEffect.json", "group_id")
    passive_eff = grouped(E, "LivePassiveSkillEffect.json", "group_id")
    triggers = grouped(E, "LiveSkillTrigger.json", "group_id")
    targets = by_id(E, "LiveSkillEffectTarget.json")
    level_rows = grouped(E, "CardLevel.json", "group_id")
    limit_rows = grouped(E, "CardLevelLimit.json", "group_id")
    potential_rows = grouped(E, "CardPotential.json", "group_id")
    seen = first_seen(E)

    def effect_tags(group_id):
        tags, tgt = [], []
        for e in active_eff.get(group_id, []) + passive_eff.get(group_id, []):
            key = EFFECT_KEYS.get(enum_tail(e["type"], "_EFFECT_TYPE_"))
            if key:
                tags.append(key)
            target = targets.get(e.get("liveSkillEffectTargetId"))
            if target:
                ttype = enum_tail(target["type"], "_TARGET_TYPE_").lower()
                tgt.append(ttype)
        return tags, tgt

    def trigger_tags(group_id):
        return [TRIGGER_KEYS.get(enum_tail(x["type"], "_TRIGGER_TYPE_"), "other") for x in triggers.get(group_id, [])]

    def skill_levels(rows, kind):
        out = []
        for r in sorted(rows, key=lambda r: r["level"]):
            tags, tgt, trig = [], [], []
            for k, v in r.items():
                if k.endswith("EffectGroupId"):
                    a, b = effect_tags(v)
                    tags += a
                    tgt += b
                elif k.endswith("TriggerGroupId"):
                    trig += trigger_tags(v)
            lv = {"lv": r["level"], "text": t(r["descriptionLangId"]), "eff": sorted(set(tags)),
                  "tgt": sorted(set(tgt)), "trig": sorted(set(trig))}
            if kind == "active":
                lv["ct"] = r.get("coolTimeMillisecond", 0) / 1000
                lv["dur"] = r.get("effectDurationMillisecond", 0) / 1000
                lv["prob"] = r.get("activationProbabilityPermilMultiply", 0) / 1000
            if kind == "special":
                lv["dur"] = r.get("effectDurationMillisecond", 0) / 1000
            out.append(lv)
        return out

    wave = {}
    for bid, orders, date in BANNERS:
        for o in orders:
            wave[o] = (bid, date)

    cards = []
    used_level_groups = set()
    for c in cards_raw:
        ch = chars[c["characterId"]]
        rarity = int(c["rarity"][-1])
        attr = ATTR[enum_tail(c["attributeType"], "_TYPE_")]
        costume = costumes.get(c.get("rewardCostumeId") or "")
        banner, release = ("launch", LAUNCH_DATE)
        if costume and costume.get("order") in wave:
            banner, release = wave[costume["order"]]
        lead = None
        if costume and costume.get("liveLeaderSkillId") in leader:
            ls = leader[costume["liveLeaderSkillId"]]
            tags, tgt, trig = [], [], []
            for k, v in ls.items():
                if k.endswith("EffectGroupId"):
                    a, b = effect_tags(v)
                    tags += a
                    tgt += b
                elif k.endswith("TriggerGroupId"):
                    trig += trigger_tags(v)
            lead = {"name": t(costume["nameLangId"]), "text": t(ls["descriptionLangId"]),
                    "eff": sorted(set(tags)), "tgt": sorted(set(tgt)), "trig": sorted(set(trig))}
        board = None
        if c.get("skillTreeConnectEffectId") in connect:
            board = [{"lv": r["level"], "text": t(r["descriptionLangId"])}
                     for r in sorted(connect[c["skillTreeConnectEffectId"]], key=lambda r: r["level"])]
        used_level_groups.add(c["cardLevelGroupId"])
        cards.append({
            "id": c["id"],
            "order": c.get("order", 0),
            "chr": c["characterId"],
            "title": t(c["nameLangId"]),
            "rarity": rarity,
            "attr": attr,
            "dist": [c["performancePermilMultiply"], c["techniquePermilMultiply"], c["sensePermilMultiply"]],
            "levelGroup": c["cardLevelGroupId"],
            "limitGroup": c["cardLevelLimitGroupId"],
            "potentialGroup": c["cardPotentialGroupId"],
            "asset": c["assetId"],
            "limited": banner != "launch",
            "banner": banner,
            "release": release,
            "firstSeen": seen.get(c["id"]),
            "skills": {
                "active": skill_levels(active_lv.get(c["liveActiveSkillId"], []), "active"),
                "special": skill_levels(special_lv.get(c["liveSpecialSkillId"], []), "special"),
                "passive": skill_levels(passive_lv.get(c["livePassiveSkillId"], []), "passive"),
            },
            "leader": lead,
            "board": board,
        })

    talents = {}
    for cid, ch in chars.items():
        if not ch.get("isPlayable"):
            continue
        talents[cid] = {
            "name": t(ch["nameLangId"]),
            "short": t(ch["shortNameLangId"]),
            "production": ch["characterProductionId"],
            "groups": ch.get("regularCharacterGroupingIds", []),
            "color": "#" + ch.get("color1", "888888"),
            "color2": "#" + ch.get("color2", ch.get("color1", "888888")),
            "order": ch.get("order", 0),
            "birthday": [ch.get("birthMonth"), ch.get("birthDay")],
            "debut": [ch.get("debutYear"), ch.get("debutMonth"), ch.get("debutDay")],
        }

    out = {
        "generatedFrom": {
            "masterVersion": open(os.path.join(E, "version.txt")).read().strip(),
            "englishCommit": subprocess.run(["git", "-C", E, "log", "-1", "--format=%H %ad", "--date=short"],
                                            capture_output=True, text=True).stdout.strip(),
            "japaneseCommit": subprocess.run(["git", "-C", J, "log", "-1", "--format=%H %ad", "--date=short"],
                                             capture_output=True, text=True).stdout.strip(),
        },
        "cards": sorted(cards, key=lambda c: (c["release"], -c["rarity"], c["order"])),
        "talents": talents,
        "groups": {gid: {"name": t(g["nameLangId"]), "color": "#" + g.get("color1", "888888"), "order": g.get("order", 0)}
                   for gid, g in groups.items()},
        "productions": {pid: {"name": t(p["nameLangId"]), "order": p.get("order", 0)} for pid, p in productions.items()},
        "banners": [{"id": bid, "date": date,
                     "name": t(f"la-gacha_point-{bid}") if bid != "launch" else {"en": "Launch (Standard pool)", "ja": "リリース（恒常）"}}
                    for bid, _, date in BANNERS],
        "levels": {g: [int(r["parameterBaseValue"]) for r in sorted(level_rows[g], key=lambda r: r["level"])]
                   for g in sorted(used_level_groups)},
        "limits": {g: [r["levelLimit"] for r in sorted(rows, key=lambda r: r.get("limitBreakCount", 0))]
                   for g, rows in limit_rows.items()},
        "potentials": {g: [{"n": r["upgradeCount"], "type": enum_tail(r["effectType"], "_EFFECT_TYPE_").lower(),
                            "value": int(r["value"])} for r in sorted(rows, key=lambda r: r["upgradeCount"])]
                       for g, rows in potential_rows.items()},
    }
    # Strip the "Gacha Pt(s)" suffix from banner names.
    for b in out["banners"]:
        for k in ("en", "ja"):
            b["name"][k] = re.sub(r"\s*(Gacha Pts?|ガチャPt)$", "", b["name"][k])

    with open(args.out, "w", encoding="utf-8") as f:
        f.write("// Generated by scripts/build_data.py - do not edit by hand.\n")
        f.write("window.HOLO_DATA = ")
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"wrote {len(cards)} cards, {len(talents)} talents -> {args.out}")


if __name__ == "__main__":
    main()
