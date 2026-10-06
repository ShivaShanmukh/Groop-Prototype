import { alertGuard, makeGuard, updateGuard, type Guard } from "../ai/guard";
import { defaultParameters, type GameParameters } from "../blueprint/parameters";
import type { Senses } from "../ai/perception";
import { CAMERAS, GENERATOR_POS, GUARDS, type Vec2 } from "../level/map";
import { PROPS } from "../level/props";
import { makeCamera, type SecCam } from "./cameras";
import { doorCentre, updateDoors } from "./doors";
import { Grid } from "./grid";
import { focused, interactables, type Interactable } from "./interact";
import { makePlayer, updatePlayer } from "./player";
import { seeded } from "./random";
import { updateSecurity } from "./security";
import { dist, ITEM_INFO, type GameEvent, type ItemId, type Noise, type PlayerInput, type PlayerState } from "./types";

export const GENERATOR_NOISE = 30;
/** The security door unlocks when the keycard holder comes this close. */
export const KEYCARD_UNLOCK_RADIUS = 2.6;
/** Crossing x < this line through the unlocked exit wins. */
export const EXIT_LINE_X = 1.6;

/** The whole game's rules and state. No rendering in here. */
export class Facility {
  readonly grid = new Grid();
  readonly player: PlayerState = makePlayer();
  readonly guards: Guard[] = GUARDS.map(makeGuard);
  readonly cameras: SecCam[] = CAMERAS.map((c, i) => makeCamera(c, i * 1.7));
  readonly inventory = new Set<ItemId>();
  readonly interactables: Interactable[];
  power = true;
  camerasEnabled = true;
  alarm = { active: false, timer: 0, source: null as Vec2 | null, lastReport: -99 };
  time = 0;
  outcome: { result: "won" | "lost"; reason: string } | null = null;
  stats = { spotted: 0, alarms: 0 };
  events: GameEvent[] = [];
  noises: Noise[] = [];
  readonly rand: () => number;

  /** Blueprint-controlled parameters, validated before the game starts (Phase 2B). */
  readonly params: GameParameters;

  constructor(seed = 7, params: GameParameters = defaultParameters()) {
    this.params = params;
    this.rand = seeded(seed);
    for (const p of PROPS) {
      this.grid.addProp({ x0: p.x - p.w / 2, z0: p.z - p.d / 2, x1: p.x + p.w / 2, z1: p.z + p.d / 2, tall: !!p.tall });
    }
    this.interactables = interactables(this);
  }

  get senses(): Senses {
    return { grid: this.grid, player: this.player, power: this.power, alarm: this.alarm.active, noises: this.noises, rand: this.rand, params: this.params };
  }

  get camerasActive(): boolean {
    return this.power && this.camerasEnabled;
  }

  get objective(): string {
    if (!this.inventory.has("keycard")) return "Find a keycard to get into the restricted wing.";
    if (!this.inventory.has("drive")) return "Retrieve the research drive from the Archive in the restricted wing.";
    return "Escape through the emergency exit at the west end of the corridor.";
  }

  focus(): ReturnType<typeof focused> {
    return focused(this);
  }

  /** Hand this frame's events to the UI/audio and clear the queue. */
  drain(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  toast(text: string): void {
    this.events.push({ type: "toast", text });
  }

  pickUp(item: ItemId): void {
    if (this.inventory.has(item)) return;
    this.inventory.add(item);
    this.events.push({ type: "pickup", item });
    this.toast(`Picked up: ${ITEM_INFO[item].name}`);
    if (item === "drive") {
      const exit = this.grid.doors.find((d) => d.kind === "exit");
      if (exit) exit.locked = false;
      this.toast("Lockdown lifted. The emergency exit is open.");
    }
    this.events.push({ type: "objective", text: this.objective });
  }

  toggleGenerator(): void {
    this.power = !this.power;
    this.events.push({ type: "power", on: this.power }, { type: "generator" });
    // The generator is loud: anyone nearby comes to look.
    this.noises.push({ pos: { ...GENERATOR_POS }, radius: GENERATOR_NOISE, source: "the generator" });
    this.toast(this.power ? "Generator restarted. Lights and cameras are back." : "Generator down. Lights out, cameras offline.");
  }

  /** Security terminal actions (need power). */
  setCameras(on: boolean): void {
    if (!this.power) return;
    this.camerasEnabled = on;
    this.events.push({ type: "cameras", on });
    this.toast(on ? "Cameras back online." : "Cameras disabled from the terminal.");
  }

  resetAlarm(): void {
    if (!this.power || !this.alarm.active) return;
    this.setAlarm(false);
    this.toast("Alarm reset.");
  }

  raiseAlarm(source: Vec2, by: string): void {
    this.alarm.source = { ...source };
    if (!this.alarm.active) {
      this.stats.alarms += 1;
      this.setAlarm(true);
      this.toast(`${by} spotted you. Alarm!`);
    }
    this.alarm.timer = this.params.alarmDuration;
    this.alarm.lastReport = this.time;
    for (const g of this.guards) alertGuard(g, source, this.time, this.events);
  }

  setAlarm(on: boolean): void {
    this.alarm.active = on;
    this.alarm.timer = on ? this.params.alarmDuration : 0;
    this.events.push({ type: "alarm", on });
  }

  update(dt: number, input: PlayerInput): void {
    if (this.outcome) return;
    this.time += dt;
    this.noises = []; // noises last one frame
    updatePlayer(this.player, input, dt, this.grid, this.noises, this.events, this.params);

    if (input.interact) this.focus()?.item.use(this);
    const secure = this.grid.doors.find((d) => d.kind === "secure");
    if (secure?.locked && this.inventory.has("keycard") && dist(this.player.pos, doorCentre(secure)) < KEYCARD_UNLOCK_RADIUS) {
      secure.locked = false;
      this.toast("Keycard accepted. Restricted wing unlocked.");
    }

    const bodies = [{ pos: this.player.pos, kind: "player" as const }, ...this.guards.map((g) => ({ pos: g.pos, kind: "guard" as const }))];
    updateDoors(this.grid, bodies, dt, this.events);

    updateSecurity(this, dt);

    for (const g of this.guards) {
      const before = g.mode;
      const caught = updateGuard(g, dt, this.senses, this.time, this.events);
      if (g.mode === "CHASE" && before !== "CHASE") this.stats.spotted += 1;
      if (caught) return this.end("lost", `${g.id} caught you.`);
    }

    const exit = this.grid.doors.find((d) => d.kind === "exit");
    if (exit && !exit.locked && this.player.pos.x < EXIT_LINE_X) this.end("won", "You escaped with the research.");
  }

  private end(result: "won" | "lost", reason: string): void {
    this.outcome = { result, reason };
    this.events.push({ type: "end", outcome: result, reason });
  }
}
