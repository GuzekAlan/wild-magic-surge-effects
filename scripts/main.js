import { EFFECTS, TABLES, findRow, rangeLabel, heal } from "./surges.js";

const MOD = "wild-surge-effects";
const statusId = e => `wms-${e.key}`;
const iconPath = e => `modules/${MOD}/icons/${e.key}.svg`;
/* Foundry v14 stores durations as {value, units, expiry} and changes as system.changes with a string type. */
const isV14 = () => (game.release?.generation ?? 13) >= 14;
const CHANGE_TYPES = { 1: "multiply", 2: "add", 3: "downgrade", 4: "upgrade", 5: "override" };

function toDuration(d = {}) {
  if (!isV14()) return { ...d };
  if (d.seconds) {
    for (const [units, n] of [["days", 86400], ["hours", 3600], ["minutes", 60]]) {
      if (d.seconds % n === 0) return { value: d.seconds / n, units, expiry: "turnStart" };
    }
    return { value: d.seconds, units: "seconds", expiry: "turnStart" };
  }
  // rounds only = "until the start of your next turn"; rounds + turns = "until the end of your next turn"
  if (d.rounds) return { value: d.rounds, units: "rounds", expiry: d.turns ? "turnEnd" : "turnStart" };
  return {};
}

function toChanges(changes = []) {
  if (!isV14()) return changes;
  return changes.map(c => ({ key: c.key, type: CHANGE_TYPES[c.mode] ?? "add", value: String(c.value) }));
}

function existingChanges(effect) {
  return (isV14() ? effect._source.system?.changes : effect._source.changes) ?? [];
}

const effectOf = ae => EFFECTS[ae.getFlag?.(MOD, "key") ?? ae.flags?.[MOD]?.key];

/* -------------------------------------------- */
/*  Settings & status registration               */
/* -------------------------------------------- */

