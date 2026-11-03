import type * as React from "react";

const HEX = /^#[0-9a-f]{6}$/i;

export function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="field">
      <div className="field-head">
        <span>{label}</span>
        {value !== undefined && <span className="field-value">{value}</span>}
      </div>
      {children}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}): React.ReactElement {
  return (
    <Field label={label} value={`${+value.toFixed(2)}${unit}`}>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (T | readonly [T, string])[];
  onChange: (v: T) => void;
}): React.ReactElement {
  return (
    <Field label={label}>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const [v, text] = typeof o === "string" ? [o, o] : o;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={v === value}
              className={v === value ? "on" : undefined}
              onClick={() => onChange(v)}
            >
              {text}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): React.ReactElement {
  return (
    <Field label={label}>
      <div className="color">
        <input
          type="color"
          aria-label={label}
          value={HEX.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          aria-label={`${label} hex`}
          value={value}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value.trim())}
        />
      </div>
    </Field>
  );
}

export function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): React.ReactElement {
  return (
    <Field label={label}>
      <input type="text" className="text" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}
