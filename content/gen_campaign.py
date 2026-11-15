"""The Ashen Crown — a Sword Coast campaign for levels 5–15 (D&D 2024).

Generates the example campaign shipped with the DM Vault: party, NPCs, villains and
monsters (homebrew statblocks), magic items, places, factions, quests, arcs, encounters,
a played Session Zero, Session 1 with its prep, handouts and ideas.
"""
import os, sys, json
V = sys.argv[1]
q = json.dumps

import re
# spells referenced here that aren't among the vault's spell notes: shown in italics instead of as links
NO_NOTE = {'Bestow Curse', 'Color Spray', 'Dominate Person', 'Globe of Invulnerability', 'Gust of Wind', 'Heat Metal', 'Illusory Script', 'Knock', 'Plane Shift', 'Prismatic Spray', 'Speak with Animals'}
def w(path, text):
    p = os.path.join(V, path); os.makedirs(os.path.dirname(p), exist_ok=True)
    text = re.sub(r'\[\[([^\]|]+)\]\]', lambda m: '*' + m.group(1) + '*' if m.group(1) in NO_NOTE else m.group(0), text)
    open(p, 'w', encoding='utf-8').write(text.lstrip('\n'))

def entries(key, items):
    if not items: return ''
    out = f'{key}:\n'
    for n, d in items: out += f'  - name: {q(n)}\n    desc: {q(d)}\n'
    return out

SB_KEYS = ['name', 'size', 'type', 'alignment', 'ac', 'initiative', 'hp', 'hit_dice', 'speed', 'str', 'dex', 'con', 'int', 'wis', 'cha',
           'saves', 'skills', 'vulnerabilities', 'resistances', 'immunities', 'gear', 'senses', 'languages', 'cr']
def statblock(m):
    s = '```statblock\n'
    for k in SB_KEYS:
        if k in m and m[k] is not None:
            v = m[k]; s += f'{k}: {q(v) if isinstance(v, (str, list, dict)) else v}\n'
    for k in ['traits', 'actions', 'bonus_actions', 'reactions']:
        if m.get(k): s += entries(k, m[k])
    if m.get('legendary_actions'):
        s += f'legendary_intro: {q(m.get("legendary_intro", ""))}\n' + entries('legendary_actions', m['legendary_actions'])
    s += 'source: "Homebrew — The Ashen Crown"\n'
    return s + '```\n'

CR_XP = {'0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900,
         '9': 5000, '10': 5900, '21': 33000, '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000, '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000}
# 2024 XP budget per character: (Low, Moderate, High)
BUDGET = {5: (500, 750, 1100), 6: (600, 1000, 1400), 7: (750, 1300, 1700), 8: (1000, 1700, 2100), 9: (1300, 2000, 2600), 10: (1600, 2300, 3100),
          11: (1900, 2900, 4100), 12: (2200, 3700, 4700), 13: (2600, 4200, 5400), 14: (2900, 4900, 6200), 15: (3300, 5400, 7800)}

MONSTERS = {}
def monster(name, ct, env, tactics, villain=None, **m):
    m['name'] = name
    MONSTERS[name] = dict(m=m, ct=ct, env=env, tactics=tactics, villain=villain)

A, R, H = '*Melee Attack Roll:*', '*Ranged Attack Roll:*', '*Hit:*'
def sv(ab): return f'*{ab} Saving Throw:*'

# ============================================================================
# Monsters — the Ashen Hand and its servants
# ============================================================================
monster('Ashen Hand Initiate', 'Humanoid', ['urban', 'any'],
  'The desperate: dockhands, debtors, runaways. They fight in a ragged crowd and throw firepots before closing in. Half of them surrender if their leader falls; they can be talked down (DC 13 Persuasion) by anyone who offers them a real way out.',
  size='Medium', type='Humanoid', alignment='Neutral Evil', ac=12, initiative=2, hp=22, hit_dice='4d8 + 4', speed='30 ft.',
  str=10, dex=14, con=12, int=10, wis=10, cha=11, skills='Deception +2', gear='Leather Armor, Dagger, Firepots (3)', senses='Passive Perception 10', languages='Common', cr='1/2',
  traits=[('Ash Oath', 'When the initiate drops to 0 Hit Points, it crumbles into hot ash. ' + sv('Dexterity') + ' DC 11, each creature within 5 feet. *Failure:* 3 (1d6) Fire damage.')],
  actions=[('Ember Knife', f'{A} +4, reach 5 ft. {H} 4 (1d4 + 2) Piercing damage plus 3 (1d6) Fire damage.'),
           ('Firepot', f'{R} +4, range 20/60 ft. {H} 5 (2d4) Fire damage. *Miss:* The pot bursts in the target\'s space; it is Difficult Terrain (burning oil) until the end of the initiate\'s next turn.')])

monster('Ashen Hand Cinderblade', 'Humanoid', ['urban', 'any'],
  'The Hand\'s soldiers. They pair up, one Parrying while the other presses, and use Smoke Step to reach spellcasters. They never retreat while a pyre-priest watches.',
  size='Medium', type='Humanoid', alignment='Lawful Evil', ac=16, initiative=3, hp=75, hit_dice='10d8 + 30', speed='30 ft.',
  str=16, dex=14, con=16, int=10, wis=12, cha=12, saves=['str', 'con'], skills='Athletics +5, Intimidation +3', resistances='Fire',
  gear='Breastplate, Ashblade (Longsword)', senses='Passive Perception 11', languages='Common', cr='4',
  actions=[('Multiattack', 'The cinderblade makes two Ashblade attacks.'),
           ('Ashblade', f'{A} +5, reach 5 ft. {H} 7 (1d8 + 3) Slashing damage plus 4 (1d8) Fire damage.')],
  bonus_actions=[('Smoke Step (Recharge 5–6)', 'The cinderblade teleports up to 15 feet to an unoccupied space it can see that is within 5 feet of a fire or inside smoke.')],
  reactions=[('Parry', '*Trigger:* The cinderblade is hit by a melee attack roll while holding a weapon. *Response:* The cinderblade adds 2 to its AC against that attack, possibly causing it to miss.')])

monster('Ashen Hand Pyre-Priest', 'Humanoid', ['urban', 'any'],
  'Stays behind a wall of cinderblades. Opens with Sermon of Ash, then Fireball on clustered heroes; uses Hold Person on whoever is guarding the shard.',
  size='Medium', type='Humanoid (Cleric)', alignment='Neutral Evil', ac=15, initiative=1, hp=82, hit_dice='11d8 + 33', speed='30 ft.',
  str=12, dex=12, con=16, int=12, wis=17, cha=14, saves=['con', 'wis'], skills='Persuasion +5, Religion +4', resistances='Fire',
  gear='Scale Mail, Censer Flail', senses='Passive Perception 13', languages='Common, Draconic', cr='5',
  traits=[('Kaurvex\'s Favor', 'Fire damage dealt by the priest ignores Resistance to Fire.')],
  actions=[('Multiattack', 'The priest makes two attacks, using Censer Flail or Ash Ray in any combination.'),
           ('Censer Flail', f'{A} +4, reach 5 ft. {H} 5 (1d8 + 1) Bludgeoning damage plus 7 (2d6) Fire damage.'),
           ('Ash Ray', '*Ranged Attack Roll:* +6, range 120 ft. *Hit:* 10 (3d6) Fire damage.'),
           ('Spellcasting', 'The priest casts one of the following spells, using Wisdom as the spellcasting ability (spell save DC 14): **At will:** [[Thaumaturgy]] · **2/day each:** [[Command]], [[Hold Person]] · **1/day each:** [[Fireball]], [[Spirit Guardians]]')],
  bonus_actions=[('Sermon of Ash (Recharge 5–6)', 'Each ally within 30 feet of the priest that can hear it gains 10 Temporary Hit Points.')])

monster('Ash-Bound Hound', 'Monstrosity', ['urban', 'mountain', 'any'],
  'Bred in the Hand\'s kennels from wolves fed on cinders. They hunt in packs of three, circle to flank, and breathe ash to blind before closing in.',
  size='Medium', type='Monstrosity', alignment='Unaligned', ac=14, initiative=3, hp=58, hit_dice='9d8 + 18', speed='50 ft.',
  str=17, dex=14, con=15, int=6, wis=13, cha=6, skills='Perception +5, Stealth +4', immunities='Fire',
  senses='Darkvision 60 ft.; Passive Perception 15', languages='understands Draconic but can\'t speak', cr='3',
  traits=[('Pack Tactics', 'The hound has Advantage on an attack roll against a creature if at least one of the hound\'s allies is within 5 feet of the creature and the ally doesn\'t have the Incapacitated condition.'),
          ('Smoldering Hide', 'A creature that hits the hound with a melee attack while within 5 feet of it takes 3 (1d6) Fire damage.')],
  actions=[('Bite', f'{A} +5, reach 5 ft. {H} 7 (1d8 + 3) Piercing damage plus 7 (2d6) Fire damage.'),
           ('Ash Breath (Recharge 5–6)', sv('Constitution') + ' DC 12, each creature in a 15-foot Cone. *Failure:* 14 (4d6) Fire damage, and the target has the [[Blinded]] condition until the end of its next turn. *Success:* Half damage only.')])

monster('Soot Imp', 'Elemental', ['urban', 'mountain', 'any'],
  'Mischief-spirits of the cult\'s braziers. They swarm light sources, snuff torches and puff soot in faces. When one dies, the others use its cloud to hide.',
  size='Small', type='Elemental', alignment='Neutral Evil', ac=12, initiative=2, hp=22, hit_dice='5d6 + 5', speed='30 ft., Fly 30 ft.',
  str=7, dex=14, con=12, int=8, wis=10, cha=12, immunities='Fire, Poison; Poisoned', senses='Darkvision 60 ft.; Passive Perception 10', languages='Primordial (Ignan), understands Common', cr='1/2',
  traits=[('Death Puff', 'When the imp dies, it bursts into a 10-foot-radius Sphere of soot that is Heavily Obscured until the end of its next turn.')],
  actions=[('Claws', f'{A} +4, reach 5 ft. {H} 4 (1d4 + 2) Slashing damage plus 2 (1d4) Fire damage.'),
           ('Soot Spray (Recharge 6)', sv('Constitution') + ' DC 11, each creature in a 15-foot Cone. *Failure:* 7 (2d6) Poison damage, and the target has the [[Blinded]] condition until the end of its next turn. *Success:* Half damage only.')])

monster('Cinder Wraith', 'Undead', ['dungeon', 'urban', 'any'],
  'What remains of someone the Hand burned to clear a path to a shard. It drifts through walls toward the living, shrieks to scatter them, and lingers over anyone who falls. Dousing it with water makes it vulnerable.',
  size='Medium', type='Undead', alignment='Chaotic Evil', ac=14, initiative=3, hp=90, hit_dice='12d8 + 36', speed='5 ft., Fly 60 ft. (hover)',
  str=6, dex=16, con=16, int=10, wis=13, cha=15, resistances='Acid, Cold, Lightning, Necrotic',
  immunities='Fire, Poison; Charmed, Exhaustion, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained',
  senses='Darkvision 60 ft.; Passive Perception 11', languages='the languages it knew in life', cr='6',
  traits=[('Incorporeal Movement', 'The wraith can move through other creatures and objects as if they were Difficult Terrain. It takes 5 (1d10) Force damage if it ends its turn inside an object.'),
          ('Quenchable', 'If the wraith is doused with at least a gallon of water or takes 10 or more Cold damage in one turn, it loses its Fire damage and can\'t use Ashen Wail until the end of its next turn.')],
  actions=[('Multiattack', 'The wraith makes two Kindled Touch attacks.'),
           ('Kindled Touch', f'{A} +6, reach 5 ft. {H} 10 (2d6 + 3) Necrotic damage plus 7 (2d6) Fire damage.'),
           ('Ashen Wail (Recharge 5–6)', sv('Wisdom') + ' DC 13, each creature within 30 feet that can hear the wraith. *Failure:* The target has the [[Frightened]] condition until the end of its next turn.')])

monster('Ash Drake', 'Dragon', ['mountain'],
  'Lesser kin of the ash dragons that nest on Mount Hotenow. Strafes from the air, breathes, then lands on a lone target. Flees when Bloodied unless guarding eggs.',
  size='Large', type='Dragon', alignment='Unaligned', ac=16, initiative=2, hp=102, hit_dice='12d10 + 36', speed='30 ft., Fly 60 ft.',
  str=19, dex=12, con=17, int=6, wis=12, cha=8, saves=['dex', 'con'], skills='Perception +4', immunities='Fire',
  senses='Blindsight 30 ft., Darkvision 60 ft.; Passive Perception 14', languages='understands Draconic but can\'t speak', cr='5',
  actions=[('Multiattack', 'The drake makes one Bite attack and one Tail attack.'),
           ('Bite', f'{A} +7, reach 5 ft. {H} 9 (1d10 + 4) Piercing damage plus 3 (1d6) Fire damage.'),
           ('Tail', f'{A} +7, reach 10 ft. {H} 8 (1d8 + 4) Bludgeoning damage.'),
           ('Cinder Breath (Recharge 5–6)', sv('Dexterity') + ' DC 14, each creature in a 30-foot Cone. *Failure:* 27 (6d8) Fire damage. *Success:* Half damage. The Cone is Lightly Obscured by drifting ash until the start of the drake\'s next turn.')])

monster('Slag Golem', 'Construct', ['mountain', 'dungeon'],
  'Forged by Ruuk Ashgrinder from cooled lava and dwarven runes. Guards a doorway and never pursues more than 60 feet. Cold damage slows it; heroes who notice get a big advantage.',
  size='Large', type='Construct', alignment='Unaligned', ac=17, initiative=-1, hp=133, hit_dice='14d10 + 56', speed='20 ft.',
  str=21, dex=8, con=18, int=3, wis=10, cha=1, immunities='Fire, Poison, Psychic; Charmed, Exhaustion, Frightened, Paralyzed, Petrified, Poisoned',
  senses='Darkvision 120 ft.; Passive Perception 10', languages='understands Dwarvish but can\'t speak', cr='7',
  traits=[('Cooling Crust', 'If the golem takes Cold damage, its Speed is halved and it can\'t use Slag Spray until the end of its next turn.'),
          ('Immutable Form', 'The golem can\'t shape-shift.')],
  actions=[('Multiattack', 'The golem makes two Slam attacks.'),
           ('Slam', f'{A} +8, reach 10 ft. {H} 14 (2d8 + 5) Bludgeoning damage plus 7 (2d6) Fire damage.'),
           ('Slag Spray (Recharge 5–6)', sv('Dexterity') + ' DC 15, each creature in a 15-foot Cone. *Failure:* 31 (7d8) Fire damage, and the target\'s Speed is reduced by 10 feet until the end of its next turn as the slag hardens. *Success:* Half damage only.')])

monster('Rime Wolf', 'Monstrosity', ['arctic'],
  'White-furred wolves of the ice north of Revel\'s End. A pack of four tests the party, knocks the weakest Prone and drags them off. They hate fire and break from a wall of flame.',
  size='Large', type='Monstrosity', alignment='Unaligned', ac=13, initiative=1, hp=52, hit_dice='8d10 + 8', speed='50 ft.',
  str=17, dex=13, con=13, int=5, wis=12, cha=8, skills='Perception +5, Stealth +3', immunities='Cold',
  senses='Darkvision 60 ft.; Passive Perception 15', languages='—', cr='2',
  traits=[('Pack Tactics', 'The wolf has Advantage on an attack roll against a creature if at least one of the wolf\'s allies is within 5 feet of the creature and the ally doesn\'t have the Incapacitated condition.'),
          ('Snow Camouflage', 'The wolf has Advantage on Dexterity (Stealth) checks made to hide in snowy terrain.')],
  actions=[('Bite', f'{A} +5, reach 5 ft. {H} 10 (2d6 + 3) Piercing damage. If the target is a Medium or smaller creature, it has the [[Prone]] condition.'),
           ('Frost Breath (Recharge 5–6)', sv('Constitution') + ' DC 11, each creature in a 15-foot Cone. *Failure:* 13 (3d8) Cold damage. *Success:* Half damage.')])

monster('Rime Troll', 'Giant', ['arctic'],
  'Lairs under the broken dock below Revel\'s End. It regenerates unless burned — so the Ashen Hand\'s firepots, stolen and thrown, are the party\'s best friend.',
  size='Large', type='Giant', alignment='Chaotic Evil', ac=15, initiative=0, hp=115, hit_dice='11d10 + 55', speed='30 ft., Swim 30 ft.',
  str=20, dex=11, con=20, int=7, wis=9, cha=7, skills='Perception +2', immunities='Cold', vulnerabilities='Fire',
  senses='Darkvision 60 ft.; Passive Perception 12', languages='Giant', cr='7',
  traits=[('Regeneration', 'The troll regains 10 Hit Points at the start of each of its turns. If the troll takes Fire or Acid damage, this trait doesn\'t function on the troll\'s next turn. The troll dies only if it starts its turn with 0 Hit Points and doesn\'t regenerate.')],
  actions=[('Multiattack', 'The troll makes one Bite attack and two Claw attacks.'),
           ('Bite', f'{A} +8, reach 5 ft. {H} 10 (1d10 + 5) Piercing damage.'),
           ('Claw', f'{A} +8, reach 10 ft. {H} 12 (2d6 + 5) Slashing damage plus 5 (2d4) Cold damage.')])

monster('Revel\'s End Warden-Guard', 'Humanoid', ['arctic', 'urban'],
  'Disciplined and honest. They fight in pairs, manacle anyone who goes down, and ring the alarm bell on the first round. They can be reasoned with if the party isn\'t obviously hostile.',
  size='Medium', type='Humanoid', alignment='Lawful Neutral', ac=18, initiative=0, hp=52, hit_dice='8d8 + 16', speed='30 ft.',
  str=16, dex=11, con=14, int=10, wis=12, cha=10, saves=['con', 'wis'], skills='Athletics +5, Perception +3',
  gear='Chain Mail, Shield, Flanged Mace, Manacles, Light Crossbow', senses='Passive Perception 13', languages='Common', cr='3',
  traits=[('Ice-Hardened', 'The guard has Advantage on saving throws to avoid or end the [[Exhaustion]] condition caused by cold.')],
  actions=[('Multiattack', 'The guard makes two Flanged Mace attacks, or one Flanged Mace attack and one Manacle attack.'),
           ('Flanged Mace', f'{A} +5, reach 5 ft. {H} 7 (1d8 + 3) Bludgeoning damage.'),
           ('Manacle', f'{A} +5, reach 5 ft. {H} The target has the [[Grappled]] condition (escape DC 13). While Grappled, it has the [[Restrained]] condition.'),
           ('Light Crossbow', f'{R} +2, range 80/320 ft. {H} 4 (1d8) Piercing damage.')],
  reactions=[('Interpose', '*Trigger:* A creature the guard can see attacks an ally within 5 feet of the guard. *Response:* The guard imposes Disadvantage on the attack roll.')])

monster('Drowned Ashwalker', 'Undead', ['swamp'],
  'Victims the Hand drowned in the Mere when they first hid the Shard of Smoke. Rise from smouldering peat, choke anyone close, and drag the dying under.',
  size='Medium', type='Undead', alignment='Neutral Evil', ac=13, initiative=-1, hp=76, hit_dice='9d8 + 36', speed='20 ft., Swim 30 ft.',
  str=17, dex=8, con=18, int=6, wis=10, cha=12, saves=['wis'], resistances='Fire', immunities='Necrotic, Poison; Charmed, Exhaustion, Frightened, Poisoned',
  senses='Darkvision 60 ft.; Passive Perception 10', languages='understands the languages it knew in life but can\'t speak', cr='4',
  traits=[('Smoldering Peat', 'A creature that starts its turn within 5 feet of the ashwalker takes 3 (1d6) Fire damage.')],
  actions=[('Multiattack', 'The ashwalker makes two Peat Fist attacks.'),
           ('Peat Fist', f'{A} +5, reach 5 ft. {H} 10 (2d6 + 3) Bludgeoning damage plus 3 (1d6) Fire damage.'),
           ('Choking Ash (Recharge 5–6)', sv('Constitution') + ' DC 14, each creature in a 10-foot Emanation originating from the ashwalker. *Failure:* 14 (4d6) Poison damage, and the target has the [[Poisoned]] condition until the end of its next turn. *Success:* Half damage only.')])

monster('Mire Lurker', 'Monstrosity', ['swamp'],
  'An ash-backed crocodilian the size of a longboat, Mother Soot\'s pet. It grabs one creature and drags it under; free the victim by dealing 20 damage to it in one turn or with a DC 16 escape.',
  size='Huge', type='Monstrosity', alignment='Unaligned', ac=15, initiative=0, hp=126, hit_dice='11d12 + 55', speed='30 ft., Swim 50 ft.',
  str=22, dex=10, con=20, int=3, wis=12, cha=5, skills='Stealth +3', senses='Darkvision 60 ft.; Passive Perception 11', languages='—', cr='6',
  traits=[('Hold Breath', 'The lurker can hold its breath for 1 hour.')],
  actions=[('Multiattack', 'The lurker makes one Bite attack and one Tail attack.'),
           ('Bite', f'{A} +9, reach 10 ft. {H} 22 (3d10 + 6) Piercing damage. If the target is a Large or smaller creature, it has the [[Grappled]] condition (escape DC 16). While Grappled, the target has the [[Restrained]] condition, and the lurker can\'t Bite another target.'),
           ('Tail', f'{A} +9, reach 15 ft. {H} 15 (2d8 + 6) Bludgeoning damage. If the target is a Large or smaller creature, it has the [[Prone]] condition.')])

monster('Burnt Page Swarm', 'Construct', ['dungeon', 'urban'],
  'A storm of half-burned pages animated by the Hand\'s fire-rite in the Lantern Library. It smothers readers and blinds the curious. Water or a Gust of Wind disperses it.',
  size='Medium', type='Swarm of Tiny Constructs', alignment='Unaligned', ac=13, initiative=3, hp=45, hit_dice='10d8', speed='0 ft., Fly 40 ft. (hover)',
  str=3, dex=16, con=10, int=4, wis=10, cha=1, resistances='Bludgeoning, Piercing, Slashing',
  immunities='Fire, Poison, Psychic; Charmed, Frightened, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned',
  senses='Blindsight 60 ft. (blind beyond this radius); Passive Perception 10', languages='—', cr='3',
  traits=[('Swarm', 'The swarm can occupy another creature\'s space and vice versa, and the swarm can move through any opening large enough for a Tiny creature. The swarm can\'t regain Hit Points or gain Temporary Hit Points.')],
  actions=[('Paper Cuts', f'{A} +5, reach 5 ft. {H} 10 (4d4) Slashing damage, or 5 (2d4) Slashing damage if the swarm is Bloodied, plus 5 (2d4) Fire damage.'),
           ('Searing Words (Recharge 5–6)', sv('Intelligence') + ' DC 12, each creature in the swarm\'s space. *Failure:* The target has the [[Blinded]] condition until the end of its next turn as burning letters crawl across its eyes.')])

