import {
  APP_BUILD_DATE,
  APP_COPYRIGHT_HOLDER,
  APP_VERSION,
  copyrightYear,
} from "@/lib/site";

type Props = {
  /** When true, note that IMDb scores come via OMDb. */
  imdbViaOmdb?: boolean;
};

export function SiteFooter({ imdbViaOmdb = false }: Props) {
  const year = copyrightYear();

  return (
    <footer className="footer">
      <p className="footer__credit">
        Powered by{" "}
        <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">
          TMDB
        </a>
        {imdbViaOmdb ? " · IMDb scores via OMDb" : ""}
      </p>
      <p className="footer__legal">
        Copyright {year} {APP_COPYRIGHT_HOLDER}. Version {APP_VERSION} ({APP_BUILD_DATE})
      </p>
    </footer>
  );
}
