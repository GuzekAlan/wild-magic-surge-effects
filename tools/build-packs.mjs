/**
 * Builds the "Surge Tables" compendium (RollTables) from the effect definitions in scripts/.
 *
 *   npm install
 *   node tools/build-packs.mjs          # writes packs/_source/surge-tables/*.json and compiles packs/surge-tables
 *   node tools/build-packs.mjs --source # only (re)writes the JSON sources
 *
 * Every table carries flags["wild-surge-effects"].table = "2014" | "2024" | "celestial", so the module
 * recognises it even after the GM imports or renames it.
 */
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MOD = "wild-surge-effects";
const SRC = join(ROOT, "packs/_source/surge-tables");
const OUT = join(ROOT, "packs/surge-tables");

const { EFFECTS, TABLES, rangeLabel } = await import(join(ROOT, "scripts/surges.js"));

/** Stable 16-character id from a seed, so rebuilding never changes document ids. */
const id = seed => createHash("sha1").update(seed).digest("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);

const TABLE_DEFS = [
  { key: "2014", name: "Wild Magic Surge 5E", formula: "1d100",
    description: "Wild Magic Surge table (2014 Player's Handbook numbering, paraphrased). Draws get an Apply button from the Wild Surge Effects module." },
  { key: "2024", name: "Wild Magic Surge 5.5E", formula: "1d100",
    description: "Wild Magic Surge table (2024 Player's Handbook numbering, paraphrased). Draws get an Apply button from the Wild Surge Effects module." },
  { key: "celestial", name: "Celestial Surge", formula: "1d20",
    description: "Celestial Surge (homebrew). Enable Celestial Surge in the module settings to get the Apply button on draws." }
];

function resultFor(tableId, tableKey, row) {
  const _id = id(`${tableKey}:${row.min}`);
  const e = row.key ? EFFECTS[row.key] : null;
  const name = e ? e.name : row.name;
  const description = e ? e.text : row.text;
  return {
    _id,
    type: "text",
    name,
    description,
    text: `<strong>${name}.</strong> ${description}`, // Foundry 12 field
    img: e ? `modules/${MOD}/icons/${e.key}.svg` : "icons/svg/d20-black.svg",
    weight: 1,
    range: [row.min, row.max],
    drawn: false,
    flags: { [MOD]: { row: rangeLabel(row), ...(e ? { key: e.key } : {}) } },
    _key: `!tables.results!${tableId}.${_id}`
  };
}

rmSync(SRC, { recursive: true, force: true });
mkdirSync(SRC, { recursive: true });
for (const def of TABLE_DEFS) {
  const _id = id(`table:${def.key}`);
  const table = {
    _id,
    name: def.name,
    img: "icons/svg/d20-black.svg",
    description: def.description,
    formula: def.formula,
    replacement: true,
    displayRoll: true,
    results: TABLES[def.key].map(row => resultFor(_id, def.key, row)),
    flags: { [MOD]: { table: def.key } },
    _key: `!tables!${_id}`
  };
  const file = def.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
  writeFileSync(join(SRC, `${file}.json`), `${JSON.stringify(table, null, 2)}\n`);
  console.log(`${def.name}: ${table.results.length} results`);
}

if (!process.argv.includes("--source")) {
  const { compilePack } = await import("@foundryvtt/foundryvtt-cli");
  rmSync(OUT, { recursive: true, force: true });
  await compilePack(SRC, OUT, { log: true });
}
