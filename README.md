# Wild Surge Effects (dnd5e, 2014 & 2024 tables + Celestial Surge)

A Foundry VTT module that turns every result of the 2014 and 2024 Wild Magic Surge tables into something you can apply in one click.

**Which table?** The panel has a *Surge table* dropdown (2014 / 2024) that any player can change for themselves, also under *Configure Settings > Wild Surge Effects > My surge table*. The GM sets the default for everyone with *Surge table*; on *Auto* it looks at the world roll table named exactly `Wild Magic Surge` (the name is editable in *Wild Magic Surge table name*) (25 rows = 2024, 50 rows = 2014), otherwise the dnd5e rules version. The 2024 sub-rolls (d4 creature, d8 oddity, d10 random spell, d6 restoration) are rolled and applied for you.


- **Lasting results** become real Active Effects (status effects) with durations and mechanical changes. They are normal effects on the actor, so they show on the character sheet under **Effects > Temporary Effects**, where you can toggle or delete them like any other effect.
- **Instant results** (Fireball on self, regain 2d10 HP, regain a spell slot, regain sorcery points, lightning strike...) are resolved directly: rolls are made, HP/slots/sorcery points are restored, and the spell is linked in chat.

Requires Foundry VTT v12-v14 and dnd5e 4.0+ (written for Foundry 14 / dnd5e 6 data formats, with fallbacks for older versions).

## Install

1. **Easiest:** in Foundry, Install Module and paste the manifest URL `https://github.com/GuzekAlan/wild-magic-surge-effects/releases/latest/download/module.json`.

   **Manual:** unzip `module.zip` into your Foundry user data folder so you get `Data/modules/wild-surge-effects/module.json`.
   - Windows: `%localappdata%/FoundryVTT/Data/modules/`
   - macOS: `~/Library/Application Support/FoundryVTT/Data/modules/`
   - Linux: `~/.local/share/FoundryVTT/Data/modules/`
   - The Forge / hosted: upload the zip through your host's module import / file manager.
2. Restart Foundry (or return to setup), launch your world, and enable **Wild Surge Effects** under *Game Settings > Manage Modules*.

## Use

- **Character sheet:** click the **Wild Magic Surge** (hat) button in the sheet header to open the surge panel for that character. Roll d100, apply results, or switch lasting effects on/off. Active effects are listed under *Effects > Temporary Effects*.
- **Token toolbar:** the same panel is under the hat-wizard button in the token controls (uses the selected token).
- **Token HUD (optional):** off by default. Turn on *Show surge effects in the Token HUD* in module settings if you want icons there too.
- **Roll table draws:** when the roll table with the configured name (default `Wild Magic Surge`, or `Celestial Surge` when enabled) is drawn (also when the *Wild Magic Surge 5e* module rolls it for you), the chat message gets an **Apply** button.
- **Macro:** `game.modules.get("wild-surge-effects").api.applyByRoll(actor, 52)` or `.api.open()`.

## What is automated (2014 numbering shown; the 2024 table uses the same effects)

| Result | Automation |
|---|---|
| 01-02 Surge every turn | 1 min, chat reminder at the start of each of your turns |
| 03-04 See invisibility | 1 min, adds "See Invisible" to special senses |
| 11-12 / 35-36 Height / age | d10 rolled on apply and shown in the effect name |
| 15-16 Regeneration | 1 min, heals 5 HP at the start of each of your turns |
| 25-26 Third eye | 1 min, advantage on Perception |
| 31-32 Astral Plane | until end of your next turn |
| 39-40 2d10 HP | rolled and healed |
| 41-42 Potted plant | until start of next turn, Incapacitated, vulnerable to all damage |
| 51-52 Spectral shield | 1 min, +2 AC |
| 53-54 Alcohol immunity | 5d6 days rolled |
| 59-60 Spell slot | lowest expended slot restored |
| 67-68 Frightened | until end of your next turn |
| 69-70 Mass invisibility | 1 min, Invisible on you and your targeted tokens |
| 71-72 Resistance | 1 min, resistance to every damage type |
| 73-74 Poison | Poisoned for 1d4 hours on your targeted token |
| 75-76 Glow | 1 min, token emits 30/60 ft light (restored afterwards) |
| 87-88 Fly | 10 min, 60 ft fly speed on target (or you) |
| 89-90 Invisibility | 1 min, Invisible |
| 93-94 Growth | 1 min, size one category larger |
| 95-96 Piercing vulnerability | 1 min, on you and targeted tokens |
| 99-00 Sorcery points | Font of Magic / Sorcery Points uses restored |

