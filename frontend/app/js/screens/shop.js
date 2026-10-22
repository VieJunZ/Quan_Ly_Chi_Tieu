/**
 * @file shop.js
 * @description Màn hình Tiệm đồ thú cưng (Pet Shop):
 * Phòng thử đồ tương tác (Fitting Room), mua phụ kiện, mặc/tháo phụ kiện, cho thú cưng ăn, xem lịch sử xu.
 */

import { tr } from "../i18n.js";
import { api } from "../api.js";
import { h, icon, haptic, toast, confetti, openSheet, busy } from "../ui.js";
import { renderPet, pokeLine, getStageTheme, renderStageBackdrop } from "../pet.js";

const CATEGORIES = [
  ["all", "✨ " + tr("Tất cả")],
  ["head", "🎓 " + tr("Mũ")],
  ["face", "🕶️ " + tr("Mặt/Kính")],
  ["emblem", "🪙 " + tr("Trán")],
  ["held", "🧋 " + tr("Cầm tay")],
  ["pedestal", "🏆 " + tr("Bệ đứng")],
  ["skin", "🤖 " + tr("Skin")],
  ["bg", "🏡 " + tr("Nền")],
  ["consumable", "🍜 " + tr("Đồ ăn")],
  ["utility", "⚡ " + tr("Tiện ích")]
];

const RARITY_INFO = {
  common: { bg: "rgba(148, 163, 184, 0.18)", color: "var(--ink-soft)", label: tr("Phổ thông") },
  rare: { bg: "rgba(59, 130, 246, 0.22)", color: "#3b82f6", label: tr("Hiếm") },
  epic: { bg: "rgba(168, 85, 247, 0.24)", color: "#a855f7", label: tr("Sử thi") },
  legendary: { bg: "rgba(245, 158, 11, 0.28)", color: "#f59e0b", label: tr("Huyền thoại") }
};

