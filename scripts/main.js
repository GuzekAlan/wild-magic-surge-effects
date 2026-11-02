import { SURGES, findSurge, rangeLabel, heal } from "./surges.js";

const MOD = "wild-surge-effects";
const statusId = s => `wms-${s.key}`;
const staticId = s => `wmsurge${String(s.min).padStart(3, "0")}`.padEnd(16, "0");
const iconPath = s => `modules/${MOD}/icons/surge-${String(s.min).padStart(3, "0")}.svg`;
const surgeByKey = key => SURGES.find(s => s.key === key);
const surgeOfEffect = effect => surgeByKey(effect.getFlag?.(MOD, "key") ?? effect.flags?.[MOD]?.key);

/* -------------------------------------------- */
/*  Settings & status registration               */
/* -------------------------------------------- */

Hooks.once("init", () => {
  game.settings.register(MOD, "showInHud", {
    name: "Show surge effects in the Token HUD",
    hint: "Adds every lasting surge result as a toggleable status icon in the token HUD. They are always available from the Wild Surge panel.",
    scope: "world", config: true, type: Boolean, default: true, requiresReload: true
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
});

Hooks.once("setup", () => {
  const hud = game.settings.get(MOD, "showInHud") ? { actorTypes: ["character", "npc"] } : false;
  for (const s of SURGES) {
    if (s.kind !== "lasting") continue;
    CONFIG.statusEffects.push({
      id: statusId(s),
      _id: staticId(s),
      name: `Surge: ${s.name}`,
      img: iconPath(s),
      description: `<p><strong>Wild Magic Surge ${rangeLabel(s)}.</strong> ${s.text}</p><p><em>${s.mechanics}</em></p>`,
      statuses: [...(s.statuses ?? [])],
      changes: s.changes ? s.changes() : [],
      duration: { ...(s.duration ?? {}) },
      flags: { [MOD]: { key: s.key, ...(s.flags ?? {}) } },
      hud
    });
  }
});

Hooks.once("ready", () => {
  const mod = game.modules.get(MOD);
  mod.api = { open: openPanel, applyByRoll, apply: applySurge, surges: SURGES };
});

/* -------------------------------------------- */
/*  Effect lifecycle                             */
/* -------------------------------------------- */

Hooks.on("preCreateActiveEffect", (effect, data, options, userId) => {
  const s = surgeOfEffect(effect);
  if (!s) return;
  const updates = {};
  const combat = game.combat?.started ? game.combat : null;
  updates["duration.startTime"] = game.time.worldTime;
  if (combat) {
    updates["duration.combat"] = combat.id;
    updates["duration.startRound"] = combat.round;
    updates["duration.startTurn"] = combat.turn ?? 0;
  }
  if (s.prepare) {
    const p = s.prepare(effect.parent) ?? {};
    if (p.name) updates.name = `Surge: ${p.name}`;
    if (p.duration) Object.assign(updates, Object.fromEntries(Object.entries(p.duration).map(([k, v]) => [`duration.${k}`, v])));
    if (p.changes) updates.changes = [...(effect._source.changes ?? []), ...p.changes];
    if (p.note) updates[`flags.${MOD}.note`] = p.note;
  }
  effect.updateSource(updates);
});

Hooks.on("createActiveEffect", async (effect, options, userId) => {
  if (userId !== game.user.id) return;
  const s = surgeOfEffect(effect);
  if (!s) return;
  const actor = effect.parent;
  if (s.flags?.light && actor) await applyLight(effect, actor, s.flags.light);
  if (game.settings.get(MOD, "chatCards")) await surgeCard(actor, s, effect.getFlag(MOD, "note"), effect.name);
  refreshPanel();
});

Hooks.on("deleteActiveEffect", async (effect, options, userId) => {
  refreshPanel();
  if (userId !== game.user.id) return;
  const prev = effect.getFlag(MOD, "prevLight");
  if (prev) await restoreLight(effect.parent, prev);
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

async function restoreLight(actor, prev) {
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
    const ids = actor.effects.filter(e => surgeOfEffect(e) && isExpired(e)).map(e => e.id);
    if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
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
  for (const effect of actor.effects) {
    const s = surgeOfEffect(effect);
    if (!s || effect.disabled) continue;
    const flags = effect.flags[MOD] ?? {};
    if (flags.regen) {
      const healed = await heal(actor, flags.regen);
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
        content: `<p><strong>${effect.name}:</strong> regained ${healed} HP at the start of the turn.</p>` });
    }
    if (flags.reminder) {
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
        content: `<p><strong>${effect.name}:</strong> ${flags.reminder}</p>` });
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

async function surgeCard(actor, s, extra, title) {
  const spell = await spellLink(s.spell);
  const content = `<div class="wse-card">
    <header><img src="${iconPath(s)}" width="36" height="36"/><h3>${title ?? s.name}</h3></header>
    <p class="wse-range">Wild Magic Surge ${rangeLabel(s)}</p>
    <p>${s.text}</p>
    ${spell ? `<p>Spell: ${spell}</p>` : ""}
    <p class="wse-mech">${s.mechanics}</p>
    ${extra ? `<p class="wse-note">${extra}</p>` : ""}
  </div>`;
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
}

/** Apply (or toggle) a surge result on an actor. */
async function applySurge(actor, surgeOrKey, { toggle = false } = {}) {
  const s = typeof surgeOrKey === "string" ? surgeByKey(surgeOrKey) : surgeOrKey;
  if (!s) return;
  if (!actor) return ui.notifications.warn("Select a token (or assign a character) first.");

  if (s.kind === "instant") {
    const result = s.run ? await s.run(actor) : null;
    if (game.settings.get(MOD, "chatCards") || result) await surgeCard(actor, s, result);
    return;
  }

  const recipients = [];
  const targets = [...game.user.targets].map(t => t.actor).filter(Boolean);
  if (s.targets === "targets") recipients.push(...(targets.length ? targets : [actor]));
  else if (s.targets === "self+targets") recipients.push(actor, ...targets.filter(a => a !== actor));
  else recipients.push(actor);

  for (const a of recipients) {
    if (!a.isOwner) {
      ui.notifications.warn(`You don't have permission to modify ${a.name}. Ask the GM to apply ${s.name}.`);
      continue;
    }
    const active = toggle ? undefined : true;
    await a.toggleStatusEffect(statusId(s), { active });
  }
}

/** Apply the surge matching a d100 total (1-100). */
async function applyByRoll(actor, total) {
  const s = findSurge(total);
  if (s) await applySurge(actor ?? selectedActor(), s);
  return s;
}

async function rollAndApply(actor) {
  if (!actor) return ui.notifications.warn("Select a token (or assign a character) first.");
  const roll = await new Roll("1d100").evaluate();
  const s = findSurge(roll.total);
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `Wild Magic Surge: ${rangeLabel(s)} ${s.name}` });
  await applySurge(actor, s);
}

/* -------------------------------------------- */
/*  Chat button on Wild Magic table draws         */
/* -------------------------------------------- */

function injectChatButton(message, html) {
  const tableId = message.getFlag?.("core", "RollTable");
  if (!tableId || html.querySelector(".wse-apply")) return;
  const table = game.tables.get(tableId);
  const label = `${table?.name ?? ""} ${message.flavor ?? ""} ${message.content ?? ""}`;
  if (!/wild|surge/i.test(label)) return;
  const total = message.rolls?.[0]?.total;
  if (!total) return;
  const s = findSurge(total);
  if (!s) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "wse-apply";
  btn.innerHTML = `<i class="fas fa-hat-wizard"></i> Apply ${rangeLabel(s)} ${s.name}`;
  btn.addEventListener("click", ev => {
    ev.preventDefault();
    const actor = selectedActor() ?? ChatMessage.getSpeakerActor(message.speaker);
    applySurge(actor, s);
  });
  (html.querySelector(".message-content") ?? html).append(btn);
}

Hooks.once("init", () => {
  if (game.release.generation >= 13) {
    Hooks.on("renderChatMessageHTML", (message, html) => injectChatButton(message, html));
  } else {
    Hooks.on("renderChatMessage", (message, html) => injectChatButton(message, html[0] ?? html));
  }
});

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
    position: { width: 560, height: 680 },
    actions: {
      toggle: SurgePanel.onToggle,
      resolve: SurgePanel.onResolve,
      roll: SurgePanel.onRoll
    }
  };

  filter = "";

  async _renderHTML() {
    const actor = selectedActor();
    const active = new Set();
    for (const e of actor?.effects ?? []) { const s = surgeOfEffect(e); if (s) active.add(s.key); }
    const row = s => {
      const on = active.has(s.key);
      const btn = s.kind === "lasting"
        ? `<button type="button" data-action="toggle" data-key="${s.key}" class="${on ? "on" : ""}">${on ? "On" : "Off"}</button>`
        : `<button type="button" data-action="resolve" data-key="${s.key}">Resolve</button>`;
      const search = `${rangeLabel(s)} ${s.name} ${s.text}`.toLowerCase().replace(/"/g, "");
      return `<li class="wse-row ${on ? "active" : ""}" data-search="${search}">
        <span class="wse-r">${rangeLabel(s)}</span>
        <img src="${iconPath(s)}" alt=""/>
        <div class="wse-body"><strong>${s.name}</strong><span>${s.mechanics}</span></div>
        ${btn}
      </li>`;
    };
    const lasting = SURGES.filter(s => s.kind === "lasting").map(row).join("");
    const instant = SURGES.filter(s => s.kind === "instant").map(row).join("");
    return `<div class="wse-top">
        <div class="wse-actor">${actor ? `<img src="${actor.img}"/><span>${actor.name}</span>` : "<em>Select a token</em>"}</div>
        <button type="button" data-action="roll" ${actor ? "" : "disabled"}><i class="fas fa-dice-d20"></i> Roll d100 &amp; apply</button>
      </div>
      <input type="search" class="wse-filter" placeholder="Filter results..." value="${this.filter}"/>
      <h4>Lasting effects (toggle on/off)</h4><ul class="wse-list">${lasting}</ul>
      <h4>Instant results</h4><ul class="wse-list">${instant}</ul>`;
  }

  _replaceHTML(result, content) {
    content.innerHTML = result;
  }

  _onRender(context, options) {
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
    await applySurge(selectedActor(), target.dataset.key, { toggle: true });
  }

  static async onResolve(event, target) {
    await applySurge(selectedActor(), target.dataset.key);
  }

  static async onRoll() {
    await rollAndApply(selectedActor());
  }
}

let panel;
function openPanel() {
  panel ??= new SurgePanel();
  panel.render({ force: true });
  return panel;
}

let refreshTimer;
function refreshPanel() {
  if (!panel?.rendered) return;
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => panel.render(), 50);
}
