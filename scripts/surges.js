/**
 * Wild Magic Surge table (2014 Player's Handbook layout, d100, 50 results).
 * Descriptions are short paraphrases for table reference; check your PHB for the full wording.
 *
 * kind "lasting": registered as a status effect (Active Effect) that can be toggled on/off.
 * kind "instant": resolved once (rolls, healing, slot recovery, spell links) and reported in chat.
 */

const ADD = 2;       // CONST.ACTIVE_EFFECT_MODES.ADD
const UPGRADE = 4;   // CONST.ACTIVE_EFFECT_MODES.UPGRADE
const OVERRIDE = 5;  // CONST.ACTIVE_EFFECT_MODES.OVERRIDE

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;

/** Damage type keys from the dnd5e config, with a fallback list. */
function damageTypes() {
  const keys = Object.keys(globalThis.CONFIG?.DND5E?.damageTypes ?? {});
  return keys.length ? keys : ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic",
    "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];
}

function rollSync(formula) {
  const roll = new Roll(formula);
  return roll.evaluateSync ? roll.evaluateSync() : roll.evaluate({ async: false });
}

export const SURGES = [
  {
    min: 1, max: 2, key: "surge-each-turn", kind: "lasting",
    name: "Surge Every Turn",
    text: "For the next minute, roll on the surge table at the start of each of your turns (ignore this result on those rolls).",
    duration: { seconds: MINUTE },
    flags: { reminder: "Roll on the Wild Magic Surge table now (re-roll 01-02)." },
    mechanics: "1 minute. Posts a chat reminder at the start of each of your turns in combat."
  },
  {
    min: 3, max: 4, key: "see-invisible", kind: "lasting",
    name: "See Invisibility",
    text: "For the next minute you can see any invisible creature you have line of sight to.",
    duration: { seconds: MINUTE },
    changes: () => [{ key: "system.attributes.senses.special", mode: ADD, value: " See Invisible" }],
    mechanics: "1 minute. Adds \"See Invisible\" to special senses."
  },
  {
    min: 5, max: 6, key: "modron", kind: "lasting",
    name: "Modron Companion",
    text: "A modron chosen and controlled by the DM appears in an unoccupied space within 5 feet of you, then disappears 1 minute later.",
    duration: { seconds: MINUTE },
    mechanics: "1 minute timer for the modron."
  },
  {
    min: 7, max: 8, key: "fireball", kind: "instant",
    name: "Fireball on Self",
    text: "You cast fireball as a 3rd-level spell centered on yourself.",
    spell: "Fireball",
    mechanics: "Links the Fireball spell and rolls 8d6 fire damage.",
    run: async (actor) => rollToChat(actor, "8d6", "Fireball (3rd level) centered on you, fire damage. DEX save for half.")
  },
  {
    min: 9, max: 10, key: "magic-missile", kind: "instant",
    name: "Magic Missile (5th level)",
    text: "You cast magic missile as a 5th-level spell.",
    spell: "Magic Missile",
    mechanics: "Links the Magic Missile spell. 7 darts of 1d4+1 force damage each.",
    run: async (actor) => rollToChat(actor, "7d4 + 7", "Magic Missile (5th level): 7 darts, 1d4+1 force each (total if all hit one target).")
  },
  {
    min: 11, max: 12, key: "height-change", kind: "lasting",
    name: "Height Change",
    text: "Roll a d10. Your height changes by that many inches: odd shrinks you, even makes you taller.",
    mechanics: "Permanent until removed. The d10 is rolled when the effect is applied and shown in its name.",
    prepare: () => {
      const r = rollSync("1d10").total;
      const sign = r % 2 ? "-" : "+";
      return { name: `Height Change (${sign}${r} in.)`, note: `Rolled d10 = ${r}: you ${r % 2 ? "shrink" : "grow"} ${r} inches.` };
    }
  },
  {
    min: 13, max: 14, key: "confusion", kind: "instant",
    name: "Confusion on Self",
    text: "You cast confusion centered on yourself.",
    spell: "Confusion",
    mechanics: "Links the Confusion spell."
  },
  {
    min: 15, max: 16, key: "regeneration", kind: "lasting",
    name: "Regeneration",
    text: "For the next minute, you regain 5 hit points at the start of each of your turns.",
    duration: { seconds: MINUTE },
    flags: { regen: 5 },
    mechanics: "1 minute. Heals 5 HP automatically at the start of each of your turns in combat."
  },
  {
    min: 17, max: 18, key: "feather-beard", kind: "lasting",
    name: "Feather Beard",
    text: "You grow a long beard made of feathers that remains until you sneeze, at which point the feathers explode out from your face.",
    mechanics: "Lasts until you sneeze (remove manually)."
  },
  {
    min: 19, max: 20, key: "grease", kind: "instant",
    name: "Grease on Self",
    text: "You cast grease centered on yourself.",
    spell: "Grease",
    mechanics: "Links the Grease spell."
  },
  {
    min: 21, max: 22, key: "save-disadvantage", kind: "lasting",
    name: "Imposing Spell",
    text: "Creatures have disadvantage on saving throws against the next spell you cast in the next minute that involves a saving throw.",
    duration: { seconds: MINUTE },
    mechanics: "1 minute. Remove it once you have cast the spell."
  },
  {
    min: 23, max: 24, key: "blue-skin", kind: "lasting",
    name: "Blue Skin",
    text: "Your skin turns a vibrant shade of blue. A remove curse spell can end this effect.",
    mechanics: "Permanent until removed (remove curse)."
  },
  {
    min: 25, max: 26, key: "third-eye", kind: "lasting",
    name: "Third Eye",
    text: "An eye appears on your forehead for the next minute, giving you advantage on Wisdom (Perception) checks that rely on sight.",
    duration: { seconds: MINUTE },
    changes: () => [{ key: "system.skills.prc.roll.mode", mode: ADD, value: "1" }],
    mechanics: "1 minute. Perception checks are rolled with advantage."
  },
  {
    min: 27, max: 28, key: "quickened-casting", kind: "lasting",
    name: "Quickened Casting",
    text: "For the next minute, all your spells with a casting time of 1 action have a casting time of 1 bonus action.",
    duration: { seconds: MINUTE },
    mechanics: "1 minute reminder."
  },
  {
    min: 29, max: 30, key: "teleport-60", kind: "instant",
    name: "Random Teleport",
    text: "You teleport up to 60 feet to an unoccupied space of your choice that you can see.",
    mechanics: "Instant: move your token up to 60 ft."
  },
  {
    min: 31, max: 32, key: "astral", kind: "lasting",
    name: "Astral Plane",
    text: "You are transported to the Astral Plane until the end of your next turn, then return to the space you occupied (or the nearest unoccupied one).",
    duration: { rounds: 1, turns: 1 },
    mechanics: "Until the end of your next turn (auto-expires in combat)."
  },
  {
    min: 33, max: 34, key: "maximize-damage", kind: "lasting",
    name: "Maximized Spell",
    text: "Maximize the damage of the next damaging spell you cast within the next minute.",
    duration: { seconds: MINUTE },
    mechanics: "1 minute. Remove it once used."
  },
  {
    min: 35, max: 36, key: "age-change", kind: "lasting",
    name: "Age Change",
    text: "Roll a d10. Your age changes by that many years: odd makes you younger (minimum 1 year old), even makes you older.",
    mechanics: "Permanent. The d10 is rolled when applied and shown in its name.",
    prepare: () => {
      const r = rollSync("1d10").total;
      const sign = r % 2 ? "-" : "+";
      return { name: `Age Change (${sign}${r} years)`, note: `Rolled d10 = ${r}: you become ${r} years ${r % 2 ? "younger" : "older"}.` };
    }
  },
  {
    min: 37, max: 38, key: "flumphs", kind: "instant",
    name: "Flumphs",
    text: "1d6 flumphs controlled by the DM appear in unoccupied spaces within 60 feet of you and are frightened of you. They vanish after 1 minute.",
    mechanics: "Rolls the number of flumphs.",
    run: async (actor) => rollToChat(actor, "1d6", "Number of flumphs that appear (frightened of you).")
  },
  {
    min: 39, max: 40, key: "heal-2d10", kind: "instant",
    name: "Surge of Vitality",
    text: "You regain 2d10 hit points.",
    mechanics: "Rolls 2d10 and heals you automatically.",
    run: async (actor) => {
      const roll = await new Roll("2d10").evaluate();
      const healed = await heal(actor, roll.total);
      await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `Wild Surge: regain 2d10 HP (healed ${healed}).` });
      return null;
    }
  },
  {
    min: 41, max: 42, key: "potted-plant", kind: "lasting",
    name: "Potted Plant",
    text: "You turn into a potted plant until the start of your next turn. You are incapacitated and vulnerable to all damage. If you drop to 0 hit points, the pot breaks and you revert.",
    duration: { rounds: 1 },
    statuses: ["incapacitated"],
    changes: () => damageTypes().map(t => ({ key: "system.traits.dv.value", mode: ADD, value: t })),
    mechanics: "Until the start of your next turn. Incapacitated, vulnerable to every damage type."
  },
  {
    min: 43, max: 44, key: "blink-step", kind: "lasting",
    name: "Blink Step",
    text: "For the next minute, you can teleport up to 20 feet as a bonus action on each of your turns.",
    duration: { seconds: MINUTE },
    mechanics: "1 minute reminder of the bonus-action teleport."
  },
  {
    min: 45, max: 46, key: "levitate", kind: "lasting",
    name: "Levitate (Self)",
    text: "You cast levitate on yourself.",
    spell: "Levitate",
    duration: { seconds: 10 * MINUTE },
    mechanics: "Up to 10 minutes (concentration). Links the Levitate spell."
  },
  {
    min: 47, max: 48, key: "unicorn", kind: "lasting",
    name: "Unicorn",
    text: "A unicorn controlled by the DM appears in a space within 5 feet of you, then disappears 1 minute later.",
    duration: { seconds: MINUTE },
    mechanics: "1 minute timer for the unicorn."
  },
  {
    min: 49, max: 50, key: "bubbles", kind: "lasting",
    name: "Pink Bubbles",
    text: "You can't speak for the next minute. Whenever you try, pink bubbles float out of your mouth.",
    duration: { seconds: MINUTE },
    mechanics: "1 minute. You cannot speak, so no spells with verbal components."
  },
  {
    min: 51, max: 52, key: "spectral-shield", kind: "lasting",
    name: "Spectral Shield",
    text: "A spectral shield hovers near you for the next minute, granting a +2 bonus to AC and immunity to magic missile.",
    duration: { seconds: MINUTE },
    changes: () => [{ key: "system.attributes.ac.bonus", mode: ADD, value: "+2" }],
    mechanics: "1 minute. +2 AC (immunity to magic missile is a reminder)."
  },
  {
    min: 53, max: 54, key: "alcohol-immunity", kind: "lasting",
    name: "Sober Spell",
    text: "You are immune to being intoxicated by alcohol for the next 5d6 days.",
    mechanics: "5d6 days, rolled when applied.",
    prepare: () => {
      const r = rollSync("5d6").total;
      return { name: `Sober Spell (${r} days)`, duration: { seconds: r * DAY }, note: `Rolled 5d6 = ${r} days.` };
    }
  },
  {
    min: 55, max: 56, key: "hair-loss", kind: "lasting",
    name: "Hair Loss",
    text: "Your hair falls out but grows back within 24 hours.",
    duration: { seconds: DAY },
    mechanics: "24 hours."
  },
  {
    min: 57, max: 58, key: "fire-touch", kind: "lasting",
    name: "Burning Touch",
    text: "For the next minute, any flammable object you touch that isn't being worn or carried by another creature bursts into flame.",
    duration: { seconds: MINUTE },
    mechanics: "1 minute reminder."
  },
  {
    min: 59, max: 60, key: "regain-slot", kind: "instant",
    name: "Regain Spell Slot",
    text: "You regain your lowest-level expended spell slot.",
    mechanics: "Restores your lowest expended spell slot automatically.",
    run: async (actor) => regainLowestSlot(actor)
  },
  {
    min: 61, max: 62, key: "shouting", kind: "lasting",
    name: "Shouting",
    text: "For the next minute, you must shout when you speak.",
    duration: { seconds: MINUTE },
    mechanics: "1 minute."
  },
  {
    min: 63, max: 64, key: "fog-cloud", kind: "instant",
    name: "Fog Cloud on Self",
    text: "You cast fog cloud centered on yourself.",
    spell: "Fog Cloud",
    mechanics: "Links the Fog Cloud spell."
  },
  {
    min: 65, max: 66, key: "lightning", kind: "instant",
    name: "Lightning Strike",
    text: "Up to three creatures you choose within 30 feet of you take 4d10 lightning damage.",
    mechanics: "Rolls 4d10 lightning damage.",
    run: async (actor) => rollToChat(actor, "4d10", "Lightning damage to up to three creatures of your choice within 30 ft.")
  },
  {
    min: 67, max: 68, key: "frightened", kind: "lasting",
    name: "Spooked",
    text: "You are frightened by the nearest creature until the end of your next turn.",
    duration: { rounds: 1, turns: 1 },
    statuses: ["frightened"],
    mechanics: "Frightened until the end of your next turn."
  },
  {
    min: 69, max: 70, key: "mass-invisibility", kind: "lasting",
    name: "Mass Invisibility",
    text: "Each creature within 30 feet of you becomes invisible for the next minute. The invisibility ends on a creature when it attacks or casts a spell.",
    duration: { seconds: MINUTE },
    statuses: ["invisible"],
    targets: "self+targets",
    mechanics: "1 minute. Invisible. Applied to you and to any tokens you have targeted."
  },
  {
    min: 71, max: 72, key: "resist-all", kind: "lasting",
    name: "Resilience",
    text: "You gain resistance to all damage for the next minute.",
    duration: { seconds: MINUTE },
    changes: () => damageTypes().map(t => ({ key: "system.traits.dr.value", mode: ADD, value: t })),
    mechanics: "1 minute. Resistance to every damage type."
  },
  {
    min: 73, max: 74, key: "poison-random", kind: "lasting",
    name: "Surge Poison",
    text: "A random creature within 60 feet of you becomes poisoned for 1d4 hours.",
    statuses: ["poisoned"],
    targets: "targets",
    mechanics: "Poisoned for 1d4 hours (rolled). Applied to your targeted token, or to you if nothing is targeted.",
    prepare: () => {
      const r = rollSync("1d4").total;
      return { duration: { seconds: r * HOUR }, note: `Rolled 1d4 = ${r} hours.` };
    }
  },
  {
    min: 75, max: 76, key: "radiant-glow", kind: "lasting",
    name: "Radiant Glow",
    text: "You glow with bright light in a 30-foot radius for the next minute. Any creature that ends its turn within 5 feet of you is blinded until the end of its next turn.",
    duration: { seconds: MINUTE },
    flags: { light: { bright: 30, dim: 60, color: "#ffe9a8", alpha: 0.4 } },
    mechanics: "1 minute. Your token emits 30 ft bright / 60 ft dim light (restored when removed)."
  },
  {
    min: 77, max: 78, key: "polymorph-sheep", kind: "instant",
    name: "Polymorph (Sheep)",
    text: "You cast polymorph on yourself. If you fail the saving throw, you turn into a sheep for the spell's duration.",
    spell: "Polymorph",
    mechanics: "Links the Polymorph spell and rolls your WIS save.",
    run: async (actor) => {
      await actor.rollSavingThrow?.({ ability: "wis" }) ?? actor.rollAbilitySave?.("wis");
      return null;
    }
  },
  {
    min: 79, max: 80, key: "butterflies", kind: "lasting",
    name: "Butterflies and Petals",
    text: "Illusory butterflies and flower petals flutter in the air within 10 feet of you for the next minute.",
    duration: { seconds: MINUTE },
    mechanics: "1 minute, cosmetic."
  },
  {
    min: 81, max: 82, key: "extra-action", kind: "instant",
    name: "Extra Action",
    text: "You can take one additional action immediately.",
    mechanics: "Instant: take an extra action now."
  },
  {
    min: 83, max: 84, key: "life-drain", kind: "instant",
    name: "Life Drain",
    text: "Each creature within 30 feet of you takes 1d10 necrotic damage. You regain hit points equal to the sum of the necrotic damage dealt.",
    mechanics: "Rolls 1d10 necrotic. Heal yourself by the total dealt.",
    run: async (actor) => rollToChat(actor, "1d10", "Necrotic damage to each creature within 30 ft. You regain HP equal to the total dealt.")
  },
  {
    min: 85, max: 86, key: "mirror-image", kind: "lasting",
    name: "Mirror Image",
    text: "You cast mirror image.",
    spell: "Mirror Image",
    duration: { seconds: MINUTE },
    mechanics: "1 minute. Links the Mirror Image spell (3 duplicates)."
  },
  {
    min: 87, max: 88, key: "fly", kind: "lasting",
    name: "Surge Flight",
    text: "You cast fly on a random creature within 60 feet of you.",
    spell: "Fly",
    duration: { seconds: 10 * MINUTE },
    changes: () => [{ key: "system.attributes.movement.fly", mode: UPGRADE, value: "60" }],
    targets: "targets",
    mechanics: "Up to 10 minutes (concentration). 60 ft fly speed. Applied to your targeted token, or to you if nothing is targeted."
  },
  {
    min: 89, max: 90, key: "invisible-silent", kind: "lasting",
    name: "Silent Invisibility",
    text: "You become invisible for the next minute. During that time, other creatures can't hear you. The invisibility ends if you attack or cast a spell.",
    duration: { seconds: MINUTE },
    statuses: ["invisible"],
    mechanics: "1 minute. Invisible (and silent)."
  },
  {
    min: 91, max: 92, key: "reincarnate", kind: "lasting",
    name: "Second Life",
    text: "If you die within the next minute, you immediately come back to life as if by the reincarnate spell.",
    duration: { seconds: MINUTE },
    spell: "Reincarnate",
    mechanics: "1 minute reminder."
  },
  {
    min: 93, max: 94, key: "size-increase", kind: "lasting",
    name: "Growth",
    text: "Your size increases by one size category for the next minute.",
    duration: { seconds: MINUTE },
    mechanics: "1 minute. Size set one category larger than your current size.",
    prepare: (actor) => {
      const sizes = Object.keys(CONFIG.DND5E?.actorSizes ?? { tiny: 0, sm: 0, med: 0, lg: 0, huge: 0, grg: 0 });
      const current = actor?.system?.traits?.size ?? "med";
      const next = sizes[Math.min(sizes.indexOf(current) + 1, sizes.length - 1)] ?? "lg";
      const label = CONFIG.DND5E?.actorSizes?.[next]?.label ?? next;
      return {
        changes: [{ key: "system.traits.size", mode: OVERRIDE, value: next }],
        note: `Size becomes ${game.i18n.localize(label)}.`
      };
    }
  },
  {
    min: 95, max: 96, key: "piercing-vulnerability", kind: "lasting",
    name: "Piercing Vulnerability",
    text: "You and each creature within 30 feet of you gain vulnerability to piercing damage for the next minute.",
    duration: { seconds: MINUTE },
    changes: () => [{ key: "system.traits.dv.value", mode: ADD, value: "piercing" }],
    targets: "self+targets",
    mechanics: "1 minute. Vulnerable to piercing. Applied to you and to any tokens you have targeted."
  },
  {
    min: 97, max: 98, key: "ethereal-music", kind: "lasting",
    name: "Ethereal Music",
    text: "You are surrounded by faint, ethereal music for the next minute.",
    duration: { seconds: MINUTE },
    mechanics: "1 minute, cosmetic."
  },
  {
    min: 99, max: 100, key: "regain-sorcery", kind: "instant",
    name: "Font Refilled",
    text: "You regain all expended sorcery points.",
    mechanics: "Restores sorcery points automatically.",
    run: async (actor) => regainSorceryPoints(actor)
  }
];

