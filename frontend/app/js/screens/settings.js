/**
 * @file settings.js
 * @description Màn "Cài đặt" (nút bánh răng góc phải): tên hiển thị, giao diện (sáng/tối, màu chủ đạo,
 * cỡ chữ, thú cưng, rung), ngôn ngữ, danh mục thu chi, bảo mật, thiết bị đang đăng nhập, góp ý, đăng xuất.
 */

import { tr, lang, setLang } from "../i18n.js";
import { api, session, today } from "../api.js";
import {
  h, icon, dateLabel, haptic, toast, openSheet, confirmSheet, field, passwordField, busy, menuItem, displayName
} from "../ui.js";
import { getPref, setPref } from "../prefs.js";
import { newPasswordBlock, recoveryCodeCard } from "./auth.js";

/* ---------------------------------------------------------------------------
   Hồ sơ: tên hiển thị
   ------------------------------------------------------------------------ */
function openRename(ctx) {
  const user = ctx.user;
  const name = field({
    label: tr("Tên hiển thị"), name: "display_name", autocomplete: "nickname", maxlength: 40,
    value: user.display_name || "", hint: tr`Hiện ở lời chào trang chủ. Đăng nhập vẫn dùng @${user.username}.`
  });
  const save = h("button", { class: "btn block", type: "submit" }, icon("check", 18), tr("Lưu tên"));
  const form = h("form", { class: "stack", novalidate: true }, name.el, save);
  if (user.display_name) {
    form.append(h("button", { class: "btn ghost block", type: "button", onclick: () => submit("") }, tr("Bỏ tên, gọi theo tên đăng nhập")));
  }
  const sheet = openSheet({ title: tr("Đổi tên hiển thị"), content: form });
  requestAnimationFrame(() => name.input.focus());

  async function submit(value) {
    const restore = busy(save);
    try {
      const r = await api("/auth/profile", { method: "PUT", body: { display_name: value } });
      session.save({ user: { ...session.user, ...r.user } });
      haptic(15);
      toast(r.message, "ok");
      sheet.close("saved");
      ctx.refresh();
    } catch (error) {
      restore();
      name.setHint(error.message, "error");
      name.input.focus();
    }
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submit(name.input.value.trim());
  });
}

function profileCard(ctx) {
  const user = ctx.user;
  const shown = displayName(user);
  const edit = h("button", { class: "btn small soft", type: "button" }, icon("pencil", 16), tr("Đổi tên"));
  edit.addEventListener("click", () => (user.is_demo ? ctx.openUpgrade() : openRename(ctx)));
  return h("section", { class: "card profile-card" },
    h("span", { class: "avatar big", "aria-hidden": "true" }, user.is_demo ? icon("sparkles", 26) : (shown[0] || "?").toUpperCase()),
    h("div", { class: "grow" },
      h("strong", null, user.is_demo ? tr("Bạn đang dùng thử") : shown),
      h("small", null, user.is_demo ? tr("Tạo tài khoản để đặt tên riêng") : `@${user.username}`)),
    edit);
}

/* ---------------------------------------------------------------------------
   Giao diện
   ------------------------------------------------------------------------ */
const ACCENTS = [
  ["candy", tr("Kẹo ngọt")],
  ["ocean", tr("Biển xanh")],
  ["mint", tr("Bạc hà")],
  ["sunset", tr("Hoàng hôn")]
];

/** Nhóm nút chọn một trong nhiều, vẽ lại khi chọn. */
function choiceGroup(pref, options, { className = "segmented small", render } = {}) {
  const group = h("div", { class: className, role: "group" });
  const paint = () => {
    const current = getPref(pref);
    group.replaceChildren(...options.map(([value, label]) => {
      const btn = h("button", { type: "button", "aria-pressed": String(current === value), "aria-label": render ? label : null },
        render ? render(value, label) : label);
      btn.addEventListener("click", () => {
        setPref(pref, value);
        haptic(6);
        paint();
      });
      return btn;
    }));
  };
  paint();
  return group;
}

function toggleRow(pref, title, sub, onChange) {
  const box = h("input", { type: "checkbox", role: "switch" });
  box.checked = getPref(pref) === "on";
  box.addEventListener("change", () => {
    setPref(pref, box.checked ? "on" : "off");
    haptic(8);
    if (onChange) onChange(box.checked);
  });
  return h("label", { class: "switch setting-row" },
    h("span", { class: "grow" }, title, sub ? h("small", null, sub) : null), box);
}

