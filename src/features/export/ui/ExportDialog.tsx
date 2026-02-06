
import React, { useEffect, useState } from 'react';
import { getIIIFValue, IIIFItem, isCollection, isManifest } from '@/src/shared/types';
import { CanopyConfig, ExportOptions, exportService, ImageApiOptions, VirtualFile } from '@/src/shared/services/exportService';
import { ArchivalPackageOptions, archivalPackageService } from '@/src/shared/services/archivalPackageService';
import { activityStream as activityStreamService } from '@/src/shared/services/activityStream';
import { ValidationIssue, validator } from '@/src/shared/services/validator';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { ExportDryRun } from './ExportDryRun';
import { FirstTimeHint } from './Tooltip';
import FileSaver from 'file-saver';
import JSZip from 'jszip';

interface ExportDialogProps {
  root: IIIFItem | null;
  onClose: () => void;
}

type ExportStep = 'config' | 'canopy-config' | 'archival-config' | 'dry-run' | 'exporting';
type ExportFormat = 'raw-iiif' | 'canopy' | 'ocfl' | 'bagit' | 'activity-log';

export const ExportDialog: React.FC<ExportDialogProps> = ({ root, onClose }) => {
  const [step, setStep] = useState<ExportStep>('config');
  const [format, setFormat] = useState<ExportFormat>('canopy');
  const [includeAssets, setIncludeAssets] = useState(true);
  const [ignoreErrors, setIgnoreErrors] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ status: '', percent: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Escape key to close (unless processing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !processing) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, processing]);
  
  const [virtualFiles, setVirtualFiles] = useState<VirtualFile[]>([]);
  const [integrityIssues, setIntegrityIssues] = useState<ValidationIssue[]>([]);

  // Canopy configuration
  const [canopyConfig, setCanopyConfig] = useState<CanopyConfig>({
    title: root ? getIIIFValue(root.label) || 'IIIF Collection' : 'IIIF Collection',
    baseUrl: '',
    port: 8765, // Default IIIF server port
    theme: {
        accentColor: 'indigo',
        grayColor: 'slate',
        appearance: 'light'
    },
    search: {
        enabled: true,
        indexSummary: true
    },
    metadata: [], // Will be populated from root items
    featured: []  // Will be selected by user
  });

  // IIIF Image API options for export
  const [imageApiOptions, setImageApiOptions] = useState<ImageApiOptions>({
    includeWebP: false,
    includeGrayscale: false,
    includeSquare: false,
    tileSize: 512
  });

  // Archival package configuration (OCFL/BagIt)
  const [archivalConfig, setArchivalConfig] = useState<Partial<ArchivalPackageOptions>>({
    includeMedia: true,
    digestAlgorithm: 'sha256',
    organization: '',
    description: '',
    externalId: '',
    versionMessage: 'Initial export from IIIF Field Studio',
    user: { name: '', email: '' }
  });

  useEffect(() => {
      if (root && step === 'dry-run') {
          handleDryRun();
      }
  }, [step, format, includeAssets]);

  const handleDryRun = async () => {
      if (!root) return;
      // Skip dry run for archival formats - they have their own export flow
      if (format === 'ocfl' || format === 'bagit' || format === 'activity-log') {
          const issueMap = validator.validateTree(root);
          setIntegrityIssues(Object.values(issueMap).flat());
          setVirtualFiles([]);
          return;
      }
      setProcessing(true);
      try {
          const exportFormat = format === 'canopy' ? 'canopy' : 'raw-iiif';
          const files = await exportService.prepareExport(root, {
              format: exportFormat,
              includeAssets,
              ignoreErrors,
              canopyConfig: format === 'canopy' ? canopyConfig : undefined,
              imageApiOptions: format === 'canopy' ? imageApiOptions : undefined
          });
          setVirtualFiles(files);
          
          const issueMap = validator.validateTree(root);
          setIntegrityIssues(Object.values(issueMap).flat());
      } catch (e: any) {
          setErrorMsg(e.message);
      } finally {
          setProcessing(false);
      }
  };

  const handleFinalExport = async () => {
    if (!root) return;
    setStep('exporting');
    setErrorMsg(null);
    try {
        const exportFormat = format === 'canopy' ? 'canopy' : 'raw-iiif';
        const blob = await exportService.exportArchive(root, {
            format: exportFormat,
            includeAssets,
            ignoreErrors,
            canopyConfig: format === 'canopy' ? canopyConfig : undefined,
            imageApiOptions: format === 'canopy' ? imageApiOptions : undefined
        }, (p) => {
            setProgress(p);
        });
        FileSaver.saveAs(blob, `canopy-export-${new Date().toISOString().split('T')[0]}.zip`);
        onClose();
    } catch (e: any) {
        setErrorMsg(e.message);
        setStep('dry-run');
    }
  };

  const handleCanopyExport = async () => {
      // Auto-extract metadata keys if empty
      if (canopyConfig.metadata.length === 0 && root) {
          const keys = new Set<string>();
          const traverse = (item: IIIFItem) => {
              item.metadata?.forEach(m => {
                  const label = getIIIFValue(m.label);
                  if (label) keys.add(label);
              });
              item.items?.forEach(traverse);
          };
          traverse(root);
          setCanopyConfig(prev => ({ ...prev, metadata: Array.from(keys) }));
      }
      setStep('dry-run');
  };

  const handleActivityLogExport = async () => {
    setStep('exporting');
    setErrorMsg(null);
    setProgress({ status: 'Gathering activity history...', percent: 0 });

    try {
      setProgress({ status: 'Exporting activity log...', percent: 30 });

      // Get all activities
      const activities = await activityStreamService.exportAll();

      if (activities.length === 0) {
        throw new Error('No activities recorded yet. Make some changes to your manifests first.');
      }

      setProgress({ status: 'Generating Change Discovery collection...', percent: 50 });

      // Create IIIF Change Discovery collection
      const baseUrl = window.location.origin;
      const collection = await activityStreamService.exportAsChangeDiscovery(baseUrl);

      setProgress({ status: 'Creating download...', percent: 80 });

      // Create ZIP with collection and all activities
      const zip = new JSZip();
      zip.file('collection.json', JSON.stringify(collection, null, 2));
      zip.file('activities.json', JSON.stringify(activities, null, 2));

      // Add individual page files if many activities
      if (activities.length > 100) {
        const pageSize = 100;
        const pages = Math.ceil(activities.length / pageSize);
        for (let i = 0; i < pages; i++) {
          const page = await activityStreamService.exportPage(baseUrl, i);
          zip.file(`page-${i}.json`, JSON.stringify(page, null, 2));
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      FileSaver.saveAs(blob, `activity-log-${new Date().toISOString().split('T')[0]}.zip`);

      setProgress({ status: 'Complete!', percent: 100 });
      await new Promise(r => setTimeout(r, 500));
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to export activity log');
      setStep('config');
    }
  };

  const handleArchivalExport = async () => {
    if (!root) return;
    setStep('exporting');
    setErrorMsg(null);
    setProgress({ status: 'Initializing archival package...', percent: 0 });

    try {
      const options: ArchivalPackageOptions = {
        includeMedia: archivalConfig.includeMedia ?? true,
        digestAlgorithm: archivalConfig.digestAlgorithm || 'sha256',
        organization: archivalConfig.organization,
        description: archivalConfig.description,
        externalId: archivalConfig.externalId,
        versionMessage: archivalConfig.versionMessage,
        user: archivalConfig.user?.name ? archivalConfig.user as any : undefined
      };

      setProgress({ status: `Creating ${format.toUpperCase()} package...`, percent: 20 });

      const result = format === 'ocfl'
        ? await archivalPackageService.exportOCFL(root, options)
        : await archivalPackageService.exportBagIt(root, options);

      if (!result.success && result.errors.length > 0) {
        throw new Error(result.errors.join('; '));
      }

      setProgress({ status: 'Compressing files...', percent: 60 });

      // Create ZIP from result files
      const zip = new JSZip();
      for (const file of result.files) {
        if (typeof file.content === 'string') {
          zip.file(file.path, file.content);
        } else {
          zip.file(file.path, file.content);
        }
      }

      setProgress({ status: 'Generating download...', percent: 80 });
      const blob = await zip.generateAsync({ type: 'blob' });

      const filename = format === 'ocfl'
        ? `ocfl-${new Date().toISOString().split('T')[0]}.zip`
        : `bagit-${new Date().toISOString().split('T')[0]}.zip`;

      FileSaver.saveAs(blob, filename);

      setProgress({ status: 'Complete!', percent: 100 });
      await new Promise(r => setTimeout(r, 500));
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || `Failed to create ${format.toUpperCase()} package`);
      setStep('archival-config');
    }
  };

  const criticalErrors = integrityIssues.filter(i => i.level === 'error');

  // Helper to collect all manifests from the tree for featured items selection
  const collectManifests = (item: IIIFItem): { id: string; label: string }[] => {
  const manifests: { id: string; label: string }[] = [];
  const traverse = (node: IIIFItem) => {
    if (isManifest(node)) {
      manifests.push({
        id: node.id,
        label: getIIIFValue(node.label) || node.id.split('/').pop() || 'Untitled'
      });
    }
    node.items?.forEach(child => {
      if (isCollection(child) || isManifest(child)) {
        traverse(child as IIIFItem);
      }
    });
  };
  traverse(item);
  return manifests;
};

  const availableManifests = root ? collectManifests(root) : [];

  const toggleFeaturedItem = (manifestId: string) => {
    setCanopyConfig(prev => {
      const isSelected = prev.featured.includes(manifestId);
      if (isSelected) {
        return { ...prev, featured: prev.featured.filter(id => id !== manifestId) };
      } else if (prev.featured.length < 6) {
        return { ...prev, featured: [...prev.featured, manifestId] };
      }
      return prev; // Max 6 items reached
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" role="none">
        <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-dialog-title"
            className={`bg-white rounded-3xl shadow-2xl transition-all duration-500 overflow-hidden flex flex-col ${step === 'dry-run' ? 'max-w-5xl w-full' : 'max-w-md w-full'}`}
        >
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-iiif-blue rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Icon name="publish" />
                    </div>
                    <div>
                        <h2 id="export-dialog-title" className="text-lg font-black text-slate-800 uppercase tracking-tighter">Archive Export</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {step === 'config' ? 'Step 1: Format Selection' : step === 'canopy-config' ? 'Step 2: Site Configuration' : step === 'archival-config' ? 'Step 2: Package Configuration' : step === 'dry-run' ? 'Step 2: Integrity & Preview' : 'Step 3: Generating'}
                        </p>
                    </div>
                </div>
                {step !== 'exporting' && (
                    <button onClick={onClose} aria-label="Close dialog" className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <Icon name="close"/>
                    </button>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
                {errorMsg && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800 text-sm mb-6 flex gap-3 animate-in shake" role="alert">
                        <Icon name="error" className="shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold mb-1 uppercase tracking-tighter">Integrity Failure</p>
                            <p className="opacity-80">{errorMsg}</p>
                        </div>
                    </div>
                )}

                {step === 'config' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                        <FirstTimeHint
                            id="export-intro"
                            message="Choose how to package your archive. Canopy creates a ready-to-deploy website. Raw IIIF gives you just the JSON files."
                            icon="info"
                            className="mb-4"
                        />
                        <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-labelledby="export-format-label">
                            <span id="export-format-label" className="sr-only">Choose Export Format</span>
                            <button
                                role="radio"
                                aria-checked={format === 'canopy'}
                                className={`p-5 rounded-2xl border-2 text-left transition-all relative group ${format === 'canopy' ? 'border-iiif-blue bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                                onClick={() => setFormat('canopy')}
                            >
                                <Icon name="public" className={`text-2xl mb-3 ${format === 'canopy' ? 'text-iiif-blue' : 'text-slate-400'}`} />
                                <div className="font-bold text-sm text-slate-800 mb-1">Canopy IIIF Site</div>
                                <p className="text-[10px] text-slate-500 leading-tight">Modern Next.js static site with search, mapping, and themes.</p>
                                {format === 'canopy' && <div className="absolute top-4 right-4 text-iiif-blue"><Icon name="check_circle"/></div>}
                            </button>
                            <button
                                role="radio"
                                aria-checked={format === 'raw-iiif'}
                                className={`p-5 rounded-2xl border-2 text-left transition-all relative group ${format === 'raw-iiif' ? 'border-iiif-blue bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                                onClick={() => setFormat('raw-iiif')}
                            >
                                <Icon name="code" className={`text-2xl mb-3 ${format === 'raw-iiif' ? 'text-iiif-blue' : 'text-slate-400'}`} />
                                <div className="font-bold text-sm text-slate-800 mb-1">Raw IIIF</div>
                                <p className="text-[10px] text-slate-500 leading-tight">JSON documents and assets only.</p>
                                {format === 'raw-iiif' && <div className="absolute top-4 right-4 text-iiif-blue"><Icon name="check_circle"/></div>}
                            </button>
                        </div>

                        {/* Archival Preservation Formats */}
                        <div>
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Icon name="archive" className="text-sm" /> Digital Preservation
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    role="radio"
                                    aria-checked={format === 'ocfl'}
                                    className={`p-5 rounded-2xl border-2 text-left transition-all relative group ${format === 'ocfl' ? 'border-amber-600 bg-amber-50' : 'border-slate-100 hover:border-slate-200'}`}
                                    onClick={() => setFormat('ocfl')}
                                >
                                    <Icon name="inventory_2" className={`text-2xl mb-3 ${format === 'ocfl' ? 'text-amber-600' : 'text-slate-400'}`} />
                                    <div className="font-bold text-sm text-slate-800 mb-1">OCFL Package</div>
                                    <p className="text-[10px] text-slate-500 leading-tight">Oxford Common File Layout 1.1 with versioning.</p>
                                    {format === 'ocfl' && <div className="absolute top-4 right-4 text-amber-600"><Icon name="check_circle"/></div>}
                                </button>
                                <button
                                    role="radio"
                                    aria-checked={format === 'bagit'}
                                    className={`p-5 rounded-2xl border-2 text-left transition-all relative group ${format === 'bagit' ? 'border-purple-600 bg-purple-50' : 'border-slate-100 hover:border-slate-200'}`}
                                    onClick={() => setFormat('bagit')}
                                >
                                    <Icon name="shopping_bag" className={`text-2xl mb-3 ${format === 'bagit' ? 'text-purple-600' : 'text-slate-400'}`} />
                                    <div className="font-bold text-sm text-slate-800 mb-1">BagIt Bag</div>
                                    <p className="text-[10px] text-slate-500 leading-tight">RFC 8493 compliant with checksums.</p>
                                    {format === 'bagit' && <div className="absolute top-4 right-4 text-purple-600"><Icon name="check_circle"/></div>}
                                </button>
                            </div>
                        </div>

                        {/* Activity Log Export */}
                        <div>
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Icon name="history" className="text-sm" /> Change Tracking
                            </h3>
                            <button
                                role="radio"
                                aria-checked={format === 'activity-log'}
                                className={`p-5 rounded-2xl border-2 text-left transition-all relative group w-full ${format === 'activity-log' ? 'border-cyan-600 bg-cyan-50' : 'border-slate-100 hover:border-slate-200'}`}
                                onClick={() => setFormat('activity-log')}
                            >
                                <Icon name="sync_alt" className={`text-2xl mb-3 ${format === 'activity-log' ? 'text-cyan-600' : 'text-slate-400'}`} />
                                <div className="font-bold text-sm text-slate-800 mb-1">Activity Log (Change Discovery)</div>
                                <p className="text-[10px] text-slate-500 leading-tight">IIIF Change Discovery API 1.0 format. Tracks all create/update/delete operations for sync.</p>
                                {format === 'activity-log' && <div className="absolute top-4 right-4 text-cyan-600"><Icon name="check_circle"/></div>}
                            </button>
                        </div>

                        {format === 'canopy' && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                                <div className="flex items-center gap-2 text-blue-800 font-bold text-sm mb-2">
                                    <Icon name="auto_awesome" /> Plug & Play Compatible
                                </div>
                                <p className="text-xs text-blue-700">
                                    Generates a <code>canopy-export</code> package ready to drop into the Canopy IIIF template.
                                    Includes <code>canopy.yml</code> configuration and correctly structured IIIF data.
                                </p>
                            </div>
                        )}

                        {format !== 'canopy' && (
                            <label className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer group hover:bg-slate-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={includeAssets}
                                    onChange={e => setIncludeAssets(e.target.checked)}
                                    className="w-6 h-6 text-iiif-blue rounded-lg border-slate-300 focus:ring-iiif-blue"
                                />
                                <div>
                                    <div className="font-bold text-sm text-slate-700">Include Physical Assets</div>
                                    <div className="text-xs text-slate-500">Zip images and media files along with metadata.</div>
                                </div>
                            </label>
                        )}
                    </div>
                )}

                {step === 'archival-config' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center mb-6">
                            <Icon name={format === 'ocfl' ? 'inventory_2' : 'shopping_bag'} className={`text-4xl mb-2 ${format === 'ocfl' ? 'text-amber-600' : 'text-purple-600'}`} />
                            <h3 className="text-lg font-bold text-slate-800">
                                {format === 'ocfl' ? 'OCFL Package Settings' : 'BagIt Bag Settings'}
                            </h3>
                            <p className="text-sm text-slate-500">Configure your digital preservation package</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Digest Algorithm</label>
                                <select
                                    value={archivalConfig.digestAlgorithm || 'sha256'}
                                    onChange={e => setArchivalConfig({ ...archivalConfig, digestAlgorithm: e.target.value as 'sha256' | 'sha512' })}
                                    className="w-full border rounded-lg p-2 text-sm"
                                >
                                    <option value="sha256">SHA-256 (Recommended)</option>
                                    <option value="sha512">SHA-512</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Organization</label>
                                <input
                                    type="text"
                                    value={archivalConfig.organization || ''}
                                    onChange={e => setArchivalConfig({ ...archivalConfig, organization: e.target.value })}
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="Your Institution"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                            <textarea
                                value={archivalConfig.description || ''}
                                onChange={e => setArchivalConfig({ ...archivalConfig, description: e.target.value })}
                                className="w-full border rounded-lg p-2 text-sm"
                                rows={2}
                                placeholder="Description of this archival package..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">External Identifier</label>
                                <input
                                    type="text"
                                    value={archivalConfig.externalId || ''}
                                    onChange={e => setArchivalConfig({ ...archivalConfig, externalId: e.target.value })}
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="Optional external ID"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Version Message</label>
                                <input
                                    type="text"
                                    value={archivalConfig.versionMessage || ''}
                                    onChange={e => setArchivalConfig({ ...archivalConfig, versionMessage: e.target.value })}
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="Initial version"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">User Name</label>
                                <input
                                    type="text"
                                    value={archivalConfig.user?.name || ''}
                                    onChange={e => setArchivalConfig({ ...archivalConfig, user: { ...archivalConfig.user, name: e.target.value } })}
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="Your name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">User Email</label>
                                <input
                                    type="email"
                                    value={archivalConfig.user?.email || ''}
                                    onChange={e => setArchivalConfig({ ...archivalConfig, user: { ...archivalConfig.user, email: e.target.value } })}
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="your@email.com"
                                />
                            </div>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 rounded-xl border">
                            <input
                                type="checkbox"
                                checked={archivalConfig.includeMedia ?? true}
                                onChange={e => setArchivalConfig({ ...archivalConfig, includeMedia: e.target.checked })}
                                className={`rounded ${format === 'ocfl' ? 'text-amber-600' : 'text-purple-600'}`}
                            />
                            <div>
                                <span className="text-sm font-bold text-slate-700">Include Media Files</span>
                                <p className="text-xs text-slate-500">Bundle original images/audio/video with the package</p>
                            </div>
                        </label>

                        <div className={`p-4 rounded-xl border ${format === 'ocfl' ? 'bg-amber-50 border-amber-200' : 'bg-purple-50 border-purple-200'}`}>
                            <div className={`flex items-center gap-2 font-bold text-sm mb-2 ${format === 'ocfl' ? 'text-amber-800' : 'text-purple-800'}`}>
                                <Icon name="info" /> About {format === 'ocfl' ? 'OCFL' : 'BagIt'}
                            </div>
                            <p className={`text-xs ${format === 'ocfl' ? 'text-amber-700' : 'text-purple-700'}`}>
                                {format === 'ocfl'
                                    ? 'OCFL (Oxford Common File Layout) is a specification for storing digital objects in repositories with versioning, fixity, and long-term preservation in mind.'
                                    : 'BagIt is a hierarchical file packaging format for storage and transfer of arbitrary digital content. It includes manifest files with checksums for integrity verification.'
                                }
                            </p>
                        </div>
                    </div>
                )}

                {step === 'canopy-config' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center mb-6">
                            <Icon name="public" className="text-4xl text-iiif-blue mb-2" />
                            <h3 className="text-lg font-bold text-slate-800">Canopy Configuration</h3>
                            <p className="text-sm text-slate-500">Configure your site settings and visual theme</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Site Title</label>
                                <input
                                    type="text"
                                    value={canopyConfig.title}
                                    onChange={e => setCanopyConfig({ ...canopyConfig, title: e.target.value })}
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="My Collection"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Base URL</label>
                                <input
                                    type="text"
                                    value={canopyConfig.baseUrl}
                                    onChange={e => setCanopyConfig({ ...canopyConfig, baseUrl: e.target.value })}
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="Optional (e.g. https://...)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">IIIF Server Port</label>
                                <input
                                    type="number"
                                    value={canopyConfig.port || 8765}
                                    onChange={e => setCanopyConfig({ ...canopyConfig, port: parseInt(e.target.value) || 8765 })}
                                    className="w-full border rounded-lg p-2 text-sm"
                                    min={1024}
                                    max={65535}
                                    placeholder="8765"
                                />
                                <p className="text-xs text-slate-400 mt-1">Change if port 8765 is in use</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Theme Colors</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Accent Color</label>
                                    <select
                                        value={canopyConfig.theme.accentColor}
                                        onChange={e => setCanopyConfig({ ...canopyConfig, theme: { ...canopyConfig.theme, accentColor: e.target.value } })}
                                        className="w-full border rounded-lg p-2 text-sm capitalize"
                                    >
                                        {['indigo', 'violet', 'purple', 'plum', 'pink', 'tomato', 'orange', 'amber', 'lime', 'grass', 'teal', 'cyan'].map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Background Tone</label>
                                    <select
                                        value={canopyConfig.theme.grayColor}
                                        onChange={e => setCanopyConfig({ ...canopyConfig, theme: { ...canopyConfig.theme, grayColor: e.target.value } })}
                                        className="w-full border rounded-lg p-2 text-sm capitalize"
                                    >
                                        {['slate', 'gray', 'zinc', 'neutral', 'stone', 'sand', 'mauve', 'olive', 'sage'].map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200 flex-1">
                                <input
                                    type="checkbox"
                                    checked={canopyConfig.theme.appearance === 'dark'}
                                    onChange={e => setCanopyConfig({ ...canopyConfig, theme: { ...canopyConfig.theme, appearance: e.target.checked ? 'dark' : 'light' } })}
                                    className="rounded text-iiif-blue"
                                />
                                <span className="text-sm text-slate-700">Dark Mode Default</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200 flex-1">
                                <input
                                    type="checkbox"
                                    checked={canopyConfig.search.enabled}
                                    onChange={e => setCanopyConfig({ ...canopyConfig, search: { ...canopyConfig.search, enabled: e.target.checked } })}
                                    className="rounded text-iiif-blue"
                                />
                                <span className="text-sm text-slate-700">Enable Search</span>
                            </label>
                        </div>

                        {/* Image API Options */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Image Processing Options</label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={imageApiOptions.includeWebP}
                                        onChange={e => setImageApiOptions({ ...imageApiOptions, includeWebP: e.target.checked })}
                                        className="rounded text-iiif-blue"
                                    />
                                    <div>
                                        <span className="text-sm text-slate-700">WebP Format</span>
                                        <p className="text-[10px] text-slate-400">Smaller file sizes</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={imageApiOptions.includeGrayscale}
                                        onChange={e => setImageApiOptions({ ...imageApiOptions, includeGrayscale: e.target.checked })}
                                        className="rounded text-iiif-blue"
                                    />
                                    <div>
                                        <span className="text-sm text-slate-700">Grayscale</span>
                                        <p className="text-[10px] text-slate-400">Gray quality option</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={imageApiOptions.includeSquare}
                                        onChange={e => setImageApiOptions({ ...imageApiOptions, includeSquare: e.target.checked })}
                                        className="rounded text-iiif-blue"
                                    />
                                    <div>
                                        <span className="text-sm text-slate-700">Square Crops</span>
                                        <p className="text-[10px] text-slate-400">For thumbnails</p>
                                    </div>
                                </label>
                                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <div className="flex-1">
                                        <span className="text-sm text-slate-700">Tile Size</span>
                                        <p className="text-[10px] text-slate-400">Deep zoom tiles</p>
                                    </div>
                                    <select
                                        value={imageApiOptions.tileSize || 512}
                                        onChange={e => setImageApiOptions({ ...imageApiOptions, tileSize: parseInt(e.target.value) })}
                                        className="border rounded p-1 text-sm w-20"
                                    >
                                        <option value={256}>256</option>
                                        <option value={512}>512</option>
                                        <option value={1024}>1024</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Featured Items Picker */}
                        {availableManifests.length > 0 && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Featured Items <span className="font-normal text-slate-400">({canopyConfig.featured.length}/6 selected)</span>
                                </label>
                                <p className="text-xs text-slate-500 mb-3">Select up to 6 manifests to feature on the homepage.</p>
                                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                                    {availableManifests.map(manifest => (
                                        <label
                                            key={manifest.id}
                                            className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                                                canopyConfig.featured.includes(manifest.id) ? 'bg-blue-50' : ''
                                            } ${
                                                !canopyConfig.featured.includes(manifest.id) && canopyConfig.featured.length >= 6
                                                    ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={canopyConfig.featured.includes(manifest.id)}
                                                onChange={() => toggleFeaturedItem(manifest.id)}
                                                disabled={!canopyConfig.featured.includes(manifest.id) && canopyConfig.featured.length >= 6}
                                                className="rounded text-iiif-blue"
                                            />
                                            <span className="text-sm text-slate-700 truncate flex-1">{manifest.label}</span>
                                            {canopyConfig.featured.includes(manifest.id) && (
                                                <span className="text-xs text-iiif-blue font-medium">
                                                    #{canopyConfig.featured.indexOf(manifest.id) + 1}
                                                </span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 'dry-run' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {processing ? (
                            <div className="h-[500px] flex flex-col items-center justify-center gap-4 text-slate-400" aria-live="polite">
                                <div className="w-12 h-12 border-4 border-slate-100 border-t-iiif-blue rounded-full animate-spin"></div>
                                <p className="text-xs font-black uppercase tracking-widest">Synthesizing Archive DNA...</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex gap-4 mb-4">
                                    <div className={`flex-1 p-4 rounded-2xl border-2 flex items-center gap-4 ${criticalErrors.length > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                                        <Icon name={criticalErrors.length > 0 ? 'error' : 'verified'} className="text-2xl"/>
                                        <div>
                                            <p className="font-bold text-sm">{criticalErrors.length > 0 ? `${criticalErrors.length} Critical Issues` : 'Spec Compliance: Valid'}</p>
                                            <p className="text-[10px] opacity-75">{criticalErrors.length > 0 ? 'Fix issues below to ensure interoperability.' : 'Archive meets IIIF Presentation 3.0 standards.'}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-center min-w-[120px]">
                                        <span className="text-[9px] font-black text-slate-400 uppercase">Package Size</span>
                                        <span className="text-sm font-bold text-slate-700">~{includeAssets ? 'Calculated' : 'Small'}</span>
                                    </div>
                                </div>

                                <ExportDryRun files={virtualFiles} />
                                
                                {criticalErrors.length > 0 && (
                                    <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="warning" className="text-amber-600"/>
                                            <span className="text-xs font-medium text-amber-900">Archive has critical issues. You must fix them or override integrity.</span>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm">
                                            <input type="checkbox" checked={ignoreErrors} onChange={e => setIgnoreErrors(e.target.checked)} className="rounded text-amber-600"/>
                                            <span className="text-[9px] font-black uppercase text-amber-700">Ignore Errors</span>
                                        </label>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {step === 'exporting' && (
                    <div className="text-center py-12 space-y-6">
                        <div className="relative w-24 h-24 mx-auto" aria-live="polite">
                            <div className="absolute inset-0 border-8 border-slate-100 rounded-full"></div>
                            <div 
                                className="absolute inset-0 border-8 border-iiif-blue rounded-full transition-all duration-300"
                                style={{ 
                                    clipPath: `polygon(50% 50%, -50% -50%, ${progress.percent}% -50%, ${progress.percent}% 150%, -50% 150%)`,
                                    transform: 'rotate(-90deg)'
                                }}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center font-black text-iiif-blue">
                                {Math.round(progress.percent)}%
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{progress.status}</h3>
                            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-black">Archive Compression Engine</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-between items-center shrink-0">
                {step === 'config' && (
                    <>
                        <button onClick={onClose} className="px-6 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors uppercase tracking-widest text-xs">Cancel</button>
                        <button
                            onClick={() => {
                                if (format === 'canopy') setStep('canopy-config');
                                else if (format === 'ocfl' || format === 'bagit') setStep('archival-config');
                                else if (format === 'activity-log') handleActivityLogExport();
                                else setStep('dry-run');
                            }}
                            className={`text-white px-10 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl flex items-center gap-2 transition-all active:scale-95 ${format === 'activity-log' ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-iiif-blue hover:bg-blue-700'}`}
                        >
                            {format === 'canopy' ? 'Configure Site' : format === 'ocfl' || format === 'bagit' ? 'Configure Package' : format === 'activity-log' ? 'Export Log' : 'Start Dry Run'} <Icon name={format === 'activity-log' ? 'download' : 'arrow_forward'} />
                        </button>
                    </>
                )}
                {step === 'archival-config' && (
                    <>
                        <button onClick={() => setStep('config')} className="px-6 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors uppercase tracking-widest text-xs">Back</button>
                        <button
                            onClick={handleArchivalExport}
                            className={`text-white px-10 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl flex items-center gap-2 transition-all active:scale-95 ${format === 'ocfl' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                        >
                            Export {format.toUpperCase()} <Icon name="download" />
                        </button>
                    </>
                )}
                {step === 'canopy-config' && (
                    <>
                        <button onClick={() => setStep('config')} className="px-6 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors uppercase tracking-widest text-xs">Back</button>
                        <button
                            onClick={handleCanopyExport}
                            className="bg-iiif-blue text-white px-10 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-xl flex items-center gap-2 transition-all active:scale-95"
                        >
                            Generate Site Config <Icon name="arrow_forward" />
                        </button>
                    </>
                )}
                {step === 'dry-run' && !processing && (
                    <>
                        <button onClick={() => setStep('config')} className="px-6 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors uppercase tracking-widest text-xs">Back to Settings</button>
                        <button
                            onClick={handleFinalExport}
                            disabled={criticalErrors.length > 0 && !ignoreErrors}
                            className="bg-green-600 text-white px-10 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-green-700 shadow-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Finalize & Download ZIP <Icon name="download" />
                        </button>
                    </>
                )}
            </div>
        </div>
    </div>
  );
};
