/**
 * Type declarations for openseadragon-filtering plugin.
 *
 * @see https://github.com/usnistgov/OpenSeadragonFiltering
 */

declare namespace OpenSeadragon {
  type FilterProcessor = (context: CanvasRenderingContext2D, callback: () => void) => void;

  interface FilterOptions {
    filters: Array<{
      processors: FilterProcessor | FilterProcessor[];
    }>;
  }

  interface Viewer {
    setFilterOptions(options: FilterOptions | null): void;
  }

  namespace Filters {
    function BRIGHTNESS(value: number): FilterProcessor;
    function CONTRAST(value: number): FilterProcessor;
    function INVERT(): FilterProcessor;
    function THRESHOLDING(threshold: number): FilterProcessor;
    function GREYSCALE(): FilterProcessor;
  }
}
