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
      options: cfg.options.map((o) => ({ id: o.value, name: o.name, description: o.description })),
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
