// ============================================================
// DRAW HELPERS
// ============================================================

// Fill using hex integer (0xRRGGBB), a = 0-255
function hexFill(hex, a) {
    const r = (hex >> 16) & 0xFF, g = (hex >> 8) & 0xFF, b = hex & 0xFF;
    if (a !== undefined) fill(r, g, b, a); else fill(r, g, b);
}

// Stroke using hex integer, a = 0-255
function hexStroke(hex, a) {
    const r = (hex >> 16) & 0xFF, g = (hex >> 8) & 0xFF, b = hex & 0xFF;
    if (a !== undefined) stroke(r, g, b, a); else stroke(r, g, b);
}

// Rectangle shorthand: no stroke, hex fill
function px(sx, sy, w, h, color, a) {
    if (a !== undefined) hexFill(color, a); else hexFill(color);
    noStroke();
    rect(sx, sy, w, h);
}

// Draw a sprite frame centered at (cx, cy)
// frame: { img, sx, sy, sw, sh }; tintHex optional
function drawSpriteFrame(frame, cx, cy, dw, dh, tintHex) {
    if (!frame || !frame.img) return;
    push();
    imageMode(CENTER);
    if (tintHex !== undefined && tintHex !== null && tintHex !== 0xffffff) {
        const r = (tintHex >> 16) & 0xFF, g = (tintHex >> 8) & 0xFF, b = tintHex & 0xFF;
        tint(r, g, b);
    }
    image(frame.img, cx, cy, dw, dh, frame.sx, frame.sy, frame.sw, frame.sh);
    noTint();
    pop();
}

// Draw polygon from flat [x1,y1,...] array with hex fill
function hexPolyFill(pts, hex, a) {
    if (a !== undefined) hexFill(hex, a); else hexFill(hex);
    noStroke();
    beginShape();
    for (let i = 0; i < pts.length; i += 2) vertex(pts[i], pts[i + 1]);
    endShape(CLOSE);
}

// Draw polygon from flat array with hex stroke only
function hexPolyStroke(pts, hex, a, sw) {
    hexStroke(hex, a !== undefined ? a : 255);
    strokeWeight(sw || 1);
    noFill();
    beginShape();
    for (let i = 0; i < pts.length; i += 2) vertex(pts[i], pts[i + 1]);
    endShape(CLOSE);
}

// ============================================================
// SKY
// g: optional p5.Graphics; null/undefined = draw to main canvas
// ============================================================
function _lerpHex(a, b, t) {
    const ar = (a >> 16) & 0xFF, ag = (a >> 8) & 0xFF, ab = a & 0xFF;
    const br = (b >> 16) & 0xFF, bg = (b >> 8) & 0xFF, bb = b & 0xFF;
    return (Math.round(ar + (br - ar) * t) << 16)
         | (Math.round(ag + (bg - ag) * t) << 8)
         |  Math.round(ab + (bb - ab) * t);
}

function _multiGrad(gfx, colors, y0, y1, w) {
    const steps = 40;
    const ns = gfx ? (x => gfx.noStroke()) : (() => noStroke());
    const sf = (hex) => {
        const r = (hex >> 16) & 0xFF, gv = (hex >> 8) & 0xFF, b = hex & 0xFF;
        gfx ? gfx.fill(r, gv, b) : fill(r, gv, b);
    };
    const dr = (x, y, ww, h) => gfx ? gfx.rect(x, y, ww, h) : rect(x, y, ww, h);
    ns();
    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const ci = t * (colors.length - 1);
        const idx = Math.min(Math.floor(ci), colors.length - 2);
        sf(_lerpHex(colors[idx], colors[idx + 1], ci - idx));
        dr(0, y0 + (i / steps) * (y1 - y0), w, (y1 - y0) / steps + 1);
    }
}

function drawSky(g) {
    const hY = screenH * getHorizonRatio();
    const isL2 = game && game.currentLevel === 2;

    const sf = (hex, a) => {
        const r = (hex >> 16) & 0xFF, gv = (hex >> 8) & 0xFF, b = hex & 0xFF;
        if (g) { if (a !== undefined) g.fill(r, gv, b, a); else g.fill(r, gv, b); }
        else   { if (a !== undefined) fill(r, gv, b, a);   else fill(r, gv, b); }
    };
    const ss = (hex, a) => {
        const r = (hex >> 16) & 0xFF, gv = (hex >> 8) & 0xFF, b = hex & 0xFF;
        if (g) g.stroke(r, gv, b, a !== undefined ? a : 255);
        else   stroke(r, gv, b, a !== undefined ? a : 255);
    };
    const dr = (x, y, w, h, rd) => {
        if (rd) { g ? g.rect(x, y, w, h, rd) : rect(x, y, w, h, rd); }
        else    { g ? g.rect(x, y, w, h)      : rect(x, y, w, h); }
    };
    const dc = (x, y, d) => g ? g.circle(x, y, d) : circle(x, y, d);
    const ns = () => { g ? g.noStroke() : noStroke(); };
    const nf = () => { g ? g.noFill()   : noFill();   };
    const sw = (w) => { g ? g.strokeWeight(w) : strokeWeight(w); };

    ns();

    if (isL2) {
        // --- LEVEL 2: Volcanic hellscape ---
        _multiGrad(g, [0x050204, 0x0e0408, 0x220a0c, 0x3a1008, 0x5a1e0a, 0x882e0c, 0xbb4c12, 0xdd6a18], 0, hY + 10, screenW);

        // Distant mountains silhouette
        ns();
        sf(0x120608);
        const mSeed = [0, 0.06, 0.13, 0.22, 0.30, 0.40, 0.48, 0.56, 0.65, 0.73, 0.82, 0.90, 1.0];
        const mH    = [0.12, 0.28, 0.45, 0.22, 0.55, 0.38, 0.60, 0.42, 0.50, 0.25, 0.40, 0.18, 0.10];
        if (g) g.beginShape(); else beginShape();
        if (g) g.vertex(0, hY); else vertex(0, hY);
        for (let i = 0; i < mSeed.length; i++) {
            const mx = mSeed[i] * screenW;
            const my = hY - mH[i] * hY * 0.35;
            if (g) g.vertex(mx, my); else vertex(mx, my);
        }
        if (g) g.vertex(screenW, hY); else vertex(screenW, hY);
        if (g) g.endShape(CLOSE); else endShape(CLOSE);

        // Closer ridge with subtle red tint
        sf(0x1a0a06);
        if (g) g.beginShape(); else beginShape();
        if (g) g.vertex(0, hY); else vertex(0, hY);
        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            const bh = (12 + Math.sin(t * 11.3) * 18 + Math.sin(t * 5.7) * 12 + Math.sin(t * 23) * 4);
            if (g) g.vertex(t * screenW, hY - bh); else vertex(t * screenW, hY - bh);
        }
        if (g) g.vertex(screenW, hY); else vertex(screenW, hY);
        if (g) g.endShape(CLOSE); else endShape(CLOSE);

        // Lava glow at horizon
        sf(0xff4400, 40); dr(0, hY - 8, screenW, 16);
        sf(0xff6600, 25); dr(0, hY - 4, screenW, 10);
        sf(0xffaa22, 18); dr(0, hY - 2, screenW, 6);

    } else {
        // --- LEVEL 1: Twilight cityscape ---
        _multiGrad(g, [0x0a0e1e, 0x141e38, 0x1e3050, 0x2a4a6e, 0x3e6a90, 0x5588aa, 0x72a4c0, 0x99c4dd, 0xc0daea], 0, hY + 10, screenW);

        // Stars in upper sky
        ns();
        const starSeed = 91;
        for (let i = 0; i < 60; i++) {
            const sx = ((i * 137 + starSeed) % 1000) / 1000 * screenW;
            const sy = ((i * 251 + starSeed * 3) % 1000) / 1000 * hY * 0.55;
            const sa = 0.3 + ((i * 73) % 100) / 100 * 0.5;
            const sr = 1 + ((i * 31) % 3) * 0.4;
            sf(0xffffff, Math.floor(sa * 255));
            dc(sx, sy, sr);
        }

        // Moon
        ns();
        const moonX = screenW * 0.82, moonY = hY * 0.18, moonR = Math.min(28, screenW * 0.035);
        sf(0xffffff, 12); dc(moonX, moonY, moonR * 5);
        sf(0xddeeff, 20); dc(moonX, moonY, moonR * 3);
        sf(0xeef4ff); dc(moonX, moonY, moonR * 2);
        sf(0xd0d8e4); dc(moonX - moonR * 0.25, moonY - moonR * 0.15, moonR * 1.5);

        // Distant buildings layer (darker, further)
        ns();
        const bldgData1 = [
            [0.00, 0.08], [0.04, 0.14], [0.08, 0.20], [0.12, 0.10], [0.16, 0.25],
            [0.20, 0.16], [0.24, 0.30], [0.28, 0.12], [0.33, 0.22], [0.38, 0.35],
            [0.42, 0.18], [0.46, 0.26], [0.50, 0.15], [0.54, 0.32], [0.58, 0.20],
            [0.62, 0.28], [0.66, 0.12], [0.70, 0.24], [0.74, 0.38], [0.78, 0.16],
            [0.82, 0.22], [0.86, 0.30], [0.90, 0.14], [0.94, 0.20], [0.98, 0.10],
        ];
        sf(0x2a3848);
        for (const [bx, bh] of bldgData1) {
            const x = bx * screenW, w = screenW / 25 - 1;
            const h = bh * hY * 0.45;
            dr(x, hY - h, w, h);
        }

        // Front building layer with window lights
        const bldgData2 = [
            [0.00, 0.06, 0.05], [0.05, 0.18, 0.06], [0.11, 0.10, 0.04], [0.15, 0.24, 0.05],
            [0.20, 0.14, 0.06], [0.26, 0.28, 0.04], [0.30, 0.08, 0.05], [0.35, 0.22, 0.06],
            [0.41, 0.32, 0.05], [0.46, 0.12, 0.04], [0.50, 0.20, 0.06], [0.56, 0.16, 0.05],
            [0.61, 0.26, 0.05], [0.66, 0.10, 0.04], [0.70, 0.30, 0.06], [0.76, 0.18, 0.05],
            [0.81, 0.24, 0.04], [0.85, 0.12, 0.06], [0.91, 0.20, 0.05], [0.96, 0.08, 0.04],
        ];
        for (let bi = 0; bi < bldgData2.length; bi++) {
            const [bx, bh, bw] = bldgData2[bi];
            const x = bx * screenW, w = bw * screenW, h = bh * hY * 0.5;
            sf(0x1e2a3a); dr(x, hY - h, w, h);
            // Rooftop accent
            sf(0x3a5068); dr(x + 1, hY - h, w - 2, 2);
            // Window grid
            const cols = Math.max(1, Math.floor(w / 6));
            const rows = Math.max(1, Math.floor(h / 8));
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const lit = ((bi * 7 + r * 13 + c * 31) % 10) < 4;
                    if (!lit) continue;
                    const wx = x + 2 + c * (w - 4) / cols;
                    const wy = hY - h + 4 + r * (h - 6) / rows;
                    const warm = ((bi + r + c) % 3 === 0) ? 0xffdd88 : 0xffcc66;
                    sf(warm, Math.floor((0.35 + ((bi * r + c) % 5) * 0.06) * 255));
                    dr(wx, wy, 2, 2);
                }
            }
        }

        // Horizon glow
        sf(0x8ab0cc, 30); dr(0, hY - 6, screenW, 14);
        sf(0xaaccdd, 20); dr(0, hY - 3, screenW, 8);
    }
}

