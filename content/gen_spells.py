import os, sys, json
V = sys.argv[1]; q = json.dumps
def w(path, text):
    p = os.path.join(V, path); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(text.lstrip('\n'))
SRC = '\n\n---\n*Summarised for table use from the System Reference Document 5.2 (SRD 5.2) © Wizards of the Coast, [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode). Paraphrased — check the SRD or Player\'s Handbook for exact wording.*\n'
B, C, D, P, R, S, K, Z = 'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'
A, BA, RE = 'Action', 'Bonus Action', 'Reaction'
I = 'Instantaneous'
# name, level, school, classes, time, range, components, duration, conc, ritual, text, higher
SP = [
 ('Acid Splash',0,'Evocation',[S,Z],A,'60 feet','V, S',I,0,0,'You hurl a bubble of acid at a point. Each creature in a 5-foot-radius Sphere centred there makes a *Dexterity saving throw*, taking 1d6 Acid damage on a failure.','Damage increases by 1d6 at levels 5 (2d6), 11 (3d6) and 17 (4d6).'),
 ('Chill Touch',0,'Necromancy',[S,K,Z],A,'Touch','V, S',I,0,0,'Make a melee spell attack. On a hit, the target takes 1d10 Necrotic damage and can\'t regain Hit Points until the end of your next turn.','Damage increases by 1d10 at levels 5, 11 and 17.'),
 ('Eldritch Blast',0,'Evocation',[K],A,'120 feet','V, S',I,0,0,'A beam of crackling energy streaks toward a creature. Make a ranged spell attack; on a hit the target takes 1d10 Force damage.','You create two beams at level 5, three at level 11 and four at level 17. Each beam can target the same or different creatures; roll separately.'),
 ('Fire Bolt',0,'Evocation',[S,Z],A,'120 feet','V, S',I,0,0,'Make a ranged spell attack against a creature or object. On a hit it takes 1d10 Fire damage. A flammable object hit that isn\'t being worn or carried starts burning.','Damage increases by 1d10 at levels 5, 11 and 17.'),
 ('Guidance',0,'Divination',[C,D],A,'Touch','V, S','1 minute',1,0,'Choose a skill. Until the spell ends, the willing creature you touch adds 1d4 to any ability check using that skill.',''),
 ('Light',0,'Evocation',[B,C,S,Z],A,'Touch','V, M (a firefly or phosphorescent moss)','1 hour',0,0,'An object no larger than 10 feet sheds Bright Light in a 20-foot radius and Dim Light for a further 20 feet. Covering it blocks the light. Casting it again ends the previous casting.',''),
 ('Mage Hand',0,'Conjuration',[B,S,K,Z],A,'30 feet','V, S','1 minute',0,0,'A spectral floating hand appears. As a Magic action you can make it manipulate an object, open an unlocked door or container, or carry up to 10 pounds, moving it up to 30 feet. It can\'t attack or activate magic items.',''),
 ('Mending',0,'Transmutation',[B,C,D,S,Z],'1 minute','Touch','V, S, M (two lodestones)',I,0,0,'Repairs a single break or tear in an object no larger than 1 foot in any dimension, such as a broken chain link or a torn cloak. It leaves no trace of the damage.',''),
 ('Message',0,'Transmutation',[B,D,S,Z],A,'120 feet','S, M (a copper wire)','1 round',0,0,'You whisper a message to a creature in range that only it can hear; it can whisper a reply. You can cast it through solid objects if you know the target is beyond them.',''),
 ('Minor Illusion',0,'Illusion',[B,S,K,Z],A,'30 feet','S, M (a bit of fleece)','1 minute',0,0,'Create a sound or an image of an object no larger than a 5-foot cube. A creature that uses the Study action to examine it can see through it with a successful Intelligence (Investigation) check against your spell save DC.',''),
 ('Poison Spray',0,'Necromancy',[D,S,K,Z],A,'30 feet','V, S',I,0,0,'Make a ranged spell attack against a creature. On a hit, it takes 1d12 Poison damage.','Damage increases by 1d12 at levels 5, 11 and 17.'),
 ('Prestidigitation',0,'Transmutation',[B,S,K,Z],A,'10 feet','V, S','1 hour',0,0,'Minor magical tricks: a harmless sensory effect, light or snuff a candle, clean or soil a small object, chill/warm/flavour food, make a small mark or symbol appear, or create a trinket-sized illusion that lasts until the end of your next turn.',''),
 ('Ray of Frost',0,'Evocation',[S,Z],A,'60 feet','V, S',I,0,0,'Make a ranged spell attack. On a hit, the target takes 1d8 Cold damage and its Speed is reduced by 10 feet until the start of your next turn.','Damage increases by 1d8 at levels 5, 11 and 17.'),
 ('Resistance',0,'Abjuration',[C,D],A,'Touch','V, S','1 minute',1,0,'Choose a damage type. Once per turn, when the willing creature you touched takes damage of that type, it reduces the damage by 1d4.',''),
 ('Sacred Flame',0,'Evocation',[C],A,'60 feet','V, S',I,0,0,'Radiance descends on a creature you can see. It makes a *Dexterity saving throw*, taking 1d8 Radiant damage on a failure. The target gains no benefit from Half or Three-Quarters Cover.','Damage increases by 1d8 at levels 5, 11 and 17.'),
 ('Shocking Grasp',0,'Evocation',[S,Z],A,'Touch','V, S',I,0,0,'Make a melee spell attack. On a hit, the target takes 1d8 Lightning damage and can\'t make Opportunity Attacks until the start of its next turn.','Damage increases by 1d8 at levels 5, 11 and 17.'),
 ('Spare the Dying',0,'Necromancy',[C,D],A,'15 feet','V, S',I,0,0,'A creature within range that has 0 Hit Points and isn\'t dead becomes Stable.','The range doubles at levels 5, 11 and 17.'),
 ('Thaumaturgy',0,'Transmutation',[C],A,'30 feet','V','1 minute',0,0,'Manifest a minor wonder: boom your voice, flicker flames, cause tremors, create a sound, throw open a door or window, or alter the appearance of your eyes. Up to three effects at once.',''),
 ('Thorn Whip',0,'Transmutation',[D],A,'30 feet','V, S, M (the stem of a thorny plant)',I,0,0,'Make a melee spell attack with a thorny vine. On a hit the target takes 1d6 Piercing damage, and if it is Large or smaller you can pull it up to 10 feet closer to you.','Damage increases by 1d6 at levels 5, 11 and 17.'),
 ('True Strike',0,'Divination',[B,S,K,Z],A,'Self','S, M (a weapon with which you have proficiency and that is worth 1+ CP)',I,0,0,'Make one attack with the weapon used in the casting, using your spellcasting ability for the attack and damage rolls instead of Strength or Dexterity. The damage can be Radiant or the weapon\'s normal type (your choice).','The attack deals extra Radiant damage: 1d6 at level 5, 2d6 at level 11, 3d6 at level 17.'),
 ('Vicious Mockery',0,'Enchantment',[B],A,'60 feet','V',I,0,0,'You unleash a string of magical insults at a creature that can hear you. It makes a *Wisdom saving throw*; on a failure it takes 1d6 Psychic damage and has Disadvantage on the next attack roll it makes before the end of its next turn.','Damage increases by 1d6 at levels 5, 11 and 17.'),
 # level 1
 ('Bless',1,'Enchantment',[C,P],A,'30 feet','V, S, M (a Holy Symbol worth 5+ GP)','1 minute',1,0,'Up to three creatures add 1d4 to every attack roll and saving throw they make while the spell lasts.','One additional target per slot level above 1.'),
 ('Burning Hands',1,'Evocation',[S,Z],A,'Self (15-foot Cone)','V, S',I,0,0,'Flames shoot from your fingertips. Each creature in the Cone makes a *Dexterity saving throw*: 3d6 Fire damage on a failure, half as much on a success. Unattended flammable objects ignite.','+1d6 damage per slot level above 1.'),
 ('Charm Person',1,'Enchantment',[B,D,S,K,Z],A,'30 feet','V, S','1 hour',0,0,'A Humanoid makes a *Wisdom saving throw* (with Advantage if you or your allies are fighting it). On a failure it has the [[Charmed]] condition and regards you as a friendly acquaintance. When the spell ends, it knows it was charmed.','One additional target per slot level above 1.'),
 ('Command',1,'Enchantment',[B,C,P],A,'60 feet','V',I,0,0,'You speak a one-word command to a creature. It makes a *Wisdom saving throw*; on a failure it follows the command on its next turn: **Approach**, **Drop**, **Flee**, **Grovel** (falls [[Prone]] and ends its turn) or **Halt** (doesn\'t move or take actions).','One additional target per slot level above 1.'),
 ('Comprehend Languages',1,'Divination',[B,S,K,Z],A,'Self','V, S, M (a pinch of soot and salt)','1 hour',0,1,'You understand the literal meaning of any language you hear or sign, and of written language you touch (about 1 minute per page). Codes and secret messages aren\'t decoded.',''),
 ('Cure Wounds',1,'Abjuration',[B,C,D,P,R],A,'Touch','V, S',I,0,0,'A creature you touch regains Hit Points equal to 2d8 plus your spellcasting ability modifier.','Healing increases by 2d8 per slot level above 1.'),
 ('Detect Magic',1,'Divination',[B,C,D,P,R,S,K,Z],A,'Self','V, S','10 minutes',1,1,'You sense the presence of magical effects within 30 feet. As a Magic action you can see a faint aura around any visible magical creature or object and learn its school of magic, if any. Most barriers block it.',''),
 ('Disguise Self',1,'Illusion',[B,S,Z],A,'Self','V, S','1 hour',0,0,'You change how you look — including clothing, armour and gear — until the spell ends. A creature can use the Study action and an Intelligence (Investigation) check against your spell save DC to see through it.',''),
 ('Faerie Fire',1,'Evocation',[B,D],A,'60 feet','V','1 minute',1,0,'Objects in a 20-foot Cube are outlined in light. Each creature there makes a *Dexterity saving throw* or is outlined too. Outlined creatures shed Dim Light, can\'t benefit from the [[Invisible]] condition, and attack rolls against them have Advantage.',''),
 ('Feather Fall',1,'Transmutation',[B,S,Z],RE+', which you take when you or a creature you can see within 60 feet falls','60 feet','V, M (a small feather or piece of down)','1 minute',0,0,'Up to five falling creatures slow to 60 feet per round. A creature that lands before the spell ends takes no falling damage and lands on its feet.',''),
 ('Find Familiar',1,'Conjuration',[Z],'1 hour','10 feet','V, S, M (burning incense worth 10+ GP, which the spell consumes)',I,0,1,'You gain the service of a spirit familiar in an animal form you choose (bat, cat, frog, hawk, owl, rat, raven, spider, weasel, etc.). It acts independently, can deliver your touch spells, and you can perceive through its senses.',''),
 ('Guiding Bolt',1,'Evocation',[C],A,'120 feet','V, S','1 round',0,0,'Make a ranged spell attack. On a hit the target takes 4d6 Radiant damage, and the next attack roll made against it before the end of your next turn has Advantage.','+1d6 damage per slot level above 1.'),
 ('Healing Word',1,'Abjuration',[B,C,D],BA,'60 feet','V',I,0,0,'A creature you can see regains Hit Points equal to 2d4 plus your spellcasting ability modifier.','Healing increases by 2d4 per slot level above 1.'),
 ('Hex',1,'Enchantment',[K],BA,'90 feet','V, S, M (the petrified eye of a newt)','1 hour',1,0,'You curse a creature you can see. You deal an extra 1d6 Necrotic damage to it whenever you hit it with an attack roll, and it has Disadvantage on ability checks with one ability you choose. If it drops to 0 HP, you can move the curse to a new creature as a Bonus Action.','Longer duration with higher slots (up to 24 hours).'),
 ("Hunter's Mark",1,'Divination',[R],BA,'90 feet','V','1 hour',1,0,'You mark a creature as your quarry. You deal an extra 1d6 Force damage to it whenever you hit it with an attack roll, and you have Advantage on Wisdom (Perception or Survival) checks to find it. If it drops to 0 HP, you can move the mark as a Bonus Action.','Longer duration with higher slots.'),
 ('Identify',1,'Divination',[B,Z],'1 minute','Touch','V, S, M (a pearl worth 100+ GP)',I,0,1,'You learn the properties of a magic item you touch, how to use it, whether it requires attunement and how many charges it has — or which spells are affecting a creature you touch.',''),
 ('Mage Armor',1,'Abjuration',[S,Z],A,'Touch','V, S, M (a piece of cured leather)','8 hours',0,0,'A willing creature not wearing armour has a base AC of 13 + its Dexterity modifier until the spell ends. It ends early if the target dons armour.',''),
 ('Magic Missile',1,'Evocation',[S,Z],A,'120 feet','V, S',I,0,0,'Three glowing darts strike creatures you can see — automatically hitting — each dealing 1d4 + 1 Force damage. Direct them at one creature or several.','One additional dart per slot level above 1.'),
 ('Protection from Evil and Good',1,'Abjuration',[C,P,K,Z],A,'Touch','V, S, M (a flask of Holy Water worth 25+ GP, which the spell consumes)','10 minutes',1,0,'Until the spell ends, Aberrations, Celestials, Elementals, Fey, Fiends and Undead have Disadvantage on attack rolls against the target, and it can\'t be possessed by them or gain the Charmed or Frightened conditions from them.',''),
 ('Sanctuary',1,'Abjuration',[C],BA,'30 feet','V, S, M (a shard of glass from a mirror)','1 minute',0,0,'A creature that targets the warded creature with an attack or harmful spell must first succeed on a *Wisdom saving throw* or choose a new target or lose the attack or spell. Ends if the warded creature attacks, casts a spell that affects an enemy, or deals damage.',''),
 ('Shield',1,'Abjuration',[S,Z],RE+', which you take when you are hit by an attack roll or targeted by Magic Missile','Self','V, S','1 round',0,0,'An invisible barrier gives you +5 AC until the start of your next turn, including against the triggering attack, and you take no damage from Magic Missile.',''),
 ('Shield of Faith',1,'Abjuration',[C,P],BA,'60 feet','V, S, M (a prayer scroll)','10 minutes',1,0,'A shimmering field grants a creature of your choice +2 AC for the duration.',''),
 ('Sleep',1,'Enchantment',[B,S,Z],A,'60 feet','V, S, M (a pinch of sand or rose petals)','1 minute',1,0,'Each creature of your choice in a 5-foot-radius Sphere makes a *Wisdom saving throw* or has the [[Incapacitated]] condition until the end of its next turn, when it repeats the save; on a second failure it has the [[Unconscious]] condition for the duration. It wakes if it takes damage or someone uses an action to shake it. Creatures that don\'t sleep, or are immune to Exhaustion, are unaffected.',''),
 ('Thunderwave',1,'Evocation',[B,D,S,Z],A,'Self (15-foot Cube)','V, S',I,0,0,'Each creature in the Cube makes a *Constitution saving throw*. On a failure it takes 2d8 Thunder damage and is pushed 10 feet away; on a success, half damage and no push. The boom is audible 300 feet away.','+1d8 damage per slot level above 1.'),
 # level 2
 ('Aid',2,'Abjuration',[B,C,D,P,R],A,'30 feet','V, S, M (a strip of white cloth)','8 hours',0,0,'Up to three creatures each increase their Hit Point maximum and current Hit Points by 5 for the duration.','+5 more per slot level above 2.'),
 ('Darkness',2,'Evocation',[S,K,Z],A,'60 feet','V, M (bat fur and a piece of coal)','10 minutes',1,0,'Magical Darkness fills a 15-foot-radius Sphere (or emanates from an object you choose). Darkvision can\'t see through it, and nonmagical light can\'t illuminate it.',''),
 ('Hold Person',2,'Enchantment',[B,C,D,S,K,Z],A,'60 feet','V, S, M (a straight piece of iron)','1 minute',1,0,'A Humanoid makes a *Wisdom saving throw* or has the [[Paralyzed]] condition. It repeats the save at the end of each of its turns, ending the effect on a success.','One additional target per slot level above 2.'),
 ('Invisibility',2,'Illusion',[B,S,K,Z],A,'Touch','V, S, M (an eyelash in gum arabic)','1 hour',1,0,'A creature you touch has the [[Invisible]] condition until the spell ends. It ends early for the target if it makes an attack roll, deals damage or casts a spell.','One additional target per slot level above 2.'),
 ('Lesser Restoration',2,'Abjuration',[B,C,D,P,R],BA,'Touch','V, S',I,0,0,'End one condition on a creature: [[Blinded]], [[Deafened]], [[Paralyzed]] or [[Poisoned]].',''),
 ('Misty Step',2,'Conjuration',[S,K,Z],BA,'Self','V',I,0,0,'Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space you can see.',''),
 ('Moonbeam',2,'Evocation',[D],A,'120 feet','V, S, M (a moonseed leaf)','1 minute',1,0,'A 5-foot-radius, 40-foot-high Cylinder of pale light appears. A creature that enters it or starts its turn there makes a *Constitution saving throw* (shapechangers with Disadvantage): 2d10 Radiant damage on a failure, half on a success. As a Magic action you can move the beam 60 feet.','+1d10 damage per slot level above 2.'),
 ('Scorching Ray',2,'Evocation',[S,Z],A,'120 feet','V, S',I,0,0,'You hurl three fiery rays. Make a ranged spell attack for each; a hit deals 2d6 Fire damage.','One additional ray per slot level above 2.'),
 ('Shatter',2,'Evocation',[B,S,K,Z],A,'60 feet','V, S, M (a chip of mica)',I,0,0,'A painful ringing erupts in a 10-foot-radius Sphere. Each creature there makes a *Constitution saving throw*: 3d8 Thunder damage on a failure, half on a success. Creatures made of inorganic material have Disadvantage. Unattended objects take the damage too.','+1d8 damage per slot level above 2.'),
 ('Silence',2,'Illusion',[B,C,R],A,'120 feet','V, S','10 minutes',1,1,'No sound can be created within or pass through a 20-foot-radius Sphere. Creatures inside have the [[Deafened]] condition and Immunity to Thunder damage, and can\'t cast spells with a Verbal component.',''),
 ('Spiritual Weapon',2,'Evocation',[C],BA,'60 feet','V, S','1 minute',1,0,'A floating spectral weapon appears. When you cast the spell, and as a Bonus Action on later turns, you can move it up to 20 feet and make a melee spell attack against a creature within 5 feet of it: 1d8 + your spellcasting modifier Force damage.','+1d8 damage per slot level above 2.'),
 ('Suggestion',2,'Enchantment',[B,S,K,Z],A,'30 feet','V, M (a drop of honey)','8 hours',1,0,'Suggest a course of activity (25 words or fewer) that sounds achievable and doesn\'t obviously harm the target. It makes a *Wisdom saving throw* or has the [[Charmed]] condition and pursues the suggestion.',''),
 ('Web',2,'Conjuration',[S,Z],A,'60 feet','V, S, M (a bit of spiderweb)','1 hour',1,0,'Sticky webbing fills a 20-foot Cube: Difficult Terrain and Lightly Obscured. A creature that enters or starts its turn there makes a *Dexterity saving throw* or has the [[Restrained]] condition; it can use an action to try a Strength (Athletics) check to escape. The web is flammable.',''),
 # level 3
 ('Counterspell',3,'Abjuration',[S,K,Z],RE+', which you take when you see a creature within 60 feet casting a spell with Verbal, Somatic or Material components','60 feet','S',I,0,0,'The caster makes a *Constitution saving throw*. On a failure the spell dissipates with no effect and the action, Bonus Action or Reaction used to cast it is wasted. If it was cast with a spell slot, that slot isn\'t expended.',''),
 ('Dispel Magic',3,'Abjuration',[B,C,D,P,R,S,K,Z],A,'120 feet','V, S',I,0,0,'Choose a creature, object or magical effect. Any ongoing spell of level 3 or lower on it ends. For each higher-level spell, make an ability check using your spellcasting ability (DC 10 + the spell\'s level); on a success that spell ends.','You automatically end spells whose level is equal to or less than the slot you used.'),
 ('Fear',3,'Illusion',[B,S,K,Z],A,'Self (30-foot Cone)','V, S, M (a white feather)','1 minute',1,0,'Each creature in the Cone makes a *Wisdom saving throw* or drops whatever it holds and has the [[Frightened]] condition. A frightened creature must Dash away from you on its turns. It repeats the save at the end of turns where it can\'t see you.',''),
 ('Fireball',3,'Evocation',[S,Z],A,'150 feet','V, S, M (a ball of bat guano and sulfur)',I,0,0,'A bright streak blossoms into an explosion. Each creature in a 20-foot-radius Sphere makes a *Dexterity saving throw*: 8d6 Fire damage on a failure, half on a success. Unattended flammable objects ignite.','+1d6 damage per slot level above 3.'),
 ('Fly',3,'Transmutation',[S,K,Z],A,'Touch','V, S, M (a feather)','10 minutes',1,0,'A willing creature gains a Fly Speed of 60 feet. If the spell ends while it is aloft, it falls unless it can stop the fall.','One additional target per slot level above 3.'),
 ('Haste',3,'Transmutation',[S,Z],A,'30 feet','V, S, M (a shaving of licorice root)','1 minute',1,0,'A willing creature\'s Speed is doubled, it gains +2 AC and Advantage on Dexterity saves, and it gets an extra action each turn (Attack — one attack only — Dash, Disengage, Hide or Utilize). When the spell ends, it can\'t move or take actions until after its next turn.',''),
 ('Hypnotic Pattern',3,'Illusion',[B,S,K,Z],A,'120 feet','S, M (a pinch of confetti)','1 minute',1,0,'A twisting pattern of colours fills a 30-foot Cube. Each creature that sees it makes a *Wisdom saving throw* or has the [[Charmed]] condition: [[Incapacitated]] with Speed 0. It ends if the creature takes damage or someone uses an action to shake it awake.',''),
 ('Lightning Bolt',3,'Evocation',[S,Z],A,'Self (100-foot Line)','V, S, M (a bit of fur and a crystal rod)',I,0,0,'A stroke of lightning forms a 100-foot-long, 5-foot-wide Line. Each creature in it makes a *Dexterity saving throw*: 8d6 Lightning damage on a failure, half on a success.','+1d6 damage per slot level above 3.'),
 ('Mass Healing Word',3,'Abjuration',[B,C],BA,'60 feet','V',I,0,0,'Up to six creatures you can see regain Hit Points equal to 2d4 plus your spellcasting ability modifier.','More healing with higher slots.'),
 ('Remove Curse',3,'Abjuration',[C,P,K,Z],A,'Touch','V, S',I,0,0,'All curses affecting a creature or object end. If the object is a cursed magic item, its curse remains, but the spell breaks its owner\'s attunement so it can be removed.',''),
 ('Revivify',3,'Necromancy',[C,D,P,R],A,'Touch','V, S, M (a diamond worth 300+ GP, which the spell consumes)',I,0,0,'A creature that has died within the last minute returns to life with 1 Hit Point. It can\'t revive a creature that died of old age, and doesn\'t restore missing body parts.',''),
 ('Sending',3,'Divination',[B,C,Z],A,'Unlimited','V, S, M (a copper wire)','1 round',0,0,'Send a message of 25 words or fewer to a creature you are familiar with, anywhere on the same plane. It hears it in its mind, recognises you and can reply in 25 words. Other planes may fail.',''),
 ('Spirit Guardians',3,'Conjuration',[C],A,'Self','V, S, M (a prayer scroll)','10 minutes',1,0,'Protective spirits fill a 15-foot Emanation. Creatures of your choice there have their Speed halved. When such a creature enters the area or ends its turn there (once per turn), it makes a *Wisdom saving throw*: 3d8 Radiant (or Necrotic) damage on a failure, half on a success.','+1d8 damage per slot level above 3.'),
 # level 4
 ('Banishment',4,'Abjuration',[C,P,S,K,Z],A,'30 feet','V, S, M (a pentacle)','1 minute',1,0,'A creature makes a *Charisma saving throw* or is transported to a harmless demiplane, where it has the [[Incapacitated]] condition. If it is native to another plane and the spell lasts the full minute, it doesn\'t come back.','One additional target per slot level above 4.'),
 ('Death Ward',4,'Abjuration',[C,P],A,'Touch','V, S','8 hours',0,0,'The first time the target would drop to 0 Hit Points, it drops to 1 instead, and the spell ends. It also negates one instant-kill effect.',''),
 ('Dimension Door',4,'Conjuration',[B,S,K,Z],A,'500 feet','V',I,0,0,'You teleport to any spot within range that you can see, picture or describe by direction and distance. You can bring one willing creature within 5 feet of you.',''),
 ('Greater Invisibility',4,'Illusion',[B,S,Z],A,'Touch','V, S','1 minute',1,0,'A creature has the [[Invisible]] condition for the duration — even when it attacks or casts spells.',''),
 ('Ice Storm',4,'Evocation',[D,S,Z],A,'300 feet','V, S, M (a mitten)',I,0,0,'Hail pounds a 20-foot-radius, 40-foot-high Cylinder. Each creature there makes a *Dexterity saving throw*: 2d10 Bludgeoning and 4d6 Cold damage on a failure, half on a success. The area is Difficult Terrain until the end of your next turn.','+1d10 Bludgeoning damage per slot level above 4.'),
 ('Polymorph',4,'Transmutation',[B,D,S,Z],A,'60 feet','V, S, M (a caterpillar cocoon)','1 hour',1,0,'A creature makes a *Wisdom saving throw* (willing creatures can fail) or turns into a Beast whose Challenge Rating is no higher than its level or CR. It gains Temporary Hit Points equal to the new form\'s HP and uses that form\'s statistics, keeping its personality.',''),
 ('Wall of Fire',4,'Evocation',[D,S,Z],A,'120 feet','V, S, M (a piece of charcoal)','1 minute',1,0,'You create a wall of fire up to 60 feet long (or a ring 20 feet across), 20 feet high and 1 foot thick. Creatures in its area make a *Dexterity saving throw* (5d8 Fire, half on a success). One side (your choice) deals 5d8 Fire damage to creatures that end their turn within 10 feet of it or enter the wall.','+1d8 damage per slot level above 4.'),
 # level 5
 ('Cone of Cold',5,'Evocation',[D,S,Z],A,'Self (60-foot Cone)','V, S, M (a small crystal or glass cone)',I,0,0,'A blast of cold air erupts. Each creature in the Cone makes a *Constitution saving throw*: 8d8 Cold damage on a failure, half on a success.','+1d8 damage per slot level above 5.'),
 ('Greater Restoration',5,'Abjuration',[B,C,D,P,R],A,'Touch','V, S, M (diamond dust worth 100+ GP, which the spell consumes)',I,0,0,'Remove one of the following from a creature: 1 level of [[Exhaustion]], the [[Charmed]] or [[Petrified]] condition, a curse (including attunement to a cursed item), any reduction to an ability score, or any reduction to its Hit Point maximum.',''),
 ('Hold Monster',5,'Enchantment',[B,S,K,Z],A,'90 feet','V, S, M (a straight piece of iron)','1 minute',1,0,'A creature makes a *Wisdom saving throw* or has the [[Paralyzed]] condition. It repeats the save at the end of each of its turns.','One additional target per slot level above 5.'),
 ('Raise Dead',5,'Necromancy',[B,C,P],'1 hour','Touch','V, S, M (a diamond worth 500+ GP, which the spell consumes)',I,0,0,'A creature that has been dead no longer than 10 days returns to life, provided its soul is willing and free. It returns with a penalty to its D20 Tests that fades as it finishes Long Rests. It doesn\'t restore missing body parts.',''),
 ('Wall of Force',5,'Evocation',[Z],A,'120 feet','V, S, M (a shard of glass)','10 minutes',1,0,'An invisible, immovable wall of force appears — flat panels or a hemisphere/sphere. Nothing can physically pass through it, and it is immune to all damage. *Disintegrate* destroys it instantly.',''),
 # 6+
 ('Chain Lightning',6,'Evocation',[S,Z],A,'150 feet','V, S, M (three silver pins)',I,0,0,'A bolt strikes a target, then leaps to up to three other targets within 30 feet of it. Each makes a *Dexterity saving throw*: 10d8 Lightning damage on a failure, half on a success.','One additional leap per slot level above 6.'),
 ('Disintegrate',6,'Transmutation',[S,Z],A,'60 feet','V, S, M (a lodestone and dust)',I,0,0,'A green ray targets a creature or object. A creature makes a *Dexterity saving throw*, taking 10d6 + 40 Force damage on a failure. A creature reduced to 0 Hit Points is disintegrated into dust. It also destroys a Large or smaller nonmagical object or a 10-foot cube of a larger one, and any *Wall of Force*.','+3d6 damage per slot level above 6.'),
 ('Heal',6,'Abjuration',[C,D],A,'60 feet','V, S',I,0,0,'A creature regains 70 Hit Points, and the [[Blinded]], [[Deafened]] and [[Poisoned]] conditions end on it.','+10 healing per slot level above 6.'),
 ('Teleport',7,'Conjuration',[B,S,Z],A,'10 feet','V',I,0,0,'You and up to eight willing creatures (or one object) teleport to a destination on the same plane. The more familiar you are with the destination, the more reliable it is — roll on the Teleportation Outcome table in the SRD for mishaps.',''),
 ('Power Word Kill',9,'Enchantment',[B,S,K,Z],A,'60 feet','V',I,0,0,'You speak a word of power at a creature. If it has 100 Hit Points or fewer, it dies. Otherwise it takes 12d12 Psychic damage.',''),
 ('Meteor Swarm',9,'Evocation',[S,Z],A,'1 mile','V, S',I,0,0,'Four blazing orbs strike points you can see. Each creature in a 40-foot-radius Sphere around each point makes a *Dexterity saving throw*: 20d6 Fire and 20d6 Bludgeoning damage on a failure, half on a success. A creature in more than one area is affected only once.',''),
 ('Time Stop',9,'Transmutation',[S,Z],A,'Self','V',I,0,0,'Time stops for everyone but you. You take 1d4 + 1 turns in a row, during which you can use actions and move normally. It ends early if anything you do affects another creature or an object it is wearing or carrying, or if you move more than 1,000 feet from where you cast it.',''),
 ('Wish',9,'Conjuration',[S,Z],A,'Self','V',I,0,0,'The mightiest spell. You can duplicate any spell of level 8 or lower without meeting its requirements, or describe another effect for the DM to adjudicate. Stressful wishes can weaken you and may cost you the ability to cast *Wish* ever again.',''),
]
lvlname = lambda L: 'Cantrip' if L == 0 else f'Level {L}'
for (n, L, sch, cls, t, rng, comp, dur, conc, rit, text, hi) in SP:
    duration = ('Concentration, up to ' + dur) if conc else dur
    fm = f'---\ntype: spell\nlevel: {L}\nschool: {sch}\ncasting_time: {q(t)}\nrange: {q(rng)}\ncomponents: {q(comp)}\nduration: {q(duration)}\nconcentration: {"true" if conc else "false"}\nritual: {"true" if rit else "false"}\nclasses: {q(cls)}\nsource: SRD 5.2\ntags: [spell]\n---\n'
    sub = f'{sch} Cantrip' if L == 0 else f'Level {L} {sch}' + (' (Ritual)' if rit else '')
    body = f'# {n}\n\n*{sub} ({", ".join(cls)})*\n\n> [!info] Casting\n> **Casting Time:** {t}{" or Ritual" if rit else ""}\n> **Range:** {rng}\n> **Components:** {comp}\n> **Duration:** {duration}\n\n{text}\n'
    if hi: body += f'\n**{"Cantrip Upgrade" if L == 0 else "Using a Higher-Level Spell Slot"}.** {hi}\n'
    body += '\nSee [[Spellcasting Basics|spellcasting rules]] · [[Spell List]]'
    fname = n + ' (Spell)' if n in ('Shield',) else n
    if fname != n: fm = fm.replace('tags: [spell]', 'aliases: [' + q(n) + ']\ntags: [spell]')
    w(f'Rules 2024/Spells/{fname}.md', fm + body.replace('# ' + n, '# ' + fname, 1) + SRC)

