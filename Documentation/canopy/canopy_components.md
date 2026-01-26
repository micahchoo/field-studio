# Canopy Components

## Overview

Create contextual stories under `content/` using [MDX](https://mdxjs.com/) — Markdown with embedded components. Every file becomes a page during the build and can pull in IIIF resources, sliders, and cards.

See the [Creating Markdown Content guide](/create-markdown-content) for a full walkthrough.

## Bibliography

Content authors may add footnotes anywhere in a page using standard markdown syntax. The footnotes will be collected and displayed at the bottom of the respective page automatically. `<Bibliography />` reads every Markdown file in `content/`, gathers each footnote, and prints them in one clean list. Using the component generate single source for citations on your site.

```jsx
<Bibliography />
```

### Writing footnotes

Use standard markdown [footnote](https://pandoc.org/demo/example33/8.19-footnotes.html) syntax to add citations anywhere in your content.

```markdown filename="content/about/example.mdx"
By the 1770s the East India Company controlled Bengal's revenue, reshaping trade and taxation across colonial India.[^5]

[^5]: Seema Alavi, _Company to Crown: Power and Politics in India_, 2019.
```

`<Bibliography />` groups entries by page and preserves the note numbers so readers can follow each citation back to its essay.

### API

| Prop             | Type   | Default | Notes                                              |
| ---------------- | ------ | ------- | -------------------------------------------------- |
| `pageHeadingTag` | string | `h3`    | Element for the per-page headings inside the list. |

## Card

`<Card>` renders an anchored figure with an image, title, and optional subtitle. Use it when you need a lightweight teaser that links directly to a work page or supporting essay.

```jsx
<Card
  href="/works/the-town-and-pass-of-boondi-in-rajpootana.html"
  src="https://api.dc.library.northwestern.edu/api/v2/works/4bdb5a22-6c7f-498d-8e6e-e49ea9bc4778/thumbnail"
  alt="The town and pass of Boondi, in Rajpootana"
  title="The town & pass of Boondi"
  lazy={false}
/>
```

### Props

| Prop                     | Type    | Required | Notes                                                           |
| ------------------------ | ------- | -------- | --------------------------------------------------------------- |
| `href`                   | string  | ✅       | Destination URL for the figure link.                            |
| `title`                  | string  |          | Primary caption text shown under the image.                     |
| `subtitle`               | string  |          | Optional secondary line for composer, date, or summary.         |
| `src`                    | string  |          | Image URL (IIIF thumbnail, static JPG, or custom media).        |
| `alt`                    | string  |          | Accessible alt text; defaults to `title` if omitted.            |
| `imgWidth` / `imgHeight` | number  |          | Provide intrinsic size to keep ratios steady without CSS.       |
| `aspectRatio`            | number  |          | Alternative to width/height when you know the ratio.            |
| `lazy`                   | boolean |          | Lazily load the image (default `true`). Disable inside sliders. |
| `className`              | string  |          | Extra utility classes for custom layouts.                       |

## Image

`<Image>` embeds Clover’s zoomable viewer for any IIIF Image API resource or static asset. It handles deep zoom, lazy tile loading, and optional annotations without any manual wiring.

```jsx
<Image
  src="https://iiif.dc.library.northwestern.edu/iiif/3/3d4a01f1-664d-48aa-89b7-a887d3843644"
  isTiledImage
  alt="Lithographs of historic buildings in Lucknow, India"
  caption="Historic buildings in Lucknow, India, 1860. No. 12 The Shah Nujeef. No. 13 Khoorsyad Munzil. No. 14 The Motee Mahal. No. 15 Interior of the Compound of Alum Bagh."
/>
```

### Props

| Prop              | Type    | Required | Notes                                                          |
| ----------------- | ------- | -------- | -------------------------------------------------------------- |
| `src`             | string  | ✅       | IIIF Image API endpoint or static asset URL.                   |
| `isTiledImage`    | boolean |          | Set to `true` for IIIF Image API URLs so Clover fetches tiles. |
| `height`          | string  |          | CSS height for the viewport (`600px` default).                 |
| `alt`             | string  |          | Accessible alt text for the rendered canvas.                   |
| `caption`         | string  |          | Optional footer shown under the viewer.                        |
| `backgroundColor` | string  |          | Placeholder background while tiles load.                       |
| `annotations`     | array   |          | Clover annotation objects for callouts.                        |
| `className`       | string  |          | Extra classes for layout tweaks.                               |

## Map

`<Map>` renders an interactive Leaflet view that plots navPlace `Point` features extracted from your IIIF manifests.

```jsx
<Map iiifContent="https://tamulib-dc-labs.github.io/sesquicentennial-manifests/collections.json" />
```

### API

#### Map

| Prop              | Type                                                                 | Default       | Description                                                                                                       |
| ----------------- | -------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `iiifContent`     | string                                                               | `null`        | IIIF Manifest or Collection URL used to source navPlace markers.                                                  |
| `height`          | string \| number                                                     | `600px`       | Fixed height applied to the Leaflet container. Numbers automatically add `px`.                                    |
| `tileLayers`      | `Array<{ name, url, attribution, maxZoom?, minZoom?, subdomains? }>` | OpenStreetMap | One or more custom basemap definitions rendered via Leaflet tile layers.                                          |
| `scrollWheelZoom` | boolean                                                              | `false`       | Enable or disable scroll-wheel zooming.                                                                           |
| `cluster`         | boolean                                                              | `true`        | Toggle marker clustering (`leaflet.markercluster`).                                                               |
| `defaultCenter`   | `{lat, lng}` \| `'lat,lng'`                                          | `null`        | Fallback map view when no markers are available.                                                                  |
| `defaultZoom`     | number                                                               | `null`        | Overrides the automatic bounds fit and forces the map to use the provided zoom (optionally with `defaultCenter`). |

#### MapPoint

| Prop                                  | Type               | Description                                                                                                     |
| ------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `lat`                                 | number \| string   | Required latitude coordinates in decimal degrees.                                                               |
| `lng`                                 | number \| string   | Required longitude coordinates in decimal degrees.                                                              |
| `title`                               | string             | Marker title and popup heading.                                                                                 |
| `summary`                             | string             | Short description rendered inside the popup.                                                                    |
| `href`                                | string             | Optional link target (absolute, root-relative, or `/works/...`). When omitted the popup title stays plain text. |
| `thumbnail`                           | string             | Optional image URL displayed in the popup (defaults to the first referenced manifest thumbnail when omitted).   |
| `referencedManifests` / `manifest(s)` | string \| string[] | Resolve one or more manifest IDs/URLs into linked work references inside the popup.                             |
| `children`                            | MDX                | Additional markup rendered below the summary.                                                                   |

## ReferencedItems

`<ReferencedItems />` reads the current page’s `referencedManifests` and renders a responsive grid of linked cards. Place it near the end of an essay to cite the works you used.

```jsx
<ReferencedItems />
```

### Props

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `items` | array | | Provide custom `{href, title, thumbnail, summary}` entries instead of pulling from context. |
| `emptyLabel` | string or function | | Message rendered when no items exist; accepts a React node factory. |
| `className` | string | | Extra classes for spacing or theming. |
| `children` | node | | Optional heading or description rendered before the grid. |
| `...rest` | any | | Spread onto the wrapping `<section>`. |

## References

`<References />` lists every MDX page that cites a manifest through `referencedManifests`. Drop it on work layouts so readers can follow contextual essays without leaving the page template.

```jsx
<References id="https://api.dc.library.northwestern.edu/api/v2/works/d4c62d7f-f50d-4b29-85e0-5d380675bec7?as=iiif" />
```

### Props

| Prop        | Type   | Required | Notes                                                                                      |
| ----------- | ------ | -------- | ------------------------------------------------------------------------------------------ |
| `id`        | string |          | Manifest URI to inspect. Defaults to the manifest currently being rendered on a work page. |
| `title`     | string |          | Heading text shown above the backlink list. Defaults to `Referenced by`.                   |
| `className` | string |          | Additional classes applied to the wrapping `<dl>`.                                         |
| `...rest`   | any    |          | Passed through to the `<dl>` container.                                                    |

## Scroll

`<Scroll>` is a specialized text-focused component that outputs a IIIF Manifest as a vertically oriented canvas reader. A small thumbnail or image viewer is fixed to the side of the viewport while the textual annotations scroll alongside it.

### Props

| Prop          | Type   | Required | Notes                                                                     |
| ------------- | ------ | -------- | ------------------------------------------------------------------------- |
| `iiifContent` | string | ✅       | IIIF Manifest URL                                                         |
| `options`     | object |          | Passed to Clover and merged with global defaults from `sliderOptions.js`. |

## Search

Search primitives expose SSR-safe markup that hydrates into a FlexSearch-powered client app. Use `<Search />` for the default layout or mix the smaller components to control every region of the page.

```jsx
<Search />
```

### Props

| Component | Prop | Type | Notes |
| --- | --- | --- | --- |
| `Search` | `layout` | string | Optional layout override for the results region (`'grid'` or `'list'`). |
| `SearchForm` | `id`, `className` | string | Wire a custom label/`aria` relationship or add utility classes. |
| `SearchSummary` | `className` | string | Finely control typography above the results. |
| `SearchResults` | `layout` | string | Choose between `'grid'` (masonry) and `'list'` (stacked cards). |
| `SearchTabs` | `className` | string | Style the per-type toggle list. |
| `SearchTotal` | `className` | string | Display the live count anywhere on the page. |
| `SearchFormModal` | `mode` | `'dialog' \/ 'inline'` | Render the search drawer in dialog or inline form mode. |

## Slider

`<Slider>` wraps Clover’s carousel so you can stream manifests from a collection or facet feed. It hydrates client-side, stays SSR-safe, and links each slide back to its work page.

```jsx
<Slider iiifContent="https://api.dc.library.northwestern.edu/api/v2/collections/7ac5769f-a1d9-4227-a350-bf8bd8b1cddc?as=iiif" />
```

### Props

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `iiifContent` | string | ✅ | IIIF Collection URL or Canopy facet JSON (`/api/facet/...`). |
| `height` | string | | CSS height for the viewport area. |
| `options` | object | | Passed to Clover and merged with global defaults from `sliderOptions.js`. |
| `className` | string | | Adds classes to the slider container. |

## Timeline

`<Timeline>` renders a vertical track of `<TimelinePoint>` markers that stay in proportion to the range you supply.

### API

#### Timeline

| Prop          | Type             | Required | Notes                                                                                                     |
| ------------- | ---------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `title`       | string           |          | Optional heading rendered above the track.                                                                |
| `description` | string           |          | Short blurb shown under the heading.                                                                      |
| `range`       | object           |          | `{start, end, granularity}` controls proportional spacing. Granularity accepts `year`, `month`, or `day`. |
| `threshold`   | number           |          | Collapse points that fall within this many units of the selected granularity.                             |
| `steps`       | number           |          | Draw evenly spaced tick marks along the spine.                                                            |
| `height`      | string or number |          | Scrolling viewport height. Numbers are treated as pixels.                                                 |
| `locale`      | string           |          | Locale tag used for formatted dates.                                                                      |
| `children`    | nodes            | ✅       | One or more `<TimelinePoint>` elements.                                                                   |

#### TimelinePoint

| Prop                  | Type                 | Required | Notes                                                                  |
| --------------------- | -------------------- | -------- | ---------------------------------------------------------------------- |
| `date` / `value`      | string               | ✅       | Accepts ISO dates (`1776-07-04`), months (`July 1776`), or bare years. |
| `title`               | string               | ✅       | Label shown beside the point.                                          |
| `summary`             | string               |          | Short sentence under the title.                                        |
| `description`         | string               |          | Long-form copy shown inside the detail panel.                          |
| `side`                | `'left'` · `'right'` |          | Pin the marker to a side; otherwise it alternates.                     |
| `highlight`           | boolean              |          | Draw the point with the accent color.                                  |
| `referencedManifests` | array                |          | List of manifest IDs to resolve into teaser cards.                     |
| `iiifResources`       | array                |          | Provide `{href, label}` entries for non-manifest resources.            |
| `children`            | nodes                |          | Additional markup rendered in the detail drawer.                       |

## Viewer

`<Viewer>` renders the Clover IIIF viewer so you can embed a manifest or collection anywhere in MDX. It will render client-side, supports deep zoom, audio, and video, and inherits the project-wide viewer defaults.

```jsx
<Viewer iiifContent="https://api.dc.library.northwestern.edu/api/v2/works/0b2b8793-d4c7-4a55-8b53-61bfc54bc908?as=iiif" />
```

### Props

| Prop          | Type   | Required | Notes                                                     |
| ------------- | ------ | -------- | --------------------------------------------------------- |
| `iiifContent` | string | ✅       | IIIF Manifest or Collection URL.                          |
| `options`     | object |          | Merged with Canopy’s defaults before passing into Clover. |
| `className`   | string |          | Adds classes to the viewer container.                     |
| `height`      | string |          | CSS height override for the viewport.                     |
