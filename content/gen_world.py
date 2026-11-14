import os, sys, json
V = sys.argv[1]
def w(path, text):
    p = os.path.join(V, path); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(text.lstrip('\n'))
q = json.dumps

def entries(key, items):
    if not items: return f'{key}: []\n'
    out = f'{key}:\n'
    for n, d in items: out += f'  - name: {q(n)}\n    desc: {q(d)}\n'
    return out

def statblock(m):
    keys = ['name','size','type','alignment','ac','initiative','hp','hit_dice','speed','str','dex','con','int','wis','cha','saves','skills','vulnerabilities','resistances','immunities','gear','senses','languages','cr']
    s = '```statblock\n'
    for k in keys:
        if k in m and m[k] is not None:
            v = m[k]; s += f'{k}: {q(v) if isinstance(v,(str,list,dict)) else v}\n'
    for k in ['traits','actions','bonus_actions','reactions','legendary_actions']:
        if k in m: s += entries(k, m[k])
    if 'source' in m: s += f'source: {q(m["source"])}\n'
    return s + '```\n'

SRD = 'SRD 5.2 · CC-BY-4.0'
M = []
M.append(dict(name='Goblin Warrior', size='Small', type='Fey (Goblinoid)', alignment='Chaotic Neutral', ac=15, initiative=6, hp=10, hit_dice='3d6', speed='30 ft.',
  str=8, dex=15, con=10, int=10, wis=8, cha=8, skills='Stealth +6', gear='Leather Armor, Scimitar, Shield, Shortbow', senses='Darkvision 60 ft.; Passive Perception 9', languages='Common, Goblin', cr='1/4',
  actions=[('Scimitar', '*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (1d6 + 2) Slashing damage, plus 2 (1d4) Slashing damage if the attack roll had Advantage.'),
           ('Shortbow', '*Ranged Attack Roll:* +4, range 80/320 ft. *Hit:* 5 (1d6 + 2) Piercing damage, plus 2 (1d4) Piercing damage if the attack roll had Advantage.')],
  bonus_actions=[('Nimble Escape', 'The goblin takes the Disengage or [[Hiding|Hide]] action.')],
  _env=['forest','hills','underdark'], _ct='Fey', _tactics='Ambush from cover, shoot, then use Nimble Escape to hide again. Flee when the boss falls.'))
M.append(dict(name='Goblin Boss', size='Small', type='Fey (Goblinoid)', alignment='Chaotic Neutral', ac=17, initiative=2, hp=21, hit_dice='6d6', speed='30 ft.',
  str=10, dex=15, con=10, int=10, wis=8, cha=10, skills='Stealth +6', gear='Chain Shirt, Scimitar, Shield, Shortbow', senses='Darkvision 60 ft.; Passive Perception 9', languages='Common, Goblin', cr='1',
  actions=[('Multiattack', 'The goblin makes two attacks, using Scimitar or Shortbow in any combination.'),
           ('Scimitar', '*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (1d6 + 2) Slashing damage, plus 2 (1d4) Slashing damage if the attack roll had Advantage.'),
           ('Shortbow', '*Ranged Attack Roll:* +4, range 80/320 ft. *Hit:* 5 (1d6 + 2) Piercing damage, plus 2 (1d4) Piercing damage if the attack roll had Advantage.')],
  bonus_actions=[('Nimble Escape', 'The goblin takes the Disengage or [[Hiding|Hide]] action.')],
  reactions=[('Redirect Attack', '*Trigger:* A creature the goblin can see makes an attack roll against it. *Response:* The goblin chooses a Small or Medium ally it can see within 5 feet of itself. The goblin and that ally swap places, and the ally becomes the target of the attack instead.')],
  _env=['forest','hills','underdark'], _ct='Fey', _tactics='Stays behind its warriors and uses Redirect Attack to make them take hits meant for it.'))
M.append(dict(name='Wolf', size='Medium', type='Beast', alignment='Unaligned', ac=12, initiative=2, hp=11, hit_dice='2d8 + 2', speed='40 ft.',
  str=14, dex=15, con=12, int=3, wis=12, cha=6, skills='Perception +5, Stealth +4', senses='Darkvision 60 ft.; Passive Perception 15', languages='None', cr='1/4',
  traits=[('Pack Tactics', 'The wolf has Advantage on an attack roll against a creature if at least one of the wolf\'s allies is within 5 feet of the creature and the ally doesn\'t have the [[Incapacitated]] condition.')],
  actions=[('Bite', '*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (1d6 + 2) Piercing damage. If the target is a Medium or smaller creature, it has the [[Prone]] condition.')],
  _env=['forest','grassland','hills','arctic'], _ct='Beast', _tactics='Surround a single target; knock it prone so the pack gets Advantage.'))
