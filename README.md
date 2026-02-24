# 2026-group-25
2026 COMSM0166 group 25

# COMSM0166 Project Template
A project template for the Software Engineering Discipline and Practice module (COMSM0166).

## Info

This is the template for your group project repo/report. We'll be setting up your repo and assigning you to it after the group forming activity. You can delete this info section, but please keep the rest of the repo structure intact.

You will be developing your game using [P5.js](https://p5js.org) a javascript library that provides you will all the tools you need to make your game. However, we won't be teaching you javascript, this is a chance for you and your team to learn a (friendly) new language and framework quickly, something you will almost certainly have to do with your summer project and in future. There is a lot of documentation online, you can start with:

- [P5.js tutorials](https://p5js.org/tutorials/) 
- [Coding Train P5.js](https://thecodingtrain.com/tracks/code-programming-with-p5-js) course - go here for enthusiastic video tutorials from Dan Shiffman (recommended!)

## Your Game (change to title of your game)

(STRAPLINE. Add an exciting one sentence description of your game here.)
A pixel-art arcade survival shooter, maneuver left and right on an auto-scrolling battlefield while suppressing enemy fire. Weigh risks through “Buff/Debuff Selection Gates,” then use combat-dropped coins to unlock rewards outside the match to tackle tougher waves.

IMAGE. Add an image of your game here, keep this updated with a snapshot of your latest development.

LINK. Add a link here to your deployed game, you can also make the image above link to your game if you wish. Your game lives in the [/docs](/docs) folder, and is published using Github pages. 

drawing app: [here](https://uob-comsm0166.github.io/2026-group-25/)

VIDEO. Include a demo video of your game here (you don't have to wait until the end, you can insert a work in progress video)

## Your Group

![0130_1](https://github.com/user-attachments/assets/36302454-9711-4d80-8e8f-009c0f76e488)


- Lichong YAO, zi25826@bristol.ac.uk, Designer
- Yusheng Yang, vj25954@bristol.ac.uk, Manager
- Zhiqin Lin, pu25346@bristol.ac.uk, Coder
- Yulun Wu,sq25375@bristol.ac.uk, Testing engineer
- Yiyang Dong, hh25303@bristol.ac.uk, Coder

## Project Report

### 1. Introduction

- 5% ~250 words 
- Describe your game, what is based on, what makes it novel? (what's the "twist"?)  

     Our game is a pixel-art, on-rails survival shooter, inspired by modern survival shooters and the punchy arcade feel of classics like _Contra_, _Metal Slug_. The player advances automatically through a hostile battlefield and can only move left and right, turning every second into a trade-off between positioning and firepower. Shooting is automatic, so survival depends on reading enemy patterns, dodging bullets, and choosing the safest lane under constant forward momentum.
  
     The twist is a two-layer progression system that makes each run feel tactical and long-term. In-run “upgrade gates” and drops let players rapidly evolve their build by changing how they shoot (fire rate, bullet count, and bullet types such as spread shots, fire rounds, and piercing rounds). Meanwhile, defeated enemies drop coins that feed an out-of-run shop, where players permanently improve stats (damage, rate of fire, and elemental/attribute effects) and unlock stronger weapons. At fixed waves, the shop appears mid-run, forcing players to decide whether to spend now for immediate power or save for a bigger upgrade later.
  
     By combining constrained movement, automatic fire, meaningful build choices, and persistent upgrades, the game aims for the classic “one more run” loop—simple to control, but rich in strategy and replayability.  

---

### 2. Requirements 

- 15% ~750 words
- Early stages design. Ideation process. How did you decide as a team what to develop? Use case diagrams, user stories.  

#### 2.1&nbsp;&nbsp;Early Stage Design & Ideation  

During ideation, our team deliberately explored a wide range of game genres and identified their “core loops” and difficulty structures before committing to a concept. Our discussion covered:  

| Game / Genre reference | Core loop / What we analysed | Key design takeaways (what it taught us) | Why we didn't choose it as our main direction |
|---|---|---|---|
| **I Wanna** (precision platformer) | Precision movement + instant-death hazards + trial-and-error checkpoints | Knowledge-based difficulty, pattern recognition + timing, strict hitboxes and “rules of contact”, strong repetition loop | Requires high-precision platforming content and heavy level design time; difficulty tuning is risky for broad accessibility within module timeframe |
| **Buckshot Roulette** (turn-based risk game) | Turn decisions under uncertainty (hidden order/charges) + escalating rounds + items that manipulate information | Strategy layer comes from information control and risk manipulation; strong tension from “known unknowns” | Core tension is mainly turn-based mind games; less aligned with our goal of fast arcade action and real-time dodging/shooting |
| **Blackjack** (risk management model) | Hit/stand decisions under uncertainty; probability-driven risk/reward | Clean example of risk management and readable decision points | Too abstract as a full game direction for our scope; lacks the action/feedback loop we wanted |
| **Vampire Survivors** (auto-attack survival) | Survive a timed run → XP/level-ups → build choices; auto-attacking weapons; elites/chests as “spike moments”; meta-progression between runs | “One more run” loop; build-crafting via upgrades; meta-progression gives long-term goals; hidden math makes progression feel good | **We *did* choose this as the closest foundation**, but decided to remix it with a different control constraint and theme |
| **Our final direction** (on-rails survival shooter) | Auto-scrolling battlefield + **left/right movement only** + **auto upward shooting** → waves escalate → coins → fixed-wave shop → persistent upgrades/unlocks | Keeps controls simple but decision density high (lane choice, threat reading, spending timing). Novel twist: **two-layer progression** (in-run bullet/weapon evolution + out-of-run permanent upgrades) plus **fixed-wave shop milestones** | selected |  

This comparative analysis helped us evaluate ideas against three criteria: (1) clarity of the core loop, (2) depth of decision-making, and (3) feasibility within the module timeframe. We ultimately chose an auto-attack survival shooter direction inspired by the “survive-and-build” structure of Vampire Survivors, but with a distinct arcade identity and control constraint: an on-rails battlefield where the player advances automatically and can only move left/right while firing upward. This constraint increases decision density (lane choice, threat reading, timing purchases) while keeping controls accessible.  

The twist comes from combining in-run build evolution (weapon type, fire rate, bullet count, and bullet behaviours such as spread/fire/piercing) with meta-progression (coins earned from kills used for persistent upgrades and unlocks), plus a fixed-wave shop that introduces predictable strategic milestones—forcing meaningful “spend now vs save later” decisions and giving runs a clear tempo.  

---

#### 2.2&nbsp;&nbsp;Paper Prototype

| **Idea 1 (The version ultimately adopted)** | **Idea 2 (One of the dismissed case)** |
|:--:|:--:|
| ![0217_1](https://github.com/user-attachments/assets/d578d5f3-0aec-4c03-8010-c235f9561890) | ![0217_2](https://github.com/user-attachments/assets/5f7a262b-34e9-45d0-8786-355abe415dfa) |

---

#### 2.3&nbsp;&nbsp;Stakeholders & Onion Model  

We identified stakeholders using an onion model approach:  

Core (Players): casual arcade players who want instant action and short runs; progression-focused players who enjoy long-term unlocks and build crafting.  

Secondary (Testers/Assessors): need clear UI feedback, consistent difficulty ramp, and evidence of design decisions.  

Outer (Developers/Maintainers): our team, who require modular systems (state machine, data-driven configs) for fast iteration and balancing.  

<img width="700" height="633" alt="afc28d4f-42a4-43f6-9c64-56dffc611534" src="https://github.com/user-attachments/assets/3df2c724-9461-466d-ba7c-d25fb816cdd8" />  

---

#### 2.4&nbsp;&nbsp;Use Case Diagram  

The primary actor is the player, who can start a run, control left/right movement, survive through automatic upward shooting, collect coins and pickups, enter the fixed-wave shop, purchase upgrades that modify bullet behaviour (type, count, rate of fire), and view results after game over before restarting.  

A secondary actor, Tester/Assessor, interacts with core flows such as starting a run, verifying HUD and state transitions, and observing game-over behaviour, supporting structured evaluation and reproducibility.  

<img width="700" height="491" alt="4babea9e-123a-43cb-a187-bb05f1b08157" src="https://github.com/user-attachments/assets/063b3f8c-dbb3-42d9-acfc-13dfcfedd006" />  

---

#### 2.5&nbsp;&nbsp;User Stories  

We organised requirements around the **player journey** (start → survive → build → shop → progress), so each epic maps cleanly to a system we can implement, test, and iterate on.

<br>

**Epic A — Start-to-Run Loop (Entering and restarting runs)**  

**Goal:** A player can enter gameplay quickly, pause safely, and repeat runs for testing and balancing.

- **US1 (Start a run):** As a player, I want to start a new run from the menu, so I can get into action quickly.  
  **AC1:** A visible “Start” action transitions to the Run state reliably; run variables reset (HP, wave, coins this run).

- **US2 (Pause and resume):** As a player, I want to pause/resume the game, so I can temporarily stop without losing control.  
  **AC2:** While paused, combat/spawning/scrolling are frozen; on resume, timers continue correctly and inputs are not duplicated.

- **US3 (Repeatable loop for evaluation):** As a tester/assessor, I want a consistent “start → game over → restart” loop, so runs can be repeated for evaluation.  
  **AC3:** Game Over always offers Restart/Return; restarting resets run data but keeps meta-progress.  

<br>

**Epic B — Combat Readability under Constrained Control (L/R only + auto-fire)**  

**Goal:** With only left/right movement and automatic upward shooting, survival still depends on skillful positioning and readable threats.

- **US1 (Left/right movement):** As a player, I want responsive left/right movement with clear boundaries, so dodging feels fair.  
  **AC1:** Movement affects only the x-axis; player stays within screen bounds; movement is frame-rate independent.

- **US2 (Readable feedback):** As a player, I want clear feedback for hits, damage, and pickups, so I understand what is happening in real time.  
  **AC2:** Enemy/projectile/pickup visuals are distinguishable; taking damage provides a clear cue (flash/sound/UI change).  

<br>

**Epic C — Enemy Units, Patterns, and Wave Pressure**  

**Goal:** The game creates escalating challenge through enemy variety and wave structure (not only increasing counts).

- **US1 (Enemy variety):** As a player, I want multiple enemy archetypes, so different situations require different positioning.  
  **AC1:** At least 3 enemy types with distinct behaviours (e.g., basic, ranged, armoured).

- **US2 (Difficulty ramp):** As a player, I want difficulty to increase smoothly over waves/distance, so challenge feels fair rather than random.  
  **AC2:** Spawn rate and/or enemy mix changes by wave; early waves are learnable; mid/late waves clearly intensify.

- **US3 (Data-driven balance):** As a developer, I want waves and enemy parameters to be configurable, so balancing does not require rewriting logic.  
  **AC3:** A wave table/config controls spawn budgets and mixes; changing values changes behaviour without major code edits.  

<br>

**Epic D — In-Run Build Evolution (Weapons and bullets that change how you shoot)**  

**Goal:** Each run supports meaningful build decisions by changing weapon behaviour: gun type, fire rate, bullet count, and bullet types.

- **US1 (Stat upgrades):** As a player, I want upgrades to weapon type, fire rate, and bullet count, so my build changes over the run.  
  **AC1:** Upgrades produce visibly different fire patterns; stacking rules are consistent; values respect caps/constraints.

- **US2 (Bullet types):** As a player, I want distinct bullet types (spread, fire, piercing), so I can adapt to enemy compositions.  
  **AC2:** At least 3 bullet behaviours implemented; each has a clear, testable effect (e.g., spread angles, burn damage, pierce hits).

- **US3 (Fixed-wave shop moments):** As a player, I want shops to appear at fixed waves, so I can plan spending and power spikes.  
  **AC3:** The shop triggers at predefined waves; entering the shop is a distinct state; purchases apply immediately to the current run.  

<br>

**Epic E — Economy and Meta Progression (Coins → persistent upgrades and unlocks)**  

**Goal:** Performance in combat generates coins that feed long-term progression: permanent stat upgrades and weapon unlocks.

- **US1 (Earn coins):** As a player, I want enemies to drop coins, so performance translates into progression.  
  **AC1:** Coins are awarded on kills; collection is reliable; HUD and end-of-run totals match.

- **US2 (Permanent stat upgrades):** As a player, I want to buy persistent upgrades (damage, fire rate, attribute damage), so I feel long-term growth.  
  **AC2:** Upgrades have levels/costs; effects apply in future runs; progress persists across sessions (e.g., local save).

- **US3 (Unlock weapons/equipment):** As a player, I want to unlock stronger weapons (e.g., minigun, rocket launcher), so I can explore different playstyles.  
  **AC3:** Locked items cannot be purchased/equipped; after unlocking, items become available in shop/loadout as designed.  

---

### Design

- 15% ~750 words 
- System architecture. Class diagrams, behavioural diagrams.  

We designed the game around a **state-driven architecture** with small, testable systems. This keeps the codebase maintainable in p5.js and makes it easier to add content (new enemies, new bullet types, new upgrades) without rewriting core logic.  

#### 3.1 High Level System Architecture

At the top level, the game runs as a **finite state machine**:

- **MenuState** → start run / view meta upgrades
- **RunState** → core gameplay loop (scrolling, combat, waves, drops)
- **ShopState** → appears at **fixed waves**, purchases apply immediately
- **GameOverState** → results + restart/return

Inside **RunState**, logic is split into systems:

- **ScrollSystem**: advances the battlefield and triggers wave milestones  
- **WaveManager / Spawner**: spawns enemy groups based on distance/wave tables  
- **EntityManager**: updates and renders all entities (player, enemies, bullets, pickups)  
- **CombatSystem**: handles auto-fire timing and enemy attacks  
- **CollisionSystem**: resolves hits, damage, coin drops, pickup collection  
- **UpgradeSystem**: applies in-run modifiers (fire rate, bullet count, bullet type)  
- **EconomySystem**: coin generation + collection + run summary  
- **PersistenceSystem**: saves meta progression (coins, permanent upgrades, unlocks)  
- **UI/HUD**: renders HP, coins, wave, shop prompts, results

**Design intent:** data-driven configs + small systems → fast balancing and fewer regressions.

---

#### 3.2 Class / Module Design  

Although JavaScript is flexible, we still model core concepts as classes or modules with clear responsibilities:

**Core game objects**  
- **Game**: owns the current state, routes input, calls update/render
- **StateMachine**: handles transitions (menu → run → shop → game over)
- **RunContext**: contains run-time stats/modifiers for the current run

**Entities**  
- **Player**: position (x only), HP, hitbox, auto-fire timer, current weapon/build
- **Enemy (base)**: HP, movement, attack behaviour, hitbox  
  - subclasses or typed configs: `Grunt`, `Shooter`, `Armored`, etc.
- **Projectile**: velocity, damage, bulletType, pierce/burn properties, lifetime
- **Pickup**: coin/heal/upgrade drops

**Configs (JSON-like objects)**  
- **WeaponConfig**: base damage, fireRate, bulletCount, bulletType, spreadAngle, status effects  
- **UpgradeConfig**: cost, tier, modifiers (add/mult), caps, description text  
- **EnemyConfig**: HP, speed, firing pattern, spawn weight  
- **WaveTable**: per-wave spawn budget, enemy mix, shop triggers

---

#### 3.3 Behavioural Diagrams  

We use behavioural diagrams to document *when* things happen and *how* systems interact.

##### (A) State machine behaviour  
Key transitions:
- **MenuState → RunState**: initialise run variables + load current meta upgrades
- **RunState → ShopState**: triggered by WaveManager at fixed wave milestones
- **ShopState → RunState**: apply purchases immediately, resume run
- **RunState → GameOverState**: player HP reaches 0
- **GameOverState → RunState/MenuState**: restart or return  

##### (B) Frame update flow  
Each frame follows a consistent order to avoid bugs (e.g., damage after movement, drops after deaths):

- Read input (left/right) → update player position  
- Advance scroll → update distance/wave counters  
- Spawn enemies if wave budget allows  
- Auto-fire: spawn player projectiles based on weapon config + modifiers  
- Update enemies and enemy projectiles  
- Collision resolution (player hit, enemy hit, pickup collection)  
- Apply deaths → spawn coins/drops  
- Render world + HUD (HP/coins/wave)  
- Check transitions (shop milestone, game over)  

##### (C) Shop milestone behaviour  
- When a shop wave is reached, the game enters **ShopState** (optionally pausing or slowing gameplay).
- The player purchases upgrades (bullet type/count/fire rate, etc.).
- Purchases update a **RunModifiers** structure (immediate effect).
- Permanent upgrades and unlocks update **MetaProgress** and are saved.

---

#### 3.4 Design Rationale  

- **Constrained controls** (left/right + auto-fire) reduce input complexity but increase decision density through lane selection and threat reading.
- **Fixed-wave shops** create predictable decision points that make balancing and evaluation easier (runs become comparable).
- **Data-driven configs** allow rapid iteration on weapon feel, bullet types, enemy mixes, and upgrade costs—crucial for a project with limited time.

---

### Implementation

- 15% ~750 words

- Describe implementation of your game, in particular highlighting the TWO areas of *technical challenge* in developing your game. 

### Evaluation

- 15% ~750 words

- One qualitative evaluation (of your choice) 

- One quantitative evaluation (of your choice) 

- Description of how code was tested. 

### Process 

- 15% ~750 words

- Teamwork. How did you work together, what tools and methods did you use? Did you define team roles? Reflection on how you worked together. Be honest, we want to hear about what didn't work as well as what did work, and importantly how your team adapted throughout the project.

### Conclusion

- 10% ~500 words

- Reflect on the project as a whole. Lessons learnt. Reflect on challenges. Future work, describe both immediate next steps for your current game and also what you would potentially do if you had chance to develop a sequel.

### Contribution Statement

- Provide a table of everyone's contribution, which *may* be used to weight individual grades. We expect that the contribution will be split evenly across team-members in most cases. Please let us know as soon as possible if there are any issues with teamwork as soon as they are apparent and we will do our best to help your team work harmoniously together.

### Additional Marks

You can delete this section in your own repo, it's just here for information. in addition to the marks above, we will be marking you on the following two points:

- **Quality** of report writing, presentation, use of figures and visual material (5% of report grade) 
  - Please write in a clear concise manner suitable for an interested layperson. Write as if this repo was publicly available.
- **Documentation** of code (5% of report grade)
  - Organise your code so that it could easily be picked up by another team in the future and developed further.
  - Is your repo clearly organised? Is code well commented throughout?