// ============================================================
// CLOUDS
// ============================================================
function drawClouds() {
    if (!game) return;
    const isL2 = game.currentLevel === 2;
    const hY = screenH * getHorizonRatio();

    game.clouds.forEach(cloud => {
        const cx = cloud.x * screenW, cy = cloud.y * screenH;
        cloud.blocks.forEach(b => {
            const bx = cx + b.dx * cloud.width, by = cy + b.dy * cloud.height;
            const bw = b.w * cloud.width * 0.5, bh = b.h * cloud.height * 0.5;
            noStroke();
            if (isL2) {
                // Smoky dark clouds with ember underglow
                hexFill(0x0e0604, Math.floor(cloud.opacity * 0.6 * 255));
                rect(bx - bw / 2, by - bh / 2, bw, bh, bw * 0.3);
                if (by > hY * 0.35) {
                    hexFill(0x441508, Math.floor(cloud.opacity * 0.2 * 255));
                    rect(bx - bw * 0.4, by, bw * 0.8, bh * 0.3, bw * 0.2);
                }
            } else {
                // Soft rounded clouds with subtle shadow
                hexFill(0xc8ddef, Math.floor(cloud.opacity * 0.3 * 255));
                rect(bx - bw / 2, by + bh * 0.1, bw, bh * 0.4, bw * 0.3);
                hexFill(0xddeeff, Math.floor(cloud.opacity * 255));
                rect(bx - bw / 2, by - bh / 2, bw, bh, bw * 0.35);
            }
        });
    });

    if (isL2) {
        const t = Date.now() * 0.0015;
        const pulse = Math.sin(t) * 0.5 + 0.5;
        noStroke();
        hexFill(0xff3300, Math.floor((0.06 + pulse * 0.04) * 255));
        rect(0, hY - 6, screenW, 14);
        hexFill(0xff6600, Math.floor((0.08 + pulse * 0.05) * 255));
        rect(0, hY - 3, screenW, 8);
        // Rising embers
        for (let i = 0; i < 20; i++) {
            const ex = ((Math.sin(t * 0.9 + i * 1.73) * 0.4 + 0.5 + (i * 0.07) % 0.5) % 1.0) * screenW;
            const rise = (t * (0.18 + (i % 5) * 0.045)) % 1.6;
            const ey = hY - rise * hY * 0.6;
            if (ey < 0) continue;
            const alpha = Math.max(0, 0.55 - rise * 0.5);
            if (alpha < 0.04) continue;
            const r = 1.0 + Math.sin(i * 2.1) * 0.7;
            const eColor = i % 4 === 0 ? 0xffaa44 : i % 3 === 0 ? 0xff6600 : 0xff3300;
            hexFill(eColor, Math.floor(alpha * 255));
            circle(ex, ey, r * 2);
        }
    }
}

// ============================================================
// BRIDGE
// ============================================================
function drawBridge() {
    const g = game;
    const isL2 = g.currentLevel === 2;
    const numSegments = 60, segmentDepth = 15;

    for (let i = numSegments - 1; i >= 0; i--) {
        const z1 = i * segmentDepth, z2 = (i + 1) * segmentDepth;
        const p1L = project(-CONFIG.ROAD_HALF_WIDTH, z1);
        const p1R = project(CONFIG.ROAD_HALF_WIDTH, z1);
        const p2L = project(-CONFIG.ROAD_HALF_WIDTH, z2);
        const p2R = project(CONFIG.ROAD_HALF_WIDTH, z2);
        const worldZ = z1 + g.cameraZ;

        if (isL2) {
            const shade = Math.floor(42 + (i / numSegments) * 16);
            const color = ((shade + 10) << 16) | (shade << 8) | Math.max(0, shade - 8);
            hexPolyFill([p2L.x, p2L.y, p2R.x, p2R.y, p1R.x, p1R.y, p1L.x, p1L.y], color);
            if (Math.floor(worldZ / 12) % 3 === 0)
                hexPolyFill([p2L.x, p2L.y, p2R.x, p2R.y, p1R.x, p1R.y, p1L.x, p1L.y], 0x000000, 51);
            if (Math.floor(worldZ / 30) % 2 === 0) {
                const cT = project(0, z2), cB = project(0, z1);
                const a = Math.max(0, 0.55 - i / numSegments * 0.45);
                hexStroke(0xff5500, Math.floor(a * 255));
                strokeWeight(Math.max(1, 2.5 * p1L.scale));
                line(cB.x, cB.y, cT.x, cT.y);
            }
            const ea = Math.max(0, 0.45 - i / numSegments * 0.38);
            const ew = Math.max(1, 2 * p1L.scale);
            hexStroke(0xcc2200, Math.floor(ea * 255)); strokeWeight(ew); noFill();
            line(p1L.x + 3 * p1L.scale, p1L.y, p2L.x + 3 * p2L.scale, p2L.y);
            line(p1R.x - 3 * p1R.scale, p1R.y, p2R.x - 3 * p2R.scale, p2R.y);
        } else {
            const shade = Math.floor(80 + (i / numSegments) * 30);
            const color = (shade << 16) | ((shade + 5) << 8) | (shade + 2);
            hexPolyFill([p2L.x, p2L.y, p2R.x, p2R.y, p1R.x, p1R.y, p1L.x, p1L.y], color);
            if (Math.floor(worldZ / 30) % 2 === 0) {
                const cT = project(0, z2), cB = project(0, z1);
                const a = Math.max(0, 0.6 - i / numSegments * 0.5);
                hexStroke(0xffffff, Math.floor(a * 255));
                strokeWeight(Math.max(1, 2 * p1L.scale));
                line(cB.x, cB.y, cT.x, cT.y);
            }
            const ea = Math.max(0, 0.4 - i / numSegments * 0.35);
            const ew = Math.max(1, 2 * p1L.scale);
            hexStroke(0xc8b432, Math.floor(ea * 255)); strokeWeight(ew); noFill();
            line(p1L.x + 3 * p1L.scale, p1L.y, p2L.x + 3 * p2L.scale, p2L.y);
            line(p1R.x - 3 * p1R.scale, p1R.y, p2R.x - 3 * p2R.scale, p2R.y);
        }
    }
    drawRailing(-1);
    drawRailing(1);
}

