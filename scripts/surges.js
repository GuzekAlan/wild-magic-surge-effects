/**
 * Wild Magic Surge effects for the 2014 and 2024 surge tables (plus the optional Celestial Surge table, see celestial.js).
 * Descriptions are short paraphrases for reference; your rulebook has the exact wording.
 *
 * EFFECTS is a pool of outcomes shared by both tables.
 *   kind "lasting": registered as a status effect (Active Effect) you can toggle on/off.
 *   kind "instant": resolved once (rolls, healing, slot recovery) and reported in chat.
 * TABLES maps d100 ranges to an effect key, or to a sub-roll ("Roll 1dX...") over effect keys.
 */

import { CELESTIAL_EFFECTS, CELESTIAL_TABLE } from "./celestial.js";

const ADD = 2;       // CONST.ACTIVE_EFFECT_MODES.ADD
const UPGRADE = 4;   // CONST.ACTIVE_EFFECT_MODES.UPGRADE
const OVERRIDE = 5;  // CONST.ACTIVE_EFFECT_MODES.OVERRIDE

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;

function damageTypes() {
  const keys = Object.keys(globalThis.CONFIG?.DND5E?.damageTypes ?? {});
  return keys.length ? keys : ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic",
    "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];
}

function rollSync(formula) {
  const roll = new Roll(formula);
  return roll.evaluateSync ? roll.evaluateSync() : roll.evaluate({ async: false });
}

const sizeUp = actor => {
  const sizes = Object.keys(CONFIG.DND5E?.actorSizes ?? { tiny: 0, sm: 0, med: 0, lg: 0, huge: 0, grg: 0 });
  const current = actor?.system?.traits?.size ?? "med";
  const next = sizes[Math.min(sizes.indexOf(current) + 1, sizes.length - 1)] ?? "lg";
  const label = CONFIG.DND5E?.actorSizes?.[next]?.label ?? next;
  return {
    changes: [{ key: "system.traits.size", mode: OVERRIDE, value: next }],
    note: `Size becomes ${game.i18n.localize(label)}.`
  };
};

/* -------------------------------------------- */
/*  Effect pool                                  */
/* -------------------------------------------- */

