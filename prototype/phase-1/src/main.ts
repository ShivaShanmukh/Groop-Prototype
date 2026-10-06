import "./style.css";
import { bootBlueprint, renderBlueprintError } from "./blueprint/boot";
import { startGame } from "./game";

// Phase 2B: the Blueprint is validated BEFORE anything starts. An invalid value stops the game
// with a clear error; it is never clamped or silently replaced.
const boot = bootBlueprint(location.search);
if (boot.ok) startGame(boot);
else renderBlueprintError(boot.problems);
