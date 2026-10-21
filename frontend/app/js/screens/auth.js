/**
 * @file auth.js
 * @description Màn chào, đăng ký, đăng nhập, quên mật khẩu, dùng thử và nâng cấp tài khoản dùng thử.
 */

import { tr } from "../i18n.js";
import { api, session, today, nowTime } from "../api.js";
import { h, icon, field, passwordField, busy, toast, openSheet, confetti, haptic } from "../ui.js";
import { renderPet } from "../pet.js";

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,30}$/;
const COMMON_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "password", "password1", "matkhau123", "abc12345",
  "qwerty123", "11111111", "88888888", "iloveyou", "anhyeuem", "admin123", "12345678a", "a12345678"
]);

/** Bỏ dấu tiếng Việt và ký tự lạ để gợi ý tên đăng nhập hợp lệ ("Trí Nguyễn" -> "tri.nguyen"). */
export function suggestUsername(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 30);
}

/**
 * Đánh giá độ mạnh mật khẩu, đồng bộ với quy tắc phía backend.
 * @returns {{score: number, label: string, checks: {key: string, text: string, ok: boolean}[], valid: boolean}}
 */
export function passwordStrength(password, username = "") {
  const pw = String(password || "");
  const user = String(username || "").trim().toLowerCase();
  const checks = [
    { key: "length", text: tr("Ít nhất 8 ký tự"), ok: pw.length >= 8 && pw.length <= 128 },
    { key: "mix", text: tr("Có cả chữ và số"), ok: /[a-zA-Z]/.test(pw) && /\d/.test(pw) },
    { key: "user", text: tr("Không chứa tên đăng nhập"), ok: !user || user.length < 3 || !pw.toLowerCase().includes(user) },
    { key: "common", text: tr("Không phải mật khẩu quá phổ biến"), ok: pw.length > 0 && !COMMON_PASSWORDS.has(pw.toLowerCase()) }
  ];
  const valid = checks.every((c) => c.ok);
  let score = 0;
  if (pw.length >= 8) score++;
  if (checks[1].ok) score++;
  if (pw.length >= 12) score++;
  if (/[^a-zA-Z0-9]/.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw))) score++;
  if (!valid) score = Math.min(score, 1);
  score = pw ? Math.max(score, 1) : 0;
  const labels = [tr("Chưa nhập"), tr("Yếu quá"), tr("Tạm được"), tr("Khá mạnh"), tr("Rất mạnh")];
  return { score, label: labels[score], checks, valid };
}

/** Khối mật khẩu mới + nhập lại, có thanh độ mạnh và danh sách điều kiện. */
export function newPasswordBlock(getUsername, labels = {}) {
  const pw = passwordField({ label: labels.password || tr("Mật khẩu"), name: "password", autocomplete: "new-password", maxlength: 128 });
  const confirm = passwordField({ label: labels.confirm || tr("Nhập lại mật khẩu"), name: "confirm_password", autocomplete: "new-password", maxlength: 128 });
  const meter = h("div", { class: "meter", "data-score": "0", "aria-hidden": "true" }, h("span"), h("span"), h("span"), h("span"));
  const meterLabel = h("span", { class: "faint" }, "");
  const list = h("ul", { class: "checklist" });

  const refresh = () => {
    const s = passwordStrength(pw.input.value, getUsername());
    meter.dataset.score = s.score;
    meterLabel.textContent = pw.input.value ? tr`Độ mạnh: ${s.label}` : "";
    list.replaceChildren(...s.checks.map((c) => h("li", { class: c.ok ? "done" : "" }, icon(c.ok ? "circle-check" : "circle"), c.text)));
    if (confirm.input.value) {
      const same = confirm.input.value === pw.input.value;
      confirm.setHint(same ? tr("Khớp rồi nè") : tr("Chưa khớp với mật khẩu ở trên"), same ? "ok" : "error");
    } else {
      confirm.setHint("");
    }
    return s;
  };
  pw.input.addEventListener("input", () => {
    pw.setHint("");
    refresh();
  });
  confirm.input.addEventListener("input", refresh);
  refresh();

  return {
    el: h("div", { class: "stack" }, h("div", null, pw.el, meter, h("div", { class: "row between" }, meterLabel), list), confirm.el),
    pw,
    confirm,
    refresh,
    /** Kiểm tra trước khi gửi, trả về true nếu hợp lệ. */
    validate() {
      const s = refresh();
      if (!s.valid) {
        pw.setHint(s.checks.find((c) => !c.ok).text, "error");
        pw.input.focus();
        return false;
      }
      if (confirm.input.value !== pw.input.value) {
        confirm.setHint(tr("Mật khẩu nhập lại không khớp"), "error");
        confirm.input.focus();
        return false;
      }
      return true;
    }
  };
}

