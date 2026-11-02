import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HackerX",
    short_name: "HackerX",
    description: "Timeless ideas recommended by Hacker News readers.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [{ src: "/h-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