M.append(dict(name='Giant Rat', size='Small', type='Beast', alignment='Unaligned', ac=13, initiative=3, hp=7, hit_dice='2d6', speed='30 ft., Climb 30 ft.',
  str=7, dex=16, con=11, int=2, wis=10, cha=4, skills='Perception +2, Stealth +5', senses='Darkvision 60 ft.; Passive Perception 12', languages='None', cr='1/8',
  traits=[('Pack Tactics', 'The rat has Advantage on an attack roll against a creature if at least one of the rat\'s allies is within 5 feet of the creature and the ally doesn\'t have the [[Incapacitated]] condition.')],
  actions=[('Bite', '*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 5 (1d4 + 3) Piercing damage.')],
  _env=['urban','underdark','swamp'], _ct='Beast', _tactics='Swarm from cellars and sewers in groups of 4–8.'))
M.append(dict(name='Skeleton', size='Medium', type='Undead', alignment='Lawful Evil', ac=13, initiative=3, hp=13, hit_dice='2d8 + 4', speed='30 ft.',
  str=10, dex=16, con=15, int=6, wis=8, cha=5, vulnerabilities='Bludgeoning', immunities='Poison; [[Exhaustion]], [[Poisoned]]', gear='Shortbow, Shortsword', senses='Darkvision 60 ft.; Passive Perception 9', languages='Understands the languages it knew in life but can\'t speak', cr='1/4',
  actions=[('Shortsword', '*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 6 (1d6 + 3) Piercing damage.'),
           ('Shortbow', '*Ranged Attack Roll:* +5, range 80/320 ft. *Hit:* 6 (1d6 + 3) Piercing damage.')],
  _env=['urban','underdark','any ruin'], _ct='Undead', _tactics='Mindless and relentless; obeys the last order its creator gave.'))
M.append(dict(name='Zombie', size='Medium', type='Undead', alignment='Neutral Evil', ac=8, initiative=-2, hp=15, hit_dice='2d8 + 6', speed='20 ft.',
  str=13, dex=6, con=16, int=3, wis=6, cha=5, saves={'wis': 0}, immunities='Poison; [[Exhaustion]], [[Poisoned]]', senses='Darkvision 60 ft.; Passive Perception 8', languages='Understands the languages it knew in life but can\'t speak', cr='1/4',
  traits=[('Undead Fortitude', 'If damage reduces the zombie to 0 Hit Points, it makes a Constitution saving throw (DC 5 plus the damage taken) unless the damage is Radiant or from a Critical Hit. On a successful save, the zombie drops to 1 Hit Point instead.')],
  actions=[('Slam', '*Melee Attack Roll:* +3, reach 5 ft. *Hit:* 4 (1d6 + 1) Bludgeoning damage.')],
  _env=['urban','swamp','any ruin'], _ct='Undead', _tactics='Shambles straight at the nearest living creature. Great for horde scenes.'))
M.append(dict(name='Bandit', size='Medium or Small', type='Humanoid', alignment='Neutral', ac=12, initiative=1, hp=11, hit_dice='2d8 + 2', speed='30 ft.',
  str=11, dex=12, con=12, int=10, wis=10, cha=10, gear='Leather Armor, Light Crossbow, Scimitar', senses='Passive Perception 10', languages='Common, Thieves\' Cant', cr='1/8',
  actions=[('Scimitar', '*Melee Attack Roll:* +3, reach 5 ft. *Hit:* 4 (1d6 + 1) Slashing damage.'),
           ('Light Crossbow', '*Ranged Attack Roll:* +3, range 80/320 ft. *Hit:* 5 (1d8 + 1) Piercing damage.')],
  _env=['urban','forest','grassland','coastal'], _ct='Humanoid', _tactics='Demand a toll first; flee when outnumbered or when half the gang drops.'))
