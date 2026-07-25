/* ==========================================================================
   SHIFT — contact form
   Validates on submit (and on blur once the visitor has already tried), then
   either posts to the configured endpoint or hands the message to the
   visitor's mail client. Never fails silently.
   ========================================================================== */

(function () {
  "use strict";

  var form = document.querySelector("[data-form]");
  if (!form) return;

  var cfg = window.SHIFT_CONFIG;
  var status = form.querySelector("[data-form-status]");
  var submit = form.querySelector("[data-form-submit]");
  var fields = Array.prototype.slice.call(form.querySelectorAll(".field"));
  var tried = false;

  function lang() {
    return document.documentElement.getAttribute("data-lang") === "en" ? "en" : "ja";
  }

  var COPY = {
    ja: {
      required: "この項目は必須です。",
      email: "メールアドレスの形式が正しくありません。",
      sending: "送信中…",
      sent: "送信しました。3営業日以内にご返信します。",
      failed: "送信できませんでした。お手数ですが直接メールでご連絡ください:",
      mail: "メールソフトを開きました。表示されたメールを送信してください。"
    },
    en: {
      required: "This field is required.",
      email: "That does not look like an email address.",
      sending: "Sending…",
      sent: "Sent. We reply within three business days.",
      failed: "That did not go through. Please email us directly at",
      mail: "Your mail app is open — send the message it prepared."
    }
  };

  function say(kind, text) {
    if (!status) return;
    status.className = "form__status" + (kind ? " is-" + kind : "");
    status.textContent = text;
  }

  function control(field) {
    return field.querySelector("input, textarea, select");
  }

  function validate(field) {
    var el = control(field);
    if (!el) return true;
    var err = field.querySelector(".field__error");
    var value = (el.value || "").trim();
    var message = "";

    if (el.required && !value) {
      message = COPY[lang()].required;
    } else if (el.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      message = COPY[lang()].email;
    }

    field.classList.toggle("is-invalid", !!message);
    el.setAttribute("aria-invalid", message ? "true" : "false");
    if (err) err.textContent = message;
    return !message;
  }

  fields.forEach(function (field) {
    var el = control(field);
    if (!el) return;
    /* Only nag after the first attempt — validating mid-typing is hostile. */
    el.addEventListener("blur", function () { if (tried) validate(field); });
    el.addEventListener("input", function () {
      if (tried && field.classList.contains("is-invalid")) validate(field);
    });
  });

  function payload() {
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    return data;
  }

  function mailto(data) {
    var subjectPrefix = lang() === "en" ? "Website enquiry" : "ウェブサイトからのお問い合わせ";
    var body = Object.keys(data).map(function (k) {
      return k + ": " + data[k];
    }).join("\n");
    return "mailto:" + cfg.contactEmail +
      "?subject=" + encodeURIComponent(subjectPrefix + " — " + (data.name || "")) +
      "&body=" + encodeURIComponent(body);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    tried = true;

    var bad = fields.filter(function (f) { return !validate(f); });
    if (bad.length) {
      var first = control(bad[0]);
      if (first) first.focus();
      return;
    }

    /* Honeypot: a field no human sees, so anything in it is a bot. */
    var trap = form.querySelector('[name="company_website"]');
    if (trap && trap.value) { say("ok", COPY[lang()].sent); form.reset(); return; }

    var data = payload();
    delete data.company_website;

    if (!cfg.formEndpoint) {
      window.location.href = mailto(data);
      say("ok", COPY[lang()].mail);
      return;
    }

    if (submit) submit.disabled = true;
    say("", COPY[lang()].sending);

    fetch(cfg.formEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(data)
    }).then(function (res) {
      if (!res.ok) throw new Error(res.status);
      form.reset();
      fields.forEach(function (f) { f.classList.remove("is-invalid"); });
      say("ok", COPY[lang()].sent);
    }).catch(function () {
      say("err", COPY[lang()].failed + " " + cfg.contactEmail);
    }).finally(function () {
      if (submit) submit.disabled = false;
    });
  });
})();
