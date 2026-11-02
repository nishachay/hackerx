/** Per-page Open Graph tags. Next does not apply the app-root
 * opengraph-image convention (or layout-level images) to pages inside the
 * (site) route group, so each page sets its image explicitly. Tweet pages
 * keep their own generated per-post image. */
const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, type: "image/png" as const };

export function og(title: string, description: string) {
  return {
    openGraph: { title, description, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image" as const, title, description },
  };
}
