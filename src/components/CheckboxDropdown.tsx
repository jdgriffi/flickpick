"use client";

import { useEffect, useId, useRef, useState } from "react";

export type CheckboxOption = {
  value: string;
  label: string;
};

type Props = {
  label: string;
  options: CheckboxOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyLabel: string;
  allLabel: string;
};

function summary(
  selected: string[],
  options: CheckboxOption[],
  emptyLabel: string,
  allLabel: string,
): string {
  if (selected.length === 0) return emptyLabel;
  if (selected.length === options.length) return allLabel;
  if (selected.length <= 2) {
    return selected
      .map((v) => options.find((o) => o.value === v)?.label ?? v)
      .join(", ");
  }
  return `${selected.length} selected`;
}

export function CheckboxDropdown({
  label,
  options,
  selected,
  onChange,
  emptyLabel,
  allLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const allSelected = options.length > 0 && selected.length === options.length;
  const someSelected = selected.length > 0 && !allSelected;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggleOne(value: string) {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    );
  }

  function toggleAll() {
    onChange(allSelected ? [] : options.map((o) => o.value));
  }

  return (
    <div className={`check-dd${open ? " check-dd--open" : ""}`} ref={rootRef}>
      <span className="check-dd__label">{label}</span>
      <button
        type="button"
        className="check-dd__trigger"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="check-dd__value">
          {summary(selected, options, emptyLabel, allLabel)}
        </span>
        <span className="check-dd__caret" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="check-dd__panel" id={listId} role="group" aria-label={label}>
          <label className="check-dd__option check-dd__option--all">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={toggleAll}
            />
            <span>{allSelected ? "Deselect all" : "Select all"}</span>
          </label>
          <div className="check-dd__list">
            {options.map((opt) => (
              <label key={opt.value} className="check-dd__option">
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggleOne(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
