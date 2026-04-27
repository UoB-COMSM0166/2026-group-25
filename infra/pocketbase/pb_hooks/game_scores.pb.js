/// <reference path="../pb_data/types.d.ts" />

// PB v0.22+ goja runs each onXxx callback in its own eval scope, so
// helpers MUST be inlined inside the callback (top-level functions are
// invisible there).
//
// Two layers of validation:
//   1. Range check on score / wave runs UNCONDITIONALLY on every write,
//      so a malicious client can't post wave=1e20 even without the
//      X-Game-Token header (real example: the '元神' row pre-rangefix).
//   2. Optional HMAC check: if X-Game-Token is present, validate strictly;
//      if missing, the write is allowed through (front-end currently does
//      not sign — keeps door open for adding signing later without a
//      breaking server change).

onRecordCreateRequest((e) => {
    const LB_SECRET = "badger_bridge_assault_score_v2x7";
    const MAX_SCORE_PER_WAVE = 3000;

    const score = Math.floor(Number(e.record.get("score")) || 0);
    const wave  = Math.floor(Number(e.record.get("wave"))  || 0);

    // (1) unconditional bounds — catches malformed / fabricated data
    if (wave < 0 || wave > 1999) throw new BadRequestError("Invalid wave");
    const actualWave = wave >= 1000 ? wave - 1000 : wave;
    if (actualWave < 0 || actualWave > 999) throw new BadRequestError("Invalid wave");
    if (score < 0) throw new BadRequestError("Invalid score");
    const maxScore = Math.max(actualWave, 1) * MAX_SCORE_PER_WAVE;
    if (score > maxScore) throw new BadRequestError("Score out of range");

    // (2) optional HMAC token — strict if present, ignored if absent
    let token = null;
    try {
        if (e && e.request && e.request.header && typeof e.request.header.get === "function") {
            token = e.request.header.get("X-Game-Token") || null;
        }
    } catch (_) {}
    if (!token) {
        try {
            const info = (e && typeof e.requestInfo === "function") ? e.requestInfo() : (e && e.requestInfo);
            if (info && info.headers) {
                token = info.headers["x-game-token"] || info.headers["X-Game-Token"] || null;
            }
        } catch (_) {}
    }
    if (token) {
        const expected = $security.hs256(score + "|" + wave, LB_SECRET).substring(0, 32);
        if (token !== expected) throw new BadRequestError("Invalid token");
    }
    e.next();
}, "game_scores");

onRecordUpdateRequest((e) => {
    const LB_SECRET = "badger_bridge_assault_score_v2x7";
    const MAX_SCORE_PER_WAVE = 3000;

    const score = Math.floor(Number(e.record.get("score")) || 0);
    const wave  = Math.floor(Number(e.record.get("wave"))  || 0);

    if (wave < 0 || wave > 1999) throw new BadRequestError("Invalid wave");
    const actualWave = wave >= 1000 ? wave - 1000 : wave;
    if (actualWave < 0 || actualWave > 999) throw new BadRequestError("Invalid wave");
    if (score < 0) throw new BadRequestError("Invalid score");
    const maxScore = Math.max(actualWave, 1) * MAX_SCORE_PER_WAVE;
    if (score > maxScore) throw new BadRequestError("Score out of range");

    let token = null;
    try {
        if (e && e.request && e.request.header && typeof e.request.header.get === "function") {
            token = e.request.header.get("X-Game-Token") || null;
        }
    } catch (_) {}
    if (!token) {
        try {
            const info = (e && typeof e.requestInfo === "function") ? e.requestInfo() : (e && e.requestInfo);
            if (info && info.headers) {
                token = info.headers["x-game-token"] || info.headers["X-Game-Token"] || null;
            }
        } catch (_) {}
    }
    if (token) {
        const expected = $security.hs256(score + "|" + wave, LB_SECRET).substring(0, 32);
        if (token !== expected) throw new BadRequestError("Invalid token");
    }
    e.next();
}, "game_scores");

// ── Forbidden word censorship on record enrich ───────────────
// Applied when records are returned to clients (list/view), so even if
// somebody sneaks past the create hook, the rendered name is masked.

onRecordEnrich((e) => {
    const FORBIDDEN = ["傻逼","sb","垃圾","废物","狗","操","fuck","他妈","特么","草泥马","屌","婊","cao","shit","asshole","nmsl","cnm","tmd","md","wqnmlgb"];
    let name = String(e.record.get("player_name") || "");
    if (!name) { e.next(); return; }
    let lower = name.toLowerCase();
    for (let i = 0; i < FORBIDDEN.length; i++) {
        const w = FORBIDDEN[i];
        let idx;
        while ((idx = lower.indexOf(w)) !== -1) {
            name = name.substring(0, idx) + "**" + name.substring(idx + w.length);
            lower = name.toLowerCase();
        }
    }
    e.record.set("player_name", name);
    e.next();
}, "game_scores");