function appearanceCard() {
  const label = (text) => h("div", { class: "setting-label" }, text);
  return h("section", { class: "card stack" },
    h("div", { class: "card-title", style: { marginBottom: 0 } }, icon("palette", 20), tr("Giao diện")),
    label(tr("Sáng / tối")),
    choiceGroup("theme", [["system", tr("Theo máy")], ["light", tr("Sáng")], ["dark", tr("Tối")]]),
    label(tr("Màu chủ đạo")),
    choiceGroup("accent", ACCENTS, {
      className: "swatches",
      render: (value, name) => [h("span", { class: `swatch accent-${value}` }), h("small", null, name)]
    }),
    label(tr("Cỡ chữ")),
    choiceGroup("font", [["sm", tr("Nhỏ")], ["md", tr("Vừa")], ["lg", tr("Lớn")]], {
      render: (value, name) => h("span", { class: `font-sample font-${value}` }, "Aa ", h("small", null, name))
    }),
    toggleRow("pet", tr("Thú cưng ở trang chủ"), tr("Tắt đi thì trang chủ gọn hơn, chuỗi ngày vẫn hiện ở lời chào")),
    toggleRow("haptics", tr("Rung khi chạm"), tr("Rung nhẹ khi bấm nút, ghi xong một khoản"), (on) => on && haptic(20)));
}

/* ---------------------------------------------------------------------------
   Thông báo & Cảnh báo
   ------------------------------------------------------------------------ */
function notificationsCard() {
  const trigger = () => window.dispatchEvent(new Event("sochi:data"));
  return h("section", { class: "card stack" },
    h("div", { class: "card-title", style: { marginBottom: 0 } }, icon("bell", 20), tr("Thông báo & Cảnh báo")),
    toggleRow("notif_budget", tr("Cảnh báo vượt ngân sách"), tr("Báo khi tiêu lố hạn mức hôm nay hoặc sắp chạm trần tháng"), trigger),
    toggleRow("notif_pet", tr("Nhắc nhở thú cưng"), tr("Báo khi thú cưng bị đói hoặc sắp sửa lên cấp"), trigger),
    toggleRow("notif_debts", tr("Nhắc sổ nợ & chia tiền"), tr("Báo khi có người nợ tiền hoặc bạn có khoản cần trả"), trigger),
    toggleRow("notif_streak", tr("Động viên chuỗi ngày"), tr("Báo cột mốc chuỗi ngày ghi chép liên tiếp"), trigger));
}

/* ---------------------------------------------------------------------------
   Ngôn ngữ
   ------------------------------------------------------------------------ */
function languageCard() {
  const group = h("div", { class: "segmented small", role: "group" },
    ...[["vi", "Tiếng Việt"], ["en", "English"]].map(([value, label]) =>
      h("button", {
        type: "button", "aria-pressed": String(lang === value), lang: value,
        onclick: () => {
          haptic(8);
          setLang(value);
        }
      }, label)));
  return h("section", { class: "card stack" },
    h("div", { class: "card-title", style: { marginBottom: 0 } }, icon("languages", 20), tr("Ngôn ngữ"),
      // Giữ chữ "Language" để người không đọc được tiếng Việt vẫn tìm ra chỗ đổi
      lang === "en" ? null : h("span", { class: "faint" }, " · Language")),
    group,
    h("p", { class: "faint mt-0" }, tr("Đổi ngôn ngữ sẽ tải lại app. Câu nói và tin nhắn ngân hàng vẫn đọc tiếng Việt.")));
}

/* ---------------------------------------------------------------------------
   Danh mục
   ------------------------------------------------------------------------ */
function categoriesCard(cats) {
  let sub = tr("Ẩn bớt, sắp xếp lại, thêm danh mục của riêng bạn");
  if (cats) {
    const count = (type) => cats.filter((c) => c.type === type && !c.is_hidden).length;
    const hidden = cats.filter((c) => c.is_hidden).length;
    sub = tr`${count("expense")} mục chi · ${count("income")} mục thu${hidden ? tr` · ${hidden} đang ẩn` : ""}`;
  }
  return h("section", { class: "card" },
    h("div", { class: "card-title" }, icon("shapes", 20), tr("Danh mục")),
    h("div", { class: "menu" }, menuItem("list-ordered", tr("Danh mục thu chi"), sub, null, { href: "#/categories" })));
}

/* ---------------------------------------------------------------------------
   Bảo mật
   ------------------------------------------------------------------------ */
