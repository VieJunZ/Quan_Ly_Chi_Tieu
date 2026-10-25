/**
 * @file pet.js
 * @description "Thú cưng ví tiền" & Hệ thống 10 Linh Thú Thần Thoại và 50 Skin Chuyên Biệt.
 * Hỗ trợ biểu cảm động theo tâm trạng (happy, chill, party, worried, sad, crying, sleeping),
 * các bộ trang phục (Skin) cao cấp, và trang bị phụ kiện (mũ, kính, bùa trán, cầm tay, bệ đứng, hào quang).
 */

import { tr } from "./i18n.js";

const INK = "#3b2a5a";

const EYES = {
  happy: `
    <g class="blink"><circle cx="80" cy="136" r="7.5" fill="${INK}"/><circle cx="82.5" cy="133.5" r="2.6" fill="#fff"/></g>
    <g class="blink"><circle cx="120" cy="136" r="7.5" fill="${INK}"/><circle cx="122.5" cy="133.5" r="2.6" fill="#fff"/></g>`,
  party: `
    <path d="M71 139 Q80 127 89 139" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M111 139 Q120 127 129 139" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`,
  chill: `
    <path d="M64 128 H136 V132 H64Z" fill="#2a1f40"/>
    <rect x="66" y="128" width="28" height="17" rx="7" fill="#2a1f40"/>
    <rect x="106" y="128" width="28" height="17" rx="7" fill="#2a1f40"/>
    <path d="M71 132 l7 0" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>
    <path d="M111 132 l7 0" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`,
  sleeping: `
    <path d="M71 135 Q80 143 89 135" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <path d="M111 135 Q120 143 129 135" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  sad: `
    <path d="M70 124 L88 129" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M130 124 L112 129" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="80" cy="139" r="6" fill="${INK}"/><circle cx="82" cy="137" r="2" fill="#fff"/>
    <circle cx="120" cy="139" r="6" fill="${INK}"/><circle cx="122" cy="137" r="2" fill="#fff"/>`,
  crying: `
    <path d="M72 130 L87 137 L72 144" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M128 130 L113 137 L128 144" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="tear" d="M76 148 q-5 9 0 12 q5 -3 0 -12z" fill="#7fc8ff"/>
    <path class="tear r" d="M124 148 q-5 9 0 12 q5 -3 0 -12z" fill="#7fc8ff"/>`,
  worried: `
    <path d="M70 126 Q78 120 88 125" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M130 126 Q122 120 112 125" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="80" cy="138" r="8" fill="#fff"/><circle cx="80" cy="139" r="4.2" fill="${INK}"/>
    <circle cx="120" cy="138" r="8" fill="#fff"/><circle cx="120" cy="139" r="4.2" fill="${INK}"/>
    <path class="sweat" d="M146 110 q-6 10 0 13 q6 -3 0 -13z" fill="#9fd8ff"/>`
};

const MOUTHS = {
  happy: `<path d="M88 151 Q100 163 112 151" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  party: `<path d="M86 149 Q100 171 114 149 Z" fill="#7a2d55"/><path d="M93 158 Q100 166 107 158 Q100 155 93 158Z" fill="#ff8fb1"/>`,
  chill: `<path d="M90 155 Q103 160 113 150" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  sleeping: `<ellipse cx="100" cy="155" rx="4.5" ry="5.5" fill="#7a2d55"/>`,
  sad: `<path d="M89 159 Q100 149 111 159" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  crying: `<path d="M86 160 Q100 143 114 160 Z" fill="#7a2d55"/>`,
  worried: `<path d="M86 156 q5 -5 10 0 t10 0 t10 0" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`
};

const EXTRAS = {
  sleeping: `<g class="zzz" fill="${INK}" font-family="Baloo 2, sans-serif" font-weight="800">
      <text x="146" y="70" font-size="18">z</text><text x="156" y="56" font-size="22">z</text><text x="168" y="40" font-size="26">Z</text></g>`,
  party: `<g transform="translate(100 30)">
      <path d="M-20 34 L0 -14 L20 34 Z" fill="#ffe58a" stroke="#ff9f5a" stroke-width="2"/>
      <path d="M-13 18 L13 18 M-8 6 L8 6" stroke="#ff7eb9" stroke-width="5"/>
      <circle cx="0" cy="-16" r="6" fill="#ff7eb9"/></g>`
};

function accessory(level, mood) {
  if (mood === "party") return "";
  if (level >= 7) {
    return `<g transform="translate(100 52)"><path d="M-22 8 L-24 -14 L-11 -4 L0 -20 L11 -4 L24 -14 L22 8 Z" fill="#ffd25a" stroke="#f0a020" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="0" cy="-2" r="3.5" fill="#ff7eb9"/></g>`;
  }
  if (level >= 4) {
    return `<g transform="translate(132 66) rotate(18)"><path d="M0 0 L-16 -10 L-16 10 Z M0 0 L16 -10 L16 10 Z" fill="#ff7eb9"/><circle r="5" fill="#ff5fa8"/></g>`;
  }
  if (level >= 2) {
    return `<g transform="translate(100 64)"><path d="M0 0 Q0 -14 0 -20" stroke="#3cc26b" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M0 -14 Q-14 -24 -18 -12 Q-8 -8 0 -14Z" fill="#7ee8a0"/><path d="M0 -18 Q12 -30 18 -18 Q8 -12 0 -18Z" fill="#a6ec8f"/></g>`;
  }
  return "";
}

const BODY_COLORS = {
  crying: ["#cfc3ef", "#a9b8ff"],
  sad: ["#e6c3f0", "#b5b2ff"],
  sleeping: ["#e8cdf6", "#c5b5f2"]
};

