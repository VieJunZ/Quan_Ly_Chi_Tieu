/**
 * @file debts.js
 * @description Sổ nợ và chia tiền nhóm: ai nợ mình, mình nợ ai, đánh dấu đã trả,
 * soạn sẵn tin "nhắc khéo" để gửi bạn bè, chia hóa đơn đều cho cả nhóm.
 */

import { tr } from "../i18n.js";
import { api, today, nowTime } from "../api.js";
import {
  h, icon, money, moneyShort, dateLabel, haptic, toast, confetti, openSheet, confirmSheet,
  field, busy, parseMoneyInput, settingsButton
} from "../ui.js";
import { notificationButton } from "../flows/notifications.js";
import { renderGroupsSection } from "./groups.js";

/** Tên -> màu avatar cố định để dễ nhận ra từng người. */
function avatar(name, size = 42) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  const hue = hash % 360;
  return h("span", {
    class: "tx-icon",
    style: {
      width: `${size}px`, height: `${size}px`, fontWeight: 800, fontSize: `${Math.round(size * 0.42)}px`,
      background: `linear-gradient(135deg, hsl(${hue} 90% 78%), hsl(${(hue + 40) % 360} 80% 62%))`
    }
  }, (name.trim()[0] || "?").toUpperCase());
}

function directionText(direction) {
  return direction === "owed_to_me" ? tr("Cho mượn") : tr("Mượn");
}

/** Khoản từ chia tiền thì ghi "Chia tiền" cho đỡ khó hiểu. */
function debtKind(d) {
  if (!d.split_id) return directionText(d.direction);
  return d.direction === "owed_to_me" ? tr("Chia tiền, bạn trả trước") : tr("Chia tiền, bạn ấy trả trước");
}

/* ---------------------------------------------------------------------------
   Nhắc khéo: soạn sẵn tin nhắn đòi nợ, người dùng tự gửi
   ------------------------------------------------------------------------ */
function reminderTexts(name, items) {
  const total = items.reduce((s, d) => s + d.amount, 0);
  const reasons = [...new Set(items.map((d) => d.note).filter(Boolean))];
  const what = reasons.length ? ` (${reasons.slice(0, 3).join(", ")})` : "";
  return [
    { key: "soft", label: tr("Nhẹ nhàng"), text: tr`${name} ơi, lúc nào tiện thì gửi mình ${money(total)}${what} nha. Không gấp đâu, cảm ơn nhiều!` },
    { key: "fun", label: tr("Hài hước"), text: tr`Ting ting! Ví của mình đang nhớ ${money(total)}${what} ở chỗ ${name} lắm rồi 🥺 Cho nó về nhà nhé!` },
    { key: "clear", label: tr("Rõ ràng"), text: tr`Chào ${name}, mình nhắc khoản ${money(total)}${what}. ${name} chuyển giúp mình trong tuần này nhé. Cảm ơn!` }
  ];
}

function openReminder(name, items) {
  const options = reminderTexts(name, items);
  let current = options[0];
  const text = h("textarea", { class: "mini-input", rows: 4, style: { minHeight: "110px", padding: "10px 12px", resize: "vertical" }, "aria-label": tr("Nội dung tin nhắn") });
  text.value = current.text;
  const tabs = h("div", { class: "segmented small" });
  const paint = () => tabs.replaceChildren(...options.map((o) => {
    const b = h("button", { type: "button", "aria-pressed": String(o === current) }, o.label);
    b.addEventListener("click", () => {
      current = o;
      text.value = o.text;
      paint();
    });
    return b;
  }));
  paint();

  const copy = h("button", { class: "btn soft block", type: "button" }, icon("copy", 18), tr("Sao chép"));
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text.value);
      haptic(10);
      toast(tr("Đã chép, dán vào Messenger/Zalo là xong."), "ok");
    } catch {
      text.select();
      toast(tr("Không chép tự động được, bạn bôi đen rồi chép nhé."), "error");
    }
  });
  const share = navigator.share ? h("button", { class: "btn block", type: "button" }, icon("send", 18), tr("Gửi qua ứng dụng khác")) : null;
  if (share) {
    share.addEventListener("click", () => navigator.share({ text: text.value }).catch(() => {}));
  }
  openSheet({
    title: tr`Nhắc khéo ${name}`,
    content: h("div", { class: "stack" },
      h("p", { class: "muted mt-0" }, tr("Ngại đòi tiền? Chọn giọng điệu, sửa nếu muốn rồi tự gửi cho bạn mình.")),
      tabs, text, share, copy)
  });
}

/* ---------------------------------------------------------------------------
   Chi tiết một người
   ------------------------------------------------------------------------ */
