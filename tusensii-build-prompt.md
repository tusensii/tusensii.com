# Build & Launch tusensii.com

## Who you're working with

I'm Christopher. I designed this site and approved the mockups, but I'm an amateur at deployment and DevOps. Explain each step plainly, confirm before anything irreversible (DNS changes, deploys, deletions), and never assume I know how something works. My prior hosting experience: AWS ECR + AppRunner once, and Cloudflare (Pages/Workers) for thegreatmoviegame.biz and my personal MCP stack.

## What exists

In this directory (`coding/tusensii.com`) are two approved design mockups:

- `direction-b-home.html` — the homepage
- `direction-birds.html` — the bird photography page

**These mockups ARE the design spec.** The visual system is final: match it exactly. Do not "improve" the aesthetic, add sections, or restyle components. Your job is to productionize and launch, not redesign.

## Design system (extracted from the mockups — enforce it)

- **Colors:** `#FFFFFF` paper, `#141311` ink, `#1D4F2E` spruce green. Nothing else. No new accent colors, ever.
- **Type:** Anton (display, uppercase) + Archivo (everything else), via Google Fonts. No other fonts.
- **Structure:** 3px solid ink rules as the primary structural device; zero border-radius; the SVG film-grain overlay on every page; hard white/green panel splits.
- **Motion:** only what the mockups contain (marquee strip, plate scroll-reveal, hover inversions). All motion respects `prefers-reduced-motion`.

### Hard prohibitions (this site's entire premise is avoiding AI design tells)

Never introduce any of the following, even in new pages, error pages, or "helpful" additions: Inter, Space Grotesk, Geist, or Instrument Serif; purple or lavender anything; gradients; colored glows or colored box-shadows; glassmorphism; dark mode; rounded cards; colored left borders; icon-topped feature cards; emoji in UI; badges above headlines; stat banners; numbered 1-2-3 marketing steps; shadcn or any component library. If a task seems to need one of these, stop and ask me instead.

## Build tasks

1. **Repo setup.** Initialize a git repo here (if not already one) named `tusensii.com` under my GitHub account (`tusensii`). Sensible `.gitignore`, short README.
2. **Productionize the static site.** Keep it framework-free: plain HTML/CSS/JS. Refactor the two mockups into a real structure:
   - Extract shared CSS into one stylesheet (`/css/site.css`) with the design tokens as CSS custom properties; extract shared header/footer sensibly (a tiny build step or simple includes are fine — no React, no Tailwind, no bundler unless truly necessary).
   - Rename pages to real routes: `index.html` (from direction-b-home) and `/birds/index.html` (from direction-birds). Fix all internal links accordingly.
   - Keep total page weight small. No JS frameworks, no analytics scripts for now.
3. **Photo pipeline for the birds page.** Replace the dashed placeholder blocks with a simple system: an `/images/plates/` folder plus a small JSON or front-matter file where each plate entry has image path, species, binomial, locality, season, behavior, and remark. Generate the plate markup from that data (a tiny build script is fine). Ship it with the three existing placeholder plates intact so the page works before I add photos, and give me one-paragraph instructions for adding a new plate.
4. **Real links.** "Play it now" → `https://thegreatmoviegame.biz`. GitHub footer link → `https://github.com/tusensii`. The "About" nav item: create a minimal stub page in the same design language (masthead + one short paragraph placeholder I'll write later) so there are no dead links.
5. **Production hygiene.** Per-page `<title>` and meta descriptions, Open Graph tags (generate a simple OG image in the site's white/green/Anton style), favicon (a green square with a white ★ echoing the TUSENSII★ mark), semantic HTML, alt text conventions for plates, a 404 page in the same design language, `robots.txt`, and a check that all text passes WCAG AA contrast.
6. **Verify before launch.** Serve locally and check: both pages at desktop and ~380px mobile widths, keyboard navigation with visible focus, reduced-motion behavior, and that no prohibited pattern from the list above crept in. Show me screenshots or have me review locally before deploying.

## Launch tasks

7. **Host on Cloudflare Pages** (matches my existing setup; static and free). Connect the GitHub repo so pushes to `main` auto-deploy.
8. **Domain.** I own `tusensii.com`. Walk me through connecting it: tell me exactly what to check regarding where the domain is registered and what DNS records or nameserver changes are needed, step by step, and wait for my confirmation at each step. HTTPS must be working before we call it done.
9. **Smoke test production.** Verify tusensii.com and www redirect behavior, both pages, fonts loading, and the game link.

## Working agreement

- Work in small commits with clear messages.
- Ask rather than guess whenever the spec is ambiguous.
- When finished, give me: the live URL, the repo URL, how to add a bird plate, and how to add a future project panel to the homepage — each in a few plain sentences.