const E = [
  // ---- Lasting -------------------------------------------------------
  { key: "surge-each-turn", abbr: "RE", kind: "lasting", name: "Surge Every Turn",
    text: "For the next minute, roll on the surge table at the start of each of your turns (ignore this result on those rolls).",
    duration: { seconds: MINUTE },
    flags: { reminder: "Roll on the Wild Magic Surge table now (ignore the 'roll every turn' result)." },
    mechanics: "1 minute. Chat reminder at the start of each of your turns in combat." },
  { key: "see-invisible", abbr: "SI", kind: "lasting", name: "See Invisibility",
    text: "For the next minute you can see any invisible creature you have line of sight to.",
    duration: { seconds: MINUTE },
    changes: () => [{ key: "system.attributes.senses.special", mode: ADD, value: " See Invisible" }],
    mechanics: "1 minute. Adds \"See Invisible\" to special senses." },
  { key: "see-invisibility-spell", abbr: "SI", kind: "lasting", name: "See Invisibility (spell)",
    text: "You cast see invisibility on yourself, without concentration, for its full duration.",
    spell: "See Invisibility", duration: { seconds: HOUR },
    changes: () => [{ key: "system.attributes.senses.special", mode: ADD, value: " See Invisible" }],
    mechanics: "1 hour. Adds \"See Invisible\" to special senses." },
  { key: "modron", abbr: "MO", kind: "lasting", name: "Modron Companion",
    text: "A modron controlled by the DM appears within 5 feet of you, then disappears 1 minute later.",
    duration: { seconds: MINUTE }, mechanics: "1 minute timer for the modron." },
  { key: "friendly-creature", abbr: "FC", kind: "lasting", name: "Friendly Creature",
    text: "A friendly creature controlled by the DM appears within 60 feet of you and disappears 1 minute later (d4: Modron Duodrone, Flumph, Modron Monodrone, Unicorn).",
    duration: { seconds: MINUTE }, mechanics: "1 minute. The d4 creature is rolled when applied.",
    prepare: () => {
      const r = rollSync("1d4").total;
      const c = ["Modron Duodrone", "Flumph", "Modron Monodrone", "Unicorn"][r - 1];
      return { name: `Friendly ${c}`, note: `Rolled d4 = ${r}: a ${c} appears.` };
    } },
  { key: "height-change", abbr: "HT", kind: "lasting", name: "Height Change",
    text: "Roll a d10. Your height changes by that many inches: odd shrinks you, even makes you taller.",
    mechanics: "Permanent until removed. The d10 is rolled when applied and shown in the name.",
    prepare: () => {
      const r = rollSync("1d10").total;
      return { name: `Height Change (${r % 2 ? "-" : "+"}${r} in.)`, note: `Rolled d10 = ${r}: you ${r % 2 ? "shrink" : "grow"} ${r} inches.` };
    } },
  { key: "regeneration", abbr: "RG", kind: "lasting", name: "Regeneration",
    text: "For the next minute, you regain 5 hit points at the start of each of your turns.",
    duration: { seconds: MINUTE }, flags: { regen: 5 },
    mechanics: "1 minute. Heals 5 HP automatically at the start of each of your turns in combat." },
  { key: "feather-beard", abbr: "FB", kind: "lasting", name: "Feather Beard",
    text: "You grow a long beard of feathers that stays until you sneeze, when the feathers explode from your face.",
    mechanics: "Lasts until you sneeze (remove manually)." },
  { key: "save-disadvantage", abbr: "DS", kind: "lasting", name: "Imposing Spell",
    text: "Creatures have disadvantage on saving throws against the next spell you cast in the next minute that involves a saving throw.",
    duration: { seconds: MINUTE }, mechanics: "1 minute. Remove it once you have cast the spell." },
  { key: "blue-skin", abbr: "BL", kind: "lasting", name: "Blue Skin",
    text: "Your skin turns a vibrant shade of blue. Remove curse can end this effect.",
    mechanics: "Permanent until removed (remove curse)." },
  { key: "blue-skin-24h", abbr: "BL", kind: "lasting", name: "Blue Skin (24 h)",
    text: "Your skin turns a vibrant shade of blue for 24 hours or until ended by remove curse.",
    duration: { seconds: DAY }, mechanics: "24 hours." },
  { key: "third-eye", abbr: "EY", kind: "lasting", name: "Third Eye",
    text: "An eye appears on your forehead for the next minute, giving you advantage on Wisdom (Perception) checks.",
    duration: { seconds: MINUTE },
    changes: () => [{ key: "system.skills.prc.roll.mode", mode: ADD, value: "1" }],
    mechanics: "1 minute. Perception checks are rolled with advantage." },
  { key: "quickened-casting", abbr: "BA", kind: "lasting", name: "Quickened Casting",
    text: "For the next minute, your spells with a casting time of an action have a casting time of a bonus action.",
    duration: { seconds: MINUTE }, mechanics: "1 minute reminder." },
  { key: "astral", abbr: "AS", kind: "lasting", name: "Astral Plane",
    text: "You are transported to the Astral Plane until the end of your next turn, then return to your space (or the nearest unoccupied one).",
    duration: { rounds: 1, turns: 1 }, mechanics: "Until the end of your next turn (auto-expires in combat)." },
  { key: "maximize-damage", abbr: "MX", kind: "lasting", name: "Maximized Spell",
    text: "The next damaging spell you cast within the next minute deals maximum damage on every die.",
    duration: { seconds: MINUTE }, mechanics: "1 minute. Remove it once used." },
  { key: "age-change", abbr: "AG", kind: "lasting", name: "Age Change",
    text: "Roll a d10. Your age changes by that many years: odd makes you younger (minimum 1), even makes you older.",
    mechanics: "Permanent. The d10 is rolled when applied and shown in the name.",
    prepare: () => {
      const r = rollSync("1d10").total;
      return { name: `Age Change (${r % 2 ? "-" : "+"}${r} years)`, note: `Rolled d10 = ${r}: you become ${r} years ${r % 2 ? "younger" : "older"}.` };
    } },
  { key: "potted-plant", abbr: "PP", kind: "lasting", name: "Potted Plant",
    text: "You turn into a potted plant until the start of your next turn: incapacitated and vulnerable to all damage. At 0 HP the pot breaks and you revert.",
    duration: { rounds: 1 }, statuses: ["incapacitated"],
    changes: () => damageTypes().map(t => ({ key: "system.traits.dv.value", mode: ADD, value: t })),
    mechanics: "Until the start of your next turn. Incapacitated, vulnerable to every damage type." },
  { key: "blink-step", abbr: "TP", kind: "lasting", name: "Blink Step",
    text: "For the next minute, you can teleport up to 20 feet as a bonus action on each of your turns.",
    duration: { seconds: MINUTE }, mechanics: "1 minute reminder of the bonus-action teleport." },
  { key: "levitate", abbr: "LV", kind: "lasting", name: "Levitate (Self)",
    text: "You cast levitate on yourself.", spell: "Levitate",
    duration: { seconds: 10 * MINUTE }, mechanics: "Up to 10 minutes. Links the Levitate spell." },
  { key: "unicorn", abbr: "UN", kind: "lasting", name: "Unicorn",
    text: "A unicorn controlled by the DM appears within 5 feet of you, then disappears 1 minute later.",
    duration: { seconds: MINUTE }, mechanics: "1 minute timer for the unicorn." },
  { key: "bubbles", abbr: "BU", kind: "lasting", name: "Pink Bubbles",
    text: "You can't speak for the next minute. When you try, pink bubbles float out of your mouth.",
    duration: { seconds: MINUTE }, mechanics: "1 minute. No speaking, so no spells with verbal components." },
  { key: "bubbles-2024", abbr: "BU", kind: "lasting", name: "Pink Bubbles",
    text: "For the next minute, pink bubbles float out of your mouth whenever you speak.",
    duration: { seconds: MINUTE }, mechanics: "1 minute, cosmetic." },
  { key: "spectral-shield", abbr: "AC", kind: "lasting", name: "Spectral Shield",
    text: "A spectral shield hovers near you for the next minute: +2 bonus to AC and immunity to magic missile.",
    duration: { seconds: MINUTE },
    changes: () => [{ key: "system.attributes.ac.bonus", mode: ADD, value: "+2" }],
    mechanics: "1 minute. +2 AC (magic missile immunity is a reminder)." },
  { key: "alcohol-immunity", abbr: "SO", kind: "lasting", name: "Sober Spell",
    text: "You are immune to being intoxicated by alcohol for the next 5d6 days.",
    mechanics: "5d6 days, rolled when applied.",
    prepare: () => {
      const r = rollSync("5d6").total;
      return { name: `Sober Spell (${r} days)`, duration: { seconds: r * DAY }, note: `Rolled 5d6 = ${r} days.` };
    } },
  { key: "hair-loss", abbr: "HL", kind: "lasting", name: "Hair Loss",
    text: "Your hair falls out but grows back within 24 hours.",
    duration: { seconds: DAY }, mechanics: "24 hours." },
  { key: "fire-touch", abbr: "FT", kind: "lasting", name: "Burning Touch",
    text: "For the next minute, flammable (nonmagical) objects you touch that nobody else is wearing or carrying burst into flame.",
    duration: { seconds: MINUTE }, mechanics: "1 minute reminder (2024: the object also takes 1d4 fire damage)." },
  { key: "shouting", abbr: "SH", kind: "lasting", name: "Shouting",
    text: "For the next minute, you must shout when you speak.",
    duration: { seconds: MINUTE }, mechanics: "1 minute." },
  { key: "frightened", abbr: "FR", kind: "lasting", name: "Spooked",
    text: "You are frightened until the end of your next turn (the DM picks the source).",
    duration: { rounds: 1, turns: 1 }, statuses: ["frightened"],
    mechanics: "Frightened until the end of your next turn." },
  { key: "mass-invisibility", abbr: "IN", kind: "lasting", name: "Mass Invisibility",
    text: "Each creature within 30 feet of you becomes invisible for the next minute; it ends on a creature when it attacks or casts a spell.",
    duration: { seconds: MINUTE }, statuses: ["invisible"], targets: "self+targets",
    mechanics: "1 minute. Invisible on you and on any tokens you have targeted." },
  { key: "group-invisibility", abbr: "IN", kind: "lasting", name: "Group Invisibility",
    text: "You and up to three creatures you choose within 30 feet are invisible for 1 minute; it ends on a creature after it attacks, deals damage, or casts a spell.",
    duration: { seconds: MINUTE }, statuses: ["invisible"], targets: "self+targets",
    mechanics: "1 minute. Invisible on you and on up to three targeted tokens." },
  { key: "resist-all", abbr: "RS", kind: "lasting", name: "Resilience",
    text: "You have resistance to all damage for the next minute.",
    duration: { seconds: MINUTE },
    changes: () => damageTypes().map(t => ({ key: "system.traits.dr.value", mode: ADD, value: t })),
    mechanics: "1 minute. Resistance to every damage type." },
  { key: "poison-random", abbr: "PO", kind: "lasting", name: "Surge Poison",
    text: "A random creature within 60 feet of you is poisoned for 1d4 hours.",
    statuses: ["poisoned"], targets: "targets",
    mechanics: "Poisoned for 1d4 hours (rolled). Goes on your targeted token, or on you if nothing is targeted.",
    prepare: () => {
      const r = rollSync("1d4").total;
      return { duration: { seconds: r * HOUR }, note: `Rolled 1d4 = ${r} hours.` };
    } },
  { key: "radiant-glow", abbr: "LT", kind: "lasting", name: "Radiant Glow",
    text: "You shed bright light in a 30-foot radius for the next minute. A creature that ends its turn within 5 feet of you is blinded until the end of its next turn.",
    duration: { seconds: MINUTE },
    flags: { light: { bright: 30, dim: 60, color: "#ffe9a8", alpha: 0.4 } },
    mechanics: "1 minute. Your token emits 30 ft bright / 60 ft dim light (restored when removed)." },
  { key: "butterflies", abbr: "BF", kind: "lasting", name: "Butterflies",
    text: "Illusory butterflies (and petals) flutter in the air within 10 feet of you for the next minute.",
    duration: { seconds: MINUTE }, mechanics: "1 minute, cosmetic." },
  { key: "mirror-image", abbr: "MI", kind: "lasting", name: "Mirror Image",
    text: "You cast mirror image.", spell: "Mirror Image",
    duration: { seconds: MINUTE }, mechanics: "1 minute. Links the Mirror Image spell (3 duplicates)." },
  { key: "fly", abbr: "FL", kind: "lasting", name: "Surge Flight",
    text: "You cast fly on a random creature within 60 feet of you.", spell: "Fly",
    duration: { seconds: 10 * MINUTE },
    changes: () => [{ key: "system.attributes.movement.fly", mode: UPGRADE, value: "60" }],
    targets: "targets",
    mechanics: "Up to 10 minutes. 60 ft fly speed on your targeted token, or on you if nothing is targeted." },
  { key: "invisible-silent", abbr: "IN", kind: "lasting", name: "Silent Invisibility",
    text: "You become invisible for the next minute and other creatures can't hear you. It ends if you attack or cast a spell.",
    duration: { seconds: MINUTE }, statuses: ["invisible"], mechanics: "1 minute. Invisible (and silent)." },
  { key: "reincarnate", abbr: "RI", kind: "lasting", name: "Second Life",
    text: "If you die within the next minute, you come back to life as if by the reincarnate spell.",
    duration: { seconds: MINUTE }, spell: "Reincarnate", mechanics: "1 minute reminder." },
  { key: "reincarnate-hour", abbr: "RI", kind: "lasting", name: "Second Life",
    text: "If you die within the next hour, you revive as if by the reincarnate spell.",
    duration: { seconds: HOUR }, spell: "Reincarnate", mechanics: "1 hour reminder." },
  { key: "size-increase", abbr: "SZ", kind: "lasting", name: "Growth",
    text: "Your size increases by one size category for the next minute.",
    duration: { seconds: MINUTE }, mechanics: "1 minute. Size set one category larger than your current size.",
    prepare: sizeUp },
  { key: "piercing-vulnerability", abbr: "PV", kind: "lasting", name: "Piercing Vulnerability",
    text: "You and each creature within 30 feet of you are vulnerable to piercing damage for the next minute.",
    duration: { seconds: MINUTE },
    changes: () => [{ key: "system.traits.dv.value", mode: ADD, value: "piercing" }],
    targets: "self+targets", mechanics: "1 minute. Vulnerable to piercing on you and on targeted tokens." },
  { key: "ethereal-music", abbr: "MU", kind: "lasting", name: "Ethereal Music",
    text: "You are surrounded by faint, ethereal music for the next minute.",
    duration: { seconds: MINUTE }, mechanics: "1 minute, cosmetic." },

  // ---- Instant -------------------------------------------------------
  { key: "fireball", kind: "instant", name: "Fireball on Self",
    text: "You cast fireball (3rd level) centered on yourself.", spell: "Fireball",
    mechanics: "Links Fireball and rolls 8d6 fire damage.",
    run: async actor => rollToChat(actor, "8d6", "Fireball (3rd level) centered on you, fire damage. DEX save for half.") },
  { key: "magic-missile", kind: "instant", name: "Magic Missile (5th level)",
    text: "You cast magic missile as a 5th-level spell.", spell: "Magic Missile",
    mechanics: "Links Magic Missile. 7 darts of 1d4+1 force damage.",
    run: async actor => rollToChat(actor, "7d4 + 7", "Magic Missile (5th level): 7 darts, 1d4+1 force each (total if all hit one target).") },
  { key: "confusion", kind: "instant", name: "Confusion on Self",
    text: "You cast confusion centered on yourself.", spell: "Confusion", mechanics: "Links Confusion." },
  { key: "grease", kind: "instant", name: "Grease on Self",
    text: "You cast grease centered on yourself.", spell: "Grease", mechanics: "Links Grease." },
  { key: "fog-cloud", kind: "instant", name: "Fog Cloud on Self",
    text: "You cast fog cloud centered on yourself.", spell: "Fog Cloud", mechanics: "Links Fog Cloud." },
  { key: "teleport-60", kind: "instant", name: "Random Teleport",
    text: "You teleport up to 60 feet to an unoccupied space you can see.", mechanics: "Move your token up to 60 ft." },
  { key: "flumphs", kind: "instant", name: "Flumphs",
    text: "1d6 flumphs controlled by the DM appear within 60 feet of you, frightened of you, and vanish after 1 minute.",
    mechanics: "Rolls the number of flumphs.",
    run: async actor => rollToChat(actor, "1d6", "Number of flumphs that appear (frightened of you).") },
  { key: "heal-2d10", kind: "instant", name: "Surge of Vitality",
    text: "You regain 2d10 hit points.", mechanics: "Rolls 2d10 and heals you.",
    run: async actor => healRoll(actor, "Wild Surge: you regain 2d10 HP") },
  { key: "ally-heal-2d10", kind: "instant", name: "Vitality for an Ally",
    text: "One ally of your choice within 300 feet of you regains 2d10 hit points.",
    mechanics: "Rolls 2d10 and heals your targeted ally (or just rolls if nothing is targeted).",
    run: async actor => {
      const ally = firstTarget();
      if (ally?.isOwner) return healRoll(ally, `Wild Surge: ${ally.name} regains 2d10 HP`);
      return rollToChat(actor, "2d10", "HP regained by one ally of your choice within 300 ft. Target the ally first to heal them automatically.");
    } },
  { key: "regain-slot", kind: "instant", name: "Regain Spell Slot",
    text: "You regain your lowest-level expended spell slot.", mechanics: "Restores your lowest expended spell slot.",
    run: async actor => regainLowestSlot(actor) },
  { key: "ally-regain-slot", kind: "instant", name: "Spell Slot for an Ally",
    text: "One ally of your choice within 300 feet of you regains their lowest-level expended spell slot.",
    mechanics: "Restores the targeted ally's lowest expended slot.",
    run: async () => {
      const ally = firstTarget();
      if (!ally) return "Target the ally and resolve again, or restore their slot manually.";
      if (!ally.isOwner) return `You can't modify ${ally.name}. Ask the GM to restore their lowest slot.`;
      return `${ally.name}: ${await regainLowestSlot(ally)}`;
    } },
  { key: "lightning", kind: "instant", name: "Lightning Strike",
    text: "Up to three creatures you choose within 30 feet of you take 4d10 lightning damage.",
    mechanics: "Rolls 4d10 lightning damage.",
    run: async actor => rollToChat(actor, "4d10", "Lightning damage to up to three creatures of your choice within 30 ft.") },
  { key: "polymorph-sheep", kind: "instant", name: "Polymorph (Sheep)",
    text: "You cast polymorph on yourself; if you fail the save you become a sheep for the duration.",
    spell: "Polymorph", mechanics: "Links Polymorph and rolls your WIS save.",
    run: async actor => { await (actor.rollSavingThrow?.({ ability: "wis" }) ?? actor.rollAbilitySave?.("wis")); return null; } },
  { key: "polymorph-goat", kind: "instant", name: "Polymorph (Goat)",
    text: "You cast polymorph on yourself; if you fail the save you become a goat for the duration.",
    spell: "Polymorph", mechanics: "Links Polymorph and rolls your WIS save.",
    run: async actor => { await (actor.rollSavingThrow?.({ ability: "wis" }) ?? actor.rollAbilitySave?.("wis")); return null; } },
  { key: "extra-action", kind: "instant", name: "Extra Action",
    text: "You can take one additional action (this turn).", mechanics: "Take an extra action now." },
  { key: "life-drain", kind: "instant", name: "Life Drain",
    text: "Creatures near you take 1d10 necrotic damage and you regain hit points equal to the total dealt (2014: every creature within 30 ft; 2024: up to three you choose).",
    mechanics: "Rolls 1d10 necrotic. Heal yourself by the total dealt.",
    run: async actor => rollToChat(actor, "1d10", "Necrotic damage per creature. You regain HP equal to the total dealt.") },
  { key: "regain-sorcery", kind: "instant", name: "Font Refilled",
    text: "You regain all expended sorcery points.", mechanics: "Restores sorcery points.",
    run: async actor => regainSorceryPoints(actor) }
];