/** Ô tên đăng nhập có kiểm tra ngay khi gõ và gợi ý bỏ dấu. */
function usernameField(value = "") {
  const f = field({ label: tr("Tên đăng nhập"), name: "username", autocomplete: "username", maxlength: 60, value, hint: tr("3-30 ký tự: chữ không dấu, số, dấu chấm, gạch dưới") });
  const check = () => {
    const v = f.input.value.trim();
    if (!v) {
      f.setHint(tr("3-30 ký tự: chữ không dấu, số, dấu chấm, gạch dưới"));
      return false;
    }
    if (/^khach_/i.test(v)) {
      f.setHint(tr("Tên bắt đầu bằng \"khach_\" dành cho tài khoản dùng thử"), "error");
      return false;
    }
    if (!USERNAME_RE.test(v)) {
      const suggestion = suggestUsername(v);
      f.setHint(USERNAME_RE.test(suggestion) ? tr`Tên chưa hợp lệ. Gợi ý: ${suggestion} (chạm Tab để dùng)` : tr("Chỉ dùng chữ không dấu, số, dấu chấm, gạch dưới (3-30 ký tự)"), "error");
      return false;
    }
    f.setHint(tr("Tên hợp lệ"), "ok");
    return true;
  };
  f.input.addEventListener("input", check);
  // Rời ô: tự đổi sang gợi ý không dấu cho nhanh
  f.input.addEventListener("blur", () => {
    const v = f.input.value.trim();
    if (v && !USERNAME_RE.test(v)) {
      const suggestion = suggestUsername(v);
      if (USERNAME_RE.test(suggestion) && !/^khach_/.test(suggestion)) {
        f.input.value = suggestion;
        check();
      }
    }
  });
  return { ...f, check };
}

function showFieldError(error, fields, formError) {
  const target = error.data && error.data.field && fields[error.data.field];
  if (target) {
    target.setHint(error.message, "error");
    target.input.focus();
    formError.textContent = "";
  } else {
    formError.textContent = error.message;
  }
  haptic([30, 40, 30]);
}

function authShell(title, subtitle, ...content) {
  return h("main", { class: "welcome" },
    h("div", { class: "auth-top" },
      h("a", { class: "icon-btn", href: "#/welcome", "aria-label": tr("Quay lại") }, icon("chevron-left")),
      h("div", { class: "brand" }, h("span", { class: "logo" }, icon("wallet", 22)), tr("Quản lý thu chi"))),
    h("div", null, h("h1", { class: "hero-title", style: { fontSize: "34px" } }, title), subtitle ? h("p", { class: "muted mt-8" }, subtitle) : null),
    ...content);
}

/* ---------------------------------------------------------------------------
   Màn chào
   ------------------------------------------------------------------------ */
export function welcomeScreen(ctx) {
  const demoBtn = h("button", { class: "btn block", type: "button" }, icon("sparkles"), tr("Dùng thử ngay - không cần đăng ký"));
  demoBtn.addEventListener("click", () => startDemo(ctx, demoBtn));

  const pet = renderPet({ mood: "party", level: 1, size: 170 });
  return h("main", { class: "welcome" },
    h("div", { class: "brand" }, h("span", { class: "logo" }, icon("wallet", 22)), tr("Quản lý thu chi")),
    h("div", { class: "hero-pet" }, pet),
    h("div", null,
      h("h1", { class: "hero-title" }, tr("Tiêu gì cũng "), h("span", { class: "gradient-text" }, tr("nhớ hết")), " ✦"),
      h("p", { class: "muted mt-8" }, tr("Nói một câu, up ảnh bill / ảnh chuyển khoản hay dán tin nhắn ngân hàng là xong. Thú cưng ví tiền canh ngân sách giúp bạn."))),
    h("div", { class: "feature-pills" },
      h("span", null, icon("mic"), tr("Nói để ghi")),
      h("span", null, icon("image-up"), tr("Up ảnh")),
      h("span", null, icon("message-square-text"), tr("Dán SMS")),
      h("span", null, icon("users"), tr("Chia tiền")),
      h("span", null, icon("flame"), tr("Chuỗi ngày"))),
    h("div", { class: "stack" },
      demoBtn,
      h("a", { class: "btn soft block", href: "#/register" }, tr("Tạo tài khoản")),
      h("p", { class: "center muted" }, tr("Đã có tài khoản? "), h("a", { class: "link", href: "#/login" }, tr("Đăng nhập")))));
}

