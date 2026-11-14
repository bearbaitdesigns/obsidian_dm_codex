import os, sys, json, shutil
V = sys.argv[1]
q = json.dumps
def w(path, text):
    p = os.path.join(V, path); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(text.lstrip('\n'))
SRC = '\n---\n*Equipment data summarised from the System Reference Document 5.2 (CC-BY-4.0).*\n'

W = [  # name, category, dmg, type, properties, mastery, weight, cost
 ('Club','Simple Melee','1d4','Bludgeoning',['Light'],'Slow','2 lb.','1 sp'),
 ('Dagger','Simple Melee','1d4','Piercing',['Finesse','Light','Thrown (20/60)'],'Nick','1 lb.','2 gp'),
 ('Greatclub','Simple Melee','1d8','Bludgeoning',['Two-Handed'],'Push','10 lb.','2 sp'),
 ('Handaxe','Simple Melee','1d6','Slashing',['Light','Thrown (20/60)'],'Vex','2 lb.','5 gp'),
 ('Javelin','Simple Melee','1d6','Piercing',['Thrown (30/120)'],'Slow','2 lb.','5 sp'),
 ('Light Hammer','Simple Melee','1d4','Bludgeoning',['Light','Thrown (20/60)'],'Nick','2 lb.','2 gp'),
 ('Mace','Simple Melee','1d6','Bludgeoning',[],'Sap','4 lb.','5 gp'),
 ('Quarterstaff','Simple Melee','1d6','Bludgeoning',['Versatile (1d8)'],'Topple','4 lb.','2 sp'),
 ('Sickle','Simple Melee','1d4','Slashing',['Light'],'Nick','2 lb.','1 gp'),
 ('Spear','Simple Melee','1d6','Piercing',['Thrown (20/60)','Versatile (1d8)'],'Sap','3 lb.','1 gp'),
 ('Dart','Simple Ranged','1d4','Piercing',['Finesse','Thrown (20/60)'],'Vex','1/4 lb.','5 cp'),
 ('Light Crossbow','Simple Ranged','1d8','Piercing',['Ammunition (80/320; Bolt)','Loading','Two-Handed'],'Slow','5 lb.','25 gp'),
 ('Shortbow','Simple Ranged','1d6','Piercing',['Ammunition (80/320; Arrow)','Two-Handed'],'Vex','2 lb.','25 gp'),
 ('Sling','Simple Ranged','1d4','Bludgeoning',['Ammunition (30/120; Bullet)'],'Slow','—','1 sp'),
 ('Battleaxe','Martial Melee','1d8','Slashing',['Versatile (1d10)'],'Topple','4 lb.','10 gp'),
 ('Flail','Martial Melee','1d8','Bludgeoning',[],'Sap','2 lb.','10 gp'),
 ('Glaive','Martial Melee','1d10','Slashing',['Heavy','Reach','Two-Handed'],'Graze','6 lb.','20 gp'),
 ('Greataxe','Martial Melee','1d12','Slashing',['Heavy','Two-Handed'],'Cleave','7 lb.','30 gp'),
 ('Greatsword','Martial Melee','2d6','Slashing',['Heavy','Two-Handed'],'Graze','6 lb.','50 gp'),
 ('Halberd','Martial Melee','1d10','Slashing',['Heavy','Reach','Two-Handed'],'Cleave','6 lb.','20 gp'),
 ('Lance','Martial Melee','1d10','Piercing',['Heavy','Reach','Two-Handed (unless mounted)'],'Topple','6 lb.','10 gp'),
 ('Longsword','Martial Melee','1d8','Slashing',['Versatile (1d10)'],'Sap','3 lb.','15 gp'),
 ('Maul','Martial Melee','2d6','Bludgeoning',['Heavy','Two-Handed'],'Topple','10 lb.','10 gp'),
 ('Morningstar','Martial Melee','1d8','Piercing',[],'Sap','4 lb.','15 gp'),
 ('Pike','Martial Melee','1d10','Piercing',['Heavy','Reach','Two-Handed'],'Push','18 lb.','5 gp'),
 ('Rapier','Martial Melee','1d8','Piercing',['Finesse'],'Vex','2 lb.','25 gp'),
 ('Scimitar','Martial Melee','1d6','Slashing',['Finesse','Light'],'Nick','3 lb.','25 gp'),
 ('Shortsword','Martial Melee','1d6','Piercing',['Finesse','Light'],'Vex','2 lb.','10 gp'),
 ('Trident','Martial Melee','1d8','Piercing',['Thrown (20/60)','Versatile (1d10)'],'Topple','4 lb.','5 gp'),
 ('Warhammer','Martial Melee','1d8','Bludgeoning',['Versatile (1d10)'],'Push','5 lb.','15 gp'),
 ('War Pick','Martial Melee','1d8','Piercing',['Versatile (1d10)'],'Sap','2 lb.','5 gp'),
 ('Whip','Martial Melee','1d4','Slashing',['Finesse','Reach'],'Slow','3 lb.','2 gp'),
 ('Blowgun','Martial Ranged','1','Piercing',['Ammunition (25/100; Needle)','Loading'],'Vex','1 lb.','10 gp'),
 ('Hand Crossbow','Martial Ranged','1d6','Piercing',['Ammunition (30/120; Bolt)','Light','Loading'],'Vex','3 lb.','75 gp'),
 ('Heavy Crossbow','Martial Ranged','1d10','Piercing',['Ammunition (100/400; Bolt)','Heavy','Loading','Two-Handed'],'Push','18 lb.','50 gp'),
 ('Longbow','Martial Ranged','1d8','Piercing',['Ammunition (150/600; Arrow)','Heavy','Two-Handed'],'Slow','2 lb.','50 gp'),
 ('Musket','Martial Ranged','1d12','Piercing',['Ammunition (40/120; Bullet)','Loading','Two-Handed'],'Slow','10 lb.','500 gp'),
 ('Pistol','Martial Ranged','1d10','Piercing',['Ammunition (30/90; Bullet)','Loading'],'Vex','3 lb.','250 gp'),
]
for n, cat, d, t, props, mas, wt, cost in W:
    fm = f'---\ntype: weapon\ncategory: {cat}\ndamage: {q(d)}\ndamage_type: {t}\nproperties: {q(props)}\nmastery: {mas}\nweight: {q(wt)}\ncost: {q(cost)}\nmagic_bonus: 0\nrarity: ""\nholder: ""\nquantity: 1\nsource: SRD 5.2\ntags: [armory, weapon]\n---\n'
    body = f'# {n}\n\n> [!info] {cat} weapon\n> **Damage:** {d} {t}\n> **Properties:** {", ".join(props) or "—"}\n> **Mastery:** [[Weapon Mastery|{mas}]]\n> **Weight:** {wt} · **Cost:** {cost}\n\n## Owned copies\n```dm-list\nwhere: base\nfields: [holder, quantity]\nempty: No one owns one yet — open this note and use the command Give this item to a character.\n```\n' + SRC
    w(f'Armory/Weapons/{n}.md', fm + body)