function openChangePassword(ctx) {
  const current = passwordField({ label: tr("Mật khẩu hiện tại"), name: "current_password", autocomplete: "current-password", maxlength: 128 });
  const block = newPasswordBlock(() => ctx.user.username, { password: tr("Mật khẩu mới"), confirm: tr("Nhập lại mật khẩu mới") });
  const save = h("button", { class: "btn block", type: "submit" }, tr("Đổi mật khẩu"));
  const form = h("form", { class: "stack", novalidate: true }, current.el, block.el,
    h("p", { class: "faint mt-0" }, tr("Đổi xong, các thiết bị khác sẽ bị đăng xuất.")), save);
  const sheet = openSheet({ title: tr("Đổi mật khẩu"), content: form });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!current.input.value) {
      current.setHint(tr("Nhập mật khẩu hiện tại"), "error");
      current.input.focus();
      return;
    }
    if (!block.validate()) return;
    const restore = busy(save);
    try {
      const r = await api("/auth/change-password", {
        method: "POST",
        body: { current_password: current.input.value, new_password: block.pw.input.value, confirm_password: block.confirm.input.value }
      });
      haptic(15);
      toast(r.revoked_other_sessions ? tr`Đã đổi mật khẩu, đăng xuất ${r.revoked_other_sessions} thiết bị khác.` : tr("Đã đổi mật khẩu."), "ok", 4500);
      sheet.close("saved");
      ctx.refresh();
    } catch (error) {
      restore();
      const target = error.data.field === "current_password" ? current : error.data.field ? block.pw : null;
      const extra = error.data.attempts_left !== undefined ? tr` Còn ${error.data.attempts_left} lần thử.` : "";
      if (target) {
        target.setHint(error.message + extra, "error");
        target.input.focus();
      } else {
        toast(error.message, "error");
      }
    }
  });
}

function openNewRecoveryCode(ctx) {
  const pw = passwordField({ label: tr("Mật khẩu"), name: "password", autocomplete: "current-password", maxlength: 128 });
  const go = h("button", { class: "btn block", type: "submit" }, icon("key-round", 18), tr("Tạo mã mới"));
  const form = h("form", { class: "stack", novalidate: true },
    h("p", { class: "muted mt-0" }, tr("Mã cũ (nếu có) sẽ hết hiệu lực ngay. Nhập mật khẩu để xác nhận là bạn.")), pw.el, go);
  const sheet = openSheet({ title: tr("Mã khôi phục mới"), content: form });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!pw.input.value) {
      pw.setHint(tr("Nhập mật khẩu"), "error");
      return;
    }
    const restore = busy(go);
    try {
      const r = await api("/auth/recovery-code", { method: "POST", body: { password: pw.input.value } });
      haptic(15);
      sheet.setContent(recoveryCodeCard(r.recovery_code, () => {
        sheet.close("done");
        ctx.refresh();
      }, "Xong"));
    } catch (error) {
      restore();
      const extra = error.data.attempts_left !== undefined ? tr` Còn ${error.data.attempts_left} lần thử.` : "";
      pw.setHint(error.message + extra, "error");
      pw.input.focus();
    }
  });
}

function securityCard(ctx) {
  const user = ctx.user;
  return h("section", { class: "card" },
    h("div", { class: "card-title" }, icon("shield-check", 20), tr("Bảo mật")),
    h("div", { class: "menu" },
      menuItem("key-round", tr("Đổi mật khẩu"), tr("Các thiết bị khác sẽ bị đăng xuất"), () => openChangePassword(ctx)),
      menuItem("life-buoy", user.has_recovery_code ? tr("Tạo mã khôi phục mới") : tr("Tạo mã khôi phục"),
        user.has_recovery_code ? tr("Lỡ làm mất mã cũ? Tạo mã mới, mã cũ hết hạn") : tr("Chưa có mã! Quên mật khẩu sẽ không lấy lại được"),
        () => openNewRecoveryCode(ctx))));
}

/* ---------------------------------------------------------------------------
   Thiết bị đang đăng nhập
   ------------------------------------------------------------------------ */
function timeAgo(iso) {
  const diff = (Date.now() - Date.parse(iso)) / 60000;
  if (!Number.isFinite(diff)) return "";
  if (diff < 2) return tr("vừa xong");
  if (diff < 60) return tr`${Math.round(diff)} phút trước`;
  if (diff < 1440) return tr`${Math.round(diff / 60)} giờ trước`;
  return dateLabel(iso.slice(0, 10), today());
}