const PET_ITEMS = {
  // Mũ & Đầu
  hat_grad: `<g transform="translate(100 50)">
    <polygon points="0,-24 44,-8 0,8 -44,-8" fill="#1e1e24"/>
    <path d="M-28,-4 Q0,10 28,-4 L24,6 Q0,18 -24,6 Z" fill="#111116"/>
    <circle cx="0" cy="-8" r="2.5" fill="#f5b041"/>
    <path d="M0,-8 L26,2 L28,14" stroke="#f5b041" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>`,
  hat_crown: `<g transform="translate(100 48)">
    <path d="M-28,14 L-32,-12 L-16,0 L0,-18 L16,0 L32,-12 L28,14 Z" fill="#ffd25a" stroke="#f0a020" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="-16" cy="-4" r="3" fill="#ff4d4f"/>
    <circle cx="0" cy="-10" r="3.5" fill="#1890ff"/>
    <circle cx="16" cy="-4" r="3" fill="#52c41a"/>
  </g>`,
  hat_sprout: `<g transform="translate(100 64)">
    <path d="M0,0 Q0,-16 0,-24" stroke="#2b8a3e" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M0,-16 Q-18,-28 -20,-14 Q-10,-8 0,-16Z" fill="#51cf66"/>
    <path d="M0,-20 Q18,-34 20,-20 Q10,-12 0,-20Z" fill="#8ce99a"/>
  </g>`,
  hat_cat: `<g transform="translate(100 50)">
    <polygon points="-44,16 -54,-18 -24,-4" fill="#ffadd2" stroke="#eb2f96" stroke-width="1.8"/>
    <polygon points="-42,10 -48,-10 -30,-2" fill="#fff"/>
    <polygon points="44,16 54,-18 24,-4" fill="#ffadd2" stroke="#eb2f96" stroke-width="1.8"/>
    <polygon points="42,10 48,-10 30,-2" fill="#fff"/>
  </g>`,
  hat_ribbon: `<g transform="translate(100 52)">
    <path d="M0,0 L-20,-12 L-20,12 Z M0,0 L20,-12 L20,12 Z" fill="#ff7eb9" stroke="#eb2f96" stroke-width="1.5"/>
    <circle r="6" fill="#ff4081"/>
    <path d="M-5,4 L-14,22 M5,4 L14,22" stroke="#ff7eb9" stroke-width="3.5" stroke-linecap="round"/>
  </g>`,

  // Kính & Mặt
  face_pixel: `<g>
    <path d="M58 126 H142 V133 H126 V139 H108 V133 H92 V139 H74 V133 H58 Z" fill="#111"/>
    <rect x="62" y="128" width="6" height="4" fill="#fff" opacity=".85"/>
    <rect x="110" y="128" width="6" height="4" fill="#fff" opacity=".85"/>
  </g>`,
  face_glasses: `<g>
    <circle cx="80" cy="136" r="14" fill="none" stroke="#4dabf7" stroke-width="3"/>
    <circle cx="120" cy="136" r="14" fill="none" stroke="#4dabf7" stroke-width="3"/>
    <path d="M94 136 H106" stroke="#4dabf7" stroke-width="3"/>
    <line x1="66" y1="134" x2="54" y2="130" stroke="#4dabf7" stroke-width="2.5"/>
    <line x1="134" y1="134" x2="146" y2="130" stroke="#4dabf7" stroke-width="2.5"/>
  </g>`,
  face_sleep: `<g>
    <rect x="60" y="124" width="80" height="24" rx="12" fill="#b197fc" stroke="#7950f2" stroke-width="2"/>
    <path d="M70 136 Q80 144 90 136" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M110 136 Q120 144 130 136" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>`,
  face_patch: `<g>
    <rect x="52" y="142" width="22" height="11" rx="4" transform="rotate(-18 63 147)" fill="#ffd8a8" stroke="#e8590c" stroke-width="1.2"/>
    <circle cx="59" cy="146" r="1" fill="#e8590c"/><circle cx="63" cy="147" r="1" fill="#e8590c"/><circle cx="67" cy="148" r="1" fill="#e8590c"/>
  </g>`,

  // Biểu tượng trán (Emblem)
  emblem_coin: `<g class="coin">
    <circle cx="100" cy="117" r="13" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>
    <circle cx="100" cy="117" r="11" fill="none" stroke="#fef08a" stroke-width="1" stroke-dasharray="2 1"/>
    <rect x="96" y="113" width="8" height="8" rx="1" fill="#78350f"/>
  </g>`,
  emblem_flame: `<g class="coin">
    <circle cx="100" cy="117" r="12" fill="#fff4e6" stroke="#ff922b" stroke-width="2"/>
    <path d="M100 107 Q107 114 106 120 Q105 126 100 126 Q95 126 94 120 Q93 114 100 107Z" fill="#ff6b6b"/>
    <path d="M100 115 Q104 119 103 123 Q100 125 98 123 Q97 119 100 115Z" fill="#ffd43b"/>
  </g>`,
  emblem_diamond: `<g class="coin">
    <circle cx="100" cy="117" r="12" fill="#e7f5ff" stroke="#339af0" stroke-width="2"/>
    <polygon points="100,108 108,114 105,124 95,124 92,114" fill="#4dabf7"/>
    <polygon points="100,108 105,114 100,124 95,114" fill="#a5d8ff"/>
  </g>`,
  emblem_lightning: `<g class="coin">
    <circle cx="100" cy="117" r="12" fill="#fff9db" stroke="#fcc419" stroke-width="2"/>
    <polygon points="101,108 94,117 99,117 98,125 106,115 101,115" fill="#fab005"/>
  </g>`,

  // Cầm tay (Held)
  held_boba: `<g transform="translate(154 120)">
    <path d="M0,8 L16,8 L13,28 L3,28 Z" fill="#ffe8cc" stroke="#d9480f" stroke-width="1.2"/>
    <path d="M8,0 L8,10" stroke="#ff922b" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="6" cy="24" r="1.5" fill="#5c2c16"/><circle cx="10" cy="24" r="1.5" fill="#5c2c16"/><circle cx="8" cy="21" r="1.5" fill="#5c2c16"/>
  </g>`,
  held_calculator: `<g transform="translate(152 120)">
    <rect x="0" y="0" width="18" height="26" rx="3.5" fill="#1e293b" stroke="#475569" stroke-width="1.2"/>
    <rect x="2.5" y="2.5" width="13" height="6" rx="1.5" fill="#86efac"/>
    <text x="14" y="7" font-size="4.5" font-family="monospace" font-weight="900" fill="#065f46" text-anchor="end">999k</text>
    <circle cx="4.5" cy="12" r="1.3" fill="#f43f5e"/>
    <circle cx="9" cy="12" r="1.3" fill="#fbbf24"/>
    <circle cx="13.5" cy="12" r="1.3" fill="#38bdf8"/>
    <circle cx="4.5" cy="16" r="1.3" fill="#94a3b8"/><circle cx="9" cy="16" r="1.3" fill="#94a3b8"/><circle cx="13.5" cy="16" r="1.3" fill="#94a3b8"/>
    <circle cx="4.5" cy="20" r="1.3" fill="#94a3b8"/><circle cx="9" cy="20" r="1.3" fill="#94a3b8"/><rect x="12" y="18.8" width="3.2" height="4.5" rx="1" fill="#3b82f6"/>
  </g>`,
  held_card: `<g transform="translate(150 120) rotate(-12)">
    <rect x="0" y="0" width="26" height="17" rx="3" fill="#09090b" stroke="#fbbf24" stroke-width="1.2"/>
    <rect x="3.5" y="4" width="5.5" height="4" rx="1" fill="#fbbf24"/>
    <line x1="3.5" y1="11" x2="16" y2="11" stroke="#fef08a" stroke-width="1" stroke-dasharray="2 1"/>
    <text x="23" y="14" font-size="4" font-weight="900" fill="#fbbf24" text-anchor="end" font-family="sans-serif">VIP</text>
  </g>`,
  held_noddles: `<g transform="translate(152 120)">
    <path d="M 0 6 L 18 6 L 15 26 L 3 26 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="1.2"/>
    <ellipse cx="9" cy="6" rx="9" ry="2.5" fill="#fef08a"/>
    <path d="M 4 5 Q 9 2 14 5" stroke="#f59e0b" stroke-width="2" fill="none"/>
    <line x1="12" y1="-2" x2="6" y2="14" stroke="#d97706" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M 6 0 C 6 -4 9 -5 9 -8 M 11 0 C 11 -4 14 -5 14 -8" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  </g>`,
  held_wand: `<g transform="translate(154 114) rotate(-15)">
    <line x1="0" y1="28" x2="0" y2="0" stroke="#fcc419" stroke-width="3" stroke-linecap="round"/>
    <polygon points="0,-8 2.5,-2 8,-2 3.5,1.5 5.5,7 0,3.5 -5.5,7 -3.5,1.5 -8,-2 -2.5,-2" fill="#ffd43b" stroke="#f59f00" stroke-width="1"/>
  </g>`,
  held_sword: `<g transform="translate(154 112) rotate(25)">
    <path d="M-3,4 L0,-24 L3,4 Z" fill="#e9ecef" stroke="#868e96" stroke-width="1"/>
    <line x1="-8" y1="4" x2="8" y2="4" stroke="#ffd43b" stroke-width="3" stroke-linecap="round"/>
    <line x1="0" y1="4" x2="0" y2="14" stroke="#862e9c" stroke-width="2.5"/>
    <circle cx="0" cy="15" r="2" fill="#ffd43b"/>
  </g>`,
  held_coffee: `<g transform="translate(152 126)">
    <path d="M0,4 L14,4 L12,20 L2,20 Z" fill="#fff" stroke="#adb5bd" stroke-width="1.2"/>
    <rect x="-1" y="2" width="16" height="3" rx="1.5" fill="#2b8a3e"/>
    <rect x="1" y="9" width="12" height="6" fill="#2b8a3e"/>
  </g>`,

  // Bệ đứng (Pedestal)
  ped_cloud: `<g class="ped-cloud" transform="translate(100 188)">
    <ellipse cx="0" cy="2" rx="54" ry="8" fill="rgba(147, 197, 253, 0.3)"/>
    <ellipse cx="0" cy="0" rx="48" ry="7" fill="rgba(219, 234, 254, 0.5)"/>
    <circle cx="-28" cy="-3" r="14" fill="#ffffff" opacity="0.95"/>
    <circle cx="-12" cy="-8" r="16" fill="#ffffff"/>
    <circle cx="10" cy="-7" r="17" fill="#ffffff"/>
    <circle cx="30" cy="-2" r="13" fill="#ffffff" opacity="0.95"/>
  </g>`,
  ped_lotus: `<g class="ped-lotus" transform="translate(100 187)">
    <ellipse cx="0" cy="3" rx="58" ry="9" fill="rgba(16, 185, 129, 0.25)"/>
    <path d="M-44,1 C-25,-15 0,2 0,2 C0,2 25,-15 44,1 C30,12 0,4 0,4 C0,4 -30,12 -44,1 Z" fill="#fda4af" stroke="#f43f5e" stroke-width="1.2"/>
    <path d="M-28,-2 C-14,-18 0,-4 0,-4 C0,-4 14,-18 28,-2 C18,6 0,0 0,0 C0,0 -18,6 -28,-2 Z" fill="#fff1f2"/>
    <ellipse cx="0" cy="0" rx="14" ry="4" fill="#fef08a"/>
  </g>`,
  ped_coins: `<g class="ped-coins">
    <ellipse cx="100" cy="190" rx="60" ry="10" fill="rgba(180, 83, 9, 0.3)"/>
    <ellipse cx="74" cy="190" rx="15" ry="5.5" fill="#d97706"/><ellipse cx="74" cy="188" rx="15" ry="5.5" fill="#facc15"/>
    <ellipse cx="126" cy="190" rx="15" ry="5.5" fill="#d97706"/><ellipse cx="126" cy="188" rx="15" ry="5.5" fill="#facc15"/>
    <ellipse cx="90" cy="192" rx="17" ry="6" fill="#d97706"/><ellipse cx="90" cy="190" rx="17" ry="6" fill="#fbbf24"/>
    <ellipse cx="110" cy="192" rx="17" ry="6" fill="#d97706"/><ellipse cx="110" cy="190" rx="17" ry="6" fill="#fde047"/>
    <ellipse cx="100" cy="188" rx="20" ry="6.5" fill="#ca8a04"/><ellipse cx="100" cy="186" rx="20" ry="6.5" fill="#fef08a"/>
  </g>`,
  ped_gold: `<g class="ped-coins">
    <ellipse cx="100" cy="188" rx="60" ry="10" fill="#ffd43b"/>
    <ellipse cx="100" cy="186" rx="52" ry="7" fill="#ffe066"/>
    <ellipse cx="100" cy="185" rx="42" ry="5" fill="#fff3bf"/>
  </g>`,
  ped_redcarpet: `<g class="ped-redcarpet">
    <ellipse cx="100" cy="189" rx="68" ry="12" fill="#991b1b" stroke="#f59e0b" stroke-width="2"/>
    <ellipse cx="100" cy="188" rx="62" ry="9" fill="#dc2626"/>
    <path d="M42 188 L158 188" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4 4"/>
  </g>`,
  ped_gold_throne: `<g class="ped-throne" transform="translate(100 186)">
    <rect x="-48" y="-8" width="96" height="14" rx="4" fill="#d97706" stroke="#b45309" stroke-width="1.5"/>
    <rect x="-42" y="-12" width="84" height="10" rx="3" fill="#f59e0b" stroke="#d97706" stroke-width="1.2"/>
    <ellipse cx="0" cy="-12" rx="38" ry="6" fill="#fde047"/>
    <circle cx="-34" cy="-1" r="3" fill="#ef4444"/><circle cx="34" cy="-1" r="3" fill="#ef4444"/>
    <circle cx="0" cy="-1" r="3.5" fill="#3b82f6"/>
  </g>`,
  ped_ice: `<g class="ped-ice" transform="translate(100 188)">
    <polygon points="-58,-2 -40,-12 40,-12 58,-2 44,8 -44,8" fill="#bae6fd" stroke="#0284c7" stroke-width="1.5" opacity="0.85"/>
    <polygon points="-40,-12 0,-15 40,-12 0,-9" fill="#e0f2fe" opacity="0.9"/>
    <line x1="-20" y1="-2" x2="20" y2="-2" stroke="#fff" stroke-width="2" opacity="0.7"/>
  </g>`,
  ped_cyber: `<g class="ped-cyber" transform="translate(100 188)">
    <ellipse cx="0" cy="0" rx="60" ry="10" fill="none" stroke="#00f2fe" stroke-width="2.5"/>
    <ellipse cx="0" cy="0" rx="46" ry="6.5" fill="rgba(0,242,254,0.2)"/>
    <line x1="-54" y1="0" x2="-28" y2="0" stroke="#f72585" stroke-width="3" stroke-linecap="round"/>
    <line x1="28" y1="0" x2="54" y2="0" stroke="#f72585" stroke-width="3" stroke-linecap="round"/>
  </g>`,
  ped_books: `<g class="ped-books" transform="translate(100 187)">
    <rect x="-45" y="0" width="90" height="9" rx="2" fill="#1e40af" stroke="#172554" stroke-width="1"/>
    <rect x="-42" y="2" width="84" height="5" fill="#f8fafc"/>
    <rect x="-38" y="-8" width="76" height="8" rx="2" fill="#b91c1c" stroke="#7f1d1d" stroke-width="1"/>
    <rect x="-35" y="-6" width="70" height="4" fill="#f8fafc"/>
    <rect x="-32" y="-15" width="64" height="7" rx="2" fill="#047857" stroke="#064e3b" stroke-width="1"/>
    <rect x="-29" y="-13" width="58" height="3" fill="#f8fafc"/>
  </g>`,
  ped_mushroom: `<g class="ped-mushroom" transform="translate(100 188)">
    <ellipse cx="0" cy="2" rx="46" ry="7" fill="#d97706" opacity="0.4"/>
    <ellipse cx="0" cy="-2" rx="52" ry="11" fill="#dc2626" stroke="#991b1b" stroke-width="1.5"/>
    <circle cx="-28" cy="-3" r="4.5" fill="#fff"/><circle cx="28" cy="-3" r="4.5" fill="#fff"/>
    <circle cx="0" cy="-6" r="5" fill="#fff"/><circle cx="-12" cy="0" r="3.5" fill="#fff"/><circle cx="12" cy="0" r="3.5" fill="#fff"/>
  </g>`,
  ped_star: `<g class="ped-star" transform="translate(100 188)">
    <ellipse cx="0" cy="4" rx="56" ry="8" fill="rgba(202, 138, 4, 0.3)"/>
    <polygon points="0,-14 15,-4 38,-6 24,10 30,30 0,16 -30,30 -24,10 -38,-6 -15,-4" fill="#facc15" stroke="#eab308" stroke-width="1.8" transform="scale(1.2 0.4)"/>
    <circle cx="0" cy="0" r="8" fill="#fef08a" transform="scale(1 0.4)"/>
  </g>`,
  ped_donut: `<g class="ped-donut" transform="translate(100 188)">
    <ellipse cx="0" cy="3" rx="54" ry="10" fill="#b45309" opacity="0.35"/>
    <ellipse cx="0" cy="0" rx="52" ry="10" fill="#d97706" stroke="#b45309" stroke-width="1.5"/>
    <ellipse cx="0" cy="-2" rx="48" ry="8" fill="#f472b6"/>
    <ellipse cx="0" cy="-2" rx="16" ry="3.5" fill="#d97706"/>
    <rect x="-30" y="-3" width="5" height="2" rx="1" fill="#38bdf8" transform="rotate(20 -30 -3)"/>
    <rect x="25" y="-4" width="5" height="2" rx="1" fill="#facc15" transform="rotate(-30 25 -4)"/>
    <rect x="-10" y="-5" width="5" height="2" rx="1" fill="#4ade80" transform="rotate(45 -10 -5)"/>
    <rect x="15" y="-1" width="5" height="2" rx="1" fill="#fff" transform="rotate(10 15 -1)"/>
  </g>`,
  ped_pizza: `<g class="ped-pizza" transform="translate(100 188)">
    <ellipse cx="0" cy="3" rx="54" ry="10" fill="rgba(180, 83, 9, 0.35)"/>
    <ellipse cx="0" cy="0" rx="52" ry="10" fill="#d97706" stroke="#b45309" stroke-width="1.5"/>
    <ellipse cx="0" cy="-2" rx="46" ry="8" fill="#fef08a"/>
    <circle cx="-25" cy="-2" r="5" fill="#dc2626" stroke="#991b1b" stroke-width="0.8"/>
    <circle cx="22" cy="-3" r="5.5" fill="#dc2626" stroke="#991b1b" stroke-width="0.8"/>
    <circle cx="0" cy="-4" r="5" fill="#dc2626" stroke="#991b1b" stroke-width="0.8"/>
    <rect x="-12" y="-1" width="4" height="2" fill="#16a34a"/>
    <rect x="10" y="-5" width="4" height="2" fill="#16a34a"/>
  </g>`,

  // Hào quang (Aura)
  aura_flame: `<g class="aura-flame">
    <defs>
      <radialGradient id="aur-flm" cx="50%" cy="60%" r="55%">
        <stop offset="0%" stop-color="#ff922b" stop-opacity="0.45"/>
        <stop offset="50%" stop-color="#ff6b6b" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#e03131" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="100" cy="115" rx="85" ry="80" fill="url(#aur-flm)"/>
    <path d="M100 25 C108 45 125 55 120 70 C135 60 145 75 140 95 C155 85 165 105 155 130 C165 145 160 165 145 175" stroke="#ffa94d" stroke-width="2.5" fill="none" opacity="0.8" stroke-linecap="round"/>
    <path d="M100 25 C92 45 75 55 80 70 C65 60 55 75 60 95 C45 85 35 105 45 130 C35 145 40 165 55 175" stroke="#ffa94d" stroke-width="2.5" fill="none" opacity="0.8" stroke-linecap="round"/>
    <circle cx="68" cy="48" r="3" fill="#ffd43b" opacity="0.9"/>
    <circle cx="132" cy="42" r="3.5" fill="#ffa94d" opacity="0.9"/>
    <circle cx="48" cy="85" r="2.5" fill="#ff6b6b" opacity="0.85"/>
    <circle cx="156" cy="80" r="2.8" fill="#ffd43b" opacity="0.85"/>
  </g>`,
  aur_fire: `<g class="aura-flame">
    <defs>
      <radialGradient id="aur-f" cx="50%" cy="60%" r="50%">
        <stop offset="0%" stop-color="#ff922b" stop-opacity=".45"/>
        <stop offset="70%" stop-color="#ff6b6b" stop-opacity=".15"/>
        <stop offset="100%" stop-color="#ff6b6b" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="100" cy="115" rx="72" ry="72" fill="url(#aur-f)"/>
  </g>`,
  aura_cyber: `<g class="aura-cyber">
    <defs>
      <radialGradient id="aur-cyb" cx="50%" cy="50%" r="50%">
        <stop offset="60%" stop-color="#00f2fe" stop-opacity="0.12"/>
        <stop offset="90%" stop-color="#4facfe" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#00f2fe" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="110" r="82" fill="url(#aur-cyb)"/>
    <circle cx="100" cy="110" r="82" fill="none" stroke="#00f2fe" stroke-width="1.8" stroke-dasharray="14 8 4 8" opacity="0.85"/>
    <circle cx="100" cy="110" r="74" fill="none" stroke="#f72585" stroke-width="1.2" stroke-dasharray="6 6" opacity="0.75"/>
    <polygon points="100,24 104,28 100,32 96,28" fill="#00f2fe"/>
    <polygon points="186,110 182,114 178,110 182,106" fill="#f72585"/>
    <polygon points="14,110 18,114 22,110 18,106" fill="#f72585"/>
    <circle cx="42" cy="52" r="2.5" fill="#00f2fe" opacity="0.9"/>
    <circle cx="158" cy="52" r="2.5" fill="#f72585" opacity="0.9"/>
  </g>`,
  aura_galaxy: `<g class="aura-galaxy">
    <defs>
      <radialGradient id="aur-gal" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#c084fc" stop-opacity="0.4"/>
        <stop offset="65%" stop-color="#7e22ce" stop-opacity="0.25"/>
        <stop offset="90%" stop-color="#3b82f6" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="100" cy="110" rx="86" ry="84" fill="url(#aur-gal)"/>
    <ellipse cx="100" cy="110" rx="84" ry="42" fill="none" stroke="#c084fc" stroke-width="1.5" stroke-dasharray="8 6" transform="rotate(-25 100 110)" opacity="0.8"/>
    <ellipse cx="100" cy="110" rx="78" ry="36" fill="none" stroke="#60a5fa" stroke-width="1.2" stroke-dasharray="4 6" transform="rotate(35 100 110)" opacity="0.75"/>
    <circle cx="32" cy="80" r="5" fill="#f43f5e" stroke="#fff" stroke-width="1"/>
    <circle cx="168" cy="140" r="4" fill="#38bdf8" stroke="#fff" stroke-width="1"/>
    <polygon points="100,16 103,24 111,27 103,30 100,38 97,30 89,27 97,24" fill="#fff"/>
    <polygon points="45,135 47,140 52,142 47,144 45,149 43,144 38,142 43,140" fill="#fef08a" opacity="0.9"/>
  </g>`,
  aura_gold: `<g class="aura-gold">
    <defs>
      <radialGradient id="aur-gld" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fde047" stop-opacity="0.45"/>
        <stop offset="60%" stop-color="#eab308" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#ca8a04" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="110" r="86" fill="url(#aur-gld)"/>
    <circle cx="100" cy="110" r="82" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="10 6" opacity="0.9"/>
    <circle cx="100" cy="110" r="72" fill="none" stroke="#fef08a" stroke-width="1.2" stroke-dasharray="5 5" opacity="0.8"/>
    <g stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" opacity="0.85">
      <line x1="100" y1="16" x2="100" y2="4"/><line x1="100" y1="204" x2="100" y2="216"/>
      <line x1="6" y1="110" x2="-6" y2="110"/><line x1="194" y1="110" x2="206" y2="110"/>
      <line x1="34" y1="44" x2="25" y2="35"/><line x1="166" y1="44" x2="175" y2="35"/>
      <line x1="34" y1="176" x2="25" y2="185"/><line x1="166" y1="176" x2="175" y2="185"/>
    </g>
    <polygon points="100,18 103,28 113,31 103,34 100,44 97,34 87,31 97,28" fill="#fff"/>
    <polygon points="168,75 170,82 177,84 170,86 168,93 166,86 159,84 166,82" fill="#fff"/>
  </g>`,
  aur_money: `<g class="aura-gold">
    <defs>
      <radialGradient id="aur-m" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffd43b" stop-opacity=".35"/>
        <stop offset="100%" stop-color="#ffd43b" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="110" r="75" fill="url(#aur-m)"/>
    <g font-family="Baloo 2, sans-serif" font-weight="900" font-size="12" fill="#e67700" opacity=".75">
      <text x="35" y="75">$</text><text x="155" y="85">đ</text><text x="40" y="145">đ</text><text x="150" y="145">$</text>
    </g>
  </g>`,
  aura_sakura: `<g class="aura-sakura">
    <defs>
      <radialGradient id="aur-sak" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fbcfe8" stop-opacity="0.45"/>
        <stop offset="65%" stop-color="#f472b6" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#db2777" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="110" r="84" fill="url(#aur-sak)"/>
    <circle cx="100" cy="110" r="78" fill="none" stroke="#f472b6" stroke-width="1.5" stroke-dasharray="6 8" opacity="0.75"/>
    <g fill="#f43f5e" opacity="0.85">
      <path d="M42 68 C38 60 52 54 54 64 C56 74 46 76 42 68 Z" transform="rotate(20 46 66)"/>
      <path d="M158 62 C154 54 168 48 170 58 C172 68 162 70 158 62 Z" transform="rotate(-35 162 60)"/>
      <path d="M34 128 C30 120 44 114 46 124 C48 134 38 136 34 128 Z" transform="rotate(-15 38 126)"/>
      <path d="M162 136 C158 128 172 122 174 132 C176 142 166 144 162 136 Z" transform="rotate(45 166 134)"/>
    </g>
    <circle cx="68" cy="42" r="2.5" fill="#fbcfe8" opacity="0.9"/>
    <circle cx="132" cy="38" r="2.5" fill="#fbcfe8" opacity="0.9"/>
  </g>`,
  aur_cherry: `<g class="aura-sakura">
    <defs>
      <radialGradient id="aur-c" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fcc2d7" stop-opacity=".45"/>
        <stop offset="100%" stop-color="#fcc2d7" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="110" r="75" fill="url(#aur-c)"/>
    <ellipse cx="45" cy="80" rx="4" ry="2" fill="#ff8787" transform="rotate(25 45 80)" opacity=".8"/>
    <ellipse cx="155" cy="75" rx="4" ry="2" fill="#ff8787" transform="rotate(-30 155 75)" opacity=".8"/>
    <ellipse cx="60" cy="140" rx="4" ry="2" fill="#ff8787" transform="rotate(-15 60 140)" opacity=".8"/>
    <ellipse cx="140" cy="145" rx="4" ry="2" fill="#ff8787" transform="rotate(40 140 145)" opacity=".8"/>
  </g>`,
  aura_frost: `<g class="aura-frost">
    <defs>
      <radialGradient id="aur-fst" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#bae6fd" stop-opacity="0.45"/>
        <stop offset="60%" stop-color="#38bdf8" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="110" r="85" fill="url(#aur-fst)"/>
    <circle cx="100" cy="110" r="80" fill="none" stroke="#7dd3fc" stroke-width="1.8" stroke-dasharray="8 6" opacity="0.85"/>
    <g stroke="#e0f2fe" stroke-width="1.8" stroke-linecap="round">
      <g transform="translate(100 28)"><line x1="-8" y1="0" x2="8" y2="0"/><line x1="0" y1="-8" x2="0" y2="8"/><line x1="-6" y1="-6" x2="6" y2="6"/><line x1="-6" y1="6" x2="6" y2="-6"/></g>
      <g transform="translate(32 95)"><line x1="-6" y1="0" x2="6" y2="0"/><line x1="0" y1="-6" x2="0" y2="6"/><line x1="-4" y1="-4" x2="4" y2="4"/><line x1="-4" y1="4" x2="4" y2="-4"/></g>
      <g transform="translate(168 95)"><line x1="-6" y1="0" x2="6" y2="0"/><line x1="0" y1="-6" x2="0" y2="6"/><line x1="-4" y1="-4" x2="4" y2="4"/><line x1="-4" y1="4" x2="4" y2="-4"/></g>
    </g>
    <circle cx="60" cy="52" r="3" fill="#fff" opacity="0.95"/>
    <circle cx="140" cy="52" r="3" fill="#fff" opacity="0.95"/>
  </g>`,
  aur_sparkle: `<g class="aura-spin">
    <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,230,100,.35)" stroke-width="1.5" stroke-dasharray="4 8"/>
    <polygon points="100,10 103,20 113,23 103,26 100,36 97,26 87,23 97,20" fill="#ffd43b"/>
    <polygon points="180,100 172,102 170,110 168,102 160,100 168,98 170,90 172,98" fill="#ffd43b"/>
    <polygon points="20,100 28,102 30,110 32,102 40,100 32,98 30,90 28,98" fill="#ffd43b"/>
  </g>`,

  // Phông nền trong thẻ (Background)
  bg_dorm: `<g class="bg-scene">
    <defs>
      <linearGradient id="bg_dorm_grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#180f2e"/>
        <stop offset="55%" stop-color="#2a164d"/>
        <stop offset="100%" stop-color="#120924"/>
      </linearGradient>
    </defs>
    <rect width="200" height="212" rx="24" fill="url(#bg_dorm_grad)"/>
    <rect x="12" y="20" width="52" height="66" rx="8" fill="#0d071a" stroke="#ffd166" stroke-width="2"/>
    <line x1="38" y1="20" x2="38" y2="86" stroke="#ffd166" stroke-width="1.5"/>
    <line x1="12" y1="53" x2="64" y2="53" stroke="#ffd166" stroke-width="1.5"/>
    <circle cx="50" cy="36" r="7.5" fill="#ffe066"/>
    <circle cx="47" cy="34" r="6.5" fill="#0d071a"/>
    <circle cx="24" cy="32" r="1.5" fill="#fff" opacity="0.8"/>
    <circle cx="30" cy="42" r="1.2" fill="#ffe066" opacity="0.9"/>
    <path d="M 10 14 Q 100 32 190 14" stroke="rgba(255,255,255,0.25)" stroke-width="1.2" fill="none"/>
    <circle cx="35" cy="18" r="3" fill="#ff7eb9"/>
    <circle cx="65" cy="22" r="3" fill="#7ee8c3"/>
    <circle cx="100" cy="23" r="3.5" fill="#ffd166"/>
    <circle cx="135" cy="22" r="3" fill="#7fc8ff"/>
    <circle cx="165" cy="18" r="3" fill="#b38cff"/>
    <rect x="148" y="55" width="42" height="4" rx="1.5" fill="#8c6d62"/>
    <rect x="152" y="32" width="8" height="23" rx="1" fill="#4dabf7"/>
    <rect x="162" y="36" width="9" height="19" rx="1" fill="#ff6b6b"/>
    <rect x="173" y="28" width="9" height="27" rx="1" fill="#51cf66"/>
    <rect x="0" y="185" width="200" height="27" rx="6" fill="#1b0e29"/>
    <line x1="0" y1="185" x2="200" y2="185" stroke="#58317d" stroke-width="1.8"/>
  </g>`,

  bg_cafe: `<g class="bg-scene">
    <defs>
      <linearGradient id="bg_cafe_grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2a1408"/>
        <stop offset="55%" stop-color="#3d1e0d"/>
        <stop offset="100%" stop-color="#180b04"/>
      </linearGradient>
    </defs>
    <rect width="200" height="212" rx="24" fill="url(#bg_cafe_grad)"/>
    <rect x="10" y="28" width="50" height="74" rx="6" fill="#141414" stroke="#d48806" stroke-width="1.8"/>
    <text x="35" y="44" text-anchor="middle" font-size="7.5" font-weight="900" fill="#ffd591" font-family="sans-serif">☕ CAFE</text>
    <line x1="16" y1="52" x2="54" y2="52" stroke="#fff" stroke-width="1.2" opacity="0.5"/>
    <line x1="16" y1="60" x2="48" y2="60" stroke="#fff" stroke-width="1.2" opacity="0.5"/>
    <line x1="16" y1="68" x2="52" y2="68" stroke="#fff" stroke-width="1.2" opacity="0.5"/>
    <text x="35" y="86" text-anchor="middle" font-size="6.5" font-weight="800" fill="#69c0ff" font-family="sans-serif">CHILL 100%</text>
    <line x1="100" y1="0" x2="100" y2="22" stroke="#d48806" stroke-width="2"/>
    <path d="M 85 22 L 115 22 L 122 34 L 78 34 Z" fill="#d48806"/>
    <circle cx="100" cy="37" r="5.5" fill="#fff" opacity="0.95"/>
    <polygon points="80,34 120,34 150,150 50,150" fill="rgba(255, 235, 150, 0.08)"/>
    <path d="M 166 65 L 186 65 L 182 85 L 170 85 Z" fill="#d46b08"/>
    <circle cx="176" cy="55" r="11" fill="#2b8a3e"/>
    <circle cx="168" cy="47" r="8.5" fill="#389e0d"/>
    <circle cx="184" cy="47" r="8.5" fill="#52c41a"/>
    <rect x="0" y="185" width="200" height="27" rx="6" fill="#1b0c05"/>
    <line x1="0" y1="185" x2="200" y2="185" stroke="#683416" stroke-width="1.8"/>
  </g>`,

  bg_beach: `<g class="bg-scene">
    <defs>
      <linearGradient id="bg_beach_grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ff5e62"/>
        <stop offset="35%" stop-color="#ff9966"/>
        <stop offset="68%" stop-color="#00b4d8"/>
        <stop offset="100%" stop-color="#0077b6"/>
      </linearGradient>
    </defs>
    <rect width="200" height="212" rx="24" fill="url(#bg_beach_grad)"/>
    <circle cx="155" cy="50" r="22" fill="#fff" opacity="0.95"/>
    <circle cx="155" cy="50" r="32" fill="#ffd166" opacity="0.35"/>
    <path d="M 75 38 Q 80 34 85 38 Q 90 34 95 38" stroke="#4a1805" stroke-width="1.5" fill="none" opacity="0.7"/>
    <path d="M 102 45 Q 106 41 110 45 Q 114 41 118 45" stroke="#4a1805" stroke-width="1.2" fill="none" opacity="0.6"/>
    <path d="M 14 185 Q 26 105 20 45" stroke="#4a2810" stroke-width="5.5" fill="none" stroke-linecap="round"/>
    <path d="M 20 45 Q -10 32 -16 52" stroke="#2b8a3e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M 20 45 Q 38 22 50 42" stroke="#2b8a3e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M 20 45 Q 6 15 -2 24" stroke="#2b8a3e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M 20 45 Q 44 42 54 62" stroke="#2b8a3e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <circle cx="18" cy="50" r="2.8" fill="#389e0d"/><circle cx="23" cy="51" r="2.8" fill="#237804"/>
    <path d="M 0 162 Q 50 156 100 163 T 200 159 L 200 182 L 0 182 Z" fill="#48cae4" opacity="0.65"/>
    <path d="M 0 174 Q 50 168 100 174 T 200 170 L 200 212 L 0 212 Z" fill="#ffeaa7"/>
    <ellipse cx="165" cy="192" rx="14" ry="4" fill="#fcc419" opacity="0.45"/>
    <circle cx="170" cy="192" r="2.5" fill="#ff7675" opacity="0.8"/>
  </g>`,

  bg_vault: `<g class="bg-scene">
    <defs>
      <linearGradient id="bg_vault_grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#141c28"/>
        <stop offset="50%" stop-color="#0c131f"/>
        <stop offset="100%" stop-color="#1f1805"/>
      </linearGradient>
    </defs>
    <rect width="200" height="212" rx="24" fill="url(#bg_vault_grad)"/>
    <circle cx="100" cy="95" r="76" fill="none" stroke="#d4af37" stroke-width="4.5" stroke-dasharray="16,8" opacity="0.85"/>
    <circle cx="100" cy="95" r="58" fill="none" stroke="#ffd700" stroke-width="2" opacity="0.65"/>
    <circle cx="100" cy="95" r="88" fill="none" stroke="rgba(255,215,0,0.18)" stroke-width="1.8"/>
    <polygon points="28,30 32,40 42,43 32,46 28,56 24,46 14,43 24,40" fill="#ffd700"/>
    <polygon points="172,32 175,41 184,43 175,46 172,55 169,46 160,43 169,41" fill="#ffd700"/>
    <circle cx="56" cy="38" r="2" fill="#fff" opacity="0.9"/>
    <circle cx="144" cy="36" r="2" fill="#fff" opacity="0.9"/>
    <rect x="8" y="162" width="34" height="13" rx="2" fill="#f59e0b" stroke="#ffd700" stroke-width="1.4"/>
    <text x="25" y="171" text-anchor="middle" font-size="6" font-weight="900" fill="#78350f" font-family="sans-serif">9999</text>
    <rect x="15" y="150" width="30" height="12" rx="2" fill="#fbbf24" stroke="#ffd700" stroke-width="1.4"/>
    <text x="30" y="159" text-anchor="middle" font-size="6" font-weight="900" fill="#78350f" font-family="sans-serif">GOLD</text>
    <rect x="158" y="162" width="34" height="13" rx="2" fill="#f59e0b" stroke="#ffd700" stroke-width="1.4"/>
    <text x="175" y="171" text-anchor="middle" font-size="6" font-weight="900" fill="#78350f" font-family="sans-serif">9999</text>
    <rect x="155" y="150" width="30" height="12" rx="2" fill="#fbbf24" stroke="#ffd700" stroke-width="1.4"/>
    <text x="170" y="159" text-anchor="middle" font-size="6" font-weight="900" fill="#78350f" font-family="sans-serif">GOLD</text>
    <rect x="0" y="185" width="200" height="27" rx="6" fill="#0f172a"/>
    <line x1="0" y1="185" x2="200" y2="185" stroke="#d4af37" stroke-width="2.2"/>
  </g>`,
  bg_night: `<g>
    <defs>
      <linearGradient id="bgn" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#101026"/><stop offset="100%" stop-color="#2b1a4a"/>
      </linearGradient>
    </defs>
    <rect width="200" height="200" rx="24" fill="url(#bgn)"/>
    <circle cx="160" cy="40" r="14" fill="#fffbe6"/>
    <circle cx="154" cy="38" r="12" fill="#101026"/>
    <circle cx="40" cy="35" r="1.5" fill="#fff" opacity=".8"/>
  </g>`,
  bg_nature: `<g>
    <defs>
      <linearGradient id="bgt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d3f9d8"/><stop offset="100%" stop-color="#b2f2bb"/>
      </linearGradient>
    </defs>
    <rect width="200" height="200" rx="24" fill="url(#bgt)"/>
    <circle cx="100" cy="240" r="130" fill="#8ce99a"/>
  </g>`,
  bg_cyber: `<g>
    <rect width="200" height="200" rx="24" fill="#0b0b1a"/>
    <path d="M0 40 H200 M0 80 H200 M0 120 H200 M0 160 H200" stroke="#1a1a3a" stroke-width="1"/>
  </g>`,
  bg_castle: `<g>
    <defs>
      <linearGradient id="bgc" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffe3e3"/><stop offset="100%" stop-color="#ffd8a8"/>
      </linearGradient>
    </defs>
    <rect width="200" height="200" rx="24" fill="url(#bgc)"/>
    <rect x="25" y="100" width="30" height="80" fill="#ffa8a8"/>
  </g>`
};