A = [  # name, cat, ac, str, stealth, weight, cost
 ('Padded Armor','Light','11 + Dex modifier','','Disadvantage','8 lb.','5 gp'),
 ('Leather Armor','Light','11 + Dex modifier','','','10 lb.','10 gp'),
 ('Studded Leather Armor','Light','12 + Dex modifier','','','13 lb.','45 gp'),
 ('Hide Armor','Medium','12 + Dex modifier (max 2)','','','12 lb.','10 gp'),
 ('Chain Shirt','Medium','13 + Dex modifier (max 2)','','','20 lb.','50 gp'),
 ('Scale Mail','Medium','14 + Dex modifier (max 2)','','Disadvantage','45 lb.','50 gp'),
 ('Breastplate','Medium','14 + Dex modifier (max 2)','','','20 lb.','400 gp'),
 ('Half Plate Armor','Medium','15 + Dex modifier (max 2)','','Disadvantage','40 lb.','750 gp'),
 ('Ring Mail','Heavy','14','','Disadvantage','40 lb.','30 gp'),
 ('Chain Mail','Heavy','16','13','Disadvantage','55 lb.','75 gp'),
 ('Splint Armor','Heavy','17','15','Disadvantage','60 lb.','200 gp'),
 ('Plate Armor','Heavy','18','15','Disadvantage','65 lb.','1,500 gp'),
 ('Shield','Shield','+2','','','6 lb.','10 gp'),
]
DON = {'Light': '1 minute to don, 1 minute to doff', 'Medium': '5 minutes to don, 1 minute to doff', 'Heavy': '10 minutes to don, 5 minutes to doff', 'Shield': 'Utilize action to don or doff'}
for n, cat, ac, st, sth, wt, cost in A:
    fm = f'---\ntype: armor\ncategory: {cat}\nac: {q(ac)}\nstrength: {q(st)}\nstealth: {q(sth)}\nweight: {q(wt)}\ncost: {q(cost)}\nmagic_bonus: 0\nrarity: ""\nholder: ""\nquantity: 1\nsource: SRD 5.2\ntags: [armory, armor]\n---\n'
    body = f'# {n}\n\n> [!info] {cat}{"" if cat=="Shield" else " armor"}\n> **AC:** {ac} · **Strength:** {st or "—"} · **Stealth:** {sth or "—"}\n> **Weight:** {wt} · **Cost:** {cost}\n> **Don/doff:** {DON[cat]}\n\n' + ('If you wear heavy armor without meeting its Strength requirement, your Speed drops by 10 feet.\n\n' if st else '') + '## Owned copies\n```dm-list\nwhere: base\nfields: [holder]\nempty: No one owns one yet.\n```\n' + SRC
    w(f'Armory/Armor/{n}.md', fm + body)

