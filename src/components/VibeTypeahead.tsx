"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { KeywordTag, MediaType } from "@/lib/types";

type Props = {
  value: KeywordTag | null;
  mediaType: MediaType;
  onChange: (next: KeywordTag | null) => void;
};

export function VibeTypeahead({ value, mediaType, onChange }: Props) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<KeywordTag[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const inputId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const q = text.trim();
    if (q.length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(
        `/api/keywords?query=${encodeURIComponent(q)}&mediaType=${mediaType}`,
        { signal: controller.signal },
      )
        .then(async (res) => {
          const json = (await res.json()) as { results?: KeywordTag[]; error?: string };
          if (!res.ok) throw new Error(json.error || "Search failed");
          setOptions(json.results ?? []);
          setActiveIndex(-1);
          setOpen(true);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setOptions([]);
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [text, mediaType]);

  function pick(option: KeywordTag) {
    onChange(option);
    setText("");
    setOptions([]);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setText("");
    setOptions([]);
    setOpen(false);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (!open || options.length === 0) {
      if (event.key === "Escape") setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      pick(options[activeIndex]);
    }
  }

  return (
    <div className={`vibe-typeahead${open ? " vibe-typeahead--open" : ""}`} ref={rootRef}>
      <label className="vibe-typeahead__label" htmlFor={inputId}>
        Vibe
      </label>

      {value ? (
        <div className="vibe-typeahead__selected">
          <button
            type="button"
            className="vibe-chip vibe-chip--active"
            onClick={clear}
            aria-label={`Clear vibe ${value.name}`}
          >
            {value.name}
            <span aria-hidden> ×</span>
          </button>
        </div>
      ) : (
        <>
          <input
            id={inputId}
            type="search"
            className="vibe-typeahead__input"
            placeholder="e.g. time travel…"
            value={text}
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={open && options.length > 0}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim().length >= 2) setOpen(true);
            }}
            onFocus={() => {
              if (options.length > 0) setOpen(true);
            }}
            onKeyDown={onKeyDown}
          />
          {open && text.trim().length >= 2 && (
            <div className="vibe-typeahead__panel" id={listId} role="listbox">
              {loading && options.length === 0 ? (
                <p className="vibe-typeahead__status">Searching…</p>
              ) : options.length === 0 ? (
                <p className="vibe-typeahead__status">
                  No vibes with {mediaType === "tv" ? "TV" : "movie"} matches
                </p>
              ) : (
                <ul className="vibe-typeahead__list">
                  {options.map((option, index) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={index === activeIndex}
                        className={
                          index === activeIndex
                            ? "vibe-typeahead__option vibe-typeahead__option--active"
                            : "vibe-typeahead__option"
                        }
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => pick(option)}
                      >
                        <span>{option.name}</span>
                        {option.resultCount != null && (
                          <span className="vibe-typeahead__count">
                            {option.resultCount.toLocaleString()}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
