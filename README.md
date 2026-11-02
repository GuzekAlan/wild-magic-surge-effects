# Wild Surge Effects (dnd5e, 2014 table)

A Foundry VTT module that turns every result of the 2014 (PHB) Wild Magic Surge table into something you can apply in one click:

- **36 lasting results** become real Active Effects (status effects) with durations and mechanical changes. Toggle them on/off from the token HUD or the Wild Surge panel.
- **14 instant results** (Fireball on self, regain 2d10 HP, regain a spell slot, regain sorcery points, lightning strike...) are resolved directly: rolls are made, HP/slots/sorcery points are restored, and the spell is linked in chat.

Requires Foundry VTT v12 or v13 and dnd5e 4.0+.

## Install

1. Unzip `wild-surge-effects.zip` into your Foundry user data folder so you get `Data/modules/wild-surge-effects/module.json`.
   - Windows: `%localappdata%/FoundryVTT/Data/modules/`
   - macOS: `~/Library/Application Support/FoundryVTT/Data/modules/`
   - Linux: `~/.local/share/FoundryVTT/Data/modules/`
   - The Forge / hosted: upload the zip through your host's module import / file manager.
2. Restart Foundry (or return to setup), launch your world, and enable **Wild Surge Effects** under *Game Settings > Manage Modules*.

## Use

- **Panel:** select your token, then click the hat-wizard button in the token controls (left toolbar). The panel lists all 50 results with On/Off toggles for lasting ones and *Resolve* for instant ones. **Roll d100 & apply** rolls the surge and applies the result.
- **Token HUD:** right-click your token. Every lasting surge appears as a numbered status icon (the number is the low end of its d100 range, e.g. `51` = 51-52 Spectral Shield).
- **Roll table draws:** when a roll table whose name contains "Wild" or "Surge" is drawn (also when the *Wild Magic Surge 5e* module rolls it for you), the chat message gets an **Apply** button.
- **Macro:** `game.modules.get("wild-surge-effects").api.applyByRoll(actor, 52)` or `.api.open()`.

## What is automated

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

## Notes

- Effects of "until the start/end of your next turn" only auto-expire in combat; outside combat remove them manually.
- The chat Apply button assumes the table uses the 2014 d100 numbering.
- Descriptions are short paraphrases; check the Player's Handbook for the exact wording.
