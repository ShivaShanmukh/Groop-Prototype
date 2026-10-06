// Part 2 of the e2e checklist: generator, cameras, alarm, guard AI, loss.
// Same rules: real keyboard input for actions; ?debug only reads state and sets up scenes.
export async function run({ page, D, snap, wait, hold, dist, until, check }) {
  const fresh = async () => {
    await page.goto(`${page.url().split("?")[0]}?debug`);
    await page.waitForFunction(() => window.__facility, null, { timeout: 20000 });
    await page.click("#start");
    await wait(300);
  };
  const history = (s, i) => s.guards[i].history.map((h) => h.to);

  try {
    // Generator: E toggles power; lights, cameras and the terminal react; guards hear it.
    await fresh();
    await D((d) => d.teleport(37.6, 31.0, Math.PI)); // in front of the generator, facing south
    await wait(200);
    const genPrompt = await page.textContent("#prompt");
    await page.keyboard.press("KeyE");
    await wait(400);
    const off = await snap();
    await page.screenshot({ path: "screenshots/e2e-generator-off.jpg", type: "jpeg", quality: 85 });
    const heard = off.guards.filter((g) => g.history.some((h) => h.why.includes("generator"))).map((g) => g.id);
    await D((d) => d.teleport(3.6, 4.8, 0));
    await wait(200);
    const termLabel = await page.textContent("#prompt");
    check("Generator works", !off.power && !off.camerasActive && off.cameras.every((c) => c.mode === "off") && termLabel.includes("no power"),
      `prompt "${genPrompt.trim()}" → E → power off, all 4 cameras off, terminal shows "${termLabel.trim()}"; guards that heard it: ${heard.join(", ") || "none in range"}`, "real keys");
    await D((d) => d.teleport(37.6, 31.0, Math.PI));
    await wait(200);
    await page.keyboard.press("KeyE");
    await wait(300);
    check("Generator restarts", (await snap()).power && (await snap()).camerasActive, "E again → power on, cameras active", "real keys");

    // Camera detection → alarm → guards alerted → terminal reset (keys 2 and 1).
    await fresh();
    await D((d) => [0, 1, 2].forEach((i) => d.placeGuard(i, -40 - i * 5, -40)));
    await D((d) => d.teleport(33, 21, Math.PI / 2)); // 6.6 m in front of CAM-02, facing away
    const alarmed = await until((s) => s.alarm.active, 4000);
    const cam = alarmed?.cameras.find((c) => c.id.startsWith("CAM-02"));
    check("Camera detection works", !!alarmed && cam.detect >= 1, `standing in CAM-02's cone → detect ${cam?.detect.toFixed(2)} → alarm raised in under 4 s`, "setup + real time");
    const chip = await page.textContent("#alarm");
    const alerted = alarmed ? alarmed.guards.filter((g) => g.history.some((h) => h.why === "alarm raised")).length : 0;
    await page.screenshot({ path: "screenshots/e2e-alarm.jpg", type: "jpeg", quality: 85 });
    await D((d) => d.teleport(3.6, 4.8, 0));
    await D((d) => [0, 1, 2].forEach((i) => d.placeGuard(i, -40 - i * 5, -40)));
    await wait(200);
    await page.keyboard.press("KeyE");
    await wait(300);
    const termOpen = await page.isVisible("#terminal");
    await page.keyboard.press("Digit2");
    await wait(200);
    await page.keyboard.press("Digit1");
    await wait(200);
    const afterTerm = await snap();
    await page.keyboard.press("Escape");
    await wait(300);
    check("Alarm works", alerted === 3 && chip.includes("ALARM ·") && termOpen && !afterTerm.alarm.active,
      `alarm chip "${chip}", ${alerted}/3 guards switched to INVESTIGATE ("alarm raised"); terminal (E) → key 2 reset alarm → active=${afterTerm.alarm.active}`, "real keys");
    check("Security terminal affects cameras", !afterTerm.camerasEnabled && !afterTerm.camerasActive, `key 1 → cameras disabled (camerasActive=${afterTerm.camerasActive})`, "real keys");

    // Guard AI: patrol → detect (suspicious → chase) → search → return → patrol, then catch.
    await fresh();
    const p0 = (await snap()).guards[0].pos;
    await wait(3000);
    const p1 = await snap();
    check("Guard patrol works", dist(p0, p1.guards[0].pos) > 2 && p1.guards[0].mode === "PATROL", `${p1.guards[0].id} walked ${dist(p0, p1.guards[0].pos).toFixed(1)} m in 3 s while in PATROL`, "real time");

    await D((d) => d.placeGuard(1, -45, -40));
    await D((d) => d.placeGuard(2, -50, -40));
    await D((d) => d.setCameras(false));
    await D((d) => d.placeGuard(0, 20, 21, Math.PI / 2)); // corridor, facing west
    await D((d) => d.teleport(13, 21, -Math.PI / 2)); // 7 m in front of the guard
    const seen = await until((s) => s.guards[0].mode === "CHASE", 6000);
    const h1 = seen ? history(seen, 0) : [];
    check("Guard detects player", h1.includes("SUSPICIOUS") && h1.includes("CHASE"), `transitions: ${h1.join(" → ")}`, "setup + real time");
    const g0 = seen.guards[0].pos;
    await wait(700);
    const chasing = await snap();
    check("Guard chases player", chasing.guards[0].mode === "CHASE" && dist(chasing.guards[0].pos, chasing.player.pos) < dist(g0, chasing.player.pos), `guard closed from ${dist(g0, chasing.player.pos).toFixed(1)} m to ${dist(chasing.guards[0].pos, chasing.player.pos).toFixed(1)} m`, "real time");
    await D((d) => d.face(2, 21)); // turn away from the guard…
    await hold(["ShiftLeft", "KeyW"], 400); // …sprint west…
    await D((d) => d.teleport(33, 33, 0)); // …and out of sight into Storage
    const searching = await until((s) => s.guards[0].mode === "SEARCH", 8000);
    check("Guard searches", !!searching, `after losing sight: ${searching ? history(searching, 0).slice(-2).join(" → ") : "no SEARCH"}`, "setup + real time");
    const back = await until((s) => s.guards[0].mode === "PATROL" && history(s, 0).includes("RETURN"), 30000);
    const tail = back ? back.guards[0].history.slice(-3).map((h) => `${h.to} (${h.why})`).join(" → ") : "did not return";
    check("Guard returns to patrol", !!back, tail, "real time");

    // Loss: stand in a guard's face.
    await D((d) => d.placeGuard(0, 20, 21, Math.PI / 2));
    await D((d) => d.teleport(17.5, 21, -Math.PI / 2));
    const caught = await until((s) => s.outcome, 8000);
    await wait(400);
    const endTitle = (await page.isVisible("#end")) ? await page.textContent("#end-title") : "";
    await page.screenshot({ path: "screenshots/e2e-caught.jpg", type: "jpeg", quality: 85 });
    check("Loss state works", caught?.outcome?.result === "lost" && endTitle === "Caught", `outcome ${JSON.stringify(caught?.outcome)}; end screen "${endTitle}"`, "setup + real time");
  } catch (e) {
    check("Systems script error", false, String(e), "-");
  }
}
