/**
 * Canopy IIIF Template Files
 * These are bundled directly into exports for self-contained Canopy sites
 */

export const CANOPY_PACKAGE_JSON = `{
  "name": "@canopy-iiif/app-root",
  "version": "1.6.0",
  "description": "An open-source static site generator designed for fast creation, contextualization, and customization of a discovery-focused digital scholarship and collections website using IIIF APIs.",
  "private": true,
  "main": "app/scripts/canopy-build.mjs",
  "scripts": {
    "build": "tsx app/scripts/canopy-build.mts",
    "dev": "tsx app/scripts/canopy-build.mts"
  },
  "dependencies": {
    "@canopy-iiif/app": "^1.6.0",
    "@samvera/clover-iiif": "^3.3.2",
    "swiper": "^11.2.10",
    "esbuild": "^0.21.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/cli": "^4.1.13",
    "tailwindcss": "^4.1.13",
    "tsx": "^4.19.1"
  },
  "author": "Mat Jordan <mat@northwestern.edu>",
  "homepage": "https://canopy-iiif.github.io/app/",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/canopy-iiif/app.git",
    "directory": "packages/app"
  },
  "license": "MIT"
}`;

export const CANOPY_GITIGNORE = `node_modules/
.tool-versions

# canopy specific
site/
.template-build/

# remove this if you would like to commit the cache
.cache

# ignore pnpm local store (we standardize on npm)
.pnpm-store/

# Do not commit compiled UI stylesheet; built in dev/publish
packages/app/ui/styles/index.css

# Ignore built UI bundle; built on demand and at publish
packages/app/ui/dist/

# Test outputs
tests/coverage/
playwright-report/
test-results/
`;

export const CANOPY_LICENSE = `MIT License

Copyright (c) 2025 Mat Jordan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

export const CANOPY_BUILD_SCRIPT = `/**
 * Canopy build and development orchestration entry point
 *
 * This wrapper delegates to @canopy-iiif/app's orchestrator so the published
 * package manages core logic. Keeping the entry small ensures the generated
 * template which consumes the published package can stay up to date.
 *
 * See https://github.com/canopy-iiif/app for more information.
 *
 * @license MIT
 * Copyright (c) 2025 Mat Jordan
 */

import {orchestrate} from "@canopy-iiif/app/orchestrator";