export const EFFECTS = Object.fromEntries([...E, ...CELESTIAL_EFFECTS].map(e => [e.key, e]));

/* -------------------------------------------- */
/*  Tables                                       */
/* -------------------------------------------- */

const pairs = keys => keys.map((key, i) => ({ min: i * 2 + 1, max: i * 2 + 2, key }));
const quads = rows => rows.map((row, i) => ({ min: i * 4 + 1, max: i * 4 + 4, ...(typeof row === "string" ? { key: row } : row) }));

const COSMETIC_2024 = ["ethereal-music", "size-increase", "feather-beard", "shouting", "butterflies", "third-eye", "bubbles-2024", "blue-skin-24h"];

export const TABLES = {
  celestial: CELESTIAL_TABLE,
  "2014": pairs([
    "surge-each-turn", "see-invisible", "modron", "fireball", "magic-missile", "height-change", "confusion",
    "regeneration", "feather-beard", "grease", "save-disadvantage", "blue-skin", "third-eye", "quickened-casting",
    "teleport-60", "astral", "maximize-damage", "age-change", "flumphs", "heal-2d10", "potted-plant", "blink-step",
    "levitate", "unicorn", "bubbles", "spectral-shield", "alcohol-immunity", "hair-loss", "fire-touch", "regain-slot",
    "shouting", "fog-cloud", "lightning", "frightened", "mass-invisibility", "resist-all", "poison-random",
    "radiant-glow", "polymorph-sheep", "butterflies", "extra-action", "life-drain", "mirror-image", "fly",
    "invisible-silent", "reincarnate", "size-increase", "piercing-vulnerability", "ethereal-music", "regain-sorcery"
  ]),
  "2024": quads([
    "surge-each-turn",
    "friendly-creature",
    "regeneration",
    "save-disadvantage",
    { name: "Strange Effect (d8)", formula: "1d8", options: COSMETIC_2024,
      text: "Roll 1d8 for a 1-minute oddity: music, growth, feather beard, shouting, butterflies, third eye, pink bubbles, or blue skin." },
    "quickened-casting",
    "astral",
    "maximize-damage",
    "resist-all",
    "potted-plant",
    "blink-step",
    "group-invisibility",
    "spectral-shield",
    "extra-action",
    { name: "Random Spell (d10)", formula: "1d10",
      options: ["confusion", "fireball", "fog-cloud", "fly", "grease", "levitate", "magic-missile", "mirror-image", "polymorph-goat", "see-invisibility-spell"],
      text: "Roll 1d10 for a spell you cast (no concentration, full duration): Confusion, Fireball, Fog Cloud, Fly, Grease, Levitate, Magic Missile, Mirror Image, Polymorph, See Invisibility." },
    "fire-touch",
    "reincarnate-hour",
    "frightened",
    "teleport-60",
    "poison-random",
    "radiant-glow",
    "life-drain",
    "lightning",
    "piercing-vulnerability",
    { name: "Restoration (d6)", formula: "1d6",
      options: ["heal-2d10", "ally-heal-2d10", "regain-slot", "ally-regain-slot", "regain-sorcery", COSMETIC_2024],
      text: "Roll 1d6: you regain 2d10 HP, an ally regains 2d10 HP, you regain a spell slot, an ally regains a spell slot, you regain all sorcery points, or every row 17-20 oddity affects you at once." }
  ])
};

