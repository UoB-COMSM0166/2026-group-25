// ============================================================
// LEADERBOARD — PocketBase integration
// Player joins once (sets a name), best score auto-syncs.
// Players can hide/show their own entry anytime.
// ============================================================

const LEADERBOARD_BASE = 'https://www.lzqqq.org/pb';
const SCORES_COLLECTION = 'game_scores';
const LB_STORAGE_KEY = 'bridgeAssault_lb'; // { name, recordId, hidden }

function _lbEscape(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── localStorage ──────────────────────────────────────────────
function getLbPlayer() {
    try { const r = localStorage.getItem(LB_STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function _saveLbPlayer(name, recordId, hidden) {
    localStorage.setItem(LB_STORAGE_KEY, JSON.stringify({ name, recordId, hidden: !!hidden }));
}

// ── API ───────────────────────────────────────────────────────
async function _createRecord(name, score, wave, level) {
    const resp = await fetch(`${LEADERBOARD_BASE}/api/collections/${SCORES_COLLECTION}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name: name.trim().slice(0, 16), score: Math.floor(score), wave: Math.floor(wave), level: Math.floor(level || 1), hidden: false }),
    });
    if (!resp.ok) throw new Error('创建失败');
    return await resp.json();
}

async function _patchRecord(recordId, data) {
    const resp = await fetch(`${LEADERBOARD_BASE}/api/collections/${SCORES_COLLECTION}/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.message || '更新失败'); }
    return await resp.json();
}

async function fetchLeaderboard(limit = 5) {
    const resp = await fetch(`${LEADERBOARD_BASE}/api/collections/${SCORES_COLLECTION}/records?sort=-score&perPage=${limit}&filter=hidden%3Dfalse`);
    if (!resp.ok) throw new Error('加载失败');
    return await resp.json();
}

// Count non-hidden players with score strictly higher than myScore → rank = count + 1
async function _fetchMyRank(myScore) {
    const filter = encodeURIComponent(`hidden=false&&score>${Math.floor(myScore)}`);
    const resp = await fetch(`${LEADERBOARD_BASE}/api/collections/${SCORES_COLLECTION}/records?perPage=1&filter=${filter}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data.totalItems || 0) + 1;
}

// ── Sync high score (fire-and-forget after game over) ─────────
async function syncHighScore() {
    const player = getLbPlayer();
    if (!player || player.hidden) return; // skip if player hid themselves
    const hs = getHighScore();
    if (hs.score <= 0) return;
    const lv = playerData ? Math.floor(playerData.level || 1) : 1;
    try {
        await _patchRecord(player.recordId, { score: Math.floor(hs.score), wave: Math.floor(hs.wave), level: lv });
    } catch {
        // Record may have been deleted — recreate
        try {
            const rec = await _createRecord(player.name, hs.score, hs.wave, lv);
            _saveLbPlayer(player.name, rec.id, false);
        } catch {}
    }
}

// ── Toggle visibility ─────────────────────────────────────────
async function toggleLbVisibility() {
    const player = getLbPlayer();
    if (!player) return;
    const newHidden = !player.hidden;
    const btn = document.getElementById('lbToggleBtn');
    if (btn) { btn.disabled = true; btn.textContent = T('lb.processing'); }
    try {
        await _patchRecord(player.recordId, { hidden: newHidden });
        _saveLbPlayer(player.name, player.recordId, newHidden);
        // 只更新按钮文字，不重建面板（避免抖动）
        if (btn) { btn.disabled = false; btn.textContent = newHidden ? T('lb.toggle.show') : T('lb.toggle.hide'); }
        // 只更新底部行的排名列
        const myRow = document.querySelector('#leaderboardList .lb-mine');
        if (myRow) {
            const rankSpan = myRow.querySelector('.lb-rank');
            if (newHidden) {
                if (rankSpan) { rankSpan.textContent = '--'; rankSpan.style.color = '#888'; }
            } else {
                const hs = getHighScore();
                if (hs.score > 0 && rankSpan) {
                    const myRank = await _fetchMyRank(hs.score);
                    if (myRank !== null) {
                        const medal = myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : `${myRank}`;
                        rankSpan.textContent = medal; rankSpan.style.color = '';
                    }
                }
            }
        }
    } catch {
        if (btn) { btn.disabled = false; btn.textContent = newHidden ? T('lb.toggle.hide') : T('lb.toggle.show'); }
    }
}

// ── Overlay control ───────────────────────────────────────────
function showLeaderboard() {
    const el = document.getElementById('leaderboardOverlay');
    if (!el) return;
    el.classList.remove('hidden');
    const player = getLbPlayer();
    if (player) {
        if (!player.hidden) syncHighScore(); // sync before showing
        _renderList(player.name);
    } else {
        _renderJoinForm();
    }
}

function hideLeaderboard() {
    const el = document.getElementById('leaderboardOverlay');
    if (el) el.classList.add('hidden');
}

// ── Render: join form ─────────────────────────────────────────
function _renderJoinForm() {
    const panel = document.getElementById('leaderboardPanel');
    if (!panel) return;
    panel.innerHTML = `
        <div id="leaderboardTitle">${T('lb.title')}</div>
        <div class="lb-join-desc">${T('lb.join.desc')}</div>
        <div class="lb-join-row">
            <input type="text" id="lbJoinInput" class="lb-join-input"
                placeholder="${T('lb.join.placeholder')}" maxlength="16" autocomplete="off"
                onkeydown="if(event.key==='Enter') _handleJoin()">
        </div>
        <div id="lbJoinStatus" class="lb-join-status"></div>
        <div class="lb-join-btns">
            <button class="btn lb-btn-join" id="lbJoinBtn" onclick="_handleJoin()">${T('lb.join.btn')}</button>
            <button class="btn lb-btn-skip" onclick="hideLeaderboard()">${T('lb.cancel')}</button>
        </div>
    `;
    setTimeout(() => { const i = document.getElementById('lbJoinInput'); if (i) i.focus(); }, 60);
}

async function _handleJoin() {
    const input = document.getElementById('lbJoinInput');
    const statusEl = document.getElementById('lbJoinStatus');
    const btn = document.getElementById('lbJoinBtn');
    if (!input) return;
    const name = input.value.trim();
    if (!name) { statusEl.textContent = T('lb.join.empty'); return; }
    btn.disabled = true;
    btn.textContent = T('lb.join.loading');
    statusEl.textContent = '';
    try {
        const hs = getHighScore();
        const lv = playerData ? Math.floor(playerData.level || 1) : 1;
        const rec = await _createRecord(name, hs.score, hs.wave, lv);
        _saveLbPlayer(name, rec.id, false);
        _renderList(name);
    } catch {
        statusEl.textContent = T('lb.join.fail');
        btn.disabled = false;
        btn.textContent = T('lb.join.btn');
    }
}

// ── Render: leaderboard list ──────────────────────────────────
function _renderListShell(player) {
    const panel = document.getElementById('leaderboardPanel');
    if (!panel) return;
    const isHidden = player && player.hidden;
    const toggleLabel = isHidden ? T('lb.toggle.show') : T('lb.toggle.hide');
    panel.innerHTML = `
        <div id="leaderboardTitle">${T('lb.title')}</div>
        <div class="lb-header">
            <span></span><span>${T('lb.col.player')}</span>
            <span style="text-align:right">${T('lb.col.level')}</span>
            <span style="text-align:right;padding-right:4px">${T('lb.col.score')}</span>
            <span style="text-align:right">${T('lb.col.wave')}</span>
        </div>
        <div id="leaderboardList"><div class="lb-status">${T('lb.loading')}</div></div>
        <div class="lb-footer">
            ${player ? `<button class="btn lb-btn-toggle" id="lbToggleBtn" onclick="toggleLbVisibility()">${toggleLabel}</button>` : ''}
            <button class="btn lb-btn-close" onclick="hideLeaderboard()">${T('lb.close')}</button>
        </div>
    `;
}

async function _renderList(myName) {
    const player = getLbPlayer();
    _renderListShell(player);
    const listEl = document.getElementById('leaderboardList');
    if (!listEl) return;
    try {
        const data = await fetchLeaderboard(5);
        const items = data.items || [];
        if (items.length === 0) {
            listEl.innerHTML = `<div class="lb-status">${T('lb.empty')}</div>`;
            return;
        }

        let html = items.map((item, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
            const isMe = myName && item.player_name === myName;
            const lv = item.level || 1;
            return `<div class="lb-row${i < 3 ? ' lb-top3' : ''}${isMe ? ' lb-mine' : ''}">
                <span class="lb-rank">${medal}</span>
                <span class="lb-name">${_lbEscape(item.player_name)}</span>
                <span class="lb-level">Lv.${lv}</span>
                <span class="lb-score">${item.score.toLocaleString()}</span>
                <span class="lb-wave">W${item.wave}</span>
            </div>`;
        }).join('');

        // Always show player's own row at the bottom (hidden → show dashes)
        if (myName && player) {
            html += `<div class="lb-my-rank-sep"></div>`;
            if (player.hidden) {
                const lv = playerData ? Math.floor(playerData.level || 1) : 1;
                const hs = getHighScore();
                html += `<div class="lb-row lb-mine">
                    <span class="lb-rank" style="color:#888">--</span>
                    <span class="lb-name">${_lbEscape(myName)}</span>
                    <span class="lb-level">Lv.${lv}</span>
                    <span class="lb-score">${hs.score > 0 ? hs.score.toLocaleString() : '--'}</span>
                    <span class="lb-wave">${hs.wave > 0 ? 'W'+hs.wave : '--'}</span>
                </div>`;
            } else {
                const hs = getHighScore();
                if (hs.score > 0) {
                    const myRank = await _fetchMyRank(hs.score);
                    const lv = playerData ? Math.floor(playerData.level || 1) : 1;
                    if (myRank !== null) {
                        const myMedal = myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : `${myRank}`;
                        html += `<div class="lb-row lb-mine">
                            <span class="lb-rank">${myMedal}</span>
                            <span class="lb-name">${_lbEscape(myName)}</span>
                            <span class="lb-level">Lv.${lv}</span>
                            <span class="lb-score">${hs.score.toLocaleString()}</span>
                            <span class="lb-wave">W${hs.wave}</span>
                        </div>`;
                    }
                }
            }
        }

        listEl.innerHTML = html;
    } catch {
        listEl.innerHTML = `<div class="lb-status lb-error">${T('lb.error')}</div>`;
    }
}