function drawRailing(side) {
    const numPosts = 30, postSpacing = 20;
    const railX = side * (CONFIG.ROAD_HALF_WIDTH + 8);
    const isL2 = game && game.currentLevel === 2;
    const now = Date.now();

    for (let i = 0; i < numPosts; i++) {
        const z = i * postSpacing;
        const p = project(railX, z);
        const postH = 25 * p.scale;
        const postW = Math.max(1, 3 * p.scale);
        if (p.y < screenH * getHorizonRatio()) continue;
        const a = Math.max(0, 1 - i / numPosts);

        if (isL2) {
            hexFill(0x2e1008, Math.floor(a * 255)); noStroke();
            rect(p.x - postW * 0.65, p.y - postH, postW * 1.3, postH);
            if (i % 2 === 0) {
                const flicker = Math.sin(now * 0.004 + i * 0.9) > -0.3;
                if (flicker) {
                    const lr = Math.max(1.5, 2.5 * p.scale);
                    hexFill(0xff1100, Math.floor(a * 0.95 * 255)); noStroke();
                    circle(p.x, p.y - postH - lr, lr * 2);
                    hexFill(0xff2200, Math.floor(a * 0.18 * 255));
                    circle(p.x, p.y - postH - lr, lr * 5);
                }
            }
            if (i < numPosts - 1) {
                const pN = project(railX, (i + 1) * postSpacing);
                hexStroke(0x5a1a08, Math.floor(a * 255)); strokeWeight(Math.max(1.5, 2.5 * p.scale)); noFill();
                line(p.x, p.y - postH, pN.x, pN.y - 25 * pN.scale);
                hexStroke(0x3a1005, Math.floor(a * 255)); strokeWeight(Math.max(1, 2 * p.scale));
                line(p.x, p.y - postH * 0.5, pN.x, pN.y - 25 * pN.scale * 0.5);
            }
        } else {
            hexFill(0x646e78, Math.floor(a * 255)); noStroke();
            rect(p.x - postW / 2, p.y - postH, postW, postH);
            if (i % 5 === 0 && i > 0) {
                hexFill(0xffaa44, Math.floor(a * 0.7 * 255)); noStroke();
                circle(p.x, p.y - postH - 2, Math.max(1, 2 * p.scale) * 2);
            }
            if (i < numPosts - 1) {
                const pN = project(railX, (i + 1) * postSpacing);
                hexStroke(0x8c96a0, Math.floor(a * 255)); strokeWeight(Math.max(1, 2 * p.scale)); noFill();
                line(p.x, p.y - postH, pN.x, pN.y - 25 * pN.scale);
                line(p.x, p.y - postH * 0.5, pN.x, pN.y - 25 * pN.scale * 0.5);
            }
        }
    }
}

function drawRoadDecor() {
    const g = game;
    const isL2 = g.currentLevel === 2;
    g.roadSegments.forEach(d => {
        const relZ = d.z - (g.cameraZ % (200 * 40));
        if (relZ < 0 || relZ > 800) return;
        const p = project(d.x, relZ);
        if (p.y < screenH * getHorizonRatio()) return;
        const s = p.scale * d.size;
        if (isL2) {
            const a = Math.floor(0.22 * p.scale * 255);
            if (d.type === 'crack') {
                hexFill(0x080404, a); noStroke();
                ellipse(p.x, p.y, s * 4.4, s * 1.4);
            } else {
                hexFill(0x2a1008, a); noStroke();
                rect(p.x - s * 1.3, p.y - s * 0.4, s * 2.6, s * 0.8);
                hexFill(0x4a3020, Math.floor(a * 1.2));
                circle(p.x - s * 0.85, p.y, s * 0.4);
                circle(p.x + s * 0.85, p.y, s * 0.4);
            }
        } else {
            const a = Math.floor(0.2 * p.scale * 255);
            hexFill(d.type === 'crack' ? 0x555555 : 0x6a6050, a); noStroke();
            rect(p.x - s, p.y - s * 0.3, s * 2, s * 0.6);
        }
    });
}

// ============================================================
// CHARACTERS
// ============================================================
const SOLDIER_TIERS = [
    { body: 0xc07020, bodyHi: 0xd08030, hat: 0xf0c040, hatHi: 0xe0b030, brim: 0xd0a020, arm: 0xc07020, armOuter: 0x606060 },
    { body: 0x6080b0, bodyHi: 0x7090c0, hat: 0xc0c8d8, hatHi: 0xb0b8c8, brim: 0xa0a8b8, arm: 0x6080b0, armOuter: 0x506080 },
    { body: 0xd4a020, bodyHi: 0xe4b030, hat: 0xffd700, hatHi: 0xf0c800, brim: 0xddb000, arm: 0xd4a020, armOuter: 0x907010 },
];

function drawPlayerSoldier(sx, sy, scale, animFrame, tier) {
    const t = SOLDIER_TIERS[tier || 0];
    const s = Math.max(1, scale * CONFIG.PIXEL_SIZE * 2.8);
    const legOff = Math.sin(animFrame * 0.15) * 1.5 * s;
    hexFill(0x000000, 77); noStroke(); ellipse(sx, sy, 10 * s, 4 * s);
    px(sx - 3 * s, sy - 2 * s + legOff, 2.5 * s, 2 * s, 0x2a2a2a);
    px(sx + 0.5 * s, sy - 2 * s - legOff, 2.5 * s, 2 * s, 0x2a2a2a);
    px(sx - 2.5 * s, sy - 4 * s + legOff, 2 * s, 2.5 * s, 0x3a3a3a);
    px(sx + 0.5 * s, sy - 4 * s - legOff, 2 * s, 2.5 * s, 0x3a3a3a);
    px(sx - 4 * s, sy - 9 * s, 8 * s, 5.5 * s, t.body);
    px(sx - 3 * s, sy - 8 * s, 6 * s, 1 * s, t.bodyHi);
    px(sx - 5 * s, sy - 8 * s, 1.5 * s, 4 * s, t.armOuter);
    px(sx + 3.5 * s, sy - 8 * s, 1.5 * s, 4 * s, t.armOuter);
    px(sx - 5 * s, sy - 8.5 * s, 1.5 * s, 3 * s, t.arm);
    px(sx + 3.5 * s, sy - 8.5 * s, 1.5 * s, 3 * s, t.arm);
    px(sx - 1 * s, sy - 10 * s, 2 * s, 1.5 * s, 0xd4a574);
    px(sx - 2.5 * s, sy - 13 * s, 5 * s, 3.5 * s, 0xd4a574);
    px(sx - 3.5 * s, sy - 16 * s, 7 * s, 3.5 * s, t.hat);
    px(sx - 3 * s, sy - 16.5 * s, 6 * s, 1 * s, t.hatHi);
    px(sx - 4 * s, sy - 13 * s, 8 * s, 1 * s, t.brim);
    px(sx - 1 * s, sy - 14 * s, 2 * s, 5.5 * s, 0x404040);
    px(sx - 0.5 * s, sy - 17 * s, 1 * s, 3 * s, 0x505050);
    if (tier === 1) { hexFill(0xc0d0e0, 20); noStroke(); ellipse(sx, sy - 8 * s, 12 * s, 20 * s); }
    else if (tier === 2) { hexFill(0xffd700, 31); noStroke(); ellipse(sx, sy - 8 * s, 12 * s, 20 * s); }
}

function drawEnemySoldier(sx, sy, scale, animFrame, hitFlash, type) {
    const s = Math.max(1, scale * CONFIG.PIXEL_SIZE * 2.5);
    const legOff = Math.sin(animFrame * 0.12) * 1.2 * s;
    hexFill(0x000000, 77); noStroke(); ellipse(sx, sy, 8 * s, 3 * s);
    let bodyC, helmC, darkC;
    if (hitFlash > 0) { bodyC = 0xffffff; helmC = 0xffffff; darkC = 0xdddddd; }
    else if (type === 1) { bodyC = 0x4a5a3a; helmC = 0x8b2020; darkC = 0x2a3a1a; }
    else if (type === 2) { bodyC = 0x5a6a30; helmC = 0x4a5a25; darkC = 0x3a4a1a; }
    else { bodyC = 0x5a7020; helmC = 0x4a6020; darkC = 0x3a4a15; }
    const neckC = hitFlash > 0 ? 0xffffee : 0x8a9a50;
    px(sx - 2.5 * s, sy - 1.5 * s + legOff, 2 * s, 1.5 * s, 0x2a2a1a);
    px(sx + 0.5 * s, sy - 1.5 * s - legOff, 2 * s, 1.5 * s, 0x2a2a1a);
    px(sx - 2 * s, sy - 3.5 * s + legOff, 1.8 * s, 2.5 * s, darkC);
    px(sx + 0.5 * s, sy - 3.5 * s - legOff, 1.8 * s, 2.5 * s, darkC);
    px(sx - 3.5 * s, sy - 7.5 * s, 7 * s, 4.5 * s, bodyC);
    px(sx - 4.5 * s, sy - 7 * s, 1.5 * s, 3 * s, bodyC);
    px(sx + 3 * s, sy - 7 * s, 1.5 * s, 3 * s, bodyC);
    px(sx - 2 * s, sy - 10 * s, 4 * s, 3 * s, neckC);
    px(sx - 3 * s, sy - 13 * s, 6 * s, 3.5 * s, helmC);
    px(sx - 2.5 * s, sy - 13.5 * s, 5 * s, 1 * s, darkC);
    px(sx + 1.5 * s, sy - 7 * s, 4 * s, 1.5 * s, 0x333333);
}