export const STAGE_THEMES = {
  bg_dorm: {
    id: "bg_dorm",
    name: tr("Phòng trọ sinh viên"),
    cardBg: "linear-gradient(165deg, #1b1233 0%, #291647 48%, #140c26 100%)",
    cardBorder: "1px solid rgba(255, 209, 102, 0.4)",
    spotlight: "radial-gradient(circle at 50% 38%, rgba(255, 209, 102, 0.22) 0%, transparent 68%)",
    glowColor: "rgba(255, 209, 102, 0.25)",
    backdropSvg: `
      <g opacity="0.95">
        <rect x="22" y="24" width="76" height="96" rx="10" fill="#110924" stroke="#ffd166" stroke-width="2.5"/>
        <line x1="60" y1="24" x2="60" y2="120" stroke="#ffd166" stroke-width="2"/>
        <line x1="22" y1="72" x2="98" y2="72" stroke="#ffd166" stroke-width="2"/>
        <circle cx="76" cy="46" r="11" fill="#ffe066"/>
        <circle cx="72" cy="43" r="9" fill="#110924"/>
        <circle cx="38" cy="40" r="1.5" fill="#fff" opacity="0.8"/>
        <circle cx="48" cy="56" r="1.2" fill="#ffe066" opacity="0.9"/>
        <circle cx="82" cy="94" r="1.5" fill="#fff" opacity="0.7"/>
        <circle cx="42" cy="98" r="1.2" fill="#ffd166" opacity="0.8"/>
        <path d="M22,24 Q36,48 24,72 L22,72 Z" fill="#ff7eb9" opacity="0.6"/>
        <path d="M98,24 Q84,48 96,72 L98,72 Z" fill="#ff7eb9" opacity="0.6"/>
      </g>
      <g>
        <path d="M90,20 Q190,44 310,22" stroke="rgba(255,255,255,0.3)" stroke-width="1.6" fill="none"/>
        <circle cx="115" cy="27" r="4.5" fill="#ff7eb9"/>
        <circle cx="150" cy="32" r="4.5" fill="#7ee8c3"/>
        <circle cx="185" cy="34" r="5" fill="#ffd166"/>
        <circle cx="220" cy="33" r="4.5" fill="#7fc8ff"/>
        <circle cx="255" cy="30" r="4.5" fill="#ff9f5a"/>
        <circle cx="290" cy="25" r="4.5" fill="#b38cff"/>
      </g>
      <g opacity="0.92">
        <rect x="312" y="80" width="72" height="6" rx="2" fill="#8c6d62"/>
        <rect x="318" y="44" width="11" height="36" rx="1.5" fill="#4dabf7"/>
        <line x1="323" y1="48" x2="323" y2="76" stroke="#fff" stroke-width="1.2" opacity="0.6"/>
        <rect x="332" y="50" width="12" height="30" rx="1.5" fill="#ff6b6b"/>
        <line x1="338" y1="54" x2="338" y2="76" stroke="#fff" stroke-width="1.2" opacity="0.6"/>
        <rect x="347" y="40" width="13" height="40" rx="1.5" fill="#51cf66"/>
        <line x1="353" y1="44" x2="353" y2="76" stroke="#fff" stroke-width="1.2" opacity="0.6"/>
        <rect x="363" y="55" width="10" height="25" rx="1.5" fill="#fcc419" transform="rotate(8 368 80)"/>
        <path d="M370,72 L378,72 L376,80 L372,80 Z" fill="#d9480f"/>
        <circle cx="374" cy="68" r="4" fill="#69db7c"/>
      </g>
      <g>
        <rect x="0" y="200" width="400" height="40" fill="#120920"/>
        <line x1="0" y1="200" x2="400" y2="200" stroke="#4a2d7a" stroke-width="2.5"/>
        <line x1="120" y1="200" x2="120" y2="240" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
        <line x1="270" y1="200" x2="270" y2="240" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
      </g>`
  },

  bg_cafe: {
    id: "bg_cafe",
    name: tr("Quán cafe học bài chill"),
    cardBg: "linear-gradient(165deg, #28140a 0%, #3e1f10 48%, #190c06 100%)",
    cardBorder: "1px solid rgba(245, 158, 11, 0.45)",
    spotlight: "radial-gradient(circle at 50% 36%, rgba(251, 191, 36, 0.26) 0%, transparent 68%)",
    glowColor: "rgba(245, 158, 11, 0.3)",
    backdropSvg: `
      <g>
        <line x1="200" y1="0" x2="200" y2="34" stroke="#d48806" stroke-width="2.5"/>
        <path d="M178,34 L222,34 L232,50 L168,50 Z" fill="#d48806"/>
        <circle cx="200" cy="54" r="8" fill="#fff" opacity="0.95"/>
        <polygon points="172,52 228,52 270,185 130,185" fill="rgba(255, 235, 150, 0.08)"/>
      </g>
      <g opacity="0.94">
        <rect x="20" y="32" width="82" height="106" rx="8" fill="#181818" stroke="#d48806" stroke-width="2.5"/>
        <text x="61" y="54" text-anchor="middle" font-size="10.5" font-weight="900" fill="#ffd591" font-family="sans-serif" letter-spacing="1">☕ COFFEE</text>
        <line x1="32" y1="64" x2="90" y2="64" stroke="#fff" stroke-width="1.5" opacity="0.55"/>
        <line x1="32" y1="76" x2="82" y2="76" stroke="#fff" stroke-width="1.5" opacity="0.55"/>
        <line x1="32" y1="88" x2="88" y2="88" stroke="#fff" stroke-width="1.5" opacity="0.55"/>
        <line x1="32" y1="100" x2="74" y2="100" stroke="#fff" stroke-width="1.5" opacity="0.55"/>
        <text x="61" y="122" text-anchor="middle" font-size="9" font-weight="800" fill="#69c0ff" font-family="sans-serif">CHILL 100%</text>
      </g>
      <g opacity="0.94">
        <path d="M336,128 L374,128 L368,166 L342,166 Z" fill="#d46b08"/>
        <circle cx="355" cy="112" r="18" fill="#2b8a3e"/>
        <circle cx="340" cy="98" r="14" fill="#389e0d"/>
        <circle cx="370" cy="98" r="14" fill="#52c41a"/>
        <circle cx="355" cy="84" r="13" fill="#73d13d"/>
        <path d="M355,128 Q355,100 355,85" stroke="#237804" stroke-width="2.5" fill="none"/>
        <path d="M355,115 Q342,108 340,98" stroke="#237804" stroke-width="2" fill="none"/>
        <path d="M355,115 Q368,108 370,98" stroke="#237804" stroke-width="2" fill="none"/>
      </g>
      <g>
        <rect x="0" y="200" width="400" height="40" fill="#1b0c05"/>
        <line x1="0" y1="200" x2="400" y2="200" stroke="#5c2e17" stroke-width="2.5"/>
        <line x1="140" y1="200" x2="140" y2="240" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
        <line x1="280" y1="200" x2="280" y2="240" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
      </g>`
  },

  bg_beach: {
    id: "bg_beach",
    name: tr("Bãi biển nghỉ dưỡng"),
    cardBg: "linear-gradient(175deg, #ff4e50 0%, #f9d423 38%, #00b4d8 74%, #0077b6 100%)",
    cardBorder: "1px solid rgba(255, 255, 255, 0.45)",
    spotlight: "radial-gradient(circle at 50% 36%, rgba(255, 243, 176, 0.38) 0%, transparent 68%)",
    glowColor: "rgba(255, 177, 66, 0.35)",
    backdropSvg: `
      <g>
        <circle cx="280" cy="56" r="32" fill="#fff" opacity="0.95"/>
        <circle cx="280" cy="56" r="48" fill="#ffd166" opacity="0.32"/>
        <path d="M150,42 Q156,36 162,42 Q168,36 174,42" stroke="#4a1805" stroke-width="1.8" fill="none" opacity="0.7"/>
        <path d="M182,50 Q187,45 192,50 Q197,45 202,50" stroke="#4a1805" stroke-width="1.5" fill="none" opacity="0.6"/>
      </g>
      <g>
        <path d="M26,204 Q46,110 36,46" stroke="#4a2810" stroke-width="7" fill="none" stroke-linecap="round"/>
        <path d="M36,46 Q-6,30 -16,56" stroke="#2b8a3e" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <path d="M36,46 Q58,20 74,42" stroke="#2b8a3e" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <path d="M36,46 Q18,12 8,24" stroke="#2b8a3e" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <path d="M36,46 Q64,42 78,66" stroke="#2b8a3e" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <circle cx="34" cy="52" r="3.5" fill="#389e0d"/><circle cx="41" cy="53" r="3.5" fill="#237804"/>
      </g>
      <g>
        <path d="M0,172 Q100,162 200,174 T400,168 L400,200 L0,200 Z" fill="#48cae4" opacity="0.6"/>
        <path d="M0,182 Q90,174 200,182 T400,178 L400,240 L0,240 Z" fill="#ffeaa7"/>
        <ellipse cx="320" cy="204" rx="20" ry="6" fill="#fcc419" opacity="0.45"/>
        <circle cx="326" cy="204" r="3" fill="#ff7675" opacity="0.8"/>
      </g>`
  },

  bg_vault: {
    id: "bg_vault",
    name: tr("Két sắt kho vàng"),
    cardBg: "linear-gradient(160deg, #1a2230 0%, #0d1524 52%, #221b06 100%)",
    cardBorder: "1.5px solid rgba(255, 215, 0, 0.55)",
    spotlight: "radial-gradient(circle at 50% 36%, rgba(255, 215, 0, 0.28) 0%, transparent 68%)",
    glowColor: "rgba(255, 215, 0, 0.35)",
    backdropSvg: `
      <g>
        <circle cx="200" cy="96" r="88" fill="none" stroke="#d4af37" stroke-width="5" stroke-dasharray="20,10" opacity="0.85"/>
        <circle cx="200" cy="96" r="68" fill="none" stroke="#ffd700" stroke-width="2.5" opacity="0.65"/>
        <circle cx="200" cy="96" r="102" fill="none" stroke="rgba(255,215,0,0.2)" stroke-width="2"/>
        <circle cx="200" cy="96" r="16" fill="#1e293b" stroke="#ffd700" stroke-width="2.5"/>
        <line x1="200" y1="80" x2="200" y2="112" stroke="#ffd700" stroke-width="2"/>
        <line x1="184" y1="96" x2="216" y2="96" stroke="#ffd700" stroke-width="2"/>
      </g>
      <g>
        <polygon points="56,38 61,50 74,54 61,58 56,70 51,58 38,54 51,50" fill="#ffd700"/>
        <polygon points="340,42 344,52 354,55 344,58 340,68 336,58 326,55 336,52" fill="#ffd700"/>
        <circle cx="110" cy="48" r="2.5" fill="#fff" opacity="0.9"/>
        <circle cx="295" cy="46" r="2.5" fill="#fff" opacity="0.9"/>
      </g>
      <g>
        <rect x="18" y="174" width="46" height="18" rx="2.5" fill="#f59e0b" stroke="#ffd700" stroke-width="1.8"/>
        <text x="41" y="186" text-anchor="middle" font-size="8" font-weight="900" fill="#78350f" font-family="sans-serif">9999</text>
        <rect x="28" y="158" width="42" height="17" rx="2.5" fill="#fbbf24" stroke="#ffd700" stroke-width="1.8"/>
        <text x="49" y="170" text-anchor="middle" font-size="8" font-weight="900" fill="#78350f" font-family="sans-serif">GOLD</text>
        <rect x="336" y="174" width="46" height="18" rx="2.5" fill="#f59e0b" stroke="#ffd700" stroke-width="1.8"/>
        <text x="359" y="186" text-anchor="middle" font-size="8" font-weight="900" fill="#78350f" font-family="sans-serif">9999</text>
        <rect x="328" y="158" width="42" height="17" rx="2.5" fill="#fbbf24" stroke="#ffd700" stroke-width="1.8"/>
        <text x="349" y="170" text-anchor="middle" font-size="8" font-weight="900" fill="#78350f" font-family="sans-serif">GOLD</text>
      </g>
      <g>
        <rect x="0" y="200" width="400" height="40" fill="#0f172a"/>
        <line x1="0" y1="200" x2="400" y2="200" stroke="#d4af37" stroke-width="3"/>
        <line x1="100" y1="200" x2="100" y2="240" stroke="rgba(255,215,0,0.25)" stroke-width="1.5"/>
        <line x1="300" y1="200" x2="300" y2="240" stroke="rgba(255,215,0,0.25)" stroke-width="1.5"/>
      </g>`
  },

  stage_cyber: {
    id: "stage_cyber",
    name: tr("Vũ Trụ Cyber"),
    cardBg: "linear-gradient(165deg, #090d16 0%, #0f172a 48%, #030712 100%)",
    cardBorder: "1px solid rgba(56, 189, 248, 0.4)",
    spotlight: "radial-gradient(circle at 50% 38%, rgba(56, 189, 248, 0.25) 0%, transparent 68%)",
    glowColor: "rgba(56, 189, 248, 0.25)",
    backdropSvg: `
      <defs>
        <radialGradient id="stg_cyb_glow" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.25"/>
          <stop offset="60%" stop-color="#0284c7" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="#0b0f19" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="url(#stg_cyb_glow)"/>
      <g stroke="#0ea5e9" stroke-width="1" opacity="0.25">
        <line x1="0" y1="180" x2="400" y2="180"/>
        <line x1="0" y1="200" x2="400" y2="200"/>
        <line x1="0" y1="220" x2="400" y2="220"/>
        <line x1="200" y1="150" x2="50" y2="240"/>
        <line x1="200" y1="150" x2="130" y2="240"/>
        <line x1="200" y1="150" x2="270" y2="240"/>
        <line x1="200" y1="150" x2="350" y2="240"/>
      </g>`
  },

  stage_sakura: {
    id: "stage_sakura",
    name: tr("Vườn Anh Đào"),
    cardBg: "linear-gradient(165deg, #240c1a 0%, #3b1029 48%, #1a0512 100%)",
    cardBorder: "1px solid rgba(244, 114, 182, 0.4)",
    spotlight: "radial-gradient(circle at 50% 30%, rgba(244, 114, 182, 0.28) 0%, transparent 68%)",
    glowColor: "rgba(244, 114, 182, 0.25)",
    backdropSvg: `
      <defs>
        <radialGradient id="stg_sak_glow" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stop-color="#f472b6" stop-opacity="0.28"/>
          <stop offset="70%" stop-color="#db2777" stop-opacity="0.06"/>
          <stop offset="100%" stop-color="#120a1c" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="url(#stg_sak_glow)"/>
      <circle cx="200" cy="70" r="55" fill="#fbcfe8" opacity="0.15"/>`
  },

  stage_gold: {
    id: "stage_gold",
    name: tr("Điện Kim Cương"),
    cardBg: "linear-gradient(160deg, #241a06 0%, #362604 48%, #170f02 100%)",
    cardBorder: "1.5px solid rgba(251, 191, 36, 0.45)",
    spotlight: "radial-gradient(circle at 50% 30%, rgba(251, 191, 36, 0.32) 0%, transparent 68%)",
    glowColor: "rgba(251, 191, 36, 0.3)",
    backdropSvg: `
      <defs>
        <radialGradient id="stg_gld_glow" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.32"/>
          <stop offset="55%" stop-color="#d97706" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="#0a0812" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="url(#stg_gld_glow)"/>`
  },

  bg_night: {
    id: "bg_night",
    name: tr("Đêm sao huyền ảo"),
    cardBg: "linear-gradient(165deg, #101026 0%, #2b1a4a 60%, #0d091a 100%)",
    cardBorder: "1px solid rgba(192, 132, 252, 0.45)",
    spotlight: "radial-gradient(circle at 50% 30%, rgba(192, 132, 252, 0.3) 0%, transparent 68%)",
    glowColor: "rgba(168, 85, 247, 0.28)",
    backdropSvg: `
      <circle cx="280" cy="50" r="26" fill="#fffbe6" opacity="0.9"/>
      <circle cx="272" cy="46" r="24" fill="#15122e"/>
      <circle cx="80" cy="40" r="2" fill="#fff" opacity="0.8"/>
      <circle cx="150" cy="65" r="1.5" fill="#fbcfe8" opacity="0.85"/>
      <circle cx="320" cy="85" r="2" fill="#fff" opacity="0.75"/>
    `
  },

  bg_nature: {
    id: "bg_nature",
    name: tr("Khu rừng xanh ngát"),
    cardBg: "linear-gradient(165deg, #0f291e 0%, #1e4620 52%, #0a1c12 100%)",
    cardBorder: "1px solid rgba(74, 222, 128, 0.45)",
    spotlight: "radial-gradient(circle at 50% 36%, rgba(74, 222, 128, 0.25) 0%, transparent 68%)",
    glowColor: "rgba(74, 222, 128, 0.25)",
    backdropSvg: `
      <circle cx="200" cy="270" r="160" fill="#14532d" opacity="0.7"/>
      <circle cx="80" cy="280" r="140" fill="#166534" opacity="0.8"/>
      <circle cx="320" cy="280" r="140" fill="#15803d" opacity="0.8"/>
    `
  },

  bg_cyber: {
    id: "bg_cyber",
    name: tr("Vũ trụ Cyber"),
    cardBg: "linear-gradient(165deg, #090d16 0%, #0f172a 48%, #030712 100%)",
    cardBorder: "1px solid rgba(56, 189, 248, 0.4)",
    spotlight: "radial-gradient(circle at 50% 38%, rgba(56, 189, 248, 0.25) 0%, transparent 68%)",
    glowColor: "rgba(56, 189, 248, 0.25)",
    backdropSvg: `
      <defs>
        <radialGradient id="stg_cyb_glow2" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.25"/>
          <stop offset="60%" stop-color="#0284c7" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="#0b0f19" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="url(#stg_cyb_glow2)"/>
      <g stroke="#0ea5e9" stroke-width="1" opacity="0.25">
        <line x1="0" y1="180" x2="400" y2="180"/><line x1="0" y1="200" x2="400" y2="200"/>
        <line x1="200" y1="150" x2="50" y2="240"/><line x1="200" y1="150" x2="350" y2="240"/>
      </g>
    `
  },

  bg_castle: {
    id: "bg_castle",
    name: tr("Lâu đài hoàng gia"),
    cardBg: "linear-gradient(165deg, #2d1822 0%, #451a2e 48%, #1f0b18 100%)",
    cardBorder: "1px solid rgba(244, 114, 182, 0.45)",
    spotlight: "radial-gradient(circle at 50% 34%, rgba(251, 191, 36, 0.28) 0%, transparent 68%)",
    glowColor: "rgba(244, 114, 182, 0.28)",
    backdropSvg: `
      <circle cx="200" cy="70" r="50" fill="#fef08a" opacity="0.2"/>
      <rect x="40" y="110" width="45" height="110" fill="#2d1525" opacity="0.8"/>
      <polygon points="40,110 62.5,70 85,110" fill="#831843" opacity="0.9"/>
      <rect x="315" y="110" width="45" height="110" fill="#2d1525" opacity="0.8"/>
      <polygon points="315,110 337.5,70 360,110" fill="#831843" opacity="0.9"/>
    `
  },

  default: {
    id: "default",
    name: tr("Mặc định"),
    cardBg: "var(--grad-soft)",
    cardBorder: "1px solid var(--stroke)",
    spotlight: "radial-gradient(circle at 50% 38%, rgba(168, 85, 247, 0.35) 0%, transparent 68%)",
    glowColor: "rgba(168, 85, 247, 0.25)",
    backdropSvg: ""
  }
};

export function getStageTheme(key) {
  const k = typeof key === "string" ? key : key?.id;
  return STAGE_THEMES[k] || STAGE_THEMES.default;
}

