/*
 * DM Codex — campaign management for Dungeon Masters.
 * Plain JavaScript (no build step), modelled on the Hearthbound Codex approach.
 * Everything renders through code-block processors so it works in Live Preview.
 */
'use strict';

const obsidian = require('obsidian');
const {
  Plugin, ItemView, Modal, FuzzySuggestModal, Notice, PluginSettingTab, Setting,
  TFile, normalizePath, MarkdownRenderer, parseYaml, Keymap, Component,
} = obsidian;

/* Icon helper with fallbacks for older Obsidian versions whose bundled Lucide lacks newer names. */
const ICON_FALLBACKS = { 'user-round': ['user-2', 'user'], 'wand-sparkles': ['wand-2', 'wand', 'sparkles'], 'arrow-down-wide-narrow': ['sort-desc', 'arrow-down'], 'scroll-text': ['scroll', 'file-text'], 'flask-conical': ['flask-round', 'beaker'], 'dices': ['dice-5', 'dice'], 'dice-5': ['dices', 'dice'], 'backpack': ['briefcase', 'package'], 'list-ordered': ['list'], 'eye-off': ['eye'], 'swords': ['sword', 'crosshair'], 'sword': ['swords', 'crosshair'], 'store': ['shopping-bag', 'home'], 'table': ['table-2', 'grid'], 'crown': ['award', 'star'], 'castle': ['home'], 'hand': ['gift'], 'layers': ['copy'], 'wand': ['wand-2', 'sparkles'], 'skull': ['ghost', 'alert-triangle'], 'beer': ['coffee', 'cup-soda'], 'hammer': ['wrench'], 'text-cursor-input': ['type', 'edit'], 'file-plus': ['file', 'plus'], 'user-plus': ['user', 'plus'] };
function setIcon(el, name) {
  const tryOne = n => { try { if (el.empty) el.empty(); obsidian.setIcon(el, n); } catch (e) { return false; } return !!(el.querySelector && el.querySelector('svg')); };
  if (tryOne(name)) return;
  for (const alt of (ICON_FALLBACKS[name] || [])) if (tryOne(alt)) return;
  tryOne('circle');
}

const VIEW_TYPE = 'dm-codex-dashboard';

/* ------------------------------------------------------------------ */
/* Note types                                                          */
/* ------------------------------------------------------------------ */

const TYPES = {
  session: { label: 'Session', plural: 'Sessions', icon: 'scroll-text', folder: 'Campaign/Sessions' },
  player:  { label: 'Player Character', plural: 'Party', icon: 'users', folder: 'Campaign/Party' },
  quest:   { label: 'Quest', plural: 'Quests', icon: 'map', folder: 'Campaign/Quests' },
  npc:     { label: 'NPC', plural: 'NPCs', icon: 'user-round', folder: 'World/NPCs' },
  place:   { label: 'Place', plural: 'Places', icon: 'map-pin', folder: 'World/Places' },
  faction: { label: 'Faction', plural: 'Factions', icon: 'flag', folder: 'World/Factions' },
  item:    { label: 'Magic Item', plural: 'Magic Items', icon: 'gem', folder: 'Armory/Magic Items' },
  weapon:  { label: 'Weapon', plural: 'Weapons', icon: 'sword', folder: 'Armory/Weapons' },
  armor:   { label: 'Armor', plural: 'Armor', icon: 'shield', folder: 'Armory/Armor' },
  gear:    { label: 'Gear', plural: 'Gear', icon: 'backpack', folder: 'Armory/Gear' },
  idea:    { label: 'Idea', plural: 'Ideas', icon: 'lightbulb', folder: 'Planning/Ideas' },
  arc:     { label: 'Story Arc', plural: 'Arcs', icon: 'git-branch', folder: 'Planning/Arcs' },
  prep:    { label: 'Session Prep', plural: 'Prep', icon: 'clipboard-list', folder: 'Planning/Session Prep' },
  monster: { label: 'Monster', plural: 'Bestiary', icon: 'skull', folder: 'Bestiary' },
  encounter: { label: 'Encounter', plural: 'Encounters', icon: 'swords', folder: 'Campaign/Encounters' },
  spell: { label: 'Spell', plural: 'Spells', icon: 'wand-sparkles', folder: 'Rules 2024/Spells' },
};

const TEMPLATE_FILES = {
  session: 'Session', player: 'Player Character', quest: 'Quest', npc: 'NPC', place: 'Place',
  faction: 'Faction', item: 'Item', idea: 'Idea', arc: 'Story Arc', prep: 'Session Prep', monster: 'Monster', encounter: 'Encounter', spell: 'Spell', weapon: 'Weapon', armor: 'Armor', gear: 'Gear',
};

const DEFAULT_SETTINGS = {
  campaignName: 'My Campaign',
  templatesFolder: 'Templates',
  sideQuestTablesNote: 'DM Tools/Side Quest Tables.md',
  npcTablesNote: 'DM Tools/NPC Tables.md',
  insertLinkOnCreate: true,
  openNewNote: true,
  folders: Object.fromEntries(Object.entries(TYPES).map(([k, v]) => [k, v.folder])),
  dashboardTab: 'overview',
  contentVersion: null,
  managed: {},
};

/* ------------------------------------------------------------------ */
/* Dice                                                                */
/* ------------------------------------------------------------------ */

function rnd(n) { return Math.floor(Math.random() * n) + 1; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/**
 * Roll a dice expression. Supports: 1d20+5, d20 adv, 1d20 dis, 4d6kh3, 2d6+1d4-1, 8d6.
 * Returns { total, detail } or throws on bad input.
 */
function rollDice(input) {
  let expr = String(input).trim().toLowerCase();
  let mode = null;
  const m = expr.match(/\s+(adv|advantage|dis|disadvantage)$/);
  if (m) { mode = m[1].startsWith('adv') ? 'adv' : 'dis'; expr = expr.slice(0, m.index); }
  expr = expr.replace(/\s+/g, '').replace(/^\+/, '');
  if (!expr) throw new Error('Empty roll');
  const re = /([+-])?(?:(\d*)d(\d+)(k[hl]\d+)?|(\d+))/gy;
  let total = 0, parts = [], pos = 0, first = true, usedMode = false;
  while (pos < expr.length) {
    re.lastIndex = pos;
    const t = re.exec(expr);
    if (!t || t[0] === '') throw new Error('Cannot parse "' + input + '"');
    if (!first && !t[1]) throw new Error('Cannot parse "' + input + '"');
    pos = re.lastIndex; first = false;
    const sign = t[1] === '-' ? -1 : 1;
    const signStr = parts.length ? (sign < 0 ? ' − ' : ' + ') : (sign < 0 ? '−' : '');
    if (t[3]) {
      let count = parseInt(t[2] || '1', 10), sides = parseInt(t[3], 10);
      if (count > 200 || sides > 1000 || sides < 1) throw new Error('Too many dice');
      let keep = t[4];
      if (!keep && mode && !usedMode && sides === 20 && count === 1) {
        count = 2; keep = mode === 'adv' ? 'kh1' : 'kl1'; usedMode = true;
      }
      const rolls = Array.from({ length: count }, () => rnd(sides));
      let kept = rolls.map((v, i) => ({ v, i, keep: true }));
      if (keep) {
        const n = parseInt(keep.slice(2), 10);
        const sorted = [...kept].sort((a, b) => keep[1] === 'h' ? b.v - a.v : a.v - b.v);
        const keepSet = new Set(sorted.slice(0, n).map(x => x.i));
        kept = kept.map(x => ({ ...x, keep: keepSet.has(x.i) }));
      }
      const sum = kept.filter(x => x.keep).reduce((a, x) => a + x.v, 0);
      total += sign * sum;
      const shown = kept.map(x => {
        let s = String(x.v);
        if (sides === 20 && x.keep && x.v === 20) s = '**20**';
        if (sides === 20 && x.keep && x.v === 1) s = '_1_';
        return x.keep ? s : '~~' + x.v + '~~';
      }).join(', ');
      parts.push(signStr + (t[2] || '1').replace(/^$/, '1') + 'd' + sides + (t[4] || '') + ' [' + shown + ']');
    } else {
      const n = parseInt(t[5], 10);
      total += sign * n;
      parts.push(signStr + n);
    }
  }
  return { total, detail: parts.join('') + (mode ? ' (' + mode + ')' : '') };
}

function rollAndNotify(expr, label) {
  try {
    const r = rollDice(expr);
    new Notice((label ? label + ': ' : '') + r.total + '\n' + r.detail.replace(/\*\*|~~|_/g, ''), 6000);
    return r;
  } catch (e) { new Notice('Dice: ' + e.message); return null; }
}

/* ------------------------------------------------------------------ */
/* Generator tables                                                    */
/* ------------------------------------------------------------------ */

const SIDE_QUEST_TABLES = {
  giver: [
    'a nervous tavern keeper', 'a retired adventurer with a limp', 'a child who saw something', 'a temple acolyte',
    'a merchant with a missing caravan', 'a guard captain short on soldiers', 'a hedge witch at the edge of town',
    'a noble\'s steward who speaks in whispers', 'a dying messenger', 'a talking crow', 'a dwarven miner covered in soot',
    'a halfling courier who lost her parcel', 'a ghost who does not know it is dead', 'a rival adventuring party',
    'a farmer whose livestock vanished', 'an innocent-looking bard', 'the local magistrate', 'a sealed letter with no sender',
  ],
  hook: [
    'Someone has been stealing gravestones — only the names, chiselled clean off.',
    'The well water has started tasting of copper and whispering at night.',
    'A wedding is tomorrow and the groom has vanished.',
    'Strange lights hover over the marsh every third night.',
    'A wanted poster shows one of the party\'s faces.',
    'The town bell rang by itself at midnight — thirteen times.',
    'A shipment of medicine never arrived, and the fever is spreading.',
    'A map tattooed on a corpse washes up on the riverbank.',
    'Every dog in town has fled into the woods.',
    'A local festival needs a champion after the last one was cursed.',
    'Someone is selling potions that work a little too well.',
    'A bridge toll is being collected by something that is not a troll.',
    'An old statue in the square has turned to face a different direction.',
    'A scholar needs an escort to a ruin she swears is not dangerous.',
    'Children are sleepwalking to the same hill each night.',
    'A debt collector demands payment for a loan someone took in the party\'s name.',
  ],
  objective: [
    'recover a stolen heirloom', 'escort someone safely', 'find a missing person', 'clear out a lair',
    'deliver a sealed package unopened', 'gather a rare reagent', 'expose a liar', 'break a curse',
    'negotiate a truce', 'protect a place until dawn', 'track a creature to its den', 'retrieve a book from a flooded library',
    'win a contest', 'sabotage a rival operation', 'return something that was borrowed from the dead', 'map an unexplored passage',
  ],
  location: [
    'an abandoned watchtower', 'a sunken chapel', 'the sewers beneath the market', 'a haunted orchard',
    'a smugglers\' sea cave', 'a collapsed dwarven mine', 'a travelling carnival', 'a druid circle overgrown with thorns',
    'a noble\'s locked wine cellar', 'a ferry crossing in heavy fog', 'a burned-out wizard\'s tower', 'a goblin-run toll road',
    'an ancient barrow mound', 'a frozen lake with something beneath it', 'a monastery under a vow of silence', 'the roof of the town hall',
  ],
  complication: [
    'a rival group wants the same thing', 'the quest giver lied about one key detail', 'the weather turns deadly',
    'the target is sympathetic', 'local law enforcement gets involved', 'there is a strict time limit',
    'the way in is also the way something else gets out', 'a party member\'s past catches up with them',
    'the reward has already been promised to someone else', 'an innocent is caught in the middle',
    'the map is wrong', 'magic behaves strangely here', 'the monster is guarding its young', 'a trusted NPC is compromised',
  ],
  twist: [
    'the "villain" was trying to prevent something worse', 'the quest giver is the real culprit',
    'the missing person left on purpose', 'the treasure is cursed', 'it is all a test by a powerful patron',
    'two separate problems turn out to be connected', 'the creature is intelligent and willing to bargain',
    'someone the party trusts set this up', 'the location is a doorway to somewhere else',
    'the stolen item was never stolen — it was hidden', 'there are two of them', 'nothing — it is exactly what it seemed',
  ],
  reward: [
    'a purse of gold (about 50 gp per character level)', 'an uncommon magic item', 'a favour from a local power',
    'free room and board for life at the inn', 'a deed to a run-down property', 'a map to a greater treasure',
    'a rare spell scroll', 'a trained animal companion', 'a secret about a party member\'s past',
    'membership in a guild or order', 'a masterwork weapon or armour', 'a potion of healing per party member',
    'a seat at the next council meeting', 'an introduction to someone important',
  ],
  urgency: ['today', 'within three days', 'before the next full moon', 'whenever convenient (it is not)', 'immediately — lives are at stake', 'before the festival ends'],
};

const NPC_TABLES = {
  first: ['Aldric', 'Bryn', 'Cassia', 'Dorin', 'Elowen', 'Fenwick', 'Gilda', 'Hollis', 'Isolde', 'Jory', 'Kesra', 'Lorcan', 'Mabel', 'Nim', 'Orrin', 'Perrin', 'Quill', 'Rosalind', 'Sable', 'Tobin', 'Ulla', 'Vesper', 'Wren', 'Yorick', 'Zara', 'Thessaly', 'Marrow', 'Ilse', 'Bram', 'Odile'],
  last: ['Ashdown', 'Blackwood', 'Copperkettle', 'Dunmore', 'Emberly', 'Fairweather', 'Greythorn', 'Hollowell', 'Ironside', 'Juniper', 'Kettleburn', 'Larkspur', 'Moorfield', 'Nettlebrook', 'Oakhart', 'Pennywhistle', 'Quarry', 'Ravensworth', 'Stonebridge', 'Thistledown', 'Underhill', 'Vane', 'Whitlock', 'Yarrow'],
  species: ['Human', 'Human', 'Human', 'Dwarf', 'Elf', 'Halfling', 'Gnome', 'Dragonborn', 'Tiefling', 'Orc', 'Goliath', 'Aasimar'],
  occupation: ['innkeeper', 'blacksmith', 'priest', 'guard', 'farmer', 'merchant', 'sage', 'thief', 'noble', 'sailor', 'hunter', 'herbalist', 'bard', 'beggar', 'mercenary', 'scribe', 'fence', 'ferryman', 'gravedigger', 'alchemist'],
  appearance: ['missing two fingers', 'immaculately dressed', 'covered in old burn scars', 'unusually tall', 'wears a wide-brimmed hat indoors', 'mismatched eyes', 'braided beard with beads', 'smells strongly of lavender', 'nervous twitch', 'elaborate tattoos', 'always chewing something', 'freckled and sunburnt'],
  voice: ['speaks very slowly', 'whispers everything', 'booming laugh', 'answers questions with questions', 'uses outdated slang', 'constantly name-drops', 'never makes eye contact', 'overly formal', 'hums between sentences', 'finishes other people\'s sentences'],
  want: ['to pay off a debt', 'revenge on a former partner', 'to leave town for good', 'to protect a family member', 'recognition from their guild', 'a cure for a sick friend', 'to find a lost sibling', 'to be left alone', 'power over the town council', 'to see the ocean once'],
  secret: ['is a spy for a rival faction', 'murdered someone years ago', 'is secretly noble-born', 'owes money to a crime boss', 'is a lycanthrope', 'knows where the treasure is buried', 'is in love with the party\'s enemy', 'can\'t read', 'is a retired adventurer', 'has a pact with a fiend'],
  attitude: ['friendly', 'indifferent', 'hostile', 'friendly', 'indifferent'],
};

const NAME_TABLES = {
  tavern: { a: ['The Prancing', 'The Rusty', 'The Drunken', 'The Golden', 'The Sleeping', 'The Crooked', 'The Laughing', 'The Silver', 'The Wandering', 'The Salty'], b: ['Pony', 'Dragon', 'Goblet', 'Griffon', 'Barrel', 'Mermaid', 'Anchor', 'Owlbear', 'Lantern', 'Gnome'] },
  town: { a: ['Briar', 'Stone', 'Raven', 'Ash', 'Mill', 'Thorn', 'Elder', 'Frost', 'Copper', 'Willow'], b: ['ford', 'haven', 'brook', 'hollow', 'wick', 'mere', 'stead', 'gate', 'vale', 'crest'] },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function safeName(name) { return String(name).replace(/[\\/:*?"<>|#^\[\]]/g, '').trim() || 'Untitled'; }
function stripLinks(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(stripLinks).filter(Boolean).join(', ');
  return String(v).replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, a, b) => b || a);
}
function extractLinks(v) {
  const out = [];
  const walk = x => {
    if (x == null) return;
    if (Array.isArray(x)) return x.forEach(walk);
    const s = String(x);
    const re = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]+)?\]\]/g; let m;
    while ((m = re.exec(s))) out.push(m[1].trim());
    if (!out.length && s && !s.includes('[[')) out.push(s.trim());
  };
  walk(v);
  return out;
}
/** Stop CodeMirror from turning a click on our widget into "edit source" in Live Preview. */
function lpSafe(el) {
  ['mousedown', 'pointerdown'].forEach(ev => el.addEventListener(ev, e => e.stopPropagation()));
  return el;
}
function button(parent, text, icon, onClick, cls) {
  const b = parent.createEl('button', { cls: 'dmc-btn' + (cls ? ' ' + cls : '') });
  if (icon) { const i = b.createSpan({ cls: 'dmc-btn-icon' }); setIcon(i, icon); }
  if (text) b.createSpan({ text });
  lpSafe(b);
  b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); onClick(e); });
  return b;
}
async function renderMd(app, md, el, sourcePath, component) {
  if (MarkdownRenderer.render) return MarkdownRenderer.render(app, md, el, sourcePath, component);
  return MarkdownRenderer.renderMarkdown(md, el, sourcePath, component);
}

/* ------------------------------------------------------------------ */
/* Modals                                                              */
/* ------------------------------------------------------------------ */

