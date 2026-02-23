/**
 * Minimal type stub for leaflet until @types/leaflet is installed.
 * @migration - replace with `npm install -D @types/leaflet` for full types
 */
declare module 'leaflet' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const L: any;
  export = L;
}
