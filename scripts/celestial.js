/**
 * Celestial Surge (homebrew, d20). Optional: enable it in the module settings.
 *
 * random: true  -> the result hits "one random ally/creature". It is never applied automatically:
 *                  the effect goes on the token(s) you target (T) or, if none, the token(s) you select.
 * choose        -> asks which damage type to use when the effect is applied.
 */

const ADD = 2;

const MAGICAL_DAMAGE = ["acid", "cold", "fire", "force", "lightning", "necrotic", "poison", "psychic", "radiant", "thunder"];
const PHYSICAL_DAMAGE = ["bludgeoning", "piercing", "slashing"];
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

const isV6 = () => (globalThis.game?.release?.generation ?? 13) >= 14;
const weaponDamageKeys = () => (isV6()
  ? ["system.rolls.damage.mwak.bonus", "system.rolls.damage.rwak.bonus"]
  : ["system.bonuses.mwak.damage", "system.bonuses.rwak.damage"]);

const resistanceChoice = (types, label) => ({
  label,
  options: types,
  apply: type => ({
    name: `${label} (${type})`,
    changes: [{ key: "system.traits.dr.value", mode: ADD, value: type }]
  })
});

const SOURCE = "Celestial Surge";

export const CELESTIAL_EFFECTS = [
  { key: "cs-surge-each-turn", abbr: "C1", kind: "lasting", source: SOURCE, name: "Celestial Echo",
    text: "For the next minute, roll on the Celestial Surge table at the start of each of your turns (ignore this result on those rolls).",
    duration: { seconds: 60 },
    flags: { reminder: "Roll on the Celestial Surge table now (re-roll a 1)." },
    mechanics: "1 minute. Chat reminder at the start of each of your turns in combat." },
  { key: "cs-heretics-rite", abbr: "HR", kind: "lasting", source: SOURCE, random: true, name: "Heretic's Rite",
    text: "You or one random ally has disadvantage on the next saving throw or ability check.",
    changes: () => ABILITIES.flatMap(a => [
      { key: `system.abilities.${a}.save.roll.mode`, mode: ADD, value: "-1" },
      { key: `system.abilities.${a}.check.roll.mode`, mode: ADD, value: "-1" }
    ]),
    mechanics: "Disadvantage on saves and ability checks. Remove it after the next one." },
  { key: "cs-magic-resistance", abbr: "MR", kind: "lasting", source: SOURCE, random: true, name: "Accustomed to Magic",
    text: "You or one random ally gains resistance to one type of magical damage of your choice for 3 turns.",
    duration: { rounds: 3 }, choose: resistanceChoice(MAGICAL_DAMAGE, "Accustomed to Magic"),
    mechanics: "3 rounds. Resistance to the magical damage type you pick." },
  { key: "cs-no-healing", abbr: "NH", kind: "lasting", source: SOURCE, random: true, name: "Nature Turns Its Back",
    text: "One random creature can't regain hit points until the end of your next turn.",
    duration: { rounds: 1, turns: 1 },
    mechanics: "Until the end of your next turn. Reminder: no healing." },
  { key: "cs-physical-resistance", abbr: "PR", kind: "lasting", source: SOURCE, random: true, name: "Accustomed to Mundane Attacks",
    text: "You or one random ally gains resistance to one type of physical damage of your choice for 3 turns.",
    duration: { rounds: 3 }, choose: resistanceChoice(PHYSICAL_DAMAGE, "Accustomed to Mundane Attacks"),
    mechanics: "3 rounds. Resistance to bludgeoning, piercing or slashing (you pick)." },
  { key: "cs-no-right-hand", abbr: "RH", kind: "lasting", source: SOURCE, random: true, name: "Withered Right Hand",
    text: "One random creature can't use its right hand until the end of your next turn.",
    duration: { rounds: 1, turns: 1 },
    mechanics: "Until the end of your next turn. Reminder." },
  { key: "cs-short-rest", abbr: "SR", kind: "instant", source: SOURCE, random: true, name: "Seventh Day",
    text: "One random ally gets the benefits of a short rest (they can spend at most your proficiency bonus in Hit Dice).",
    mechanics: "Opens the short rest dialog for the targeted/selected ally.", run: "shortRest" },
  { key: "cs-prayer", abbr: "PT", kind: "lasting", source: SOURCE, name: "Prayer Time",
    text: "You pray for 1 turn: no actions, bonus actions or reactions. You can still be targeted and damaged.",
    duration: { rounds: 1 }, statuses: ["incapacitated"],
    mechanics: "Until the start of your next turn. Incapacitated." },
  { key: "cs-stronger", abbr: "WS", kind: "lasting", source: SOURCE, random: true, name: "What Doesn't Kill You",
    text: "For 3 turns, one random ally gains advantage on their next attack roll each time they take damage.",
    duration: { rounds: 3 },
    mechanics: "3 rounds. Reminder: advantage on the next attack after taking damage." },
  { key: "cs-sacred-flames", kind: "instant", source: SOURCE, name: "Burn the Non-believers",
    text: "You are covered in sacred flames. Each creature within 20 ft makes a CON save against your spell save DC, taking 4d8 fire + 4d8 radiant damage on a failure or half on a success.",
    mechanics: "Rolls 4d8 fire + 4d8 radiant and shows your spell save DC.", run: "sacredFlames" },
  { key: "cs-holy-weapon", abbr: "HW", kind: "lasting", source: SOURCE, random: true, name: "Holy Weapon",
    text: "One random ally's weapon shines with holy light, dealing an extra 1d8 radiant damage for 2 of their turns.",
    duration: { rounds: 2 },
    changes: () => weaponDamageKeys().map(key => ({ key, mode: ADD, value: "1d8[radiant]" })),
    mechanics: "2 rounds. Weapon attacks deal +1d8 radiant." },
  { key: "cs-bow-before-me", abbr: "BB", kind: "lasting", source: SOURCE, random: true, name: "Bow Before Me",
    text: "One random ally is knocked prone and can't stand up until the end of their next turn (they must crawl to move).",
    duration: { rounds: 1, turns: 1 }, statuses: ["prone"],
    mechanics: "Prone until the end of the next turn." },
  { key: "cs-spare-the-dying", abbr: "SD", kind: "lasting", source: SOURCE, name: "Gracious Lord",
    text: "For the next day you can cast the Spare the Dying cantrip.",
    duration: { seconds: 86400 }, spell: "Spare the Dying",
    mechanics: "24 hours. Links Spare the Dying." },
  { key: "cs-senseless", abbr: "SL", kind: "lasting", source: SOURCE, random: true, name: "Mouths That Cannot Speak",
    text: "Until the end of your next round, a random creature is blinded, deafened and can't speak. Blindsight that relies on smell doesn't help.",
    duration: { rounds: 1, turns: 1 }, statuses: ["blinded", "deafened"],
    mechanics: "Until the end of your next turn. Blinded, deafened and silenced." },
  { key: "cs-eye-for-eye", abbr: "EE", kind: "lasting", source: SOURCE, name: "Eye for an Eye",
    text: "For the next 3 turns, when you or an ally within 30 ft takes damage, you can use your reaction to cast a cantrip at the source of the damage.",
    duration: { rounds: 3 },
    mechanics: "3 rounds. Reminder of the retaliation reaction." },
  { key: "cs-mass-heal", kind: "instant", source: SOURCE, name: "He Sent His Word",
    text: "All allies within 30 ft regain 8d4+8 hit points.",
    mechanics: "Rolls 8d4+8 once and heals every targeted (or selected) token.", run: "massHeal" },
  { key: "cs-pacifism", abbr: "PC", kind: "lasting", source: SOURCE, name: "Do Not Repay Evil",
    text: "For the next minute you can't harm any creature. If you do, you skip your next turn and the effect ends.",
    duration: { seconds: 60 },
    mechanics: "1 minute. Reminder." },
  { key: "cs-prodigal", abbr: "PS", kind: "lasting", source: SOURCE, name: "Was Dead and Is Alive",
    text: "For the next 10 minutes, if you or an ally within 40 ft is knocked unconscious, they regain consciousness at the start of their turn with 10 temporary hit points.",
    duration: { seconds: 600 },
    mechanics: "10 minutes. Reminder." },
  { key: "cs-strip-bare", abbr: "AC", kind: "lasting", source: SOURCE, random: true, name: "Show Nothing but Faith",
    text: "Halve the AC of one random ally for 1 turn.",
    duration: { rounds: 1 },
    mechanics: "Until the start of the next turn. AC halved (rounded down), computed when applied.",
    prepare: actor => {
      const ac = actor?.system?.attributes?.ac?.value;
      if (!Number.isFinite(ac)) return { note: "Couldn't read this creature's AC. Halve it manually." };
      const drop = Math.ceil(ac / 2);
      return {
        changes: [{ key: "system.attributes.ac.bonus", mode: ADD, value: `-${drop}` }],
        note: `AC ${ac} becomes ${ac - drop}.`
      };
    } },
  { key: "cs-resist-devil", abbr: "RD", kind: "lasting", source: SOURCE, random: true, name: "Resist the Devil",
    text: "For the next minute, you or one random ally has resistance to being frightened. If they are already frightened, that ends.",
    duration: { seconds: 60 }, removeStatuses: ["frightened"],
    mechanics: "1 minute. Removes Frightened when applied. Reminder of the resistance." }
];

export const CELESTIAL_TABLE = CELESTIAL_EFFECTS.map((e, i) => ({ min: i + 1, max: i + 1, key: e.key }));
