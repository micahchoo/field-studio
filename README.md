
# IIIF Field Archive Studio - Local Development

## 🚀 How to Run Locally

This application uses **TypeScript** and **React**, and relies on a **Service Worker** to serve IIIF images from the browser's database.

**You cannot simply open `index.html` in a browser.** You must use a local web server that supports ES Modules and compilation (like Vite).

### Quick Start with Vite

1.  **Install Dependencies** (if you haven't already):
    ```bash
    npm install vite @vitejs/plugin-react typescript react react-dom @types/react @types/react-dom --save-dev
    ```

2.  **Run the Development Server**:
    ```bash
    npx vite
    ```

3.  Open the URL shown (usually `http://localhost:5173`).

---

## ⚠️ Important: Fixing Broken Previews

The application uses a Service Worker (`sw.js`) to generate image tiles on the fly. If you see **broken images** or `404` errors for image tiles:

1.  **Check Service Worker Registration**:
    *   Open DevTools (F12) -> **Application** tab -> **Service Workers**.
    *   Ensure `sw.js` is registered and **Status** is "Activated and is running".
    *   If it says "Waiting to Activate", click **"Skip Waiting"**.

2.  **Secure Context Required**:
    *   Service Workers **only** work on `localhost` or `https://`.
    *   They **will not work** on `http://` (unless it's localhost) or `file://`.

3.  **Bypass Network**:
    *   In the **Network** tab, ensure "Disable Cache" is helpful, but ensure you aren't blocking the Service Worker from intercepting requests.
    *   The Service Worker intercepts requests to `/iiif/image/`. If the SW isn't running, the browser sends these requests to the Vite server, which returns 404 (because those files don't actually exist on the server).

4.  **Hard Refresh**:
    *   If you change `sw.js`, perform a hard refresh (`Ctrl+Shift+R` or `Cmd+Shift+R`) and unregister the old worker if necessary.