monster('Flaming Fist Turncoat', 'Humanoid', ['urban'],
  'Mercenaries of Baldur\'s Gate\'s Flaming Fist who take the Hand\'s coin. Professional, not fanatical: they surrender when Captain Halloran falls or when the pay clearly isn\'t worth it.',
  size='Medium', type='Humanoid', alignment='Neutral Evil', ac=17, initiative=2, hp=45, hit_dice='7d8 + 14', speed='30 ft.',
  str=15, dex=14, con=14, int=10, wis=11, cha=10, skills='Athletics +4, Perception +2', gear='Splint Armor, Longsword, Heavy Crossbow',
  senses='Passive Perception 12', languages='Common', cr='2',
  actions=[('Multiattack', 'The turncoat makes two Longsword attacks or two Heavy Crossbow attacks.'),
           ('Longsword', f'{A} +4, reach 5 ft. {H} 6 (1d8 + 2) Slashing damage.'),
           ('Heavy Crossbow', f'{R} +4, range 100/400 ft. {H} 7 (1d10 + 2) Piercing damage.')])

monster('Sword Coast Agent', 'Humanoid', ['urban', 'any'],
  'A trained spy or duelist (Harpers, Lords\' Alliance, a noble house). Uses Cunning Action to stay out of reach and fights only long enough to escape with information.',
  size='Medium', type='Humanoid', alignment='Any Alignment', ac=15, initiative=4, hp=71, hit_dice='13d8 + 13', speed='30 ft.',
  str=10, dex=18, con=12, int=13, wis=14, cha=14, saves=['dex', 'int'], skills='Deception +4, Insight +4, Perception +4, Stealth +6',
  gear='Studded Leather Armor, Rapier, Hand Crossbow', senses='Passive Perception 14', languages='Common, Thieves\' Cant, one other', cr='4',
  traits=[('Sneak Attack (1/Turn)', 'The agent deals an extra 10 (3d6) damage when it hits with an attack and has Advantage on the roll, or when an ally is within 5 feet of the target.')],
  actions=[('Multiattack', 'The agent makes two Rapier attacks or two Hand Crossbow attacks.'),
           ('Rapier', f'{A} +6, reach 5 ft. {H} 8 (1d8 + 4) Piercing damage.'),
           ('Hand Crossbow', f'{R} +6, range 30/120 ft. {H} 7 (1d6 + 4) Piercing damage.')],
  bonus_actions=[('Cunning Action', 'The agent takes the Dash, Disengage, or Hide action.')])

monster('Battle Mage', 'Humanoid', ['urban', 'any'],
  'A war-trained wizard (Neverwinter\'s academies, a Harper cell). Keeps distance, opens with Fireball or Lightning Bolt and Counterspells the enemy\'s biggest spell.',
  size='Medium', type='Humanoid (Wizard)', alignment='Any Alignment', ac=12, initiative=2, hp=84, hit_dice='13d8 + 26', speed='30 ft.',
  str=9, dex=14, con=14, int=18, wis=13, cha=11, saves=['int', 'wis'], skills='Arcana +7, History +7', gear='Wand, Spellbook',
  senses='Passive Perception 11', languages='Common, Draconic, Elvish, Dwarvish', cr='6',
  actions=[('Multiattack', 'The mage makes three Arcane Burst attacks.'),
           ('Arcane Burst', '*Melee or Ranged Attack Roll:* +7, reach 5 ft. or range 120 ft. *Hit:* 13 (2d8 + 4) Force damage.'),
           ('Spellcasting', 'The mage casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 15): **At will:** [[Detect Magic]], [[Mage Hand]], [[Prestidigitation]] · **2/day each:** [[Fireball]], [[Lightning Bolt]], [[Misty Step]] · **1/day each:** [[Cone of Cold]], [[Greater Invisibility]]')],
  reactions=[('Protective Ward (2/Day)', '*Trigger:* The mage or an ally within 30 feet is hit by an attack roll. *Response:* The target gains a +5 bonus to AC against that attack (as the [[Shield]] spell), possibly causing it to miss.')])

monster('Mirror Shade', 'Aberration', ['planar', 'dungeon'],
  'Born from the Glass Oubliette\'s endless reflections. It hides in mirrors, steps out behind the party, and steals reflections so wounds can\'t close. Breaking the mirrors (AC 13, 10 HP each) strands it.',
  size='Medium', type='Aberration', alignment='Neutral Evil', ac=15, initiative=5, hp=110, hit_dice='17d8 + 34', speed='30 ft., Fly 30 ft. (hover)',
  str=8, dex=20, con=14, int=14, wis=14, cha=16, saves=['dex', 'wis'], skills='Deception +6, Stealth +8', resistances='Psychic, Radiant',
  immunities='Blinded, Charmed', senses='Truesight 30 ft.; Passive Perception 12', languages='Common, Elvish, telepathy 60 ft.', cr='8',
  traits=[('Reflected Form', 'While the shade is in Bright Light, attack rolls against it have Disadvantage unless the attacker can see it reflected in a mirror.')],
  actions=[('Multiattack', 'The shade makes three Glass Talon attacks.'),
           ('Glass Talon', f'{A} +8, reach 5 ft. {H} 12 (2d6 + 5) Slashing damage plus 3 (1d6) Psychic damage.'),
           ('Steal Reflection (Recharge 5–6)', sv('Charisma') + ' DC 14, one creature the shade can see within 30 feet. *Failure:* 27 (6d8) Psychic damage, and the target can\'t regain Hit Points until the end of the shade\'s next turn. *Success:* Half damage only.')],
  bonus_actions=[('Mirror Step', 'The shade teleports from a reflective surface it is touching to an unoccupied space within 5 feet of another reflective surface it can see within 60 feet.')])

monster('Prismatic Sentinel', 'Construct', ['planar', 'dungeon'],
  'Warden-constructs built by the Harpers to keep Taramon in. They attack anyone without a Harper pin, start every fight with Color Pulse and aim the beam down the longest line of heroes.',
  size='Large', type='Construct', alignment='Lawful Neutral', ac=18, initiative=1, hp=152, hit_dice='16d10 + 64', speed='30 ft.',
  str=22, dex=12, con=18, int=8, wis=14, cha=10, saves=['con', 'wis'], resistances='Cold, Fire, Lightning',
  immunities='Poison, Psychic; Charmed, Exhaustion, Frightened, Paralyzed, Petrified, Poisoned',
  senses='Darkvision 120 ft.; Passive Perception 12', languages='understands Common and Elvish but can\'t speak', cr='10',
  traits=[('Magic Resistance', 'The sentinel has Advantage on saving throws against spells and other magical effects.')],
  actions=[('Multiattack', 'The sentinel makes two Prism Fist attacks. It can replace one attack with Refracted Beam, if available.'),
           ('Prism Fist', f'{A} +10, reach 10 ft. {H} 19 (3d8 + 6) Bludgeoning damage.'),
           ('Refracted Beam (Recharge 5–6)', sv('Dexterity') + ' DC 16, each creature in a 60-foot-long, 5-foot-wide Line. *Failure:* 45 (10d8) damage of a type the sentinel chooses: Cold, Fire, Lightning, or Radiant. *Success:* Half damage.')],
  bonus_actions=[('Color Pulse', sv('Wisdom') + ' DC 16, each creature within 10 feet of the sentinel. *Failure:* The target has the [[Blinded]] condition until the start of the sentinel\'s next turn.')])

monster('Ashen Hand Pyrelord', 'Humanoid', ['mountain', 'urban', 'any'],
  'Varkas\'s field commanders. Leads from the front with a blazing greatsword, calls down Command the Flame on clustered foes and turns allies\' burns into strength.',
  size='Medium', type='Humanoid (Dragonborn)', alignment='Lawful Evil', ac=18, initiative=0, hp=150, hit_dice='20d8 + 60', speed='30 ft.',
  str=20, dex=10, con=16, int=12, wis=14, cha=16, saves=['str', 'con', 'wis'], skills='Athletics +9, Intimidation +7', resistances='Fire',
  gear='Plate Armor, Pyre Greatsword', senses='Passive Perception 12', languages='Common, Draconic', cr='10',
  actions=[('Multiattack', 'The pyrelord makes three Pyre Greatsword attacks.'),
           ('Pyre Greatsword', f'{A} +9, reach 5 ft. {H} 12 (2d6 + 5) Slashing damage plus 7 (2d6) Fire damage.'),
           ('Command the Flame (Recharge 5–6)', sv('Dexterity') + ' DC 15, each creature in a 20-foot-radius Sphere centered on a point the pyrelord can see within 60 feet. *Failure:* 28 (8d6) Fire damage. *Success:* Half damage.')],
  reactions=[('Unburnt Retort', '*Trigger:* An ally the pyrelord can see within 30 feet takes Fire damage. *Response:* The ally takes no damage and instead gains Temporary Hit Points equal to half the damage.')])

# ============================================================================
# Villains
# ============================================================================
monster('Sister Cinder', 'Humanoid', ['urban'],
  'Never fights to the death. Opens by talking, uses Crown\'s Command to turn a hero against a friend, and escapes with Dimension Door when Bloodied. She is the Hand member most likely to be redeemed.',
  villain=dict(goal='Save the desperate of the Sword Coast by giving them a god who remembers them.', lair='[[The Cinderhouse]] in [[Luskan]]', minions='[[Ashen Hand Initiate]] ×6, [[Ashen Hand Cinderblade]] ×2', weakness='She truly cares for her recruits — threaten or save them and she bargains. Learning that Varkas means to burn them all at the Reforging breaks her faith.', win='The docks of Luskan become a recruiting ground; dozens of desperate souls march to the Ashfall Caldera.'),
  size='Medium', type='Humanoid (Tiefling)', alignment='Lawful Neutral', ac=15, initiative=3, hp=97, hit_dice='15d8 + 30', speed='30 ft.',
  str=10, dex=16, con=14, int=13, wis=14, cha=18, saves=['wis', 'cha'], skills='Deception +7, Insight +5, Persuasion +10', resistances='Fire',
  gear='Studded Leather Armor, Brand-Knife', senses='Darkvision 60 ft.; Passive Perception 12', languages='Common, Draconic, Infernal', cr='6',
  traits=[('The Gentle Voice', 'Cinder has Advantage on Charisma checks made to calm, comfort or recruit someone who has lost hope.')],
  actions=[('Multiattack', 'Cinder makes two Brand-Knife attacks, or she makes one Brand-Knife attack and uses Crown\'s Command.'),
           ('Brand-Knife', f'{A} +6, reach 5 ft. {H} 5 (1d4 + 3) Piercing damage plus 10 (3d6) Fire damage.'),
           ('Crown\'s Command', sv('Wisdom') + ' DC 15, one creature Cinder can see within 60 feet. *Failure:* The target has the [[Charmed]] condition until the end of Cinder\'s next turn. While Charmed, it must use its action to move and make one attack against a creature Cinder chooses.'),
           ('Spellcasting', 'Cinder casts one of the following spells, using Charisma as the spellcasting ability (spell save DC 15): **At will:** [[Thaumaturgy]] · **1/day each:** [[Dimension Door]], [[Fireball]], [[Suggestion]]')],
  reactions=[('Veil of Ash (1/Day)', '*Trigger:* Cinder becomes Bloodied. *Response:* Ash billows from her brand: a 10-foot-radius Sphere around her is Heavily Obscured until the end of her next turn, and she moves up to her Speed without provoking Opportunity Attacks.')])

monster('Forgemaster Ruuk Ashgrinder', 'Humanoid', ['mountain', 'dungeon'],
  'Fights beside his Slag Golem at the great anvil, ordering it to Slam whoever hurts him. Throws slag at anyone near the lava channels. Surrenders the vault key if reduced below 30 HP and offered his life.',
  villain=dict(goal='Dig the Shard of Cinders out of the Cinder Vault and reforge his clan\'s honour in the Hand\'s fire.', lair='[[The Cinder Vault]] under [[Mount Hotenow]]', minions='[[Slag Golem]], [[Ash Drake]] ×2, [[Ashen Hand Initiate]] miners ×6', weakness='Cold. Also his pride: he can be goaded into a one-on-one duel.', win='The Shard of Cinders reaches Varkas, and Hotenow\'s old magma vents are reopened, threatening Neverwinter.'),
  size='Medium', type='Humanoid (Dwarf)', alignment='Lawful Evil', ac=18, initiative=-1, hp=136, hit_dice='16d8 + 64', speed='25 ft.',
  str=20, dex=9, con=18, int=12, wis=12, cha=10, saves=['str', 'con'], skills='Athletics +8, Intimidation +3', resistances='Fire, Poison',
  gear='Half Plate Armor, Shield, Forgehammer', senses='Darkvision 60 ft.; Passive Perception 11', languages='Common, Dwarvish, Primordial (Ignan)', cr='8',
  traits=[('Forge-Born', 'Ruuk ignores Difficult Terrain made of cooling lava or slag, and he can\'t gain Exhaustion from extreme heat.')],
  actions=[('Multiattack', 'Ruuk makes two Forgehammer attacks, or one Forgehammer attack and one Slagthrow attack.'),
           ('Forgehammer', f'{A} +8, reach 5 ft. {H} 14 (2d8 + 5) Bludgeoning damage plus 7 (2d6) Fire damage.'),
           ('Slagthrow', f'{R} +8, range 30/60 ft. {H} 16 (3d10) Fire damage, and the target\'s Speed is reduced by 10 feet until the end of its next turn.')],
  bonus_actions=[('Command Golem', 'One [[Slag Golem]] Ruuk can see within 60 feet uses its Reaction to make one Slam attack.')],
  reactions=[('Shield Bash', '*Trigger:* A creature within 5 feet of Ruuk hits him with a melee attack. *Response:* Ruuk adds 3 to his AC against that attack; if it misses, the attacker has the [[Prone]] condition.')])

monster('Mother Soot', 'Fey', ['swamp'],
  'Fights from the water. Opens with the peat cloud, sends the Mire Lurker for the strongest hero, and teleports away (Plane Shift to her bog-realm) if reduced below 40 HP. She keeps bargains to the letter.',
  villain=dict(goal='Keep the Shard of Smoke — and the Ashen Hand\'s debt to her — until the Hand pays with a name she wants (one of the heroes\').', lair='[[The Drowned Pyre]] in the [[Mere of Dead Men]]', minions='[[Mire Lurker]], [[Drowned Ashwalker]] ×4, [[Soot Imp]] ×6', weakness='Her true name, written in [[The Lantern Library]], binds her to one honest answer. Salt and running water weaken her (she has Disadvantage on saves while standing in either).', win='She trades the shard to Varkas for the name of one hero — and that hero\'s dreams belong to her.'),
  size='Medium', type='Fey', alignment='Neutral Evil', ac=17, initiative=1, hp=153, hit_dice='18d8 + 72', speed='30 ft., Swim 40 ft.',
  str=16, dex=13, con=18, int=15, wis=16, cha=18, saves=['con', 'wis'], skills='Arcana +6, Deception +8, Insight +7, Stealth +5', resistances='Cold, Fire',
  immunities='Charmed', senses='Darkvision 120 ft.; Passive Perception 13', languages='Common, Draconic, Primordial, Sylvan', cr='9',
  traits=[('Amphibious', 'Mother Soot can breathe air and water.'),
          ('Magic Resistance', 'Mother Soot has Advantage on saving throws against spells and other magical effects.')],
  actions=[('Multiattack', 'Mother Soot makes two Smoldering Claw attacks or two Soot Bolt attacks.'),
           ('Smoldering Claw', f'{A} +7, reach 5 ft. {H} 12 (2d8 + 3) Slashing damage plus 7 (2d6) Fire damage.'),
           ('Soot Bolt', '*Ranged Attack Roll:* +8, range 120 ft. *Hit:* 18 (4d8) Necrotic damage.'),
           ('Choking Peat Cloud (Recharge 5–6)', sv('Constitution') + ' DC 16, each creature in a 20-foot-radius Sphere centered on a point Mother Soot can see within 90 feet. *Failure:* 36 (8d8) Poison damage, and the target has the [[Poisoned]] and [[Blinded]] conditions until the end of its next turn. *Success:* Half damage only.'),
           ('Spellcasting', 'Mother Soot casts one of the following spells, using Charisma as the spellcasting ability (spell save DC 16): **At will:** [[Disguise Self]], [[Minor Illusion]] · **1/day each:** [[Bestow Curse]], [[Hold Person]], [[Plane Shift]] (self only)')])

monster('Lisel Marrow', 'Humanoid', ['urban', 'dungeon'],
  'Hides as a scribe until the library is already burning. Fights from the upper gallery: Wall of Fire to split the party, Fireball on anyone trying to save books, Counterspell against healing. Flees by Invisibility with the shard if she can.',
  villain=dict(goal='Burn the Lantern Library and carry the Shard of Embers out of the ashes.', lair='[[The Lantern Library]] at [[Stillwater Abbey]]', minions='[[Burnt Page Swarm]] ×4, [[Cinder Wraith]] ×2, [[Ashen Hand Pyre-Priest]]', weakness='She loves books — she will trade the shard rather than see one particular book burn: her own childhood primer, shelved in the library.', win='The Lantern Library burns; centuries of the Unburnt Covenant\'s lore, including how to unmake the Crown, are lost.'),
  size='Medium', type='Humanoid (Wizard)', alignment='Neutral Evil', ac=15, initiative=2, hp=117, hit_dice='18d8 + 36', speed='30 ft.',
  str=9, dex=14, con=14, int=19, wis=13, cha=14, saves=['int', 'wis'], skills='Arcana +7, Deception +5, History +7',
  senses='Passive Perception 11', languages='Common, Draconic, Dwarvish, Elvish', cr='8',
  traits=[('Archivist\'s Cover', 'While disguised as a scribe, Lisel has Advantage on Charisma (Deception) checks to pass as one.')],
  actions=[('Multiattack', 'Lisel makes three Arcane Burn attacks.'),
           ('Arcane Burn', '*Melee or Ranged Attack Roll:* +7, reach 5 ft. or range 120 ft. *Hit:* 17 (3d8 + 4) Fire damage.'),
           ('Spellcasting', 'Lisel casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 15), with AC 15 from [[Mage Armor]]: **At will:** [[Disguise Self]], [[Mage Hand]], [[Prestidigitation]] · **2/day each:** [[Fireball]], [[Invisibility]] · **1/day each:** [[Wall of Fire]]')],
  reactions=[('Counterspell (2/Day)', '*Trigger:* Lisel sees a creature within 60 feet casting a spell. *Response:* Lisel casts [[Counterspell]].')])

monster('Captain Vex Halloran', 'Humanoid', ['urban'],
  'Keeps two turncoats between himself and the heroes, crossbow first, then blade. Yields if the vault is lost — he\'s in it for coin — and will sell out Varkas for a pardon.',
  villain=dict(goal='Get rich: deliver the Shard of Soot to Varkas and retire to a villa in Amn.', lair='[[Graymantle Manor]] vaults, [[Baldur\'s Gate]]', minions='[[Flaming Fist Turncoat]] ×4, [[Ashen Hand Cinderblade]] ×2', weakness='Greed and a warrant: Lady Graymantle\'s ledgers prove he took Hand coin.', win='The Shard of Soot reaches Varkas, and the Flaming Fist is too compromised to stop the Hand\'s march.'),
  size='Medium', type='Humanoid', alignment='Neutral Evil', ac=18, initiative=2, hp=120, hit_dice='16d8 + 48', speed='30 ft.',
  str=18, dex=14, con=16, int=12, wis=12, cha=15, saves=['str', 'con', 'wis'], skills='Athletics +7, Intimidation +5, Perception +4',
  gear='Plate Armor, Ashblade (Longsword), Hand Crossbow', senses='Passive Perception 14', languages='Common, Thieves\' Cant', cr='8',
  traits=[('Rally the Bought', 'Allies within 30 feet of Vex have Advantage on saving throws against the [[Frightened]] condition.')],
  actions=[('Multiattack', 'Vex makes three Ashblade attacks or two Hand Crossbow attacks.'),
           ('Ashblade', f'{A} +7, reach 5 ft. {H} 8 (1d8 + 4) Slashing damage plus 9 (2d8) Fire damage.'),
           ('Hand Crossbow', f'{R} +5, range 30/120 ft. {H} 5 (1d6 + 2) Piercing damage plus 7 (2d6) Fire damage (ember bolt).')],
  bonus_actions=[('Orders', 'One ally Vex can see within 30 feet uses its Reaction to make one weapon attack.')],
  reactions=[('Parry', '*Trigger:* Vex is hit by a melee attack roll while holding a weapon. *Response:* Vex adds 3 to his AC against that attack, possibly causing it to miss.')])

monster('Archmage Taramon', 'Humanoid', ['planar'],
  'Would rather talk than fight. If attacked, he raises Globe of Invulnerability, pins the strongest hero with Wall of Force and bargains from behind it. He fights to the death only if someone tries to take the Heart Shard from him.',
  villain=dict(goal='Get out of the Glass Oubliette and claim the reforged Crown himself — to master Kaurvex rather than serve him.', lair='[[The Glass Oubliette]]', minions='[[Mirror Shade]] ×3 (they obey him); his daughter, if he can win her back', weakness='His daughter [[Seren Vael]]. He loves her, and she is the only key to his prison. He also cannot leave without the resonance of three shards.', win='Taramon walks free wearing the Ashen Crown; Varkas is ash; the Sword Coast has a new tyrant who commands fire.'),
  size='Medium', type='Humanoid (Elf, Wizard)', alignment='Lawful Evil', ac=17, initiative=2, hp=195, hit_dice='30d8 + 60', speed='30 ft.',
  str=10, dex=14, con=14, int=22, wis=16, cha=16, saves=['int', 'wis'], skills='Arcana +16, History +11, Insight +8',
  senses='Darkvision 60 ft.; Passive Perception 13', languages='Common, Draconic, Elvish, Infernal, Primordial, Sylvan', cr='14',
  traits=[('Magic Resistance', 'Taramon has Advantage on saving throws against spells and other magical effects.'),
          ('Prism-Bound', 'While inside the Glass Oubliette, Taramon can\'t leave it by any means, and he can\'t be Banished or teleported out of it.')],
  actions=[('Multiattack', 'Taramon makes three Prismatic Bolt attacks.'),
           ('Prismatic Bolt', '*Melee or Ranged Attack Roll:* +11, reach 5 ft. or range 150 ft. *Hit:* 28 (4d10 + 6) Force damage.'),
           ('Spellcasting', 'Taramon casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 19), with AC 17 from [[Mage Armor]]: **At will:** [[Detect Magic]], [[Mage Hand]], [[Prestidigitation]] · **2/day each:** [[Dimension Door]], [[Fireball]] (level 5 version), [[Wall of Force]] · **1/day each:** [[Globe of Invulnerability]], [[Prismatic Spray]], [[Teleport]]')],
  reactions=[('Counterspell (3/Day)', '*Trigger:* Taramon sees a creature within 60 feet casting a spell. *Response:* Taramon casts [[Counterspell]].')])