M.append(dict(name='Guard', size='Medium or Small', type='Humanoid', alignment='Neutral', ac=16, initiative=1, hp=11, hit_dice='2d8 + 2', speed='30 ft.',
  str=13, dex=12, con=12, int=10, wis=11, cha=10, skills='Perception +2', gear='Chain Shirt, Shield, Spear', senses='Passive Perception 12', languages='Common', cr='1/8',
  actions=[('Spear', '*Melee or Ranged Attack Roll:* +3, reach 5 ft. or range 20/60 ft. *Hit:* 4 (1d6 + 1) Piercing damage.')],
  _env=['urban'], _ct='Humanoid', _tactics='Calls for backup on the first round; tries to arrest rather than kill.'))
M.append(dict(name='Cultist', size='Medium or Small', type='Humanoid', alignment='Neutral', ac=12, initiative=1, hp=9, hit_dice='2d8', speed='30 ft.',
  str=11, dex=12, con=10, int=10, wis=11, cha=10, saves={'wis': 2}, skills='Deception +2, Religion +2', gear='Leather Armor, Sickle', senses='Passive Perception 10', languages='Common', cr='1/8',
  actions=[('Ritual Sickle', '*Melee Attack Roll:* +3, reach 5 ft. *Hit:* 3 (1d4 + 1) Slashing damage plus 1 Necrotic damage.')],
  _env=['urban','any ruin'], _ct='Humanoid', _tactics='Fanatical — fights to the death to protect a ritual.'))
M.append(dict(name='Ogre', size='Large', type='Giant', alignment='Chaotic Evil', ac=11, initiative=-1, hp=68, hit_dice='8d10 + 24', speed='40 ft.',
  str=19, dex=8, con=16, int=5, wis=7, cha=7, gear='Greatclub, Javelins', senses='Darkvision 60 ft.; Passive Perception 8', languages='Common, Giant', cr='2',
  actions=[('Greatclub', '*Melee Attack Roll:* +6, reach 5 ft. *Hit:* 13 (2d8 + 4) Bludgeoning damage.'),
           ('Javelin', '*Melee or Ranged Attack Roll:* +6, reach 5 ft. or range 30/120 ft. *Hit:* 11 (2d6 + 4) Piercing damage.')],
  _env=['forest','hills','mountain','swamp'], _ct='Giant', _tactics='Easily bribed with food; attacks whoever hurt it last.'))
M.append(dict(name='Owlbear', size='Large', type='Monstrosity', alignment='Unaligned', ac=13, initiative=1, hp=59, hit_dice='7d10 + 21', speed='40 ft., Climb 40 ft.',
  str=20, dex=12, con=17, int=3, wis=12, cha=7, skills='Perception +5', senses='Darkvision 60 ft.; Passive Perception 15', languages='None', cr='3',
  actions=[('Multiattack', 'The owlbear makes two Rend attacks.'),
           ('Rend', '*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 14 (2d8 + 5) Slashing damage.')],
  _env=['forest','arctic','hills'], _ct='Monstrosity', _tactics='Territorial; it can be driven off with fire or food rather than killed.'))
for m in M: m['source'] = SRD
# Homebrew for the example campaign
M.append(dict(name='Ashen Hand Zealot', size='Medium', type='Humanoid', alignment='Lawful Evil', ac=14, initiative=2, hp=33, hit_dice='6d8 + 6', speed='30 ft.',
  str=12, dex=14, con=12, int=10, wis=13, cha=15, saves=['wis', 'cha'], skills='Deception +4, Religion +2', resistances='Fire', gear='Studded Leather Armor, Ash-blackened Sickle', senses='Passive Perception 11', languages='Common, Infernal', cr='2',
  traits=[('Ash Shroud', 'While the zealot is Bloodied, it is wreathed in drifting ash: creatures more than 10 feet away have Disadvantage on attack rolls against it.')],
  actions=[('Multiattack', 'The zealot makes two Cinder Sickle attacks, or it makes one Cinder Sickle attack and uses Crown\'s Command.'),
           ('Cinder Sickle', '*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (1d6 + 2) Slashing damage plus 3 (1d6) Fire damage.'),
           ('Crown\'s Command', '*Wisdom Saving Throw:* DC 12, one creature the zealot can see within 30 feet. *Failure:* The target has the [[Frightened]] condition until the end of its next turn.')],
  reactions=[('Ember Martyrdom', '*Trigger:* An ally the zealot can see within 30 feet drops to 0 Hit Points. *Response:* The zealot gains 5 Temporary Hit Points and moves up to half its Speed without provoking Opportunity Attacks.')],
  source='Homebrew — The Ashen Crown', _env=['urban'], _ct='Humanoid', _tactics='Leads 2–4 [[Cultist|cultists]]. Uses Crown\'s Command on the strongest-looking melee character first.'))

