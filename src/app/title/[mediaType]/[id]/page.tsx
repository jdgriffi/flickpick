import Image from "next/image";
import { notFound } from "next/navigation";
import { BackToResults } from "@/components/BackToResults";
import { CompanyBrowseChip, PersonBrowseButton } from "@/components/CreditBrowse";
import { MovieGrid } from "@/components/MovieGrid";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SiteFooter } from "@/components/SiteFooter";
import { VibeChips } from "@/components/VibeChips";
import { backdropUrl, posterUrl, profileUrl, providerLogoUrl } from "@/lib/constants";
import {
  formatRuntime,
  formatWatchSeasons,
  getTitleDetail,
  monetizationLabel,
} from "@/lib/title-detail";
import type { MediaType, TitleDetail, WatchOffer } from "@/lib/types";

type PageProps = {
  params: Promise<{ mediaType: string; id: string }>;
};

function parseParams(mediaType: string, id: string): { mediaType: MediaType; id: number } | null {
  if (mediaType !== "movie" && mediaType !== "tv") return null;
  const num = Number(id);
  if (!Number.isFinite(num) || num <= 0) return null;
  return { mediaType, id: num };
}

function formatDate(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(`${date.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date.slice(0, 10);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function groupOffers(offers: WatchOffer[]) {
  const order = ["flatrate", "free", "ads", "rent", "buy"] as const;
  return order
    .map((monetization) => ({
      monetization,
      offers: offers.filter((o) => o.monetization === monetization),
    }))
    .filter((g) => g.offers.length > 0);
}

function metaBits(detail: TitleDetail): string[] {
  const bits: string[] = [];
  if (detail.year) bits.push(String(detail.year));
  if (detail.certification) bits.push(detail.certification);
  const runtime = formatRuntime(detail.runtimeMinutes);
  if (runtime) {
    bits.push(detail.mediaType === "tv" ? `${runtime}/ep` : runtime);
  }
  if (detail.mediaType === "tv" && detail.numberOfSeasons) {
    bits.push(
      `${detail.numberOfSeasons} season${detail.numberOfSeasons === 1 ? "" : "s"}` +
        (detail.numberOfEpisodes ? ` · ${detail.numberOfEpisodes} eps` : ""),
    );
  }
  if (detail.status) bits.push(detail.status);
  return bits;
}

export async function generateMetadata({ params }: PageProps) {
  const raw = await params;
  const parsed = parseParams(raw.mediaType, raw.id);
  if (!parsed) return { title: "Not found — FlickPick" };
  try {
    const detail = await getTitleDetail(parsed.mediaType, parsed.id);
    return {
      title: `${detail.title} — FlickPick`,
      description: detail.overview.slice(0, 160),
    };
  } catch {
    return { title: "Not found — FlickPick" };
  }
}

export default async function TitleDetailPage({ params }: PageProps) {
  const raw = await params;
  const parsed = parseParams(raw.mediaType, raw.id);
  if (!parsed) notFound();

  let detail: TitleDetail;
  try {
    detail = await getTitleDetail(parsed.mediaType, parsed.id);
  } catch {
    notFound();
  }

  const backdrop = backdropUrl(detail.backdropPath);
  const poster = posterUrl(detail.posterPath, "w500");
  const scoreSource = detail.imdbScore != null ? "imdb" : "tmdb";
  const offerGroups = groupOffers(detail.watchOffers);
  const people =
    detail.mediaType === "movie"
      ? [
          { label: "Directed by", people: detail.directors },
          { label: "Produced by", people: detail.producers },
          { label: "Starring", people: detail.cast },
        ]
      : [
          { label: "Created by", people: detail.creators },
          { label: "Produced by", people: detail.producers },
          { label: "Starring", people: detail.cast },
        ];

  return (
    <div className="detail">
      <div className="detail__backdrop" aria-hidden>
        {backdrop ? (
          <Image src={backdrop} alt="" fill priority className="detail__backdrop-img" sizes="100vw" />
        ) : null}
        <div className="detail__backdrop-shade" />
      </div>

      <div className="detail__shell">
        <BackToResults />

        <header className="detail__hero">
          <div className="detail__poster">
            {poster ? (
              <Image
                src={poster}
                alt={`${detail.title} poster`}
                fill
                priority
                className="detail__poster-img"
                sizes="(max-width: 640px) 40vw, 220px"
              />
            ) : (
              <div className="detail__poster-fallback">No poster</div>
            )}
          </div>

          <div className="detail__hero-copy">
            <p className="detail__kicker">{detail.mediaType === "tv" ? "TV show" : "Movie"}</p>
            <h1 className="detail__title">{detail.title}</h1>
            <p className="detail__meta">{metaBits(detail).join(" · ")}</p>
            {detail.genres.length > 0 && (
              <p className="detail__genres">{detail.genres.join(" · ")}</p>
            )}
            <div className="detail__score">
              <ScoreBadge
                imdbScore={detail.imdbScore}
                tmdbScore={detail.tmdbScore}
                scoreSource={scoreSource}
                imdbId={detail.imdbId}
              />
            </div>
          </div>
        </header>

        <section className="detail__section">
          <h2>Overview</h2>
          <p className="detail__overview">{detail.overview}</p>
        </section>

        <VibeChips vibes={detail.vibes} mediaType={detail.mediaType} />

        <section className="detail__section">
          <h2>Details</h2>
          <dl className="detail__facts">
            {detail.mediaType === "movie" && (
              <>
                <div>
                  <dt>Theatrical release</dt>
                  <dd>{formatDate(detail.theatricalReleaseDate) ?? formatDate(detail.releaseDate) ?? "—"}</dd>
                </div>
                <div>
                  <dt>Digital release</dt>
                  <dd>{formatDate(detail.digitalReleaseDate) ?? "—"}</dd>
                </div>
                <div>
                  <dt>Runtime</dt>
                  <dd>{formatRuntime(detail.runtimeMinutes) ?? "—"}</dd>
                </div>
              </>
            )}
            {detail.mediaType === "tv" && (
              <>
                <div>
                  <dt>First aired</dt>
                  <dd>{formatDate(detail.firstAirDate) ?? "—"}</dd>
                </div>
                <div>
                  <dt>Last aired</dt>
                  <dd>{formatDate(detail.lastAirDate) ?? "—"}</dd>
                </div>
                <div>
                  <dt>Networks</dt>
                  <dd>{detail.networks.length ? detail.networks.join(", ") : "—"}</dd>
                </div>
                <div>
                  <dt>Show run</dt>
                  <dd>
                    {detail.numberOfSeasons != null
                      ? `${detail.numberOfSeasons} season${detail.numberOfSeasons === 1 ? "" : "s"}`
                      : "—"}
                    {detail.numberOfEpisodes != null
                      ? ` / ${detail.numberOfEpisodes} episode${detail.numberOfEpisodes === 1 ? "" : "s"}`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt>Episode length</dt>
                  <dd>{formatRuntime(detail.runtimeMinutes) ?? "—"}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{detail.status ?? "—"}</dd>
                </div>
              </>
            )}
            <div>
              <dt>Rating</dt>
              <dd>{detail.certification ?? "—"}</dd>
            </div>
            <div>
              <dt>Genres</dt>
              <dd>{detail.genres.length ? detail.genres.join(", ") : "—"}</dd>
            </div>
            <div>
              <dt>Production companies</dt>
              <dd>
                {detail.productionCompanies.length ? (
                  <ul className="detail__company-chips">
                    {detail.productionCompanies.map((company) => (
                      <li key={company.id}>
                        <CompanyBrowseChip company={company} mediaType={detail.mediaType} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </section>

        {people.map((block) =>
          block.people.length ? (
            <section key={block.label} className="detail__section">
              <h2>{block.label}</h2>
              <p className="detail__credit-hint">Tap someone to find more of their titles.</p>
              <ul className="detail__people">
                {block.people.map((person) => {
                  const photo = profileUrl(person.profilePath);
                  return (
                    <li key={`${block.label}-${person.id}-${person.role}`}>
                      <PersonBrowseButton
                        person={person}
                        mediaType={detail.mediaType}
                        className="detail__person detail__person--button"
                      >
                        <div className="detail__person-photo">
                          {photo ? (
                            <Image
                              src={photo}
                              alt=""
                              fill
                              sizes="72px"
                              className="detail__person-img"
                            />
                          ) : (
                            <span aria-hidden>{personInitials(person.name)}</span>
                          )}
                        </div>
                        <div>
                          <p className="detail__person-name">{person.name}</p>
                          <p className="detail__person-role">{person.role}</p>
                        </div>
                      </PersonBrowseButton>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null,
        )}

        <section className="detail__section">
          <h2>Where to watch</h2>
          {detail.watchNote && <p className="detail__watch-note">{detail.watchNote}</p>}
          {offerGroups.length === 0 ? (
            <p className="detail__empty-watch">No US watch options found right now.</p>
          ) : (
            <div className="detail__watch-groups">
              {offerGroups.map((group) => (
                <div key={group.monetization} className="detail__watch-group">
                  <h3>{monetizationLabel(group.monetization)}</h3>
                  <ul className="detail__watch-list">
                    {group.offers.map((offer) => {
                      const seasons = formatWatchSeasons(offer.seasons);
                      const logo = providerLogoUrl(offer.logoPath);
                      return (
                        <li key={`${offer.name}-${offer.monetization}`}>
                          <span className="detail__watch-logo" aria-hidden>
                            {logo ? (
                              <Image
                                src={logo}
                                alt=""
                                width={32}
                                height={32}
                                className="detail__watch-logo-img"
                              />
                            ) : (
                              <span className="detail__watch-logo-fallback">
                                {offer.name.slice(0, 1)}
                              </span>
                            )}
                          </span>
                          <span className="detail__watch-copy">
                            <span className="detail__watch-name">{offer.name}</span>
                            {seasons && <span className="detail__watch-seasons">{seasons}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {detail.similar.length > 0 && (
          <section className="detail__section detail__section--similar">
            <h2>More like this</h2>
            <MovieGrid
              movies={detail.similar}
              scoreSource="tmdb"
              rememberBrowseScroll={false}
              className="detail__similar-grid"
            />
          </section>
        )}

        <SiteFooter />
      </div>
    </div>
  );
}
