/**
 * @file notifications.js
 * @description Trung tâm thông báo: quét dữ liệu nghiệp vụ (ngân sách, sổ nợ, thú cưng, chuỗi ngày)
 * và hiển thị widget chuông thông báo trên Header kèm bảng trượt xem chi tiết.
 */

import { tr } from "../i18n.js";
import { api, today, nowTime } from "../api.js";
import { h, icon, money, openSheet, haptic } from "../ui.js";
import { getPref } from "../prefs.js";

const READ_KEY = "sochi.notifs.read";
const DISMISSED_KEY = "sochi.notifs.dismissed";

function getStored(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function setStored(key, arr) {
  try {
    localStorage.setItem(key, JSON.stringify(arr.slice(-100)));
  } catch {}
}

export function isRead(id) {
  return getStored(READ_KEY).includes(id);
}

export function markAsRead(id) {
  const list = getStored(READ_KEY);
  if (!list.includes(id)) {
    list.push(id);
    setStored(READ_KEY, list);
  }
}

export function markAllAsRead(ids) {
  const list = getStored(READ_KEY);
  for (const id of ids) {
    if (!list.includes(id)) list.push(id);
  }
  setStored(READ_KEY, list);
}

export function isDismissed(id) {
  return getStored(DISMISSED_KEY).includes(id);
}

export function dismissNotification(id) {
  const list = getStored(DISMISSED_KEY);
  if (!list.includes(id)) {
    list.push(id);
    setStored(DISMISSED_KEY, list);
  }
}

/**
 * Quét dữ liệu và tổng hợp các thông báo thông minh
 */
export async function fetchNotifications() {
  const t = today();
  const now = nowTime();
  const items = [];

  try {
    const [mini, debts, challenges] = await Promise.all([
      api("/dashboard/mini", { query: { today: t, now } }).catch(() => null),
      api("/debts").catch(() => null),
      api("/challenges", { query: { today: t } }).catch(() => null)
    ]);

    // 1. Cảnh báo vượt ngân sách ngày
    if (getPref("notif_budget") !== "off" && mini?.budget) {
      const left = mini.budget.left_today || 0;
      const allowance = mini.budget.daily_allowance || 0;
      if (left < 0 || (allowance === 0 && (mini.spent_today || 0) > 0)) {
        items.push({
          id: `budget_over_${t}`,
          priority: 1,
          type: "danger",
          icon: "circle-alert",
          title: tr("Đã vượt hạn mức hôm nay"),
          desc: tr`Bạn đã chi lố ${money(Math.abs(left))}. Hãy dừng các khoản chi phát sinh nhé!`,
          link: "#/me?budget=1",
          actionText: tr("Xem ngân sách")
        });
      }

      // Cảnh báo ngân sách tháng > 80%
      if (mini.budget.amount > 0) {
        const pct = (mini.budget.spent_month / mini.budget.amount) * 100;
        if (pct >= 85) {
          items.push({
            id: `budget_month_over_${t.slice(0, 7)}`,
            priority: 2,
            type: "warn",
            icon: "triangle-alert",
            title: tr("Sắp chạm trần ngân sách tháng"),
            desc: tr`Đã tiêu ${Math.round(pct)}% ngân sách tháng (${money(mini.budget.spent_month)} / ${money(mini.budget.amount)}).`,
            link: "#/me?budget=1",
            actionText: tr("Kiểm tra")
          });
        }
      }
    }

    // 2. Cảnh báo thú cưng đói
    if (getPref("notif_pet") !== "off" && getPref("pet") !== "off" && mini?.pet) {
      const fullness = mini.pet.pet_fullness ?? 80;
      if (fullness < 45) {
        items.push({
          id: `pet_hungry_${t}`,
          priority: 2,
          type: "warn",
          icon: "heart-pulse",
          title: tr`Thú cưng đang đói bụng (${fullness}%)`,
          desc: tr("Bé cưng cần được ăn để giữ tâm trạng vui vẻ. Ghé shop mua đồ ăn nhé!"),
          link: "#/shop",
          actionText: tr("Ghé Cửa hàng")
        });
      }
      if (mini.pet.next_level_in === 1) {
        items.push({
          id: `pet_levelup_${mini.pet.level}_${t}`,
          priority: 4,
          type: "ok",
          icon: "star",
          title: tr("Sắp lên cấp mới!"),
          desc: tr`Chỉ cần thêm 1 ngày ghi chép nữa là thú cưng sẽ lên Cấp ${Number(mini.pet.level || 1) + 1}.`,
          link: "#/shop",
          actionText: tr("Xem thú cưng")
        });
      }
    }

    // 3. Sổ nợ
    if (getPref("notif_debts") !== "off" && debts) {
      if ((debts.owed_to_me || 0) > 0) {
        const count = (debts.open || []).filter((d) => d.direction === "owed_to_me").length;
        items.push({
          id: `debts_owed_${t}`,
          priority: 3,
          type: "info",
          icon: "hand-coins",
          title: tr("Có khoản nợ cần thu hồi"),
          desc: tr`Bạn đang có ${count || 1} khoản cho mượn chưa gạch sổ (tổng ${money(debts.owed_to_me)}).`,
          link: "#/debts",
          actionText: tr("Mở Sổ nợ")
        });
      }
      if ((debts.i_owe || 0) > 0) {
        const count = (debts.open || []).filter((d) => d.direction === "i_owe").length;
        items.push({
          id: `debts_i_owe_${t}`,
          priority: 2,
          type: "warn",
          icon: "handshake",
          title: tr("Bạn có khoản nợ cần trả"),
          desc: tr`Bạn đang nợ ${count || 1} khoản (tổng ${money(debts.i_owe)}). Nhớ trả đúng hẹn nha!`,
          link: "#/debts",
          actionText: tr("Xem nợ")
        });
      }
    }

    // 4. Chuỗi ngày streak
    if (getPref("notif_streak") !== "off" && mini?.streak?.current_streak >= 3) {
      items.push({
        id: `streak_milestone_${mini.streak.current_streak}`,
        priority: 4,
        type: "ok",
        icon: "flame",
        title: tr`Chuỗi ghi chép ${mini.streak.current_streak} ngày liền!`,
        desc: tr("Thói quen ghi chép tài chính rất tốt, hãy tiếp tục duy trì nhé!"),
        link: "#/home"
      });
    }

    // 5. Thử thách có nguy cơ vượt trần
    if (challenges?.running?.length) {
      for (const c of challenges.running) {
        const p = c.progress || {};
        if (p.target && (p.unit === "money" || p.unit === "count")) {
          const ratio = p.value / p.target;
          if (ratio >= 0.9 && ratio < 1) {
            items.push({
              id: `challenge_risk_${c.id}_${t}`,
              priority: 2,
              type: "warn",
              icon: "triangle-alert",
              title: tr("Thử thách sắp chạm trần!"),
              desc: tr`Thử thách "${c.title}" đã chạm ${Math.round(ratio * 100)}% hạn mức.`,
              link: "#/challenges",
              actionText: tr("Xem thử thách")
            });
            break;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Lỗi khi quét thông báo:", err);
  }

  // Lọc bỏ những thông báo người dùng đã chủ động ẩn (dismiss)
  const activeItems = items.filter((it) => !isDismissed(it.id));
  activeItems.sort((a, b) => (a.priority || 9) - (b.priority || 9));
  return activeItems;
}

/**
 * Mở bảng trượt danh sách thông báo
 */
export function openNotificationSheet(ctx, items = [], onUpdated) {
  haptic(10);

  // Đánh dấu tất cả thông báo hiện tại là đã xem
  markAllAsRead(items.map((it) => it.id));
  if (typeof onUpdated === "function") onUpdated();

  const container = h("div", { class: "stack notif-list" });

  let sheet;

  const renderContent = (currentList) => {
    container.replaceChildren();

    if (!currentList.length) {
      container.append(
        h("div", { class: "card empty notif-empty" },
          icon("sparkles", 32),
          h("strong", null, tr("Mọi thứ đều ổn định!")),
          h("p", { class: "faint" }, tr("Không có cảnh báo hay lời nhắc nào cần bạn xử lý."))
        )
      );
      return;
    }

    // Nút đánh dấu đã đọc hết
    const headRow = h("div", { class: "row between notif-actions-bar mb-8" },
      h("span", { class: "faint small" }, tr`Có ${currentList.length} thông báo`),
      h("button", {
        class: "btn small ghost",
        type: "button",
        onclick: () => {
          markAllAsRead(currentList.map((i) => i.id));
          haptic(8);
          if (typeof onUpdated === "function") onUpdated();
          renderContent(currentList);
        }
      }, icon("check-check", 14), tr("Đã xem hết"))
    );
    container.append(headRow);

    for (const item of currentList) {
      const read = isRead(item.id);
      const closeBtn = h("button", {
        class: "icon-btn notif-dismiss",
        type: "button",
        "aria-label": tr("Ẩn thông báo"),
        onclick: (e) => {
          e.stopPropagation();
          dismissNotification(item.id);
          haptic(8);
          const next = currentList.filter((it) => it.id !== item.id);
          renderContent(next);
          if (typeof onUpdated === "function") onUpdated();
        }
      }, icon("x", 14));

      const actionBtn = item.link ? h("a", {
        class: "btn small soft notif-cta",
        href: item.link,
        onclick: () => {
          markAsRead(item.id);
          if (sheet) sheet.close("action");
        }
      }, item.actionText || tr("Chi tiết"), icon("chevron-right", 13)) : null;

      const card = h("div", { class: `notif-card notif-${item.type} ${read ? "is-read" : ""}` },
        h("div", { class: "notif-icon-box" }, icon(item.icon, 20)),
        h("div", { class: "grow notif-body" },
          h("div", { class: "row between align-start" },
            h("strong", { class: "notif-title" }, item.title),
            closeBtn),
          h("p", { class: "notif-desc" }, item.desc),
          actionBtn)
      );

      container.append(card);
    }
  };

  renderContent(items);

  sheet = openSheet({
    title: tr("Thông báo & Cảnh báo"),
    content: container
  });
}

/**
 * Nút chuông thông báo trên Header kèm badge đếm số lượng chưa đọc
 */
export function notificationButton(ctx) {
  const btn = h("button", {
    class: "icon-btn notif-btn",
    type: "button",
    "aria-label": tr("Xem thông báo")
  }, icon("bell", 20));

  let cachedItems = [];

  const update = async () => {
    cachedItems = await fetchNotifications();
    const unreadCount = cachedItems.filter((it) => !isRead(it.id)).length;
    const badge = btn.querySelector(".notif-badge");

    if (unreadCount > 0) {
      if (!badge) {
        btn.append(h("span", { class: "notif-badge" }, unreadCount > 9 ? "9+" : String(unreadCount)));
      } else {
        badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
      }
      btn.classList.add("has-unread");
    } else {
      if (badge) badge.remove();
      btn.classList.remove("has-unread");
    }
  };

  btn.addEventListener("click", () => {
    openNotificationSheet(ctx, cachedItems, update);
  });

  // Tải dữ liệu lần đầu
  update();

  // Cập nhật khi có giao dịch mới phát sinh
  const onDataChange = () => update();
  window.addEventListener("sochi:data", onDataChange);

  btn.destroy = () => {
    window.removeEventListener("sochi:data", onDataChange);
  };

  return btn;
}