G = [  # name, category, cost, weight, desc
 ('Backpack','Adventuring Gear','2 gp','5 lb.','Holds up to 30 pounds of gear.'),
 ('Bedroll','Adventuring Gear','1 gp','7 lb.',''),
 ('Rope (50 feet)','Adventuring Gear','1 gp','5 lb.','Can be burst with a DC 20 Strength (Athletics) check.'),
 ('Torch','Adventuring Gear','1 cp','1 lb.','Burns for 1 hour: bright light 20 ft, dim light 20 ft more.'),
 ('Rations (1 day)','Consumable','5 sp','2 lb.',''),
 ('Waterskin','Adventuring Gear','2 sp','5 lb. (full)',''),
 ('Tinderbox','Adventuring Gear','5 sp','1 lb.','Light a torch or similar as a Bonus Action.'),
 ('Lantern, Hooded','Adventuring Gear','5 gp','2 lb.','Bright light 30 ft and dim light 30 ft more; burns 6 hours per flask of oil.'),
 ('Oil (flask)','Consumable','1 sp','1 lb.','Fuel a lantern, or splash and ignite for a little extra fire damage.'),
 ('Crowbar','Adventuring Gear','2 gp','5 lb.','Advantage on Strength checks where leverage helps.'),
 ('Grappling Hook','Adventuring Gear','2 gp','4 lb.',''),
 ('Ball Bearings','Adventuring Gear','1 gp','2 lb.','Spread over a 10-foot square; creatures entering it may fall Prone.'),
 ('Caltrops','Adventuring Gear','1 gp','2 lb.','Cover a 5-foot square; creatures entering it may take Piercing damage and slow down.'),
 ('Climber\'s Kit','Adventuring Gear','25 gp','12 lb.',''),
 ('Healer\'s Kit','Consumable','5 gp','3 lb.','10 uses; stabilise an Unconscious creature without a Wisdom (Medicine) check.'),
 ('Antitoxin','Consumable','50 gp','—','Advantage on saves to avoid or end the Poisoned condition for 1 hour.'),
 ('Alchemist\'s Fire','Consumable','50 gp','1 lb.','Thrown flask of sticky fire.'),
 ('Acid','Consumable','25 gp','1 lb.','Thrown vial of corrosive acid.'),
 ('Holy Water','Consumable','25 gp','1 lb.','Harms Fiends and Undead.'),
 ('Potion of Healing','Consumable','50 gp','1/2 lb.','Regain 2d4 + 2 Hit Points.'),
 ('Manacles','Adventuring Gear','2 gp','6 lb.',''),
 ('Spyglass','Adventuring Gear','1,000 gp','1 lb.','Objects appear twice as close.'),
 ('Tent','Adventuring Gear','2 gp','20 lb.','Sleeps up to two Small or Medium creatures.'),
 ('Arrows (20)','Ammunition','1 gp','1 lb.',''),
 ('Bolts (20)','Ammunition','1 gp','1.5 lb.',''),
 ('Sling Bullets (20)','Ammunition','4 cp','1.5 lb.',''),
 ('Thieves\' Tools','Tool','25 gp','1 lb.','Pick locks and disarm traps.'),
 ('Herbalism Kit','Tool','5 gp','3 lb.','Identify plants; craft Antitoxin and Potions of Healing.'),
 ('Disguise Kit','Tool','25 gp','3 lb.',''),
 ('Smith\'s Tools','Tool','20 gp','8 lb.',''),
 ('Component Pouch','Adventuring Gear','25 gp','2 lb.','Holds the free material components a spell needs.'),
 ('Holy Symbol','Adventuring Gear','5 gp','1 lb.','A divine spellcasting focus.'),
 ('Spellbook','Adventuring Gear','50 gp','3 lb.','100 pages for recording wizard spells.'),
 ('Explorer\'s Pack','Pack','10 gp','55 lb.','Backpack, bedroll, oil, rations, rope, tinderbox, torches, waterskin.'),
 ('Dungeoneer\'s Pack','Pack','12 gp','55 lb.','Backpack, caltrops, crowbar, oil, rations, rope, tinderbox, torches, waterskin.'),
 ('Traveler\'s Clothes','Clothing','2 gp','4 lb.',''),
 ('Riding Horse','Mount & Vehicle','75 gp','—','Speed 60 ft.'),
]
for n, cat, cost, wt, d in G:
    fm = f'---\ntype: gear\ncategory: {q(cat)}\ncost: {q(cost)}\nweight: {q(wt)}\nholder: ""\nquantity: 1\nsource: SRD 5.2\ntags: [armory, gear]\n---\n'
    body = f'# {n}\n\n> [!info] {cat}\n> **Cost:** {cost} · **Weight:** {wt}\n\n{d}\n\n## Owned copies\n```dm-list\nwhere: base\nfields: [holder, quantity]\nempty: No one owns one yet.\n```\n' + SRC
    w(f'Armory/Gear/{n}.md', fm + body)

