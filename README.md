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
404.html          shown for any address that doesn't exist

sitemap.xml       list of pages, for search engines
robots.txt        points at the sitemap

assets/css/tokens.css      colours, type sizes, spacing, motion timing
assets/css/base.css        reset, typography, grid, print styles
assets/css/components.css  header, buttons, cards, forms, footer
assets/css/motion.css      every animation
assets/js/config.js        contact form endpoint + email address
assets/js/machinery.js     the gears, governor, cam, ratchet, piston, belt
assets/img/shift-logo.svg  the logo, as vector
assets/img/og-card.png     the picture shown when the link is shared
assets/img/og-card.svg     the source that PNG is rendered from
```

### The link-share picture

When you paste the site link into LINE, WhatsApp, Slack or X, they show
`assets/img/og-card.png`. To change it, edit `og-card.svg` and re-render:

```bash
qlmanage -t -s 1200 -o /tmp/og assets/img/og-card.svg
sips -c 630 1200 /tmp/og/og-card.svg.png --out assets/img/og-card.png
```

The card is 1200×630 drawn on a 1200×1200 canvas — the thumbnailer stretches
the short side otherwise, so the square is deliberate and the crop takes the
middle band back out.

### Both languages live in the HTML

Every piece of text ships in Japanese and English side by side:

```html
<span class="ja">日本語のテキスト</span><span class="en">English text</span>
```

The header toggle just switches which set is visible. To change wording, edit
both spans. Japanese is the default; the choice is remembered per visitor.

### Changing the colours

All of them are in `assets/css/tokens.css`, at the top. Change `--c-accent`
and the whole site follows — buttons, links, the accent parts of the
machinery, focus rings.

### Things marked for you

Search the HTML for `GUTO:` — those comments mark the places left deliberately
unfinished:

- **The SHIFT explanation** — `index.html` (`#about-shift`) and `about.html`.
  Placeholder paragraphs, waiting for your words.
- **会社概要 table** — `about.html`. Rows reading 準備中 / To be confirmed need
  the real details from the 履歴事項全部証明書. Nothing there is invented.
- **Venture links** — `index.html` and `ventures.html`. The rows are not linked
  yet because the URLs aren't known. The markup to wrap a row in is sitting in
  a comment right above the list. Copy a `.vrow` block to add another venture.

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
