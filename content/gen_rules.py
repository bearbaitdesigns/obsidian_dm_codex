import os, sys
V = sys.argv[1]
def w(path, text):
    p = os.path.join(V, path); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(text.lstrip('\n'))

SRC = '\n\n---\n*Quick-reference summary of the System Reference Document 5.2 (SRD 5.2) © Wizards of the Coast, licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode). Paraphrased for table use — consult the SRD or Player\'s Handbook for exact wording.*\n'
def rule(path, title, body, tags='rule'):
    w(f'Rules 2024/{path}.md', f'---\ntype: rule\ntags: [{tags}]\n---\n# {title}\n\n{body.strip()}\n' + SRC)

# ---------------- Conditions ----------------
C = {
'Blinded': '''- You can't see; any ability check that needs sight automatically fails.
- Attack rolls **against** you have Advantage; **your** attack rolls have Disadvantage.''',
'Charmed': '''- You can't attack the charmer or target them with damaging abilities or magical effects.
- The charmer has Advantage on ability checks to interact with you socially.''',
'Deafened': '''- You can't hear; any ability check that needs hearing automatically fails.''',
'Exhaustion': '''Exhaustion stacks in **levels** (1–6).
- **d20 Tests:** subtract **2 × your Exhaustion level** from every D20 Test (attack rolls, ability checks, saving throws).
- **Speed:** reduced by **5 feet × your Exhaustion level**.
- **Level 6:** you die.
- **Removal:** finishing a [[Resting|Long Rest]] removes 1 level. When your level reaches 0, the condition ends.''',
'Frightened': '''- Disadvantage on ability checks and attack rolls while the source of fear is within line of sight.
- You can't willingly move closer to the source of fear.''',
'Grappled': '''- Your Speed is 0 and can't increase.
- Disadvantage on attack rolls against any target other than the grappler.
- The grappler can drag or carry you when it moves, but each foot costs it 1 extra foot (unless you are Tiny or two+ sizes smaller).
- **Escape:** use an action to make a Strength (Athletics) or Dexterity (Acrobatics) check against the grapple's escape DC.
- Ends if the grappler is [[Incapacitated]] or the distance between you exceeds the grapple's range.
- **Grappling someone** (Unarmed Strike option): target makes a Str or Dex save vs **DC 8 + your Str mod + PB**; target must be no more than one size larger than you and you need a free hand.''',
'Incapacitated': '''- You can't take any action, Bonus Action, or Reaction.
- Your [[Concentration]] is broken.
- You can't speak.
- If you're Incapacitated when you roll Initiative, you have Disadvantage on the roll.''',
'Invisible': '''- **Surprise:** if you're Invisible when you roll Initiative, you have Advantage on the roll.
- **Concealed:** you aren't affected by effects that require the target to be seen, unless the effect's creator can somehow see you. Anything you wear or carry is also concealed.
- Attack rolls against you have Disadvantage, and your attack rolls have Advantage — unless the attacker/target can somehow see you.''',
'Paralyzed': '''- You have the [[Incapacitated]] condition. Speed 0 and can't increase.
- Automatically fail Strength and Dexterity saving throws.
- Attack rolls against you have Advantage.
- Any attack roll that hits you is a **Critical Hit** if the attacker is within 5 feet.''',
'Petrified': '''- You turn into a solid inanimate substance (usually stone) along with nonmagical objects you wear or carry. Weight ×10, you stop aging.
- You have the [[Incapacitated]] condition. Speed 0 and can't increase.
- Attack rolls against you have Advantage; you automatically fail Str and Dex saves.
- Resistance to all damage; Immunity to the [[Poisoned]] condition.''',
'Poisoned': '''- Disadvantage on attack rolls and ability checks.''',
'Prone': '''- **Movement:** your only options are to crawl (each foot costs 1 extra foot) or spend movement equal to **half your Speed** (rounded down) to stand up — you can't stand if your Speed is 0.
- Disadvantage on your attack rolls.
- Attack rolls against you have **Advantage if the attacker is within 5 feet**, otherwise Disadvantage.''',
'Restrained': '''- Speed 0 and can't increase.
- Attack rolls against you have Advantage; your attack rolls have Disadvantage.
- Disadvantage on Dexterity saving throws.''',
'Stunned': '''- You have the [[Incapacitated]] condition.
- Automatically fail Strength and Dexterity saving throws.
- Attack rolls against you have Advantage.''',
'Unconscious': '''- You have the [[Incapacitated]] and [[Prone]] conditions, and you drop whatever you're holding. (When this condition ends, you remain Prone.)
- Speed 0 and can't increase.
- Attack rolls against you have Advantage.
- Automatically fail Strength and Dexterity saving throws.
- Any attack roll that hits you is a **Critical Hit** if the attacker is within 5 feet.
- You're unaware of your surroundings.''',
}
for name, body in C.items():
    rule(f'Conditions/{name}', name, f'> [!rule] {name}\n' + '\n'.join('> ' + l for l in body.strip().split('\n')) + '\n\nSee all [[Conditions]].', 'rule/condition')

