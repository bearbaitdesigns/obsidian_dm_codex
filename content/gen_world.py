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
empty: None yet — use the Creature builder and set Kind to Villain.
```

## Create
```monster-tools
```
- **Creature builder** (set *Kind* to Villain for bad guys, or NPC for a person with a statblock) opens a form with a live 2024 statblock preview: CR guidance (typical AC, HP, attack bonus, save DC and damage per round), hit-point calculator, ability scores with save proficiencies, and helpers that write 2024-style **attack** and **saving-throw** entries for you (pull weapons straight from the [[Armory Index|Armory]]). Saving adds it to this Bestiary.
- **Random creature** asks for your party's level, size and the difficulty you want (or a CR), plus creature type, role (brute, skirmisher, controller, leader) and whether it's a boss with legendary actions — then builds a full statblock you can tweak, save (as a monster, villain or NPC), or drop into combat.
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

w('Planning/Inbox/README.md', '# Inbox\n\nNew notes created with Obsidian\'s normal "New note" land here. Give them a `type` property (or move the content into a DM Codex note) to file them.\n')
w('Assets/README.md', '# Assets\n\nMaps, handouts and portraits. Pasted images land here.\n')
print('world done')