Hooks.once("init", () => {
  game.settings.register(MOD, "table", {
    name: "Surge table",
    hint: "Default table for everyone. Auto looks at the world roll table named exactly 'Wild Magic Surge' (25 rows = 2024, 50 rows = 2014), otherwise the dnd5e rules version. Players can override this for themselves.",
    scope: "world", config: true, type: String, default: "auto",
    choices: { auto: "Auto-detect", "2014": "2014 (Player's Handbook 2014)", "2024": "2024 (Player's Handbook 2024)" },
    onChange: () => refreshPanel()
  });
  game.settings.register(MOD, "myTable", {
    name: "My surge table (this player only)",
    hint: "Overrides the world's Surge table setting for you only, so players can switch without the GM. Also available as a dropdown in the Wild Magic Surge panel.",
    scope: "client", config: true, type: String, default: "world",
    choices: { world: "Use the world setting", "2014": "2014 (Player's Handbook 2014)", "2024": "2024 (Player's Handbook 2024)" },
    onChange: () => refreshPanel()
  });
  game.settings.register(MOD, "wildTableName", {
    name: "Wild Magic Surge table name",
    hint: "Name of the world roll table used for Wild Magic Surge (exact match, not case-sensitive). Draws from it get an Apply button in chat, and its size picks 2014 vs 2024 on Auto.",
    scope: "world", config: true, type: String, default: "Wild Magic Surge",
    onChange: () => refreshPanel()
  });
  game.settings.register(MOD, "celestialEnabled", {
    name: "Enable Celestial Surge",
    hint: "Adds the homebrew Celestial Surge (d20) table: its results in the surge panel and an Apply button on its roll table draws.",
    scope: "world", config: true, type: Boolean, default: false,
    onChange: () => refreshPanel()
  });
  game.settings.register(MOD, "celestialTableName", {
    name: "Celestial Surge table name",
    hint: "Name of the world roll table used for Celestial Surge (exact match, not case-sensitive).",
    scope: "world", config: true, type: String, default: "Celestial Surge"
  });
  game.settings.register(MOD, "panelMode", { scope: "client", config: false, type: String, default: "wild",
    onChange: () => refreshPanel() });
  game.settings.register(MOD, "showInHud", {
    name: "Show surge effects in the Token HUD",
    hint: "Also list every lasting surge effect as a status icon in the token HUD. Off by default: use the Wild Surge button on the character sheet (or the token toolbar) and manage active effects under the sheet's Effects tab.",
    scope: "world", config: true, type: Boolean, default: false, requiresReload: true
  });
  game.settings.register(MOD, "autoExpire", {
    name: "Remove surge effects when they expire",
    hint: "The GM's client deletes surge effects whose duration has run out (game time or combat turns).",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MOD, "turnAutomation", {
    name: "Turn-start automation",
    hint: "Regeneration heals 5 HP, and 'Surge Every Turn' posts a reminder, at the start of the affected creature's turn.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MOD, "chatCards", {
    name: "Post a chat card when a surge is applied",
    scope: "world", config: true, type: Boolean, default: true
  });

  if (game.release.generation >= 13) {
    Hooks.on("renderChatMessageHTML", (message, html) => injectChatButton(message, html));
  } else {
    Hooks.on("renderChatMessage", (message, html) => injectChatButton(message, html[0] ?? html));
  }
});

/**
 * Active Effect data for a lasting surge. These are ordinary (non-condition) effects, so the
 * dnd5e character sheet lists them under Effects > Temporary Effects (or Passive Effects when
 * they have no duration), where they can be toggled on/off or deleted.
 */
function effectData(e) {
  const changes = toChanges(e.changes ? e.changes() : []);
  return {
    name: `Surge: ${e.name}`,
    img: iconPath(e),
    description: `<p><strong>${e.source ?? "Wild Magic Surge"}.</strong> ${e.text}</p><p><em>${e.mechanics}</em></p>`,
    statuses: [statusId(e), ...(e.statuses ?? [])],
    ...(isV14() ? { system: { changes } } : { changes }),
    duration: toDuration(e.duration),
    flags: { [MOD]: { key: e.key, ...(e.flags ?? {}) } }
  };
}

Hooks.once("setup", () => {
  // Optional token HUD entries. No static _id, so dnd5e treats them as normal effects, not conditions.
  if (!game.settings.get(MOD, "showInHud")) return;
  for (const e of Object.values(EFFECTS)) {
    if (e.kind !== "lasting") continue;
    const { statuses, ...data } = effectData(e);
    const status = { id: statusId(e), ...data, hud: { actorTypes: ["character", "npc"] } };
    if (Array.isArray(CONFIG.statusEffects)) CONFIG.statusEffects.push(status);
    else CONFIG.statusEffects[status.id] = status;
  }
});

Hooks.once("ready", () => {
  migrateConditionEffects();
  game.socket?.on(SOCKET, onSocket);
  game.modules.get(MOD).api = { open: openPanel, applyByRoll, applyEffect: applyEffect, edition, effects: EFFECTS, tables: TABLES };
});

/**
 * Versions 1.0-1.1 created surge effects through the token HUD with fixed ids, which dnd5e 6 turns
 * into hidden "condition" effects. Recreate them as normal effects so they show on the character sheet.
 */
async function migrateConditionEffects() {
  if (!isActiveGM()) return;
  for (const actor of trackedActors()) {
    const old = actor.effects.filter(ae => effectOf(ae) && (ae.type === "condition" || /^wmsurge/.test(ae.id)));
    if (!old.length) continue;
    const data = old.map(ae => {
      const d = ae.toObject();
      delete d._id;
      delete d.type;
      if (d.system) delete d.system.type;
      return d;
    });
    try {
      await actor.deleteEmbeddedDocuments("ActiveEffect", old.map(ae => ae.id));
      await actor.createEmbeddedDocuments("ActiveEffect", data, { [MOD]: { migrated: true } });
    } catch (err) {
      console.warn(`${MOD} | could not migrate surge effects on ${actor.name}`, err);
    }
  }
}

/** The surge table edition in use: "2014" or "2024". */
const sameName = (table, name) => !!name && table?.name?.trim().toLowerCase() === name.trim().toLowerCase();
const wildTableName = () => game.settings.get(MOD, "wildTableName") || "Wild Magic Surge";
const celestialTableName = () => game.settings.get(MOD, "celestialTableName") || "Celestial Surge";
const celestialEnabled = () => game.settings.get(MOD, "celestialEnabled");
/** Tables from this module's "Surge Tables" compendium carry a flag, so imported or renamed copies still count. */
const tableFlag = table => table?.getFlag?.(MOD, "table") ?? table?.flags?.[MOD]?.table;
const isSurgeTable = table => ["2014", "2024"].includes(tableFlag(table)) || sameName(table, wildTableName());
const isCelestialTable = table => celestialEnabled() && (tableFlag(table) === "celestial" || sameName(table, celestialTableName()));

function edition() {
  const mine = game.settings.get(MOD, "myTable");
  if (mine === "2014" || mine === "2024") return mine;
  const set = game.settings.get(MOD, "table");
  if (set === "2014" || set === "2024") return set;
  const named = game.tables?.find(t => sameName(t, wildTableName()));
  const fromTable = editionOfTable(named ?? game.tables?.find(isSurgeTable));
  if (fromTable) return fromTable;
  try {
    return game.settings.get("dnd5e", "rulesVersion") === "modern" ? "2024" : "2014";
  } catch {
    return "2014";
  }
}

function editionOfTable(table) {
  const flag = tableFlag(table);
  if (flag === "2014" || flag === "2024") return flag;
  const n = table?.results?.size;
  if (n === 25) return "2024";
  if (n === 50) return "2014";
  return null;
}

/* -------------------------------------------- */
/*  Effect lifecycle                             */
/* -------------------------------------------- */

Hooks.on("preCreateActiveEffect", (effect, data, options) => {
  const e = effectOf(effect);
  if (!e || options?.[MOD]?.migrated) return;
  const updates = {};
  updates.statuses = [...new Set([...(effect._source.statuses ?? []), statusId(e), ...(e.statuses ?? [])])];
  const combat = game.combat?.started ? game.combat : null;
  if (!isV14()) updates["duration.startTime"] = game.time.worldTime;
  if (combat && !isV14()) {
    updates["duration.combat"] = combat.id;
    updates["duration.startRound"] = combat.round;
    updates["duration.startTurn"] = combat.turn ?? 0;
  }
  if (e.prepare) {
    const p = e.prepare(effect.parent) ?? {};
    if (p.name) updates.name = `Surge: ${p.name}`;
    if (p.duration) for (const [k, v] of Object.entries(toDuration(p.duration))) updates[`duration.${k}`] = v;
    if (p.changes) updates[isV14() ? "system.changes" : "changes"] = [...existingChanges(effect), ...toChanges(p.changes)];
    if (p.note) updates[`flags.${MOD}.note`] = p.note;
  }
  effect.updateSource(updates);
});

Hooks.on("createActiveEffect", async (effect, options, userId) => {
  if (userId !== game.user.id || options?.[MOD]?.migrated) return;
  const e = effectOf(effect);
  if (!e) return;
  const actor = effect.parent;
  if (e.flags?.light && actor) await applyLight(effect, actor, e.flags.light);
  if (game.settings.get(MOD, "chatCards")) await surgeCard(actor, e, effect.getFlag(MOD, "note"), effect.name);
  refreshPanel();
});

Hooks.on("deleteActiveEffect", async (effect, options, userId) => {
  refreshPanel();
  if (userId !== game.user.id) return;
  const prev = effect.getFlag(MOD, "prevLight");
  if (prev) await restoreLight(prev);
});

Hooks.on("updateActiveEffect", () => refreshPanel());
Hooks.on("controlToken", () => refreshPanel());

async function applyLight(effect, actor, light) {
  const prev = {};
  for (const token of actor.getActiveTokens(false, true)) {
    if (!token.isOwner) continue;
    prev[token.id] = { sceneId: token.parent.id, light: {
      bright: token.light.bright, dim: token.light.dim, color: token.light.color, alpha: token.light.alpha } };
    await token.update({ "light.bright": light.bright, "light.dim": light.dim, "light.color": light.color, "light.alpha": light.alpha });
  }
  if (Object.keys(prev).length) await effect.setFlag(MOD, "prevLight", prev);
}

async function restoreLight(prev) {
  for (const [tokenId, { sceneId, light }] of Object.entries(prev)) {
    const token = game.scenes.get(sceneId)?.tokens.get(tokenId);
    if (token?.isOwner) await token.update({ light });
  }
}

/* -------------------------------------------- */
/*  Expiry and turn-start automation (GM only)    */
/* -------------------------------------------- */

const isActiveGM = () => game.users.activeGM?.isSelf ?? game.user.isGM;

function isExpired(effect) {
  if (isV14()) {
    effect.updateDuration?.();
    return !!effect.duration?.expired;
  }
  const d = effect._source.duration ?? {};
  if (d.seconds) return game.time.worldTime >= (d.startTime ?? 0) + d.seconds;
  if (d.rounds || d.turns) {
    const combat = game.combats.get(d.combat);
    if (!combat?.started) return false;
    const endRound = (d.startRound ?? 0) + (d.rounds ?? 0);
    const endTurn = (d.startTurn ?? 0) + (d.turns ?? 0);
    return combat.round > endRound || (combat.round === endRound && (combat.turn ?? 0) >= endTurn);
  }
  return false;
}

function trackedActors() {
  const actors = new Set(game.actors.contents);
  for (const t of canvas?.scene?.tokens ?? []) if (!t.actorLink && t.actor) actors.add(t.actor);
  for (const c of game.combat?.combatants ?? []) if (c.actor) actors.add(c.actor);
  return actors;
}

async function expireEffects() {
  if (!isActiveGM() || !game.settings.get(MOD, "autoExpire")) return;
  for (const actor of trackedActors()) {
    const ids = actor.effects.filter(ae => effectOf(ae) && isExpired(ae)).map(ae => ae.id);
    if (!ids.length) continue;
    try {
      await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    } catch (err) {
      console.debug(`${MOD} | expired effects already removed`, err);
    }
  }
}

Hooks.on("updateWorldTime", () => expireEffects());

Hooks.on("updateCombat", async (combat, changed) => {
  if (!("turn" in changed || "round" in changed)) return;
  if (!isActiveGM()) return;
  await expireEffects();
  if (!game.settings.get(MOD, "turnAutomation")) return;
  const actor = combat.combatant?.actor;
  if (!actor) return;
  for (const ae of actor.effects) {
    if (!effectOf(ae) || ae.disabled) continue;
    const flags = ae.flags[MOD] ?? {};
    if (flags.regen) {
      const healed = await heal(actor, flags.regen);
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
        content: `<p><strong>${ae.name}:</strong> regained ${healed} HP at the start of the turn.</p>` });
    }
    if (flags.reminder) {
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
        content: `<p><strong>${ae.name}:</strong> ${flags.reminder}</p>` });
    }
  }
});