export async function shopScreen(ctx) {
  const container = h("div", { class: "screen screen--shop stack", style: { gap: "16px" } });

  let shopData = { coins: 0, pet_fullness: 80, items: [] };
  let petData = { pet: { mood: "happy", level: 1, equipped: {} } };

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
  let fullness = shopData.pet_fullness ?? 80;
  let items = shopData.items || [];
  // Phụ kiện đang thực sự trang bị từ CSDL
  let serverEquipped = { ...(petData.pet?.equipped || {}) };
  // Phụ kiện đang hiển thị trên phòng thử đồ (có thể là đồ đang ướm thử)
  let previewEquipped = { ...serverEquipped };
  let activeTab = "all";
  let previewingItem = null;

  // Header
  const backBtn = h("button", { class: "btn-icon", type: "button", "aria-label": tr("Quay lại") }, icon("arrow-left"));
  backBtn.addEventListener("click", () => ctx.go("home"));

  const coinBadge = h("span", {
    class: "badge",
    style: {
      fontSize: "14px",
      fontWeight: "800",
      padding: "6px 14px",
      background: "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(234, 179, 8, 0.1))",
      color: "#f59e0b",
      border: "1px solid rgba(245, 158, 11, 0.4)",
      borderRadius: "999px",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px"
    }
  }, "🪙 ", `${coins} xu`);

  const historyBtn = h("button", { class: "btn small soft", type: "button" }, icon("history", 14), tr("Lịch sử"));
  historyBtn.addEventListener("click", () => openHistorySheet());

  const header = h("header", { class: "row between items-center" },
    h("div", { class: "row items-center", style: { gap: "8px" } },
      backBtn,
      h("h1", { style: { margin: 0, fontSize: "1.3rem", fontWeight: "800" } }, tr("Tiệm đồ Thú cưng"))),
    h("div", { class: "row items-center", style: { gap: "8px" } }, coinBadge, historyBtn));

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
    style: {
      position: "relative",
      padding: "8px 16px",
      borderRadius: "18px 18px 18px 4px",
      background: "var(--glass-strong)",
      border: "1px solid var(--stroke)",
      color: "var(--ink)",
      fontSize: "13.5px",
      fontWeight: "700",
      boxShadow: "var(--shadow)",
      maxWidth: "92%",
      margin: "0 auto 6px",
      textAlign: "center"
    }
  }, tr("Bạn muốn sắm gì cho mình nào?"));

  const fullnessBarFill = h("div", {
    style: {
      height: "8px",
      borderRadius: "4px",
      background: "var(--grad-main)",
      width: `${Math.min(100, Math.max(0, fullness))}%`,
      transition: "width 0.4s var(--spring)"
    }
  });

  const fullnessLabel = h("span", {
    style: { fontSize: "12px", fontWeight: "600", color: "var(--ink-soft)" }
  }, tr`Độ no: ${fullness}/100 🍖`);

  const resetPreviewBtn = h("button", {
    class: "btn small soft",
    type: "button",
    style: {
      fontSize: "11.5px",
      padding: "2px 10px",
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
    class: "card stack items-center",
    style: {
      background: "var(--grad-soft)",
      border: "1px solid var(--stroke)",
      borderRadius: "var(--radius)",
      padding: "18px 16px 14px",
      position: "relative",
      overflow: "hidden",
      transition: "background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease"
    }
  },
  stageBackdrop,
  stageSpotlight,
  speechBubble,
  petStageHolder,
  h("div", {
    class: "stack",
    style: {
      width: "100%",
      maxWidth: "240px",
      gap: "6px",
      margin: "4px auto 0",
      position: "relative",
      zIndex: 1
    }
  },
  h("div", { class: "row between items-center" }, fullnessLabel, resetPreviewBtn),
  h("div", {
    style: {
      background: "rgba(0, 0, 0, 0.22)",
      borderRadius: "4px",
      overflow: "hidden",
      padding: "1px"
    }
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
    coinBadge.textContent = `🪙 ${coins} xu`;
    resetPreviewBtn.style.display = previewingItem ? "inline-flex" : "none";

    // Cập nhật phông nền phòng thử đồ theo vật phẩm 'bg' đang ướm thử hoặc đang mặc
    const activeBg = previewEquipped.bg;
    const theme = getStageTheme(activeBg);
    stageCard.style.background = theme.cardBg;
    stageCard.style.border = theme.cardBorder;
    stageCard.style.boxShadow = `0 14px 34px -10px ${theme.glowColor}`;
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
    speechBubble.textContent = pokeLine(petData.pet?.mood || "happy");
    haptic([8, 30, 8]);
  });

  // Tabs danh mục
  const tabsRow = h("div", {
    class: "row",
    style: {
      overflowX: "auto",
      padding: "4px 2px",
      gap: "8px",
      scrollbarWidth: "none"
    }
  });

  function renderTabs() {
    tabsRow.replaceChildren(...CATEGORIES.map(([key, label]) => {
      const active = activeTab === key;
      const btn = h("button", {
        type: "button",
        style: {
          borderRadius: "999px",
          whiteSpace: "nowrap",
          padding: "6px 14px",
          fontSize: "13px",
          fontWeight: active ? "700" : "500",
          background: active ? "var(--grad-main)" : "var(--glass)",
          color: active ? "#fff" : "var(--ink-soft)",
          border: active ? "none" : "1px solid var(--stroke)",
          boxShadow: active ? "var(--shadow-pop)" : "none",
          cursor: "pointer",
          transition: "all 0.2s"
        }
      }, label);
      btn.addEventListener("click", () => {
        haptic(5);
        activeTab = key;
        renderTabs();
        renderGrid();
      });
      return btn;
    }));
  }
  renderTabs();

  // Grid vật phẩm
  const grid = h("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
      gap: "12px",
      paddingBottom: "24px"
    }
  });

  function parseEffectIcon(effectData) {
    if (!effectData) return "✨";
    try {
      const parsed = typeof effectData === "string" ? JSON.parse(effectData) : effectData;
      return parsed.icon || (parsed.fullness ? "🍜" : "✨");
    } catch {
      return "✨";
    }
  }

  function renderGrid() {
    const filtered = items.filter((item) => activeTab === "all" || item.slot === activeTab);
    grid.replaceChildren(...filtered.map((item) => {
      const rarity = RARITY_INFO[item.rarity] || RARITY_INFO.common;
      const isEquipped = item.slot && serverEquipped[item.slot]?.id === item.id;
      const isPreviewing = previewEquipped[item.slot]?.id === item.id;
      const isOwned = item.owned_quantity > 0;
      const isConsumable = item.slot === "consumable" || item.slot === "utility";
      const iconChar = parseEffectIcon(item.effect_data);

      const actionBtn = h("button", {
        class: "btn small block",
        type: "button",
        style: {
          marginTop: "8px",
          fontSize: "12.5px",
          fontWeight: "700",
          borderRadius: "12px"
        }
      });

      if (isConsumable) {
        if (isOwned) {
          actionBtn.textContent = tr`Dùng (x${item.owned_quantity})`;
          actionBtn.classList.add("ok");
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            useItem(item, actionBtn);
          });
        } else {
          actionBtn.textContent = tr`Mua ${item.price_coins} xu`;
          if (coins < item.price_coins) actionBtn.classList.add("soft");
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            buyItem(item, actionBtn);
          });
        }
      } else {
        if (isEquipped) {
          actionBtn.textContent = tr("✓ Đang mặc");
          actionBtn.classList.add("soft");
          actionBtn.style.color = "var(--ok, #10b981)";
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleEquip(item, false, actionBtn);
          });
        } else if (isOwned) {
          actionBtn.textContent = tr("Mặc đồ");
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleEquip(item, true, actionBtn);
          });
        } else {
          actionBtn.textContent = tr`Mua ${item.price_coins} xu`;
          if (coins < item.price_coins) actionBtn.classList.add("soft");
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            buyItem(item, actionBtn);
          });
        }
      }

      const card = h("div", {
        class: "card stack",
        style: {
          padding: "12px",
          borderRadius: "16px",
          background: isPreviewing ? "var(--glass-strong)" : "var(--glass)",
          border: isPreviewing ? "2px solid var(--violet)" : (isEquipped ? "1.5px solid var(--ok, #10b981)" : "1px solid var(--stroke)"),
          boxShadow: isPreviewing ? "0 8px 20px -6px rgba(139, 92, 246, 0.4)" : "var(--shadow)",
          position: "relative",
          cursor: "pointer",
          gap: "6px"
        }
      },
      h("div", { class: "row between items-center" },
        h("span", {
          style: {
            fontSize: "26px",
            lineHeight: "1",
            display: "inline-block"
          }
        }, iconChar),
        h("span", {
          class: "badge",
          style: {
            fontSize: "10.5px",
            fontWeight: "700",
            background: rarity.bg,
            color: rarity.color,
            padding: "2px 8px"
          }
        }, rarity.label)),
      h("div", {
        style: {
          fontWeight: "700",
          fontSize: "13.5px",
          color: "var(--ink)",
          lineHeight: "1.25"
        }
      }, item.name),
      h("p", {
        class: "faint",
        style: {
          fontSize: "11.5px",
          lineHeight: "1.35",
          minHeight: "32px",
          margin: 0
        }
      }, item.description),
      h("div", {
        style: {
          fontWeight: "800",
          color: "#f59e0b",
          fontSize: "13px"
        }
      }, item.price_coins > 0 ? `🪙 ${item.price_coins} xu` : tr("Miễn phí")),
      actionBtn);

      // Chạm thẻ để ướm thử lên sân khấu
      card.addEventListener("click", () => {
        if (!isConsumable) {
          previewEquipped[item.slot] = { id: item.id, name: item.name };
          previewingItem = item;
          speechBubble.textContent = tr`Ướm thử: "${item.name}"! Trông hợp không bạn?`;
          refreshPetStage();
          renderGrid();
          haptic(6);
        }
      });

      return card;
    }));
  }
  renderGrid();

  // Mua vật phẩm
  async function buyItem(item, btn) {
    if (coins < item.price_coins) {
      toast(tr`Bạn còn thiếu ${item.price_coins - coins} xu. Hãy tiếp tục ghi chép chi tiêu để nhận thêm nhé!`, "warn");
      haptic([20, 50, 20]);
      return;
    }
    const restore = busy(btn);
    try {
      const res = await api("/pet-shop/buy", { method: "POST", body: { item_id: item.id } });
      coins = res.coins;
      item.owned_quantity = (item.owned_quantity || 0) + 1;
      if (item.slot !== "consumable" && item.slot !== "utility") {
        serverEquipped[item.slot] = { id: item.id, name: item.name };
        previewEquipped[item.slot] = { id: item.id, name: item.name };
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

  // Mặc / Tháo
  async function toggleEquip(item, equip, btn) {
    const restore = busy(btn);
    try {
      await api("/pet-shop/equip", { method: "POST", body: { item_id: item.id, equip } });
      if (equip) {
        serverEquipped[item.slot] = { id: item.id, name: item.name };
        previewEquipped[item.slot] = { id: item.id, name: item.name };
        previewingItem = null;
        speechBubble.textContent = tr`Đã diện "${item.name}" lên người!`;
      } else {
        delete serverEquipped[item.slot];
        delete previewEquipped[item.slot];
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

  // Cho ăn / Dùng
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

  // Lịch sử xu
  async function openHistorySheet() {
    const listEl = h("div", { class: "stack", style: { gap: "8px", maxHeight: "360px", overflowY: "auto" } },
      h("p", { class: "faint" }, tr("Đang tải lịch sử...")));

    openSheet({
      title: tr("Lịch sử biến động xu"),
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

  container.append(header, stageCard, tabsRow, grid);
  return container;
}
