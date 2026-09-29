#!/usr/bin/env python3
"""Build data/game.js: the structured mechanics used by the team optimizer.

Usage: python3 scripts/build_game.py --eng <holodori-db-eng-diff> --jpn <holodori-db-jpn-diff>

Everything here is read straight from the HolodoriDB master data dumps:
structured skill effects/triggers per card, leader outfit skills, songs and
difficulties, note score coefficients, combo bonuses, memory (poster) bonuses,
the Member Upgrade Bonus per card level and holomem board totals per talent.
"""
import argparse
import json
import os
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATTR = {"ATTRIBUTE_1": "cute", "ATTRIBUTE_2": "pure", "ATTRIBUTE_3": "happy"}


def tail(value, marker="_TYPE_"):
    if not value:
        return value
    return value.rsplit(marker, 1)[-1]


def load(base, name):
    path = os.path.join(base, name)
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def by_id(base, name):
    return {x["id"]: x["data"] for x in load(base, name)}


def grouped(base, name, key):
    out = defaultdict(list)
    for x in load(base, name):
        out[x[key]].append(x["data"])
    return out


def lang(base, *names):
    out = {}
    for name in names:
        for x in load(base, name):
            out[x["id"]] = x["data"].get("text", "").strip()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--eng", required=True)
    ap.add_argument("--jpn", required=True)
    ap.add_argument("--out", default=os.path.join(ROOT, "data", "game.js"))
    args = ap.parse_args()
    E, J = args.eng, args.jpn

    targets = by_id(E, "LiveSkillEffectTarget.json")
    triggers = grouped(E, "LiveSkillTrigger.json", "group_id")
    active_eff = grouped(E, "LiveActiveSkillEffect.json", "group_id")
    passive_eff = grouped(E, "LivePassiveSkillEffect.json", "group_id")

    def target(tid):
        t = targets.get(tid)
        if not t:
            return None
        out = {"type": tail(t["type"]).lower()}
        if t.get("targetCount"):
            out["n"] = t["targetCount"]
        if t.get("cardAttributeType"):
            out["attr"] = ATTR[tail(t["cardAttributeType"])]
        if t.get("characterGroupingId"):
            out["grp"] = t["characterGroupingId"]
        if t.get("characterId"):
            out["chr"] = t["characterId"]
        return out

    def effects(gid):
        out = []
        for e in sorted(active_eff.get(gid, []) + passive_eff.get(gid, []), key=lambda e: e.get("number", 0)):
            x = {"type": tail(e["type"], "_EFFECT_TYPE_").lower(), "v": int(e.get("value", 0) or 0)}
            tg = target(e.get("liveSkillEffectTargetId"))
            if tg:
                x["tgt"] = tg
            out.append(x)
        return out

    def trigger(gid):
        out = []
        for t in triggers.get(gid, []):
            x = {"type": tail(t["type"], "_TRIGGER_TYPE_").lower()}
            if t.get("threshold"):
                x["n"] = int(t["threshold"])
            if t.get("cardAttributeType"):
                x["attr"] = ATTR[tail(t["cardAttributeType"])]
            if t.get("characterGroupingId"):
                x["grp"] = t["characterGroupingId"]
            if t.get("characterIds"):
                x["chrs"] = t["characterIds"]
            if t.get("liveNoteJudgementType"):
                x["judge"] = tail(t["liveNoteJudgementType"]).lower()
            out.append(x)
        return out

    cards = [x["data"] for x in load(E, "Card.json")]
    costumes = by_id(E, "Costume.json")
    leader = by_id(E, "LiveLeaderSkill.json")
    active_lv = grouped(E, "LiveActiveSkillLevel.json", "live_active_skill_id")
    passive_lv = grouped(E, "LivePassiveSkillLevel.json", "live_passive_skill_id")
    special_lv = grouped(E, "LiveSpecialSkillLevel.json", "live_special_skill_id")

    sim = {}
    for c in cards:
        act = []
        for r in sorted(active_lv.get(c["liveActiveSkillId"], []), key=lambda r: r["level"]):
            act.append({
                "ct": r.get("coolTimeMillisecond", 0) / 1000,
                "dur": r.get("effectDurationMillisecond", 0) / 1000,
                "p": r.get("activationProbabilityPermilMultiply", 0) / 1000,
                "eff": effects(r.get("liveActiveSkillEffectGroupId")),
                "trig": trigger(r.get("additionalLiveSkillTriggerGroupId")) if r.get("additionalLiveSkillTriggerGroupId") else [],
                "add": effects(r.get("additionalLiveActiveSkillEffectGroupId")) if r.get("additionalLiveActiveSkillEffectGroupId") else [],
            })
        spc = []
        for r in sorted(special_lv.get(c["liveSpecialSkillId"], []), key=lambda r: r["level"]):
            spc.append({
                "dur": r.get("effectDurationMillisecond", 0) / 1000,
                "eff": effects(r.get("liveActiveSkillEffectGroupId")),
                "trig": trigger(r.get("additionalLiveSkillTriggerGroupId")) if r.get("additionalLiveSkillTriggerGroupId") else [],
                "add": effects(r.get("additionalLiveActiveSkillEffectGroupId")) if r.get("additionalLiveActiveSkillEffectGroupId") else [],
            })
        pas = []
        for r in sorted(passive_lv.get(c["livePassiveSkillId"], []), key=lambda r: r["level"]):
            pas.append({
                "trig": trigger(r.get("liveSkillTriggerGroupId")) if r.get("liveSkillTriggerGroupId") else [],
                "eff": effects(r.get("livePassiveSkillEffectGroupId")),
            })
        lead = None
        costume = costumes.get(c.get("rewardCostumeId") or "")
        if costume and costume.get("liveLeaderSkillId") in leader:
            ls = leader[costume["liveLeaderSkillId"]]
            lead = {
                "costume": costume["id"],
                "trig": trigger(ls.get("liveSkillTriggerGroupId")) if ls.get("liveSkillTriggerGroupId") else [],
                "eff": effects(ls.get("livePassiveSkillEffectGroupId")),
                "addTrig": trigger(ls.get("additionalLiveSkillTriggerGroupId")) if ls.get("additionalLiveSkillTriggerGroupId") else [],
                "add": effects(ls.get("additionalLivePassiveSkillEffectGroupId")) if ls.get("additionalLivePassiveSkillEffectGroupId") else [],
            }
        sim[c["id"]] = {"active": act, "special": spc, "passive": pas, "leader": lead}

    # Member Upgrade Bonus (permyriad) per card level group, index = level - 1.
    upgrade = {}
    for g, rows in grouped(E, "CardLevel.json", "group_id").items():
        upgrade[g] = [int(r.get("liveDeckPowerPermyriadUp", 0) or 0) for r in sorted(rows, key=lambda r: r["level"])]

    # Songs
    en = lang(E, "LangMusic_Eng.json")
    ja = lang(J, "LangMusic_Jpn.json")
    diffs = defaultdict(dict)
    for x in load(E, "MusicDifficulty.json"):
        d = x["data"]
        diffs[d["musicId"]][tail(d["difficultyType"]).lower()] = {"lv": d.get("difficultyLevel", 0)}
    for x in load(E, "MusicDifficultyChart.json"):
        d = x["data"]
        k = tail(d["difficultyType"]).lower()
        if k in diffs[d["musicId"]]:
            diffs[d["musicId"]][k]["notes"] = d.get("fullComboNoteCount", 0)
    songs = []
    for x in load(E, "Music.json"):
        m = x["data"]
        songs.append({
            "id": m["id"],
            "title": {"en": en.get(m["titleLangId"], m["id"]), "ja": ja.get(m["titleLangId"], "") or en.get(m["titleLangId"], m["id"])},
            "singer": {"en": en.get(m.get("characterGroupDisplayNameLangId", ""), ""), "ja": ja.get(m.get("characterGroupDisplayNameLangId", ""), "")},
            "singerType": tail(m.get("musicSingerType", "")).lower(),
            "chrs": m.get("characterIds", []),
            "sec": m.get("playingSeconds", 120),
            "coef": int(m.get("liveScoreCoefficientPermil", 5)),
            "combo": m.get("liveComboGroupId", "live_combo-1"),
            "start": int(m.get("startTime", 0)),
            "cat": tail(m.get("categoryType", "")).lower(),
            "rating": bool(m.get("isHighestScoreRatingTarget")),
            "rank": m.get("singleLiveScoreEvaluationRankGroupId", "live_score_rank-s001"),
            "order": m.get("order", 0),
            "diff": diffs[m["id"]],
        })
    songs.sort(key=lambda s: s["order"])

    # Note score coefficients (permil) for PERFECT / GREAT / AUTO per note type.
    notes = defaultdict(dict)
    for x in load(E, "LiveNote.json"):
        d = x["data"]
        notes[tail(d["noteType"]).lower()][tail(d["judgementType"]).lower()] = int(d.get("scoreCoefficientPermilMultiply", 0) or 0)

    combos = defaultdict(list)
    for x in load(E, "LiveCombo.json"):
        d = x["data"]
        combos[d["groupId"]].append([d.get("comboCountFrom", 0), d.get("scoreUpPermil", 0)])
    for v in combos.values():
        v.sort()

    posters = sorted([[x["data"]["threshold"], int(x["data"]["liveDeckAllParameterUpPermilUp"])] for x in load(E, "PosterCollectEffect.json")])
    poster_count = len(load(E, "Poster.json"))

    score_ranks = defaultdict(list)
    for x in load(E, "LiveScoreEvaluationRank.json"):
        d = x["data"]
        score_ranks[d["groupId"]].append([int(d.get("score", 0) or 0), tail(d["evaluationRankType"]) + ("+" + str(d["plus"]) if d.get("plus") else "")])
    power_ranks = sorted([[int(x["data"].get("threshold", 0) or 0), tail(x["data"]["type"]) + ("+" + str(x["data"]["plus"]) if x["data"].get("plus") else "")] for x in load(E, "LiveDeckPowerRank.json")])

    # Holomem rank -> cumulative board points.
    rank_points = [0]
    for r in sorted([x["data"] for x in load(E, "CharacterLevel.json")], key=lambda r: r["level"]):
        rank_points.append(rank_points[-1] + int(r.get("skillTreePointQuantity", 0) or 0))
    rank_points = rank_points[1:]  # index = rank - 1

    # Holomem board: resolve the node variant per talent and total the live-relevant effects.
    st_eff = by_id(E, "SkillTreeEffect.json")
    st_tgt = by_id(E, "SkillTreeEffectTarget.json")
    st_trig = grouped(E, "SkillTreeEffectPassiveTrigger.json", "group_id")
    nodes = defaultdict(list)
    for x in load(E, "SkillTreeNode.json"):
        nodes[(x["data"]["groupId"], x["data"].get("grade", 1))].append(x["data"])
    chars = by_id(E, "Character.json")
    playable = [cid for cid, ch in chars.items() if ch.get("isPlayable")]
    live_types = {"PERFORMANCE_UP", "TECHNIQUE_UP", "SENSE_UP", "ALL_PARAMETER_UP", "PERFORMANCE_UP_PERMIL_UP",
                  "TECHNIQUE_UP_PERMIL_UP", "SENSE_UP_PERMIL_UP", "ALL_PARAMETER_UP_PERMIL_UP",
                  "ALL_PARAMETER_UP_FOR_CHARACTER_GROUPING", "LIVE_ACTIVE_SKILL_EFFECT_UP_PERMIL_UP",
                  "LIVE_ACTIVE_SKILL_ACTIVATION_PROBABILITY_UP_PERMIL_UP", "LIVE_ACTIVE_SKILL_COOL_TIME_SHORTEN_PERMIL_UP",
                  "LIVE_SCORE_BONUS_ADD_PERMIL_UP_BY_MUSIC_SKILL_TREE_CHARACTER_AND_MUSIC_SINGER_TYPE"}
    board = {}
    board_cost = {}
    for cid in playable:
        eff_list = []
        cost = 0
        for (gid, grade), rows in nodes.items():
            specific = [r for r in rows if cid in (r.get("characterIds") or [])]
            generic = [r for r in rows if not r.get("characterIds")]
            row = (specific or generic or [None])[0]
            if not row:
                continue
            cost += int(row.get("consumptionSkillTreePointQuantity", 0) or 0)
            e = st_eff.get(row.get("skillTreeEffectId"))
            if not e:
                continue
            et = tail(e["effectType"], "_EFFECT_TYPE_")
            if et not in live_types:
                continue
            tg = st_tgt.get(e.get("skillTreeEffectTargetId"), {})
            item = {
                "node": tail(row["type"], "_NODE_TYPE_").lower(),  # all_member | leader | card | content
                "type": et.lower(),
                "v": int(e.get("value", 0) or 0),
                "when": tail(e.get("characterTriggerType", ""), "_TRIGGER_TYPE_").lower(),
                "tgt": tail(tg.get("type", ""), "_TARGET_TYPE_").lower(),
            }
            if tg.get("characterId"):
                item["chr"] = tg["characterId"]
            if tg.get("characterGroupingId"):
                item["grp"] = tg["characterGroupingId"]
            for t in st_trig.get(e.get("skillTreeEffectPassiveTriggerGroupId"), []):
                item["songTrig"] = tail(t["type"], "_TRIGGER_TYPE_").lower()
                if t.get("musicSingerType"):
                    item["singerType"] = tail(t["musicSingerType"]).lower()
                if t.get("characterIds"):
                    item["songChrs"] = t["characterIds"]
                if t.get("characterGroupingId"):
                    item["songGrp"] = t["characterGroupingId"]
            eff_list.append(item)
        # Merge identical effects to keep the file small.
        merged = {}
        for it in eff_list:
            key = json.dumps({k: v for k, v in it.items() if k != "v"}, sort_keys=True)
            if key in merged:
                merged[key]["v"] += it["v"]
            else:
                merged[key] = dict(it)
        board[cid] = list(merged.values())
        board_cost[cid] = cost
    limits = {tail(x["data"]["skillTreeEffectType"], "_EFFECT_TYPE_").lower(): int(x["data"]["limit"])
              for x in load(E, "SkillTreeEffectValueLimit.json")}

    groups = by_id(E, "CharacterGrouping.json")
    out = {
        "sim": sim,
        "upgrade": upgrade,
        "upgradeCap": 5000,
        "songs": songs,
        "notes": notes,
        "combos": combos,
        "posters": posters,
        "posterCount": poster_count,
        "scoreRanks": {k: sorted(v) for k, v in score_ranks.items()},
        "powerRanks": power_ranks,
        "rankPoints": rank_points,
        "board": board,
        "boardCost": board_cost,
        "boardLimits": limits,
        "groupMembers": {gid: g.get("characterIds", []) for gid, g in groups.items()},
    }
    with open(args.out, "w", encoding="utf-8") as f:
        f.write("// Generated by scripts/build_game.py - do not edit by hand.\n")
        f.write("window.HOLO_GAME = ")
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"wrote {len(sim)} card skill sets, {len(songs)} songs -> {args.out}")


if __name__ == "__main__":
    main()