function openPerson(ctx, person, items) {
  const net = person.net_amount;
  const theyOwe = net > 0;
  const sheet = openSheet({ title: person.person_name });
  const list = h("div", { class: "tx-list" });
  for (const d of items) {
    const settle = h("button", { class: "btn small soft", type: "button", "aria-label": tr("Đánh dấu đã trả") }, icon("check", 16), tr("Đã trả"));
    settle.addEventListener("click", async () => {
      const restore = busy(settle);
      try {
        await api(`/debts/${d.id}/settle`, { method: "POST" });
        haptic(15);
        toast(tr`Xong khoản ${money(d.amount)} với ${d.person_name}.`, "ok");
        sheet.close("done");
        ctx.refresh();
      } catch (error) {
        toast(error.message, "error");
        restore();
      }
    });
    const remove = h("button", { class: "icon-btn", type: "button", "aria-label": tr("Xóa khoản ghi nhầm") }, icon("trash-2", 18));
    remove.addEventListener("click", async () => {
      if (d.split_id) {
        toast(tr("Khoản này từ một lần chia tiền, xóa cả lần chia ở mục \"Chia tiền gần đây\"."), "info", 5000);
        return;
      }
      const ok = await confirmSheet({ title: tr("Xóa khoản nợ này?"), message: `${directionText(d.direction)} ${money(d.amount)}${d.note ? ` · ${d.note}` : ""}`, okText: tr("Xóa"), danger: true });
      if (!ok) return;
      try {
        await api(`/debts/${d.id}`, { method: "DELETE" });
        toast(tr("Đã xóa."), "ok");
        sheet.close("done");
        ctx.refresh();
      } catch (error) {
        toast(error.message, "error");
      }
    });
    list.append(h("div", { class: "tx" },
      h("span", { class: "tx-icon", style: { background: d.direction === "owed_to_me" ? "var(--grad-mint)" : "linear-gradient(135deg,#ff9ac1,#ff6b95)" } },
        icon(d.direction === "owed_to_me" ? "arrow-up-right" : "arrow-down-left", 20)),
      h("span", { class: "tx-main" },
        h("strong", null, d.note || directionText(d.direction)),
        h("small", null, `${debtKind(d)} · ${dateLabel(d.created_at.slice(0, 10), today())}`)),
      h("span", { class: "stack", style: { gap: "4px", justifyItems: "end" } },
        h("strong", { class: `tx-amt ${d.direction === "owed_to_me" ? "income" : "expense"}`, style: { fontSize: "15px" } }, money(d.amount)),
        h("span", { class: "row", style: { gap: "4px" } }, settle, remove))));
  }

  const all = h("button", { class: "btn block", type: "button" }, icon("handshake", 18),
    theyOwe ? tr`${person.person_name} đã trả hết ${money(net)}` : net < 0 ? tr`Mình đã trả hết ${money(-net)}` : tr("Đánh dấu xong hết"));
  all.addEventListener("click", async () => {
    const restore = busy(all);
    try {
      await api("/debts/settle-person", { method: "POST", body: { person_name: person.person_name } });
      haptic([10, 40, 10]);
      confetti({ count: 90 });
      toast(tr`Sạch nợ với ${person.person_name}!`, "ok");
      sheet.close("done");
      ctx.refresh();
    } catch (error) {
      toast(error.message, "error");
      restore();
    }
  });
  const remind = theyOwe ? h("button", { class: "btn soft block", type: "button" }, icon("message-circle-heart", 18), tr("Nhắc khéo")) : null;
  if (remind) remind.addEventListener("click", () => openReminder(person.person_name, items.filter((d) => d.direction === "owed_to_me")));

  sheet.setContent(h("div", { class: "stack" },
    h("div", { class: "row" }, avatar(person.person_name, 54),
      h("div", { class: "grow" },
        h("div", { class: "faint" }, theyOwe ? tr("Đang nợ bạn") : net < 0 ? tr("Bạn đang nợ") : tr("Hai bên huề")),
        h("div", { class: "money-mid", style: { color: theyOwe ? "var(--income)" : net < 0 ? "var(--expense)" : "inherit" } }, money(Math.abs(net))))),
    list, remind, all));
}

/* ---------------------------------------------------------------------------
   Gõ tên có gợi ý tên đã từng ghi
   ------------------------------------------------------------------------ */
function nameSuggestions(known, onPick, exclude = () => false) {
  const chips = h("div", { class: "chips" });
  const paint = () => chips.replaceChildren(...known.filter((n) => !exclude(n)).slice(0, 8).map((n) => {
    const chip = h("button", { class: "chip", type: "button" }, icon("user-plus", 14), n);
    chip.addEventListener("click", () => {
      onPick(n);
      paint();
    });
    return chip;
  }));
  paint();
  return Object.assign(chips, { paint });
}

/* ---------------------------------------------------------------------------
   Ghi nợ tay
   ------------------------------------------------------------------------ */