from fractions import Fraction
for m in M:
    env = m.pop('_env'); ct = m.pop('_ct'); tac = m.pop('_tactics')
    src = 'Homebrew' if m['source'].startswith('Homebrew') else 'SRD 5.2'
    fm = f'---\ntype: monster\ncr: "{m["cr"]}"\ncreature_type: {ct}\nenvironment: {q(env)}\nsource: {src}\ntags: [monster]\n---\n'
    body = fm + f'# {m["name"]}\n\n' + statblock(m) + f'\n## Tactics\n{tac}\n\n## Used in\n```dm-list\nwhere: any\nfields: [type]\nempty: Not used in any note yet.\n```\n'
    w(f'Bestiary/{m["name"]}.md', body)

w('Bestiary/Bestiary Index.md', '''---
tags: [monster]
---
# Bestiary

```dm-list
type: monster
sort: cr
fields: [cr, creature_type, environment, source]
```

## Villains & bad guys
```dm-list
type: monster
villain: true
fields: [cr, creature_type, status]
empty: None yet — use the Monster/Villain builder and set Kind to Villain.
```

## Create
```monster-tools
```
- **Monster/Villain builder** (set *Kind* to Villain for bad guys) opens a form with a live 2024 statblock preview: CR guidance (typical AC, HP, attack bonus, save DC and damage per round), hit-point calculator, ability scores with save proficiencies, and helpers that write 2024-style **attack** and **saving-throw** entries for you (pull weapons straight from the [[Armory Index|Armory]]). Saving adds it to this Bestiary.
- **Random monster** asks for your party's level, size and the difficulty you want (or a CR), plus creature type, role (brute, skirmisher, controller, leader) and whether it's a boss with legendary actions — then builds a full statblock you can tweak, save, or drop into combat.
- **CR check:** the builder and the random monster generator compare the CR you picked with the CR the stats actually support (defensive CR from HP/AC/resistances, offensive CR from damage per round and attack bonus or save DC) and offer a one-click fix. The random monster form also shows the suggested CR for your party settings as you change them.
- **Edit** any statblock from its header button.

## Using statblocks
- Every monster is a ` ```statblock ``` ` code block in **2024 format** (AC + Initiative, ability scores with modifier and save, CR with XP and PB).
- **Click** attack bonuses, damage dice, ability modifiers and saves to roll. Shift-click = Advantage / crit, Alt-click = Disadvantage.
- **Add to combat** sends the creature to the initiative tracker.
- **Embed** in a session or NPC note with `![[Goblin Boss]]`, or reuse with a new name:

````markdown
```statblock
monster: Bandit
rename: Captain Vex
```
````

- New monster: `DM Codex: New Monster`, or run `DM Statblocks: Insert blank statblock` in any note.
- Fields: `name, size, type, alignment, ac, initiative, hp, hit_dice, speed, str…cha, saves (list of proficient saves or a map), skills, vulnerabilities, resistances, immunities, gear, senses, languages, cr, xp, pb, traits, actions, bonus_actions, reactions, legendary_intro, legendary_actions`. Descriptions are Markdown — `[[links]]` to conditions work.

> [!warning] Accuracy
> SRD monsters here were transcribed for convenience from the *System Reference Document 5.2* (© Wizards of the Coast, [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode)). Spot-check numbers against the official SRD 5.2 PDF before relying on them. The full SRD contains 300+ creatures you can add using the same format.
''')

