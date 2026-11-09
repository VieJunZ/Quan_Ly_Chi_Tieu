/**
 * @file groups.js
 * @description Giao diện Quỹ Nhóm / Chi Tiêu Chung (Phòng trọ, Du lịch, Nhóm bạn)
 */

import { tr } from "../i18n.js";
import { api, today } from "../api.js";
import {
  h, icon, money, moneyShort, dateLabel, haptic, toast, confetti, openSheet, confirmSheet,
  field, busy, parseMoneyInput
} from "../ui.js";

/** Avatar chữ cái có màu cố định */
function avatar(name, size = 40) {
  let hash = 0;
  for (const ch of (name || "?")) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  const hue = hash % 360;
  return h("span", {
    class: "tx-icon",
    style: {
      width: `${size}px`, height: `${size}px`, fontWeight: 800, fontSize: `${Math.round(size * 0.42)}px`,
      background: `linear-gradient(135deg, hsl(${hue} 90% 78%), hsl(${(hue + 40) % 360} 80% 62%))`
    }
  }, ((name || "?").trim()[0] || "?").toUpperCase());
}

/** Hộp thoại tạo nhóm mới */
export function openCreateGroup(ctx, onDone) {
  const nameField = field({ label: tr("Tên nhóm (ví dụ: Phòng 302, Đi Đà Lạt)"), name: "name", maxlength: 100 });
  const saveBtn = h("button", { class: "btn primary full", type: "button" }, icon("plus", 18), tr("Tạo nhóm ngay"));

  const sheet = openSheet({
    title: tr("Tạo Quỹ Nhóm Mới"),
    body: h("div", { class: "stack", style: { gap: "16px" } },
      nameField,
      h("p", { class: "faint small" }, tr("Sau khi tạo, app sẽ sinh mã mời 6 chữ số để bạn gửi cho bạn bè trong phòng cùng vào nhóm.")),
      saveBtn
    )
  });

  saveBtn.addEventListener("click", async () => {
    const name = nameField.input.value.trim();
    if (!name) {
      toast(tr("Vui lòng nhập tên nhóm."), "error");
      nameField.input.focus();
      return;
    }
    const restore = busy(saveBtn);
    try {
      const res = await api("/groups", { method: "POST", body: { name } });
      haptic([20, 50, 20]);
      confetti({ count: 80 });
      toast(tr`Đã tạo nhóm "${res.group.name}"! Mã mời: ${res.group.invite_code}`, "ok", 5000);
      sheet.close("created");
      if (onDone) onDone();
      else ctx.refresh();
    } catch (err) {
      toast(err.message, "error");
      restore();
    }
  });
}

/** Hộp thoại nhập mã tham gia nhóm */
export function openJoinGroup(ctx, onDone) {
  const codeField = field({ label: tr("Mã mời (6 chữ số/ký tự)"), name: "code", maxlength: 12, placeholder: "Ví dụ: KTX302" });
  codeField.input.style.textTransform = "uppercase";
  codeField.input.style.letterSpacing = "2px";
  codeField.input.style.fontWeight = "700";

  const joinBtn = h("button", { class: "btn primary full", type: "button" }, icon("user-plus", 18), tr("Tham gia nhóm"));

  const sheet = openSheet({
    title: tr("Tham Gia Nhóm Bằng Mã"),
    body: h("div", { class: "stack", style: { gap: "16px" } },
      codeField,
      h("p", { class: "faint small" }, tr("Hỏi bạn cùng phòng mã mời của nhóm và nhập vào đây để cùng quản lý chi tiêu.")),
      joinBtn
    )
  });

  joinBtn.addEventListener("click", async () => {
    const code = codeField.input.value.trim().toUpperCase();
    if (!code) {
      toast(tr("Vui lòng nhập mã mời."), "error");
      codeField.input.focus();
      return;
    }
    const restore = busy(joinBtn);
    try {
      const res = await api("/groups/join", { method: "POST", body: { invite_code: code } });
      haptic(30);
      confetti({ count: 60 });
      toast(res.message, "ok");
      sheet.close("joined");
      if (onDone) onDone();
      else ctx.refresh();
    } catch (err) {
      toast(err.message, "error");
      restore();
    }
  });
}