// ── Custom REST API: GET /api/fw ──────────────────────────────
// Returns the forbidden words list so the front-end can mirror the
// server-side mask. Curl: curl https://www.lzqqq.org/pb/api/fw

routerAdd("GET", "/api/fw", (e) => {
    const FORBIDDEN = ["傻逼","sb","垃圾","废物","狗","操","fuck","他妈","特么","草泥马","屌","婊","cao","shit","asshole","nmsl","cnm","tmd","md","wqnmlgb"];
    // We hand-marshal with JSON.stringify so the key order (count, then
    // words) is preserved and the body is indented. Go's encoding/json
    // would otherwise sort map keys alphabetically and produce one line.
    const body = {
        count: FORBIDDEN.length,
        words: FORBIDDEN,
    };
    const h = e.response.header();
    h.set("Content-Type", "application/json; charset=utf-8");
    h.set("Access-Control-Allow-Origin", "*");
    h.set("Cache-Control", "public, max-age=300");
    return e.string(200, JSON.stringify(body, null, 2));
});

// ── Custom REST API: GET /api/leaderboard ────────────────────
// Top visible players with rank + overall stats.
//   ?limit=N (default 10, max 100)
// Curl: curl 'https://www.lzqqq.org/pb/api/leaderboard?limit=20'

routerAdd("GET", "/api/leaderboard", (e) => {
    const FORBIDDEN = ["傻逼","sb","垃圾","废物","狗","操","fuck","他妈","特么","草泥马","屌","婊","cao","shit","asshole","nmsl","cnm","tmd","md","wqnmlgb"];
    e.response.header().set("Access-Control-Allow-Origin", "*");
    e.response.header().set("Cache-Control", "public, max-age=10");

    let limit = 10;
    try {
        const info = e.requestInfo();
        const q = (info && info.query) || {};
        const n = parseInt(q.limit, 10);
        if (!isNaN(n) && n > 0) limit = Math.min(n, 100);
    } catch (_) {}

    // PB v0.23+ exposes find/count on $app directly; v0.22 keeps them on
    // $app.dao(). Probe both so the same hook works either way.
    const dao =
        (typeof $app.findRecordsByFilter === "function") ? $app :
        (typeof $app.dao === "function") ? $app.dao() : null;
    if (!dao || typeof dao.findRecordsByFilter !== "function") {
        return e.json(500, {
            error: "no findRecordsByFilter available",
            has_dao: typeof $app.dao,
            has_find: typeof $app.findRecordsByFilter,
        });
    }

    const debug = {};
    let records = [];
    try {
        // Tiebreak by +id: PB ids are ULIDs (monotonic), so smaller id =
        // earlier submission. The collection has no `created` field.
        records = dao.findRecordsByFilter(
            "game_scores",
            "hidden = false",
            "-score,+id",
            limit,
            0
        ) || [];
    } catch (err) {
        debug.find_visible_err = String(err);
    }

    // Best-effort stats. countRecords is v0.23+ only; on older PB we
    // fall back to a coarse "find all then length" count.
    let totalAll = 0, visibleAll = 0;
    if (typeof dao.countRecords === "function") {
        try { totalAll = dao.countRecords("game_scores"); }
        catch (err) { debug.count_total_err = String(err); }
        try { visibleAll = dao.countRecords("game_scores", $dbx.exp("hidden = false")); }
        catch (err) { debug.count_visible_err = String(err); }
    } else {
        try {
            const all = dao.findRecordsByFilter("game_scores", "", "", 5000, 0) || [];
            totalAll = all.length;
            visibleAll = 0;
            for (let i = 0; i < all.length; i++) {
                if (!all[i].get("hidden")) visibleAll++;
            }
        } catch (err) { debug.count_fallback_err = String(err); }
    }

    const items = [];
    for (let i = 0; i < records.length; i++) {
        const r = records[i];
        let name = String(r.get("player_name") || "");
        let lower = name.toLowerCase();
        for (let k = 0; k < FORBIDDEN.length; k++) {
            const w = FORBIDDEN[k];
            let idx;
            while ((idx = lower.indexOf(w)) !== -1) {
                name = name.substring(0, idx) + "**" + name.substring(idx + w.length);
                lower = name.toLowerCase();
            }
        }
        items.push({
            rank: i + 1,
            player_name: name,
            score: r.get("score"),
            wave: r.get("wave"),
            level: r.get("level") || 1,
        });
    }

    const body = {
        stats: {
            total:   totalAll,
            visible: visibleAll,
            hidden:  Math.max(0, totalAll - visibleAll),
        },
        top: items,
    };
    // Surface debug only if something actually failed, so happy-path
    // responses stay clean.
    let hasDebug = false;
    for (const k in debug) { hasDebug = true; break; }
    if (hasDebug) body.debug = debug;

    // Hand-marshal so insertion order is preserved (stats first, then
    // top) and the body is indented. e.json would alphabetize keys.
    const h = e.response.header();
    h.set("Content-Type", "application/json; charset=utf-8");
    return e.string(200, JSON.stringify(body, null, 2));
});
