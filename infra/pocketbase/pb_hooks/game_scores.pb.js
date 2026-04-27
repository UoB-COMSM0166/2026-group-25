/// <reference path="../pb_data/types.d.ts" />

// PB v0.22+ goja runs each onXxx callback in its own eval scope, so
// helpers MUST be inlined inside the callback (top-level functions are
// invisible there). Token is treated as optional: if X-Game-Token header
// is present, validated strictly; if missing, the write is allowed
// through. Once the front-end ships matching client-side HMAC signing
// the same callback enforces it without further server changes.

onRecordCreateRequest((e) => {
    const LB_SECRET = "badger_bridge_assault_score_v2x7";
    const MAX_SCORE_PER_WAVE = 3000;

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
        const score = Math.floor(Number(e.record.get("score")) || 0);
        const wave  = Math.floor(Number(e.record.get("wave"))  || 0);
        if (wave < 0 || wave > 1999) throw new BadRequestError("Invalid wave");
        const actualWave = wave >= 1000 ? wave - 1000 : wave;
        if (actualWave < 0 || actualWave > 999) throw new BadRequestError("Invalid wave");
        if (score < 0) throw new BadRequestError("Invalid score");
        const maxScore = Math.max(actualWave, 1) * MAX_SCORE_PER_WAVE;
        if (score > maxScore) throw new BadRequestError("Score out of range");
        const expected = $security.hs256(score + "|" + wave, LB_SECRET).substring(0, 32);
        if (token !== expected) throw new BadRequestError("Invalid token");
    }
    e.next();
}, "game_scores");

onRecordUpdateRequest((e) => {
    const LB_SECRET = "badger_bridge_assault_score_v2x7";
    const MAX_SCORE_PER_WAVE = 3000;

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
        const score = Math.floor(Number(e.record.get("score")) || 0);
        const wave  = Math.floor(Number(e.record.get("wave"))  || 0);
        if (wave < 0 || wave > 1999) throw new BadRequestError("Invalid wave");
        const actualWave = wave >= 1000 ? wave - 1000 : wave;
        if (actualWave < 0 || actualWave > 999) throw new BadRequestError("Invalid wave");
        if (score < 0) throw new BadRequestError("Invalid score");
        const maxScore = Math.max(actualWave, 1) * MAX_SCORE_PER_WAVE;
        if (score > maxScore) throw new BadRequestError("Score out of range");
        const expected = $security.hs256(score + "|" + wave, LB_SECRET).substring(0, 32);
        if (token !== expected) throw new BadRequestError("Invalid token");
    }
    e.next();
}, "game_scores");