/* -------------------------------------------- */
/*  Applying surges                              */
/* -------------------------------------------- */

function selectedActor() {
  return canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
}

async function spellLink(name) {
  if (!name) return "";
  const packs = ["dnd5e.spells", "dnd5e.spells24"].map(id => game.packs.get(id)).filter(Boolean);
  for (const pack of packs) {
    const entry = pack.index.find(e => e.name === name);
    if (entry) return `@UUID[${entry.uuid ?? `Compendium.${pack.collection}.Item.${entry._id}`}]{${name}}`;
  }
  return `<em>${name}</em>`;
}

async function surgeCard(actor, e, extra, title) {
  const spell = await spellLink(e.spell);
  const content = `<div class="wse-card">
    <header><img src="${iconPath(e)}" width="36" height="36"/><h3>${title ?? e.name}</h3></header>
    <p class="wse-range">${e.source ?? "Wild Magic Surge"}</p>
    <p>${e.text}</p>
    ${spell ? `<p>Spell: ${spell}</p>` : ""}
    <p class="wse-mech">${e.mechanics}</p>
    ${extra ? `<p class="wse-note">${extra}</p>` : ""}
  </div>`;
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
}

/* ---- GM relay: players can't edit actors they don't own, so the GM's client does it. ---- */

const SOCKET = `module.${MOD}`;