monster('Varkas Emberveil', 'Humanoid', ['mountain'],
  'The final mortal foe. Fights at the lip of the Pyre Throne with two pyrelords. Breathes ash first, then cleaves with his glaive; uses legendary actions to keep cultists acting. If the Crown is reforged he puts it on in round 2.',
  villain=dict(goal='Reforge the Ashen Crown at the Pyre Throne on the Night of Long Embers, wake Kaurvex and become his Voice on the Sword Coast.', lair='[[Ashfall Caldera]] — [[The Pyre Throne]]', minions='[[Cindraxis]], [[Ashen Hand Pyrelord]] ×2, [[Ashen Hand Pyre-Priest]] ×4, an army of the desperate', weakness='He needs Seren\'s blood and Taramon\'s rite; without both, the Reforging is incomplete and the Avatar is bound to the Crown. He has never been refused by a follower — Sister Cinder\'s defiance shakes him (he loses his Legendary Resistance for a round).', win='Kaurvex wakes. Ash falls on Waterdeep for a year, and the Ashen Hand rules the ruins.'),
  size='Medium', type='Humanoid (Dragonborn)', alignment='Lawful Evil', ac=20, initiative=3, hp=247, hit_dice='26d8 + 130', speed='30 ft., Fly 30 ft.',
  str=22, dex=12, con=20, int=14, wis=15, cha=20, saves=['str', 'con', 'wis', 'cha'], skills='Athletics +12, Intimidation +11, Religion +8',
  immunities='Fire; Frightened', gear='Plate Armor, Cinderglaive', senses='Darkvision 60 ft.; Passive Perception 12', languages='Common, Draconic, Infernal', cr='17',
  traits=[('Legendary Resistance (3/Day, or 4/Day in the Ashfall Caldera)', 'If Varkas fails a saving throw, he can choose to succeed instead.'),
          ('Voice of Kaurvex', 'Allies within 30 feet of Varkas are immune to the [[Frightened]] condition.')],
  actions=[('Multiattack', 'Varkas makes three Cinderglaive attacks. He can replace one attack with Ash Breath, if available.'),
           ('Cinderglaive', f'{A} +12, reach 10 ft. {H} 17 (2d10 + 6) Slashing damage plus 7 (2d6) Fire damage.'),
           ('Ash Breath (Recharge 5–6)', sv('Dexterity') + ' DC 19, each creature in a 60-foot Cone. *Failure:* 52 (15d6) Fire damage, and the target has the [[Blinded]] condition until the end of its next turn. *Success:* Half damage only.'),
           ('Spellcasting', 'Varkas casts one of the following spells, using Charisma as the spellcasting ability (spell save DC 19): **1/day each:** [[Banishment]], [[Dominate Person]], [[Wall of Fire]]')],
  bonus_actions=[('Ash Wings', 'Varkas flies up to his Fly Speed without provoking Opportunity Attacks.')],
  legendary_intro='Legendary Action Uses: 3 (4 in the Ashfall Caldera). Immediately after another creature\'s turn, Varkas can expend a use to take one of the following actions. He regains all expended uses at the start of each of his turns.',
  legendary_actions=[('Command the Faithful', 'One ally Varkas can see within 60 feet moves up to half its Speed and makes one weapon attack.'),
                     ('Glaive Sweep', 'Varkas makes one Cinderglaive attack.'),
                     ('Ashstorm (Costs 2 Uses)', sv('Dexterity') + ' DC 19, each creature in a 20-foot-radius Sphere centered on Varkas. *Failure:* 14 (4d6) Fire damage. *Success:* Half damage. The Sphere is Heavily Obscured until the end of Varkas\'s next turn.')])

monster('Cindraxis', 'Dragon', ['mountain'],
  'Varkas\'s dragon, the last true child of Kaurvex\'s line. Fights on the wing inside its ash shroud, breathes from out of sight and pounces on anyone isolated. Flees to the caldera if reduced below 60 HP — and returns for the finale.',
  villain=dict(goal='See its sire Kaurvex wake and be first among his brood.', lair='[[Ashfall Caldera]]', minions='[[Ash Drake]] ×4', weakness='It despises Varkas and serves only for Kaurvex. Prove that Varkas will bind Kaurvex rather than free him and Cindraxis may withdraw from the final battle.', win='Cindraxis burns every bridge across the Delimbiyr and the Sword Coast\'s armies can\'t reach the caldera.'),
  size='Huge', type='Dragon', alignment='Chaotic Evil', ac=18, initiative=10, hp=225, hit_dice='18d12 + 108', speed='40 ft., Climb 40 ft., Fly 80 ft.',
  str=25, dex=10, con=23, int=14, wis=13, cha=19, saves=['dex', 'wis'], skills='Perception +11, Stealth +5', immunities='Fire',
  senses='Blindsight 60 ft., Darkvision 120 ft.; Passive Perception 21', languages='Common, Draconic', cr='16',
  traits=[('Legendary Resistance (3/Day)', 'If the dragon fails a saving throw, it can choose to succeed instead.'),
          ('Ash Shroud', 'While flying, the dragon is wrapped in ash: it is Heavily Obscured to creatures more than 30 feet away from it.')],
  actions=[('Multiattack', 'The dragon makes three Rend attacks.'),
           ('Rend', f'{A} +12, reach 10 ft. {H} 16 (2d8 + 7) Slashing damage plus 7 (2d6) Fire damage.'),
           ('Cinderstorm Breath (Recharge 5–6)', sv('Dexterity') + ' DC 19, each creature in a 60-foot Cone. *Failure:* 59 (17d6) Fire damage, and the target has the [[Blinded]] condition until the end of its next turn. *Success:* Half damage only.')],
  legendary_intro='Legendary Action Uses: 3. Immediately after another creature\'s turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.',
  legendary_actions=[('Pounce', 'The dragon moves up to half its Speed and makes one Rend attack.'),
                     ('Wing Gust', sv('Strength') + ' DC 20, each creature within 10 feet of the dragon. *Failure:* The target is pushed 15 feet straight away from the dragon and has the [[Prone]] condition.'),
                     ('Commanding Roar (Costs 2 Uses)', sv('Wisdom') + ' DC 17, each creature of the dragon\'s choice within 60 feet. *Failure:* The target has the [[Frightened]] condition until the end of its next turn.')])

monster('Avatar of Kaurvex', 'Dragon', ['mountain', 'planar'],
  'The final battle. It rises from the caldera bound to the Crown on the Pyre Throne. Breathe, rend, and Burn the Name on whoever holds a shard. It can\'t leave the caldera; if the Crown is taken from the throne (DC 20 Strength or Thieves\' Tools action while within 5 feet) it begins to collapse.',
  villain=dict(goal='Remember. Burn. Be worshipped again.', lair='[[The Pyre Throne]]', minions='every [[Cinder Wraith]] in the caldera', weakness='Bound to the Crown — see *Bound to the Crown*. Saying its true, forgotten name (found in [[The Lantern Library]]) while holding a shard imposes Disadvantage on its next saving throw.', win='The Unremembered Brother wakes in full. There is no more Sword Coast — only ash.'),
  size='Gargantuan', type='Dragon (Elemental)', alignment='Chaotic Evil', ac=20, initiative=6, hp=333, hit_dice='18d20 + 144', speed='40 ft., Burrow 30 ft., Fly 80 ft.',
  str=28, dex=10, con=26, int=18, wis=17, cha=22, saves=['dex', 'con', 'wis'], skills='Perception +17', immunities='Fire, Poison; Charmed, Frightened, Paralyzed, Poisoned',
  senses='Truesight 120 ft.; Passive Perception 27', languages='Draconic, Primordial, telepathy 120 ft.', cr='21',
  traits=[('Legendary Resistance (4/Day)', 'If the avatar fails a saving throw, it can choose to succeed instead.'),
          ('Bound to the Crown', 'The avatar can\'t leave the Ashfall Caldera. If the Ashen Crown is removed from the Pyre Throne or unmade, the avatar takes 50 Force damage at the start of each of its turns and can\'t use Legendary Actions.'),
          ('Ash Aura', 'A creature that starts its turn within 20 feet of the avatar takes 7 (2d6) Fire damage.')],
  actions=[('Multiattack', 'The avatar makes three Rend attacks.'),
           ('Rend', f'{A} +16, reach 15 ft. {H} 20 (2d10 + 9) Slashing damage plus 10 (3d6) Fire damage.'),
           ('Ashfall Breath (Recharge 5–6)', sv('Dexterity') + ' DC 23, each creature in a 90-foot Cone. *Failure:* 70 (20d6) Fire damage, and the target has the [[Blinded]] condition until the end of its next turn. *Success:* Half damage only.')],
  legendary_intro='Legendary Action Uses: 3. Immediately after another creature\'s turn, the avatar can expend a use to take one of the following actions. It regains all expended uses at the start of each of its turns.',
  legendary_actions=[('Ash Step', 'The avatar teleports up to 60 feet to an unoccupied space it can see on ground covered in ash.'),
                     ('Rend', 'The avatar makes one Rend attack.'),
                     ('Burn the Name (Costs 2 Uses)', sv('Charisma') + ' DC 21, one creature the avatar can see within 120 feet. *Failure:* 33 (6d10) Psychic damage, and the target forgets its own name until it finishes a Long Rest, having Disadvantage on Charisma saving throws until then. *Success:* Half damage only.')])

def monster_note(name, d):
    m = d['m']; v = d['villain']
    fm = f'---\ntype: monster\ncr: "{m["cr"]}"\ncreature_type: {d["ct"]}\nenvironment: {q(d["env"])}\nsource: Homebrew\nimage: ""\n'
    if v: fm += 'villain: true\nstatus: active\n'
    fm += 'tags: [monster' + (', villain' if v else '') + ']\n---\n'
    body = fm + f'# {name}\n\n' + statblock(m) + f'\n## Tactics\n{d["tactics"]}\n'
    if v:
        body += (f'\n## Villain profile\n> [!secret] What they want\n> {v["goal"]}\n\n- **Lair / base:** {v["lair"]}\n- **Minions:** {v["minions"]}\n'
                 f'- **Weakness:** {v["weakness"]}\n- **If they win:** {v["win"]}\n')
    body += '\n## Used in\n```dm-list\nwhere: any\nfields: [type]\nempty: Not used in any note yet.\n```\n'
    return body

for name, d in MONSTERS.items():
    w(f'Bestiary/{name}.md', monster_note(name, d))

# ============================================================================
# Magic items
# ============================================================================
def item(name, kind, rarity, attune, text, charges='', curse='', lore='', holder='', extra_fm=''):
    att = 'true' if attune is True else ('false' if not attune else q(attune))
    att_txt = '' if not attune else (' (requires attunement' + ('' if attune is True else ' ' + attune) + ')')
    body = f'---\ntype: item\nitem_type: {kind}\nrarity: {rarity}\nattunement: {att}\ncharges: {q(charges)}\nholder: {q(holder)}\n{extra_fm}tags: [armory, item]\n---\n# {name}\n\n*{kind}, {rarity}{att_txt}*\n\n## Properties\n{text}\n'
    if charges: body += f'\n**Charges:** {charges}\n'
    if curse: body += f'\n> [!secret] Curse\n> {curse}\n'
    body += f'\n## History & lore\n{lore}\n'
    w(f'Armory/Magic Items/{name}.md', body)

SHARD_PROPS = ('- While attuned, you have Resistance to Fire damage.\n'
               '- Once per Long Rest, you can cast [[Burning Hands]] (save DC 13) from the shard.')
SHARD_CURSE = ('Each time you use the shard, it whispers the location of the other shards — and [[The Ashen Hand]] hears your location. '
               '(The DM tells the Hand roughly where the party is; expect a response within 1d4 days.)')
RESONANCE = ('\n\n### Resonance (optional rule)\nShards long to be whole. A creature attuned to one shard can carry others without attuning to them; they count as one magic item for attunement.\n'
             '- **Two shards:** the *Burning Hands* save DC becomes 14, and the whispers are clear enough to point toward the next shard (DM gives a direction).\n'
             '- **Three shards:** you can also cast [[Fireball]] (save DC 15) once per Long Rest. Every use is heard by Varkas himself.\n'
             '- **Four shards:** you have Immunity to Fire damage, and you dream of the Pyre Throne every night (DC 15 Wisdom save or gain no benefit from a Long Rest).')
SHARDS = [
 ('Shard of the Ashen Crown', '', 'A thumb-sized sliver of blackened gold, always warm to the touch. This is the generic shard; each of the five named shards below uses these properties.', ''),
 ('Shard of Cinders', '[[The Cinder Vault]] under [[Mount Hotenow]]', 'A jagged crescent of the Crown\'s band, pitted like cooled lava. Glows dull red when a shard-bearer lies to you.', 'Sealed in the Cinder Vault by the dwarves of the Unburnt Covenant three centuries ago.'),
 ('Shard of Smoke', '[[The Drowned Pyre]] in the [[Mere of Dead Men]]', 'A grey-gold prong of the Crown, wreathed in a thread of smoke that never disperses, even underwater.', 'Hidden by the first Ashen Hand cell in a drowned temple; Mother Soot claimed it as payment and never gave it back.'),
 ('Shard of Embers', '[[The Lantern Library]] at [[Stillwater Abbey]]', 'A golden prong set inside the abbey\'s eternal lantern; the light of the lantern is the shard\'s own glow.', 'The Unburnt Covenant hid it in plain sight, as the library\'s "eternal flame".'),
 ('Shard of Soot', '[[Graymantle Manor]] in [[Baldur\'s Gate]]', 'A blackened prong with a ruby socket (empty). Lady Graymantle believes it is "the Graymantle Ember", a family heirloom.', 'Bought at auction by Lady Graymantle\'s grandfather, who never knew what it was.'),
 ('Heart Shard', '[[The Glass Oubliette]], with [[Archmage Taramon]]', 'The Crown\'s central gem: a fist-sized coal of black glass with a fire inside that beats like a heart.', 'Taramon took it from the Covenant\'s vault twelve years ago; the Harpers sealed him in the Glass Oubliette with it rather than risk carrying it out.'),
]
for name, where, look, lore in SHARDS:
    props = SHARD_PROPS + (RESONANCE if name != 'Shard of the Ashen Crown' else '')
    text = f'{look}\n\n{props}'
    if where: text = f'**Where it is:** {where}\n\n' + text
    if name == 'Heart Shard':
        text += ('\n\n### Heart of the Crown\nThe Heart Shard counts as two shards for Resonance. While you carry it, you know the direction and distance to every other shard. '
                 '**The Crown can\'t be reforged without it.**')
    item(name, 'Wondrous Item', 'rare' if name == 'Heart Shard' else 'uncommon', True, text, curse=SHARD_CURSE,
         lore=lore or 'One of the five pieces of the [[The Ashen Crown (Artifact)|Ashen Crown]]. [[The Ashen Hand]] wants every one of them.', extra_fm='shard: true\n')

item('The Ashen Crown (Artifact)', 'Wondrous Item', 'artifact', True,
     'A circlet of five blackened-gold prongs around a heart of black glass, whole only when all five shards are joined at [[The Pyre Throne]].\n\n'
     '- You have Immunity to Fire damage, and fire you create ignores Resistance and Immunity to Fire.\n'
     '- **Command Flame.** As a Magic action, you can cast [[Fireball]] (level 9 version), [[Wall of Fire]] or *Fire Storm* (save DC 21) from the Crown. Once you cast *Fire Storm* this way, you can\'t do so again until the next dawn.\n'
     '- **Ash Dominion.** Creatures with Immunity to Fire must succeed on a DC 21 Wisdom saving throw or have the [[Charmed]] condition toward you for 24 hours.\n'
     '- **Voice of Kaurvex.** While worn at the Pyre Throne, the Crown wakes the [[Avatar of Kaurvex]], bound to the wearer.\n\n'
     '### The chosen bearer\nA creature of Kaurvex\'s blood (in this campaign, [[Opal]]) wears the Crown without its curse and can command the [[Avatar of Kaurvex]] to sleep or to wake.\n\n### Destroying the Crown\nThe Crown can be unmade only at the Pyre Throne, by a creature of Kaurvex\'s blood who has carried a shard for a full day without ever using it, who speaks Kaurvex\'s true name (written in [[The Lantern Library]]) and quenches the Heart Shard in water from [[The Silvered Tarn]]. The Avatar collapses; the shards become ordinary blackened gold.',
     curse='A wearer who isn\'t the Voice of Kaurvex must make a DC 18 Charisma saving throw at each dawn. On a failure, Kaurvex speaks through them until the next dawn (the DM controls their actions whenever fire is near).',
     lore='Forged by the Unburnt Covenant to bind the will of the dragon Kaurvex, then broken into five shards when the Covenant realised the binding worked both ways.')

ITEMS = [
 ('Warden\'s Frostkey', 'Wondrous Item', 'uncommon', False, 'An iron key rimed with frost that never melts.\n\n- It opens any lock in [[Revel\'s End]].\n- Once per dawn, you can cast [[Knock]] by touching it to a lock elsewhere; the lock frosts over and cracks.', '', '', 'Carried by every senior warden of Revel\'s End. [[Tallow]] can "lose" one for the right price.'),
 ('Rimewalker Boots', 'Wondrous Item', 'uncommon', False, 'Fur-lined boots with iron spikes that slide out when you step onto ice.\n\n- Ice and snow aren\'t Difficult Terrain for you.\n- You have Advantage on saving throws and ability checks to avoid having the [[Prone]] condition on ice.', '', '', 'Standard issue for the wardens\' ice patrols.'),
 ('Seren\'s Ash-Ink Quill', 'Wondrous Item', 'uncommon', True, 'A black feather quill that writes with ash instead of ink.\n\n- Writing made with the quill is invisible until held within 5 feet of an open flame.\n- Once per dawn, you can cast [[Illusory Script]] without a material component.', '', '', 'The quill [[Seren Vael]] used to tattoo the shard map into her own skin. She will give it to whoever earns her trust.'),
 ('Wavemark\'s Weatherglass', 'Wondrous Item', 'uncommon', False, 'A brass storm-glass in a sealskin case.\n\n- You always know what the weather will be for the next 24 hours within 10 miles.\n- Once per dawn, you can cast [[Gust of Wind]] (save DC 13) from it.', '', '', 'Captain [[Thorne Wavemark]]\'s most prized possession — offered as payment if the party saves the *Gull\'s Debt*.'),
 ('Potion of Ashbreath', 'Potion', 'uncommon', False, 'A grey, faintly smoking draught.\n\nWhen you drink it, for 1 hour you can breathe normally in smoke and ash, you aren\'t Blinded by ash or smoke effects (such as Ash Breath), and you have Resistance to Fire damage.', '', '', 'Brewed by Ashen Hand priests for their own; the party finds them on pyre-priests.'),
 ('Hotenow Forgehammer', 'Weapon (Warhammer)', 'rare', True, 'A dwarven warhammer whose head glows like metal fresh from the forge.\n\n- You gain a +1 bonus to attack and damage rolls made with this magic weapon, and it deals an extra 1d6 Fire damage on a hit.\n- Once per dawn, you can cast [[Heat Metal]] (save DC 15) from it.', '', '', '[[Forgemaster Ruuk Ashgrinder]]\'s hammer, forged in the Covenant\'s old smithy. [[Muscovy]]\'s order would dearly like it back.'),
 ('Ash-Veil Mantle', 'Wondrous Item', 'rare', True, 'A grey cloak that sheds a faint haze of ash.\n\n- As a Bonus Action, you can expend 1 charge to fill a 10-foot-radius Sphere centered on you with ash, Heavily Obscured until the end of your next turn. You can see through it.\n- While in the ash, you have Advantage on Dexterity (Stealth) checks.', '3, regains 1d3 at dawn', '', 'Worn by Ashen Hand infiltrators; [[Sister Cinder]] carries one.'),
 ('Lantern of the Unburnt Page', 'Wondrous Item', 'rare', False, 'A silver hooded lantern etched with the Covenant\'s open-book sigil.\n\n- While lit, it sheds Bright Light in a 30-foot radius. Objects in the bright light that aren\'t being worn or carried can\'t catch fire or take Fire damage.\n- Once per dawn, you can cast [[Dispel Magic]] from it, but only against a spell that creates or controls fire.', '', '', 'The abbey\'s sister lantern to the eternal flame. Abbess [[Abbess Merin Lanternhold|Merin]] gives it to the party if the library is saved.'),
 ('Bogpearl of Mother Soot', 'Wondrous Item', 'rare', True, 'A black pearl that smells of peat smoke.\n\n- You can breathe water and have a Swim Speed equal to your Speed.\n- You can speak with swamp animals and plants as if under [[Speak with Animals]].', '', '[[Mother Soot]] can see and hear everything around the pearl whenever she likes. Removing the pearl requires [[Remove Curse]].', 'Mother Soot "gifts" it to whoever bargains well with her.'),
 ('Flamebane Shield', 'Armor (Shield)', 'rare', True, 'A kite shield faced with overlapping silver scales.\n\n- You gain a +1 bonus to AC while holding this shield (in addition to the shield\'s normal bonus), and you have Resistance to Fire damage.\n- **Shelter.** When a creature within 5 feet of you takes Fire damage, you can take a Reaction to halve that damage.', '', '', 'Made by the Unburnt Covenant for those who hunted the Crown. One hangs in the [[Graymantle Manor]] trophy hall.'),
 ('Graymantle Signet', 'Ring', 'uncommon', False, 'A heavy silver ring bearing a mantled heron.\n\n- You have Advantage on Charisma checks made to influence the patriars of [[Baldur\'s Gate]].\n- The ring opens the outer doors of the [[Graymantle Manor]] vaults.', '', '', 'Lady [[Lady Orsolya Graymantle|Graymantle]] lends it to the party — or they steal it.'),
 ('Taramon\'s Prism Staff', 'Staff', 'very rare', 'by a Sorcerer, Warlock or Wizard', 'A staff of clear crystal that splits light into colours as it moves.\n\n- While holding it, you gain a +2 bonus to spell attack rolls and to your spell save DC.\n- You can expend charges to cast: [[Color Spray]] (1 charge), [[Hypnotic Pattern]] (3 charges), [[Wall of Force]] (5 charges) or [[Prismatic Spray]] (7 charges), using your spell save DC.', '10, regains 1d6 + 4 at dawn', '', '[[Archmage Taramon]]\'s staff. He may give it to the party as a "gift" — he can scry through it once per day.'),
 ('Cindraxis Scale Mail', 'Armor (Scale Mail)', 'very rare', True, 'Scale mail crafted from the ash-grey scales of [[Cindraxis]].\n\n- You gain a +1 bonus to AC while wearing this armor, and you have Resistance to Fire damage.\n- You have Advantage on saving throws against the breath weapons of dragons.\n- Once per dawn, as a Magic action, you can learn the direction and distance to the nearest ash dragon within 30 miles.', '', '', 'Crafted from the dragon\'s shed scales or its hide, by a smith in Neverwinter or Baldur\'s Gate (2 weeks, 4,000 gp).'),
 ('Ring of the Quiet Flame', 'Ring', 'very rare', True, 'A plain band of grey stone, cold to the touch.\n\n- You have Immunity to Fire damage.\n- Once per Long Rest, when a creature you can see within 30 feet takes Fire damage, you can take a Reaction to draw the fire into the ring: the creature takes no damage.', '', '', 'The Unburnt Covenant\'s last ring, kept in [[The Lantern Library]] reliquary.'),
 ('Emberheart Amulet', 'Wondrous Item', 'very rare', True, 'A pendant of black glass with a single living ember inside.\n\n- When you are reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead, bursting into flame: each creature within 10 feet takes 10 (3d6) Fire damage. Once used, this property can\'t be used again until the next dawn.', '', 'While you wear it, Ashen Hand cultists can sense you as one of their own (you have Advantage on Deception checks against them; [[Varkas Emberveil]] isn\'t fooled).', 'Taken from a pyrelord. Varkas gave one to each of his commanders.'),
]
for name, kind, rarity, att, text, charges, curse, lore in ITEMS:
    item(name, kind, rarity, att, text, charges=charges, curse=curse, lore=lore)