/* -------------------------------------------- */
/*  Helpers used by instant results              */
/* -------------------------------------------- */

async function rollToChat(actor, formula, flavor) {
  const roll = await new Roll(formula).evaluate();
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `Wild Surge: ${flavor}` });
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
  // Items that track sorcery points (Font of Magic / Sorcery Points features).
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
  // Legacy: actor resources labelled "Sorcery Points".
  for (const [k, res] of Object.entries(actor.system.resources ?? {})) {
    if (res?.label && /sorcery/i.test(res.label) && res.max && res.value < res.max) {
      await actor.update({ [`system.resources.${k}.value`]: res.max });
      restored.push(res.label);
    }
  }
  // dnd5e 4.x class scale value / class uses fallback.
  if (!restored.length) {
    const sorc = actor.items.find(i => i.type === "class" && /sorcerer/i.test(i.name));
    const uses = sorc?.system?.uses;
    if (uses?.max && uses.spent > 0) { await sorc.update({ "system.uses.spent": 0 }); restored.push(sorc.name); }
  }
  return restored.length
    ? `Sorcery points restored (${restored.join(", ")}).`
    : "Couldn't find a sorcery point tracker on this actor. Restore them manually.";
}

export function findSurge(total) {
  const n = ((Number(total) - 1) % 100 + 100) % 100 + 1; // 0 and 100 map to 100
  return SURGES.find(s => n >= s.min && n <= s.max);
}

export function rangeLabel(s) {
  const f = n => (n === 100 ? "00" : String(n).padStart(2, "0"));
  return `${f(s.min)}-${f(s.max)}`;
}