async function openNewDebt(ctx, known, preselectedFriend = null) {
  let direction = "owed_to_me";
  let hasAppAccount = Boolean(preselectedFriend);
  let selectedLinkedUserId = preselectedFriend ? preselectedFriend.id : null;
  let friendsList = [];

  try {
    const fRes = await api("/friends");
    friendsList = fRes.friends || [];
  } catch {}

  const seg = h("div", { class: "segmented" });
  const paintSeg = () => seg.replaceChildren(
    ...[["owed_to_me", tr("Mình cho mượn"), "income"], ["i_owe", tr("Mình đi mượn"), "expense"]].map(([value, label, cls]) => {
      const b = h("button", { type: "button", class: cls, "aria-pressed": String(direction === value) }, label);
      b.addEventListener("click", () => {
        direction = value;
        paintSeg();
      });
      return b;
    }));
  paintSeg();

  // Chuyển đổi giữa [Ghi tự do (không dùng app)] và [Có tài khoản Thu Chi]
  const modeSeg = h("div", { class: "segmented small", style: { margin: "4px 0 10px 0" } });
  const name = field({
    label: hasAppAccount ? tr("Tên đăng nhập (@username) hoặc User ID (#2)") : tr("Tên người nợ / cho nợ"),
    name: "person_name",
    maxlength: 50,
    autocomplete: "off",
    value: preselectedFriend ? (preselectedFriend.name || preselectedFriend.username) : "",
    placeholder: hasAppAccount ? tr("Ví dụ: 2, #2 hoặc @VieJunZ") : tr("Ví dụ: Bác tổ trưởng, Cô bán nước, Nam..."),
    hint: hasAppAccount ? tr("Khoản nợ sẽ tự động đồng bộ sang tài khoản người này") : tr("Chỉ ghi vào sổ cá nhân của bạn, không liên kết tài khoản")
  });

  const friendChipsBox = h("div", { class: "chips", style: { marginBottom: "6px" } });
  const userResults = h("div", { class: "chips", style: { marginTop: "4px" } });
  let searchTimer = null;

  const renderFriendChips = () => {
    if (!hasAppAccount || friendsList.length === 0) {
      friendChipsBox.replaceChildren();
      return;
    }
    friendChipsBox.replaceChildren(
      h("small", { class: "faint full", style: { width: "100%", fontSize: "11px" } }, tr("Chọn nhanh bạn bè đã kết bạn:")),
      ...friendsList.map((f) => {
        const isSel = selectedLinkedUserId === f.id;
        const chip = h("button", {
          class: "chip",
          type: "button",
          "aria-pressed": String(isSel),
          style: isSel ? { background: "var(--grad-main)", color: "#fff", fontWeight: 700 } : {}
        }, icon("user-check", 13), `[ID: #${f.id}] @${f.username}`);
        chip.addEventListener("click", () => {
          name.input.value = f.name || f.username;
          selectedLinkedUserId = f.id;
          renderFriendChips();
          userResults.replaceChildren(
            h("span", { class: "badge ok", style: { margin: "4px 0" } }, icon("check", 12), tr`Đã liên kết bạn bè: [ID: #${f.id}] @${f.username}`)
          );
          amount.input.focus();
        });
        return chip;
      })
    );
  };

  const setAccountMode = (isAccount) => {
    hasAppAccount = isAccount;
    paintModeSeg();
    name.label.textContent = hasAppAccount ? tr("Tên đăng nhập (@username) hoặc User ID (#2)") : tr("Tên người nợ / cho nợ");
    name.input.placeholder = hasAppAccount ? tr("Ví dụ: 2, #2 hoặc @VieJunZ") : tr("Ví dụ: Bác tổ trưởng, Cô bán nước, Nam...");
    name.setHint(hasAppAccount ? tr("Khoản nợ sẽ tự động đồng bộ sang tài khoản người này") : tr("Chỉ ghi vào sổ cá nhân của bạn, không liên kết tài khoản"));
    if (!hasAppAccount) {
      selectedLinkedUserId = null;
      userResults.replaceChildren();
      suggest.el.hidden = false;
    } else {
      suggest.el.hidden = true;
    }
    renderFriendChips();
  };

  const paintModeSeg = () => {
    modeSeg.replaceChildren(
      h("button", {
        type: "button",
        "aria-pressed": String(!hasAppAccount),
        onclick: () => setAccountMode(false)
      }, icon("user", 14), tr("Không dùng app (ghi tự do)")),
      h("button", {
        type: "button",
        "aria-pressed": String(hasAppAccount),
        onclick: () => setAccountMode(true)
      }, icon("user-check", 14), tr("Có tài khoản Thu Chi"))
    );
  };
  paintModeSeg();
  renderFriendChips();

  if (preselectedFriend) {
    userResults.replaceChildren(
      h("span", { class: "badge ok", style: { margin: "4px 0" } }, icon("check", 12), tr`Đã liên kết bạn bè: [ID: #${preselectedFriend.id}] @${preselectedFriend.username}`)
    );
  }

  name.input.addEventListener("input", () => {
    if (!hasAppAccount) return;
    selectedLinkedUserId = null;
    clearTimeout(searchTimer);
    const query = name.input.value.trim().replace(/^[@#]/, "");
    if (query.length < 1) {
      userResults.replaceChildren();
      return;
    }
    searchTimer = setTimeout(async () => {
      try {
        const res = await api("/debts/search-user", { query: { q: query } });
        if (res.users && res.users.length) {
          userResults.replaceChildren(
            h("small", { class: "faint full", style: { width: "100%", fontSize: "11px" } }, tr("Kết quả tìm kiếm tài khoản hệ thống:")),
            ...res.users.map((u) => {
              const isFriend = friendsList.some((f) => f.id === u.id);
              const chip = h("button", {
                class: "chip",
                type: "button",
                style: { background: "var(--grad-main)", color: "#fff", fontWeight: 700 }
              }, icon("user-check", 14), `[ID: #${u.id}] @${u.username}${u.full_name && u.full_name !== u.username ? ` (${u.full_name})` : ""}`);

              chip.addEventListener("click", () => {
                name.input.value = u.full_name || u.username;
                selectedLinkedUserId = u.id;
                renderFriendChips();

                // Nếu chưa là bạn bè, gợi ý nút kết bạn ngay bên cạnh badge
                const friendAction = !isFriend ? h("button", {
                  class: "btn small soft",
                  type: "button",
                  style: { marginLeft: "8px", padding: "2px 8px", fontSize: "11px" },
                  onclick: async (ev) => {
                    ev.stopPropagation();
                    try {
                      await api("/friends", { method: "POST", body: { friend_id: u.id } });
                      friendsList.push({ id: u.id, username: u.username, name: u.full_name || u.username });
                      toast(tr`Đã kết bạn với @${u.username}!`, "ok");
                      friendAction.remove();
                      renderFriendChips();
                    } catch (e) {
                      toast(e.message, "error");
                    }
                  }
                }, icon("user-plus", 12), tr("Kết bạn")) : null;

                userResults.replaceChildren(
                  h("span", { class: "badge ok", style: { margin: "4px 0", display: "inline-flex", alignItems: "center" } },
                    icon("check", 12),
                    tr`Đã liên kết với [ID: #${u.id}] @${u.username}`,
                    friendAction
                  )
                );
                amount.input.focus();
              });
              return chip;
            })
          );
        } else {
          userResults.replaceChildren();
        }
      } catch {
        userResults.replaceChildren();
      }
    }, 250);
  });

  const amount = field({ label: tr("Số tiền"), name: "amount", inputmode: "decimal", autocomplete: "off", hint: tr("Gõ 50k, 1tr2... đều được") });
  const note = field({ label: tr("Lý do (không bắt buộc)"), name: "note", maxlength: 200 });
  const suggest = nameSuggestions(known, (n) => {
    name.input.value = n;
    selectedLinkedUserId = null;
    amount.input.focus();
  });
  if (hasAppAccount) suggest.el.hidden = true;

  amount.input.addEventListener("input", () => {
    const v = parseMoneyInput(amount.input.value);
    amount.setHint(amount.input.value ? (v ? `= ${money(v)}` : tr("Số tiền chưa đúng")) : tr("Gõ 50k, 1tr2... đều được"), amount.input.value && !v ? "error" : "");
  });
  const save = h("button", { class: "btn block", type: "submit" }, icon("check", 18), tr("Ghi vào sổ"));
  const form = h("form", { class: "stack", novalidate: true }, seg, modeSeg, name.el, friendChipsBox, userResults, suggest.el, amount.el, note.el, save);
  const sheet = openSheet({ title: tr("Ghi nợ"), content: form });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = parseMoneyInput(amount.input.value);
    if (!name.input.value.trim()) {
      name.setHint(tr("Nhập tên người nhé"), "error");
      name.input.focus();
      return;
    }
    if (!value) {
      amount.setHint(tr("Nhập số tiền"), "error");
      amount.input.focus();
      return;
    }
    const restore = busy(save);
    try {
      await api("/debts", {
        method: "POST",
        body: {
          person_name: name.input.value,
          direction,
          amount: value,
          note: note.input.value,
          linked_user_id: selectedLinkedUserId
        }
      });
      haptic(15);
      toast(direction === "owed_to_me"
        ? tr`Đã ghi: ${name.input.value.trim()} nợ bạn ${money(value)}.`
        : tr`Đã ghi: bạn nợ ${name.input.value.trim()} ${money(value)}.`, "ok");
      sheet.close("saved");
      ctx.refresh();
    } catch (error) {
      toast(error.message, "error");
      restore();
    }
  });
}