# ---------------- Example campaign: The Ashen Crown ----------------
P = [
 ('Mira Thorne', dict(player='Alex', species='Half-Elf? — use Human or Elf', cls='Rogue', sub='', bg='Criminal', lvl=3, ac=15, hp=21, ini=4, pp=14,
   concept='A cutpurse trying to go straight, haunted by a debt to the Ashen Hand.', bond='Owes her life to [[Old Brannoc]].', hooks='Her brother [[Tobin Thorne]] vanished near [[The Old Mill]].')),
 ('Brother Halvard', dict(player='Sam', species='Dwarf', cls='Cleric', sub='Life Domain', bg='Acolyte', lvl=3, ac=18, hp=27, ini=0, pp=13,
   concept='A dwarven cleric sent to investigate the burnt shrine in [[Briarford]].', bond='Reports to [[Mother Wenna]].', hooks='His order once guarded a shard of the Ashen Crown.')),
 ('Kestrel', dict(player='Jordan', species='Goliath', cls='Fighter', sub='Champion', bg='Soldier', lvl=3, ac=16, hp=31, ini=2, pp=12,
   concept='A former caravan guard with a grudge against bandits.', bond='Her old caravan master drinks at [[The Drunken Owlbear]].', hooks='The bandits who ambushed her caravan wore ash-grey hoods.')),
]
for name, d in P:
    species = 'Human' if 'Half' in d['species'] else d['species']
    w(f'Campaign/Party/{name}.md', f'''---
type: player
character: "{name}"
player: "{d['player']}"
species: {species}
class: {d['cls']}
subclass: "{d['sub']}"
background: {d['bg']}
level: {d['lvl']}
ac: {d['ac']}
hp_max: {d['hp']}
init_bonus: {d['ini']}
passive_perception: {d['pp']}
status: active
tags: [pc]
---
# {name}

> [!npc] At a glance
> **Player:** {d['player']} · **{species} {d['cls']}** {d['lvl']} · **Background:** {d['bg']}

## Concept
{d['concept']}

## Backstory hooks
- {d['hooks']}

## Bonds
- {d['bond']}

## Secrets only the DM knows
> [!secret]
> *Add something the player doesn't know about their own story.*

## Equipment
```dm-list
type: [weapon, armor, gear, item]
where: holder
fields: [type, quantity]
empty: Nothing yet.
```

## Sessions featuring this character
```dm-list
type: session
where: any
sort: session_number
fields: [date, status]
```
''')

PLACES = [
 ('Briarford', 'town', '', '', 'A river town of a few hundred souls on the edge of the Thornwood. Mills, a market square, a shrine that burned down last month.', 'Woodsmoke, wet stone, the creak of the mill wheel.'),
 ('The Drunken Owlbear', 'tavern', '[[Briarford]]', '', 'Briarford\'s only tavern. Low beams, a stuffed (and slightly moth-eaten) owlbear head over the hearth.', 'Spilled ale, roasting mutton, a fiddler who only knows three songs.'),
 ('The Old Mill', 'ruin', '[[Briarford]]', '', 'An abandoned watermill a mile up the Thornwood road. The Ashen Hand use its cellar.', 'Rotting grain, the slap of the broken wheel, and faintly — incense.'),
 ('Thornwood', 'forest', '', '', 'Dense, thorny forest north of Briarford. Wolves, goblins, and older things.', 'Pine resin, birdsong that stops when you listen for it.'),
]
for name, pt, parent, region, desc, sense in PLACES:
    w(f'World/Places/{name}.md', f'''---
type: place
place_type: {pt}
region: "The Vale of Ash"
parent: "{parent}"
tags: [place]
---
# {name}

> [!read-aloud] First impression
> {sense}

## Overview
{desc}

## Points of interest
```dm-list
type: place
where: parent
fields: [place_type]
empty: No sub-locations yet.
```

## Who is here
```dm-list
type: npc
where: location
fields: [role, attitude, status]
empty: No NPCs placed here yet.
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
empty: No saved encounters here.
```

## Random encounters
```roll-table
title: Encounter in {name}
1-3: Nothing of note
4: A rumour from a passer-by (see [[Random Tables]])
5: [[Wolf]] ×2 or [[Giant Rat]] ×4
6: An [[Ashen Hand Zealot]] watching from a distance
```

## Session history
```dm-list
type: session
where: any
sort: session_number
fields: [date]
empty: Not visited yet.
```
''')

