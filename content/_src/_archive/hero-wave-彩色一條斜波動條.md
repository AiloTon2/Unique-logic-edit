# Hero Wave 存檔 — 「彩色一條斜波動條」

保存日期：2026-07-09
說明：這是升級版的 Technology Wave（自由浮動、旋轉 -38°、多條彩色斜向波動條 +
流動 sheen + 發光光球 + 粒子）。若日後想還原此版本，把下列 HTML 放回 hero
（取代目前的兩條弧線版本），並把下列 CSS 放回 `seo-geo-free-trial.css` 的
「Technology Wave」段落即可。

---

## HTML（位於 `.lp-hero` 內，`.lp-hero-content` 之前）

```html
<div class="lp-tech-wave" aria-hidden="true">
  <div class="lp-wave-glow lp-wave-glow-1"></div>
  <div class="lp-wave-glow lp-wave-glow-2"></div>

  <svg class="lp-wave-svg" viewBox="0 0 1200 420" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lpWaveGrad1" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="var(--lp-wave-a)"/>
        <stop offset="50%" stop-color="var(--lp-wave-b)"/>
        <stop offset="100%" stop-color="var(--lp-wave-c)"/>
      </linearGradient>
      <linearGradient id="lpWaveGrad2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="var(--lp-wave-b)"/>
        <stop offset="100%" stop-color="var(--lp-wave-c)"/>
      </linearGradient>
      <linearGradient id="lpWaveGrad3" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="var(--lp-wave-c)"/>
        <stop offset="100%" stop-color="var(--lp-wave-a)"/>
      </linearGradient>
    </defs>
    <g class="lp-wave lp-wave-bg">
      <path d="M-400,230 Q-320,150 -240,230 Q-160,310 -80,230 Q0,150 80,230 Q160,310 240,230 Q320,150 400,230 Q480,310 560,230 Q640,150 720,230 Q800,310 880,230 Q960,150 1040,230 Q1120,310 1200,230 Q1280,150 1360,230 Q1440,310 1520,230" fill="none" stroke="url(#lpWaveGrad3)" stroke-width="2"/>
    </g>
    <g class="lp-wave lp-wave-mid">
      <path d="M-400,210 Q-320,110 -240,210 Q-160,310 -80,210 Q0,110 80,210 Q160,310 240,210 Q320,110 400,210 Q480,310 560,210 Q640,110 720,210 Q800,310 880,210 Q960,110 1040,210 Q1120,310 1200,210 Q1280,110 1360,210 Q1440,310 1520,210" fill="none" stroke="url(#lpWaveGrad1)" stroke-width="4"/>
    </g>
    <g class="lp-wave lp-wave-fg">
      <path d="M-400,200 Q-340,150 -280,200 Q-220,250 -160,200 Q-100,150 -40,200 Q20,250 80,200 Q140,150 200,200 Q260,250 320,200 Q380,150 440,200 Q500,250 560,200 Q620,150 680,200 Q740,250 800,200 Q860,150 920,200 Q980,250 1040,200 Q1100,150 1160,200 Q1220,250 1280,200 Q1340,150 1400,200" fill="none" stroke="url(#lpWaveGrad2)" stroke-width="2"/>
    </g>
  </svg>

  <div class="lp-wave-sheen"></div>

  <div class="lp-particles">
    <span class="lp-particle"></span>
    <span class="lp-particle"></span>
    <span class="lp-particle"></span>
    <span class="lp-particle"></span>
    <span class="lp-particle"></span>
    <span class="lp-particle"></span>
    <span class="lp-particle"></span>
    <span class="lp-particle"></span>
    <span class="lp-particle"></span>
    <span class="lp-particle"></span>
    <span class="lp-particle"></span>
    <span class="lp-particle"></span>
  </div>
</div>
```

## CSS

```css
.lp-tech-wave {
  position: absolute;
  top: -12%;
  left: -18%;
  width: 136%;
  height: 128%;
  transform: rotate(-38deg) scale(1.12);
  transform-origin: center;
  pointer-events: none;
  z-index: 1;
}
.lp-wave-glow { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.5; will-change: transform; }
.lp-wave-glow-1 { width: 46%; height: 46%; top: 8%; left: 12%; background: radial-gradient(circle, var(--accent-cyan), transparent 68%); animation: lpGlowDrift 12s ease-in-out infinite; }
.lp-wave-glow-2 { width: 52%; height: 52%; bottom: 4%; right: 8%; background: radial-gradient(circle, var(--accent-purple), transparent 68%); animation: lpGlowDrift 15s ease-in-out infinite reverse; }
.lp-wave-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.lp-wave { will-change: transform; }
.lp-wave-bg { opacity: 0.35; animation: lpWaveFlow 26s linear infinite; }
.lp-wave-mid { opacity: 0.9; filter: drop-shadow(0 0 8px rgba(168,85,247,.55)) drop-shadow(0 0 4px rgba(0,212,232,.5)); animation: lpWaveFlow 16s linear infinite; }
.lp-wave-fg { opacity: 0.85; filter: drop-shadow(0 0 6px rgba(0,212,232,.6)); animation: lpWaveFlow 10s linear infinite; }
@keyframes lpWaveFlow { from { transform: translateX(0); } to { transform: translateX(-320px); } }
@keyframes lpGlowDrift { 0%,100% { transform: translate(0,0) scale(1); opacity:.45; } 50% { transform: translate(6%,-6%) scale(1.15); opacity:.65; } }
.lp-wave-sheen { position: absolute; top:-20%; left:-60%; width:60%; height:140%; background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,.55) 50%, transparent 100%); filter: blur(6px); transform: skewX(-12deg); animation: lpSheen 7s ease-in-out infinite; }
@keyframes lpSheen { 0% { left:-60%; opacity:0; } 35% { opacity:.9; } 70% { left:120%; opacity:0; } 100% { left:120%; opacity:0; } }
```