function drawDeadBody(sx, sy, scale, alpha) {
    const s = Math.max(1, scale * CONFIG.PIXEL_SIZE * 2.0);
    const a = (alpha || 0.7) * 0.7;
    px(sx - 5 * s, sy - 2 * s, 10 * s, 3 * s, 0x4a5a1a, Math.floor(a * 255));
    px(sx - 6 * s, sy - 2 * s, 2.5 * s, 2.5 * s, 0x3a4a10, Math.floor(a * 255));
    px(sx + 5 * s, sy - 1.5 * s, 3 * s, 2 * s, 0x2a3a10, Math.floor(a * 255));
    hexFill(0x440000, Math.floor(a * 0.4 * 255)); noStroke();
    ellipse(sx, sy, 12 * s, 4 * s);
}

function drawBarrel(sx, sy, scale, barrel) {
    const s = Math.max(1, scale * CONFIG.PIXEL_SIZE * 5.5);
    const pulse = Math.sin(Date.now() * 0.005 + (barrel ? barrel.pulsePhase : 0)) * 0.5 + 0.5;
    const isDamaged = barrel && barrel.hp < barrel.maxHp;
    const glowR = (7 + pulse * 3) * s;
    hexFill(0xff4400, Math.floor((0.12 + pulse * 0.08) * 255)); noStroke();
    circle(sx, sy - 5 * s, glowR * 2);
    hexFill(0xff6600, Math.floor((0.08 + pulse * 0.06) * 255));
    circle(sx, sy - 5 * s, glowR * 1.2);
    const bodyColor = isDamaged ? 0x8B2020 : 0xAA2222;
    px(sx - 4 * s, sy - 10 * s, 8 * s, 10 * s, bodyColor);
    px(sx - 4.5 * s, sy - 9 * s, 9 * s, 1.5 * s, 0x555555);
    px(sx - 4.5 * s, sy - 4 * s, 9 * s, 1.5 * s, 0x555555);
    px(sx - 3.5 * s, sy - 11 * s, 7 * s, 1.5 * s, 0xBB3333);
    for (let i = 0; i < 4; i++) {
        const stripeX = sx - 3 * s + i * 2 * s;
        px(stripeX, sy - 7.5 * s, 1.2 * s, 3 * s, i % 2 === 0 ? 0xffcc00 : 0x222222);
    }
    const iY = sy - 6 * s, iS = 1.5 * s;
    hexPolyFill([sx, iY - iS * 2, sx + iS, iY - iS * 0.5,
        sx + iS * 2, iY, sx + iS, iY + iS * 0.5,
        sx, iY + iS * 1.5, sx - iS, iY + iS * 0.5,
        sx - iS * 2, iY, sx - iS, iY - iS * 0.5], 0xffaa00, 230);
    if (isDamaged) {
        hexStroke(0x000000, 179); strokeWeight(1); noFill();
        beginShape(); vertex(sx - 2 * s, sy - 9 * s); vertex(sx + 1 * s, sy - 5 * s);
        vertex(sx - 1 * s, sy - 2 * s); endShape();
        if (Math.sin(Date.now() * 0.02) > 0) {
            hexFill(0xff4400, 179); noStroke(); circle(sx, sy - 11 * s, 4 * s);
        }
    }
}

function drawMuzzleFlash(sx, sy, scale, weapon) {
    const s = scale * 6;
    const color = WEAPON_COLORS[weapon] || 0xffffff;
    hexFill(color, 51); noStroke(); circle(sx, sy, s * 5);
    hexPolyFill([sx, sy - s * 3, sx + s, sy - s, sx + s * 2.5, sy,
        sx + s, sy + s * 0.5, sx, sy + s,
        sx - s, sy + s * 0.5, sx - s * 2.5, sy, sx - s, sy - s], 0xffffff, 230);
    hexFill(0xf0c040, 230); noStroke(); circle(sx, sy, s * 2.4);
}

// ============================================================
// GATES
// ============================================================
function drawGate(gate) {
    const g = game;
    const relZ = gate.z - g.cameraZ;
    if (relZ < -20 || relZ > Math.max(CONFIG.SPAWN_DISTANCE, CONFIG.BOSS_HOLD_Z) + 200) return;
    const allLeft = project(-CONFIG.ROAD_HALF_WIDTH, relZ);
    const panelHeight = 150 * allLeft.scale;
    const shimmer = Math.sin(Date.now() / 400) * 0.1;
    const now = Date.now();

    gate.options.forEach((opt, optIdx) => {
        const pLeft = project(opt.x - opt.width / 2, relZ);
        const pRight = project(opt.x + opt.width / 2, relZ);
        const panelW = pRight.x - pLeft.x;
        if (panelW < 4) return;
        const sc = pLeft.scale;
        const floatY = Math.sin(now / 600 + optIdx * 2.1) * 3 * sc;
        const panelX = pLeft.x, panelY = pLeft.y - panelHeight + floatY;
        const radius = Math.max(4, 10 * sc);
        const shadowW = panelW * 0.7, shadowH = Math.max(2, 4 * sc);
        const shadowCx = (pLeft.x + pRight.x) / 2, shadowCy = pLeft.y + 2;
        hexFill(0x000000, 64); noStroke(); ellipse(shadowCx, shadowCy, shadowW, shadowH * 2);

        const isWeapon = opt.gateType === 'weapon';
        const op = opt.op || '+';

        let drawAlpha = 1;
        if (gate.triggered && gate.fadeTimer > 0) {
            const progress = 1 - gate.fadeTimer / 60;
            if (optIdx === gate.chosenIdx) {
                if (progress < 0.1) {
                    const flashAlpha = (1 - progress / 0.1) * 0.9;
                    const expand = progress * 15 * sc;
                    hexFill(0xffffff, Math.floor(flashAlpha * 255)); noStroke();
                    rect(panelX - expand, panelY - expand, panelW + expand * 2, panelHeight + expand * 2, radius + expand);
                }
                return;
            } else {
                drawAlpha = Math.max(0, 1 - progress * 8);
                if (drawAlpha <= 0) return;
            }
        }

        let baseColor, glowColor;
        if (isWeapon) { baseColor = 0xd4a020; glowColor = 0xffd840; }
        else if (op === '×') { baseColor = 0x20a0a0; glowColor = 0x40e0e0; }
        else if (op === '+%') { baseColor = 0x1a8a50; glowColor = 0x30dd80; }
        else if (op === '+') { baseColor = 0x2098e0; glowColor = 0x50b0ff; }
        else if (op === '÷') { baseColor = 0xc06020; glowColor = 0xff9040; }
        else if (op === '-%') { baseColor = 0xa03040; glowColor = 0xe06070; }
        else { baseColor = 0xd03030; glowColor = 0xff6060; }

        // Energy underglow
        const glowH = Math.max(5, 18 * sc);
        for (let gi = 0; gi < 4; gi++) {
            const gy = panelY + panelHeight + gi * glowH * 0.35;
            const ga2 = Math.floor((0.2 - gi * 0.04) * drawAlpha * 255);
            const shrink = gi * panelW * 0.1;
            hexFill(glowColor, ga2); noStroke();
            rect(panelX + shrink, gy, panelW - shrink * 2, glowH * 0.35);
        }

        // Outer glow bloom
        for (let i = 4; i >= 0; i--) {
            const expand = (i + 1) * 4 * sc;
            const ga = Math.floor((0.12 + shimmer * 0.6) * (5 - i) / 5 * drawAlpha * 255);
            hexFill(glowColor, ga); noStroke();
            rect(panelX - expand, panelY - expand, panelW + expand * 2, panelHeight + expand * 2, radius + expand);
        }

        // Main panel
        hexFill(baseColor, Math.floor(0.32 * drawAlpha * 255)); noStroke();
        rect(panelX, panelY, panelW, panelHeight, radius);
        // Glass highlight
        hexFill(0xffffff, Math.floor(0.25 * drawAlpha * 255));
        rect(panelX + 3, panelY + 3, panelW - 6, panelHeight * 0.3, Math.max(2, radius - 2));
        // Sheen sweep
        const sheenPhase = (now / 2000 + optIdx * 0.7) % 1;
        hexFill(0xffffff, Math.floor(0.18 * drawAlpha * (1 - Math.abs(sheenPhase - 0.5) * 2) * 255));
        rect(panelX + 4, panelY + panelHeight * sheenPhase, panelW - 8, Math.max(4, 12 * sc));
        // Bright border
        hexStroke(glowColor, Math.floor((0.95 + shimmer) * drawAlpha * 255));
        strokeWeight(Math.max(2, 3 * sc)); noFill();
        rect(panelX, panelY, panelW, panelHeight, radius);
        // Inner border
        hexStroke(0xffffff, Math.floor(0.25 * drawAlpha * 255));
        strokeWeight(Math.max(0.8, 1.5 * sc));
        rect(panelX + 4, panelY + 4, panelW - 8, panelHeight - 8, Math.max(2, radius - 3));

        // Content
        const centerX = (pLeft.x + pRight.x) / 2;
        const centerY = panelY + panelHeight / 2;
        const fontSize = Math.max(16, Math.floor(38 * sc));
        const iconSize = Math.max(12, 20 * sc);

        if (isWeapon) {
            const wColor = WEAPON_COLORS[opt.weapon] || 0xffffff;
            hexFill(wColor, Math.floor(0.8 * drawAlpha * 255)); noStroke();
            circle(centerX, centerY - fontSize * 0.3, iconSize * 3);
            hexFill(0xffffff, Math.floor(0.5 * drawAlpha * 255));
            circle(centerX, centerY - fontSize * 0.3, iconSize * 1.2);
            push();
            textFont('Arial'); textSize(fontSize); textStyle(BOLD); textAlign(CENTER, CENTER);
            drawingContext.shadowColor = 'rgba(0,0,0,0.7)'; drawingContext.shadowBlur = 3;
            hexFill(0xffffff, Math.floor(drawAlpha * 255)); noStroke();
            text(opt.weapon.toUpperCase(), centerX, centerY + fontSize * 0.6);
            textSize(Math.max(10, Math.floor(18 * sc)));
            hexFill(0xdddddd, Math.floor(drawAlpha * 0.85 * 255));
            text(`${WEAPON_DEFS[opt.weapon].duration}s`, centerX, centerY + fontSize * 1.3);
            drawingContext.shadowBlur = 0; drawingContext.shadowColor = 'transparent';
            pop();
        } else {
            // Directional arrow icon
            const as = iconSize * 2;
            const ay = centerY - fontSize * 0.3;
            const arrowAlpha = Math.floor(0.9 * drawAlpha * 255);
            if (op === '+' || op === '+%') {
                hexPolyFill([centerX, ay - as, centerX + as * 0.7, ay + as * 0.1,
                    centerX + as * 0.25, ay + as * 0.1, centerX + as * 0.25, ay + as * 0.6,
                    centerX - as * 0.25, ay + as * 0.6, centerX - as * 0.25, ay + as * 0.1,
                    centerX - as * 0.7, ay + as * 0.1], 0xffffff, arrowAlpha);
            } else if (op === '×') {
                const sv = as * 0.7;
                hexPolyFill([centerX, ay - sv, centerX + sv * 0.6, ay + sv * 0.05,
                    centerX + sv * 0.2, ay + sv * 0.05, centerX + sv * 0.2, ay + sv * 0.3,
                    centerX - sv * 0.2, ay + sv * 0.3, centerX - sv * 0.2, ay + sv * 0.05,
                    centerX - sv * 0.6, ay + sv * 0.05], 0xffffff, arrowAlpha);
                hexPolyFill([centerX, ay - sv + sv * 0.35, centerX + sv * 0.6, ay + sv * 0.4,
                    centerX + sv * 0.2, ay + sv * 0.4, centerX + sv * 0.2, ay + sv * 0.65,
                    centerX - sv * 0.2, ay + sv * 0.65, centerX - sv * 0.2, ay + sv * 0.4,
                    centerX - sv * 0.6, ay + sv * 0.4], 0xffffff, Math.floor(0.6 * drawAlpha * 255));
            } else {
                hexPolyFill([centerX, ay + as * 0.8, centerX + as * 0.6, ay - as * 0.05,
                    centerX + as * 0.2, ay - as * 0.05, centerX + as * 0.2, ay - as * 0.5,
                    centerX - as * 0.2, ay - as * 0.5, centerX - as * 0.2, ay - as * 0.05,
                    centerX - as * 0.6, ay - as * 0.05], 0xffffff, arrowAlpha);
            }
            // Value label
            let valStr;
            if (op === '+%' || op === '-%') valStr = `${op === '+%' ? '+' : '-'}${opt.value}%`;
            else valStr = `${op}${opt.value}`;
            push();
            textFont('Arial'); textSize(Math.floor(fontSize * 1.4)); textStyle(BOLD); textAlign(CENTER, CENTER);
            drawingContext.shadowColor = 'rgba(0,0,0,0.7)'; drawingContext.shadowBlur = 3;
            hexFill(0xffffff, Math.floor(drawAlpha * 255)); noStroke();
            text(valStr, centerX, centerY + fontSize * 0.8);
            drawingContext.shadowBlur = 0; drawingContext.shadowColor = 'transparent';
            pop();
        }
    });
}

