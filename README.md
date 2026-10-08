<div align="center">

# HenryLabs Portfolio v0.79.0

**I build things I actually see.**

<picture>
  <source media="(prefers-reduced-motion: reduce)" srcset="public/assets/readme/universe-poster.webp" />
  <source type="image/webp" srcset="public/assets/readme/living-universe.webp" />
  <img src="public/assets/readme/living-universe.gif" alt="The real HenryLabs portfolio: three galaxies, a flight into HenryLabs, Catmoji and Nalira with orbiting technologies, then a return to the universe." width="960" />
</picture>

A personal universe of products, client systems, and things built while learning.
Designed and developed by **Henry Nugraha**, a product-minded developer in Indonesia.

[The Worlds](#the-worlds) · [University](#university) · [Client Work](#client-work) · [Credentials](#credentials) · [Contact](#contact)

[View the still image](public/assets/readme/universe-poster.webp)

</div>

## The Experience

Three galaxies. Ten project worlds. One maker.

Enter a living map of **HenryLabs**, **University**, and **Client Work**. Choose a galaxy, approach its planets, and explore the work behind each identity. Technologies orbit the projects they belong to; an optional reading panel brings the context, ownership, and evidence into view.

Beyond the map: Henry's working method, a technology orbit, and original credentials. A continuous Three.js universe connects the journey, from distant stars and nebulae to a reversible black-hole encounter at Contact. A metallic UFO and its pursuing scout add a small story along the way.

English is the default, with Indonesian available throughout the main experience. Keyboard navigation, touch controls, reduced motion, and a WebGL fallback keep the work accessible.

The animation above is a short recording of the actual portfolio, not a concept render. The live experience is interactive; the README is a preview. Public hosting is still deferred.

## The Worlds

<details>
<summary><strong>A closer look at the project orbits</strong></summary>

<img src="public/assets/readme/project-orbits.webp" alt="Catmoji at the center of the HenryLabs orbit, surrounded by Nalira, Canox, Hengs, Polara, and their technology satellites. The reading panel is closed." width="960" />

Original project marks become transparent three-dimensional identities. Select a world to bring it into focus, follow its technology satellites, and open its context when you want to read.

</details>

| World | What I Built | Explore |
| :-- | :-- | :-- |
| <img src="public/assets/brand/catmoji.png" width="28" alt="" /> **Catmoji** | Hand gestures become emotions, cat stickers, and voice in a playful browser experience. | [Live product](https://catmoji.vercel.app/) · [Source](https://github.com/nugrahahenry/AI-Gesture-Cat) |
| <img src="public/assets/brand/nalira.svg" width="28" alt="" /> **Nalira** | An audio-to-knowledge workflow for lectures, meetings, and ideas worth revisiting. | [Public MVP](https://nalira-hengs.vercel.app/dashboard) |
| <img src="public/assets/brand/canox.png" width="28" alt="" /> **Canox** | A personal AI cockpit connecting tools, context, and everyday workflows. | Private walkthrough |
| <img src="public/assets/brand/hengs.png" width="28" alt="" /> **Hengs** | A WhatsApp focus assistant and Discord community bot built around useful handoffs. | Private evidence |
| <img src="public/assets/brand/polara.png" width="28" alt="" /> **Polara** | A browser photobooth where the interface becomes part of the memory. | In progress; preview on request |

These are solo product and system builds. Public repositories are linked where available; private work is represented through sanitized evidence and focused walkthroughs.

## University

Three projects I built end to end, from the business flow to the interface and system logic.

| Project | Course | Focus |
| :-- | :-- | :-- |
| **RentalMobil.SG** | Semester 2, Object-Oriented Programming | Car rental workflows with PHP and MySQL. |
| **POS Z Shoes** | Semester 3, Business Process Analysis and System Design | Point-of-sale workflows with C# and WinForms. |
| **LabQ** | Semester 4, Mobile and Web Programming | Health laboratory workflows across Android and web, using Java, Laravel, and PostgreSQL. |

## Client Work

**Y-Ventures Chatbot** connects researched vendor information with event-planning conversations through n8n. Filtering, price sorting, and quote calculation support the matching workflow. Solo implementation by Henry.

**Soreva Autonomous Content** connects discovery, editorial generation, branded media, review, scheduling, and controlled publishing. Henry built the automation; Vieri contributed the prototype account. Private material stays outside this repository.

## Credentials

The portfolio includes **26 original certificates, badges, and participation records**, with five featured records shown first. **Google Student Ambassador, Class of 2026** leads the selection, alongside Google/Gemini learning, Dicoding coursework, competitions, and workshops.

<p align="center">
  <a href="public/assets/certificates/source/google-student-ambassador.pdf">
    <img src="public/assets/readme/google-student-ambassador.webp" alt="Original Google Student Ambassador certificate for Henry Nugraha, Class of 2026. Open the source PDF." width="720" />
  </a>
</p>

<table>
  <tr>
    <td width="50%" align="center">
      <a href="public/assets/certificates/previews/gemini-certified-educator.png"><img src="public/assets/readme/gemini-certified-educator.webp" alt="Henry's original Gemini Certified Educator record. Open the full-size image." width="430" /></a><br />
      <strong>Gemini Certified Educator</strong><br />Google for Education
    </td>
    <td width="50%" align="center">
      <a href="public/assets/certificates/previews/dicoding-oop.png"><img src="public/assets/readme/dicoding-oop.webp" alt="Henry's original Dicoding Belajar Prinsip Pemrograman SOLID course completion record. Open the full-size image." width="430" /></a><br />
      <strong>Belajar Prinsip Pemrograman SOLID</strong><br />Dicoding course completion
    </td>
  </tr>
</table>

Records retain their issuer and type, with full-size previews and source PDFs where available. Course completions, badges, and professional certifications remain distinguishable.

## Built With

**Next.js · React · TypeScript · Three.js · Motion · GSAP · Lenis**

The spacecraft, orbital motion, project sculptures, and deep-space atmosphere are authored for this experience. Real project marks and original credential artwork anchor the visual world.

## Run Locally

```sh
npm ci
npm run dev
```

Open the local address printed by Next.js. For verification: `npm test`, `npm run typecheck`, and `npm run build`. Browser checks live in `tests/`.

This portfolio is **actively being developed**. Hosting is deferred; the planned personal portrait and dedicated project/credential libraries are not yet part of the shipped interface. The original `henrylabs-useful-worlds.html` remains a legacy prototype.

<details>
<summary>About the README visuals</summary>

All media is stored in this repository. The animated tour and stills are captured from the running portfolio. Certificate thumbnails are resized from the original public records, linked above; no certificate content is generated or altered. The still image is also supplied for reduced-motion readers.

To refresh the preview after an interface change, start the portfolio on port 3002 and run:

```sh
node scripts/capture-readme.mjs
python scripts/encode-readme.py
```

The capture uses the installed Playwright package and an isolated Chrome instance. Set `PORTFOLIO_URL` or `CHROME_PATH` for a different local address or Chrome executable. Encoding requires Pillow. Raw captures stay in the ignored `test-results/readme-frames/` directory; only the optimized exports in `public/assets/readme/` are published. Animated WebP preserves the nebula colors; GIF is the fallback. Their export budgets are two and six megabytes respectively, and the GIF uses one shared palette to avoid color flicker.

</details>

## Contact

[LinkedIn](https://www.linkedin.com/in/nugrahahenry/) · [GitHub](https://github.com/nugrahahenry) · [Instagram](https://instagram.com/hnry.dev) · [Email](mailto:henrynugraha1210@gmail.com) · [Start a Project](https://wa.me/6289513559554)

---

Internal planning and runtime data stay private. Project artwork and selected original credential records are included for portfolio presentation. Set `NEXT_PUBLIC_SITE_URL` when choosing the final public host.
