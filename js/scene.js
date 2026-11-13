/* Android Medianeira — cenas 3D (hero + "por dentro do conserto") */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const AM = window.AM || { reduce: false, raioxProgress: () => 0, raioxStep: () => -1 };
const reduce = !!AM.reduce;

const GREEN = 0x71c639;
const W = 1.5, H = 3.1, D = 0.17, R = 0.25;          // dimensões do aparelho
const KEYS = ['tela', 'bateria', 'placa', 'cameras', 'audio', 'carcaca'];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const damp = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));
const easeOut = t => 1 - Math.pow(1 - t, 3);

/* ------------------------------------------------------------------
   Geometria utilitária
------------------------------------------------------------------ */
function rr(path, w, h, r) {
  const x = -w / 2, y = -h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x + w, y + h - r);
  path.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  path.lineTo(x + r, y + h);
  path.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(x, y + r);
  path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
}
function extrude(shape, depth, mat, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, curveSegments: 20,
    bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 3,
  });
  g.translate(0, 0, -depth / 2);
  return new THREE.Mesh(g, mat);
}
const plate = (w, h, r, depth, mat, bevel = 0) => extrude(rr(new THREE.Shape(), w, h, r), depth, mat, bevel);
function at(mesh, x, y, z) { mesh.position.set(x, y, z); return mesh; }
function cyl(r, h, mat, seg = 40) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.rotation.x = Math.PI / 2;
  return m;
}

/* ------------------------------------------------------------------
   Tela (canvas 2D → textura): papel de parede + trinca que "conserta"
------------------------------------------------------------------ */
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function makeCracks(w, h) {
  const rnd = mulberry32(11);
  const cx = w * 0.64, cy = h * 0.31, n = 12;
  const rays = [];
  for (let i = 0; i < n; i++) {
    let a = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.4;
    let x = cx, y = cy, d = 0;
    const pts = [[x, y]];
    const len = h * (0.22 + rnd() * 0.7);
    while (d < len) {
      const s = 34 + rnd() * 80;
      a += (rnd() - 0.5) * 0.42;
      x += Math.cos(a) * s; y += Math.sin(a) * s; d += s;
      pts.push([x, y]);
    }
    rays.push(pts);
  }
  const rings = [1, 2, 3].map(k => rays.map(ray => (rnd() > 0.22 ? ray[Math.min(k, ray.length - 1)] : null)));
  return { rays, rings, cx, cy };
}
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeScreen() {
  const w = 512, h = 1106;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const cracks = makeCracks(w, h);
  const DISPLAY = '"Bricolage Grotesque", system-ui, sans-serif';
  const BODY = '"Geist", system-ui, sans-serif';

  const blob = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  };

  function draw({ state = 'ok', clipY = 0, scanY = null } = {}) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    roundRectPath(ctx, 0, 0, w, h, 70); ctx.clip();

    // papel de parede
    ctx.fillStyle = '#0a1f0b'; ctx.fillRect(0, 0, w, h);
    blob(w * 0.15, h * 0.4, w * 1.25, 'rgba(120,214,60,1)');
    blob(w * 0.98, h * 0.7, w * 0.95, 'rgba(206,255,130,.9)');
    blob(w * 0.4, h * 1.04, w * 0.95, 'rgba(16,84,26,.95)');
    blob(w * 0.92, h * 0.02, w * 0.7, 'rgba(6,30,10,.95)');

    // relógio
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,.82)';
    ctx.font = `500 32px ${BODY}`;
    ctx.fillText('Medianeira · PR', w / 2, 168);
    ctx.fillStyle = '#fff';
    ctx.font = `700 156px ${DISPLAY}`;
    ctx.fillText('10:30', w / 2, 306);

    // ilha + barra inferior
    ctx.fillStyle = '#000'; roundRectPath(ctx, w / 2 - 64, 30, 128, 38, 19); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; roundRectPath(ctx, w / 2 - 78, h - 32, 156, 8, 4); ctx.fill();

    // status
    const label = state === 'crack' ? 'Tela trincada' : state === 'fixing' ? 'Consertando…' : 'Como novo';
    ctx.font = `600 34px ${BODY}`;
    const tw = ctx.measureText(label).width;
    const pw = tw + 104, px = (w - pw) / 2, py = h - 190;
    ctx.fillStyle = 'rgba(5,8,5,.62)'; roundRectPath(ctx, px, py, pw, 84, 42); ctx.fill();
    ctx.fillStyle = state === 'crack' ? '#ff5d4d' : '#8fe650';
    ctx.beginPath(); ctx.arc(px + 44, py + 42, 14, 0, Math.PI * 2); ctx.fill();
    if (state === 'ok') {
      ctx.strokeStyle = '#06210a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(px + 37, py + 43); ctx.lineTo(px + 42, py + 48); ctx.lineTo(px + 51, py + 37); ctx.stroke();
    }
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText(label, px + 72, py + 54);

    // trincas (abaixo da linha de varredura)
    if (state !== 'ok') {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, clipY, w, h - clipY); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(cracks.cx, cracks.cy, 0, cracks.cx, cracks.cy, 90);
      g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const strokeAll = () => {
        cracks.rays.forEach(pts => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); });
      };
      ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 6; strokeAll();
      ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 2.4; strokeAll();
      ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(255,255,255,.7)';
      cracks.rings.forEach(ring => {
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i], b = ring[(i + 1) % ring.length];
          if (!a || !b) continue;
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      });
      ctx.restore();
    }

    // varredura
    if (scanY !== null) {
      const g = ctx.createLinearGradient(0, scanY - 150, 0, scanY);
      g.addColorStop(0, 'rgba(160,255,90,0)'); g.addColorStop(1, 'rgba(190,255,120,.8)');
      ctx.fillStyle = g; ctx.fillRect(0, scanY - 150, w, 150);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, scanY - 3, w, 5);
    }
    ctx.restore();
    tex.needsUpdate = true;
  }

  return { tex, draw, w, h };
}