/** Hộp thoại thêm khoản chi tiêu nhóm */
function openAddGroupExpense(ctx, group, onDone) {
  const amountField = field({ label: tr("Số tiền"), name: "amount", inputmode: "decimal", placeholder: "Ví dụ: 150000" });
  const noteField = field({ label: tr("Nội dung chi (ví dụ: Tiền điện, Đi chợ, Nước)"), name: "note", maxlength: 200 });
  const catSelect = h("select", { class: "mini-input", "aria-label": tr("Danh mục") },
    [tr("Ăn uống"), tr("Điện nước"), tr("Đồ dùng phòng"), tr("Đi lại"), tr("Khác")].map((c) => h("option", { value: c }, c))
  );

  const saveBtn = h("button", { class: "btn primary full", type: "button" }, icon("check", 18), tr("Lưu khoản chi nhóm"));

  const sheet = openSheet({
    title: tr`Thêm chi tiêu: ${group.name}`,
    body: h("div", { class: "stack", style: { gap: "14px" } },
      amountField,
      noteField,
      h("label", { class: "stack", style: { gap: "6px" } },
        h("span", { class: "faint small" }, tr("Khoản mục")),
        catSelect
      ),
      saveBtn
    )
  });

  saveBtn.addEventListener("click", async () => {
    const val = parseMoneyInput(amountField.input.value);
    if (!val || val <= 0) {
      toast(tr("Số tiền không hợp lệ."), "error");
      amountField.input.focus();
      return;
    }
    const restore = busy(saveBtn);
    try {
      await api(`/groups/${group.id}/expenses`, {
        method: "POST",
        body: { amount: val, category_name: catSelect.value, note: noteField.input.value.trim() }
      });
      haptic(20);
      confetti({ count: 50 });
      toast(tr`Đã thêm khoản chi ${money(val)} vào nhóm!`, "ok");
      sheet.close("added");
      if (onDone) onDone();
    } catch (err) {
      toast(err.message, "error");
      restore();
    }
  });
}

/** Chi tiết nhóm chi tiêu */
export async function openGroupDetails(ctx, groupId) {
  let details;
  try {
    details = await api(`/groups/${groupId}`);
  } catch (err) {
    toast(err.message, "error");
    return;
  }

  const { group, my_role, total_spent, fair_share, members, expenses, settlements } = details;

  const content = h("div", { class: "stack", style: { gap: "16px" } });

  // 1. Header nhóm + Mã mời
  const codeBox = h("div", {
    class: "card row",
    style: { justifyContent: "space-between", alignItems: "center", background: "var(--grad-main)", color: "#fff" }
  },
    h("div", null,
      h("span", { style: { fontSize: "11px", opacity: 0.9, textTransform: "uppercase", letterSpacing: "1px" } }, tr("Mã mời nhóm")),
      h("div", { style: { fontSize: "22px", fontWeight: 900, letterSpacing: "3px" } }, group.invite_code)
    ),
    h("button", {
      class: "btn small",
      style: { background: "rgba(255,255,255,0.25)", color: "#fff", border: "none" },
      type: "button",
      onclick: () => {
        navigator.clipboard?.writeText(group.invite_code);
        toast(tr`Đã sao chép mã mời: ${group.invite_code}`, "ok");
      }
    }, icon("copy", 16), tr("Sao chép"))
  );
  content.append(codeBox);

  // 2. Thống kê tổng quan
  const statsCard = h("div", { class: "today-grid" },
    h("div", { class: "card center" },
      h("span", { class: "faint small" }, tr("Tổng chi cả phòng")),
      h("div", { class: "money-mid", style: { color: "var(--brand)" } }, money(total_spent))
    ),
    h("div", { class: "card center" },
      h("span", { class: "faint small" }, tr("Chia đều mỗi bạn")),
      h("div", { class: "money-mid" }, money(fair_share))
    )
  );
  content.append(statsCard);

  // 3. Bảng gợi ý chuyển khoản "Ai cần trả ai" (Smart Settlement)
  if (settlements && settlements.length > 0) {
    const settleCard = h("div", { class: "card", style: { border: "1px solid var(--border)" } },
      h("div", { class: "card-title", style: { color: "var(--brand)" } }, icon("arrow-left-right", 18), tr("Gợi ý chuyển khoản bù trừ")),
      h("div", { class: "tx-list", style: { gap: "8px" } },
        ...settlements.map((s) => h("div", { class: "tx", style: { padding: "8px 0" } },
          avatar(s.from_name, 32),
          h("div", { class: "tx-main" },
            h("strong", null, `${s.from_name} ➔ ${s.to_name}`),
            h("small", { class: "faint" }, tr("cần chuyển"))
          ),
          h("span", { class: "badge expense", style: { fontWeight: 700 } }, moneyShort(s.amount))
        ))
      )
    );
    content.append(settleCard);
  }

  // 4. Thành viên
  const memList = h("div", { class: "tx-list" },
    ...members.map((m) => h("div", { class: "tx" },
      avatar(m.full_name, 36),
      h("div", { class: "tx-main" },
        h("strong", null, m.full_name),
        h("small", { class: "faint" }, `@${m.username} · ID: #${m.user_id}${m.role === "owner" ? ` · ${tr("Trưởng nhóm")}` : ""}`)
      ),
      h("div", { style: { textAlign: "right" } },
        h("div", { style: { fontWeight: 700 } }, money(m.paid)),
        h("small", { class: "faint" }, tr("đã ứng trước"))
      )
    ))
  );
  content.append(h("div", { class: "card" },
    h("div", { class: "card-title" }, icon("users", 18), tr`Thành viên (${members.length})`),
    memList
  ));

  // 5. Khoản chi tiêu nhóm
  const expenseList = h("div", { class: "tx-list" });
  if (!expenses.length) {
    expenseList.append(h("p", { class: "faint center", style: { padding: "16px 0" } }, tr("Chưa có khoản chi nào trong nhóm.")));
  } else {
    for (const e of expenses) {
      expenseList.append(h("div", { class: "tx" },
        h("div", { class: "tx-icon", style: { background: "var(--glass-strong)" } }, icon("receipt", 18)),
        h("div", { class: "tx-main" },
          h("strong", null, e.note || e.category_name),
          h("small", { class: "faint" }, `${e.payer_name} trả · ${dateLabel(e.created_at.slice(0, 10), today())}`)
        ),
        h("strong", { class: "tx-amt expense" }, `-${money(e.amount)}`)
      ));
    }
  }

  const addExpBtn = h("button", { class: "btn small soft full", type: "button" }, icon("plus", 16), tr("Thêm khoản chi chung"));
  addExpBtn.addEventListener("click", () => {
    openAddGroupExpense(ctx, group, () => {
      sheet.close();
      openGroupDetails(ctx, groupId);
    });
  });

  content.append(h("div", { class: "card" },
    h("div", { class: "card-title" }, icon("receipt-text", 18), tr("Lịch sử chi tiêu nhóm")),
    addExpBtn,
    expenseList
  ));

  const sheet = openSheet({
    title: group.name,
    body: content
  });
}

