# SHIFT — company website

Static bilingual site for SHIFT合同会社 (SHIFT GK), Tokyo.
No framework, no build step, no dependencies. Open `index.html` and it works.

**Live:** https://karassada.github.io/SHIFT/

---

## Editing

Everything is plain HTML and CSS. Edit the files directly and push — GitHub
Pages redeploys in about a minute.

### Where things are

```
index.html        Homepage
services.html     サービス / Services
ventures.html     事業・ブランド / Ventures — your other businesses
about.html        会社概要 / About + the company profile table
contact.html      お問い合わせ / Contact form
privacy.html      プライバシーポリシー / Privacy policy

assets/css/tokens.css      colours, type sizes, spacing, motion timing
assets/css/base.css        reset, typography, grid
assets/css/components.css  header, buttons, cards, forms, footer
assets/css/motion.css      every animation
assets/js/config.js        contact form endpoint + email address
assets/js/puzzle.js        the sliding-tile board on the homepage
assets/img/shift-logo.svg  the logo, as vector
```

### Both languages live in the HTML

Every piece of text ships in Japanese and English side by side:

```html
<span class="ja">日本語のテキスト</span><span class="en">English text</span>
```

The header toggle just switches which set is visible. To change wording, edit
both spans. Japanese is the default; the choice is remembered per visitor.

### Changing the colours

All of them are in `assets/css/tokens.css`, at the top. Change `--c-accent`
and the whole site follows — buttons, links, the chevron on the homepage
board, focus rings.

### Things marked for you

Search the HTML for `GUTO:` — those comments mark the places left deliberately
unfinished:

- **The SHIFT explanation** — `index.html` (`#about-shift`) and `about.html`.
  Placeholder paragraphs, waiting for your words.
- **会社概要 table** — `about.html`. Rows reading 準備中 / To be confirmed need
  the real details from the 履歴事項全部証明書. Nothing there is invented.
- **Ventures** — `ventures.html`. Copy a `.bento__item` block to add another.

---

## Contact form

Out of the box the form opens the visitor's mail app with the message filled
in, so it works with no server. To receive submissions as email instead,
create a form at [Formspree](https://formspree.io) (or Basin, Web3Forms) and
put the endpoint in `assets/js/config.js`:

```js
formEndpoint: "https://formspree.io/f/xxxxxxxx",
```

---

## Running it locally

```bash
python3 -m http.server 4321
```

Then open http://localhost:4321.

---

## Notes

- Works without JavaScript: content, navigation, and both languages still
  render. JS adds the animation and the language toggle.
- Respects `prefers-reduced-motion` — all movement stops, nothing is lost.
- Follows the visitor's light/dark preference.