function makeBatteryLabel() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#0c0e0b'; x.fillRect(0, 0, 256, 512);
  x.fillStyle = '#71C639'; x.fillRect(0, 0, 256, 74);
  x.fillStyle = '#0B0D0A'; x.font = '700 30px system-ui, sans-serif'; x.textAlign = 'left';
  x.fillText('BATERIA', 22, 48);
  x.fillStyle = 'rgba(255,255,255,.75)'; x.font = '600 22px system-ui, sans-serif';
  x.fillText('Li-ion · 3,87 V', 22, 128);
  x.fillStyle = 'rgba(255,255,255,.35)'; x.font = '500 17px system-ui, sans-serif';
  ['Android Medianeira', 'Peça com garantia'].forEach((t, i) => x.fillText(t, 22, 168 + i * 28));
  x.strokeStyle = 'rgba(255,255,255,.2)'; x.lineWidth = 2;
  for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(22 + i * 10, 440); x.lineTo(22 + i * 10, 482); x.stroke(); }
  x.strokeStyle = '#71C639'; x.lineWidth = 3; x.strokeRect(170, 426, 62, 62);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ------------------------------------------------------------------
   O aparelho — em camadas, para poder "desmontar"
------------------------------------------------------------------ */
function buildPhone(screenTex) {
  const root = new THREE.Group();
  const layers = [];          // { key, group, base, z, cur }
  const mats = {};            // key → materiais que acendem em destaque
  const std = (key, opts) => {
    const m = new THREE.MeshStandardMaterial(opts);
    m.emissive.set(GREEN); m.emissiveIntensity = 0;
    (mats[key] ||= []).push(m);
    return m;
  };
  const layer = (key, base, z) => {
    const g = new THREE.Group(); g.position.z = base; root.add(g);
    layers.push({ key, group: g, base, z, cur: 0 });
    return g;
  };

  // --- vidro frontal
  const gGlass = layer('tela', D / 2 - 0.01, 2.45);
  const glass = plate(W - 0.104, H - 0.104, R - 0.052, 0.015, new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.8, depthWrite: false,
  }));
  glass.renderOrder = 3;
  gGlass.add(glass);

  // --- display
  const gDisplay = layer('tela', D / 2 - 0.036, 1.62);
  gDisplay.add(plate(W - 0.11, H - 0.11, R - 0.055, 0.02, std('tela', { color: 0x070807, roughness: 0.5, metalness: 0.3 })));
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.12, H - 0.12),
    new THREE.MeshBasicMaterial({ map: screenTex, transparent: true, toneMapped: false })
  );
  screen.position.z = 0.0108; screen.renderOrder = 2;
  gDisplay.add(screen);

  // --- bateria
  const gBatt = layer('bateria', 0, 0.65);
  gBatt.add(at(plate(0.72, 1.5, 0.06, 0.05, std('bateria', { color: 0x10120f, roughness: 0.55, metalness: 0.25 })), -0.26, -0.25, 0));
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.3), new THREE.MeshBasicMaterial({ map: makeBatteryLabel(), toneMapped: false }));
  gBatt.add(at(label, -0.26, -0.25, 0.0262));
  gBatt.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.012), std('bateria', { color: 0xc9a24a, roughness: 0.35, metalness: 1 })), -0.26, 0.53, 0));

  // --- placa lógica
  const gBoard = layer('placa', 0, 0.65);
  const bs = new THREE.Shape();
  [[-0.66, 1.42], [0.1, 1.42], [0.1, 0.7], [0.66, 0.7], [0.66, -1.0], [0.2, -1.0], [0.2, 0.56], [-0.66, 0.56]]
    .forEach(([x, y], i) => (i ? bs.lineTo(x, y) : bs.moveTo(x, y)));
  bs.closePath();
  gBoard.add(extrude(bs, 0.02, std('placa', { color: 0x1d6a2b, roughness: 0.6, metalness: 0.15 })));
  const shield = std('placa', { color: 0xaab0a6, roughness: 0.28, metalness: 1 });
  const ic = std('placa', { color: 0x0b0c0b, roughness: 0.35, metalness: 0.4 });
  const gold = std('placa', { color: 0xd0a94f, roughness: 0.3, metalness: 1 });
  [
    [-0.36, 1.12, 0.44, 0.44, shield], [-0.42, 0.74, 0.32, 0.2, ic], [-0.06, 0.78, 0.2, 0.28, ic],
    [0.43, 0.32, 0.34, 0.42, shield], [0.43, -0.14, 0.3, 0.3, ic], [0.43, -0.56, 0.26, 0.22, ic], [0.43, -0.86, 0.3, 0.12, shield],
  ].forEach(([x, y, w, h, m]) => gBoard.add(at(plate(w, h, 0.03, 0.022, m), x, y, 0.021)));
  for (let i = 0; i < 16; i++) {
    const col = i < 8;
    const x = col ? 0.27 + (i % 2) * 0.32 : -0.6 + (i - 8) * 0.07;
    const y = col ? 0.6 - Math.floor(i / 2) * 0.42 : 0.62;
    gBoard.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.016), gold), x, y, 0.018));
  }

  // --- câmeras
  const gCam = layer('cameras', 0, -0.05);
  const camBody = std('cameras', { color: 0x2b2e2a, roughness: 0.3, metalness: 1 });
  const lensGlass = new THREE.MeshPhysicalMaterial({ color: 0x04060a, roughness: 0.05, metalness: 0.3, clearcoat: 1 });
  const LENS = [[0.27, 1.23], [0.27, 0.89], [0.55, 1.06]];
  LENS.forEach(([x, y]) => {
    gCam.add(at(plate(0.24, 0.24, 0.05, 0.06, camBody), x, y, -0.008));
    gCam.add(at(cyl(0.095, 0.03, camBody), x, y, -0.05));
    gCam.add(at(cyl(0.07, 0.032, lensGlass), x, y, -0.052));
  });

  // --- áudio e carga (base do aparelho)
  const gBottom = layer('audio', 0, 0.65);
  gBottom.add(at(plate(0.56, 0.26, 0.05, 0.06, std('audio', { color: 0x1a1c19, roughness: 0.45, metalness: 0.6 })), -0.34, -1.25, 0));
  for (let i = 0; i < 5; i++) gBottom.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.01), std('audio', { color: 0x70766c, roughness: 0.3, metalness: 1 })), -0.52 + i * 0.09, -1.25, 0.032));
  gBottom.add(at(plate(0.5, 0.26, 0.04, 0.02, std('audio', { color: 0x1d6a2b, roughness: 0.6, metalness: 0.15 })), 0.38, -1.25, 0));
  gBottom.add(at(cyl(0.085, 0.045, std('audio', { color: 0xb8beb3, roughness: 0.25, metalness: 1 })), 0.5, -1.25, 0.022));
  gBottom.add(at(plate(0.3, 0.1, 0.045, 0.07, std('audio', { color: 0x8d938a, roughness: 0.3, metalness: 1 })), 0.04, -1.41, 0));

  // --- carcaça (moldura + chapa interna)
  const gFrame = layer('carcaca', 0, -0.75);
  const fs = rr(new THREE.Shape(), W, H, R);
  fs.holes.push(rr(new THREE.Path(), W - 0.1, H - 0.1, R - 0.05));
  gFrame.add(extrude(fs, D - 0.04, std('carcaca', { color: 0x3c403b, roughness: 0.3, metalness: 1 }), 0.02));
  gFrame.add(at(plate(W - 0.1, H - 0.1, R - 0.05, 0.01, std('carcaca', { color: 0x161815, roughness: 0.5, metalness: 0.7 })), 0, 0, -0.05));
  // botões laterais
  const btn = std('carcaca', { color: 0x4a4e48, roughness: 0.3, metalness: 1 });
  gFrame.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.42, 0.05), btn), W / 2 + 0.005, 0.5, 0));
  gFrame.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.2, 0.05), btn), -W / 2 - 0.005, 0.78, 0));
  gFrame.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.2, 0.05), btn), -W / 2 - 0.005, 0.5, 0));

  // --- tampa traseira
  const gBack = layer('carcaca', -D / 2 + 0.012, -1.5);
  const backMat = new THREE.MeshPhysicalMaterial({ color: 0x0f120e, roughness: 0.42, metalness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.3 });
  backMat.emissive.set(GREEN); backMat.emissiveIntensity = 0; mats.carcaca.push(backMat);
  gBack.add(plate(W - 0.104, H - 0.104, R - 0.052, 0.02, backMat));
  const island = std('carcaca', { color: 0x1b1e1a, roughness: 0.25, metalness: 0.8 });
  gBack.add(at(plate(0.66, 0.72, 0.2, 0.03, island, 0.008), 0.41, 1.06, -0.022));
  const ringMat = std('carcaca', { color: 0x565b53, roughness: 0.22, metalness: 1 });
  LENS.forEach(([x, y]) => {
    gBack.add(at(cyl(0.125, 0.03, ringMat), x, y, -0.046));
    gBack.add(at(cyl(0.098, 0.034, lensGlass), x, y, -0.047));
    gBack.add(at(cyl(0.04, 0.036, new THREE.MeshPhysicalMaterial({ color: 0x15233a, roughness: 0.1, metalness: 0.6, clearcoat: 1 })), x, y, -0.047));
  });
  gBack.add(at(cyl(0.04, 0.03, new THREE.MeshStandardMaterial({ color: 0xf2efe2, roughness: 0.4, emissive: 0xfff3c4, emissiveIntensity: 0.25 })), 0.57, 1.3, -0.04));

  return { root, layers, mats };
}

