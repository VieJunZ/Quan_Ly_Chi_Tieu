/**
 * @file shop.js
 * @description Màn hình Tiệm đồ thú cưng (Pet Shop):
 * - Vườn Trứng Linh Thú (Gacha): Dùng Huy hiệu thành tích hoặc Xu để ấp mở ngẫu nhiên 10 Linh Thú.
 * - Bộ sưu tập 10 Linh Thú: Ngũ Hành (Kim, Mộc, Thủy, Hỏa, Thổ) và Thần Thú Thượng Cổ (Thanh Long, Bạch Hổ, Chu Tước, Huyền Vũ, Kỳ Lân).
 * - Phòng thử đồ tương tác (Fitting Room), mua phụ kiện, mặc/tháo đồ, cho ăn và lịch sử xu.
 */

import { tr } from "../i18n.js";
import { api } from "../api.js";
import { h, icon, haptic, toast, confetti, openSheet, busy } from "../ui.js";
import { renderPet, pokeLine, getStageTheme, renderStageBackdrop, LINH_THU } from "../pet.js";

const CATEGORIES = [
  ["all", "✨ " + tr("Tất cả")],
  ["egg", "🥚 " + tr("Vườn Trứng")],
  ["pet", "🐾 " + tr("Linh Thú")],
  ["skin", "👗 " + tr("Trang phục")],
  ["head", "👑 " + tr("Mũ & Nơ")],
  ["face", "👓 " + tr("Kính & Mặt")],
  ["emblem", "🪙 " + tr("Ấn trán")],
  ["pedestal", "🏛️ " + tr("Bệ đứng")],
  ["aura", "💫 " + tr("Hào quang")],
  ["bg", "🌄 " + tr("Phông nền")],
  ["held", "🪄 " + tr("Cầm tay")],
  ["consumable", "🍜 " + tr("Đồ ăn")],
  ["utility", "⚡ " + tr("Tiện ích")]
];

const RARITY_INFO = {
  common: { bg: "rgba(148, 163, 184, 0.22)", color: "var(--ink-soft)", label: "☘️ " + tr("Phổ thông") },
  rare: { bg: "rgba(59, 130, 246, 0.22)", color: "#3b82f6", label: "🔹 " + tr("Hiếm") },
  epic: { bg: "rgba(168, 85, 247, 0.24)", color: "#a855f7", label: "💜 " + tr("Sử thi") },
  legendary: { bg: "rgba(245, 158, 11, 0.28)", color: "#f59e0b", label: "👑 " + tr("Thần thoại") }
};