async function onSocket(msg) {
  if (!isActiveGM() || !msg?.op) return;
  const actor = await fromUuid(msg.uuid);
  if (!actor) return;
  if (msg.op === "create") await actor.createEmbeddedDocuments("ActiveEffect", [msg.data]);
  else if (msg.op === "delete") await actor.effects.get(msg.effectId)?.delete();
  else if (msg.op === "enable") await actor.effects.get(msg.effectId)?.update({ disabled: false });
  else if (msg.op === "heal") await heal(actor, msg.amount);
  else if (msg.op === "removeStatus") await removeStatus(actor, msg.status);
  else if (msg.op === "shortRest") await actor.shortRest?.();
}

function viaGM(op, actor, extra = {}) {
  if (!game.users.activeGM) {
    ui.notifications.warn(`You don't own ${actor.name} and no GM is connected to apply it for you.`);
    return false;
  }
  game.socket.emit(SOCKET, { op, uuid: actor.uuid, ...extra });
  return true;
}

async function removeStatus(actor, status) {
  const ids = actor.effects.filter(ae => ae.statuses?.has?.(status)).map(ae => ae.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
}

/** Tokens a "random ally/creature" result goes to: your targets (T), else your selected tokens. */
function chosenActors() {
  const targets = [...game.user.targets].map(t => t.actor).filter(Boolean);
  if (targets.length) return targets;
  return (canvas?.tokens?.controlled ?? []).map(t => t.actor).filter(Boolean);
}

async function chooseOption(choice) {
  const labelOf = t => game.i18n.localize(CONFIG.DND5E?.damageTypes?.[t]?.label ?? t);
  const options = choice.options.map(t => `<option value="${t}">${labelOf(t)}</option>`).join("");
  const { DialogV2 } = foundry.applications.api;
  return DialogV2.wait({
    window: { title: choice.label },
    content: `<div class="form-group"><label>Damage type</label><select name="choice">${options}</select></div>`,
    buttons: [{
      action: "ok", label: "Apply", default: true,
      callback: (event, button) => button.form.elements.choice.value
    }],
    rejectClose: false
  });
}

/* ---- Instant results that need the module's helpers ---- */

const RUNNERS = {
  async sacredFlames(actor) {
    const dc = actor.system.attributes?.spell?.dc ?? actor.system.attributes?.spelldc ?? "your spell save";
    const roll = await new Roll("4d8[fire] + 4d8[radiant]").evaluate();
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `Celestial Surge: Burn the Non-believers. Creatures within 20 ft make a DC ${dc} Constitution save (half damage on a success).` });
    return null;
  },
  async massHeal(actor) {
    const allies = chosenActors();
    if (!allies.length) return "Target (T) or select the allies within 30 ft, then resolve again.";
    const roll = await new Roll("8d4 + 8").evaluate();
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: "Celestial Surge: allies within 30 ft regain 8d4+8 HP." });
    for (const a of allies) {
      if (a.isOwner) await heal(a, roll.total);
      else viaGM("heal", a, { amount: roll.total });
    }
    return `Healed ${allies.map(a => a.name).join(", ")} for up to ${roll.total} HP.`;
  },
  async shortRest() {
    const allies = chosenActors();
    if (!allies.length) return "Target (T) or select the ally, then resolve again.";
    for (const a of allies) {
      if (a.isOwner) await a.shortRest?.();
      else viaGM("shortRest", a);
    }
    return `Short rest for ${allies.map(a => a.name).join(", ")} (max Hit Dice = your proficiency bonus).`;
  }
};

