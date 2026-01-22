
import JSZip from 'jszip';
import { IIIFItem, IIIFCollection, IIIFManifest, IIIFCanvas, IIIFAnnotation } from '../types';
import { validator } from './validator';

export interface ExportOptions {
    includeAssets: boolean;
    format: 'static-site' | 'raw-iiif';
    ignoreErrors?: boolean;
}

export interface ExportProgress {
    status: string;
    percent: number;
}

class ExportService {
    
    async exportArchive(root: IIIFItem, options: ExportOptions, onProgress: (p: ExportProgress) => void): Promise<Blob> {
        // 0. Validate
        if (!options.ignoreErrors) {
            onProgress({ status: 'Validating archive...', percent: 0 });
            const issues = validator.validate(root); // Validating root recursively ideally
            // Note: The current validator is shallow-ish. Real impl would walk tree.
            // For now, we assume validator checks structure.
            const errors = issues.filter(i => i.level === 'error');
            if (errors.length > 0) {
                throw new Error(`Validation failed: ${errors.length} errors found. Fix them or ignore validation.`);
            }
        }

        const zip = new JSZip();
        
        // 1. Traverse and Collect
        onProgress({ status: 'Scanning archive structure...', percent: 10 });
        const processedRoot = JSON.parse(JSON.stringify(root)); // Deep clone for mutation
        
        const assetsToAdd: { path: string, blob: Blob }[] = [];
        const filesToAdd: { path: string, content: string }[] = [];

        // Helper to process tree and collect assets/files
        const processItem = (item: IIIFItem, originalItem: IIIFItem) => {
            const originalId = item.id;
            // Robust ID parsing to handle various formats, assuming convention https://archive.local/iiif/type/id
            let idVal = originalId.split('/').pop() || 'unknown';
            let typeDir = item.type.toLowerCase();
            
            // Rewrite Links to Children
            if (item.items) {
                item.items.forEach((child, idx) => {
                    if (child.type === 'Collection' || child.type === 'Manifest') {
                        const childIdVal = child.id.split('/').pop();
                        const childType = child.type.toLowerCase();
                        child.id = `../${childType}/${childIdVal}.json`;
                    } else if (child.type === 'Canvas') {
                        if (options.includeAssets && (originalItem as any).items?.[idx]) {
                            const origCanvas = (originalItem as any).items[idx] as IIIFCanvas;
                            if (origCanvas._fileRef) {
                                const filename = origCanvas._fileRef.name;
                                const assetPath = `assets/${filename}`;
                                assetsToAdd.push({ path: assetPath, blob: origCanvas._fileRef });
                                
                                // Update Painting Annotation Body ID
                                const painting = child.items?.[0]?.items?.[0] as unknown as IIIFAnnotation;
                                if (painting && painting.body && !Array.isArray(painting.body)) {
                                    (painting.body as any).id = `../../${assetPath}`;
                                }
                            }
                        }
                    }
                });
            }

            const fileName = `iiif/${typeDir}/${idVal}.json`;
            filesToAdd.push({ path: fileName, content: JSON.stringify(item, null, 2) });
            
            if (originalItem.items) {
                originalItem.items.forEach((origChild, idx) => {
                    if (origChild.type === 'Collection' || origChild.type === 'Manifest') {
                         const cloneChild = item.items![idx];
                         processItem(cloneChild, origChild);
                    }
                });
            }
        };

        processItem(processedRoot, root);

        // 3. Add to Zip
        onProgress({ status: 'Compressing files...', percent: 60 });
        
        filesToAdd.forEach(f => zip.file(f.path, f.content));
        
        if (options.includeAssets) {
            assetsToAdd.forEach(a => zip.file(a.path, a.blob));
        }

        // 4. Static Site
        if (options.format === 'static-site') {
            const rootIdVal = root.id.split('/').pop();
            const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${root.label?.['none']?.[0] || 'Archive Export'}</title>
    <style>
        :root { --primary: #005596; --bg: #f8fafc; --surface: #ffffff; --text: #334155; }
        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; background: var(--bg); color: var(--text); line-height: 1.5; }
        .header { background: var(--surface); padding: 1rem 2rem; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 1rem; }
        .header h1 { margin: 0; font-size: 1.25rem; color: #0f172a; }
        .container { max-width: 1000px; margin: 2rem auto; padding: 0 1rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }
        .card { background: var(--surface); border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; transition: transform 0.2s; text-decoration: none; color: inherit; display: flex; flex-direction: column; }
        .card:hover { transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-color: var(--primary); }
        .thumb { aspect-ratio: 4/3; background: #f1f5f9; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .thumb img { width: 100%; height: 100%; object-fit: cover; }
        .thumb span { font-size: 2rem; }
        .meta { padding: 1rem; }
        .type { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; }
        .title { font-weight: 600; margin-top: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .breadcrumbs { margin-bottom: 1.5rem; display: flex; gap: 0.5rem; font-size: 0.9rem; color: #64748b; }
        .breadcrumbs a { color: var(--primary); text-decoration: none; }
        .breadcrumbs a:hover { text-decoration: underline; }
        .viewer { height: 80vh; background: #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; margin-top: 2rem; }
    </style>
</head>
<body>
    <header class="header">
        <div style="width:32px;height:32px;background:var(--primary);border-radius:4px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">IIIF</div>
        <h1>${root.label?.['none']?.[0] || 'Archive Export'}</h1>
    </header>
    <main class="container">
        <div id="breadcrumbs" class="breadcrumbs"></div>
        <div id="content"></div>
    </main>
    <script>
        const rootPath = 'iiif/${root.type.toLowerCase()}/${rootIdVal}.json';
        
        async function loadResource(path, breadcrumbs = []) {
            try {
                const res = await fetch(path);
                const data = await res.json();
                render(data, path, breadcrumbs);
            } catch (e) {
                document.getElementById('content').innerHTML = '<div style="color:red">Error loading resource. Ensure you are running this via a local server (or Firefox) due to CORS/File policies.</div>';
            }
        }

        function render(data, currentPath, crumbs) {
            // Update Breadcrumbs
            const nav = document.getElementById('breadcrumbs');
            nav.innerHTML = '';
            crumbs.forEach((c, i) => {
                const a = document.createElement('a');
                a.href = '#';
                a.textContent = c.label;
                a.onclick = (e) => { e.preventDefault(); loadResource(c.path, crumbs.slice(0, i)); };
                nav.appendChild(a);
                nav.appendChild(document.createTextNode(' / '));
            });
            const span = document.createElement('span');
            span.textContent = data.label.none ? data.label.none[0] : 'Current';
            nav.appendChild(span);

            const content = document.getElementById('content');
            content.innerHTML = '';

            if (data.type === 'Collection') {
                const grid = document.createElement('div');
                grid.className = 'grid';
                data.items.forEach(item => {
                    const a = document.createElement('a');
                    a.className = 'card';
                    a.href = '#';
                    
                    // Resolve relative ID to absolute path for fetch
                    // item.id is like "../manifest/id.json"
                    // We need to resolve it relative to currentPath "iiif/collection/id.json"
                    const dir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
                    const resolvedPath = new URL(item.id, document.baseURI + dir).href; 
                    // Hack for simple relative paths in zip without server:
                    // Just string manipulation if we assume standard structure
                    let cleanPath = item.id;
                    if(cleanPath.startsWith('../')) cleanPath = 'iiif/' + cleanPath.replace('../', '');
                    
                    a.onclick = (e) => { 
                        e.preventDefault(); 
                        loadResource(cleanPath, [...crumbs, { label: data.label.none[0], path: currentPath }]); 
                    };

                    const isCollection = item.type === 'Collection';
                    a.innerHTML = \`
                        <div class="thumb">
                            <span>\${isCollection ? '📁' : '📄'}</span>
                        </div>
                        <div class="meta">
                            <div class="type">\${item.type}</div>
                            <div class="title">\${item.label.none ? item.label.none[0] : 'Untitled'}</div>
                        </div>
                    \`;
                    grid.appendChild(a);
                });
                content.appendChild(grid);
            } else if (data.type === 'Manifest') {
                 content.innerHTML = \`
                    <div style="background:white;padding:2rem;border-radius:8px;text-align:center;">
                        <h2>\${data.label.none[0]}</h2>
                        <p>\${data.summary && data.summary.none ? data.summary.none[0] : ''}</p>
                        <div class="viewer">
                           [Simple Viewer Placeholder]<br>
                           (Manifest rendering requires a IIIF viewer like Mirador)<br>
                           <a href="\${currentPath}" target="_blank" style="color:#60a5fa;margin-top:1rem;display:inline-block">View JSON</a>
                        </div>
                        <div class="grid" style="margin-top:2rem">
                            \${data.items.map(canvas => {
                                const thumb = canvas.thumbnail ? canvas.thumbnail[0].id : '';
                                return \`
                                <div class="card">
                                    <div class="thumb">
                                        \${thumb ? \`<img src="\${thumb}">\` : '<span>🖼️</span>'}
                                    </div>
                                    <div class="meta"><div class="title">\${canvas.label.none[0]}</div></div>
                                </div>
                                \`;
                            }).join('')}
                        </div>
                    </div>
                 \`;
            }
        }

        // Init
        loadResource(rootPath);
    </script>
</body>
</html>`;
            zip.file("index.html", indexHtml);
        }

        onProgress({ status: 'Finalizing zip...', percent: 80 });
        const blob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
            onProgress({ status: 'Compressing...', percent: 80 + (metadata.percent * 0.2) });
        });
        
        onProgress({ status: 'Complete', percent: 100 });
        return blob;
    }
}

export const exportService = new ExportService();
