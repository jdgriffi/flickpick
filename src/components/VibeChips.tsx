"use client";

import { useRouter } from "next/navigation";
import { applyVibeFilter } from "@/lib/browse-session";
import type { MediaType, VibeTag } from "@/lib/types";

type Props = {
  vibes: VibeTag[];
  mediaType: MediaType;
};

export function VibeChips({ vibes, mediaType }: Props) {
  const router = useRouter();

  if (!vibes.length) return null;

  return (
    <section className="detail__section detail__section--vibes">
      <h2>Vibes</h2>
      <p className="detail__vibes-hint">Tap a tag to find more titles with that vibe.</p>
      <ul className="vibe-chips">
        {vibes.map((vibe) => (
          <li key={`${vibe.source}-${vibe.id}`}>
            <button
              type="button"
              className="vibe-chip"
              onClick={() => {
                applyVibeFilter(vibe, mediaType);
                router.push("/");
              }}
            >
              {vibe.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
