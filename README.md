# IIIF Field Archive Studio

A local-first, browser-based workbench for organizing, annotating, and connecting field research media using IIIF standards.

## ⚠️ Disclaimer: Vibe Coded
This project is **vibe coded**. It was developed through high-level intent and iterative AI-assisted exploration. While it implements rigorous standards like IIIF and W3C Web Annotations, the architecture reflects an experimental, "build-as-you-think" philosophy. Expect quirks, and embrace the vibes.

## Overview
IIIF Field Archive Studio acts as a "Darkroom for Digital Humanities." It bridges the gap between messy field data (raw photos, recordings, notes) and structured archival objects.

- **Local-First:** All data is stored in your browser's IndexedDB. No files are uploaded to a server.
- **Personal IIIF Ecosystem:** Includes an internal IIIF Image API 3.0 server (via Service Workers), a Presentation API 3.0 manifest editor, and a W3C Web Annotation environment.
- **Spatial Thinking:** Use the "Board" view to map relationships between items on an infinite canvas.
- **Standards-Driven:** Built from the ground up to comply with IIIF and W3C Web Annotation specifications.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20 or later recommended)
- [npm](https://www.npmjs.com/)

### Local Development
1. **Clone the repository:**
   ```bash
   git clone https://github.com/micahchoo/biiif-web-studio.git
   cd biiif-web-studio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Access the app:**
   Open `http://localhost:3000` in your browser.

**Note:** The application relies on Service Workers (`sw.js`) to serve IIIF image tiles. Ensure you are in a **Secure Context** (localhost or HTTPS). If images fail to load, check the "Service Workers" section in your browser's DevTools Application tab.

## 🛠 Workflows & Extension

### Replicating the Environment
This project is built with **Vite**, **React**, and **TypeScript**. 
- `vite.config.ts` handles the base path and environment variables.
- `sw.js` is the heart of the local IIIF Image API server, intercepting requests to `/iiif/image/`.

### Extending the Studio
- **Adding new metadata fields:** Modify the templates in `services/iiifBuilder.ts`.
- **Customizing the Board:** Explore `components/CanvasComposer.tsx` for spatial logic.
- **Changing Deployment:** The project is configured for GitHub Pages via `.github/workflows/deploy.yml`.

## 📦 Deployment
The studio is ready for GitHub Pages. 
1. Push your changes to the `main` branch.
2. Enable GitHub Actions in your repo settings (**Settings > Pages > Build and deployment > Source: GitHub Actions**).
3. The site will be available at `https://<username>.github.io/biiif-web-studio/`.

## 📜 Standards Compliance
- **IIIF Image API 3.0** (Level 2)
- **IIIF Presentation API 3.0**
- **W3C Web Annotation Data Model**
- **IIIF Content Search API 2.0**

---
*Built for field researchers, by vibes.*
