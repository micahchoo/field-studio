// Minimal Leaflet type declarations. Install @types/leaflet for full types.
declare module 'leaflet' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const L: any;
  export = L;
}