/* ---------------------------------------------------------------------------
   Chia tiền nhóm
   ------------------------------------------------------------------------ */
async function openSplit(ctx, known) {
  let cats;
  try {
    cats = (await api("/categories")).filter((c) => c.type === "expense");
  } catch (error) {
    toast(error.message, "error");
    return;
  }
  const people = [];
  let iPaid = true;
  let payer = "";

  let friendsList = [];
  try {
    const fRes = await api("/friends");
    friendsList = fRes.friends || [];
  } catch {}

  const title = field({ label: tr("Đi gì thế? (lẩu, trà sữa...)"), name: "title", maxlength: 200 });
  const amount = field({ label: tr("Tổng hóa đơn"), name: "amount", inputmode: "decimal", autocomplete: "off" });
  const nameInput = h("input", { class: "mini-input", placeholder: tr("Gõ tên rồi Enter"), maxlength: 50, "aria-label": tr("Thêm người cùng chia") });
  const addBtn = h("button", { class: "btn small soft", type: "button" }, icon("user-plus", 16), tr("Thêm"));
  const peopleChips = h("div", { class: "chips" });
  const suggest = nameSuggestions(known, (n) => addPerson(n), (n) => people.includes(n));
  const friendSuggest = h("div", { class: "chips", style: { margin: "4px 0" } });
  const payerBox = h("div", { class: "stack", style: { gap: "8px" } });
  const preview = h("div", { class: "card tight center", style: { background: "var(--glass-strong)" } });
  const category = h("select", { class: "mini-input", "aria-label": tr("Danh mục") },
    cats.map((c) => h("option", { value: c.id, selected: c.name === tr("Ăn uống") }, c.name)));
  const date = field({ label: tr("Ngày"), name: "date", type: "date", value: today() });
  const time = field({ label: tr("Giờ"), name: "time", type: "time", value: nowTime() });

  function addPerson(raw) {
    const n = String(raw || "").trim().replace(/\s+/g, " ").slice(0, 50);
    if (!n) return;
    if (people.includes(n)) {
      toast(tr`${n} có trong danh sách rồi.`, "info");
      return;
    }
    if (people.length >= 49) {
      toast(tr("Chia tối đa 50 người."), "error");
      return;
    }
    people.push(n);
    nameInput.value = "";
    paint();
  }
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addPerson(nameInput.value);
    }
  });
  nameInput.addEventListener("paste", (e) => {
    // Dán cả danh sách "Nam, Hùng, Lan"
    const text = e.clipboardData && e.clipboardData.getData("text");
    if (text && /[,\n;]/.test(text)) {
      e.preventDefault();
      text.split(/[,\n;]+/).forEach(addPerson);
    }
  });
  addBtn.addEventListener("click", () => addPerson(nameInput.value));
  amount.input.addEventListener("input", paint);

  function paint() {
    peopleChips.replaceChildren(
      h("span", { class: "chip", "aria-pressed": "true" }, icon("user-round", 14), tr("Mình")),
      ...people.map((n) => {
        const chip = h("button", { class: "chip", type: "button", "aria-label": tr`Bỏ ${n}` }, n, icon("x", 14));
        chip.addEventListener("click", () => {
          people.splice(people.indexOf(n), 1);
          if (payer === n) payer = "";
          paint();
        });
        return chip;
      }));
    if (friendsList.length > 0) {
      friendSuggest.replaceChildren(
        h("small", { class: "faint full", style: { width: "100%", fontSize: "11px" } }, tr("Chọn nhanh từ bạn bè:")),
        ...friendsList.map((f) => {
          const isAdded = people.includes(f.name || f.username);
          const chip = h("button", {
            class: "chip",
            type: "button",
            "aria-pressed": String(isAdded),
            style: isAdded ? { opacity: 0.5 } : {},
            onclick: () => addPerson(f.name || f.username)
          }, icon(isAdded ? "check" : "user-plus", 12), f.name || `@${f.username}`);
          return chip;
        })
      );
    }
    suggest.paint();

    payerBox.replaceChildren(
      h("label", { class: "switch" },
        h("input", { type: "checkbox", checked: iPaid, onchange: (e) => { iPaid = e.target.checked; paint(); } }),
        h("span", null, tr("Mình là người trả tiền"))));
    if (!iPaid && people.length) {
      if (!people.includes(payer)) payer = people[0];
      const select = h("select", { class: "mini-input", "aria-label": tr("Ai trả tiền") },
        people.map((n) => h("option", { value: n, selected: n === payer }, tr`${n} trả`)));
      select.addEventListener("change", () => {
        payer = select.value;
        paint();
      });
      payerBox.append(select);
    }

    const total = parseMoneyInput(amount.input.value);
    const count = people.length + 1;
    if (!total || !people.length) {
      preview.replaceChildren(h("span", { class: "faint" }, tr("Nhập tổng tiền và thêm người để xem mỗi người trả bao nhiêu.")));
      return;
    }
    const share = Math.floor(total / count);
    const mine = total - share * people.length;
    preview.replaceChildren(
      h("div", { class: "faint" }, tr`Chia đều ${count} người`),
      h("div", { class: "money-mid" }, tr`${money(share)}/người`),
      h("div", { class: "faint mt-8" }, iPaid
        ? tr`${people.length} người sẽ nợ bạn tổng ${money(share * people.length)}. Phần của bạn ${money(mine)} được ghi vào chi tiêu.`
        : tr`Bạn nợ ${payer} ${money(mine)}. Phần của bạn được ghi vào chi tiêu.`));
  }
  paint();

  const save = h("button", { class: "btn block", type: "submit" }, icon("users", 18), tr("Chia và ghi sổ"));
  const form = h("form", { class: "stack", novalidate: true },
    title.el, amount.el,
    h("p", { class: "faint mt-0" }, tr("Ai đi cùng?")),
    h("div", { class: "row" }, h("div", { class: "grow" }, nameInput), addBtn),
    peopleChips, friendSuggest, suggest, payerBox, preview,
    category, h("div", { class: "two-col" }, date.el, time.el),
    save);
  const sheet = openSheet({ title: tr("Chia tiền nhóm"), content: form });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (nameInput.value.trim()) addPerson(nameInput.value);
    const total = parseMoneyInput(amount.input.value);
    if (!total) {
      amount.setHint(tr("Nhập tổng hóa đơn"), "error");
      amount.input.focus();
      return;
    }
    if (!people.length) {
      toast(tr("Thêm ít nhất 1 người cùng chia nhé."), "error");
      nameInput.focus();
      return;
    }
    const restore = busy(save);
    try {
      const created = await api("/debts/splits", {
        method: "POST",
        body: {
          title: title.input.value || tr("Chia tiền"),
          total_amount: total,
          people,
          category_id: Number(category.value),
          transaction_date: date.input.value,
          transaction_time: time.input.value || null,
          i_paid: iPaid,
          payer_name: iPaid ? null : payer
        }
      });
      haptic([10, 40, 10]);
      confetti({ count: 120 });
      toast(tr`Đã chia ${money(total)} cho ${people.length + 1} người, phần bạn ${money(created.my_share)}.`, "ok", 5000);
      sheet.close("saved");
      ctx.refresh();
    } catch (error) {
      toast(error.message, "error");
      restore();
    }
  });
}

