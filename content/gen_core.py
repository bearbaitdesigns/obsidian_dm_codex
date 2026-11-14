import json, os, sys, time
V = sys.argv[1]

def w(path, text):
    p = os.path.join(V, path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(text.lstrip('\n'))

def j(path, obj): w(path, json.dumps(obj, indent=2) + '\n')

# ---------------- .obsidian config (Live Preview first) ----------------
j('.obsidian/app.json', {
    "livePreview": True, "defaultViewMode": "source", "propertiesInDocument": "visible",
    "alwaysUpdateLinks": True, "newLinkFormat": "shortest", "useMarkdownLinks": False,
    "showInlineTitle": True, "readableLineLength": True, "showUnsupportedFiles": False,
    "newFileLocation": "folder", "newFileFolderPath": "Planning/Inbox",
    "attachmentFolderPath": "Assets", "foldHeading": True, "foldIndent": True,
    "userIgnoreFilters": ["Templates/"]
})
j('.obsidian/appearance.json', {"accentColor": "#b5522b", "baseFontSize": 16, "enabledCssSnippets": ["dm-vault-callouts"]})
CALLOUTS = [("quest", "196, 140, 40", "lucide-scroll"), ("read-aloud", "140, 100, 200", "lucide-book-open"), ("secret", "200, 45, 45", "lucide-eye-off"),
            ("rule", "60, 130, 200", "lucide-scale"), ("npc", "50, 160, 90", "lucide-user")]
css = "/* DM Vault custom callouts. A CSS snippet, so it works with plugins disabled.\n   Colours are set explicitly (not only via --callout-color) so themes can't wash them out. */\n"
for name, rgb, icon in CALLOUTS:
    base = f'.callout[data-callout="{name}"]'
    sel = lambda suffix='': ", ".join(f"{p}{base}{suffix}" for p in ["body ", "body.theme-dark ", "body.theme-light ", ".markdown-rendered ", ".markdown-source-view "])
    css += sel() + " {\n  --callout-color: " + rgb + " !important;\n  --callout-icon: " + icon + " !important;\n  background-color: rgba(" + rgb + ", 0.12) !important;\n  border-left: 4px solid rgb(" + rgb + ") !important;\n  border-color: rgb(" + rgb + ") !important;\n}\n"
    css += sel(" .callout-title") + ", " + sel(" .callout-title-inner") + ", " + sel(" .callout-icon") + ", " + sel(" .callout-fold") + " {\n  color: rgb(" + rgb + ") !important;\n}\n"
    css += sel(" .callout-icon svg") + " {\n  color: rgb(" + rgb + ") !important;\n  stroke: rgb(" + rgb + ") !important;\n}\n"
css += """
/* read-aloud text in italics so it stands out at the table */
body .callout[data-callout="read-aloud"] .callout-content { font-style: italic; }
"""
w('.obsidian/snippets/dm-vault-callouts.css', css)
j('.obsidian/core-plugins.json', {
    "file-explorer": True, "global-search": True, "switcher": True, "graph": True, "backlink": True,
    "canvas": True, "outgoing-link": True, "tag-pane": True, "properties": True, "page-preview": True,
    "daily-notes": False, "templates": True, "note-composer": True, "command-palette": True,
    "slash-command": True, "editor-status": True, "bookmarks": True, "markdown-importer": False,
    "zk-prefixer": False, "random-note": True, "outline": True, "word-count": True, "slides": False,
    "audio-recorder": False, "workspaces": True, "file-recovery": True, "publish": False, "sync": False
})
j('.obsidian/community-plugins.json', ["dm-codex", "dm-statblocks"])
j('.obsidian/templates.json', {"folder": "Templates", "dateFormat": "YYYY-MM-DD"})
j('.obsidian/types.json', {"types": {
    "session_number": "number", "level": "number", "ac": "number", "hp_max": "number", "init_bonus": "number",
    "passive_perception": "number", "date": "date", "created": "date", "players": "multitext", "npcs": "multitext",
    "locations": "multitext", "tags": "tags", "aliases": "aliases", "environment": "multitext"}})
now = int(time.time() * 1000)
j('.obsidian/bookmarks.json', {"items": [
    {"type": "file", "ctime": now, "path": "Home.md", "title": "Home"},
    {"type": "file", "ctime": now, "path": "How to Use This Vault.md", "title": "How to use"},
    {"type": "file", "ctime": now, "path": "DM Tools/Generators.md", "title": "Generators"},
    {"type": "file", "ctime": now, "path": "DM Tools/Encounter Builder.md", "title": "Encounter builder"},
    {"type": "file", "ctime": now, "path": "Rules 2024/Rules 2024 Index.md", "title": "Rules 2024"},
    {"type": "file", "ctime": now, "path": "Bestiary/Bestiary Index.md", "title": "Bestiary"},
]})
def rgb(h): return int(h.lstrip('#'), 16)
j('.obsidian/graph.json', {"colorGroups": [
    {"query": "path:Campaign/Sessions", "color": {"a": 1, "rgb": rgb('#e69a28')}},
    {"query": "path:Campaign/Party", "color": {"a": 1, "rgb": rgb('#3b82f6')}},
    {"query": "path:World/NPCs", "color": {"a": 1, "rgb": rgb('#22a35a')}},
    {"query": "path:World/Places", "color": {"a": 1, "rgb": rgb('#8b5cf6')}},
    {"query": "path:World/Factions", "color": {"a": 1, "rgb": rgb('#dc2626')}},
    {"query": "path:Campaign/Quests", "color": {"a": 1, "rgb": rgb('#eab308')}},
    {"query": "path:Bestiary", "color": {"a": 1, "rgb": rgb('#7a200d')}},
    {"query": "path:\"Rules 2024\"", "color": {"a": 1, "rgb": rgb('#64748b')}},
], "showTags": False, "showAttachments": False, "hideUnresolved": True, "search": "-path:Templates"})
j('.obsidian/plugins/dm-codex/data.json', {"campaignName": "The Ashen Crown"})

# ---------------- Templates ----------------
T = {}
T['Session'] = '''---
type: session
session_number: {{number}}
date: {{date}}
campaign: "{{campaign}}"
status: planned
players: []
locations: []
npcs: []
prev: "{{prev}}"
next: ""
tags: [session]
---
# {{title}}

> [!info] Navigation
> Previous: {{prev}} · [[Home]] · Use the `next` property to jump forward.

## Recap
> [!read-aloud] Last time…
>

## Strong start
*How does the session open with action or tension?*

## Scenes & beats
- [ ]

## Secrets & clues
*Things the players could discover — tick them off when revealed.*
- [ ]
- [ ]
- [ ]

## Encounters
```encounter
title: Possible fight
monsters:
  - Goblin Warrior x3
```

## Session log
*Write during play. Type `[[` to link NPCs and places, or use the command “DM Codex: New NPC” mid-sentence to create and link in one go.*


## Loot & XP
| Item | Who has it |
| --- | --- |
|  |  |

## Threads & follow-ups
- [ ]

## Ideas for next time
'''
T['Session Prep'] = '''---
type: prep
for_session: ""
date: {{date}}
tags: [prep]
---
# {{title}}

> [!tip] Eight-step prep
> 1. Review the characters  2. Strong start  3. Potential scenes  4. Secrets & clues  5. Fantastic locations  6. Important NPCs  7. Relevant monsters  8. Magic item rewards

## 1. Characters
```dm-list
type: player
status: active
```

## 2. Strong start

## 3. Potential scenes
-

## 4. Secrets & clues
- [ ]

## 5. Locations
-

## 6. NPCs
-

## 7. Monsters
```encounter
monsters:
  - Bandit x4
```

## 8. Rewards
-

## Side quest seed
```sidequest
```
'''
T['Player Character'] = '''---
type: player
character: "{{title}}"
player: ""
species: ""
class: ""
subclass: ""
background: ""
level: 1
ac: 10
hp_max: 10
init_bonus: 0
passive_perception: 10
spell_save_dc:
status: active
tags: [pc]
---
# {{title}}

> [!npc]- At a glance
> **Player:** · **Species/Class:** · **Background:**
> **Languages:** · **Notable senses:**

## Concept
*One sentence: who are they?*

## Backstory hooks
-

## Goals & motivations
-

## Bonds, flaws & fears
- **Bond:**
- **Flaw:**
- **Fear:**

## Relationships
*Link NPCs and other PCs: `[[Name]]` — how they feel about each other.*
-

## Secrets only the DM knows
> [!secret]
>

## Magic items & notable gear
-

## Sessions featuring this character
```dm-list
type: session
where: any
sort: session_number
fields: [date, status]
```
'''
T['NPC'] = '''---
type: npc
role: ""
species: ""
location: ""
faction: ""
attitude: indifferent
status: alive
first_seen: ""
tags: [npc]
---
# {{title}}

> [!npc] Quick reference
> **Look:**
> **Voice / mannerism:**
> **Wants:**
> **Fears:**

## Description

## Personality & roleplay notes

## Secret
> [!secret]
>

## Relationships
-

## Statblock
*Embed a bestiary entry, e.g. `![[Bandit]]`, or reuse one with a new name:*
```statblock
monster: Bandit
rename: "{{title}}"
```

## Appearances
```dm-list
type: session
where: any
sort: session_number
fields: [date]
empty: Not seen in a session yet.
```
'''
T['Place'] = '''---
type: place
place_type: town
region: ""
parent: ""
tags: [place]
---
# {{title}}

> [!read-aloud] First impression
> *What do the characters see, hear and smell?*

## Overview

## Points of interest
```dm-list
type: place
where: parent
fields: [place_type]
empty: No sub-locations yet. Set another place's `parent` to this note.
```

## Who is here
```dm-list
type: npc
where: location
fields: [role, attitude, status]
empty: No NPCs placed here yet. Set an NPC's `location` to this note.
```

## Quests here
```dm-list
type: quest
where: location
fields: [status, giver]
empty: No quests here yet.
```

## Encounters here
```dm-list
type: encounter
where: location
fields: [difficulty, xp, status]
empty: No saved encounters here yet — use the encounter builder.
```

## Secrets
> [!secret]
>

## Random encounters
```roll-table
title: Encounter here
1-3: Nothing — but the characters hear something in the distance
4: A travelling merchant
5: [[Wolf]] ×2 hunting
6: A local asks for help (roll a [[Generators|side quest]])
```

## Session history
```dm-list
type: session
where: any
sort: session_number
fields: [date]
empty: Not visited yet.
```
'''
T['Quest'] = '''---
type: quest
status: hook
giver: ""
location: ""
reward: ""
level: ""
tags: [quest]
---
# {{title}}

## Hook
*How do the characters learn about it?*

## Objective

## Steps
- [ ]
- [ ]

## Complications

## Resolution
*What happens if they succeed? Fail? Ignore it?*

## Mentioned in
```dm-list
where: any
fields: [type]
empty: Not linked from anywhere yet.
```
'''
T['Faction'] = '''---
type: faction
alignment: ""
leader: ""
base: ""
attitude: neutral
tags: [faction]
---
# {{title}}

## Goal

## Methods

## Resources

## Members
```dm-list
type: npc
where: faction
fields: [role, location, status]
empty: No members yet. Set an NPC's `faction` to this note.
```

## Clocks
- [ ] [ ] [ ] [ ] Plan advances when the party ignores them

## Secrets
> [!secret]
>
'''
T['Item'] = '''---
type: item
item_type: Wondrous Item
rarity: uncommon
attunement: false
holder: ""
tags: [item]
---
# {{title}}

*Wondrous item, uncommon*

## Description

## Properties

## History & lore
'''
T['Idea'] = '''---
type: idea
status: raw
category: ""
created: {{date}}
tags: [idea]
---
# {{title}}

*Raw idea → developing → used. Link anything it connects to.*

## The idea

## Could connect to
-

## Where it could show up
-
'''
T['Story Arc'] = '''---
type: arc
status: planned
act: 1
tags: [arc]
---
# {{title}}

## Premise

## Villain / pressure

## Beats
1.
2.
3.

## Ideas feeding this arc
```dm-list
type: idea
where: any
fields: [status]
```

## Quests in this arc
```dm-list
type: quest
where: any
fields: [status]
```
'''
T['Encounter'] = '''---
type: encounter
status: planned
difficulty: ""
xp: 0
location: ""
session: ""
environment: []
tags: [encounter]
---
# {{title}}

*Tip: the **Encounter builder** (ribbon shield icon, or “DM Statblocks: Build a new encounter”) fills all of this in for you.*

> [!read-aloud] Setup
> 

```encounter
title: "{{title}}"
monsters:
  - Bandit x3
```

## Terrain & features
- 

## Tactics
- 

## Treasure
- 
'''
T['Weapon'] = '''---
type: weapon
category: Martial Melee
damage: 1d8
damage_type: Slashing
properties: []
mastery: ""
weight: ""
cost: ""
magic_bonus: 0
rarity: ""
holder: ""
quantity: 1
tags: [armory, weapon]
---
# {{title}}

*Tip: “DM Codex: New Weapon” opens a form with a live preview.*
'''
T['Armor'] = '''---
type: armor
category: Medium
ac: ""
strength: ""
stealth: ""
weight: ""
cost: ""
holder: ""
tags: [armory, armor]
---
# {{title}}
'''
T['Gear'] = '''---
type: gear
category: Adventuring Gear
cost: ""
weight: ""
holder: ""
quantity: 1
tags: [armory, gear]
---
# {{title}}
'''
T['Spell'] = '''---
type: spell
level: 1
school: Evocation
casting_time: Action
range: 60 feet
components: V, S
duration: Instantaneous
concentration: false
ritual: false
classes: []
source: Homebrew
tags: [spell]
---
# {{title}}

*Tip: “DM Codex: New Spell” opens a form with a live preview.*
'''
T['Monster'] = '''---
type: monster
cr: 1
creature_type: ""
environment: []
source: Homebrew
tags: [monster]
---
# {{title}}

```statblock
name: "{{title}}"
size: Medium
type: Humanoid
alignment: Neutral
ac: 13
initiative: 1
hp: 22
hit_dice: 4d8 + 4
speed: 30 ft.
str: 12
dex: 12
con: 12
int: 10
wis: 10
cha: 10
saves: []
skills: Perception +2
senses: Passive Perception 12
languages: Common
cr: 1
traits: []
actions:
  - name: Multiattack
    desc: "The creature makes two Strike attacks."
  - name: Strike
    desc: "*Melee Attack Roll:* +3, reach 5 ft. *Hit:* 4 (1d6 + 1) Bludgeoning damage."
bonus_actions: []
reactions: []
```

## Tactics

## Encounters
```dm-list
where: any
fields: [type]
```
'''
for k, v in T.items(): w(f'Templates/{k}.md', v)

# ---------------- Home & guide ----------------
w('Home.md', '''---
cssclasses: [dm-home]
---
# The Ashen Crown — DM Home

```dm-actions
dashboard
session
prep
encounter
npc
place
quest
idea
latest
```

```dm-actions
sidequest
npcgen
tavern
shop
tables
dice
tracker
```

```dm-actions
builder
villain
randommonster
armory
weapon
spell
```

## Sessions
```dm-list
type: session
sort: -session_number
fields: [date, status]
limit: 6
```

## The party
```dm-list
type: player
status: active
```

## Open quests
```dm-list
type: quest
status: [hook, active]
fields: [status, giver, location]
```

## Planned encounters
```dm-list
type: encounter
status: planned
fields: [difficulty, xp, location, session]
empty: No saved encounters yet — click Encounter above.
```

## Villains
```dm-list
type: monster
villain: true
fields: [cr, creature_type, status]
empty: No villains yet — click Build villain above.
```

## Story arcs
```dm-list
type: arc
fields: [status, act]
```

## Idea inbox
```dm-list
type: idea
status: [raw, developing]
sort: -modified
fields: [status, category]
limit: 10
```

## Quick reference
- [[Rules 2024 Index|2024 rules]] · [[Conditions]] · [[Actions in Combat]] · [[Weapon Mastery]] · [[Spellcasting Basics|Spellcasting]] · [[Spell List]] · [[Encounter Building]]
- [[Bestiary Index|Bestiary]] · [[Armory Index|Armory]] · [[Generators]] · [[Encounter Builder]] · [[Random Tables]]
- [[How to Use This Vault]]
''')

w('How to Use This Vault.md', '''# How to use this vault

This vault is built for **Live Preview** (Obsidian's default editing mode). Everything interactive — dashboards, dice, statblocks, generators, linked lists — is a code block that renders while you edit. Click the `</>` icon at the top-right of any block to edit its source.

## First run
1. Open this folder as a vault in Obsidian.
2. When prompted, choose **Trust author and enable plugins** (or Settings → Community plugins → turn off Restricted mode). The two plugins ship inside the vault — nothing to download.
3. Open [[Home]]. Click **Dashboard** for the full campaign view.
4. Settings → DM Codex: set your campaign name.

> [!tip] Callout colours
> The coloured boxes (red **secret**, green NPC **quick reference**, purple **read-aloud**, gold **quest**, blue **rule**) come from the CSS snippet `dm-vault-callouts`, which is switched on in this vault. If they show up plain blue, open **Settings → Appearance → CSS snippets**, click the refresh icon and turn on **dm-vault-callouts**. It works even with community plugins switched off, and with most themes. Delete or replace the example campaign (*The Ashen Crown*) whenever you like.

## The two plugins
| Plugin | What it does |
| --- | --- |
| **DM Codex** | Campaign dashboard (sessions, party, NPCs, places, quests, encounters, bestiary, armory, spells, factions, ideas, taverns & shops, random tables, generators), quick-create for every note type, link pickers, side quest / NPC / tavern / shop generators, built-in random tables, the Armory with inventory tracking, spell and item builders, dice and live `dm-list` tables. |
| **DM Statblocks** | 2024-format statblocks with clickable rolls, a monster & villain builder, a random monster generator, an encounter builder with saved encounters, `encounter` blocks with 2024 difficulty math, and an initiative / combat tracker in the right sidebar. |

## Creating and linking notes
- **Command palette** (`Ctrl/Cmd+P`) → `DM Codex: New NPC` (or Session, Place, Quest, Faction, Item, Idea, Story Arc, Session Prep, Player Character, Monster).
- **Create while writing:** select a word in a note, run `DM Codex: New NPC` — the name is pre-filled, the new note is created from the template, and a `[[link]]` replaces your selection.
- **Link existing notes:** `DM Codex: Insert link to NPC` (or Place, Quest…) gives a fuzzy picker of just that type. Or simply type `[[`.
- **Sessions number themselves.** `DM Codex: New Session` makes *Session 004 - Title*, links back to the previous session and writes a `next` link into it.
- Notes are typed by the `type` property (`session`, `player`, `npc`, `place`, `quest`, `faction`, `idea`, `arc`, `prep`, `monster`, `encounter`, `weapon`, `armor`, `gear`, `item`, `spell`). Folder doesn't matter — move things freely.

### Relationship properties
Set these properties to links and the right lists fill in on their own:

| On a… | Property | Shows up on |
| --- | --- | --- |
| NPC | `location: "[[Briarford]]"` | the place's **Who is here** |
| NPC | `faction: "[[The Ashen Hand]]"` | the faction's **Members** |
| Place | `parent: "[[Briarford]]"` | the parent's **Points of interest** |
| Quest | `location`, `giver` | the place's **Quests here** |
| Anything | a `[[link]]` anywhere | **Appearances / Session history** (`where: any`) |

## Code blocks
````markdown
```dm-list
type: npc            # one type or a list
where: location      # property on the other note that links HERE ("any" = any link)
status: [alive]      # any other key filters a property (prefix ! to exclude)
fields: [role, faction]
sort: -session_number   # name, modified, or any property; "-" = descending
limit: 10
```
````

````markdown
```dice
Attack: 1d20+5
Advantage: 1d20+5 adv
Fireball: 8d6
Stats: 4d6kh3
```
````

````markdown
```roll-table
title: Weather
1-3: Clear
4-5: Rain
6: Storm
```
````

- ` ```sidequest``` ` — the side quest generator, inline. Click any line to reroll just that part; save it as a Quest note (with links to a real NPC/place from your vault when it picks one) or as an Idea.
- ` ```random-npc``` ` — instant NPC; saving it from inside a Place note sets the NPC's location to that place.
- ` ```dm-actions``` ` — a row of quick buttons (see [[Home]]).
- ` ```statblock``` ` — see [[Bestiary Index]]. Use `monster: Bandit` + `rename: Captain Vex` to reuse a statblock under a new name.
- ` ```encounter``` ` — list monsters (`Goblin Warrior x4`), see 2024 difficulty against your active party, and click **Run this encounter** to load the tracker.

## Statblocks & the tracker
- Click an **attack bonus** to roll to hit (Shift = advantage, Alt = disadvantage). Click **damage dice** to roll damage (Shift = crit, double dice). Click ability mods and saves to roll them.
- **Add to combat** on any statblock sends it to the initiative tracker. **Add party** pulls every `type: player` note with `status: active` (uses `ac`, `hp_max`, `init_bonus`, `level`).
- In the tracker, type `-7` (damage), `+5` (heal), `t8` (temp HP) or `-2d6+3` in the HP box and press Enter. Bloodied is tracked automatically; concentration DCs pop up when a concentrating creature takes damage.
- Right-click a condition chip to remove it; left-click to open its rules note.

## Monsters, villains & encounters
- **Build a monster / villain** — *DM Statblocks: Create monster* or *Create villain / bad guy*, the Bestiary tab, or the buttons on [[Home]]. A form captures every statblock field with a **live 2024 statblock preview**, CR guidance, a hit-point calculator, and helpers that write 2024-style **attack** and **saving-throw** entries (pull weapon stats from the Armory). Villains get a profile (goal, lair, minions, weakness) and a scheme clock. Everything saves into the [[Bestiary Index|Bestiary]].
- **Edit** any statblock with the **Edit** button in its header.
- **CR check** — the builder reads the stats you've entered (effective HP after resistances and Legendary Resistance, AC, damage per round over three rounds with recharge abilities, attack bonus or save DC), works out a **defensive** and **offensive** CR, and compares their average with the CR you chose: ✓ when it's within one step, ▲/▼ with a one-click **Use CR X** when it isn't. *Apply typical AC/HP* goes the other way and fits the stats to your chosen CR.
- **Random monster** — shows the **suggested CR** for your settings as you change them (and in CR mode, what difficulty that CR is for your party and which CR would make a Moderate fight). It asks for **party level, party size and difficulty** (Low / Moderate / High) or a CR, how many monsters, creature type, role (brute, skirmisher, controller, leader) and boss (legendary actions). It builds a full statblock you can tweak in the builder, save to the Bestiary, or send to the tracker.
- **Encounters** — the **encounter builder** (shield icon in the ribbon, *DM Statblocks: Build a new encounter*, or the Encounters tab) shows live 2024 difficulty against your party. Add monsters from the Bestiary, click **Suggest encounter** (filters by environment), or **Generate new monster** to fill the remaining budget. Save as an encounter note in `Campaign/Encounters` (linked to a place and session), insert into the current note, or run it now. Encounter notes show up on [[Home]], on their place's page, and in the dashboard.

## Armory
- [[Armory Index|Armory]] holds catalogs for all 2024 **weapons** (with mastery), **armor**, common **gear**, and **magic items**.
- **New weapon / armor / gear / magic item** — forms with live preview (*DM Codex: New Weapon* etc.).
- **Track who has what** — open an item and run *DM Codex: Give this item to a character*. Catalog items are copied with a `holder` and `base` link; items already held change hands. Each character note lists their **Equipment**, and the Armory tab groups the whole **party inventory** by character (including a *Party stash*).

## Spells
- [[Spellcasting Basics|Spellcasting rules]], [[Areas of Effect]], [[Spell Slots by Class]] and the [[Spell List]] (by level and by class).
- **New spell** — *DM Codex: New Spell* opens a form (level, school, casting time, components, classes, concentration, ritual, effect, upcasting).
- The dashboard **Spells** tab is searchable; link spells anywhere with `[[Fireball]]`.

## Taverns, shops & random tables
- **Taverns & shops** — tavern/inn, potion shop, general store, blacksmith & armory, magic curios and black market, sized village → metropolis. You get a name, proprietor, first impression, priced menu or inventory (2024 equipment prices; magic items priced by 2024 rarity guidelines), what they buy, rumours and a DM secret. **Save as place** creates the shop (inside a settlement you pick) *and* its proprietor as a linked NPC. Use the ribbon, the dashboard tab, commands, or a ` ```shop``` ` block.
- **Random tables** — built into DM Codex: weather, encounters (road, forest, urban), dungeon dressing, traps, rumours, tavern events, NPC quirks, plot twists, treasure, pocket contents, trinkets, magic item quirks and names. Roll from the **Random Tables** tab, the ribbon or *DM Codex: Roll on a random table*; insert results into your note. Every ` ```roll-table``` ` you write in any note is added automatically, and `table: Weather` inside a roll-table block reuses a built-in table.

## Updating the vault (without losing anything)
Your notes and the plugins are separate, so updates never need to touch your campaign.

1. Download the **DM Vault update** zip. It contains only the two plugin folders (`dm-codex`, `dm-statblocks`): no notes, no settings.
2. In Obsidian: **Settings → Community plugins**, then click the **folder icon** next to *Installed plugins* to open the plugins folder.
3. Copy the two folders from the zip into it and **replace the files** when asked. (On a Mac, Finder's *Replace* swaps the whole folder; that's fine, because both plugins keep a backup of their settings and restore it automatically.)
4. Back in Obsidian, turn both plugins off and on again (or restart Obsidian).
5. A notice and a banner on the dashboard offer **Review & update**. You can also run *DM Codex: Update vault content*. You'll see a plan before anything changes:
   - **new** reference notes (rules, spells, Armory, SRD monsters, templates, DM tools) are **added**;
   - reference notes you **haven't edited** are **refreshed**;
   - notes you **have edited** are **kept as yours**, and for each one you can *View new*, *Use new version* or *Keep mine*;
   - notes you **deleted** are **not re-added** (unless you click *Restore*);
   - your **campaign notes** (sessions, party, NPCs, places, quests, ideas, encounters, your own monsters and items) are **never touched**.

> [!tip] Belt and braces
> Before any update it's still worth backing up the vault folder (or using Obsidian Sync / git).

## Customising
- Edit anything in `Templates/` — new notes are created from those files. Variables: `{{title}}`, `{{date}}`, `{{number}}`, `{{prev}}`, `{{campaign}}`, `{{link}}`.
- Add your own generator entries in [[Side Quest Tables]] and [[NPC Tables]].
- The core **Templates** plugin also points at `Templates/` if you prefer inserting templates manually.

## Rules content
The [[Rules 2024 Index|2024 rules]] and the [[Bestiary Index|bestiary]] summarise material from the *System Reference Document 5.2* (SRD 5.2) by Wizards of the Coast, licensed under CC-BY-4.0. Rules notes are written as quick-reference summaries; check the full SRD or the Player's Handbook when a ruling matters.
''')

# ---------------- DM Tools ----------------
w('DM Tools/Generators.md', '''# Generators

## Side quest
```sidequest
```

## Random NPC
```random-npc
```

## Dice
```dice
d20: 1d20
Advantage: 1d20 adv
Disadvantage: 1d20 dis
Percentile: 1d100
Ability scores: 4d6kh3
Treasure (copper): 5d6
```

## Taverns & shops
```shop
type: tavern
size: town
```

## Monsters
```monster-tools
```

## Random tables
Every built-in table plus any `roll-table` block in your vault:
```random-tables
```

See also [[Random Tables]] and [[Side Quest Tables]].
''')
w('DM Tools/Side Quest Tables.md', '''# Side quest tables

The side quest generator always uses its built-in tables. Anything you list here is **added** to them. To use *only* your own entries for a table, write the heading as `## hook (replace)`.

Valid headings: `giver`, `hook`, `objective`, `location`, `complication`, `twist`, `reward`, `urgency`.

## hook
- The Ashen Hand has been seen buying every candle in Briarford.
- A crown-shaped burn mark appears on a farmer's barn door.

## location
- the ruined chapel on Gallows Hill
- the old mill on the Thornwood road

## reward
- a sliver of the Ashen Crown that whispers useful secrets (and some that are not)
''')
w('DM Tools/NPC Tables.md', '''# NPC tables

Entries here are **added** to the NPC generator's built-in tables. Use `## first (replace)` to replace a table entirely.

Valid headings: `first`, `last`, `species`, `occupation`, `appearance`, `voice`, `want`, `secret`, `attitude`.

## first
- Ottoline
- Garrick

## occupation
- candle-maker
- Ashen Hand informant
''')
w('DM Tools/Random Tables.md', '''# Random tables

Click a button to roll. Edit the block (`</>` icon) to change entries — use `1-3: text` for weighted ranges. Links work inside entries, and `{2d6}` inside an entry is rolled for you.

**Built into the plugin:** DM Codex ships with tables for weather, road/forest/urban encounters, dungeon dressing, traps, rumours, tavern events, NPC quirks, plot twists, treasure, pocket contents, trinkets, magic item quirks and names. Roll them from the dashboard's **Random Tables** tab, the ribbon, or *DM Codex: Roll on a random table*. Every `roll-table` block you write in **any** note also shows up there.

Use a built-in table inside a note:
```roll-table
table: Weather
```

## Road encounters (levels 1–4)
```roll-table
title: Road encounter
1-2: Nothing — quiet road, birdsong
3: A merchant with a broken cart wheel
4: [[Bandit]] ×4 demand a toll
5: [[Wolf]] ×3 shadow the party
6: A pilgrim heading to the ruined chapel
7: [[Goblin Warrior]] ×4 and a [[Goblin Boss]] setting an ambush
8: A patrol of [[Guard|guards]] questioning travellers
```

## Weather
```roll-table
title: Weather
1-8: Clear skies
9-12: Overcast and cold
13-16: Light rain
17-18: Heavy rain — tracks wash away, disadvantage on Wisdom (Perception) checks that rely on hearing
19: Thick fog — Heavily Obscured beyond 30 feet
20: Thunderstorm
```

## Tavern rumours
```roll-table
title: Rumour
1: The miller hasn't been seen in a week.
2: Someone is paying good coin for wolf pelts — too good.
3: The chapel bell rang at midnight, but the chapel has no bell.
4: A noble from the capital is travelling in disguise.
5: The Ashen Hand are recruiting.
6: There's treasure under the old watchtower. (False.)
```

## Trinkets
```roll-table
title: Trinket
1: A tin soldier with its face filed off
2: A key that is warm to the touch
3: A love letter addressed to no one
4: A tiny glass vial of grey ash
5: A wooden die where every face is a 6
6: A map of a town that doesn't exist
```
''')
w('DM Tools/Encounter Builder.md', '''# Encounter builder

```dm-actions
encounter
randommonster
tracker
```

**Build a new encounter** (button above, the shield icon in the ribbon, or *DM Statblocks: Build a new encounter*) to pick monsters from the Bestiary, let it **suggest** an encounter for your party's level, environment and difficulty, or **generate a brand-new monster** that fits the remaining XP budget. Save it as an encounter note (in `Campaign/Encounters`), insert it into a session, or run it straight away. Every `encounter` block has **Edit** and **Save as encounter note** buttons.

## Saved encounters
```dm-list
type: encounter
fields: [difficulty, xp, location, session, status]
empty: None saved yet.
```

## Quick block

Edit the block below (click `</>`), list monsters by bestiary note name with `xN`, and the 2024 difficulty is calculated against your **active party** (`type: player`, `status: active`, using `level`). Add `levels: [3, 3, 4, 4]` to override. **Run this encounter** loads the initiative tracker.

```encounter
title: Goblin ambush
monsters:
  - Goblin Warrior x4
  - Goblin Boss
```

## How 2024 encounter difficulty works
1. Pick **Low**, **Moderate** or **High** difficulty.
2. Look up the XP budget per character on the table in [[Encounter Building]] and add it up for the party.
3. Spend that budget on monsters using each monster's XP (shown next to its CR).

See [[Encounter Building]] for the full table.
''')
print('core done')