/** Find the table row for a d100 total. */
export function findRow(edition, total) {
  const size = edition === "celestial" ? 20 : 100;
  const n = ((Number(total) - 1) % size + size) % size + 1;
  return TABLES[edition].find(r => n >= r.min && n <= r.max);
}

export function rangeLabel(row) {
  const f = n => (n === 100 ? "00" : String(n).padStart(2, "0"));
  return row.min === row.max ? String(row.min) : `${f(row.min)}-${f(row.max)}`;
}

/* -------------------------------------------- */
/*  Helpers                                      */
/* -------------------------------------------- */

function firstTarget() {
  return [...(game.user.targets ?? [])].map(t => t.actor).find(Boolean) ?? null;
}

async function rollToChat(actor, formula, flavor) {
  const roll = await new Roll(formula).evaluate();
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `Wild Surge: ${flavor}` });
  return null;
}

async function healRoll(actor, flavor) {
  const roll = await new Roll("2d10").evaluate();
  const healed = await heal(actor, roll.total);
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${flavor} (healed ${healed}).` });
  return null;
}

export async function heal(actor, amount) {
  const hp = actor.system.attributes.hp;
  const max = hp.effectiveMax ?? hp.max;
  const value = Math.min(max, hp.value + amount);
  const healed = Math.max(0, value - hp.value);
  if (healed) await actor.update({ "system.attributes.hp.value": value });
  return healed;
}

async function regainLowestSlot(actor) {
  const spells = actor.system.spells ?? {};
  for (let lvl = 1; lvl <= 9; lvl++) {
    const slot = spells[`spell${lvl}`];
    if (slot && slot.max > 0 && slot.value < slot.max) {
      await actor.update({ [`system.spells.spell${lvl}.value`]: slot.value + 1 });
      return `Regained one level ${lvl} spell slot.`;
    }
  }
  const pact = spells.pact;
  if (pact && pact.max > 0 && pact.value < pact.max) {
    await actor.update({ "system.spells.pact.value": pact.value + 1 });
    return `Regained one pact magic slot (level ${pact.level}).`;
  }
  return "No expended spell slots to regain.";
}

async function regainSorceryPoints(actor) {
  const restored = [];
  for (const item of actor.items) {
    if (!/sorcery points|font of magic/i.test(item.name)) continue;
    const uses = item.system.uses;
    if (!uses?.max) continue;
    if ("spent" in uses) {
      if (uses.spent > 0) { await item.update({ "system.uses.spent": 0 }); restored.push(item.name); }
    } else if (uses.value < uses.max) {
      await item.update({ "system.uses.value": uses.max }); restored.push(item.name);
    }
  }
  for (const [k, res] of Object.entries(actor.system.resources ?? {})) {
    if (res?.label && /sorcery/i.test(res.label) && res.max && res.value < res.max) {
      await actor.update({ [`system.resources.${k}.value`]: res.max });
      restored.push(res.label);
    }
  }
  if (!restored.length) {
    const sorc = actor.items.find(i => i.type === "class" && /sorcerer/i.test(i.name));
    const uses = sorc?.system?.uses;
    if (uses?.max && uses.spent > 0) { await sorc.update({ "system.uses.spent": 0 }); restored.push(sorc.name); }
  }
  return restored.length
    ? `Sorcery points restored (${restored.join(", ")}).`
    : "Couldn't find a sorcery point tracker on this actor. Restore them manually.";
}