export async function startDemo(ctx, button) {
  const restore = button ? busy(button) : () => {};
  try {
    const data = await api("/auth/demo", { method: "POST", body: { today: today(), now: nowTime() } });
    session.save(data);
    toast(tr("Đã tạo tài khoản dùng thử 24 giờ kèm dữ liệu mẫu"), "ok");
    ctx.go("home");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    restore();
  }
}

/* ---------------------------------------------------------------------------
   Đăng nhập
   ------------------------------------------------------------------------ */
export function loginScreen(ctx) {
  const username = field({ label: tr("Tên đăng nhập"), name: "username", autocomplete: "username", maxlength: 30 });
  const password = passwordField({ label: tr("Mật khẩu"), name: "password", autocomplete: "current-password", maxlength: 128 });
  const formError = h("div", { class: "form-error", role: "alert" });
  const submit = h("button", { class: "btn block", type: "submit" }, tr("Đăng nhập"));
  let lockTimer = null;

  const lockFor = (seconds) => {
    clearInterval(lockTimer);
    let left = Math.max(1, Math.round(seconds));
    submit.disabled = true;
    const render = () => {
      const mm = Math.floor(left / 60);
      const ss = String(left % 60).padStart(2, "0");
      formError.className = "form-error";
      formError.replaceChildren(icon("lock"), h("div", null,
        tr("Sai quá 5 lần nên tài khoản tạm khóa. Thử lại sau "),
        h("span", { class: "lock-timer" }, `${mm}:${ss}`),
        h("br"), h("a", { class: "link", href: "#/recover" }, tr("Quên mật khẩu? Dùng mã khôi phục"))));
    };
    render();
    lockTimer = setInterval(() => {
      left--;
      if (left <= 0) {
        clearInterval(lockTimer);
        submit.disabled = false;
        formError.textContent = "";
        return;
      }
      render();
    }, 1000);
  };

  const form = h("form", { class: "card auth-card", novalidate: true }, username.el, password.el, formError, submit,
    h("div", { class: "row between" },
      h("a", { class: "link", href: "#/recover" }, tr("Quên mật khẩu?")),
      h("a", { class: "link", href: "#/register" }, tr("Tạo tài khoản mới"))));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.textContent = "";
    formError.className = "form-error";
    if (!username.input.value.trim() || !password.input.value) {
      formError.textContent = tr("Nhập đủ tên đăng nhập và mật khẩu nhé.");
      return;
    }
    const restore = busy(submit);
    try {
      const data = await api("/auth/login", { method: "POST", body: { username: username.input.value.trim(), password: password.input.value } });
      session.save(data);
      haptic(20);
      toast(tr`Chào mừng trở lại, ${data.user.username}!`, "ok");
      if (!data.has_recovery_code) toast(tr("Bạn chưa có mã khôi phục. Vào Tôi > Mã khôi phục để tạo nhé."), "info", 5000);
      ctx.go("home");
    } catch (error) {
      restore();
      if (error.code === "ACCOUNT_LOCKED") {
        lockFor(error.data.retry_after_seconds || 300);
        return;
      }
      password.input.value = "";
      if (error.code === "INVALID_CREDENTIALS" && error.data.attempts_left !== undefined) {
        formError.className = "form-error warn";
        formError.replaceChildren(icon("triangle-alert"), h("span", null,
          tr`${error.message} Còn ${error.data.attempts_left} lần thử trước khi bị khóa 5 phút.`));
        haptic([30, 40, 30]);
      } else {
        formError.textContent = error.message;
        haptic([30, 40, 30]);
      }
      password.input.focus();
    }
  });

  const screen = authShell(tr("Chào mừng trở lại"), tr("Đăng nhập để xem ví của bạn."), form,
    h("p", { class: "center faint" }, tr("Tài khoản dùng thử không đăng nhập lại được. Hãy lưu tài khoản trước khi hết 24 giờ.")));
  screen.cleanup = () => clearInterval(lockTimer);
  return screen;
}

