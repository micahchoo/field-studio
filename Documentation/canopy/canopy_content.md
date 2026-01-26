# Canopy Content Authoring

## Overview

Create contextual stories under `content/` using [MDX](https://mdxjs.com/) — Markdown with embedded components. Every file becomes a page during the build and can pull in IIIF resources, sliders, and cards.

See the [Creating Markdown Content guide](/create-markdown-content) for a full walkthrough.

### Authoring basics

- Store `.mdx` files under `content/`. Nested directories become URL paths.
- Start each file with optional YAML front matter to set titles, metadata, and referenced manifests (see the [Frontmatter guide](./frontmatter)).
- Write Markdown as usual, then drop components such as `<Viewer />` or `<ReferencedItems />` wherever you need them.

## Frontmatter

Every MDX file can start with a YAML block to set page metadata, connect to works, or toggle special layouts.

| Key                   | Purpose                                                                     |
| --------------------- | --------------------------------------------------------------------------- |
| `title`               | Page title used for `<h1>` and `<title>`.                                   |
| `description`         | Optional blurb for `<meta name="description">`.                             |
| `type`                | Overrides the computed page type (used for layout + meta tags).             |
| `referencedManifests` | List of manifest URLs consumed by `<ReferencedItems />` / `<References />`. |
| `search`              | When set to `false`, removes the page from the search index.                |
| `canonical`           | Absolute or relative canonical URL for the page.                            |
| `image`               | URL or path to a image for and open graph and search results.               |

## Layout

The docs area is wrapped with the `<Layout>` component from `@canopy-iiif/app/ui/server`. It arranges the page into three distinct regions (sidebar navigation, main content, and optional on-page table of contents) and wires up global navigation metadata during build time.

```jsx filename="content/docs/_layout.mdx"
---
type: "docs"
---

<Layout navigation={true} fluid={true}>
  {props.children}
</Layout>
```

### Core props

- **`navigation`**: toggles the left-hand sidebar that renders your section menu.
- **`fluid`**: switches the content container from a centered max-width layout to full-width gutters.
- **`contentNavigation`**: enables the right-hand table of contents.

## Markdown Patterns

Every page in `content/` is an `.mdx` file: Markdown plus JSX components.

### Core Markdown patterns

- **Text, emphasis, headings**
- **Lists and blockquotes**
- **Images** (Markdown `![]()` or `<Image />`)
- **Tables and definition lists**
- **Code blocks and checklists**
- **Footnotes**

## Search Indexing

MDX pages contribute `type: 'page'` records unless explicitly excluded. The build process scans every `.mdx` file in your content directory. Any file with the frontmatter `search: false` is excluded.

## Works Pages

Every manifest discovered in your configured IIIF collections becomes a static page at `/works/<slug>.html`. Slugs are generated from the manifest label.

### Page structure

1. **Hero + Viewer** — `<Viewer>` renders the IIIF manifest.
2. **Metadata** — description lists of manifest labels.
3. **References** — backlinks from other essays.
4. **Related sliders** — curated content based on metadata.

---

## Metadata browse

Canopy builds `/metadata` automatically. It groups the metadata labels you list in `canopy.yml` (`metadata` array) and renders links to every unique value found across the ingested manifests. Each link jumps directly to search results filtered to that label/value pair.

### Page anatomy

1. **Intro copy** — `content/metadata/index.mdx` controls the opening paragraph.
2. **Facet sections** — For each configured label Canopy shows the heading and a list of values.
3. **Counts** — Values display the number of works that match the label/value pair.