export function renderStageBackdrop(themeKey) {
  const theme = getStageTheme(themeKey);
  if (!theme || !theme.backdropSvg) return null;
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" class="stage-backdrop-svg" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0;">${theme.backdropSvg}</svg>`;
  return new DOMParser().parseFromString(markup, "image/svg+xml").documentElement;
}

const SKINS = {
  skin_piggy: { body: ["#ffd43b", "#fab005"], flap: ["#ffe066", "#f59f00"] },
  skin_cyber: { body: ["#00f2fe", "#4facfe"], flap: ["#f72585", "#7209b7"] },
  skin_ghost: { body: ["#f8f9fa", "#e9ecef"], flap: ["#dee2e6", "#ced4da"] }
};

export const LINH_THU = {
  pet_moc: {
    id: "pet_moc",
    name: tr("Linh Thú Mộc (Mộc Linh Nhi)"),
    sprite: "/app/img/pets/pet_moc.png",
    element: "Mộc",
    elementColor: "#10b981",
    quote: tr("Gieo mầm tiết kiệm, gặt hái tương lai xanh tươi!"),
    lines: [
      tr("Mầm xanh lớn lên, sổ tiết kiệm nở hoa! 🌱"),
      tr("Tưới chút kiên trì, thu hái thành công!"),
      tr("Mỗi ngày một mầm nhỏ, tháng sau thành rừng cây tài chính!"),
      tr("Cặp sừng nhánh cây của mình đang đâm chồi tài lộc nè!")
    ]
  },
  pet_hoa: {
    id: "pet_hoa",
    name: tr("Linh Thú Hỏa (Xích Viêm Linh)"),
    sprite: "/app/img/pets/pet_hoa.png",
    element: "Hỏa",
    elementColor: "#ef4444",
    quote: tr("Ngọn lửa kỷ luật tài chính bừng cháy trong từng khoản chi!"),
    lines: [
      tr("Bùng cháy ngọn lửa kiên trì! 🔥"),
      tr("Vương miện hoàng gia, làm chủ tài chính!"),
      tr("Hôm nay ví tiền ấm áp và rực rỡ như lửa vậy!"),
      tr("Tiêu pha có chừng mực, ngọn lửa tài vận luôn bùng sáng!")
    ]
  },
  pet_tho: {
    id: "pet_tho",
    name: tr("Linh Thú Thổ (Thạch Thổ Linh)"),
    sprite: "/app/img/pets/pet_tho.png",
    element: "Thổ",
    elementColor: "#b45309",
    quote: tr("Đất vững như bàn thạch, tích lũy từng đồng thành núi vàng!"),
    lines: [
      tr("Vững như bàn thạch, kiên cố ngàn năm! 🪨"),
      tr("Tích tiểu thành đại, núi vàng vững chãi!"),
      tr("Mỗi hòn sỏi tích góp hôm nay là nền móng tương lai!"),
      tr("Đất mẹ bao dung, bảo vệ an toàn cho từng đồng tiết kiệm!")
    ]
  },
  pet_kim: {
    id: "pet_kim",
    name: tr("Linh Thú Kim (Hoàng Kim Linh)"),
    sprite: "/app/img/pets/pet_kim.png",
    element: "Kim",
    elementColor: "#f59e0b",
    quote: tr("Rèn giũa thói quen chi tiêu sáng bóng như vàng 9999!"),
    lines: [
      tr("Kim khí sáng bóng, tài lộc dồi dào! 🪙"),
      tr("Tiếng chuông vàng vang lên, tiền tài lũ lượt kéo về!"),
      tr("Bánh răng tài chính chuyển động nhịp nhàng!"),
      tr("Cùng đúc nên tương lai giàu có và thịnh vượng nào!")
    ]
  },
  pet_thuy: {
    id: "pet_thuy",
    name: tr("Linh Thú Thủy (Lam Thủy Linh)"),
    sprite: "/app/img/pets/pet_thuy.png",
    element: "Thủy",
    elementColor: "#06b6d4",
    quote: tr("Tiền bạc tuần hoàn như nước nguồn vô tận, trong trẻo và mát lành!"),
    lines: [
      tr("Nước chảy chỗ trũng, tiền chảy vào ví! 💧"),
      tr("Mát lành trong trẻo, không lo thâm hụt!"),
      tr("Lặn sâu gom ngọc, ví luôn đầy ắp!"),
      tr("Dòng chảy tài chính hanh thông và suôn sẻ!")
    ]
  },
  pet_thanhlong: {
    id: "pet_thanhlong",
    name: tr("Thần Thú Thanh Long (Tử Long Dạ Châu)"),
    sprite: "/app/img/pets/pet_thanhlong.png",
    element: "Thủy/Mộc",
    elementColor: "#8b5cf6",
    quote: tr("Long đằng hổ bái, vượng khí xung thiên, ví tiền ngập tràn phúc lộc!"),
    lines: [
      tr("Thần Long ngậm châu, vạn sự hanh thông! 🐉"),
      tr("Long đằng tứ hải, tài vận ngút trời!"),
      tr("Dạ minh châu phát sáng, ví tiền không bao giờ vơi!"),
      tr("Sóng nước cuộn trào mang tài khí ngập tràn!")
    ]
  },
  pet_bachho: {
    id: "pet_bachho",
    name: tr("Thần Thú Bạch Hổ (Chiêu Tài Bạch Hổ)"),
    sprite: "/app/img/pets/pet_bachho.png",
    element: "Kim",
    elementColor: "#f59e0b",
    quote: tr("Bạch hổ trấn giữ ngân khố, tiền vào như nước, tiền ra nhỏ giọt!"),
    lines: [
      tr("Bạch Hổ trấn khố, tiền vào khó ra! 🐯"),
      tr("Đĩnh vàng nguyên bảo này là của bạn!"),
      tr("Chiến thần giữ của, một xu cũng không rơi!"),
      tr("Gầm một tiếng, tiền tài lũ lượt kéo về!")
    ]
  },
  pet_chutuoc: {
    id: "pet_chutuoc",
    name: tr("Thần Thú Chu Tước (Hỏa Diễm Phượng Hoàng)"),
    sprite: "/app/img/pets/pet_chutuoc.png",
    element: "Hỏa",
    elementColor: "#f43f5e",
    quote: tr("Phượng hoàng niết bàn, tài chính tái sinh rực rỡ từ đống tro tàn!"),
    lines: [
      tr("Chu Tước tung cánh, phúc lộc ngút ngàn! 🦅"),
      tr("Ngọn lửa tái sinh ví tiền đầy ắp!"),
      tr("Hào quang phượng hoàng chiếu rọi sự thịnh vượng!"),
      tr("Mỗi khoản tiết kiệm là một chiếc lông vũ vàng kim!")
    ]
  },
  pet_huyenvu: {
    id: "pet_huyenvu",
    name: tr("Thần Thú Huyền Vũ (Huyền Vũ Trấn Khố)"),
    sprite: "/app/img/pets/pet_huyenvu.png",
    element: "Thủy/Thổ",
    elementColor: "#0284c7",
    quote: tr("Quy xà hợp thể, trường thọ an khang, tài sản tích lũy ngàn năm vững chãi!"),
    lines: [
      tr("Mai rùa kim cương, bảo vệ từng xu! 🐢"),
      tr("Hắc Xà canh gác, chi tiêu an toàn!"),
      tr("Bền bỉ ngàn năm, tài chính kiên cố vô song!"),
      tr("Tích lũy trường tồn, hưởng phúc lâu dài!")
    ]
  },
  pet_kylan: {
    id: "pet_kylan",
    name: tr("Thần Thú Kỳ Lân (Cát Tường Kỳ Lân)"),
    sprite: "/app/img/pets/pet_kylan.png",
    element: "Mộc/Hỏa",
    elementColor: "#ec4899",
    quote: tr("Kỳ lân xuất thế, đạp mây ngũ sắc mang may mắn và phú quý ngập tràn!"),
    lines: [
      tr("Kỳ Lân cát tường, mang phúc đến nhà! 🦄"),
      tr("Gieo mầm tài lộc, bình an phú quý!"),
      tr("Thụy thú xuất thế, vạn sự như ý!"),
      tr("Cây tài lộc đâm chồi rồi, tưới thêm một chút nhé!")
    ]
  }
};

export const LINH_THU_SKINS = {
  // 1. Mộc Linh Nhi (pet_moc)
  skin_moc_default: {
    petId: "pet_moc", theme: "default", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Mộc Tinh Nguyên Bản",
    body: ["#86efac", "#22c55e", "#15803d"], wood: ["#92400e", "#78350f"], leaf: "#16a34a", glasses: "#065f46"
  },
  skin_moc_sakura: {
    petId: "pet_moc", theme: "sakura", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Anh Đào Hồng Phấn 🌸",
    body: ["#fbcfe8", "#f472b6", "#db2777"], wood: ["#9d174d", "#831843"], leaf: "#fb7185", glasses: "#be185d"
  },
  skin_moc_autumn: {
    petId: "pet_moc", theme: "autumn", isFree: false, priceCoins: 120, priceBadges: 0, rarity: "epic", name: "Rừng Thu Phong Đỏ 🍂",
    body: ["#fed7aa", "#f97316", "#c2410c"], wood: ["#7c2d12", "#451a03"], leaf: "#dc2626", glasses: "#9a3412"
  },
  skin_moc_cyber: {
    petId: "pet_moc", theme: "cyber", isFree: false, priceCoins: 180, priceBadges: 0, rarity: "epic", name: "Mộc Cơ Giáp Neon ⚡",
    body: ["#a7f3d0", "#10b981", "#065f46"], wood: ["#1e293b", "#0f172a"], leaf: "#00f0ff", glasses: "#00f0ff"
  },
  skin_moc_celestial: {
    petId: "pet_moc", theme: "celestial", isFree: false, priceCoins: 250, priceBadges: 2, rarity: "legendary", name: "Thần Mộc Hoàng Kim ✨",
    body: ["#ddd6fe", "#8b5cf6", "#6d28d9"], wood: ["#facc15", "#ca8a04"], leaf: "#fde047", glasses: "#7c3aed"
  },

  // 2. Xích Viêm Linh (pet_hoa)
  skin_hoa_default: {
    petId: "pet_hoa", theme: "default", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Liệt Hỏa Hoàng Gia 🔥",
    body: ["#fef08a", "#f97316", "#ef4444", "#dc2626"], feet: "#b91c1c"
  },
  skin_hoa_blue: {
    petId: "pet_hoa", theme: "blue", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "U Lam Minh Hỏa ❄️",
    body: ["#bae6fd", "#38bdf8", "#0284c7", "#0369a1"], feet: "#075985"
  },
  skin_hoa_solar: {
    petId: "pet_hoa", theme: "solar", isFree: false, priceCoins: 120, priceBadges: 0, rarity: "epic", name: "Thái Dương Kim Diễm ☀️",
    body: ["#fef08a", "#facc15", "#f59e0b", "#d97706"], feet: "#b45309"
  },
  skin_hoa_mecha: {
    petId: "pet_hoa", theme: "mecha", isFree: false, priceCoins: 180, priceBadges: 0, rarity: "epic", name: "Lò Lửa Cơ Giáp 🤖",
    body: ["#f87171", "#dc2626", "#475569", "#1e293b"], feet: "#0f172a"
  },
  skin_hoa_abyss: {
    petId: "pet_hoa", theme: "abyss", isFree: false, priceCoins: 250, priceBadges: 2, rarity: "legendary", name: "Hắc Diễm Hư Không 🌌",
    body: ["#d8b4fe", "#a855f7", "#7e22ce", "#3b0764"], feet: "#2e1065"
  },

  // 3. Thạch Thổ Linh (pet_tho)
  skin_tho_default: {
    petId: "pet_tho", theme: "default", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Thạch Tinh Vững Chãi 🪨",
    body: ["#a16207", "#854d0e", "#78350f"], grass: "#16a34a"
  },
  skin_tho_moss: {
    petId: "pet_tho", theme: "moss", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Cổ Thạch Rêu Xanh 🌿",
    body: ["#a3e635", "#65a30d", "#3f6212"], grass: "#15803d"
  },
  skin_tho_crystal: {
    petId: "pet_tho", theme: "crystal", isFree: false, priceCoins: 120, priceBadges: 0, rarity: "epic", name: "Pha Lê Thạch Anh 💎",
    body: ["#93c5fd", "#3b82f6", "#1d4ed8"], grass: "#38bdf8"
  },
  skin_tho_cyber: {
    petId: "pet_tho", theme: "cyber", isFree: false, priceCoins: 180, priceBadges: 0, rarity: "epic", name: "Đá Lõi Năng Lượng ⚡",
    body: ["#64748b", "#334155", "#0f172a"], grass: "#f59e0b"
  },
  skin_tho_magma: {
    petId: "pet_tho", theme: "magma", isFree: false, priceCoins: 250, priceBadges: 2, rarity: "legendary", name: "Nham Thạch Hỏa Sơn 🌋",
    body: ["#fb923c", "#ea580c", "#450a0a"], grass: "#ef4444"
  },

  // 4. Hoàng Kim Linh (pet_kim)
  skin_kim_default: {
    petId: "pet_kim", theme: "default", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Hoàng Kim Linh Chuông 🔔",
    body: ["#fef08a", "#facc15", "#ca8a04"], gear: "#94a3b8", rim: "#cbd5e1", monocle: "#64748b"
  },
  skin_kim_silver: {
    petId: "pet_kim", theme: "silver", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Bạch Ngân Cơ Khí 🥈",
    body: ["#ffffff", "#cbd5e1", "#64748b"], gear: "#475569", rim: "#94a3b8", monocle: "#38bdf8"
  },
  skin_kim_rose: {
    petId: "pet_kim", theme: "rose", isFree: false, priceCoins: 120, priceBadges: 0, rarity: "epic", name: "Vàng Hồng Quý Phái 🌸",
    body: ["#fecdd3", "#fb7185", "#e11d48"], gear: "#be123c", rim: "#fda4af", monocle: "#9f1239"
  },
  skin_kim_steampunk: {
    petId: "pet_kim", theme: "steampunk", isFree: false, priceCoins: 180, priceBadges: 0, rarity: "epic", name: "Đồng Thau Cổ Điển ⚙️",
    body: ["#fed7aa", "#d97706", "#7c2d12"], gear: "#78350f", rim: "#ca8a04", monocle: "#451a03"
  },
  skin_kim_diamond: {
    petId: "pet_kim", theme: "diamond", isFree: false, priceCoins: 250, priceBadges: 2, rarity: "legendary", name: "Kim Cương Tối Thượng 💎",
    body: ["#cffafe", "#38bdf8", "#0369a1"], gear: "#0e7490", rim: "#e0f2fe", monocle: "#0284c7"
  },

  // 5. Lam Thủy Linh (pet_thuy)
  skin_thuy_default: {
    petId: "pet_thuy", theme: "default", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Thủy Tinh Trong Trẻo 💧",
    body: ["#bae6fd", "#38bdf8", "#0284c7"]
  },
  skin_thuy_coral: {
    petId: "pet_thuy", theme: "coral", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "San Hô Nhiệt Đới 🪸",
    body: ["#fbcfe8", "#fb7185", "#e11d48"]
  },
  skin_thuy_ice: {
    petId: "pet_thuy", theme: "ice", isFree: false, priceCoins: 120, priceBadges: 0, rarity: "epic", name: "Băng Tinh Tuyết Trắng ❄️",
    body: ["#e0f2fe", "#bae6fd", "#38bdf8"]
  },
  skin_thuy_neon: {
    petId: "pet_thuy", theme: "neon", isFree: false, priceCoins: 180, priceBadges: 0, rarity: "epic", name: "Sóng Năng Lượng Neon ⚡",
    body: ["#a7f3d0", "#22d3ee", "#818cf8"]
  },
  skin_thuy_deepsea: {
    petId: "pet_thuy", theme: "deepsea", isFree: false, priceCoins: 250, priceBadges: 2, rarity: "legendary", name: "Vực Thẳm Phát Quang 🌊",
    body: ["#93c5fd", "#2563eb", "#172554"]
  },
  // Aliases for compatibility
  skin_thuy_abyss: {
    petId: "pet_thuy", theme: "abyss", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Thâm Hải U Lam 🌊",
    body: ["#93c5fd", "#2563eb", "#172554"]
  },
  skin_thuy_pearl: {
    petId: "pet_thuy", theme: "pearl", isFree: false, priceCoins: 120, priceBadges: 0, rarity: "epic", name: "Ngọc Trai Biển Đông 🦪",
    body: ["#fed7aa", "#f472b6", "#a855f7"]
  },
  skin_thuy_aurora: {
    petId: "pet_thuy", theme: "aurora", isFree: false, priceCoins: 250, priceBadges: 2, rarity: "legendary", name: "Cực Quang Huyền Ảo ✨",
    body: ["#a7f3d0", "#22d3ee", "#818cf8"]
  },

  // 6. Tử Long Dạ Châu (pet_thanhlong)
  skin_thanhlong_default: {
    petId: "pet_thanhlong", theme: "default", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Tử Long Dạ Châu 🐉",
    body: ["#e9d5ff", "#c084fc", "#9333ea"], mane: "#7e22ce", belly: "#fce7f3", horn: "#fef08a", whisker: "#a855f7"
  },
  skin_thanhlong_jade: {
    petId: "pet_thanhlong", theme: "jade", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Bích Ngọc Thanh Long 🌿",
    body: ["#bbf7d0", "#22c55e", "#15803d"], mane: "#166534", belly: "#f0fdf4", horn: "#facc15", whisker: "#4ade80"
  },
  skin_thanhlong_gold: {
    petId: "pet_thanhlong", theme: "gold", isFree: false, priceCoins: 150, priceBadges: 0, rarity: "legendary", name: "Hoàng Kim Thánh Long ✨",
    body: ["#fef08a", "#facc15", "#ca8a04"], mane: "#b45309", belly: "#fffbeb", horn: "#ffffff", whisker: "#fde047"
  },
  skin_thanhlong_cyber: {
    petId: "pet_thanhlong", theme: "cyber", isFree: false, priceCoins: 200, priceBadges: 0, rarity: "legendary", name: "Cơ Giáp Long Thần 🤖",
    body: ["#e2e8f0", "#64748b", "#0f172a"], mane: "#334155", belly: "#cbd5e1", horn: "#00f0ff", whisker: "#00f0ff"
  },
  skin_thanhlong_dark: {
    petId: "pet_thanhlong", theme: "dark", isFree: false, priceCoins: 300, priceBadges: 3, rarity: "legendary", name: "Hắc Long Hư Không 🌌",
    body: ["#1e1b4b", "#4338ca", "#0f172a"], mane: "#581c87", belly: "#312e81", horn: "#a855f7", whisker: "#c084fc"
  },
  // Aliases for compatibility
  skin_thanhlong_storm: {
    petId: "pet_thanhlong", theme: "storm", isFree: false, priceCoins: 150, priceBadges: 1, rarity: "epic", name: "Lôi Đình Thần Long ⚡",
    body: ["#bae6fd", "#0284c7", "#1e1b4b"], mane: "#0369a1", belly: "#f0f9ff", horn: "#38bdf8", whisker: "#38bdf8"
  },
  skin_thanhlong_mecha: {
    petId: "pet_thanhlong", theme: "mecha", isFree: false, priceCoins: 220, priceBadges: 1, rarity: "epic", name: "Cơ Giáp Thần Long 🤖",
    body: ["#e2e8f0", "#64748b", "#0f172a"], mane: "#334155", belly: "#cbd5e1", horn: "#00f0ff", whisker: "#00f0ff"
  },
  skin_thanhlong_celestial: {
    petId: "pet_thanhlong", theme: "celestial", isFree: false, priceCoins: 300, priceBadges: 3, rarity: "legendary", name: "Thiên Đế Kim Long ✨",
    body: ["#fef08a", "#facc15", "#ca8a04"], mane: "#b45309", belly: "#fffbeb", horn: "#ffffff", whisker: "#fde047"
  },

  // 7. Chiêu Tài Bạch Hổ (pet_bachho)
  skin_bachho_default: {
    petId: "pet_bachho", theme: "default", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Chiêu Tài Tiểu Hổ 🐯",
    body: ["#fed7aa", "#fb923c", "#ea580c"], stripes: "#78350f", belly: "#fffbeb", earPad: "#f472b6"
  },
  skin_bachho_snow: {
    petId: "pet_bachho", theme: "snow", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Tuyết Lĩnh Bạch Hổ ❄️",
    body: ["#ffffff", "#f1f5f9", "#cbd5e1"], stripes: "#64748b", belly: "#ffffff", earPad: "#fda4af"
  },
  skin_bachho_gold: {
    petId: "pet_bachho", theme: "gold", isFree: false, priceCoins: 150, priceBadges: 0, rarity: "legendary", name: "Kim Hổ Chiêu Tài 💰",
    body: ["#fef08a", "#facc15", "#ca8a04"], stripes: "#854d0e", belly: "#fffbeb", earPad: "#f59e0b"
  },
  skin_bachho_mecha: {
    petId: "pet_bachho", theme: "mecha", isFree: false, priceCoins: 200, priceBadges: 0, rarity: "legendary", name: "Chiến Giáp Hợp Kim 🦾",
    body: ["#cbd5e1", "#475569", "#0f172a"], stripes: "#0f172a", belly: "#f1f5f9", earPad: "#f97316"
  },
  skin_bachho_shadow: {
    petId: "pet_bachho", theme: "shadow", isFree: false, priceCoins: 300, priceBadges: 3, rarity: "legendary", name: "Hắc Hổ U Minh ⚡",
    body: ["#1e293b", "#0f172a", "#020617"], stripes: "#a855f7", belly: "#334155", earPad: "#c084fc"
  },
  // Aliases for compatibility
  skin_bachho_golden: {
    petId: "pet_bachho", theme: "golden", isFree: false, priceCoins: 220, priceBadges: 1, rarity: "epic", name: "Hoàng Kim Thần Hổ 💰",
    body: ["#fef08a", "#facc15", "#ca8a04"], stripes: "#854d0e", belly: "#fffbeb", earPad: "#f59e0b"
  },
  skin_bachho_cyber: {
    petId: "pet_bachho", theme: "cyber", isFree: false, priceCoins: 300, priceBadges: 3, rarity: "legendary", name: "Bạch Hổ Lôi Điện ⚡",
    body: ["#e0e7ff", "#818cf8", "#312e81"], stripes: "#1e1b4b", belly: "#f5f3ff", earPad: "#a855f7"
  },

  // 8. Hỏa Diễm Phượng Hoàng (pet_chutuoc)
  skin_chutuoc_default: {
    petId: "pet_chutuoc", theme: "default", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Hỏa Diễm Phượng Hoàng 🦅",
    body: ["#fed7aa", "#fb7185", "#f43f5e"], crest: ["#ec4899", "#a855f7"], chest: "#fed7aa", beak: "#facc15"
  },
  skin_chutuoc_sakura: {
    petId: "pet_chutuoc", theme: "sakura", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Hồng Vũ Mùa Hoa 🌸",
    body: ["#fbcfe8", "#f472b6", "#db2777"], crest: ["#f472b6", "#fda4af"], chest: "#fdf2f8", beak: "#f43f5e"
  },
  skin_chutuoc_gold: {
    petId: "pet_chutuoc", theme: "gold", isFree: false, priceCoins: 150, priceBadges: 0, rarity: "legendary", name: "Kim Phượng Hoàng Cung ☀️",
    body: ["#fef08a", "#facc15", "#d97706"], crest: ["#f97316", "#ef4444"], chest: "#fffbeb", beak: "#ea580c"
  },
  skin_chutuoc_cyber: {
    petId: "pet_chutuoc", theme: "cyber", isFree: false, priceCoins: 200, priceBadges: 0, rarity: "legendary", name: "Chu Tước Phản Lực 🤖",
    body: ["#a5f3fc", "#06b6d4", "#083344"], crest: ["#00f0ff", "#0284c7"], chest: "#ecfeff", beak: "#38bdf8"
  },
  skin_chutuoc_cosmic: {
    petId: "pet_chutuoc", theme: "cosmic", isFree: false, priceCoins: 300, priceBadges: 3, rarity: "legendary", name: "Tinh Vân Vũ Trụ 🌌",
    body: ["#e9d5ff", "#c084fc", "#6b21a8"], crest: ["#a855f7", "#3b0764"], chest: "#f5f3ff", beak: "#f472b6"
  },
  // Aliases for compatibility
  skin_chutuoc_solar: {
    petId: "pet_chutuoc", theme: "solar", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Thái Dương Phượng Vũ ☀️",
    body: ["#fef08a", "#facc15", "#d97706"], crest: ["#f97316", "#ef4444"], chest: "#fffbeb", beak: "#ea580c"
  },
  skin_chutuoc_phantom: {
    petId: "pet_chutuoc", theme: "phantom", isFree: false, priceCoins: 150, priceBadges: 1, rarity: "epic", name: "U Linh Chu Tước 🌌",
    body: ["#e9d5ff", "#c084fc", "#6b21a8"], crest: ["#a855f7", "#3b0764"], chest: "#f5f3ff", beak: "#f472b6"
  },
  skin_chutuoc_celestial: {
    petId: "pet_chutuoc", theme: "celestial", isFree: false, priceCoins: 300, priceBadges: 3, rarity: "legendary", name: "Bất Tử Phượng Hoàng ✨",
    body: ["#fef08a", "#f43f5e", "#881337"], crest: ["#facc15", "#e11d48"], chest: "#fff1f2", beak: "#f59e0b"
  },

  // 9. Huyền Vũ Trấn Khố (pet_huyenvu)
  skin_huyenvu_default: {
    petId: "pet_huyenvu", theme: "default", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Huyền Vũ Trấn Khố 🐢",
    body: ["#5eead4", "#2dd4bf", "#14b8a6"], shell: ["#0f766e", "#065f46", "#022c22"], gold: "#facc15", belly: "#fef08a"
  },
  skin_huyenvu_zen: {
    petId: "pet_huyenvu", theme: "zen", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Thiền Sư Cổ Thạch 🌿",
    body: ["#a7f3d0", "#34d399", "#059669"], shell: ["#14532d", "#166534", "#052e16"], gold: "#86efac", belly: "#ecfdf5"
  },
  skin_huyenvu_gold: {
    petId: "pet_huyenvu", theme: "gold", isFree: false, priceCoins: 150, priceBadges: 0, rarity: "legendary", name: "Hoàng Kim Đại Phú ✨",
    body: ["#fef08a", "#facc15", "#ca8a04"], shell: ["#a16207", "#713f12", "#451a03"], gold: "#ffffff", belly: "#fffbeb"
  },
  skin_huyenvu_mecha: {
    petId: "pet_huyenvu", theme: "mecha", isFree: false, priceCoins: 200, priceBadges: 0, rarity: "legendary", name: "Thiết Giáp Pháo Đài 🛡️",
    body: ["#cbd5e1", "#64748b", "#334155"], shell: ["#475569", "#1e293b", "#020617"], gold: "#f97316", belly: "#e2e8f0"
  },
  skin_huyenvu_abyss: {
    petId: "pet_huyenvu", theme: "abyss", isFree: false, priceCoins: 300, priceBadges: 3, rarity: "legendary", name: "Hư Không Thượng Cổ 🌌",
    body: ["#1e293b", "#0f172a", "#020617"], shell: ["#3b0764", "#2e1065", "#0f172a"], gold: "#c084fc", belly: "#334155"
  },
  // Aliases for compatibility
  skin_huyenvu_crystal: {
    petId: "pet_huyenvu", theme: "crystal", isFree: false, priceCoins: 220, priceBadges: 1, rarity: "epic", name: "Pha Lê Huyền Vũ 💎",
    body: ["#bae6fd", "#38bdf8", "#0284c7"], shell: ["#0369a1", "#075985", "#082f49"], gold: "#e0f2fe", belly: "#f0f9ff"
  },
  skin_huyenvu_celestial: {
    petId: "pet_huyenvu", theme: "celestial", isFree: false, priceCoins: 300, priceBadges: 3, rarity: "legendary", name: "Thần Quy Kim Giáp ✨",
    body: ["#fef08a", "#facc15", "#ca8a04"], shell: ["#a16207", "#713f12", "#451a03"], gold: "#ffffff", belly: "#fffbeb"
  },

  // 10. Cát Tường Kỳ Lân (pet_kylan)
  skin_kylan_default: {
    petId: "pet_kylan", theme: "default", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Cát Tường Kỳ Lân 🦄",
    body: ["#bae6fd", "#c4b5fd", "#818cf8"], mane: "#7c3aed", belly: "#e0f2fe", antler: "#facc15", hoof: "#4338ca"
  },
  skin_kylan_white: {
    petId: "pet_kylan", theme: "white", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Bạch Ngọc Thuần Khiết ❄️",
    body: ["#f8fafc", "#e2e8f0", "#cbd5e1"], mane: "#f472b6", belly: "#ffffff", antler: "#fbcfe8", hoof: "#94a3b8"
  },
  skin_kylan_gold: {
    petId: "pet_kylan", theme: "gold", isFree: false, priceCoins: 150, priceBadges: 0, rarity: "legendary", name: "Phú Quý Hoàng Triều 💰",
    body: ["#fef08a", "#fed7aa", "#f97316"], mane: "#ea580c", belly: "#fffbeb", antler: "#facc15", hoof: "#9a3412"
  },
  skin_kylan_cyber: {
    petId: "pet_kylan", theme: "cyber", isFree: false, priceCoins: 200, priceBadges: 0, rarity: "legendary", name: "Kỳ Lân Không Gian 🤖",
    body: ["#e2e8f0", "#94a3b8", "#475569"], mane: "#0284c7", belly: "#f8fafc", antler: "#00f0ff", hoof: "#0f172a"
  },
  skin_kylan_rainbow: {
    petId: "pet_kylan", theme: "rainbow", isFree: false, priceCoins: 300, priceBadges: 3, rarity: "legendary", name: "Thất Sắc Thụy Thú 🌈",
    body: ["#fbcfe8", "#38bdf8", "#c084fc"], mane: "#8b5cf6", belly: "#f0fdf4", antler: "#facc15", hoof: "#6d28d9"
  },
  // Aliases for compatibility
  skin_kylan_blossom: {
    petId: "pet_kylan", theme: "blossom", isFree: true, priceCoins: 0, priceBadges: 0, rarity: "rare", name: "Bách Hoa Kỳ Lân 🌸",
    body: ["#fed7aa", "#fbcfe8", "#f472b6"], mane: "#db2777", belly: "#fdf2f8", antler: "#fb7185", hoof: "#9d174d"
  },
  skin_kylan_solar: {
    petId: "pet_kylan", theme: "solar", isFree: false, priceCoins: 150, priceBadges: 1, rarity: "epic", name: "Kỳ Lân Thái Dương ☀️",
    body: ["#fef08a", "#fed7aa", "#f97316"], mane: "#ea580c", belly: "#fffbeb", antler: "#facc15", hoof: "#9a3412"
  },
  skin_kylan_mecha: {
    petId: "pet_kylan", theme: "mecha", isFree: false, priceCoins: 220, priceBadges: 1, rarity: "epic", name: "Kỳ Lân Cơ Giáp 🤖",
    body: ["#e2e8f0", "#94a3b8", "#475569"], mane: "#0284c7", belly: "#f8fafc", antler: "#00f0ff", hoof: "#0f172a"
  }
};

/* ─── 1. MỘC LINH NHI (pet_moc) ─── */
function renderPetMoc(m, uid, skinKey) {
  const isSleeping = m === "sleeping";
  const isCrying = m === "crying";
  const isParty = m === "party";
  const sk = LINH_THU_SKINS[skinKey] || LINH_THU_SKINS.skin_moc_default;
  const theme = sk.theme || "default";

  let costume = "";
  if (theme === "sakura") {
    costume = `
      <g class="moc-costume-sakura">
        <circle cx="50" cy="38" r="6" fill="#f43f5e"/><circle cx="50" cy="38" r="2.5" fill="#fef08a"/>
        <circle cx="38" cy="42" r="5" fill="#fda4af"/><circle cx="38" cy="42" r="2" fill="#fff"/>
        <circle cx="150" cy="38" r="6" fill="#f43f5e"/><circle cx="150" cy="38" r="2.5" fill="#fef08a"/>
        <circle cx="162" cy="42" r="5" fill="#fda4af"/><circle cx="162" cy="42" r="2" fill="#fff"/>
        <ellipse cx="44" cy="120" rx="4.5" ry="2.2" fill="#fda4af" transform="rotate(-30 44 120)" opacity="0.85"/>
        <ellipse cx="156" cy="125" rx="4" ry="2" fill="#fda4af" transform="rotate(25 156 125)" opacity="0.85"/>
        <ellipse cx="100" cy="50" rx="4" ry="2" fill="#f472b6" opacity="0.85"/>
      </g>`;
  } else if (theme === "autumn") {
    costume = `
      <g class="moc-costume-autumn">
        <polygon points="50,34 56,40 48,38" fill="#ef4444"/>
        <polygon points="38,40 44,46 36,44" fill="#f97316"/>
        <polygon points="150,34 144,40 152,38" fill="#ef4444"/>
        <polygon points="162,40 156,46 164,44" fill="#f97316"/>
        <ellipse cx="46" cy="120" rx="4.5" ry="2.5" fill="#f59e0b" transform="rotate(-40 46 120)" opacity="0.9"/>
        <ellipse cx="154" cy="128" rx="4.5" ry="2.5" fill="#ea580c" transform="rotate(35 154 128)" opacity="0.9"/>
      </g>`;
  } else if (theme === "cyber") {
    costume = `
      <g class="moc-costume-cyber">
        <line x1="50" y1="42" x2="68" y2="60" stroke="#00f0ff" stroke-width="2" stroke-dasharray="3 2"/>
        <line x1="150" y1="42" x2="132" y2="60" stroke="#00f0ff" stroke-width="2" stroke-dasharray="3 2"/>
        <circle cx="100" cy="50" r="3.5" fill="#00f0ff"/>
        <circle cx="100" cy="50" r="7" fill="none" stroke="#00f0ff" stroke-width="1.2" opacity="0.7"/>
      </g>`;
  } else if (theme === "celestial") {
    costume = `
      <g class="moc-costume-celestial">
        <circle cx="100" cy="116" r="54" fill="none" stroke="#fde047" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.75"/>
        <polygon points="100,48 103,54 110,56 103,58 100,64 97,58 90,56 97,54" fill="#fff"/>
        <polygon points="50,110 53,114 58,115 53,116 50,121 48,116 43,115 48,114" fill="#fde047"/>
        <polygon points="150,110 153,114 158,115 153,116 150,121 148,116 143,115 148,114" fill="#fde047"/>
      </g>`;
  }

  return `
    <defs>
      <linearGradient id="${uid}_moc_b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${sk.body[0]}"/>
        <stop offset="60%" stop-color="${sk.body[1]}"/>
        <stop offset="100%" stop-color="${sk.body[2]}"/>
      </linearGradient>
      <linearGradient id="${uid}_moc_wood" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${sk.wood[0]}"/>
        <stop offset="100%" stop-color="${sk.wood[1]}"/>
      </linearGradient>
    </defs>
    <g class="linhthu-model pet-moc" style="transform-origin: 100px 140px;">
      <g class="moc-antlers">
        <path d="M78 82 C68 62 50 48 36 44 M58 60 C52 46 46 36 50 34 M46 50 C38 42 32 38 36 40" stroke="url(#${uid}_moc_wood)" stroke-width="5" stroke-linecap="round" fill="none"/>
        <ellipse cx="50" cy="34" rx="4.5" ry="3" fill="${sk.leaf}" transform="rotate(-30 50 34)"/>
        <ellipse cx="36" cy="42" rx="4.5" ry="3" fill="${sk.leaf}" transform="rotate(-45 36 42)"/>
        <ellipse cx="30" cy="54" rx="4.5" ry="3" fill="${sk.leaf}"/>
        <path d="M122 82 C132 62 150 48 164 44 M142 60 C148 46 154 36 150 34 M154 50 C162 42 168 38 164 40" stroke="url(#${uid}_moc_wood)" stroke-width="5" stroke-linecap="round" fill="none"/>
        <ellipse cx="150" cy="34" rx="4.5" ry="3" fill="${sk.leaf}" transform="rotate(30 150 34)"/>
        <ellipse cx="164" cy="42" rx="4.5" ry="3" fill="${sk.leaf}" transform="rotate(45 164 42)"/>
        <ellipse cx="170" cy="54" rx="4.5" ry="3" fill="${sk.leaf}"/>
      </g>
      <path d="M100 68 Q100 54 100 48" stroke="${sk.leaf}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <path d="M100 54 Q92 48 93 42 Q100 46 100 52 Z" fill="${sk.leaf}"/>
      <path d="M100 52 Q108 46 107 40 Q100 44 100 50 Z" fill="${sk.leaf}"/>
      <path d="M100 64 C136 64 150 94 150 134 C150 168 132 184 100 184 C68 184 50 168 50 134 C50 94 64 64 100 64 Z" fill="url(#${uid}_moc_b)"/>
      <path d="M64 88 C58 104 58 138 64 154" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.35"/>
      <ellipse cx="82" cy="184" rx="8" ry="5.5" fill="${sk.body[2]}"/>
      <ellipse cx="118" cy="184" rx="8" ry="5.5" fill="${sk.body[2]}"/>
      ${costume}
      ${isSleeping ? `
        <path d="M76 116 Q82 122 88 116" stroke="${sk.glasses}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <path d="M112 116 Q118 122 124 116" stroke="${sk.glasses}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      ` : isParty ? `
        <path d="M76 118 Q82 110 88 118" stroke="${sk.glasses}" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M112 118 Q118 110 124 118" stroke="${sk.glasses}" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      ` : `
        <ellipse cx="82" cy="116" rx="6.5" ry="8" fill="#1e293b"/>
        <ellipse cx="82" cy="117" rx="5" ry="6" fill="${sk.glasses}"/>
        <circle cx="80" cy="113" r="2.8" fill="#fff"/>
        <circle cx="84" cy="119" r="1.4" fill="#fff"/>
        <ellipse cx="118" cy="116" rx="6.5" ry="8" fill="#1e293b"/>
        <ellipse cx="118" cy="117" rx="5" ry="6" fill="${sk.glasses}"/>
        <circle cx="116" cy="113" r="2.8" fill="#fff"/>
        <circle cx="120" cy="119" r="1.4" fill="#fff"/>
      `}
      ${isCrying ? `
        <path class="tear" d="M82 124 Q78 136 82 140 Q86 136 82 124 Z" fill="#38bdf8"/>
        <path class="tear" d="M118 124 Q114 136 118 140 Q122 136 118 124 Z" fill="#38bdf8"/>
      ` : ""}
      <g class="moc-glasses">
        <circle cx="82" cy="116" r="14.5" fill="rgba(255,255,255,0.15)" stroke="#3f2314" stroke-width="2.4"/>
        <circle cx="118" cy="116" r="14.5" fill="rgba(255,255,255,0.15)" stroke="#3f2314" stroke-width="2.4"/>
        <path d="M96.5 116 Q100 113.5 103.5 116" stroke="#3f2314" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <line x1="67.5" y1="116" x2="54" y2="114" stroke="#3f2314" stroke-width="2" stroke-linecap="round"/>
        <line x1="132.5" y1="116" x2="146" y2="114" stroke="#3f2314" stroke-width="2" stroke-linecap="round"/>
      </g>
      <ellipse cx="68" cy="126" rx="7.5" ry="5" fill="#fb7185" opacity="0.65"/>
      <ellipse cx="132" cy="126" rx="7.5" ry="5" fill="#fb7185" opacity="0.65"/>
      <path d="M96 126 Q100 131 104 126" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      <path d="M68 144 C64 150 72 156 78 150 C82 146 76 140 68 144 Z" fill="${sk.body[1]}" stroke="${sk.body[2]}" stroke-width="1.2"/>
      <path d="M132 144 C136 150 128 156 122 150 C118 146 124 140 132 144 Z" fill="${sk.body[1]}" stroke="${sk.body[2]}" stroke-width="1.2"/>
    </g>`;
}

/* ─── 2. XÍCH VIÊM LINH (pet_hoa) ─── */
function renderPetHoa(m, uid, skinKey) {
  const isSleeping = m === "sleeping";
  const isCrying = m === "crying";
  const isParty = m === "party";
  const sk = LINH_THU_SKINS[skinKey] || LINH_THU_SKINS.skin_hoa_default;
  const theme = sk.theme || "default";

  let costume = "";
  if (theme === "blue") {
    costume = `
      <circle cx="52" cy="74" r="4.5" fill="#93c5fd" opacity="0.85"/>
      <circle cx="148" cy="70" r="5" fill="#60a5fa" opacity="0.85"/>
      <polygon points="100,32 94,22 100,26 106,22" fill="#38bdf8"/>
      <circle cx="100" cy="26" r="2" fill="#fff"/>`;
  } else if (theme === "solar") {
    costume = `
      <path d="M100 22 L100 10 M64 34 L52 22 M136 34 L148 22 M40 64 L26 62 M160 64 L174 62" stroke="#fde047" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
      <circle cx="100" cy="8" r="4" fill="#facc15"/>`;
  } else if (theme === "mecha") {
    costume = `
      <rect x="68" y="104" width="64" height="13" rx="3.5" fill="rgba(239,68,68,0.3)" stroke="#ef4444" stroke-width="2"/>
      <line x1="72" y1="110.5" x2="88" y2="110.5" stroke="#ef4444" stroke-width="1.5"/>
      <circle cx="92" cy="110.5" r="1.8" fill="#fde047"/>`;
  } else if (theme === "abyss") {
    costume = `
      <circle cx="100" cy="14" r="4" fill="#f0abfc"/>
      <circle cx="56" cy="90" r="2.2" fill="#fff"/>
      <circle cx="144" cy="88" r="2.2" fill="#fff"/>`;
  }

  return `
    <defs>
      <linearGradient id="${uid}_hoa_b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${sk.body[0]}"/>
        <stop offset="35%" stop-color="${sk.body[1]}"/>
        <stop offset="75%" stop-color="${sk.body[2]}"/>
        <stop offset="100%" stop-color="${sk.body[3]}"/>
      </linearGradient>
    </defs>
    <g class="linhthu-model pet-hoa" style="transform-origin: 100px 140px;">
      <g class="hoa-crest">
        <path d="M100 46 Q92 24 104 14 Q114 26 102 44 Z" fill="${sk.body[0]}"/>
        <path d="M88 54 Q70 34 82 24 Q92 40 86 52 Z" fill="${sk.body[1]}"/>
        <path d="M112 54 Q130 34 118 24 Q108 40 114 52 Z" fill="${sk.body[1]}"/>
        <path d="M78 68 Q62 54 70 46 Q80 58 76 66 Z" fill="${sk.body[1]}"/>
        <path d="M122 68 Q138 54 130 46 Q120 58 124 66 Z" fill="${sk.body[1]}"/>
      </g>
      <path d="M52 112 Q38 120 46 130 Q54 134 54 124 Z" fill="${sk.body[1]}"/>
      <path d="M148 112 Q162 120 154 130 Q146 134 146 124 Z" fill="${sk.body[1]}"/>
      <path d="M100 44 C118 58 136 78 146 100 C156 124 150 152 136 168 C124 182 76 182 64 168 C50 152 44 124 54 100 C64 78 82 58 100 44 Z" fill="url(#${uid}_hoa_b)"/>
      <ellipse cx="84" cy="180" rx="8" ry="5.5" fill="${sk.feet || '#b91c1c'}"/>
      <ellipse cx="116" cy="180" rx="8" ry="5.5" fill="${sk.feet || '#b91c1c'}"/>
      ${costume}
      ${isSleeping ? `
        <path d="M76 114 Q83 120 90 114" stroke="#4a044e" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <path d="M110 114 Q117 120 124 114" stroke="#4a044e" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      ` : isParty ? `
        <path d="M76 116 Q83 108 90 116" stroke="#4a044e" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M110 116 Q117 108 124 116" stroke="#4a044e" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      ` : `
        <path d="M74 108 C78 102 88 102 92 108" stroke="#3b0764" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <path d="M108 108 C112 102 122 102 126 108" stroke="#3b0764" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <ellipse cx="83" cy="114" rx="7.5" ry="9" fill="#2e1065"/>
        <ellipse cx="83" cy="117" rx="6" ry="5.5" fill="#c084fc"/>
        <circle cx="81" cy="110" r="3" fill="#fff"/>
        <circle cx="86" cy="118" r="1.5" fill="#fff"/>
        <circle cx="80" cy="117" r="1" fill="#fdf4ff"/>
        <ellipse cx="117" cy="114" rx="7.5" ry="9" fill="#2e1065"/>
        <ellipse cx="117" cy="117" rx="6" ry="5.5" fill="#c084fc"/>
        <circle cx="115" cy="110" r="3" fill="#fff"/>
        <circle cx="120" cy="118" r="1.5" fill="#fff"/>
        <circle cx="114" cy="117" r="1" fill="#fdf4ff"/>
      `}
      ${isCrying ? `
        <path class="tear" d="M82 122 Q78 134 82 138 Q86 134 82 122 Z" fill="#38bdf8"/>
        <path class="tear" d="M118 122 Q114 134 118 138 Q122 134 118 122 Z" fill="#38bdf8"/>
      ` : ""}
      <circle cx="68" cy="124" r="6.5" fill="#f43f5e" opacity="0.65"/>
      <circle cx="132" cy="124" r="6.5" fill="#f43f5e" opacity="0.65"/>
      <path d="M96 122 Q100 119 104 122 Q100 130 96 122 Z" fill="#f59e0b" stroke="#b45309" stroke-width="1.2"/>
      <ellipse cx="100" cy="125" rx="2.2" ry="1.4" fill="#f43f5e"/>
      <path d="M72 142 C66 148 74 156 80 150 C84 146 78 138 72 142 Z" fill="${sk.body[1]}" stroke="${sk.body[2]}" stroke-width="1.2"/>
      <path d="M128 142 C134 148 126 156 120 150 C116 146 122 138 128 142 Z" fill="${sk.body[1]}" stroke="${sk.body[2]}" stroke-width="1.2"/>
    </g>`;
}

/* ─── 3. THẠCH THỔ LINH (pet_tho) ─── */
function renderPetTho(m, uid, skinKey) {
  const isSleeping = m === "sleeping";
  const isCrying = m === "crying";
  const isParty = m === "party";
  const sk = LINH_THU_SKINS[skinKey] || LINH_THU_SKINS.skin_tho_default;
  const theme = sk.theme || "default";

  let costume = "";
  if (theme === "moss") {
    costume = `
      <circle cx="84" cy="66" r="6" fill="#15803d" opacity="0.9"/>
      <circle cx="116" cy="66" r="6.5" fill="#15803d" opacity="0.9"/>
      <circle cx="94" cy="56" r="3.5" fill="#f43f5e"/>
      <circle cx="106" cy="56" r="3.5" fill="#f59e0b"/>`;
  } else if (theme === "crystal") {
    costume = `
      <polygon points="90,68 94,42 100,68" fill="#93c5fd" opacity="0.95"/>
      <polygon points="100,68 104,32 108,68" fill="#60a5fa" opacity="0.95"/>
      <polygon points="108,68 114,44 118,68" fill="#38bdf8" opacity="0.95"/>`;
  } else if (theme === "cyber") {
    costume = `
      <rect x="68" y="112" width="64" height="13" rx="3.5" fill="rgba(245,158,11,0.25)" stroke="#f59e0b" stroke-width="2"/>
      <line x1="72" y1="118.5" x2="86" y2="118.5" stroke="#f59e0b" stroke-width="1.5"/>
      <circle cx="90" cy="118.5" r="1.8" fill="#fde047"/>`;
  } else if (theme === "magma") {
    costume = `
      <ellipse cx="100" cy="68" rx="14" ry="6" fill="#450a0a" stroke="#ef4444" stroke-width="2"/>
      <polygon points="96,58 100,48 98,56" fill="#ef4444"/>
      <polygon points="102,56 106,44 104,54" fill="#facc15"/>`;
  }

  return `
    <defs>
      <linearGradient id="${uid}_tho_b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${sk.body[0]}"/>
        <stop offset="50%" stop-color="${sk.body[1]}"/>
        <stop offset="100%" stop-color="${sk.body[2]}"/>
      </linearGradient>
    </defs>
    <g class="linhthu-model pet-tho" style="transform-origin: 100px 140px;">
      <g class="tho-head-rocks">
        <polygon points="78,82 86,72 92,78 84,86" fill="#475569" stroke="#1e293b" stroke-width="1.2"/>
        <polygon points="78,82 86,72 88,77 82,84" fill="#64748b"/>
        <polygon points="94,76 102,62 112,68 108,78 96,78" fill="#64748b" stroke="#334155" stroke-width="1.5"/>
        <polygon points="94,76 102,62 106,70 98,77" fill="#94a3b8"/>
        <polygon points="116,80 124,70 130,76 122,86" fill="#64748b" stroke="#334155" stroke-width="1.2"/>
        <polygon points="116,80 124,70 126,76 120,84" fill="#94a3b8"/>
        <path d="M72 84 Q66 70 68 64 Q74 72 76 82" fill="${sk.grass}"/>
        <path d="M90 74 Q92 58 96 54 Q98 64 94 74" fill="${sk.grass}"/>
        <path d="M128 82 Q134 68 132 62 Q126 70 124 80" fill="${sk.grass}"/>
        <path d="M142 92 Q150 82 152 78 Q148 86 140 92" fill="${sk.grass}"/>
      </g>
      <path d="M100 68 C112 68 124 72 134 80 C146 90 156 104 158 122 C160 140 154 158 142 170 C130 182 116 184 100 184 C84 184 70 182 58 170 C46 158 40 140 42 122 C44 104 54 90 66 80 C76 72 88 68 100 68 Z" fill="url(#${uid}_tho_b)"/>
      <circle cx="70" cy="98" r="2.5" fill="#451a03" opacity="0.35"/>
      <circle cx="132" cy="104" r="2.8" fill="#451a03" opacity="0.35"/>
      <circle cx="120" cy="164" r="2.2" fill="#451a03" opacity="0.35"/>
      <circle cx="82" cy="162" r="2.2" fill="#451a03" opacity="0.35"/>
      <polygon points="46,174 54,170 58,178 50,182" fill="#64748b" stroke="#334155" stroke-width="1"/>
      <polygon points="34,180 40,176 42,182 36,184" fill="#475569"/>
      <polygon points="146,174 154,170 158,178 150,182" fill="#64748b" stroke="#334155" stroke-width="1"/>
      <polygon points="160,180 166,176 168,182 162,184" fill="#475569"/>
      ${costume}
      <path d="M72 108 Q80 102 88 106" stroke="#fed7aa" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M128 108 Q120 102 112 106" stroke="#fed7aa" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      ${isSleeping ? `
        <path d="M76 122 Q84 128 92 122" stroke="#451a03" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M108 122 Q116 128 124 122" stroke="#451a03" stroke-width="3" stroke-linecap="round" fill="none"/>
      ` : isParty ? `
        <path d="M76 124 Q84 114 92 124" stroke="#451a03" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M108 124 Q116 114 124 124" stroke="#451a03" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      ` : `
        <ellipse cx="80" cy="120" rx="8" ry="9" fill="#291305"/>
        <ellipse cx="80" cy="123" rx="6.5" ry="5.5" fill="#92400e"/>
        <circle cx="77" cy="117" r="3.2" fill="#fff"/>
        <circle cx="83" cy="124" r="1.6" fill="#fff"/>
        <ellipse cx="120" cy="120" rx="8" ry="9" fill="#291305"/>
        <ellipse cx="120" cy="123" rx="6.5" ry="5.5" fill="#92400e"/>
        <circle cx="117" cy="117" r="3.2" fill="#fff"/>
        <circle cx="123" cy="124" r="1.6" fill="#fff"/>
      `}
      ${isCrying ? `
        <path class="tear" d="M80 128 Q76 138 80 142 Q84 138 80 128 Z" fill="#38bdf8"/>
        <path class="tear" d="M120 128 Q116 138 120 142 Q124 138 120 128 Z" fill="#38bdf8"/>
      ` : ""}
      <ellipse cx="66" cy="128" rx="7.5" ry="5" fill="#fb7185" opacity="0.65"/>
      <ellipse cx="134" cy="128" rx="7.5" ry="5" fill="#fb7185" opacity="0.65"/>
      <path d="M94 128 Q100 133 106 128" stroke="#291305" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <ellipse cx="50" cy="136" rx="6.5" ry="9" fill="${sk.body[1]}" stroke="${sk.body[2]}" stroke-width="1.2" transform="rotate(15 50 136)"/>
      <ellipse cx="150" cy="136" rx="6.5" ry="9" fill="${sk.body[1]}" stroke="${sk.body[2]}" stroke-width="1.2" transform="rotate(-15 150 136)"/>
    </g>`;
}