export async function shopScreen(ctx) {
  const container = h("div", { class: "screen screen--shop stack", style: { gap: "16px" } });

  let shopData = { coins: 0, pet_fullness: 80, badge_points: 3, items: [] };
  let petData = { pet: { mood: "happy", level: 1, badge_points: 3, equipped: {} } };

  try {
    const [shopRes, petRes] = await Promise.all([
      api("/pet-shop/items"),
      api("/pet-shop/pet")
    ]);
    shopData = shopRes || shopData;
    petData = petRes || petData;
  } catch (err) {
    toast(err.message || tr("Không tải được dữ liệu tiệm đồ."), "error");
  }

  let coins = shopData.coins ?? 100;
  let badgePoints = shopData.badge_points ?? (petData.pet?.badge_points ?? 3);
  let fullness = shopData.pet_fullness ?? 80;
  let items = shopData.items || [];

  // Phụ kiện đang thực sự trang bị từ CSDL
  let serverEquipped = { ...(petData.pet?.equipped || {}) };
  // Phụ kiện đang hiển thị trên phòng thử đồ (có thể là đồ đang ướm thử)
  let previewEquipped = { ...serverEquipped };
  let activeTab = "all";
  let previewingItem = null;

  // Header
  const backBtn = h("button", {
    class: "shop-back-btn",
    type: "button",
    "aria-label": tr("Quay lại")
  }, icon("arrow-left", 20));
  backBtn.addEventListener("click", () => ctx.go("home"));

  const coinBadge = h("span", {
    class: "shop-counter-capsule coins",
    title: tr("Số xu hiện có (tích lũy qua việc ghi chép chi tiêu)")
  }, "🪙 ", `${coins} xu`);

  const badgeCounter = h("span", {
    class: "shop-counter-capsule badges",
    title: tr("Huy hiệu thành tích (dùng để ấp trứng linh thú)")
  }, "🏆 ", `${badgePoints} huy hiệu`);

  const historyBtn = h("button", { class: "btn small shop-history-btn", type: "button" }, icon("history", 14), tr("Lịch sử"));
  historyBtn.addEventListener("click", () => openHistorySheet());

  const header = h("header", { class: "shop-header" },
    h("div", { class: "shop-header-left" },
      backBtn,
      h("h1", { class: "shop-header-title" }, tr("Tiệm Linh Thú ✨"))),
    h("div", { class: "shop-header-actions" },
      badgeCounter,
      coinBadge,
      historyBtn));

  function updateCounters() {
    coinBadge.replaceChildren("🪙 ", `${coins} xu`);
    badgeCounter.replaceChildren("🏆 ", `${badgePoints} huy hiệu`);
  }

  // Stage: Phòng thử đồ linh thú
  const petStageHolder = h("div", {
    class: "hero-pet",
    style: {
      margin: "0 auto",
      cursor: "pointer",
      position: "relative",
      zIndex: 1,
      filter: "drop-shadow(0 12px 24px rgba(139, 92, 246, 0.25))"
    }
  });

  const speechBubble = h("div", {
    class: "shop-speech-bubble"
  }, pokeLine(petData.pet?.mood || "happy", previewEquipped.pet));

  const fullnessBarFill = h("div", {
    class: "shop-fullness-fill",
    style: {
      width: `${Math.min(100, Math.max(0, fullness))}%`
    }
  });

  const fullnessLabel = h("span", {
    style: { fontSize: "12px", fontWeight: "700", color: "var(--ink-soft)" }
  }, tr`Độ no: ${fullness}/100 🍖`);

  const quickFeedBtn = h("button", {
    class: "shop-quick-feed-btn",
    type: "button",
    title: tr("Cho ăn nhanh để tăng độ no")
  }, "🍜 " + tr("Cho ăn"));

  quickFeedBtn.addEventListener("click", () => {
    const foodItem = items.find((i) => (i.slot === "consumable" || i.slot === "utility") && i.owned_quantity > 0);
    if (foodItem) {
      useItem(foodItem, quickFeedBtn);
    } else {
      toast(tr("Bạn chưa có đồ ăn trong kho! Hãy chọn đồ ăn bên dưới để mua nhé."), "info");
      activeTab = "consumable";
      renderTabs();
      renderSkinFilters();
      renderGrid();
      grid.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  const resetPreviewBtn = h("button", {
    class: "btn small soft pill",
    type: "button",
    style: {
      fontSize: "11px",
      fontWeight: "800",
      padding: "3px 10px",
      borderRadius: "999px",
      display: "none"
    }
  }, "↩ " + tr("Bỏ ướm thử"));

  resetPreviewBtn.addEventListener("click", () => {
    previewEquipped = { ...serverEquipped };
    previewingItem = null;
    speechBubble.textContent = tr("Đã trả lại bộ trang phục đang mặc!");
    resetPreviewBtn.style.display = "none";
    refreshPetStage();
    renderGrid();
  });

  const stageBackdrop = h("div", {
    class: "stage-backdrop",
    style: {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      zIndex: "0",
      transition: "opacity 0.4s ease"
    }
  });

  const stageSpotlight = h("div", {
    class: "stage-spotlight",
    style: {
      position: "absolute",
      top: "10%",
      left: "50%",
      transform: "translateX(-50%)",
      width: "220px",
      height: "220px",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, transparent 70%)",
      pointerEvents: "none",
      zIndex: "0",
      transition: "background 0.4s ease"
    }
  });

  const stageCard = h("section", {
    class: "card shop-stage-card stack items-center",
    style: {
      background: "var(--grad-soft)",
      border: "1.5px solid var(--stroke)"
    }
  },
  stageBackdrop,
  stageSpotlight,
  speechBubble,
  petStageHolder,
  h("div", {
    class: "shop-fullness-wrapper"
  },
  h("div", { class: "row between items-center" },
    h("div", { class: "row items-center", style: { gap: "6px" } }, fullnessLabel, quickFeedBtn),
    resetPreviewBtn
  ),
  h("div", {
    class: "shop-fullness-track"
  }, fullnessBarFill)));

  function refreshPetStage() {
    petStageHolder.replaceChildren(renderPet({
      mood: petData.pet?.mood || "happy",
      level: petData.pet?.level || 1,
      size: 156,
      equipped: previewEquipped
    }));
    fullnessBarFill.style.width = `${Math.min(100, Math.max(0, fullness))}%`;
    fullnessLabel.textContent = tr`Độ no: ${fullness}/100 🍖`;
    coinBadge.replaceChildren("🪙 ", `${coins} xu`);
    badgeCounter.replaceChildren("🏆 ", `${badgePoints} huy hiệu`);
    resetPreviewBtn.style.display = previewingItem ? "inline-flex" : "none";

    const activeBg = previewEquipped.bg;
    const theme = getStageTheme(activeBg);
    stageCard.style.background = theme.cardBg;
    stageCard.style.border = theme.cardBorder;
    stageCard.style.boxShadow = `0 16px 36px -12px ${theme.glowColor}`;
    stageSpotlight.style.background = theme.spotlight;

    const backdropNode = renderStageBackdrop(activeBg);
    stageBackdrop.replaceChildren(backdropNode || "");
  }
  refreshPetStage();

  petStageHolder.addEventListener("click", () => {
    const svg = petStageHolder.querySelector("svg");
    if (svg) {
      svg.classList.remove("poked");
      void svg.getBoundingClientRect();
      svg.classList.add("poked");
    }
    speechBubble.textContent = pokeLine(petData.pet?.mood || "happy", previewEquipped.pet);
    haptic([8, 30, 8]);
  });

  // Featured Gacha Banner
  const gachaBanner = h("div", {
    class: "gacha-banner",
    role: "button",
    tabindex: "0"
  },
  h("div", { class: "stack", style: { gap: "4px", position: "relative", zIndex: 1 } },
    h("div", { class: "row items-center", style: { gap: "6px" } },
      h("span", {
        class: "badge",
        style: { background: "var(--grad-main)", color: "#fff", fontWeight: "900", fontSize: "11px", borderRadius: "999px", padding: "2px 8px" }
      }, "MỚI ✨"),
      h("strong", { style: { fontSize: "15px", color: "var(--ink)", fontWeight: "900" } }, tr("Vườn Trứng Linh Thú 🥚"))),
    h("span", { class: "faint", style: { fontSize: "12px", lineHeight: "1.35", maxWidth: "260px" } },
      tr("Mở ngẫu nhiên 10 Linh Thú Ngũ Hành & Thần Thú bằng Huy hiệu hoặc Xu!"))),
  h("div", { class: "row items-center", style: { gap: "10px", position: "relative", zIndex: 1 } },
    h("img", {
      src: "/app/img/pets/egg_elemental.png",
      alt: "Egg",
      style: { width: "48px", height: "48px", objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(245, 158, 11, 0.55))" }
    }),
    h("button", {
      class: "btn small shop-candy-btn primary",
      type: "button",
      style: { margin: "0", padding: "8px 14px", fontWeight: "900" }
    }, "Ấp Ngay 🪺")));

  gachaBanner.addEventListener("click", () => {
    const eggItem = items.find((i) => i.slot === "egg") || {
      id: "egg_elemental",
      name: tr("Trứng Linh Thú Ngũ Hành"),
      price_badges: 1,
      price_coins: 80
    };
    openHatchEggModal(eggItem);
  });

  // Tabs danh mục kiểu thanh kẹo trượt
  const tabsRow = h("div", {
    class: "shop-cat-tabs"
  });

  // Phân loại phụ cho tab Trang phục (theo từng Linh Thú)
  let skinFilter = "all";
  const skinSubTabs = [
    ["all", "✨ " + tr("Tất cả")],
    ["wallet", "👛 " + tr("Ví Thần Tài")],
    ["pet_moc", "🌱 " + tr("Mộc Linh")],
    ["pet_hoa", "🔥 " + tr("Xích Viêm")],
    ["pet_tho", "🪨 " + tr("Thạch Thổ")],
    ["pet_kim", "🪙 " + tr("Hoàng Kim")],
    ["pet_thuy", "💧 " + tr("Lam Thủy")],
    ["pet_thanhlong", "🐉 " + tr("Thanh Long")],
    ["pet_bachho", "🐯 " + tr("Bạch Hổ")],
    ["pet_chutuoc", "🦅 " + tr("Chu Tước")],
    ["pet_huyenvu", "🐢 " + tr("Huyền Vũ")],
    ["pet_kylan", "🦄 " + tr("Kỳ Lân")]
  ];

  const skinFilterBar = h("div", {
    class: "shop-subfilter-chips",
    style: { display: "none" }
  });

  function renderSkinFilters() {
    if (activeTab !== "skin") {
      skinFilterBar.style.display = "none";
      return;
    }
    skinFilterBar.style.display = "flex";
    skinFilterBar.replaceChildren(...skinSubTabs.map(([key, label]) => {
      const active = skinFilter === key;
      const chip = h("button", {
        type: "button",
        class: "shop-subfilter-chip" + (active ? " active" : "")
      }, label);
      chip.addEventListener("click", () => {
        haptic(5);
        skinFilter = key;
        renderSkinFilters();
        renderGrid();
      });
      return chip;
    }));
  }

  function renderTabs() {
    tabsRow.replaceChildren(...CATEGORIES.map(([key, label]) => {
      const active = activeTab === key;
      const btn = h("button", {
        type: "button",
        class: "shop-cat-pill" + (active ? " active" : "")
      }, label);
      btn.addEventListener("click", () => {
        haptic(5);
        activeTab = key;
        renderTabs();
        renderSkinFilters();
        renderGrid();
      });
      return btn;
    }));
  }
  renderTabs();

  // Grid vật phẩm trưng bày như figurine thu nhỏ
  const grid = h("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(156px, 1fr))",
      gap: "12px",
      paddingBottom: "24px"
    }
  });

  function parseEffectData(effectData) {
    if (!effectData) return {};
    try {
      return typeof effectData === "string" ? JSON.parse(effectData) : effectData;
    } catch {
      return {};
    }
  }

  function renderGrid() {
    let filtered = items.filter((item) => activeTab === "all" || item.slot === activeTab);
    if (activeTab === "skin" && skinFilter !== "all") {
      filtered = filtered.filter((item) => {
        const eff = parseEffectData(item.effect_data);
        if (skinFilter === "wallet") return !eff.pet_id;
        return eff.pet_id === skinFilter;
      });
    }

    const cardNodes = filtered.map((item) => {
      const rarity = RARITY_INFO[item.rarity] || RARITY_INFO.common;
      const eqId = (val) => (typeof val === "string" ? val : val?.id || "");
      const isEquipped = item.slot && eqId(serverEquipped[item.slot]) === item.id;
      const isPreviewing = eqId(previewEquipped[item.slot]) === item.id;
      const isOwned = item.owned_quantity > 0;
      const isEgg = item.slot === "egg";
      const isPet = item.slot === "pet";
      const isSkin = item.slot === "skin";
      const isConsumable = item.slot === "consumable" || item.slot === "utility";
      const effect = parseEffectData(item.effect_data);

      const actionBtn = h("button", {
        class: "shop-candy-btn",
        type: "button"
      });

      if (isEgg) {
        actionBtn.className = "shop-candy-btn buy-badge-btn";
        actionBtn.textContent = tr`Ấp Trứng (${item.price_badges || 1} 🏆)`;
        actionBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openHatchEggModal(item);
        });
      } else if (isPet) {
        if (isEquipped) {
          actionBtn.className = "shop-candy-btn equipped-btn";
          actionBtn.textContent = tr("✓ Đang đồng hành");
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleEquip(item, false, actionBtn);
          });
        } else if (isOwned) {
          actionBtn.className = "shop-candy-btn ok-btn";
          actionBtn.textContent = tr("🐾 Đồng hành");
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleEquip(item, true, actionBtn);
          });
        } else {
          actionBtn.className = "shop-candy-btn buy-badge-btn";
          actionBtn.textContent = tr`Mở từ Trứng 🥚`;
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const eggTarget = items.find((i) => i.slot === "egg" && (item.rarity === "legendary" ? i.id === "egg_divine" : i.id === "egg_elemental")) || items.find((i) => i.slot === "egg");
            openHatchEggModal(eggTarget);
          });
        }
      } else if (isConsumable) {
        if (isOwned) {
          actionBtn.className = "shop-candy-btn ok-btn";
          actionBtn.textContent = tr`Dùng (x${item.owned_quantity}) 🍜`;
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            useItem(item, actionBtn);
          });
        } else {
          const canAfford = coins >= item.price_coins;
          actionBtn.className = "shop-candy-btn buy-btn" + (canAfford ? "" : " soft-btn");
          actionBtn.textContent = tr`Mua ${item.price_coins} xu`;
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            buyItem(item, actionBtn);
          });
        }
      } else if (isSkin) {
        if (isEquipped) {
          actionBtn.className = "shop-candy-btn equipped-btn";
          actionBtn.textContent = tr("✓ Đang mặc");
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleEquip(item, false, actionBtn);
          });
        } else if (isOwned) {
          actionBtn.className = "shop-candy-btn ok-btn";
          actionBtn.textContent = tr("👗 Mặc skin");
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleEquip(item, true, actionBtn);
          });
        } else if (effect.is_free_with_pet) {
          actionBtn.className = "shop-candy-btn soft-btn";
          actionBtn.textContent = tr("🎁 Tặng kèm khi có thú");
          actionBtn.style.fontSize = "11.5px";
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const petName = (LINH_THU && LINH_THU[effect.pet_id]) ? LINH_THU[effect.pet_id].name : "linh thú";
            toast(tr`Skin này được tặng kèm miễn phí khi bạn sở hữu ${petName}! Hãy ấp trứng để mở khóa nhé!`, "info");
          });
        } else {
          const isBadges = Boolean(item.price_badges);
          const canAfford = isBadges ? badgePoints >= item.price_badges : coins >= item.price_coins;
          actionBtn.className = "shop-candy-btn " + (isBadges ? "buy-badge-btn" : "buy-btn") + (canAfford ? "" : " soft-btn");
          actionBtn.textContent = isBadges ? tr`Mua ${item.price_badges} 🏆` : tr`Mua ${item.price_coins} xu`;
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            buyItem(item, actionBtn);
          });
        }
      } else {
        if (isEquipped) {
          actionBtn.className = "shop-candy-btn equipped-btn";
          actionBtn.textContent = tr("✓ Đang mặc");
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleEquip(item, false, actionBtn);
          });
        } else if (isOwned) {
          actionBtn.className = "shop-candy-btn primary";
          actionBtn.textContent = tr("✨ Mặc đồ");
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleEquip(item, true, actionBtn);
          });
        } else {
          const canAfford = coins >= item.price_coins;
          actionBtn.className = "shop-candy-btn buy-btn" + (canAfford ? "" : " soft-btn");
          actionBtn.textContent = tr`Mua ${item.price_coins} xu`;
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            buyItem(item, actionBtn);
          });
        }
      }

      // Hình ảnh đại diện đặt trên bệ trưng bày tròn đáng yêu
      let thumbnailNode;
      if (isPet) {
        thumbnailNode = h("div", {
          style: {
            width: "50px",
            height: "50px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            filter: isOwned ? "none" : "grayscale(0.7) opacity(0.8)"
          }
        }, renderPet({ equipped: { pet: item.id }, size: 48, mood: "happy" }));
      } else if (isSkin) {
        const petId = effect.pet_id;
        thumbnailNode = h("div", {
          style: {
            width: "50px",
            height: "50px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            filter: isOwned ? "none" : "grayscale(0.65) opacity(0.85)"
          }
        }, renderPet({
          equipped: petId ? { pet: petId, skin: item.id } : { skin: item.id },
          size: 48,
          mood: "happy"
        }));
      } else if (effect.img) {
        thumbnailNode = h("img", {
          src: effect.img,
          alt: item.name,
          style: {
            width: isEgg ? "44px" : "46px",
            height: isEgg ? "44px" : "46px",
            objectFit: "contain",
            filter: isOwned || isEgg ? "none" : "grayscale(0.65) opacity(0.85)"
          }
        });
      } else {
        thumbnailNode = h("span", {
          style: { fontSize: "28px", lineHeight: "1", display: "inline-block" }
        }, effect.icon || (effect.fullness ? "🍜" : "✨"));
      }

      const thumbFrame = h("div", { class: "shop-item-thumb-frame" }, thumbnailNode);

      // Thẻ Card kiểu mô hình sưu tầm
      const cardClasses = ["shop-item-card", "stack"];
      if (isPreviewing) cardClasses.push("is-previewing");
      if (isEquipped) cardClasses.push("is-equipped");

      const card = h("div", {
        class: cardClasses.join(" ")
      });

      if (isPreviewing) {
        card.append(h("span", { class: "shop-preview-tag" }, "✨ " + tr("Đang thử")));
      }

      const topRow = h("div", { class: "row between items-center", style: { width: "100%", marginBottom: "4px" } },
        thumbFrame,
        h("span", {
          class: "shop-rarity-pill",
          style: {
            background: rarity.bg,
            color: rarity.color
          }
        }, rarity.label)
      );

      const titleStack = h("div", { class: "stack", style: { gap: "2px" } },
        h("div", {
          style: {
            fontWeight: "800",
            fontSize: "13.5px",
            color: "var(--ink)",
            lineHeight: "1.25"
          }
        }, item.name),
        (isSkin && effect.pet_id && LINH_THU && LINH_THU[effect.pet_id]) ? h("div", {
          style: {
            fontSize: "11px",
            color: LINH_THU[effect.pet_id].elementColor || "var(--violet)",
            fontWeight: "800"
          }
        }, `🐾 ${LINH_THU[effect.pet_id].name}`) : null
      );

      const descEl = h("p", {
        class: "faint",
        style: {
          fontSize: "11.5px",
          lineHeight: "1.35",
          minHeight: "30px",
          margin: "2px 0 0"
        }
      }, item.description);

      const priceTag = h("div", {
        style: {
          fontWeight: "800",
          color: isEgg ? "#a855f7" : (isSkin && effect.is_free_with_pet ? "#10b981" : "#f59e0b"),
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          marginTop: "auto"
        }
      }, isEgg
        ? `🏆 ${item.price_badges || 1} huy hiệu / 🪙 ${item.price_coins} xu`
        : (isSkin && effect.is_free_with_pet
            ? tr("🎁 Tặng kèm khi có thú")
            : (item.price_badges > 0
                ? `🏆 ${item.price_badges} huy hiệu (${item.price_coins} xu)`
                : (item.price_coins > 0 ? `🪙 ${item.price_coins} xu` : tr("Miễn phí")))));

      card.append(topRow, titleStack, descEl, priceTag, actionBtn);

      // Chạm thẻ để ướm thử lên sân khấu
      card.addEventListener("click", () => {
        if (isEgg) {
          openHatchEggModal(item);
          return;
        }
        if (!isConsumable) {
          if (isPet) {
            previewEquipped.pet = { id: item.id, name: item.name };
          } else if (isSkin && effect.pet_id) {
            previewEquipped.pet = { id: effect.pet_id, name: LINH_THU[effect.pet_id]?.name || effect.pet_id };
            previewEquipped.skin = { id: item.id, name: item.name };
          } else if (item.slot) {
            previewEquipped[item.slot] = { id: item.id, name: item.name };
          }
          previewingItem = item;
          if (isPet || (isSkin && effect.pet_id)) {
            speechBubble.textContent = pokeLine(petData.pet?.mood || "happy", previewEquipped.pet?.id);
          } else {
            speechBubble.textContent = tr`Ướm thử: "${item.name}"! Trông hợp không bạn?`;
          }
          refreshPetStage();
          renderGrid();
          haptic(6);
        }
      });

      return card;
    });

    if (activeTab === "pet") {
      const isWalletActive = !serverEquipped.pet;
      const isWalletPreviewing = !previewEquipped.pet;
      const walletCard = h("div", {
        class: "shop-item-card stack" + (isWalletPreviewing ? " is-previewing" : "") + (isWalletActive ? " is-equipped" : "")
      });

      if (isWalletPreviewing) {
        walletCard.append(h("span", { class: "shop-preview-tag" }, "✨ " + tr("Đang thử")));
      }

      const walletThumb = h("div", { class: "shop-item-thumb-frame" },
        renderPet({ size: 44, mood: "happy" })
      );

      const walletTopRow = h("div", { class: "row between items-center", style: { width: "100%", marginBottom: "4px" } },
        walletThumb,
        h("span", {
          class: "shop-rarity-pill",
          style: { background: "rgba(100, 116, 139, 0.2)", color: "var(--ink-soft)" }
        }, "👛 " + tr("Mặc định"))
      );

      const walletTitle = h("div", { style: { fontWeight: "800", fontSize: "13.5px", color: "var(--ink)" } }, tr("Ví Tiền Thần Tài"));
      const walletDesc = h("div", { class: "faint", style: { fontSize: "11.5px", minHeight: "30px", margin: "2px 0 0" } },
        tr("Thú cưng ví tiền mặc định, thỏa sức phối mọi mũ, kính, nơ và đồ cầm tay.")
      );
      const walletPrice = h("div", { style: { fontWeight: "800", color: "#10b981", fontSize: "12px", marginTop: "auto" } }, tr("Miễn phí có sẵn"));
      const walletBtn = h("button", {
        class: "shop-candy-btn " + (isWalletActive ? "equipped-btn" : "ok-btn"),
        type: "button"
      }, isWalletActive ? tr("✓ Đang chọn") : tr("🐾 Chọn ví tiền"));

      walletCard.append(walletTopRow, walletTitle, walletDesc, walletPrice, walletBtn);

      walletBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (serverEquipped.pet) {
          const currentPetId = typeof serverEquipped.pet === "string" ? serverEquipped.pet : serverEquipped.pet?.id;
          serverEquipped.pet = null;
          previewEquipped.pet = null;
          if (serverEquipped.skin) {
            const currentSkinId = typeof serverEquipped.skin === "string" ? serverEquipped.skin : serverEquipped.skin?.id;
            const skinItem = items.find((i) => i.id === currentSkinId);
            const eff = parseEffectData(skinItem?.effect_data);
            if (eff.pet_id) {
              delete serverEquipped.skin;
              delete previewEquipped.skin;
            }
          }
          previewingItem = null;
          await api("/pet-shop/equip", { method: "POST", body: { item_id: currentPetId, equip: false } });
          refreshPetStage();
          renderGrid();
          toast(tr("Đã trở về Ví Tiền Thần Tài mặc định!"), "ok");
        }
      });

      walletCard.addEventListener("click", () => {
        previewEquipped.pet = null;
        if (previewEquipped.skin) {
          const skinItem = items.find((i) => i.id === previewEquipped.skin.id);
          const eff = parseEffectData(skinItem?.effect_data);
          if (eff.pet_id) {
            delete previewEquipped.skin;
          }
        }
        previewingItem = { slot: "pet", id: null };
        speechBubble.textContent = tr("Trở về với chiếc ví tiền thân thương!");
        refreshPetStage();
        renderGrid();
        haptic(6);
      });

      cardNodes.unshift(walletCard);
    }

    grid.replaceChildren(...cardNodes);
  }
  renderGrid();

  // Mua vật phẩm thường
  async function buyItem(item, btn) {
    if (item.price_badges && badgePoints < item.price_badges) {
      toast(tr`Bạn còn thiếu ${item.price_badges - badgePoints} huy hiệu để mua vật phẩm này!`, "warn");
      haptic([20, 50, 20]);
      return;
    }
    if (coins < item.price_coins) {
      toast(tr`Bạn còn thiếu ${item.price_coins - coins} xu. Hãy tiếp tục ghi chép chi tiêu để nhận thêm nhé!`, "warn");
      haptic([20, 50, 20]);
      return;
    }
    const restore = busy(btn);
    try {
      const res = await api("/pet-shop/buy", { method: "POST", body: { item_id: item.id } });
      coins = res.coins;
      if (res.badge_points != null) {
        badgePoints = res.badge_points;
      }
      updateCounters();
      item.owned_quantity = (item.owned_quantity || 0) + 1;
      if (item.slot !== "consumable" && item.slot !== "utility" && item.slot !== "egg") {
        const eff = parseEffectData(item.effect_data);
        const shouldEquip = !(item.slot === "skin" && eff.pet_id && !items.find((i) => i.id === eff.pet_id && i.owned_quantity > 0));
        if (shouldEquip) {
          serverEquipped[item.slot] = { id: item.id, name: item.name };
          previewEquipped[item.slot] = { id: item.id, name: item.name };
        }
        previewingItem = null;
      }
      refreshPetStage();
      renderGrid();
      haptic([10, 30, 10]);
      confetti({ count: 50 });
      toast(tr`Mua thành công "${item.name}"!`, "ok");
      speechBubble.textContent = tr`Tuyệt cú mèo! Mình sở hữu "${item.name}" rồi nè!`;
    } catch (err) {
      toast(err.message || tr("Không thể mua vật phẩm."), "error");
    } finally {
      restore();
    }
  }

  // Mặc / Tháo phụ kiện & Linh Thú
  async function toggleEquip(item, equip, btn) {
    const isSkin = item.slot === "skin";
    const effect = parseEffectData(item.effect_data);
    if (equip && isSkin && effect.pet_id) {
      const targetPet = items.find((i) => i.id === effect.pet_id);
      if (!targetPet || targetPet.owned_quantity <= 0) {
        toast(tr`Bạn cần sở hữu linh thú ${LINH_THU[effect.pet_id]?.name || effect.pet_id} trước khi mặc trang phục này!`, "warn");
        haptic([20, 50, 20]);
        return;
      }
    }
    const restore = busy(btn);
    try {
      await api("/pet-shop/equip", { method: "POST", body: { item_id: item.id, equip } });
      if (equip) {
        serverEquipped[item.slot] = { id: item.id, name: item.name };
        previewEquipped[item.slot] = { id: item.id, name: item.name };
        if (item.slot === "skin" && effect.pet_id) {
          const targetPet = items.find((i) => i.id === effect.pet_id);
          serverEquipped.pet = { id: effect.pet_id, name: targetPet?.name || effect.pet_id };
          previewEquipped.pet = { id: effect.pet_id, name: targetPet?.name || effect.pet_id };
        } else if (item.slot === "pet") {
          const defSkin = items.find((s) => s.slot === "skin" && parseEffectData(s.effect_data).pet_id === item.id && parseEffectData(s.effect_data).theme === "default");
          if (defSkin) {
            serverEquipped.skin = { id: defSkin.id, name: defSkin.name };
            previewEquipped.skin = { id: defSkin.id, name: defSkin.name };
          }
        }
        previewingItem = null;
        if (item.slot === "pet" || (item.slot === "skin" && effect.pet_id)) {
          speechBubble.textContent = pokeLine(petData.pet?.mood || "happy", serverEquipped.pet?.id);
        } else {
          speechBubble.textContent = tr`Đã diện "${item.name}" lên người!`;
        }
      } else {
        delete serverEquipped[item.slot];
        delete previewEquipped[item.slot];
        if (item.slot === "pet") {
          delete serverEquipped.skin;
          delete previewEquipped.skin;
        }
        previewingItem = null;
        speechBubble.textContent = tr`Đã tháo "${item.name}".`;
      }
      refreshPetStage();
      renderGrid();
      haptic(10);
    } catch (err) {
      toast(err.message || tr("Thao tác thất bại."), "error");
    } finally {
      restore();
    }
  }

  // Dùng đồ ăn / bùa
  async function useItem(item, btn) {
    const restore = busy(btn);
    try {
      const res = await api("/pet-shop/use", { method: "POST", body: { item_id: item.id } });
      item.owned_quantity = res.remaining_qty;
      fullness = res.pet_fullness;
      refreshPetStage();
      renderGrid();
      haptic([15, 30, 15]);
      toast(tr`Đã dùng "${item.name}". Độ no tăng lên ${fullness}/100!`, "ok");
      speechBubble.textContent = tr("Măm măm ngon quá! Độ no tăng lên rồi nè!");
    } catch (err) {
      toast(err.message || tr("Không thể dùng vật phẩm."), "error");
    } finally {
      restore();
    }
  }

  // Modal Ấp Mở Trứng Linh Thú (Interactive Gacha Modal)
  function openHatchEggModal(eggItem) {
    const eggList = items.filter((i) => i.slot === "egg");
    const egg = eggItem || eggList[0] || {
      id: "egg_elemental",
      name: tr("Trứng Linh Thú Ngũ Hành"),
      price_badges: 1,
      price_coins: 80
    };

    const eggEffect = parseEffectData(egg.effect_data);
    const eggImgSrc = eggEffect.img || (egg.id === "egg_divine" ? "/app/img/pets/egg_divine.png" : "/app/img/pets/egg_elemental.png");

    const modalContent = h("div", { class: "stack items-center", style: { gap: "14px", textAlign: "center" } });

    // Trình chọn đổi quả trứng nếu có nhiều hơn 1 loại trứng
    let eggSwitcher = null;
    if (eggList.length > 1) {
      eggSwitcher = h("div", {
        class: "row center",
        style: {
          gap: "6px",
          background: "var(--glass)",
          padding: "4px",
          borderRadius: "999px",
          border: "1px solid var(--stroke)",
          marginBottom: "4px"
        }
      }, ...eggList.map((eItem) => {
        const isSel = eItem.id === egg.id;
        const btn = h("button", {
          type: "button",
          style: {
            borderRadius: "999px",
            padding: "5px 12px",
            fontSize: "12px",
            fontWeight: isSel ? "800" : "600",
            background: isSel ? "var(--grad-main)" : "transparent",
            color: isSel ? "#fff" : "var(--ink-soft)",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s"
          }
        }, eItem.id === "egg_divine" ? "🪺 " + tr("Trứng Thần Thú") : "🥚 " + tr("Trứng Ngũ Hành"));
        btn.addEventListener("click", () => {
          haptic(5);
          sheet.close();
          openHatchEggModal(eItem);
        });
        return btn;
      }));
    }

    // Trứng lơ lửng & Vòng hào quang
    const eggImg = h("img", {
      class: "gacha-egg-img",
      src: eggImgSrc,
      alt: egg.name
    });

    const glowRing = h("div", { class: "egg-glow-ring" });
    const eggBox = h("div", { class: "gacha-egg-box" }, glowRing, eggImg);

    const titleEl = h("h3", { style: { margin: 0, fontSize: "1.2rem", fontWeight: "800", color: "var(--ink)" } }, egg.name);
    const descEl = h("p", { class: "faint", style: { fontSize: "12.5px", margin: 0, maxWidth: "300px" } }, egg.description);

    // Bảng danh sách các linh thú có thể nở ra
    const poolTitle = h("div", { style: { fontSize: "12px", fontWeight: "700", color: "var(--ink-soft)", marginTop: "4px" } },
      tr("✨ Linh thú có cơ hội nhận được:"));

    const poolList = egg.id === "egg_divine"
      ? ["pet_thanhlong", "pet_bachho", "pet_chutuoc", "pet_huyenvu", "pet_kylan"]
      : ["pet_moc", "pet_hoa", "pet_tho", "pet_kim", "pet_thuy", "pet_thanhlong", "pet_bachho"];

    const poolGrid = h("div", { class: "linhthu-pool-grid" }, ...poolList.map((petId) => {
      const pet = LINH_THU[petId];
      if (!pet) return "";
      return h("div", {
        class: "linhthu-pool-item",
        title: pet.name,
        style: { width: "48px", height: "48px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }
      }, renderPet({ equipped: { pet: petId }, size: 40, mood: "happy" }));
    }));

    // Số dư hiện tại
    const balanceBox = h("div", {
      class: "row center items-center",
      style: {
        gap: "12px",
        padding: "6px 14px",
        background: "var(--glass)",
        border: "1px solid var(--stroke)",
        borderRadius: "999px",
        fontSize: "12.5px",
        fontWeight: "700"
      }
    },
    h("span", { style: { color: "#c084fc" } }, `🏆 ${badgePoints} huy hiệu`),
    h("span", { style: { color: "var(--stroke)" } }, "|"),
    h("span", { style: { color: "#f59e0b" } }, `🪙 ${coins} xu`));

    // Nút ấp trứng bằng Huy hiệu & bằng Xu
    const priceBadges = egg.price_badges || (egg.id === "egg_divine" ? 2 : 1);
    const priceCoins = egg.price_coins || (egg.id === "egg_divine" ? 160 : 80);

    const btnHatchBadge = h("button", {
      class: "btn block primary",
      type: "button",
      style: {
        borderRadius: "14px",
        padding: "12px 16px",
        fontWeight: "800",
        background: "linear-gradient(135deg, #9333ea, #db2777)",
        color: "#fff",
        boxShadow: "0 8px 20px -4px rgba(168, 85, 247, 0.45)"
      }
    }, `Ấp Trứng (${priceBadges} 🏆 Huy hiệu)`);

    const btnHatchCoin = h("button", {
      class: "btn block soft",
      type: "button",
      style: {
        borderRadius: "14px",
        padding: "10px 16px",
        fontWeight: "700",
        color: "#f59e0b"
      }
    }, `Hoặc ấp bằng ${priceCoins} 🪙 Xu`);

    const actionBox = h("div", { class: "stack", style: { width: "100%", maxWidth: "300px", gap: "8px", marginTop: "4px" } },
      btnHatchBadge, btnHatchCoin);

    if (eggSwitcher) modalContent.append(eggSwitcher);
    modalContent.append(eggBox, titleEl, descEl, balanceBox, poolTitle, poolGrid, actionBox);

    const sheet = openSheet({
      title: tr("Ấp Trứng Linh Thú"),
      content: modalContent
    });

    async function executeHatch(payWith) {
      if (payWith === "badges" && badgePoints < priceBadges) {
        toast(tr`Bạn cần ${priceBadges} huy hiệu để mở trứng này (Hiện có: ${badgePoints} huy hiệu). Hãy hoàn thành thêm thử thách nhé!`, "warn");
        haptic([20, 50, 20]);
        return;
      }
      if (payWith === "coins" && coins < priceCoins) {
        toast(tr`Bạn cần ${priceCoins} xu để mở trứng này (Hiện có: ${coins} xu).`, "warn");
        haptic([20, 50, 20]);
        return;
      }

      btnHatchBadge.disabled = true;
      btnHatchCoin.disabled = true;

      // Animation trứng lắc lư rạn nứt
      eggImg.classList.add("shaking");
      haptic([15, 25, 15, 30, 20, 50]);

      try {
        const res = await api("/pet-shop/hatch-egg", {
          method: "POST",
          body: { egg_id: egg.id, pay_with: payWith }
        });

        // Chờ 850ms để hiệu ứng lắc hoàn thiện rồi bung lụa
        await new Promise((r) => setTimeout(r, 850));

        coins = res.coins;
        badgePoints = res.badge_points;
        fullness = res.pet_fullness;
        updateCounters();

        // Cập nhật số lượng sở hữu của linh thú trong items
        const targetPetInShop = items.find((i) => i.id === res.pet.id);
        if (targetPetInShop) {
          targetPetInShop.owned_quantity = 1;
        }

        // Cập nhật 2 skin miễn phí tặng kèm linh thú
        items.forEach((it) => {
          if (it.slot === "skin") {
            const eff = parseEffectData(it.effect_data);
            if (eff.pet_id === res.pet.id && eff.is_free_with_pet) {
              it.owned_quantity = 1;
            }
          }
        });

        // Bắn confetti
        confetti({ count: 80 });
        haptic([10, 40, 20, 60, 20]);

        const hatchedPet = res.pet;
        const petConfig = LINH_THU[hatchedPet.id] || {};
        const petImgSrc = petConfig.sprite || parseEffectData(hatchedPet.effect_data).img || "/app/img/pets/pet_moc.png";

        // Thay nội dung thành màn chúc mừng
        const resultImg = h("div", {
          class: "gacha-pet-emerge",
          style: {
            width: "160px",
            height: "170px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            filter: "drop-shadow(0 14px 28px rgba(168, 85, 247, 0.45))"
          }
        }, renderPet({ equipped: { pet: hatchedPet.id }, size: 140, mood: "party" }));

        const rarityBadge = h("span", {
          class: "badge",
          style: {
            fontSize: "11px",
            fontWeight: "800",
            background: hatchedPet.rarity === "legendary" ? "rgba(245, 158, 11, 0.28)" : "rgba(168, 85, 247, 0.24)",
            color: hatchedPet.rarity === "legendary" ? "#f59e0b" : "#c084fc",
            padding: "4px 12px",
            borderRadius: "999px"
          }
        }, hatchedPet.rarity === "legendary" ? "👑 " + tr("Thần Thú Huyền Thoại") : "✨ " + tr("Linh Thú Sử Thi"));

        const successTitle = h("h3", {
          style: { margin: "4px 0 0", fontSize: "1.3rem", fontWeight: "900", color: "var(--ink)" }
        }, hatchedPet.name);

        const quoteEl = h("div", {
          style: {
            padding: "8px 14px",
            borderRadius: "14px",
            background: "var(--glass-strong)",
            border: "1px solid var(--stroke)",
            fontStyle: "italic",
            fontSize: "12.5px",
            color: "var(--ink-soft)"
          }
        }, `"${petConfig.quote || hatchedPet.description}"`);

        const isNew = Boolean(res.is_new ?? res.pet?.is_new ?? hatchedPet.is_new);
        const isNewNotice = isNew
          ? h("div", {
              style: {
                color: "var(--ok, #10b981)",
                fontWeight: "800",
                fontSize: "13px"
              }
            }, "🎉 MỚI! Đã thêm vào Bộ sưu tập Linh Thú của bạn!")
          : h("div", {
              style: {
                color: "#f59e0b",
                fontWeight: "700",
                fontSize: "12.5px"
              }
            }, "🔄 Mở trùng! Bạn được bù đắp +40 xu và +25 điểm no bụng!");

        const btnEquipNow = h("button", {
          class: "btn block primary",
          type: "button",
          style: {
            borderRadius: "14px",
            padding: "12px",
            fontWeight: "800",
            background: "var(--grad-main)",
            color: "#fff"
          }
        }, "🐾 " + tr("Chọn làm Linh Thú đồng hành ngay"));

        btnEquipNow.addEventListener("click", async () => {
          serverEquipped.pet = { id: hatchedPet.id, name: hatchedPet.name };
          previewEquipped.pet = { id: hatchedPet.id, name: hatchedPet.name };
          const defSkin = items.find((s) => s.slot === "skin" && parseEffectData(s.effect_data).pet_id === hatchedPet.id && parseEffectData(s.effect_data).theme === "default");
          if (defSkin) {
            serverEquipped.skin = { id: defSkin.id, name: defSkin.name };
            previewEquipped.skin = { id: defSkin.id, name: defSkin.name };
          }
          previewingItem = null;
          await api("/pet-shop/equip", { method: "POST", body: { item_id: hatchedPet.id, equip: true } });
          refreshPetStage();
          renderGrid();
          sheet.close();
          toast(tr`Đã chọn ${hatchedPet.name} làm bạn đồng hành!`, "ok");
        });

        const btnHatchAgain = h("button", {
          class: "btn block soft",
          type: "button",
          style: { borderRadius: "14px" }
        }, tr("Ấp tiếp quả nữa"));

        btnHatchAgain.addEventListener("click", () => {
          sheet.close();
          openHatchEggModal(egg);
        });

        eggBox.replaceChildren(glowRing, resultImg);
        actionBox.replaceChildren(btnEquipNow, btnHatchAgain);
        descEl.replaceChildren(quoteEl);
        poolTitle.style.display = "none";
        poolGrid.style.display = "none";
        balanceBox.replaceChildren(
          h("span", { style: { color: "#c084fc" } }, `🏆 ${badgePoints} huy hiệu`),
          h("span", { style: { color: "var(--stroke)" } }, "|"),
          h("span", { style: { color: "#f59e0b" } }, `🪙 ${coins} xu`)
        );
        titleEl.replaceChildren(rarityBadge, successTitle, isNewNotice);

        refreshPetStage();
        renderGrid();
      } catch (err) {
        eggImg.classList.remove("shaking");
        btnHatchBadge.disabled = false;
        btnHatchCoin.disabled = false;
        toast(err.message || tr("Ấp trứng thất bại."), "error");
      }
    }

    btnHatchBadge.addEventListener("click", () => executeHatch("badges"));
    btnHatchCoin.addEventListener("click", () => executeHatch("coins"));
  }

  // Lịch sử xu & huy hiệu
  async function openHistorySheet() {
    const listEl = h("div", { class: "stack", style: { gap: "8px", maxHeight: "360px", overflowY: "auto" } },
      h("p", { class: "faint" }, tr("Đang tải lịch sử...")));

    openSheet({
      title: tr("Lịch sử biến động xu & ấp trứng"),
      content: listEl
    });

    try {
      const res = await api("/pet-shop/history");
      const list = res.history || [];
      if (list.length === 0) {
        listEl.replaceChildren(h("p", { class: "faint center", style: { padding: "16px 0" } }, tr("Chưa có biến động xu nào.")));
        return;
      }
      listEl.replaceChildren(...list.map((tx) => {
        const isPlus = tx.amount > 0;
        return h("div", {
          class: "row between items-center card",
          style: { padding: "10px 14px", border: "1px solid var(--stroke)" }
        },
        h("div", { class: "stack", style: { gap: "2px" } },
          h("span", { style: { fontWeight: "700", fontSize: "14px", color: "var(--ink)" } }, tx.reason),
          h("span", { class: "faint", style: { fontSize: "11px" } }, tx.created_at)),
        h("div", {
          style: {
            fontWeight: "800",
            fontSize: "14px",
            color: isPlus ? "var(--income, #10b981)" : "#ef4444"
          }
        }, isPlus ? `+${tx.amount}` : `${tx.amount}`, " xu"));
      }));
    } catch {
      listEl.replaceChildren(h("p", { class: "faint center" }, tr("Không thể tải lịch sử.")));
    }
  }

  container.append(header, stageCard, gachaBanner, tabsRow, skinFilterBar, grid);
  return container;
}