# ---------------- spellcasting rules ----------------
def rule(path, title, body):
    w(f'Rules 2024/{path}.md', f'---\ntype: rule\ntags: [rule/magic]\n---\n# {title}\n\n{body.strip()}\n' + SRC)

rule('Spellcasting/Spellcasting Basics', 'Spellcasting (2024 rules)', '''## Spell level & slots
- Spells range from **cantrips** (level 0, cast at will) to **level 9**. Casting a levelled spell **expends a spell slot** of that level or higher. See [[Spell Slots by Class]].
- **Using a higher-level slot** boosts many spells; the spell says how ("Using a Higher-Level Spell Slot").
- **Cantrip upgrades** happen as *you* level: most cantrips get stronger at character levels 5, 11 and 17.
- **One slot per turn:** you can expend only one spell slot to cast a spell on a turn. You can still cast cantrips, or spells from magic items, alongside it.
- Slots are regained on a [[Resting|Long Rest]] (Warlocks regain Pact Magic slots on a Short or Long Rest).

## Preparing spells
Every spellcaster has a list of **prepared spells** they can cast with slots. Most classes can change one or more prepared spells when they finish a Long Rest (Wizards prepare from their spellbook; Clerics and Druids choose from their whole class list; Bards, Sorcerers, Warlocks and Rangers change one spell when they gain a level, depending on the class).

## Casting time
- **Action** — most spells (the **Magic** action).
- **Bonus Action** — e.g. [[Healing Word]], [[Misty Step]].
- **Reaction** — the spell names its trigger, e.g. [[Shield (Spell)|Shield]], [[Counterspell]].
- **Longer times** — 1 minute or more; you must keep concentrating while casting, or the spell fails (the slot isn't expended).
- **Rituals:** a spell with the Ritual tag can be cast without a slot by adding 10 minutes to its casting time. It must be prepared.

## Components
- **V (Verbal)** — you must be able to speak; *Silence* or being gagged stops you.
- **S (Somatic)** — you need a free hand for gestures.
- **M (Material)** — a component pouch or **spellcasting focus** (arcane, druidic, holy symbol, musical instrument for Bards) replaces materials **unless** the material has a cost or the spell consumes it.

## Range & targets
- Range is a distance, **Touch**, or **Self** (often with an area shape — see [[Areas of Effect]]).
- You need a **clear path** to a target; Total Cover blocks it.
- If you target yourself or another creature, you must be able to see it unless the spell says otherwise.

## Saving throws & attack rolls
- **Spell save DC** = 8 + spellcasting ability modifier + Proficiency Bonus.
- **Spell attack modifier** = spellcasting ability modifier + Proficiency Bonus.
- Ranged spell attacks have Disadvantage when an enemy that can see you is within 5 feet (see [[Attacks and Cover]]).
- Spellcasting abilities: **Int** (Wizard), **Wis** (Cleric, Druid, Ranger), **Cha** (Bard, Paladin, Sorcerer, Warlock).

## Duration
- **Instantaneous** — the magic flashes and is gone (healing and damage stay).
- **Timed** — lasts the listed time; you can dismiss it (no action required).
- **[[Concentration]]** — one at a time; a Constitution save (DC 10 or half the damage, max 30) when you take damage; ends if you're [[Incapacitated]].

## Combining effects
The effects of different spells add together, but **the same spell cast more than once doesn't stack** — the most potent instance applies (or the most recent, if equally potent).

## Schools of magic
Abjuration (protection) · Conjuration (summoning, teleportation) · Divination (knowledge) · Enchantment (minds) · Evocation (energy, damage, healing) · Illusion (deception) · Necromancy (life and death) · Transmutation (changing things).

## Spell scrolls
A *Spell Scroll* lets anyone who has the spell on their class list cast it without components. If the spell is higher level than you can cast, make an ability check using your spellcasting ability (DC 10 + spell level).

See [[Spell List]] · [[Spell Slots by Class]] · [[Areas of Effect]].
''')
rule('Spellcasting/Areas of Effect', 'Areas of effect', '''Every area has a **point of origin**. Unless a spell says otherwise, the point of origin isn't included in the area, and the area is blocked by Total Cover from the point of origin.

| Shape | Size is… | Point of origin |
| --- | --- | --- |
| **Cone** | its length; width at any point equals its distance from the origin | at the caster (the origin isn't in the area) |
| **Cube** | the length of each side | anywhere on a face of the cube |
| **Cylinder** | radius of the circular base, plus a height | the centre of the circle (top or bottom) |
| **Emanation** | how far it extends from a creature or object | the creature/object — it **moves with it** and normally doesn't include it |
| **Line** | its length and width | the line's start |
| **Sphere** | its radius | the centre of the sphere |

**Quick conversion for grids:** a 15-foot Cone covers a 3-square-long triangle; a 20-foot-radius Sphere covers an 8 × 8 square area. Many tables simply count squares from the origin.

**Template targets (rule of thumb, from the 2014 DMG):** Cone ≈ size ÷ 10 creatures, Cube/Sphere ≈ size ÷ 5 creatures, Line ≈ size ÷ 30 creatures.
''')
FULL = [[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]]
HALF = [[2],[2],[3],[3],[4,2],[4,2],[4,3],[4,3],[4,3,2],[4,3,2],[4,3,3],[4,3,3],[4,3,3,1],[4,3,3,1],[4,3,3,2],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2]]
PACT = {1:(1,1),2:(2,1),3:(2,2),4:(2,2),5:(2,3),6:(2,3),7:(2,4),8:(2,4),9:(2,5),10:(2,5),11:(3,5),12:(3,5),13:(3,5),14:(3,5),15:(3,5),16:(3,5),17:(4,5),18:(4,5),19:(4,5),20:(4,5)}
def table(rows, n):
    h = '| Level | ' + ' | '.join(f'{i}' for i in range(1, n+1)) + ' |\n|' + ' --- |' * (n+1) + '\n'
    return h + '\n'.join(f'| {i+1} | ' + ' | '.join(str(r[k]) if k < len(r) else '—' for k in range(n)) + ' |' for i, r in enumerate(rows))