/* ─── CÁC BỘ RENDER RIÊNG BIỆT CHO TỪNG LINH THÚ (10 LINH THÚ CHÍNH THỨC) ─── */

/* ─── 4. HOÀNG KIM LINH (pet_kim) ───
   Chuông vàng phong thủy, bánh răng cơ khí, đai bạc và Kính một tròng (Monocle) trí tuệ */
function renderPetKim(m, uid, skinKey) {
  const isSleeping = m === "sleeping";
  const isCrying = m === "crying";
  const isParty = m === "party";
  const sk = LINH_THU_SKINS[skinKey] || LINH_THU_SKINS.skin_kim_default;

  return `
    <defs>
      <linearGradient id="${uid}_kim_b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${sk.body[0]}"/>
        <stop offset="50%" stop-color="${sk.body[1]}"/>
        <stop offset="100%" stop-color="${sk.body[2]}"/>
      </linearGradient>
    </defs>
    <g class="linhthu-model pet-kim" style="transform-origin: 100px 140px;">
      <!-- Bánh răng cơ khí phía trên bên trái -->
      <g class="kim-gear" transform="translate(62 48)">
        <circle cx="0" cy="0" r="16" fill="none" stroke="${sk.gear || '#94a3b8'}" stroke-width="7" stroke-dasharray="6 4"/>
        <circle cx="0" cy="0" r="14" fill="${sk.gear || '#94a3b8'}" opacity="0.4"/>
        <circle cx="0" cy="0" r="6" fill="#0f172a"/>
      </g>

      <!-- Quai chuông đỉnh vòm cong -->
      <path d="M 88 56 C 88 38 112 38 112 56" stroke="${sk.body[2]}" stroke-width="6" stroke-linecap="round" fill="none"/>
      <path d="M 91 54 C 91 42 109 42 109 54" stroke="${sk.body[0]}" stroke-width="2.5" stroke-linecap="round" fill="none"/>

      <!-- Thân chuông vàng tròn trịa tỏa sáng -->
      <path d="M 100 52 C 126 52 142 76 144 115 C 146 138 156 150 160 152 C 140 155 60 155 40 152 C 44 150 54 138 56 115 C 58 76 74 52 100 52 Z" fill="url(#${uid}_kim_b)"/>
      
      <!-- Vệt phản quang mượt mà bên trái chuông -->
      <path d="M 68 74 C 62 94 62 118 65 134" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" fill="none" opacity="0.5"/>

      <!-- Quả chuông / chốt gõ tròn màu vàng rực phía dưới -->
      <ellipse cx="100" cy="170" rx="11" ry="8" fill="${sk.body[1]}" stroke="${sk.body[2]}" stroke-width="2"/>

      <!-- Vành đai bạc bo góc mềm mại ở chân chuông -->
      <rect x="36" y="148" width="128" height="19" rx="8" fill="${sk.rim || '#cbd5e1'}" stroke="#64748b" stroke-width="2.6"/>
      <rect x="42" y="151" width="116" height="4" rx="2" fill="#ffffff" opacity="0.65"/>

      <!-- Má hồng hào đáng yêu -->
      <ellipse cx="68" cy="126" rx="8" ry="5.5" fill="#fb7185" opacity="0.75"/>
      <ellipse cx="132" cy="126" rx="8" ry="5.5" fill="#fb7185" opacity="0.75"/>

      <!-- Nụ cười duyên dáng -->
      <path d="M 94 125 Q 100 131 106 125" stroke="#451a03" stroke-width="2.5" stroke-linecap="round" fill="none"/>

      <!-- Mắt phải (bên trái người xem): Mắt hoạt hình long lanh -->
      ${isSleeping ? `
        <path d="M 74 117 Q 80 123 86 117" stroke="#451a03" stroke-width="3" stroke-linecap="round" fill="none"/>
      ` : isParty ? `
        <path d="M 74 119 Q 80 111 86 119" stroke="#451a03" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      ` : `
        <ellipse cx="80" cy="116" rx="8" ry="9.5" fill="#451a03"/>
        <circle cx="77" cy="113" r="3.2" fill="#fff"/>
        <circle cx="83" cy="119" r="1.5" fill="#fff"/>
      `}

      <!-- Mắt trái (bên phải người xem): Đeo Kính Một Tròng (Monocle) cổ điển trí tuệ -->
      ${isSleeping ? `
        <path d="M 114 117 Q 120 123 126 117" stroke="#451a03" stroke-width="3" stroke-linecap="round" fill="none"/>
      ` : isParty ? `
        <path d="M 114 119 Q 120 111 126 119" stroke="#451a03" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      ` : `
        <ellipse cx="120" cy="116" rx="8" ry="9.5" fill="#451a03"/>
        <circle cx="117" cy="113" r="3.2" fill="#fff"/>
        <circle cx="123" cy="119" r="1.5" fill="#fff"/>
      `}

      <!-- Tròng kính Monocle và gọng kính bạc -->
      <circle cx="120" cy="116" r="15" fill="#bae6fd" fill-opacity="0.35"/>
      <circle cx="120" cy="116" r="15" fill="none" stroke="${sk.monocle || '#64748b'}" stroke-width="3"/>
      <!-- Ánh sáng phản quang trên kính -->
      <path d="M 112 110 L 126 106" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>
      <!-- Khớp nối gọng kính bên hông -->
      <path d="M 135 116 L 146 117" stroke="${sk.monocle || '#64748b'}" stroke-width="2.8" stroke-linecap="round"/>

      ${isCrying ? `
        <path class="tear" d="M 80 126 Q 76 138 80 144 Q 84 138 80 126 Z" fill="#38bdf8"/>
        <path class="tear" d="M 120 126 Q 116 138 120 144 Q 124 138 120 126 Z" fill="#38bdf8"/>
      ` : ""}
    </g>`;
}