// ============================================================
// BULLETS
// ============================================================
function drawBullets() {
    const g = game;
    const farCullZ = Math.max(CONFIG.SPAWN_DISTANCE, CONFIG.BOSS_HOLD_Z) + 100;
    g.bullets.forEach(b => {
        const relZ = b.z - g.cameraZ;
        if (relZ < 0 || relZ > farCullZ) return;
        const p = project(b.x, relZ);

        // Dying bullet → bright expanding impact flash (no streak) so the
        // kill is unmistakable and the projectile never appears to pass
        // through the target.
        if (b.dead) {
            const t = Math.max(0, Math.min(1, 1 - (b.deathTimer || 0) / 3));
            const color = b.color || 0xffff88;
            const baseR = Math.max(4, 14 * p.scale);
            const r = baseR * (0.8 + t * 2.4);
            const fadeA = Math.floor((1 - t) * 255);
            push(); noStroke();
            hexFill(color, Math.floor(fadeA * 0.55)); circle(p.x, p.y, r * 2.2);
            hexFill(0xffffff, fadeA);                  circle(p.x, p.y, r * 1.1);
            hexFill(color, fadeA);                     circle(p.x, p.y, r * 0.7);
            pop();
            return;
        }

        switch (b.weapon) {
            case 'pistol': default: {
                const tierIdx = b.tier || 0;
                const color = b.color || 0xffff88;
                const s = Math.max(1, (3 + tierIdx * 0.5) * p.scale);
                // Tail is drawn BEHIND the head (smaller z), so the streak
                // never visually extends past the bullet's actual position
                // into whatever it just hit. Shortened too so non-pierce
                // bullets read as "impact, gone" rather than "impact, continue".
                const tailLen = 6 + tierIdx * 2;
                const pTail = project(b.x - b.vx * 0.5, Math.max(0, relZ - tailLen));
                if (tierIdx >= 3) {
                    hexStroke(color, Math.floor((0.18 + tierIdx * 0.04) * 255));
                    strokeWeight(s * (2.5 + tierIdx * 0.4)); noFill();
                    line(pTail.x, pTail.y, p.x, p.y);
                }
                if (tierIdx === 2) {
                    hexStroke(0x44ff88, 128); strokeWeight(s * 0.7); noFill();
                    line(pTail.x - s * 0.8, pTail.y, p.x - s * 0.8, p.y);
                    line(pTail.x + s * 0.8, pTail.y, p.x + s * 0.8, p.y);
                }
                hexStroke(color, 255); strokeWeight(s); noFill();
                line(pTail.x, pTail.y, p.x, p.y);
                hexFill(0xffffff); noStroke();
                circle(p.x, p.y, s * (0.9 + tierIdx * 0.15) * 2);
                if (tierIdx >= 5) {
                    hexFill(color, 89); noStroke();
                    circle(p.x, p.y, s * 1.6 * (0.9 + tierIdx * 0.15) * 2);
                }
                break;
            }
            case 'shotgun': {
                const wLv = b.level || 0;
                const s = Math.max(1, (2.5 + wLv * 0.9) * p.scale);
                const tailLen = 5 + wLv * 7;
                const pTail = project(b.x - b.vx * 0.5, relZ - tailLen);
                if (wLv === 0) {
                    hexStroke(0xffaa00, 255); strokeWeight(s); noFill();
                    line(pTail.x, pTail.y, p.x, p.y);
                    hexFill(0xffee88); noStroke(); circle(p.x, p.y, s * 0.85 * 2);
                } else if (wLv === 1) {
                    hexFill(0xff9900, 38); noStroke(); circle(p.x, p.y, s * 6);
                    hexStroke(0xffbb33, 255); strokeWeight(s * 1.2); noFill();
                    line(pTail.x, pTail.y, p.x, p.y);
                    hexFill(0xffdd77); noStroke(); circle(p.x, p.y, s * 2);
                    hexFill(0xffffff); circle(p.x, p.y, s * 0.4 * 2);
                } else if (wLv === 2) {
                    hexFill(0xff8800, 26); noStroke(); circle(p.x, p.y, s * 9);
                    hexFill(0xffcc00, 56); circle(p.x, p.y, s * 5);
                    hexStroke(0xff9900, 255); strokeWeight(s * 1.5); noFill();
                    line(pTail.x, pTail.y, p.x, p.y);
                    hexStroke(0xffffff, 140); strokeWeight(s * 0.5);
                    line(pTail.x, pTail.y, p.x, p.y);
                    hexFill(0xffee88); noStroke(); circle(p.x, p.y, s * 2);
                    hexFill(0xffffff); circle(p.x, p.y, s * 0.45 * 2);
                    const ss2 = s * 2.5;
                    hexStroke(0xffffff, 191); strokeWeight(Math.max(1, s * 0.5)); noFill();
                    line(p.x - ss2, p.y, p.x + ss2, p.y);
                    line(p.x, p.y - ss2, p.x, p.y + ss2);
                } else {
                    hexFill(0xffdd00, 10); noStroke(); circle(p.x, p.y, s * 16);
                    hexFill(0xffcc00, 23); circle(p.x, p.y, s * 11);
                    hexFill(0xffaa00, 56); circle(p.x, p.y, s * 7);
                    hexStroke(0xffcc00, 191); strokeWeight(s * 2.2); noFill();
                    line(pTail.x, pTail.y, p.x, p.y);
                    hexStroke(0xffffff, 191); strokeWeight(s * 0.7);
                    line(pTail.x, pTail.y, p.x, p.y);
                    const sr = s * 4, sr2 = s * 1.8;
                    const starPts = [];
                    for (let k = 0; k < 8; k++) {
                        const ang = k * Math.PI / 4 - Math.PI / 2;
                        const rr = k % 2 === 0 ? sr : sr2;
                        starPts.push(p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr);
                    }
                    hexPolyFill(starPts, 0xffee44, 225);
                    hexFill(0xfffaaa); noStroke(); circle(p.x, p.y, s * 1.3 * 2);
                    hexFill(0xffffff); circle(p.x, p.y, s * 0.55 * 2);
                    for (let k = 0; k < 4; k++) {
                        const ang = Math.PI / 4 + k * Math.PI / 2;
                        hexStroke(0xffffff, 140); strokeWeight(Math.max(1, s * 0.3)); noFill();
                        line(p.x, p.y, p.x + Math.cos(ang) * s * 5.5, p.y + Math.sin(ang) * s * 5.5);
                    }
                }
                break;
            }
            case 'laser': {
                const wLv = b.level || 0;
                const s = Math.max(2, (4 + wLv * 2) * p.scale);
                const tailLen = 30 + wLv * 18;
                const pTail = project(b.x, relZ - tailLen);
                if (wLv === 0) {
                    hexStroke(0x00ffff, 51); strokeWeight(s * 2.5); noFill();
                    line(pTail.x, pTail.y, p.x, p.y);
                    hexStroke(0x00ffff, 255); strokeWeight(s);
                    line(pTail.x, pTail.y, p.x, p.y);
                    hexStroke(0xffffff, 217); strokeWeight(Math.max(1, s * 0.4));
                    line(pTail.x, pTail.y, p.x, p.y);
                } else if (wLv === 1) {
                    hexStroke(0x00ffff, 23); strokeWeight(s * 5); noFill();
                    line(pTail.x, pTail.y, p.x, p.y);
                    hexStroke(0x00ffff, 64); strokeWeight(s * 2.5);
                    line(pTail.x, pTail.y, p.x, p.y);
                    hexStroke(0x00ffff, 255); strokeWeight(s);
                    line(pTail.x, pTail.y, p.x, p.y);
                    hexStroke(0xffffff, 230); strokeWeight(Math.max(1, s * 0.4));
                    line(pTail.x, pTail.y, p.x, p.y);
                    hexFill(0x00ffff, 89); noStroke(); circle(p.x, p.y, s * 3);
                    hexFill(0xffffff); circle(p.x, p.y, s);
                } else if (wLv === 2) {
                    hexStroke(0x0088ff, 18); strokeWeight(s * 7); noFill();
                    line(pTail.x, pTail.y, p.x, p.y);
                    hexStroke(0x00ccff, 36); strokeWeight(s * 4);
                    line(pTail.x, pTail.y, p.x, p.y);
                    hexStroke(0x00ffff, 97); strokeWeight(s * 2);
                    line(pTail.x, pTail.y, p.x, p.y);
                    hexStroke(0x44ffff, 255); strokeWeight(s);
                    line(pTail.x, pTail.y, p.x, p.y);
                    hexStroke(0xffffff, 255); strokeWeight(Math.max(1, s * 0.4));
                    line(pTail.x, pTail.y, p.x, p.y);
                    hexFill(0x00ffff, 64); noStroke(); circle(p.x, p.y, s * 5);
                    hexFill(0x88ffff, 230); circle(p.x, p.y, s * 2);
                    hexFill(0xffffff); circle(p.x, p.y, s * 0.45 * 2);
                    const fl2 = s * 3.5;
                    hexStroke(0x00ffff, 166); strokeWeight(Math.max(1, s * 0.5)); noFill();
                    line(p.x - fl2, p.y, p.x + fl2, p.y);
                    line(p.x, p.y - fl2, p.x, p.y + fl2);
                } else {
                    hexStroke(0x0044ff, 10); strokeWeight(s * 14); noFill(); line(pTail.x, pTail.y, p.x, p.y);
                    hexStroke(0x0077ff, 18); strokeWeight(s * 9); line(pTail.x, pTail.y, p.x, p.y);
                    hexStroke(0x00aaff, 33); strokeWeight(s * 5); line(pTail.x, pTail.y, p.x, p.y);
                    hexStroke(0x00ffff, 107); strokeWeight(s * 2.5); line(pTail.x, pTail.y, p.x, p.y);
                    hexStroke(0x88ffff, 255); strokeWeight(s * 1.2); line(pTail.x, pTail.y, p.x, p.y);
                    hexStroke(0xffffff, 255); strokeWeight(Math.max(1, s * 0.4)); line(pTail.x, pTail.y, p.x, p.y);
                    for (let ti = 0; ti < 8; ti++) {
                        const frac = (ti + 0.5) / 8;
                        const tx2 = pTail.x + (p.x - pTail.x) * frac;
                        const ty2 = pTail.y + (p.y - pTail.y) * frac;
                        const jitter = Math.sin(b.z * 0.5 + ti * 2.1) * s * 4;
                        const jitter2 = Math.cos(b.z * 0.3 + ti * 1.5) * s * 1.5;
                        hexStroke(0xaaffff, 217); strokeWeight(Math.max(1, s * 0.45)); noFill();
                        line(tx2 - jitter * 0.5, ty2 - jitter2, tx2 + jitter * 0.5, ty2 + jitter2);
                    }
                    hexFill(0x0066ff, 31); noStroke(); circle(p.x, p.y, s * 9);
                    hexFill(0x00aaff, 77); circle(p.x, p.y, s * 5);
                    hexFill(0x88ffff, 230); circle(p.x, p.y, s * 2.4);
                    hexFill(0xffffff); circle(p.x, p.y, s);
                    const fl3 = s * 5;
                    hexStroke(0x00ffff, 191); strokeWeight(Math.max(1, s * 0.6)); noFill();
                    line(p.x - fl3, p.y, p.x + fl3, p.y);
                    line(p.x, p.y - fl3, p.x, p.y + fl3);
                    const fl3d = s * 3;
                    hexStroke(0x88ffff, 128); strokeWeight(Math.max(1, s * 0.3));
                    line(p.x - fl3d, p.y - fl3d, p.x + fl3d, p.y + fl3d);
                    line(p.x + fl3d, p.y - fl3d, p.x - fl3d, p.y + fl3d);
                }
                break;
            }
            case 'rocket': {
                const wLv = b.level || 0;
                const s = Math.max(2, (5 + wLv * 1.5) * p.scale);
                const tailLen = 15 + wLv * 12;
                if (wLv === 0) {
                    const pT = project(b.x, relZ - tailLen);
                    hexStroke(0x999999, 77); strokeWeight(s * 1.2); noFill(); line(pT.x, pT.y, p.x, p.y);
                    hexFill(0xcc4444); noStroke(); circle(p.x, p.y, s * 2);
                    hexFill(0xff8888); circle(p.x, p.y - s * 0.5, s * 0.45 * 2);
                    hexFill(0xffaa00); circle(p.x, p.y + s * 1.25, s * 0.58 * 2);
                    hexFill(0xffff00); circle(p.x, p.y + s * 1.0, s * 0.28 * 2);
                } else if (wLv === 1) {
                    const pT = project(b.x, relZ - tailLen);
                    hexFill(0xff5500, 31); noStroke(); circle(p.x, p.y, s * 3.6);
                    hexStroke(0xff8800, 115); strokeWeight(s * 1.6); noFill(); line(pT.x, pT.y, p.x, p.y);
                    hexFill(0xcc3333); noStroke(); circle(p.x, p.y, s * 2);
                    hexFill(0xff9999); circle(p.x, p.y - s * 0.5, s);
                    hexFill(0xff7700); circle(p.x, p.y + s * 1.4, s * 1.3);
                    hexFill(0xffff00); circle(p.x, p.y + s * 1.1, s * 0.32 * 2);
                } else if (wLv === 2) {
                    const pT = project(b.x, relZ - tailLen);
                    hexFill(0xff4400, 36); noStroke(); circle(p.x, p.y, s * 5.6);
                    hexStroke(0xff8800, 140); strokeWeight(s * 2.2); noFill(); line(pT.x, pT.y, p.x, p.y);
                    hexStroke(0xffee00, 166); strokeWeight(s * 0.65); line(pT.x, pT.y, p.x, p.y);
                    hexFill(0xdd3322); noStroke(); circle(p.x, p.y, s * 2.3);
                    hexFill(0xff9988); circle(p.x, p.y - s * 0.5, s);
                    hexFill(0xff5500, 204); circle(p.x, p.y + s * 1.5, s * 1.5);
                    hexFill(0xff8800); circle(p.x, p.y + s * 1.2, s * 0.8 * 2);
                    hexFill(0xffcc00); circle(p.x, p.y + s * 1.0, s * 0.42 * 2);
                    hexFill(0xffffff); circle(p.x, p.y + s * 0.8, s * 0.22 * 2);
                } else {
                    hexFill(0xff2200, 15); noStroke(); circle(p.x, p.y, s * 10);
                    hexFill(0xff4400, 31); circle(p.x, p.y, s * 7);
                    hexFill(0xff6600, 51); circle(p.x, p.y, s * 4.4);
                    const phase = b.z * 0.09, numSeg = 10;
                    for (let k = 0; k < numSeg; k++) {
                        const f1 = k / numSeg, f2 = (k + 1) / numSeg;
                        const ox1 = Math.sin(phase + k * 0.75) * s * 2.5 * f1;
                        const ox2 = Math.sin(phase + (k + 1) * 0.75) * s * 2.5 * f2;
                        const ps1 = project(b.x + ox1, relZ - tailLen * f1);
                        const ps2 = project(b.x + ox2, relZ - tailLen * f2);
                        const fireC = f1 < 0.33 ? 0xff4400 : f1 < 0.67 ? 0xff7700 : 0xcc5500;
                        hexStroke(fireC, Math.floor((1 - f1) * 0.65 * 255));
                        strokeWeight(Math.max(1, s * (1.8 - f1 * 1.0))); noFill();
                        line(ps1.x, ps1.y, ps2.x, ps2.y);
                    }
                    hexFill(0xff2200); noStroke(); circle(p.x, p.y, s * 2.6);
                    hexFill(0xff9988); circle(p.x, p.y - s * 0.6, s * 1.1);
                    hexFill(0xff3300, 204); circle(p.x, p.y + s * 1.9, s * 2.2);
                    hexFill(0xff6600); circle(p.x, p.y + s * 1.65, s * 1.6);
                    hexFill(0xffcc00); circle(p.x, p.y + s * 1.45, s);
                    hexFill(0xffffff); circle(p.x, p.y + s * 1.25, s * 0.56);
                    hexStroke(0xff6600, 140); strokeWeight(Math.max(1, s * 0.5)); noFill();
                    circle(p.x, p.y, s * 4.8);
                    hexStroke(0xff8800, 102); strokeWeight(Math.max(1, s * 0.3));
                    circle(p.x, p.y, s * 3.4);
                }
                break;
            }
        }
    });
}

