import type { ComponentType, PropertyDef } from "../schema";

const n = (description: string, unit?: string): PropertyDef => ({ type: "number", description, unit, required: true });
const b = (description: string): PropertyDef => ({ type: "boolean", description, required: true });
const s = (description: string): PropertyDef => ({ type: "string", description, required: true });
const e = (description: string, values: string[]): PropertyDef => ({ type: "enum", description, values, required: true });

/** The component vocabulary used by the Research Facility blueprint. */
export const COMPONENT_TYPES: Record<string, ComponentType> = {
  Layout: {
    description: "The tile map the level is built from.",
    properties: { cellSize: n("Size of one map cell", "m"), wallHeight: n("Wall height", "m"), rows: { type: "string[]", description: "ASCII map rows: # wall, . floor, D door, K security door, X exit", required: true } },
  },
  Area: {
    description: "A named room or zone.",
    properties: { bounds: { type: "rect", description: "Inclusive cell bounds [c0, r0, c1, r1]", required: true }, floorColor: s("Floor tint"), lightColor: s("Ceiling light colour") },
  },
  Transform: {
    description: "Position on the floor plane (x east, z south) and facing.",
    properties: { position: { type: "vec2", description: "World position", unit: "m", required: true }, yaw: { type: "number", description: "Facing; 0 = north (-z)", unit: "rad" } },
  },
  Door: {
    description: "A sliding door in a map cell.",
    properties: {
      kind: e("door = opens for anyone, secure = keycard door, exit = emergency exit", ["door", "secure", "exit"]),
      col: n("Map column"), row: n("Map row"), locked: b("Locked doors never open"), open: n("0 closed … 1 open"),
      openRadius: n("Opens when an allowed body is this close", "m"), speed: n("Fraction of fully open per second", "1/s"),
    },
  },
  Mover: {
    description: "Walks with circle-vs-box collision.",
    properties: {
      walkSpeed: n("Walk speed", "m/s"), sprintSpeed: n("Sprint speed", "m/s"), crouchSpeed: n("Crouch speed", "m/s"), radius: n("Collision radius", "m"),
      moving: b("Moved this frame"), sprinting: b("Sprinting this frame"),
    },
  },
  Posture: {
    description: "Standing / crouching.",
    properties: { crouching: b("Currently crouched"), eyeStand: n("Eye height standing", "m"), eyeCrouch: n("Eye height crouched", "m") },
  },
  Footsteps: {
    description: "Noise made while moving. Crouching is silent.",
    properties: { walkRadius: n("Heard within", "m"), sprintRadius: n("Heard within when sprinting", "m"), interval: n("Seconds between steps at walk speed", "s") },
  },
  Interactor: {
    description: "Can use interactables with E.",
    properties: { reach: n("Max distance", "m"), viewCone: n("Must be roughly facing it (full cone)", "deg") },
  },
  Inventory: { description: "Items carried.", properties: { items: { type: "string[]", description: "Item ids carried", required: true } } },
  Interactable: {
    description: "Something the player can press E on.",
    properties: { runtimeId: s("Interactable id in the runtime list"), prompt: s("Prompt text when usable (initial state)") },
  },
  Item: {
    description: "A pickup.",
    properties: { itemId: e("Runtime item id", ["keycard", "drive"]), detail: s("Inventory description"), taken: b("Already picked up") },
  },
  Power: { description: "Facility power from the generator.", properties: { on: b("Power on"), noiseRadius: n("Toggling is heard within", "m") } },
  Camera: {
    description: "A sweeping security camera.",
    properties: {
      mode: e("off / scan / track", ["off", "scan", "track"]), range: n("Detection range", "m"), fov: n("View cone", "deg"),
      baseYaw: n("Centre of the sweep", "deg"), sweep: n("Sweep half-angle", "deg"), detectTime: n("Seconds of continuous sight to trip the alarm", "s"),
      crouchRangeMultiplier: n("Range × when the player crouches"), crouchTimeMultiplier: n("Detect time × when the player crouches"),
      decay: n("Detection drains per second when out of view", "1/s"), detect: n("0…1; 1 trips the alarm"),
    },
  },
  Terminal: {
    description: "Security terminal menu.",
    properties: { requiresPower: b("Unusable without power"), camerasEnabled: b("Camera switch state (terminal-controlled)") },
  },
  Alarm: {
    description: "Facility alarm.",
    properties: { active: b("Alarm sounding"), timer: n("Seconds left", "s"), duration: n("Auto-reset after", "s"), reportInterval: n("Cameras re-report the player this often while active", "s") },
  },
  KeycardLock: {
    description: "Unlocks when the holder of an item comes close.",
    properties: { requiresItem: e("Item needed", ["keycard", "drive"]), unlockRadius: n("Unlock distance", "m") },
  },
  ExitZone: { description: "Win line through an unlocked exit.", properties: { lineX: n("Escape when player x is below this", "m") } },
  Perception: {
    description: "Guard sight and hearing.",
    properties: {
      sightLit: n("Sight range with power", "m"), sightDark: n("Sight range without power", "m"), crouchMultiplier: n("× when player crouches"),
      shadowMultiplier: n("× more when player crouched, still and power off"), alarmMultiplier: n("× during an alarm"), fov: n("View cone", "deg"),
      peripheral: n("Notices a standing player within this distance from any angle", "m"), wallSoundFactor: n("Sound reach × through walls"),
    },
  },
  GuardBrain: {
    description: "Guard AI state and tuning (see the guard state machine).",
    properties: {
      mode: e("Current state", ["PATROL", "SUSPICIOUS", "INVESTIGATE", "CHASE", "SEARCH", "RETURN"]), suspicion: n("0…1; 1 starts a chase"),
      patrolSpeed: n("PATROL speed", "m/s"), investigateSpeed: n("INVESTIGATE speed", "m/s"), chaseSpeed: n("CHASE speed", "m/s"),
      searchSpeed: n("SEARCH speed", "m/s"), returnSpeed: n("RETURN speed", "m/s"), alarmSpeedMultiplier: n("Speed × during an alarm"),
      catchDistance: n("Catches within", "m"), reactionTime: n("Frozen after spotting before chasing", "s"),
      suspicionRate: n("Suspicion per second at full strength"), closeDistance: n("Closer than this builds suspicion faster", "m"),
      closeMultiplier: n("× when close"), alarmSuspicionMultiplier: n("× during an alarm"), alertMultiplier: n("× when investigating/searching"),
      suspicionDecay: n("Drains per second when unseen"), chaseMemory: n("Keeps chasing this long after losing sight", "s"),
      searchTime: n("SEARCH lasts", "s"), searchTimeAlarm: n("SEARCH lasts during an alarm", "s"), patrolPause: n("Stop at each waypoint", "s"),
      radius: n("Collision radius", "m"),
      unseen: n("Seconds since the player was last seen", "s"), memory: n("Chase memory left", "s"), searchLeft: n("Search time left", "s"),
      modeTime: n("Seconds in the current state", "s"), lastKnown: { type: "vec2", description: "Where the player (or a noise) was last noticed; null if never", unit: "m" },
    },
  },
  Patrol: { description: "Patrol route.", properties: { route: { type: "vec2[]", description: "Waypoints, looped", unit: "m", required: true } } },
  Blocker: {
    description: "Furniture: blocks movement; tall ones block sight.",
    properties: { propType: s("Prop type"), width: n("Size along x", "m"), depth: n("Size along z", "m"), blocksSight: b("Tall: blocks line of sight") },
  },
  Presentation: {
    description: "Rendering / audio / HUD subsystem. Reads game state; has no gameplay effect.",
    properties: { reads: { type: "string[]", description: "Game state it reacts to", required: true } },
  },
  Session: {
    description: "Game flow and objective tracking.",
    properties: { appState: e("Screen", ["title", "playing", "paused", "terminal", "inventory", "ended"]), objective: s("Current objective text") },
  },
};
