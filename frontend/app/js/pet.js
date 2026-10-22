/**
 * @file pet.js
 * @description "Thú cưng ví tiền": một chiếc ví có mặt, đổi biểu cảm theo tâm trạng backend trả về
 * (happy, chill, party, worried, sad, crying, sleeping) và đeo thêm phụ kiện khi lên cấp.
 * Hình được ghép từ các mẫu SVG cố định trong file này (không chứa dữ liệu người dùng).
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

/** Phụ kiện theo cấp: mầm cây (2+), nơ (4+), vương miện (7+). */
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

/**
 * @param {object} options
 * @param {string} options.mood
 * @param {number} [options.level]
 * @param {number} [options.size]
 * @returns {SVGSVGElement}
 */
export function renderPet({ mood = "happy", level = 1, size = 130 } = {}) {
  const m = EYES[mood] ? mood : "happy";
  const lv = Math.max(1, Math.min(10, Number(level) || 1));
  const [c1, c2] = BODY_COLORS[m] || ["#ffb8dc", "#c3a6ff"];
  const uid = `p${Math.random().toString(36).slice(2, 8)}`;

  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}" class="pet pet--${m}" role="img">
    <defs>
      <linearGradient id="${uid}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
      <linearGradient id="${uid}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8fc7"/><stop offset="1" stop-color="#b38cff"/></linearGradient>
      <radialGradient id="${uid}c"><stop offset="0" stop-color="#fff3b0"/><stop offset="1" stop-color="#ffc83d"/></radialGradient>
    </defs>
    <ellipse cx="100" cy="188" rx="50" ry="7" fill="rgba(90,50,150,.16)"/>
    <g class="pet-body">
      <ellipse cx="78" cy="178" rx="14" ry="8" fill="#e58fc0"/>
      <ellipse cx="122" cy="178" rx="14" ry="8" fill="#e58fc0"/>
      <ellipse class="arm-l" cx="40" cy="132" rx="9" ry="16" fill="${c1}" transform="rotate(20 40 132)"/>
      <ellipse class="arm-r" cx="160" cy="132" rx="9" ry="16" fill="${c2}" transform="rotate(-20 160 132)"/>
      <rect x="38" y="64" width="124" height="114" rx="46" fill="url(#${uid}b)"/>
      <path d="M38 104 Q38 64 84 64 L116 64 Q162 64 162 104 Q132 120 100 120 Q68 120 38 104Z" fill="url(#${uid}f)"/>
      <path d="M52 86 Q60 74 76 72" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".55"/>
      <g class="coin"><circle cx="100" cy="117" r="11" fill="url(#${uid}c)" stroke="#f0a020" stroke-width="2"/>
        <text x="100" y="122" text-anchor="middle" font-size="13" font-weight="800" fill="#c27a00" font-family="Baloo 2, sans-serif">đ</text></g>
      <ellipse cx="64" cy="150" rx="9" ry="5.5" fill="#ff7eb9" opacity=".45"/>
      <ellipse cx="136" cy="150" rx="9" ry="5.5" fill="#ff7eb9" opacity=".45"/>
      ${EYES[m]}
      ${MOUTHS[m]}
      ${accessory(lv, m)}
    </g>
    ${EXTRAS[m] || ""}
  </svg>`;

  const svg = new DOMParser().parseFromString(markup, "image/svg+xml").documentElement;
  const names = {
    happy: tr("đang vui"), chill: tr("thảnh thơi"), party: tr("đang quẩy"), worried: tr("lo lắng"),
    sad: tr("buồn"), crying: tr("đang khóc"), sleeping: tr("đang ngủ")
  };
  svg.setAttribute("aria-label", tr`Thú cưng ví tiền ${names[m]}, cấp ${lv}`);
  const node = document.importNode(svg, true);
  watchVisibility(node);
  return node;
}

/** Dùng chung một IntersectionObserver: thú cưng khuất khỏi màn hình thì dừng chuyển động cho đỡ tốn pin. */
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

/** Câu nói khi chọc thú cưng. */
export function pokeLine(mood) {
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