class PromptModal extends Modal {
  constructor(app, title, placeholder, onSubmit, opts = {}) {
    super(app); this.title = title; this.placeholder = placeholder; this.onSubmit = onSubmit; this.opts = opts;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('dmc-modal');
    contentEl.createEl('h3', { text: this.title });
    const input = contentEl.createEl('input', { type: 'text', cls: 'dmc-input', attr: { placeholder: this.placeholder || '' } });
    if (this.opts.value) input.value = this.opts.value;
    if (this.opts.hint) contentEl.createEl('p', { text: this.opts.hint, cls: 'dmc-muted' });
    const row = contentEl.createDiv({ cls: 'dmc-row' });
    const submit = () => { const v = input.value.trim(); if (!v && !this.opts.allowEmpty) return; this.close(); this.onSubmit(v); };
    button(row, this.opts.cta || 'Create', 'check', submit, 'mod-cta');
    button(row, 'Cancel', null, () => this.close());
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    setTimeout(() => input.focus(), 10);
  }
  onClose() { this.contentEl.empty(); }
}

class NoteSuggestModal extends FuzzySuggestModal {
  constructor(app, files, onChoose, placeholder, labeller) {
    super(app); this.files = files; this.onChoose = onChoose; this.labeller = labeller;
    this.setPlaceholder(placeholder || 'Choose a note…');
  }
  getItems() { return this.files; }
  getItemText(f) { return this.labeller ? this.labeller(f) : f.basename; }
  onChooseItem(f) { this.onChoose(f); }
}

class TypeSuggestModal extends FuzzySuggestModal {
  constructor(app, onChoose) { super(app); this.onChoose = onChoose; this.setPlaceholder('What do you want to create?'); }
  getItems() { return Object.keys(TYPES); }
  getItemText(k) { return TYPES[k].label; }
  onChooseItem(k) { this.onChoose(k); }
}

class DiceModal extends Modal {
  constructor(app) { super(app); }
  onOpen() {
    const { contentEl } = this; contentEl.addClass('dmc-modal');
    contentEl.createEl('h3', { text: 'Roll dice' });
    const input = contentEl.createEl('input', { type: 'text', cls: 'dmc-input', attr: { placeholder: '1d20+5 adv, 8d6, 4d6kh3 …' } });
    const out = contentEl.createDiv({ cls: 'dmc-dice-log' });
    const quick = contentEl.createDiv({ cls: 'dmc-row dmc-wrap' });
    const go = expr => {
      try { const r = rollDice(expr); const line = out.createDiv({ cls: 'dmc-dice-line' });
        line.createSpan({ cls: 'dmc-dice-total', text: String(r.total) });
        line.createSpan({ cls: 'dmc-muted', text: '  ' + expr + ' → ' + r.detail.replace(/\*\*|~~|_/g, '') });
        out.scrollTop = out.scrollHeight;
      } catch (e) { new Notice(e.message); }
    };
    ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd20 adv', 'd20 dis', 'd100', '4d6kh3'].forEach(d => button(quick, d, null, () => go(d)));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { go(input.value); } });
    setTimeout(() => input.focus(), 10);
  }
  onClose() { this.contentEl.empty(); }
}

/** Side quest generator modal (also reused inline in the dashboard and code block). */
class SideQuestModal extends Modal {
  constructor(plugin) { super(plugin.app); this.plugin = plugin; }
  onOpen() {
    this.contentEl.addClass('dmc-modal', 'dmc-wide');
    this.contentEl.createEl('h3', { text: 'Side quest generator' });
    this.plugin.renderSideQuestWidget(this.contentEl, null, () => this.close());
  }
  onClose() { this.contentEl.empty(); }
}

class NpcGenModal extends Modal {
  constructor(plugin) { super(plugin.app); this.plugin = plugin; }
  onOpen() {
    this.contentEl.addClass('dmc-modal', 'dmc-wide');
    this.contentEl.createEl('h3', { text: 'Random NPC' });
    this.plugin.renderNpcWidget(this.contentEl, null, () => this.close());
  }
  onClose() { this.contentEl.empty(); }
}

/* ------------------------------------------------------------------ */
/* Dashboard view                                                      */
/* ------------------------------------------------------------------ */

const TABS = [
  ['overview', 'Overview', 'castle'],
  ['session', 'Sessions', 'scroll-text'],
  ['player', 'Party', 'users'],
  ['npc', 'NPCs', 'user-round'],
  ['place', 'Places', 'map-pin'],
  ['quest', 'Quests', 'map'],
  ['faction', 'Factions', 'flag'],
  ['encounter', 'Encounters', 'swords'],
  ['monster', 'Bestiary', 'skull'],
  ['armory', 'Armory', 'sword'],
  ['spell', 'Spells', 'wand-sparkles'],
  ['idea', 'Ideas & Arcs', 'lightbulb'],
  ['shops', 'Taverns & Shops', 'store'],
  ['tables', 'Random Tables', 'table'],
  ['tools', 'Generators', 'dices'],
];

const COLUMNS = {
  session: ['session_number', 'date', 'status'],
  player: ['player', 'species', 'class', 'level', 'ac', 'hp_max', 'passive_perception'],
  npc: ['role', 'location', 'faction', 'attitude', 'status'],
  place: ['place_type', 'region', 'parent'],
  quest: ['status', 'giver', 'location', 'reward'],
  faction: ['alignment', 'leader', 'base', 'attitude'],
  item: ['item_type', 'rarity', 'attunement', 'holder'],
  weapon: ['category', 'damage', 'damage_type', 'properties', 'mastery', 'cost', 'holder'],
  armor: ['category', 'ac', 'strength', 'stealth', 'cost', 'holder'],
  gear: ['category', 'cost', 'weight', 'quantity', 'holder'],
  idea: ['status', 'category'],
  arc: ['status', 'act'],
  prep: ['for_session', 'date'],
  monster: ['cr', 'creature_type', 'villain', 'environment'],
  encounter: ['difficulty', 'xp', 'location', 'session', 'status'],
  spell: ['level', 'school', 'casting_time', 'range', 'concentration', 'classes'],
};

class DashboardView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.tab = plugin.settings.dashboardTab || 'overview'; this.filter = ''; }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'DM Codex'; }
  getIcon() { return 'swords'; }
  async onOpen() {
    this.render();
    const refresh = obsidian.debounce ? obsidian.debounce(() => this.render(), 400, true) : () => this.render();
    this.registerEvent(this.app.metadataCache.on('changed', refresh));
    this.registerEvent(this.app.vault.on('delete', refresh));
    this.registerEvent(this.app.vault.on('rename', refresh));
  }
  render() {
    const el = this.contentEl; el.empty(); el.addClass('dmc-dashboard');
    const header = el.createDiv({ cls: 'dmc-header' });
    header.createEl('h2', { text: this.plugin.settings.campaignName });
    header.createDiv({ cls: 'dmc-muted', text: 'DM Codex · ' + today() });
    const tabs = el.createDiv({ cls: 'dmc-tabs' });
    for (const [key, label, icon] of TABS) {
      const t = button(tabs, label, icon, () => { this.tab = key; this.filter = ''; this.plugin.settings.dashboardTab = key; this.plugin.saveSettings(); this.render(); }, 'dmc-tab' + (this.tab === key ? ' is-active' : ''));
      t.setAttr('aria-label', label);
    }
    const body = el.createDiv({ cls: 'dmc-body' });
    if (this.tab === 'overview') this.renderOverview(body);
    else if (this.tab === 'tools') this.renderTools(body);
    else if (this.tab === 'idea') { this.renderList(body, 'idea'); this.renderList(body, 'arc'); this.renderList(body, 'prep'); }
    else if (this.tab === 'faction') { this.renderList(body, 'faction'); }
    else if (this.tab === 'armory') { this.plugin.renderArmory(body); ['weapon', 'armor', 'gear', 'item'].forEach(k => this.renderList(body, k)); }
    else if (this.tab === 'shops') { const c = body.createDiv({ cls: 'dmc-card' }); this.plugin.renderShopWidget(c, null, {}); }
    else if (this.tab === 'tables') { this.plugin.renderTablesPanel(body); }
    else if (this.tab === 'monster' || this.tab === 'encounter') {
      const bar = body.createDiv({ cls: 'dmc-row dmc-wrap', attr: { style: 'margin-bottom:8px' } });
      const run = id => { if (!this.app.commands.executeCommandById(id)) new Notice('Enable the DM Statblocks plugin.'); };
      if (this.tab === 'monster') { button(bar, 'Build a monster', 'skull', () => run('dm-statblocks:new-monster'), 'mod-cta'); button(bar, 'Build a villain', 'crown', () => run('dm-statblocks:new-villain')); button(bar, 'Random monster', 'dices', () => run('dm-statblocks:random-monster')); }
      else { button(bar, 'Build an encounter', 'swords', () => run('dm-statblocks:new-encounter'), 'mod-cta'); button(bar, 'Suggest a random encounter', 'sparkles', () => run('dm-statblocks:suggest-encounter')); button(bar, 'Initiative tracker', 'list-ordered', () => run('dm-statblocks:open-tracker')); }
      this.renderList(body, this.tab);
    }
    else this.renderList(body, this.tab);
  }
  link(parent, file, text) {
    const a = parent.createEl('a', { cls: 'internal-link', text: text || file.basename, href: file.path });
    a.addEventListener('click', e => { e.preventDefault(); this.app.workspace.openLinkText(file.path, '', Keymap.isModEvent(e)); });
    a.addEventListener('mouseover', e => this.app.workspace.trigger('hover-link', { event: e, source: VIEW_TYPE, hoverParent: this, targetEl: a, linktext: file.path }));
    return a;
  }
  renderOverview(body) {
    const p = this.plugin;
    if (p.availableContentVersion && p.availableContentVersion !== p.settings.contentVersion) {
      const up = body.createDiv({ cls: 'dmc-card dmc-update-banner' });
      up.createDiv({ text: 'DM Vault content v' + p.availableContentVersion + ' is ready to install. New notes are added and unedited ones refreshed — anything you\'ve edited is kept.' });
      button(up, 'Review & update', 'download', () => p.runContentUpdate(), 'mod-cta');
    }
    const actions = body.createDiv({ cls: 'dmc-card' });
    actions.createEl('h4', { text: 'Quick create' });
    const row = actions.createDiv({ cls: 'dmc-row dmc-wrap' });
    for (const k of ['session', 'prep', 'encounter', 'player', 'npc', 'place', 'quest', 'faction', 'item', 'idea', 'arc', 'monster']) {
      button(row, TYPES[k].label, TYPES[k].icon, () => p.promptCreate(k));
    }
    const row2 = actions.createDiv({ cls: 'dmc-row dmc-wrap' });
    button(row2, 'Side quest', 'sparkles', () => new SideQuestModal(p).open());
    button(row2, 'Random NPC', 'user-plus', () => new NpcGenModal(p).open());
    button(row2, 'Dice', 'dices', () => new DiceModal(this.app).open());
    button(row2, 'Tavern / shop', 'store', () => new ShopModal(p, 'tavern').open());
    button(row2, 'Random table', 'table', () => p.openTablePicker());
    if (this.app.commands && this.app.commands.commands['dm-statblocks:random-monster']) button(row2, 'Random monster', 'skull', () => this.app.commands.executeCommandById('dm-statblocks:random-monster'));
    if (this.app.commands && this.app.commands.commands['dm-statblocks:open-tracker'])
      button(row2, 'Initiative tracker', 'swords', () => this.app.commands.executeCommandById('dm-statblocks:open-tracker'));

    const stats = body.createDiv({ cls: 'dmc-stats' });
    for (const k of ['session', 'player', 'npc', 'place', 'quest', 'encounter', 'monster', 'idea']) {
      const n = p.getNotes(k).length;
      const s = stats.createDiv({ cls: 'dmc-stat' }); lpSafe(s);
      const ic = s.createDiv({ cls: 'dmc-stat-icon' }); setIcon(ic, TYPES[k].icon);
      s.createDiv({ cls: 'dmc-stat-num', text: String(n) });
      s.createDiv({ cls: 'dmc-stat-label', text: TYPES[k].plural });
      s.addEventListener('click', () => { this.tab = k; this.render(); });
    }

    const grid = body.createDiv({ cls: 'dmc-grid' });
    // Latest + next session
    const sessions = p.getSessionsSorted();
    const c1 = grid.createDiv({ cls: 'dmc-card' }); c1.createEl('h4', { text: 'Sessions' });
    if (!sessions.length) c1.createDiv({ cls: 'dmc-muted', text: 'No sessions yet.' });
    sessions.slice(-5).reverse().forEach(f => {
      const fm = p.fm(f); const r = c1.createDiv({ cls: 'dmc-line' });
      this.link(r, f); r.createSpan({ cls: 'dmc-pill', text: fm.status || '' }); r.createSpan({ cls: 'dmc-muted', text: ' ' + (fm.date || '') });
    });
    // Party
    const c2 = grid.createDiv({ cls: 'dmc-card' }); c2.createEl('h4', { text: 'Party' });
    const party = p.getNotes('player').filter(f => (p.fm(f).status || 'active') === 'active');
    if (!party.length) c2.createDiv({ cls: 'dmc-muted', text: 'No player characters yet.' });
    party.forEach(f => {
      const fm = p.fm(f); const r = c2.createDiv({ cls: 'dmc-line' });
      this.link(r, f);
      r.createSpan({ cls: 'dmc-muted', text: ' — ' + [fm.species, fm.class, fm.level ? 'Lv ' + fm.level : ''].filter(Boolean).join(' ') });
      r.createSpan({ cls: 'dmc-pill', text: 'AC ' + (fm.ac ?? '?') }); r.createSpan({ cls: 'dmc-pill', text: 'PP ' + (fm.passive_perception ?? '?') });
    });
    // Open quests
    const c3 = grid.createDiv({ cls: 'dmc-card' }); c3.createEl('h4', { text: 'Open quests' });
    const quests = p.getNotes('quest').filter(f => !['completed', 'failed', 'abandoned'].includes(String(p.fm(f).status || '').toLowerCase()));
    if (!quests.length) c3.createDiv({ cls: 'dmc-muted', text: 'No open quests.' });
    quests.forEach(f => { const r = c3.createDiv({ cls: 'dmc-line' }); this.link(r, f); r.createSpan({ cls: 'dmc-pill', text: p.fm(f).status || 'hook' }); });
    // Ideas
    const c4 = grid.createDiv({ cls: 'dmc-card' }); c4.createEl('h4', { text: 'Fresh ideas' });
    const ideas = p.getNotes('idea').filter(f => String(p.fm(f).status || 'raw') !== 'used').sort((a, b) => b.stat.mtime - a.stat.mtime).slice(0, 8);
    if (!ideas.length) c4.createDiv({ cls: 'dmc-muted', text: 'Capture ideas with “DM Codex: New Idea”.' });
    ideas.forEach(f => { const r = c4.createDiv({ cls: 'dmc-line' }); this.link(r, f); r.createSpan({ cls: 'dmc-pill', text: p.fm(f).status || 'raw' }); });
    // Recently edited world notes
    const c5 = grid.createDiv({ cls: 'dmc-card' }); c5.createEl('h4', { text: 'Recently edited' });
    const recent = ['npc', 'place', 'faction', 'quest'].flatMap(k => p.getNotes(k)).sort((a, b) => b.stat.mtime - a.stat.mtime).slice(0, 8);
    recent.forEach(f => { const r = c5.createDiv({ cls: 'dmc-line' }); this.link(r, f); r.createSpan({ cls: 'dmc-muted', text: ' ' + TYPES[p.fm(f).type]?.label }); });
  }
  renderList(body, type) {
    const p = this.plugin; const card = body.createDiv({ cls: 'dmc-card' });
    const head = card.createDiv({ cls: 'dmc-row dmc-spread' });
    const h = head.createEl('h4'); const ic = h.createSpan({ cls: 'dmc-btn-icon' }); setIcon(ic, TYPES[type].icon); h.appendText(' ' + TYPES[type].plural);
    const right = head.createDiv({ cls: 'dmc-row' });
    const search = right.createEl('input', { type: 'search', cls: 'dmc-input dmc-search', attr: { placeholder: 'Filter…' } });
    search.value = this.filter;
    button(right, 'New ' + TYPES[type].label, 'plus', () => p.promptCreate(type), 'mod-cta');
    const tableWrap = card.createDiv();
    const draw = () => {
      tableWrap.empty();
      let files = type === 'session' ? p.getSessionsSorted().reverse() : p.getNotes(type).sort((a, b) => type === 'spell' ? ((Number(p.fm(a).level) || 0) - (Number(p.fm(b).level) || 0) || a.basename.localeCompare(b.basename)) : a.basename.localeCompare(b.basename));
      const q = search.value.toLowerCase();
      if (q) files = files.filter(f => (f.basename + ' ' + JSON.stringify(p.fm(f))).toLowerCase().includes(q));
      if (!files.length) { tableWrap.createDiv({ cls: 'dmc-muted', text: 'Nothing here yet.' }); return; }
      const cols = COLUMNS[type] || [];
      const t = tableWrap.createEl('table', { cls: 'dmc-table' });
      const tr = t.createEl('thead').createEl('tr'); tr.createEl('th', { text: 'Name' });
      cols.forEach(c => tr.createEl('th', { text: c.replace(/_/g, ' ') }));
      const tb = t.createEl('tbody');
      files.forEach(f => {
        const fm = p.fm(f); const r = tb.createEl('tr');
        this.link(r.createEl('td'), f);
        cols.forEach(c => {
          const td = r.createEl('td'); const v = fm[c];
          const links = typeof v === 'string' || Array.isArray(v) ? (JSON.stringify(v).includes('[[') ? extractLinks(v) : []) : [];
          if (links.length) links.forEach((l, i) => {
            const dest = this.app.metadataCache.getFirstLinkpathDest(l, f.path);
            if (i) td.appendText(', ');
            if (dest) this.link(td, dest, l); else td.appendText(l);
          });
          else td.setText(stripLinks(v));
        });
      });
    };
    search.addEventListener('input', () => { this.filter = search.value; draw(); });
    draw();
  }
  renderTools(body) {
    const p = this.plugin;
    const c1 = body.createDiv({ cls: 'dmc-card' }); c1.createEl('h4', { text: 'Side quest generator' });
    p.renderSideQuestWidget(c1, null);
    const c2 = body.createDiv({ cls: 'dmc-card' }); c2.createEl('h4', { text: 'Random NPC' });
    p.renderNpcWidget(c2, null);
    const c3 = body.createDiv({ cls: 'dmc-card' }); c3.createEl('h4', { text: 'Dice & names' });
    const row = c3.createDiv({ cls: 'dmc-row dmc-wrap' });
    const out = c3.createDiv({ cls: 'dmc-dice-log' });
    const log = (t) => { out.createDiv({ cls: 'dmc-dice-line', text: t }); out.scrollTop = out.scrollHeight; };
    ['d20', 'd20 adv', 'd20 dis', '2d6', 'd100', '4d6kh3'].forEach(d => button(row, d, 'dice-5', () => { const r = rollDice(d); log(d + ' → ' + r.total + '   ' + r.detail.replace(/\*\*|~~|_/g, '')); }));
    button(row, 'Tavern name', 'beer', () => log('🍺 ' + pick(NAME_TABLES.tavern.a) + ' ' + pick(NAME_TABLES.tavern.b)));
    button(row, 'Town name', 'home', () => log('🏘 ' + pick(NAME_TABLES.town.a) + pick(NAME_TABLES.town.b)));
    button(row, 'NPC name', 'user', () => log('🧑 ' + pick(NPC_TABLES.first) + ' ' + pick(NPC_TABLES.last)));
  }
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

class DMCodexSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this; containerEl.empty();
    const s = this.plugin.settings;
    new Setting(containerEl).setName('Campaign name').addText(t => t.setValue(s.campaignName).onChange(async v => { s.campaignName = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Templates folder').setDesc('Notes are created from "<folder>/<Type>.md" if it exists (e.g. Templates/NPC.md). Variables: {{title}}, {{date}}, {{number}}, {{prev}}, {{campaign}}, {{link}}.')
      .addText(t => t.setValue(s.templatesFolder).onChange(async v => { s.templatesFolder = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Side quest tables note').setDesc('Extra entries for the generator. Use "## giver", "## hook", "## objective", "## location", "## complication", "## twist", "## reward", "## urgency" headings with "- " list items.')
      .addText(t => t.setValue(s.sideQuestTablesNote).onChange(async v => { s.sideQuestTablesNote = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('NPC tables note').setDesc('Extra entries for the NPC generator ("## first", "## last", "## occupation", "## want", "## secret" …).')
      .addText(t => t.setValue(s.npcTablesNote).onChange(async v => { s.npcTablesNote = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Insert link when creating from a note').setDesc('When you create an NPC/Place/etc. while editing, a [[link]] is inserted at the cursor.')
      .addToggle(t => t.setValue(s.insertLinkOnCreate).onChange(async v => { s.insertLinkOnCreate = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Open new notes').addToggle(t => t.setValue(s.openNewNote).onChange(async v => { s.openNewNote = v; await this.plugin.saveSettings(); }));
    containerEl.createEl('h3', { text: 'Folders' });
    for (const k of Object.keys(TYPES)) {
      new Setting(containerEl).setName(TYPES[k].plural).addText(t => t.setValue(s.folders[k]).onChange(async v => { s.folders[k] = v; await this.plugin.saveSettings(); }));
    }
  }
}

/* ------------------------------------------------------------------ */
/* Plugin                                                              */
/* ------------------------------------------------------------------ */

class DMCodexPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE, leaf => new DashboardView(leaf, this));
    this.addRibbonIcon('swords', 'Open DM Codex dashboard', () => this.activateView());
    this.addRibbonIcon('sparkles', 'Generate side quest', () => new SideQuestModal(this).open());
    this.addSettingTab(new DMCodexSettingTab(this.app, this));

    this.addCommand({ id: 'open-dashboard', name: 'Open dashboard', callback: () => this.activateView() });
    this.addCommand({ id: 'update-content', name: 'Update vault content (safe — never overwrites your edits)', callback: () => this.runContentUpdate() });
    this.app.workspace.onLayoutReady(() => this.checkForContentUpdate());
    this.addCommand({ id: 'create-any', name: 'Create campaign note…', callback: () => new TypeSuggestModal(this.app, k => this.promptCreate(k)).open() });
    for (const k of Object.keys(TYPES)) {
      this.addCommand({ id: 'create-' + k, name: 'New ' + TYPES[k].label, callback: () => this.promptCreate(k) });
    }
    this.addCommand({ id: 'insert-link', name: 'Insert link to campaign note…', editorCallback: (editor, ctx) => this.insertLinkPicker(editor, ctx.file, null) });
    for (const k of ['npc', 'place', 'player', 'quest', 'faction', 'session', 'monster', 'encounter', 'spell', 'weapon', 'armor', 'gear', 'item']) {
      this.addCommand({ id: 'insert-link-' + k, name: 'Insert link to ' + TYPES[k].label, editorCallback: (editor, ctx) => this.insertLinkPicker(editor, ctx.file, k) });
    }
    this.addCommand({ id: 'give-item', name: 'Give this item to a character…', callback: () => { const f = this.app.workspace.getActiveFile(); if (f) this.giveItem(f); } });
    this.addCommand({ id: 'open-armory', name: 'Open armory', callback: () => { this.settings.dashboardTab = 'armory'; this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(l => { l.view.tab = 'armory'; l.view.render(); }); this.activateView(); } });
    this.addCommand({ id: 'side-quest', name: 'Generate side quest', callback: () => new SideQuestModal(this).open() });
    this.addCommand({ id: 'random-npc', name: 'Generate random NPC', callback: () => new NpcGenModal(this).open() });
    this.addCommand({ id: 'roll-dice', name: 'Roll dice', callback: () => new DiceModal(this.app).open() });
    this.addCommand({ id: 'generate-tavern', name: 'Generate tavern / inn', callback: () => new ShopModal(this, 'tavern').open() });
    this.addCommand({ id: 'generate-shop', name: 'Generate shop (potion, general, smithy, magic…)', callback: () => new ShopModal(this, 'potion').open() });
    this.addCommand({ id: 'roll-random-table', name: 'Roll on a random table…', callback: () => this.openTablePicker() });
    this.addCommand({ id: 'open-random-tables', name: 'Open random tables', callback: () => { this.settings.dashboardTab = 'tables'; this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(l => { l.view.tab = 'tables'; l.view.render(); }); this.activateView(); } });
    this.addRibbonIcon('store', 'Generate tavern or shop', () => new ShopModal(this, 'tavern').open());
    this.addRibbonIcon('table', 'Roll on a random table', () => this.openTablePicker());
    this.addCommand({ id: 'next-session', name: 'Start next session (from latest)', callback: () => this.promptCreate('session') });
    this.addCommand({ id: 'open-latest-session', name: 'Open latest session', callback: () => {
      const s = this.getSessionsSorted(); if (s.length) this.app.workspace.getLeaf(false).openFile(s[s.length - 1]); else new Notice('No sessions yet.');
    } });

    // Code blocks — all render in Live Preview as well as Reading view.
    this.registerMarkdownCodeBlockProcessor('dice', (src, el, ctx) => this.renderDiceBlock(src, el, ctx));
    this.registerMarkdownCodeBlockProcessor('sidequest', (src, el, ctx) => {
      el.addClass('dmc-block'); lpSafe(el); this.renderSideQuestWidget(el, ctx.sourcePath);
    });
    this.registerMarkdownCodeBlockProcessor('random-npc', (src, el, ctx) => {
      el.addClass('dmc-block'); lpSafe(el); this.renderNpcWidget(el, ctx.sourcePath);
    });
    this.registerMarkdownCodeBlockProcessor('dm-list', (src, el, ctx) => this.renderListBlock(src, el, ctx));
    this.registerMarkdownCodeBlockProcessor('dm-actions', (src, el, ctx) => this.renderActionsBlock(src, el, ctx));
    this.registerMarkdownCodeBlockProcessor('roll-table', (src, el, ctx) => this.renderRollTable(src, el, ctx));
    this.registerMarkdownCodeBlockProcessor('shop', (src, el, ctx) => {
      el.addClass('dmc-block'); lpSafe(el); let o = {}; try { o = parseYaml(src) || {}; } catch (e) {}
      this.renderShopWidget(el, ctx.sourcePath, { kind: o.type || o.kind, size: o.size, autogen: false });
    });
    this.registerMarkdownCodeBlockProcessor('random-tables', (src, el, ctx) => { el.addClass('dmc-block'); lpSafe(el); this.renderTablesPanel(el); });
  }

  onunload() {}

  async loadSettings() {
    let data = await this.loadData();
    if (!data) { data = (await this.readBackup()) || {}; if (Object.keys(data).length) new Notice('DM Codex: settings restored from backup.'); }
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    this.settings.folders = Object.assign({}, DEFAULT_SETTINGS.folders, data.folders || {});
  }
  async saveSettings() { await this.saveData(this.settings); await this.writeBackup(this.settings); }
  backupPath() { return this.app.vault.configDir + '/dm-vault-' + this.manifest.id + '-settings-backup.json'; }
  async readBackup() { try { const p = this.backupPath(); if (await this.app.vault.adapter.exists(p)) return JSON.parse(await this.app.vault.adapter.read(p)); } catch (e) {} return null; }
  async writeBackup(d) { try { await this.app.vault.adapter.write(this.backupPath(), JSON.stringify(d)); } catch (e) {} }


  async activateView() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) { leaf = this.app.workspace.getLeaf('tab'); await leaf.setViewState({ type: VIEW_TYPE, active: true }); }
    this.app.workspace.revealLeaf(leaf);
  }

  /* ---------- data access ---------- */
  fm(file) { return (this.app.metadataCache.getFileCache(file) || {}).frontmatter || {}; }
  getNotes(type) {
    return this.app.vault.getMarkdownFiles().filter(f => String(this.fm(f).type || '').toLowerCase() === type && !f.path.startsWith(this.settings.templatesFolder + '/'));
  }
  getAllTyped() {
    return this.app.vault.getMarkdownFiles().filter(f => TYPES[String(this.fm(f).type || '').toLowerCase()] && !f.path.startsWith(this.settings.templatesFolder + '/'));
  }
  getSessionsSorted() {
    return this.getNotes('session').sort((a, b) => (Number(this.fm(a).session_number) || 0) - (Number(this.fm(b).session_number) || 0) || a.basename.localeCompare(b.basename));
  }
  async readTables(path, defaults) {
    const tables = {}; for (const k of Object.keys(defaults)) tables[k] = [...defaults[k]];
    const f = this.app.vault.getAbstractFileByPath(normalizePath(path));
    if (!(f instanceof TFile)) return tables;
    const text = await this.app.vault.cachedRead(f);
    let key = null; let replace = new Set();
    for (const line of text.split('\n')) {
      const h = line.match(/^#{1,6}\s+(.+?)\s*$/);
      if (h) {
        let name = h[1].toLowerCase().trim();
        const rep = /\(replace\)$/.test(name); name = name.replace(/\(replace\)$/, '').trim();
        key = name.replace(/s$/, '') in tables ? name.replace(/s$/, '') : name;
        if (!tables[key]) tables[key] = [];
        if (rep && !replace.has(key)) { tables[key] = []; replace.add(key); }
        continue;
      }
      const li = line.match(/^\s*[-*]\s+(?!\[[ xX]\])(.+)$/);
      if (key && li) tables[key].push(li[1].trim());
    }
    return tables;
  }

  /* ---------- creation ---------- */
  promptCreate(type, opts = {}) {
    const editor = this.app.workspace.activeEditor && this.app.workspace.activeEditor.editor;
    const srcFile = this.app.workspace.getActiveFile();
    if (['weapon', 'armor', 'gear', 'item', 'spell'].includes(type)) { this.openItemBuilder(type, { name: editor ? editor.getSelection() : '' }); return; }
    const viaCmd = { monster: 'dm-statblocks:new-monster', encounter: 'dm-statblocks:new-encounter' }[type];
    if (viaCmd && this.app.commands && this.app.commands.commands[viaCmd]) { this.app.commands.executeCommandById(viaCmd); return; }
    if (type === 'session') {
      const n = this.nextSessionNumber();
      new PromptModal(this.app, 'New session #' + n, 'Optional title, e.g. "The Road to Briarford"', async (title) => {
        const name = 'Session ' + String(n).padStart(3, '0') + (title ? ' - ' + title : '');
        await this.createNote('session', name, { editor, srcFile });
      }, { allowEmpty: true, cta: 'Create session' }).open();
      return;
    }
    new PromptModal(this.app, 'New ' + TYPES[type].label, 'Name', async (name) => {
      await this.createNote(type, name, { editor, srcFile, ...opts });
    }, { value: opts.value || (editor ? editor.getSelection() : '') }).open();
  }
  nextSessionNumber() {
    const nums = this.getNotes('session').map(f => Number(this.fm(f).session_number) || 0);
    return (nums.length ? Math.max(...nums) : 0) + 1;
  }
  async ensureFolder(path) {
    path = normalizePath(path); if (!path || path === '/') return;
    if (this.app.vault.getAbstractFileByPath(path)) return;
    const parts = path.split('/'); let cur = '';
    for (const p of parts) { cur = cur ? cur + '/' + p : p; if (!this.app.vault.getAbstractFileByPath(cur)) await this.app.vault.createFolder(cur); }
  }
  async loadTemplate(type) {
    const tp = normalizePath(this.settings.templatesFolder + '/' + TEMPLATE_FILES[type] + '.md');
    const f = this.app.vault.getAbstractFileByPath(tp);
    if (f instanceof TFile) return await this.app.vault.read(f);
    return '---\ntype: ' + type + '\ncampaign: "{{campaign}}"\ncreated: {{date}}\n---\n# {{title}}\n\n';
  }
  /**
   * Create a typed note from its template.
   * extra.fields: frontmatter overrides; extra.body: text appended; extra.editor: insert link there.
   */
  async createNote(type, name, extra = {}) {
    const folder = this.settings.folders[type] || TYPES[type].folder;
    await this.ensureFolder(folder);
    let base = safeName(name), path = normalizePath(folder + '/' + base + '.md'), i = 2;
    while (this.app.vault.getAbstractFileByPath(path)) { path = normalizePath(folder + '/' + base + ' ' + i + '.md'); i++; }
    const finalTitle = path.split('/').pop().replace(/\.md$/, '');
    let prevFile = null, number = '';
    if (type === 'session') {
      const s = this.getSessionsSorted(); prevFile = s[s.length - 1] || null; number = String(this.nextSessionNumber());
    }
    const srcLink = extra.srcFile ? '[[' + extra.srcFile.basename + ']]' : '';
    let content = extra.raw != null ? extra.raw : await this.loadTemplate(type);
    content = content
      .replace(/\{\{title\}\}/g, finalTitle)
      .replace(/\{\{date(?::[^}]*)?\}\}/g, today())
      .replace(/\{\{number\}\}/g, number)
      .replace(/\{\{prev\}\}/g, prevFile ? '[[' + prevFile.basename + ']]' : '')
      .replace(/\{\{campaign\}\}/g, this.settings.campaignName)
      .replace(/\{\{link\}\}/g, srcLink);
    if (extra.body) content = content.replace(/\s*$/, '\n\n') + extra.body + '\n';
    const file = await this.app.vault.create(path, content);
    if (extra.fields && Object.keys(extra.fields).length) {
      await this.app.fileManager.processFrontMatter(file, fm => { for (const [k, v] of Object.entries(extra.fields)) if (v !== undefined && v !== '') fm[k] = v; });
    }
    if (prevFile) {
      await this.app.fileManager.processFrontMatter(prevFile, fm => { fm.next = '[[' + file.basename + ']]'; });
    }
    if (extra.editor && this.settings.insertLinkOnCreate && extra.srcFile && extra.srcFile.path !== file.path && type !== 'session') {
      extra.editor.replaceSelection(this.app.fileManager.generateMarkdownLink(file, extra.srcFile.path));
    }
    new Notice('Created ' + TYPES[type].label + ': ' + file.basename);
    if (this.settings.openNewNote && !extra.noOpen) await this.app.workspace.getLeaf(extra.editor ? 'tab' : false).openFile(file);
    return file;
  }
  insertLinkPicker(editor, srcFile, type) {
    const files = type ? this.getNotes(type) : this.getAllTyped();
    if (!files.length) { new Notice('No ' + (type ? TYPES[type].plural : 'campaign notes') + ' yet.'); return; }
    new NoteSuggestModal(this.app, files, f => {
      editor.replaceSelection(this.app.fileManager.generateMarkdownLink(f, srcFile ? srcFile.path : ''));
    }, 'Link to ' + (type ? TYPES[type].label : 'note') + '…', f => (TYPES[this.fm(f).type] ? TYPES[this.fm(f).type].label + ' · ' : '') + f.basename).open();
  }

  /* ---------- side quest generator ---------- */
  async generateSideQuest(useVault = true) {
    const t = await this.readTables(this.settings.sideQuestTablesNote, SIDE_QUEST_TABLES);
    const npcs = useVault ? this.getNotes('npc').filter(f => !/dead/i.test(String(this.fm(f).status || ''))) : [];
    const places = useVault ? this.getNotes('place') : [];
    const q = {
      giver: pick(t.giver), giverLink: null, hook: pick(t.hook), objective: pick(t.objective),
      location: pick(t.location), locationLink: null, complication: pick(t.complication),
      twist: pick(t.twist), reward: pick(t.reward), urgency: pick(t.urgency || SIDE_QUEST_TABLES.urgency), _t: t,
    };
    if (npcs.length && Math.random() < 0.5) q.giverLink = pick(npcs);
    if (places.length && Math.random() < 0.5) q.locationLink = pick(places);
    return q;
  }
  sideQuestMarkdown(q) {
    const giver = q.giverLink ? '[[' + q.giverLink.basename + ']]' : q.giver;
    const loc = q.locationLink ? '[[' + q.locationLink.basename + ']]' : q.location;
    return [
      '> [!quest] Side quest',
      '> **Hook:** ' + q.hook,
      '> **Quest giver:** ' + giver,
      '> **Objective:** ' + q.objective,
      '> **Where:** ' + loc,
      '> **Deadline:** ' + q.urgency,
      '> **Complication:** ' + q.complication,
      '> **Twist (DM only):** ' + q.twist,
      '> **Reward:** ' + q.reward,
    ].join('\n');
  }
  renderSideQuestWidget(container, sourcePath, onDone) {
    const wrap = container.createDiv({ cls: 'dmc-sq' }); lpSafe(wrap);
    const out = wrap.createDiv({ cls: 'dmc-sq-out' });
    const controls = wrap.createDiv({ cls: 'dmc-row dmc-wrap' });
    let q = null;
    const FIELDS = [['hook', 'Hook'], ['giver', 'Quest giver'], ['objective', 'Objective'], ['location', 'Where'], ['urgency', 'Deadline'], ['complication', 'Complication'], ['twist', 'Twist (DM only)'], ['reward', 'Reward']];
    const draw = () => {
      out.empty();
      if (!q) { out.createDiv({ cls: 'dmc-muted', text: 'Press Generate. Click any line to reroll just that part.' }); return; }
      FIELDS.forEach(([k, label]) => {
        const r = out.createDiv({ cls: 'dmc-sq-line', attr: { 'aria-label': 'Click to reroll' } });
        r.createSpan({ cls: 'dmc-sq-label', text: label });
        const v = r.createSpan({ cls: 'dmc-sq-val' });
        const linkFile = k === 'giver' ? q.giverLink : k === 'location' ? q.locationLink : null;
        if (linkFile) { const a = v.createEl('a', { cls: 'internal-link', text: linkFile.basename }); a.addEventListener('click', e => { e.stopPropagation(); this.app.workspace.openLinkText(linkFile.path, '', true); }); }
        else v.setText(q[k]);
        const re = r.createSpan({ cls: 'dmc-reroll' }); setIcon(re, 'refresh-cw');
        r.addEventListener('click', () => {
          if (k === 'giver') { q.giverLink = null; const n = this.getNotes('npc'); if (n.length && Math.random() < 0.5) q.giverLink = pick(n); }
          if (k === 'location') { q.locationLink = null; const p = this.getNotes('place'); if (p.length && Math.random() < 0.5) q.locationLink = pick(p); }
          q[k] = pick(q._t[k] || SIDE_QUEST_TABLES[k]); draw();
        });
      });
    };
    button(controls, 'Generate', 'sparkles', async () => { q = await this.generateSideQuest(); draw(); }, 'mod-cta');
    button(controls, 'Save as quest note', 'file-plus', async () => {
      if (!q) { new Notice('Generate a quest first.'); return; }
      new PromptModal(this.app, 'Name this quest', 'e.g. The Whispering Well', async (name) => {
        await this.createNote('quest', name, {
          fields: {
            status: 'hook',
            giver: q.giverLink ? '[[' + q.giverLink.basename + ']]' : q.giver,
            location: q.locationLink ? '[[' + q.locationLink.basename + ']]' : q.location,
            reward: q.reward, source: 'generator',
          },
          body: '## Generated outline\n' + this.sideQuestMarkdown(q),
        });
        if (onDone) onDone();
      }, { value: '' }).open();
    });
    button(controls, 'Insert into note', 'text-cursor-input', () => {
      if (!q) { new Notice('Generate a quest first.'); return; }
      const ed = this.app.workspace.activeEditor && this.app.workspace.activeEditor.editor;
      if (!ed) { navigator.clipboard.writeText(this.sideQuestMarkdown(q)); new Notice('No editor active — copied to clipboard.'); return; }
      ed.replaceSelection('\n' + this.sideQuestMarkdown(q) + '\n'); if (onDone) onDone();
    });
    button(controls, 'Save as idea', 'lightbulb', async () => {
      if (!q) { new Notice('Generate a quest first.'); return; }
      await this.createNote('idea', 'Side quest - ' + q.objective.replace(/^\w/, c => c.toUpperCase()), { fields: { status: 'raw', category: 'side quest' }, body: this.sideQuestMarkdown(q), noOpen: true });
    });
    draw();
  }

  /* ---------- NPC generator ---------- */
  async generateNpc() {
    const t = await this.readTables(this.settings.npcTablesNote, NPC_TABLES);
    const o = {}; for (const k of Object.keys(NPC_TABLES)) o[k] = pick(t[k] && t[k].length ? t[k] : NPC_TABLES[k]);
    o.name = o.first + ' ' + o.last; return o;
  }
  renderNpcWidget(container, sourcePath, onDone) {
    const wrap = container.createDiv({ cls: 'dmc-sq' }); lpSafe(wrap);
    const out = wrap.createDiv({ cls: 'dmc-sq-out' });
    const controls = wrap.createDiv({ cls: 'dmc-row dmc-wrap' });
    let n = null;
    const draw = () => {
      out.empty();
      if (!n) { out.createDiv({ cls: 'dmc-muted', text: 'Press Generate for an instant NPC.' }); return; }
      out.createDiv({ cls: 'dmc-npc-name', text: n.name });
      out.createDiv({ cls: 'dmc-muted', text: n.species + ' ' + n.occupation + ' · ' + n.attitude });
      [['Look', 'appearance'], ['Voice', 'voice'], ['Wants', 'want'], ['Secret', 'secret']].forEach(([l, k]) => {
        const r = out.createDiv({ cls: 'dmc-sq-line' }); r.createSpan({ cls: 'dmc-sq-label', text: l }); r.createSpan({ cls: 'dmc-sq-val', text: n[k] });
      });
    };
    button(controls, 'Generate', 'user-plus', async () => { n = await this.generateNpc(); draw(); }, 'mod-cta');
    button(controls, 'Save as NPC note', 'file-plus', async () => {
      if (!n) return;
      const srcFile = sourcePath ? this.app.vault.getAbstractFileByPath(sourcePath) : null;
      const isPlace = srcFile instanceof TFile && this.fm(srcFile).type === 'place';
      await this.createNote('npc', n.name, {
        fields: { role: n.occupation, species: n.species, attitude: n.attitude, location: isPlace ? '[[' + srcFile.basename + ']]' : undefined },
        body: '## Generated details\n- **Look:** ' + n.appearance + '\n- **Voice:** ' + n.voice + '\n- **Wants:** ' + n.want + '\n- **Secret:** ' + n.secret,
      });
      if (onDone) onDone();
    });
    draw();
  }

  /* ---------- code blocks ---------- */
  renderDiceBlock(src, el, ctx) {
    el.addClass('dmc-block', 'dmc-dice-block'); lpSafe(el);
    const lines = src.split('\n').map(l => l.trim()).filter(Boolean);
    const row = el.createDiv({ cls: 'dmc-row dmc-wrap' });
    const log = el.createDiv({ cls: 'dmc-dice-result' });
    (lines.length ? lines : ['1d20']).forEach(line => {
      const m = line.match(/^(.*?):\s*(.+)$/);
      const label = m ? m[1].trim() : '', expr = m ? m[2].trim() : line;
      button(row, (label ? label + ' ' : '') + '(' + expr + ')', 'dices', () => {
        try { const r = rollDice(expr); log.empty(); log.createSpan({ cls: 'dmc-dice-total', text: String(r.total) }); log.createSpan({ cls: 'dmc-muted', text: ' ' + (label || expr) + ': ' + r.detail.replace(/\*\*|~~|_/g, '') }); }
        catch (e) { new Notice(e.message); }
      });
    });
  }
  renderRollTable(src, el, ctx) {
    // A list of entries; one button rolls a random entry (supports "1-3: text" weighting or plain lines).
    el.addClass('dmc-block'); lpSafe(el);
    let title = 'Roll on table'; const entries = [];
    for (const raw of src.split('\n')) {
      const line = raw.trim(); if (!line) continue;
      if (/^title:/i.test(line)) { title = line.replace(/^title:\s*/i, ''); continue; }
      const m = line.match(/^(\d+)(?:\s*[-–]\s*(\d+))?\s*[:.|]\s*(.+)$/);
      if (m) { const a = +m[1], b = m[2] ? +m[2] : a; for (let i = a; i <= b; i++) entries.push(m[3]); }
      else entries.push(line.replace(/^[-*]\s+/, ''));
    }
    const parsed = parseRollTable(src);
    if (parsed.ref) { const b = findBuiltin(parsed.ref); if (b) { title = parsed.title || b.title; entries.length = 0; b.entries.forEach(x => entries.push(x)); } else { el.createDiv({ cls: 'dmc-error', text: 'No built-in table named "' + parsed.ref + '"' }); return; } }
    else if (parsed.entries.length) { entries.length = 0; parsed.entries.forEach(x => entries.push(x)); }
    const res = el.createDiv({ cls: 'dmc-dice-result' });
    const comp = new Component(); comp.load();
    button(el, title + ' (d' + entries.length + ')', 'dices', async () => {
      const i = Math.floor(Math.random() * entries.length); res.empty();
      res.createSpan({ cls: 'dmc-dice-total', text: String(i + 1) + ' ' });
      const span = res.createSpan(); await renderMd(this.app, rollIn(entries[i]), span, ctx.sourcePath, comp);
      const p = span.querySelector('p'); if (p) p.style.display = 'inline';
    });
    ctx.addChild && ctx.addChild(new (class extends obsidian.MarkdownRenderChild { onunload() { comp.unload(); } })(el));
  }
  renderActionsBlock(src, el, ctx) {
    el.addClass('dmc-block'); lpSafe(el);
    let keys = src.split(/[\n,]/).map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!keys.length) keys = ['dashboard', 'session', 'npc', 'place', 'quest', 'idea', 'sidequest', 'npcgen', 'dice', 'tracker'];
    const row = el.createDiv({ cls: 'dmc-row dmc-wrap' });
    for (const k of keys) {
      if (TYPES[k]) button(row, TYPES[k].label, TYPES[k].icon, () => this.promptCreate(k));
      else if (k === 'dashboard') button(row, 'Dashboard', 'castle', () => this.activateView(), 'mod-cta');
      else if (k === 'sidequest') button(row, 'Side quest', 'sparkles', () => new SideQuestModal(this).open());
      else if (k === 'npcgen') button(row, 'Random NPC', 'user-plus', () => new NpcGenModal(this).open());
      else if (k === 'dice') button(row, 'Dice', 'dices', () => new DiceModal(this.app).open());
      else if (k === 'tracker') button(row, 'Initiative', 'swords', () => {
        if (!this.app.commands.executeCommandById('dm-statblocks:open-tracker')) new Notice('Enable the DM Statblocks plugin for the tracker.');
      });
      else if (k === 'tavern') button(row, 'Tavern', 'beer', () => new ShopModal(this, 'tavern').open());
      else if (k === 'shop') button(row, 'Shop', 'store', () => new ShopModal(this, 'potion').open());
      else if (k === 'tables') button(row, 'Random table', 'table', () => this.openTablePicker());
      else if (k === 'builder') button(row, 'Build monster', 'skull', () => this.app.commands.executeCommandById('dm-statblocks:new-monster'));
      else if (k === 'villain') button(row, 'Build villain', 'crown', () => this.app.commands.executeCommandById('dm-statblocks:new-villain'));
      else if (k === 'randommonster') button(row, 'Random monster', 'dices', () => this.app.commands.executeCommandById('dm-statblocks:random-monster'));
      else if (k === 'armory') button(row, 'Armory', 'sword', () => this.app.commands.executeCommandById('dm-codex:open-armory'));
      else if (k === 'give') button(row, 'Give to character', 'hand', () => { const f = this.app.workspace.getActiveFile(); if (f) this.giveItem(f); });
      else if (k === 'update') button(row, 'Update vault content', 'download', () => this.runContentUpdate());
      else if (k === 'latest') button(row, 'Latest session', 'scroll-text', () => { const s = this.getSessionsSorted(); if (s.length) this.app.workspace.getLeaf(false).openFile(s[s.length - 1]); });
    }
  }
  /**
   * ```dm-list
   * type: npc
   * where: location      # frontmatter field that links to THIS note; "any" = any link to this note
   * status: alive        # any other key = frontmatter filter
   * fields: [role, faction]
   * sort: name | -session_number | date
   * limit: 20
   * ```
   */
  renderListBlock(src, el, ctx) {
    el.addClass('dmc-block', 'dmc-list-block');
    let opts = {};
    try { opts = parseYaml(src) || {}; } catch (e) { el.createDiv({ cls: 'dmc-error', text: 'dm-list: ' + e.message }); return; }
    const types = [].concat(opts.type || []).map(t => String(t).toLowerCase());
    const here = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
    const filterKeys = Object.keys(opts).filter(k => !['type', 'where', 'fields', 'sort', 'limit', 'title', 'empty', 'folder'].includes(k));
    let files = this.app.vault.getMarkdownFiles().filter(f => f.path !== ctx.sourcePath && !f.path.startsWith(this.settings.templatesFolder + '/'));
    if (types.length) files = files.filter(f => types.includes(String(this.fm(f).type || '').toLowerCase()));
    if (opts.folder) files = files.filter(f => f.path.startsWith(normalizePath(opts.folder) + '/'));
    for (const k of filterKeys) {
      const want = [].concat(opts[k]).map(v => String(v).toLowerCase());
      files = files.filter(f => {
        const v = this.fm(f)[k]; const vals = [].concat(v == null || v === '' ? [''] : v).map(x => stripLinks(x).toLowerCase());
        return want.some(w => w.startsWith('!') ? !vals.includes(w.slice(1)) : vals.includes(w));
      });
    }
    if (opts.where && here instanceof TFile) {
      const resolves = (val, from) => extractLinks(val).some(l => { const d = this.app.metadataCache.getFirstLinkpathDest(l, from); return d && d.path === here.path; });
      const fields = [].concat(opts.where);
      files = files.filter(f => {
        if (fields.includes('any')) {
          const rl = this.app.metadataCache.resolvedLinks[f.path] || {};
          if (rl[here.path]) return true;
          const fm = this.fm(f); return Object.values(fm).some(v => resolves(v, f.path));
        }
        const fm = this.fm(f); return fields.some(k => resolves(fm[k], f.path));
      });
    }
    const sort = String(opts.sort || 'name'); const desc = sort.startsWith('-'); const sk = sort.replace(/^-/, '');
    files.sort((a, b) => {
      let va = sk === 'name' ? a.basename : sk === 'modified' ? a.stat.mtime : this.fm(a)[sk];
      let vb = sk === 'name' ? b.basename : sk === 'modified' ? b.stat.mtime : this.fm(b)[sk];
      const r = (typeof va === 'number' && typeof vb === 'number') ? va - vb : String(va ?? '').localeCompare(String(vb ?? ''), undefined, { numeric: true });
      return desc ? -r : r;
    });
    if (opts.limit) files = files.slice(0, Number(opts.limit));
    const fields = [].concat(opts.fields || (types.length === 1 && COLUMNS[types[0]] ? COLUMNS[types[0]] : []));
    const esc = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    const cell = v => v == null ? '' : Array.isArray(v) ? v.map(x => esc(x)).join(', ') : esc(v);
    let md = opts.title ? '**' + opts.title + '**\n\n' : '';
    if (!files.length) md += '*' + (opts.empty || 'Nothing linked yet.') + '*';
    else if (!fields.length) md += files.map(f => '- [[' + this.app.metadataCache.fileToLinktext(f, ctx.sourcePath, true) + ']]').join('\n');
    else {
      md += '| Name | ' + fields.map(f => f.replace(/_/g, ' ')).join(' | ') + ' |\n|' + ' --- |'.repeat(fields.length + 1) + '\n';
      md += files.map(f => '| [[' + esc(this.app.metadataCache.fileToLinktext(f, ctx.sourcePath, true)) + '\\|' + esc(f.basename) + ']] | ' + fields.map(k => cell(this.fm(f)[k])).join(' | ') + ' |').join('\n');
    }
    const comp = new obsidian.MarkdownRenderChild(el); ctx.addChild(comp);
    renderMd(this.app, md, el, ctx.sourcePath, comp);
  }
}

const cap = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);
/* ================================================================== */
/* Taverns & shops                                                     */
/* ================================================================== */

function fmtPrice(gp) {
  const cp = Math.max(1, Math.round(gp * 100));
  if (cp % 100 === 0) return (cp / 100).toLocaleString() + ' gp';
  if (cp >= 100) { const g = Math.floor(cp / 100), r = cp % 100; return g.toLocaleString() + ' gp' + (r % 10 === 0 ? ' ' + r / 10 + ' sp' : ' ' + r + ' cp'); }
  if (cp % 10 === 0) return cp / 10 + ' sp';
  return cp + ' cp';
}
const RARITY_GP = { common: 100, uncommon: 400, rare: 4000, 'very rare': 40000, legendary: 200000 }; // 2024 guideline; consumables half
const SIZE_RARITY = { village: ['common'], town: ['common', 'uncommon'], city: ['common', 'uncommon', 'rare'], metropolis: ['common', 'uncommon', 'rare', 'very rare'] };
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function rollIn(text) { return String(text).replace(/\{(\d*d\d+(?:\s*[+-]\s*\d+)?)(?:\s*[x×]\s*(\d+))?\}/g, (_, e, mult) => { try { return String(rollDice(e).total * (mult ? Number(mult) : 1)); } catch (er) { return e; } }); }

// [name, price gp | rarity, consumable?, notes]
const SHOP_DATA = {
  potion: {
    label: 'Potion shop', icon: 'flask-conical', occupation: ['alchemist', 'apothecary', 'herbalist', 'hedge witch'],
    names: [['The Bubbling', 'The Copper', 'The Green', 'The Hissing', 'The Gilded', 'The Crooked', 'Mother Ashby\'s', 'The Moonlit'], ['Cauldron', 'Alembic', 'Phial', 'Mortar', 'Retort', 'Remedy', 'Tincture', 'Still']],
    looks: ['Shelves of coloured glass glint in candlelight; something on the stove smells of burnt sugar.', 'Dried herbs hang from every rafter and a cat sleeps on the counter beside a skull.', 'Spotless white tiles, labelled drawers, and a faint smell of vinegar and lightning.', 'A cramped cellar shop. Bottles clink when anyone walks overhead.'],
    mundane: [['Healer\'s Kit', 5, '10 uses; stabilise without a check'], ['Antitoxin', 50, 'Advantage on saves vs Poisoned for 1 hour'], ['Acid (vial)', 25, 'Thrown; Dex save or 2d6 Acid'], ['Alchemist\'s Fire', 50, 'Thrown; Dex save or 1d4 Fire and burning'], ['Holy Water (flask)', 25, 'Thrown; 2d8 Radiant to Fiends/Undead'], ['Basic Poison (vial)', 100, 'Coat a weapon; extra 1d4 Poison'], ['Perfume (vial)', 5, ''], ['Herbalism Kit', 5, ''], ['Oil (flask)', 0.1, ''], ['Soothing salve (local remedy)', 1, 'Flavour item'], ['Smelling salts', 0.5, 'Flavour item']],
    magic: [['Potion of Healing', 'common', true, 'Regain 2d4 + 2 HP'], ['Potion of Climbing', 'common', true, 'Climb Speed for 1 hour'], ['Potion of Greater Healing', 'uncommon', true, 'Regain 4d4 + 4 HP'], ['Potion of Animal Friendship', 'uncommon', true, ''], ['Potion of Fire Breath', 'uncommon', true, ''], ['Potion of Water Breathing', 'uncommon', true, ''], ['Potion of Resistance', 'uncommon', true, 'One damage type, 1 hour'], ['Potion of Growth', 'uncommon', true, ''], ['Potion of Hill Giant Strength', 'uncommon', true, ''], ['Oil of Slipperiness', 'uncommon', true, ''], ['Philter of Love', 'uncommon', true, ''], ['Potion of Poison', 'uncommon', true, 'Looks like a healing potion'], ['Potion of Superior Healing', 'rare', true, 'Regain 8d4 + 8 HP'], ['Potion of Heroism', 'rare', true, ''], ['Potion of Invulnerability', 'rare', true, ''], ['Potion of Mind Reading', 'rare', true, ''], ['Potion of Gaseous Form', 'rare', true, ''], ['Potion of Diminution', 'rare', true, ''], ['Elixir of Health', 'rare', true, ''], ['Potion of Supreme Healing', 'very rare', true, 'Regain 10d4 + 20 HP'], ['Potion of Flying', 'very rare', true, ''], ['Potion of Speed', 'very rare', true, ''], ['Potion of Invisibility', 'very rare', true, '']],
    buys: ['Rare herbs and fungi (Nature check to identify)', 'Monster parts: venom sacs, troll blood, wyvern stingers', 'Empty vials at 1 cp each'],
    secrets: ['Half the "healing" stock is watered down — roll a d6: on a 1 it heals only 1 HP.', 'The owner brews poisons for the local thieves\' guild.', 'One bottle on the top shelf holds a trapped imp who offers deals.', 'The alchemist is secretly testing an experimental elixir on customers.'],
  },
  general: {
    label: 'General store', icon: 'store', occupation: ['merchant', 'shopkeeper', 'trader', 'quartermaster'],
    names: [['The Well-Stocked', 'Thistle &', 'Oakhart\'s', 'The Wayfarer\'s', 'The Crossroads', 'Pennywhistle', 'Barrow &'], ['Provisioner', 'Sons', 'Emporium', 'Supply', 'Trading Post', 'Sundries', 'Outfitters']],
    looks: ['Barrels, sacks and coils of rope fill every corner; a bell jingles over the door.', 'A long counter, a wall of tiny drawers, and a shopkeeper who knows exactly where everything is.', 'Half shop, half warehouse — the owner climbs a ladder to fetch anything.'],
    mundane: [['Backpack', 2, ''], ['Bedroll', 1, ''], ['Blanket', 0.5, ''], ['Rope, hemp (50 ft.)', 1, ''], ['Torch', 0.01, ''], ['Rations (1 day)', 0.5, ''], ['Waterskin', 0.2, ''], ['Tinderbox', 0.5, ''], ['Lantern, Hooded', 5, ''], ['Lantern, Bullseye', 10, ''], ['Oil (flask)', 0.1, ''], ['Candle', 0.01, ''], ['Chalk', 0.01, ''], ['Crowbar', 2, 'Advantage on Strength checks to pry'], ['Grappling Hook', 2, ''], ['Ball Bearings (bag)', 1, ''], ['Caltrops (bag)', 1, ''], ['Chain (10 ft.)', 5, ''], ['Climber\'s Kit', 25, ''], ['Iron Spikes (10)', 1, ''], ['Shovel', 2, ''], ['Tent', 2, 'Sleeps two'], ['Mess Kit', 0.2, ''], ['Pouch', 0.5, ''], ['Sack', 0.01, ''], ['Signal Whistle', 0.05, ''], ['Manacles', 2, ''], ['Mirror', 5, ''], ['Lock', 10, ''], ['Ink (1 ounce)', 10, ''], ['Paper (sheet)', 0.2, ''], ['Parchment (sheet)', 0.1, ''], ['Hourglass', 25, ''], ['Hunting Trap', 5, ''], ['Fishing Tackle', 1, ''], ['Traveler\'s Clothes', 2, ''], ['Fine Clothes', 15, ''], ['Explorer\'s Pack', 10, ''], ['Dungeoneer\'s Pack', 12, ''], ['Spyglass', 1000, 'Rare in small towns'], ['Magnifying Glass', 100, ''], ['Healer\'s Kit', 5, ''], ['Potion of Healing', 50, 'Usually one or two in stock']],
    magic: [],
    buys: ['Furs, pelts and hides', 'Salvaged weapons and armour at half value', 'Local produce'],
    secrets: ['A trapdoor behind the counter leads to a smugglers\' tunnel.', 'The owner is skimming the town\'s grain tax.', 'Every map sold here has the same deliberate error.', 'A shipment in the back room is stolen — the real owner is looking for it.'],
  },
  smithy: {
    label: 'Blacksmith & armory', icon: 'hammer', occupation: ['blacksmith', 'armorer', 'weaponsmith', 'farrier'],
    names: [['The Glowing', 'Ironside', 'The Ringing', 'Stonebridge', 'The Black', 'Emberly\'s', 'The Dented'], ['Anvil', 'Forge', 'Hammer', 'Smithy', 'Bellows', 'Armory', 'Tongs']],
    looks: ['Heat rolls out of the open forge; the hammering stops only when someone speaks.', 'Racks of polished blades behind iron bars, a sleepy guard dog under the bench.', 'An open-air forge with a crowd of children watching sparks fly.'],
    mundane: [['Club', 0.1, 'Mastery: Slow'], ['Dagger', 2, 'Mastery: Nick'], ['Greatclub', 0.2, 'Mastery: Push'], ['Handaxe', 5, 'Mastery: Vex'], ['Javelin', 0.5, 'Mastery: Slow'], ['Light Hammer', 2, 'Mastery: Nick'], ['Mace', 5, 'Mastery: Sap'], ['Quarterstaff', 0.2, 'Mastery: Topple'], ['Sickle', 1, 'Mastery: Nick'], ['Spear', 1, 'Mastery: Sap'], ['Light Crossbow', 25, 'Mastery: Slow'], ['Shortbow', 25, 'Mastery: Vex'], ['Sling', 0.1, 'Mastery: Slow'], ['Battleaxe', 10, 'Mastery: Topple'], ['Flail', 10, 'Mastery: Sap'], ['Glaive', 20, 'Mastery: Graze'], ['Greataxe', 30, 'Mastery: Cleave'], ['Greatsword', 50, 'Mastery: Graze'], ['Halberd', 20, 'Mastery: Cleave'], ['Longsword', 15, 'Mastery: Sap'], ['Maul', 10, 'Mastery: Topple'], ['Morningstar', 15, 'Mastery: Sap'], ['Pike', 5, 'Mastery: Push'], ['Rapier', 25, 'Mastery: Vex'], ['Scimitar', 25, 'Mastery: Nick'], ['Shortsword', 10, 'Mastery: Vex'], ['Trident', 5, 'Mastery: Topple'], ['Warhammer', 15, 'Mastery: Push'], ['War Pick', 5, 'Mastery: Sap'], ['Whip', 2, 'Mastery: Slow'], ['Heavy Crossbow', 50, 'Mastery: Push'], ['Longbow', 50, 'Mastery: Slow'], ['Hand Crossbow', 75, 'Mastery: Vex'], ['Arrows (20)', 1, ''], ['Bolts (20)', 1, ''], ['Padded Armor', 5, 'Light, AC 11 + Dex, Stealth disadv.'], ['Leather Armor', 10, 'Light, AC 11 + Dex'], ['Studded Leather Armor', 45, 'Light, AC 12 + Dex'], ['Hide Armor', 10, 'Medium, AC 12 + Dex (max 2)'], ['Chain Shirt', 50, 'Medium, AC 13 + Dex (max 2)'], ['Scale Mail', 50, 'Medium, AC 14 + Dex (max 2), Stealth disadv.'], ['Breastplate', 400, 'Medium, AC 14 + Dex (max 2)'], ['Half Plate Armor', 750, 'Medium, AC 15 + Dex (max 2), Stealth disadv.'], ['Ring Mail', 30, 'Heavy, AC 14'], ['Chain Mail', 75, 'Heavy, AC 16, Str 13'], ['Splint Armor', 200, 'Heavy, AC 17, Str 15'], ['Plate Armor', 1500, 'Heavy, AC 18, Str 15'], ['Shield', 10, '+2 AC'], ['Repair / sharpening', 0.5, 'Service']],
    magic: [['+1 Weapon (smith\'s masterwork)', 'uncommon', false, 'Rarely for sale'], ['+1 Shield', 'uncommon', false, ''], ['Adamantine Armor', 'uncommon', false, 'Critical hits become normal hits'], ['Mithral Armor', 'uncommon', false, 'No Stealth disadvantage or Str requirement'], ['+1 Ammunition (each)', 'uncommon', true, ''], ['+2 Weapon', 'rare', false, '']],
    buys: ['Scrap metal and ore', 'Monster hide for custom armour (commission, 1 week+)', 'Used weapons at half value'],
    secrets: ['The smith forged the blade used in a recent murder — and knows who ordered it.', 'One "masterwork" sword is actually cursed.', 'The forge fire has not gone out in a century; a fire elemental is bound inside.', 'The smith is selling arms to both sides of a local feud.'],
  },
  magic: {
    label: 'Magic curios', icon: 'wand-sparkles', occupation: ['wizard', 'collector', 'sage', 'retired adventurer'],
    names: [['The Arcane', 'The Whispering', 'The Curious', 'Vesper\'s', 'The Starlit', 'The Hidden', 'The Ninefold'], ['Emporium', 'Curiosities', 'Cabinet', 'Antiquities', 'Reliquary', 'Library', 'Vault']],
    looks: ['Glass cases full of oddities; a stuffed basilisk watches the door.', 'A tower room where objects float lazily in the air.', 'An unassuming door; inside, the shop is far bigger than the building.'],
    mundane: [['Component Pouch', 25, ''], ['Arcane Focus (crystal/orb/wand)', 10, ''], ['Spellbook (blank)', 50, ''], ['Ink (1 ounce)', 10, ''], ['Parchment (sheet)', 0.1, ''], ['Book (lore)', 25, '']],
    magic: [['Spell Scroll (cantrip)', 'common', true, ''], ['Spell Scroll (level 1)', 'common', true, ''], ['Potion of Healing', 'common', true, ''], ['Spell Scroll (level 2)', 'uncommon', true, ''], ['Spell Scroll (level 3)', 'uncommon', true, ''], ['Bag of Holding', 'uncommon', false, ''], ['Cloak of Protection', 'uncommon', false, 'Attunement'], ['Goggles of Night', 'uncommon', false, ''], ['Driftglobe', 'uncommon', false, ''], ['Immovable Rod', 'uncommon', false, ''], ['Rope of Climbing', 'uncommon', false, ''], ['Wand of Magic Missiles', 'uncommon', false, ''], ['Wand of Web', 'uncommon', false, 'Attunement (spellcaster)'], ['Wand of Secrets', 'uncommon', false, ''], ['Boots of Elvenkind', 'uncommon', false, ''], ['Bracers of Archery', 'uncommon', false, 'Attunement'], ['Gloves of Thievery', 'uncommon', false, ''], ['Hat of Disguise', 'uncommon', false, 'Attunement'], ['Pearl of Power', 'uncommon', false, 'Attunement (spellcaster)'], ['Ring of Jumping', 'uncommon', false, 'Attunement'], ['Ring of Swimming', 'uncommon', false, ''], ['Sending Stones', 'uncommon', false, ''], ['Bag of Tricks', 'uncommon', false, ''], ['Spell Scroll (level 4)', 'rare', true, ''], ['Ring of Protection', 'rare', false, 'Attunement'], ['Cloak of Displacement', 'rare', false, 'Attunement'], ['Flame Tongue', 'rare', false, 'Attunement'], ['Necklace of Fireballs', 'rare', false, ''], ['Wand of Fireballs', 'rare', false, 'Attunement (spellcaster)'], ['Boots of Speed', 'rare', false, 'Attunement'], ['Cloak of the Bat', 'rare', false, 'Attunement']],
    buys: ['Magic items at half price (identified)', 'Spellbooks and scrolls', 'Strange relics — no questions asked (well, a few)'],
    secrets: ['The owner is a dragon in disguise.', 'One item for sale is the missing piece of a powerful artifact.', 'Every item sold is tracked by a scrying sensor.', 'The shop exists in three cities at once — same door, same owner.'],
  },
  blackmarket: {
    label: 'Black market', icon: 'eye-off', occupation: ['fence', 'smuggler', 'information broker', 'forger'],
    names: [['The Back', 'The Quiet', 'The Sunken', 'Rat\'s', 'The Velvet', 'Nobody\'s'], ['Door', 'Room', 'Cellar', 'Alley', 'Exchange', 'Market']],
    looks: ['A curtain at the back of a laundry; a password gets you through.', 'Stalls under a bridge that appear only on moonless nights.', 'A barge that never docks at the same pier twice.'],
    mundane: [['Thieves\' Tools', 25, ''], ['Disguise Kit', 25, ''], ['Forgery Kit', 15, ''], ['Poisoner\'s Kit', 50, ''], ['Basic Poison (vial)', 100, ''], ['Forged travel papers', 25, 'DC 15 Investigation to spot'], ['Forged noble seal', 200, ''], ['Lock-picking lesson', 10, 'Service'], ['Stolen jewellery', 75, 'Someone wants it back'], ['Smuggled spices', 15, ''], ['Hand Crossbow', 90, 'Marked up'], ['Information (rumour)', 5, 'Roll on Rumours'], ['A name and address', 50, 'Service']],
    magic: [['Potion of Poison', 'uncommon', true, 'Sold as healing elsewhere'], ['Hat of Disguise', 'uncommon', false, 'Hot — recently stolen'], ['Gloves of Thievery', 'uncommon', false, ''], ['Boots of Elvenkind', 'uncommon', false, ''], ['Dust of Disappearance', 'uncommon', true, ''], ['Potion of Invisibility', 'very rare', true, 'Price negotiable']],
    buys: ['Stolen goods at a quarter of their value', 'Secrets about local nobles', 'Anything with the city watch\'s seal on it'],
    secrets: ['The fence is an informant for the city watch.', 'The market is run by the same noble everyone thinks is fighting it.', 'Half the "stolen" magic items are fakes.', 'Someone in the market is selling the party\'s descriptions to their enemies.'],
  },
};
const TAVERN = {
  quality: { Poor: { meal: 0.06, room: 0.1, ale: 0.04, desc: ['Sawdust floors, smoky tallow candles, mysterious stew.', 'Leaky roof, sticky tables, cheerful regulars.'] }, Modest: { meal: 0.3, room: 0.5, ale: 0.04, desc: ['Clean enough, warm hearth, decent bread.', 'Plain wooden booths and a fiddler in the corner.'] }, Comfortable: { meal: 0.5, room: 0.8, ale: 0.05, desc: ['Polished oak, good food, rooms with real beds.', 'Stained-glass windows and a well-kept stable.'] }, Wealthy: { meal: 0.8, room: 2, ale: 0.1, desc: ['Velvet booths, silver cutlery, a private dining room.', 'A string quartet and staff who remember your name.'] } },
  dishes: ['Mutton stew with barley', 'Roast chicken and leeks', 'Trout fried in butter', 'Mushroom and onion pie', 'Black pudding and eggs', 'Boar sausages with mustard', 'Venison pie', 'Pease porridge', 'Cheese, apples and dark bread', 'Eel jelly (local speciality)', 'Spiced pumpkin soup', 'Honey-glazed ham', 'Dwarven stonebread with gravy', 'Halfling seven-layer cake', 'Pickled owlbear egg (dare)'],
  drinks: [['Ale (mug)', 1], ['Ale (gallon)', 5], ['Cider (mug)', 1], ['Common wine (pitcher)', 5], ['Mead (mug)', 1.5], ['Fine wine (bottle)', 250], ['Dwarven stout (mug)', 2], ['Elven wine (glass)', 25], ['House "special" (glass)', 3]],
  features: ['A stuffed owlbear head over the hearth', 'A wishing well in the middle of the common room', 'A bar carved from a single enormous tree root', 'A notice board crowded with jobs and wanted posters', 'A cage with a talking raven that insults patrons', 'A dragon skull used as a chandelier', 'A stage where anyone can perform for free drinks', 'A hidden gambling den in the cellar', 'Walls covered in adventurers\' carved initials', 'A fireplace that never needs wood'],
  entertainment: ['A bard who only knows sad songs', 'Arm-wrestling tournament (5 sp to enter, 5 gp prize)', 'Dice game: Three Dragons Ante', 'A travelling puppet show', 'Knife-throwing contest', 'Poetry night (heckling encouraged)', 'A storyteller recounting a battle the party fought', 'Nothing — it\'s quiet. Too quiet.'],
  patronActs: ['nursing a drink and watching the door', 'loudly losing at cards', 'trying to sell a "genuine" treasure map', 'arguing about taxes', 'celebrating a birthday', 'asleep face-down in stew', 'sketching the other patrons', 'looking for hired swords', 'flirting badly with the bard', 'counting coins under the table'],
  staffRoles: ['cook', 'barmaid', 'bouncer', 'stable hand', 'bartender', 'serving boy'],
};

/* ================================================================== */
/* Built-in random tables                                              */
/* ================================================================== */

const BUILTIN_TABLES = {
  'Exploration': {
    'Weather': ['Clear and bright', 'Clear and bright', 'Overcast and cool', 'Overcast and cool', 'Light rain', 'Light rain', 'Fog until noon', 'Windy — ranged attacks beyond normal range impossible', 'Heavy rain — Disadvantage on Perception checks that rely on hearing', 'Thunderstorm — travel slows to Slow pace', 'Unseasonably hot — Con save DC 10 each hour of travel or 1 [[Exhaustion]]', 'Snow / hail'],
    'Road encounter (levels 1–4)': ['Nothing — quiet road, birdsong', 'A merchant with a broken cart wheel', '[[Bandit]] ×{1d4+2} demand a toll', '[[Wolf]] ×{1d4+1} shadow the party', 'A pilgrim heading to a distant shrine', '[[Goblin Warrior]] ×{1d4+1} setting an ambush', 'A patrol of {1d4+1} [[Guard|guards]] questioning travellers', 'An overturned wagon — and tracks leading into the woods', 'A lost child', 'A wandering minstrel who knows a useful rumour'],
    'Forest encounter': ['A hunter\'s abandoned camp', '[[Wolf]] ×{1d6}', 'An [[Owlbear]] protecting its den', 'Fey lights leading off the path', 'A druid who asks the party to leave', '[[Giant Rat]] swarm in a hollow log ({1d6+2})', 'A tree marked with a strange rune', 'A woodcutter fleeing something', 'Ruins of a stone circle', '[[Goblin Boss]] and {1d4+1} [[Goblin Warrior|goblin warriors]]'],
    'Urban encounter': ['A pickpocket tries their luck (Perception DC 13)', 'A street preacher predicting doom', 'A runaway horse', 'A noble\'s carriage forces everyone aside', 'City watch looking for someone who resembles a party member', 'A fire breaks out two streets away', 'A beggar who is actually a spy', 'A {1d4+2}-[[Bandit|thug]] mugging in an alley', 'A festival procession', 'A merchant offers a "once in a lifetime" deal'],
    'Dungeon dressing': ['A collapsed section of ceiling', 'Scratch marks counting days on the wall', 'A rusted cage, door open', 'Fresh footprints in the dust', 'A dried-up fountain with coins in it ({2d6} cp)', 'An old campfire, still warm', 'A painted mural, faces scratched out', 'A dripping sound that never stops', 'A skeleton clutching a note', 'A door with no handle on this side', 'Webs thick enough to block the corridor', 'A cold draft from a hidden crack'],
    'Traps (levels 1–4)': ['Pit trap: DC 13 Wis (Perception) to spot; DC 13 Dex save or fall 10 ft. (1d6)', 'Poison needle: DC 13 Con save or 1d10 Poison and [[Poisoned]] for 1 hour', 'Swinging blade: +5 to hit, 2d6 Slashing', 'Falling net: DC 12 Dex save or [[Restrained]]', 'Collapsing stairs: DC 12 Dex save or slide down and land [[Prone]]', 'Fire glyph: DC 13 Dex save, 3d6 Fire (half on success)', 'Rolling boulder: DC 14 Dex save or 4d6 Bludgeoning', 'Alarm bell: no damage, but everything nearby is alerted'],
  },
  'Social': {
    'Tavern rumour': ['The miller hasn\'t been seen in a week.', 'Someone is paying good coin for wolf pelts — too good.', 'The chapel bell rang at midnight, but the chapel has no bell.', 'A noble from the capital is travelling in disguise.', 'There\'s treasure under the old watchtower. (False.)', 'The river has been running backwards at night.', 'A wizard is hiring for an expedition into the mountains.', 'The new tax collector has a forked tongue. Literally.', 'Three travellers went into the marsh. Two came back, and they won\'t talk.', 'The baker\'s bread cures warts. (True!)'],
    'Tavern event': ['A brawl breaks out over a spilled drink', 'A stranger buys the whole room a round', 'The cook storms out mid-shift', 'A bounty hunter arrives looking for someone', 'Someone collapses — poisoned?', 'The bard insults a dangerous patron', 'A child runs in shouting for help', 'The lights go out', 'A ghost is seen on the stairs', 'Rain forces a group of strange travellers inside'],
    'NPC quirk': ['Collects teeth', 'Always eating', 'Constantly checks over their shoulder', 'Refers to themselves in the third person', 'Laughs at the wrong moments', 'Uses elaborate hand gestures', 'Only speaks in questions when nervous', 'Wears far too much perfume', 'Hums war songs', 'Bites their nails down to nothing', 'Has a pet rat on their shoulder', 'Extremely superstitious'],
    'Plot twist': ['The ally is a double agent', 'The villain is a relative of a party member', 'The quest giver is already dead', 'The treasure is a fake', 'The monster was protecting the village', 'Two factions are secretly the same', 'The map leads somewhere else entirely', 'Time is running out faster than they thought', 'An NPC they ignored is the key', 'The party has been framed'],
  },
  'Loot': {
    'Individual treasure (CR 0–4)': ['{3d6} gp', '{3d6} gp', '{2d6} sp and a copper ring', '{4d6} cp and a lucky rabbit\'s foot', '{3d6} gp and a healing-potion-red vial (it is one)', '{1d6} gp and a love letter', 'A pouch of {2d6} gp and a gambling marker'],
    'Pocket contents': ['A half-eaten apple', '{1d6} cp and a button', 'A crude map with an X', 'A lock of hair tied with ribbon', 'Dice — loaded', 'A key with a tag reading "Room 7"', 'A note: "Midnight. Come alone."', 'A tiny carved wooden horse', 'A pressed flower', 'A tooth (not human)', 'A blank wanted poster', 'A small silver holy symbol'],
    'Trinket': ['A tin soldier with its face filed off', 'A key that is warm to the touch', 'A love letter addressed to no one', 'A tiny glass vial of grey ash', 'A wooden die where every face is a 6', 'A map of a town that doesn\'t exist', 'A music box that plays a song nobody knows', 'A glass eye that always faces north', 'A feather that falls upward', 'A coin from a kingdom that fell 1,000 years ago', 'A thimble that holds a little more than it should', 'A ring that is always slightly cold'],
    'Magic item quirk': ['Hums when danger is near', 'Glows faintly in moonlight', 'Whispers its previous owner\'s name', 'Is always warm', 'Smells of the sea', 'Is unusually heavy for its size', 'Leaves frost on anything it touches', 'Attracts small birds', 'Cannot be painted or stained', 'Sings softly when drawn'],
  },
  'Names': {
    'Tavern name': NAME_TABLES.tavern.a.flatMap(a => NAME_TABLES.tavern.b.slice(0, 3).map(b => a + ' ' + b)),
    'Town name': NAME_TABLES.town.a.flatMap(a => NAME_TABLES.town.b.slice(0, 4).map(b => a + b)),
    'NPC name': NPC_TABLES.first.map((f, i) => f + ' ' + NPC_TABLES.last[i % NPC_TABLES.last.length]),
  },
};

function parseRollTable(src) {
  let title = null; const entries = []; let ref = null;
  for (const raw of String(src).split('\n')) {
    const line = raw.trim(); if (!line) continue;
    if (/^title:/i.test(line)) { title = line.replace(/^title:\s*/i, ''); continue; }
    if (/^table:/i.test(line)) { ref = line.replace(/^table:\s*/i, ''); continue; }
    const m = line.match(/^(\d+)(?:\s*[-–]\s*(\d+))?\s*[:.|]\s*(.+)$/);
    if (m) { const a = +m[1], b = m[2] ? +m[2] : a; for (let i = a; i <= b; i++) entries.push(m[3]); }
    else entries.push(line.replace(/^[-*]\s+/, ''));
  }
  return { title, entries, ref };
}
function findBuiltin(name) {
  const n = String(name).toLowerCase().trim();
  for (const [cat, tabs] of Object.entries(BUILTIN_TABLES)) for (const [t, e] of Object.entries(tabs)) if (t.toLowerCase() === n) return { title: t, entries: e, category: cat };
  return null;
}

class TableSuggestModal extends FuzzySuggestModal {
  constructor(app, tables, onChoose) { super(app); this.tables = tables; this.onChoose = onChoose; this.setPlaceholder('Roll on which table?'); }
  getItems() { return this.tables; }
  getItemText(t) { return t.category + ' · ' + t.title; }
  onChooseItem(t) { this.onChoose(t); }
}
class TableResultModal extends Modal {
  constructor(plugin, table) { super(plugin.app); this.plugin = plugin; this.table = table; }
  onOpen() {
    const c = this.contentEl; c.addClass('dmc-modal'); c.createEl('h3', { text: this.table.title });
    const out = c.createDiv({ cls: 'dmc-table-result' }); const row = c.createDiv({ cls: 'dmc-row dmc-wrap' });
    let last = '';
    const roll = async () => { const r = this.plugin.rollTable(this.table); last = r.text; out.empty(); out.createSpan({ cls: 'dmc-dice-total', text: r.n + ' ' }); const s = out.createSpan(); await renderMd(this.app, r.text, s, '', this.plugin); s.querySelectorAll('p').forEach(p => p.style.display = 'inline'); };
    button(row, 'Roll again', 'dices', roll, 'mod-cta');
    button(row, 'Insert into note', 'text-cursor-input', () => { const ed = this.app.workspace.activeEditor && this.app.workspace.activeEditor.editor; if (ed) { ed.replaceSelection('**' + this.table.title + ':** ' + last + '\n'); this.close(); } else new Notice('Open a note first.'); });
    roll();
  }
  onClose() { this.contentEl.empty(); }
}

class ShopModal extends Modal {
  constructor(plugin, kind) { super(plugin.app); this.plugin = plugin; this.kind = kind; }
  onOpen() { this.contentEl.addClass('dmc-modal', 'dmc-wide'); this.contentEl.createEl('h3', { text: 'Taverns & shops' }); this.plugin.renderShopWidget(this.contentEl, null, { kind: this.kind }, () => this.close()); }
  onClose() { this.contentEl.empty(); }
}

Object.assign(DMCodexPlugin.prototype, {
  /* ---------- shops ---------- */
  generateShop(kind, size, quality) {
    kind = kind || 'tavern'; size = size || 'town';
    const npcName = pick(NPC_TABLES.first) + ' ' + pick(NPC_TABLES.last);
    const owner = { name: npcName, species: pick(NPC_TABLES.species), look: pick(NPC_TABLES.appearance), voice: pick(NPC_TABLES.voice), want: pick(NPC_TABLES.want) };
    if (kind === 'tavern') {
      quality = quality && TAVERN.quality[quality] ? quality : pick(Object.keys(TAVERN.quality));
      const Q = TAVERN.quality[quality];
      const name = pick(NAME_TABLES.tavern.a) + ' ' + pick(NAME_TABLES.tavern.b);
      owner.role = 'innkeeper';
      const staff = shuffle(TAVERN.staffRoles).slice(0, 2).map(r => pick(NPC_TABLES.first) + ' (' + r + ', ' + pick(NPC_TABLES.voice) + ')');
      const patrons = Array.from({ length: 3 }, () => pick(NPC_TABLES.first) + ' ' + pick(NPC_TABLES.last) + ', ' + pick(NPC_TABLES.species).toLowerCase() + ' ' + pick(NPC_TABLES.occupation) + ', ' + pick(TAVERN.patronActs));
      const mult = { Poor: 0.7, Modest: 1, Comfortable: 1.3, Wealthy: 2 }[quality];
      const dishes = shuffle(TAVERN.dishes).slice(0, 4).map((d, i) => [d, Q.meal * (0.6 + i * 0.25)]);
      const drinks = TAVERN.drinks.filter(d => quality === 'Wealthy' || d[1] < 100).slice(0, quality === 'Poor' ? 5 : 9).map(([d, cp]) => [d, cp * 0.04 * mult]);
      const rumours = shuffle(BUILTIN_TABLES.Social['Tavern rumour']).slice(0, 2);
      let md = '## ' + name + '\n*' + quality + ' tavern & inn · ' + cap(size) + '*\n\n> [!read-aloud] First impression\n> ' + pick(Q.desc) + ' ' + pick(TAVERN.features) + '.\n\n';
      md += '**Proprietor:** ' + owner.name + ' (' + owner.species + ' innkeeper) — ' + owner.look + '; ' + owner.voice + '. *Wants:* ' + owner.want + '.\n\n**Staff:** ' + staff.join('; ') + '\n\n';
      md += '### Menu\n| Dish | Price |\n| --- | --- |\n' + dishes.map(([d, p]) => '| ' + d + ' | ' + fmtPrice(p) + ' |').join('\n') + '\n\n';
      md += '### Drinks\n| Drink | Price |\n| --- | --- |\n' + drinks.map(([d, p]) => '| ' + d + ' | ' + fmtPrice(p) + ' |').join('\n') + '\n\n';
      md += '### Lodging\n| Room | Per night |\n| --- | --- |\n| Common room floor | ' + fmtPrice(Q.room * 0.3) + ' |\n| Private room | ' + fmtPrice(Q.room) + ' |\n' + (quality !== 'Poor' ? '| Suite / best room | ' + fmtPrice(Q.room * 3) + ' |\n' : '') + '| Stabling (per horse) | ' + fmtPrice(0.5) + ' |\n\n';
      md += '### Tonight\n- **Entertainment:** ' + pick(TAVERN.entertainment) + '\n' + patrons.map(p => '- **Patron:** ' + p).join('\n') + '\n\n';
      md += '### Rumours\n' + rumours.map(r => '- ' + r).join('\n') + '\n\n> [!quest] Hook\n> ' + pick(SIDE_QUEST_TABLES.hook) + '\n';
      return { kind, size, quality, name, owner, md, placeType: 'tavern' };
    }
    const S = SHOP_DATA[kind];
    const name = pick(S.names[0]) + ' ' + pick(S.names[1]);
    owner.role = pick(S.occupation);
    const haggle = pick([[0.8, 'desperate for business'], [0.9, 'fair-minded'], [1, 'standard prices'], [1, 'standard prices'], [1.1, 'drives a hard bargain'], [1.25, 'gouges outsiders'], [1.5, 'the only shop for miles']]);
    const sizeMult = { village: 1.1, town: 1, city: 0.95, metropolis: 0.9 }[size] || 1;
    const mult = haggle[0] * sizeMult;
    const mCount = { village: 6, town: 10, city: 14, metropolis: 18 }[size] || 10;
    const mundane = shuffle(S.mundane).slice(0, Math.min(S.mundane.length, kind === 'smithy' ? mCount + 6 : mCount)).sort((a, b) => a[1] - b[1]);
    const allowed = SIZE_RARITY[size] || SIZE_RARITY.town;
    const magicPool = S.magic.filter(m => allowed.includes(m[1]));
    const magicCount = kind === 'magic' ? { village: 3, town: 6, city: 9, metropolis: 12 }[size] : kind === 'potion' ? { village: 3, town: 5, city: 8, metropolis: 10 }[size] : { village: 0, town: 1, city: 2, metropolis: 3 }[size];
    const magic = shuffle(magicPool).slice(0, magicCount || 0);
    const stock = () => pick(['1', '1', '2', '3', '{1d4+1}', '{1d6}', 'plenty']);
    let md = '## ' + name + '\n*' + S.label + ' · ' + cap(size) + ' · prices ×' + mult.toFixed(2) + ' (' + haggle[1] + ')*\n\n> [!read-aloud] First impression\n> ' + pick(S.looks) + '\n\n';
    md += '**Proprietor:** ' + owner.name + ' (' + owner.species + ' ' + owner.role + ') — ' + owner.look + '; ' + owner.voice + '. *Wants:* ' + owner.want + '.\n\n';
    md += '### For sale\n| Item | Price | Stock | Notes |\n| --- | --- | --- | --- |\n';
    md += mundane.map(([n, gp, note]) => '| ' + n + ' | ' + fmtPrice(gp * mult) + ' | ' + rollIn(stock()) + ' | ' + (note || '') + ' |').join('\n') + '\n';
    if (magic.length) md += magic.map(([n, rar, cons, note]) => '| ' + n + ' | ' + fmtPrice(RARITY_GP[rar] * (cons ? 0.5 : 1) * mult) + ' | ' + (rar === 'common' ? rollIn('{1d4}') : '1') + ' | *' + rar + (cons ? ', consumable' : '') + '*' + (note ? ' — ' + note : '') + ' |').join('\n') + '\n';
    md += '\n*Magic item prices follow the 2024 rarity guideline (Common 100 gp, Uncommon 400 gp, Rare 4,000 gp, Very Rare 40,000 gp; consumables half), adjusted by this shop\'s multiplier.*\n\n';
    md += '### Will buy\n' + S.buys.map(b => '- ' + b).join('\n') + '\n\n> [!secret] Shop secret (DM only)\n> ' + pick(S.secrets) + '\n';
    return { kind, size, name, owner, md, placeType: 'shop' };
  },
  renderShopWidget(container, sourcePath, opts, onDone) {
    opts = opts || {};
    const wrap = container.createDiv({ cls: 'dmc-sq dmc-shop' }); lpSafe(wrap);
    const ctr = wrap.createDiv({ cls: 'dmc-row dmc-wrap' });
    const mkSel = (opts2, val) => { const s = ctr.createEl('select', { cls: 'dropdown' }); opts2.forEach(([v, l]) => s.createEl('option', { value: v, text: l })); s.value = val; lpSafe(s); return s; };
    const kindSel = mkSel([['tavern', 'Tavern / inn'], ['potion', 'Potion shop'], ['general', 'General store'], ['smithy', 'Blacksmith & armory'], ['magic', 'Magic curios'], ['blackmarket', 'Black market']], opts.kind || 'tavern');
    const sizeSel = mkSel([['village', 'Village'], ['town', 'Town'], ['city', 'City'], ['metropolis', 'Metropolis']], opts.size || 'town');
    const qSel = mkSel([['', 'Any quality'], ['Poor', 'Poor'], ['Modest', 'Modest'], ['Comfortable', 'Comfortable'], ['Wealthy', 'Wealthy']], '');
    const syncQ = () => { qSel.style.display = kindSel.value === 'tavern' ? '' : 'none'; }; kindSel.addEventListener('change', syncQ); syncQ();
    const out = wrap.createDiv({ cls: 'dmc-shop-out' });
    const actions = wrap.createDiv({ cls: 'dmc-row dmc-wrap' });
    let shop = null;
    const draw = async () => { out.empty(); if (!shop) { out.createDiv({ cls: 'dmc-muted', text: 'Pick a shop type and press Generate.' }); return; } const comp = new Component(); comp.load(); await renderMd(this.app, shop.md, out, sourcePath || '', comp); };
    const gen = () => { shop = this.generateShop(kindSel.value, sizeSel.value, qSel.value); draw(); };
    button(ctr, 'Generate', 'sparkles', gen, 'mod-cta');
    button(actions, 'Save as place', 'file-plus', async () => {
      if (!shop) return;
      const parents = this.getNotes('place');
      const doSave = async parent => {
        const file = await this.createNote('place', shop.name, { fields: { place_type: shop.placeType, parent: parent ? '[[' + parent.basename + ']]' : undefined, proprietor: '[[' + shop.owner.name + ']]' }, body: '## Generated details\n' + shop.md.replace(/^## .*\n/, ''), noOpen: true });
        await this.createNote('npc', shop.owner.name, { fields: { role: shop.owner.role, species: shop.owner.species, location: '[[' + file.basename + ']]', attitude: 'indifferent' }, body: '## Generated details\n- **Look:** ' + shop.owner.look + '\n- **Voice:** ' + shop.owner.voice + '\n- **Wants:** ' + shop.owner.want, noOpen: true });
        this.app.workspace.getLeaf(false).openFile(file); if (onDone) onDone();
      };
      if (!parents.length) return doSave(null);
      const items = [{ basename: '— No parent (standalone)', none: true }, ...parents];
      new NoteSuggestModal(this.app, items, f => doSave(f.none ? null : f), 'Which settlement is it in?').open();
    }, 'mod-cta');
    button(actions, 'Insert into note', 'text-cursor-input', () => { if (!shop) return; const ed = this.app.workspace.activeEditor && this.app.workspace.activeEditor.editor; if (ed) { ed.replaceSelection('\n' + shop.md + '\n'); if (onDone) onDone(); } else new Notice('Open a note first.'); });
    button(actions, 'Copy', 'copy', () => { if (!shop) return; try { navigator.clipboard.writeText(shop.md); new Notice('Copied'); } catch (e) { new Notice('Copy not available'); } });
    if (opts.autogen !== false) gen(); else draw();
  },

  /* ---------- random tables ---------- */
  async gatherTables() {
    const out = [];
    for (const [cat, tabs] of Object.entries(BUILTIN_TABLES)) for (const [title, entries] of Object.entries(tabs)) out.push({ title, entries, category: cat, builtin: true });
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (f.path.startsWith(this.settings.templatesFolder + '/')) continue;
      const text = await this.app.vault.cachedRead(f);
      if (!text.includes('```roll-table')) continue;
      const re = /```roll-table[^\n]*\n([\s\S]*?)```/g; let m;
      while ((m = re.exec(text))) { const t = parseRollTable(m[1]); if (t.ref || !t.entries.length) continue; out.push({ title: t.title || f.basename, entries: t.entries, category: 'From ' + f.basename, source: f.path }); }
    }
    return out;
  },
  rollTable(t) { const i = Math.floor(Math.random() * t.entries.length); return { n: i + 1, text: rollIn(t.entries[i]) }; },
  async openTablePicker() { const ts = await this.gatherTables(); new TableSuggestModal(this.app, ts, t => new TableResultModal(this, t).open()).open(); },
  async renderTablesPanel(container) {
    const tables = await this.gatherTables();
    const head = container.createDiv({ cls: 'dmc-row dmc-wrap dmc-spread' });
    const search = head.createEl('input', { type: 'search', cls: 'dmc-input dmc-search', attr: { placeholder: 'Filter tables…' } }); lpSafe(search);
    head.createDiv({ cls: 'dmc-muted', text: 'Add your own: put a ```roll-table block in any note — it appears here automatically.' });
    const log = container.createDiv({ cls: 'dmc-card dmc-table-log' }); log.createEl('h4', { text: 'Results' });
    const logBody = log.createDiv(); logBody.createDiv({ cls: 'dmc-muted', text: 'Roll on a table below.' });
    const grid = container.createDiv({ cls: 'dmc-grid' });
    const comp = new Component(); comp.load();
    const addResult = async (t) => {
      const r = this.rollTable(t);
      if (logBody.querySelector('.dmc-muted')) logBody.empty();
      const line = document.createElement('div'); line.className = 'dmc-log-line'; logBody.prepend(line);
      line.createSpan({ cls: 'dmc-log-title', text: t.title + ' (' + r.n + '/' + t.entries.length + '): ' });
      const s = line.createSpan(); await renderMd(this.app, r.text, s, '', comp); s.querySelectorAll('p').forEach(p => p.style.display = 'inline');
      const ins = line.createSpan({ cls: 'dmc-log-insert', text: ' ↳ insert' }); lpSafe(ins);
      ins.addEventListener('click', () => { const ed = this.app.workspace.activeEditor && this.app.workspace.activeEditor.editor; if (ed) ed.replaceSelection('**' + t.title + ':** ' + r.text + '\n'); else new Notice('Open a note to insert into it.'); });
      while (logBody.children.length > 12) logBody.lastChild.remove();
    };
    const draw = () => {
      grid.empty(); const q = search.value.toLowerCase();
      const cats = {}; tables.filter(t => !q || (t.title + ' ' + t.category + ' ' + t.entries.join(' ')).toLowerCase().includes(q)).forEach(t => (cats[t.category] = cats[t.category] || []).push(t));
      for (const [cat, ts] of Object.entries(cats)) {
        const card = grid.createDiv({ cls: 'dmc-card' }); card.createEl('h4', { text: cat });
        ts.forEach(t => { const r = card.createDiv({ cls: 'dmc-line dmc-row dmc-spread' }); r.createSpan({ text: t.title }); const b = button(r, 'd' + t.entries.length, 'dices', () => addResult(t)); b.addClass('dmc-small'); });
        if (ts[0] && ts[0].source) { const a = card.createEl('a', { cls: 'dmc-muted', text: 'open note' }); a.addEventListener('click', () => this.app.workspace.openLinkText(ts[0].source, '', true)); }
      }
    };
    search.addEventListener('input', draw); draw();
  },
});

/* ================================================================== */
/* Armory & spell builders                                            */
/* ================================================================== */

const WEAPON_PROPS = ['Ammunition', 'Finesse', 'Heavy', 'Light', 'Loading', 'Reach', 'Thrown', 'Two-Handed', 'Versatile'];
const MASTERIES = ['Cleave', 'Graze', 'Nick', 'Push', 'Sap', 'Slow', 'Topple', 'Vex'];
const DMG_TYPES = ['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'];
const RARITIES = ['', 'common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];
const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];
const CASTER_CLASSES = ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'];
const GEAR_CATS = ['Adventuring Gear', 'Tool', 'Ammunition', 'Consumable', 'Pack', 'Clothing', 'Trade Good', 'Treasure', 'Mount & Vehicle'];
const ITEM_KINDS = ['Wondrous Item', 'Weapon', 'Armor', 'Ring', 'Rod', 'Staff', 'Wand', 'Potion', 'Scroll'];
const ordinal = n => n === 0 ? 'Cantrip' : n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th') + '-level';

function fEl(parent, label, el, wide) { const w = parent.createDiv({ cls: 'dmc-f' + (wide ? ' dmc-span2' : '') }); w.createEl('label', { text: label }); w.appendChild(el); return el; }
function inp(type, val, ph) { const i = document.createElement('input'); i.type = type; if (val != null) i.value = val; if (ph) i.placeholder = ph; return i; }
function sel(opts, val) { const s = document.createElement('select'); opts.forEach(o => { const op = document.createElement('option'); op.value = Array.isArray(o) ? o[0] : o; op.textContent = Array.isArray(o) ? o[1] : (o === '' ? '—' : o); s.appendChild(op); }); if (val != null) s.value = val; return s; }
function ta(val, ph, rows) { const t = document.createElement('textarea'); t.className = 'dmc-ta'; t.rows = rows || 4; t.value = val || ''; if (ph) t.placeholder = ph; return t; }
function yv(v) { return Array.isArray(v) ? JSON.stringify(v) : typeof v === 'number' || typeof v === 'boolean' ? String(v) : JSON.stringify(String(v ?? '')); }
function fmBlock(obj) { return '---\n' + Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => k + ': ' + yv(v)).join('\n') + '\n---\n'; }

class ItemBuilderModal extends Modal {
  constructor(plugin, kind, init) { super(plugin.app); this.plugin = plugin; this.kind = kind; this.init = init || {}; }
  onOpen() {
    const c = this.contentEl; c.addClass('dmc-modal', 'dmc-wide');
    const titles = { weapon: 'New weapon', armor: 'New armor', gear: 'New gear', item: 'New magic item', spell: 'New spell' };
    c.createEl('h3', { text: titles[this.kind] });
    const g = c.createDiv({ cls: 'dmc-form-grid' });
    const v = this.v = {};
    const name = fEl(g, 'Name', inp('text', this.init.name || '', this.kind === 'spell' ? 'e.g. Ashen Bolt' : 'e.g. Ember-Forged Longsword'));
    v.name = () => name.value.trim();
    const players = this.plugin.getNotes('player');
    const holderSel = () => { const s = fEl(g, 'Held by', sel([['', '— (catalog / unowned)'], ...players.map(f => [f.basename, f.basename]), ['__party', 'Party stash']], this.init.holder || '')); return s; };
    if (this.kind === 'weapon') {
      const cat = fEl(g, 'Category', sel(['Simple Melee', 'Simple Ranged', 'Martial Melee', 'Martial Ranged'], 'Martial Melee'));
      const dmg = fEl(g, 'Damage dice', inp('text', '1d8'));
      const dt = fEl(g, 'Damage type', sel(DMG_TYPES, 'Slashing'));
      const mastery = fEl(g, 'Mastery', sel(['', ...MASTERIES], 'Sap'));
      const range = fEl(g, 'Range (thrown/ammo)', inp('text', '', '80/320'));
      const vers = fEl(g, 'Versatile damage', inp('text', '', '1d10'));
      const bonus = fEl(g, 'Magic bonus', sel(['0', '1', '2', '3'], '0'));
      const rarity = fEl(g, 'Rarity', sel(RARITIES, ''));
      const attune = fEl(g, 'Requires attunement', sel([['false', 'No'], ['true', 'Yes']], 'false'));
      const weight = fEl(g, 'Weight', inp('text', '', '3 lb.'));
      const cost = fEl(g, 'Cost', inp('text', '', '15 gp'));
      const holder = holderSel();
      const qty = fEl(g, 'Quantity', inp('number', 1));
      const pw = g.createDiv({ cls: 'dmc-f dmc-span2' }); pw.createEl('label', { text: 'Properties' }); const pbox = pw.createDiv({ cls: 'dmc-checks' });
      const props = {}; WEAPON_PROPS.forEach(p => { const l = pbox.createEl('label'); const cb = l.createEl('input', { type: 'checkbox' }); l.appendText(' ' + p); props[p] = cb; lpSafe(l); });
      const desc = fEl(g, 'Description / special properties', ta('', 'Magic effects, history, appearance…'), true);
      this.build = () => {
        const b = Number(bonus.value);
        const plist = WEAPON_PROPS.filter(p => props[p].checked).map(p => p === 'Thrown' || p === 'Ammunition' ? p + (range.value ? ' (' + range.value.trim() + ')' : '') : p === 'Versatile' ? p + (vers.value ? ' (' + vers.value.trim() + ')' : '') : p);
        const fm = { type: 'weapon', category: cat.value, damage: dmg.value.trim() + (b ? ' + ' + b : ''), damage_type: dt.value, properties: plist, mastery: mastery.value, weight: weight.value, cost: cost.value, magic_bonus: b, rarity: rarity.value || (b ? ['', 'uncommon', 'rare', 'very rare'][b] : ''), attunement: attune.value === 'true', holder: this.holderLink(holder.value), quantity: Number(qty.value) || 1, tags: ['armory', 'weapon'] };
        let body = '> [!info] ' + cat.value + ' weapon' + (fm.rarity ? ' · ' + fm.rarity : '') + (fm.attunement ? ' (requires attunement)' : '') + '\n> **Damage:** ' + fm.damage + ' ' + dt.value + (b ? ' · **+' + b + ' to attack and damage rolls**' : '') + '\n> **Properties:** ' + (plist.join(', ') || '—') + '\n> **Mastery:** ' + (mastery.value ? '[[Weapon Mastery|' + mastery.value + ']]' : '—') + '\n> **Weight:** ' + (weight.value || '—') + ' · **Cost:** ' + (cost.value || '—') + '\n\n';
        body += '## Description\n' + (desc.value || '') + '\n\n## Owned copies\n```dm-list\nwhere: base\nfields: [holder, quantity]\nempty: No one owns a copy yet — use the command Give this item to a character.\n```\n';
        return { fm, body };
      };
    } else if (this.kind === 'armor') {
      const cat = fEl(g, 'Category', sel(['Light', 'Medium', 'Heavy', 'Shield'], 'Medium'));
      const base = fEl(g, 'Base AC', inp('number', 14));
      const str = fEl(g, 'Strength requirement', inp('text', '', 'e.g. 15'));
      const stealth = fEl(g, 'Stealth', sel([['', 'Normal'], ['Disadvantage', 'Disadvantage']], ''));
      const bonus = fEl(g, 'Magic bonus', sel(['0', '1', '2', '3'], '0'));
      const rarity = fEl(g, 'Rarity', sel(RARITIES, ''));
      const attune = fEl(g, 'Requires attunement', sel([['false', 'No'], ['true', 'Yes']], 'false'));
      const weight = fEl(g, 'Weight', inp('text', '', '20 lb.'));
      const cost = fEl(g, 'Cost', inp('text', '', '400 gp'));
      const holder = holderSel();
      const desc = fEl(g, 'Description / special properties', ta(''), true);
      this.build = () => {
        const b = Number(bonus.value), n = Number(base.value) || 10;
        const ac = cat.value === 'Shield' ? '+' + (2 + b) : (n + b) + (cat.value === 'Light' ? ' + Dex modifier' : cat.value === 'Medium' ? ' + Dex modifier (max 2)' : '');
        const fm = { type: 'armor', category: cat.value, ac, strength: str.value, stealth: stealth.value, weight: weight.value, cost: cost.value, magic_bonus: b, rarity: rarity.value || (b ? ['', 'rare', 'very rare', 'legendary'][b] : ''), attunement: attune.value === 'true', holder: this.holderLink(holder.value), quantity: 1, tags: ['armory', 'armor'] };
        const body = '> [!info] ' + cat.value + (cat.value === 'Shield' ? '' : ' armor') + (fm.rarity ? ' · ' + fm.rarity : '') + '\n> **AC:** ' + ac + ' · **Strength:** ' + (str.value || '—') + ' · **Stealth:** ' + (stealth.value || '—') + '\n> **Weight:** ' + (weight.value || '—') + ' · **Cost:** ' + (cost.value || '—') + '\n\n## Description\n' + (desc.value || '') + '\n\n## Owned copies\n```dm-list\nwhere: base\nfields: [holder]\nempty: No one owns a copy yet.\n```\n';
        return { fm, body };
      };
    } else if (this.kind === 'gear') {
      const cat = fEl(g, 'Category', sel(GEAR_CATS, 'Adventuring Gear'));
      const cost = fEl(g, 'Cost', inp('text', '', '1 gp'));
      const weight = fEl(g, 'Weight', inp('text', '', '1 lb.'));
      const holder = holderSel();
      const qty = fEl(g, 'Quantity', inp('number', 1));
      const desc = fEl(g, 'Description / how it works', ta(''), true);
      this.build = () => {
        const fm = { type: 'gear', category: cat.value, cost: cost.value, weight: weight.value, holder: this.holderLink(holder.value), quantity: Number(qty.value) || 1, tags: ['armory', 'gear'] };
        return { fm, body: '> [!info] ' + cat.value + '\n> **Cost:** ' + (cost.value || '—') + ' · **Weight:** ' + (weight.value || '—') + '\n\n## Description\n' + (desc.value || '') + '\n\n## Owned copies\n```dm-list\nwhere: base\nfields: [holder, quantity]\nempty: No one owns a copy yet.\n```\n' };
      };
    } else if (this.kind === 'item') {
      const kind = fEl(g, 'Item type', sel(ITEM_KINDS, 'Wondrous Item'));
      const rarity = fEl(g, 'Rarity', sel(RARITIES.slice(1), 'uncommon'));
      const attune = fEl(g, 'Requires attunement', sel([['false', 'No'], ['true', 'Yes'], ['by a spellcaster', 'By a spellcaster']], 'false'));
      const charges = fEl(g, 'Charges (optional)', inp('text', '', '7, regains 1d6+1 at dawn'));
      const holder = holderSel();
      const desc = fEl(g, 'What it does', ta('', 'Describe the effect. [[Links]] to conditions and spells work.', 6), true);
      const curse = fEl(g, 'Curse / quirk (optional)', ta('', '', 2), true);
      this.build = () => {
        const att = attune.value === 'false' ? false : attune.value === 'true' ? true : attune.value;
        const fm = { type: 'item', item_type: kind.value, rarity: rarity.value, attunement: att, charges: charges.value, holder: this.holderLink(holder.value), tags: ['armory', 'item'] };
        return { fm, body: '*' + kind.value + ', ' + rarity.value + (att ? ' (requires attunement' + (typeof att === 'string' ? ' ' + att : '') + ')' : '') + '*\n\n## Properties\n' + (desc.value || '') + (charges.value ? '\n\n**Charges:** ' + charges.value : '') + (curse.value ? '\n\n> [!secret] Curse / quirk\n> ' + curse.value : '') + '\n\n## History & lore\n' };
      };
    } else if (this.kind === 'spell') {
      const level = fEl(g, 'Level', sel(Array.from({ length: 10 }, (_, i) => [String(i), i === 0 ? 'Cantrip' : 'Level ' + i]), '1'));
      const school = fEl(g, 'School', sel(SCHOOLS, 'Evocation'));
      const time = fEl(g, 'Casting time', sel(['Action', 'Bonus Action', 'Reaction', '1 minute', '10 minutes', '1 hour', '8 hours'], 'Action'));
      const trigger = fEl(g, 'Reaction trigger (if Reaction)', inp('text', '', 'which you take when…'));
      const range = fEl(g, 'Range', inp('text', '60 feet'));
      const dur = fEl(g, 'Duration', inp('text', 'Instantaneous'));
      const conc = fEl(g, 'Concentration', sel([['false', 'No'], ['true', 'Yes']], 'false'));
      const ritual = fEl(g, 'Ritual', sel([['false', 'No'], ['true', 'Yes']], 'false'));
      const cw = g.createDiv({ cls: 'dmc-f' }); cw.createEl('label', { text: 'Components' }); const cbox = cw.createDiv({ cls: 'dmc-checks' });
      const comps = {}; ['V', 'S', 'M'].forEach(k => { const l = cbox.createEl('label'); const cb = l.createEl('input', { type: 'checkbox' }); cb.checked = k !== 'M'; l.appendText(' ' + k); comps[k] = cb; });
      const mat = fEl(g, 'Material component', inp('text', '', 'a pinch of ash'));
      const kw = g.createDiv({ cls: 'dmc-f dmc-span2' }); kw.createEl('label', { text: 'Classes' }); const kbox = kw.createDiv({ cls: 'dmc-checks' });
      const cls = {}; CASTER_CLASSES.forEach(k => { const l = kbox.createEl('label'); const cb = l.createEl('input', { type: 'checkbox' }); l.appendText(' ' + k); cls[k] = cb; lpSafe(l); });
      const desc = fEl(g, 'Effect', ta('', 'What happens? e.g. *Dexterity Saving Throw* … *Failure:* 3d6 Fire damage.', 6), true);
      const higher = fEl(g, 'Using a higher-level slot / cantrip upgrade', ta('', '', 2), true);
      this.build = () => {
        const L = Number(level.value);
        const compStr = ['V', 'S', 'M'].filter(k => comps[k].checked).join(', ') + (comps.M.checked && mat.value ? ' (' + mat.value + ')' : '');
        const fm = { type: 'spell', level: L, school: school.value, casting_time: time.value + (time.value === 'Reaction' && trigger.value ? ', ' + trigger.value : ''), range: range.value, components: compStr, duration: (conc.value === 'true' ? 'Concentration, up to ' : '') + dur.value.replace(/^Concentration,?\s*(up to\s*)?/i, ''), concentration: conc.value === 'true', ritual: ritual.value === 'true', classes: CASTER_CLASSES.filter(k => cls[k].checked), source: 'Homebrew', tags: ['spell'] };
        const sub = L === 0 ? school.value + ' Cantrip' : 'Level ' + L + ' ' + school.value + (fm.ritual ? ' (Ritual)' : '');
        let body = '*' + sub + ' (' + (fm.classes.join(', ') || '—') + ')*\n\n> [!info] Casting\n> **Casting Time:** ' + fm.casting_time + (fm.ritual ? ' or Ritual' : '') + '\n> **Range:** ' + fm.range + '\n> **Components:** ' + compStr + '\n> **Duration:** ' + fm.duration + '\n\n' + (desc.value || '') + '\n';
        if (higher.value) body += '\n**' + (L === 0 ? 'Cantrip Upgrade' : 'Using a Higher-Level Spell Slot') + '.** ' + higher.value + '\n';
        return { fm, body };
      };
    }
    // live preview
    const prevWrap = c.createDiv({ cls: 'dmc-item-preview' });
    const draw = async () => { if (!this.build) return; prevWrap.empty(); const { body } = this.build(); prevWrap.createEl('h4', { text: v.name() || 'Preview' }); const comp = new Component(); comp.load(); await renderMd(this.app, body.replace(/```dm-list[\s\S]*?```/g, ''), prevWrap, '', comp); };
    const deb = obsidian.debounce ? obsidian.debounce(draw, 250, true) : draw;
    g.addEventListener('input', deb); g.addEventListener('change', deb); draw();
    const foot = c.createDiv({ cls: 'dmc-row dmc-wrap', attr: { style: 'margin-top:10px' } });
    button(foot, 'Save to ' + (this.kind === 'spell' ? 'Spells' : 'Armory'), 'save', () => this.save(), 'mod-cta');
    button(foot, 'Cancel', null, () => this.close());
  }
  holderLink(v) { return !v ? '' : v === '__party' ? 'Party stash' : '[[' + v + ']]'; }
  async save() {
    const name = this.v.name(); if (!name) { new Notice('Give it a name first.'); return; }
    const { fm, body } = this.build();
    const file = await this.plugin.createNote(this.kind, name, { raw: fmBlock(fm) + '# ' + name + '\n\n' + body });
    this.close(); return file;
  }
  onClose() { this.contentEl.empty(); }
}

Object.assign(DMCodexPlugin.prototype, {
  openItemBuilder(kind, init) { new ItemBuilderModal(this, kind, init).open(); },
  /** Give an armory item to a character: catalog items are copied, owned items change hands. */
  async giveItem(file) {
    const fm = this.fm(file); const t = String(fm.type || '');
    if (!['weapon', 'armor', 'gear', 'item'].includes(t)) { new Notice('Open a weapon, armor, gear or magic item note first.'); return; }
    const targets = [...this.getNotes('player'), { basename: 'Party stash', stash: true }];
    new NoteSuggestModal(this.app, targets, async who => {
      const holder = who.stash ? 'Party stash' : '[[' + who.basename + ']]';
      const owned = fm.holder && String(fm.holder).trim();
      if (owned) { await this.app.fileManager.processFrontMatter(file, f => { f.holder = holder; }); new Notice(file.basename + ' → ' + (who.basename)); return; }
      new PromptModal(this.app, 'How many?', '1', async q => {
        const n = Math.max(1, Number(q) || 1);
        const text = await this.app.vault.read(file);
        const body = text.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/^# .*\n/, '').replace(/## Owned copies[\s\S]*$/, '');
        const newFm = Object.assign({}, fm, { holder, quantity: n, base: '[[' + file.basename + ']]' });
        delete newFm.position;
        const name = file.basename + ' (' + (who.stash ? 'Party' : who.basename.split(' ')[0]) + ')';
        await this.createNote(t, name, { raw: fmBlock(newFm) + '# ' + name + '\n\n*Copy of [[' + file.basename + ']] held by ' + holder + '.*\n\n' + body.trim() + '\n\n## Notes\n- Condition, engravings, history…\n', noOpen: true });
      }, { value: '1', cta: 'Give' }).open();
    }, 'Give “' + file.basename + '” to…').open();
  },
  renderArmory(body) {
    const bar = body.createDiv({ cls: 'dmc-row dmc-wrap', attr: { style: 'margin-bottom:8px' } });
    button(bar, 'New weapon', 'sword', () => this.openItemBuilder('weapon'), 'mod-cta');
    button(bar, 'New armor', 'shield', () => this.openItemBuilder('armor'));
    button(bar, 'New gear', 'backpack', () => this.openItemBuilder('gear'));
    button(bar, 'New magic item', 'gem', () => this.openItemBuilder('item'));
    const inv = body.createDiv({ cls: 'dmc-card' }); inv.createEl('h4', { text: 'Party inventory' });
    const owned = ['weapon', 'armor', 'gear', 'item'].flatMap(k => this.getNotes(k)).filter(f => String(this.fm(f).holder || '').trim());
    if (!owned.length) inv.createDiv({ cls: 'dmc-muted', text: 'Nothing assigned yet. Open any Armory item and run “Give this item to a character”, or set its holder property.' });
    const groups = {}; owned.forEach(f => { const h = stripLinks(this.fm(f).holder); (groups[h] = groups[h] || []).push(f); });
    const grid = inv.createDiv({ cls: 'dmc-grid' });
    for (const [h, fs] of Object.entries(groups).sort()) {
      const c = grid.createDiv({ cls: 'dmc-inv' }); const hf = this.app.metadataCache.getFirstLinkpathDest(h, '');
      const head = c.createDiv({ cls: 'dmc-inv-head' }); if (hf) { const a = head.createEl('a', { cls: 'internal-link', text: h }); a.addEventListener('click', () => this.app.workspace.openLinkText(hf.path, '', false)); } else head.setText(h);
      fs.forEach(f => { const r = c.createDiv({ cls: 'dmc-line' }); const a = r.createEl('a', { cls: 'internal-link', text: f.basename }); a.addEventListener('click', () => this.app.workspace.openLinkText(f.path, '', false)); const q = this.fm(f).quantity; if (q > 1) r.createSpan({ cls: 'dmc-pill', text: '×' + q }); r.createSpan({ cls: 'dmc-pill', text: this.fm(f).type }); });
    }
  },
});

/* ================================================================== */
/* Safe vault-content updates                                          */
/* ================================================================== */
/*
 * content.json (shipped in this plugin's folder) holds the reference notes that come with the vault:
 * rules, spells, armory catalog, SRD bestiary, templates, DM tools. "Update vault content":
 *   - adds files that don't exist yet (unless you deleted them after an earlier install),
 *   - replaces files you have NOT edited since they were installed (fingerprint matches),
 *   - never overwrites a file you edited — you can view the new version and choose,
 *   - never touches your campaign notes (sessions, NPCs, places, party, quests…).
 */
function contentHash(s) {
  s = String(s).replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\s+$/, '');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

class UpdateModal extends Modal {
  constructor(plugin, pack, plan) { super(plugin.app); this.plugin = plugin; this.pack = pack; this.plan = plan; }
  onOpen() { this.modalEl.addClass('dmc-update-modal'); this.draw(); }
  draw() {
    const c = this.contentEl; c.empty(); c.addClass('dmc-modal');
    const p = this.plan, applied = !!p.applied;
    c.createEl('h3', { text: (applied ? 'Vault content updated to ' : 'Update vault content to ') + 'v' + this.pack.version });
    if (!applied) c.createEl('p', { cls: 'dmc-muted', text: 'Nothing has changed yet. Review the plan, then click Apply. Your campaign notes (sessions, NPCs, places, party, quests, ideas) are never touched.' });
    const sec = (title, list, cls, extra) => {
      if (!list.length) return;
      const d = c.createEl('details', { cls: 'dmc-upd-sec ' + cls }); if (list.length <= 12 || cls === 'is-kept') d.open = true;
      d.createEl('summary', { text: title + ' (' + list.length + ')' });
      const ul = d.createDiv({ cls: 'dmc-upd-list' });
      list.forEach(path => { const r = ul.createDiv({ cls: 'dmc-upd-row' }); r.createSpan({ cls: 'dmc-upd-path', text: path.replace(/\.md$/, '') }); if (extra) extra(r, path); });
    };
    sec(applied ? 'Added' : 'Will be added', p.add, 'is-add');
    sec(applied ? 'Updated (you hadn\'t edited them)' : 'Will be updated (you haven\'t edited them)', p.update, 'is-update');
    sec('You edited these — kept your version', p.kept, 'is-kept', (r, path) => {
      button(r, 'View new', 'eye', () => new PackPreviewModal(this.plugin, path, this.pack.files[path]).open());
      button(r, 'Use new version', 'download', async () => { await this.plugin.replaceWithPack(this.pack, path); p.kept = p.kept.filter(x => x !== path); p.update.push(path); this.draw(); });
      button(r, 'Keep mine', 'check', async () => { await this.plugin.keepMine(this.pack, path); p.kept = p.kept.filter(x => x !== path); p.mine.push(path); this.draw(); });
    });
    sec('Kept yours (decided)', p.mine, 'is-mine');
    sec('Not re-added (you deleted them)', p.deleted, 'is-deleted', (r, path) => {
      button(r, 'Restore', 'rotate-ccw', async () => { await this.plugin.replaceWithPack(this.pack, path); p.deleted = p.deleted.filter(x => x !== path); p.add.push(path); this.draw(); });
    });
    c.createDiv({ cls: 'dmc-muted', text: p.same + ' file(s) already up to date.' });
    const foot = c.createDiv({ cls: 'dmc-row dmc-wrap', attr: { style: 'margin-top:12px' } });
    if (!applied) {
      button(foot, 'Apply update', 'check', async () => { await this.plugin.applyContentUpdate(this.pack, this.plan); this.draw(); }, 'mod-cta');
      button(foot, 'Cancel', null, () => this.close());
    } else {
      if (p.kept.length) button(foot, 'Use new version for all ' + p.kept.length + ' edited files', 'alert-triangle', () => new ConfirmModal(this.app, 'Replace ' + p.kept.length + ' notes you edited with the new versions? Your edits in those notes will be lost.', async () => { for (const path of [...p.kept]) { await this.plugin.replaceWithPack(this.pack, path); p.update.push(path); } p.kept = []; this.draw(); }).open());
      button(foot, 'Done', 'check', () => this.close(), 'mod-cta');
    }
  }
  onClose() { this.contentEl.empty(); }
}
class PackPreviewModal extends Modal {
  constructor(plugin, path, content) { super(plugin.app); this.plugin = plugin; this.path = path; this.content = content; }
  async onOpen() {
    const c = this.contentEl; c.addClass('dmc-modal', 'dmc-wide');
    c.createEl('h3', { text: 'New version: ' + this.path.replace(/\.md$/, '') });
    const body = c.createDiv({ cls: 'dmc-pack-preview' });
    const comp = new Component(); comp.load();
    await renderMd(this.app, String(this.content).replace(/^---\n[\s\S]*?\n---\n/, ''), body, this.path, comp);
  }
  onClose() { this.contentEl.empty(); }
}
class ConfirmModal extends Modal {
  constructor(app, text, onYes) { super(app); this.text = text; this.onYes = onYes; }
  onOpen() { const c = this.contentEl; c.createEl('p', { text: this.text }); const r = c.createDiv({ cls: 'dmc-row' }); button(r, 'Yes, replace', 'check', () => { this.close(); this.onYes(); }, 'mod-warning'); button(r, 'Cancel', null, () => this.close()); }
  onClose() { this.contentEl.empty(); }
}

Object.assign(DMCodexPlugin.prototype, {
  async loadContentPack() {
    if (typeof EMBEDDED_CONTENT_PACK !== 'undefined' && EMBEDDED_CONTENT_PACK && EMBEDDED_CONTENT_PACK.files) return EMBEDDED_CONTENT_PACK;
    try {
      const p = normalizePath(this.manifest.dir + '/content.json');
      if (!(await this.app.vault.adapter.exists(p))) return null;
      return JSON.parse(await this.app.vault.adapter.read(p));
    } catch (e) { console.error('DM Codex: could not read content pack', e); return null; }
  },
  async planContentUpdate(pack) {
    const managed = this.settings.managed || {};
    const plan = { add: [], update: [], kept: [], mine: [], deleted: [], same: 0 };
    for (const [path, content] of Object.entries(pack.files)) {
      const f = this.app.vault.getAbstractFileByPath(path);
      const newH = contentHash(content);
      if (f instanceof TFile) {
        const curH = contentHash(await this.app.vault.read(f));
        if (curH === newH) { plan.same++; continue; }
        if (managed[path] && managed[path] === curH) plan.update.push(path);   // untouched since we installed it
        else if (managed[path] === 'mine:' + newH) plan.mine.push(path);       // already chose to keep theirs for this version
        else plan.kept.push(path);                                            // edited (or unknown) → never overwrite
      } else if (managed[path]) plan.deleted.push(path);                       // was installed, user removed it
      else plan.add.push(path);
    }
    return plan;
  },
  async writePackFile(path, content) {
    const dir = path.split('/').slice(0, -1).join('/');
    if (dir) await this.ensureFolder(dir);
    const f = this.app.vault.getAbstractFileByPath(path);
    if (f instanceof TFile) await this.app.vault.modify(f, content); else await this.app.vault.create(path, content);
    this.settings.managed = this.settings.managed || {};
    this.settings.managed[path] = contentHash(content);
  },
  async replaceWithPack(pack, path) { await this.writePackFile(path, pack.files[path]); await this.saveSettings(); },
  async keepMine(pack, path) { this.settings.managed = this.settings.managed || {}; this.settings.managed[path] = 'mine:' + contentHash(pack.files[path]); await this.saveSettings(); },
  async applyContentUpdate(pack, plan) {
    for (const path of plan.add.concat(plan.update)) {
      try { await this.writePackFile(path, pack.files[path]); } catch (e) { console.error('DM Codex update failed for', path, e); new Notice('Could not write ' + path + ': ' + e.message); }
    }
    // record fingerprints for files that already matched, so future updates can refresh them
    for (const [path, content] of Object.entries(pack.files)) {
      const f = this.app.vault.getAbstractFileByPath(path);
      if (f instanceof TFile && !plan.kept.includes(path) && !plan.mine.includes(path)) this.settings.managed[path] = contentHash(content);
    }
    if (pack.snippets) await this.installSnippets(pack.snippets);
    this.settings.contentVersion = pack.version;
    await this.saveSettings();
    plan.applied = true;
    new Notice('DM Vault content updated to v' + pack.version + ': ' + plan.add.length + ' added, ' + plan.update.length + ' updated, ' + plan.kept.length + ' kept as you edited them.', 8000);
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(l => l.view.render && l.view.render());
  },
  async installSnippets(snippets) {
    const dir = this.app.vault.configDir + '/snippets';
    try {
      if (!(await this.app.vault.adapter.exists(dir))) await this.app.vault.adapter.mkdir(dir);
      for (const [name, css] of Object.entries(snippets)) {
        await this.app.vault.adapter.write(dir + '/' + name + '.css', css);
        const cc = this.app.customCss;
        if (cc) { if (cc.requestLoadSnippets) await cc.requestLoadSnippets(); else if (cc.readSnippets) await cc.readSnippets(); if (cc.setCssEnabledStatus) cc.setCssEnabledStatus(name, true); }
      }
    } catch (e) { console.error('DM Codex: snippet install failed', e); }
  },
  async runContentUpdate() {
    const pack = await this.loadContentPack();
    if (!pack) { new Notice('No content pack found in the DM Codex plugin folder.'); return; }
    const plan = await this.planContentUpdate(pack);
    new UpdateModal(this, pack, plan).open();
  },
  async checkForContentUpdate() {
    const pack = await this.loadContentPack(); if (!pack) return;
    this.availableContentVersion = pack.version;
    if (pack.version !== this.settings.contentVersion) {
      const n = new Notice('DM Vault content v' + pack.version + ' is available. Click here (or run “DM Codex: Update vault content”) — your own notes are never overwritten.', 15000);
      if (n.noticeEl) n.noticeEl.addEventListener('click', () => this.runContentUpdate());
    }
  },
});

/* @@CONTENT_PACK_START@@ */
const EMBEDDED_CONTENT_PACK = null; // filled in by tools/build.py
/* @@CONTENT_PACK_END@@ */

module.exports = DMCodexPlugin;
module.exports.rollDice = rollDice;
