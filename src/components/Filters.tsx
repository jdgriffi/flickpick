"use client";

import {
  DECADES,
  FREE_STREAMING_VALUE,
  genresFor,
  MEDIA_TYPES,
  MIN_SCORE_OPTIONS,
  ratingsFor,
  sortOptionsFor,
  STREAMING_PROVIDERS,
} from "@/lib/constants";
import type { CompanyFilter, KeywordTag, MediaType, PersonFilter } from "@/lib/types";
import { CheckboxDropdown } from "./CheckboxDropdown";
import { TitleSearch } from "./TitleSearch";
import { VibeTypeahead } from "./VibeTypeahead";

export type FilterState = {
  mediaType: MediaType;
  query: string;
  genres: string[];
  certifications: string[];
  decades: string[];
  providers: string[];
  minScore: string;
  sort: string;
  keyword: KeywordTag | null;
  person: PersonFilter | null;
  company: CompanyFilter | null;
};

type Props = {
  value: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  resultCount?: number;
  loading?: boolean;
};

export const DEFAULT_FILTERS: FilterState = {
  mediaType: "movie",
  query: "",
  genres: [],
  certifications: [],
  decades: [],
  providers: [],
  minScore: "",
  sort: "popularity.desc",
  keyword: null,
  person: null,
  company: null,
};

const DECADE_OPTIONS = DECADES.map((d) => ({ value: d.value, label: d.label }));
const PROVIDER_OPTIONS = [
  { value: FREE_STREAMING_VALUE, label: "Free (ad-supported)" },
  ...STREAMING_PROVIDERS.map((p) => ({
    value: String(p.id),
    label: p.shortName,
  })),
];

export function Filters({ value, onChange, onReset, resultCount, loading }: Props) {
  function set<K extends keyof FilterState>(key: K, next: FilterState[K]) {
    onChange({ ...value, [key]: next });
  }

  function setMediaType(next: MediaType) {
    onChange({
      ...value,
      mediaType: next,
      genres: [],
      certifications: [],
      sort: "popularity.desc",
    });
  }

  function setKeyword(next: KeywordTag | null) {
    onChange({
      ...value,
      keyword: next,
      person: next ? null : value.person,
      company: next ? null : value.company,
      // Title search and keyword discover don't combine well on TMDB
      query: next ? "" : value.query,
    });
  }

  function setPerson(next: PersonFilter | null) {
    onChange({
      ...value,
      person: next,
      keyword: next ? null : value.keyword,
      company: next ? null : value.company,
      query: next ? "" : value.query,
    });
  }

  const activeChips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (value.keyword) {
    activeChips.push({
      key: `keyword-${value.keyword.id}`,
      label: value.keyword.name,
      clear: () => setKeyword(null),
    });
  }
  if (value.person) {
    activeChips.push({
      key: `person-${value.person.id}`,
      label: value.person.name,
      clear: () => setPerson(null),
    });
  }
  if (value.company) {
    activeChips.push({
      key: `company-${value.company.id}`,
      label: value.company.name,
      clear: () => set("company", null),
    });
  }

  const genreOptions = genresFor(value.mediaType).map((g) => ({
    value: String(g.id),
    label: g.name,
  }));
  const ratingOptions = ratingsFor(value.mediaType).map((r) => ({ value: r, label: r }));
  const ratingLabel = value.mediaType === "tv" ? "TV rating" : "MPAA";
  const sortOptions = sortOptionsFor(value.mediaType);
  const noun = value.mediaType === "tv" ? "shows" : "movies";

  return (
    <section className="filters" aria-label="Title filters">
      <div className="filters__top">
        <TitleSearch
          query={value.query}
          mediaType={value.mediaType}
          person={value.person}
          onQueryChange={(query) => set("query", query)}
          onPersonSelect={setPerson}
          onPersonClear={() => setPerson(null)}
        />

        <div className="media-toggle" role="group" aria-label="Content type">
          {MEDIA_TYPES.map((t) => {
            const active = value.mediaType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                className={active ? "media-toggle__btn media-toggle__btn--active" : "media-toggle__btn"}
                aria-pressed={active}
                onClick={() => setMediaType(t.value)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="filters__grid">
        <CheckboxDropdown
          label="Genre"
          options={genreOptions}
          selected={value.genres}
          onChange={(genres) => set("genres", genres)}
          emptyLabel="Any genre"
          allLabel="All genres"
        />

        <CheckboxDropdown
          label={ratingLabel}
          options={ratingOptions}
          selected={value.certifications}
          onChange={(certifications) => set("certifications", certifications)}
          emptyLabel="Any rating"
          allLabel="All ratings"
        />

        <CheckboxDropdown
          label="Decade"
          options={DECADE_OPTIONS}
          selected={value.decades}
          onChange={(decades) => set("decades", decades)}
          emptyLabel="Any decade"
          allLabel="All decades"
        />

        <CheckboxDropdown
          label="Streaming"
          options={PROVIDER_OPTIONS}
          selected={value.providers}
          onChange={(providers) => set("providers", providers)}
          emptyLabel="Any service"
          allLabel="All services"
        />

        <VibeTypeahead
          value={value.keyword}
          mediaType={value.mediaType}
          onChange={setKeyword}
        />

        <label>
          <span>Min score</span>
          <select value={value.minScore} onChange={(e) => set("minScore", e.target.value)}>
            {MIN_SCORE_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Sort by</span>
          <select value={value.sort} onChange={(e) => set("sort", e.target.value)}>
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="filters__footer">
        {activeChips.length > 0 && (
          <div className="filters__active">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="vibe-chip vibe-chip--active"
                onClick={chip.clear}
                aria-label={`Clear ${chip.label}`}
              >
                {chip.label}
                <span aria-hidden> ×</span>
              </button>
            ))}
          </div>
        )}
        <p className="filters__count">
          {loading
            ? `Finding ${noun}…`
            : `${resultCount?.toLocaleString() ?? "—"} matches`}
        </p>
        <button type="button" className="btn-ghost" onClick={onReset}>
          Reset filters
        </button>
      </div>
    </section>
  );
}