/* ─── 5. LAM THỦY LINH (pet_thuy) ───
   Giọt nước biển sâu đáng yêu, vây cá axolotl và bong bóng thanh lọc */
function renderPetThuy(m, uid, skinKey) {
  const isSleeping = m === "sleeping";
  const isCrying = m === "crying";
  const isParty = m === "party";
  const sk = LINH_THU_SKINS[skinKey] || LINH_THU_SKINS.skin_thuy_default;

  return `
    <defs>
      <linearGradient id="${uid}_thuy_b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${sk.body[0]}"/>
        <stop offset="50%" stop-color="${sk.body[1]}"/>
        <stop offset="100%" stop-color="${sk.body[2]}"/>
      </linearGradient>
    </defs>
    <g class="linhthu-model pet-thuy" style="transform-origin: 100px 140px;">
      <!-- Tai vây cá mềm mại hai bên -->
      <path d="M 50 100 C 32 86 28 112 46 118 Z" fill="${sk.body[1]}"/>
      <path d="M 150 100 C 168 86 172 112 154 118 Z" fill="${sk.body[1]}"/>
      
      <!-- Thân giọt nước tròn trĩnh mịn màng -->
      <path d="M 100 50 C 126 72 144 94 144 130 C 144 164 124 182 100 182 C 76 182 56 164 56 130 C 56 94 74 72 100 50 Z" fill="url(#${uid}_thuy_b)"/>
      <ellipse cx="78" cy="182" rx="10" ry="5.5" fill="${sk.body[2]}"/>
      <ellipse cx="122" cy="182" rx="10" ry="5.5" fill="${sk.body[2]}"/>

      <!-- Đốm sáng phản quang giọt nước -->
      <ellipse cx="85" cy="80" rx="10" ry="14" transform="rotate(-25 85 80)" fill="#ffffff" opacity="0.45"/>
      <circle cx="95" cy="65" r="4" fill="#ffffff" opacity="0.6"/>

      <!-- Mắt giọt nước -->
      ${isSleeping ? `
        <path d="M 76 122 Q 84 128 92 122" stroke="#082f49" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <path d="M 108 122 Q 116 128 124 122" stroke="#082f49" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      ` : isParty ? `
        <path d="M 76 124 Q 84 114 92 124" stroke="#082f49" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 108 124 Q 116 114 124 124" stroke="#082f49" stroke-width="3" stroke-linecap="round" fill="none"/>
      ` : `
        <ellipse cx="84" cy="120" rx="7.5" ry="9" fill="#082f49"/>
        <circle cx="81" cy="116" r="3" fill="#fff"/>
        <circle cx="87" cy="122" r="1.5" fill="#fff"/>
        <ellipse cx="116" cy="120" rx="7.5" ry="9" fill="#082f49"/>
        <circle cx="113" cy="116" r="3" fill="#fff"/>
        <circle cx="119" cy="122" r="1.5" fill="#fff"/>
      `}
      ${isCrying ? `
        <path class="tear" d="M 84 126 Q 80 138 84 142 Q 88 138 84 126 Z" fill="#38bdf8"/>
        <path class="tear" d="M 116 126 Q 112 138 116 142 Q 120 138 116 126 Z" fill="#38bdf8"/>
      ` : ""}
      <ellipse cx="72" cy="128" rx="7" ry="4.5" fill="#f472b6" opacity="0.6"/>
      <ellipse cx="128" cy="128" rx="7" ry="4.5" fill="#f472b6" opacity="0.6"/>
      <path d="M 96 128 Q 100 133 104 128" stroke="#082f49" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    </g>`;
}

/* ─── 6. THANH LONG (pet_thanhlong) ───
   Rồng phương Đông uốn lượn hình chữ S, sừng hươu vàng, râu rồng bay lượn, bụng vảy xếp tầng */
function renderPetThanhlong(m, uid, skinKey) {
  const isSleeping = m === "sleeping";
  const isCrying = m === "crying";
  const isParty = m === "party";
  const sk = LINH_THU_SKINS[skinKey] || LINH_THU_SKINS.skin_thanhlong_default;

  return `
    <defs>
      <linearGradient id="${uid}_tl_b" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${sk.body[0]}"/>
        <stop offset="50%" stop-color="${sk.body[1]}"/>
        <stop offset="100%" stop-color="${sk.body[2]}"/>
      </linearGradient>
    </defs>
    <g class="linhthu-model pet-thanhlong" style="transform-origin: 110px 100px;">
      <!-- Búi lông đuôi rồng mềm mại rực rỡ -->
      <path d="M 68 122 C 50 128 42 145 52 160 C 58 172 74 175 78 165 C 84 154 78 142 82 135 Z" fill="${sk.mane || '#7e22ce'}"/>

      <!-- Thân rồng uốn lượn chữ S mềm mại -->
      <path d="M 124 74 C 146 88 152 114 142 135 C 130 156 96 168 78 156 C 62 145 60 128 72 118 C 82 110 92 116 92 126 C 92 138 106 146 120 138 C 132 132 136 118 128 104 C 122 92 112 85 106 80" fill="none" stroke="url(#${uid}_tl_b)" stroke-width="26" stroke-linecap="round"/>

      <!-- Vây gai lưng rồng sắc nét dọc sống lưng -->
      <path d="M 136 88 L 144 86 L 138 96 L 148 98 L 140 108 L 148 116 L 138 124 L 144 132 L 132 138" stroke="${sk.mane || '#7e22ce'}" stroke-width="3" fill="none" stroke-linecap="round"/>

      <!-- Bụng rồng màu hồng phấn / kem với các đường khía vảy ngang -->
      <path d="M 118 78 C 138 92 142 114 132 132 C 122 150 94 160 80 150" fill="none" stroke="${sk.belly || '#fce7f3'}" stroke-width="12" stroke-linecap="round"/>
      <path d="M 130 96 L 140 100 M 126 112 L 136 116 M 118 128 L 128 132 M 106 142 L 116 144" stroke="${sk.body[2]}" stroke-width="1.8" stroke-linecap="round" opacity="0.4"/>

      <!-- Móng vuốt rồng phía trước tinh nghịch -->
      <g transform="translate(136 112)">
        <path d="M 0 0 C 8 4 12 10 10 16 C 6 18 2 12 0 8 Z" fill="${sk.body[1]}"/>
        <circle cx="9" cy="14" r="1.5" fill="#fff"/>
        <circle cx="6" cy="17" r="1.5" fill="#fff"/>
      </g>

      <!-- Đầu rồng Chibi Chân Mệnh -->
      <!-- Bờm rồng tím bồng bềnh sau gáy -->
      <path d="M 92 60 C 82 48 96 40 104 46 C 110 32 128 34 132 44 C 144 34 154 48 148 60 C 158 72 144 86 136 84 C 126 92 106 90 96 82 C 86 78 86 66 92 60 Z" fill="${sk.mane || '#7e22ce'}"/>

      <!-- Khối mặt rồng -->
      <path d="M 102 68 C 102 48 140 48 140 68 C 140 86 102 86 102 68 Z" fill="url(#${uid}_tl_b)"/>

      <!-- Đôi sừng rồng màu vàng ngọc uy nghiêm -->
      <path d="M 108 50 Q 102 34 96 24 M 100 36 Q 92 34 88 36" stroke="${sk.horn || '#fef08a'}" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      <path d="M 130 50 Q 136 34 142 24 M 134 36 Q 142 34 146 36" stroke="${sk.horn || '#fef08a'}" stroke-width="3.2" stroke-linecap="round" fill="none"/>

      <!-- Lông mày rồng tím rậm rạp biểu cảm -->
      <path d="M 108 58 Q 114 53 118 58" stroke="${sk.mane || '#7e22ce'}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
      <path d="M 126 58 Q 130 53 136 58" stroke="${sk.mane || '#7e22ce'}" stroke-width="3.6" stroke-linecap="round" fill="none"/>

      <!-- Mắt rồng anime to tròn linh động -->
      ${isSleeping ? `
        <path d="M 110 68 Q 115 74 120 68" stroke="#2e1065" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 126 68 Q 131 74 136 68" stroke="#2e1065" stroke-width="3" stroke-linecap="round" fill="none"/>
      ` : isParty ? `
        <path d="M 110 70 Q 115 62 120 70" stroke="#2e1065" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 126 70 Q 131 62 136 70" stroke="#2e1065" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      ` : `
        <ellipse cx="114" cy="68" rx="6.5" ry="8" fill="#2e1065"/>
        <circle cx="112" cy="65" r="2.8" fill="#fff"/>
        <ellipse cx="132" cy="68" rx="6.5" ry="8" fill="#2e1065"/>
        <circle cx="130" cy="65" r="2.8" fill="#fff"/>
      `}

      <!-- Râu rồng dài uốn lượn bay bổng hai bên -->
      <path d="M 108 76 C 90 82 82 72 74 80 C 70 84 72 90 76 88" stroke="${sk.whisker || '#a855f7'}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <path d="M 134 76 C 152 82 160 72 168 80 C 172 84 170 90 166 88" stroke="${sk.whisker || '#a855f7'}" stroke-width="2.6" stroke-linecap="round" fill="none"/>

      <!-- Má hồng đáng yêu -->
      <ellipse cx="106" cy="74" rx="5.5" ry="4" fill="#f472b6" opacity="0.75"/>
      <ellipse cx="138" cy="74" rx="5.5" ry="4" fill="#f472b6" opacity="0.75"/>

      <!-- Miệng cười mở rộng tươi tắn -->
      <path d="M 119 76 Q 124 83 129 76 Z" fill="#7e22ce"/>
      <path d="M 121 78 Q 124 83 127 78 Z" fill="#f43f5e"/>

      ${isCrying ? `
        <path class="tear" d="M 114 74 Q 110 84 114 88 Q 118 84 114 74 Z" fill="#38bdf8"/>
        <path class="tear" d="M 132 74 Q 128 84 132 88 Q 136 84 132 74 Z" fill="#38bdf8"/>
      ` : ""}
    </g>`;
}

