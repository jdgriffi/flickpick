"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { PersonSearchHit } from "@/lib/people";
import type { TitleSearchHit } from "@/lib/suggest";
import type { PersonFilter } from "@/lib/types";

type Props = {
  query: string;
  mediaType: "movie" | "tv";
  person: PersonFilter | null;
  onQueryChange: (query: string) => void;
  onPersonSelect: (person: PersonFilter) => void;
  onPersonClear: () => void;
};

type FlatOption =
  | { kind: "title"; item: TitleSearchHit }
  | { kind: "person"; item: PersonSearchHit };

export function TitleSearch({
  query,
  mediaType,
  person,
  onQueryChange,
  onPersonSelect,
  onPersonClear,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [titles, setTitles] = useState<TitleSearchHit[]>([]);
  const [people, setPeople] = useState<PersonSearchHit[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const inputId = useId();

  const flatOptions = useMemo<FlatOption[]>(
    () => [
      ...titles.map((item) => ({ kind: "title" as const, item })),
      ...people.map((item) => ({ kind: "person" as const, item })),
    ],
    [titles, people],
  );

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onDocKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (person || q.length < 2) {
      setTitles([]);
      setPeople([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(
        `/api/suggest?query=${encodeURIComponent(q)}&mediaType=${mediaType}`,
        { signal: controller.signal },
      )
        .then(async (res) => {
          const json = (await res.json()) as {
            titles?: TitleSearchHit[];
            people?: PersonSearchHit[];
            error?: string;
          };
          if (!res.ok) throw new Error(json.error || "Search failed");
          setTitles(json.titles ?? []);
          setPeople(json.people ?? []);
          setActiveIndex(-1);
          if ((json.titles?.length ?? 0) > 0 || (json.people?.length ?? 0) > 0) {
            setOpen(true);
          }
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setTitles([]);
          setPeople([]);
        })
        .finally(() => setLoading(false));
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, person, mediaType]);

  function pickTitle(item: TitleSearchHit) {
    setOpen(false);
    setTitles([]);
    setPeople([]);
    router.push(`/title/${item.mediaType}/${item.id}`);
  }

  function pickPerson(item: PersonSearchHit) {
    onPersonSelect({ id: item.id, name: item.name });
    setTitles([]);
    setPeople([]);
    setOpen(false);
  }

  function pickFlat(option: FlatOption) {
    if (option.kind === "title") pickTitle(option.item);
    else pickPerson(option.item);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || flatOptions.length === 0) {
      if (event.key === "Escape") setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % flatOptions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? flatOptions.length - 1 : i - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      pickFlat(flatOptions[activeIndex]);
    }
  }

  const showPanel =
    open && query.trim().length >= 2 && (loading || flatOptions.length > 0);

  let runningIndex = -1;

  return (
    <div className={`title-search${showPanel ? " title-search--open" : ""}`} ref={rootRef}>
      <label className="sr-only" htmlFor={inputId}>
        Search titles or people
      </label>

      {person ? (
        <div className="title-search__selected">
          <span className="title-search__selected-label">Person</span>
          <button
            type="button"
            className="vibe-chip vibe-chip--active"
            onClick={onPersonClear}
            aria-label={`Clear person ${person.name}`}
          >
            {person.name}
            <span aria-hidden> ×</span>
          </button>
        </div>
      ) : (
        <>
          <input
            id={inputId}
            type="search"
            placeholder={
              mediaType === "tv"
                ? "Search TV shows or people…"
                : "Search movies or people…"
            }
            value={query}
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showPanel}
            onChange={(e) => {
              onQueryChange(e.target.value);
              if (e.target.value.trim().length >= 2) setOpen(true);
            }}
            onFocus={() => {
              if (flatOptions.length > 0) setOpen(true);
            }}
            onKeyDown={onKeyDown}
          />
          {showPanel && (
            <div className="title-search__panel" id={listId} role="listbox">
              {loading && flatOptions.length === 0 ? (
                <p className="title-search__status">Searching…</p>
              ) : (
                <>
                  {titles.length > 0 && (
                    <div className="title-search__group">
                      <p className="title-search__panel-label">
                        {mediaType === "tv" ? "TV shows" : "Movies"}
                      </p>
                      <ul className="title-search__list">
                        {titles.map((option) => {
                          runningIndex += 1;
                          const index = runningIndex;
                          return (
                            <li key={`title-${option.id}`}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={index === activeIndex}
                                className={
                                  index === activeIndex
                                    ? "title-search__option title-search__option--active"
                                    : "title-search__option"
                                }
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => pickTitle(option)}
                              >
                                <span className="title-search__avatar title-search__avatar--poster" aria-hidden>
                                  {option.posterUrl ? (
                                    <Image
                                      src={option.posterUrl}
                                      alt=""
                                      width={36}
                                      height={54}
                                      className="title-search__avatar-img"
                                    />
                                  ) : (
                                    <span>?</span>
                                  )}
                                </span>
                                <span className="title-search__meta">
                                  <span className="title-search__name">{option.title}</span>
                                  {option.year != null && (
                                    <span className="title-search__known">{option.year}</span>
                                  )}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {people.length > 0 && (
                    <div className="title-search__group">
                      <p className="title-search__panel-label">People</p>
                      <ul className="title-search__list">
                        {people.map((option) => {
                          runningIndex += 1;
                          const index = runningIndex;
                          return (
                            <li key={`person-${option.id}`}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={index === activeIndex}
                                className={
                                  index === activeIndex
                                    ? "title-search__option title-search__option--active"
                                    : "title-search__option"
                                }
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => pickPerson(option)}
                              >
                                <span className="title-search__avatar" aria-hidden>
                                  {option.profileUrl ? (
                                    <Image
                                      src={option.profileUrl}
                                      alt=""
                                      width={36}
                                      height={36}
                                      className="title-search__avatar-img"
                                    />
                                  ) : (
                                    <span>
                                      {option.name
                                        .split(/\s+/)
                                        .filter(Boolean)
                                        .slice(0, 2)
                                        .map((p) => p[0])
                                        .join("")
                                        .toUpperCase()}
                                    </span>
                                  )}
                                </span>
                                <span className="title-search__meta">
                                  <span className="title-search__name">{option.name}</span>
                                  {option.knownFor && (
                                    <span className="title-search__known">{option.knownFor}</span>
                                  )}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
