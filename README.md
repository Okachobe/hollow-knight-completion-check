<p align="center">
  <a href="https://okachobe.github.io/hollow-knight-completion-check/" target="_blank">
  <img src="https://img.shields.io/static/v1?label=Live&message=Web%20App&color=febb00&style=for-the-badge&logo=leaflet"></a>
  <a href="https://ko-fi.com/okachobe" target="_blank">
  <img src="https://img.shields.io/static/v1?label=Support&message=Ko-fi&color=ff5e5b&style=for-the-badge&logo=ko-fi"></a>
  <img src="https://img.shields.io/static/v1?label=License&message=GPL--3.0&color=grey&style=for-the-badge">
</p>

# Knight's Ledger

A completion tracker & save analyzer for **Hollow Knight**. Load your save and see
exactly what you still have left for 112% Game Completion, True Completion, the
Hunter's Journal, achievements, and every hidden thing in between — with a
spoiler-free hint system and an **interactive map of Hallownest** that pins what
you're still missing, region by region.

**➡️ Use it here: [okachobe.github.io/hollow-knight-completion-check](https://okachobe.github.io/hollow-knight-completion-check/)**

> This is an unofficial, fan-made tool and is **not affiliated with, endorsed by,
> or sponsored by Team Cherry**. Hollow Knight and all related characters,
> artwork, names, and assets are © Team Cherry.

## Features

- **Game Status & completion %** — Game Completion, True Completion, and a live
  percentage for every sub-category, with content-pack detection (100% / 106% /
  107% / 112%).
- **Everything tracked in one ledger** — Charms, Mask Shards, Vessel Fragments,
  Grubs, Whispering Roots, Relics, Geo Caches, Spells, Abilities, Nail Arts,
  Bosses, the full Hunter's Journal, Dreamers & Dream Warriors, the Colosseum,
  Godhome / Pantheons, Lore, Secrets, and Game Statistics.
- **🗺️ Cartographer's Atlas** — an interactive, pan/zoom map of Hallownest with
  clustered, category-coloured pins for the items you still need. Filter pins by
  category, toggle spoilers, and hide what you've already found.
- **Spoiler-free hints** — optional, progress-aware clues for when you're stuck,
  without dumping the whole map on you.
- **Filters that stick** — Spoilers and Incomplete-only toggles, remembered
  between visits, plus a Hollow Knight Wiki link on every entry.

## How to use

There are two ways to load a save:

1. **File mode (simple):** choose your `user*.dat` save file and the analysis
   runs automatically. See [save locations](#save-game-locations) below.
   The tool never modifies your files, but always keep backups just in case.

2. **Text mode (advanced):** for sharing saves as text. Decode your `user*.dat`
   with bloodorca's [Online Save Editor](https://bloodorca.github.io/hollow),
   copy the decoded text, paste it into the tool's text box, and click
   **Analyze Text**.

## Save game locations

- **Steam Cloud:** download your save directly from your
  [Steam remote storage](https://store.steampowered.com/account/remotestorageapp/?appid=367520).
- **Windows:** `%USERPROFILE%\AppData\LocalLow\Team Cherry\Hollow Knight\`
- **Linux:** `~/.config/unity3d/Team Cherry/Hollow Knight/`
- **macOS:** `~/Library/Application Support/unity.Team Cherry.Hollow Knight/`

Filenames: `user*.dat` is the main save (`*` = slot 1–4); `user*.dat.bak1` is an
auto-backup; `user*_[version].dat` is a per-update backup copy.

## Run it offline

It's pure client-side JavaScript, so it works in any modern browser with no
internet connection — everything happens on your device. Download the source,
open the `/docs` folder, and launch `index.html` (only `/docs` is needed to run).

## Support

Knight's Ledger is free. If it helped and you'd like to chip in toward development
time, hosting, and a domain, you can **[buy me a coffee on Ko-fi](https://ko-fi.com/okachobe)**.
Donations support the maintainer's time and hosting only.

## Origins

Forked from [hollow-knight-completion-check](https://github.com/ReznoRMichael/hollow-knight-completion-check)
by **rezno[R]**, whose original tool and save-file parser this is built on. Used
under the [GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html) license. Rebuilt,
redesigned, and maintained by [Okachobe](https://github.com/Okachobe).

## Credits & thanks

- **Save decoding:** [bloodorca](https://bloodorca.github.io/hollow) and
  [KayDeeTee](https://github.com/KayDeeTee/Hollow-Knight-SaveManager)'s save editors.
- **Boss portrait art:** [Hollow Knight Wiki](https://hollowknight.fandom.com/),
  © Team Cherry — used under CC BY-SA where applicable.
- Geo Rock data contributed by
  [Araraura](https://github.com/ReznoRMichael/hollow-knight-completion-check/pull/9).
- Hollow Knight © [Team Cherry](https://teamcherry.com.au/).

## Built with

JavaScript (ES2015), Webpack, Babel, core-js, Tailwind CSS, Leaflet +
Leaflet.markercluster, AES-JS, ESLint.

## License

[GPL-3.0](LICENSE). Because this project builds on rezno[R]'s GPL-3.0 licensed
work, it remains under the same license — you're free to use, study, share, and
modify it under those terms.