/* ─── 7. BẠCH HỔ (pet_bachho) ───
   Hổ con chibi đứng thẳng hai chân, vằn hổ nâu ấm áp, bụng kem tròn trĩnh, nụ cười hở răng nanh */
function renderPetBachho(m, uid, skinKey) {
  const isSleeping = m === "sleeping";
  const isCrying = m === "crying";
  const isParty = m === "party";
  const sk = LINH_THU_SKINS[skinKey] || LINH_THU_SKINS.skin_bachho_default;

  return `
    <defs>
      <linearGradient id="${uid}_bh_b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${sk.body[0]}"/>
        <stop offset="50%" stop-color="${sk.body[1]}"/>
        <stop offset="100%" stop-color="${sk.body[2]}"/>
      </linearGradient>
    </defs>
    <g class="linhthu-model pet-bachho" style="transform-origin: 100px 140px;">
      <!-- Đuôi hổ cong vút có vằn bên phải -->
      <path d="M 128 156 C 158 152 174 136 170 116 C 168 104 154 104 152 115 C 150 128 140 144 124 150" fill="${sk.body[1]}"/>
      <path d="M 148 134 Q 156 136 160 132" stroke="${sk.stripes || '#78350f'}" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M 156 122 Q 164 124 168 118" stroke="${sk.stripes || '#78350f'}" stroke-width="3" stroke-linecap="round" fill="none"/>

      <!-- Đôi tai hổ tròn xoe đáng yêu -->
      <ellipse cx="64" cy="62" rx="16" ry="15" fill="${sk.body[1]}"/>
      <ellipse cx="64" cy="63" rx="10" ry="9" fill="${sk.earPad || '#f472b6'}"/>
      <ellipse cx="136" cy="62" rx="16" ry="15" fill="${sk.body[1]}"/>
      <ellipse cx="136" cy="63" rx="10" ry="9" fill="${sk.earPad || '#f472b6'}"/>

      <!-- Thân và đầu hổ đứng vững chãi -->
      <path d="M 100 52 C 134 52 148 72 148 95 C 148 116 138 128 126 130 C 134 144 134 165 126 175 C 118 182 82 182 74 175 C 66 165 66 144 74 130 C 62 128 52 116 52 95 C 52 72 66 52 100 52 Z" fill="url(#${uid}_bh_b)"/>

      <!-- Vùng bụng màu kem mềm mại -->
      <ellipse cx="100" cy="154" rx="26" ry="23" fill="${sk.belly || '#fffbeb'}"/>

      <!-- Vùng mõm kem quanh mũi miệng -->
      <ellipse cx="100" cy="108" rx="16" ry="11" fill="${sk.belly || '#fffbeb'}"/>

      <!-- Các đường vằn hổ đặc trưng -->
      <!-- Vằn trên trán -->
      <path d="M 100 56 V 68" stroke="${sk.stripes || '#78350f'}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M 92 63 L 100 68 L 108 63" stroke="${sk.stripes || '#78350f'}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M 90 73 Q 100 76 110 73" stroke="${sk.stripes || '#78350f'}" stroke-width="2.8" fill="none" stroke-linecap="round"/>

      <!-- Vằn má hai bên -->
      <path d="M 56 86 Q 66 88 72 86" stroke="${sk.stripes || '#78350f'}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <path d="M 54 96 Q 64 98 70 96" stroke="${sk.stripes || '#78350f'}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <path d="M 144 86 Q 134 88 128 86" stroke="${sk.stripes || '#78350f'}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <path d="M 146 96 Q 136 98 130 96" stroke="${sk.stripes || '#78350f'}" stroke-width="2.6" stroke-linecap="round" fill="none"/>

      <!-- Vằn hai bên sườn -->
      <path d="M 68 144 Q 76 146 82 144" stroke="${sk.stripes || '#78350f'}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      <path d="M 132 144 Q 124 146 118 144" stroke="${sk.stripes || '#78350f'}" stroke-width="2.4" stroke-linecap="round" fill="none"/>

      <!-- Đốm lông mày màu kem trên mắt -->
      <ellipse cx="80" cy="80" rx="4.5" ry="3.5" fill="${sk.belly || '#fffbeb'}"/>
      <ellipse cx="120" cy="80" rx="4.5" ry="3.5" fill="${sk.belly || '#fffbeb'}"/>

      <!-- Đôi mắt hổ to tròn lung linh ánh sáng -->
      ${isSleeping ? `
        <path d="M 75 95 Q 82 101 89 95" stroke="#451a03" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 111 95 Q 118 101 125 95" stroke="#451a03" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      ` : isParty ? `
        <path d="M 75 97 Q 82 89 89 97" stroke="#451a03" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 111 97 Q 118 89 125 97" stroke="#451a03" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      ` : `
        <ellipse cx="82" cy="94" rx="8" ry="9.5" fill="#451a03"/>
        <circle cx="79" cy="90" r="3.2" fill="#fff"/>
        <circle cx="85" cy="97" r="1.6" fill="#fff"/>
        <ellipse cx="118" cy="94" rx="8" ry="9.5" fill="#451a03"/>
        <circle cx="115" cy="90" r="3.2" fill="#fff"/>
        <circle cx="121" cy="97" r="1.6" fill="#fff"/>
      `}

      <!-- Mũi nâu tam giác bo góc -->
      <ellipse cx="100" cy="102" rx="4.5" ry="3.2" fill="#451a03"/>

      <!-- Miệng cười tươi hé răng nanh và lưỡi hồng -->
      ${isSleeping ? `
        <path d="M 96 108 Q 100 112 104 108" stroke="#451a03" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      ` : `
        <path d="M 94 108 Q 100 111 106 108 C 108 119 92 119 94 108 Z" fill="#78350f"/>
        <path d="M 95 113 Q 100 110 105 113 Q 100 119 95 113 Z" fill="#f43f5e"/>
        <polygon points="98,108 102,108 100,111" fill="#fff"/>
      `}

      <!-- Má hồng rạng rỡ -->
      <ellipse cx="68" cy="105" rx="8" ry="5.5" fill="#fb7185" opacity="0.75"/>
      <ellipse cx="132" cy="105" rx="8" ry="5.5" fill="#fb7185" opacity="0.75"/>

      <!-- Đôi bàn tay nhỏ ôm nhẹ trước ngực -->
      <ellipse cx="78" cy="138" rx="8" ry="11" transform="rotate(20 78 138)" fill="${sk.body[1]}"/>
      <ellipse cx="122" cy="138" rx="8" ry="11" transform="rotate(-20 122 138)" fill="${sk.body[1]}"/>

      <!-- Hai bàn chân đứng vững chắc phía dưới -->
      <ellipse cx="80" cy="178" rx="11" ry="7" fill="${sk.body[1]}"/>
      <ellipse cx="120" cy="178" rx="11" ry="7" fill="${sk.body[1]}"/>

      ${isCrying ? `
        <path class="tear" d="M 82 104 Q 78 116 82 120 Q 86 116 82 104 Z" fill="#38bdf8"/>
        <path class="tear" d="M 118 104 Q 114 116 118 120 Q 122 116 118 104 Z" fill="#38bdf8"/>
      ` : ""}
    </g>`;
}

/* ─── 8. CHU TƯỚC (pet_chutuoc) ───
   Phượng hoàng lửa sải cánh bay lượn, mào lửa 3 nhánh, đuôi khổng tước dát ngọc, mắt phượng sắc sảo */
function renderPetChutuoc(m, uid, skinKey) {
  const isSleeping = m === "sleeping";
  const isCrying = m === "crying";
  const isParty = m === "party";
  const sk = LINH_THU_SKINS[skinKey] || LINH_THU_SKINS.skin_chutuoc_default;

  return `
    <defs>
      <linearGradient id="${uid}_ct_b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${sk.body[0]}"/>
        <stop offset="50%" stop-color="${sk.body[1]}"/>
        <stop offset="100%" stop-color="${sk.body[2]}"/>
      </linearGradient>
    </defs>
    <g class="linhthu-model pet-chutuoc" style="transform-origin: 100px 110px;">
      <!-- Đuôi phượng hoàng lộng lẫy uốn lượn xuống dưới -->
      <path d="M 106 145 C 130 156 150 170 140 188 C 134 198 120 196 118 188 C 116 178 126 166 110 148" fill="none" stroke="#c084fc" stroke-width="4" stroke-linecap="round"/>
      <path d="M 100 148 C 116 162 126 178 122 190 C 118 198 108 196 106 188 C 104 180 112 170 102 152" fill="none" stroke="${sk.body[1]}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M 112 142 C 138 154 160 168 154 182 C 150 190 140 188 138 180 C 136 172 144 162 120 146" fill="none" stroke="#ec4899" stroke-width="3.5" stroke-linecap="round"/>

      <!-- Mắt ngọc lông vũ đuôi (Eyelets) -->
      <circle cx="138" cy="188" r="6" fill="#f43f5e"/>
      <circle cx="138" cy="188" r="2.8" fill="#facc15"/>
      <circle cx="120" cy="190" r="5.5" fill="#f43f5e"/>
      <circle cx="120" cy="190" r="2.5" fill="#facc15"/>
      <circle cx="152" cy="182" r="5" fill="#f43f5e"/>
      <circle cx="152" cy="182" r="2.2" fill="#facc15"/>

      <!-- Đôi cánh phượng hoàng dang rộng bay lượn -->
      <!-- Cánh trái -->
      <path d="M 76 108 C 46 95 24 76 30 68 C 36 60 48 76 56 82 C 48 70 56 60 62 66 C 68 72 70 88 80 104 Z" fill="${sk.body[1]}"/>
      <path d="M 74 104 C 54 94 36 82 40 76 C 44 70 52 82 58 86" stroke="#fef08a" stroke-width="1.8" fill="none" stroke-linecap="round"/>

      <!-- Cánh phải -->
      <path d="M 124 108 C 154 95 176 76 170 68 C 164 60 152 76 144 82 C 152 70 144 60 138 66 C 132 72 130 88 120 104 Z" fill="${sk.body[1]}"/>
      <path d="M 126 104 C 146 94 164 82 160 76 C 156 70 148 82 142 86" stroke="#fef08a" stroke-width="1.8" fill="none" stroke-linecap="round"/>

      <!-- Chùm mào lửa 3 nhánh trên đỉnh đầu -->
      <path d="M 100 48 C 96 28 102 16 106 12 C 108 24 112 36 102 48 Z" fill="${sk.crest ? sk.crest[0] : '#ec4899'}"/>
      <path d="M 94 52 C 86 36 88 26 92 22 C 94 32 98 42 96 52 Z" fill="${sk.crest ? sk.crest[1] : '#a855f7'}"/>
      <path d="M 106 52 C 114 36 112 26 108 22 C 106 32 102 42 104 52 Z" fill="${sk.body[2]}"/>

      <!-- Thân phượng hoàng tròn trĩnh đáng yêu -->
      <path d="M 100 50 C 124 50 136 72 136 105 C 136 135 120 152 100 152 C 80 152 64 135 64 105 C 64 72 76 50 100 50 Z" fill="url(#${uid}_ct_b)"/>

      <!-- Yếm ngực lông vũ màu đào ấm áp -->
      <path d="M 88 88 C 88 80 112 80 112 88 C 114 116 86 116 88 88 Z" fill="${sk.chest || '#fed7aa'}"/>

      <!-- Móng vuốt phượng hoàng co lại phía dưới -->
      <path d="M 88 148 L 86 156 M 92 148 L 92 157 M 96 148 L 98 156" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M 104 148 L 102 156 M 108 148 L 108 157 M 112 148 L 114 156" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/>

      <!-- Đôi mắt phượng hoàng tím biếc ánh sao và hàng mi cong kiêu sa -->
      ${isSleeping ? `
        <path d="M 76 84 Q 82 90 88 84" stroke="#3b0764" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <path d="M 112 84 Q 118 90 124 84" stroke="#3b0764" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      ` : isParty ? `
        <path d="M 76 86 Q 82 78 88 86" stroke="#3b0764" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 112 86 Q 118 78 124 86" stroke="#3b0764" stroke-width="3" stroke-linecap="round" fill="none"/>
      ` : `
        <ellipse cx="82" cy="85" rx="8" ry="9.5" fill="#3b0764"/>
        <circle cx="79" cy="81" r="3.2" fill="#fff"/>
        <circle cx="85" cy="88" r="1.6" fill="#fff"/>
        <path d="M 74 81 Q 82 76 89 79" stroke="#3b0764" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        <ellipse cx="118" cy="85" rx="8" ry="9.5" fill="#3b0764"/>
        <circle cx="115" cy="81" r="3.2" fill="#fff"/>
        <circle cx="121" cy="88" r="1.6" fill="#fff"/>
        <path d="M 111 79 Q 118 76 126 81" stroke="#3b0764" stroke-width="1.8" stroke-linecap="round" fill="none"/>
      `}

      <!-- Mỏ phượng hoàng vàng óng -->
      <path d="M 95 88 Q 100 84 105 88 Q 100 97 95 88 Z" fill="${sk.beak || '#facc15'}" stroke="#f59e0b" stroke-width="1.2"/>

      <!-- Má hồng ửng đào tươi thắm -->
      <ellipse cx="70" cy="94" rx="7.5" ry="5" fill="#f43f5e" opacity="0.75"/>
      <ellipse cx="130" cy="94" rx="7.5" ry="5" fill="#f43f5e" opacity="0.75"/>

      ${isCrying ? `
        <path class="tear" d="M 82 95 Q 78 106 82 110 Q 86 106 82 95 Z" fill="#38bdf8"/>
        <path class="tear" d="M 118 95 Q 114 106 118 110 Q 122 106 118 95 Z" fill="#38bdf8"/>
      ` : ""}
    </g>`;
}

/* ─── 9. HUYỀN VŨ (pet_huyenvu) ───
   Rùa ngọc bích vững chãi, mai rùa khắc hoa văn xoắn ốc hoàng kim phong thủy, yếm vàng, ánh mắt long lanh */
function renderPetHuyenvu(m, uid, skinKey) {
  const isSleeping = m === "sleeping";
  const isCrying = m === "crying";
  const isParty = m === "party";
  const sk = LINH_THU_SKINS[skinKey] || LINH_THU_SKINS.skin_huyenvu_default;

  return `
    <defs>
      <linearGradient id="${uid}_hv_shell" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${sk.shell ? sk.shell[0] : '#0f766e'}"/>
        <stop offset="70%" stop-color="${sk.shell ? sk.shell[1] : '#065f46'}"/>
        <stop offset="100%" stop-color="${sk.shell ? sk.shell[2] : '#022c22'}"/>
      </linearGradient>
      <linearGradient id="${uid}_hv_body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${sk.body[0]}"/>
        <stop offset="100%" stop-color="${sk.body[2]}"/>
      </linearGradient>
    </defs>
    <g class="linhthu-model pet-huyenvu" style="transform-origin: 105px 125px;">
      <!-- Cái đuôi rùa nhọn nhỏ nhô ra phía sau bên trái -->
      <path d="M 46 134 Q 30 137 34 144 Q 44 142 48 138 Z" fill="url(#${uid}_hv_body)"/>

      <!-- Chân sau bên trái -->
      <path d="M 52 140 C 44 150 46 166 58 170 C 68 172 74 160 70 145 Z" fill="url(#${uid}_hv_body)"/>
      <circle cx="50" cy="166" r="2.5" fill="${sk.belly || '#fef08a'}"/>
      <circle cx="56" cy="170" r="2.5" fill="${sk.belly || '#fef08a'}"/>
      <circle cx="63" cy="170" r="2.5" fill="${sk.belly || '#fef08a'}"/>

      <!-- Chân sau bên phải (tựa phía trong) -->
      <path d="M 102 142 C 98 152 102 165 110 168 C 118 170 124 160 120 145 Z" fill="url(#${uid}_hv_body)" opacity="0.8"/>

      <!-- Yếm bụng rùa màu vàng bơ nhô ra dưới mai -->
      <path d="M 64 142 C 86 148 120 148 140 142 L 138 153 C 118 158 84 158 64 153 Z" fill="${sk.belly || '#fef08a'}"/>

      <!-- Mai rùa ngọc bích tròn trĩnh vững như bàn thạch -->
      <path d="M 45 132 C 45 60 142 60 148 132 Z" fill="url(#${uid}_hv_shell)"/>

      <!-- Vành đai bo gờ đáy mai rùa -->
      <path d="M 40 132 C 40 124 152 124 152 132 C 152 144 40 144 40 132 Z" fill="${sk.shell ? sk.shell[1] : '#065f46'}" stroke="${sk.shell ? sk.shell[0] : '#0f766e'}" stroke-width="2"/>

      <!-- Hoa văn xoắn ốc Mandala Hoàng Kim trên mai rùa (Iconic Design) -->
      <g stroke="${sk.gold || '#facc15'}" stroke-linecap="round" fill="none">
        <!-- Vòng xoắn ốc trung tâm -->
        <path d="M 85 96 C 80 84 94 74 104 80 C 114 86 110 100 98 100 C 88 100 86 92 92 88" stroke-width="2.4"/>
        <!-- Các vòm mây sóng xếp tầng liên hoàn quanh chân mai -->
        <path d="M 56 120 C 64 108 76 108 84 120 C 92 108 104 108 112 120 C 120 108 132 108 140 120" stroke-width="2.2"/>
        <path d="M 64 94 C 72 84 82 84 90 94 M 100 94 C 108 84 118 84 126 94" stroke-width="2"/>
      </g>
      <!-- Hạt bụi vàng kim điểm xuyết góc trên mai rùa -->
      <circle cx="120" cy="74" r="2.8" fill="#fef08a"/>
      <circle cx="127" cy="80" r="2" fill="#fef08a"/>
      <circle cx="114" cy="80" r="1.8" fill="#fef08a"/>

      <!-- Chân trước rùa bước tới phía trước dũng mãnh -->
      <path d="M 124 142 C 120 156 125 170 136 172 C 146 174 152 162 148 145 Z" fill="url(#${uid}_hv_body)"/>
      <circle cx="128" cy="169" r="2.5" fill="${sk.belly || '#fef08a'}"/>
      <circle cx="135" cy="172" r="2.5" fill="${sk.belly || '#fef08a'}"/>
      <circle cx="142" cy="170" r="2.5" fill="${sk.belly || '#fef08a'}"/>

      <!-- Đầu rùa ngẩng cao nghiêng mặt tươi tắn về phía người xem -->
      <path d="M 130 132 C 124 110 134 88 148 84 C 166 79 178 92 178 110 C 178 128 164 138 142 138 Z" fill="url(#${uid}_hv_body)"/>

      <!-- Vùng cổ yếm màu vàng bơ -->
      <path d="M 134 124 C 132 114 138 108 144 112 C 146 128 140 135 134 124 Z" fill="${sk.belly || '#fef08a'}"/>

      <!-- Mắt rùa to tròn màu cà phê đen lấp lánh -->
      ${isSleeping ? `
        <path d="M 148 100 Q 153 105 158 100" stroke="#1c1917" stroke-width="2.6" stroke-linecap="round" fill="none"/>
        <path d="M 166 102 Q 170 106 174 102" stroke="#1c1917" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      ` : isParty ? `
        <path d="M 148 101 Q 153 95 158 101" stroke="#1c1917" stroke-width="2.6" stroke-linecap="round" fill="none"/>
        <path d="M 166 103 Q 170 98 174 103" stroke="#1c1917" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      ` : `
        <ellipse cx="153" cy="100" rx="6.5" ry="8" fill="#1c1917"/>
        <circle cx="151" cy="97" r="2.6" fill="#fff"/>
        <ellipse cx="170" cy="102" rx="5.5" ry="7" fill="#1c1917"/>
        <circle cx="168" cy="99" r="2.2" fill="#fff"/>
      `}

      <!-- Má hồng tròn ửng đào -->
      <circle cx="145" cy="112" r="5.5" fill="#fb7185" opacity="0.75"/>
      <circle cx="174" cy="112" r="4.5" fill="#fb7185" opacity="0.75"/>

      <!-- Nụ cười hiền hậu, phúc hậu -->
      <path d="M 158 114 Q 166 118 172 113" stroke="#1c1917" stroke-width="2.2" stroke-linecap="round" fill="none"/>

      ${isCrying ? `
        <path class="tear" d="M 152 108 Q 148 118 152 122 Q 156 118 152 108 Z" fill="#38bdf8"/>
        <path class="tear" d="M 170 110 Q 166 118 170 122 Q 174 118 170 110 Z" fill="#38bdf8"/>
      ` : ""}
    </g>`;
}

