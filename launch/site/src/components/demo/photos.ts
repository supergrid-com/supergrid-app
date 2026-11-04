// The demo's photos: Studio is a small ceramics studio, as in the launch film. Each is a WebP in
// public/demo, at most 640 px on its long side and 5 to 31 KB. The first ten are from Unsplash
// (Unsplash License, the photo's page is `unsplash`); the last five are the film's own
// (launch/video/film/public/photos), so the hero and the film show the same shop.

export type PhotoId =
  | "wheel-tools"
  | "cup-speckled"
  | "shelf-white"
  | "bowls-small"
  | "hands-wheel"
  | "shelf-colour"
  | "glazes"
  | "class"
  | "hands-shaping"
  | "potter-bowl"
  | "clay-tools"
  | "cups-kiln"
  | "tulip-pink"
  | "tulips-white"
  | "shop";

export const PHOTOS: Record<PhotoId, { w: number; h: number; file: string; unsplash?: string }> = {
  "wheel-tools": { w: 427, h: 640, file: "wheel-tools.jpg", unsplash: "ZBJhixjB2XY" },
  "cup-speckled": { w: 427, h: 640, file: "speckled-cup.jpg", unsplash: "bWlbcvFMUh4" },
  "shelf-white": { w: 640, h: 427, file: "shelf-white.jpg", unsplash: "ZOeyUJB6t_Y" },
  "bowls-small": { w: 640, h: 555, file: "pinch-bowls.jpg", unsplash: "OS-ebcAT9R4" },
  "hands-wheel": { w: 427, h: 640, file: "on-the-wheel.jpg", unsplash: "2_1pezL2DPQ" },
  "shelf-colour": { w: 640, h: 427, file: "seconds-shelf.jpg", unsplash: "1FPwnKpLeOE" },
  glazes: { w: 427, h: 640, file: "glaze-tests.jpg", unsplash: "tGK68eoSsbU" },
  class: { w: 427, h: 640, file: "wheel-class.jpg", unsplash: "xlucSRrieK0" },
  "hands-shaping": { w: 360, h: 640, file: "hand-building.jpg", unsplash: "OloJS1Eo0B4" },
  "potter-bowl": { w: 295, h: 640, file: "big-bowl.jpg", unsplash: "odIUqYAc5Js" },
  "clay-tools": { w: 640, h: 427, file: "clay-tools.jpg" },
  "cups-kiln": { w: 428, h: 640, file: "kiln-cups.jpg" },
  "tulip-pink": { w: 427, h: 640, file: "tulip-pink.jpg" },
  "tulips-white": { w: 640, h: 427, file: "tulips.jpg" },
  shop: { w: 481, h: 640, file: "the-shop.jpg" },
};

export const photoSrc = (id: PhotoId) => `/demo/${id}.webp`;
