// Normalises how agents expose session settings (model, mode, effort, ...).
//
// Newer adapters return `configOptions` (set with session/set_config_option).
// Older ones return `models` / `modes` (set with session/set_model and
// session/set_mode). All are collapsed into one `Choice` list for the UI.

import type { NewSessionResult } from "../../../../shared/acp";

export interface ChoiceOption {
  id: string;
  name: string;
  description?: string | null;
}

export interface Choice {
  key: string;
  label: string;
  category: string | null;
  source: "config" | "models" | "modes";
  configId?: string;
  current: string;
  options: ChoiceOption[];
}

export function sessionChoices(session: NewSessionResult | null): Choice[] {
  if (!session) return [];
  const out: Choice[] = [];
  const cfgs = session.configOptions ?? [];

  for (const cfg of cfgs) {
    if (cfg.type !== "select") continue;
    out.push({
      key: `config:${cfg.id}`,
      label: cfg.name,
      category: cfg.category ?? null,
      source: "config",
      configId: cfg.id,
      current: cfg.currentValue,
      // Muse's effort levels come with a sentence where the name should be ("Use this for deepest
      // analysis…"); that is the description, and the level's id is its name
      options: cfg.options.map((o) => (cfg.category === "thought_level" && !o.description && /\s.*\s/.test(o.name) ? { id: o.value, name: o.value, description: o.name } : { id: o.value, name: o.name, description: o.description })),
    });
  }

  if (session.models && !cfgs.some((c) => c.category === "model")) {
    out.push({
      key: "models",
      label: "Model",
      category: "model",
      source: "models",
      current: session.models.currentModelId,
      options: session.models.availableModels.map((m) => ({ id: m.modelId, name: m.name, description: m.description })),
    });
  }

  if (session.modes && !cfgs.some((c) => c.category === "mode")) {
    out.push({
      key: "modes",
      label: "Mode",
      category: "mode",
      source: "modes",
      current: session.modes.currentModeId,
      options: session.modes.availableModes.map((m) => ({ id: m.id, name: m.name, description: m.description })),
    });
  }

  const rank = (c: Choice) => (c.category === "model" ? 0 : c.category === "mode" ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b));
}

export function currentModelName(choices: Choice[]): string | null {
  const model = choices.find((c) => c.category === "model");
  if (!model) return null;
  return model.options.find((o) => o.id === model.current)?.name ?? model.current;
}

// Short names for the composer, after Claude Code's: Muse's approval modes and its effort levels.
// The agent's own description still shows under each in the menu.
const modeNames: Record<string, string> = { allowAll: "Auto", promptUnmatched: "Manual", onRequest: "Ask", denyUnmatched: "Strict" };
const effortNames: Record<string, string> = { low: "Low", medium: "Medium", high: "High", xhigh: "Extra high", max: "Max" };

export function shortName(choice: Choice, option: ChoiceOption): string {
  if (choice.category === "mode") return modeNames[option.id] ?? option.name;
  if (choice.category === "thought_level") return effortNames[option.id] ?? option.id.charAt(0).toUpperCase() + option.id.slice(1);
  return option.name;
}

// Muse's models, by family. Its `-contributor` variants fold into the plain one: the menu shows each
// family once, under the name the app uses for it.
const modelFamilies: [string, string][] = [
  ["muse-spark-1.3", "Muse Spark 1.3"],
  ["muse-spark-1.2", "Muse Spark 1.2"],
  ["muse-wonder-1.0", "Muse Wonder"],
];
const familyOf = (id: string) => id.replace(/-contributor$/, "");

/**
 * The model choice with one option per family, so picking one sends a real model id. A family's
 * option is its contributor variant when it has one: that is Muse's default, and the plain Spark 1.3
 * has no effort setting. A thread on a family's other variant shows that family, and picking it
 * again moves the thread onto the contributor one.
 */
export function modelChoice(choice: Choice): Choice {
  const byFamily = new Map<string, ChoiceOption>();
  for (const o of choice.options) {
    const family = familyOf(o.id);
    if (byFamily.has(family) && !o.id.endsWith("-contributor")) continue;
    byFamily.set(family, { id: o.id, name: modelFamilies.find(([f]) => f === family)?.[1] ?? o.name });
  }
  const rank = (id: string) => {
    const i = modelFamilies.findIndex(([f]) => f === familyOf(id));
    return i < 0 ? modelFamilies.length : i;
  };
  const options = [...byFamily.values()].sort((a, b) => rank(a.id) - rank(b.id));
  const current = byFamily.get(familyOf(choice.current))?.id ?? choice.current;
  return { ...choice, current, options };
}
