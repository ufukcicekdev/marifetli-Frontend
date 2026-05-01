// Zep maskotu için GIF export scripti
// Kullanim: node scripts/export-mascot-gifs.js
const { createCanvas } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '../public/kids/mascot');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 200, H = 220;

// ─── Renk paleti ───
const C = {
  yellow: '#F5A800',
  yellowLight: '#FFCC33',
  yellowDark: '#D4880A',
  orange: '#E85C00',
  face: '#FFF0C0',
  cheek: '#FFAAAA',
  eyeDark: '#1A0A00',
  eyeShine: '#FFFFFF',
  hoodie: '#3A3A3A',
  hoodieAccent: '#F5A800',
  goggle: '#888888',
  goggleLens: '#C8A020',
  goggleShine: 'rgba(255,255,200,0.6)',
  sneaker: '#E0E0E0',
  shadow: 'rgba(0,0,0,0.12)',
  lightning: '#FFD700',
};

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// ─── Temel karakter çizim fonksiyonu ───
function drawZep(ctx, opts = {}) {
  const {
    bodyY = 0,        // govde dikey offset (ziplamak icin)
    armLAngle = 0,   // sol kol acisi (derece)
    armRAngle = 0,   // sag kol acisi
    legLAngle = 0,   // sol bacak
    legRAngle = 0,
    mouth = 'smile', // smile | open | huge | side
    eyeScale = 1,    // goz boyutu (kirpma animasyonu)
    blush = true,
    goggleY = 0,     // gozluk offset
    sparkle = false, // yildiz efekti
    lightning = false,
    shadow = true,
    bodyRotate = 0,
  } = opts;

  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const base = 155 + bodyY;

  // ─── Golge ───
  if (shadow) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, 200 - bodyY * 0.3, 45, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, base - 30);
  ctx.rotate((bodyRotate * Math.PI) / 180);

  // ─── Hoodie govde ───
  ctx.save();
  ctx.fillStyle = C.hoodie;
  ctx.beginPath();
  ctx.ellipse(0, 30, 42, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Hoodie Z harfi
  ctx.save();
  ctx.fillStyle = C.hoodieAccent;
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Z', 0, 30);
  ctx.restore();

  // Hoodie serit detaylari
  ctx.save();
  ctx.strokeStyle = C.hoodieAccent;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  // Sol kol seridi
  ctx.beginPath(); ctx.moveTo(-30, 5); ctx.lineTo(-38, 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-30, 12); ctx.lineTo(-38, 17); ctx.stroke();
  // Sag kol seridi
  ctx.beginPath(); ctx.moveTo(30, 5); ctx.lineTo(38, 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(30, 12); ctx.lineTo(38, 17); ctx.stroke();
  ctx.restore();

  // ─── Sol kol ───
  ctx.save();
  ctx.translate(-36, 10);
  ctx.rotate((armLAngle * Math.PI) / 180);
  ctx.fillStyle = C.hoodie;
  ctx.beginPath();
  ctx.ellipse(0, 18, 11, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  // Seritler
  ctx.fillStyle = C.hoodieAccent;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(-8, 8 + i * 7, 16, 3);
  }
  // Yumruk
  ctx.fillStyle = C.yellow;
  ctx.beginPath();
  ctx.arc(0, 36, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.yellowLight;
  ctx.beginPath();
  ctx.arc(-2, 33, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ─── Sag kol ───
  ctx.save();
  ctx.translate(36, 10);
  ctx.rotate((armRAngle * Math.PI) / 180);
  ctx.fillStyle = C.hoodie;
  ctx.beginPath();
  ctx.ellipse(0, 18, 11, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.hoodieAccent;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(-8, 8 + i * 7, 16, 3);
  }
  ctx.fillStyle = C.yellow;
  ctx.beginPath();
  ctx.arc(0, 36, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.yellowLight;
  ctx.beginPath();
  ctx.arc(-2, 33, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ─── Sol bacak ───
  ctx.save();
  ctx.translate(-18, 72);
  ctx.rotate((legLAngle * Math.PI) / 180);
  ctx.fillStyle = C.hoodie;
  ctx.beginPath();
  ctx.roundRect(-12, 0, 24, 36, 8);
  ctx.fill();
  // Seritler
  ctx.fillStyle = C.hoodieAccent;
  ctx.fillRect(-10, 8, 20, 3);
  ctx.fillRect(-10, 16, 20, 3);
  // Ayakkabi
  ctx.fillStyle = C.sneaker;
  ctx.beginPath();
  ctx.ellipse(-2, 38, 18, 10, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.hoodieAccent;
  ctx.fillRect(-14, 35, 24, 4);
  ctx.restore();

  // ─── Sag bacak ───
  ctx.save();
  ctx.translate(18, 72);
  ctx.rotate((legRAngle * Math.PI) / 180);
  ctx.fillStyle = C.hoodie;
  ctx.beginPath();
  ctx.roundRect(-12, 0, 24, 36, 8);
  ctx.fill();
  ctx.fillStyle = C.hoodieAccent;
  ctx.fillRect(-10, 8, 20, 3);
  ctx.fillRect(-10, 16, 20, 3);
  ctx.fillStyle = C.sneaker;
  ctx.beginPath();
  ctx.ellipse(2, 38, 18, 10, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.hoodieAccent;
  ctx.fillRect(-10, 35, 24, 4);
  ctx.restore();

  // ─── Bas ───
  // Sac / tuy
  ctx.save();
  ctx.fillStyle = C.orange;
  ctx.beginPath();
  ctx.ellipse(-8, -60, 12, 8, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(2, -64, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(12, -60, 10, 7, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Ana bas (yuvarlak, sari)
  ctx.save();
  const headGrad = ctx.createRadialGradient(-10, -55, 5, 0, -45, 45);
  headGrad.addColorStop(0, C.yellowLight);
  headGrad.addColorStop(0.7, C.yellow);
  headGrad.addColorStop(1, C.yellowDark);
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, -42, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Yuz (bej/krem ic kisim)
  ctx.save();
  const faceGrad = ctx.createRadialGradient(0, -38, 5, 0, -38, 28);
  faceGrad.addColorStop(0, '#FFFDE0');
  faceGrad.addColorStop(1, C.face);
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(0, -36, 28, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ─── Gozler ───
  const eyeY = -44;
  const eyeOffset = 14;

  // Sol goz
  ctx.save();
  ctx.scale(eyeScale, eyeScale);
  ctx.fillStyle = C.eyeDark;
  ctx.beginPath();
  ctx.arc(-eyeOffset / eyeScale, eyeY / eyeScale, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.eyeShine;
  ctx.beginPath();
  ctx.arc((-eyeOffset + 3) / eyeScale, (eyeY - 3) / eyeScale, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc((-eyeOffset - 2) / eyeScale, (eyeY + 2) / eyeScale, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Sag goz
  ctx.save();
  ctx.scale(eyeScale, eyeScale);
  ctx.fillStyle = C.eyeDark;
  ctx.beginPath();
  ctx.arc(eyeOffset / eyeScale, eyeY / eyeScale, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.eyeShine;
  ctx.beginPath();
  ctx.arc((eyeOffset + 3) / eyeScale, (eyeY - 3) / eyeScale, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc((eyeOffset - 2) / eyeScale, (eyeY + 2) / eyeScale, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ─── Yanaklar ───
  if (blush) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = C.cheek;
    ctx.beginPath();
    ctx.ellipse(-26, -32, 10, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(26, -32, 10, 7, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ─── Agiz ───
  ctx.save();
  ctx.strokeStyle = C.eyeDark;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  if (mouth === 'smile') {
    ctx.beginPath();
    ctx.arc(0, -26, 10, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else if (mouth === 'open') {
    ctx.fillStyle = '#CC3300';
    ctx.beginPath();
    ctx.ellipse(0, -24, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF6644';
    ctx.beginPath();
    ctx.ellipse(0, -22, 6, 4, 0, 0, Math.PI);
    ctx.fill();
  } else if (mouth === 'huge') {
    ctx.fillStyle = '#CC3300';
    ctx.beginPath();
    ctx.ellipse(0, -23, 14, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.fillRect(-9, -27, 18, 5);
    ctx.fillStyle = '#FF6644';
    ctx.beginPath();
    ctx.ellipse(0, -19, 8, 5, 0, 0, Math.PI);
    ctx.fill();
  } else if (mouth === 'side') {
    ctx.beginPath();
    ctx.arc(5, -26, 8, 0.3, Math.PI - 0.5);
    ctx.stroke();
  }
  ctx.restore();

  // ─── Gozluk ───
  const gy = -60 + goggleY;
  // Kayis
  ctx.save();
  ctx.fillStyle = C.goggle;
  ctx.beginPath();
  ctx.roundRect(-44, gy - 5, 88, 12, 4);
  ctx.fill();
  ctx.restore();
  // Sol lens
  ctx.save();
  ctx.fillStyle = C.goggleLens;
  ctx.beginPath();
  ctx.ellipse(-18, gy, 16, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.goggleShine;
  ctx.beginPath();
  ctx.ellipse(-22, gy - 4, 7, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.goggle;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // Sag lens
  ctx.save();
  ctx.fillStyle = C.goggleLens;
  ctx.beginPath();
  ctx.ellipse(18, gy, 16, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.goggleShine;
  ctx.beginPath();
  ctx.ellipse(14, gy - 4, 7, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.goggle;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // ─── Yildiz / sparkle ───
  if (sparkle) {
    const stars = [
      { x: -55, y: -55, r: 6 },
      { x: 58, y: -50, r: 5 },
      { x: -60, y: 10, r: 4 },
      { x: 62, y: 15, r: 4 },
    ];
    stars.forEach(({ x, y, r }) => {
      ctx.save();
      ctx.fillStyle = C.lightning;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        const ai = a + Math.PI / 4;
        i === 0
          ? ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
          : ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
        ctx.lineTo(
          x + (r * 0.4) * Math.cos(ai),
          y + (r * 0.4) * Math.sin(ai)
        );
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  // ─── Simsek ───
  if (lightning) {
    ctx.save();
    ctx.fillStyle = C.lightning;
    ctx.strokeStyle = C.orange;
    ctx.lineWidth = 1;
    // Sol simsek
    ctx.beginPath();
    ctx.moveTo(-58, -10);
    ctx.lineTo(-48, 5);
    ctx.lineTo(-53, 5);
    ctx.lineTo(-43, 22);
    ctx.lineTo(-52, 22);
    ctx.lineTo(-38, 40);
    ctx.lineTo(-50, 18);
    ctx.lineTo(-45, 18);
    ctx.lineTo(-55, 2);
    ctx.lineTo(-50, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Sag simsek
    ctx.beginPath();
    ctx.moveTo(58, -10);
    ctx.lineTo(48, 5);
    ctx.lineTo(53, 5);
    ctx.lineTo(43, 22);
    ctx.lineTo(52, 22);
    ctx.lineTo(38, 40);
    ctx.lineTo(50, 18);
    ctx.lineTo(45, 18);
    ctx.lineTo(55, 2);
    ctx.lineTo(50, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore(); // ana translate
}

// ─── Her mood icin animasyon frame'leri ───

const moods = {
  idle: {
    frames: 30,
    delay: 60,
    draw(ctx, i, total) {
      const t = i / total;
      const bob = Math.sin(t * Math.PI * 2) * 4;
      const blink = (i === 20 || i === 21) ? 0.08 : 1;
      drawZep(ctx, {
        bodyY: bob,
        armLAngle: Math.sin(t * Math.PI * 2) * 12,
        armRAngle: -Math.sin(t * Math.PI * 2) * 12,
        mouth: 'smile',
        eyeScale: blink,
        blush: false,
        goggleY: bob * 0.3,
      });
    },
  },

  happy: {
    frames: 24,
    delay: 55,
    draw(ctx, i, total) {
      const t = i / total;
      const bob = Math.sin(t * Math.PI * 4) * 6;
      drawZep(ctx, {
        bodyY: bob,
        armLAngle: -30 + Math.sin(t * Math.PI * 4) * 15,
        armRAngle: 30 - Math.sin(t * Math.PI * 4) * 15,
        mouth: 'open',
        blush: true,
        sparkle: i % 6 < 3,
        goggleY: bob * 0.4,
      });
    },
  },

  excited: {
    frames: 20,
    delay: 45,
    draw(ctx, i, total) {
      const t = i / total;
      const jump = Math.abs(Math.sin(t * Math.PI * 2)) * -18;
      const tilt = Math.sin(t * Math.PI * 2) * 8;
      drawZep(ctx, {
        bodyY: jump,
        armLAngle: -50 + Math.sin(t * Math.PI * 2) * 20,
        armRAngle: 50 - Math.sin(t * Math.PI * 2) * 20,
        legLAngle: Math.sin(t * Math.PI * 2) * 25,
        legRAngle: -Math.sin(t * Math.PI * 2) * 25,
        mouth: 'huge',
        blush: true,
        sparkle: true,
        lightning: i % 4 < 2,
        bodyRotate: tilt,
        goggleY: jump * 0.2,
      });
    },
  },

  proud: {
    frames: 30,
    delay: 60,
    draw(ctx, i, total) {
      const t = i / total;
      const bob = Math.sin(t * Math.PI * 2) * 3;
      const blink = (i === 22 || i === 23) ? 0.1 : 1;
      drawZep(ctx, {
        bodyY: bob - 5,
        armLAngle: -60,
        armRAngle: 20,
        mouth: 'smile',
        eyeScale: blink,
        blush: true,
        sparkle: i % 8 < 4,
        goggleY: bob * 0.2,
      });
    },
  },

  thinking: {
    frames: 36,
    delay: 65,
    draw(ctx, i, total) {
      const t = i / total;
      const tilt = Math.sin(t * Math.PI) * 6;
      const blink = (i === 28 || i === 29) ? 0.1 : 1;
      drawZep(ctx, {
        bodyY: 0,
        armLAngle: 15,
        armRAngle: -40,
        mouth: 'side',
        eyeScale: blink,
        blush: false,
        bodyRotate: tilt,
      });
      // Dusunce baloncuklari
      const canvas = ctx.canvas;
      const cx = canvas.width / 2;
      const base = 125;
      ctx.save();
      const alpha = 0.4 + Math.sin(t * Math.PI * 2) * 0.3;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 1.5;
      [[cx + 45, base - 90, 5], [cx + 55, base - 105, 7], [cx + 68, base - 118, 10]].forEach(([x, y, r]) => {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      ctx.fillStyle = '#7c3aed';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('?', cx + 68, base - 114);
      ctx.restore();
    },
  },
};

// ─── GIF olustur ───
async function exportGif(name, mood) {
  // Seffaflik icin: transparan renk olarak parlak magenta kullan, sonra mask uygula
  const TRANSPARENT = 0xFF00FF; // magenta — karakterde bu renk yok
  const encoder = new GIFEncoder(W, H, 'neuquant', true);
  const outPath = path.join(OUT_DIR, `${name}.gif`);
  const stream = fs.createWriteStream(outPath);
  encoder.createReadStream().pipe(stream);
  encoder.start();
  encoder.setRepeat(0);
  encoder.setQuality(6);
  encoder.setTransparent(TRANSPARENT);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < mood.frames; i++) {
    // Once magenta ile doldur (seffaf renk)
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#FF00FF';
    ctx.fillRect(0, 0, W, H);
    mood.draw(ctx, i, mood.frames);
    encoder.setDelay(mood.delay);
    encoder.addFrame(ctx);
  }

  encoder.finish();

  await new Promise((resolve) => stream.on('finish', resolve));
  console.log(`✓ ${outPath}`);
}

async function main() {
  console.log('Zep GIFleri olusturuluyor...');
  for (const [name, mood] of Object.entries(moods)) {
    await exportGif(name, mood);
  }
  console.log('\nTamamlandi! public/kids/mascot/ klasorune kaydedildi.');
}

main().catch(console.error);
