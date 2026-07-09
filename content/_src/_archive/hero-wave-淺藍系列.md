# Hero Wave 存檔 — 「淺藍系列」

保存日期：2026-07-09
說明：藍色單色版 Technology Wave（多條扭紋弧線 + 沿線流光 + 藍色發光光球 + 藍色粒子，
整體場景旋轉 -38°）。這是「加入旋轉動畫 + 更換 Glow 2 顏色」之前的版本。
若日後想還原此版本，把下列 HTML 放回 `.lp-hero`（取代目前的波動線版本），
並把下列 CSS 放回 `seo-geo-free-trial.css` 的「Technology Wave」段落即可。

特徵：
- 弧線：藍色單色（deep/mid/light/cyan-blue），右下叢集塞進角落、左上叢集細小
- 流光：一段亮淺藍光沿曲線由右→左、上→下流動（stroke-dasharray + dashoffset）
- 粒子：全藍色調
- Glow 1：#64C8FF（右下）；Glow 2：#3296FF（左上，深藍）
- 弧線本身「靜止」，只有流光在動（尚未加入旋轉）

---

## HTML（位於 `.lp-hero` 內，`.lp-hero-content` 之前）

```html
<div class="lp-tech-wave" aria-hidden="true">
  <div class="lp-wave-glow lp-wave-glow-1"></div>
  <div class="lp-wave-glow lp-wave-glow-2"></div>

  <svg class="lp-wave-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lpBlue1" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(0,220,255,0.45)"/>
        <stop offset="100%" stop-color="rgba(30,100,255,0.30)"/>
      </linearGradient>
      <linearGradient id="lpBlue2" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(100,200,255,0.45)"/>
        <stop offset="100%" stop-color="rgba(50,150,255,0.28)"/>
      </linearGradient>
      <linearGradient id="lpBlue3" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(180,235,255,0.40)"/>
        <stop offset="100%" stop-color="rgba(0,180,255,0.26)"/>
      </linearGradient>
    </defs>

    <!-- Bottom-right cluster -->
    <g class="lp-arc lp-arc-b1">
      <path class="lp-arc-base" d="M1195,780 C980,600 760,560 520,470" stroke="url(#lpBlue1)" stroke-width="9"/>
      <path class="lp-arc-flow" d="M1195,780 C980,600 760,560 520,470"/>
    </g>
    <g class="lp-arc lp-arc-b2">
      <path class="lp-arc-base" d="M1205,655 C1010,520 800,470 560,540" stroke="url(#lpBlue2)" stroke-width="6"/>
      <path class="lp-arc-flow" d="M1205,655 C1010,520 800,470 560,540"/>
    </g>
    <g class="lp-arc lp-arc-b3">
      <path class="lp-arc-base" d="M1120,800 C1000,660 840,600 620,610" stroke="url(#lpBlue3)" stroke-width="4"/>
      <path class="lp-arc-flow" d="M1120,800 C1000,660 840,600 620,610"/>
    </g>
    <g class="lp-arc lp-arc-b4">
      <path class="lp-arc-base" d="M1190,720 C1030,610 900,520 700,560" stroke="url(#lpBlue2)" stroke-width="2.5"/>
      <path class="lp-arc-flow" d="M1190,720 C1030,610 900,520 700,560"/>
    </g>

    <!-- Top-left cluster -->
    <g class="lp-arc lp-arc-t1">
      <path class="lp-arc-base" d="M760,150 C520,240 300,180 80,70" stroke="url(#lpBlue1)" stroke-width="2.5"/>
      <path class="lp-arc-flow" d="M760,150 C520,240 300,180 80,70"/>
    </g>
    <g class="lp-arc lp-arc-t2">
      <path class="lp-arc-base" d="M620,205 C430,250 250,235 60,150" stroke="url(#lpBlue3)" stroke-width="2"/>
      <path class="lp-arc-flow" d="M620,205 C430,250 250,235 60,150"/>
    </g>
  </svg>

  <div class="lp-particles"> … 12 個 .lp-particle … </div>
</div>
```

---

## CSS（`seo-geo-free-trial.css` 的 Technology Wave 段落）

重點值：
- `.lp-tech-wave { top:-12%; left:-18%; width:136%; height:128%; transform:rotate(-38deg) scale(1.12); z-index:0; }`
- `.lp-wave-glow-1 { bottom:6%; right:8%; background:radial-gradient(circle,#64C8FF,transparent 68%); }`
- `.lp-wave-glow-2 { top:8%; left:10%; background:radial-gradient(circle,#3296FF,transparent 68%); }`
- 弧線本身無旋轉動畫；`.lp-arc-flow` 用 `stroke-dasharray:46 2200` + `@keyframes lpFlow{from{stroke-dashoffset:0}to{stroke-dashoffset:-2246}}` 做流光。
- 粒子顏色：#64C8FF / #3296FF / #00DCFF / #B4EBFF。