rule('Conditions/Conditions', 'Conditions', '''Conditions don't stack with themselves (except [[Exhaustion]] levels). A creature either has a condition or it doesn't.

| Condition | In one line |
| --- | --- |
''' + '\n'.join(f'| [[{n}]] | {C[n].strip().split(chr(10))[0].lstrip("- ").replace("|", "/")} |' for n in C) + '''

**Related states:** [[Concentration]] · [[Death and Dying|Unconscious at 0 HP]] · *Bloodied* (a creature at half its Hit Points or fewer — some effects key off it) · [[Hiding|Hidden]]
''', 'rule/condition')

# ---------------- Core rules ----------------
rule('Core/D20 Tests and DCs', 'D20 Tests & Difficulty Classes', '''There are three **D20 Tests**: ability checks, saving throws and attack rolls. Roll a d20, add modifiers, compare to a target number (DC or AC).

## Typical DCs
| Task | DC |
| --- | --- |
| Very easy | 5 |
| Easy | 10 |
| Medium | 15 |
| Hard | 20 |
| Very hard | 25 |
| Nearly impossible | 30 |

## Advantage & Disadvantage
- Roll two d20s: **Advantage** = use the higher, **Disadvantage** = use the lower.
- Multiple sources don't stack. If you have both, they cancel and you roll one d20.

## Natural 20 / natural 1
- On an **attack roll**, a natural 20 always hits and is a **Critical Hit**; a natural 1 always misses.
- Ability checks and saving throws have **no** automatic success or failure on a 20 or 1 under the core rules.

## Proficiency Bonus
| Level / CR | PB |
| --- | --- |
| 1–4 / CR 0–4 | +2 |
| 5–8 / CR 5–8 | +3 |
| 9–12 / CR 9–12 | +4 |
| 13–16 / CR 13–16 | +5 |
| 17–20 / CR 17–20 | +6 |

## Passive checks
**10 + all modifiers** that normally apply to the check (+5 for Advantage, −5 for Disadvantage). Passive Perception is the classic one.

See also [[Heroic Inspiration]], [[Skills]].
''')
rule('Core/Skills', 'Skills', '''| Skill | Ability | Typical use |
| --- | --- | --- |
| Acrobatics | Dex | Stay on your feet, tumble, escape a grapple |
| Animal Handling | Wis | Calm or control an animal |
| Arcana | Int | Spells, magic items, planes |
| Athletics | Str | Jump, climb, swim, shove, escape a grapple |
| Deception | Cha | Lie convincingly |
| History | Int | Past events, people, kingdoms |
| Insight | Wis | Read intentions and moods |
| Intimidation | Cha | Threaten or awe |
| Investigation | Int | Deduce from clues, find hidden details |
| Medicine | Wis | Diagnose; stabilise the dying (DC 10) |
| Nature | Int | Terrain, plants, animals, weather |
| Perception | Wis | Notice things with your senses |
| Performance | Cha | Entertain |
| Persuasion | Cha | Influence with tact and good faith |
| Religion | Int | Deities, rites, holy symbols |
| Sleight of Hand | Dex | Pickpocket, plant, conceal |
| Stealth | Dex | Avoid notice — see [[Hiding]] |
| Survival | Wis | Track, forage, navigate |
''')
rule('Core/Heroic Inspiration', 'Heroic Inspiration', '''- If you have Heroic Inspiration, you can expend it to **reroll any die** immediately after rolling it; you must use the new roll.
- You either have it or you don't — you can't hold more than one. If you'd gain it while you have it, you can give it to a player character in your group who lacks it.
- **DM tip:** award it for great roleplay, clever ideas, heroics or playing to a character's flaws. Human characters gain it whenever they finish a Long Rest (Resourceful trait).
''')
rule('Combat/Combat Flow', 'Combat flow', '''1. **Establish positions.** The DM decides where everyone is.
2. **Roll Initiative.** Everyone rolls a Dexterity check (d20 + Initiative modifier). The DM usually rolls once per group of identical monsters. Ties: the DM decides between monsters; players decide between players; DM decides between a player and a monster.
   - *Surprise:* a creature that is surprised has **Disadvantage** on its Initiative roll.
   - [[Invisible]] creatures have Advantage on Initiative; [[Incapacitated]] creatures have Disadvantage.
3. **Take turns** in Initiative order. On your turn you can **move** up to your Speed and take **one action**. You may also take one **Bonus Action** if something grants one, and one **Reaction** per round (it resets at the start of your turn).
4. **Begin the next round** when everyone has had a turn. A round is about 6 seconds.

**Free stuff on your turn:** communicate briefly, and interact with one object (draw a weapon, open a door) as part of movement or your action.

Track it all in the **initiative tracker** (ribbon ⚔ icon). See [[Actions in Combat]], [[Attacks and Cover]], [[Movement and Position]].
''', 'rule/combat')
rule('Combat/Actions in Combat', 'Actions in combat', '''| Action | Summary |
| --- | --- |
| **Attack** | Make one attack with a weapon or Unarmed Strike (more with Extra Attack). You can equip/unequip one weapon as part of each attack. |
| **Dash** | Gain extra movement equal to your Speed for this turn. |
| **Disengage** | Your movement doesn't provoke Opportunity Attacks for the rest of the turn. |
| **Dodge** | Until your next turn, attack rolls against you have Disadvantage (if you can see the attacker) and you have Advantage on Dex saves. Lost if you're [[Incapacitated]] or your Speed is 0. |
| **Help** | Either help an ally's next ability check (they gain Advantage), or distract a foe within 5 ft so the next attack roll against it by an ally has Advantage. |
| **Hide** | Make a DC 15 Dexterity (Stealth) check while Heavily Obscured or behind Three-Quarters/Total Cover, out of enemies' line of sight. See [[Hiding]]. |
| **Influence** | Use Deception, Intimidation, Performance, Persuasion or Animal Handling to sway a creature's attitude. |
| **Magic** | Cast a spell, use a magic item, or use a magical feature. |
| **Ready** | Choose a trigger and an action (or movement) to take as a Reaction when it happens. A readied spell requires [[Concentration]]. |
| **Search** | Wisdom check (Insight, Medicine, Perception or Survival) to discern something. |
| **Study** | Intelligence check (Arcana, History, Investigation, Nature or Religion) to recall or analyse. |
| **Utilize** | Use a nonmagical object that needs an action. |

**Opportunity Attack:** when a creature you can see leaves your reach using its action, Bonus Action, Reaction or movement, you can use your Reaction to make one melee attack against it.

**Two-Weapon Fighting:** when you attack with a Light weapon, you can make an extra attack with a different Light weapon as a Bonus Action (don't add your ability modifier to its damage unless negative). The **Nick** mastery moves that extra attack into the Attack action — see [[Weapon Mastery]].

**Grapple / Shove:** options of the Unarmed Strike — target makes a Str or Dex save vs **DC 8 + Str mod + PB**. Grapple applies [[Grappled]]; Shove pushes 5 ft or knocks [[Prone]].
''', 'rule/combat')
rule('Combat/Attacks and Cover', 'Attacks, damage & cover', '''## Making an attack
1. Choose a target in range. 2. Determine modifiers (cover, Advantage/Disadvantage). 3. Roll: **d20 + ability modifier + PB (if proficient)** vs the target's **AC**.

- **Melee** uses Strength (Finesse weapons can use Dex). **Ranged** uses Dexterity (Thrown weapons use the melee ability).
- Ranged attack **within 5 feet** of an enemy that can see you and isn't [[Incapacitated]]: Disadvantage.
- Beyond normal range (up to long range): Disadvantage.
- **Unseen attackers/targets:** attacking a target you can't see = Disadvantage; attacking while unseen = Advantage.

## Cover
| Cover | Effect |
| --- | --- |
| Half | +2 AC and Dex saves (low wall, another creature) |
| Three-quarters | +5 AC and Dex saves (arrow slit, thick tree trunk) |
| Total | Can't be targeted directly |

## Damage
- **Critical Hit:** roll the attack's damage dice twice and add them together, then add modifiers once.
- **Resistance** halves damage; **Vulnerability** doubles it; **Immunity** ignores it. Apply resistance before vulnerability; multiple instances of the same one count once.
- **Damage types:** Acid, Bludgeoning, Cold, Fire, Force, Lightning, Necrotic, Piercing, Poison, Psychic, Radiant, Slashing, Thunder.

## Improvised & unarmed
- **Unarmed Strike:** 1 + Str modifier Bludgeoning damage, or use it to Grapple or Shove.
- **Improvised weapons:** 1d4 damage, no proficiency unless it resembles a weapon you're proficient with.
''', 'rule/combat')
rule('Combat/Movement and Position', 'Movement & position', '''- **Difficult Terrain:** each foot costs 1 extra foot.
- **Breaking up movement:** you can move before, between and after your action and attacks.
- **Other creatures' spaces:** you can move through an ally's space; through an enemy's space only if it is two sizes larger or smaller than you. Another creature's space is Difficult Terrain. You can't willingly end your move in another creature's space.
- **Climbing, swimming, crawling:** each foot costs 1 extra foot (unless you have a Climb/Swim Speed).
- **Jumping:** Long Jump covers feet equal to your Strength score with a 10-ft running start (half without). High Jump is 3 + Str modifier feet with a running start (half without).
- **Falling:** 1d6 Bludgeoning per 10 feet fallen (max 20d6), and you land [[Prone]] unless you take no damage.
- **Size & space:** Tiny 2½ ft, Small/Medium 5 ft, Large 10 ft, Huge 15 ft, Gargantuan 20 ft.

## Vision & light
- **Lightly Obscured** (dim light, patchy fog): Disadvantage on Wisdom (Perception) checks that rely on sight.
- **Heavily Obscured** (darkness, thick fog): you effectively have the [[Blinded]] condition when trying to see something there.
- **Darkvision:** treat dim light as bright and darkness as dim light within range (no colour in darkness).
''', 'rule/combat')
rule('Combat/Hiding', 'Hiding', '''- **Hide action:** while Heavily Obscured or behind Three-Quarters or Total Cover, and out of any enemy's line of sight, make a **DC 15 Dexterity (Stealth)** check.
- **Success:** you have the [[Invisible]] condition while hidden. Note your check total — it's the DC for a creature to find you with a Wisdom (Perception) check.
- **It ends** when you make a sound louder than a whisper, an enemy finds you, you make an attack roll, or you cast a spell with a Verbal component.
- You can't hide from a creature that can see you clearly.
''', 'rule/combat')
rule('Combat/Death and Dying', 'Death, dying & healing', '''## Dropping to 0 Hit Points
- **Instant death:** if the remaining damage after hitting 0 HP equals or exceeds your Hit Point maximum.
- Otherwise you fall [[Unconscious]] and start making **Death Saving Throws**.
- Monsters usually just die at 0 HP (the DM may let important ones fall unconscious instead).

## Death Saving Throws
- At the start of each of your turns at 0 HP, roll a d20 with no modifiers.
- **10 or higher:** success. **9 or lower:** failure.
- **3 successes:** you become **Stable** (still Unconscious at 0 HP). **3 failures:** you die.
- **Natural 20:** you regain 1 Hit Point. **Natural 1:** counts as two failures.
- **Damage at 0 HP:** one failure (two on a Critical Hit). If it equals or exceeds your HP maximum, you die.

## Stabilising
- Help action + **DC 10 Wisdom (Medicine)** check stabilises a creature. A stable creature regains 1 HP after 1d4 hours.
- Any healing at 0 HP brings a creature back to consciousness and resets its death saves.

## Knocking out
When you reduce a creature to 0 HP with a melee attack, you can choose to knock it out instead: it falls Unconscious and is Stable.

## Temporary Hit Points
A buffer that's lost first; they don't stack (choose which to keep) and aren't healing. They last until depleted or you finish a Long Rest.
''', 'rule/combat')
rule('Combat/Concentration', 'Concentration', '''Some spells and effects require **Concentration** to stay active.

- **One at a time:** starting another Concentration effect ends the current one.
- **Taking damage:** make a **Constitution saving throw**, **DC 10 or half the damage taken (round down), whichever is higher — maximum DC 30**. On a failure, the effect ends. Make a separate save for each source of damage.
- **Incapacitated or dead:** Concentration ends immediately.
- You can end Concentration at any time (no action required).

*The initiative tracker shows the DC automatically when a creature marked **Concentrating** takes damage.*
''', 'rule/combat')
rule('Combat/Weapon Mastery', 'Weapon Mastery properties', '''Characters with the Weapon Mastery feature (Barbarian, Fighter, Paladin, Ranger, Rogue at level 1) can use the mastery property of weapons they've chosen.

| Mastery | Effect | Example weapons |
| --- | --- | --- |
| **Cleave** | When you hit with a melee attack, you can make a second attack against a different creature within 5 ft of the first and within your reach. Don't add your ability modifier to its damage unless negative. Once per turn. | Greataxe, Halberd |
| **Graze** | If your attack roll misses, the target still takes damage equal to your ability modifier (same damage type). | Glaive, Greatsword |
| **Nick** | The extra attack from the Light property can be made as part of the Attack action instead of a Bonus Action. Once per turn. | Dagger, Light Hammer, Sickle, Scimitar |
| **Push** | On a hit, push a Large or smaller target up to 10 ft straight away from you. | Greatclub, Pike, Warhammer, Heavy Crossbow |
| **Sap** | On a hit, the target has Disadvantage on its next attack roll before the start of your next turn. | Mace, Spear, Flail, Longsword, Morningstar, War Pick |
| **Slow** | On a hit that deals damage, reduce the target's Speed by 10 ft until the start of your next turn (doesn't stack). | Club, Javelin, Light Crossbow, Longbow, Sling, Whip |
| **Topple** | On a hit, the target makes a Con save (DC 8 + the attack's ability mod + PB) or falls [[Prone]]. | Quarterstaff, Battleaxe, Lance, Maul, Trident |
| **Vex** | On a hit that deals damage, you have Advantage on your next attack roll against that creature before the end of your next turn. | Handaxe, Dart, Shortbow, Rapier, Shortsword, Hand Crossbow |
''', 'rule/combat')
rule('Adventuring/Resting', 'Resting', '''## Short Rest
- At least **1 hour** of light activity.
- Spend any number of **Hit Point Dice**: roll each + Con modifier and regain that many HP.
- Interrupted by rolling Initiative, casting a spell (other than a cantrip) or taking damage.

## Long Rest
- At least **8 hours**: sleep for 6+ hours and spend the rest on light activity.
- Regain **all lost Hit Points** and **all spent Hit Point Dice**. Restored HP maximum and abilities that reset on a Long Rest.
- Reduce [[Exhaustion]] by 1 level.
- Interrupted by 1 hour or more of walking or other strenuous activity, rolling Initiative, casting a non-cantrip spell, or taking damage. If interrupted you can resume later; an interrupted rest of at least 1 hour counts as a Short Rest.
- You can't benefit from more than one Long Rest in a 24-hour period, and you must have at least 1 HP to start one.
''', 'rule/adventuring')
rule('Adventuring/Travel and Exploration', 'Travel & exploration', '''## Travel pace
| Pace | Per hour | Per day | Effect |
| --- | --- | --- | --- |
| Fast | 4 miles | 30 miles | Disadvantage on Wisdom (Perception or Survival) checks |
| Normal | 3 miles | 24 miles | — |
| Slow | 2 miles | 18 miles | Advantage on Wisdom (Perception or Survival) checks |

- Difficult terrain over long distances halves the miles covered.
- **Forced march:** beyond 8 hours of travel, each extra hour requires a Constitution save (DC 10 + 1 per extra hour) or gain 1 level of [[Exhaustion]].

## Exploration checks
- **Noticing threats:** use the group's Passive Perception.
- **Navigation:** Wisdom (Survival) when off-road or in bad conditions.
- **Foraging:** Wisdom (Survival) to find food and water.

## Food & water (rules of thumb)
Characters who go without food or water for too long risk [[Exhaustion]]. Let the party track rations loosely; make it matter only in survival-focused adventures.

## Social interaction
NPC attitudes are **Friendly**, **Indifferent** or **Hostile**. Use the **Influence** action (see [[Actions in Combat]]) — the DC is often 15 for an Indifferent creature, harder (or impossible) for a Hostile one.
''', 'rule/adventuring')
rule('DM/Encounter Building', 'Encounter building (2024)', '''## Step 1 — choose a difficulty
- **Low:** some risk, resources spent, probably no deaths.
- **Moderate:** could go badly without smart play; a character might drop.
- **High:** could be lethal for one or more characters.

## Step 2 — XP budget per character
| Level | Low | Moderate | High |
| --- | --- | --- | --- |
| 1 | 50 | 75 | 100 |
| 2 | 100 | 150 | 200 |
| 3 | 150 | 225 | 400 |
| 4 | 250 | 375 | 500 |
| 5 | 500 | 750 | 1,100 |
| 6 | 600 | 1,000 | 1,400 |
| 7 | 750 | 1,300 | 1,700 |
| 8 | 1,000 | 1,700 | 2,100 |
| 9 | 1,300 | 2,000 | 2,600 |
| 10 | 1,600 | 2,300 | 3,100 |
| 11 | 1,900 | 2,900 | 4,100 |
| 12 | 2,200 | 3,700 | 4,700 |
| 13 | 2,600 | 4,200 | 5,400 |
| 14 | 2,900 | 4,900 | 6,200 |
| 15 | 3,300 | 5,400 | 7,800 |
| 16 | 3,800 | 6,100 | 9,800 |
| 17 | 4,500 | 7,200 | 11,700 |
| 18 | 5,000 | 8,700 | 14,200 |
| 19 | 5,500 | 10,700 | 17,200 |
| 20 | 6,400 | 13,200 | 22,000 |

Add up the budget for every character.

## Step 3 — spend the budget
Pick monsters whose XP totals no more than the budget. Unlike 2014, there's **no multiplier** for the number of monsters.

## XP by Challenge Rating
| CR | XP | CR | XP | CR | XP |
| --- | --- | --- | --- | --- | --- |
| 0 | 0–10 | 6 | 2,300 | 14 | 11,500 |
| 1/8 | 25 | 7 | 2,900 | 15 | 13,000 |
| 1/4 | 50 | 8 | 3,900 | 16 | 15,000 |
| 1/2 | 100 | 9 | 5,000 | 17 | 18,000 |
| 1 | 200 | 10 | 5,900 | 18 | 20,000 |
| 2 | 450 | 11 | 7,200 | 19 | 22,000 |
| 3 | 700 | 12 | 8,400 | 20 | 25,000 |
| 4 | 1,100 | 13 | 10,000 | 21 | 33,000 |
| 5 | 1,800 | | | 22–30 | 41,000–155,000 |

## Tips
- Avoid a single monster whose CR is higher than the party's level unless it's a set-piece fight.
- Many weak creatures make for a swingy fight; check action economy as well as XP.
- Use the ` ```encounter``` ` block in [[Encounter Builder]] to do the maths automatically.
''', 'rule/dm')