/* ─── 10. KỲ LÂN (pet_kylan) ───
   Thụy thú cát tường, chuyển màu xanh lơ pha tím oải hương, sừng hươu vàng, bờm tím bồng bềnh, vảy bụng xếp lớp */
function renderPetKylan(m, uid, skinKey) {
  const isSleeping = m === "sleeping";
  const isCrying = m === "crying";
  const isParty = m === "party";
  const sk = LINH_THU_SKINS[skinKey] || LINH_THU_SKINS.skin_kylan_default;

  return `
    <defs>
      <linearGradient id="${uid}_kl_b" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${sk.body[0]}"/>
        <stop offset="60%" stop-color="${sk.body[1]}"/>
        <stop offset="100%" stop-color="${sk.body[2]}"/>
      </linearGradient>
    </defs>
    <g class="linhthu-model pet-kylan" style="transform-origin: 110px 130px;">
      <!-- Bờm tím bồng bềnh dọc cổ và sau gáy -->
      <path d="M 112 52 C 122 40 136 44 142 54 C 154 48 164 60 160 72 C 168 80 166 94 158 104 C 162 114 156 126 144 130 C 138 120 134 108 134 98 Z" fill="${sk.mane || '#7c3aed'}"/>

      <!-- Đuôi kỳ lân cong vút với chùm lông bồng bềnh -->
      <path d="M 136 142 C 152 135 160 120 156 108 C 162 96 172 102 170 114 C 174 126 162 146 140 154 Z" fill="${sk.mane || '#7c3aed'}"/>

      <!-- Thân kỳ lân đứng 4 chân uy dũng mà đáng yêu -->
      <path d="M 95 72 C 118 72 132 88 132 115 C 132 135 142 145 142 165 C 142 176 132 178 126 178 C 122 178 120 168 118 155 C 114 155 106 155 102 168 C 100 176 92 178 86 178 C 80 178 80 165 82 152 C 78 145 74 132 76 115 C 78 88 84 72 95 72 Z" fill="url(#${uid}_kl_b)"/>

      <!-- Móng guốc tím đậm ở 4 chân -->
      <rect x="83" y="174" width="8" height="5" rx="2" fill="${sk.hoof || '#4338ca'}"/>
      <rect x="99" y="174" width="8" height="5" rx="2" fill="${sk.hoof || '#4338ca'}"/>
      <rect x="123" y="174" width="8" height="5" rx="2" fill="${sk.hoof || '#4338ca'}"/>
      <rect x="139" y="166" width="7" height="5" rx="2" fill="${sk.hoof || '#4338ca'}"/>

      <!-- Vảy bụng màu xanh lơ mềm mại có đường kẻ sọc ngang -->
      <ellipse cx="98" cy="132" rx="14" ry="20" fill="${sk.belly || '#e0f2fe'}"/>
      <path d="M 88 122 Q 98 125 108 122 M 86 132 Q 98 135 110 132 M 88 142 Q 98 145 108 142" stroke="${sk.body[1]}" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.6"/>

      <!-- Hoa văn vảy mây trên hông -->
      <path d="M 124 130 Q 130 126 134 130" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6"/>

      <!-- Tai nhọn đáng yêu -->
      <path d="M 90 68 C 78 58 74 66 82 76 Z" fill="url(#${uid}_kl_b)"/>
      <path d="M 88 69 C 80 62 78 67 83 73 Z" fill="#f472b6"/>

      <!-- Đôi sừng hươu vàng ngọc phân nhánh thanh thoát -->
      <path d="M 96 56 Q 90 38 88 24 M 92 40 Q 84 36 82 38 M 90 30 Q 84 24 82 26" stroke="${sk.antler || '#facc15'}" stroke-width="3.4" stroke-linecap="round" fill="none"/>
      <path d="M 118 54 Q 124 38 126 24 M 120 40 Q 128 36 130 38 M 122 30 Q 128 24 130 26" stroke="${sk.antler || '#facc15'}" stroke-width="3.4" stroke-linecap="round" fill="none"/>

      <!-- Chùm tóc trán màu tím bồng bềnh -->
      <path d="M 100 56 C 96 46 112 44 116 52 C 122 48 126 56 120 62 Z" fill="${sk.mane || '#7c3aed'}"/>

      <!-- Đôi mắt kỳ lân to tròn màu chàm sâu thẳm lung linh sao trời -->
      ${isSleeping ? `
        <path d="M 88 94 Q 94 100 100 94" stroke="#312e81" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 114 94 Q 120 100 126 94" stroke="#312e81" stroke-width="3" stroke-linecap="round" fill="none"/>
      ` : isParty ? `
        <path d="M 88 96 Q 94 88 100 96" stroke="#312e81" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 114 96 Q 120 88 126 96" stroke="#312e81" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      ` : `
        <ellipse cx="94" cy="94" rx="7.5" ry="9" fill="#312e81"/>
        <circle cx="92" cy="90" r="3" fill="#fff"/>
        <circle cx="96" cy="97" r="1.5" fill="#fff"/>
        <ellipse cx="120" cy="94" rx="7.5" ry="9" fill="#312e81"/>
        <circle cx="118" cy="90" r="3" fill="#fff"/>
        <circle cx="122" cy="97" r="1.5" fill="#fff"/>
      `}

      <!-- Má hồng rạng ngời phúc lộc -->
      <circle cx="84" cy="102" r="6.5" fill="#f472b6" opacity="0.7"/>
      <circle cx="128" cy="102" r="6.5" fill="#f472b6" opacity="0.7"/>

      <!-- Mõm và nụ cười ngọt ngào -->
      <path d="M 104 104 Q 107 107 110 104" stroke="#312e81" stroke-width="2.2" stroke-linecap="round" fill="none"/>

      ${isCrying ? `
        <path class="tear" d="M 94 104 Q 90 114 94 118 Q 98 114 94 104 Z" fill="#38bdf8"/>
        <path class="tear" d="M 120 104 Q 116 114 120 118 Q 124 114 120 104 Z" fill="#38bdf8"/>
      ` : ""}
    </g>`;
}

function renderLinhThuSvg(petKey, mood, uid, level, skinKey) {
  const defaultKey = petKey.replace("pet_", "skin_") + "_default";
  const activeSkin = (skinKey && LINH_THU_SKINS[skinKey]?.petId === petKey) ? skinKey : defaultKey;
  switch (petKey) {
    case "pet_moc": return renderPetMoc(mood, uid, activeSkin);
    case "pet_hoa": return renderPetHoa(mood, uid, activeSkin);
    case "pet_tho": return renderPetTho(mood, uid, activeSkin);
    case "pet_kim": return renderPetKim(mood, uid, activeSkin);
    case "pet_thuy": return renderPetThuy(mood, uid, activeSkin);
    case "pet_thanhlong": return renderPetThanhlong(mood, uid, activeSkin);
    case "pet_bachho": return renderPetBachho(mood, uid, activeSkin);
    case "pet_chutuoc": return renderPetChutuoc(mood, uid, activeSkin);
    case "pet_huyenvu": return renderPetHuyenvu(mood, uid, activeSkin);
    case "pet_kylan": return renderPetKylan(mood, uid, activeSkin);
    default: return renderPetHoa(mood, uid, activeSkin);
  }
}

function getLinhThuTransforms(petKey) {
  const configs = {
    pet_moc: {
      head: "translate(100 64) scale(0.85) translate(-100 -54)",
      face: "translate(100 116) scale(0.85) translate(-100 -136)",
      emblem: "translate(100 92) scale(0.8) translate(-100 -117)",
      held: "translate(-6, 16)",
      pedestal: ""
    },
    pet_hoa: {
      head: "translate(100 48) scale(0.85) translate(-100 -54)",
      face: "translate(100 114) scale(0.85) translate(-100 -136)",
      emblem: "translate(100 86) scale(0.8) translate(-100 -117)",
      held: "translate(-6, 16)",
      pedestal: "translate(0, -5)"
    },
    pet_tho: {
      head: "translate(100 68) scale(0.92) translate(-100 -54)",
      face: "translate(100 120) scale(0.92) translate(-100 -136)",
      emblem: "translate(100 94) scale(0.85) translate(-100 -117)",
      held: "translate(-6, 16)",
      pedestal: "translate(100 188) scale(1.18 1) translate(-100 -188)"
    },
    pet_kim: {
      head: "translate(100 44) scale(0.88) translate(-100 -54)",
      face: "translate(100 116) scale(0.88) translate(-100 -136)",
      emblem: "translate(100 94) scale(0.8) translate(-100 -117)",
      held: "translate(-6, 16)",
      pedestal: "translate(0, -10)"
    },
    pet_thuy: {
      head: "translate(100 56) scale(0.9) translate(-100 -54)",
      face: "translate(100 120) scale(0.9) translate(-100 -136)",
      emblem: "translate(100 96) scale(0.85) translate(-100 -117)",
      held: "translate(-6, 16)",
      pedestal: "translate(0, -3)"
    },
    pet_thanhlong: {
      head: "translate(122 46) scale(0.82) translate(-100 -54)",
      face: "translate(122 70) scale(0.8) translate(-100 -136)",
      emblem: "translate(122 56) scale(0.72) translate(-100 -117)",
      held: "translate(16, 14)",
      pedestal: "translate(0, -18)"
    },
    pet_bachho: {
      head: "translate(100 52) scale(0.88) translate(-100 -54)",
      face: "translate(100 95) scale(0.85) translate(-100 -136)",
      emblem: "translate(100 70) scale(0.75) translate(-100 -117)",
      held: "translate(-6, 16)",
      pedestal: "translate(0, -7)"
    },
    pet_chutuoc: {
      head: "translate(100 48) scale(0.85) translate(-100 -54)",
      face: "translate(100 85) scale(0.85) translate(-100 -136)",
      emblem: "translate(100 68) scale(0.75) translate(-100 -117)",
      held: "translate(-6, 18)",
      pedestal: "translate(0, -24)"
    },
    pet_huyenvu: {
      head: "translate(155 78) scale(0.75) translate(-100 -54)",
      face: "translate(155 102) scale(0.75) translate(-100 -136)",
      emblem: "translate(100 96) scale(0.75) translate(-100 -117)",
      held: "translate(35, 20)",
      pedestal: "translate(0, -12)"
    },
    pet_kylan: {
      head: "translate(108 52) scale(0.85) translate(-100 -54)",
      face: "translate(108 94) scale(0.82) translate(-100 -136)",
      emblem: "translate(108 76) scale(0.75) translate(-100 -117)",
      held: "translate(6, 16)",
      pedestal: "translate(0, -11)"
    }
  };
  return configs[petKey] || {
    head: "translate(100 54) scale(0.9) translate(-100 -54)",
    face: "translate(100 114) scale(0.85) translate(-100 -136)",
    emblem: "translate(100 86) scale(0.8) translate(-100 -117)",
    held: "translate(-6, 16)",
    pedestal: ""
  };
}

export function renderPet({ mood = "happy", level = 1, size = 130, equipped = {} } = {}) {
  const m = EYES[mood] ? mood : "happy";
  const lv = Math.max(1, Math.min(10, Number(level) || 1));
  const uid = `p${Math.random().toString(36).slice(2, 8)}`;

  const eq = (slot) => {
    const val = equipped?.[slot];
    return typeof val === "string" ? val : val?.id || "";
  };

  const activePetKey = eq("pet");
  const linhThu = LINH_THU[activePetKey];
  const tf = linhThu ? getLinhThuTransforms(activePetKey) : { pedestal: "" };
  const pedTransform = tf.pedestal || "";

  const defaultPed = linhThu
    ? `<g class="ped-default">
        <ellipse cx="100" cy="189" rx="60" ry="7.5" fill="rgba(30,10,60,0.18)"/>
        <ellipse cx="100" cy="188" rx="42" ry="5" fill="rgba(30,10,60,0.25)"/>
      </g>`
    : `<g class="ped-default">
        <ellipse cx="100" cy="189" rx="55" ry="7" fill="rgba(60,30,100,0.14)"/>
        <ellipse cx="100" cy="188" rx="36" ry="5" fill="rgba(60,30,100,0.22)"/>
        <ellipse cx="78" cy="187" rx="13" ry="3.5" fill="rgba(40,15,70,0.28)"/>
        <ellipse cx="122" cy="187" rx="13" ry="3.5" fill="rgba(40,15,70,0.28)"/>
      </g>`;

  const pedSvg = PET_ITEMS[eq("pedestal")] || defaultPed;
  const bgSvg = PET_ITEMS[eq("bg")] || "";
  const auraKey = eq("aura");
  let auraSvg = PET_ITEMS[auraKey] || "";
  if (auraSvg) {
    auraSvg = auraSvg
      .replace(/id="(aur-[^"]+)"/g, `id="${uid}_$1"`)
      .replace(/url\(#(aur-[^)]+)\)/g, `url(#${uid}_$1)`);
  }

  const headItem = eq("head");
  const faceItem = eq("face");
  const heldItem = eq("held");
  const emblemItem = eq("emblem");

  const headSvg = PET_ITEMS[headItem] || "";
  const faceSvg = PET_ITEMS[faceItem] || "";
  const heldSvg = PET_ITEMS[heldItem] || "";
  const emblemSvg = PET_ITEMS[emblemItem] || "";

  let bodyContent = "";
  let petClass = `pet pet--${m}`;

  if (linhThu) {
    petClass += ` pet--linhthu pet--${activePetKey}`;
    const skinKey = eq("skin");
    const linhThuModel = renderLinhThuSvg(activePetKey, m, uid, lv, skinKey);
    const tf = getLinhThuTransforms(activePetKey);

    const linhThuAccessories = `
      <g class="linhthu-accessories">
        ${emblemSvg ? `<g class="acc-emblem" transform="${tf.emblem}">${emblemSvg}</g>` : ""}
        ${faceSvg ? `<g class="acc-face" transform="${tf.face}">${faceSvg}</g>` : ""}
        ${heldSvg ? `<g class="acc-held" transform="${tf.held}">${heldSvg}</g>` : ""}
        ${headSvg ? `<g class="acc-head" transform="${tf.head}">${headSvg}</g>` : ""}
      </g>
    `;
    bodyContent = `${linhThuModel}${linhThuAccessories}`;
  } else {
    // Mặc định: Thú cưng Ví Tiền chuẩn hóa theo hình tượng mới
    const skinKey = eq("skin");
    const customSkin = SKINS[skinKey];
    const [c1, c2] = customSkin ? customSkin.body : (BODY_COLORS[m] || ["#fca5a5", "#c084fc"]);
    const [f1, f2] = customSkin ? customSkin.flap : ["#f472b6", "#a855f7"];

    // Nơ hồng trên đầu (nếu chưa đeo mũ)
    const walletHeadSvg = headSvg || `
      <g class="wallet-bow" transform="translate(100 48)">
        <path d="M0 0 C-18 -14 -22 6 -4 2 Z" fill="#ff7eb9" stroke="#f43f5e" stroke-width="1.2"/>
        <path d="M0 0 C18 -14 22 6 4 2 Z" fill="#ff7eb9" stroke="#f43f5e" stroke-width="1.2"/>
        <circle cx="0" cy="0" r="4.5" fill="#f43f5e"/>
        <path d="M-3 2 L-10 16 M3 2 L10 16" stroke="#ff7eb9" stroke-width="2.5" stroke-linecap="round"/>
      </g>`;

    // Lá bùa tài lộc vàng dọc trên trán (nếu chưa đeo ấn ký)
    const walletEmblemSvg = emblemSvg || `
      <g class="wallet-talisman" transform="translate(100 96)">
        <rect x="-6" y="-12" width="12" height="24" rx="5" fill="#facc15" stroke="#ca8a04" stroke-width="1.5"/>
        <line x1="0" y1="-8" x2="0" y2="8" stroke="#854d0e" stroke-width="1.8" stroke-dasharray="2 2" stroke-linecap="round"/>
      </g>`;

    // Kính râm ngầu đen (nếu chưa đeo kính hoặc mặt nạ)
    const walletFaceSvg = faceSvg || `
      <g class="wallet-sunglasses">
        <path d="M64 122 H136 V126 H64 Z" fill="#18181b"/>
        <rect x="66" y="122" width="28" height="18" rx="6" fill="#18181b"/>
        <rect x="106" y="122" width="28" height="18" rx="6" fill="#18181b"/>
        <path d="M72 126 L86 126" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>
        <path d="M112 126 L126 126" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>
      </g>`;

    bodyContent = `
      <defs>
        <linearGradient id="${uid}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="50%" stop-color="${f1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient>
        <linearGradient id="${uid}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${f1}"/><stop offset="100%" stop-color="${f2}"/></linearGradient>
      </defs>
      <g class="pet-body">
        <!-- Đuôi hồ ly tím mềm mại cong vút bên phải -->
        <path d="M138 162 C158 166 174 158 174 142 C174 130 162 126 156 134 C150 142 156 152 164 148 C160 156 148 158 136 156 Z" fill="${c2}"/>

        <!-- Hai chân nhỏ hồng hào xinh xắn -->
        <ellipse cx="78" cy="180" rx="14" ry="7.5" fill="#f472b6"/>
        <ellipse cx="122" cy="180" rx="14" ry="7.5" fill="#f472b6"/>

        <!-- Thân ví tiền bo góc vuông mềm mại như trong hình mẫu -->
        <rect x="42" y="66" width="116" height="110" rx="36" fill="url(#${uid}b)"/>

        <!-- Vệt sáng bóng phản quang góc trên trái -->
        <path d="M58 80 C68 74 84 74 94 77" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".6"/>

        <!-- Đường may nắp ví tinh tế ngang thân -->
        <path d="M42 112 Q100 120 158 112" stroke="${f2}" stroke-width="2.5" fill="none" opacity=".4"/>

        <!-- Bùa trán & Nơ đầu -->
        ${walletEmblemSvg}
        ${walletHeadSvg}

        <!-- Kính râm ngầu / Phụ kiện mặt -->
        ${walletFaceSvg}

        <!-- Miếng băng dán cá nhân Urgo trên má phải (bên trái người xem) -->
        <g class="wallet-bandaid">
          <rect x="50" y="138" width="22" height="11" rx="4" transform="rotate(-18 61 143)" fill="#fde68a" stroke="#d97706" stroke-width="1.2"/>
          <circle cx="57" cy="142" r="1" fill="#d97706"/><circle cx="61" cy="143" r="1" fill="#d97706"/><circle cx="65" cy="144" r="1" fill="#d97706"/>
        </g>

        <!-- Má hồng ửng đào đáng yêu -->
        <ellipse cx="64" cy="146" rx="8" ry="5" fill="#ff7eb9" opacity=".55"/>
        <ellipse cx="136" cy="146" rx="8" ry="5" fill="#ff7eb9" opacity=".55"/>

        <!-- Nụ cười nhếch mép sly smile duyên dáng -->
        <path d="M94 148 Q100 154 106 148" fill="none" stroke="#3b2a5a" stroke-width="3" stroke-linecap="round"/>

        ${heldSvg}
      </g>
      ${headItem && m === "party" ? "" : (EXTRAS[m] || "")}`;
  }

  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 212" width="${size}" height="${size * 1.06}" class="${petClass}" role="img">
    ${bgSvg}
    ${auraSvg ? `<g class="pet-aura">${auraSvg}</g>` : ""}
    <g class="pet-pedestal" ${pedTransform ? `transform="${pedTransform}"` : ""}>${pedSvg}</g>
    ${bodyContent}
  </svg>`;

  const svg = new DOMParser().parseFromString(markup, "image/svg+xml").documentElement;
  const names = {
    happy: tr("đang vui"), chill: tr("thảnh thơi"), party: tr("đang quẩy"), worried: tr("lo lắng"),
    sad: tr("buồn"), crying: tr("đang khóc"), sleeping: tr("đang ngủ")
  };
  const title = linhThu ? `${linhThu.name} (${names[m] || names.happy})` : tr`Thú cưng ví tiền ${names[m]}, cấp ${lv}`;
  svg.setAttribute("aria-label", title);
  const node = document.importNode(svg, true);
  watchVisibility(node);
  return node;
}

let visibilityObserver = null;
function watchVisibility(node) {
  if (!("IntersectionObserver" in window)) return;
  visibilityObserver ||= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.classList.toggle("offscreen", !entry.isIntersecting);
      if (!entry.target.isConnected) visibilityObserver.unobserve(entry.target);
    }
  });
  visibilityObserver.observe(node);
}

export function pokeLine(mood, petInfo = null) {
  const petId = typeof petInfo === "string" ? petInfo : petInfo?.id || petInfo?.slot;
  if (petId && LINH_THU[petId] && LINH_THU[petId].lines?.length) {
    const list = LINH_THU[petId].lines;
    return list[(Math.random() * list.length) | 0];
  }

  const lines = {
    happy: [tr("Hihi, nhột!"), tr("Hôm nay mình vẫn ổn áp nha!"), tr("Ghi thêm khoản nào không?")],
    chill: [tr("Đặt ngân sách đi mà~"), tr("Mình chill thôi, ví vẫn ổn.")],
    party: [tr("Quẩy tiếp nào!"), tr("Chuỗi ngày đỉnh của chóp!")],
    worried: [tr("Ơ ơ, tiêu chậm lại chút..."), tr("Còn ít lắm rồi đó!")],
    sad: [tr("Mai mình bù lại nha..."), tr("Huhu, lố mất rồi.")],
    crying: ["Huhuhu...", tr("Tháng này cạn ví rồi!")],
    sleeping: [tr("Zzz... ghi một khoản để mình dậy nào"), tr("Ưm... 5 phút nữa...")]
  };
  const pool = lines[mood] || lines.happy;
  return pool[(Math.random() * pool.length) | 0];
}