/* ---------------------------------------------------------------------------
   Quản lý bạn bè
   ------------------------------------------------------------------------ */
function renderFriendsSection(ctx, friends) {
  const container = h("div", { class: "stack", style: { gap: "16px" } });

  // 1. Thẻ Kết bạn mới
  const targetInput = field({
    label: tr("Tên đăng nhập (@username) hoặc User ID (#2)"),
    name: "target_user",
    autocomplete: "off",
    placeholder: tr("Ví dụ: 2, #2 hoặc @rong.thanh.hoa"),
    hint: tr("Nhập ID hoặc tên đăng nhập của người bạn muốn kết bạn")
  });
  const addBtn = h("button", { class: "btn block", type: "button" }, icon("user-plus", 18), tr("Kết bạn ngay"));

  addBtn.addEventListener("click", async () => {
    const val = targetInput.input.value.trim();
    if (!val) {
      targetInput.setHint(tr("Vui lòng nhập ID hoặc @username"), "error");
      targetInput.input.focus();
      return;
    }
    const restore = busy(addBtn);
    try {
      const res = await api("/friends", { method: "POST", body: { target: val } });
      haptic(15);
      confetti({ count: 60 });
      toast(res.message, "ok");
      targetInput.input.value = "";
      ctx.refresh();
    } catch (err) {
      targetInput.setHint(err.message, "error");
    } finally {
      restore();
    }
  });

  const addCard = h("section", { class: "card stack", style: { gap: "10px" } },
    h("div", { class: "card-title", style: { marginBottom: 0 } }, icon("user-plus", 18), tr("Kết bạn mới")),
    targetInput.el,
    addBtn
  );
  container.append(addCard);

  // 2. Danh sách Bạn bè
  const friendList = h("div", { class: "tx-list" });
  if (!friends || friends.length === 0) {
    friendList.append(h("div", { class: "card empty" },
      icon("users", 32),
      h("strong", null, tr("Chưa có bạn bè nào")),
      h("p", { class: "faint mt-0", style: { fontSize: "13px" } }, tr("Kết bạn bằng ID hoặc @username để ghi nợ 2 chiều và chia tiền nhóm 1 chạm siêu nhanh!"))
    ));
  } else {
    for (const f of friends) {
      const debtBtn = h("button", { class: "btn small soft", type: "button", title: tr("Ghi nợ với người này") }, icon("hand-coins", 14), tr("Ghi nợ"));
      debtBtn.addEventListener("click", () => {
        openNewDebt(ctx, [], f);
      });

      const removeBtn = h("button", { class: "icon-btn", type: "button", title: tr("Hủy kết bạn") }, icon("trash-2", 16));
      removeBtn.addEventListener("click", async () => {
        const ok = await confirmSheet({
          title: tr`Hủy kết bạn với @${f.username}?`,
          message: tr("Người này sẽ bị xóa khỏi danh sách bạn bè gợi ý nhanh."),
          okText: tr("Hủy kết bạn"),
          danger: true
        });
        if (!ok) return;
        try {
          await api(`/friends/${f.id}`, { method: "DELETE" });
          toast(tr`Đã hủy kết bạn với @${f.username}.`, "ok");
          ctx.refresh();
        } catch (err) {
          toast(err.message, "error");
        }
      });

      friendList.append(h("div", { class: "tx", style: { padding: "10px 0" } },
        avatar(f.name, 40),
        h("div", { class: "tx-main" },
          h("strong", null, f.name),
          h("small", { class: "faint" }, `@${f.username} · ID: #${f.id}`)
        ),
        h("div", { class: "row", style: { gap: "6px" } }, debtBtn, removeBtn)
      ));
    }
  }

  const listCard = h("section", { class: "card" },
    h("div", { class: "card-title" }, icon("users", 18), tr`Bạn bè của tôi (${friends.length})`),
    friendList
  );
  container.append(listCard);

  return container;
}