rule('Spellcasting/Spell Slots by Class', 'Spell slots by class', f'''## Full casters — Bard, Cleric, Druid, Sorcerer, Wizard
Slots per spell level:

{table(FULL, 9)}

## Half casters — Paladin, Ranger
In the 2024 rules Paladins and Rangers cast spells from **level 1**.

{table(HALF, 5)}

## Pact Magic — Warlock
All Pact Magic slots are the same level, and they return on a **Short or Long Rest**.

| Level | Slots | Slot level |
| --- | --- | --- |
''' + '\n'.join(f'| {L} | {s} | {lv} |' for L, (s, lv) in PACT.items()) + '''

From level 11 Warlocks also gain **Mystic Arcanum** — one spell each of levels 6 (at 11), 7 (13), 8 (15) and 9 (17), each castable once per Long Rest without a slot.

## Multiclassing
Add together your levels in full-caster classes, **half** your Paladin and Ranger levels (rounded up), and use the full-caster table to find your slots. Pact Magic slots are separate, but you can spend either kind of slot on either class's spells.
''')

w('Rules 2024/Spellcasting/Spell List.md', '''---
type: rule
tags: [rule/magic]
---
# Spell list

```dm-actions
spell
```

A quick-reference selection of commonly used spells from the 2024 rules (SRD 5.2), plus any homebrew spells you add with **DM Codex: New Spell**. Every spell is a note, so `[[Fireball]]` works anywhere — in statblocks, sessions and character notes. The dashboard's **Spells** tab has a searchable list.

> [!warning] Not the full SRD
> The SRD contains 300+ spells. These notes summarise a commonly used subset; add others from the SRD with *New Spell*.

''' + '\n'.join(f'''## {lvlname(L)}{'s' if L == 0 else ' spells'}
```dm-list
type: spell
level: {L}
fields: [school, casting_time, range, concentration, classes]
empty: None yet.
```
''' for L in range(10)) + '''
## By class
''' + '\n'.join(f'''### {c}
```dm-list
type: spell
classes: {c}
sort: level
fields: [level, school, concentration]
```
''' for c in [B, C, D, P, R, S, K, Z]) + SRC)
print('spells done', len(SP))