/* ------------------------------------------------------------------
   Palco (renderer + câmera + luz) por canvas
------------------------------------------------------------------ */
// Mesmo ponto de corte do CSS (max-width: 900px). Antes o 3D media a largura do canvas,
// que e menor que a da janela, e entre ~901 e ~935px ele entrava em "modo celular"
// enquanto o restante da pagina ja estava em modo desktop.
const compact = matchMedia('(max-width: 900px)');
const stages = [];

function createStage(canvas, fov, rimColor) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  // Nitidez: desenha na densidade real da tela, até 2x (celulares têm 2x–3x).
  const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;

  const camera = new THREE.PerspectiveCamera(fov, 1, 1, 60);
  camera.position.z = 12;

  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(4, 6, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(rimColor, 2.2); rim.position.set(-6, 2, -5); scene.add(rim);

  const stage = { renderer, scene, camera, w: 0, h: 0, halfW: 1, halfH: 1, visible: true, onResize: null };
  stage.resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    stage.w = w; stage.h = h;
    renderer.setPixelRatio(pixelRatio());   // reavalia: a densidade muda ao trocar de tela
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    stage.halfH = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * camera.position.z;
    stage.halfW = stage.halfH * camera.aspect;
    stage.onResize && stage.onResize();
  };
  new ResizeObserver(stage.resize).observe(canvas);
  new IntersectionObserver(([e]) => {
    const was = stage.visible;
    stage.visible = e.isIntersecting;
    if (!was && stage.visible && stage.onShow) stage.onShow();
  }).observe(canvas);
  stages.push(stage);
  return stage;
}

