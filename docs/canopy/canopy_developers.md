# Canopy Developer Guide

## Architecture

Canopy templates are intentionally designed to be simple and modular. The project is structured to allow easy customization and extension by developers of varying skill levels. The core of Canopy is built using modern web technologies, including Markdown + JSX (MDX) for the frontend development and easy inlining of rich content.

```text
├── .cache/                        # build cache (gitignored)
├── app/
│   ├── components/
│   │   └── mdx.tsx                # registers custom React components for MDX
│   ├── scripts/
│   │   └── canopy-build.mts       # orchestrates Canopy build
│   └── styles/
│       └── index.css              # global CSS styles
├── assets/                        # directory for files, e.g. robots.txt, favicon.ico, images/**/
├── content/
│   ├── _app.mdx                   # global wrapper for all pages
│   ├── _layout.mdx                # inheritable layout for .mdx files
│   ├── about/                     # example directory for contextual content
│   ├── search/                    # special route for search results
│   └── works/                     # special route for all IIIF works
├── site/                          # generated site output (on build)
├── canopy.yml                     # Canopy configuration file
└── package.json                   # depends on @canopy-iiif/app
```

- `.cache/` is where build artifacts are stored to speed up subsequent builds.
- `app/` is intended for server-side scripts that developers could customize or extend.
- `assets/` is for static files like images, fonts, scripts, or other resources.
- `content/` is where all site content lives, including MDX files and IIIF work layouts.
- `site/` is the output directory for the deployed static site.
- `canopy.yml` file is the main configuration file for your Canopy project.
- `package.json` manages dependencies, including the core Canopy application package.

## Registering Components

Canopy lets you create global React components that are automatically available inside every MDX file.

```tsx filename="app/components/mdx.tsx" {7-9,13-15}
// Map SSR-safe components to be rendered at build time
export const components = {
  Example: "./Example.tsx",
};

// Map browser-only components to their source files
export const clientComponents = {
  ExampleClient: "./Example.client.tsx",
};
```

### Static Components
Anything inside `components` renders at build time and is exported entirely to the static site as HTML and JavaScript.

### Runtime components
Some components need `window`, `document`, or other browser-only features. List them under `clientComponents` and point each key to a module with a default export.

## Analytics and SEO

### Sitemap
On every build, a sitemap is generated automatically at the root of your site. Canopy automatically breaks sitemaps into chunks of 1,000 URLs.

### Robots.txt
A `robots.txt` file is generated at the root of your site to provide instructions to web crawlers.

### Google Analytics
Integrate Google Analytics using the `<GoogleAnalytics>` component.

```jsx filename="content/_app.mdx"
<GoogleAnalytics id="G-XXXXXXX" />
```

## Maintenance

### Updating Canopy
Update your Canopy installation to the latest version using `npm`:

```sh
npm i @canopy-iiif/app@latest
```

### Cache Management
Canopy writes heavy build artifacts to `.cache/`. 
- `.cache/iiif/`: normalized collections, manifests, and thumbnails.
- `.cache/mdx/`: compiled MDX modules.
- `.cache/search/`: bundled search templates.

## Releases

Canopy IIIF `v1.0.0` was published on December 19, 2025. Semantic version notes for `@canopy-iiif/app` are documented to track functionality improvements, bug fixes, and new features.