# ============================================================================
# Places
# ============================================================================
def place(name, ptype, parent, desc, sense, features='', secrets='', table=None):
    tbl = '\n'.join(table or ['1-3: Nothing of note', '4: A rumour from a passer-by', '5: Ashen Hand agents watching from a distance', '6: A desperate stranger asks for help'])
    body = f'''---
type: place
place_type: {ptype}
region: "The Sword Coast"
parent: "{parent}"
gallery: []
tags: [place]
---
# {name}

> [!read-aloud] First impression
> {sense}

## Overview
{desc}
'''
    if features: body += f'\n## Features\n{features}\n'
    if secrets: body += f'\n## Secrets\n> [!secret]\n> {secrets}\n'
    body += f'''
## Gallery
*Maps, sketches and mood images. Drop or paste images here; the first one is the cover.*
```gallery
```

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
fields: [status, level]
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
{tbl}
```

## Threads
*Session threads and follow-ups that link to this note.*
```threads
mentions: this
filter: all
compact: true
```
'''
    w(f'World/Places/{name}.md', body)

place('The Sword Coast', 'region', '', 'The long, wild western shore of Faerûn, from the frozen north at [[Revel\'s End]] to the walls of [[Baldur\'s Gate]]. City-states, ruins and wilderness — and, this year, a strange number of fires.',
      'Salt wind, gull-cries, and on the clearest days a smudge of smoke on the eastern horizon over the Sword Mountains.')
place('Revel\'s End', 'prison', '[[The Sword Coast]]', 'A grim fortress-prison on a spit of rock in the frozen far north, run by wardens who answer to the Lords\' Alliance. Prisoners are known by number, not name. Supply ships come twice a season; otherwise it is reachable only across the ice.',
      'Black stone streaked with ice, a single tower lantern, and a wind that finds every gap in your cloak.',
      '- **The Icebound Dock** — the only landing; the supply ship *Firmament* ties up here.\n- **The Warden\'s Tower** — records of every prisoner, by number.\n- **Cellblock Thirteen** — the isolation wing; see [[The Thirteenth Cell]].\n- **The Bell** — rung once, the gates lock; rung three times, the guards shoot to kill.',
      'Prisoner 13\'s transfer papers were signed by a Harper — [[Delmar Quillon]] — under a false name. The wardens don\'t know who she really is.',
      ['1-2: Howling wind; DC 12 Constitution save or 1 level of [[Exhaustion]] without shelter', '3: A [[Revel\'s End Warden-Guard|warden patrol]] (2) asks for papers', '4: [[Rime Wolf]] ×2 stalking the ice road', '5: A dead Ashen Hand scout frozen in the snow, carrying a map of the prison', '6: A crack in the ice — DC 13 Dexterity save or fall into freezing water'])
place('The Thirteenth Cell', 'dungeon', '[[Revel\'s End]]', 'The isolation cell at the end of Cellblock Thirteen, cut into the rock below the waterline. Frost on the inside walls. Its prisoner keeps a single candle burning at all times — the only light she is allowed.',
      'A narrow corridor, thirteen iron doors, and behind the last one a woman humming to a candle flame.',
      '- The door needs the [[Warden\'s Frostkey]] or a DC 18 Thieves\' Tools check.\n- A drain tunnel under the floor leads to the sea (Small creatures only, or a DC 15 Strength check to widen it).',
      'Seren keeps the candle lit so she can check the ash-ink map on her arms is still there.')
place('Luskan', 'city', '[[The Sword Coast]]', 'The City of Sails: pirate-ruled, cold and crowded, where the desperate wash up. The Ashen Hand recruits on the docks with soup, warmth and a promise that someone will remember them.',
      'Tar, fish-guts, shouting in five languages — and a soup line outside a warehouse with a grey hand painted on the door.',
      '- **The docks** — Captain [[Thorne Wavemark]]\'s *Gull\'s Debt* is berthed at the north quay.\n- **[[The Cinderhouse]]** — the Hand\'s warehouse and soup kitchen.\n- **[[The Salted Lantern]]** — a dockside tavern; safe(ish) rooms upstairs.',
      '',
      ['1-2: Press-gang looking for "volunteers"', '3: A pickpocket (Sheila knows her)', '4: [[Ashen Hand Initiate]] ×4 handing out soup and pamphlets', '5: [[Soot Imp]] ×3 setting a warehouse alight', '6: A ship captain looking for hired swords'])
place('The Cinderhouse', 'hideout', '[[Luskan]]', 'A former fish warehouse turned soup kitchen and recruiting hall by [[Sister Cinder]]. Warm, clean, genuinely kind on the ground floor; a shrine to Kaurvex and an armoury in the cellar.',
      'The smell of barley soup and woodsmoke. Children asleep by a big iron stove. Grey robes on hooks by the door.',
      '- **Ground floor:** soup kitchen, cots for 40.\n- **Upstairs:** Cinder\'s office — letters from Varkas, a list of recruits (including [[Tobin Thorne]]).\n- **Cellar:** shrine, firepots, a tunnel to the docks.',
      'Cinder\'s letters reveal that Varkas means to use the recruits as the "kindling" of the Reforging — burned at the Pyre Throne.')
place('The Salted Lantern', 'tavern', '[[Luskan]]', 'A sailors\' tavern under a lantern full of rock salt. The owner, Marta Kell, asks no questions and keeps a back door.',
      'Low beams hung with nets, salt crunching underfoot, a fiddler playing a shanty about a drowned crown.')
place('Neverwinter', 'city', '[[The Sword Coast]]', 'The Jewel of the North, rebuilt after the volcano. Its wizards study fire because they must; its people watch [[Mount Hotenow]] every morning.',
      'Warm river mist from the Neverwinter River, bridges of white stone, and the smoking peak always on the horizon.',
      '- **The Hall of Justice** — where the party can report the Hand (and be ignored).\n- **Ilvara\'s Tower** — home of [[Ilvara Dusk]].\n- **A Harper safehouse** behind a bookbinder\'s shop — [[Delmar Quillon]] works from here.')
place('Waterdeep', 'city', '[[The Sword Coast]]', 'The City of Splendors, greatest city on the Sword Coast — and, for anyone named Stonequill, the most dangerous. The Ashen Hand has a cell here, informers at every gate, and a hunter watching the Stonequill family home. The [[Ashfall Caldera]] lies in the mountains to the east.',
      'Spires, bells, a harbour full of masts — and, if you look east in late autumn, a grey haze over the Sword Mountains.',
      '- **[[Blackstaff Academy]]** — where [[Orsik Stonequill]] lectured.\n- **The Stonequill house** in the Trades Ward — watched day and night by [[Hask the Ash-Finder]]\'s informers.\n- **The city gates** — the Hand pays the gate-clerks to report anyone named Stonequill.',
      'In Act III, the first ash from the caldera falls on Waterdeep. Orsik\'s notebook predicted it.',
      ['1-2: A gate-clerk takes a little too much interest in your names', '3: [[Hask the Ash-Finder]]\'s informers follow you (DC 15 Perception to notice)', '4: [[Ashen Hand Initiate]] ×4 with a cart of firewood and a list of addresses', '5: An academy student who knew Orsik — and is frightened', '6: A City Watch patrol (helpful, if you can prove the Hand exists)'])
place('Blackstaff Academy', 'academy', '[[Waterdeep]]', 'Waterdeep\'s school of wizardry, where [[Orsik Stonequill]] lectured and researched until he fled. His rooms were burned "by accident" the night he disappeared.',
      'A tower of dark stone, students hurrying with armfuls of books — and one window boarded over, scorched black.',
      '- **Orsik\'s rooms** — burned; a hidden compartment under the floor survived (DC 16 Investigation): his first notes, naming Prisoner 13.\n- **The sealed archive** — where Orsik found the Hand\'s trail.',
      '[[Lisel Marrow]] studied here under Orsik. She saw his notes and reported him to the Hand before leaving for Stillwater Abbey.')
place('Mount Hotenow', 'volcano', '[[The Sword Coast]]', 'The volcano north of Neverwinter. Its last eruption scarred the city; its tunnels hide older things — including [[The Cinder Vault]], sealed by the Unburnt Covenant.',
      'Black slopes, sulphur, ground warm through your boots, and the distant boom of something breathing deep below.',
      '- **The Covenant Stair** — an old dwarven road into the mountain, half-buried by lava.\n- **Drake roosts** — [[Ash Drake|ash drakes]] nest on the eastern cliffs.',
      '', ['1-2: A gout of toxic gas — DC 13 Constitution save or [[Poisoned]] for 1 hour', '3: [[Ash Drake]] circling overhead', '4: [[Ashen Hand Initiate|Ashen Hand miners]] ×6 hauling ore', '5: A lava flow blocks the path — find a way around', '6: An old Covenant waystone; touching it grants 10 Temporary Hit Points'])
place('The Cinder Vault', 'dungeon', '[[Mount Hotenow]]', 'A dwarven vault cut into living rock beside a magma river. The Unburnt Covenant sealed the Shard of Cinders here; [[Forgemaster Ruuk Ashgrinder]] is digging his way in.',
      'Heat like a forge door opened in your face. The ring of hammers. Runes on the walls glowing orange.',
      '- **The Slag Gate** — guarded by the [[Slag Golem]].\n- **The Great Anvil** — Ruuk\'s workshop above a lava channel.\n- **The Sealed Door** — Covenant runes; Muscovy can read them. The answer to the riddle is "ash remembers".\n- Lava channels: a creature that enters one for the first time on a turn takes 33 (6d10) Fire damage.',
      'The vault also holds the Covenant\'s record of the Crown\'s forging — the first clue that Kaurvex\'s true name is written in [[The Lantern Library]].')
place('Mere of Dead Men', 'swamp', '[[The Sword Coast]]', 'A vast salt-marsh on the coast road south of Waterdeep: fog, drowned villages, and things that remember being people.',
      'Grey water to the horizon, the creak of reeds, and fog that tastes of smoke.',
      '- **The causeway** — the old road, half-sunk.\n- **Old Fenn\'s hut** — the party\'s guide, [[Old Fenn]].\n- **[[The Drowned Pyre]]** — Mother Soot\'s court.',
      '', ['1-2: Thick fog — everything beyond 30 feet is Heavily Obscured for 1 hour', '3: [[Drowned Ashwalker]] ×2 rising from the peat', '4: [[Mire Lurker]] in deep water', '5: Will-o\'-wisp lights leading off the causeway', '6: A sunken boat with 2d10 gp and a soaked Ashen Hand letter'])
place('The Drowned Pyre', 'ruin', '[[Mere of Dead Men]]', 'A temple of Kaurvex, sunk into the Mere a century ago. Its bell tower still stands above the water; inside, peat smoulders underwater and [[Mother Soot]] holds court.',
      'A crooked bell tower in the fog. Smoke rising from the water itself. Laughter, very far away.',
      '- **The bell tower** — the only dry entrance.\n- **The nave** — waist-deep water, smouldering peat (Difficult Terrain).\n- **The altar** — the [[Shard of Smoke]] in a cage of bones.',
      'Mother Soot will trade the shard for a *name* — one of the heroes\'. A creature whose name she owns can\'t refuse her questions.')
place('Daggerford', 'town', '[[The Sword Coast]]', 'A walled river town on the trade road, proud and a little sleepy. [[Stillwater Abbey]] lies half a day\'s ride upriver.',
      'Market bells, a ford of shallow water, and a castle on a hill that has seen better days.')
place('Stillwater Abbey', 'temple', '[[Daggerford]]', 'A quiet abbey on a millpond, keepers of the Lantern Library. Its monks are scholars, not soldiers — and its eternal lantern is secretly the [[Shard of Embers]].',
      'Still water, cloister bells, the smell of vellum and candle wax.',
      '- **The cloister** — a garden around the millpond.\n- **[[The Lantern Library]]** — the abbey\'s heart.\n- **The scriptorium** — where "Brother" Lisel works.')
place('The Lantern Library', 'library', '[[Stillwater Abbey]]', 'Three floors of shelves around a central well, lit from above by the eternal lantern. It holds the Unburnt Covenant\'s archive — including the only record of Kaurvex\'s true name.',
      'Gallery after gallery of books spiralling up into lantern-light.',
      '- **The Lantern Well** — the eternal lantern hangs 40 feet up on a chain.\n- **The Covenant Stacks** — locked; the book of names is here.\n- Fire spreads one gallery per round once Lisel starts it.',
      'Kaurvex\'s true name is written in *The Book of the Unburnt*. Speaking it while holding a shard weakens the [[Avatar of Kaurvex]].')
place('Baldur\'s Gate', 'city', '[[The Sword Coast]]', 'The great port city of the south, ruled by patriars and policed by the Flaming Fist — some of whom are on the Ashen Hand\'s payroll.',
      'Bells, gulls, smoke from a thousand chimneys, and the press of the crowd on the Wide.',
      '- **The Upper City** — patriar mansions, including [[Graymantle Manor]].\n- **The Seatower** — Flaming Fist headquarters; [[Captain Vex Halloran]]\'s office.',
      '', ['1-2: A Flaming Fist patrol asks too many questions', '3: [[Flaming Fist Turncoat]] ×3 shaking down a merchant', '4: A street preacher of Kaurvex draws a crowd', '5: A cutpurse makes a grab', '6: An invitation to a patriar\'s party'])
place('Graymantle Manor', 'mansion', '[[Baldur\'s Gate]]', 'The Upper City mansion of [[Lady Orsolya Graymantle]], famous for its collection of curiosities and its three-level vault.',
      'Silver herons on the gates, a garden of white roses, and a butler who has already decided you are not welcome.',
      '- **The Gallery of Curios** — the [[Flamebane Shield]] hangs here.\n- **The Vault** — three doors: signet ring, combination (the Lady\'s birthday), and a glyph only the Lady can pass.\n- **The Ember Room** — the [[Shard of Soot]] in a glass case.',
      'Captain Halloran plans to rob the vault during the Lady\'s Midwinter gala.')
place('The High Forest', 'forest', '[[The Sword Coast]]', 'An ancient, enormous forest east of the Sword Coast. Elves, druids and older powers keep it.', 'Trees older than kingdoms, light like green water, and silence that listens.')
place('The Silvered Tarn', 'lake', '[[The High Forest]]', 'A perfectly round, perfectly still lake deep in the High Forest. Its surface reflects things that aren\'t there. Under the water is the gate to [[The Glass Oubliette]].',
      'A mirror of a lake. Your reflection looks back a heartbeat late.',
      '- The gate opens only for Taramon\'s blood (Seren) when three shards are carried to the shore.\n- Water from the tarn can quench the Heart Shard.')
place('The Glass Oubliette', 'demiplane', '[[The Silvered Tarn]]', 'A prison-demiplane of endless mirrored halls, built by the Harpers to hold [[Archmage Taramon]]. Light bends; distances lie.',
      'Every surface a mirror. A thousand of you walk beside you — and some of them are not keeping pace.',
      '- **Hall of Broken Reflections** — [[Mirror Shade|mirror shades]].\n- **The Sentinel Gate** — [[Prismatic Sentinel|prismatic sentinels]].\n- **The Prism Chamber** — Taramon\'s cell, and the [[Heart Shard]].',
      'Breaking the Heart Shard\'s cradle frees Taramon — and collapses the Oubliette within 10 minutes.')
place('The Sword Mountains', 'mountains', '[[The Sword Coast]]', 'A rugged range east of Waterdeep. Old dwarf holds, goblin warrens, and the dead volcano the Ashen Hand calls holy.', 'Grey peaks, thin cold air, and this autumn a constant fall of fine grey ash.')
place('Ashfall Caldera', 'volcano', '[[The Sword Mountains]]', 'A dead volcano where ash never stops falling. The Ashen Hand\'s holy site and war-camp. At its heart, [[The Pyre Throne]].',
      'A crater a mile wide, grey as a corpse. Tents, banners, ten thousand footprints in the ash — and in the middle, a throne of black glass.',
      '- **The Camp** — the army of the desperate; thousands of [[Ashen Hand Initiate|initiates]].\n- **The Ash Stair** — the path down, watched by [[Cindraxis]].\n- **[[The Pyre Throne]]** — the Reforging site.',
      'Kaurvex sleeps under the caldera. On the Night of Long Embers, ash falls upward.',
      ['1-2: Ash storm — Heavily Obscured, DC 14 Constitution save or 1 level of [[Exhaustion]]', '3: [[Ashen Hand Cinderblade]] ×2 and [[Ash-Bound Hound]] ×3 on patrol', '4: [[Cinder Wraith]] drifting over the camp', '5: A deserter who wants out — and knows the camp layout', '6: [[Cindraxis]] passes overhead (hide or be seen)'])
place('The Pyre Throne', 'shrine', '[[Ashfall Caldera]]', 'A throne of black volcanic glass on an island of rock in a lake of ash, where the Crown must be reforged and where the [[Avatar of Kaurvex]] will rise.',
      'Ash falls upward around the throne. The black glass is warm, and something under it is breathing.',
      '- The ash lake: Difficult Terrain; a creature that falls Prone in it is Blinded until it stands.\n- Five sockets on the throne\'s back, one per shard.')

# ============================================================================
# Factions
# ============================================================================
def faction(name, align, leader, base, attitude, goal, methods, clock, secrets, extra=''):
    clock_md = '\n'.join(clock)
    w(f'World/Factions/{name}.md', f'''---
type: faction
alignment: {align}
leader: "{leader}"
base: "{base}"
attitude: {attitude}
gallery: []
tags: [faction]
---
# {name}

## Goal
{goal}

## Methods
{methods}
{extra}
## Gallery
*Banners, symbols, members, hideouts. Drop or paste images here.*
```gallery
```

## Threads
*Session threads and follow-ups that link to this note.*
```threads
mentions: this
filter: all
compact: true
```

## Members
```dm-list
type: npc
where: faction
fields: [role, location, status]
empty: No members recorded yet.
```

## Clock
{clock_md}

## Secrets
> [!secret]
> {secrets}
''')

faction('The Ashen Hand', 'Lawful Evil', '[[Varkas Emberveil]]', '[[Ashfall Caldera]]', 'hostile',
  'Reassemble the **Ashen Crown** — a relic said to command fire and ash — at the [[The Pyre Throne|Pyre Throne]] on the Night of Long Embers, and wake their god: Kaurvex, the Unremembered Brother, whom they believe to be the forgotten brother of Tiamat.',
  'Recruiting the desperate (soup kitchens, debt relief, a family that "remembers you"); burning anything that guards a shard; paying off guards and officials; terror where kindness fails.',
  ['- [ ] Free or recover Prisoner 13 (the map) — [[The Thirteenth Cell]]', '- [ ] Shard of Cinders — [[The Cinder Vault]]', '- [ ] Shard of Smoke — [[The Drowned Pyre]]', '- [ ] Shard of Embers — [[The Lantern Library]]', '- [ ] Shard of Soot — [[Graymantle Manor]]', '- [ ] Heart Shard and Taramon\'s rite — [[The Glass Oubliette]]', '- [ ] Gather the faithful at the [[Ashfall Caldera]]', '- [ ] The Reforging on the Night of Long Embers'],
  'The Hand is a splinter of the Cult of the Dragon, cast out for heresy. Varkas intends to burn his own recruits as the "kindling" of the Reforging, and to burn Taramon once the rite is spoken. Most Hands don\'t know either thing.',
  extra='\n## Ranks\n- **The Voice** — [[Varkas Emberveil]], High Pyrelord.\n- **The Hands** — five lieutenants, one per shard: [[Sister Cinder]] (recruiter), [[Forgemaster Ruuk Ashgrinder]], [[Lisel Marrow]], [[Captain Vex Halloran]] (bought, not sworn), and [[Archmage Taramon]] (imprisoned). [[Mother Soot]] is an ally, not a member.\n- **Pyrelords & pyre-priests** — commanders.\n- **Cinderblades** — soldiers.\n- **Initiates** — the desperate.\n\n## Doctrine\n*"What is burned is not destroyed; it is remembered by the ash."* Kaurvex, they teach, was the brother of Tiamat whose name she burned from history out of jealousy. When the Crown is whole, he will remember everyone the world forgot.\n')
faction('The Hollow Road Crew', 'Chaotic Neutral', '[[Garrett]]', '[[The Sword Coast]]', 'friendly',
  'Survive, eat well, and never rob anyone who can\'t afford it. A small band of highway robbers who work the High Road between Luskan and Waterdeep.',
  'Ambushes on lonely roads, a strict no-killing rule, and shares split evenly. Sheila rode with them for six years and left on good terms.',
  ['- [ ] The crew learns Garrett is alive in Revel\'s End', '- [ ] Without Garrett, they take a job for the Ashen Hand (smuggling firepots)', '- [ ] Garrett returns — or the crew falls apart'],
  'Since Garrett\'s arrest, the crew has been run by his second, Bryn Hallow, who is quietly taking Ashen Hand money. If Garrett comes home, she has to choose too.',
  extra='\n## Members\n- [[Garrett]] — leader (imprisoned)\n- Bryn Hallow — his second, now in charge\n- Old Tuck, the twins Ash and Ember Varr (no relation to the cult, they insist), and Pip the horse-thief\n- Formerly: [[Sheila]]\n\n## How they help\nHorses, back roads, safe camps on the High Road, and a dozen people who will lie to the Watch for Sheila. In Act III they can raid the Hand\'s supply wagons heading for the caldera.\n')
faction('The Cult of the Dragon', 'Lawful Evil', '', '', 'hostile',
  'Venerate dragons and bring about their reign. They regard the Ashen Hand as heretics and thieves and want the shards for their own ends.',
  'Secret cells, wealthy patrons, dragon-worship. A Cult cell can appear as a third party in any shard chapter.',
  ['- [ ] Send an envoy to Varkas (rejected)', '- [ ] Hire the party (or kill them) to take a shard from the Hand', '- [ ] Strike the Ashfall Caldera during the Reforging'],
  'The Cult\'s records say Kaurvex was never Tiamat\'s brother — he was a rival she destroyed. Either way, something real sleeps under the caldera.')