/** Apply (or toggle) a single effect from the pool on an actor. */
async function applyEffect(actor, keyOrEffect, { toggle = false } = {}) {
  const e = typeof keyOrEffect === "string" ? EFFECTS[keyOrEffect] : keyOrEffect;
  if (!e) return;
  if (!actor) return ui.notifications.warn("Select a token (or assign a character) first.");

  if (e.kind === "instant") {
    const run = typeof e.run === "string" ? RUNNERS[e.run] : e.run;
    const result = run ? await run(actor) : null;
    if (game.settings.get(MOD, "chatCards") || result) await surgeCard(actor, e, result);
    return;
  }

  // Who gets it
  const targets = [...game.user.targets].map(t => t.actor).filter(Boolean);
  let recipients;
  if (e.random) {
    // "One random ally/creature": never applied automatically, you choose the token.
    recipients = chosenActors();
    if (!recipients.length) {
      return ui.notifications.warn(`${e.name} hits a random creature: target (T) or select its token, then apply again.`);
    }
  }
  else if (e.targets === "targets") recipients = targets.length ? targets : [actor];
  else if (e.targets === "self+targets") recipients = [actor, ...targets.filter(a => a !== actor)];
  else recipients = [actor];

  // Build the data once (so a damage-type choice is asked only once)
  let data = null;
  const build = async () => {
    if (data) return data;
    data = effectData(e);
    if (e.choose) {
      const value = await chooseOption(e.choose);
      if (!value) return null;
      const extra = e.choose.apply(value);
      if (extra.name) data.name = `Surge: ${extra.name}`;
      const changes = toChanges(extra.changes ?? []);
      if (isV14()) data.system.changes.push(...changes);
      else data.changes.push(...changes);
    }
    return data;
  };

  for (const a of recipients) {
    const existing = a.effects.find(ae => ae.getFlag(MOD, "key") === e.key);
    if (existing && toggle) {
      if (a.isOwner) await existing.delete();
      else viaGM("delete", a, { effectId: existing.id });
      continue;
    }
    if (existing) {
      if (existing.disabled) {
        if (a.isOwner) await existing.update({ disabled: false });
        else viaGM("enable", a, { effectId: existing.id });
      }
      continue;
    }
    const d = await build();
    if (!d) return;
    for (const status of e.removeStatuses ?? []) {
      if (a.isOwner) await removeStatus(a, status);
      else viaGM("removeStatus", a, { status });
    }
    if (a.isOwner) await a.createEmbeddedDocuments("ActiveEffect", [d]);
    else viaGM("create", a, { data: d });
  }
}

