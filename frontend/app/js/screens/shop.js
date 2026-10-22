/**
 * @file shop.js
 * @description Màn hình Tiệm đồ thú cưng (Pet Shop):
 * Mua phụ kiện bằng xu tích lũy, mặc/tháo phụ kiện, cho thú cưng ăn, xem lịch sử xu.
 */

import { tr } from "../i18n.js";
import { api } from "../api.js";
import { h, icon, haptic, toast, confetti, openSheet, busy } from "../ui.js";
import { renderPet, pokeLine } from "../pet.js";

const CATEGORIES = [
  ["all", tr("Tất cả")],
  ["head", tr("Mũ")],
  ["face", tr("Mặt/Kính")],
  ["emblem", tr("Trán")],
  ["held", tr("Cầm tay")],
  ["pedestal", tr("Bệ đứng")],
  ["skin", tr("Skin")],
  ["bg", tr("Nền")],
  ["consumable", tr("Đồ ăn")],
  ["utility", tr("Tiện ích")]
];

const RARITY_COLORS = {
  common: { bg: "rgba(100, 116, 139, 0.12)", color: "#64748b", label: tr("Phổ thông") },
  rare: { bg: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", label: tr("Hiếm") },
  epic: { bg: "rgba(168, 85, 247, 0.14)", color: "#a855f7", label: tr("Sử thi") },
  legendary: { bg: "rgba(234, 179, 8, 0.16)", color: "#ca8a04", label: tr("Huyền thoại") }
};

export async function shopScreen(ctx) {
  const container = h("div", { class: "screen screen--shop stack" });

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
  let equipped = { ...(petData.pet?.equipped || {}) };
  let activeTab = "all";

  // Header
  const backBtn = h("button", { class: "btn-icon", type: "button", "aria-label": tr("Quay lại") }, icon("arrow-left"));
  backBtn.addEventListener("click", () => ctx.go("home"));

  const coinPill = h("span", { class: "badge", style: { fontSize: "14px", fontWeight: "700", padding: "6px 12px", background: "rgba(250, 204, 21, 0.15)", color: "#b45309" } },
    "🪙 ", `${coins} xu`);

  const historyBtn = h("button", { class: "btn small soft", type: "button" }, icon("history", 14), tr("Lịch sử"));
  historyBtn.addEventListener("click", () => openHistorySheet());

  const header = h("header", { class: "row between items-center" },
    h("div", { class: "row items-center", style: { gap: "8px" } }, backBtn, h("h1", { style: { margin: 0, fontSize: "1.25rem" } }, tr("Tiệm đồ Thú cưng"))),
    h("div", { class: "row items-center", style: { gap: "8px" } }, coinPill, historyBtn));

  // Live Pet Stage
  const petStageHolder = h("div", { class: "hero-pet", style: { margin: "0 auto", cursor: "pointer" } });
  const bubble = h("div", { class: "bubble", style: { textAlign: "center", marginBottom: "8px" } }, tr("Bạn muốn sắm gì cho mình nào?"));
  const fullnessBarFill = h("div", { style: { height: "6px", borderRadius: "3px", background: "var(--primary, #8b5cf6)", width: `${fullness}%`, transition: "width 0.3s" } });
  const fullnessText = h("span", { class: "faint", style: { fontSize: "12px" } }, tr`Độ no: ${fullness}/100 🍖`);

  function refreshPetStage() {
    petStageHolder.replaceChildren(renderPet({
      mood: petData.pet?.mood || "happy",
      level: petData.pet?.level || 1,
      size: 136,
      equipped
    }));
    fullnessBarFill.style.width = `${Math.min(100, Math.max(0, fullness))}%`;
    fullnessText.textContent = tr`Độ no: ${fullness}/100 🍖`;
    coinPill.textContent = `🪙 ${coins} xu`;
  }
  refreshPetStage();

  petStageHolder.addEventListener("click", () => {
    const svg = petStageHolder.querySelector("svg");
    if (svg) {
      svg.classList.remove("poked");
      void svg.getBoundingClientRect();
      svg.classList.add("poked");
    }
    bubble.textContent = pokeLine(petData.pet?.mood || "happy");
    haptic([8, 30, 8]);
  });

  const stageCard = h("section", { class: "card stack items-center", style: { background: "var(--card-bg, #fff)", border: "1px solid var(--border)", textAlign: "center" } },
    bubble,
    petStageHolder,
    h("div", { style: { width: "100%", maxWidth: "200px", margin: "4px auto 0" } },
      h("div", { style: { background: "rgba(0,0,0,0.06)", borderRadius: "3px", overflow: "hidden" } }, fullnessBarFill),
      h("div", { style: { marginTop: "4px" } }, fullnessText)));

  // Category Tabs
  const tabsRow = h("div", { class: "row", style: { overflowX: "auto", paddingBottom: "4px", gap: "6px", scrollbarWidth: "none" } });
  function renderTabs() {
    tabsRow.replaceChildren(...CATEGORIES.map(([key, label]) => {
      const active = activeTab === key;
      const btn = h("button", {
        class: `btn small ${active ? "" : "soft"}`,
        type: "button",
        style: { borderRadius: "999px", whiteSpace: "nowrap", padding: "4px 12px" }
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

  // Grid
  const grid = h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px" } });

  function renderGrid() {
    const filtered = items.filter((item) => activeTab === "all" || item.slot === activeTab);
    grid.replaceChildren(...filtered.map((item) => {
      const rarity = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
      const isEquipped = item.slot && equipped[item.slot]?.id === item.id;
      const isOwned = item.owned_quantity > 0;
      const isConsumable = item.slot === "consumable" || item.slot === "utility";

      const actionBtn = h("button", { class: "btn small block", type: "button", style: { marginTop: "8px" } });

      if (isConsumable) {
        if (isOwned) {
          actionBtn.textContent = tr`Dùng (còn x${item.owned_quantity})`;
          actionBtn.classList.add("ok");
          actionBtn.addEventListener("click", () => useItem(item, actionBtn));
        } else {
          actionBtn.textContent = tr`Mua ${item.price_coins} xu`;
          actionBtn.addEventListener("click", () => buyItem(item, actionBtn));
        }
      } else {
        if (isEquipped) {
          actionBtn.textContent = tr("Đang mặc");
          actionBtn.classList.add("soft");
          actionBtn.style.color = "var(--ok, #10b981)";
          actionBtn.addEventListener("click", () => toggleEquip(item, false, actionBtn));
        } else if (isOwned) {
          actionBtn.textContent = tr("Mặc đồ");
          actionBtn.addEventListener("click", () => toggleEquip(item, true, actionBtn));
        } else {
          actionBtn.textContent = tr`Mua ${item.price_coins} xu`;
          actionBtn.addEventListener("click", () => buyItem(item, actionBtn));
        }
      }

      const itemCard = h("div", {
        class: "card stack",
        style: {
          padding: "12px",
          background: isEquipped ? "rgba(139, 92, 246, 0.05)" : "var(--card-bg, #fff)",
          border: isEquipped ? "1.5px solid var(--primary, #8b5cf6)" : "1px solid var(--border)",
          borderRadius: "12px",
          position: "relative",
          cursor: "pointer"
        }
      },
      h("div", { class: "row between items-center" },
        h("span", { class: "badge", style: { fontSize: "11px", background: rarity.bg, color: rarity.color, fontWeight: "600" } }, rarity.label),
        item.required_level > 1 ? h("span", { class: "faint", style: { fontSize: "11px" } }, `Lv.${item.required_level}`) : null),
      h("div", { style: { fontWeight: "700", fontSize: "14px", marginTop: "4px" } }, item.name),
      h("p", { class: "faint", style: { fontSize: "12px", margin: "2px 0 6px", minHeight: "32px", lineHeight: "1.3" } }, item.description),
      h("div", { class: "row items-center", style: { fontWeight: "700", color: "#b45309", fontSize: "13px" } }, "🪙 ", `${item.price_coins} xu`),
      actionBtn);

      // Nhấp vào thẻ để ướm thử lên thú cưng ngay lập tức
      itemCard.addEventListener("click", (e) => {
        if (e.target.tagName === "BUTTON") return;
        if (!isConsumable) {
          equipped[item.slot] = { id: item.id, name: item.name };
          refreshPetStage();
          bubble.textContent = tr`Ướm thử: "${item.name}"!`;
          haptic(5);
        }
      });

      return itemCard;
    }));
  }
  renderGrid();

  // Thao tác Mua
  async function buyItem(item, btn) {
    if (coins < item.price_coins) {
      toast(tr`Bạn còn thiếu ${item.price_coins - coins} xu. Hãy ghi chép chi tiêu để tích lũy thêm xu nhé!`, "error");
      haptic([20, 40, 20]);
      return;
    }
    const restore = busy(btn);
    try {
      const res = await api("/pet-shop/buy", { method: "POST", body: { item_id: item.id } });
      coins = res.coins;
      item.owned_quantity = (item.owned_quantity || 0) + 1;
      if (item.slot !== "consumable" && item.slot !== "utility") {
        equipped[item.slot] = { id: item.id, name: item.name };
      }
      refreshPetStage();
      renderGrid();
      haptic([10, 30, 10]);
      confetti({ count: 40 });
      toast(tr`Đã mua "${item.name}" thành công!`, "ok");
      bubble.textContent = tr`Cảm ơn bạn! Mình diện "${item.name}" trông ngầu không?`;
    } catch (err) {
      toast(err.message || tr("Mua vật phẩm thất bại."), "error");
    } finally {
      restore();
    }
  }

  // Thao tác Mặc / Tháo
  async function toggleEquip(item, equip, btn) {
    const restore = busy(btn);
    try {
      await api("/pet-shop/equip", { method: "POST", body: { item_id: item.id, equip } });
      if (equip) {
        equipped[item.slot] = { id: item.id, name: item.name };
        bubble.textContent = tr`Đã diện "${item.name}" rồi nè!`;
      } else {
        delete equipped[item.slot];
        bubble.textContent = tr`Đã tháo "${item.name}".`;
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

  // Thao tác Dùng đồ ăn / Tiện ích
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
      bubble.textContent = tr("Măm măm, no nê rồi! Cảm ơn bạn nhiều nha!");
    } catch (err) {
      toast(err.message || tr("Không dùng được vật phẩm."), "error");
    } finally {
      restore();
    }
  }

  // Bảng Lịch sử xu
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
        listEl.replaceChildren(h("p", { class: "faint", style: { textAlign: "center", padding: "16px 0" } }, tr("Chưa có giao dịch xu nào.")));
        return;
      }
      listEl.replaceChildren(...list.map((tx) => {
        const isPlus = tx.amount > 0;
        return h("div", { class: "row between items-center card", style: { padding: "8px 12px", border: "1px solid var(--border)" } },
          h("div", { class: "stack", style: { gap: "2px" } },
            h("span", { style: { fontWeight: "600", fontSize: "14px" } }, tx.reason),
            h("span", { class: "faint", style: { fontSize: "11px" } }, tx.created_at)),
          h("div", { style: { fontWeight: "700", color: isPlus ? "var(--income, #10b981)" : "#ef4444" } },
            isPlus ? `+${tx.amount}` : `${tx.amount}`, " xu"));
      }));
    } catch {
      listEl.replaceChildren(h("p", { class: "faint" }, tr("Không thể tải lịch sử xu.")));
    }
  }

  container.append(header, stageCard, tabsRow, grid);
  return container;
}