/* ---------------------------------------------------------------------------
   Màn hình
   ------------------------------------------------------------------------ */
export async function debtsScreen(ctx, params) {
  const showHistory = params.get("history") === "1";
  const currentTab = params.get("tab") || "personal";
  const screen = h("main", { class: "screen stack" });
  const notifBtn = notificationButton(ctx);

  screen.append(h("header", { class: "screen-head" },
    h("div", { class: "grow" },
      h("h1", null, currentTab === "groups" ? tr("Quỹ Nhóm") : currentTab === "friends" ? tr("Bạn Bè") : tr("Sổ Nợ")),
      h("span", { class: "sub" }, currentTab === "groups" ? tr("Chia tiền phòng trọ, du lịch, nhóm bạn") : currentTab === "friends" ? tr("Kết bạn để ghi nợ và chia tiền 1 chạm") : tr("Đồng bộ tài khoản hoặc ghi nợ tự do"))
    ),
    notifBtn, settingsButton()));
  screen.cleanup = () => notifBtn.destroy?.();

  // Tab chuyển đổi: [Sổ nợ cá nhân] [Quỹ nhóm] [Bạn bè]
  const subNav = h("div", { class: "segmented", style: { marginBottom: "6px" } },
    h("button", {
      type: "button",
      "aria-pressed": String(currentTab === "personal"),
      onclick: () => ctx.go("debts", { tab: "personal" })
    }, icon("user", 16), tr("Sổ nợ")),
    h("button", {
      type: "button",
      "aria-pressed": String(currentTab === "groups"),
      onclick: () => ctx.go("debts", { tab: "groups" })
    }, icon("users", 16), tr("Quỹ nhóm")),
    h("button", {
      type: "button",
      "aria-pressed": String(currentTab === "friends"),
      onclick: () => ctx.go("debts", { tab: "friends" })
    }, icon("user-plus", 16), tr("Bạn bè"))
  );
  screen.append(subNav);

  if (currentTab === "friends") {
    try {
      const res = await api("/friends");
      screen.append(renderFriendsSection(ctx, res.friends || []));
    } catch (err) {
      screen.append(h("div", { class: "card empty" }, icon("wifi-off"), err.message,
        h("button", { class: "btn small", type: "button", onclick: () => ctx.refresh() }, tr("Thử lại"))));
    }
    return screen;
  }

  if (currentTab === "groups") {
    try {
      const res = await api("/groups");
      screen.append(renderGroupsSection(ctx, res.groups));
    } catch (err) {
      screen.append(h("div", { class: "card empty" }, icon("wifi-off"), err.message,
        h("button", { class: "btn small", type: "button", onclick: () => ctx.refresh() }, tr("Thử lại"))));
    }
    return screen;
  }

  let data;
  let splits;
  let known;
  try {
    [data, splits, known] = await Promise.all([
      api("/debts", { query: { history: showHistory ? 1 : undefined } }),
      api("/debts/splits"),
      api("/debts/people").catch(() => [])
    ]);
  } catch (error) {
    screen.append(h("div", { class: "card empty" }, icon("wifi-off"), error.message,
      h("button", { class: "btn small", type: "button", onclick: () => ctx.refresh() }, tr("Thử lại"))));
    return screen;
  }

  screen.append(h("section", { class: "today-grid" },
    h("div", { class: "card" }, h("span", { class: "faint" }, tr("Người ta nợ bạn")), h("div", { class: "money-mid", style: { color: "var(--income)" } }, money(data.owed_to_me))),
    h("div", { class: "card" }, h("span", { class: "faint" }, tr("Bạn đang nợ")), h("div", { class: "money-mid", style: { color: "var(--expense)" } }, money(data.i_owe)))));

  const splitBtn = h("button", { class: "btn", type: "button" }, icon("users", 18), tr("Chia tiền nhóm"));
  splitBtn.addEventListener("click", () => openSplit(ctx, known));
  const debtBtn = h("button", { class: "btn soft", type: "button" }, icon("hand-coins", 18), tr("Ghi nợ"));
  debtBtn.addEventListener("click", () => openNewDebt(ctx, known));
  screen.append(h("div", { class: "two-col" }, splitBtn, debtBtn));

  // Theo từng người
  const peopleCard = h("section", { class: "card" }, h("div", { class: "card-title" }, icon("users-round", 20), tr("Theo từng người")));
  const list = h("div", { class: "tx-list" });
  const people = (data.people || []).filter((p) => p.open_count > 0);
  if (!people.length) {
    list.append(h("div", { class: "empty" }, icon("party-popper"), tr("Không nợ ai, không ai nợ. Sạch sẽ!")));
  }
  for (const p of people) {
    const items = data.open.filter((d) => d.person_name === p.person_name);
    const row = h("button", { class: "tx", type: "button" },
      avatar(p.person_name),
      h("span", { class: "tx-main" },
        h("strong", null, p.person_name),
        h("small", null, p.net_amount > 0 ? tr`Nợ bạn · ${p.open_count} khoản` : p.net_amount < 0 ? tr`Bạn nợ · ${p.open_count} khoản` : tr`Huề · ${p.open_count} khoản`)),
      h("span", { class: `tx-amt ${p.net_amount >= 0 ? "income" : "expense"}` }, money(Math.abs(p.net_amount))));
    row.addEventListener("click", () => openPerson(ctx, p, items));
    list.append(row);
  }
  peopleCard.append(list);
  screen.append(peopleCard);

  // Chia tiền gần đây
  if (splits.length) {
    const splitList = h("div", { class: "tx-list" });
    for (const s of splits.slice(0, 10)) {
      const remove = h("button", { class: "icon-btn", type: "button", "aria-label": tr`Xóa lần chia ${s.title}` }, icon("trash-2", 18));
      remove.addEventListener("click", async () => {
        const ok = await confirmSheet({
          title: tr("Xóa cả lần chia này?"),
          message: tr`"${s.title}" ${money(s.total_amount)}: xóa luôn các khoản nợ và phần chi của bạn (${money(s.my_share)}).`,
          okText: tr("Xóa"), danger: true
        });
        if (!ok) return;
        try {
          await api(`/debts/splits/${s.id}`, { method: "DELETE" });
          toast(tr("Đã xóa lần chia."), "ok");
          ctx.refresh();
        } catch (error) {
          toast(error.message, "error");
        }
      });
      splitList.append(h("div", { class: "tx" },
        h("span", { class: "tx-icon", style: { background: "var(--grad-main)" } }, icon("users", 20)),
        h("span", { class: "tx-main" },
          h("strong", null, s.title),
          h("small", null, tr`${s.people_count} người · ${moneyShort(s.my_share)}/người · ${s.open_debts ? tr`còn ${s.open_debts} người chưa trả` : tr("đã thu đủ")}`)),
        h("span", { class: "row", style: { gap: "4px" } }, h("strong", null, moneyShort(s.total_amount)), remove)));
    }
    screen.append(h("section", { class: "card" }, h("div", { class: "card-title" }, icon("receipt-text", 20), tr("Chia tiền gần đây")), splitList));
  }

  // Đã trả
  const historyCard = h("section", { class: "card" });
  const toggle = h("button", { class: "more", type: "button", onclick: () => ctx.go("debts", showHistory ? undefined : { history: 1 }) }, showHistory ? tr("Ẩn") : tr("Xem"));
  historyCard.append(h("div", { class: "card-title", style: { marginBottom: showHistory ? "10px" : 0 } }, icon("history", 20), tr("Đã trả gần đây"), toggle));
  if (showHistory) {
    const hist = h("div", { class: "tx-list" });
    if (!(data.history || []).length) hist.append(h("p", { class: "faint center" }, tr("Chưa có khoản nào đã trả.")));
    for (const d of data.history || []) {
      hist.append(h("div", { class: "tx", style: { opacity: 0.8 } },
        avatar(d.person_name, 36),
        h("span", { class: "tx-main" },
          h("strong", null, `${d.person_name} · ${d.note || directionText(d.direction)}`),
          h("small", null, `${debtKind(d)} · xong ${dateLabel(d.settled_at.slice(0, 10), today())}`)),
        h("span", { class: "badge ok" }, icon("check", 12), moneyShort(d.amount))));
    }
    historyCard.append(hist);
  }
  screen.append(historyCard);

  if (params.get("new") === "split") requestAnimationFrame(() => openSplit(ctx, known));
  return screen;
}
