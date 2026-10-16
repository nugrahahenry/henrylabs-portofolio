export const sharedOpenGraph = {
  type: "website" as const,
  siteName: "StarGod",
  images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "StarGod - Henry Nugraha's Universe" }],
};

export const sharedTwitter = {
  card: "summary_large_image" as const,
  images: ["/opengraph-image"],
};