faction('The Harpers', 'Neutral Good', '[[Delmar Quillon]]', '[[Neverwinter]]', 'indifferent',
  'Keep tyrants from rising — including [[Archmage Taramon]], whom they sealed in [[The Glass Oubliette]] twelve years ago.',
  'Spies, letters in cipher, quiet favours. They will help against the Hand, but they will not let Taramon out.',
  ['- [ ] Learn who freed Prisoner 13', '- [ ] Recruit the party — or neutralise them', '- [ ] Stop anyone reaching the Silvered Tarn'],
  'In the raid that caught Taramon, a Harper spell killed Seren\'s mother. [[Delmar Quillon]] cast it. He put Seren in Revel\'s End under a number to hide her — from the Hand, and from her own past.')
faction('The Wardens of Revel\'s End', 'Lawful Neutral', '[[Warden Cassia Rime]]', '[[Revel\'s End]]', 'indifferent',
  'Hold every prisoner they are given, by number, until the Lords\' Alliance says otherwise.',
  'Discipline, ice, isolation. Honest — mostly. They don\'t ask why a prisoner is sent.',
  ['- [ ] Discover that Prisoner 13 is gone', '- [ ] Send a warrant after the party (Act II complication)'],
  'Warden Rime was never told who Prisoner 13 really is. If she learns the Harpers used her prison to hide a political prisoner, she\'ll be furious — and may help the party.')
faction('The Unburnt Covenant', 'Lawful Good', '[[Abbess Merin Lanternhold]]', '[[Stillwater Abbey]]', 'friendly',
  'An almost-forgotten order that forged the Ashen Crown to bind Kaurvex, then broke it when the binding began to bind them. Its remnants guard the shards and the knowledge of how to unmake the Crown.',
  'Hidden vaults, riddles, records. Most members are old; [[Muscovy]] is one of the youngest.',
  ['- [ ] Warn the shard-keepers (too late for most)', '- [ ] Recover the Book of the Unburnt from [[The Lantern Library]]', '- [ ] Find the bearer "of the Brother\'s blood"'],
  'The Covenant knew all along that the Crown could be unmade — and chose to hide the shards instead, because unmaking it requires the Crown\'s own chosen — someone of Kaurvex\'s blood — to carry a shard for a day without ever using it. They had no such bearer. The party does: [[Opal]].')