/** Apply a table row: either a single effect, or a sub-roll ("Roll 1dX") that picks one. */
async function applyRow(actor, row) {
  if (!actor) return ui.notifications.warn("Select a token (or assign a character) first.");
  if (row.key) return applyEffect(actor, row.key);
  const roll = await new Roll(row.formula).evaluate();
  const pick = row.options[roll.total - 1];
  const keys = Array.isArray(pick) ? pick : [pick];
  const names = keys.map(k => EFFECTS[k].name).join(", ");
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `Wild Surge ${rangeLabel(row)} ${row.name}: ${roll.total} → ${names}` });
  for (const k of keys) await applyEffect(actor, k);
}

/** Apply the surge matching a d100 total (1-100). */
async function applyByRoll(actor, total, ed = edition()) {
  const row = findRow(ed, total);
  if (row) await applyRow(actor ?? selectedActor(), row);
  return row;
}

async function rollAndApply(actor) {
  if (!actor) return ui.notifications.warn("Select a token (or assign a character) first.");
  const ed = panelTable();
  const celestial = ed === "celestial";
  const roll = await new Roll(celestial ? "1d20" : "1d100").evaluate();
  const row = findRow(ed, roll.total);
  const title = celestial ? celestialTableName() : `${wildTableName()} (${ed})`;
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${title}: ${rangeLabel(row)} ${rowName(row)}` });
  await applyRow(actor, row);
}

const rowName = row => (row.key ? EFFECTS[row.key].name : row.name);

/** Table shown in the panel: "celestial", or the Wild Magic edition. */
function panelTable() {
  return (game.settings.get(MOD, "panelMode") === "celestial" && celestialEnabled()) ? "celestial" : edition();
}

/* -------------------------------------------- */
/*  Chat button on Wild Magic table draws         */
/* -------------------------------------------- */

async function tableForMessage(message) {
  const id = message.getFlag?.("core", "RollTable");
  if (!id) return null;
  const world = game.tables.get(id);
  if (world) return world;
  for (const pack of game.packs.filter(p => p.documentName === "RollTable")) {
    if (pack.index.has(id)) return pack.getDocument(id);
  }
  return null;
}

async function injectChatButton(message, html) {
  if (!message.getFlag?.("core", "RollTable") || html.querySelector(".wse-apply")) return;
  const total = message.rolls?.[0]?.total;
  if (!total) return;
  // Only the tables named in the settings (exact name). If the table can't be looked up
  // (e.g. it was deleted), fall back to the message mentioning that exact name.
  const table = await tableForMessage(message);
  const text = `${message.flavor ?? ""} ${message.content ?? ""}`;
  let ed;
  if (table ? isCelestialTable(table) : (celestialEnabled() && text.includes(celestialTableName()))) ed = "celestial";
  else if (table ? isSurgeTable(table) : text.includes(wildTableName())) ed = editionOfTable(table) ?? edition();
  else return;
  const row = findRow(ed, total);
  if (!row || html.querySelector(".wse-apply")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "wse-apply";
  const random = row.key && EFFECTS[row.key].random;
  btn.innerHTML = `<i class="fas fa-hat-wizard"></i> Apply ${rangeLabel(row)} ${rowName(row)}${random ? " to targeted/selected token" : ""}`;
  btn.addEventListener("click", ev => {
    ev.preventDefault();
    applyRow(selectedActor() ?? ChatMessage.getSpeakerActor(message.speaker), row);
  });
  (html.querySelector(".message-content") ?? html).append(btn);
}

/* -------------------------------------------- */
/*  Scene control button                          */
/* -------------------------------------------- */

Hooks.on("getSceneControlButtons", controls => {
  const tool = {
    name: "wild-surge", title: "Wild Magic Surge", icon: "fas fa-hat-wizard", button: true,
    onClick: () => openPanel(), onChange: () => openPanel()
  };
  if (Array.isArray(controls)) controls.find(c => c.name === "token")?.tools.push(tool);
  else if (controls.tokens?.tools) controls.tokens.tools["wild-surge"] = { ...tool, order: Object.keys(controls.tokens.tools).length };
});

/* -------------------------------------------- */
/*  Surge panel                                  */
/* -------------------------------------------- */

const { ApplicationV2 } = foundry.applications.api;

class SurgePanel extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wild-surge-panel",
    classes: ["wse-panel"],
    tag: "div",
    window: { title: "Wild Magic Surge", icon: "fas fa-hat-wizard", resizable: true },
    position: { width: 580, height: 700 },
    actions: {
      toggle: SurgePanel.onToggle,
      resolve: SurgePanel.onResolve,
      subroll: SurgePanel.onSubroll,
      roll: SurgePanel.onRoll
    }
  };

  filter = "";

  async _renderHTML() {
    const actor = panelActor();
    const ed = panelTable();
    const active = new Set();
    for (const ae of actor?.effects ?? []) { const e = effectOf(ae); if (e && !ae.disabled) active.add(e.key); }

    const button = e => {
      if (e.kind === "instant") return `<button type="button" data-action="resolve" data-key="${e.key}">Resolve</button>`;
      const on = active.has(e.key);
      return `<button type="button" data-action="toggle" data-key="${e.key}" class="${on ? "on" : ""}">${on ? "On" : "Off"}</button>`;
    };
    const effectRow = (e, range, sub = false) => {
      const search = `${range} ${e.name} ${e.text}`.toLowerCase().replace(/"/g, "");
      return `<li class="wse-row ${sub ? "sub" : ""} ${active.has(e.key) ? "active" : ""}" data-search="${search}">
        <span class="wse-r">${range}</span>
        <img src="${iconPath(e)}" alt=""/>
        <div class="wse-body"><strong>${e.random ? "⟶ " : ""}${e.name}</strong><span>${e.mechanics}</span></div>
        ${button(e)}
      </li>`;
    };
    const rows = TABLES[ed].map((row, i) => {
      const range = rangeLabel(row);
      if (row.key) return effectRow(EFFECTS[row.key], range);
      const subs = row.options.map((opt, n) => (Array.isArray(opt)
        ? `<li class="wse-row sub" data-search="${range} all"><span class="wse-r">${n + 1}</span><span></span><div class="wse-body"><strong>All of the d8 oddities</strong><span>Use the d8 list above.</span></div><span></span></li>`
        : effectRow(EFFECTS[opt], String(n + 1), true))).join("");
      const search = `${range} ${row.name} ${row.text}`.toLowerCase().replace(/"/g, "");
      return `<li class="wse-row group" data-search="${search}">
          <span class="wse-r">${range}</span><span></span>
          <div class="wse-body"><strong>${row.name}</strong><span>${row.text}</span></div>
          <button type="button" data-action="subroll" data-index="${i}">Roll ${row.formula.slice(1)}</button>
        </li>${subs}`;
    }).join("");

    return `<div class="wse-top">
        <div class="wse-actor">${actor ? `<img src="${actor.img}"/><span>${actor.name}</span>` : "<em>Select a token</em>"}</div>
        <button type="button" data-action="roll" ${actor ? "" : "disabled"}><i class="fas fa-dice-d20"></i> Roll ${ed === "celestial" ? "d20" : "d100"} &amp; apply</button>
      </div>
      <input type="search" class="wse-filter" placeholder="Filter results..." value="${this.filter}"/>
      <label class="wse-table">Surge table:
        <select class="wse-edition">
          <option value="2014" ${ed === "2014" ? "selected" : ""}>${wildTableName()} (2014)</option>
          <option value="2024" ${ed === "2024" ? "selected" : ""}>${wildTableName()} (2024)</option>
          ${celestialEnabled() ? `<option value="celestial" ${ed === "celestial" ? "selected" : ""}>${celestialTableName()}</option>` : ""}
        </select>
      </label>
      ${ed === "celestial" ? `<p class="wse-hint">Results marked ⟶ hit a random creature: target (T) or select its token first.</p>` : ""}
      <ul class="wse-list">${rows}</ul>`;
  }

  _replaceHTML(result, content) {
    content.innerHTML = result;
  }

  _onRender() {
    this.element.querySelector(".wse-edition")?.addEventListener("change", async ev => {
      // client settings: work for players too
      const value = ev.target.value;
      if (value === "celestial") return game.settings.set(MOD, "panelMode", "celestial");
      await game.settings.set(MOD, "myTable", value);
      await game.settings.set(MOD, "panelMode", "wild");
    });
    const input = this.element.querySelector(".wse-filter");
    const apply = () => {
      this.filter = input.value;
      const q = input.value.toLowerCase().trim();
      for (const li of this.element.querySelectorAll(".wse-row")) li.hidden = q && !li.dataset.search.includes(q);
    };
    input?.addEventListener("input", apply);
    apply();
  }

  static async onToggle(event, target) {
    await applyEffect(panelActor(), target.dataset.key, { toggle: true });
  }

  static async onResolve(event, target) {
    await applyEffect(panelActor(), target.dataset.key);
  }

  static async onSubroll(event, target) {
    await applyRow(panelActor(), TABLES[panelTable()][Number(target.dataset.index)]);
  }

  static async onRoll() {
    await rollAndApply(panelActor());
  }
}

let panel;
/** Open the surge panel, optionally pinned to a specific actor (e.g. from its character sheet). */
function openPanel(actor = null) {
  panel ??= new SurgePanel();
  panel.actor = actor;
  panel.render({ force: true });
  return panel;
}

function panelActor() {
  const pinned = panel?.actor;
  if (pinned && (pinned.isToken || game.actors.has(pinned.id))) return pinned;
  return selectedActor();
}

/* -------------------------------------------- */
/*  Character sheet header button                 */
/* -------------------------------------------- */

const isSurgeActor = actor => actor && ["character", "npc"].includes(actor.type) && actor.isOwner;

// ApplicationV2 sheets (dnd5e 4.x+ on Foundry v13+)
Hooks.on("getHeaderControlsApplicationV2", (app, controls) => {
  const actor = app.document;
  if (actor?.documentName !== "Actor" || !isSurgeActor(actor)) return;
  if (controls.some(c => c.action === "wildSurge")) return;
  controls.push({
    action: "wildSurge", icon: "fas fa-hat-wizard", label: "Wild Magic Surge",
    onClick: () => openPanel(actor), ownership: "OWNER"
  });
  app.options.actions ??= {};
  app.options.actions.wildSurge ??= () => openPanel(actor);
});

// Application v1 sheets (Foundry v12)
Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
  if (!isSurgeActor(sheet.actor)) return;
  buttons.unshift({ label: "Wild Surge", class: "wild-surge", icon: "fas fa-hat-wizard", onclick: () => openPanel(sheet.actor) });
});

let refreshTimer;
function refreshPanel() {
  if (!panel?.rendered) return;
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => panel.render(), 50);
}