// ============================================================
// EXPLOSIONS
// ============================================================
function drawExplosions() {
    const g = game;
    g.explosions.forEach(exp => {
        const relZ = exp.z - g.cameraZ;
        const p = project(exp.x, relZ);
        const progress = exp.timer / exp.maxTimer;
        const a = 1 - progress;
        if (exp.isBlastRing) {
            const ringR = 90 * p.scale * (0.2 + progress * 0.8);
            hexStroke(0xffcc00, Math.floor(a * 0.3 * 255));
            strokeWeight(Math.max(1, 8 * p.scale * (1 - progress))); noFill();
            circle(p.x, p.y - 3 * p.scale, ringR * 2.3);
            hexStroke(0xff5500, Math.floor(a * 0.85 * 255));
            strokeWeight(Math.max(2, 7 * p.scale * (1 - progress)));
            circle(p.x, p.y - 3 * p.scale, ringR * 2);
            hexFill(0xff3300, Math.floor(a * 0.18 * 255)); noStroke();
            circle(p.x, p.y - 3 * p.scale, ringR * 1.5);
        } else {
            const radius = (10 + progress * 25) * p.scale;
            const cy = p.y - 5 * p.scale;
            if (progress < 0.15) {
                const flashR = radius * 2 * (progress / 0.15);
                hexFill(0xffffff, Math.floor((1 - progress / 0.15) * 0.7 * 255)); noStroke();
                circle(p.x, cy, flashR * 2);
            }
            hexStroke(0xffcc44, Math.floor(a * 0.4 * 255));
            strokeWeight(Math.max(1, 3 * p.scale * (1 - progress))); noFill();
            circle(p.x, cy, radius * 3);
            hexFill(0xf08020, Math.floor(a * 0.8 * 255)); noStroke();
            circle(p.x, cy, radius * 2);
            hexFill(0xfff8e0, Math.floor(a * 255));
            circle(p.x, cy, radius);
            if (progress < 0.5) {
                const sparkA = Math.floor((1 - progress * 2) * 0.6 * 255);
                for (let si = 0; si < 6; si++) {
                    const ang = si * Math.PI / 3 + exp.timer * 0.1;
                    const innerR = radius * 0.6, outerR = radius * 1.8 * (0.5 + progress);
                    hexStroke(0xffcc00, sparkA);
                    strokeWeight(Math.max(1, 2 * p.scale)); noFill();
                    line(p.x + Math.cos(ang) * innerR, cy + Math.sin(ang) * innerR,
                        p.x + Math.cos(ang) * outerR, cy + Math.sin(ang) * outerR);
                }
            }
        }
    });
}