NPCS = [
 ('Old Brannoc', 'innkeeper', 'Dwarf', '[[The Drunken Owlbear]]', '', 'friendly', 'Bald, braided white beard, one milky eye.', 'Gravelly; calls everyone "lad".', 'To keep his tavern out of the Ashen Hand\'s business.', 'He paid the Ashen Hand protection money — and knows where they meet.', 'Guard'),
 ('Mother Wenna', 'priest of the burned shrine', 'Human', '[[Briarford]]', '', 'friendly', 'Soot still under her fingernails.', 'Soft, deliberate, quotes scripture.', 'To rebuild the shrine.', 'She saw who set the fire and is too afraid to say.', 'Cultist'),
 ('Tobin Thorne', 'missing courier', 'Human', '[[The Old Mill]]', '[[The Ashen Hand]]', 'indifferent', 'Gaunt, ash-smudged, wears a grey hood.', 'Talks too fast.', 'To pay off his sister\'s debt by joining the Hand.', 'He was recruited willingly — not kidnapped.', 'Bandit'),
 ('Sister Cinder', 'Ashen Hand leader in Briarford', 'Tiefling', '[[The Old Mill]]', '[[The Ashen Hand]]', 'hostile', 'Grey robes, a crown-shaped brand on her palm.', 'Calm, kind, absolutely certain.', 'To assemble the shards of the Ashen Crown.', 'She believes the Crown will end a coming plague.', 'Ashen Hand Zealot'),
]
for name, role, sp, loc, fac, att, look, voice, want, secret, sb in NPCS:
    w(f'World/NPCs/{name}.md', f'''---
type: npc
role: "{role}"
species: {sp}
location: "{loc}"
faction: "{fac}"
attitude: {att}
status: alive
first_seen: "[[Session 001 - The Road to Briarford]]"
tags: [npc]
---
# {name}

> [!npc] Quick reference
> **Look:** {look}
> **Voice / mannerism:** {voice}
> **Wants:** {want}

## Secret
> [!secret]
> {secret}

## Statblock
```statblock
monster: {sb}
rename: {name}
```

## Appearances
```dm-list
type: session
where: any
sort: session_number
fields: [date]
empty: Not seen in a session yet.
```
''')

