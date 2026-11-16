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
const ICON_FALLBACKS = { 'user-round': ['user-2', 'user'], 'wand-sparkles': ['wand-2', 'wand', 'sparkles'], 'arrow-down-wide-narrow': ['sort-desc', 'arrow-down'], 'scroll-text': ['scroll', 'file-text'], 'flask-conical': ['flask-round', 'beaker'], 'dices': ['dice-5', 'dice'], 'dice-5': ['dices', 'dice'], 'backpack': ['briefcase', 'package'], 'list-ordered': ['list'], 'eye-off': ['eye'], 'swords': ['sword', 'crosshair'], 'sword': ['swords', 'crosshair'], 'store': ['shopping-bag', 'home'], 'table': ['table-2', 'grid'], 'crown': ['award', 'star'], 'castle': ['home'], 'hand': ['gift'], 'layers': ['copy'], 'wand': ['wand-2', 'sparkles'], 'skull': ['ghost', 'alert-triangle'], 'beer': ['coffee', 'cup-soda'], 'hammer': ['wrench'], 'text-cursor-input': ['type', 'edit'], 'file-plus': ['file', 'plus'], 'user-plus': ['user', 'plus'] , 'image-plus': ['image', 'plus'], 'upload': ['arrow-up', 'file-plus'], 'trending-up': ['arrow-up-right', 'arrow-up'], 'image': ['file'], 'rotate-ccw': ['refresh-ccw', 'undo'], 'scan-text': ['scan', 'file-text'], 'wand': ['wand-sparkles', 'sparkles'], 'hand-coins': ['coins', 'badge-dollar-sign', 'circle-dollar-sign']};
function setIcon(el, name) {
  const tryOne = n => { try { if (el.empty) el.empty(); obsidian.setIcon(el, n); } catch (e) { return false; } return !!(el.querySelector && el.querySelector('svg')); };
  if (tryOne(name)) return;
  for (const alt of (ICON_FALLBACKS[name] || [])) if (tryOne(alt)) return;
  tryOne('circle');
}

const VIEW_TYPE = 'dm-codex-dashboard';
const DELETABLE_TYPES = ['encounter'];
const COLUMN_LABELS = { dndbeyond: 'D&D Beyond', hp_max: 'HP max', passive_perception: 'Passive Perc.', session_number: '#', for_session: 'For session', init_bonus: 'Init' };

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
  campaign: { label: 'Campaign Summary', plural: 'Campaign', icon: 'book-open', folder: 'Campaign' },
  spell: { label: 'Spell', plural: 'Spells', icon: 'wand-sparkles', folder: 'Rules 2024/Spells' },
};

const TEMPLATE_FILES = {
  session: 'Session', player: 'Player Character', quest: 'Quest', npc: 'NPC', place: 'Place',
  faction: 'Faction', item: 'Item', idea: 'Idea', arc: 'Story Arc', prep: 'Session Prep', monster: 'Monster', encounter: 'Encounter', spell: 'Spell', campaign: 'Campaign', weapon: 'Weapon', armor: 'Armor', gear: 'Gear',
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
  ocrAllowed: null,
  banner: { show: true, image: '', subtitle: '', height: 200, focus: 35, align: 'center' },
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
/** Make [[links]] in Markdown rendered inside a custom view clickable (Obsidian only does this in notes). */
function wireLinks(app, el, sourcePath) {
  if (el._dmcLinks) return; el._dmcLinks = true;
  el.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a');
    if (!a || !el.contains(a)) return;
    if (a.hasClass ? a.hasClass('internal-link') : a.classList.contains('internal-link')) {
      e.preventDefault(); e.stopPropagation();
      const target = a.getAttr ? (a.getAttr('data-href') || a.getAttr('href')) : (a.dataset.href || a.getAttribute('href'));
      if (target) app.workspace.openLinkText(target, sourcePath || '', Keymap.isModEvent(e));
    }
  });
  el.addEventListener('mouseover', e => {
    const a = e.target.closest && e.target.closest('a.internal-link');
    if (!a || !el.contains(a)) return;
    const target = a.getAttribute('data-href') || a.getAttribute('href');
    if (target) app.workspace.trigger('hover-link', { event: e, source: 'dm-codex', hoverParent: el, targetEl: a, linktext: target, sourcePath: sourcePath || '' });
  });
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
  ['idea', 'Ideas & Arcs', 'lightbulb'],
  ['session', 'Sessions', 'scroll-text'],
  ['threads', 'Threads', 'list-checks'],
  ['player', 'Party', 'users'],
  ['npc', 'NPCs', 'user-round'],
  ['place', 'Places', 'map-pin'],
  ['quest', 'Quests', 'map'],
  ['faction', 'Factions', 'flag'],
  ['encounter', 'Encounters', 'swords'],
  ['monster', 'Bestiary', 'skull'],
  ['armory', 'Armory', 'sword'],
  ['spell', 'Spells', 'wand-sparkles'],
  ['shops', 'Taverns & Shops', 'store'],
  ['tables', 'Random Tables', 'table'],
  ['tools', 'Generators', 'dices'],
];

