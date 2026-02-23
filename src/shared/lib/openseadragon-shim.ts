/**
 * OpenSeadragon shim — re-exports the CDN global so that libraries like
 * @annotorious/openseadragon resolve to the same OSD instance the app uses
 * (loaded via <script> in index.html) instead of the npm module.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OSD = (window as any).OpenSeadragon;
export default OSD;
