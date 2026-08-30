/** App release metadata — bump when shipping. */
export const APP_VERSION = "1.4";
export const APP_BUILD_DATE = "2026_0830";
export const APP_COPYRIGHT_HOLDER = "ProjectBrain.dev";

export function copyrightYear(now = new Date()): number {
  return now.getFullYear();
}