// ============================================================
// PARTICLES (batched by color+alpha)
// ============================================================
function drawParticles() {
    const buckets = new Map();
    game.particles.forEach(p => {
        const relZ = p.z - game.cameraZ;
        if (relZ < -10) return;
        const proj = project(p.x, Math.max(0, relZ));
        const a = p.life / p.maxLife;
        const s = Math.max(0.5, p.size * proj.scale * (0.3 + a * 0.7));
        if (s < 0.5) return;
        const ox = Math.sin(p.life * 0.8) * s * 0.3;
        const oy = Math.cos(p.life * 0.8) * s * 0.3;
        const qa = Math.round(a * 8) / 8;
        const key = `${p.color}_${qa}`;
        let bucket = buckets.get(key);
        if (!bucket) { bucket = { color: p.color, alpha: qa * 0.9, rects: [] }; buckets.set(key, bucket); }
        bucket.rects.push(proj.x - s / 2 + ox, proj.y + p.y * proj.scale - s / 2 + oy, s, s);
    });
    buckets.forEach(({ color, alpha, rects }) => {
        hexFill(color, Math.floor(alpha * 255)); noStroke();
        for (let i = 0; i < rects.length; i += 4) rect(rects[i], rects[i + 1], rects[i + 2], rects[i + 3]);
    });
}

// ============================================================
// GATE PASS EFFECTS
// ============================================================
function drawGateShatterPieces() {
    const g = game;
    g.gateShatterPieces.forEach(p => {
        const a = Math.min(1, p.life / p.maxLife * 1.5);
        const s = p.size * a;
        if (s < 0.5) return;
        hexFill(p.color, Math.floor(a * 0.9 * 255)); noStroke();
        rect(p.x - s, p.y - s, s * 2, s * 2);
        hexFill(0xffffff, Math.floor(a * 0.6 * 255));
        rect(p.x - s * 0.4, p.y - s * 0.4, s * 0.8, s * 0.8);
    });
}

function drawSpeedLines() {
    const g = game;
    g.speedLines.forEach(s => {
        const a = s.life / s.maxLife;
        const len = s.length * a;
        const mag = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        const dx = -s.vx / mag * len, dy = -s.vy / mag * len;
        hexStroke(s.color, Math.floor(a * 0.5 * 255));
        strokeWeight(2 + a * 2); noFill();
        line(s.x, s.y, s.x + dx, s.y + dy);
        hexFill(0xffffff, Math.floor(a * 0.7 * 255)); noStroke();
        circle(s.x, s.y, 4);
    });
}

function drawGateCollapsePanels() {
    const g = game;
    g.gateCollapsePanels.forEach(p => {
        const a = Math.max(0, p.life / p.maxLife);
        if (a <= 0) return;
        const hw = p.w / 2, hh = p.h / 2;
        const cx = p.sx, cy = p.sy + hh;
        const cos = Math.cos(p.rotAngle), sinv = Math.sin(p.rotAngle);
        const corners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([dx, dy]) =>
            [cx + dx * cos - dy * sinv, cy + dx * sinv + dy * cos]);
        const flatC = corners.flat();
        hexPolyFill(flatC, p.color, Math.floor(a * 0.7 * 255));
        if (p.crackProgress > 0.1) {
            const ca = Math.floor(a * Math.min(1, p.crackProgress * 2) * 0.6 * 255);
            for (let i = 0; i < 3; i++) {
                const x1 = cx + (Math.random() - 0.5) * p.w * 0.8;
                const y1 = cy + (Math.random() - 0.5) * p.h * 0.8;
                const x2 = cx + (Math.random() - 0.5) * p.w * 0.8;
                const y2 = cy + (Math.random() - 0.5) * p.h * 0.8;
                hexStroke(0x000000, ca); strokeWeight(1.5); noFill();
                line(x1, y1, x2, y2);
            }
        }
        hexPolyStroke(flatC, 0xffffff, Math.floor(a * 0.3 * 255), 2);
    });
}

// ============================================================
// FLOATING TEXT (gate result, barrel texts)
// ============================================================
function drawGateFloatingText() {
    const g = game;
    if (!g.gateText) return;
    const t = g.gateText;
    const progress = t.timer / t.maxTimer;
    const a = progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : 1;
    const yPos = screenH * 0.35 - progress * 40;
    push();
    textFont('Arial');
    textSize(Math.floor(42 * t.scale));
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    // Shadow
    hexFill(0x000000, Math.floor(a * 0.5 * 255)); noStroke();
    text(t.text, screenW / 2 + 2, yPos + 2);
    // Main
    drawingContext.shadowColor = 'rgba(0,0,0,0.8)';
    drawingContext.shadowBlur = 4;
    hexFill(t.color, Math.floor(a * 255));
    text(t.text, screenW / 2, yPos);
    drawingContext.shadowBlur = 0;
    drawingContext.shadowColor = 'transparent';
    pop();
}

