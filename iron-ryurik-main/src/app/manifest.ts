import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Железный Рюрик",
    short_name: "Рюрик",
    description: "Приложение для управления тренажёрным залом",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "ru",
    icons: [
      {
        src: "/vercel.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/file.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