/* ------------------------------------------------------------------
   Ponteiro (parallax)
------------------------------------------------------------------ */
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', e => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });

/* ------------------------------------------------------------------
   HERO
------------------------------------------------------------------ */
function initHero() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return null;
  const stage = createStage(canvas, 28, 0xffffff);
  const scr = makeScreen();
  const phone = buildPhone(scr.tex);

  const rig = new THREE.Group(); stage.scene.add(rig);
  const holder = new THREE.Group(); holder.add(phone.root); rig.add(holder);

  // objetos flutuantes
  const floaters = [];
  const addFloat = (mesh, x, y, z, speed, amp) => { mesh.position.set(x, y, z); rig.add(mesh); floaters.push({ mesh, x, y, z, speed, amp, ph: Math.random() * 6 }); return mesh; };
  addFloat(new THREE.Mesh(new THREE.SphereGeometry(0.3, 48, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.22, clearcoat: 0.8 })), -1.62, -1.02, 0.9, 0.8, 0.12);
  addFloat(new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.11, 32, 80), new THREE.MeshStandardMaterial({ color: 0xeef2ea, roughness: 0.1, metalness: 1 })), 1.5, 1.42, -0.8, 0.6, 0.1);
  addFloat(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 12, 32), new THREE.MeshPhysicalMaterial({ color: 0x0b0d0a, roughness: 0.25, clearcoat: 1 })), -1.38, 1.32, -0.4, 0.7, 0.09).rotation.z = 0.9;
  addFloat(new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 32), new THREE.MeshPhysicalMaterial({ color: 0x1c320e, roughness: 0.15, clearcoat: 1 })), 1.4, -1.25, 0.8, 1.1, 0.1);

  const base = { rx: 0.1, ry: -0.5, rz: -0.28 };
  stage.onResize = () => {
    if (!compact.matches) {
      rig.position.set(stage.halfW * 0.45, -0.05, 0);
      rig.scale.setScalar(clamp(stage.halfW / 3.7, 0.92, 1.5));
      Object.assign(base, { rx: 0.1, ry: -0.5, rz: -0.28 });
    } else {
      // cabe no espaço livre abaixo do texto/botões, sem cobrir nada
      const copy = document.querySelector('.hero__copy');
      const freePx = copy ? stage.h - (copy.offsetTop + copy.offsetHeight) : stage.h * 0.45;
      const free = freePx / (stage.h / (2 * stage.halfH));
      const s = clamp(free / 2.48, 0.5, Math.min(1.05, stage.halfW / 1.82));
      rig.scale.setScalar(s);
      rig.position.set(stage.halfW * 0.1, -stage.halfH + Math.min(1.2 * s, free - 0.15 - 1.6 * s), 0);
      Object.assign(base, { rx: 0.18, ry: -0.42, rz: -0.5 });
    }
  };
  stage.resize();

  // tela: começa trincada e vai sendo "consertada" conforme o scroll
  let heal = 0, drawn = -1;
  document.fonts && document.fonts.ready.then(() => { drawn = -1; stage.resize(); });

  const t0 = performance.now() / 1000;
  const heroEl = document.getElementById('inicio');

  return {
    update(t, dt) {
      if (!stage.visible) return;
      const el = t - t0;
      const intro = reduce ? 1 : easeOut(clamp((el - 0.25) / 1.7));
      const sp = clamp(scrollY / (heroEl.offsetHeight || 1));

      heal = damp(heal, clamp((sp - 0.03) / 0.3), 6, dt);
      const k = heal < 0.004 ? 0 : heal > 0.996 ? 1 : heal;
      if (Math.abs(k - drawn) > 0.003 || (k !== drawn && (k === 0 || k === 1))) {
        if (k === 0) scr.draw({ state: 'crack' });
        else if (k === 1) scr.draw({ state: 'ok' });
        else { const y = -20 + k * (scr.h + 190); scr.draw({ state: 'fixing', clipY: y, scanY: y }); }
        drawn = k;
      }

      const idle = reduce ? 0 : 1;
      holder.position.y = (1 - intro) * -4.2 + Math.sin(t * 0.9) * 0.07 * idle + sp * 0.9;
      holder.rotation.x = base.rx + pointer.sy * 0.1 + Math.sin(t * 0.7) * 0.02 * idle;
      holder.rotation.y = base.ry + pointer.sx * 0.24 + (1 - intro) * 1.9 + sp * 1.5;
      holder.rotation.z = base.rz + Math.sin(t * 0.5) * 0.02 * idle - sp * 0.2;

      floaters.forEach((f, i) => {
        f.mesh.position.y = f.y + Math.sin(t * f.speed + f.ph) * f.amp * idle + (1 - intro) * -(2 + i) + sp * (0.5 + i * 0.35);
        f.mesh.position.x = f.x + pointer.sx * (0.06 + i * 0.03);
        f.mesh.rotation.x += dt * 0.25 * idle; f.mesh.rotation.y += dt * 0.18 * idle;
      });

      stage.renderer.render(stage.scene, stage.camera);
    },
  };
}