# ============================================================================
# NPCs
# ============================================================================
FIRST_SEEN = '[[Session 001 - The Thirteenth Cell]]'
def npc(name, role, species, loc, fac, att, look, voice, want, secret, sb, desc='', rp='', rel='', first=''):
    w(f'World/NPCs/{name}.md', f'''---
type: npc
role: "{role}"
species: {species}
location: "{loc}"
faction: "{fac}"
attitude: {att}
status: alive
first_seen: "{first}"
image: ""
tags: [npc]
---
# {name}

```portrait
```

> [!npc] Quick reference
> **Look:** {look}
> **Voice / mannerism:** {voice}
> **Wants:** {want}

## Description
{desc}

## Personality & roleplay notes
{rp}

## Secret
> [!secret]
> {secret}

## Relationships
{rel or '-'}

## Statblock
```statblock
monster: {sb}
rename: "{name}"
```

## Threads
*Session threads and follow-ups that link to this note.*
```threads
mentions: this
filter: all
compact: true
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

npc('Seren Vael', 'Prisoner 13; former Ashen Hand cartographer', 'Half-Elf', '[[The Thirteenth Cell]]', '', 'indifferent',
    'Thin, sharp-eyed, ink-black hair cropped short; both forearms covered in faint grey whorls that look like scars.', 'Quiet, precise, answers questions with questions. Hums when she is afraid.',
    'To never be found by the Ashen Hand — or by her father.',
    'She is the daughter of [[Archmage Taramon]]. She drew the Hand\'s master map of all five shard sites, then burned the archive and tattooed the only copy into her own skin with ash-ink that shows only by firelight. Her blood is the only key to her father\'s prison. She has never heard of Orsik Stonequill and wants to know how a stranger\'s brother found her.',
    'Bandit', desc='Imprisoned in [[Revel\'s End]] under a number for arson in Luskan — she burned the Ashen Hand\'s map archive. The map on her arms is in her own cipher: she can read one site at a time, and only when she chooses to.',
    rp='Trust is earned in small steps: keeping promises, protecting her candle, not asking about her father. She is funny once she relaxes. She hates fire and uses it anyway.',
    rel='- Daughter of [[Archmage Taramon]] (estranged).\n- Hunted by [[Sister Cinder]], who once mentored her.\n- Her mother died in the Harper raid led by [[Delmar Quillon]].', first=FIRST_SEEN)
npc('Orsik Stonequill', 'wizard lecturer and researcher, on the run', 'Human', '[[Neverwinter]]', '', 'friendly',
    'Ink-stained fingers, spectacles mended with wire, a lecturer\'s robe now dyed travel-brown; beard cut short so he won\'t be recognised.', 'Talks in footnotes. Apologises constantly. Goes very still when he hears footsteps.',
    'To stay alive long enough to finish his research — and to keep his family out of the Hand\'s reach.',
    'He knows that Prisoner 13 is "the key" — every trail in his notes ends at her — but not how or why. He has never heard the name Seren Vael. His own student, [[Lisel Marrow]], is the one who reported him to the Hand.',
    'Battle Mage', desc='[[Eric]]\'s twin brother, a lecturer and researcher at the [[Blackstaff Academy]] in [[Waterdeep]]. While cataloguing a sealed archive he pieced together the Ashen Hand\'s plan: the five shards, the Reforging, and a prisoner at Revel\'s End the Hand wants badly. The Hand found out what he was studying. He ran the same night, with a cipher notebook and nothing else, and sent one hurried letter to his brother (see [[Orsik\'s Letter]]).',
    rp='Brave in the way scared people are. He insists on helping and is genuinely useful (Arcana, History, a dozen languages). He feels responsible for putting his family in danger and will do something reckless to draw the Hand away from them.',
    rel='- Twin brother of [[Eric]].\n- Hiding with [[Ilvara Dusk]] in [[Neverwinter]] (Chapter 4).\n- Hunted by [[Hask the Ash-Finder]].\n- Betrayed by his student [[Lisel Marrow]].')
npc('Hask the Ash-Finder', 'Ashen Hand hunter', 'Human', '[[Waterdeep]]', '[[The Ashen Hand]]', 'hostile',
    'Lean, grey-hooded, ash smeared under the eyes like a hunter\'s paint; carries a ledger of names.', 'Soft-spoken, polite, writes everything down. Never threatens — just reads your family\'s names back to you.',
    'Orsik Stonequill and his notebook — through his family if necessary.',
    'Hask has a list of every Stonequill on the Sword Coast. He is watching the family home in Waterdeep and has paid informers at every gate. He doesn\'t yet know that Orsik\'s brother is travelling with Prisoner 13; when he finds out, the Hand\'s two hunts become one.',
    'Sword Coast Agent', desc='The reason Waterdeep is dangerous for the party. He shows up wherever a Stonequill is mentioned.',
    rp='Patient. Prefers leverage to violence. If cornered, he bargains with information.', rel='- Reports to [[Sister Cinder]] and, through her, to [[Varkas Emberveil]].')
npc('Warden Cassia Rime', 'Warden of Revel\'s End', 'Human', '[[Revel\'s End]]', '[[The Wardens of Revel\'s End]]', 'indifferent',
    'Fifties, grey braid, frostbitten ear-tips, a warden\'s chain of office over a fur coat.', 'Clipped, dry, never raises her voice. Taps her ring on the table when she\'s thinking.',
    'Order. Every prisoner accounted for.',
    'She suspects Prisoner 13\'s papers were forged by someone powerful and has quietly started asking questions.',
    'Revel\'s End Warden-Guard', desc='Honest, hard, fair. She will not release a prisoner without proper papers — but she can be persuaded that proper papers exist.',
    rel='- Knows [[Hank]] from years of supply runs; trusts him.\n- Distrusts [[Tallow]] but needs him.', first=FIRST_SEEN)
npc('Tallow', 'guard at Revel\'s End', 'Halfling', '[[Revel\'s End]]', '[[The Wardens of Revel\'s End]]', 'friendly',
    'Round, red-cheeked, always eating something.', 'Chatty, nervous laugh, calls everyone "friend".',
    'To pay off a gambling debt to a Luskan moneylender before it reaches his mother.',
    'He has already been paid by the Ashen Hand to leave the dock gate unlocked on the night of the supply ship. He would rather be paid by the party.',
    'Guard', desc='The party\'s easiest way in. He can "lose" a [[Warden\'s Frostkey]] for 150 gp.', rel='- Owes money in [[Luskan]].\n- Old drinking friend of [[Hank]].', first=FIRST_SEEN)
npc('Garrett', 'Prisoner 12; leader of the Hollow Road Crew', 'Human', '[[The Thirteenth Cell]]', '[[The Hollow Road Crew]]', 'friendly',
    'Forties, broad, grey creeping into a red beard; a crooked nose broken twice; still stands like he owns the room, even in chains.', 'Low, warm, unhurried. Calls Sheila "kid". Laughs at his own bad luck.',
    'Out — and his crew safe. Seeing Sheila again comes a close second.',
    'The Ashen Hand put him in the cell next to Seren\'s on purpose. Through [[Tallow]] they have promised him freedom and pardons for his crew if, when they come, he opens her door. He agreed — before he got to know her through the wall. He hasn\'t decided what he\'ll do, and Sheila showing up makes it much harder.',
    'Sword Coast Agent', desc='Prisoner 12, in the cell beside [[The Thirteenth Cell]]. Two years ago the Hollow Road Crew robbed a wagon on the High Road that turned out to be carrying Ashen Hand gold. When Lords\' Alliance riders caught up, Garrett surrendered so the others could get away. The Hand paid a magistrate to send him to Revel\'s End instead of a local gaol — so he would be next to Prisoner 13. He has been talking to Seren through the wall for a year; she is the closest thing he has to a friend in there.',
    rp='Protective, proud, funny. Owns his mistakes. He will tell Sheila the truth about the Hand\'s offer if she asks him straight — and lie to anyone else. Played right, he is a loyal ally for the rest of the campaign; played wrong, he opens Seren\'s door for the Hand.',
    rel='- Mentor and old friend of [[Sheila]] — they parted on good terms.\n- Talks to [[Seren Vael]] through the wall every night.\n- Carries messages from the Hand via [[Tallow]].', first=FIRST_SEEN)
npc('Thorne Wavemark', 'smuggler captain of the *Gull\'s Debt*', 'Human', '[[Luskan]]', '', 'friendly',
    'Weather-beaten, gold earring, a coat patched with sail-cloth.', 'Booming laugh, sea-shanty swearing, never says "no", only "how much?"',
    'To keep her ship afloat and her crew fed.', 'The Ashen Hand has burned two of her ships. She knows where their supply runs leave from.',
    'Bandit', desc='The party\'s ride north and south. Waits off Revel\'s End for three nights, no more.', rel='- Pays protection to [[Sister Cinder]]... for now.', first=FIRST_SEEN)
npc('Tobin Thorne', 'Ashen Hand initiate', 'Human', '[[The Cinderhouse]]', '[[The Ashen Hand]]', 'indifferent',
    'Gaunt, ash-smudged, grey hood, a crown-shaped burn on his palm.', 'Talks too fast. Quotes Sister Cinder.',
    'To send money home to the Hollow Road Crew after Garrett\'s arrest — and to belong somewhere.', 'He joined willingly. Cinder told him the crew would be "remembered" if he served. He is on Varkas\'s kindling list.',
    'Ashen Hand Initiate', rel='- The Hollow Road Crew\'s youngest; [[Sheila]] half-raised him.\n- Devoted to [[Sister Cinder]].')
npc('Nim', 'street kid, would-be recruit', 'Tiefling', '[[Luskan]]', '', 'friendly',
    'Ten years old, too-big coat, horns filed down so she looks human.', 'Asks for everything twice.',
    'Soup, a coat, someone who comes back.', 'If nobody helps her, she joins the Hand in Chapter 2 and is at the caldera in the finale.', 'Ashen Hand Initiate',
    desc='A face for the people the Hand recruits. What the party does for her matters at the end.')
npc('Delmar Quillon', 'Harper agent', 'Human', '[[Neverwinter]]', '[[The Harpers]]', 'indifferent',
    'Neat grey beard, ink-stained cuffs, a silver harp pin on the inside of his collar.', 'Gentle, patient, never threatens — he simply lets you know what he knows.',
    'Keep Taramon sealed. Keep Seren safe and hidden.', 'He killed Seren\'s mother by mistake in the raid on Taramon. He put Seren in Revel\'s End to hide her. He will lie to the party to keep the Tarn closed.',
    'Sword Coast Agent', desc='The party\'s best source on Taramon — and the one most likely to stop them freeing him.', rel='- The Harpers want [[Orsik Stonequill]]\'s notebook too.')
npc('Ilvara Dusk', 'wizard of Neverwinter, Covenant scholar', 'Elf', '[[Neverwinter]]', '[[The Unburnt Covenant]]', 'friendly',
    'Silver hair in a messy knot, burn scars on both hands, spectacles of smoked glass.', 'Excitable, interrupts herself, draws diagrams on everything.',
    'To study a shard up close — safely.', 'She was Taramon\'s student, 80 years ago, and still writes to him in her diary. She is hiding [[Orsik Stonequill]] in her tower — and reading his notebook.',
    'Battle Mage', desc='Identifies shards and explains Resonance. Can enchant the party\'s gear for fire resistance (downtime).')
npc('Brother Osk Hammerfell', 'last warden of the Cinder Vault', 'Dwarf', '[[Mount Hotenow]]', '[[The Unburnt Covenant]]', 'friendly',
    'Ancient, blind, beard braided with iron rings.', 'Speaks in riddles out of habit; laughs like a bellows.',
    'For someone to finish the Covenant\'s work.', 'He knows how the Crown can be unmade but not where the name is written.',
    'Revel\'s End Warden-Guard', rel='- Mentor of [[Muscovy]].')
npc('Old Fenn', 'Mere guide', 'Human', '[[Mere of Dead Men]]', '', 'friendly',
    'Stooped, mud to the knees, a lantern on a long pole.', 'Mumbles, hums hymns, knows every channel.',
    'Payment in salt and tobacco.', 'Mother Soot owns his name. He will lead the party into her court, weeping, because he can\'t refuse her.',
    'Bandit')
npc('Abbess Merin Lanternhold', 'Abbess of Stillwater Abbey', 'Human', '[[Stillwater Abbey]]', '[[The Unburnt Covenant]]', 'friendly',
    'Tall, white-haired, ink on her fingers and soil under her nails.', 'Warm, unhurried, quotes books by page number.',
    'To keep the library — and its secret — safe.', 'The eternal lantern is the Shard of Embers. She will lie about it until the library is burning.',
    'Battle Mage', rel='- Unknowingly employs [[Lisel Marrow]] as a scribe.')
npc('Lady Orsolya Graymantle', 'patriar collector', 'Human', '[[Graymantle Manor]]', '', 'indifferent',
    'Seventy, upright, pearls and a cane topped with a silver heron.', 'Bored, cutting, delighted by anyone who surprises her.',
    'Her collection intact and her family name respected.', 'She knows the "Graymantle Ember" is dangerous — her grandfather\'s diary says so — and has been considering selling it to the highest bidder.',
    'Sword Coast Agent', rel='- Distrusts [[Captain Vex Halloran]].')

# ============================================================================
# Party (example characters)
# ============================================================================
PARTY = [
 ('Sheila', dict(player='', species='', cls='Rogue', sub='Thief', bg='Criminal', ac=15, hp=38, ini=4, pp=15,
   concept='A former member of the Hollow Road Crew, a small band of highway robbers on the High Road. She left on good terms — and with a special bond with the crew\'s leader, Garrett.',
   hooks='[[Garrett]] was like a father to her. She thinks he vanished two years ago — he is Prisoner 12 at [[Revel\'s End]].\n- [[Tobin Thorne]], the crew\'s youngest, whom she half-raised, has joined the Ashen Hand.\n- She knows the High Road, its back trails and its fences.',
   bond='Owes Garrett more than she ever told him. Would do anything to get Tobin out.',
   secret='Garrett is in the cell next to Prisoner 13, put there by the Hand, and has agreed to open Seren\'s door for them in exchange for his freedom. Sheila is the one person who can change his mind.')),
 ('Eric', dict(player='', species='', cls='Fighter', sub='', bg='Soldier', ac=18, hp=49, ini=1, pp=12,
   concept='A fighter, and the twin brother of [[Orsik Stonequill]], a wizard lecturer and researcher at the academy in Waterdeep.',
   hooks='Orsik uncovered the Ashen Hand\'s plans and is on the run; the Hand is hunting the whole family.\n- Orsik\'s letter told him to find Prisoner 13 — and never to come to [[Waterdeep]].',
   bond='Will protect his twin and the rest of the family, whatever it costs.',
   secret='Orsik only knows that Prisoner 13 is involved, not how. The Hand\'s hunter, [[Hask the Ash-Finder]], already has Eric\'s name in his ledger.')),
 ('Opal', dict(player='', species='Half-Elf', cls='Sorcerer', sub='Draconic Sorcery', bg='Sage', ac=16, hp=37, ini=2, pp=11,
   concept='A half-elf sorcerer of dragon blood — the magic came down her elven grandmother\'s line. Faint grey scales along her collarbones that only show when she casts; fire answers her a little too eagerly. She has always been told her ancestor was a red dragon.',
   hooks='[[Ilvara Dusk]] of Neverwinter taught her to control her magic after it burned her village.\n- She feels warm, and her scales itch, whenever the party is near a shard. She thinks it\'s nerves.',
   bond='Owes Ilvara everything.',
   secret='Her dragon ancestor wasn\'t red. She is of Kaurvex\'s blood — the last true line of the Unremembered Brother — and the **chosen bearer** of the Ashen Crown. Nobody has told her. See [[Opal and the shards]].')),
 ('Muscovy', dict(player='', species='', cls='Cleric', sub='Life Domain', bg='Acolyte', ac=18, hp=43, ini=0, pp=14,
   concept='A cleric of the near-forgotten Unburnt Covenant, the order that broke the Ashen Crown three centuries ago, sent to learn why shard-keepers are dying.',
   hooks='Mentor: [[Brother Osk Hammerfell]], who guards the [[The Cinder Vault|Cinder Vault]].\n- Can read Covenant runes.',
   bond='Sworn to see the Crown unmade, not reforged.',
   secret='The Covenant\'s prophecy says the Crown\'s bearer will be "of the Brother\'s blood". Muscovy has spent years looking for that person. She is standing right beside them: [[Opal]].')),
 ('Hank', dict(player='', species='', cls='Ranger', sub='Hunter', bg='Guide', ac=15, hp=44, ini=3, pp=15,
   concept='A hunter and ice-road guide who led the wardens\' supply sledges to Revel\'s End for years.',
   hooks='He knows the ice road, the [[Rime Wolf|rime wolves]], [[Warden Cassia Rime]] and [[Tallow]].\n- The last courier he guided across the ice died inside the prison that night.',
   bond='Wants to know why the courier died.',
   secret='The courier was carrying a letter for Prisoner 13, and [[Tallow]] poisoned him on the Ashen Hand\'s orders.')),
]
for name, d in PARTY:
    w(f'Campaign/Party/{name}.md', f'''---
type: player
character: "{name}"
player: "{d['player']}"
dndbeyond: ""
image: ""
species: "{d['species']}"
class: {d['cls']}
subclass: "{d['sub']}"
background: {d['bg']}
level: 5
ac: {d['ac']}
hp_max: {d['hp']}
init_bonus: {d['ini']}
passive_perception: {d['pp']}
status: active
tags: [pc]
---
# {name}

```portrait
```

> [!npc] At a glance
> **Player:** {d['player'] or '—'} · **{(d['species'] + ' ' if d['species'] else '') + d['cls']}** 5{(' (' + d['sub'] + ')') if d['sub'] else ''} · **Background:** {d['bg']}

```dndbeyond
```

## Level history
```level-history
```
- **Level 5** — [[Session 000 - Session Zero]] · 2026-11-14 · Starting level for The Ashen Crown

## Concept
{d['concept']}

## Backstory hooks
- {d['hooks']}

## Bonds
- {d['bond']}

## Secrets only the DM knows
> [!secret]
> {d['secret']}

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

# ============================================================================
# Quests — the 11 chapters plus side quests
# ============================================================================
ACT1, ACT2, ACT3 = 'Act I - Chains and Cinders', 'Act II - The Scattered Flame', 'Act III - The Unremembered Brother'
def quest(name, status, giver, loc, reward, level, arc, hook, objective, steps, complications='', secrets='', rewards_detail='', chapter=''):
    st = '\n'.join(f'- [ ] {s}' for s in steps)
    body = f'''---
type: quest
status: {status}
giver: "{giver}"
location: "{loc}"
reward: {q(reward)}
level: {q(level)}
arc: "[[{arc}]]"
{('chapter: ' + str(chapter) + chr(10)) if chapter else ''}tags: [quest]
---
# {name}

## Hook
{hook}

## Objective
{objective}

## Steps
{st}
'''
    if complications: body += f'\n## Complications\n{complications}\n'
    if secrets: body += f'\n## DM secrets\n> [!secret]\n> {secrets}\n'
    if rewards_detail: body += f'\n## Rewards\n{rewards_detail}\n'
    w(f'Campaign/Quests/{name}.md', body)

quest('Chapter 1 - The Thirteenth Cell', 'active', '[[Orsik Stonequill]]', '[[Revel\'s End]]', 'Seren\'s trust; answers for Orsik', '5 → 6', ACT1,
  'A creased letter from [[Eric]]\'s twin brother Orsik, written in a hurry and posted from somewhere on the High Road (see [[Orsik\'s Letter]]): his research uncovered the Ashen Hand, the Hand found out, and he is running. Every trail in his notes ends at **Prisoner 13 of Revel\'s End**. He doesn\'t know why she matters — only that the Hand wants her badly. *"Find her before they do. And whatever happens, don\'t come to Waterdeep — they\'re watching the family."*',
  'Get Prisoner 13 out of Revel\'s End alive — by talk, bribery, stealth or force — before the Ashen Hand does, and find out why she matters.',
  ['Sail north with [[Thorne Wavemark]] on the *Gull\'s Debt* (Orsik\'s old favour)', 'Cross the ice road (see [[Rime Wolves on the Ice Road]])', 'Get inside: talk to [[Warden Cassia Rime]] (Hank guided the wardens\' supply sledges for years), bribe [[Tallow]], or use the drain tunnel', 'Reach [[The Thirteenth Cell]] and convince [[Seren Vael]] to come', 'Survive [[The Hand Comes for Prisoner 13]] — the Hand attacks the same night', 'Escape to the ship — past [[Rime Troll at the Broken Dock]]'],
  'There are no papers: Rime won\'t release a prisoner without them (DC 18 Persuasion to get a private interview; Advantage if Hank vouches). Tallow is already paid by the Hand. [[Garrett]], in the next cell, offers to start a riot as a distraction — and wants out too. Seren won\'t trust anyone who can\'t explain who sent them; "a frightened scholar\'s brother" is, oddly, the answer that works.',
  'Seren reads the first part of her map by the candle in her cell: "Hotenow — the Cinder Vault". She refuses to say how she knows. The Hand attacking the same night is no coincidence: [[Tallow]] sold the date. The Hand\'s plan relies on [[Garrett]] opening Seren\'s door from the inside. The cinderblade\'s orders mention "the scholar\'s kin" — the Hand already knows a Stonequill is involved.',
  '[[Warden\'s Frostkey]], [[Rimewalker Boots]], 200 gp in the cinderblade\'s purse. **Level 6** at the end of the chapter.', chapter=1)
quest('Chapter 2 - Smoke over Luskan', 'hook', '[[Seren Vael]]', '[[Luskan]]', 'The location of the first shard; Tobin', '6', ACT1,
  'Back in Luskan, Seren won\'t read her map until she is sure nobody is following. Someone is: grey hoods at the end of the street, and a soup line outside a warehouse with a grey hand painted on the door. Seren knows that sign — she used to work for them.',
  'Keep Seren safe in Luskan, learn what the Ashen Hand knows, and get [[Tobin Thorne]] out of [[The Cinderhouse]].',
  ['Shake off the Hand\'s watchers ([[Soot Imps in the Salted Lantern]])', 'Help [[Nim]] — or don\'t', 'Get into [[The Cinderhouse]] (as volunteers, recruits or burglars)', 'Find Cinder\'s letters: the kindling list', 'Confront [[Sister Cinder]] — [[The Cinderhouse Raid]]', 'Persuade Seren to read the Hotenow map by firelight'],
  'Sister Cinder is kind and right about Luskan\'s poor. Fighting in a soup kitchen full of children is a bad look. Tobin refuses to leave until he sees the kindling list.',
  'Cinder escapes (Veil of Ash) and is shaken by what the letters say about the kindling. She will remember who showed her.',
  '[[Ash-Veil Mantle]] (if Cinder is beaten), 300 gp in the Cinderhouse strongbox, [[Wavemark\'s Weatherglass]] if they saved the *Gull\'s Debt* (side quest). **Level 7** at the end.', chapter=2)
quest('Chapter 3 - The Cinder Vault', 'hook', '[[Brother Osk Hammerfell]]', '[[The Cinder Vault]]', 'Shard of Cinders', '7', ACT1,
  'Seren\'s map leads to Mount Hotenow. [[Brother Osk Hammerfell]], blind and ancient, is waiting on the Covenant Stair: "You\'re late. The forgemaster is nearly through."',
  'Reach the Shard of Cinders before [[Forgemaster Ruuk Ashgrinder]] does.',
  ['Climb the Covenant Stair', 'Survive the drake roosts ([[Ash Drakes of Hotenow]])', 'Pass the Slag Gate', 'Answer the Sealed Door\'s riddle ("ash remembers")', 'Defeat Ruuk at the Great Anvil ([[The Forgemaster\'s Anvil]])', 'Take the [[Shard of Cinders]]'],
  'The vault starts to flood with lava once the Sealed Door opens (3 rounds per area). Using the shard — even once — tells the Hand where the party is.',
  'The vault\'s Covenant tablets say the Crown "was made with a name and can be unmade with it"; the name is "kept where the light never goes out" (that is [[The Lantern Library]]), and only "one of the Brother\'s blood" can unmake it. When [[Opal]] touches the Shard of Cinders, it goes cool in her hand — the only time anyone has felt it cool.',
  '[[Shard of Cinders]], [[Hotenow Forgehammer]], 4 [[Potion of Ashbreath|potions of Ashbreath]], 1,200 gp of Covenant gold. **Level 8** at the end of Act I.', chapter=3)
quest('Chapter 4 - The Scholar in Hiding', 'hook', '[[Ilvara Dusk]]', '[[Neverwinter]]', 'Orsik; allies; the second map site', '8', ACT2,
  'A message reaches Eric in Neverwinter, in Orsik\'s private childhood code: *"Safe for now. The tower with the copper roof. Come at night."* It\'s [[Ilvara Dusk]]\'s tower. A Harper, [[Delmar Quillon]], is also asking after the party.',
  'Reunite with [[Orsik Stonequill]], put his research together with Seren\'s map, and decide whom to trust: Ilvara, the Harpers, or neither.',
  ['Reach Ilvara\'s tower without leading the Hand there', 'Find Orsik — compare his notebook with what Seren knows', 'Have the shard identified by [[Ilvara Dusk]] (Resonance)', 'Meet [[Delmar Quillon]] (he wants Seren — and Orsik\'s notebook)', 'Survive a Hand reprisal ([[Hand Reprisal in Neverwinter]])', 'Seren reads the second site: the Mere of Dead Men'],
  'Delmar offers 2,000 gp and a pardon for handing Seren to the Harpers. Seren overhears. Orsik wants to go to Waterdeep to warn the family — which would expose everyone.',
  'Orsik\'s notebook mentions "the archmage in the glass" and "a daughter"; Ilvara recognises who that must be but says nothing — yet. [[Hask the Ash-Finder]] has started watching the Stonequill house in Waterdeep (side quest [[Ash on the Doorstep]]).',
  'A favour from the Harpers or from Ilvara (choose). Downtime: fire-resistance enchantment for one item (Ilvara, 500 gp). Orsik joins the party as a guest NPC, or stays hidden.', chapter=4)
quest('Chapter 5 - The Drowned Pyre', 'hook', '[[Old Fenn]]', '[[The Drowned Pyre]]', 'Shard of Smoke', '8 → 9', ACT2,
  'Seren\'s second map: a bell tower drowned in the Mere. [[Old Fenn]] offers to guide them for salt and tobacco.',
  'Recover the [[Shard of Smoke]] from [[Mother Soot]] — by force, bargain or trickery.',
  ['Follow Fenn into the fog', 'Fight off the dead ([[Things in the Peat]])', 'Enter the bell tower', 'Bargain with or defeat Mother Soot ([[Mother Soot\'s Court]])', 'Escape with the shard before the Hand\'s boats arrive'],
  'Fenn betrays them because he must. Mother Soot asks for a name. If anyone gives theirs, she owns them.',
  'Mother Soot knows Kaurvex\'s true name is in a library "where the light never goes out" — and will trade that knowledge too.',
  '[[Shard of Smoke]], [[Bogpearl of Mother Soot]] (if bargained), 900 gp in drowned offerings. **Level 9** at the end.', chapter=5)
quest('Chapter 6 - The Lantern Library', 'hook', '[[Abbess Merin Lanternhold]]', '[[The Lantern Library]]', 'Shard of Embers; Kaurvex\'s true name', '9 → 10', ACT2,
  'Seren\'s third map site is Stillwater Abbey near Daggerford. When the party arrives, the abbey is calm — and smoke is already rising from the scriptorium chimney at the wrong time of day.',
  'Save the Lantern Library, the [[Shard of Embers]] and the *Book of the Unburnt* from [[Lisel Marrow]].',
  ['Meet [[Abbess Merin Lanternhold]] (she denies a shard is there)', 'Spot the infiltrator — "Brother" Lisel', 'Fight the fire ([[Burning Pages]])', 'Unmask Lisel ([[The Archivist Unmasked]])', 'Save the *Book of the Unburnt* — learn Kaurvex\'s true name', 'Take the eternal lantern — the Shard of Embers'],
  'Every round of combat, one gallery burns. The party can save the books or chase Lisel, not both — unless they split up.',
  'The *Book of the Unburnt* explains how to unmake the Crown, and lists the bloodline of Kaurvex — ending with an elven family from Neverwinter. Opal\'s grandmother — the elf in her half-elf heritage — is on the last line. The bearer must carry a shard a full day without using it.',
  '[[Shard of Embers]], [[Lantern of the Unburnt Page]], [[Ring of the Quiet Flame]] (from the reliquary, if the abbess trusts them). **Level 10** at the end.', chapter=6)
quest('Chapter 7 - The Soot Vault', 'hook', '[[Lady Orsolya Graymantle]]', '[[Graymantle Manor]]', 'Shard of Soot', '10 → 11', ACT2,
  'The last map site is in Baldur\'s Gate: the "Graymantle Ember". The Hand plans to take it during Lady Graymantle\'s Midwinter gala, with the help of [[Captain Vex Halloran]] of the Flaming Fist.',
  'Get the [[Shard of Soot]] before Halloran and the Hand — by persuading the Lady, out-heisting the heisters, or both.',
  ['Get invited to the gala (or sneak in)', 'Win over [[Lady Orsolya Graymantle]] — or steal her [[Graymantle Signet]]', 'Stop the heist ([[Turncoats in the Vault]])', 'Survive the Hand\'s retreat ([[Wings over Baldur\'s Gate]])', 'MIDPOINT: Varkas appears with [[Cindraxis]] — and takes Seren (or a shard)'],
  'The Flaming Fist arrest the party, not Halloran, unless they have proof (the Lady\'s ledgers).',
  '**Midpoint twist:** Varkas captures [[Seren Vael]] (or, if she\'s too well guarded, takes one shard). Her capture tells the party the Hand needs her alive — why?',
  '[[Shard of Soot]] (or the Hand gets it), [[Flamebane Shield]], 2,000 gp reward from the Lady. **Level 11** at the end of Act II.', chapter=7)
quest('Chapter 8 - The Key in the Blood', 'hook', '[[Orsik Stonequill]]', '[[The High Forest]]', 'Why Prisoner 13 matters', '11 → 12', ACT3,
  'With Seren taken, Orsik and [[Ilvara Dusk]] break the last cipher in his notebook. Now they know *how* Prisoner 13 is involved: she is [[Archmage Taramon]]\'s daughter, and her blood is the only key to [[The Glass Oubliette]], where the Heart Shard is sealed with him. The Hand is taking her to [[The Silvered Tarn]].',
  'Get to the Tarn before Varkas opens the Oubliette with Seren\'s blood — and decide what to do about Taramon.',
  ['Learn the truth from Orsik\'s notebook (and from Ilvara, who admits she was Taramon\'s student)', 'Confront [[Delmar Quillon]], who sealed Taramon — and whose raid killed Seren\'s mother', 'Track the Hand\'s column through the High Forest', 'Reach [[The Silvered Tarn]] before Varkas', 'Rescue Seren from the Hand\'s camp at the lake shore'],
  'Delmar tries to stop them, with force if he must. The Hand needs Seren\'s blood to open the Oubliette; whoever holds her decides who gets in.',
  'Taramon has been reaching for Seren in her dreams for years (the lantern mark on her wrist). When the gate opens, he will say he only wants to save her. That is true — he is lying about what he will do with the Crown.',
  '**Level 12** at the end.', chapter=8)
quest('Chapter 9 - The Glass Oubliette', 'hook', '[[Seren Vael]]', '[[The Glass Oubliette]]', 'Heart Shard; Taramon (ally or enemy)', '12 → 13', ACT3,
  'Seren opens the gate with her blood. Beyond the water, a thousand reflections of the party turn to look at them.',
  'Reach the Prism Chamber, recover the [[Heart Shard]], and decide Taramon\'s fate.',
  ['Cross the [[Hall of Broken Reflections]]', 'Pass [[The Prismatic Sentinel|the Sentinel Gate]]', 'Meet [[Archmage Taramon]]', 'Choose: free him (ally, until the end), leave him sealed, or fight him ([[Taramon Unbound]])', 'Escape before the Oubliette collapses (if the cradle is broken)'],
  'Freeing Taramon means the Heart Shard leaves with him — he will "hold it for safekeeping". Leaving him means the Hand will come back for him.',
  'If freed, Taramon really will help against Varkas — then try to take the reforged Crown for himself at the Pyre Throne. He knows [[Opal]] for what she is the moment she walks in, and tells her — to win her over, or to frighten her.',
  '[[Heart Shard]], [[Taramon\'s Prism Staff]] (gift, or taken). **Level 13** at the end.', chapter=9)
quest('Chapter 10 - Ashfall', 'hook', '[[Sister Cinder]]', '[[Ashfall Caldera]]', 'A path to the Pyre Throne', '13 → 14', ACT3,
  'Ash begins to fall on Waterdeep. [[Sister Cinder]] sends word under a flag of truce: she has read the kindling list. She will open the way into the caldera — if the party saves her recruits.',
  'Get into the [[Ashfall Caldera]], free the "kindling", and break the Hand\'s army before the Night of Long Embers.',
  ['Parley with Sister Cinder', 'Recruit allies (Harpers, the Cult of the Dragon as a temporary ally, Neverwinter\'s wizards, Wavemark\'s crew)', 'Infiltrate the camp; free the kindling (and [[Tobin Thorne]], [[Nim]])', 'Defeat [[Cindraxis]] on the Ash Stair ([[Cindraxis on the Ash Stair]])', 'Secure the Pyre Throne approach'],
  'Every hour in the camp risks discovery. Freed recruits slow the party down.',
  'Cindraxis may withdraw if shown proof that Varkas means to bind Kaurvex rather than free him. It recognises [[Opal]] as kin on sight — it lowers its head to her, in front of everyone.',
  '[[Cindraxis Scale Mail]] (crafted later), [[Emberheart Amulet]] from a pyrelord. **Level 14** at the end.', chapter=10)
quest('Chapter 11 - The Night of Long Embers', 'hook', '', '[[The Pyre Throne]]', 'The fate of the Sword Coast', '14 → 15', ACT3,
  'The ash falls upward. Varkas stands at the Pyre Throne with whatever shards he holds, ready to reforge the Crown.',
  'Stop the Reforging — or win it, and decide what to do with the Crown.',
  ['Reach the Pyre Throne', 'Defeat [[Varkas Emberveil]] ([[The Pyre Throne Battle]])', 'Face the [[Avatar of Kaurvex]] if it wakes ([[The Unremembered Brother]])', 'Unmake the Crown — or take it', 'Epilogue: what becomes of Seren, Cinder, Taramon and the desperate?'],
  'Taramon (if free) makes his move when the Crown is whole. Sister Cinder may sacrifice herself to buy time.',
  'Endings: **Unmade** (Opal, the chosen bearer, speaks the name and quenches the Heart Shard), **Worn** (Opal wears the Crown as Kaurvex\'s chosen — and must decide whether to wake him or command him to sleep forever), **Taramon\'s** (he takes it; a sequel villain), **Kaurvex wakes** (the Sword Coast burns — a darker campaign).',
  'Each character reaches **Level 15** before or during the finale. Epilogue rewards as the story demands.', chapter=11)

SIDE = [
 ('Tallow\'s Debt', 'hook', '[[Tallow]]', '[[Revel\'s End]]', 'A Frostkey; the truth about the courier', '5', ACT1, 'Tallow owes 400 gp to a Luskan moneylender and is terrified.', 'Pay or erase Tallow\'s debt — and learn what he did for the Hand.', ['Hear Tallow out', 'Pay the debt or confront the moneylender in Luskan', 'Get Tallow to confess about the poisoned courier (Hank\'s hook)'], '', 'Tallow poisoned the courier Hank guided in, on the Hand\'s orders.'),
 ('The Gull\'s Debt', 'hook', '[[Thorne Wavemark]]', '[[Luskan]]', 'Wavemark\'s Weatherglass; free passage for life', '6', ACT1, 'The Hand threatens to burn Wavemark\'s last ship unless she smuggles firepots south.', 'Save the *Gull\'s Debt* without making Wavemark a smuggler for the Hand.', ['Guard the ship overnight', 'Catch the arsonists (Soot Imps and initiates)', 'Find the Hand\'s supply-run schedule'], '', 'The schedule shows shipments to Daggerford months ago — the Hand has an agent at Stillwater Abbey.'),
 ('Tobin\'s Ashes', 'hook', '[[Sheila]]', '[[The Cinderhouse]]', 'Tobin\'s freedom', '6 → 14', ACT1, 'Tobin, the Hollow Road Crew\'s youngest, is in the Hand, and he doesn\'t want to leave.', 'Get Tobin out of the Ashen Hand — for good.', ['Find Tobin at the Cinderhouse', 'Show him the kindling list', 'Get him out of the Ashfall Caldera camp in Chapter 10'], 'Tobin keeps going back unless he has somewhere to belong.', 'Tobin joined to send money to the crew. Cinder never sent a copper of it.'),
 ('The Unburnt Covenant', 'active', '[[Muscovy]]', '[[Mount Hotenow]]', 'The means to unmake the Crown', '7 → 15', ACT2, 'Muscovy\'s order is dying out; its last members are being hunted.', 'Learn how the Crown can be unmade and find the bearer "of the Brother\'s blood".', ['Meet [[Brother Osk Hammerfell]]', 'Read the Cinder Vault tablets (the prophecy of the bearer)', 'Recover the *Book of the Unburnt* from [[The Lantern Library]] (it names the bloodline)', 'Realise the bearer is [[Opal]]', 'Help her carry a shard for a full day without using it'], '', 'The bearer is Opal. Muscovy\'s role is to recognise her — and to help her pass the test.'),
 ('Hank\'s Last Crossing', 'hook', '[[Hank]]', '[[Revel\'s End]]', 'The truth for Hank', '5 → 8', ACT1, 'The courier Hank guided across the ice died inside Revel\'s End the same night. He was carrying a letter for Prisoner 13.', 'Find out what really happened that night.', ['Ask [[Warden Cassia Rime]] for the record', 'Get the truth from [[Tallow]]', 'Find the courier\'s letter (Cinder has it, in the Cinderhouse)'], '', 'The letter was from Taramon to Seren, smuggled out of his prison through the Hand: "Forgive me. Wait for me."'),
 ('Ash on the Doorstep', 'hook', '[[Eric]]', '[[Waterdeep]]', 'The Stonequill family safe; Hask\'s ledger', '8 → 10', ACT2, 'Orsik\'s warning was right: the Ashen Hand is watching the Stonequill house in Waterdeep, and [[Hask the Ash-Finder]] is reading the family\'s names aloud.', 'Get the Stonequill family out of Waterdeep without leading the Hand to Seren or Orsik.', ['Slip into Waterdeep past the gate informers', 'Reach the house before Hask burns it ([[Ash-Finders in the Trades Ward]])', 'Search Orsik\'s burned rooms at the [[Blackstaff Academy]] for his first notes', 'Move the family somewhere safe (Wavemark\'s ship, the abbey, a temple)'], 'Going to Waterdeep at all is the danger Orsik warned about: every day there, roll a d6 — on a 1, Hask learns where the party is staying.', 'The academy notes show who reported Orsik: his student [[Lisel Marrow]] — now at Stillwater Abbey.'),
 ('The Hollow Road', 'hook', '[[Garrett]]', '[[The Sword Coast]]', 'Garrett\'s crew back; allies on the High Road', '6 → 10', ACT1, 'Once he is free, Garrett wants to go home — but his crew has been working for the Ashen Hand since he was taken.', 'Reunite Garrett with the Hollow Road Crew and pull them away from the Hand.', ['Find the crew\'s camp on the High Road', 'Learn that Bryn Hallow has been taking Hand money', 'Help Garrett win his crew back — or let Bryn keep it', 'Use the crew against the Hand\'s supply wagons (Act III)'], 'Bryn isn\'t a villain: the Hand paid when nobody else would. A fight here costs the crew.', 'If the party helps, the crew rides to the Ashfall Caldera in Chapter 10.'),
 ('Nim\'s Choice', 'hook', '[[Nim]]', '[[Luskan]]', 'A child saved', '6', ACT1, 'A street kid keeps following the party, asking for soup.', 'Give Nim somewhere better to go than the Cinderhouse.', ['Feed her', 'Find her a place (Wavemark\'s crew, the Salted Lantern, a temple)', 'Check on her later'], '', 'If nobody helps her she joins the Hand and is in the kindling pens at the caldera.'),
]
for name, status, giver, loc, reward, level, arc, hook, obj, steps, comp, sec in SIDE:
    quest(name, status, giver, loc, reward, level, arc, hook, obj, steps, comp, sec)

# ============================================================================
# Encounters (XP and difficulty from the 2024 budgets, party of 4)
# ============================================================================
PARTY_SIZE = 5
def crx(n): return CR_XP[MONSTERS[n]['m']['cr']] if n in MONSTERS else {'Bandit': 25, 'Guard': 25, 'Cultist': 25, 'Ashen Hand Zealot': 450}.get(n, 0)
def encounter(name, level, loc, mons, setup, terrain, tactics, treasure, session='', prep='', env='any', status='planned', notes=''):
    xp = sum(crx(n) * c for n, c in mons)
    lo, mo, hi = (b * PARTY_SIZE for b in BUDGET[level])
    diff = 'Low' if xp <= lo else 'Moderate' if xp <= mo else 'High' if xp <= hi else 'Deadly'
    mlist = '\n'.join(f'  - "{n}' + (f' x{c}' if c > 1 else '') + '"' for n, c in mons)
    creatures = '\n'.join(f'- [[{n}]]' + (f' ×{c}' if c > 1 else '') for n, c in mons)
    w(f'Campaign/Encounters/{name}.md', f'''---
type: encounter
status: {status}
difficulty: {diff}
xp: {xp}
party_level: {level}
location: "{loc}"
session: "{session}"
prep: "{prep}"
environment: {q([env])}
tags: [encounter]
---
# {name}

> [!read-aloud] Setup
> {setup}

```encounter
title: {q(name)}
monsters:
{mlist}
```

## Creatures
{creatures}

*Budget for {PARTY_SIZE} characters of level {level}: Low {lo} · Moderate {mo} · High {hi} XP. This encounter: {xp} XP ({diff}).*{(' ' + notes) if notes else ''}

## Terrain & features
{terrain}

## Tactics
{tactics}

## Treasure
{treasure}

## What happened
- [ ] Used in a session
''')

S1, P1 = '[[Session 001 - The Thirteenth Cell]]', '[[Prep - Session 001]]'
encounter('Rime Wolves on the Ice Road', 5, '[[Revel\'s End]]', [('Rime Wolf', 5)],
  'The ice road is a line of iron stakes across white nothing. Something white moves between the stakes — then another, and another, keeping pace.',
  '- Snow: Difficult Terrain off the road.\n- Thin ice (marked by blue patches): DC 13 Dexterity save or fall into freezing water (1d6 Cold per round).',
  '- Two wolves bite and knock down; two drag a Prone target away.\n- Fire (a torch waved, a Fire spell) makes a wolf flee on a DC 12 Wisdom save failure.',
  'A frozen Ashen Hand scout under the snow: map of Revel\'s End with the dock gate circled, 25 gp.', session=S1, prep=P1, env='arctic')
encounter('Riot in Cellblock Thirteen', 5, '[[Revel\'s End]]', [('Revel\'s End Warden-Guard', 2), ('Ashen Hand Initiate', 4)],
  'The bell rings once. Cell doors bang open. Prisoners pour into the corridor — and some of them are wearing grey hoods under their prison rags.',
  '- Narrow corridor (10 ft wide), 13 iron doors.\n- The guards don\'t know whose side the party is on: a DC 14 Persuasion check (Advantage if Hank speaks) makes them allies for the fight.',
  '- Initiates go for Seren\'s door; guards hold the corridor.\n- [[Garrett]] (Prisoner 12) decides now: he opens Seren\'s door for the Hand, or holds it shut against them. Sheila\'s presence — and anything she said to him earlier — decides which.',
  'A guard\'s [[Warden\'s Frostkey]].', session=S1, prep=P1, env='urban')
encounter('The Hand Comes for Prisoner 13', 5, '[[The Thirteenth Cell]]', [('Ashen Hand Cinderblade', 1), ('Ash-Bound Hound', 3), ('Ashen Hand Initiate', 3)],
  'Smoke curls under the door. A grey-hooded soldier with a burning blade steps through the smoke, three ash-grey hounds at heel. "Prisoner Thirteen. Your father sends his regards — and so does the Voice."',
  '- The cell is small: only three creatures fit inside; the rest fight in the corridor.\n- Seren\'s candle: if it goes out, the map can\'t be read until relit.',
  '- The cinderblade wants Seren alive; hounds breathe ash into the corridor first.\n- If the cinderblade falls, initiates flee.',
  '2 [[Potion of Ashbreath|potions of Ashbreath]], a letter signed with a hand-shaped brand: "Bring her to the Voice. Burn the rest."', session=S1, prep=P1, env='urban')
encounter('Rime Troll at the Broken Dock', 5, '[[Revel\'s End]]', [('Rime Troll', 1)],
  'The dinghy is where Wavemark promised. So is the thing climbing out of the black water beside it: grey-white, dripping, regrowing the arm someone already cut off.',
  '- The dock is slick ice (DC 12 Dexterity save when hit or fall Prone).\n- Firepots from the dead initiates: 3 left (Fire damage stops Regeneration).',
  '- The troll grabs the nearest light source.\n- It retreats under the ice if reduced below 30 HP and not burning.',
  'Nothing — but the *Gull\'s Debt* is waiting.', session=S1, prep=P1, env='arctic')
encounter('Soot Imps in the Salted Lantern', 6, '[[The Salted Lantern]]', [('Soot Imp', 6), ('Ashen Hand Cinderblade', 1)],
  'Every candle in the tavern gutters at once. Little laughing shapes of soot pour out of the hearth.',
  '- Tavern: tables (Half Cover), the salt lantern (smash it: each imp in 10 ft takes 2d6 — salt burns them).\n- Marta Kell shepherds the patrons out the back.',
  '- Imps snuff lights and blind; the cinderblade waits outside to grab Seren.',
  'A list of every inn in Luskan, with the Salted Lantern circled.', env='urban')
encounter('The Cinderhouse Raid', 6, '[[The Cinderhouse]]', [('Sister Cinder', 1), ('Ashen Hand Zealot', 2), ('Ashen Hand Initiate', 4)],
  'The cellar shrine is warm and smells of incense. Sister Cinder turns from the altar and smiles. "You came for Tobin. Sit. Let\'s talk before anyone gets hurt."',
  '- Low cellar (8 ft); the altar fire: knocking it over fills 10 ft with burning oil.\n- Children asleep upstairs: area spells risk them.',
  '- Cinder talks first; Crown\'s Command on the strongest hero; escapes when Bloodied.\n- Zealots shield her; initiates surrender if she flees.',
  'Cinder\'s strongbox: 300 gp, the kindling list, the courier\'s letter (Hank\'s quest). [[Ash-Veil Mantle]] if Cinder is defeated.', env='urban')
encounter('Ash-Finders in the Trades Ward', 8, '[[Waterdeep]]', [('Sword Coast Agent', 1), ('Ashen Hand Cinderblade', 2), ('Ashen Hand Initiate', 4)],
  'The Stonequill house is dark. Too dark — the lamps that should be lit in the window are out, and the door is ajar. Inside, someone is reading names aloud from a ledger.',
  '- A narrow townhouse: three floors, one stair, a back door to an alley.\n- Family members hidden in the cellar (the Hand hasn\'t found them yet).\n- Lamp oil everywhere: the initiates mean to burn the house.',
  '- [[Hask the Ash-Finder]] (use the Sword Coast Agent statblock) stays on the stair and bargains; cinderblades hold the door; initiates light the fire on round 2.\n- Hask flees by the roof when Bloodied — he will be back.',
  'Hask\'s ledger: every Stonequill on the Sword Coast, and a note — "the twin travels with a woman from the north".', env='urban')
encounter('Ash Drakes of Hotenow', 7, '[[Mount Hotenow]]', [('Ash Drake', 3)],
  'A shadow crosses the sun — then a second, and a third. Three ash drakes drop from the cliffs, wings scattering cinders.',
  '- Narrow ledge: a creature pushed off falls 30 feet onto hot rock (3d6 Bludgeoning + 2d6 Fire).\n- Drake nest: 3 eggs (worth 300 gp each to the right buyer).',
  '- Breathe on the group first, then try to knock heroes off the ledge.',
  '3 drake eggs (if taken, the drakes pursue for the rest of the chapter).', env='mountain')
encounter('The Forgemaster\'s Anvil', 7, '[[The Cinder Vault]]', [('Forgemaster Ruuk Ashgrinder', 1), ('Slag Golem', 1)],
  'A dwarf in ash-grey plate stands at an anvil the size of a cart, hammering a door of runes. His golem turns, glowing. "Covenant blood! Good. The door wants a key."',
  '- Lava channels (33 / 6d10 Fire if entered).\n- The anvil: Half Cover; Ruuk\'s forge bellows can be cut (the golem\'s Slag Spray then needs Recharge 6).',
  '- Ruuk stays by the anvil and uses Command Golem; the golem blocks the door.\n- Cold damage on the golem is a big deal: let the party discover it.',
  '[[Hotenow Forgehammer]], 1,200 gp of Covenant gold, the Sealed Door opens to the [[Shard of Cinders]].', env='mountain', notes='Drop the golem or add Ruuk\'s 4 initiate miners for a weaker or stronger party.')
encounter('Hand Reprisal in Neverwinter', 8, '[[Neverwinter]]', [('Ashen Hand Pyre-Priest', 1), ('Ashen Hand Cinderblade', 3), ('Ash-Bound Hound', 1)],
  'Someone used the shard. Three nights later, smoke pours from the party\'s inn — every exit but one is on fire.',
  '- Burning inn: each round, one 10-ft square becomes fire (2d6 Fire on entering).\n- Civilians to save on the upper floor.',
  '- The priest Fireballs from the street; cinderblades cover the one exit.',
  '2 [[Potion of Ashbreath|potions of Ashbreath]], a pyre-priest\'s orders naming [[Lisel Marrow]] as "the Hand in the abbey".', env='urban')
encounter('Things in the Peat', 8, '[[Mere of Dead Men]]', [('Drowned Ashwalker', 5)],
  'The peat on either side of the causeway begins to glow from beneath, and four smouldering shapes sit up in the water.',
  '- Causeway 10 ft wide; water either side 5 ft deep (Difficult Terrain).\n- Fog: Lightly Obscured beyond 30 ft.',
  '- They surround and Choking Ash in pairs; they drag Prone creatures into the water.',
  'A drowned Ashen Hand messenger: 60 gp, a note to Mother Soot: "The Voice will pay. Hold the shard."', env='swamp')
encounter('Mother Soot\'s Court', 8, '[[The Drowned Pyre]]', [('Mother Soot', 1), ('Mire Lurker', 1), ('Drowned Ashwalker', 2)],
  'Soot-black water, a ring of candles floating on it, and a woman with too many teeth sitting on the altar. "Visitors! And so many lovely names."',
  '- Waist-deep water (Difficult Terrain); smouldering peat squares (1d6 Fire).\n- The bone cage holding the [[Shard of Smoke]] (AC 15, 20 HP).',
  '- Mother Soot opens with the peat cloud; the lurker drags off whoever reaches the cage.\n- She Plane Shifts away below 40 HP — and remembers.',
  '[[Shard of Smoke]], 900 gp in drowned offerings, [[Bogpearl of Mother Soot]] (only by bargain).', env='swamp', notes='Mother Soot would rather bargain than fight; make that clear.')
encounter('Burning Pages', 9, '[[The Lantern Library]]', [('Burnt Page Swarm', 4), ('Ashen Hand Pyre-Priest', 2), ('Ashen Hand Initiate', 4)],
  'Someone has lit the lower gallery. Pages swirl up the Lantern Well, burning — and then they turn, all together, and dive at you.',
  '- Three galleries around a 40-ft well; ladders and a spiral stair.\n- Fire spreads one gallery per round.\n- Water barrels on each gallery (douse a swarm: it takes 10 damage).',
  '- Swarms block the stairs; the priest Fireballs the books to force a choice: fight or save the library.',
  'Whatever books are saved; the *Book of the Unburnt* if the Covenant Stacks are reached.', env='urban')
encounter('The Archivist Unmasked', 9, '[[The Lantern Library]]', [('Lisel Marrow', 1), ('Cinder Wraith', 3)],
  'The scribe who brought you tea is standing on the top gallery, holding the eternal lantern. Her face flickers — the disguise falling away. "You should have let it burn."',
  '- Top gallery; the lantern chain (cut it and the lantern falls 40 ft).\n- The wraiths are the abbey\'s burned monks, risen.',
  '- Lisel Walls of Fire the stairs, Fireballs anyone saving books, Counterspells healing.\n- She flees with Invisibility if Bloodied — unless the party threatens her childhood primer.',
  '[[Shard of Embers]], [[Lantern of the Unburnt Page]].', env='urban')
encounter('Turncoats in the Vault', 10, '[[Graymantle Manor]]', [('Captain Vex Halloran', 1), ('Flaming Fist Turncoat', 6), ('Ashen Hand Cinderblade', 2)],
  'The vault\'s third door is open. Inside, Flaming Fist uniforms — and grey hoods. Captain Halloran looks up from the glass case. "Ah. Witnesses."',
  '- Vault: three rooms, narrow doors; glass cases (Half Cover; break for 1d6 Slashing to anyone pushed into them).\n- Guards of the house arrive in 5 rounds — and arrest everyone.',
  '- Halloran keeps turncoats in front; cinderblades go for the shard.\n- Turncoats surrender if Halloran falls.',
  '[[Shard of Soot]], [[Flamebane Shield]], the Lady\'s ledgers (proof against Halloran).', env='urban')
encounter('Wings over Baldur\'s Gate', 10, '[[Baldur\'s Gate]]', [('Ashen Hand Pyrelord', 1), ('Ash Drake', 2)],
  'On the manor roof, a pyrelord waits beside two saddled ash drakes. Above, something far bigger blots out the moon: Cindraxis, with Varkas on its back.',
  '- Rooftops: 15-ft gaps between buildings (DC 12 Athletics to jump).\n- Varkas and Cindraxis don\'t fight: they take Seren (or a shard) and leave. This is the midpoint.',
  '- The pyrelord holds the roof while the drakes carry the prize away.',
  '[[Emberheart Amulet]] from the pyrelord.', env='urban')
encounter('Hall of Broken Reflections', 12, '[[The Glass Oubliette]]', [('Mirror Shade', 3)],
  'A hall of mirrors, endless in every direction. Your reflections are a heartbeat late — then three of them stop following you at all.',
  '- Mirrors everywhere (AC 13, 10 HP each). Each broken mirror removes a Mirror Step anchor.\n- Bright Light: shades are hard to hit unless seen in a mirror.',
  '- Shades step out behind the party, Steal Reflection on healers.',
  'A shard of mirror that shows the true layout of the Oubliette.', env='planar')
encounter('The Prismatic Sentinel', 13, '[[The Glass Oubliette]]', [('Prismatic Sentinel', 3)],
  'Three figures of living crystal flank a door of light. A Harper harp is etched on each chest. They step forward together.',
  '- Long hall (beam lines!).\n- A Harper pin (from Delmar) makes them stand aside.',
  '- Color Pulse at once, then beams down the longest line.',
  '—', env='planar')
encounter('Taramon Unbound', 13, '[[The Glass Oubliette]]', [('Archmage Taramon', 1), ('Mirror Shade', 1)],
  'An elf in grey robes sits in a chair of light, the Heart Shard beating in a cradle beside him. "Seren. You came. And you brought friends — good. Let\'s not waste them."',
  '- Prism Chamber: light beams criss-cross (crossing one: DC 15 Dexterity save or 3d10 Radiant).\n- Breaking the cradle frees Taramon and starts a 10-minute collapse.',
  '- Taramon talks first, fights only if they try to take the Heart Shard by force.\n- Globe of Invulnerability, Wall of Force, then Prismatic Spray.',
  '[[Heart Shard]], [[Taramon\'s Prism Staff]].', env='planar', notes='Optional — the best outcome is a deal.')
encounter('Cindraxis on the Ash Stair', 14, '[[Ashfall Caldera]]', [('Cindraxis', 1), ('Ashen Hand Pyrelord', 2)],
  'The Ash Stair winds down into the caldera. Halfway, the falling ash parts and Cindraxis lands across the path, two pyrelords sliding from its saddle.',
  '- The stair: 15 ft wide, a 60-ft drop on one side into soft ash (half falling damage).\n- Ash storm: the dragon\'s Ash Shroud plus Heavily Obscured beyond 30 ft.',
  '- Cindraxis breathes from the shroud, pounces on isolated heroes, flees below 60 HP.\n- Proof that Varkas will bind Kaurvex may make it withdraw.',
  'Cindraxis\'s shed scales (for [[Cindraxis Scale Mail]]), 4,000 gp of hoarded offerings.', env='mountain')
encounter('The Pyre Throne Battle', 15, '[[The Pyre Throne]]', [('Varkas Emberveil', 1), ('Ashen Hand Pyrelord', 2)],
  'Five sockets glow on the back of the black throne. Varkas stands before it, glaive in hand, ash falling upward around him. "You brought them all the way here. Thank you."',
  '- The ash lake (Difficult Terrain; Prone = Blinded).\n- Each shard socketed into the throne gives Varkas +1 Legendary Action use (max 5) — pry them out (DC 18 Strength or Thieves\' Tools, an action).',
  '- Varkas breathes first, then glaive; pyrelords protect the throne.\n- Sister Cinder\'s defiance costs him his Legendary Resistance for a round.',
  'Varkas\'s Cinderglaive (treat as a +2 glaive that deals an extra 2d6 Fire damage).', env='mountain')
encounter('The Unremembered Brother', 15, '[[The Pyre Throne]]', [('Avatar of Kaurvex', 1)],
  'The caldera floor splits. Ash pours upward like a waterfall in reverse, and a shape the size of a cathedral rises out of it — a dragon made of ash and memory, with five burning holes where a crown should be.',
  '- The whole caldera is the battlefield; Ash Aura makes closing in costly.\n- Removing the Crown from the throne or speaking the true name changes everything (see the statblock).',
  '- Breathe, Rend, Burn the Name on whoever holds a shard.\n- It goes for the Crown\'s holder above all.',
  'The end of the campaign.', env='mountain', notes='The fight is won by the Crown and the true name, not by hit points. Allies freed in Chapter 10 can join.')

# ============================================================================
# Arcs
# ============================================================================
def arc(name, act, status, levels, premise, chapters, villains, clock, notes=''):
    ch = '\n'.join(f'{i}. {c}' for i, c in enumerate(chapters, 1))
    w(f'Planning/Arcs/{name}.md', f'''---
type: arc
status: {status}
act: {act}
levels: "{levels}"
tags: [arc]
---
# {name}

**Levels {levels}**

## Premise
{premise}

## Chapters
{ch}

## Villains in this act
{villains}

## Clock
{clock}
{notes}
## Sessions in this arc
```dm-list
type: session
where: arc
sort: session_number
fields: [session_number, date, status]
empty: No sessions yet — set the arc from a session's Arc button.
```

## Prep notes in this arc
```dm-list
type: prep
where: arc
fields: [for_session, date]
empty: No prep notes in this arc yet.
```

## Quests in this arc
```dm-list
type: quest
where: arc
fields: [status, level]
empty: No quests linked to this arc yet.
```
''')

arc(ACT1, 1, 'active', '5–8', 'A mysterious patron sends the party to break a woman out of the coldest prison on the Sword Coast. The Ashen Hand wants her too — she carries the only map to the shards of the Ashen Crown.',
    ['[[Chapter 1 - The Thirteenth Cell]] (5 → 6) — Revel\'s End', '[[Chapter 2 - Smoke over Luskan]] (6 → 7) — the Cinderhouse', '[[Chapter 3 - The Cinder Vault]] (7 → 8) — Mount Hotenow, the first shard'],
    '- [[Sister Cinder]] — the kind face of the Hand\n- [[Forgemaster Ruuk Ashgrinder]] — digging for the first shard\n- [[Varkas Emberveil]] — only a name in letters',
    '- [ ] The Hand learns Prisoner 13 is gone\n- [ ] The Hand finds Seren in Luskan\n- [ ] Ruuk breaks into the Cinder Vault',
    '\n## Act I questions to plant\n- Why does Prisoner 13 matter — Orsik only knows that she does?\n- Where is Orsik, and who is hunting the Stonequills?\n- Why does Seren hate fire, and why does she keep a candle burning?\n- What does the shard whisper?\n')
arc(ACT2, 2, 'planned', '8–11', 'Three more shards, three races against the Hand: a hag\'s court in the Mere, a burning library, a heist in Baldur\'s Gate. Orsik resurfaces in Neverwinter with half the answers, a Hand hunter stalks the Stonequill family, a Harper wants Seren back, and at the midpoint Varkas himself arrives on dragon-back.',
    ['[[Chapter 4 - The Scholar in Hiding]] (8) — Neverwinter, Orsik', '[[Chapter 5 - The Drowned Pyre]] (8 → 9) — Mere of Dead Men', '[[Chapter 6 - The Lantern Library]] (9 → 10) — Stillwater Abbey', '[[Chapter 7 - The Soot Vault]] (10 → 11) — Baldur\'s Gate; midpoint twist'],
    '- [[Mother Soot]]\n- [[Lisel Marrow]]\n- [[Captain Vex Halloran]]\n- [[Varkas Emberveil]] and [[Cindraxis]] (midpoint)',
    '- [ ] The Hand recovers a shard the party missed\n- [ ] Lisel burns the Lantern Library\n- [ ] Halloran robs the Graymantle vault\n- [ ] Varkas takes Seren',
    '\n## Chapter order\nChapters 5–7 can be played in any order: Seren reads one site at a time, and the Hand is racing for the others. Whatever the party doesn\'t reach first, the Hand gets.\n')
arc(ACT3, 3, 'planned', '11–15', 'Orsik\'s last cipher answers the question he started with: Prisoner 13 is the daughter of Archmage Taramon, a Hand of the Ashen Hand sealed in a prison of mirrors with the Heart Shard — and her blood is the key. To stop Varkas the party may have to free a monster. Then: the march on the Ashfall Caldera and the Night of Long Embers.',
    ['[[Chapter 8 - The Key in the Blood]] (11 → 12) — the High Forest', '[[Chapter 9 - The Glass Oubliette]] (12 → 13) — Taramon', '[[Chapter 10 - Ashfall]] (13 → 14) — the caldera camp, Cindraxis', '[[Chapter 11 - The Night of Long Embers]] (14 → 15) — the Pyre Throne'],
    '- [[Archmage Taramon]]\n- [[Cindraxis]]\n- [[Varkas Emberveil]]\n- [[Avatar of Kaurvex]]',
    '- [ ] Varkas reaches the Silvered Tarn\n- [ ] The Hand\'s army gathers at the caldera\n- [ ] Ash falls on Waterdeep\n- [ ] The Night of Long Embers',
    '\n## Endings\n- **Unmade** — Opal, the chosen bearer, having carried a shard a full day without using it, speaks Kaurvex\'s true name and quenches the Heart Shard in Tarn water.\n- **Worn** — Opal wears the Crown as its chosen, and commands Kaurvex to sleep — or to wake.\n- **Taramon\'s** — the archmage takes it; seed for a sequel.\n- **Kaurvex wakes** — the darkest ending.\n')

# ============================================================================
# Sessions, prep, campaign summary, handouts, ideas
# ============================================================================
PLAYERS = '["[[Sheila]]", "[[Eric]]", "[[Opal]]", "[[Muscovy]]", "[[Hank]]"]'
w('Campaign/Sessions/Session 000 - Session Zero.md', f'''---
type: session
session_number: 0
date: 2026-11-14
campaign: "The Ashen Crown"
status: played
players: {PLAYERS}
locations: ["[[Luskan]]"]
npcs: ["[[Orsik Stonequill]]", "[[Thorne Wavemark]]"]
prev: ""
next: "[[Session 001 - The Thirteenth Cell]]"
prep: ""
arc: "[[{ACT1}]]"
tags: [session]
---
# Session 000 - Session Zero

> [!info] Navigation
> Next: [[Session 001 - The Thirteenth Cell]] · [[Home]]

```session-link
```

## Agenda
- Pitch: *The Ashen Crown* — levels 5 to 15 on the Sword Coast, a cult of the desperate, a woman with a map on her skin.
- Safety tools: lines and veils (fire and burning are central; no harm to children on screen).
- Build characters at **level 5**; tie each to the campaign (see each character\'s hooks).
- Agree on milestone levelling (one level per chapter).

## Session log
- Characters made: [[Sheila]], [[Eric]], [[Opal]], [[Muscovy]], [[Hank]].
- [[Eric]] shared a letter from his twin brother [[Orsik Stonequill]] (see [[Orsik\'s Letter]]): find Prisoner 13; don\'t come to Waterdeep. Each character agreed to help for their own reasons.
- They met on the north quay of [[Luskan]] and boarded [[Thorne Wavemark]]\'s *Gull\'s Debt*.

## Level-ups
```level-history
session: this
```

## Threads & follow-ups
- [ ] Where is Orsik hiding? → [[Orsik Stonequill]]
    - The letter was posted from the High Road, heading north.
- [ ] Why does Prisoner 13 matter? Orsik doesn\'t know → [[Seren Vael]]
- [ ] Is the family safe in Waterdeep? → [[Waterdeep]]
- [ ] Sheila saw grey hoods watching the ship leave → [[The Ashen Hand]]
- [x] Get everyone on the *Gull\'s Debt*
''')
w('Campaign/Sessions/Session 001 - The Thirteenth Cell.md', f'''---
type: session
session_number: 1
date: 2026-11-21
campaign: "The Ashen Crown"
status: planned
players: {PLAYERS}
locations: ["[[Revel\'s End]]", "[[The Thirteenth Cell]]"]
npcs: ["[[Warden Cassia Rime]]", "[[Tallow]]", "[[Seren Vael]]"]
prev: "[[Session 000 - Session Zero]]"
next: ""
prep: "[[Prep - Session 001]]"
arc: "[[{ACT1}]]"
tags: [session]
---
# Session 001 - The Thirteenth Cell

> [!info] Navigation
> Previous: [[Session 000 - Session Zero]] · [[Home]]

```session-link
```

## Recap
> [!read-aloud] Last time…
> A frightened letter from a brother on the run, and passage north on a smuggler\'s ship. Somewhere at the top of the world, in a prison where nobody has a name, Prisoner Thirteen is waiting — and nobody, not even Orsik, knows why she matters.

## Open threads from earlier sessions
```threads
scope: earlier
compact: true
```

## Strong start
The *Gull\'s Debt* grinds against the ice a mile short of Revel\'s End. Wavemark points at the white plain: "Three nights. Then I sail, with or without you." Behind the ship, smoke on the horizon — another ship, burning.

## Encounters
*Add saved encounters or build new ones. New encounters are saved to the Encounters tab and linked to this session.*
```session-encounters
```

## Session log


## Level-ups
```level-history
session: this
```

## Threads & follow-ups
- [ ]
''')
w('Planning/Session Prep/Prep - Session 001.md', f'''---
type: prep
for_session: "[[Session 001 - The Thirteenth Cell]]"
arc: "[[{ACT1}]]"
date: 2026-11-18
tags: [prep]
---
# Prep - Session 001

```session-link
```

## 1. Characters
```dm-list
type: player
status: active
```

## 2. Strong start
The burning ship on the horizon is the prison\'s supply ship, the *Firmament* — the Ashen Hand burned it so the prison is cut off. The party has three nights.

## 3. Potential scenes
- The ice road and the [[Rime Wolf|rime wolves]]
- Talking (or sneaking) past [[Warden Cassia Rime]] (Hank recognised!)
- [[Tallow]] sidling up with an offer
- [[Garrett]] in the cell next door — Sheila\'s old crew leader, and the Hand\'s inside man
- The thirteenth door, and a woman humming to a candle
- The Hand attacks the same night
- The broken dock and the troll

## 4. Secrets & clues
- [ ] The *Firmament* was burned by the Ashen Hand.
- [ ] Prisoner 13\'s transfer papers were signed under a false name — by a Harper.
- [ ] Tallow sold the date of the party\'s arrival to the Hand.
- [ ] Seren keeps the candle to read the ash-ink map on her arms.
- [ ] Garrett (Prisoner 12) was put next to Seren by the Hand; Tallow carries their messages.
- [ ] Garrett has been Seren\'s only friend for a year — she will not leave without him.
- [ ] The Hand calls Seren "the Voice\'s key".
- [ ] The cinderblade says "your father sends his regards".
- [ ] The first map site is the Cinder Vault under Mount Hotenow.

## 5. Fantastic locations
- [[Revel\'s End]] in a blizzard
- [[The Thirteenth Cell]], below the waterline
- The broken dock under the ice

## 6. Important NPCs
- [[Warden Cassia Rime]] · [[Tallow]] · [[Garrett]] · [[Seren Vael]] · [[Thorne Wavemark]]

## 7. Monsters & encounters
```session-encounters
```

## 8. Rewards
- [[Warden\'s Frostkey]], [[Rimewalker Boots]]
- 200 gp in the cinderblade\'s purse
- **Level 6** at the end of Chapter 1
''')

w('Campaign/Campaign Summary.md', f'''---
type: campaign
setting: "The Sword Coast"
tone: "Heroic dark fantasy — the desperate, the forgotten, and fire"
system: "D&D 2024"
levels: "5–15"
dndbeyond: ""
tags: [campaign]
---
# Campaign Summary

```dndbeyond
```

## Premise
A splinter of the Cult of the Dragon calling itself [[The Ashen Hand]] is hunting the scattered shards of the **Ashen Crown**, a relic said to command fire and ash. They worship **Kaurvex, the Unremembered Brother** — a dragon they believe was the forgotten brother of Tiamat — and they mean to reforge the Crown and wake him. Their methods: recruiting the desperate, and burning anything that guards a shard.

The heroes begin at **level 5**. [[Orsik Stonequill]] — Eric\'s twin brother, a wizard lecturer and researcher at Waterdeep\'s [[Blackstaff Academy]] — uncovered the Hand\'s plans in a sealed archive. The Hand found out, and now he is on the run and they are hunting his whole family. His last letter begs his brother to free **Prisoner 13** from [[Revel\'s End]] before the Hand does — and never to come to [[Waterdeep]]. Orsik knows Prisoner 13 is involved, but not how. By **level 15** they will stand at the [[The Pyre Throne|Pyre Throne]] on the Night of Long Embers.

Full order of events: [[Storyline and Order of Events]].

## Where things stand
Session Zero is done: the party is aboard [[Thorne Wavemark]]\'s *Gull\'s Debt*, sailing for Revel\'s End. Next: [[Session 001 - The Thirteenth Cell]].

## Themes
- Who gets remembered — and who gets burned to make it happen
- Kindness used as a weapon; kindness as the answer
- Fathers and daughters, debts and lies
- Power that can\'t be used without being heard

## The big threat
- [[Varkas Emberveil]], the Voice of Kaurvex, and his dragon [[Cindraxis]]
- The Hands: [[Sister Cinder]], [[Forgemaster Ruuk Ashgrinder]], [[Lisel Marrow]], [[Captain Vex Halloran]], [[Archmage Taramon]] (imprisoned)
- [[Mother Soot]], who holds a shard and wants a name

## Acts and levels
| Act | Chapters | Levels |
| --- | --- | --- |
| [[{ACT1}]] | 1–3: Revel\'s End, Luskan, Mount Hotenow | 5–8 |
| [[{ACT2}]] | 4–7: Neverwinter, the Mere, Stillwater Abbey, Baldur\'s Gate | 8–11 |
| [[{ACT3}]] | 8–11: the Silvered Tarn, the Glass Oubliette, Ashfall, the Pyre Throne | 11–15 |

Milestone levelling: one level per chapter (two in Chapter 1 if the party needs it). Use **Level up** on each character after a chapter.

## Shard tracker
| Shard | Where | Held by |
| --- | --- | --- |
| [[Shard of Cinders]] | [[The Cinder Vault]] | — |
| [[Shard of Smoke]] | [[The Drowned Pyre]] | [[Mother Soot]] |
| [[Shard of Embers]] | [[The Lantern Library]] | the abbey (unknowingly) |
| [[Shard of Soot]] | [[Graymantle Manor]] | [[Lady Orsolya Graymantle]] |
| [[Heart Shard]] | [[The Glass Oubliette]] | [[Archmage Taramon]] |

## The truth (DM only)
> [!secret] What\'s really going on
> - **Archmage Taramon** is one of the Hands of the Ashen Hand, sealed by the Harpers in [[The Glass Oubliette]] with the Heart Shard. Varkas needs him — for the Reforging rite — and needs his daughter to reach him.
> - **Prisoner 13 is [[Seren Vael]], his daughter.** She drew the Hand\'s map of all five shard sites, burned the archive and tattooed the only copy into her skin in ash-ink that shows only by firelight. Her blood is the key to her father\'s prison.
> - **Opal Reed is the Crown\'s chosen bearer**, of Kaurvex\'s blood, and doesn\'t know it. The shards answer her; she alone can use them without the Hand hearing — but every use feeds Kaurvex. See [[Opal and the shards]].
> - **Garrett**, Sheila\'s old crew leader, is Prisoner 12 — put next to Seren by the Hand to open her door when they come.
> - **Why the party?** Nobody chose them: Orsik wrote to his twin, [[Eric]], because there was no one else. The others came for their own reasons — [[Hank]] knows the ice road and Revel\'s End; [[Sheila]]\'s old crew leader is in a cell there; [[Muscovy]]\'s Covenant is being hunted by the same cult; [[Opal]]\'s teacher Ilvara is hiding Orsik.
> - **What Orsik knows:** that the Hand is gathering five shards for a Reforging, and that every trail ends at Prisoner 13. **What he doesn\'t:** that she is Taramon\'s daughter, that she carries the map, and that her blood opens the Oubliette. His notebook\'s last cipher, broken in [[Chapter 8 - The Key in the Blood]], tells him.
> - **Why Waterdeep is dangerous:** [[Hask the Ash-Finder]] and a Hand cell are watching the Stonequill family home, with informers at the gates. [[Lisel Marrow]], Orsik\'s student, betrayed him. Later, the ash from the caldera falls on Waterdeep first.
> - **Varkas means to burn his own recruits** as the kindling of the Reforging — and Taramon with them.
> - **Kaurvex** may or may not have been Tiamat\'s brother. Something vast does sleep under the [[Ashfall Caldera]]. The Crown can wake it, bind it, or be unmade with its true name (in [[The Lantern Library]]).
''')

w('Planning/Handouts/Orsik\'s Letter.md', '''---
type: idea
status: ready
category: handout
created: 2026-11-14
tags: [idea, handout]
---
# Orsik's Letter

> [!read-aloud] A creased letter, the seal broken and pressed again; the handwriting slants as if written on a moving cart
> *Eric —*
>
> *I don't have long and I can't tell you where I am. Something I found in the academy archive — the Ashen Crown, the shards, the cult that calls itself the Ashen Hand — it's real, and they know I know. They burned my rooms the night I left. I am sorry. I am so sorry.*
>
> *Every thread I pull ends at the same place: a prisoner at Revel's End, kept by number. Thirteen. I don't know who she is or why they want her. I only know they want her badly, and that if they get her first, something terrible happens. Find her before they do.*
>
> *Captain Wavemark of the* Gull's Debt *owes me a favour; she sails from Luskan's north quay. Tell her my name.*
>
> *And whatever happens — don't come to Waterdeep. They're watching the house. They're watching all of us.*
>
> *— O.*

Given to [[Eric]] in [[Session 000 - Session Zero]]. Written by [[Orsik Stonequill]].
''')
w('Planning/Handouts/Seren\'s Ash Map.md', '''---
type: idea
status: ready
category: handout
created: 2026-11-14
tags: [idea, handout]
---
# Seren's Ash Map

Only visible in firelight: grey whorls on both of Seren's forearms become coastlines, rivers and five tiny crowns. The script is Seren's own cipher. She reads **one site at a time**, when she chooses:

1. A mountain with a spiral inside — *"the Cinder Vault, under Hotenow"* ([[Chapter 3 - The Cinder Vault]])
2. A bell above water — *"the drowned pyre"* ([[Chapter 5 - The Drowned Pyre]])
3. A lantern over a pond — *"where the light never goes out"* ([[Chapter 6 - The Lantern Library]])
4. A heron — *"the Graymantle Ember"* ([[Chapter 7 - The Soot Vault]])
5. A circle of mirror — she refuses to read this one. ([[Chapter 9 - The Glass Oubliette]])

A sixth mark, on the inside of her left wrist, is a lantern. She doesn't know who put it there. (Taramon did, when she was a child.)
''')
IDEAS = [
 ('Orsik\'s notebook', 'twist', 'developing', 'Orsik\'s cipher notebook holds the whole truth, but he can only break it a piece at a time (one cipher per act). Act I: "the key is held at Revel\'s End". Act II: "the archmage in the glass" and "a daughter". Act III ([[Chapter 8 - The Key in the Blood]]): Seren is Taramon\'s daughter and her blood opens the Oubliette. If the Hand gets the notebook, they skip straight to Chapter 8.'),
 ('The Hand hunts the Stonequills', 'npc', 'developing', '[[Hask the Ash-Finder]] works through the family: a cousin in Neverwinter questioned, the Waterdeep house watched, a letter forged in Orsik\'s hand to lure Eric. Use it whenever the party gets comfortable. Payoff: [[Ash on the Doorstep]].'),
 ('Sister Cinder can be redeemed', 'npc', 'developing', 'If the party shows [[Sister Cinder]] the kindling list (Chapter 2) and saves her recruits (Chapter 10), she turns on Varkas at the Pyre Throne. Her defiance costs him a Legendary Resistance round.'),
 ('If Seren dies', 'contingency', 'raw', 'Her blood still works for a day. Taramon goes mad with grief and becomes the Act III villain alongside Varkas. The map on her skin can be copied by firelight with [[Seren\'s Ash-Ink Quill]].'),
 ('Kaurvex — brother or lie?', 'lore', 'raw', 'The Cult of the Dragon says Tiamat destroyed a rival, not a brother. Keep it ambiguous: the Avatar refers to Tiamat as "sister" — but it may simply be lying, or remembering wrong.'),
]
for name, cat, st, text in IDEAS:
    w(f'Planning/Ideas/{name}.md', f'''---
type: idea
status: {st}
category: {cat}
created: 2026-11-14
tags: [idea]
---
# {name}

{text}

Feeds: [[{ACT3 if 'notebook' in name or 'bearer' in name or 'Cinder' in name else ACT2}]]
''')
w('Planning/Ideas/Opal and the shards.md', f'''---
type: idea
status: developing
category: player secret
created: 2026-11-15
tags: [idea]
---
# Opal and the shards

> [!secret] Don't tell the player
> [[Opal]]'s draconic ancestor wasn't a red dragon. She is of **Kaurvex's blood** — the last true line of the Unremembered Brother — and the Ashen Crown's **chosen bearer**. Nobody has told her. She can still pick Fire as her damage type and play as normal; the shards do the rest.

## What the shards do for her
- **Shard sense.** She always knows the direction of the nearest shard within 1 mile: a warmth under her grey scales. (She thinks it's nerves.)
- **Kindred fire.** While she is within 30 feet of a shard, when she casts a spell that deals Fire damage she can reroll any 1s on the damage dice.
- **No echo.** When *she* uses a shard, the Ashen Hand does **not** hear where she is — the Crown hides its chosen. Instead, she hears Kaurvex. Each use adds 1 ember to her Ember clock.
- **Cool to her touch.** Shards are always warm — except in her hand. Muscovy will notice.

## The Ember clock (6 embers)
- **2 embers:** her scales turn ash-grey and spread to her hands; her Resistance to Fire becomes permanent.
- **4 embers:** once per Long Rest she can cast *Burning Hands* from any shard she carries without using up its charge. She dreams of the Pyre Throne every night.
- **6 embers:** Kaurvex can speak through her once (the DM decides when). From then on, if she wears the Crown, she can only *wake* him, not command him to sleep.

## The test
To unmake the Crown, its chosen bearer must carry a shard for a full day without using it (see [[The Ashen Crown (Artifact)]]). For everyone else the shards come with a curse. For Opal they are safe and they make her stronger — which makes the test hardest for her of all. Put it at the worst possible moment: a friend burning, and *Burning Hands* could save them.

## Draconic Sorcery tie-ins
- **Elemental Affinity (level 6):** the shards make Fire feel *right*; Ilvara warns her that it shouldn't feel that good.
- **Dragon Wings (level 14):** they come out ash-grey. [[Cindraxis]] lowers its head to her in front of everyone ([[Chapter 10 - Ashfall]]).

## Who knows, and when it comes out
| Who | What they know | When |
| --- | --- | --- |
| [[Ilvara Dusk]] | Suspects; she trained Opal after the fire | Admits it in [[Chapter 4 - The Scholar in Hiding]] if pressed |
| [[Muscovy]] | The prophecy of "one of the Brother's blood" | Realises in [[Chapter 3 - The Cinder Vault]] — the shard goes cool in her hand |
| *The Book of the Unburnt* | Names the bloodline, ending with Opal's grandmother | [[Chapter 6 - The Lantern Library]] |
| [[Archmage Taramon]] | Senses it the moment she walks in | [[Chapter 9 - The Glass Oubliette]] |
| [[Cindraxis]] | Smells it | [[Chapter 10 - Ashfall]] |
| [[Varkas Emberveil]] | Doesn't know — until Cindraxis bows | Then he wants her more than any shard |

## Endings
- **Unmade:** she passes the test, speaks the true name and quenches the Heart Shard.
- **Worn:** she wears the Crown as its chosen and commands Kaurvex to sleep — or to wake.

Feeds: [[{ACT3}]]
''')
w('Planning/Storyline and Order of Events.md', '''---
tags: [campaign]
---
# Storyline and Order of Events

*The Ashen Crown* — levels 5 to 15, the Sword Coast. Party: [[Sheila]], [[Eric]], [[Opal]], [[Muscovy]], [[Hank]]. See also [[Campaign Summary]].

## Before the campaign
1. **Centuries ago** — the Unburnt Covenant forges the **Ashen Crown** to bind the dragon **Kaurvex**, then breaks it into five shards when the binding starts to bind them too.
2. **Twelve years ago** — the Harpers seal [[Archmage Taramon]], a Hand of [[The Ashen Hand]], in [[The Glass Oubliette]] with the [[Heart Shard]]. The raid, led by [[Delmar Quillon]], kills Taramon\'s wife.
3. **Three years ago** — Taramon\'s daughter [[Seren Vael]], the Hand\'s cartographer, learns [[Varkas Emberveil]] means to burn her father at the Reforging. She burns the Hand\'s map archive, tattoos the only copy into her skin, and is caught in Luskan. Delmar hides her in [[Revel\'s End]] as **Prisoner 13**.
4. **Two years ago** — [[Garrett]] of [[The Hollow Road Crew]] takes the fall for robbing Hand gold. The Hand bribes a magistrate to put him in the cell next to Seren, as their inside man.
5. **This autumn** — [[Orsik Stonequill]] uncovers the Hand\'s plans at the [[Blackstaff Academy]]. His student [[Lisel Marrow]] reports him; he flees, and writes to his twin [[Eric]] (see [[Orsik\'s Letter]]). [[Hask the Ash-Finder]] starts hunting the Stonequill family. The Hand burns the prison\'s supply ship.

## Session Zero
[[Session 000 - Session Zero]] — characters at level 5; Eric shares Orsik\'s letter; the party sails north from [[Luskan]] on [[Thorne Wavemark]]\'s *Gull\'s Debt*.

## Act I — Chains and Cinders (levels 5–8)
| # | Chapter | Levels | What happens |
| --- | --- | --- | --- |
| 1 | [[Chapter 1 - The Thirteenth Cell]] | 5 → 6 | Ice road and rime wolves; get into Revel\'s End (Warden Rime, Tallow, or the drain); Sheila finds Garrett in cell 12; the riot; Seren; the Hand attacks the same night — Garrett chooses a side; escape past the rime troll. Seren reads the first site: Mount Hotenow. |
| 2 | [[Chapter 2 - Smoke over Luskan]] | 6 → 7 | Hand watchers; [[Nim]]; inside [[The Cinderhouse]]; the kindling list (Varkas will burn his own recruits); [[Sister Cinder]] escapes, shaken. |
| 3 | [[Chapter 3 - The Cinder Vault]] | 7 → 8 | Mount Hotenow with [[Brother Osk Hammerfell]]; ash drakes; [[Forgemaster Ruuk Ashgrinder]] and his slag golem; the **Shard of Cinders**. The shard goes cool in Opal\'s hand — Muscovy recognises the prophecy\'s bearer. |

**Side quests in Act I**
- [[Tallow\'s Debt]] (Ch 1, level 5) — the easy way into the prison.
- [[Hank\'s Last Crossing]] (starts Ch 1, ends Ch 2) — the poisoned courier; his letter is in the Cinderhouse.
- [[The Gull\'s Debt]] (Ch 2, level 6) — save Wavemark\'s ship.
- [[Nim\'s Choice]] (Ch 2, level 6) — pays off in Ch 10.
- [[Tobin\'s Ashes]] (starts Ch 2, ends Ch 10) — Sheila\'s crew-mate in the Hand.
- [[The Hollow Road]] (after Ch 1, levels 6–10) — Garrett goes home; his crew can ride in Ch 10.
- [[The Unburnt Covenant]] (starts Ch 3, runs to the end) — Muscovy\'s order, the prophecy, the bearer.

## Act II — The Scattered Flame (levels 8–11)
| # | Chapter | Levels | What happens |
| --- | --- | --- | --- |
| 4 | [[Chapter 4 - The Scholar in Hiding]] | 8 | Neverwinter: Eric finds Orsik hiding with [[Ilvara Dusk]]; Delmar wants Seren and the notebook; a Hand reprisal (shard curse). Seren reads the second site. |
| 5 | [[Chapter 5 - The Drowned Pyre]] | 8 → 9 | Mere of Dead Men; [[Old Fenn]] betrays them; [[Mother Soot]] wants a name; the **Shard of Smoke**. |
| 6 | [[Chapter 6 - The Lantern Library]] | 9 → 10 | Stillwater Abbey burns; Lisel unmasked; the *Book of the Unburnt* — Kaurvex\'s true name, and Opal\'s bloodline; the **Shard of Embers**. |
| 7 | [[Chapter 7 - The Soot Vault]] | 10 → 11 | Baldur\'s Gate gala heist; [[Captain Vex Halloran]]; the **Shard of Soot**. **Midpoint:** Varkas arrives on [[Cindraxis]] and takes Seren. |

Chapters 5–7 can be played in any order; the Hand takes whichever shard the party doesn\'t reach first.

**Side quest in Act II**
- [[Ash on the Doorstep]] (after Ch 4, levels 8–10) — Waterdeep: save the Stonequill family from Hask; Orsik\'s burned rooms reveal that Lisel betrayed him (leads into Ch 6).

## Act III — The Unremembered Brother (levels 11–15)
| # | Chapter | Levels | What happens |
| --- | --- | --- | --- |
| 8 | [[Chapter 8 - The Key in the Blood]] | 11 → 12 | Orsik breaks his last cipher: Seren is Taramon\'s daughter and her blood opens the Oubliette. Confront Delmar; race the Hand to [[The Silvered Tarn]]; rescue Seren. |
| 9 | [[Chapter 9 - The Glass Oubliette]] | 12 → 13 | Mirror shades and prismatic sentinels; Taramon and the **Heart Shard**; free him, leave him, or fight him. He recognises Opal at once. |
| 10 | [[Chapter 10 - Ashfall]] | 13 → 14 | Ash falls on Waterdeep. Sister Cinder turns; gather allies (Harpers, Neverwinter, Wavemark, the Hollow Road Crew); free the "kindling" (Tobin, Nim); Cindraxis on the Ash Stair — it bows to Opal. |
| 11 | [[Chapter 11 - The Night of Long Embers]] | 14 → 15 | The Pyre Throne: Varkas, then the [[Avatar of Kaurvex]]. Opal\'s test. |

## Endings
- **Unmade** — Opal carries a shard a full day without using it, speaks Kaurvex\'s true name and quenches the Heart Shard in Tarn water.
- **Worn** — Opal wears the Crown as its chosen and commands Kaurvex to sleep, or to wake.
- **Taramon\'s** — the archmage takes the Crown (a sequel villain).
- **Kaurvex wakes** — the darkest ending.

## Personal threads at a glance
| Character | Thread | Where it peaks |
| --- | --- | --- |
| [[Sheila]] | Garrett, the Hollow Road Crew, Tobin | Ch 1 (Garrett\'s choice), Ch 10 (the crew rides; Tobin freed) |
| [[Eric]] | Orsik and the hunted Stonequills | Ch 4 (reunion), *Ash on the Doorstep*, Ch 8 (the last cipher) |
| [[Opal]] | Kaurvex\'s blood; the chosen bearer | Ch 3, Ch 6, Ch 9, Ch 10, the finale — see [[Opal and the shards]] |
| [[Muscovy]] | The Unburnt Covenant and its prophecy | Ch 3 (the bearer), Ch 6 (the Book), the finale |
| [[Hank]] | The poisoned courier | Ch 1–2 (Tallow, the letter) |
''')
print('campaign done:', len(MONSTERS), 'creatures')
