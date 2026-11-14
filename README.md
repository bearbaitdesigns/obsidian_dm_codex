# DM Codex — an Obsidian toolkit for D&D Dungeon Masters

Campaign dashboard and toolkit for running D&D (2024 rules) in Obsidian. Works in **Live Preview**.

- **Dashboard** with tabs for sessions, party, NPCs, places, quests, encounters, bestiary, armory, spells, factions, ideas, taverns & shops, random tables and generators
- **Quick-create** for every note type, with templates and automatic `[[links]]`. Sessions number and chain themselves
- **Generators:** side quests, NPCs, taverns and shops (with priced inventories), plus about 20 built-in random tables
- **Armory:** 2024 weapons (with mastery), armor and gear catalogs, magic items, and party inventory tracking ("give to character")
- **Spells:** 2024 spellcasting rules, slot tables, a spell list, and a spell builder
- **Live tables** (`dm-list`), dice (`dice`), roll tables (`roll-table`) and quick buttons (`dm-actions`) as code blocks
- **Safe content updates:** reference notes ship inside the plugin, and *Update vault content* never overwrites notes you've edited

Pairs with **[DM Statblocks](https://github.com/bearbaitdesigns/obsidian_dm_statblocks)**: 2024 statblocks, a monster and villain builder with CR check, a random monster generator, an encounter builder and an initiative tracker.

## Install

### Option A: BRAT (recommended, gets automatic updates)
1. In Obsidian, install **BRAT** from *Settings → Community plugins → Browse*.
2. *Settings → BRAT → Add beta plugin* and enter `bearbaitdesigns/obsidian_dm_codex`. Repeat with `bearbaitdesigns/obsidian_dm_statblocks`.
3. Enable both plugins. BRAT checks for new releases when Obsidian starts.

### Option B: starter vault
Download **DM-Vault.zip** from the latest release, unzip it and *Open folder as vault*. It includes both plugins, the 2024 rules, the bestiary, the armory, spells, templates and a small example campaign.

### Option C: manual
Download `main.js`, `manifest.json` and `styles.css` from the latest release into `<vault>/.obsidian/plugins/dm-codex/`.

## Updating without losing anything
1. Update the plugin: BRAT does it for you. Otherwise, copy the release files over the old ones, or use **DM-Vault-Update.zip**, which contains plugins only.
2. Obsidian shows a *content update available* notice and a dashboard banner. Click it, or run **DM Codex: Update vault content**. You see the plan first:
   - new reference notes are **added**
   - reference notes you **haven't edited** are **refreshed**
   - notes you **edited** are **kept**, and for each you can *View new*, *Use new version* or *Keep mine*
   - notes you **deleted** stay deleted (unless you click *Restore*)
   - campaign notes (sessions, party, NPCs, places, quests, ideas, encounters, your own monsters and items) are **never touched**

Plugin settings are mirrored to `.obsidian/dm-vault-dm-codex-settings-backup.json` and restored automatically if `data.json` goes missing.

## Development

```
src/main.js              plugin source (plain JavaScript, no bundler)
styles.css, manifest.json, versions.json
content/gen_*.py         generate the vault notes (rules, spells, armory, bestiary, templates, example campaign)
tools/build.py           builds main.js = src/main.js + embedded content pack
.github/workflows/release.yml
```

```bash
python3 tools/build.py                                        # → main.js
python3 tools/build.py --vault "out/DM Vault" \
        --statblocks ../obsidian_dm_statblocks --zip          # → full starter vault + DM-Vault.zip
python3 tools/build.py --update-zip out/DM-Vault-Update.zip \
        --statblocks ../obsidian_dm_statblocks                # → plugins-only update zip
```

To test locally, symlink or copy `main.js`, `manifest.json` and `styles.css` into a test vault's `.obsidian/plugins/dm-codex/`.

**What's in the content pack:** everything under `Rules 2024/`, `Templates/`, `DM Tools/`, the SRD monsters in `Bestiary/`, the Armory catalog, `Home.md` and `How to Use This Vault.md`. See `is_managed()` in `tools/build.py`. Change the generators, bump the version, and users get the new notes through *Update vault content*.

### Releasing (GitHub Action)
The **Release** workflow (`.github/workflows/release.yml`) runs on every push to `main`, on tags, and on demand (*Actions → Release → Run workflow*). It:
1. reads `version` from `manifest.json` and checks it's listed in `versions.json`,
2. builds `main.js` with the content pack embedded,
3. builds `DM-Vault.zip` (starter vault) and `DM-Vault-Update.zip` (plugins only) using the latest [DM Statblocks](https://github.com/bearbaitdesigns/obsidian_dm_statblocks) release,
4. **creates** the release for that version, or, if it already exists, **replaces its files** with the fresh build.

To ship an update to BRAT users, bump the version, because BRAT only offers updates when the number goes up:
```bash
# manifest.json  → "version": "1.3.1"
# versions.json  → add "1.3.1": "1.4.0"   (minimum Obsidian version)
git commit -am "1.3.1" && git push
```
Pushes that don't change the version just refresh the current release's files (handy for fixes before anyone has updated).

### Notes
- The plugin uses a few undocumented Obsidian APIs (`app.commands`, `app.customCss`, `app.plugins`), all guarded. That's fine for BRAT. For the official community store, reviewers may ask for these to be removed.
- Both plugins are independent. DM Codex calls DM Statblocks commands only when they exist.

## Licence
Code: MIT. Game content includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd, licensed under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/legalcode). Rules text is summarised and paraphrased for table use.