w('World/Factions/The Ashen Hand.md', '''---
type: faction
alignment: Lawful Evil
leader: "[[Sister Cinder]]"
base: "[[The Old Mill]]"
attitude: hostile
tags: [faction]
---
# The Ashen Hand

## Goal
Reassemble the **Ashen Crown**, a relic said to command fire and ash.

## Methods
Protection rackets, recruiting the desperate, burning anything that guards a shard.

## Members
```dm-list
type: npc
where: faction
fields: [role, location, status]
```

## Clock — "The Crown Rekindled"
- [x] Burn the Briarford shrine
- [ ] Recover the shrine's shard
- [ ] Find the second shard in the [[Thornwood]]
- [ ] Ritual at the [[The Old Mill|Old Mill]] on the new moon

## Secrets
> [!secret]
> The "plague" Sister Cinder fears is real — the Crown is the wrong answer to a right question.
''')
w('World/Items/Shard of the Ashen Crown.md', '''---
type: item
rarity: uncommon
attunement: true
holder: ""
tags: [item]
---
# Shard of the Ashen Crown

*Wondrous item, uncommon (requires attunement)*

A thumb-sized sliver of blackened gold, always warm.

## Properties
- While attuned, you have Resistance to Fire damage.
- Once per Long Rest, you can cast *Burning Hands* (save DC 13) from the shard.
- **Curse:** each time you use it, the shard whispers the location of the other shards — and [[The Ashen Hand]] hears your location.
''')
w('Campaign/Quests/The Missing Courier.md', '''---
type: quest
status: active
giver: "[[Mira Thorne]]"
location: "[[The Old Mill]]"
reward: "Tobin's safe return; a lead on the Ashen Hand"
level: 3
tags: [quest]
---
# The Missing Courier

## Hook
Mira's brother [[Tobin Thorne]] never returned from a delivery up the Thornwood road.

## Steps
- [x] Ask around [[The Drunken Owlbear]]
- [ ] Search [[The Old Mill]]
- [ ] Confront [[Sister Cinder]]

## Complications
Tobin doesn't want to be rescued.
''')
w('Campaign/Quests/Ashes of the Shrine.md', '''---
type: quest
status: hook
giver: "[[Mother Wenna]]"
location: "[[Briarford]]"
reward: "50 gp and the shrine's blessing"
level: 3
tags: [quest]
---
# Ashes of the Shrine

## Hook
[[Mother Wenna]] asks the party to find out who burned the shrine.

## Objective
Identify the arsonists and recover what was stolen from the reliquary (a [[Shard of the Ashen Crown]]).
''')
w('Campaign/Sessions/Session 001 - The Road to Briarford.md', '''---
type: session
session_number: 1
date: 2026-11-07
campaign: "The Ashen Crown"
status: played
players: ["[[Mira Thorne]]", "[[Brother Halvard]]", "[[Kestrel]]"]
locations: ["[[Briarford]]", "[[The Drunken Owlbear]]", "[[Thornwood]]"]
npcs: ["[[Old Brannoc]]", "[[Mother Wenna]]"]
prev: ""
next: "[[Session 002 - The Old Mill]]"
tags: [session]
---
# Session 001 - The Road to Briarford

> [!info] Navigation
> Next: [[Session 002 - The Old Mill]] · [[Home]]

## Strong start
A [[Goblin Warrior|goblin]] ambush on the Thornwood road — the goblins were fleeing *something* and attacked out of panic.

## Encounters
*Add saved encounters or build new ones. New encounters are saved to the Encounters tab and linked to this session.*
```session-encounters
```

## Session log
- Fight with 4 [[Goblin Warrior|goblin warriors]] — [[Kestrel]] knocked one [[Prone]] with a shove; [[Mira Thorne]] took one alive.
- The captured goblin babbled about "grey hoods burning the forest".
- Arrived in [[Briarford]]. Met [[Old Brannoc]] at [[The Drunken Owlbear]], who was clearly nervous.
- [[Mother Wenna]] asked for help with the burned shrine → [[Ashes of the Shrine]].
- Mira learned her brother was last seen heading to [[The Old Mill]] → [[The Missing Courier]].

## Secrets & clues
- [x] The goblins were fleeing the Ashen Hand.
- [x] Brannoc pays someone "rent" every week.
- [ ] Ash on the shrine floor forms a crown shape.

## Loot & XP
| Item | Who has it |
| --- | --- |
| 14 gp, 30 sp | party |
| Goblin shortbow | Kestrel |

## Threads & follow-ups
- [ ] Who is Brannoc paying?
- [ ] What is the "grey hood" symbol?
''')
w('Campaign/Sessions/Session 002 - The Old Mill.md', '''---
type: session
session_number: 2
date: 2026-11-14
campaign: "The Ashen Crown"
status: planned
players: ["[[Mira Thorne]]", "[[Brother Halvard]]", "[[Kestrel]]"]
locations: ["[[The Old Mill]]"]
npcs: ["[[Tobin Thorne]]", "[[Sister Cinder]]"]
prev: "[[Session 001 - The Road to Briarford]]"
next: ""
tags: [session]
---
# Session 002 - The Old Mill

> [!info] Navigation
> Previous: [[Session 001 - The Road to Briarford]] · Prep: [[Prep - Session 002]] · [[Home]]

## Recap
> [!read-aloud] Last time…
> You fought off panicked goblins on the Thornwood road, reached Briarford, and learned that both a shrine and a courier have fallen to the same grey-hooded shadow.

## Strong start
Smoke rises from [[The Old Mill]] as the party approaches — someone is burning papers.

## Encounters
*Add saved encounters or build new ones. New encounters are saved to the Encounters tab and linked to this session.*
```session-encounters
```

## Session log


## Threads & follow-ups
- [ ]
''')
w('Planning/Session Prep/Prep - Session 002.md', '''---
type: prep
for_session: "[[Session 002 - The Old Mill]]"
date: 2026-11-12
tags: [prep]
---
# Prep - Session 002

## 1. Characters
```dm-list
type: player
status: active
```

## 2. Strong start
Smoke from the mill chimney — evidence being destroyed.

## 3. Potential scenes
- Sneaking in through the waterwheel channel
- Tobin refusing to leave
- Sister Cinder offering the party a deal

## 4. Secrets & clues
- [ ] Tobin joined willingly to pay Mira's debt.
- [ ] The Hand has one shard; a second is in the [[Thornwood]].
- [ ] Brannoc's "rent" goes to the Hand.
- [ ] Sister Cinder fears a coming plague.

## 7. Monsters & encounters
```session-encounters
```

![[Ashen Hand Zealot]]

## 8. Rewards
- [[Shard of the Ashen Crown]] (if they defeat Cinder — she'll likely flee with it)
''')
w('Planning/Arcs/Act 1 - The Crown Rekindled.md', '''---
type: arc
status: active
act: 1
tags: [arc]
---
# Act 1 - The Crown Rekindled

## Premise
[[The Ashen Hand]] is gathering shards of the Ashen Crown around [[Briarford]].

## Beats
1. Arrival in Briarford — [[Session 001 - The Road to Briarford]]
2. The Old Mill — [[The Missing Courier]]
3. The shard in the [[Thornwood]]
4. New moon ritual

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
''')
w('Planning/Ideas/The plague is real.md', '''---
type: idea
status: developing
category: twist
created: 2026-11-10
tags: [idea]
---
# The plague is real

Sister Cinder isn't wrong about the plague — she's wrong about the cure. Seed sick animals in the [[Thornwood]] and a coughing farmer in [[Briarford]].

Feeds: [[Act 1 - The Crown Rekindled]]
''')
w('Planning/Ideas/Brannoc turns informant.md', '''---
type: idea
status: raw
category: npc
created: 2026-11-12
tags: [idea]
---
# Brannoc turns informant

If the party protects [[The Drunken Owlbear]], [[Old Brannoc]] gives them the Hand's meeting schedule.
''')
w('Planning/Inbox/README.md', '# Inbox\n\nNew notes created with Obsidian\'s normal "New note" land here. Give them a `type` property (or move the content into a DM Codex note) to file them.\n')
w('Assets/README.md', '# Assets\n\nMaps, handouts and portraits. Pasted images land here.\n')
w('Campaign/Encounters/Mill Cellar Ambush.md', '''---
type: encounter
status: planned
difficulty: Moderate
xp: 525
location: "[[The Old Mill]]"
session: "[[Session 002 - The Old Mill]]"
prep: "[[Prep - Session 002]]"
environment: ["urban"]
tags: [encounter]
---
# Mill Cellar Ambush

> [!read-aloud] Setup
> Incense smoke hangs under the low beams. Three grey-hooded figures kneel around a brazier; a fourth, taller, turns toward you with a smile.

```encounter
title: "Mill Cellar Ambush"
monsters:
  - "Ashen Hand Zealot"
  - "Cultist x3"
```

## Creatures
- [[Ashen Hand Zealot]] ×1 (Sister Cinder, if she's present — see [[Sister Cinder]])
- [[Cultist]] ×3

## Terrain & features
- Low ceiling (7 ft); the brazier can be kicked over (DC 12 Dex save or 2d6 Fire in a 5-ft square).
- Grain sacks give Half Cover.
- A trapdoor leads down to the millrace — the escape route.

## Tactics
- Cultists form a wall in front of the zealot; the zealot uses Crown's Command on the biggest fighter.
- When the zealot is Bloodied she flees through the trapdoor.

## Treasure
- 30 gp in offering bowls, a ledger of Ashen Hand payments (Brannoc's name is in it).

## What happened
- [ ] Used in a session
''')
w('Campaign/Encounters/Rats in the Grain Store.md', '''---
type: encounter
status: planned
difficulty: Low
xp: 125
location: "[[The Old Mill]]"
session: "[[Session 002 - The Old Mill]]"
prep: "[[Prep - Session 002]]"
environment: ["urban", "dungeon"]
tags: [encounter]
---
# Rats in the Grain Store

> [!read-aloud] Setup
> The grain sacks are moving. Something has chewed through every one of them.

```encounter
title: "Rats in the Grain Store"
monsters:
  - "Giant Rat x5"
```

## Terrain & features
- Rotten floorboards: a creature that ends its turn on them must succeed on a DC 10 Dexterity save or fall 10 feet into the millrace.

## Tactics
- The rats swarm the nearest light source and flee once three are down.

## Treasure
- A cultist's dropped pouch: 12 gp and a crude map of the cellar.

## What happened
- [ ] Used in a session
''')
w('Campaign/Encounters/Goblin Ambush on the Thornwood Road.md', '''---
type: encounter
status: used
difficulty: Moderate
xp: 200
location: "[[Thornwood]]"
session: "[[Session 001 - The Road to Briarford]]"
prep: ""
environment: ["forest"]
tags: [encounter]
---
# Goblin Ambush on the Thornwood Road

> [!read-aloud] Setup
> Arrows hiss out of the undergrowth. The goblins look more frightened than you are.

```encounter
title: "Goblin Ambush on the Thornwood Road"
monsters:
  - "Goblin Warrior x4"
```

## Tactics
- They were fleeing the Ashen Hand; they break and run as soon as two fall.

## What happened
- [x] Used in a session: Kestrel shoved one [[Prone]]; Mira took one alive.
''')
print('world done')