w('Rules 2024/Rules 2024 Index.md', '''---
type: rule
tags: [rule]
---
# Rules 2024 — index

Quick-reference notes summarising the **2024 rules** as published in the free *System Reference Document 5.2* (CC-BY-4.0). Every note is a link target — write `[[Prone]]` or `[[Grappled]]` in a session or statblock and it just works.

## Core
- [[D20 Tests and DCs]] · [[Skills]] · [[Heroic Inspiration]]

## Combat
- [[Combat Flow]] · [[Actions in Combat]] · [[Attacks and Cover]] · [[Movement and Position]]
- [[Hiding]] · [[Concentration]] · [[Death and Dying]] · [[Weapon Mastery]]

## Conditions
- [[Conditions]] — ''' + ' · '.join(f'[[{n}]]' for n in C) + '''

## Adventuring
- [[Resting]] · [[Travel and Exploration]]

## Spellcasting
- [[Spellcasting Basics|Spellcasting rules]] · [[Areas of Effect]] · [[Spell Slots by Class]] · [[Spell List]]

## Running the game
- [[Encounter Building]] · [[Encounter Builder]] · [[Bestiary Index]] · [[Random Tables]] · [[Armory Index|Armory]]

## Species & classes (2024 SRD)
- **Species:** Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, Tiefling (+ more in the PHB).
- **Classes:** Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard.
- **Origin:** a character's background provides +2/+1 (or +1/+1/+1) ability score increases, an Origin feat, two skills and a tool proficiency.
''' + SRC)
print('rules done')
