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
  hat_cat: `<g>
    <polygon points="56,66 46,32 76,46" fill="#ffadd2" stroke="#eb2f96" stroke-width="1.8"/>
    <polygon points="58,60 52,40 70,48" fill="#fff"/>
    <polygon points="144,66 154,32 124,46" fill="#ffadd2" stroke="#eb2f96" stroke-width="1.8"/>
    <polygon points="142,60 148,40 130,48" fill="#fff"/>
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

  // Biểu tượng trán
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

  // Cầm tay
  held_boba: `<g transform="translate(154 120)">
    <path d="M0,8 L16,8 L13,28 L3,28 Z" fill="#ffe8cc" stroke="#d9480f" stroke-width="1.2"/>
    <rect x="-2" y="6" width="20" height="3" rx="1.5" fill="#fff" stroke="#d9480f" stroke-width="1"/>
    <path d="M8,6 L12,-4" stroke="#ff6b6b" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="5" cy="24" r="1.8" fill="#3b2a5a"/><circle cx="11" cy="24" r="1.8" fill="#3b2a5a"/><circle cx="8" cy="20" r="1.8" fill="#3b2a5a"/>
  </g>`,
  held_calculator: `<g transform="translate(154 120)">
    <rect x="0" y="0" width="18" height="26" rx="3" fill="#364fc7" stroke="#1c7ed6" stroke-width="1.2"/>
    <rect x="3" y="3" width="12" height="6" rx="1" fill="#c3fae8"/>
    <rect x="3" y="11" width="3" height="3" rx="0.5" fill="#fff"/><rect x="7.5" y="11" width="3" height="3" rx="0.5" fill="#fff"/><rect x="12" y="11" width="3" height="3" rx="0.5" fill="#fff"/>
    <rect x="3" y="16" width="3" height="3" rx="0.5" fill="#fff"/><rect x="7.5" y="16" width="3" height="3" rx="0.5" fill="#fff"/><rect x="12" y="16" width="3" height="3" rx="0.5" fill="#ffa8a8"/>
    <rect x="3" y="21" width="7.5" height="3" rx="0.5" fill="#fff"/><rect x="12" y="21" width="3" height="3" rx="0.5" fill="#51cf66"/>
  </g>`,
  held_noddles: `<g transform="translate(154 120)">
    <path d="M0,6 L18,6 L15,26 L3,26 Z" fill="#fa5252" stroke="#c92a2a" stroke-width="1.2"/>
    <rect x="-1" y="4" width="20" height="3" rx="1" fill="#fff" stroke="#c92a2a" stroke-width="1"/>
    <path d="M12,4 L22,-2" stroke="#f76707" stroke-width="2" stroke-linecap="round"/>
    <path d="M10,4 L20,-4" stroke="#f76707" stroke-width="2" stroke-linecap="round"/>
    <text x="9" y="18" text-anchor="middle" font-size="7" font-weight="900" fill="#fff" font-family="sans-serif">MÌ</text>
  </g>`,
  held_card: `<g transform="translate(150 122) rotate(-15)">
    <rect x="0" y="0" width="24" height="15" rx="2.5" fill="#141414" stroke="#ffd700" stroke-width="1.2"/>
    <rect x="3" y="4" width="5" height="4" rx="1" fill="#ffd700"/>
    <line x1="0" y1="10" x2="24" y2="10" stroke="#434343" stroke-width="2"/>
  </g>`,

  // Đế đứng
  ped_redcarpet: `<g>
    <ellipse cx="100" cy="188" rx="66" ry="12" fill="#c92a2a" stroke="#ffd43b" stroke-width="2"/>
    <ellipse cx="100" cy="188" rx="60" ry="9" fill="#ff6b6b"/>
  </g>`,
  ped_coins: `<g>
    <ellipse cx="76" cy="189" rx="14" ry="5" fill="#d9480f"/><ellipse cx="76" cy="187" rx="14" ry="5" fill="#fcc419"/>
    <ellipse cx="124" cy="189" rx="14" ry="5" fill="#d9480f"/><ellipse cx="124" cy="187" rx="14" ry="5" fill="#fcc419"/>
    <ellipse cx="100" cy="191" rx="18" ry="6" fill="#d9480f"/><ellipse cx="100" cy="189" rx="18" ry="6" fill="#ffd43b"/>
  </g>`,

  // Nền
  bg_cafe: `<g opacity=".35">
    <rect x="20" y="20" width="160" height="160" rx="30" fill="#fff9db"/>
    <circle cx="45" cy="45" r="18" fill="#ffd8a8"/>
    <path d="M150 30 L165 30 L160 50 L145 50 Z" fill="#d9480f"/>
    <path d="M162 36 Q170 40 162 44" stroke="#d9480f" stroke-width="2" fill="none"/>
  </g>`,
  bg_beach: `<g opacity=".35">
    <rect x="20" y="20" width="160" height="160" rx="30" fill="#e7f5ff"/>
    <circle cx="145" cy="45" r="16" fill="#ffa94d"/>
    <path d="M25 150 Q70 135 110 150 T175 145 L175 175 L25 175 Z" fill="#ffe066"/>
  </g>`,
  bg_vault: `<g opacity=".35">
    <rect x="20" y="20" width="160" height="160" rx="30" fill="#212529"/>
    <circle cx="100" cy="100" r="65" fill="none" stroke="#ffd43b" stroke-width="3" stroke-dasharray="6,4"/>
  </g>`
};

const SKINS = {
  skin_piggy: { body: ["#ffd43b", "#fab005"], flap: ["#ffe066", "#f59f00"] },
  skin_cyber: { body: ["#00f2fe", "#4facfe"], flap: ["#f72585", "#7209b7"] },
  skin_ghost: { body: ["#f8f9fa", "#e9ecef"], flap: ["#dee2e6", "#ced4da"] }
};

/**
 * @param {object} options
 * @param {string} [options.mood]
 * @param {number} [options.level]
 * @param {number} [options.size]
 * @param {object} [options.equipped] - Bản đồ { slot: itemId } hoặc { slot: { id } }
 * @returns {SVGSVGElement}
 */
export function renderPet({ mood = "happy", level = 1, size = 130, equipped = {} } = {}) {
  const m = EYES[mood] ? mood : "happy";
  const lv = Math.max(1, Math.min(10, Number(level) || 1));
  const uid = `p${Math.random().toString(36).slice(2, 8)}`;

  // Chuẩn hóa mã item từ object hoặc string
  const eq = (slot) => {
    const val = equipped?.[slot];
    return typeof val === "string" ? val : val?.id || "";
  };

  // Xác định màu sắc theo Skin nếu có
  const skinKey = eq("skin");
  const customSkin = SKINS[skinKey];
  const [c1, c2] = customSkin ? customSkin.body : (BODY_COLORS[m] || ["#ffb8dc", "#c3a6ff"]);
  const [f1, f2] = customSkin ? customSkin.flap : ["#ff8fc7", "#b38cff"];

  // Các lớp phụ kiện được trang bị
  const headItem = eq("head");
  const headSvg = PET_ITEMS[headItem] || accessory(lv, m);
  const faceSvg = PET_ITEMS[eq("face")] || "";
  const emblemKey = eq("emblem");
  const emblemSvg = PET_ITEMS[emblemKey] || `
    <g class="coin"><circle cx="100" cy="117" r="11" fill="url(#${uid}c)" stroke="#f0a020" stroke-width="2"/>
      <text x="100" y="122" text-anchor="middle" font-size="13" font-weight="800" fill="#c27a00" font-family="Baloo 2, sans-serif">đ</text></g>`;
  const heldSvg = PET_ITEMS[eq("held")] || "";
  const pedSvg = PET_ITEMS[eq("pedestal")] || `<ellipse cx="100" cy="188" rx="50" ry="7" fill="rgba(90,50,150,.16)"/>`;
  const bgSvg = PET_ITEMS[eq("bg")] || "";

  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}" class="pet pet--${m}" role="img">
    <defs>
      <linearGradient id="${uid}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
      <linearGradient id="${uid}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f1}"/><stop offset="1" stop-color="${f2}"/></linearGradient>
      <radialGradient id="${uid}c"><stop offset="0" stop-color="#fff3b0"/><stop offset="1" stop-color="#ffc83d"/></radialGradient>
    </defs>
    ${bgSvg}
    ${pedSvg}
    <g class="pet-body">
      <ellipse cx="78" cy="178" rx="14" ry="8" fill="#e58fc0"/>
      <ellipse cx="122" cy="178" rx="14" ry="8" fill="#e58fc0"/>
      <ellipse class="arm-l" cx="40" cy="132" rx="9" ry="16" fill="${c1}" transform="rotate(20 40 132)"/>
      <ellipse class="arm-r" cx="160" cy="132" rx="9" ry="16" fill="${c2}" transform="rotate(-20 160 132)"/>
      <rect x="38" y="64" width="124" height="114" rx="46" fill="url(#${uid}b)"/>
      <path d="M38 104 Q38 64 84 64 L116 64 Q162 64 162 104 Q132 120 100 120 Q68 120 38 104Z" fill="url(#${uid}f)"/>
      <path d="M52 86 Q60 74 76 72" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".55"/>
      ${emblemSvg}
      <ellipse cx="64" cy="150" rx="9" ry="5.5" fill="#ff7eb9" opacity=".45"/>
      <ellipse cx="136" cy="150" rx="9" ry="5.5" fill="#ff7eb9" opacity=".45"/>
      ${EYES[m]}
      ${faceSvg}
      ${MOUTHS[m]}
      ${heldSvg}
      ${headSvg}
    </g>
    ${headItem && m === "party" ? "" : (EXTRAS[m] || "")}
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