function drawBarrelExplosionTexts() {
    const g = game;
    g.barrelExplosionTexts.forEach(t => {
        const a = 1 - t.timer / t.maxTimer;
        if (a <= 0) return;
        push();
        textFont('Arial');
        textSize(Math.floor(36 * t.scale));
        textStyle(BOLD);
        textAlign(CENTER, CENTER);
        hexFill(0x000000, Math.floor(a * 0.5 * 255)); noStroke();
        text(t.text, t.x + 2, t.y + 2);
        drawingContext.shadowColor = 'rgba(0,0,0,0.8)';
        drawingContext.shadowBlur = 4;
        hexFill(t.color, Math.floor(a * 255));
        text(t.text, t.x, t.y);
        drawingContext.shadowBlur = 0;
        drawingContext.shadowColor = 'transparent';
        pop();
    });
}

// ============================================================
// SQUAD + PLAYER
// ============================================================
function drawSquadAndPlayer() {
    const g = game;
    const squad = g.squadCount;
    let remaining = squad - 1;
    const drawList = [];
    if (remaining > 0 && squad > 40) {
        const goldCount = Math.floor(remaining / 10);
        remaining -= goldCount * 10;
        const silverCount = Math.floor(remaining / 3);
        remaining -= silverCount * 3;
        for (let i = 0; i < goldCount; i++) drawList.push(2);
        for (let i = 0; i < silverCount; i++) drawList.push(1);
        for (let i = 0; i < remaining; i++) drawList.push(0);
    } else {
        for (let i = 0; i < remaining; i++) drawList.push(0);
    }
    for (let i = drawList.length - 1; i > 0; i--) {
        const j = (i * 7 + 3) % (i + 1);
        [drawList[i], drawList[j]] = [drawList[j], drawList[i]];
    }
    const maxDraw = Math.min(drawList.length, 40);
    const cols = squad <= 5 ? 3 : squad <= 15 ? 5 : 7;
    const spacing = squad <= 15 ? 25 : 20;
    for (let i = 0; i < maxDraw; i++) {
        const row = Math.ceil((i + 1) / cols);
        const col = (i % cols) - Math.floor(cols / 2);
        const soldierScale = squad <= 15 ? 0.85 : squad <= 30 ? 0.7 : 0.55;
        const tierScale = drawList[i] === 2 ? 1.15 : drawList[i] === 1 ? 1.07 : 1.0;
        const sp = project(g.player.x + col * spacing, row * (spacing * 0.8));
        drawPlayerSoldier(sp.x, sp.y, sp.scale * soldierScale * tierScale, g.player.animFrame + i * 3, drawList[i]);
    }

    // Squad count badge
    if (g.squadCount > 8) {
        const pp2 = project(g.player.x, 0);
        const badgeSize = g.squadCount > 40 ? 18 : 14;
        hexFill(0x000000, 179); noStroke();
        circle(pp2.x + 30, pp2.y - 45, badgeSize * 2);
        push();
        textFont('Arial'); textSize(badgeSize); textStyle(BOLD); textAlign(CENTER, CENTER);
        hexFill(0xf0c040); noStroke();
        text(String(g.squadCount), pp2.x + 30, pp2.y - 45);
        pop();
    }

    // Player
    const pp = project(g.player.x, 0);
    const now = Date.now();
    const glowPulse = Math.sin(now * 0.004) * 0.3 + 0.7;
    const auraRx = 55 * pp.scale, auraRy = 18 * pp.scale;

    hexFill(0x00aaff, Math.floor(0.06 * glowPulse * 255)); noStroke();
    ellipse(pp.x, pp.y, auraRx * 4.0, auraRy * 4.0);
    hexFill(0x00ccff, Math.floor(0.12 * glowPulse * 255));
    ellipse(pp.x, pp.y, auraRx * 2.8, auraRy * 2.8);
    hexFill(0x00bbff, Math.floor(0.45 * glowPulse * 255));
    ellipse(pp.x, pp.y, auraRx * 2, auraRy * 2);
    hexStroke(0x44eeff, Math.floor(0.85 * glowPulse * 255));
    strokeWeight(Math.max(3, 4.5 * pp.scale)); noFill();
    ellipse(pp.x, pp.y, auraRx * 2, auraRy * 2);
    hexFill(0xaaeeff, Math.floor(0.35 * glowPulse * 255)); noStroke();
    ellipse(pp.x, pp.y, auraRx * 0.9, auraRy * 0.9);
    for (let i = 0; i < 4; i++) {
        const angle = (now * 0.003) + i * Math.PI / 2;
        const dotX = pp.x + Math.cos(angle) * auraRx * 0.85;
        const dotY = pp.y + Math.sin(angle) * auraRy * 0.85;
        hexFill(0xffffff, Math.floor(0.7 * glowPulse * 255)); noStroke();
        circle(dotX, dotY, Math.max(2, 3.5 * pp.scale) * 2);
    }

    // Shield dome
    if (g.shieldActive) {
        const shieldPulse = Math.sin(now * 0.007) * 0.4 + 0.6;
        const domeRx = auraRx * 1.5, domeRy = auraRy * 3 + 55 * pp.scale;
        hexFill(0xffdd44, Math.floor(0.14 * shieldPulse * 255)); noStroke();
        ellipse(pp.x, pp.y - 28 * pp.scale, domeRx * 2, domeRy * 2);
        hexStroke(0xffee44, Math.floor(0.9 * shieldPulse * 255));
        strokeWeight(Math.max(3, 5 * pp.scale)); noFill();
        ellipse(pp.x, pp.y - 28 * pp.scale, domeRx * 1.76, domeRy * 1.76);
        for (let i = 0; i < 6; i++) {
            const ang = (now * 0.005) + i * Math.PI / 3;
            hexFill(0xffffff, Math.floor(0.9 * shieldPulse * 255)); noStroke();
            circle(pp.x + Math.cos(ang) * domeRx, pp.y - 28 * pp.scale + Math.sin(ang) * domeRy,
                Math.max(2, 3 * pp.scale) * 2);
        }
    }

    drawPlayerSoldier(pp.x, pp.y, pp.scale * 1.5, g.player.animFrame);
    if (g.player.muzzleFlash > 0) drawMuzzleFlash(pp.x, pp.y - 30 * pp.scale, pp.scale, g.weapon);

    // Body glow
    const bodyH = 138 * pp.scale;
    const bodyCy = pp.y - bodyH * 0.52;
    hexFill(0xffdd00, Math.floor(0.07 * glowPulse * 255)); noStroke();
    ellipse(pp.x, bodyCy, 64 * pp.scale, bodyH * 1.12);
    hexStroke(0xffcc00, Math.floor(0.65 * glowPulse * 255));
    strokeWeight(Math.max(2, 3.5 * pp.scale)); noFill();
    ellipse(pp.x, bodyCy, 50 * pp.scale, bodyH);

    // Downward arrow indicator
    const bobY = Math.sin(now * 0.005) * 6 * pp.scale;
    const arrBase = pp.y - 185 * pp.scale + bobY;
    const arrW = 18 * pp.scale, arrH = 22 * pp.scale;
    const arrStemW = 8 * pp.scale, arrStemH = 16 * pp.scale;
    hexFill(0xffaa00, Math.floor(0.22 * glowPulse * 255)); noStroke();
    circle(pp.x, arrBase + arrH / 2 - arrStemH / 2, 52 * pp.scale);
    // Shadow
    hexPolyFill([pp.x + 2, arrBase + arrH + 2, pp.x - arrW + 2, arrBase + 2, pp.x + arrW + 2, arrBase + 2], 0x000000, 153);
    hexFill(0x000000, 153); noStroke();
    rect(pp.x - arrStemW / 2 + 2, arrBase - arrStemH + 2, arrStemW, arrStemH);
    // Arrow gold
    hexPolyFill([pp.x, arrBase + arrH, pp.x - arrW, arrBase, pp.x + arrW, arrBase], 0xffcc00);
    hexFill(0xffcc00); noStroke();
    rect(pp.x - arrStemW / 2, arrBase - arrStemH, arrStemW, arrStemH);
    // White highlight
    hexPolyFill([pp.x, arrBase + arrH - 5 * pp.scale, pp.x - arrW * 0.5, arrBase + 3 * pp.scale, pp.x + arrW * 0.5, arrBase + 3 * pp.scale], 0xffffff, 128);
    // White border
    hexPolyStroke([pp.x, arrBase + arrH, pp.x - arrW, arrBase, pp.x + arrW, arrBase], 0xffffff, 242, Math.max(2, 3.5 * pp.scale));
    hexStroke(0xffffff, 242); strokeWeight(Math.max(2, 3 * pp.scale)); noFill();
    rect(pp.x - arrStemW / 2, arrBase - arrStemH, arrStemW, arrStemH);

    // "YOU" label above arrow
    push();
    textFont('Arial');
    textSize(Math.max(14, Math.floor(22 * pp.scale)));
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    drawingContext.shadowColor = 'rgba(0,0,0,0.8)'; drawingContext.shadowBlur = 4;
    hexFill(0xffee00, Math.floor(0.9 * glowPulse * 255)); noStroke();
    text('YOU', pp.x, arrBase - arrStemH - 14 * pp.scale);
    drawingContext.shadowBlur = 0; drawingContext.shadowColor = 'transparent';
    pop();
}