const COLUMNS = {
  session: ['session_number', 'date', 'status', 'arc', 'prep'],
  player: ['player', 'species', 'class', 'level', 'ac', 'hp_max', 'passive_perception', 'dndbeyond'],
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
  prep: ['for_session', 'arc', 'date'],
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
    const bs = this.plugin.bannerSettings();
    if (bs.show !== false) this.plugin.drawBanner(el);
    else {
      const header = el.createDiv({ cls: 'dmc-header' });
      header.createEl('h2', { text: this.plugin.settings.campaignName });
      header.createDiv({ cls: 'dmc-muted', text: 'DM Codex · ' + today() });
      const eb = button(header, 'Banner', 'image', () => new BannerModal(this.plugin).open(), 'dmc-icon-btn dmc-banner-add'); eb.setAttr('title', 'Add a banner');
    }
    const tabs = el.createDiv({ cls: 'dmc-tabs' });
    for (const [key, label, icon] of TABS) {
      const t = button(tabs, label, icon, () => { this.tab = key; this.filter = ''; this.plugin.settings.dashboardTab = key; this.plugin.saveSettings(); this.render(); }, 'dmc-tab' + (this.tab === key ? ' is-active' : ''));
      t.setAttr('aria-label', label);
    }
    const body = el.createDiv({ cls: 'dmc-body' });
    if (this.tab === 'overview') this.renderOverview(body);
    else if (this.tab === 'tools') this.renderTools(body);
    else if (this.tab === 'idea') { this.renderList(body, 'idea'); this.renderList(body, 'arc'); }
    else if (this.tab === 'threads') {
      const c = body.createDiv({ cls: 'dmc-card' }); const h = c.createEl('h4'); setIcon(h.createSpan({ cls: 'dmc-btn-icon' }), 'list-checks'); h.appendText(' Threads & follow-ups');
      c.createDiv({ cls: 'dmc-muted', text: 'Every checklist item under “Threads & follow-ups” in your session notes. Ticking one here ticks it in the session.', attr: { style: 'margin-bottom:8px' } });
      this.plugin.renderThreads(c, '', { filter: this.threadFilter || 'open', onFilter: k => { this.threadFilter = k; } });
    }
    else if (this.tab === 'session') { this.renderList(body, 'session'); this.renderList(body, 'prep'); }
    else if (this.tab === 'faction') { this.renderList(body, 'faction'); }
    else if (this.tab === 'armory') {
      const p = this.plugin; this.plugin.renderArmory(body, this);
      ['weapon', 'armor', 'gear'].forEach(k => this.renderList(body, k, { collapsible: true }));
      this.renderList(body, 'item', { collapsible: true, filter: f => !p.isPotion(f) });
      this.renderList(body, 'item', { collapsible: true, key: 'list-potion', title: 'Potions', icon: 'flask-conical', filter: f => p.isPotion(f), newLabel: 'New potion',
        onNew: () => p.openItemBuilder('item', { item_type: 'Potion', rarity: 'common' }),
        cols: ['rarity', 'cost', 'effect', 'source', 'holder'],
        sort: (a, b) => (RARITY_ORDER[String(p.fm(a).rarity).toLowerCase()] ?? 9) - (RARITY_ORDER[String(p.fm(b).rarity).toLowerCase()] ?? 9) || a.basename.localeCompare(b.basename),
        cell: (c, f, fm, td) => {
          if (c === 'cost') { const pc = p.potionCost(fm); td.setText(pc.text); if (pc.derived) { td.addClass('dmc-muted'); td.setAttr('title', 'No cost set — 2024 guideline for a ' + (fm.rarity || 'common') + ' consumable'); } return true; }
          if (c === 'effect') { td.setText(stripLinks(fm.effect || '')); td.addClass('dmc-cell-wrap'); return true; }
          if (c === 'source') { td.setText(fm.source ? String(fm.source).replace(/^SRD.*$/i, 'Rules') : 'Homebrew'); return true; }
          return false;
        } });
    }
    else if (this.tab === 'spell') { const c = body.createDiv({ cls: 'dmc-card' }); c.createEl('h4', { text: 'Spells' }); this.plugin.renderSpellBrowser(c, ''); this.plugin.renderSpellGenWidget(this.collapsible(body, 'spellgen', 'Random spell generator', 'sparkles'), null); }
    else if (this.tab === 'shops') { const c = body.createDiv({ cls: 'dmc-card' }); this.plugin.renderShopWidget(c, null, {}); }
    else if (this.tab === 'tables') { this.plugin.renderTablesPanel(body); }
    else if (this.tab === 'monster' || this.tab === 'encounter') {
      const bar = body.createDiv({ cls: 'dmc-row dmc-wrap', attr: { style: 'margin-bottom:8px' } });
      const run = id => { if (!this.app.commands.executeCommandById(id)) new Notice('Enable the DM Statblocks plugin.'); };
      if (this.tab === 'monster') { button(bar, 'Creature', 'skull', () => run('dm-statblocks:new-monster'), 'mod-cta'); button(bar, 'Random creature', 'dices', () => run('dm-statblocks:random-monster')); }
      else { button(bar, 'Build an encounter', 'swords', () => run('dm-statblocks:new-encounter'), 'mod-cta'); button(bar, 'Suggest a random encounter', 'sparkles', () => run('dm-statblocks:suggest-encounter')); button(bar, 'Initiative tracker', 'list-ordered', () => run('dm-statblocks:open-tracker')); }
      this.renderList(body, this.tab);
    }
    else if (this.tab === 'player') { this.renderList(body, 'player'); this.plugin.renderLevelCard(body); }
    else this.renderList(body, this.tab);
  }
  link(parent, file, text) {
    const a = parent.createEl('a', { cls: 'internal-link', text: text || file.basename, href: file.path });
    a.addEventListener('click', e => { e.preventDefault(); this.app.workspace.openLinkText(file.path, '', Keymap.isModEvent(e)); });
    a.addEventListener('mouseover', e => this.app.workspace.trigger('hover-link', { event: e, source: VIEW_TYPE, hoverParent: this, targetEl: a, linktext: file.path }));
    return a;
  }
  /** Quick create, grouped by what the buttons are for. Uniform buttons in a fixed 2-column grid per group. */
  renderQuickCreate(card) {
    const p = this.plugin;
    const hasCmd = id => !!(this.app.commands && this.app.commands.commands[id]);
    const run = id => () => this.app.commands.executeCommandById(id);
    const create = k => () => p.promptCreate(k);
    const GROUPS = [
      { title: 'Run the game', icon: 'scroll-text', items: [
        ['Session', 'scroll-text', create('session'), 'New session (numbers and links itself)'],
        ['Prep', 'clipboard-list', create('prep'), 'New session prep note'],
        ['Encounter', 'swords', create('encounter'), 'Encounter builder'],
        ['Initiative', 'list-ordered', run('dm-statblocks:open-tracker'), 'Open the initiative tracker', 'dm-statblocks:open-tracker'],
      ] },
      { title: 'Party & world', icon: 'users', items: [
        ['Player', 'users', create('player'), 'New player character'],
        ['NPC', 'user-round', create('npc'), 'New NPC'],
        ['Place', 'map-pin', create('place'), 'New place'],
        ['Faction', 'flag', create('faction'), 'New faction'],
        ['Quest', 'map', create('quest'), 'New quest'],
      ] },
      { title: 'Creatures & NPCs', icon: 'skull', items: [
        ['Creature', 'skull', create('monster'), 'Creature builder: monster, villain or NPC with a statblock (choose Kind in the form)'],
        ['Random', 'dices', run('dm-statblocks:random-monster'), 'Random creature for your party', 'dm-statblocks:random-monster'],
      ] },
      { title: 'Armory & magic', icon: 'sword', items: [
        ['Weapon', 'sword', create('weapon'), 'New weapon'],
        ['Armor', 'shield', create('armor'), 'New armor'],
        ['Gear', 'backpack', create('gear'), 'New gear'],
        ['Magic item', 'gem', create('item'), 'New magic item'],
        ['Spell', 'wand-sparkles', create('spell'), 'New spell'],
        ['Random loot', 'sparkles', () => new ArmoryGenModal(p).open(), 'Random weapons, armor, gear and magic items'],
        ['Potion', 'flask-conical', () => p.openItemBuilder('item', { item_type: 'Potion', rarity: 'common' }), 'New potion — appears in the Armory\'s Potions section'],
        ['Import', 'scan-text', () => new ImportKindModal(p).open(), 'Import a weapon, armor, gear, magic item or spell from a picture or pasted text'],
      ] },
      { title: 'Generators', icon: 'sparkles', items: [
        ['Side quest', 'sparkles', () => new SideQuestModal(p).open(), 'Side quest generator'],
        ['NPC', 'user-plus', () => new NpcGenModal(p).open(), 'Random NPC'],
        ['Tavern', 'beer', () => new ShopModal(p, 'tavern').open(), 'Tavern / inn generator'],
        ['Shop', 'store', () => new ShopModal(p, 'potion').open(), 'Shop generator (potion, general, smithy, magic…)'],
        ['Random loot', 'gem', () => new ArmoryGenModal(p).open(), 'Random weapons, armor, gear and magic items'],
        ['Random spell', 'wand-sparkles', () => new SpellGenModal(p).open(), 'Invent a new spell'],
        ['Roll table', 'table', () => p.openTablePicker(), 'Roll on a random table'],
        ['Dice', 'dices', () => new DiceModal(this.app).open(), 'Dice roller'],
      ] },
      { title: 'Planning', icon: 'lightbulb', items: [
        ['Idea', 'lightbulb', create('idea'), 'Capture an idea'],
        ['Story arc', 'git-branch', create('arc'), 'New story arc'],
      ] },
    ];
    card.createEl('h4', { text: 'Quick create' });
    const grid = card.createDiv({ cls: 'dmc-qgroups' });
    for (const g of GROUPS) {
      const items = g.items.filter(it => !it[4] || hasCmd(it[4]));
      if (!items.length) continue;
      const box = grid.createDiv({ cls: 'dmc-qgroup' });
      const head = box.createDiv({ cls: 'dmc-qgroup-title' });
      setIcon(head.createSpan({ cls: 'dmc-qgroup-icon' }), g.icon); head.createSpan({ text: g.title });
      const bg = box.createDiv({ cls: 'dmc-qgrid' });
      for (const [label, icon, fn, tip] of items) {
        const b = button(bg, label, icon, fn, 'dmc-qbtn');
        b.setAttr('aria-label', tip); b.setAttr('title', tip);
      }
    }
  }
  /** A collapsible section (closed by default; remembers what you opened while the dashboard is open). */
  collapsible(body, key, title, icon, count) {
    this.openSections = this.openSections || new Set();
    const d = body.createEl('details', { cls: 'dmc-card dmc-collapse' });
    d.open = this.openSections.has(key);
    d.addEventListener('toggle', () => { if (d.open) this.openSections.add(key); else this.openSections.delete(key); });
    const sm = d.createEl('summary', { cls: 'dmc-collapse-head' });
    setIcon(sm.createSpan({ cls: 'dmc-btn-icon' }), icon); sm.createSpan({ cls: 'dmc-collapse-title', text: title });
    if (count != null) sm.createSpan({ cls: 'dmc-pill', text: String(count) });
    return d.createDiv({ cls: 'dmc-collapse-body' });
  }
  renderOverview(body) {
    const p = this.plugin;
    if (p.availableContentVersion && p.availableContentVersion !== p.settings.contentVersion) {
      const up = body.createDiv({ cls: 'dmc-card dmc-update-banner' });
      up.createDiv({ text: 'DM Vault content v' + p.availableContentVersion + ' is ready to install. New notes are added and unedited ones refreshed — anything you\'ve edited is kept.' });
      button(up, 'Review & update', 'download', () => p.runContentUpdate(), 'mod-cta');
    }
    p.renderCampaignSummary(body, this);
    this.renderQuickCreate(body.createDiv({ cls: 'dmc-card dmc-quick' }));

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
    const c2 = grid.createDiv({ cls: 'dmc-card' }); const c2h = c2.createDiv({ cls: 'dmc-card-head' }); c2h.createEl('h4', { text: 'Party' });
    { const b = button(c2h, 'Level up', 'trending-up', () => p.openLevelUp({}), 'dmc-icon-btn dmc-small'); b.setAttr('title', 'Record a level-up for the party'); }
    const party = p.getNotes('player').filter(f => (p.fm(f).status || 'active') === 'active');
    if (!party.length) c2.createDiv({ cls: 'dmc-muted', text: 'No player characters yet.' });
    party.forEach(f => {
      const fm = p.fm(f); const r = c2.createDiv({ cls: 'dmc-line' });
      p.avatar(r, f); this.link(r, f);
      r.createSpan({ cls: 'dmc-muted', text: ' — ' + [fm.species, fm.class, fm.level ? 'Lv ' + fm.level : ''].filter(Boolean).join(' ') });
      r.createSpan({ cls: 'dmc-pill', text: 'AC ' + (fm.ac ?? '?') }); r.createSpan({ cls: 'dmc-pill', text: 'PP ' + (fm.passive_perception ?? '?') });
      if (fm.dndbeyond && /^https?:\/\//i.test(String(fm.dndbeyond).trim())) { const a = r.createEl('a', { cls: 'external-link dmc-ddb-mini', text: 'DDB ↗' }); a.setAttr('href', String(fm.dndbeyond).trim()); a.setAttr('target', '_blank'); a.setAttr('title', 'Open on D&D Beyond'); }
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
  renderList(body, type, opts = {}) {
    const p = this.plugin; let card, head;
    if (opts.collapsible) {
      card = this.collapsible(body, opts.key || ('list-' + type), opts.title || TYPES[type].plural, opts.icon || TYPES[type].icon, p.getNotes(type).filter(opts.filter || (() => true)).length);
      head = card.createDiv({ cls: 'dmc-row dmc-spread dmc-collapse-tools' }); head.createDiv();
    } else {
      card = body.createDiv({ cls: 'dmc-card' });
      head = card.createDiv({ cls: 'dmc-row dmc-spread' });
      const h = head.createEl('h4'); const ic = h.createSpan({ cls: 'dmc-btn-icon' }); setIcon(ic, TYPES[type].icon); h.appendText(' ' + TYPES[type].plural);
    }
    const right = head.createDiv({ cls: 'dmc-row' });
    const search = right.createEl('input', { type: 'search', cls: 'dmc-input dmc-search', attr: { placeholder: 'Filter…' } });
    search.value = this.filter;
    button(right, opts.newLabel || ('New ' + TYPES[type].label), 'plus', opts.onNew || (() => p.promptCreate(type)), opts.collapsible ? '' : 'mod-cta');
    const tableWrap = card.createDiv();
    const draw = () => {
      tableWrap.empty();
      let files = type === 'session' ? p.getSessionsSorted().reverse() : p.getNotes(type).sort((a, b) => type === 'spell' ? ((Number(p.fm(a).level) || 0) - (Number(p.fm(b).level) || 0) || a.basename.localeCompare(b.basename)) : a.basename.localeCompare(b.basename));
      if (opts.filter) files = files.filter(opts.filter);
      if (opts.sort) files.sort(opts.sort);
      const q = search.value.toLowerCase();
      if (q) files = files.filter(f => (f.basename + ' ' + JSON.stringify(p.fm(f))).toLowerCase().includes(q));
      if (!files.length) { tableWrap.createDiv({ cls: 'dmc-muted', text: 'Nothing here yet.' }); return; }
      const cols = opts.cols || COLUMNS[type] || [];
      const t = tableWrap.createEl('table', { cls: 'dmc-table' });
      const tr = t.createEl('thead').createEl('tr'); tr.createEl('th', { text: 'Name' });
      cols.forEach(c => tr.createEl('th', { text: COLUMN_LABELS[c] || c.replace(/_/g, ' ') }));
      const deletable = DELETABLE_TYPES.includes(type);
      if (deletable) tr.createEl('th', { cls: 'dmc-col-actions' });
      const tb = t.createEl('tbody');
      files.forEach(f => {
        const fm = p.fm(f); const r = tb.createEl('tr');
        { const td = r.createEl('td'); if (['player', 'npc', 'monster', 'place', 'faction'].includes(type)) { td.addClass('dmc-name-cell'); p.avatar(td, f); } this.link(td, f); }
        cols.forEach(c => {
          const td = r.createEl('td'); const v = fm[c];
          if (opts.cell && opts.cell(c, f, fm, td)) return;
          const links = typeof v === 'string' || Array.isArray(v) ? (JSON.stringify(v).includes('[[') ? extractLinks(v) : []) : [];
          if (links.length) links.forEach((l, i) => {
            const dest = this.app.metadataCache.getFirstLinkpathDest(l, f.path);
            if (i) td.appendText(', ');
            if (dest) this.link(td, dest, l); else td.appendText(l);
          });
          else if (typeof v === 'string' && /^https?:\/\//i.test(v.trim())) { const a = td.createEl('a', { cls: 'external-link', text: /dndbeyond\.com/i.test(v) ? 'D&D Beyond ↗' : 'Open ↗' }); a.setAttr('href', v.trim()); a.setAttr('target', '_blank'); a.setAttr('rel', 'noopener'); }
          else td.setText(stripLinks(v));
        });
        if (deletable) {
          const td = r.createEl('td', { cls: 'dmc-col-actions' });
          const b = button(td, '', 'trash-2', () => p.confirmDelete(f), 'dmc-icon-btn dmc-danger');
          b.setAttr('aria-label', 'Delete ' + f.basename); b.setAttr('title', 'Delete ' + f.basename);
        }
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
    if (this.app.commands && this.app.commands.commands['dm-statblocks:new-monster']) {
      const cm = body.createDiv({ cls: 'dmc-card' }); cm.createEl('h4', { text: 'Monsters & villains' });
      const r = cm.createDiv({ cls: 'dmc-row dmc-wrap' });
      button(r, 'Creature builder', 'skull', () => this.app.commands.executeCommandById('dm-statblocks:new-monster'), 'mod-cta');
      button(r, 'Random creature', 'dices', () => this.app.commands.executeCommandById('dm-statblocks:random-monster'));
      cm.createDiv({ cls: 'dmc-muted', text: 'The builder captures a full 2024 statblock with a CR check; the random generator suggests a CR from your party\'s level and the difficulty you want.' });
    }
    const ca = body.createDiv({ cls: 'dmc-card' }); ca.createEl('h4', { text: 'Random armory' });
    p.renderArmoryGenWidget(ca, null);
    const cs = body.createDiv({ cls: 'dmc-card' }); cs.createEl('h4', { text: 'Random spell' });
    p.renderSpellGenWidget(cs, null);
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
    new Setting(containerEl).setName('Campaign name').addText(t => t.setValue(s.campaignName).onChange(async v => { s.campaignName = v; await this.plugin.saveSettings(); this.plugin.refreshBanners(); }));
    new Setting(containerEl).setName('Read text from images (OCR)').setDesc('Import armory items and spells from a picture. The first time, this downloads the free Tesseract OCR engine (about 15 MB) from cdn.jsdelivr.net; your image never leaves your device. Off = you can still paste text.').addToggle(t => t.setValue(s.ocrAllowed === true).onChange(async v => { s.ocrAllowed = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName('Dashboard banner').setDesc('Image, campaign name and an optional second line at the top of the dashboard (and in ```dm-banner``` blocks).').addButton(b => b.setButtonText('Edit banner…').onClick(() => new BannerModal(this.plugin).open()));
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
    this.addCommand({ id: 'add-haggle', name: 'Add haggling to this shop or tavern', callback: () => this.addHaggleToActive() });
    this.addCommand({ id: 'insert-link', name: 'Insert link to campaign note…', editorCallback: (editor, ctx) => this.insertLinkPicker(editor, ctx.file, null) });
    for (const k of ['npc', 'place', 'player', 'quest', 'faction', 'session', 'monster', 'encounter', 'spell', 'weapon', 'armor', 'gear', 'item']) {
      this.addCommand({ id: 'insert-link-' + k, name: 'Insert link to ' + TYPES[k].label, editorCallback: (editor, ctx) => this.insertLinkPicker(editor, ctx.file, k) });
    }
    this.addCommand({ id: 'give-item', name: 'Give this item to a character…', callback: () => { const f = this.app.workspace.getActiveFile(); if (f) this.giveItem(f); } });
    this.addCommand({ id: 'open-armory', name: 'Open armory', callback: () => { this.settings.dashboardTab = 'armory'; this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(l => { l.view.tab = 'armory'; l.view.render(); }); this.activateView(); } });
    this.registerMarkdownCodeBlockProcessor('threads', (src, el, ctx) => {
      el.addClass('dmc-block'); let o = {}; try { o = parseYaml(src) || {}; } catch (e) {}
      const draw = this.renderThreads(el, ctx.sourcePath, { filter: o.filter, scope: o.scope, mentions: o.mentions, limit: Number(o.limit) || 0, compact: o.compact === true || o.compact === 'true' });
      const child = new obsidian.MarkdownRenderChild(el); ctx.addChild(child);
      const refresh = obsidian.debounce ? obsidian.debounce(() => draw(), 250, true) : draw;
      child.registerEvent(this.app.metadataCache.on('changed', f => { if (this.fm(f).type === 'session') refresh(); }));
    });
    this.addCommand({ id: 'add-thread', name: 'Add a thread / follow-up', callback: () => { const f = this.app.workspace.getActiveFile(); this.promptAddThread(f && this.fm(f).type === 'session' ? f : null); } });
    this.addCommand({ id: 'open-threads', name: 'Open threads & follow-ups', callback: () => { this.settings.dashboardTab = 'threads'; this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(l => { l.view.tab = 'threads'; l.view.render(); }); this.activateView(); } });
    this.registerMarkdownCodeBlockProcessor('dndbeyond', (src, el, ctx) => {
      el.addClass('dmc-ddb-block'); lpSafe(el);
      const f = this.app.vault.getAbstractFileByPath(ctx.sourcePath); if (!(f instanceof TFile)) return;
      const child = new obsidian.MarkdownRenderChild(el); ctx.addChild(child);
      const draw = () => { el.empty(); this.renderDdbButton(el, f, this.fm(f).type === 'campaign' ? 'campaign' : 'character'); };
      child.registerEvent(this.app.metadataCache.on('changed', x => { if (x.path === f.path) draw(); }));
      draw();
    });
    if (this.registerHoverLinkSource) this.registerHoverLinkSource('dm-codex', { display: 'DM Codex', defaultMod: true });
    this.registerMarkdownCodeBlockProcessor('dm-banner', (src, el, ctx) => this.renderBannerBlock(src, el, ctx));
    this.addCommand({ id: 'edit-banner', name: 'Edit dashboard banner (image, campaign name, second line)', callback: () => new BannerModal(this).open() });
    this.registerMarkdownCodeBlockProcessor('portrait', (src, el, ctx) => this.renderPortrait(src, el, ctx));
    this.registerMarkdownCodeBlockProcessor('gallery', (src, el, ctx) => this.renderGallery(src, el, ctx));
    this.addCommand({ id: 'set-portrait', name: 'Set portrait / art for this note…', callback: () => { const f = this.app.workspace.getActiveFile(); if (!f) return; new ImageSuggestModal(this.app, img => this.setPortrait(f, img), 'Choose a portrait for ' + f.basename + '…').open(); } });
    this.addCommand({ id: 'add-to-gallery', name: 'Add images to this note\'s gallery…', callback: async () => { const f = this.app.workspace.getActiveFile(); if (!f) return; const fs = await chooseImageFiles(true); if (fs.length) await this.addToGallery(f, await this.saveImagesFor(f, fs)); } });
    this.registerMarkdownCodeBlockProcessor('level-history', (src, el, ctx) => this.renderLevelBlock(src, el, ctx));
    this.addCommand({ id: 'level-up', name: 'Level up a character / the party…', callback: () => { const f = this.app.workspace.getActiveFile(); const t = f && this.fm(f).type; this.openLevelUp(t === 'player' ? { chars: [f] } : t === 'session' ? { session: f } : {}); } });
    this.registerMarkdownCodeBlockProcessor('session-link', (src, el, ctx) => this.renderSessionLink(src, el, ctx));
    this.addCommand({ id: 'linked-prep-session', name: 'Create linked prep (from a session) or session (from a prep)', callback: () => {
      const f = this.app.workspace.getActiveFile(); const t = f && this.fm(f).type;
      if (t === 'session') this.createPrepForSession(f); else if (t === 'prep') this.createSessionForPrep(f); else new Notice('Open a session or session prep note first.');
    } });
    this.addCommand({ id: 'link-prep-session', name: 'Link this session/prep to an existing prep/session', callback: () => {
      const f = this.app.workspace.getActiveFile(); const t = f && this.fm(f).type;
      if (t === 'session' || t === 'prep') this.pickPartner(f); else new Notice('Open a session or session prep note first.');
    } });
    this.addCommand({ id: 'random-armory', name: 'Generate random armory (weapons, armor, gear, magic items)', callback: () => new ArmoryGenModal(this).open() });
    this.addCommand({ id: 'import-armory', name: 'Import an armory item or spell from an image or text…', callback: () => new ImportKindModal(this).open() });
    this.addCommand({ id: 'random-spell', name: 'Generate a random spell', callback: () => new SpellGenModal(this).open() });
    this.registerMarkdownCodeBlockProcessor('random-armory', (src, el, ctx) => { el.addClass('dmc-block'); lpSafe(el); this.renderArmoryGenWidget(el, ctx.sourcePath); });
    this.registerMarkdownCodeBlockProcessor('spell-generator', (src, el, ctx) => { el.addClass('dmc-block'); lpSafe(el); this.renderSpellGenWidget(el, ctx.sourcePath); });
    this.registerMarkdownCodeBlockProcessor('spell-browser', (src, el, ctx) => { el.addClass('dmc-block'); lpSafe(el); this.renderSpellBrowser(el, ctx.sourcePath); });
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
    this.registerMarkdownCodeBlockProcessor('haggle', (src, el, ctx) => this.renderHaggleBlock(src, el, ctx));
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
    this.settings.banner = Object.assign({}, DEFAULT_SETTINGS.banner, data.banner || {});
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
  /** 'done' (played / completed / done / finished …), 'cancelled' (cancelled / skipped) or 'upcoming'. */
  sessionState(f) {
    const raw = this.fm(f).status; const st = (Array.isArray(raw) ? raw.join(' ') : String(raw == null ? '' : raw)).toLowerCase();
    if (/\b(played|complete|completed|done|finished|wrapped|ran|run|over|closed)\b|✅|✔/.test(st)) return 'done';
    if (/\b(cancel+ed|skipped|scrapped|dropped)\b|❌/.test(st)) return 'cancelled';
    return 'upcoming';
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
      const prevArc = this.fm(prevFile).arc;
      if (prevArc && String(prevArc).trim() && !(extra.fields && extra.fields.arc)) await this.app.fileManager.processFrontMatter(file, fm => { if (!String(fm.arc || '').trim()) fm.arc = prevArc; });
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
      else if (k === 'builder') button(row, 'Creature', 'skull', () => this.app.commands.executeCommandById('dm-statblocks:new-monster'));
      else if (k === 'villain') button(row, 'Creature', 'skull', () => this.app.commands.executeCommandById('dm-statblocks:new-villain'));
      else if (k === 'armorygen') button(row, 'Random loot', 'gem', () => new ArmoryGenModal(this).open());
      else if (k === 'potion') button(row, 'New potion', 'flask-conical', () => this.openItemBuilder('item', { item_type: 'Potion', rarity: 'common' }));
      else if (k === 'spellgen') button(row, 'Random spell', 'wand-sparkles', () => new SpellGenModal(this).open());
      else if (k === 'randommonster') button(row, 'Random creature', 'dices', () => this.app.commands.executeCommandById('dm-statblocks:random-monster'));
      else if (k === 'armory') button(row, 'Armory', 'sword', () => this.app.commands.executeCommandById('dm-codex:open-armory'));
      else if (k === 'give') button(row, 'Give to character', 'hand', () => { const f = this.app.workspace.getActiveFile(); if (f) this.giveItem(f); });
      else if (k === 'update') button(row, 'Update vault content', 'download', () => this.runContentUpdate());
      else if (k === 'threads') button(row, 'Threads', 'list-checks', () => this.app.commands.executeCommandById('dm-codex:open-threads'));
      else if (k === 'addthread') button(row, 'Add thread', 'plus', () => { const f = this.app.workspace.getActiveFile(); this.promptAddThread(f && this.fm(f).type === 'session' ? f : null); });
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

/** "[[Name]]" if a note with that name (or a close variant) exists, else the plain name. */
const _normName = t => String(t).toLowerCase().replace(/\bfeet\b/g, 'ft').replace(/[^a-z0-9]/g, '');
let _linkIndex = null, _linkIndexAt = 0;
function linkIfExists(app, name) {
  if (!app) return name;
  const base = String(name).replace(/\*\*/g, '');
  if (!_linkIndex || Date.now() - _linkIndexAt > 5000) {          // name index of armory / spell / rules notes, refreshed every few seconds
    _linkIndex = new Map(); _linkIndexAt = Date.now();
    for (const f of app.vault.getMarkdownFiles()) { const k = _normName(f.basename); if (!_linkIndex.has(k) || !/\(/.test(f.basename)) _linkIndex.set(k, f); }
  }
  const tries = [base, base.replace(/,\s*[^(]+(?=\s*\()/, ''), base.replace(/\s*\([^)]*\)\s*$/, ''), base.replace(/,\s*[^,]+$/, ''), base.split(',')[0].trim()];
  for (const t of tries) {
    if (!t) continue;
    const f = app.metadataCache.getFirstLinkpathDest(t, '') || _linkIndex.get(_normName(t));
    if (f && f.extension === 'md') return f.basename === base ? '[[' + f.basename + ']]' : '[[' + f.basename + '\\|' + base + ']]'; // \| keeps table cells intact
  }
  return name;
}
/* Haggling: prices are stored as tokens in the generated text and rendered with or without a "Haggle price" column. */
const priceTok = gp => '⟦P:' + (Math.round(gp * 10000) / 10000) + '⟧';
/** d20 Charisma (Persuasion) total vs the shopkeeper's DC → percent off (negative = prices go up). */
function haggleOutcome(total, dc) {
  if (total == null || Number.isNaN(total)) return null;
  if (total <= dc - 10) return { pct: -10, label: 'Insulted — prices go up 10%' };
  if (total < dc) return { pct: 0, label: 'No deal — list price' };
  if (total >= dc + 10) return { pct: 30, label: 'Exceptional haggling — 30% off' };
  if (total >= dc + 5) return { pct: 20, label: 'Great deal — 20% off' };
  return { pct: 10, label: 'Deal — 10% off' };
}
const niceGp = v => v >= 10 ? Math.round(v) : v >= 1 ? Math.round(v * 10) / 10 : v; // haggled prices: whole gp, or gp + sp
function shopMarkdown(shop, h, opt) {
  const pct = h && h.pct ? h.pct : 0, on = pct !== 0, f = 1 - pct / 100;
  let md = shop.md
    .replace(/⟦H⟧/g, on ? ' | Haggle price' : '').replace(/⟦S⟧/g, on ? ' | ---' : '')
    .replace(/⟦P:([\d.]+)⟧/g, (m, x) => on ? fmtPrice(Number(x)) + ' | **' + fmtPrice(niceGp(Number(x) * f)) + '**' : fmtPrice(Number(x)));
  const note = opt && opt.block ? haggleBlockSrc({ dc: shop.dc, pct, note: h && h.note }) + '\n\n'
    : on ? '> [!tip] Haggled ' + (pct > 0 ? pct + '% off' : Math.abs(pct) + '% more') + (h.note ? ' — ' + h.note : '') + '\n\n' : '';
  return md.replace('⟦HAGGLE⟧', note);
}
/* Haggling inside a note: a ```haggle``` block holds the DC and current discount; applying rewrites the note's price tables. */
function haggleBlockSrc(st) {
  return '```haggle\ndc: ' + st.dc + '\n' + (st.pct ? 'discount: ' + st.pct + '\n' + (st.note ? 'note: ' + String(st.note).replace(/\n/g, ' ') + '\n' : '') : '') + '```';
}
function parseHaggleSrc(src) {
  const st = { dc: null, pct: 0, note: '' };
  String(src || '').split('\n').forEach(l => { const m = l.match(/^\s*(dc|discount|note)\s*:\s*(.*)$/i); if (!m) return; const k = m[1].toLowerCase(); if (k === 'dc') st.dc = Number(m[2]) || null; else if (k === 'discount') st.pct = Math.max(-50, Math.min(75, Number(m[2]) || 0)); else st.note = m[2].trim(); });
  return st;
}
/** "62 gp 5 sp", "1,600 gp", "**4 cp**" → gp; null when the cell holds no price. */
function parsePrice(s) {
  const t = String(s || '').replace(/[*_,]/g, ''); const re = /(\d+(?:\.\d+)?)\s*(pp|gp|ep|sp|cp)\b/gi; let m, gp = 0, hit = false;
  while ((m = re.exec(t))) { hit = true; gp += Number(m[1]) * { pp: 10, gp: 1, ep: 0.5, sp: 0.1, cp: 0.01 }[m[2].toLowerCase()]; }
  return hit ? gp : null;
}
/** Guess a DC for a note that has no haggle block yet: "haggle DC N" in its text, else tavern quality, else 13. */
function guessHaggleDc(text) {
  const m = text.match(/haggle DC (\d+)/i); if (m) return Number(m[1]);
  const q = text.match(/\b(Poor|Modest|Comfortable|Wealthy)\b/); return q ? { Poor: 10, Modest: 12, Comfortable: 13, Wealthy: 15 }[q[1]] : 13;
}
/** Add, update or remove a "Haggle price" column after every Price / Per night / Cost column in the note's tables. */
function haggleTables(text, pct) {
  const f = 1 - pct / 100, lines = text.split('\n');
  const cells = l => l.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/).map(c => c.trim());
  const join = cs => '| ' + cs.join(' | ') + ' |';
  const clean = c => c.replace(/[*_]/g, '').trim().toLowerCase();
  let fence = false;
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) { fence = !fence; continue; }
    if (fence || !/^\s*\|/.test(lines[i]) || !/^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) continue;
    const head = cells(lines[i]); const pc = head.findIndex(c => /^(price|per night|cost|price each|each)$/.test(clean(c)));
    if (pc < 0) continue;
    const hc = head.findIndex(c => clean(c) === 'haggle price');
    let j = i + 2; const body = []; while (j < lines.length && /^\s*\|/.test(lines[j])) body.push(j++);
    const rows = [i, i + 1, ...body].map(k => cells(lines[k]));
    rows.forEach((r, n) => {
      if (hc >= 0) r.splice(hc, 1);
      if (!pct) return;
      const v = n === 0 ? 'Haggle price' : n === 1 ? '---' : (() => { const g = parsePrice(r[pc]); return g == null ? '' : '**' + fmtPrice(niceGp(g * f)) + '**'; })();
      r.splice(pc + 1, 0, v);
    });
    [i, i + 1, ...body].forEach((k, n) => { lines[k] = join(rows[n]); });
    i = j - 1;
  }
  return lines.join('\n');
}
/** The haggle controls, shared by the shop generator and the ```haggle``` block. apply({pct, note, label, dc}) */
function haggleBar(hg, st, apply, opt) {
  opt = opt || {};
  hg.empty(); hg.addClass('dmc-haggle'); lpSafe(hg);
  const head = hg.createDiv({ cls: 'dmc-haggle-head' }); setIcon(head.createSpan({ cls: 'dmc-btn-icon' }), 'hand-coins'); head.appendText(' Haggle');
  let dcIn = null;
  if (opt.editDc) { head.createSpan({ cls: 'dmc-muted', text: ' DC' }); dcIn = head.createEl('input', { type: 'number', cls: 'dmc-input dmc-haggle-dc', value: String(st.dc), attr: { min: '1', max: '40', title: 'Haggle DC for this shopkeeper' } }); lpSafe(dcIn); dcIn.addEventListener('change', () => { const v = Math.max(1, Math.min(40, Number(dcIn.value) || st.dc)); dcIn.value = String(v); if (v !== st.dc) { st.dc = v; apply({ pct: st.pct, note: st.note, label: 'DC set to ' + v, dc: v }); } }); }
  else head.createSpan({ cls: 'dmc-pill', text: 'DC ' + st.dc });
  const dc = () => st.dc;
  const row = hg.createDiv({ cls: 'dmc-row dmc-wrap' });
  const tot = row.createEl('input', { type: 'number', cls: 'dmc-input dmc-haggle-num', attr: { placeholder: 'Persuasion total', title: 'The character\'s Charisma (Persuasion) — or Deception/Intimidation — check total' } }); lpSafe(tot);
  const res = () => hg.querySelector('.dmc-haggle-res');
  const done = (pct, note, label) => { pctIn.value = String(pct); apply({ pct, note, label, dc: st.dc }); const r = res(); if (r) r.setText(label); };
  button(row, 'Apply check', 'check', () => { const o = haggleOutcome(Number(tot.value), dc()); if (!o || tot.value === '') { new Notice('Enter the check total first.'); return; } done(o.pct, 'check ' + tot.value + ' vs DC ' + dc() + ': ' + o.label, o.label); });
  row.createSpan({ cls: 'dmc-muted', text: 'or roll' });
  const mod = row.createEl('input', { type: 'number', cls: 'dmc-input dmc-haggle-mod', value: '0', attr: { title: 'Persuasion modifier' } }); lpSafe(mod);
  button(row, 'd20 + mod', 'dices', () => { const d = 1 + Math.floor(Math.random() * 20), m = Number(mod.value) || 0, t = d + m; tot.value = String(t); const o = haggleOutcome(t, dc()); done(o.pct, 'rolled ' + d + (m ? (m > 0 ? ' + ' : ' − ') + Math.abs(m) : '') + ' = ' + t + ' vs DC ' + dc() + ': ' + o.label, (d === 20 ? 'Natural 20! ' : d === 1 ? 'Natural 1. ' : '') + 'Rolled ' + t + ' — ' + o.label); });
  const row2 = hg.createDiv({ cls: 'dmc-row dmc-wrap' });
  row2.createSpan({ text: 'Discount' });
  const pctIn = row2.createEl('input', { type: 'number', cls: 'dmc-input dmc-haggle-pct', value: String(st.pct || 0), attr: { step: '5', min: '-50', max: '75', title: 'Percent off every price (negative = prices go up)' } }); lpSafe(pctIn);
  row2.createSpan({ text: '% off' });
  pctIn.addEventListener('change', () => { const v = Math.max(-50, Math.min(75, Number(pctIn.value) || 0)); done(v, v ? 'set by the DM' : '', v ? (v > 0 ? v + '% off' : Math.abs(v) + '% more') : 'List prices'); });
  button(row2, 'Reset', 'rotate-ccw', () => { tot.value = ''; done(0, '', 'List prices'); }, 'dmc-icon-btn');
  hg.createDiv({ cls: 'dmc-muted dmc-haggle-res', text: st.pct ? (st.pct > 0 ? st.pct + '% off' : Math.abs(st.pct) + '% more') + (st.note ? ' — ' + st.note : '') : 'Meet the DC: 10% off · beat by 5: 20% · by 10: 30% · fail by 10: prices go up 10%.' });
}
function fmtPrice(gp) {
  const cp = Math.max(1, Math.round(gp * 100));
  const g = Math.floor(cp / 100), sp = Math.floor((cp % 100) / 10), c = cp % 10;
  const parts = [];
  if (g) parts.push(g.toLocaleString() + ' gp');
  if (sp) parts.push(sp + ' sp');
  if (c) parts.push(c + ' cp');
  return parts.join(' ');
}
const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, 'very rare': 3, legendary: 4, artifact: 5 };
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
    // healing tonics: always in stock at a potion shop, listed first, whatever the settlement size
    healing: [['Potion of Healing', 'common', 'Regain 2d4 + 2 HP', 'plenty'], ['Potion of Greater Healing', 'uncommon', 'Regain 4d4 + 4 HP', '{1d4+1}'], ['Potion of Superior Healing', 'rare', 'Regain 8d4 + 8 HP', '{1d3}'], ['Potion of Supreme Healing', 'very rare', 'Regain 10d4 + 20 HP', '1']],
    magic: [['Potion of Climbing', 'common', true, 'Climb Speed for 1 hour'], ['Potion of Animal Friendship', 'uncommon', true, ''], ['Potion of Fire Breath', 'uncommon', true, ''], ['Potion of Water Breathing', 'uncommon', true, ''], ['Potion of Resistance', 'uncommon', true, 'One damage type, 1 hour'], ['Potion of Growth', 'uncommon', true, ''], ['Potion of Hill Giant Strength', 'uncommon', true, ''], ['Oil of Slipperiness', 'uncommon', true, ''], ['Philter of Love', 'uncommon', true, ''], ['Potion of Poison', 'uncommon', true, 'Looks like a healing potion'], ['Potion of Heroism', 'rare', true, ''], ['Potion of Invulnerability', 'rare', true, ''], ['Potion of Mind Reading', 'rare', true, ''], ['Potion of Gaseous Form', 'rare', true, ''], ['Potion of Diminution', 'rare', true, ''], ['Elixir of Health', 'rare', true, ''], ['Potion of Supreme Healing', 'very rare', true, 'Regain 10d4 + 20 HP'], ['Potion of Flying', 'very rare', true, ''], ['Potion of Speed', 'very rare', true, ''], ['Potion of Invisibility', 'very rare', true, '']],
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
      const dc = { Poor: 10, Modest: 12, Comfortable: 13, Wealthy: 15 }[quality] || 13;
      let md = '## ' + name + '\n*' + quality + ' tavern & inn · ' + cap(size) + ' · haggle DC ' + dc + '*\n\n> [!read-aloud] First impression\n> ' + pick(Q.desc) + ' ' + pick(TAVERN.features) + '.\n\n';
      md += '**Proprietor:** ' + owner.name + ' (' + owner.species + ' innkeeper) — ' + owner.look + '; ' + owner.voice + '. *Wants:* ' + owner.want + '.\n\n**Staff:** ' + staff.join('; ') + '\n\n⟦HAGGLE⟧';
      md += '### Menu\n| Dish | Price⟦H⟧ |\n| --- | ---⟦S⟧ |\n' + dishes.map(([d, p]) => '| ' + linkIfExists(this.app, d) + ' | ' + priceTok(p) + ' |').join('\n') + '\n\n';
      md += '### Drinks\n| Drink | Price⟦H⟧ |\n| --- | ---⟦S⟧ |\n' + drinks.map(([d, p]) => '| ' + linkIfExists(this.app, d) + ' | ' + priceTok(p) + ' |').join('\n') + '\n\n';
      md += '### Lodging\n| Room | Per night⟦H⟧ |\n| --- | ---⟦S⟧ |\n| Common room floor | ' + priceTok(Q.room * 0.3) + ' |\n| Private room | ' + priceTok(Q.room) + ' |\n' + (quality !== 'Poor' ? '| Suite / best room | ' + priceTok(Q.room * 3) + ' |\n' : '') + '| Stabling (per horse) | ' + priceTok(0.5) + ' |\n\n';
      md += '### Tonight\n- **Entertainment:** ' + pick(TAVERN.entertainment) + '\n' + patrons.map(p => '- **Patron:** ' + p).join('\n') + '\n\n';
      md += '### Rumours\n' + rumours.map(r => '- ' + r).join('\n') + '\n\n> [!quest] Hook\n> ' + pick(SIDE_QUEST_TABLES.hook) + '\n';
      return { kind, size, quality, name, owner, md, dc, placeType: 'tavern' };
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
    const dc = { 0.8: 10, 0.9: 12, 1: 13, 1.1: 15, 1.25: 17, 1.5: 18 }[haggle[0]] || 13;
    let md = '## ' + name + '\n*' + S.label + ' · ' + cap(size) + ' · prices ×' + mult.toFixed(2) + ' (' + haggle[1] + ') · haggle DC ' + dc + '*\n\n> [!read-aloud] First impression\n> ' + pick(S.looks) + '\n\n';
    md += '**Proprietor:** ' + owner.name + ' (' + owner.species + ' ' + owner.role + ') — ' + owner.look + '; ' + owner.voice + '. *Wants:* ' + owner.want + '.\n\n⟦HAGGLE⟧';
    md += '### For sale\n| Item | Price⟦H⟧ | Stock | Notes |\n| --- | ---⟦S⟧ | --- | --- |\n';
    if (S.healing) md += S.healing.map(([n, rar, note, qty]) => '| **' + linkIfExists(this.app, n) + '** | ' + priceTok(RARITY_GP[rar] * 0.5 * mult) + ' | ' + rollIn(qty) + ' | *' + rar + ', consumable* — ' + note + ' |').join('\n') + '\n';
    md += mundane.map(([n, gp, note]) => '| ' + linkIfExists(this.app, n) + ' | ' + priceTok(gp * mult) + ' | ' + rollIn(stock()) + ' | ' + (note || '') + ' |').join('\n') + '\n';
    if (magic.length) md += magic.map(([n, rar, cons, note]) => '| ' + linkIfExists(this.app, n) + ' | ' + priceTok(RARITY_GP[rar] * (cons ? 0.5 : 1) * mult) + ' | ' + (rar === 'common' ? rollIn('{1d4}') : '1') + ' | *' + rar + (cons ? ', consumable' : '') + '*' + (note ? ' — ' + note : '') + ' |').join('\n') + '\n';
    md += '\n*Magic item prices follow the 2024 rarity guideline (Common 100 gp, Uncommon 400 gp, Rare 4,000 gp, Very Rare 40,000 gp; consumables half), adjusted by this shop\'s multiplier.*\n\n';
    md += '### Will buy\n' + S.buys.map(b => '- ' + b).join('\n') + '\n\n> [!secret] Shop secret (DM only)\n> ' + pick(S.secrets) + '\n';
    return { kind, size, name, owner, md, dc, placeType: 'shop' };
  },
  renderHaggleBlock(src, el, ctx) {
    el.addClass('dmc-block'); lpSafe(el);
    const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
    const st = parseHaggleSrc(src); if (!st.dc) st.dc = 13;
    const hg = el.createDiv();
    haggleBar(hg, st, async o => {
      if (!(file instanceof TFile)) { new Notice('Haggling needs a saved note.'); return; }
      st.pct = o.pct; st.note = o.note; if (o.dc) st.dc = o.dc;
      await this.applyHaggle(file, st);
    }, { editDc: true });
  },
  async applyHaggle(file, st) {
    await this.app.vault.process(file, text => {
      const blk = haggleBlockSrc(st);
      text = /```haggle[^\n]*\n[\s\S]*?```/.test(text) ? text.replace(/```haggle[^\n]*\n[\s\S]*?```/, () => blk) : text;
      return haggleTables(text, st.pct || 0);
    });
  },
  async addHaggleToActive() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== 'md') { new Notice('Open a shop or tavern note first.'); return; }
    let added = false;
    await this.app.vault.process(file, text => {
      if (/```haggle/.test(text)) return text;
      const blk = haggleBlockSrc({ dc: guessHaggleDc(text), pct: 0 }) + '\n';
      const lines = text.split('\n');
      let at = lines.findIndex(l => /^\*\*(Staff|Proprietor):\*\*/.test(l));
      if (at >= 0) { if (lines[at].startsWith('**Proprietor:**') && lines[at + 2] && lines[at + 2].startsWith('**Staff:**')) at += 2; at += 1; lines.splice(at, 0, '', blk.trimEnd()); }
      else {
        const t = lines.findIndex((l, i) => /^\s*\|/.test(l) && lines[i + 1] && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1]) && /\|\s*\**\s*(price|per night|cost)\s*\**\s*\|/i.test(l));
        if (t >= 0) { let h = t; while (h > 0 && /^#{1,6} /.test(lines[h - 1]) === false && lines[h - 1].trim() !== '') h--; if (h > 0 && /^#{1,6} /.test(lines[h - 1])) h--; lines.splice(h, 0, blk); }
        else lines.push('', blk.trimEnd());
      }
      added = true; return lines.join('\n');
    });
    new Notice(added ? 'Haggling added — set the DC in the haggle bar.' : 'This note already has haggling.');
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
    const hg = wrap.createDiv({ cls: 'dmc-haggle' });
    const out = wrap.createDiv({ cls: 'dmc-shop-out' });
    const actions = wrap.createDiv({ cls: 'dmc-row dmc-wrap' });
    let shop = null, haggle = { pct: 0, note: '' };
    const md = () => shop ? shopMarkdown(shop, haggle) : '';
    const drawHaggle = () => { hg.empty(); if (!shop) return; haggleBar(hg, { dc: shop.dc, pct: haggle.pct, note: haggle.note }, o => { haggle = { pct: o.pct, note: o.note }; draw(); }); };
    wireLinks(this.app, out, sourcePath || '');
    const draw = async () => { out.empty(); if (!shop) { out.createDiv({ cls: 'dmc-muted', text: 'Pick a shop type and press Generate.' }); return; } const comp = new Component(); comp.load(); await renderMd(this.app, md(), out, sourcePath || '', comp); };
    const gen = () => { shop = this.generateShop(kindSel.value, sizeSel.value, qSel.value); haggle = { pct: 0, note: '' }; drawHaggle(); draw(); };
    button(ctr, 'Generate', 'sparkles', gen, 'mod-cta');
    button(actions, 'Save as place', 'file-plus', async () => {
      if (!shop) return;
      const parents = this.getNotes('place');
      const doSave = async parent => {
        const file = await this.createNote('place', shop.name, { fields: { place_type: shop.placeType, parent: parent ? '[[' + parent.basename + ']]' : undefined, proprietor: '[[' + shop.owner.name + ']]' }, body: '## Generated details\n' + shopMarkdown(shop, haggle, { block: true }).replace(/^## .*\n/, ''), noOpen: true });
        await this.createNote('npc', shop.owner.name, { fields: { role: shop.owner.role, species: shop.owner.species, location: '[[' + file.basename + ']]', attitude: 'indifferent' }, body: '## Generated details\n- **Look:** ' + shop.owner.look + '\n- **Voice:** ' + shop.owner.voice + '\n- **Wants:** ' + shop.owner.want, noOpen: true });
        this.app.workspace.getLeaf(false).openFile(file); if (onDone) onDone();
      };
      if (!parents.length) return doSave(null);
      const items = [{ basename: '— No parent (standalone)', none: true }, ...parents];
      new NoteSuggestModal(this.app, items, f => doSave(f.none ? null : f), 'Which settlement is it in?').open();
    }, 'mod-cta');
    button(actions, 'Insert into note', 'text-cursor-input', () => { if (!shop) return; const ed = this.app.workspace.activeEditor && this.app.workspace.activeEditor.editor; if (ed) { ed.replaceSelection('\n' + md() + '\n'); if (onDone) onDone(); } else new Notice('Open a note first.'); });
    button(actions, 'Copy', 'copy', () => { if (!shop) return; try { navigator.clipboard.writeText(md()); new Notice('Copied'); } catch (e) { new Notice('Copy not available'); } });
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
    this.modalEl.addClass('dmc-builder-modal');
    const layout = c.createDiv({ cls: 'dmc-builder' });
    const form = layout.createDiv({ cls: 'dmc-builder-form' });
    const prevWrap = layout.createDiv({ cls: 'dmc-builder-preview' });
    const sec = t => { form.createDiv({ cls: 'dmc-sec', text: t }); return form.createDiv({ cls: 'dmc-form-grid' }); };
    this.renderImport(form);
    const I = (k, d) => this.init[k] != null && this.init[k] !== '' ? this.init[k] : d;
    let g = sec('Basics');
    const v = this.v = {};
    const name = fEl(g, 'Name', inp('text', this.init.name || '', this.kind === 'spell' ? 'e.g. Ashen Bolt' : 'e.g. Ember-Forged Longsword'));
    v.name = () => name.value.trim();
    const players = this.plugin.getNotes('player');
    const holderSel = () => { const s = fEl(g, 'Held by', sel([['', '— (catalog / unowned)'], ...players.map(f => [f.basename, f.basename]), ['__party', 'Party stash']], this.init.holder || '')); return s; };
    if (this.kind === 'weapon') {
      const cat = fEl(g, 'Category', sel(['Simple Melee', 'Simple Ranged', 'Martial Melee', 'Martial Ranged'], I('category', 'Martial Melee')));
      g = sec('Combat');
      const dmg = fEl(g, 'Damage dice', inp('text', I('damage', '1d8')));
      const dt = fEl(g, 'Damage type', sel(DMG_TYPES, I('damage_type', 'Slashing')));
      const mastery = fEl(g, 'Mastery', sel(['', ...MASTERIES], this.init.mastery != null ? this.init.mastery : 'Sap'));
      const range = fEl(g, 'Range (thrown/ammo)', inp('text', I('range', ''), '80/320'));
      const vers = fEl(g, 'Versatile damage', inp('text', I('versatile', ''), '1d10'));
      g = sec('Magic');
      const bonus = fEl(g, 'Magic bonus', sel(['0', '1', '2', '3'], String(I('magic_bonus', '0'))));
      const rarity = fEl(g, 'Rarity', sel(RARITIES, I('rarity', '')));
      const attune = fEl(g, 'Requires attunement', sel([['false', 'No'], ['true', 'Yes']], I('attunement', false) ? 'true' : 'false'));
      g = sec('Value & ownership');
      const weight = fEl(g, 'Weight', inp('text', I('weight', ''), '3 lb.'));
      const cost = fEl(g, 'Cost', inp('text', I('cost', ''), '15 gp'));
      const holder = holderSel();
      const qty = fEl(g, 'Quantity', inp('number', I('quantity', 1)));
      g = sec('Properties');
      const pw = g.createDiv({ cls: 'dmc-f dmc-span2' }); pw.createEl('label', { text: 'Weapon properties' }); const pbox = pw.createDiv({ cls: 'dmc-checks' });
      const props = {}; WEAPON_PROPS.forEach(p => { const l = pbox.createEl('label'); const cb = l.createEl('input', { type: 'checkbox' }); l.appendText(' ' + p); cb.checked = (this.init.props || []).includes(p); props[p] = cb; lpSafe(l); });
      g = sec('Description');
      const desc = fEl(g, 'Description / special properties', ta(I('desc', ''), 'Magic effects, history, appearance…'), true);
      this.build = () => {
        const b = Number(bonus.value);
        const plist = WEAPON_PROPS.filter(p => props[p].checked).map(p => p === 'Thrown' || p === 'Ammunition' ? p + (range.value ? ' (' + range.value.trim() + ')' : '') : p === 'Versatile' ? p + (vers.value ? ' (' + vers.value.trim() + ')' : '') : p);
        const fm = { type: 'weapon', category: cat.value, damage: dmg.value.trim() + (b ? ' + ' + b : ''), damage_type: dt.value, properties: plist, mastery: mastery.value, weight: weight.value, cost: cost.value, magic_bonus: b, rarity: rarity.value || (b ? ['', 'uncommon', 'rare', 'very rare'][b] : ''), attunement: attune.value === 'true', holder: this.holderLink(holder.value), quantity: Number(qty.value) || 1, tags: ['armory', 'weapon'] };
        let body = '> [!info] ' + cat.value + ' weapon' + (fm.rarity ? ' · ' + fm.rarity : '') + (fm.attunement ? ' (requires attunement)' : '') + '\n> **Damage:** ' + fm.damage + ' ' + dt.value + (b ? ' · **+' + b + ' to attack and damage rolls**' : '') + '\n> **Properties:** ' + (plist.join(', ') || '—') + '\n> **Mastery:** ' + (mastery.value ? '[[Weapon Mastery|' + mastery.value + ']]' : '—') + '\n> **Weight:** ' + (weight.value || '—') + ' · **Cost:** ' + (cost.value || '—') + '\n\n';
        body += '## Description\n' + (desc.value || '') + '\n\n## Owned copies\n```dm-list\nwhere: base\nfields: [holder, quantity]\nempty: No one owns a copy yet — use the command Give this item to a character.\n```\n';
        return { fm, body };
      };
    } else if (this.kind === 'armor') {
      const cat = fEl(g, 'Category', sel(['Light', 'Medium', 'Heavy', 'Shield'], I('category', 'Medium')));
      g = sec('Defense');
      const base = fEl(g, 'Base AC', inp('number', I('base_ac', 14)));
      const str = fEl(g, 'Strength requirement', inp('text', I('strength', ''), 'e.g. 15'));
      const stealth = fEl(g, 'Stealth', sel([['', 'Normal'], ['Disadvantage', 'Disadvantage']], I('stealth', '')));
      g = sec('Magic');
      const bonus = fEl(g, 'Magic bonus', sel(['0', '1', '2', '3'], String(I('magic_bonus', '0'))));
      const rarity = fEl(g, 'Rarity', sel(RARITIES, I('rarity', '')));
      const attune = fEl(g, 'Requires attunement', sel([['false', 'No'], ['true', 'Yes']], I('attunement', false) ? 'true' : 'false'));
      g = sec('Value & ownership');
      const weight = fEl(g, 'Weight', inp('text', I('weight', ''), '20 lb.'));
      const cost = fEl(g, 'Cost', inp('text', I('cost', ''), '400 gp'));
      const holder = holderSel();
      g = sec('Description');
      const desc = fEl(g, 'Description / special properties', ta(I('desc', '')), true);
      this.build = () => {
        const b = Number(bonus.value), n = Number(base.value) || 10;
        const ac = cat.value === 'Shield' ? '+' + (2 + b) : (n + b) + (cat.value === 'Light' ? ' + Dex modifier' : cat.value === 'Medium' ? ' + Dex modifier (max 2)' : '');
        const fm = { type: 'armor', category: cat.value, ac, strength: str.value, stealth: stealth.value, weight: weight.value, cost: cost.value, magic_bonus: b, rarity: rarity.value || (b ? ['', 'rare', 'very rare', 'legendary'][b] : ''), attunement: attune.value === 'true', holder: this.holderLink(holder.value), quantity: 1, tags: ['armory', 'armor'] };
        const body = '> [!info] ' + cat.value + (cat.value === 'Shield' ? '' : ' armor') + (fm.rarity ? ' · ' + fm.rarity : '') + '\n> **AC:** ' + ac + ' · **Strength:** ' + (str.value || '—') + ' · **Stealth:** ' + (stealth.value || '—') + '\n> **Weight:** ' + (weight.value || '—') + ' · **Cost:** ' + (cost.value || '—') + '\n\n## Description\n' + (desc.value || '') + '\n\n## Owned copies\n```dm-list\nwhere: base\nfields: [holder]\nempty: No one owns a copy yet.\n```\n';
        return { fm, body };
      };
    } else if (this.kind === 'gear') {
      const cat = fEl(g, 'Category', sel(GEAR_CATS, I('category', 'Adventuring Gear')));
      g = sec('Value & ownership');
      const cost = fEl(g, 'Cost', inp('text', I('cost', ''), '1 gp'));
      const weight = fEl(g, 'Weight', inp('text', I('weight', ''), '1 lb.'));
      const holder = holderSel();
      const qty = fEl(g, 'Quantity', inp('number', I('quantity', 1)));
      g = sec('Description');
      const desc = fEl(g, 'Description / how it works', ta(I('desc', '')), true);
      this.build = () => {
        const fm = { type: 'gear', category: cat.value, cost: cost.value, weight: weight.value, holder: this.holderLink(holder.value), quantity: Number(qty.value) || 1, tags: ['armory', 'gear'] };
        return { fm, body: '> [!info] ' + cat.value + '\n> **Cost:** ' + (cost.value || '—') + ' · **Weight:** ' + (weight.value || '—') + '\n\n## Description\n' + (desc.value || '') + '\n\n## Owned copies\n```dm-list\nwhere: base\nfields: [holder, quantity]\nempty: No one owns a copy yet.\n```\n' };
      };
    } else if (this.kind === 'item') {
      const kind = fEl(g, 'Item type', sel(ITEM_KINDS, I('item_type', 'Wondrous Item')));
      const rarity = fEl(g, 'Rarity', sel(RARITIES.slice(1), I('rarity', 'uncommon')));
      const attS = sel([['false', 'No'], ['true', 'Yes'], ['by a spellcaster', 'By a spellcaster']], 'false'); { const at = this.init.attunement; if (typeof at === 'string' && at) { if (![...attS.options].some(o => o.value === at)) { const o = document.createElement('option'); o.value = at; o.textContent = at.charAt(0).toUpperCase() + at.slice(1); attS.appendChild(o); } attS.value = at; } else if (at) attS.value = 'true'; }
      const attune = fEl(g, 'Requires attunement', attS);
      g = sec('Charges & ownership');
      const charges = fEl(g, 'Charges (optional)', inp('text', I('charges', ''), '7, regains 1d6+1 at dawn'));
      const icost = fEl(g, 'Cost (optional)', inp('text', I('cost', ''), 'e.g. 50 gp — blank: by rarity'));
      const holder = holderSel();
      g = sec('Effect');
      const desc = fEl(g, 'What it does', ta(I('desc', ''), 'Describe the effect. [[Links]] to conditions and spells work.', 6), true);
      const curse = fEl(g, 'Curse / quirk (optional)', ta('', '', 2), true);
      this.build = () => {
        const att = attune.value === 'false' ? false : attune.value === 'true' ? true : attune.value;
        const fm = { type: 'item', item_type: kind.value, rarity: rarity.value, attunement: att, charges: charges.value, holder: this.holderLink(holder.value), tags: ['armory', 'item'] };
        if (icost.value.trim()) fm.cost = icost.value.trim();
        return { fm, body: '*' + kind.value + ', ' + rarity.value + (att ? ' (requires attunement' + (typeof att === 'string' ? ' ' + att : '') + ')' : '') + '*\n\n## Properties\n' + (desc.value || '') + (charges.value ? '\n\n**Charges:** ' + charges.value : '') + (curse.value ? '\n\n> [!secret] Curse / quirk\n> ' + curse.value : '') + '\n\n## History & lore\n' };
      };
    } else if (this.kind === 'spell') {
      const level = fEl(g, 'Level', sel(Array.from({ length: 10 }, (_, i) => [String(i), i === 0 ? 'Cantrip' : 'Level ' + i]), String(I('level', '1'))));
      const school = fEl(g, 'School', sel(SCHOOLS, I('school', 'Evocation')));
      g = sec('Casting');
      const timeS = sel(['Action', 'Bonus Action', 'Reaction', '1 minute', '10 minutes', '1 hour', '8 hours', '12 hours', '24 hours'], 'Action'); { const t0 = I('casting_time', 'Action'); if (![...timeS.options].some(o => o.value === t0)) { const o = document.createElement('option'); o.value = o.textContent = t0; timeS.appendChild(o); } timeS.value = t0; }
      const time = fEl(g, 'Casting time', timeS);
      const trigger = fEl(g, 'Reaction trigger (if Reaction)', inp('text', I('trigger', ''), 'which you take when…'));
      const range = fEl(g, 'Range', inp('text', I('range', '60 feet')));
      const dur = fEl(g, 'Duration', inp('text', I('duration', 'Instantaneous')));
      const conc = fEl(g, 'Concentration', sel([['false', 'No'], ['true', 'Yes']], I('concentration', false) ? 'true' : 'false'));
      const ritual = fEl(g, 'Ritual', sel([['false', 'No'], ['true', 'Yes']], I('ritual', false) ? 'true' : 'false'));
      const cw = g.createDiv({ cls: 'dmc-f' }); cw.createEl('label', { text: 'Components' }); const cbox = cw.createDiv({ cls: 'dmc-checks' });
      const comps = {}; ['V', 'S', 'M'].forEach(k => { const l = cbox.createEl('label'); const cb = l.createEl('input', { type: 'checkbox' }); cb.checked = this.init.comps ? this.init.comps.includes(k) : k !== 'M'; l.appendText(' ' + k); comps[k] = cb; });
      const mat = fEl(g, 'Material component', inp('text', I('material', ''), 'a pinch of ash'));
      g = sec('Classes');
      const kw = g.createDiv({ cls: 'dmc-f dmc-span2' }); kw.createEl('label', { text: 'Spell lists' }); const kbox = kw.createDiv({ cls: 'dmc-checks' });
      const cls = {}; CASTER_CLASSES.forEach(k => { const l = kbox.createEl('label'); const cb = l.createEl('input', { type: 'checkbox' }); cb.checked = (this.init.classes || []).includes(k); l.appendText(' ' + k); cls[k] = cb; lpSafe(l); });
      g = sec('Effect');
      const desc = fEl(g, 'Effect', ta(I('desc', ''), 'What happens? e.g. *Dexterity Saving Throw* … *Failure:* 3d6 Fire damage.', 6), true);
      const higher = fEl(g, 'Using a higher-level slot / cantrip upgrade', ta(I('higher', ''), '', 2), true);
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
    // live preview — a parchment card in the same style as statblocks
    const draw = async () => {
      if (!this.build) return; prevWrap.empty();
      const { body } = this.build();
      const card = prevWrap.createDiv({ cls: 'dmc-itemcard' });
      card.createDiv({ cls: 'dmc-itemcard-title', text: v.name() || 'Unnamed ' + (this.kind === 'item' ? 'magic item' : this.kind) });
      card.createDiv({ cls: 'dmc-itemcard-rule' });
      const comp = new Component(); comp.load();
      await renderMd(this.app, body.replace(/```dm-list[\s\S]*?```/g, '').replace(/## Owned copies\s*$/m, '').replace(/## History & lore\s*$/m, ''), card.createDiv({ cls: 'dmc-itemcard-body' }), '', comp);
    };
    const deb = obsidian.debounce ? obsidian.debounce(draw, 250, true) : draw;
    form.addEventListener('input', deb); form.addEventListener('change', deb); draw();
    const foot = c.createDiv({ cls: 'dmc-row dmc-wrap dmc-builder-foot' });
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

class DeleteNoteModal extends Modal {
  constructor(app, file, onDone) { super(app); this.file = file; this.onDone = onDone; }
  onOpen() {
    const c = this.contentEl; c.addClass('dmc-modal');
    const f = this.file;
    const linked = Object.entries(this.app.metadataCache.resolvedLinks || {}).filter(([src, to]) => src !== f.path && to && to[f.path]).length;
    c.createEl('h3', { text: 'Delete “' + f.basename + '”?' });
    c.createEl('p', { text: 'The note goes to the trash, so you can still recover it.' + (linked ? ' ' + linked + ' note' + (linked > 1 ? 's link' : ' links') + ' to it; those links will show as unresolved.' : '') });
    const r = c.createDiv({ cls: 'dmc-row' });
    button(r, 'Delete', 'trash-2', async () => {
      this.close();
      if (this.app.fileManager.trashFile) await this.app.fileManager.trashFile(f); else await this.app.vault.trash(f, true);
      new Notice('Deleted: ' + f.basename); if (this.onDone) this.onDone();
    }, 'mod-warning');
    button(r, 'Cancel', null, () => this.close());
  }
  onClose() { this.contentEl.empty(); }
}

Object.assign(DMCodexPlugin.prototype, {
  confirmDelete(file, onDone) { new DeleteNoteModal(this.app, file, onDone).open(); },
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
  isPotion(f) {
    const fm = this.fm(f);
    return /potion|elixir|philter|oil/i.test(String(fm.item_type || '')) || /^(potion|oil|philter|elixir)\b/i.test(f.basename);
  },
  potionCost(fm) {
    const c = fm.cost || fm.value;
    if (c != null && String(c).trim() !== '') return { text: /\d$/.test(String(c).trim()) ? String(c).trim() + ' gp' : String(c).trim(), derived: false };
    const r = String(fm.rarity || 'common').toLowerCase();
    return { text: fmtPrice((RARITY_GP[r] || 100) * 0.5), derived: true };
  },
  renderArmory(body, view) {
    const bar = body.createDiv({ cls: 'dmc-row dmc-wrap', attr: { style: 'margin-bottom:8px' } });
    button(bar, 'New weapon', 'sword', () => this.openItemBuilder('weapon'));
    button(bar, 'New armor', 'shield', () => this.openItemBuilder('armor'));
    button(bar, 'New gear', 'backpack', () => this.openItemBuilder('gear'));
    button(bar, 'New magic item', 'gem', () => this.openItemBuilder('item'));
    button(bar, 'New potion', 'flask-conical', () => this.openItemBuilder('item', { item_type: 'Potion', rarity: 'common' }));
    button(bar, 'Random armory', 'sparkles', () => new ArmoryGenModal(this).open());
    button(bar, 'Import from image', 'scan-text', () => new ImportKindModal(this, ['weapon', 'armor', 'gear', 'item']).open());
    const owned = ['weapon', 'armor', 'gear', 'item'].flatMap(k => this.getNotes(k)).filter(f => String(this.fm(f).holder || '').trim());
    const inv = view.collapsible(body, 'inventory', 'Party inventory', 'users', owned.length);
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

/* ================================================================== */
/* Random Armory — weapons, armor, gear and magic items                */
/* ================================================================== */

const ARMORY_RARITY_ORDER = ['mundane', 'common', 'uncommon', 'rare', 'very rare', 'legendary'];
// rough 2024-style guidance on which rarities suit which tier of play
const RARITY_BY_LEVEL = L => L <= 4 ? ['mundane', 'mundane', 'common', 'common', 'uncommon'] : L <= 10 ? ['mundane', 'common', 'uncommon', 'uncommon', 'rare'] : L <= 16 ? ['uncommon', 'rare', 'rare', 'very rare'] : ['rare', 'very rare', 'very rare', 'legendary'];
const WEAPON_BONUS = { uncommon: 1, rare: 2, 'very rare': 3, legendary: 3 };
const ARMOR_BONUS = { rare: 1, 'very rare': 2, legendary: 3 };
const ENERGY = ['Fire', 'Cold', 'Lightning', 'Thunder', 'Acid', 'Poison', 'Necrotic', 'Radiant', 'Psychic', 'Force'];
const ENERGY_WORD = { Fire: ['Ember', 'Flame', 'Cinder', 'Blaze'], Cold: ['Frost', 'Rime', 'Winter', 'Ice'], Lightning: ['Storm', 'Spark', 'Thunderhead', 'Lightning'], Thunder: ['Thunder', 'Peal', 'Echo', 'Roar'], Acid: ['Venom', 'Corrosion', 'Bile', 'Acid'], Poison: ['Viper', 'Nightshade', 'Venom', 'Blight'], Necrotic: ['Grave', 'Shadow', 'Dusk', 'Wither'], Radiant: ['Dawn', 'Sun', 'Halo', 'Glory'], Psychic: ['Dream', 'Whisper', 'Mind', 'Madness'], Force: ['Arcane', 'Star', 'Void', 'Force'] };
const WEAPON_PROPS_BY_RARITY = {
  common: ['It sheds Dim Light in a 10-foot radius while drawn, and you can douse or restore the light as a Bonus Action.', 'It never rusts, dulls or stains, and always looks freshly polished.', 'Its wielder always knows which way is north.', 'It hums a faint note when a lie is spoken within 10 feet.'],
  uncommon: ['**Returning.** If it has the Thrown property, it flies back to your hand immediately after a ranged attack.', '**Warning.** While you carry it you can\'t be surprised, and you have Advantage on Initiative rolls.', '**{E}-touched.** On a hit it deals an extra 1d4 {T} damage.', '**Guardian.** While holding it, you can use a Reaction to add 1 to your AC against one attack you can see.'],
  rare: ['**{E}brand.** On a hit it deals an extra 1d6 {T} damage.', '**Vicious.** When you roll a 20 on an attack roll with it, the target takes an extra 2d6 damage of the weapon\'s type.', '**Spell-bound (1/Day).** You can cast a 2nd-level spell from it — choose one fitting its theme (DC 15).', '**Life-stealing.** When you reduce a creature to 0 Hit Points with it, you gain 5 Temporary Hit Points.'],
  'very rare': ['**{E}heart.** On a hit it deals an extra 2d6 {T} damage.', '**Dancing.** As a Bonus Action you can toss it into the air; it attacks on its own for up to 4 rounds, then returns.', '**Wounding.** Once per turn, a creature you hit takes an extra 1d4 Necrotic damage at the start of each of its turns until it uses an action to stanch the wound (DC 15 Wisdom (Medicine) check).'],
  legendary: ['**{E}crown.** On a hit it deals an extra 2d6 {T} damage, and once per Long Rest you can unleash a 30-foot Cone (DC 18 Dexterity save, 8d8 {T} damage, half on a success).', '**Sharpness.** When you roll a 20 on an attack roll with it, the target takes an extra 4d6 damage of the weapon\'s type.', '**Sentient.** It has its own personality (Int 14, Wis 12, Cha 16), speaks Common, and wants something.'],
};
const ARMOR_PROPS_BY_RARITY = {
  common: ['It is always clean and never needs repairs.', 'You can change its colour and style as a Bonus Action.'],
  uncommon: ['**Mithral.** It has no Strength requirement and doesn\'t give Disadvantage on Dexterity (Stealth) checks.', '**Adamantine.** Any Critical Hit against you becomes a normal hit.'],
  rare: ['**Resistance.** You have Resistance to {T} damage while you wear it. (Requires attunement.)', '**Mariner\'s.** You have a Swim Speed equal to your Speed while you wear it.'],
  'very rare': ['**Resistance.** You have Resistance to {T} damage, and once per day you can use a Reaction to gain Immunity to it until the start of your next turn. (Requires attunement.)'],
  legendary: ['**Invulnerable (1/Day).** As an action you gain Immunity to all nonmagical Bludgeoning, Piercing and Slashing damage for 10 minutes. (Requires attunement.)'],
};
const SUFFIXES = ['of the Watch', 'of the Ashen Crown', 'of the Deep', 'of Many Battles', 'of the Last Light', 'of Whispers', 'of the Old Kings', 'of the Hunt', 'of Mercy', 'of Ruin'];
const MAKERS = ['dwarven', 'elven', 'giant-forged', 'hobgoblin', 'temple-blessed', 'ancient', 'pirate', 'royal-guard', 'orcish', 'gnomish'];

Object.assign(DMCodexPlugin.prototype, {
  armoryCatalog(type) {
    const notes = this.getNotes(type).filter(f => !String(this.fm(f).holder || '').trim() && !this.fm(f).base && !/Magic Items/.test(f.path));
    if (notes.length) return notes.map(f => ({ name: f.basename, fm: this.fm(f), file: f }));
    // fallback if the catalog notes were deleted
    if (type === 'weapon') return SHOP_DATA.smithy.mundane.filter(m => /Mastery/.test(m[2])).map(([n, gp, note]) => ({ name: n, fm: { category: 'Martial Melee', damage: '1d8', damage_type: 'Slashing', properties: [], mastery: note.replace('Mastery: ', ''), cost: fmtPrice(gp) } }));
    if (type === 'armor') return SHOP_DATA.smithy.mundane.filter(m => /AC|\+2 AC/.test(m[2])).map(([n, gp, note]) => ({ name: n, fm: { category: /Shield/.test(n) ? 'Shield' : /Light/.test(note) ? 'Light' : /Medium/.test(note) ? 'Medium' : 'Heavy', ac: note, cost: fmtPrice(gp) } }));
    return SHOP_DATA.general.mundane.map(([n, gp, note]) => ({ name: n, fm: { category: 'Adventuring Gear', cost: fmtPrice(gp) }, note }));
  },
  async armoryQuirk() { const t = await this.gatherTables(); const q = t.find(x => x.title === 'Magic item quirk'); return q ? pick(q.entries) : ''; },
  /** Generate one random armory item. opts: { kind: any|weapon|armor|gear|item, rarity: level|any|mundane|common|…, level } */
  async generateArmoryItem(opts) {
    let kind = opts.kind && opts.kind !== 'any' ? opts.kind : pick(['weapon', 'weapon', 'armor', 'gear', 'item', 'item']);
    let rarity = opts.rarity === 'level' ? pick(RARITY_BY_LEVEL(opts.level || 3)) : opts.rarity === 'any' || !opts.rarity ? pick(ARMORY_RARITY_ORDER) : opts.rarity;
    if (kind === 'item' && rarity === 'mundane') rarity = 'common';
    if (kind === 'gear' && rarity !== 'mundane' && rarity !== 'common') kind = 'item';
    const T = pick(ENERGY), E = pick(ENERGY_WORD[T]);
    const fill = s => s.replace(/\{T\}/g, T).replace(/\{E\}/g, E);
    const quirk = rarity !== 'mundane' && Math.random() < 0.5 ? await this.armoryQuirk() : '';
    const out = { kind, rarity, quirk };
    if (kind === 'weapon') {
      const base = pick(this.armoryCatalog('weapon'));
      const bonus = WEAPON_BONUS[rarity] || 0;
      const props = rarity === 'mundane' ? [] : [fill(pick(WEAPON_PROPS_BY_RARITY[rarity]))];
      const prop = props[0] || '';
      const themed = /\{E\}|brand|heart|crown|touched/.test(prop) || /extra \d+d\d+ \w+ damage/.test(prop);
      out.name = rarity === 'mundane' ? (cap(pick(MAKERS)) + ' ' + base.name) : themed ? E + ' ' + base.name : bonus ? '+' + bonus + ' ' + base.name : base.name + ' ' + pick(SUFFIXES);
      if (rarity !== 'mundane' && !themed && bonus && Math.random() < 0.4) out.name = '+' + bonus + ' ' + base.name + ' ' + pick(SUFFIXES);
      out.base = base; out.bonus = bonus; out.props = props;
      out.attunement = ['rare', 'very rare', 'legendary'].includes(rarity) && !!prop;
      out.value = rarity === 'mundane' ? (base.fm.cost || '') : fmtPrice(RARITY_GP[rarity]);
      out.summary = (base.fm.category || 'Weapon') + ' · ' + String(base.fm.damage || '').replace(/\s*\+.*$/, '') + (bonus ? ' + ' + bonus : '') + ' ' + (base.fm.damage_type || '');
    } else if (kind === 'armor') {
      const base = pick(this.armoryCatalog('armor'));
      const bonus = ARMOR_BONUS[rarity] || 0;
      const props = ['mundane'].includes(rarity) || (bonus && Math.random() < 0.5) ? [] : [fill(pick(ARMOR_PROPS_BY_RARITY[rarity] || ARMOR_PROPS_BY_RARITY.common))];
      const prop = props[0] || '';
      out.name = rarity === 'mundane' ? cap(pick(MAKERS)) + ' ' + base.name : /Mithral|Adamantine/.test(prop) ? prop.match(/Mithral|Adamantine/)[0] + ' ' + base.name : /Resistance/.test(prop) ? base.name + ' of ' + T + ' Resistance' : bonus ? '+' + bonus + ' ' + base.name : base.name + ' ' + pick(SUFFIXES);
      out.base = base; out.bonus = bonus; out.props = props;
      out.attunement = /attunement/i.test(prop);
      out.value = rarity === 'mundane' ? (base.fm.cost || '') : fmtPrice(RARITY_GP[rarity]);
      out.summary = (base.fm.category || 'Armor') + ' · AC ' + (base.fm.ac || '?') + (bonus ? ' (+' + bonus + ')' : '');
    } else if (kind === 'gear') {
      const base = pick(this.armoryCatalog('gear'));
      out.base = base; out.qty = rollIn(pick(['1', '1', '{1d4}', '{1d6}', '{2d4}']));
      out.name = rarity === 'common' ? cap(pick(MAKERS)) + ' ' + base.name : base.name;
      out.props = rarity === 'common' ? [pick(['It is exceptionally well made and weighs half as much as usual.', 'It is decorated with a maker\'s mark the party may recognise.', 'It once belonged to a famous adventurer, and someone wants it back.'])] : [];
      out.value = base.fm.cost || ''; out.summary = (base.fm.category || 'Gear') + (out.qty > 1 ? ' · ×' + out.qty : '');
    } else {
      const pool = Object.values(SHOP_DATA).flatMap(s => s.magic || []).filter((m, i, a) => a.findIndex(x => x[0] === m[0]) === i);
      const fits = pool.filter(m => m[1] === rarity);
      const m = fits.length ? pick(fits) : pick(pool);
      out.rarity = m[1]; out.name = m[0]; out.consumable = m[2]; out.props = m[3] ? [m[3]] : [];
      out.attunement = /Attunement/i.test(m[3] || '');
      out.value = fmtPrice(RARITY_GP[m[1]] * (m[2] ? 0.5 : 1)); out.summary = (m[2] ? 'Consumable' : 'Magic item');
    }
    return out;
  },
  armoryItemMarkdown(it) {
    const rar = it.rarity === 'mundane' ? 'mundane' : it.rarity + (it.attunement ? ', requires attunement' : '');
    let md = '**' + it.name + '** — *' + it.summary + ' · ' + rar + '*' + (it.value ? ' · ' + it.value : '');
    if (it.base && it.base.file) md += ' · base: [[' + it.base.name + ']]';
    for (const p of it.props || []) md += '\n  - ' + p;
    if (it.quirk) md += '\n  - *Quirk:* ' + it.quirk;
    return md;
  },
  async saveArmoryItem(it, holder) {
    const h = holder ? (holder === 'Party stash' ? 'Party stash' : '[[' + holder + ']]') : '';
    const desc = (it.props || []).map(p => '- ' + p).join('\n') + (it.quirk ? '\n- **Quirk:** ' + it.quirk : '');
    let fm, body;
    if (it.kind === 'weapon') {
      const b = it.base.fm;
      fm = { type: 'weapon', category: b.category, damage: String(b.damage || '').replace(/\s*\+.*$/, '') + (it.bonus ? ' + ' + it.bonus : ''), damage_type: b.damage_type, properties: [].concat(b.properties || []), mastery: b.mastery || '', weight: b.weight || '', cost: it.value, magic_bonus: it.bonus || 0, rarity: it.rarity === 'mundane' ? '' : it.rarity, attunement: !!it.attunement, base: it.base.file ? '[[' + it.base.name + ']]' : '', holder: h, quantity: 1, source: 'Generated', tags: ['armory', 'weapon'] };
      body = '> [!info] ' + b.category + ' weapon' + (fm.rarity ? ' · ' + fm.rarity : '') + (fm.attunement ? ' (requires attunement)' : '') + '\n> **Damage:** ' + fm.damage + ' ' + (b.damage_type || '') + (it.bonus ? ' · **+' + it.bonus + ' to attack and damage rolls**' : '') + '\n> **Properties:** ' + (fm.properties.join(', ') || '—') + '\n> **Mastery:** ' + (fm.mastery ? '[[Weapon Mastery|' + fm.mastery + ']]' : '—') + '\n> **Value:** ' + (it.value || '—') + '\n\n';
    } else if (it.kind === 'armor') {
      const b = it.base.fm;
      const ac = it.bonus ? String(b.ac || '').replace(/^\+?(\d+)/, (m, n) => (m.startsWith('+') ? '+' : '') + (Number(n) + it.bonus)) : b.ac;
      fm = { type: 'armor', category: b.category, ac, strength: /Mithral/.test(it.name) ? '' : (b.strength || ''), stealth: /Mithral/.test(it.name) ? '' : (b.stealth || ''), weight: b.weight || '', cost: it.value, magic_bonus: it.bonus || 0, rarity: it.rarity === 'mundane' ? '' : it.rarity, attunement: !!it.attunement, base: it.base.file ? '[[' + it.base.name + ']]' : '', holder: h, quantity: 1, source: 'Generated', tags: ['armory', 'armor'] };
      body = '> [!info] ' + b.category + (b.category === 'Shield' ? '' : ' armor') + (fm.rarity ? ' · ' + fm.rarity : '') + '\n> **AC:** ' + ac + ' · **Strength:** ' + (fm.strength || '—') + ' · **Stealth:** ' + (fm.stealth || '—') + '\n> **Value:** ' + (it.value || '—') + '\n\n';
    } else if (it.kind === 'gear') {
      fm = { type: 'gear', category: it.base.fm.category || 'Adventuring Gear', cost: it.value, weight: it.base.fm.weight || '', base: it.base.file ? '[[' + it.base.name + ']]' : '', holder: h, quantity: Number(it.qty) || 1, source: 'Generated', tags: ['armory', 'gear'] };
      body = '> [!info] ' + fm.category + '\n> **Cost:** ' + (it.value || '—') + ' · **Quantity:** ' + fm.quantity + '\n\n';
    } else {
      fm = { type: 'item', item_type: it.consumable ? 'Potion' : 'Wondrous Item', rarity: it.rarity, attunement: !!it.attunement, holder: h, value: it.value, source: 'Generated', tags: ['armory', 'item'] };
      body = '*' + fm.item_type + ', ' + it.rarity + (it.attunement ? ' (requires attunement)' : '') + '*\n\n**Value:** ' + it.value + '\n\n';
    }
    body += '## Properties\n' + (desc || '- ') + '\n\n## History & lore\n- \n';
    const file = await this.createNote(it.kind, it.name, { raw: fmBlock(fm) + '# ' + it.name + '\n\n' + body, noOpen: true });
    return file;
  },
  renderArmoryGenWidget(container, sourcePath, onDone) {
    const wrap = container.createDiv({ cls: 'dmc-sq dmc-armorygen' }); lpSafe(wrap);
    const ctr = wrap.createDiv({ cls: 'dmc-row dmc-wrap' });
    const mk = (opts, val, label) => { const w = ctr.createDiv({ cls: 'dmc-f dmc-inline' }); w.createEl('label', { text: label }); const s = w.createEl('select', { cls: 'dropdown' }); opts.forEach(([v, l]) => s.createEl('option', { value: v, text: l })); s.value = val; lpSafe(s); return s; };
    const party = this.getNotes('player').filter(f => (this.fm(f).status || 'active') === 'active').map(f => Number(this.fm(f).level) || 1);
    const avg = party.length ? Math.round(party.reduce((a, b) => a + b, 0) / party.length) : 3;
    const kindSel = mk([['any', 'Anything'], ['weapon', 'Weapon'], ['armor', 'Armor'], ['gear', 'Gear'], ['item', 'Magic item']], 'any', 'Type');
    const rarSel = mk([['level', 'Suit party level'], ['any', 'Any rarity'], ['mundane', 'Mundane'], ['common', 'Common'], ['uncommon', 'Uncommon'], ['rare', 'Rare'], ['very rare', 'Very rare'], ['legendary', 'Legendary']], 'level', 'Rarity');
    const lvlSel = mk(Array.from({ length: 20 }, (_, i) => [String(i + 1), 'Level ' + (i + 1)]), String(avg), 'Party level');
    const cntSel = mk(['1', '2', '3', '4', '5', '6'].map(n => [n, n]), '3', 'How many');
    const sync = () => { lvlSel.parentElement.style.display = rarSel.value === 'level' ? '' : 'none'; }; rarSel.addEventListener('change', sync); sync();
    const out = wrap.createDiv({ cls: 'dmc-armorygen-out' });
    const foot = wrap.createDiv({ cls: 'dmc-row dmc-wrap' });
    let items = [];
    const opts = () => ({ kind: kindSel.value, rarity: rarSel.value, level: Number(lvlSel.value) });
    const draw = async () => {
      out.empty();
      if (!items.length) { out.createDiv({ cls: 'dmc-muted', text: 'Pick a type and rarity, then Generate.' }); return; }
      const comp = new Component(); comp.load();
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const card = out.createDiv({ cls: 'dmc-loot rarity-' + it.rarity.replace(' ', '-') });
        const head = card.createDiv({ cls: 'dmc-loot-head' });
        head.createSpan({ cls: 'dmc-loot-name', text: it.name });
        head.createSpan({ cls: 'dmc-pill dmc-rarity', text: it.rarity + (it.attunement ? ' · attunement' : '') });
        card.createDiv({ cls: 'dmc-muted', text: it.summary + (it.value ? ' · ' + it.value : '') });
        if ((it.props && it.props.length) || it.quirk) { const d = card.createDiv({ cls: 'dmc-loot-props' }); await renderMd(this.app, (it.props || []).map(p => '- ' + p).join('\n') + (it.quirk ? '\n- *Quirk:* ' + it.quirk : ''), d, sourcePath || '', comp); }
        const row = card.createDiv({ cls: 'dmc-row dmc-wrap' });
        button(row, 'Reroll', 'refresh-cw', async () => { items[i] = await this.generateArmoryItem(Object.assign(opts(), { kind: kindSel.value === 'any' ? 'any' : it.kind })); draw(); });
        button(row, 'Save to Armory', 'file-plus', async () => { const f = await this.saveArmoryItem(it); if (f) { it.saved = f; new Notice('Saved to Armory: ' + f.basename); } });
        button(row, 'Give to…', 'hand', () => {
          const targets = [...this.getNotes('player'), { basename: 'Party stash', stash: true }];
          new NoteSuggestModal(this.app, targets, async who => { const f = await this.saveArmoryItem(it, who.basename); if (f) new Notice(f.basename + ' → ' + who.basename); }, 'Give “' + it.name + '” to…').open();
        });
      }
    };
    const gen = async () => { items = []; for (let i = 0; i < Number(cntSel.value); i++) items.push(await this.generateArmoryItem(opts())); draw(); };
    button(ctr, 'Generate', 'sparkles', gen, 'mod-cta');
    button(foot, 'Save all to Armory', 'save', async () => { for (const it of items) await this.saveArmoryItem(it); if (items.length) new Notice('Saved ' + items.length + ' item(s) to the Armory'); });
    button(foot, 'Insert into note', 'text-cursor-input', () => {
      if (!items.length) return; const md = '**Loot**\n' + items.map(it => '- ' + this.armoryItemMarkdown(it)).join('\n');
      const ed = this.app.workspace.activeEditor && this.app.workspace.activeEditor.editor;
      if (ed) { ed.replaceSelection('\n' + md + '\n'); if (onDone) onDone(); } else new Notice('Open a note first.');
    });
    draw();
  },
});

class ArmoryGenModal extends Modal {
  constructor(plugin) { super(plugin.app); this.plugin = plugin; }
  onOpen() { this.contentEl.addClass('dmc-modal', 'dmc-wide'); this.contentEl.createEl('h3', { text: 'Random armory' }); this.plugin.renderArmoryGenWidget(this.contentEl, null, () => this.close()); }
  onClose() { this.contentEl.empty(); }
}

/* ================================================================== */
/* Spell browser (filters) and random spell generator                  */
/* ================================================================== */

// 2014 DMG "Spell Damage" guidance: [single target, multiple targets] by spell level
const SPELL_DMG = [['1d10', '1d6'], ['2d10', '2d6'], ['3d10', '4d6'], ['5d10', '6d6'], ['6d10', '7d6'], ['8d10', '8d6'], ['10d10', '11d6'], ['11d10', '12d6'], ['12d10', '13d6'], ['15d10', '14d6']];
const SPELL_SAVE_FOR = { Fire: 'Dexterity', Lightning: 'Dexterity', Acid: 'Dexterity', Cold: 'Constitution', Thunder: 'Constitution', Poison: 'Constitution', Necrotic: 'Constitution', Radiant: 'Dexterity', Psychic: 'Intelligence', Force: 'Strength' };
const SCHOOL_DMG = { Evocation: ['Fire', 'Cold', 'Lightning', 'Thunder', 'Force', 'Radiant'], Necromancy: ['Necrotic', 'Poison'], Conjuration: ['Acid', 'Poison', 'Force', 'Fire'], Enchantment: ['Psychic'], Illusion: ['Psychic'], Transmutation: ['Acid', 'Thunder', 'Cold'], Abjuration: ['Radiant', 'Force'], Divination: ['Psychic', 'Radiant'] };
const SCHOOL_CLASSES = { Evocation: ['Sorcerer', 'Wizard'], Necromancy: ['Warlock', 'Wizard'], Enchantment: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'], Illusion: ['Bard', 'Sorcerer', 'Wizard'], Conjuration: ['Druid', 'Sorcerer', 'Wizard'], Abjuration: ['Cleric', 'Paladin', 'Wizard'], Divination: ['Bard', 'Cleric', 'Wizard'], Transmutation: ['Druid', 'Sorcerer', 'Wizard'] };
const SPELL_NOUNS = { attack: ['Bolt', 'Lance', 'Ray', 'Dart', 'Spear', 'Arrow', 'Touch'], area: ['Burst', 'Wave', 'Nova', 'Storm', 'Bloom', 'Rain', 'Breath'], control: ['Chains', 'Grasp', 'Veil', 'Song', 'Gaze', 'Snare', 'Word'], utility: ['Ward', 'Step', 'Sight', 'Mantle', 'Whisper', 'Sigil', 'Lantern'], heal: ['Mending', 'Grace', 'Balm', 'Renewal', 'Benediction', 'Bloom'] };
const CONDITION_SAVES = [['Frightened', 'Wisdom'], ['Charmed', 'Wisdom'], ['Restrained', 'Strength'], ['Blinded', 'Constitution'], ['Prone', 'Strength'], ['Incapacitated', 'Wisdom'], ['Poisoned', 'Constitution'], ['Deafened', 'Constitution']];
const RIDERS = { Evocation: 'and is pushed up to 10 feet away from you', Necromancy: 'and it can\'t regain Hit Points until the start of your next turn', Enchantment: 'and it has Disadvantage on the next attack roll it makes before the end of its next turn', Illusion: 'and you are [[Invisible]] to it until the start of your next turn', Conjuration: 'and you can pull it up to 10 feet toward you', Transmutation: 'and its Speed is reduced by 10 feet until the start of your next turn', Abjuration: 'and you gain Temporary Hit Points equal to your spellcasting ability modifier', Divination: 'and the next attack roll against it before the end of your next turn has Advantage' };
const UTILITY_EFFECTS = [
  ['1 hour', false, 'A willing creature you touch gains Darkvision out to 60 feet (or extends its Darkvision by 30 feet) for the duration.'],
  ['1 hour', false, 'A willing creature you touch has Resistance to {T} damage for the duration.'],
  ['10 minutes', true, 'Up to three creatures you can see gain a +10-foot bonus to Speed and can take the Disengage action as a Bonus Action.'],
  ['1 minute', true, 'A creature you touch adds 1d4 to its saving throws for the duration.'],
  ['8 hours', false, 'You ward a door, window or chest. The first creature other than you to open it triggers a soundless alarm you can hear within 1 mile.'],
  ['1 hour', true, 'You can see and hear through the eyes and ears of one willing creature you touch, using an action to switch between its senses and your own.'],
  ['Instantaneous', false, 'You teleport up to 30 feet to an unoccupied space you can see, leaving a puff of {E}-coloured smoke behind.'],
  ['10 minutes', true, 'You create a 10-foot-radius dome of shimmering force. Creatures inside have Half Cover against attacks from outside.'],
];

Object.assign(DMCodexPlugin.prototype, {
  spellRows() {
    return this.getNotes('spell').map(f => { const fm = this.fm(f); return { f, name: f.basename, level: Number(fm.level) || 0, school: String(fm.school || ''), time: String(fm.casting_time || ''), range: String(fm.range || ''), conc: fm.concentration === true || fm.concentration === 'true', ritual: fm.ritual === true || fm.ritual === 'true', classes: [].concat(fm.classes || []).map(String) }; });
  },
  /** Spell browser with filters — used by the Spells tab and the ```spell-browser``` block. */
  renderSpellBrowser(container, sourcePath) {
    const wrap = container.createDiv({ cls: 'dmc-spellbrowser' }); lpSafe(wrap);
    const F = { q: '', level: '', school: '', time: '', cls: '', conc: '', ritual: '' };
    const bar = wrap.createDiv({ cls: 'dmc-filterbar' });
    const mk = (label, key, opts) => { const w = bar.createDiv({ cls: 'dmc-f' }); w.createEl('label', { text: label }); const s = w.createEl('select', { cls: 'dropdown' }); opts.forEach(([v, l]) => s.createEl('option', { value: v, text: l })); lpSafe(s); s.addEventListener('change', () => { F[key] = s.value; draw(); }); return s; };
    const sw = bar.createDiv({ cls: 'dmc-f dmc-f-search' }); sw.createEl('label', { text: 'Search' });
    const search = sw.createEl('input', { type: 'search', attr: { placeholder: 'Name or text…' } }); lpSafe(search);
    search.addEventListener('input', () => { F.q = search.value.toLowerCase(); draw(); });
    const sels = [
      mk('Level', 'level', [['', 'Any'], ['0', 'Cantrip'], ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => [String(n), 'Level ' + n])]),
      mk('School', 'school', [['', 'Any'], ...SCHOOLS.map(s => [s, s])]),
      mk('Casting time', 'time', [['', 'Any'], ['Action', 'Action'], ['Bonus Action', 'Bonus Action'], ['Reaction', 'Reaction'], ['long', '1 minute or longer']]),
      mk('Class', 'cls', [['', 'Any'], ...CASTER_CLASSES.map(c => [c, c])]),
      mk('Concentration', 'conc', [['', 'Any'], ['yes', 'Yes'], ['no', 'No']]),
      mk('Ritual', 'ritual', [['', 'Any'], ['yes', 'Ritual only']]),
    ];
    const tools = wrap.createDiv({ cls: 'dmc-row dmc-wrap dmc-spell-tools' });
    const count = tools.createSpan({ cls: 'dmc-muted' });
    button(tools, 'Clear filters', 'x', () => { Object.keys(F).forEach(k => F[k] = ''); search.value = ''; sels.forEach(s => s.value = ''); draw(); });
    button(tools, 'Random spell from these', 'dices', () => {
      const r = filtered(); if (!r.length) { new Notice('No spells match the filters.'); return; }
      const s = pick(r); this.app.workspace.openLinkText(s.f.path, sourcePath || '', true); new Notice('🎲 ' + s.name + ' (' + (s.level ? 'level ' + s.level : 'cantrip') + ')');
    });
    button(tools, 'New spell', 'plus', () => this.openItemBuilder('spell'));
    button(tools, 'Import spell', 'scan-text', () => this.openItemBuilder('spell', { _importOpen: true }));
    button(tools, 'Spell generator', 'sparkles', () => new SpellGenModal(this).open());
    const table = wrap.createDiv({ cls: 'dmc-spell-table' });
    const filtered = () => this.spellRows().filter(r =>
      (!F.q || (r.name + ' ' + r.school + ' ' + r.classes.join(' ')).toLowerCase().includes(F.q)) &&
      (F.level === '' || r.level === Number(F.level)) && (!F.school || r.school === F.school) &&
      (!F.time || (F.time === 'long' ? /minute|hour/i.test(r.time) : r.time.startsWith(F.time))) &&
      (!F.cls || r.classes.includes(F.cls)) && (!F.conc || (F.conc === 'yes') === r.conc) && (!F.ritual || r.ritual)
    ).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    const draw = () => {
      table.empty(); const rows = filtered();
      count.setText(rows.length + ' spell' + (rows.length === 1 ? '' : 's'));
      if (!rows.length) { table.createDiv({ cls: 'dmc-muted', text: 'No spells match these filters.' }); return; }
      const t = table.createEl('table', { cls: 'dmc-table' });
      const hr = t.createEl('thead').createEl('tr'); ['Spell', 'Level', 'School', 'Casting time', 'Range', 'Conc.', 'Classes'].forEach(h => hr.createEl('th', { text: h }));
      const tb = t.createEl('tbody');
      rows.forEach(r => {
        const tr = tb.createEl('tr');
        const a = tr.createEl('td').createEl('a', { cls: 'internal-link', text: r.name }); a.addEventListener('click', e => { e.preventDefault(); this.app.workspace.openLinkText(r.f.path, sourcePath || '', Keymap.isModEvent(e)); });
        tr.createEl('td', { text: r.level ? String(r.level) : 'Cantrip' }); tr.createEl('td', { text: r.school });
        tr.createEl('td', { text: r.time.replace(/,.*$/, '') + (r.ritual ? ' (R)' : '') }); tr.createEl('td', { text: r.range });
        tr.createEl('td', { text: r.conc ? '✓' : '' }); tr.createEl('td', { text: r.classes.join(', ') });
      });
    };
    draw();
  },
  /** Invent a new spell. opts: { level, school, style: attack|area|control|utility|heal|any, damage } */
  generateSpell(opts) {
    const L = opts.level === '' || opts.level == null ? Math.floor(Math.random() * 6) : Number(opts.level);
    const school = opts.school || pick(SCHOOLS);
    let style = opts.style && opts.style !== 'any' ? opts.style : pick(['attack', 'area', 'area', 'control', 'utility', 'heal']);
    if (L === 0 && (style === 'heal' || style === 'utility')) style = pick(['attack', 'area']);
    const T = opts.damage || pick(SCHOOL_DMG[school] || ENERGY);
    const E = pick(ENERGY_WORD[T] || ['Arcane']);
    const noun = pick(SPELL_NOUNS[style]);
    const owner = Math.random() < 0.3 ? pick(NPC_TABLES.first) + '\'s ' : '';
    const name = owner + (style === 'heal' ? pick(['Gentle', 'Radiant', 'Verdant', 'Soothing', 'Dawn']) : style === 'utility' ? pick(['Hidden', 'Silver', 'Wanderer\'s', 'Quiet', 'Arcane']) : E) + ' ' + noun;
    const dmg = SPELL_DMG[Math.min(9, L)];
    const s = { name, level: L, school, classes: [...(SCHOOL_CLASSES[school] || ['Wizard'])], ritual: false, concentration: false, casting_time: 'Action', range: '60 feet', components: 'V, S', duration: 'Instantaneous', effect: '', higher: '' };
    if (style === 'attack') {
      s.range = pick(['60 feet', '90 feet', '120 feet', 'Touch']);
      const melee = s.range === 'Touch';
      s.effect = 'Make a ' + (melee ? 'melee' : 'ranged') + ' spell attack against a creature' + (melee ? '' : ' within range') + '. On a hit, the target takes ' + dmg[0] + ' ' + T + ' damage ' + RIDERS[school] + '.';
      s.higher = L === 0 ? 'Damage increases by ' + dmg[0].replace(/^\d+/, '1') + ' at levels 5, 11 and 17.' : '+1d10 damage per slot level above ' + L + '.';
    } else if (style === 'area') {
      const shape = pick(L <= 1 ? ['Self (15-foot Cone)', 'Self (15-foot Cube)', '60 feet|5-foot-radius Sphere'] : L <= 3 ? ['Self (30-foot Cone)', '120 feet|20-foot-radius Sphere', 'Self (60-foot Line)', '90 feet|15-foot Cube'] : ['Self (60-foot Cone)', '150 feet|20-foot-radius Sphere', 'Self (100-foot Line)', '120 feet|30-foot Cube']);
      const [rng, area] = shape.includes('|') ? shape.split('|') : [shape, shape.match(/\((.*)\)/)[1]];
      s.range = rng; const save = SPELL_SAVE_FOR[T] || 'Dexterity';
      s.effect = 'Each creature in a ' + area + (shape.includes('|') ? ' centred on a point you choose within range' : '') + ' makes a *' + save + ' saving throw*, taking ' + dmg[1] + ' ' + T + ' damage on a failed save, or half as much on a success.';
      s.higher = L === 0 ? 'Damage increases by 1d6 at levels 5, 11 and 17.' : '+1d6 damage per slot level above ' + L + '.';
    } else if (style === 'control') {
      const [cond, save] = pick(CONDITION_SAVES);
      s.concentration = L > 0; s.duration = L > 0 ? '1 minute' : '1 round'; s.range = pick(['30 feet', '60 feet', '90 feet']);
      const targets = L >= 4 ? 'Each creature of your choice in a 20-foot-radius Sphere within range' : 'One creature you can see within range';
      s.effect = targets + ' makes a *' + save + ' saving throw*. On a failure it has the [[' + cond + ']] condition for the duration' + (L > 0 ? '. It repeats the save at the end of each of its turns, ending the effect on itself on a success' : '') + (L >= 2 ? ', and it takes ' + SPELL_DMG[Math.max(0, L - 2)][0] + ' ' + T + ' damage each time it fails' : '') + '.';
      s.higher = L === 0 ? '' : 'You can target one additional creature for each slot level above ' + L + '.';
    } else if (style === 'utility') {
      const [dur, conc, text] = pick(UTILITY_EFFECTS);
      s.duration = dur; s.concentration = conc; s.range = /touch/i.test(text) ? 'Touch' : /You teleport/.test(text) ? 'Self' : '30 feet';
      s.casting_time = /teleport/.test(text) ? 'Bonus Action' : pick(['Action', 'Action', '1 minute']);
      s.ritual = s.casting_time !== 'Bonus Action' && !conc && Math.random() < 0.4;
      s.effect = text.replace(/\{T\}/g, T).replace(/\{E\}/g, E.toLowerCase());
      s.higher = 'The duration doubles for each slot level above ' + L + '.';
    } else {
      const bonus = Math.random() < 0.5;
      s.casting_time = bonus ? 'Bonus Action' : 'Action'; s.range = bonus ? '60 feet' : 'Touch';
      s.classes = ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger'].filter(() => Math.random() < 0.7); if (!s.classes.length) s.classes = ['Cleric'];
      const dice = bonus ? (2 * L) + 'd4' : (2 * L) + 'd8';
      s.effect = (L >= 3 ? 'Up to three creatures' : 'A creature') + (bonus ? ' you can see within range' : ' you touch') + ' regain' + (L >= 3 ? '' : 's') + ' Hit Points equal to ' + dice + ' plus your spellcasting ability modifier' + (L >= 2 ? ', and ' + (L >= 3 ? 'each' : 'it') + ' can end one of these conditions on itself: [[Poisoned]], [[Frightened]] or [[Charmed]]' : '') + '.';
      s.higher = 'Healing increases by ' + (bonus ? '2d4' : '2d8') + ' per slot level above ' + L + '.';
    }
    if (Math.random() < 0.35 && L > 0) s.components = 'V, S, M (' + pick(['a pinch of ash', 'a sliver of silver', 'a drop of blood', 'a feather', 'a polished stone', 'a vial of ' + T.toLowerCase() + '-touched water']) + ')';
    return s;
  },
  spellMarkdown(s) {
    const sub = s.level === 0 ? s.school + ' Cantrip' : 'Level ' + s.level + ' ' + s.school + (s.ritual ? ' (Ritual)' : '');
    const dur = (s.concentration ? 'Concentration, up to ' : '') + s.duration;
    return '*' + sub + ' (' + s.classes.join(', ') + ')*\n\n> [!info] Casting\n> **Casting Time:** ' + s.casting_time + (s.ritual ? ' or Ritual' : '') + '\n> **Range:** ' + s.range + '\n> **Components:** ' + s.components + '\n> **Duration:** ' + dur + '\n\n' + s.effect + '\n' + (s.higher ? '\n**' + (s.level === 0 ? 'Cantrip Upgrade' : 'Using a Higher-Level Spell Slot') + '.** ' + s.higher + '\n' : '');
  },
  async saveGeneratedSpell(s) {
    const fm = { type: 'spell', level: s.level, school: s.school, casting_time: s.casting_time, range: s.range, components: s.components, duration: (s.concentration ? 'Concentration, up to ' : '') + s.duration, concentration: s.concentration, ritual: s.ritual, classes: s.classes, source: 'Generated', tags: ['spell'] };
    return this.createNote('spell', s.name, { raw: fmBlock(fm) + '# ' + s.name + '\n\n' + this.spellMarkdown(s) });
  },
  renderSpellGenWidget(container, sourcePath, onDone) {
    const wrap = container.createDiv({ cls: 'dmc-sq dmc-spellgen' }); lpSafe(wrap);
    const ctr = wrap.createDiv({ cls: 'dmc-row dmc-wrap' });
    const mk = (label, opts, val) => { const w = ctr.createDiv({ cls: 'dmc-f dmc-inline' }); w.createEl('label', { text: label }); const s = w.createEl('select', { cls: 'dropdown' }); opts.forEach(([v, l]) => s.createEl('option', { value: v, text: l })); s.value = val; lpSafe(s); return s; };
    const lvl = mk('Level', [['', 'Any (0–5)'], ['0', 'Cantrip'], ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => [String(n), 'Level ' + n])], '');
    const sch = mk('School', [['', 'Any'], ...SCHOOLS.map(s => [s, s])], '');
    const sty = mk('Style', [['any', 'Any'], ['attack', 'Spell attack'], ['area', 'Area damage'], ['control', 'Control / condition'], ['utility', 'Utility'], ['heal', 'Healing']], 'any');
    const dmgT = mk('Damage type', [['', 'Any'], ...ENERGY.map(e => [e, e])], '');
    const out = wrap.createDiv({ cls: 'dmc-spellgen-out' });
    const foot = wrap.createDiv({ cls: 'dmc-row dmc-wrap' });
    let sp = null;
    const draw = async () => {
      out.empty(); if (!sp) { out.createDiv({ cls: 'dmc-muted', text: 'Choose a level, school and style, then Generate.' }); return; }
      out.createDiv({ cls: 'dmc-spellgen-name', text: sp.name });
      const comp = new Component(); comp.load(); await renderMd(this.app, this.spellMarkdown(sp), out.createDiv(), sourcePath || '', comp);
    };
    const gen = () => { sp = this.generateSpell({ level: lvl.value, school: sch.value, style: sty.value, damage: dmgT.value }); draw(); };
    button(ctr, 'Generate', 'sparkles', gen, 'mod-cta');
    button(foot, 'Save as spell', 'file-plus', async () => { if (!sp) return; await this.saveGeneratedSpell(sp); if (onDone) onDone(); });
    button(foot, 'Insert into note', 'text-cursor-input', () => {
      if (!sp) return; const ed = this.app.workspace.activeEditor && this.app.workspace.activeEditor.editor;
      if (ed) { ed.replaceSelection('\n### ' + sp.name + '\n' + this.spellMarkdown(sp) + '\n'); if (onDone) onDone(); } else new Notice('Open a note first.');
    });
    draw();
  },
});

class SpellGenModal extends Modal {
  constructor(plugin) { super(plugin.app); this.plugin = plugin; }
  onOpen() { this.contentEl.addClass('dmc-modal', 'dmc-wide'); this.contentEl.createEl('h3', { text: 'Random spell generator' }); this.plugin.renderSpellGenWidget(this.contentEl, null, () => this.close()); }
  onClose() { this.contentEl.empty(); }
}

/* ================================================================== */
/* Session <-> Session Prep linking                                    */
/* ================================================================== */
/*
 * A session links its prep with `prep: "[[Prep …]]"`; a prep links its session with `for_session: "[[Session …]]"`.
 * ```session-link``` (in both templates) shows the partner note, or offers to create / link one.
 */
Object.assign(DMCodexPlugin.prototype, {
  linkedNote(file, key) {
    for (const l of extractLinks(this.fm(file)[key])) { const d = this.app.metadataCache.getFirstLinkpathDest(l, file.path); if (d) return d; }
    return null;
  },
  prepFor(session) { return this.linkedNote(session, 'prep') || this.getNotes('prep').find(p => { const s = this.linkedNote(p, 'for_session'); return s && s.path === session.path; }) || null; },
  sessionFor(prep) { return this.linkedNote(prep, 'for_session') || this.getNotes('session').find(s => { const p = this.linkedNote(s, 'prep'); return p && p.path === prep.path; }) || null; },
  /** Link a session and a prep both ways, and give encounters planned in the prep the session too. */
  async linkPrepAndSession(session, prep) {
    await this.app.fileManager.processFrontMatter(session, fm => { fm.prep = '[[' + prep.basename + ']]'; });
    await this.app.fileManager.processFrontMatter(prep, fm => { fm.for_session = '[[' + session.basename + ']]'; });
    const sArc = String(this.fm(session).arc || '').trim(), pArc = String(this.fm(prep).arc || '').trim();
    if (sArc && !pArc) await this.app.fileManager.processFrontMatter(prep, fm => { fm.arc = this.fm(session).arc; });
    else if (pArc && !sArc) await this.app.fileManager.processFrontMatter(session, fm => { fm.arc = this.fm(prep).arc; });
    let moved = 0;
    for (const f of this.getNotes('encounter')) {
      const fm = this.fm(f);
      const inPrep = extractLinks(fm.prep).some(l => { const d = this.app.metadataCache.getFirstLinkpathDest(l, f.path); return d && d.path === prep.path; });
      const hasSession = extractLinks(fm.session).some(l => { const d = this.app.metadataCache.getFirstLinkpathDest(l, f.path); return d && d.path === session.path; });
      if (inPrep && !hasSession) {
        await this.app.fileManager.processFrontMatter(f, x => {
          const cur = [].concat(x.session == null || x.session === '' ? [] : x.session).map(String).filter(s => s.trim());
          x.session = cur.length ? cur.concat('[[' + session.basename + ']]') : '[[' + session.basename + ']]';
        });
        moved++;
      }
    }
    new Notice('Linked ' + session.basename + ' ↔ ' + prep.basename + (moved ? ' (' + moved + ' planned encounter' + (moved > 1 ? 's' : '') + ' added to the session)' : ''));
  },
  prepNameFor(session) {
    const n = Number(this.fm(session).session_number);
    return n ? 'Prep - Session ' + String(n).padStart(3, '0') : 'Prep - ' + session.basename;
  },
  async createPrepForSession(session) {
    const existing = this.prepFor(session);
    if (existing) { this.app.workspace.getLeaf('tab').openFile(existing); return existing; }
    const prep = await this.createNote('prep', this.prepNameFor(session), { fields: { for_session: '[[' + session.basename + ']]', arc: this.fm(session).arc || undefined }, noOpen: true });
    await this.linkPrepAndSession(session, prep);
    this.app.workspace.getLeaf('tab').openFile(prep);
    return prep;
  },
  createSessionForPrep(prep) {
    const existing = this.sessionFor(prep);
    if (existing) { this.app.workspace.getLeaf('tab').openFile(existing); return; }
    const n = this.nextSessionNumber();
    new PromptModal(this.app, 'New session #' + n + ' for ' + prep.basename, 'Optional title, e.g. "Into the Thornwood"', async title => {
      const session = await this.createNote('session', 'Session ' + String(n).padStart(3, '0') + (title ? ' - ' + title : ''), { fields: { prep: '[[' + prep.basename + ']]', arc: this.fm(prep).arc || undefined }, noOpen: true });
      await this.linkPrepAndSession(session, prep);
      this.app.workspace.getLeaf('tab').openFile(session);
    }, { allowEmpty: true, cta: 'Create session' }).open();
  },
  pickPartner(file) {
    const isPrep = this.fm(file).type === 'prep';
    const pool = isPrep ? this.getSessionsSorted().reverse() : this.getNotes('prep');
    const items = pool.map(f => { const partner = isPrep ? this.prepFor(f) : this.sessionFor(f); return { f, label: f.basename + (partner ? '  ·  currently linked to ' + partner.basename : '') }; });
    if (!items.length) { new Notice('No ' + (isPrep ? 'session' : 'prep') + ' notes yet — use Create instead.'); return; }
    new NoteSuggestModal(this.app, items, it => isPrep ? this.linkPrepAndSession(it.f, file) : this.linkPrepAndSession(file, it.f),
      'Link ' + file.basename + ' to which ' + (isPrep ? 'session' : 'prep note') + '?', it => it.label).open();
  },
  /** Set (or clear) the story arc on a session/prep and its linked partner. */
  pickArc(file) {
    const isPrep = this.fm(file).type === 'prep';
    const partner = isPrep ? this.sessionFor(file) : this.prepFor(file);
    const items = [{ none: true, basename: '— No arc' }, ...this.getNotes('arc').sort((a, b) => (Number(this.fm(a).act) || 0) - (Number(this.fm(b).act) || 0) || a.basename.localeCompare(b.basename)), { create: true, basename: '+ New story arc…' }];
    new NoteSuggestModal(this.app, items, async it => {
      if (it.create) { this.promptCreate('arc'); return; }
      const val = it.none ? '' : '[[' + it.basename + ']]';
      for (const f of [file, partner].filter(Boolean)) await this.app.fileManager.processFrontMatter(f, fm => { fm.arc = val; });
      new Notice(it.none ? 'Arc cleared' : 'Arc set to ' + it.basename + (partner ? ' (also on ' + partner.basename + ')' : ''));
    }, 'Which story arc is ' + file.basename + ' part of?', it => it.basename + (it.file ? '' : '')).open();
  },
  renderSessionLink(src, el, ctx) {
    el.addClass('dmc-session-link'); lpSafe(el);
    const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!(file instanceof TFile)) return;
    const child = new obsidian.MarkdownRenderChild(el); ctx.addChild(child);
    const draw = () => {
      el.empty();
      const isPrep = this.fm(file).type === 'prep';
      const partner = isPrep ? this.sessionFor(file) : this.prepFor(file);
      const r1 = el.createDiv({ cls: 'dmc-sl-row' });
      setIcon(r1.createSpan({ cls: 'dmc-btn-icon' }), isPrep ? 'scroll-text' : 'clipboard-list');
      r1.createSpan({ cls: 'dmc-sl-label', text: isPrep ? 'Session' : 'Prep' });
      const v1 = r1.createDiv({ cls: 'dmc-sl-value' });
      if (partner) {
        const a = v1.createEl('a', { cls: 'internal-link', text: partner.basename });
        a.addEventListener('click', e => { e.preventDefault(); this.app.workspace.openLinkText(partner.path, file.path, Keymap.isModEvent(e)); });
        const c = button(r1, 'Change', 'link', () => this.pickPartner(file), 'dmc-icon-btn'); c.setAttr('title', 'Link a different ' + (isPrep ? 'session' : 'prep note'));
      } else {
        v1.createSpan({ cls: 'dmc-muted', text: isPrep ? 'not linked to a session yet' : 'no prep note yet' });
        const acts = r1.createDiv({ cls: 'dmc-row' });
        button(acts, isPrep ? 'Create session note' : 'Create prep note', 'plus', () => isPrep ? this.createSessionForPrep(file) : this.createPrepForSession(file), 'mod-cta');
        button(acts, 'Link existing', 'link', () => this.pickPartner(file));
      }
      const r2 = el.createDiv({ cls: 'dmc-sl-row' });
      setIcon(r2.createSpan({ cls: 'dmc-btn-icon' }), 'git-branch');
      r2.createSpan({ cls: 'dmc-sl-label', text: 'Arc' });
      const v2 = r2.createDiv({ cls: 'dmc-sl-value' });
      const arc = this.linkedNote(file, 'arc');
      if (arc) { const a = v2.createEl('a', { cls: 'internal-link', text: arc.basename }); a.addEventListener('click', e => { e.preventDefault(); this.app.workspace.openLinkText(arc.path, file.path, Keymap.isModEvent(e)); }); }
      else v2.createSpan({ cls: 'dmc-muted', text: 'none' });
      button(r2, arc ? 'Change' : 'Set arc', 'git-branch', () => this.pickArc(file), arc ? 'dmc-icon-btn' : '');
    };
    const refresh = obsidian.debounce ? obsidian.debounce(draw, 200, true) : draw;
    child.registerEvent(this.app.metadataCache.on('changed', f => { const t = this.fm(f).type; if (f.path === file.path || t === 'prep' || t === 'session' || t === 'arc') refresh(); }));
    draw();
  },
});

/* ================================================================== */
/* Campaign summary card (Overview + Ideas & Arcs tabs)                */
/* ================================================================== */
function mdSection(body, heading) {
  const re = new RegExp('^##\\s+' + heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'mi');
  const m = re.exec(body); if (!m) return '';
  const rest = body.slice(m.index + m[0].length);
  const end = rest.search(/^##\s+/m);
  return (end < 0 ? rest : rest.slice(0, end)).trim();
}

Object.assign(DMCodexPlugin.prototype, {
  campaignNote() { return this.getNotes('campaign')[0] || null; },
  /** "Open on D&D Beyond" when the note has a dndbeyond URL, otherwise "Add D&D Beyond link". */
  renderDdbButton(container, file, kind) {
    const url = String(this.fm(file).dndbeyond || '').trim();
    if (/^https?:\/\//i.test(url)) {
      const a = container.createEl('a', { cls: 'dmc-btn dmc-ddb', attr: { href: url, target: '_blank', rel: 'noopener', title: url } });
      setIcon(a.createSpan({ cls: 'dmc-btn-icon' }), 'external-link'); a.createSpan({ text: kind === 'campaign' ? 'Campaign on D&D Beyond' : 'Open on D&D Beyond' });
      lpSafe(a);
      const e = button(container, '', 'link', () => this.promptDdb(file, kind), 'dmc-icon-btn'); e.setAttr('title', 'Change D&D Beyond link'); e.setAttr('aria-label', 'Change D&D Beyond link');
    } else button(container, 'Add D&D Beyond link', 'link', () => this.promptDdb(file, kind), 'dmc-icon-btn');
  },
  promptDdb(file, kind) {
    new PromptModal(this.app, 'D&D Beyond link for ' + file.basename, kind === 'campaign' ? 'https://www.dndbeyond.com/campaigns/…' : 'https://www.dndbeyond.com/characters/…', async v => {
      let url = v.trim(); if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
      await this.app.fileManager.processFrontMatter(file, fm => { fm.dndbeyond = url; });
      new Notice(url ? (/dndbeyond\.com/i.test(url) ? 'D&D Beyond link saved' : 'Link saved (that isn\'t a dndbeyond.com address, but it will still open)') : 'D&D Beyond link removed');
    }, { value: String(this.fm(file).dndbeyond || ''), allowEmpty: true, cta: 'Save link', hint: 'Paste the URL of the ' + (kind === 'campaign' ? 'campaign' : 'character sheet') + '. Leave empty to remove it.' }).open();
  },
  async createCampaignSummary() {
    const f = await this.createNote('campaign', 'Campaign Summary', { noOpen: true });
    this.app.workspace.getLeaf('tab').openFile(f);
  },
  /** Facts worked out from the vault. */
  campaignFacts() {
    const sessions = this.getSessionsSorted();
    const played = sessions.filter(f => this.sessionState(f) === 'done');
    const planned = sessions.filter(f => this.sessionState(f) === 'upcoming');
    const last = played[played.length - 1] || null;
    const next = planned[0] || null;
    const latest = sessions[sessions.length - 1] || null;
    let arc = latest ? this.linkedNote(latest, 'arc') : null;
    if (!arc) arc = this.getNotes('arc').find(a => String(this.fm(a).status).toLowerCase() === 'active') || null;
    const party = this.getNotes('player').filter(f => (this.fm(f).status || 'active') === 'active');
    const levels = party.map(f => Number(this.fm(f).level) || 1);
    const quests = this.getNotes('quest').filter(f => !['completed', 'failed', 'abandoned'].includes(String(this.fm(f).status || '').toLowerCase()));
    const villains = this.getNotes('monster').filter(f => this.fm(f).villain === true || this.fm(f).villain === 'true');
    const encs = this.getNotes('encounter').filter(f => String(this.fm(f).status || 'planned') !== 'used');
    return { sessions, played, last, next, arc, party, levels, quests, villains, encs };
  },
  async renderCampaignSummary(container, view) {
    const card = container.createDiv({ cls: 'dmc-card dmc-summary' });
    const note = this.campaignNote();
    const head = card.createDiv({ cls: 'dmc-summary-head' });
    setIcon(head.createSpan({ cls: 'dmc-btn-icon' }), 'book-open');
    head.createSpan({ cls: 'dmc-summary-title', text: 'Campaign summary' });
    const tools = head.createDiv({ cls: 'dmc-row' });
    if (note) this.renderDdbButton(tools, note, 'campaign');
    if (note) button(tools, 'Edit summary', 'pencil', () => this.app.workspace.openLinkText(note.path, '', true), 'dmc-icon-btn');
    const F = this.campaignFacts();
    const comp = new Component(); comp.load();
    // premise
    const prem = card.createDiv({ cls: 'dmc-summary-premise' });
    if (note) wireLinks(this.app, prem, note.path);
    if (note) {
      const text = await this.app.vault.cachedRead(note);
      const body = text.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/^# .*\n/, '');
      const fm = this.fm(note);
      const tags = [fm.setting, fm.tone, fm.system].filter(x => x && String(x).trim());
      if (tags.length) { const t = prem.createDiv({ cls: 'dmc-summary-tags' }); tags.forEach(x => t.createSpan({ cls: 'dmc-pill', text: String(x) })); }
      const premise = mdSection(body, 'Premise') || body.split(/\n\s*\n/).find(p => p.trim() && !p.trim().startsWith('#') && !p.trim().startsWith('```')) || '';
      const stand = mdSection(body, 'Where things stand');
      if (premise) await renderMd(this.app, premise, prem.createDiv(), note.path, comp);
      if (stand) { prem.createDiv({ cls: 'dmc-summary-sub', text: 'Where things stand' }); await renderMd(this.app, stand, prem.createDiv(), note.path, comp); }
      if (!premise && !stand) prem.createDiv({ cls: 'dmc-muted', text: 'Add a “## Premise” and a “## Where things stand” section to your Campaign Summary note.' });
    } else {
      prem.createDiv({ cls: 'dmc-muted', text: 'No campaign summary yet. Write the premise and where things stand, and it appears here.' });
      button(prem, 'Write campaign summary', 'plus', () => this.createCampaignSummary(), 'mod-cta');
    }
    // live facts
    const facts = card.createDiv({ cls: 'dmc-summary-facts' });
    const fact = (label, value, onClick, sub) => {
      const d = facts.createDiv({ cls: 'dmc-fact' + (onClick ? ' is-link' : '') });
      d.createDiv({ cls: 'dmc-fact-label', text: label });
      d.createDiv({ cls: 'dmc-fact-value', text: value });
      if (sub) d.createDiv({ cls: 'dmc-fact-sub', text: sub });
      if (onClick) { d.addEventListener('click', onClick); lpSafe(d); }
    };
    const openNote = f => () => this.app.workspace.openLinkText(f.path, '', false);
    const goTab = t => () => { if (view) { view.tab = t; view.render(); } };
    fact('Current arc', F.arc ? F.arc.basename : '—', F.arc ? openNote(F.arc) : goTab('idea'), F.arc && this.fm(F.arc).act ? 'Act ' + this.fm(F.arc).act : '');
    fact('Last session', F.last ? F.last.basename.replace(/^Session (\d+) - /, '#$1 · ') : '—', F.last ? openNote(F.last) : null, (F.last ? String(this.fm(F.last).date || '') + ' · ' : '') + F.played.length + ' played');
    fact('Next session', F.next ? F.next.basename.replace(/^Session (\d+) - /, '#$1 · ') : '—', F.next ? openNote(F.next) : null, F.next ? String(this.fm(F.next).date || '') : '');
    const lv = F.levels.length ? (Math.min(...F.levels) === Math.max(...F.levels) ? 'Level ' + F.levels[0] : 'Levels ' + Math.min(...F.levels) + '–' + Math.max(...F.levels)) : '';
    fact('Party', F.party.length + ' character' + (F.party.length === 1 ? '' : 's'), goTab('player'), lv);
    const threads = await this.collectThreads(); const openT = threads.filter(t => !t.done).length;
    fact('Open threads', String(openT), goTab('threads'), threads.length ? (threads.length - openT) + ' done' : '');
    fact('Open quests', String(F.quests.length), goTab('quest'));
    fact('Villains', String(F.villains.length), goTab('monster'));
    fact('Planned encounters', String(F.encs.length), goTab('encounter'));
  },
});

/* ================================================================== */
/* Threads & follow-ups — collected from every session note            */
/* ================================================================== */
/*
 * Reads the checklist items (- [ ] / - [x]) under a "## Threads & follow-ups" (or "## Threads",
 * "## Follow-ups") heading in session notes. Ticking a thread anywhere edits that line in its session,
 * so the session note stays the single source of truth.
 */
const THREAD_HEADING = /^#{2,4}\s*(threads?(\s*(&|and)\s*follow[- ]?ups?)?|follow[- ]?ups?|loose ends)\s*$/i;

Object.assign(DMCodexPlugin.prototype, {
  threadSection(lines) {
    const start = lines.findIndex(l => THREAD_HEADING.test(l.trim()));
    if (start < 0) return null;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) if (/^#{1,4}\s/.test(lines[i])) { end = i; break; }
    return { start, end };
  },
  async collectThreads() {
    const out = [];
    for (const f of this.getSessionsSorted()) {
      const text = await this.app.vault.cachedRead(f);
      const lines = text.split('\n'); const sec = this.threadSection(lines); if (!sec) continue;
      for (let i = sec.start + 1; i < sec.end; i++) {
        const m = lines[i].match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.+?)\s*$/);
        if (!m || m[1].length) continue;
        const notes = [];
        for (let j = i + 1; j < sec.end && /^(\s{2,}|\t)\S/.test(lines[j]); j++) notes.push({ line: j, raw: lines[j], text: lines[j].trim().replace(/^[-*]\s+(\[[ xX]\]\s+)?/, '') });
        out.push({ file: f, line: i, raw: lines[i], done: m[2] !== ' ', text: m[3], notes, num: Number(this.fm(f).session_number) || 0 });
      }
    }
    return out;
  },
  async editLines(file, fn) {
    if (this.app.vault.process) return this.app.vault.process(file, data => fn(data.split('\n')).join('\n'));
    const data = await this.app.vault.read(file); await this.app.vault.modify(file, fn(data.split('\n')).join('\n'));
  },
  async toggleThread(t) {
    let ok = false;
    await this.editLines(t.file, lines => {
      let i = lines[t.line] === t.raw ? t.line : lines.indexOf(t.raw);
      if (i < 0) return lines;
      lines[i] = lines[i].replace(/\[([ xX])\]/, (m, c) => c === ' ' ? '[x]' : '[ ]'); ok = true; return lines;
    });
    if (!ok) new Notice('That thread changed in ' + t.file.basename + ' — refresh and try again.');
  },
  async addThread(file, text) {
    await this.editLines(file, lines => {
      const sec = this.threadSection(lines);
      const item = '- [ ] ' + text.trim();
      if (!sec) { while (lines.length && !lines[lines.length - 1].trim()) lines.pop(); lines.push('', '## Threads & follow-ups', item, ''); return lines; }
      // reuse an empty "- [ ]" placeholder, otherwise insert after the last item in the section
      for (let i = sec.start + 1; i < sec.end; i++) if (/^\s*[-*]\s+\[ \]\s*$/.test(lines[i])) { lines[i] = item; return lines; }
      let at = sec.start + 1;
      for (let i = sec.start + 1; i < sec.end; i++) if (/^\s*[-*]\s+\[[ xX]\]/.test(lines[i])) at = i + 1;
      lines.splice(at, 0, item); return lines;
    });
    new Notice('Thread added to ' + file.basename);
  },
  findThreadLine(lines, t) { return lines[t.line] === t.raw ? t.line : lines.indexOf(t.raw); },
  async addThreadNote(t, text) {
    let ok = false;
    await this.editLines(t.file, lines => {
      const i = this.findThreadLine(lines, t); if (i < 0) return lines;
      let at = i + 1; while (at < lines.length && /^(\s{2,}|\t)\S/.test(lines[at])) at++;
      lines.splice(at, 0, '    - ' + text.trim()); ok = true; return lines;
    });
    if (!ok) new Notice('That thread changed in ' + t.file.basename + ' — refresh and try again.');
  },
  async removeThreadNote(t, n) {
    await this.editLines(t.file, lines => { const i = lines[n.line] === n.raw ? n.line : lines.indexOf(n.raw); if (i >= 0) lines.splice(i, 1); return lines; });
  },
  async linkThread(t, target) {
    const link = '[[' + target.basename + ']]';
    if (t.text.includes(link) || t.notes.some(n => n.text.includes(link))) { new Notice('Already linked to ' + target.basename); return; }
    let ok = false;
    await this.editLines(t.file, lines => { const i = this.findThreadLine(lines, t); if (i < 0) return lines; lines[i] = lines[i].replace(/\s*$/, '') + ' → ' + link; ok = true; return lines; });
    if (ok) new Notice('Linked to ' + target.basename); else new Notice('That thread changed — refresh and try again.');
  },
  pickThreadLink(t) {
    const order = ['npc', 'place', 'quest', 'faction', 'player', 'item', 'monster', 'encounter', 'arc', 'idea', 'session'];
    const files = this.getAllTyped().filter(f => order.includes(String(this.fm(f).type))).sort((a, b) => order.indexOf(this.fm(a).type) - order.indexOf(this.fm(b).type) || a.basename.localeCompare(b.basename));
    new NoteSuggestModal(this.app, files, f => this.linkThread(t, f), 'Link this thread to… (NPC, place, quest, faction…)', f => (TYPES[this.fm(f).type] ? TYPES[this.fm(f).type].label + ' · ' : '') + f.basename).open();
  },
  threadMentions(t, path) {
    const all = [t.text, ...t.notes.map(n => n.text)].join(' ');
    return extractLinks(all).some(l => { const d = this.app.metadataCache.getFirstLinkpathDest(l, t.file.path); return d && d.path === path; });
  },
  promptAddThread(defaultFile) {
    const sessions = this.getSessionsSorted().reverse();
    if (!sessions.length) { new Notice('Create a session first.'); return; }
    const ask = f => new PromptModal(this.app, 'New thread in ' + f.basename, 'e.g. Who is Brannoc paying?', text => this.addThread(f, text), { cta: 'Add thread' }).open();
    if (defaultFile) return ask(defaultFile);
    new NoteSuggestModal(this.app, sessions, ask, 'Add the thread to which session?').open();
  },
  /** opts: { filter: open|done|all, scope: all|earlier, limit, compact } */
  renderThreads(container, sourcePath, opts) {
    opts = opts || {};
    const wrap = container.createDiv({ cls: 'dmc-threads' }); lpSafe(wrap);
    let filter = opts.filter || 'open', q = '';
    const host = sourcePath ? this.app.vault.getAbstractFileByPath(sourcePath) : null;
    const hostNum = host instanceof TFile ? Number(this.fm(host).session_number) || 0 : 0;
    const bar = wrap.createDiv({ cls: 'dmc-row dmc-wrap dmc-threads-bar' });
    const seg = bar.createDiv({ cls: 'dmc-seg' });
    const segBtns = {};
    for (const [k, l] of [['open', 'Open'], ['done', 'Done'], ['all', 'All']]) segBtns[k] = button(seg, l, null, () => { filter = k; if (opts.onFilter) opts.onFilter(k); draw(); }, 'dmc-seg-btn');
    const count = bar.createSpan({ cls: 'dmc-muted dmc-threads-count' });
    if (!opts.compact) { const s = bar.createEl('input', { type: 'search', cls: 'dmc-input dmc-search', attr: { placeholder: 'Search threads…' } }); lpSafe(s); s.addEventListener('input', () => { q = s.value.toLowerCase(); draw(); }); }
    button(bar, 'Add thread', 'plus', () => this.promptAddThread(opts.scope === 'earlier' ? null : (host instanceof TFile && this.fm(host).type === 'session' ? host : null)), opts.compact ? '' : 'mod-cta');
    const list = wrap.createDiv({ cls: 'dmc-threads-list' });
    const comp = new Component(); comp.load();
    const draw = async () => {
      Object.entries(segBtns).forEach(([k, b]) => b.toggleClass('is-active', k === filter));
      let all = await this.collectThreads();
      if (opts.scope === 'earlier' && host instanceof TFile) all = all.filter(t => t.file.path !== host.path && (!hostNum || t.num < hostNum));
      if (opts.mentions === 'this' && host instanceof TFile) all = all.filter(t => this.threadMentions(t, host.path));
      const open = all.filter(t => !t.done).length, done = all.length - open;
      count.setText(open + ' open · ' + done + ' done');
      let items = all.filter(t => filter === 'all' || (filter === 'open' ? !t.done : t.done));
      if (q) items = items.filter(t => (t.text + ' ' + t.file.basename).toLowerCase().includes(q));
      list.empty();
      if (!items.length && opts.mentions === 'this') { list.createDiv({ cls: 'dmc-muted', text: 'No threads mention this note yet. On the Threads tab, use the link button on a thread to connect it here.' }); return; }
      if (!items.length) { list.createDiv({ cls: 'dmc-muted', text: filter === 'open' ? (all.length ? 'No open threads — everything is followed up.' : 'No threads yet. Add checklist items under “## Threads & follow-ups” in your session notes, or click Add thread.') : 'Nothing here.' }); return; }
      const groups = new Map();
      items.sort((a, b) => b.num - a.num || a.line - b.line).forEach(t => { if (!groups.has(t.file.path)) groups.set(t.file.path, []); groups.get(t.file.path).push(t); });
      let shown = 0;
      for (const [, ts] of groups) {
        if (opts.limit && shown >= opts.limit) break;
        const f = ts[0].file;
        const g = list.createDiv({ cls: 'dmc-thread-group' });
        const gh = g.createDiv({ cls: 'dmc-thread-head' });
        const a = gh.createEl('a', { cls: 'internal-link', text: f.basename });
        a.addEventListener('click', e => { e.preventDefault(); this.app.workspace.openLinkText(f.path, sourcePath || '', Keymap.isModEvent(e)); });
        if (this.fm(f).date) gh.createSpan({ cls: 'dmc-muted', text: ' · ' + this.fm(f).date });
        for (const t of ts) {
          if (opts.limit && shown >= opts.limit) break; shown++;
          const row = g.createDiv({ cls: 'dmc-thread' + (t.done ? ' is-done' : '') });
          const cb = row.createEl('input', { type: 'checkbox' }); cb.checked = t.done; lpSafe(cb);
          cb.addEventListener('change', async () => { await this.toggleThread(t); });
          const body = row.createDiv({ cls: 'dmc-thread-body' });
          const txt = body.createDiv({ cls: 'dmc-thread-text' });
          await renderMd(this.app, t.text, txt, f.path, comp);
          txt.querySelectorAll('p').forEach(p => p.style.display = 'inline');
          if (t.notes.length) {
            const ul = body.createDiv({ cls: 'dmc-thread-notes' });
            for (const n of t.notes) {
              const li = ul.createDiv({ cls: 'dmc-thread-note' });
              const nt = li.createDiv({ cls: 'dmc-thread-note-text' }); await renderMd(this.app, n.text, nt, f.path, comp); nt.querySelectorAll('p').forEach(p => p.style.display = 'inline');
              const x = button(li, '', 'x', () => this.removeThreadNote(t, n), 'dmc-icon-btn dmc-danger dmc-thread-note-del'); x.setAttr('title', 'Remove this note');
            }
          }
          const acts = row.createDiv({ cls: 'dmc-thread-actions' });
          const nb = button(acts, '', 'message-square-plus', () => new PromptModal(this.app, 'Note on: ' + t.text.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1').slice(0, 60), 'Short note… ([[links]] work)', v => this.addThreadNote(t, v), { cta: 'Add note' }).open(), 'dmc-icon-btn');
          nb.setAttr('title', 'Add a short note'); nb.setAttr('aria-label', 'Add a short note');
          const lb = button(acts, '', 'link', () => this.pickThreadLink(t), 'dmc-icon-btn');
          lb.setAttr('title', 'Link to an NPC, place, quest…'); lb.setAttr('aria-label', 'Link to a note');
        }
      }
      if (opts.limit && items.length > shown) list.createDiv({ cls: 'dmc-muted', text: '+ ' + (items.length - shown) + ' more on the Threads tab' });
    };
    draw();
    return draw;
  },
});

/* ================================================================== */
/* Level-up tracking                                                   */
/* ================================================================== */
/*
 * Each character note keeps a "## Level history" list (real links, so backlinks work):
 *   - **Level 4** — [[Session 003 - …]] · 2026-11-14 · Took the Alert feat
 * ```level-history``` shows the current level and a Level up button in a character note,
 * the level-ups from this session in a session note (`session: this`), or the whole party timeline (`party: true`).
 */
const LEVEL_HEADING = /^#{1,6}\s+level (history|ups?|progression)\b/i;
const LEVEL_LINE = /^\s*[-*]\s+\*\*Level\s+(\d+)\*\*\s*(?:[—–-]\s*)?(.*)$/i;

class LevelUpModal extends Modal {
  constructor(plugin, opts = {}) { super(plugin.app); this.plugin = plugin; this.opts = opts; }
  onOpen() {
    const p = this.plugin, { contentEl } = this;
    contentEl.addClass('dmc-modal', 'dmc-levelup');
    const h = contentEl.createEl('h3'); setIcon(h.createSpan({ cls: 'dmc-btn-icon' }), 'trending-up'); h.appendText(' Level up');
    const party = p.getNotes('player').filter(f => (p.fm(f).status || 'active') === 'active').sort((a, b) => a.basename.localeCompare(b.basename));
    const pre = (this.opts.chars || []).map(f => f.path);
    const sec1 = contentEl; contentEl.createDiv({ cls: 'dmc-sec', text: 'Who levels up?' });
    const rows = [];
    const list = sec1.createDiv({ cls: 'dmc-lv-list' });
    const all = (this.opts.chars && this.opts.chars.length === 1 && !party.find(f => f.path === pre[0])) ? this.opts.chars : party;
    if (!all.length) list.createDiv({ cls: 'dmc-muted', text: 'No active player characters yet.' });
    all.forEach(f => {
      const cur = Number(p.fm(f).level) || 1;
      const r = list.createDiv({ cls: 'dmc-lv-row' });
      const cb = r.createEl('input', { type: 'checkbox' }); cb.checked = pre.length ? pre.includes(f.path) : true;
      r.createSpan({ cls: 'dmc-lv-name', text: f.basename });
      r.createSpan({ cls: 'dmc-muted', text: [p.fm(f).class, 'Lv ' + cur].filter(Boolean).join(' · ') });
      r.createSpan({ cls: 'dmc-muted', text: '→' });
      const n = r.createEl('input', { type: 'number', cls: 'dmc-lv-num', attr: { min: '1', max: '20' } }); n.value = String(Math.min(20, cur + 1));
      const sync = () => { n.disabled = !cb.checked; r.toggleClass('is-off', !cb.checked); }; cb.addEventListener('change', sync); sync();
      rows.push({ f, cb, n });
    });
    contentEl.createDiv({ cls: 'dmc-sec', text: 'When' });
    const g = contentEl.createDiv({ cls: 'dmc-lv-grid' });
    const sessions = p.getSessionsSorted().slice().reverse();
    const played = sessions.find(s => p.sessionState(s) === 'done');
    const def = this.opts.session || played || sessions[0] || null;
    const sSel = fEl(g, 'Session', sel([['', '— no session —'], ...sessions.map(s => [s.path, s.basename])], def ? def.path : ''));
    const dIn = fEl(g, 'Date', inp('date', ''));
    const setDate = () => { const s = sessions.find(x => x.path === sSel.value); const d = s && p.fm(s).date; dIn.value = d && /^\d{4}-\d{2}-\d{2}/.test(String(d)) ? String(d).slice(0, 10) : today(); };
    sSel.addEventListener('change', setDate); setDate();
    const note = fEl(g, 'What changed (optional)', ta('', 'Milestone, HP gained, new feat or subclass, spells learned… [[links]] work', 2), true);
    const row = contentEl.createDiv({ cls: 'dmc-row' });
    button(row, 'Level up', 'trending-up', async () => {
      const chosen = rows.filter(r => r.cb.checked);
      if (!chosen.length) { new Notice('Pick at least one character.'); return; }
      const session = sessions.find(x => x.path === sSel.value) || null;
      for (const r of chosen) await p.recordLevelUp(r.f, { level: Math.max(1, Math.min(20, Number(r.n.value) || 1)), session, date: dIn.value, note: note.value.replace(/\s*\n\s*/g, ' ').trim() });
      new Notice(chosen.length === 1 ? '⬆ ' + chosen[0].f.basename + ' is now level ' + chosen[0].n.value : '⬆ ' + chosen.length + ' characters levelled up');
      this.close(); this.opts.onDone?.();
    }, 'mod-cta');
    button(row, 'Cancel', null, () => this.close());
  }
  onClose() { this.contentEl.empty(); }
}

Object.assign(DMCodexPlugin.prototype, {
  openLevelUp(opts) { new LevelUpModal(this, opts || {}).open(); },
  /** Parse "## Level history" entries of a character note (oldest first). */
  parseLevelHistory(file, text) {
    const lines = text.split('\n'); const out = [];
    let inSec = false, depth = 0;
    for (const line of lines) {
      const hm = /^(#{1,6})\s/.exec(line);
      if (hm) { if (LEVEL_HEADING.test(line)) { inSec = true; depth = hm[1].length; continue; } if (inSec && hm[1].length <= depth) inSec = false; }
      if (!inSec) continue;
      const m = LEVEL_LINE.exec(line); if (!m) continue;
      const e = { file, level: Number(m[1]), session: null, sessionText: '', date: '', note: '', line };
      const notes = [];
      for (const part of m[2].split(/\s+·\s+/).map(s => s.trim()).filter(Boolean)) {
        const lk = /^\[\[([^\]|#]+)(?:[^\]]*)\]\]$/.exec(part);
        const dest = lk && this.app.metadataCache.getFirstLinkpathDest(lk[1], file.path);
        if (!e.session && dest && this.fm(dest).type === 'session') { e.session = dest; e.sessionText = part; }
        else if (!e.date && /^\d{4}-\d{2}-\d{2}$/.test(part)) e.date = part;
        else notes.push(part);
      }
      e.note = notes.join(' · ');
      out.push(e);
    }
    return out;
  },
  async levelHistory(file) { return this.parseLevelHistory(file, await this.app.vault.cachedRead(file)); },
  async partyLevelHistory() {
    const chars = this.getNotes('player');
    const all = [];
    for (const f of chars) all.push(...await this.levelHistory(f));
    return all;
  },
  /** Add a line to the character's Level history (creating the section if needed) and set `level`. */
  async recordLevelUp(file, { level, session, date, note }) {
    const parts = ['- **Level ' + level + '**'];
    const rest = [session ? '[[' + session.basename + ']]' : '', date || '', note || ''].filter(Boolean);
    const line = parts[0] + (rest.length ? ' — ' + rest.join(' · ') : '');
    await this.app.vault.process(file, text => {
      const lines = text.split('\n');
      let h = lines.findIndex(l => LEVEL_HEADING.test(l));
      if (h < 0) {
        let at = lines.findIndex(l => /^#{1,6}\s+sessions featuring/i.test(l));
        const block = ['## Level history', '```level-history', '```', line, ''];
        if (at < 0) { while (lines.length && !lines[lines.length - 1].trim()) lines.pop(); lines.push('', ...block); }
        else lines.splice(at, 0, ...block);
        return lines.join('\n');
      }
      const depth = /^(#+)/.exec(lines[h])[1].length;
      let end = lines.length;
      for (let i = h + 1; i < lines.length; i++) { const m = /^(#{1,6})\s/.exec(lines[i]); if (m && m[1].length <= depth) { end = i; break; } }
      // drop empty "- " placeholders in the section
      for (let i = end - 1; i > h; i--) if (/^\s*[-*]\s*$/.test(lines[i])) { lines.splice(i, 1); end--; }
      let last = h; for (let i = h + 1; i < end; i++) if (lines[i].trim()) last = i;
      lines.splice(last + 1, 0, line);
      if (last + 2 < lines.length && lines[last + 2].trim() && /^#/.test(lines[last + 2])) lines.splice(last + 2, 0, '');
      return lines.join('\n');
    });
    const cur = Number(this.fm(file).level) || 0;
    if (level >= cur) await this.app.fileManager.processFrontMatter(file, fm => { fm.level = level; });
  },
  async removeLevelEntry(e) {
    await this.app.vault.process(e.file, text => { const lines = text.split('\n'); const i = lines.indexOf(e.line); if (i >= 0) lines.splice(i, 1); return lines.join('\n'); });
    const left = await this.levelHistory(e.file);
    if (left.length) await this.app.fileManager.processFrontMatter(e.file, fm => { fm.level = Math.max(...left.map(x => x.level)); });
  },
  linkTo(parent, file, text) {
    const a = parent.createEl('a', { cls: 'internal-link', text: text || file.basename, href: file.path });
    a.addEventListener('click', ev => { ev.preventDefault(); this.app.workspace.openLinkText(file.path, '', Keymap.isModEvent(ev)); });
    return a;
  },
  /** Party timeline grouped by session, newest first. */
  renderLevelTimeline(el, entries, opts = {}) {
    if (!entries.length) { el.createDiv({ cls: 'dmc-muted', text: opts.empty || 'No level-ups recorded yet. Use Level up after a session — it is added to each character\'s Level history.' }); return; }
    const order = new Map(this.getSessionsSorted().map((s, i) => [s.path, i]));
    const groups = new Map();
    for (const e of entries) { const k = e.session ? e.session.path : 'date:' + (e.date || ''); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }
    const keyRank = k => k.startsWith('date:') ? -1 : order.get(k) ?? -1;
    const keys = [...groups.keys()].sort((a, b) => keyRank(b) - keyRank(a) || String(groups.get(b)[0].date).localeCompare(String(groups.get(a)[0].date)));
    const t = el.createEl('table', { cls: 'dmc-table dmc-lv-table' });
    const hr = t.createEl('thead').createEl('tr'); ['Session', 'Date', 'Level-ups'].forEach(x => hr.createEl('th', { text: x }));
    const tb = t.createEl('tbody');
    for (const k of keys.slice(0, opts.limit || keys.length)) {
      const g = groups.get(k); const r = tb.createEl('tr');
      const s = r.createEl('td'); if (g[0].session) this.linkTo(s, g[0].session); else s.createSpan({ cls: 'dmc-muted', text: '—' });
      r.createEl('td', { text: g.map(e => e.date).find(Boolean) || '' });
      const c = r.createEl('td');
      g.sort((a, b) => a.file.basename.localeCompare(b.file.basename)).forEach(e => {
        const chip = c.createDiv({ cls: 'dmc-lv-chip' });
        this.linkTo(chip, e.file); chip.createSpan({ cls: 'dmc-pill', text: 'Lv ' + e.level });
        if (e.note) chip.createSpan({ cls: 'dmc-muted', text: ' ' + e.note.replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, a, b) => b || a) });
      });
    }
  },
  /** ```level-history``` code block. */
  renderLevelBlock(src, el, ctx) {
    el.addClass('dmc-block', 'dmc-lv-block'); lpSafe(el);
    let o = {}; try { o = parseYaml(src) || {}; } catch (e) {}
    const host = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
    const type = host instanceof TFile ? this.fm(host).type : '';
    const mode = o.party === true || o.party === 'true' ? 'party' : (o.session === 'this' || type === 'session') ? 'session' : type === 'player' ? 'char' : 'party';
    const draw = async () => {
      el.empty();
      if (mode === 'char') {
        const hist = await this.levelHistory(host);
        const cur = Number(this.fm(host).level) || 1;
        const top = el.createDiv({ cls: 'dmc-lv-head' });
        const badge = top.createDiv({ cls: 'dmc-lv-badge' }); badge.createDiv({ cls: 'dmc-lv-badge-num', text: String(cur) }); badge.createDiv({ cls: 'dmc-lv-badge-lbl', text: 'Level' });
        const info = top.createDiv({ cls: 'dmc-lv-info' });
        if (!hist.length) info.createDiv({ cls: 'dmc-muted', text: 'No level-ups recorded yet.' });
        else {
          const last = hist[hist.length - 1];
          const l1 = info.createDiv(); l1.appendText(hist.length + ' level-up' + (hist.length === 1 ? '' : 's') + ' recorded · last: Level ' + last.level + ' ');
          if (last.session) { l1.appendText('in '); this.linkTo(l1, last.session); }
          if (last.date) l1.createSpan({ cls: 'dmc-muted', text: ' (' + last.date + ')' });
          const ps = hist.filter(e => e.session).length;
          if (ps) { const sess = this.getSessionsSorted(); const first = hist.find(e => e.session); const i0 = sess.findIndex(s => s.path === first.session.path); const i1 = sess.findIndex(s => s.path === last.session?.path); if (i0 >= 0 && i1 > i0 && hist.length > 1) info.createDiv({ cls: 'dmc-muted', text: 'About ' + Math.round((i1 - i0) / (hist.length - 1) * 10) / 10 + ' sessions per level' }); }
        }
        const acts = top.createDiv({ cls: 'dmc-lv-acts' });
        button(acts, 'Level up', 'trending-up', () => this.openLevelUp({ chars: [host] }), 'mod-cta');
      } else if (mode === 'session') {
        const all = (await this.partyLevelHistory()).filter(e => e.session && e.session.path === host.path);
        const top = el.createDiv({ cls: 'dmc-lv-head' });
        const info = top.createDiv({ cls: 'dmc-lv-info' });
        if (!all.length) info.createDiv({ cls: 'dmc-muted', text: 'No level-ups recorded for this session.' });
        else all.sort((a, b) => a.file.basename.localeCompare(b.file.basename)).forEach(e => { const c = info.createDiv({ cls: 'dmc-lv-chip' }); setIcon(c.createSpan({ cls: 'dmc-btn-icon' }), 'trending-up'); this.linkTo(c, e.file); c.appendText(' reached '); c.createSpan({ cls: 'dmc-pill', text: 'Level ' + e.level }); if (e.note) c.createSpan({ cls: 'dmc-muted', text: ' ' + e.note.replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, a, b) => b || a) }); });
        const acts = top.createDiv({ cls: 'dmc-lv-acts' });
        button(acts, all.length ? 'Level up more' : 'Level up the party', 'trending-up', () => this.openLevelUp({ session: host }));
      } else {
        const bar = el.createDiv({ cls: 'dmc-row', attr: { style: 'justify-content:flex-end;margin-bottom:6px' } });
        button(bar, 'Level up the party', 'trending-up', () => this.openLevelUp({}));
        this.renderLevelTimeline(el, await this.partyLevelHistory(), { limit: Number(o.limit) || 0 });
      }
    };
    if (ctx.addChild) {
      const child = new obsidian.MarkdownRenderChild(el); ctx.addChild(child);
      const refresh = obsidian.debounce ? obsidian.debounce(() => draw(), 250, true) : draw;
      child.registerEvent(this.app.metadataCache.on('changed', f => { if (this.fm(f).type === 'player') refresh(); }));
    }
    draw();
  },
  /** Dashboard card (Party tab). */
  renderLevelCard(body) {
    const c = body.createDiv({ cls: 'dmc-card' });
    const head = c.createDiv({ cls: 'dmc-card-head' });
    const h = head.createEl('h4'); setIcon(h.createSpan({ cls: 'dmc-btn-icon' }), 'trending-up'); h.appendText(' Level history');
    button(head, 'Level up the party', 'trending-up', () => this.openLevelUp({}), 'mod-cta');
    const party = this.getNotes('player').filter(f => (this.fm(f).status || 'active') === 'active');
    if (party.length) {
      const lv = party.map(f => Number(this.fm(f).level) || 1);
      c.createDiv({ cls: 'dmc-muted', attr: { style: 'margin-bottom:6px' }, text: 'Party level ' + (Math.min(...lv) === Math.max(...lv) ? lv[0] : Math.min(...lv) + '–' + Math.max(...lv)) + ' · each character keeps its own Level history; this is the whole party, newest first.' });
    }
    const wrap = c.createDiv();
    this.partyLevelHistory().then(es => this.renderLevelTimeline(wrap, es));
  },
});

/* ================================================================== */
/* Images: art, portraits, galleries (shared by DM Codex & DM Statblocks) */
/* ================================================================== */
const IMG_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif'];
const IMG_MIME_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/bmp': 'bmp', 'image/svg+xml': 'svg', 'image/avif': 'avif' };
function isImageFile(f) { return !!(f && f.extension && IMG_EXT.includes(String(f.extension).toLowerCase())); }
function imageFilesIn(app) { return app.vault.getFiles().filter(isImageFile).sort((a, b) => ((b.stat && b.stat.mtime) || 0) - ((a.stat && a.stat.mtime) || 0)); }
/** "[[art.png|caption]]", "art.png", "![[art.png]]" or a URL → { file?, url, name, caption } */
function resolveImage(app, v, sourcePath) {
  const s = String(v == null ? '' : v).trim(); if (!s) return null;
  if (/^(https?:|data:image|app:|blob:)/i.test(s)) return { url: s, name: s.split('/').pop(), caption: '' };
  let m = /^!?\[\[([^\]|#]+)(?:\|([^\]]*))?\]\]$/.exec(s);
  if (!m) { const md = /^!?\[([^\]]*)\]\(([^)]+)\)$/.exec(s); if (md) { if (/^https?:/i.test(md[2])) return { url: md[2], name: md[2].split('/').pop(), caption: md[1] }; m = [null, decodeURI(md[2]), md[1]]; } }
  const link = m ? m[1] : s.replace(/^!/, '');
  const f = app.metadataCache.getFirstLinkpathDest(link.trim(), sourcePath || '');
  return f && isImageFile(f) ? { file: f, url: app.vault.getResourcePath(f), name: f.basename, caption: (m && m[2]) || '' } : null;
}
function imageLinkFor(app, f, sourcePath, caption) {
  const t = app.metadataCache.fileToLinktext ? app.metadataCache.fileToLinktext(f, sourcePath || '', false) : f.name;
  return '[[' + t + (caption ? '|' + String(caption).replace(/[\[\]|]/g, '') : '') + ']]';
}
/** Copy an image (File/Blob) into the vault, following the user's attachment settings. */
async function saveImageToVault(app, blob, name, sourcePath) {
  let ext = (String(name || '').match(/\.([a-z0-9]+)$/i) || [])[1] || IMG_MIME_EXT[blob.type] || 'png';
  let base = String(name || 'image').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|#^\[\]]/g, '').trim() || 'image';
  if (/^image$|^Pasted image$/i.test(base)) base = 'Pasted image ' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const fname = base + '.' + ext.toLowerCase();
  let path;
  if (app.fileManager.getAvailablePathForAttachment) path = await app.fileManager.getAvailablePathForAttachment(fname, sourcePath || '');
  else { path = 'Assets/' + fname; let i = 1; while (app.vault.getAbstractFileByPath(path)) path = 'Assets/' + base + ' ' + (i++) + '.' + ext; }
  const dir = path.split('/').slice(0, -1).join('/');
  if (dir && !app.vault.getAbstractFileByPath(dir)) { try { await app.vault.createFolder(dir); } catch (e) {} }
  return app.vault.createBinary(path, await blob.arrayBuffer());
}
/** Open the system file picker for images. */
function chooseImageFiles(multiple) {
  return new Promise(resolve => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = !!multiple; i.style.display = 'none';
    i.addEventListener('change', () => { resolve(Array.from(i.files || [])); i.remove(); });
    document.body.appendChild(i); i.click();
  });
}
function imagesFromDataTransfer(dt) {
  const out = [];
  if (!dt) return out;
  for (const f of Array.from(dt.files || [])) if (/^image\//.test(f.type)) out.push(f);
  if (!out.length) for (const it of Array.from(dt.items || [])) if (it.kind === 'file' && /^image\//.test(it.type)) { const f = it.getAsFile(); if (f) out.push(f); }
  return out;
}
/** Make an element accept dropped / pasted images. */
function makeImageDropTarget(el, onFiles, hoverCls) {
  el.setAttr ? el.setAttr('tabindex', '0') : el.setAttribute('tabindex', '0');
  const cls = hoverCls || 'is-dragover';
  el.addEventListener('dragover', e => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) { e.preventDefault(); el.classList.add(cls); } });
  el.addEventListener('dragleave', () => el.classList.remove(cls));
  el.addEventListener('drop', e => { const fs = imagesFromDataTransfer(e.dataTransfer); el.classList.remove(cls); if (fs.length) { e.preventDefault(); e.stopPropagation(); onFiles(fs); } });
  el.addEventListener('paste', e => { const fs = imagesFromDataTransfer(e.clipboardData); if (fs.length) { e.preventDefault(); e.stopPropagation(); onFiles(fs); } });
  return el;
}
class ImageSuggestModal extends FuzzySuggestModal {
  constructor(app, onChoose, placeholder) { super(app); this.onChoose = onChoose; this.setPlaceholder(placeholder || 'Choose an image from the vault…'); }
  getItems() { return imageFilesIn(this.app); }
  getItemText(f) { return f.path; }
  renderSuggestion(m, el) {
    const f = m.item || m; el.addClass('img-suggest');
    const img = el.createEl('img', { cls: 'img-suggest-thumb' }); img.src = this.app.vault.getResourcePath(f);
    const t = el.createDiv(); t.createDiv({ text: f.name }); t.createDiv({ cls: 'img-suggest-path', text: f.parent && f.parent.path && f.parent.path !== '/' ? f.parent.path : '' });
  }
  onChooseItem(f) { this.onChoose(f); }
}
/** Full-size viewer with previous / next. items: [{ url, caption, file }] */
class ImageLightbox extends Modal {
  constructor(app, items, index, opts) { super(app); this.items = items; this.i = index || 0; this.opts = opts || {}; }
  onOpen() {
    this.modalEl.addClass('img-lightbox-modal');
    const c = this.contentEl; c.addClass('img-lightbox');
    const stage = c.createDiv({ cls: 'img-lightbox-stage' });
    const img = stage.createEl('img');
    const cap = c.createDiv({ cls: 'img-lightbox-cap' });
    const nav = (d) => { this.i = (this.i + d + this.items.length) % this.items.length; draw(); };
    let prev, next;
    if (this.items.length > 1) {
      prev = stage.createEl('button', { cls: 'img-lightbox-nav is-prev', text: '‹', attr: { 'aria-label': 'Previous' } }); prev.addEventListener('click', () => nav(-1));
      next = stage.createEl('button', { cls: 'img-lightbox-nav is-next', text: '›', attr: { 'aria-label': 'Next' } }); next.addEventListener('click', () => nav(1));
      this.scope && this.scope.register && (this.scope.register([], 'ArrowLeft', () => { nav(-1); return false; }), this.scope.register([], 'ArrowRight', () => { nav(1); return false; }));
    }
    const draw = () => {
      const it = this.items[this.i]; img.src = it.url; img.alt = it.caption || it.name || '';
      cap.empty();
      cap.createSpan({ text: it.caption || it.name || '' });
      if (this.items.length > 1) cap.createSpan({ cls: 'img-lightbox-count', text: ' · ' + (this.i + 1) + ' / ' + this.items.length });
      if (it.file) { const a = cap.createEl('a', { cls: 'img-lightbox-open', text: 'Open file' }); a.addEventListener('click', e => { e.preventDefault(); this.close(); this.app.workspace.getLeaf('tab').openFile(it.file); }); }
    };
    draw();
  }
  onClose() { this.contentEl.empty(); }
}

/* ================================================================== */
/* Portraits (characters, NPCs) and galleries (places, factions)       */
/* ================================================================== */
Object.assign(DMCodexPlugin.prototype, {
  /** First portrait / gallery image of a note, for thumbnails. */
  thumbFor(file) {
    const fm = this.fm(file);
    return resolveImage(this.app, fm.image, file.path) || (Array.isArray(fm.gallery) ? fm.gallery.map(g => resolveImage(this.app, g, file.path)).find(Boolean) : null) || null;
  },
  avatar(parent, file) {
    const t = this.thumbFor(file); if (!t) return null;
    const im = parent.createEl('img', { cls: 'dmc-avatar', attr: { alt: '', loading: 'lazy' } }); im.src = t.url; return im;
  },
  async saveImagesFor(file, blobs) {
    const out = [];
    for (const b of blobs) { try { out.push(await saveImageToVault(this.app, b, b.name || 'image.png', file.path)); } catch (e) { new Notice('Could not save image: ' + e.message); } }
    return out;
  },
  async setPortrait(file, img) { await this.app.fileManager.processFrontMatter(file, fm => { fm.image = img ? imageLinkFor(this.app, img, file.path) : ''; }); },
  async addToGallery(file, imgs) {
    if (!imgs.length) return;
    await this.app.fileManager.processFrontMatter(file, fm => { const g = Array.isArray(fm.gallery) ? fm.gallery : fm.gallery ? [fm.gallery] : []; imgs.forEach(f => g.push(imageLinkFor(this.app, f, file.path))); fm.gallery = g; });
    new Notice(imgs.length === 1 ? 'Added 1 image to the gallery' : 'Added ' + imgs.length + ' images to the gallery');
  },
  /** ```portrait``` — the note's `image` property, with upload / pick / drop / paste. */
  renderPortrait(src, el, ctx) {
    el.addClass('dmc-portrait-block'); lpSafe(el);
    const host = this.app.vault.getAbstractFileByPath(ctx.sourcePath); if (!(host instanceof TFile)) return;
    let o = {}; try { o = parseYaml(src) || {}; } catch (e) {}
    const size = ['small', 'large'].includes(o.size) ? o.size : 'medium';
    const draw = () => {
      el.empty();
      const img = resolveImage(this.app, this.fm(host).image, host.path);
      const card = el.createDiv({ cls: 'dmc-portrait is-' + size + (img ? '' : ' is-empty') });
      makeImageDropTarget(card, async fs => { const [f] = await this.saveImagesFor(host, fs.slice(0, 1)); if (f) await this.setPortrait(host, f); });
      if (img) {
        const im = card.createEl('img', { attr: { alt: host.basename } }); im.src = img.url;
        im.addEventListener('click', () => new ImageLightbox(this.app, [{ url: img.url, caption: host.basename, file: img.file }], 0).open());
      } else {
        const ic = card.createDiv({ cls: 'dmc-portrait-ic' }); setIcon(ic, 'image-plus');
        card.createDiv({ cls: 'dmc-muted', text: 'Drop or paste a portrait' });
      }
      const bar = card.createDiv({ cls: 'dmc-portrait-bar' });
      const b1 = button(bar, img ? '' : 'Upload', 'upload', async () => { const fs = await chooseImageFiles(false); if (!fs.length) return; const [f] = await this.saveImagesFor(host, fs); if (f) await this.setPortrait(host, f); }, 'dmc-icon-btn'); b1.setAttr('title', img ? 'Replace with an image from your computer' : 'Upload an image');
      const b2 = button(bar, img ? '' : 'From vault', 'image', () => new ImageSuggestModal(this.app, f => this.setPortrait(host, f)).open(), 'dmc-icon-btn'); b2.setAttr('title', 'Choose an image already in the vault');
      if (img) { const b3 = button(bar, '', 'x', () => this.setPortrait(host, null), 'dmc-icon-btn'); b3.setAttr('title', 'Remove portrait (keeps the image file)'); }
    };
    const child = new obsidian.MarkdownRenderChild(el); ctx.addChild(child);
    child.registerEvent(this.app.metadataCache.on('changed', f => { if (f.path === host.path) draw(); }));
    draw();
  },
  /** ```gallery``` — the note's `gallery` property: a grid with captions, cover, lightbox. */
  renderGallery(src, el, ctx) {
    el.addClass('dmc-gallery-block'); lpSafe(el);
    const host = this.app.vault.getAbstractFileByPath(ctx.sourcePath); if (!(host instanceof TFile)) return;
    const raw = () => { const g = this.fm(host).gallery; return Array.isArray(g) ? g : g ? [g] : []; };
    const edit = fn => this.app.fileManager.processFrontMatter(host, fm => { const g = Array.isArray(fm.gallery) ? fm.gallery : fm.gallery ? [fm.gallery] : []; fm.gallery = fn(g) || g; });
    const draw = () => {
      el.empty();
      const list = raw().map((v, i) => ({ i, v, img: resolveImage(this.app, v, host.path) }));
      const items = list.filter(x => x.img);
      const head = el.createDiv({ cls: 'dmc-gallery-head' });
      head.createSpan({ cls: 'dmc-muted', text: items.length ? items.length + ' image' + (items.length === 1 ? '' : 's') + ' · drop or paste to add more' : 'No images yet — drop or paste images here.' });
      const acts = head.createDiv({ cls: 'dmc-row' });
      button(acts, 'Add images', 'image-plus', async () => { const fs = await chooseImageFiles(true); if (fs.length) await this.addToGallery(host, await this.saveImagesFor(host, fs)); });
      button(acts, 'From vault', 'image', () => new ImageSuggestModal(this.app, f => this.addToGallery(host, [f])).open());
      const grid = el.createDiv({ cls: 'dmc-gallery' + (items.length ? '' : ' is-empty') });
      makeImageDropTarget(el, async fs => this.addToGallery(host, await this.saveImagesFor(host, fs)));
      const missing = list.filter(x => !x.img);
      items.forEach((x, k) => {
        const tile = grid.createDiv({ cls: 'dmc-gtile' + (k === 0 ? ' is-cover' : '') });
        const im = tile.createEl('img', { attr: { alt: x.img.caption || x.img.name, loading: 'lazy' } }); im.src = x.img.url;
        im.addEventListener('click', () => new ImageLightbox(this.app, items.map(y => ({ url: y.img.url, caption: y.img.caption || y.img.name, file: y.img.file })), k).open());
        if (x.img.caption) tile.createDiv({ cls: 'dmc-gcap', text: x.img.caption });
        if (k === 0 && items.length > 1) tile.createDiv({ cls: 'dmc-gbadge', text: 'Cover' });
        const tools = tile.createDiv({ cls: 'dmc-gtools' });
        const t1 = button(tools, '', 'pencil', () => new PromptModal(this.app, 'Caption', 'e.g. The market square at dusk', v => edit(g => { g[x.i] = imageLinkFor(this.app, x.img.file, host.path, v); }), { value: x.img.caption, allowEmpty: true, cta: 'Save caption' }).open(), 'dmc-icon-btn'); t1.setAttr('title', 'Caption');
        if (k > 0) { const t2 = button(tools, '', 'star', () => edit(g => { const [it] = g.splice(x.i, 1); g.unshift(it); }), 'dmc-icon-btn'); t2.setAttr('title', 'Make cover (first image)'); }
        const t3 = button(tools, '', 'x', () => edit(g => { g.splice(x.i, 1); }), 'dmc-icon-btn'); t3.setAttr('title', 'Remove from gallery (keeps the image file)');
      });
      if (missing.length) el.createDiv({ cls: 'dmc-muted', text: missing.length + ' gallery entr' + (missing.length === 1 ? 'y points' : 'ies point') + ' to a missing image: ' + missing.map(x => String(x.v)).join(', ') });
    };
    const child = new obsidian.MarkdownRenderChild(el); ctx.addChild(child);
    child.registerEvent(this.app.metadataCache.on('changed', f => { if (f.path === host.path) draw(); }));
    draw();
  },
});

/* ================================================================== */
/* Banner (dashboard header + ```dm-banner``` block)                   */
/* ================================================================== */
const DEFAULT_BANNER_ART = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1600 420\" preserveAspectRatio=\"xMidYMid slice\"%3E%0A%3Cdefs%3E%0A%3ClinearGradient id=\"sky\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"%3E%3Cstop offset=\"0\" stop-color=\"%230f1430\"/%3E%3Cstop offset=\".45\" stop-color=\"%233a2552\"/%3E%3Cstop offset=\".75\" stop-color=\"%23a3434a\"/%3E%3Cstop offset=\"1\" stop-color=\"%23e98a45\"/%3E%3C/linearGradient%3E%0A%3CradialGradient id=\"glow\" cx=\".72\" cy=\".62\" r=\".5\"%3E%3Cstop offset=\"0\" stop-color=\"%23ffb35c\" stop-opacity=\".55\"/%3E%3Cstop offset=\"1\" stop-color=\"%23ffb35c\" stop-opacity=\"0\"/%3E%3C/radialGradient%3E%0A%3ClinearGradient id=\"mist\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"%3E%3Cstop offset=\"0\" stop-color=\"%23d9a2a0\" stop-opacity=\"0\"/%3E%3Cstop offset=\".5\" stop-color=\"%23d9a2a0\" stop-opacity=\".35\"/%3E%3Cstop offset=\"1\" stop-color=\"%23d9a2a0\" stop-opacity=\"0\"/%3E%3C/linearGradient%3E%0A%3C/defs%3E%0A%3Crect width=\"1600\" height=\"420\" fill=\"url%28%23sky%29\"/%3E%0A%3Crect width=\"1600\" height=\"420\" fill=\"url%28%23glow%29\"/%3E%0A%3Cg fill=\"%23fff\"%3E%3Ccircle cx=\"663\" cy=\"38\" r=\"1.6\" opacity=\"0.9\"/%3E%3Ccircle cx=\"98\" cy=\"18\" r=\"0.8\" opacity=\"0.7\"/%3E%3Ccircle cx=\"1193\" cy=\"14\" r=\"1\" opacity=\"0.5\"/%3E%3Ccircle cx=\"176\" cy=\"111\" r=\"1.6\" opacity=\"0.5\"/%3E%3Ccircle cx=\"492\" cy=\"23\" r=\"1.6\" opacity=\"0.5\"/%3E%3Ccircle cx=\"1158\" cy=\"31\" r=\"1\" opacity=\"0.9\"/%3E%3Ccircle cx=\"1284\" cy=\"149\" r=\"0.8\" opacity=\"0.9\"/%3E%3Ccircle cx=\"1199\" cy=\"101\" r=\"0.8\" opacity=\"0.5\"/%3E%3Ccircle cx=\"95\" cy=\"142\" r=\"1\" opacity=\"0.7\"/%3E%3Ccircle cx=\"858\" cy=\"36\" r=\"0.8\" opacity=\"0.9\"/%3E%3Ccircle cx=\"631\" cy=\"143\" r=\"1\" opacity=\"0.5\"/%3E%3Ccircle cx=\"1191\" cy=\"146\" r=\"1\" opacity=\"0.7\"/%3E%3Ccircle cx=\"199\" cy=\"140\" r=\"0.8\" opacity=\"0.9\"/%3E%3Ccircle cx=\"122\" cy=\"158\" r=\"1\" opacity=\"0.7\"/%3E%3Ccircle cx=\"1393\" cy=\"136\" r=\"1.6\" opacity=\"0.7\"/%3E%3Ccircle cx=\"953\" cy=\"149\" r=\"1.6\" opacity=\"0.7\"/%3E%3Ccircle cx=\"613\" cy=\"63\" r=\"1\" opacity=\"0.9\"/%3E%3Ccircle cx=\"1597\" cy=\"62\" r=\"0.8\" opacity=\"0.9\"/%3E%3Ccircle cx=\"614\" cy=\"134\" r=\"1.6\" opacity=\"0.7\"/%3E%3Ccircle cx=\"1493\" cy=\"114\" r=\"1.2\" opacity=\"0.9\"/%3E%3Ccircle cx=\"149\" cy=\"30\" r=\"1.6\" opacity=\"0.5\"/%3E%3Ccircle cx=\"1550\" cy=\"87\" r=\"1\" opacity=\"0.7\"/%3E%3Ccircle cx=\"863\" cy=\"10\" r=\"0.8\" opacity=\"0.9\"/%3E%3Ccircle cx=\"1173\" cy=\"80\" r=\"1.2\" opacity=\"0.9\"/%3E%3Ccircle cx=\"717\" cy=\"152\" r=\"1.6\" opacity=\"0.9\"/%3E%3Ccircle cx=\"934\" cy=\"17\" r=\"0.8\" opacity=\"0.7\"/%3E%3Ccircle cx=\"970\" cy=\"178\" r=\"0.8\" opacity=\"0.5\"/%3E%3Ccircle cx=\"1497\" cy=\"179\" r=\"1.2\" opacity=\"0.9\"/%3E%3Ccircle cx=\"1183\" cy=\"174\" r=\"1.6\" opacity=\"0.7\"/%3E%3Ccircle cx=\"1467\" cy=\"98\" r=\"1.2\" opacity=\"0.5\"/%3E%3Ccircle cx=\"945\" cy=\"90\" r=\"1\" opacity=\"0.9\"/%3E%3Ccircle cx=\"239\" cy=\"126\" r=\"0.8\" opacity=\"0.5\"/%3E%3Ccircle cx=\"1573\" cy=\"73\" r=\"1\" opacity=\"0.9\"/%3E%3Ccircle cx=\"507\" cy=\"101\" r=\"1.6\" opacity=\"0.7\"/%3E%3Ccircle cx=\"165\" cy=\"42\" r=\"1.6\" opacity=\"0.7\"/%3E%3Ccircle cx=\"1125\" cy=\"71\" r=\"1\" opacity=\"0.7\"/%3E%3Ccircle cx=\"1126\" cy=\"71\" r=\"1.6\" opacity=\"0.7\"/%3E%3Ccircle cx=\"1398\" cy=\"97\" r=\"1\" opacity=\"0.5\"/%3E%3Ccircle cx=\"169\" cy=\"45\" r=\"1\" opacity=\"0.5\"/%3E%3Ccircle cx=\"1348\" cy=\"59\" r=\"0.8\" opacity=\"0.7\"/%3E%3Ccircle cx=\"1206\" cy=\"46\" r=\"1.2\" opacity=\"0.7\"/%3E%3Ccircle cx=\"8\" cy=\"37\" r=\"1.6\" opacity=\"0.9\"/%3E%3Ccircle cx=\"756\" cy=\"156\" r=\"1.2\" opacity=\"0.5\"/%3E%3Ccircle cx=\"1414\" cy=\"131\" r=\"0.8\" opacity=\"0.7\"/%3E%3Ccircle cx=\"1597\" cy=\"174\" r=\"1.6\" opacity=\"0.7\"/%3E%3Ccircle cx=\"817\" cy=\"100\" r=\"0.8\" opacity=\"0.7\"/%3E%3Ccircle cx=\"1299\" cy=\"102\" r=\"0.8\" opacity=\"0.5\"/%3E%3Ccircle cx=\"137\" cy=\"53\" r=\"1.6\" opacity=\"0.5\"/%3E%3Ccircle cx=\"225\" cy=\"87\" r=\"0.8\" opacity=\"0.5\"/%3E%3Ccircle cx=\"0\" cy=\"145\" r=\"1\" opacity=\"0.9\"/%3E%3Ccircle cx=\"207\" cy=\"93\" r=\"0.8\" opacity=\"0.5\"/%3E%3Ccircle cx=\"425\" cy=\"157\" r=\"1.6\" opacity=\"0.5\"/%3E%3Ccircle cx=\"1299\" cy=\"64\" r=\"1.2\" opacity=\"0.9\"/%3E%3Ccircle cx=\"745\" cy=\"121\" r=\"0.8\" opacity=\"0.5\"/%3E%3Ccircle cx=\"999\" cy=\"119\" r=\"1.6\" opacity=\"0.7\"/%3E%3Ccircle cx=\"638\" cy=\"21\" r=\"1\" opacity=\"0.5\"/%3E%3Ccircle cx=\"1535\" cy=\"87\" r=\"1.2\" opacity=\"0.7\"/%3E%3Ccircle cx=\"1417\" cy=\"41\" r=\"0.8\" opacity=\"0.5\"/%3E%3Ccircle cx=\"1081\" cy=\"92\" r=\"1\" opacity=\"0.9\"/%3E%3Ccircle cx=\"1112\" cy=\"6\" r=\"1.2\" opacity=\"0.9\"/%3E%3Ccircle cx=\"186\" cy=\"178\" r=\"1.2\" opacity=\"0.9\"/%3E%3Ccircle cx=\"751\" cy=\"42\" r=\"1.2\" opacity=\"0.5\"/%3E%3Ccircle cx=\"1090\" cy=\"138\" r=\"1.2\" opacity=\"0.9\"/%3E%3Ccircle cx=\"456\" cy=\"156\" r=\"1\" opacity=\"0.5\"/%3E%3Ccircle cx=\"820\" cy=\"189\" r=\"1\" opacity=\"0.5\"/%3E%3Ccircle cx=\"1060\" cy=\"126\" r=\"1.2\" opacity=\"0.9\"/%3E%3Ccircle cx=\"59\" cy=\"7\" r=\"1.2\" opacity=\"0.7\"/%3E%3Ccircle cx=\"530\" cy=\"49\" r=\"1.2\" opacity=\"0.7\"/%3E%3Ccircle cx=\"1480\" cy=\"89\" r=\"1.2\" opacity=\"0.5\"/%3E%3Ccircle cx=\"451\" cy=\"26\" r=\"1\" opacity=\"0.7\"/%3E%3Ccircle cx=\"402\" cy=\"86\" r=\"1\" opacity=\"0.7\"/%3E%3Ccircle cx=\"1278\" cy=\"156\" r=\"0.8\" opacity=\"0.7\"/%3E%3Ccircle cx=\"1337\" cy=\"88\" r=\"0.8\" opacity=\"0.9\"/%3E%3Ccircle cx=\"245\" cy=\"99\" r=\"1\" opacity=\"0.7\"/%3E%3Ccircle cx=\"365\" cy=\"111\" r=\"1.2\" opacity=\"0.5\"/%3E%3Ccircle cx=\"1478\" cy=\"101\" r=\"1.6\" opacity=\"0.7\"/%3E%3Ccircle cx=\"1522\" cy=\"21\" r=\"1\" opacity=\"0.5\"/%3E%3Ccircle cx=\"260\" cy=\"7\" r=\"1\" opacity=\"0.9\"/%3E%3Ccircle cx=\"953\" cy=\"167\" r=\"1\" opacity=\"0.9\"/%3E%3Ccircle cx=\"1220\" cy=\"121\" r=\"1.2\" opacity=\"0.5\"/%3E%3Ccircle cx=\"1123\" cy=\"140\" r=\"1\" opacity=\"0.5\"/%3E%3Ccircle cx=\"29\" cy=\"185\" r=\"0.8\" opacity=\"0.9\"/%3E%3Ccircle cx=\"1534\" cy=\"35\" r=\"1.6\" opacity=\"0.5\"/%3E%3Ccircle cx=\"432\" cy=\"7\" r=\"1.2\" opacity=\"0.5\"/%3E%3Ccircle cx=\"599\" cy=\"128\" r=\"1\" opacity=\"0.9\"/%3E%3Ccircle cx=\"667\" cy=\"66\" r=\"1.6\" opacity=\"0.5\"/%3E%3Ccircle cx=\"124\" cy=\"189\" r=\"1.2\" opacity=\"0.7\"/%3E%3Ccircle cx=\"1356\" cy=\"149\" r=\"1.6\" opacity=\"0.9\"/%3E%3Ccircle cx=\"267\" cy=\"136\" r=\"1\" opacity=\"0.9\"/%3E%3Ccircle cx=\"1045\" cy=\"4\" r=\"1.6\" opacity=\"0.5\"/%3E%3C/g%3E%0A%3Ccircle cx=\"310\" cy=\"92\" r=\"34\" fill=\"%23f6ecd2\"/%3E%3Ccircle cx=\"324\" cy=\"84\" r=\"32\" fill=\"%23141a3a\" opacity=\".9\"/%3E%0A%3Cpolygon points=\"0,420 0,228 80,256 160,274 240,271 320,268 400,224 480,236 560,227 640,251 720,268 800,248 880,250 960,261 1040,244 1120,270 1200,233 1280,226 1360,251 1440,221 1520,277 1600,273 1600,420\" fill=\"%235b3a63\" opacity=\".85\"/%3E%0A%3Cpolygon points=\"0,420 0,262 60,264 120,264 180,282 240,269 300,306 360,310 420,301 480,278 540,275 600,297 660,272 720,297 780,261 840,296 900,302 960,269 1020,286 1080,299 1140,284 1200,310 1260,305 1320,291 1380,282 1440,293 1500,287 1560,291 1600,420\" fill=\"%233f2a4f\"/%3E%0A%3Crect y=\"270\" width=\"1600\" height=\"60\" fill=\"url%28%23mist%29\"/%3E%0A%3Cg fill=\"%23120d1c\"%3E%0A%3Cpath d=\"M960 300 L1010 230 L1060 215 L1100 170 L1160 168 L1200 205 L1250 220 L1300 300 Z\"/%3E%0A%3Crect x=\"1085\" y=\"120\" width=\"26\" height=\"70\"/%3E%3Cpath d=\"M1080 120 L1098 92 L1116 120Z\"/%3E%0A%3Crect x=\"1150\" y=\"105\" width=\"30\" height=\"85\"/%3E%3Cpath d=\"M1145 105 L1165 72 L1185 105Z\"/%3E%0A%3Crect x=\"1108\" y=\"140\" width=\"45\" height=\"50\"/%3E%0A%3Crect x=\"1108\" y=\"132\" width=\"7\" height=\"9\"/%3E%3Crect x=\"1122\" y=\"132\" width=\"7\" height=\"9\"/%3E%3Crect x=\"1136\" y=\"132\" width=\"7\" height=\"9\"/%3E%0A%3Crect x=\"1196\" y=\"150\" width=\"20\" height=\"45\"/%3E%3Cpath d=\"M1192 150 L1206 128 L1220 150Z\"/%3E%0A%3C/g%3E%0A%3Cg fill=\"%23ffc46b\"%3E%3Crect x=\"1094\" y=\"140\" width=\"5\" height=\"8\"/%3E%3Crect x=\"1161\" y=\"122\" width=\"6\" height=\"9\"/%3E%3Crect x=\"1128\" y=\"160\" width=\"5\" height=\"7\"/%3E%3Crect x=\"1203\" y=\"165\" width=\"4\" height=\"7\"/%3E%3C/g%3E%0A%3Cpolygon points=\"0,420 0,323 50,334 100,333 150,320 200,327 250,335 300,331 350,336 400,334 450,318 500,335 550,316 600,342 650,331 700,324 750,333 800,323 850,322 900,338 950,331 1000,333 1050,342 1100,333 1150,331 1200,328 1250,336 1300,343 1350,320 1400,323 1450,336 1500,320 1550,343 1600,332 1600,420\" fill=\"%2322182f\"/%3E%0A%3Cg fill=\"%231a1326\"%3E%3Cpath d=\"M463 308 L484 363 L442 363Z\"/%3E%3Cpath d=\"M791 280 L815 342 L767 342Z\"/%3E%3Cpath d=\"M116 314 L132 357 L100 357Z\"/%3E%3Cpath d=\"M572 288 L601 364 L543 364Z\"/%3E%3Cpath d=\"M100 306 L120 357 L80 357Z\"/%3E%3Cpath d=\"M717 291 L737 345 L697 345Z\"/%3E%3Cpath d=\"M197 287 L217 340 L177 340Z\"/%3E%3Cpath d=\"M1292 272 L1321 348 L1263 348Z\"/%3E%3Cpath d=\"M376 300 L395 349 L357 349Z\"/%3E%3Cpath d=\"M1264 273 L1294 351 L1234 351Z\"/%3E%3Cpath d=\"M157 273 L186 350 L128 350Z\"/%3E%3Cpath d=\"M1355 289 L1377 347 L1333 347Z\"/%3E%3Cpath d=\"M344 296 L364 348 L324 348Z\"/%3E%3Cpath d=\"M162 275 L193 357 L131 357Z\"/%3E%3Cpath d=\"M594 307 L610 349 L578 349Z\"/%3E%3Cpath d=\"M1152 277 L1179 349 L1125 349Z\"/%3E%3Cpath d=\"M1547 290 L1571 353 L1523 353Z\"/%3E%3Cpath d=\"M847 286 L873 353 L821 353Z\"/%3E%3Cpath d=\"M904 300 L923 349 L885 349Z\"/%3E%3Cpath d=\"M511 265 L540 341 L482 341Z\"/%3E%3Cpath d=\"M146 316 L163 360 L129 360Z\"/%3E%3Cpath d=\"M554 296 L578 360 L530 360Z\"/%3E%3Cpath d=\"M945 273 L972 344 L918 344Z\"/%3E%3Cpath d=\"M1359 303 L1378 353 L1340 353Z\"/%3E%3Cpath d=\"M395 285 L421 354 L369 354Z\"/%3E%3Cpath d=\"M545 303 L564 353 L526 353Z\"/%3E%3Cpath d=\"M1509 293 L1534 360 L1484 360Z\"/%3E%3Cpath d=\"M1123 300 L1142 350 L1104 350Z\"/%3E%3Cpath d=\"M186 285 L215 362 L157 362Z\"/%3E%3Cpath d=\"M448 304 L468 358 L428 358Z\"/%3E%3Cpath d=\"M1240 265 L1270 343 L1210 343Z\"/%3E%3Cpath d=\"M658 268 L689 349 L627 349Z\"/%3E%3Cpath d=\"M920 308 L936 351 L904 351Z\"/%3E%3Cpath d=\"M1408 304 L1425 349 L1391 349Z\"/%3E%3Cpath d=\"M1485 280 L1512 350 L1458 350Z\"/%3E%3Cpath d=\"M17 294 L38 350 L-4 350Z\"/%3E%3Cpath d=\"M293 278 L321 353 L265 353Z\"/%3E%3Cpath d=\"M1250 271 L1277 342 L1223 342Z\"/%3E%3Cpath d=\"M580 286 L606 354 L554 354Z\"/%3E%3Cpath d=\"M578 304 L596 352 L560 352Z\"/%3E%3Cpath d=\"M1206 268 L1237 350 L1175 350Z\"/%3E%3Cpath d=\"M1153 299 L1169 341 L1137 341Z\"/%3E%3Cpath d=\"M911 302 L930 351 L892 351Z\"/%3E%3Cpath d=\"M574 288 L599 354 L549 354Z\"/%3E%3Cpath d=\"M404 286 L427 346 L381 346Z\"/%3E%3Cpath d=\"M212 297 L229 341 L195 341Z\"/%3E%3Cpath d=\"M1489 312 L1508 361 L1470 361Z\"/%3E%3Cpath d=\"M286 290 L312 357 L260 357Z\"/%3E%3Cpath d=\"M984 284 L1009 350 L959 350Z\"/%3E%3Cpath d=\"M52 309 L70 356 L34 356Z\"/%3E%3Cpath d=\"M579 279 L607 353 L551 353Z\"/%3E%3Cpath d=\"M1314 272 L1346 355 L1282 355Z\"/%3E%3Cpath d=\"M393 301 L413 353 L373 353Z\"/%3E%3Cpath d=\"M987 309 L1004 353 L970 353Z\"/%3E%3Cpath d=\"M888 301 L908 353 L868 353Z\"/%3E%3Cpath d=\"M421 278 L445 341 L397 341Z\"/%3E%3Cpath d=\"M55 294 L75 347 L35 347Z\"/%3E%3Cpath d=\"M1056 296 L1075 347 L1037 347Z\"/%3E%3Cpath d=\"M834 265 L864 344 L804 344Z\"/%3E%3Cpath d=\"M645 306 L662 350 L628 350Z\"/%3E%3Cpath d=\"M1137 311 L1155 358 L1119 358Z\"/%3E%3Cpath d=\"M805 278 L836 360 L774 360Z\"/%3E%3Cpath d=\"M1319 283 L1349 362 L1289 362Z\"/%3E%3Cpath d=\"M1505 308 L1522 352 L1488 352Z\"/%3E%3Cpath d=\"M170 298 L193 358 L147 358Z\"/%3E%3Cpath d=\"M318 305 L339 361 L297 361Z\"/%3E%3Cpath d=\"M945 284 L974 360 L916 360Z\"/%3E%3Cpath d=\"M625 280 L654 356 L596 356Z\"/%3E%3Cpath d=\"M420 292 L446 361 L394 361Z\"/%3E%3Cpath d=\"M1620 299 L1640 352 L1600 352Z\"/%3E%3C/g%3E%0A%3Cpolygon points=\"0,420 0,394 40,383 80,386 120,395 160,391 200,375 240,389 280,382 320,395 360,376 400,380 440,378 480,386 520,390 560,382 600,387 640,392 680,378 720,393 760,382 800,375 840,381 880,388 920,383 960,380 1000,387 1040,380 1080,377 1120,379 1160,394 1200,394 1240,389 1280,379 1320,379 1360,375 1400,375 1440,381 1480,381 1520,380 1560,380 1600,384 1600,420\" fill=\"%23120c1a\"/%3E%0A%3Cg fill=\"%230d0913\"%3E%3Cpath d=\"M1604 317 L1636 402 L1572 402Z\"/%3E%3Cpath d=\"M973 306 L1009 401 L937 401Z\"/%3E%3Cpath d=\"M-20 356 L4 418 L-44 418Z\"/%3E%3Cpath d=\"M943 317 L983 423 L903 423Z\"/%3E%3Cpath d=\"M744 329 L771 400 L717 400Z\"/%3E%3Cpath d=\"M538 326 L569 406 L507 406Z\"/%3E%3Cpath d=\"M1474 316 L1512 417 L1436 417Z\"/%3E%3Cpath d=\"M1084 315 L1119 406 L1049 406Z\"/%3E%3Cpath d=\"M1133 339 L1165 423 L1101 423Z\"/%3E%3Cpath d=\"M523 329 L557 419 L489 419Z\"/%3E%3Cpath d=\"M1384 354 L1406 413 L1362 413Z\"/%3E%3Cpath d=\"M667 304 L708 411 L626 411Z\"/%3E%3Cpath d=\"M1618 332 L1647 408 L1589 408Z\"/%3E%3Cpath d=\"M891 332 L926 424 L856 424Z\"/%3E%3Cpath d=\"M383 317 L418 409 L348 409Z\"/%3E%3Cpath d=\"M179 313 L219 418 L139 418Z\"/%3E%3Cpath d=\"M391 312 L429 411 L353 411Z\"/%3E%3Cpath d=\"M976 302 L1016 406 L936 406Z\"/%3E%3Cpath d=\"M1034 337 L1066 422 L1002 422Z\"/%3E%3Cpath d=\"M1011 293 L1052 400 L970 400Z\"/%3E%3Cpath d=\"M1277 345 L1305 419 L1249 419Z\"/%3E%3Cpath d=\"M860 348 L887 418 L833 418Z\"/%3E%3Cpath d=\"M224 362 L246 421 L202 421Z\"/%3E%3Cpath d=\"M1055 354 L1080 419 L1030 419Z\"/%3E%3Cpath d=\"M1337 355 L1363 423 L1311 423Z\"/%3E%3Cpath d=\"M381 332 L409 407 L353 407Z\"/%3E%3Cpath d=\"M262 336 L295 422 L229 422Z\"/%3E%3Cpath d=\"M1049 369 L1070 424 L1028 424Z\"/%3E%3Cpath d=\"M326 355 L347 410 L305 410Z\"/%3E%3Cpath d=\"M1122 316 L1161 419 L1083 419Z\"/%3E%3Cpath d=\"M1246 341 L1273 412 L1219 412Z\"/%3E%3Cpath d=\"M1060 329 L1089 404 L1031 404Z\"/%3E%3Cpath d=\"M1370 293 L1411 401 L1329 401Z\"/%3E%3Cpath d=\"M359 346 L388 423 L330 423Z\"/%3E%3Cpath d=\"M794 355 L816 414 L772 414Z\"/%3E%3Cpath d=\"M482 304 L519 402 L445 402Z\"/%3E%3Cpath d=\"M1215 324 L1249 414 L1181 414Z\"/%3E%3Cpath d=\"M895 316 L932 412 L858 412Z\"/%3E%3Cpath d=\"M1610 355 L1632 413 L1588 413Z\"/%3E%3Cpath d=\"M944 343 L971 413 L917 413Z\"/%3E%3Cpath d=\"M155 357 L179 421 L131 421Z\"/%3E%3Cpath d=\"M524 345 L554 423 L494 423Z\"/%3E%3Cpath d=\"M1585 294 L1625 400 L1545 400Z\"/%3E%3Cpath d=\"M24 325 L56 408 L-8 408Z\"/%3E%3Cpath d=\"M1187 309 L1224 406 L1150 406Z\"/%3E%3Cpath d=\"M504 329 L535 410 L473 410Z\"/%3E%3Cpath d=\"M1038 345 L1064 413 L1012 413Z\"/%3E%3Cpath d=\"M843 321 L876 408 L810 408Z\"/%3E%3Cpath d=\"M1213 335 L1243 415 L1183 415Z\"/%3E%3Cpath d=\"M987 350 L1010 412 L964 412Z\"/%3E%3Cpath d=\"M997 343 L1024 414 L970 414Z\"/%3E%3Cpath d=\"M642 331 L670 405 L614 405Z\"/%3E%3Cpath d=\"M1248 345 L1276 419 L1220 419Z\"/%3E%3Cpath d=\"M524 341 L551 412 L497 412Z\"/%3E%3Cpath d=\"M979 312 L1014 405 L944 405Z\"/%3E%3Cpath d=\"M575 335 L607 419 L543 419Z\"/%3E%3Cpath d=\"M900 299 L940 405 L860 405Z\"/%3E%3Cpath d=\"M41 331 L74 418 L8 418Z\"/%3E%3Cpath d=\"M209 320 L244 411 L174 411Z\"/%3E%3Cpath d=\"M721 308 L762 415 L680 415Z\"/%3E%3C/g%3E%0A%3C/svg%3E";
const BANNER_DEFAULTS = { show: true, image: '', subtitle: '', height: 200, focus: 35, align: 'center' };

class BannerModal extends Modal {
  constructor(plugin) { super(plugin.app); this.plugin = plugin; this.b = Object.assign({}, BANNER_DEFAULTS, plugin.settings.banner || {}); this.name = plugin.settings.campaignName; this.pending = null; }
  onOpen() {
    const p = this.plugin, b = this.b, c = this.contentEl;
    this.modalEl.addClass('dmc-banner-modal'); c.addClass('dmc-modal');
    c.createEl('h3', { text: 'Dashboard banner' });
    const prev = c.createDiv({ cls: 'dmc-banner-prev' });
    const draw = () => { prev.empty(); p.drawBanner(prev, { b, name: this.name, url: this.pending ? this.pending.url : null, preview: true }); };
    makeImageDropTarget(prev, fs => setFile(fs[0]));
    const g = c.createDiv({ cls: 'dmc-lv-grid' });
    const nameIn = fEl(g, 'Campaign name (banner title)', inp('text', this.name, 'My Campaign'));
    nameIn.addEventListener('input', () => { this.name = nameIn.value; draw(); });
    const subIn = fEl(g, 'Second line (optional)', inp('text', b.subtitle, 'e.g. A tale of ash and crowns · Sundays 7pm'));
    subIn.addEventListener('input', () => { b.subtitle = subIn.value; draw(); });
    const imgRow = fEl(g, 'Image', document.createElement('div'), true); imgRow.addClass('dmc-row', 'dmc-wrap');
    const drawImgRow = () => {
      imgRow.empty();
      button(imgRow, 'Upload image…', 'upload', async () => { const fs = await chooseImageFiles(false); if (fs[0]) setFile(fs[0]); });
      button(imgRow, 'From vault…', 'image', () => new ImageSuggestModal(this.app, f => { this.pending = null; b.image = f.path; drawImgRow(); draw(); }).open());
      if (b.image || this.pending) button(imgRow, 'Use default art', 'rotate-ccw', () => { this.pending = null; b.image = ''; drawImgRow(); draw(); });
      imgRow.createSpan({ cls: 'dmc-muted', text: this.pending ? this.pending.name + ' (saved when you click Save)' : b.image ? b.image : 'Default art · or drop / paste an image on the preview' });
    };
    const setFile = f => { this.pending = { blob: f, name: f.name || 'banner.png', url: URL.createObjectURL(f) }; drawImgRow(); draw(); };
    drawImgRow();
    const h = fEl(g, 'Height', inp('range', String(b.height))); h.min = '110'; h.max = '340'; h.step = '10';
    h.addEventListener('input', () => { b.height = Number(h.value); draw(); });
    const fo = fEl(g, 'Image position (top ↔ bottom)', inp('range', String(b.focus))); fo.min = '0'; fo.max = '100';
    fo.addEventListener('input', () => { b.focus = Number(fo.value); draw(); });
    const al = fEl(g, 'Text position', sel([['center', 'Centre'], ['left', 'Bottom left']], b.align));
    al.addEventListener('change', () => { b.align = al.value; draw(); });
    const sh = fEl(g, 'Show on the dashboard', sel([['true', 'Yes'], ['false', 'No — plain header']], String(b.show !== false)));
    sh.addEventListener('change', () => { b.show = sh.value === 'true'; });
    draw();
    const row = c.createDiv({ cls: 'dmc-row' });
    button(row, 'Save', 'check', async () => {
      if (this.pending) {
        try { const f = await saveImageToVault(this.app, this.pending.blob, 'DM Codex banner.' + ((this.pending.name.match(/\.([a-z0-9]+)$/i) || [, IMG_MIME_EXT[this.pending.blob.type] || 'png'])[1]), (p.settings.folders.campaign || 'Campaign') + '/Campaign Summary.md'); b.image = f.path; }
        catch (e) { new Notice('Could not save the image: ' + e.message); return; }
      }
      p.settings.banner = b; p.settings.campaignName = this.name.trim() || p.settings.campaignName;
      await p.saveSettings(); p.refreshBanners(); this.close();
    }, 'mod-cta');
    button(row, 'Cancel', null, () => this.close());
  }
  onClose() { this.contentEl.empty(); }
}

Object.assign(DMCodexPlugin.prototype, {
  bannerSettings() { return Object.assign({}, BANNER_DEFAULTS, this.settings.banner || {}); },
  bannerUrl(b) {
    if (!b.image) return DEFAULT_BANNER_ART;
    const f = this.app.vault.getAbstractFileByPath(b.image);
    if (f instanceof TFile) return this.app.vault.getResourcePath(f);
    const r = resolveImage(this.app, b.image, ''); return r ? r.url : DEFAULT_BANNER_ART;
  },
  /** Draw the banner. opts: { b, name, url, preview, onEdit } */
  drawBanner(parent, opts = {}) {
    const b = opts.b || this.bannerSettings();
    const el = parent.createDiv({ cls: 'dmc-banner is-' + (b.align === 'left' ? 'left' : 'center') });
    el.style.height = (Number(b.height) || 200) + 'px';
    const img = el.createEl('img', { attr: { alt: '' } }); img.src = opts.url || this.bannerUrl(b); img.style.objectPosition = 'center ' + (b.focus ?? 60) + '%';
    img.onerror = () => { if (img.src !== DEFAULT_BANNER_ART) img.src = DEFAULT_BANNER_ART; };
    const t = el.createDiv({ cls: 'dmc-banner-text' });
    const name = opts.name != null ? opts.name : this.settings.campaignName;
    if (name) t.createDiv({ cls: 'dmc-banner-title', text: name });
    if (b.subtitle) t.createDiv({ cls: 'dmc-banner-sub', text: b.subtitle });
    if (!opts.preview) {
      const e = button(el, '', 'pencil', () => new BannerModal(this).open(), 'dmc-icon-btn dmc-banner-edit'); e.setAttr('title', 'Edit banner'); e.setAttr('aria-label', 'Edit banner');
    }
    return el;
  },
  refreshBanners() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(l => l.view.render && l.view.render());
    (this._bannerBlocks || []).forEach(fn => { try { fn(); } catch (e) {} });
  },
  renderBannerBlock(src, el, ctx) {
    el.addClass('dmc-banner-block'); lpSafe(el);
    const draw = () => { el.empty(); this.drawBanner(el); };
    this._bannerBlocks = (this._bannerBlocks || []).filter(fn => fn.el && fn.el.isConnected);
    draw.el = el; this._bannerBlocks.push(draw);
    draw();
  },
});

/** Upscale, grey and stretch contrast — Tesseract reads small, coloured statblock text much better this way. */
async function prepareForOcr(blob) {
  try {
    const url = URL.createObjectURL(blob);
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
    const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
    const scale = Math.max(1, Math.min(3, 2200 / Math.max(w0, 1)));
    const c = document.createElement('canvas'); c.width = Math.round(w0 * scale); c.height = Math.round(h0 * scale);
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
    let lo = 255, hi = 0; const lum = new Uint8ClampedArray(p.length / 4);
    for (let j = 0, q = 0; j < p.length; j += 4, q++) { const v = 0.299 * p[j] + 0.587 * p[j + 1] + 0.114 * p[j + 2]; lum[q] = v; }
    const hist = new Array(256).fill(0); lum.forEach(v => hist[v]++);
    let acc = 0; const n = lum.length; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > n * 0.01) { lo = v; break; } }
    acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > n * 0.01) { hi = v; break; } }
    const span = Math.max(1, hi - lo);
    const dark = lum.reduce((a, v) => a + v, 0) / n < 110; // dark-mode screenshots: invert to dark-on-light
    for (let j = 0, q = 0; j < p.length; j += 4, q++) { let v = (lum[q] - lo) * 255 / span; v = Math.max(0, Math.min(255, v)); if (dark) v = 255 - v; p[j] = p[j + 1] = p[j + 2] = v; }
    g.putImageData(d, 0, 0); URL.revokeObjectURL(url);
    return await new Promise(res => c.toBlob(b => res(b || blob), 'image/png'));
  } catch (e) { return blob; }
}

/* ---- OCR: Tesseract.js, downloaded on first use (needs internet once; cached by the app afterwards) ---- */
const OCR_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let ocrLoading = null;
function loadOcrEngine() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (ocrLoading) return ocrLoading;
  ocrLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = OCR_SRC; s.async = true;
    s.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error('OCR engine did not load'));
    s.onerror = () => { ocrLoading = null; reject(new Error('Could not download the OCR engine (are you offline?)')); };
    document.head.appendChild(s);
  });
  return ocrLoading;
}
/** Read text from an image Blob/File. onProgress(0..1, status) */
async function ocrImage(blob, onProgress) {
  const T = await loadOcrEngine();
  const worker = await T.createWorker('eng', 1, { logger: m => { if (onProgress && m && typeof m.progress === 'number') onProgress(m.progress, m.status || ''); } });
  try {
    try { await worker.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: '3' }); } catch (e) {}
    const r = await worker.recognize(await prepareForOcr(blob));
    return (r && r.data && r.data.text) || '';
  } finally { try { await worker.terminate(); } catch (e) {} }
}

/* ================================================================== */
/* Import armory items and spells from an image or text                */
/* ================================================================== */
function cleanImportText(t) {
  return String(t || '').replace(/\r/g, '').replace(/[‐‑‒–―−]/g, '-').replace(/[’‘`´]/g, "'").replace(/[“”„]/g, '"')
    .replace(/[   ]/g, ' ').replace(/[ \t]+/g, ' ').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl')
    .replace(/(\w)-\n(\w)/g, '$1$2').replace(/\b(\d+)\s*d\s*(\d+)\b/g, '$1d$2')
    .replace(/\bfl\.(?=\s|,|;|$)/g, 'ft.').replace(/\b[Il1]b\.(?=\s|,|;|$)/g, 'lb.');
}
function importTitle(s) { s = s.trim(); return /[a-z]/.test(s) ? s : s.toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase()).replace(/\b(Of|The|And|In|On|A|An|Or)\b/g, (w, x, i) => i ? w.toLowerCase() : w); }
/** Lines → paragraphs. Tesseract leaves blank lines between paragraphs; wrapped lines are re-joined. */
function importParagraphs(lines) {
  const out = []; let cur = '';
  for (const l of lines) {
    if (!l.trim()) { if (cur) out.push(cur), cur = ''; continue; }
    const startsNew = cur && /[.!?:)"]$/.test(cur) && /^([A-Z][\w' -]{1,40}[.:]\s|[-•*]\s|\d+[.)]\s)/.test(l);
    if (startsNew) { out.push(cur); cur = l; } else cur = cur ? cur + ' ' + l : l;
  }
  if (cur) out.push(cur);
  return out.map(p => p.replace(/^[•*]\s*/, '- ').replace(/\s+/g, ' ').trim());
}
function boldLeads(p) { return p.replace(/^((?:[A-Z][\w'’-]*\s?){1,6}(?:\([^)]{1,30}\))?)\.\s/, (m, n) => '**' + n.trim() + '.** '); }
const PARSE_RARITY = /\b(very rare|uncommon|common|rare|legendary|artifact)\b/i;

function parseItemImport(raw, kind) {
  const text = cleanImportText(raw);
  const lines = text.split('\n').map(l => l.trim());
  const nonEmpty = lines.filter(Boolean);
  const r = { }; const found = [];
  if (!nonEmpty.length) return { init: r, found, warnings: ['No text to read.'] };
  r.name = importTitle(nonEmpty[0].replace(/[.:]$/, '')); found.push('name');
  const flat = nonEmpty.join(' ');
  const used = new Set([0]);
  // the "Wondrous Item, Rare (Requires Attunement by a Wizard)" line
  const isMeta = l => l.length < 110 && (PARSE_RARITY.test(l) || /requires attunement/i.test(l) || /^(weapon|armor|armour|ring|rod|staff|wand|potion|scroll|wondrous item)\b/i.test(l) || /^(simple|martial)\s+(melee|ranged)\b/i.test(l) || /^(light|medium|heavy)\s+armou?r$/i.test(l) || /^shield$/i.test(l) || GEAR_CATS.some(c => l.toLowerCase() === c.toLowerCase()) || /^(adventuring gear|tool|tools|artisan's tools|gaming set|musical instrument)$/i.test(l));
  let metaIdx = -1; for (let i = 1; i < Math.min(4, nonEmpty.length); i++) { if (isMeta(nonEmpty[i])) metaIdx = i; else break; }
  const metaAll = metaIdx > 0 ? nonEmpty.slice(1, metaIdx + 1).join(' ') : '';
  const meta = metaAll;
  let m;
  if ((m = PARSE_RARITY.exec(meta || flat))) { r.rarity = m[1].toLowerCase(); found.push('rarity'); }
  if ((m = /requires attunement(?:\s+(by [^)]+))?/i.exec(meta || flat))) { r.attunement = m[1] ? m[1].trim().toLowerCase() : true; found.push('attunement'); }
  if ((m = /\+([123])\b/.exec(r.name + ' ' + meta)) || (m = /\+([123]) bonus to (?:attack and damage rolls|AC|Armor Class)/i.exec(flat))) { r.magic_bonus = Number(m[1]); found.push('magic bonus'); }
  if ((m = /\b(\d[\d,]*\s*(?:gp|sp|cp|ep|pp))\b/i.exec(flat))) { r.cost = m[1].replace(/\s+/g, ' ').replace(/(gp|sp|cp|ep|pp)$/i, x => x.toLowerCase()); found.push('cost'); }
  if ((m = /\b(\d+(?:[./]\d+)?\s*lb\.?)/i.exec(flat))) { r.weight = m[1].replace(/\s*lb\.?$/i, ' lb.'); found.push('weight'); }
  if (kind === 'item') {
    const k = (meta.match(/^(Wondrous Item|Weapon|Armor|Armour|Ring|Rod|Staff|Wand|Potion|Scroll)/i) || [])[1];
    if (k) { r.item_type = k.toLowerCase() === 'wondrous item' ? 'Wondrous Item' : importTitle(k).replace('Armour', 'Armor'); found.push('item type'); }
    if ((m = /\b(?:has|with)\s+(\d+)\s+charges\b/i.exec(flat))) { const rg = /regains?\s+(\d+d\d+(?:\s*\+\s*\d+)?|\d+|all)\b[^.]*?\b(daily at dawn|at dawn|at dusk|daily|after a long rest)/i.exec(flat); r.charges = m[1] + (rg ? ', regains ' + rg[1].replace(/\s+/g, ' ') + ' ' + rg[2].replace(/^daily /i, '') : ''); found.push('charges'); }
  }
  if (kind === 'weapon') {
    if ((m = /\b(\d+d\d+|1)\s+(Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder)\b/i.exec(flat))) { r.damage = m[1]; r.damage_type = importTitle(m[2]); found.push('damage'); }
    r.props = WEAPON_PROPS.filter(p => new RegExp('\\b' + p.replace('-', '[- ]?') + '\\b', 'i').test(flat));
    if (r.props.length) found.push('properties');
    const ms = MASTERIES.find(x => new RegExp('\\bmastery\\W{0,3}' + x + '\\b|\\b' + x + '\\b(?=[^.]*\\bmastery)', 'i').test(flat)) || MASTERIES.find(x => new RegExp('\\b' + x + '\\b').test(flat));
    if (ms) { r.mastery = ms; found.push('mastery'); }
    if ((m = /\((?:range\s*)?(\d+\/\d+)\)/i.exec(flat))) r.range = m[1];
    if ((m = /Versatile\s*\((\d+d\d+)\)/i.exec(flat))) r.versatile = m[1];
    const ranged = r.props.includes('Ammunition') || /\branged\b/i.test(flat);
    r.category = (/\bmartial\b/i.test(flat) ? 'Martial' : /\bsimple\b/i.test(flat) ? 'Simple' : 'Martial') + (ranged ? ' Ranged' : ' Melee');
  }
  if (kind === 'armor') {
    if (/\bshield\b/i.test(r.name + ' ' + meta)) r.category = 'Shield';
    else if ((m = /\b(light|medium|heavy)\s+armou?r\b/i.exec(flat))) r.category = importTitle(m[1]);
    if ((m = /(?:Armou?r Class|\bAC)\)?\s*:?\s*(\d{1,2})/i.exec(flat))) { r.base_ac = Number(m[1]); found.push('AC'); }
    if (!r.category && r.base_ac) r.category = /max 2/i.test(flat) ? 'Medium' : /\+\s*Dex/i.test(flat) ? 'Light' : 'Heavy';
    if ((m = /\b(?:Str(?:ength)?)\s*(\d{2})\b/i.exec(flat))) r.strength = m[1];
    if (/stealth[^.]{0,20}disadvantage|disadvantage[^.]{0,30}stealth/i.test(flat)) r.stealth = 'Disadvantage';
  }
  if (kind === 'gear') {
    const g = GEAR_CATS.find(c => new RegExp('\\b' + c.split(' ')[0], 'i').test(meta || nonEmpty.slice(1, 3).join(' ')));
    if (g) r.category = g;
  }
  // description: everything after the meta line(s), minus table-ish stat lines
  const start = Math.max(1, metaIdx + 1);
  const rest = lines.slice(lines.indexOf(nonEmpty[start - 1]) + 1);
  const isStatLine = l => /^(cost|weight|damage|properties|mastery|armou?r class|ac|strength|stealth|category)\b\s*:?/i.test(l) || /^\d[\d,]*\s*(gp|sp|cp)\b/i.test(l);
  const statScore = p => [/\b\d+d\d+\b/, /\blb\./i, /\b\d+\s*gp\b/i, new RegExp('\\b(' + WEAPON_PROPS.concat(MASTERIES).join('|') + ')\\b')].filter(re => re.test(p)).length;
  const paras = importParagraphs(rest.filter(l => !isStatLine(l))).filter(p => !(p.length < 220 && statScore(p) >= 3));
  const curse = paras.findIndex(p => /^\**curse\b/i.test(p));
  if (kind === 'item' && curse >= 0) { r.curse = paras.splice(curse).join('\n\n').replace(/^\**curse\.?\**\s*/i, ''); found.push('curse'); }
  if (paras.length) { r.desc = paras.map(boldLeads).join('\n\n'); found.push('description'); }
  const warnings = [];
  if (kind === 'weapon' && !r.damage) warnings.push('No damage found — set damage dice and type.');
  if (kind === 'armor' && !r.base_ac) warnings.push('No Armor Class found.');
  if ((kind === 'item') && !r.rarity) warnings.push('No rarity found.');
  return { init: r, found, warnings };
}

function parseSpellImport(raw) {
  const text = cleanImportText(raw);
  const lines = text.split('\n').map(l => l.trim());
  const nonEmpty = lines.filter(Boolean);
  const r = {}; const found = [];
  if (!nonEmpty.length) return { init: r, found, warnings: ['No text to read.'] };
  r.name = importTitle(nonEmpty[0]); found.push('name');
  const head = nonEmpty.slice(1, 9).join('\n');
  let m;
  const schoolRe = new RegExp('\\b(' + SCHOOLS.join('|') + ')\\b', 'i');
  if ((m = schoolRe.exec(head))) { r.school = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase(); found.push('school'); }
  if (/\bcantrip\b/i.test(head)) r.level = 0;
  else if ((m = /\bLevel\s*(\d)\b/i.exec(head)) || (m = /\b(\d)(?:st|nd|rd|th)[- ]level\b/i.exec(head))) r.level = Number(m[1]);
  if (r.level != null) found.push('level');
  if (/\britual\b/i.test(head)) r.ritual = true;
  const lab = (re) => { const x = re.exec(text); return x ? x[1].replace(/\s+/g, ' ').trim() : ''; }; // labels are anchored to the start of a line
  let ct = lab(/^Casting Time\s*:?\s*([^\n]+)/im);
  if (ct) {
    found.push('casting time');
    if (/or ritual/i.test(ct)) { r.ritual = true; ct = ct.replace(/\s*,?\s*or ritual/i, ''); }
    const low = ct.toLowerCase().replace(/^1\s+/, '');
    if (/^bonus action/.test(low)) r.casting_time = 'Bonus Action';
    else if (/^reaction/.test(low)) { r.casting_time = 'Reaction'; r.trigger = ct.replace(/^1?\s*reaction\s*,?\s*/i, ''); }
    else if (/^action/.test(low)) r.casting_time = 'Action';
    else r.casting_time = ct.replace(/^(\d+)\s+(minute|hour)s?$/i, (x, n, u) => n + ' ' + u.toLowerCase() + (n === '1' ? '' : 's'));
  }
  const rg = lab(/^Range\s*:?\s*([^\n]+)/im); if (rg) { r.range = rg; found.push('range'); }
  const cp = lab(/^Components?\s*:?\s*([^\n]+(?:\n(?![A-Z][a-z]+\s*:)[^\n]*\))?)/im);
  if (cp) {
    r.comps = ['V', 'S', 'M'].filter(k => new RegExp('(^|[\\s,])' + k + '(?=[\\s,(]|$)').test(cp));
    if ((m = /\(([^)]+)\)/.exec(cp))) r.material = m[1].trim();
    found.push('components');
  }
  let du = lab(/^Duration\s*:?\s*([^\n]+)/im);
  if (du) { if (/concentration/i.test(du)) { r.concentration = true; du = du.replace(/^Concentration,?\s*(up to\s*)?/i, ''); } r.duration = importTitle(du.charAt(0)) + du.slice(1); found.push('duration'); }
  // classes: 2024 "(Sorcerer, Wizard)" on the level line; 2014 "Classes: …"
  const clsSrc = lab(/^Classes?\s*:?\s*([^\n]+)/im) + ' ' + ((/\(([^)]+)\)/.exec(nonEmpty.slice(1, 4).join(' ')) || [])[1] || '');
  r.classes = CASTER_CLASSES.filter(c => new RegExp('\\b' + c + '\\b', 'i').test(clsSrc));
  if (r.classes.length) found.push('classes');
  // body: after the last header label line
  let bodyStart = 1;
  nonEmpty.forEach((l, i) => { if (i < 12 && (/^(casting time|range|components?|duration|classes?|level\s*\d|\d(st|nd|rd|th)[- ]level)\b/i.test(l) || (i <= 2 && schoolRe.test(l) && l.length < 80))) bodyStart = i + 1; });
  const bodyLines = lines.slice(lines.indexOf(nonEmpty[bodyStart - 1]) + 1);
  const paras = importParagraphs(bodyLines);
  const hi = paras.findIndex(p => /^(at higher levels|using a higher-level spell slot|cantrip upgrade)\b/i.test(p.replace(/^\*+/, '')));
  if (hi >= 0) { r.higher = paras.splice(hi).join(' ').replace(/^\**(at higher levels|using a higher-level spell slot|cantrip upgrade)\.?\**\s*/i, ''); found.push('higher levels'); }
  if (paras.length) {
    r.desc = paras.map(p => p.replace(/(^|\s)((?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw|Failure|Success|Hit|Miss)(:)/g, '$1*$2$3*')).join('\n\n');
    found.push('effect');
  }
  const warnings = [];
  if (r.level == null) warnings.push('No spell level found.');
  if (!r.school) warnings.push('No school found.');
  if (!ct) warnings.push('No casting time found.');
  return { init: r, found, warnings };
}

class ImportKindModal extends Modal {
  constructor(plugin, kinds) { super(plugin.app); this.plugin = plugin; this.kinds = kinds || ['weapon', 'armor', 'gear', 'item', 'spell']; }
  onOpen() {
    const c = this.contentEl; c.addClass('dmc-modal');
    c.createEl('h3', { text: 'Import from an image or text' });
    c.createDiv({ cls: 'dmc-muted', text: 'What are you importing?', attr: { style: 'margin-bottom:8px' } });
    const r = c.createDiv({ cls: 'dmc-row dmc-wrap' });
    const L = { weapon: ['Weapon', 'sword'], armor: ['Armor', 'shield'], gear: ['Gear', 'backpack'], item: ['Magic item', 'gem'], spell: ['Spell', 'wand-sparkles'] };
    this.kinds.forEach(k => button(r, L[k][0], L[k][1], () => { this.close(); this.plugin.openItemBuilder(k, { _importOpen: true }); }));
  }
  onClose() { this.contentEl.empty(); }
}

class OcrConsentModal extends Modal {
  constructor(app, done) { super(app); this.done = done; this.answer = false; }
  onOpen() {
    const c = this.contentEl; c.createEl('h3', { text: 'Read text from images?' });
    c.createEl('p', { text: 'To read text from a picture, DM Codex downloads the free Tesseract OCR engine and English language data (about 15 MB) from cdn.jsdelivr.net the first time. After that it is cached.' });
    c.createEl('p', { cls: 'dmc-muted', text: 'Your image is read on this device and is not uploaded anywhere. You can turn this off in Settings → DM Codex.' });
    const r = c.createDiv({ cls: 'dmc-row' });
    button(r, 'Download & read', 'download', () => { this.answer = true; this.close(); }, 'mod-cta');
    button(r, 'Not now', null, () => this.close());
  }
  onClose() { this.contentEl.empty(); this.done(this.answer); }
}

Object.assign(ItemBuilderModal.prototype, {
  renderImport(form) {
    const p = this.plugin, kind = this.kind;
    const noun = { weapon: 'weapon', armor: 'armor', gear: 'gear', item: 'magic item', spell: 'spell' }[kind];
    const st = this.importState || (this.importState = { blob: null, url: '', name: '', text: '', msg: '', msgCls: '', open: !!(this.init && this.init._importOpen) });
    const d = form.createEl('details', { cls: 'dmc-import' }); d.open = st.open;
    d.addEventListener('toggle', () => { st.open = d.open; });
    const sum = d.createEl('summary'); setIcon(sum.createSpan({ cls: 'dmc-btn-icon' }), 'scan-text'); sum.appendText(' Import from an image or text');
    d.createDiv({ cls: 'dmc-muted', text: 'Use a picture of a ' + noun + ' (screenshot, photo of a book page or item card) or paste its text, then fill the form below. Check the result — OCR is good but not perfect.' });
    const drop = d.createDiv({ cls: 'dmc-drop' });
    const status = d.createDiv({ cls: 'dmc-import-status' });
    const area = d.createEl('textarea', { cls: 'dmc-ta dmc-import-text', attr: { rows: 6, placeholder: 'Paste the ' + noun + '\'s text here, or read it from the image above.' } });
    area.value = st.text; area.addEventListener('input', () => { st.text = area.value; });
    const foot = d.createDiv({ cls: 'dmc-row dmc-wrap' });
    const say = (msg, cls) => { st.msg = msg; st.msgCls = cls || ''; status.empty(); if (msg) status.createDiv({ cls: cls || 'dmc-muted', text: msg }); };
    let readBtn;
    const setImg = (blob, name) => { st.blob = blob; st.name = name || blob.name || 'image'; st.url = URL.createObjectURL(blob); say(''); drawDrop(); };
    const drawDrop = () => {
      drop.empty(); drop.toggleClass('has-image', !!st.url);
      if (st.url) {
        drop.createEl('img', { cls: 'dmc-drop-img' }).src = st.url;
        const side = drop.createDiv({ cls: 'dmc-drop-side' });
        side.createDiv({ cls: 'dmc-drop-name', text: st.name || 'image' });
        readBtn = button(side, 'Read text from image', 'scan-text', () => this.runOcr(st, area, say, readBtn), 'mod-cta');
        button(side, 'Different image', 'image', async () => { const fs = await chooseImageFiles(false); if (fs[0]) setImg(fs[0]); });
        button(side, 'Remove', 'x', () => { st.blob = null; st.url = ''; st.name = ''; drawDrop(); });
      } else {
        const ic = drop.createDiv({ cls: 'dmc-drop-ic' }); setIcon(ic, 'image-plus');
        drop.createDiv({ text: 'Drop or paste a picture here' });
        const r = drop.createDiv({ cls: 'dmc-row dmc-wrap', attr: { style: 'justify-content:center' } });
        button(r, 'Choose image…', 'upload', async () => { const fs = await chooseImageFiles(false); if (fs[0]) setImg(fs[0]); });
        button(r, 'From vault…', 'image', () => new ImageSuggestModal(this.app, async f => { const buf = await this.app.vault.readBinary(f); setImg(new Blob([buf], { type: 'image/' + (f.extension === 'jpg' ? 'jpeg' : f.extension) }), f.name); }).open());
      }
    };
    makeImageDropTarget(drop, fs => setImg(fs[0]));
    drawDrop(); say(st.msg, st.msgCls);
    button(foot, 'Fill the form', 'wand', () => {
      if (!st.text.trim()) { say(st.url ? 'Click “Read text from image” first, or paste the text.' : 'Paste text or add an image first.', 'dmc-warn'); return; }
      const res = kind === 'spell' ? parseSpellImport(st.text) : parseItemImport(st.text, kind);
      const keep = { holder: this.init.holder, _importOpen: true };
      this.init = Object.assign({}, res.init, keep);
      st.msg = 'Filled from the import: ' + res.found.join(', ') + '.' + (res.warnings.length ? ' ⚠ ' + res.warnings.join(' ') : ' Check the details, then save.');
      st.msgCls = res.warnings.length ? 'dmc-warn' : 'dmc-ok'; st.open = true;
      this.contentEl.empty(); this.onOpen();
    }, 'mod-cta');
    button(foot, 'Clear', 'x', () => { st.text = ''; area.value = ''; say(''); });
  },
  async runOcr(st, area, say, b) {
    const p = this.plugin, sbp = this.app.plugins && this.app.plugins.plugins && this.app.plugins.plugins['dm-statblocks'];
    if (p.settings.ocrAllowed !== true && !(sbp && sbp.settings && sbp.settings.ocrAllowed === true)) {
      const ok = await new Promise(res => new OcrConsentModal(this.app, res).open());
      if (!ok) { say('OCR is off. You can still paste the text below.'); return; }
      p.settings.ocrAllowed = true; await p.saveSettings();
    }
    if (b) b.disabled = true;
    say('Loading the OCR engine…');
    try {
      const text = await ocrImage(st.blob, (pr, status) => say((/recogniz/i.test(status) ? 'Reading text… ' : 'Loading the OCR engine… ') + Math.round(pr * 100) + '%'));
      st.text = text.trim(); area.value = st.text;
      say(st.text ? 'Text read from the image — fix anything obvious, then click “Fill the form”.' : 'No text found in that image. Try a sharper, straighter picture, or paste the text.', st.text ? 'dmc-ok' : 'dmc-warn');
    } catch (e) { say(e.message + ' — you can paste the text instead.', 'dmc-warn'); }
    finally { if (b) b.disabled = false; }
  },
});

/* @@CONTENT_PACK_START@@ */
const EMBEDDED_CONTENT_PACK = null; // filled in by tools/build.py
/* @@CONTENT_PACK_END@@ */

module.exports = DMCodexPlugin;
module.exports.rollDice = rollDice;
