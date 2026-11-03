// What the data grid knows about a table: its fields, each with a type that picks how its cells
// draw and edit, and rows keyed by field id. The grid is the same for every admin list (database
// tables, events, contacts); only the fields and rows change.

export type FieldType = "text" | "number" | "currency" | "date" | "datetime" | "json" | "select" | "multiselect" | "person" | "record" | "email" | "url" | "phone" | "checkbox" | "rating";

export type OptionColor = "gray" | "red" | "orange" | "amber" | "green" | "teal" | "blue" | "violet" | "pink";

export type SelectOption = { value: string; color: OptionColor };

export type Field = {
  id: string;
  label: string;
  type: FieldType;
  /** The record's name: pinned to the left, drawn with its avatar, never hidden. One per table. */
  primary?: boolean;
  /** How the primary field's avatar is drawn: round for people, square for companies and the rest. */
  avatar?: "person" | "company";
  options?: SelectOption[];
  /** A number's unit, after it: "%" for a probability. */
  suffix?: string;
  /** Starting width in px. */
  width?: number;
  /** Shown but never edited in place: a key column, a blob. */
  readOnly?: boolean;
};

/** A row, keyed by field id. The grid tells rows apart by `id` unless given another `rowKey`. */
export type GridRow = Record<string, unknown>;

export const optionColors: OptionColor[] = ["gray", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"];