/* ------------------------------------------------------------------
   POR DENTRO — desmonta com o scroll
------------------------------------------------------------------ */
function initRaiox() {
  const canvas = document.getElementById('raioxCanvas');
  if (!canvas) return null;
  const stage = createStage(canvas, 30, 0x9be860);
  const scr = makeScreen();
  scr.draw({ state: 'ok' });
  document.fonts && document.fonts.ready.then(() => scr.draw({ state: 'ok' }));
  const phone = buildPhone(scr.tex);

  const rig = new THREE.Group(); stage.scene.add(rig);
  rig.add(phone.root);

  stage.onResize = () => {
    if (!compact.matches) {
      // cabe na altura E na largura que sobra ao lado do texto (janelas de PC mais estreitas)
      // O aparelho desmontado ocupa de -2.6 a +1.7 (x escala) em volta do centro.
      // Ele é centralizado na área livre à direita da coluna de texto, sem encostar nela.
      const ui = document.querySelector('.raiox__ui');
      const unit = stage.w / (2 * stage.halfW);                       // px por unidade 3D
      const left = (ui ? ui.offsetLeft + ui.offsetWidth : stage.w * 0.4) + 30;
      const right = stage.w - 16;
      const s = clamp(Math.min(stage.halfH / 2.6, (right - left) / unit / 4.5), 0.5, 1.25);
      rig.scale.setScalar(s);
      rig.position.set(((left + right) / 2 - stage.w / 2) / unit + 0.45 * s, -0.1, 0);
    } else {
      rig.position.set(stage.halfW * 0.1, stage.halfH * 0.1, 0);
      rig.scale.setScalar(clamp(stage.halfW / 2.7, 0.42, 1));
    }
  };
  stage.resize();

  // Aquecimento: compila os shaders e envia as texturas já no carregamento, para não
  // dar um "soluço" na primeira vez que a seção 3D entra na tela durante o scroll.
  stage.renderer.compile(stage.scene, stage.camera);
  stage.renderer.render(stage.scene, stage.camera);

  let e = 0, spin = 0;
  return {
    update(t, dt) {
      if (!stage.visible) return;
      const p = AM.raioxProgress();
      const step = AM.raioxStep(p);
      const active = KEYS[step];
      e = damp(e, smooth(0.02, 0.14, p) * (1 - smooth(0.88, 0.97, p)), 7, dt);
      spin = damp(spin, smooth(0.88, 1, p), 5, dt);

      phone.layers.forEach(l => {
        l.cur = damp(l.cur, l.key === active ? 1 : 0, 7, dt);
        l.group.position.z = l.base + l.z * e;
        l.group.position.y = l.cur * 0.5 * e;
        const s = 1 + l.cur * 0.03 * e;
        l.group.scale.set(s, s, 1);
      });
      KEYS.forEach(k => {
        const on = k === active ? 1 : 0;
        phone.mats[k].forEach(m => { m.emissiveIntensity = damp(m.emissiveIntensity, on * (k === 'carcaca' ? 0.07 : 0.16) * e, 7, dt); });
      });

      const idle = reduce ? 0 : 1;
      phone.root.position.z = -0.47 * e;
      phone.root.rotation.y = lerp(-0.42, -1.12, e) + Math.sin(t * 0.5) * 0.04 * idle + pointer.sx * 0.1 + spin * Math.PI * 2;
      phone.root.rotation.x = lerp(0.04, 0.2, e) + pointer.sy * 0.05;
      phone.root.rotation.z = lerp(-0.1, 0, e);
      phone.root.position.y = Math.sin(t * 0.8) * 0.05 * idle;

      stage.renderer.render(stage.scene, stage.camera);
    },
  };
}

