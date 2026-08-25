"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { applyCompanyFilter, applyPersonFilter } from "@/lib/browse-session";
import type { CompanyFilter, CreditPerson, MediaType } from "@/lib/types";

type PersonProps = {
  person: CreditPerson;
  mediaType: MediaType;
  children: ReactNode;
  className?: string;
};

export function PersonBrowseButton({ person, mediaType, children, className }: PersonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        applyPersonFilter({ id: person.id, name: person.name }, mediaType);
        router.push("/");
      }}
    >
      {children}
    </button>
  );
}

type CompanyProps = {
  company: CompanyFilter;
  mediaType: MediaType;
};

export function CompanyBrowseChip({ company, mediaType }: CompanyProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="vibe-chip"
      onClick={() => {
        applyCompanyFilter(company, mediaType);
        router.push("/");
      }}
    >
      {company.name}
    </button>
  );
}
