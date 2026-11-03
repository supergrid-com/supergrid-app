// Vite's ?raw imports, for the main build (the renderer's types come from vite/client).
declare module "*?raw" {
  const content: string;
  export default content;
}