/* ------------------------------------------------------------------
   Loop
------------------------------------------------------------------ */
let hero = null, raiox = null;
try {
  hero = initHero();
  raiox = initRaiox();
} catch (err) {
  console.warn('[Android Medianeira] 3D indisponível:', err);
  document.documentElement.classList.add('no-webgl');
}

const onCompactChange = () => stages.forEach(st => st.resize());
compact.addEventListener ? compact.addEventListener('change', onCompactChange) : compact.addListener(onCompactChange);

// Se a densidade da tela mudar (ex.: arrastar a janela do monitor para o notebook),
// redimensiona o 3D para não ficar borrado/pixelado.
(function watchDensity() {
  const mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  const onChange = () => { onCompactChange(); watchDensity(); };
  mq.addEventListener ? mq.addEventListener('change', onChange, { once: true }) : mq.addListener(onChange);
})();

// Limita o 3D a ~60 quadros por segundo. Em telas de 120/144/240 Hz o navegador chama
// este loop 2 a 4 vezes mais, e renderizar tudo isso pesava a placa de video a toa.
const MIN_FRAME_MS = 12.8;
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = now - last;
  if (elapsed < MIN_FRAME_MS) return;
  const dt = Math.min(elapsed / 1000, 0.05);
  last = now;
  const t = now / 1000;
  pointer.sx = damp(pointer.sx, reduce ? 0 : pointer.x, 4, dt);
  pointer.sy = damp(pointer.sy, reduce ? 0 : pointer.y, 4, dt);
  hero && hero.update(t, dt);
  raiox && raiox.update(t, dt);
}
if (hero || raiox) requestAnimationFrame(frame);