/* ---------------------------------------------------------------------------
   Đăng ký
   ------------------------------------------------------------------------ */
export function registerScreen(ctx) {
  const username = usernameField();
  const pwBlock = newPasswordBlock(() => username.input.value);
  const formError = h("div", { class: "form-error", role: "alert" });
  const submit = h("button", { class: "btn block", type: "submit" }, tr("Tạo tài khoản"));
  username.input.addEventListener("input", () => pwBlock.refresh());

  const form = h("form", { class: "card auth-card", novalidate: true }, username.el, pwBlock.el, formError, submit);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.textContent = "";
    if (!username.check()) {
      username.input.focus();
      return;
    }
    if (!pwBlock.validate()) return;
    const restore = busy(submit);
    try {
      const data = await api("/auth/register", {
        method: "POST",
        body: { username: username.input.value.trim(), password: pwBlock.pw.input.value, confirm_password: pwBlock.confirm.input.value }
      });
      session.save(data);
      ctx.mount(recoveryCodeScreen(ctx, data.recovery_code, tr("Tạo tài khoản thành công!")));
    } catch (error) {
      if (error.code === "USER_ALREADY_EXISTS") {
        const base = username.input.value.trim().slice(0, 25);
        const alt = `${base}${Math.floor(10 + Math.random() * 89)}`;
        username.setHint(tr`Tên này có người dùng rồi. Thử "${alt}" nhé?`, "error");
        username.input.focus();
      } else {
        showFieldError(error, { username, password: pwBlock.pw, confirm_password: pwBlock.confirm }, formError);
      }
    } finally {
      restore();
    }
  });

  return authShell(tr("Tạo tài khoản"), tr("Chỉ cần tên đăng nhập và mật khẩu, không cần email hay số điện thoại."), form,
    h("p", { class: "center muted" }, tr("Đã có tài khoản? "), h("a", { class: "link", href: "#/login" }, tr("Đăng nhập"))));
}

/* ---------------------------------------------------------------------------
   Mã khôi phục (hiện 1 lần duy nhất)
   ------------------------------------------------------------------------ */
