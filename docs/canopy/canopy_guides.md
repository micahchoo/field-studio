# Canopy User Guides

## Quick Start

Stand up a Canopy project in just a few minutes:

1.  **Create a new repository** using the [canopy-iiif/template](https://github.com/canopy-iiif/template).
2.  **Publish with GitHub Pages** by enabling it in **Settings → Pages**.
3.  **Configure `canopy.yml`** with your IIIF Collection and Manifest URIs.
4.  **Commit changes** to trigger a rebuild and visit your new site!

## Creating Markdown Content

Author contextual content using formatted Markdown files in the `/content` directory.

### Steps:
- Create a `.mdx` file in `content/`.
- Add frontmatter (e.g., `title`, `referencedManifests`).
- Embed IIIF components like `<Viewer />` or `<Slider />`.
- Use `<ReferencedItems />` to link scholarly content back to your collection.

## Customize the Search Index

Tune which fields feed FlexSearch and how records are grouped into tabs.

- **Enable Metadata**: Set `search.index.metadata.enabled` to `true`.
- **Index Summaries**: Toggle `search.index.summary.enabled`.
- **Annotations**: Write annotation bodies to the index by enabling `search.index.annotations.enabled`.
- **Custom Tabs**: Group results into tabs like `work`, `docs`, or `page` via `search.results` in `canopy.yml`.

## Enable a Map with navPlace

Plot every Manifest that exposes IIIF Presentation 3 navPlace `Point` features.

- **Data**: Include `navPlace` in your manifests.
- **Embed**: Use `<Map iiifContent="..." />` in MDX.
- **Custom Points**: Add arbitrary coordinates using `<MapPoint lat="..." lng="..." />`.

## Using with Tropy

Leverage [Tropy](https://tropy.org/) and the [Tropiiify plugin](https://github.com/arkalab/tropiiify) to export your local images as a IIIF Collection.

1.  **Host Images**: Create a GitHub repository to serve your images.
2.  **Describe in Tropy**: Organize and describe your works.
3.  **Export IIIF**: Use Tropiiify to generate tiled images, manifests, and a collection.
4.  **Connect Canopy**: Point `collection` in `canopy.yml` to your exported `index.json`.

## Sharing Content

Works can be shared via **IIIF Content State**, allowing links to open to specific views (e.g., a specific page of a book).

- **Interoperable**: Links stay portable across different IIIF viewers.
- **Base64 Encoding**: Complex state is encoded for sharing in URLs.

## Using Metadata Collections

Reuse the generated facet collections in custom MDX pages.

- **Auto-generated**: Canopy creates IIIF Collections for every metadata label/value pair.
- **Embed**: Point `<Slider />` or `<Viewer />` at `/api/facet/{label}/{value}.json`.

## Defining Custom Components

Extend Canopy with browser-only code (e.g., integrating StoryMapJS).

- **Registration**: Register browser-only components under `clientComponents` in `app/components/mdx.tsx`.
- **Wrapper**: Create a React wrapper that handles side effects and script loading.
- **Assets**: Store static configuration (like JSON) under `assets/`.