Everything else with a duration (modron, unicorn, bubbles, shouting, mirror image, levitate...) is an effect with the right duration and description, so you can see it on the token and it falls off on time.

Expired surge effects are removed automatically by the GM's client when game time or combat turns pass their duration (can be turned off in module settings).

## Celestial Surge (optional, homebrew)

A d20 table of divine surges. Turn it on with *Configure Settings > Wild Surge Effects > Enable Celestial Surge*. The roll table name defaults to `Celestial Surge` and can be changed in *Celestial Surge table name* (exact match, not case-sensitive).

- In the surge panel, pick **Celestial Surge** in the table dropdown. *Roll d20 & apply* rolls and applies a result.
- Drawing your `Celestial Surge` roll table adds an **Apply** button to the chat message.
- **Results that hit "one random ally/creature" are never applied automatically.** They are marked with ⟶ in the panel. Target the creature (T) or select its token, then click Apply. Targets win over selection.
- If you don't own that creature, the GM's client applies the effect for you, so a GM must be connected.

| d20 | Result | Automation |
|---|---|---|
| 1 | Roll every turn | 1 min, chat reminder at the start of each of your turns |
| 2 | Heretic's Rite ⟶ | Disadvantage on saves and ability checks (remove after the next one) |
| 3 | Accustomed to magic ⟶ | 3 rounds, resistance to a magical damage type you pick |
| 4 | Nature turns its back ⟶ | Until end of your next turn, reminder: no healing |
| 5 | Accustomed to mundane attacks ⟶ | 3 rounds, resistance to bludgeoning, piercing or slashing (you pick) |
| 6 | Withered right hand ⟶ | Until end of your next turn, reminder |
| 7 | Seventh day ⟶ | Opens the short rest dialog for the chosen ally (max Hit Dice = your proficiency bonus) |
| 8 | Prayer time | Incapacitated until the start of your next turn |
| 9 | What doesn't kill you ⟶ | 3 rounds, reminder |
| 10 | Burn the non-believers | Rolls 4d8 fire + 4d8 radiant and shows your spell save DC |
| 11 | Holy weapon ⟶ | 2 rounds, weapon attacks deal +1d8 radiant |
| 12 | Bow before me ⟶ | Prone until the end of the next turn |
| 13 | Gracious lord | 24 h, links Spare the Dying |
| 14 | Mouths that cannot speak ⟶ | Blinded and deafened until the end of your next turn |
| 15 | Eye for an eye | 3 rounds, reminder of the retaliation reaction |
| 16 | He sent his word | Rolls 8d4+8 and heals every targeted (or selected) ally |
| 17 | Do not repay evil | 1 min, reminder |
| 18 | Was dead and is alive | 10 min, reminder |
| 19 | Show nothing but faith ⟶ | AC halved until the start of the next turn |
| 20 | Resist the devil ⟶ | 1 min, removes Frightened, reminder of the resistance |

## Notes

- Effects of "until the start/end of your next turn" only auto-expire in combat; outside combat remove them manually.
- Descriptions are short paraphrases; check the Player's Handbook for the exact wording.

## Releasing a new version

1. Bump `version` in `module.json` and commit to `main`.
2. Push a tag: `git tag v1.2.1 && git push origin v1.2.1`.
3. The *Release module* workflow stamps the version and URLs into `module.json`, builds `module.zip`, and creates the GitHub release with both attached. Foundry then offers the update.