export function recoveryCodeCard(code, onDone, doneText = tr("Vào app thôi")) {
  const copyBtn = h("button", { class: "btn soft small", type: "button" }, icon("copy", 16), tr("Sao chép"));
  const saveBtn = h("button", { class: "btn soft small", type: "button" }, icon("download", 16), tr("Lưu file .txt"));
  const agree = h("input", { type: "checkbox" });
  const go = h("button", { class: "btn block", type: "button", disabled: true }, doneText);

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast(tr("Đã sao chép mã khôi phục"), "ok");
    } catch {
      toast(tr("Không sao chép được, hãy chép tay nhé"), "error");
    }
  });
  saveBtn.addEventListener("click", () => {
    const user = session.user ? session.user.username : "";
    const text = tr`Quản lý thu chi - Mã khôi phục\nTên đăng nhập: ${user}\nMã: ${code}\n\nDùng mã này khi quên mật khẩu. Mỗi mã chỉ dùng được 1 lần.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = h("a", { href: url, download: `thu-chi-ma-khoi-phuc-${user || "tai-khoan"}.txt` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  agree.addEventListener("change", () => {
    go.disabled = !agree.checked;
  });
  go.addEventListener("click", onDone);

  return h("div", { class: "card stack" },
    h("div", { class: "row" }, icon("key-round", 22), h("strong", null, tr("Mã khôi phục của bạn"))),
    h("p", { class: "muted" }, tr("Không có email nên đây là cách duy nhất để lấy lại tài khoản khi quên mật khẩu. Mã chỉ hiện một lần, hãy lưu lại ngay.")),
    h("div", { class: "recovery-code", "aria-label": tr("Mã khôi phục") }, code),
    h("div", { class: "row" }, copyBtn, saveBtn),
    h("label", { class: "switch" }, agree, h("span", null, tr("Mình đã lưu mã này ở nơi an toàn"))),
    go);
}

export function recoveryCodeScreen(ctx, code, title) {
  confetti();
  return h("main", { class: "welcome" },
    h("div", { class: "hero-pet" }, renderPet({ mood: "party", level: 1, size: 140 })),
    h("h1", { class: "hero-title", style: { fontSize: "32px" } }, title),
    recoveryCodeCard(code, () => ctx.go("home")));
}

/* ---------------------------------------------------------------------------
   Quên mật khẩu
   ------------------------------------------------------------------------ */
export function recoverScreen(ctx) {
  const username = field({ label: tr("Tên đăng nhập"), name: "username", autocomplete: "username", maxlength: 30 });
  const code = field({ label: tr("Mã khôi phục (XXXX-XXXX-XXXX)"), name: "recovery_code", autocomplete: "one-time-code", maxlength: 20 });
  const pwBlock = newPasswordBlock(() => username.input.value, { password: tr("Mật khẩu mới"), confirm: tr("Nhập lại mật khẩu mới") });
  const formError = h("div", { class: "form-error", role: "alert" });
  const submit = h("button", { class: "btn block", type: "submit" }, tr("Đặt lại mật khẩu"));

  // Tự chèn gạch nối khi gõ mã
  code.input.addEventListener("input", () => {
    const raw = code.input.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    code.input.value = raw.match(/.{1,4}/g)?.join("-") || "";
  });

  const form = h("form", { class: "card auth-card", novalidate: true }, username.el, code.el, pwBlock.el, formError, submit);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.textContent = "";
    if (!username.input.value.trim()) {
      username.setHint(tr("Nhập tên đăng nhập"), "error");
      return;
    }
    if (code.input.value.replace(/-/g, "").length !== 12) {
      code.setHint(tr("Mã khôi phục gồm 12 ký tự"), "error");
      return;
    }
    code.setHint("");
    if (!pwBlock.validate()) return;
    const restore = busy(submit);
    try {
      const data = await api("/auth/recover", {
        method: "POST",
        body: {
          username: username.input.value.trim(),
          recovery_code: code.input.value,
          new_password: pwBlock.pw.input.value,
          confirm_password: pwBlock.confirm.input.value
        }
      });
      session.save(data);
      ctx.mount(recoveryCodeScreen(ctx, data.recovery_code, tr("Đổi mật khẩu xong! Đây là mã khôi phục mới")));
    } catch (error) {
      if (error.code === "INVALID_RECOVERY_CODE" && error.data.attempts_left !== undefined) {
        formError.textContent = tr`${error.message} Còn ${error.data.attempts_left} lần thử.`;
      } else {
        showFieldError(error, { password: pwBlock.pw, confirm_password: pwBlock.confirm }, formError);
      }
    } finally {
      restore();
    }
  });

  return authShell(tr("Quên mật khẩu"), tr("Dùng mã khôi phục bạn đã lưu khi tạo tài khoản. Mã cũ sẽ hết hiệu lực, bạn nhận mã mới."), form);
}

/* ---------------------------------------------------------------------------
   Lưu tài khoản dùng thử thành tài khoản thật
   ------------------------------------------------------------------------ */
export function openUpgradeSheet(ctx) {
  const sheet = openSheet({ title: tr("Lưu tài khoản") });
  const username = usernameField();
  const pwBlock = newPasswordBlock(() => username.input.value);
  const keep = h("input", { type: "checkbox", checked: true });
  const formError = h("div", { class: "form-error", role: "alert" });
  const submit = h("button", { class: "btn block", type: "submit" }, icon("shield-check"), tr("Lưu tài khoản"));
  username.input.addEventListener("input", () => pwBlock.refresh());

  const form = h("form", { class: "stack", novalidate: true },
    h("p", { class: "muted" }, tr("Đặt tên đăng nhập và mật khẩu để giữ lại mọi thứ bạn đã ghi trong lúc dùng thử.")),
    username.el, pwBlock.el,
    h("label", { class: "switch" }, keep, h("span", null, tr("Giữ cả dữ liệu mẫu (bỏ chọn để chỉ giữ những gì bạn tự ghi)"))),
    formError, submit);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.textContent = "";
    if (!username.check()) return;
    if (!pwBlock.validate()) return;
    const restore = busy(submit);
    try {
      const data = await api("/auth/upgrade-demo", {
        method: "POST",
        body: {
          username: username.input.value.trim(),
          password: pwBlock.pw.input.value,
          confirm_password: pwBlock.confirm.input.value,
          keep_sample: keep.checked
        }
      });
      session.save(data);
      confetti();
      sheet.setContent(recoveryCodeCard(data.recovery_code, () => {
        sheet.close("done");
        ctx.refresh();
      }, "Xong"));
    } catch (error) {
      restore();
      showFieldError(error, { username, password: pwBlock.pw, confirm_password: pwBlock.confirm }, formError);
    }
  });
  sheet.setContent(form);
}