/** Render danh sách Quỹ Nhóm trong màn hình Debts */
export function renderGroupsSection(ctx, groups) {
  const container = h("div", { class: "stack", style: { gap: "14px" } });

  // 2 nút thao tác
  const createBtn = h("button", { class: "btn primary", type: "button" }, icon("plus-circle", 18), tr("Tạo nhóm mới"));
  createBtn.addEventListener("click", () => openCreateGroup(ctx));

  const joinBtn = h("button", { class: "btn soft", type: "button" }, icon("user-plus", 18), tr("Nhập mã vào nhóm"));
  joinBtn.addEventListener("click", () => openJoinGroup(ctx));

  container.append(h("div", { class: "two-col" }, createBtn, joinBtn));

  // Danh sách các nhóm
  const listCard = h("section", { class: "card" },
    h("div", { class: "card-title" }, icon("users-round", 20), tr("Nhóm của bạn"))
  );

  if (!groups || !groups.length) {
    listCard.append(
      h("div", { class: "empty", style: { padding: "24px 12px" } },
        icon("users"),
        h("p", { style: { marginTop: "8px" } }, tr("Bạn chưa tham gia quỹ nhóm nào.")),
        h("small", { class: "faint" }, tr("Hãy tạo nhóm phòng trọ hoặc nhập mã mời của bạn bè để cùng quản lý chi tiêu!"))
      )
    );
  } else {
    const list = h("div", { class: "tx-list" });
    for (const g of groups) {
      const row = h("button", { class: "tx", type: "button" },
        h("div", { class: "tx-icon", style: { background: "var(--grad-main)", color: "#fff" } }, icon("users", 20)),
        h("div", { class: "tx-main" },
          h("strong", null, g.name),
          h("small", { class: "faint" }, tr`${g.member_count} thành viên · Mã: ${g.invite_code}`)
        ),
        h("div", { style: { textAlign: "right" } },
          h("div", { class: "tx-amt", style: { color: "var(--brand)", fontWeight: 700 } }, moneyShort(g.total_spent)),
          h("small", { class: "faint" }, tr("tổng chi"))
        )
      );
      row.addEventListener("click", () => openGroupDetails(ctx, g.id));
      list.append(row);
    }
    listCard.append(list);
  }

  container.append(listCard);
  return container;
}