# move the example magic item into the armory
old = os.path.join(V, 'World/Items/Shard of the Ashen Crown.md')
if os.path.exists(old):
    os.makedirs(os.path.join(V, 'Armory/Magic Items'), exist_ok=True)
    txt = open(old).read().replace('type: item\n', 'type: item\nitem_type: Wondrous Item\n')
    open(os.path.join(V, 'Armory/Magic Items/Shard of the Ashen Crown.md'), 'w').write(txt)
    shutil.rmtree(os.path.join(V, 'World/Items'))

# example owned copies for the party
def owned(base, kind, holder, extra_fm, note):
    src = open(os.path.join(V, f'Armory/{kind}/{base}.md')).read()
    fm, body = src.split('\n---\n', 1)
    fm = fm.replace('holder: ""', f'holder: "[[{holder}]]"').replace('source: SRD 5.2', f'base: "[[{base}]]"' + extra_fm)
    short = {'Brother Halvard': 'Halvard'}.get(holder, holder.split()[0])
    body = body.replace(f'# {base}', f'# {base} ({short})\n\n*Copy of [[{base}]] held by [[{holder}]].* {note}', 1)
    body = body.split('## Owned copies')[0]
    w(f'Armory/{kind}/{base} ({short}).md', fm + '\n---\n' + body + '## Notes\n- \n')
owned('Longsword', 'Weapons', 'Kestrel', '', 'Her old caravan blade, notched from the ambush.')
owned('Chain Mail', 'Armor', 'Kestrel', '', '')
owned('Shortsword', 'Weapons', 'Mira Thorne', '', 'Balanced for throwing — she says.')
owned('Shortbow', 'Weapons', 'Mira Thorne', '', '')
owned('Mace', 'Weapons', 'Brother Halvard', '', 'Engraved with his order\'s prayer.')
owned('Shield', 'Armor', 'Brother Halvard', '', '')
owned('Healer\'s Kit', 'Gear', 'Brother Halvard', '', '')

w('Armory/Armory Index.md', '''# Armory

```dm-actions
armory
weapon
armor
gear
item
give
```

Every weapon, armor, gear and magic item is a note. **Catalog** entries (no `holder`) are the 2024 equipment reference. **Owned** copies have a `holder` (a player character link, or `Party stash`) and a `base` link back to the catalog entry.

- **Give an item:** open any catalog item → command palette → *DM Codex: Give this item to a character*. A copy is created and linked to the character and to the catalog entry.
- **New / homebrew items:** the buttons above (or *DM Codex: New Weapon*, *New Armor*, *New Gear*, *New Magic Item*) open a form with a live preview.
- **Monster attacks:** in the monster builder, *Attack…* → *From Armory* fills in the weapon's dice, type and range.
- The dashboard's **Armory** tab shows the whole party inventory grouped by character.

## Party inventory
```dm-list
type: [weapon, armor, gear, item]
holder: "!"
fields: [type, holder, quantity]
sort: holder
```

## Weapons
```dm-list
type: weapon
folder: Armory/Weapons
holder: ""
sort: category
fields: [category, damage, damage_type, properties, mastery, cost]
```

## Armor
```dm-list
type: armor
holder: ""
fields: [category, ac, strength, stealth, cost]
```

## Gear
```dm-list
type: gear
holder: ""
sort: category
fields: [category, cost, weight]
```

## Magic items
```dm-list
type: item
fields: [item_type, rarity, attunement, holder]
```
''' + SRC)
print('armory done')
