import { updateCamera } from "./cameras";
import type { Facility } from "./facility";

/** While the alarm is on, a camera that still sees you re-reports your position this often (s). */
export const ALARM_REPORT_INTERVAL = 2;

/** Cameras watch for the player; the alarm counts down once raised. */
export function updateSecurity(f: Facility, dt: number): void {
  const senses = f.senses;
  for (const c of f.cameras) {
    const tripped = updateCamera(c, dt, senses, f.camerasActive);
    // While the alarm is on, cameras that still see you keep reporting your position.
    const report = c.seesPlayer && f.alarm.active && f.time - f.alarm.lastReport > ALARM_REPORT_INTERVAL;
    if (tripped || report) f.raiseAlarm(f.player.pos, c.id);
  }
  if (f.alarm.active) {
    f.alarm.timer -= dt;
    if (f.alarm.timer <= 0) {
      f.setAlarm(false);
      f.toast("The alarm timed out.");
    }
  }
}