const err = (msg: string): void => {
  console.error(\`[canopy][error] \${msg}\`);
};

orchestrate().catch((error: unknown) => {
  const message =
    error &&
    typeof error === "object" &&
    "stack" in error &&
    typeof error.stack === "string"
      ? error.stack
      : error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : String(error);
  err(message);
  process.exit(1);
});
`;

export const CANOPY_STYLES_INDEX = `@import "tailwindcss";
@import "@canopy-iiif/app/ui/styles/index.css";
@import "./custom.css";

@layer properties {
  :root,
  :host {
    --font-sans: system-ui, "Segoe UI", Helvetica, Arial, sans-serif;
    --font-serif: "Fraunces", Georgia, "Times New Roman", serif;
    --font-mono: "IBM Plex Mono", "ui-monospace", Menlo, Consolas, monospace;
    --default-font-family: var(--font-serif);
  }
}

@utility max-w-content {
  max-width: 1080px;
}

@utility max-w-wide {
  max-width: 1300px;
}

@layer base {
  html {
    font-size: 110%;
    font-weight: 300;
  }

  body {
    background: var(--color-gray-50);
    color: var(--color-gray-900);
  }

  h1,
  h2,
  h3,
  h4,
  .canopy-logo {
    font-family: var(--font-serif);
    font-weight: 600;
    letter-spacing: -0.025em;
  }
}
`;

export const CANOPY_STYLES_CUSTOM = `/**
 * Example custom color variables
 * @see https://canopy-iiif.github.io/app/docs/theming/tailwind#custom
 */

/* @layer properties {
  :root,
  :host {
    --color-northwestern-purple: #4e2a84;
    --color-accent-700: var(--color-northwestern-purple);
    --color-accent-default: var(--color-northwestern-purple);
  }
} */
`;

export const CANOPY_MDX_COMPONENTS = `/**
 * Replace the examples with your own components or add new ones. You
 * may also import components from dependencies and re-export them here.
 */

// Map SSR-safe components to be rendered at build time and used in MDX files
export const components = {
  Example: './Example.tsx',
};

// Map browser-only components to their source files; the builder bundles
// them separately and hydrates placeholders at runtime.
export const clientComponents = {
  ExampleClient: './Example.client.tsx',
};
`;

export const CANOPY_EXAMPLE_COMPONENT = `import React from "react";

export default function Example({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <article>
      <strong>{title}</strong>
      <p>{children}</p>
    </article>
  );
}
`;

export const CANOPY_EXAMPLE_CLIENT = `import React, {useEffect, useState} from "react";

export default function ExampleClient({text}: {text?: string}) {
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);

  useEffect(() => {
    const handle = () => setViewportWidth(window.innerWidth || null);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  return (
    <div>
      <p>
        This component is running in browser only as it requires access to the
        browser window and cannot safely be rendered at build time.
      </p>
      {text && <p>{text}</p>}
      <em>Viewport width: {viewportWidth ? \`\${viewportWidth}px\` : "..."}</em>
    </div>
  );
}
`;

export const CANOPY_CONTENT_LAYOUT = `<div>{props.children}</div>
`;

export const CANOPY_CONTENT_ABOUT_LAYOUT = `<Layout navigation={true} fluid={true}>
  {props.children}
</Layout>
`;

export const CANOPY_CONTENT_WORKS_LAYOUT = `---
type: work
---

import {
  Label,
  Summary,
  Metadata,
  RequiredStatement,
  References,
} from "@canopy-iiif/app/ui/server";

<Container variant="wide" className="canopy-work--layout">
  <div className="canopy-work--primary">
    <Viewer iiifContent={props.manifest.id} />
  </div>
  <div className="canopy-work--secondary">
    <header>
      <Label manifest={props.manifest} as="h1" />
      <Summary manifest={props.manifest} as="p" className="canopy-lead" />
    </header>
    <div>
      <References />
      <Metadata manifest={props.manifest} />
      <RequiredStatement manifest={props.manifest} />
      <Id id={props.manifest.id} />
    </div>
  </div>
</Container>
<Container>
  <h2>Related Items</h2>
  <RelatedItems iiifContent={props.manifest.id} top={3} />
</Container>
`;

export const CANOPY_CONTENT_SEARCH_LAYOUT = `<div className="canopy-search-results">
  <SearchTabs />
  <SearchSummary />
  <SearchResults />
</div>
`;

export const CANOPY_SEARCH_RESULT_ARTICLE = `import {ArticleCard} from "@canopy-iiif/app/ui";

<ArticleCard
  href={props.record?.href}
  title={props.record?.title || props.record?.href || "Untitled"}
  annotation={props.record?.annotation}
  summary={props.record?.summary || props.record?.summaryValue || ""}
  summaryMarkdown={
    props.record?.summaryMarkdown ||
    props.record?.summary ||
    props.record?.summaryValue ||
    ""
  }
  metadata={Array.isArray(props.record?.metadata) ? props.record.metadata : []}
  query={props.query}
  recordType={props.record?.type}
/>
`;

export const CANOPY_SEARCH_RESULT_FIGURE = `import {Card} from "@canopy-iiif/app/ui";

<Card
  href={props.record?.href}
  title={props.record?.title || props.record?.href || "Untitled"}
  src={props.record?.type === "work" ? props.record?.thumbnail : undefined}
  imgWidth={props.record?.thumbnailWidth}
  imgHeight={props.record?.thumbnailHeight}
  aspectRatio={props.thumbnailAspectRatio}
/>
`;

export const CANOPY_ROBOTS_TXT = `User-agent: *
Disallow: /
`;

export const CANOPY_DEPLOY_WORKFLOW = `name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: |
          npm config set fund false
          npm config set audit false
          npm ci --no-audit --no-fund || npm install --no-audit --no-fund

      - name: Configure Pages
        uses: actions/configure-pages@v5
        with:
          enablement: true
          token: \${{ secrets.GITHUB_TOKEN }}

      - name: Determine base path for Pages
        run: |
          REPO_NAME="\${GITHUB_REPOSITORY#*/}"
          if [[ "$REPO_NAME" == *.github.io ]]; then
            echo "CANOPY_BASE_PATH=" >> $GITHUB_ENV
          else
            echo "CANOPY_BASE_PATH=/$REPO_NAME" >> $GITHUB_ENV
          fi
      - name: Determine absolute base URL for Pages
        run: |
          OWNER="\${GITHUB_REPOSITORY%/*}"
          REPO="\${GITHUB_REPOSITORY#*/}"
          if [[ "$REPO" == "$OWNER.github.io" ]]; then
            BASE_URL="https://\${OWNER}.github.io"
          else
            BASE_URL="https://\${OWNER}.github.io/\${REPO}"
          fi
          echo "CANOPY_BASE_URL=\${BASE_URL}" >> $GITHUB_ENV

      - name: Build site
        env:
          CANOPY_CHUNK_SIZE: "10"
          CANOPY_FETCH_CONCURRENCY: "1"
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

export const CANOPY_UPDATE_WORKFLOW = `name: Update Canopy App

on:
  workflow_dispatch:
    inputs:
      npm_version:
        description: "Optional @canopy-iiif/app version (default latest)"
        required: false
        type: string
      clover_version:
        description: "Optional @samvera/clover-iiif version (default latest)"
        required: false
        type: string

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install updated packages
        env:
          APP_VERSION: \${{ github.event.inputs.npm_version }}
          CLOVER_VERSION: \${{ github.event.inputs.clover_version }}
        run: |
          npm config set fund false
          npm config set audit false
          APP_TARGET=\${APP_VERSION:-latest}
          CLOVER_TARGET=\${CLOVER_VERSION:-latest}
          npm install --no-audit --no-fund \\
            @canopy-iiif/app@"\${APP_TARGET}" \\
            @samvera/clover-iiif@"\${CLOVER_TARGET}"

      - name: Record changes
        id: git-status
        run: |
          if git diff --quiet HEAD -- package.json package-lock.json; then
            echo "changed=false" >> "$GITHUB_OUTPUT"
          else
            echo "changed=true" >> "$GITHUB_OUTPUT"
          fi

      - name: Create pull request
        if: steps.git-status.outputs.changed == 'true'
        uses: peter-evans/create-pull-request@v7
        with:
          branch: chore/update-canopy-app
          commit-message: "chore: update @canopy-iiif/app and @samvera/clover-iiif"
          title: "chore: update @canopy-iiif/app and @samvera/clover-iiif"
          body: |
            Automated update of \`@canopy-iiif/app\` and \`@samvera/clover-iiif\` triggered from the Actions tab.

            Review the diff, run \`npm install\`, and rerun your usual checks before merging.
          delete-branch: true

      - name: No update needed
        if: steps.git-status.outputs.changed != 'true'
        run: echo "@canopy-iiif/app and @samvera/clover-iiif are already up to date."
`;

// Generate _app.mdx with customized title
export const generateCanopyAppMdx = (title: string): string => `import {Meta, Stylesheet} from "@canopy-iiif/app/head";
import {CanopyHeader, CanopyFooter} from "@canopy-iiif/app/ui";

export function Head() {
  return (
    <>
      <Meta />
      <Stylesheet />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="true"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..600,50,0..1;1,9..144,300..600,50,0..1&display=swap"
        rel="stylesheet"
      />
    </>
  );
}

export function App({children}) {
  return (
    <>
      <CanopyHeader
        navigation={[
          {href: "/search", label: "Works"},
          {href: "/about", label: "About"},
        ]}
        logo={Logo}
      />
      <main>{children}</main>
      <CanopyFooter>
        <p>Copyright ${new Date().getFullYear()} ${title}, MIT License. A Canopy IIIF Project.</p>
      </CanopyFooter>
    </>
  );
}

export const Logo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
    <circle className="canopy-logo-backlight" cx="250" cy="250" r="250" />
    <path
      className="canopy-logo-overlay"
      d="M125,33.45C50.28,76.68,0,157.47,0,250s50.28,173.32,125,216.55c74.72-43.23,125-124.01,125-216.55S199.72,76.68,125,33.45Z"
    />
  </svg>
);
`;

// SVG Logo for Canopy
export const CANOPY_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <circle fill="#4f46e5" cx="250" cy="250" r="250"/>
  <path fill="#fff" opacity="0.3" d="M125,33.45C50.28,76.68,0,157.47,0,250s50.28,173.32,125,216.55c74.72-43.23,125-124.01,125-216.55S199.72,76.68,125,33.45Z"/>
</svg>`;