function sessionsCard(ctx, list) {
  const card = h("section", { class: "card" },
    h("div", { class: "card-title" }, icon("monitor-smartphone", 20), tr("Thiết bị đang đăng nhập"), h("span", { class: "badge" }, String(list.length))));
  const rows = h("div", { class: "tx-list" });
  for (const s of list) {
    const isPhone = /android|iphone|ipad|mobile/i.test(`${s.device} ${s.user_agent}`);
    const out = s.is_current
      ? h("span", { class: "badge ok" }, tr("Máy này"))
      : h("button", { class: "btn small soft", type: "button", "aria-label": tr`Đăng xuất ${s.device}` }, icon("log-out", 16), tr("Thoát"));
    if (!s.is_current) {
      out.addEventListener("click", async () => {
        const restore = busy(out);
        try {
          await api(`/auth/sessions/${s.id}`, { method: "DELETE" });
          toast(tr`Đã đăng xuất ${s.device}.`, "ok");
          ctx.refresh();
        } catch (error) {
          toast(error.message, "error");
          restore();
        }
      });
    }
    rows.append(h("div", { class: "tx" },
      h("span", { class: "tx-icon", style: { background: "var(--grad-main)" } }, icon(isPhone ? "smartphone" : "laptop", 20)),
      h("span", { class: "tx-main" },
        h("strong", null, s.device || tr("Thiết bị lạ")),
        h("small", null, tr`${s.ip_address || "?"} · hoạt động ${timeAgo(s.last_seen_at)}`)),
      out));
  }
  card.append(rows);
  if (list.length > 1) {
    const others = h("button", { class: "btn soft block mt-8", type: "button" }, icon("shield-check", 18), tr("Đăng xuất mọi thiết bị khác"));
    others.addEventListener("click", async () => {
      const ok = await confirmSheet({ title: tr("Đăng xuất thiết bị khác?"), message: tr("Chỉ giữ lại máy bạn đang cầm. Dùng khi lỡ đăng nhập ở máy bạn bè hay máy tính trường."), okText: tr("Đăng xuất hết") });
      if (!ok) return;
      try {
        const r = await api("/auth/sessions/revoke-others", { method: "POST" });
        toast(tr`Đã đăng xuất ${r.revoked} thiết bị.`, "ok");
        ctx.refresh();
      } catch (error) {
        toast(error.message, "error");
      }
    });
    card.append(others);
  }
  return card;
}

/* ---------------------------------------------------------------------------
   Màn hình
   ------------------------------------------------------------------------ */
export async function settingsScreen(ctx) {
  const user = ctx.user;
  const screen = h("main", { class: "screen stack" });
  const back = h("button", { class: "icon-btn", type: "button", "aria-label": tr("Quay lại"), onclick: () => (history.length > 1 ? history.back() : ctx.go("me")) }, icon("arrow-left"));
  screen.append(h("header", { class: "screen-head" }, back,
    h("div", { class: "grow" }, h("h1", null, tr("Cài đặt")), h("span", { class: "sub" }, tr("Giao diện, danh mục, tài khoản")))));

  const [cats, sessions] = await Promise.all([
    api("/categories", { query: { include_hidden: 1 } }).catch(() => null),
    api("/auth/sessions").catch(() => null)
  ]);

  screen.append(profileCard(ctx), appearanceCard(), notificationsCard(), languageCard(), categoriesCard(cats));
  if (!user.is_demo) screen.append(securityCard(ctx));
  if (sessions) screen.append(sessionsCard(ctx, sessions));

  // Góp ý: không phải chờ 1 ngày mới được hỏi, muốn nói lúc nào cũng được
  screen.append(h("section", { class: "card" },
    h("div", { class: "card-title" }, icon("message-circle-heart", 20), tr("Góp ý cho app")),
    h("div", { class: "menu" },
      menuItem("thumbs-up", tr("Khảo sát 1 phút"), user.is_demo ? tr("Tạo tài khoản để góp ý") : tr("Chạm Thích / Chưa thích từng chức năng, đề xuất chức năng mới"),
        () => import("../flows/survey.js").then((m) => m.openFeedback(ctx))),
      menuItem("chart-pie", tr("Mọi người nghĩ gì"), tr("Chức năng nào được thích nhất"),
        () => import("../flows/survey.js").then((m) => m.openSurveyResults())))));

  const logout = h("button", { class: "btn ghost block", type: "button" }, icon("log-out", 18), tr("Đăng xuất"));
  logout.addEventListener("click", async () => {
    if (user.is_demo) {
      const ok = await confirmSheet({ title: tr("Thoát bản dùng thử?"), message: tr("Thoát rồi sẽ không vào lại được dữ liệu dùng thử này nữa."), okText: tr("Thoát"), danger: true });
      if (!ok) return;
    }
    const restore = busy(logout);
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // Mất mạng vẫn cho thoát trên máy này
    }
    restore();
    session.clear();
    toast(tr("Đã đăng xuất. Hẹn gặp lại!"), "ok");
    ctx.go("welcome");
  });
  screen.append(logout,
    h("p", { class: "faint center" }, tr`Tham gia từ ${user.created_at ? dateLabel(user.created_at.slice(0, 10), today()) : tr("hôm nay")}`));
  return screen;
}
