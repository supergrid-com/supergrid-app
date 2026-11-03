import type { D1Target } from "../../../shared/bridge";
import { sg } from "~/lib/bridge";
import { invalidate, useRemote } from "~/lib/library";

// Skills: short guides the agent finds and follows in this workspace ("how we write product
// pages", "the booking flow"). Each is a row in the workspace's own database, in a `skills`
// table this page makes the first time it is opened: an id, a title and the text itself.

export type Skill = { id: string; title: string; content: string; created_at: string; updated_at: string };
export const SKILL_ID = /^[a-z][a-z0-9-]{0,59}$/;
const MAX_CONTENT = 64 * 1024;

const ready = new Set<string>();
const key = (t: D1Target | null) => (t ? `skills:${t.accountId}:${t.worker}` : null);

/** Makes the table once per workspace; the statement is a no-op when it exists. */
async function ensure(target: D1Target): Promise<void> {
  const k = `${target.accountId}:${target.worker}`;
  if (ready.has(k) || !sg) return;
  await sg.d1.query(target, "CREATE TABLE IF NOT EXISTS skills (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))");
  ready.add(k);
}

export async function listSkills(target: D1Target): Promise<Skill[]> {
  if (!sg) return [];
  await ensure(target);
  return (await sg.d1.query(target, "SELECT * FROM skills ORDER BY title")).results as Skill[];
}

export function useSkills(target: D1Target | null) {
  return useRemote(key(target), () => listSkills(target!));
}

/** Create or replace. The id is fixed once made; the title and the text change. */
export async function saveSkill(target: D1Target, skill: { id: string; title: string; content: string }): Promise<Skill> {
  if (!sg) throw new Error("Skills save inside the app.");
  const title = skill.title.trim();
  if (!title) throw new Error("A skill needs a title.");
  if (!SKILL_ID.test(skill.id)) throw new Error("A skill id is lowercase letters, digits and dashes.");
  if (skill.content.length > MAX_CONTENT) throw new Error("A skill holds up to 64 KB of text.");
  await ensure(target);
  await sg.d1.query(
    target,
    `INSERT INTO skills (id, title, content, updated_at) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, content = excluded.content, updated_at = excluded.updated_at`,
    [skill.id, title, skill.content],
  );
  invalidate("skills:");
  const row = (await sg.d1.query(target, "SELECT * FROM skills WHERE id = ?", [skill.id])).results[0] as Skill | undefined;
  if (!row) throw new Error("The skill did not save.");
  return row;
}

export async function removeSkill(target: D1Target, id: string): Promise<void> {
  if (!sg) return;
  await sg.d1.query(target, "DELETE FROM skills WHERE id = ?", [id]);
  invalidate("skills:");
}

/** A skill id from a title, not yet used. */
export function freeSkillId(title: string, taken: string[]): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/^[^a-z]+/, "").slice(0, 48) || "skill";
  let id = base;
  for (let n = 2; taken.includes(id) || !SKILL_ID.test(id); n++) id = `${base}-${n}`;
  return id;
}
