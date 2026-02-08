
import React, { useEffect, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { getIIIFValue, IIIFItem, isCollection, isManifest } from '@/src/shared/types';
import { CanopyConfig, ExportOptions, exportService, ImageApiOptions, VirtualFile } from '../model/exportService';
import { ArchivalPackageOptions, archivalPackageService } from '../model/archivalPackageService';
import { activityStream as activityStreamService } from '@/src/shared/services/activityStream';
import { ValidationIssue, validator } from '@/src/entities/manifest/model/validation/validator';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { ExportDryRun } from './ExportDryRun';
import { FirstTimeHint } from '@/src/shared/ui/molecules/Tooltip';
import { guidance } from '@/src/shared/services/guidanceService';
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
      } catch (e: unknown) {
          setErrorMsg(e instanceof Error ? e.message : 'Export preview failed');
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
    } catch (e: unknown) {
        setErrorMsg(e instanceof Error ? e.message : 'Export failed');
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
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to export activity log');
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
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : `Failed to create ${format.toUpperCase()} package`);
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
    <div className="fixed inset-0 bg-nb-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" role="none">
        <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-dialog-title"
            className={`bg-nb-white shadow-brutal-lg transition-nb duration-500 overflow-hidden flex flex-col ${step === 'dry-run' ? 'max-w-5xl w-full' : 'max-w-md w-full'}`}
        >
            <div className="p-6 border-b flex justify-between items-center bg-nb-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-iiif-blue flex items-center justify-center text-white shadow-brutal">
                        <Icon name="publish" />
                    </div>
                    <div>
                        <h2 id="export-dialog-title" className="text-lg font-black text-nb-black uppercase tracking-tighter">Archive Export</h2>
                        <p className="text-[10px] font-bold text-nb-black/40 uppercase tracking-widest">
                            {step === 'config' ? 'Step 1: Format Selection' : step === 'canopy-config' ? 'Step 2: Site Configuration' : step === 'archival-config' ? 'Step 2: Package Configuration' : step === 'dry-run' ? 'Step 2: Integrity & Preview' : 'Step 3: Generating'}
                        </p>
                    </div>
                </div>
                {step !== 'exporting' && (
                    <Button variant="ghost" size="bare" onClick={onClose} aria-label="Close dialog" className="p-2 hover:bg-nb-cream text-nb-black/40 transition-nb">
                        <Icon name="close"/>
                    </Button>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
                {errorMsg && (
                    <div className="bg-nb-red/10 border border-nb-red/30 p-4 text-nb-red text-sm mb-6 flex gap-3 animate-in shake" role="alert">
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
                            initialDismissed={guidance.hasSeen('hint-export-intro')}
                            onDismiss={() => guidance.markSeen('hint-export-intro')}
                        />
                        <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-labelledby="export-format-label">
                            <span id="export-format-label" className="sr-only">Choose Export Format</span>
                            <Button variant="ghost" size="bare"
                                role="radio"
                                aria-checked={format === 'canopy'}
                                className={`p-5 border-2 text-left transition-nb relative group ${format === 'canopy' ? 'border-iiif-blue bg-nb-blue/10' : 'border-nb-black/10 hover:border-nb-black/20'}`}
                                onClick={() => setFormat('canopy')}
                            >
                                <Icon name="public" className={`text-2xl mb-3 ${format === 'canopy' ? 'text-iiif-blue' : 'text-nb-black/40'}`} />
                                <div className="font-bold text-sm text-nb-black mb-1">Canopy IIIF Site</div>
                                <p className="text-[10px] text-nb-black/50 leading-tight">Modern Next.js static site with search, mapping, and themes.</p>
                                {format === 'canopy' && <div className="absolute top-4 right-4 text-iiif-blue"><Icon name="check_circle"/></div>}
                            </Button>
                            <Button variant="ghost" size="bare"
                                role="radio"
                                aria-checked={format === 'raw-iiif'}
                                className={`p-5 border-2 text-left transition-nb relative group ${format === 'raw-iiif' ? 'border-iiif-blue bg-nb-blue/10' : 'border-nb-black/10 hover:border-nb-black/20'}`}
                                onClick={() => setFormat('raw-iiif')}
                            >
                                <Icon name="code" className={`text-2xl mb-3 ${format === 'raw-iiif' ? 'text-iiif-blue' : 'text-nb-black/40'}`} />
                                <div className="font-bold text-sm text-nb-black mb-1">Raw IIIF</div>
                                <p className="text-[10px] text-nb-black/50 leading-tight">JSON documents and assets only.</p>
                                {format === 'raw-iiif' && <div className="absolute top-4 right-4 text-iiif-blue"><Icon name="check_circle"/></div>}
                            </Button>
                        </div>

                        {/* Archival Preservation Formats */}
                        <div>
                            <h3 className="text-xs font-black text-nb-black/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Icon name="archive" className="text-sm" /> Digital Preservation
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Button variant="ghost" size="bare"
                                    role="radio"
                                    aria-checked={format === 'ocfl'}
                                    className={`p-5 border-2 text-left transition-nb relative group ${format === 'ocfl' ? 'border-nb-orange bg-nb-orange/10' : 'border-nb-black/10 hover:border-nb-black/20'}`}
                                    onClick={() => setFormat('ocfl')}
                                >
                                    <Icon name="inventory_2" className={`text-2xl mb-3 ${format === 'ocfl' ? 'text-nb-orange' : 'text-nb-black/40'}`} />
                                    <div className="font-bold text-sm text-nb-black mb-1">OCFL Package</div>
                                    <p className="text-[10px] text-nb-black/50 leading-tight">Oxford Common File Layout 1.1 with versioning.</p>
                                    {format === 'ocfl' && <div className="absolute top-4 right-4 text-nb-orange"><Icon name="check_circle"/></div>}
                                </Button>
                                <Button variant="ghost" size="bare"
                                    role="radio"
                                    aria-checked={format === 'bagit'}
                                    className={`p-5 border-2 text-left transition-nb relative group ${format === 'bagit' ? 'border-nb-purple bg-nb-purple/5' : 'border-nb-black/10 hover:border-nb-black/20'}`}
                                    onClick={() => setFormat('bagit')}
                                >
                                    <Icon name="shopping_bag" className={`text-2xl mb-3 ${format === 'bagit' ? 'text-nb-purple' : 'text-nb-black/40'}`} />
                                    <div className="font-bold text-sm text-nb-black mb-1">BagIt Bag</div>
                                    <p className="text-[10px] text-nb-black/50 leading-tight">RFC 8493 compliant with checksums.</p>
                                    {format === 'bagit' && <div className="absolute top-4 right-4 text-nb-purple"><Icon name="check_circle"/></div>}
                                </Button>
                            </div>
                        </div>

                        {/* Activity Log Export */}
                        <div>
                            <h3 className="text-xs font-black text-nb-black/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Icon name="history" className="text-sm" /> Change Tracking
                            </h3>
                            <Button variant="ghost" size="bare"
                                role="radio"
                                aria-checked={format === 'activity-log'}
                                className={`p-5 border-2 text-left transition-nb relative group w-full ${format === 'activity-log' ? 'border-cyan-600 bg-nb-blue/10' : 'border-nb-black/10 hover:border-nb-black/20'}`}
                                onClick={() => setFormat('activity-log')}
                            >
                                <Icon name="sync_alt" className={`text-2xl mb-3 ${format === 'activity-log' ? 'text-nb-blue' : 'text-nb-black/40'}`} />
                                <div className="font-bold text-sm text-nb-black mb-1">Activity Log (Change Discovery)</div>
                                <p className="text-[10px] text-nb-black/50 leading-tight">IIIF Change Discovery API 1.0 format. Tracks all create/update/delete operations for sync.</p>
                                {format === 'activity-log' && <div className="absolute top-4 right-4 text-nb-blue"><Icon name="check_circle"/></div>}
                            </Button>
                        </div>

                        {format === 'canopy' && (
                            <div className="p-4 bg-nb-blue/10 border border-nb-blue/30 ">
                                <div className="flex items-center gap-2 text-nb-blue font-bold text-sm mb-2">
                                    <Icon name="auto_awesome" /> Plug & Play Compatible
                                </div>
                                <p className="text-xs text-nb-blue">
                                    Generates a <code>canopy-export</code> package ready to drop into the Canopy IIIF template.
                                    Includes <code>canopy.yml</code> configuration and correctly structured IIIF data.
                                </p>
                            </div>
                        )}

                        {format !== 'canopy' && (
                            <label className="flex items-center gap-4 p-5 bg-nb-white border border-nb-black/10 cursor-pointer group hover:bg-nb-cream transition-nb">
                                <input
                                    type="checkbox"
                                    checked={includeAssets}
                                    onChange={e => setIncludeAssets(e.target.checked)}
                                    className="w-6 h-6 text-iiif-blue border-nb-black/20 focus:ring-iiif-blue"
                                />
                                <div>
                                    <div className="font-bold text-sm text-nb-black/80">Include Physical Assets</div>
                                    <div className="text-xs text-nb-black/50">Zip images and media files along with metadata.</div>
                                </div>
                            </label>
                        )}
                    </div>
                )}

                {step === 'archival-config' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center mb-6">
                            <Icon name={format === 'ocfl' ? 'inventory_2' : 'shopping_bag'} className={`text-4xl mb-2 ${format === 'ocfl' ? 'text-nb-orange' : 'text-nb-purple'}`} />
                            <h3 className="text-lg font-bold text-nb-black">
                                {format === 'ocfl' ? 'OCFL Package Settings' : 'BagIt Bag Settings'}
                            </h3>
                            <p className="text-sm text-nb-black/50">Configure your digital preservation package</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-nb-black/80 mb-1">Digest Algorithm</label>
                                <select
                                    value={archivalConfig.digestAlgorithm || 'sha256'}
                                    onChange={e => setArchivalConfig({ ...archivalConfig, digestAlgorithm: e.target.value as 'sha256' | 'sha512' })}
                                    className="w-full border p-2 text-sm"
                                >
                                    <option value="sha256">SHA-256 (Recommended)</option>
                                    <option value="sha512">SHA-512</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-nb-black/80 mb-1">Organization</label>
                                <input
                                    type="text"
                                    value={archivalConfig.organization || ''}
                                    onChange={e => setArchivalConfig({ ...archivalConfig, organization: e.target.value })}
                                    className="w-full border p-2 text-sm"
                                    placeholder="Your Institution"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-nb-black/80 mb-1">Description</label>
                            <textarea
                                value={archivalConfig.description || ''}
                                onChange={e => setArchivalConfig({ ...archivalConfig, description: e.target.value })}
                                className="w-full border p-2 text-sm"
                                rows={2}
                                placeholder="Description of this archival package..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-nb-black/80 mb-1">External Identifier</label>
                                <input
                                    type="text"
                                    value={archivalConfig.externalId || ''}
                                    onChange={e => setArchivalConfig({ ...archivalConfig, externalId: e.target.value })}
                                    className="w-full border p-2 text-sm"
                                    placeholder="Optional external ID"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-nb-black/80 mb-1">Version Message</label>
                                <input
                                    type="text"
                                    value={archivalConfig.versionMessage || ''}
                                    onChange={e => setArchivalConfig({ ...archivalConfig, versionMessage: e.target.value })}
                                    className="w-full border p-2 text-sm"
                                    placeholder="Initial version"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-nb-black/80 mb-1">User Name</label>
                                <input
                                    type="text"
                                    value={archivalConfig.user?.name || ''}
                                    onChange={e => setArchivalConfig({ ...archivalConfig, user: { ...archivalConfig.user, name: e.target.value } })}
                                    className="w-full border p-2 text-sm"
                                    placeholder="Your name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-nb-black/80 mb-1">User Email</label>
                                <input
                                    type="email"
                                    value={archivalConfig.user?.email || ''}
                                    onChange={e => setArchivalConfig({ ...archivalConfig, user: { ...archivalConfig.user, email: e.target.value } })}
                                    className="w-full border p-2 text-sm"
                                    placeholder="your@email.com"
                                />
                            </div>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer p-4 bg-nb-white border">
                            <input
                                type="checkbox"
                                checked={archivalConfig.includeMedia ?? true}
                                onChange={e => setArchivalConfig({ ...archivalConfig, includeMedia: e.target.checked })}
                                className={`${format === 'ocfl' ? 'text-nb-orange' : 'text-nb-purple'}`}
                            />
                            <div>
                                <span className="text-sm font-bold text-nb-black/80">Include Media Files</span>
                                <p className="text-xs text-nb-black/50">Bundle original images/audio/video with the package</p>
                            </div>
                        </label>

                        <div className={`p-4 border ${format === 'ocfl' ? 'bg-nb-orange/10 border-nb-orange/20' : 'bg-nb-purple/5 border-nb-purple/20'}`}>
                            <div className={`flex items-center gap-2 font-bold text-sm mb-2 ${format === 'ocfl' ? 'text-nb-orange' : 'text-nb-purple'}`}>
                                <Icon name="info" /> About {format === 'ocfl' ? 'OCFL' : 'BagIt'}
                            </div>
                            <p className={`text-xs ${format === 'ocfl' ? 'text-nb-orange' : 'text-nb-purple'}`}>
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
                            <h3 className="text-lg font-bold text-nb-black">Canopy Configuration</h3>
                            <p className="text-sm text-nb-black/50">Configure your site settings and visual theme</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-nb-black/80 mb-1">Site Title</label>
                                <input
                                    type="text"
                                    value={canopyConfig.title}
                                    onChange={e => setCanopyConfig({ ...canopyConfig, title: e.target.value })}
                                    className="w-full border p-2 text-sm"
                                    placeholder="My Collection"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-nb-black/80 mb-1">Base URL</label>
                                <input
                                    type="text"
                                    value={canopyConfig.baseUrl}
                                    onChange={e => setCanopyConfig({ ...canopyConfig, baseUrl: e.target.value })}
                                    className="w-full border p-2 text-sm"
                                    placeholder="Optional (e.g. https://...)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-nb-black/80 mb-1">IIIF Server Port</label>
                                <input
                                    type="number"
                                    value={canopyConfig.port || 8765}
                                    onChange={e => setCanopyConfig({ ...canopyConfig, port: parseInt(e.target.value) || 8765 })}
                                    className="w-full border p-2 text-sm"
                                    min={1024}
                                    max={65535}
                                    placeholder="8765"
                                />
                                <p className="text-xs text-nb-black/40 mt-1">Change if port 8765 is in use</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-nb-black/80 mb-2">Theme Colors</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-nb-black/50 block mb-1">Accent Color</label>
                                    <select
                                        value={canopyConfig.theme.accentColor}
                                        onChange={e => setCanopyConfig({ ...canopyConfig, theme: { ...canopyConfig.theme, accentColor: e.target.value } })}
                                        className="w-full border p-2 text-sm capitalize"
                                    >
                                        {['indigo', 'violet', 'purple', 'plum', 'pink', 'tomato', 'orange', 'amber', 'lime', 'grass', 'teal', 'cyan'].map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-nb-black/50 block mb-1">Background Tone</label>
                                    <select
                                        value={canopyConfig.theme.grayColor}
                                        onChange={e => setCanopyConfig({ ...canopyConfig, theme: { ...canopyConfig.theme, grayColor: e.target.value } })}
                                        className="w-full border p-2 text-sm capitalize"
                                    >
                                        {['slate', 'gray', 'zinc', 'neutral', 'stone', 'sand', 'mauve', 'olive', 'sage'].map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer bg-nb-white p-3 border border-nb-black/20 flex-1">
                                <input
                                    type="checkbox"
                                    checked={canopyConfig.theme.appearance === 'dark'}
                                    onChange={e => setCanopyConfig({ ...canopyConfig, theme: { ...canopyConfig.theme, appearance: e.target.checked ? 'dark' : 'light' } })}
                                    className="text-iiif-blue"
                                />
                                <span className="text-sm text-nb-black/80">Dark Mode Default</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer bg-nb-white p-3 border border-nb-black/20 flex-1">
                                <input
                                    type="checkbox"
                                    checked={canopyConfig.search.enabled}
                                    onChange={e => setCanopyConfig({ ...canopyConfig, search: { ...canopyConfig.search, enabled: e.target.checked } })}
                                    className="text-iiif-blue"
                                />
                                <span className="text-sm text-nb-black/80">Enable Search</span>
                            </label>
                        </div>

                        {/* Image API Options */}
                        <div>
                            <label className="block text-sm font-bold text-nb-black/80 mb-2">Image Processing Options</label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center gap-2 cursor-pointer bg-nb-white p-3 border border-nb-black/20">
                                    <input
                                        type="checkbox"
                                        checked={imageApiOptions.includeWebP}
                                        onChange={e => setImageApiOptions({ ...imageApiOptions, includeWebP: e.target.checked })}
                                        className="text-iiif-blue"
                                    />
                                    <div>
                                        <span className="text-sm text-nb-black/80">WebP Format</span>
                                        <p className="text-[10px] text-nb-black/40">Smaller file sizes</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-nb-white p-3 border border-nb-black/20">
                                    <input
                                        type="checkbox"
                                        checked={imageApiOptions.includeGrayscale}
                                        onChange={e => setImageApiOptions({ ...imageApiOptions, includeGrayscale: e.target.checked })}
                                        className="text-iiif-blue"
                                    />
                                    <div>
                                        <span className="text-sm text-nb-black/80">Grayscale</span>
                                        <p className="text-[10px] text-nb-black/40">Gray quality option</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-nb-white p-3 border border-nb-black/20">
                                    <input
                                        type="checkbox"
                                        checked={imageApiOptions.includeSquare}
                                        onChange={e => setImageApiOptions({ ...imageApiOptions, includeSquare: e.target.checked })}
                                        className="text-iiif-blue"
                                    />
                                    <div>
                                        <span className="text-sm text-nb-black/80">Square Crops</span>
                                        <p className="text-[10px] text-nb-black/40">For thumbnails</p>
                                    </div>
                                </label>
                                <div className="flex items-center gap-2 bg-nb-white p-3 border border-nb-black/20">
                                    <div className="flex-1">
                                        <span className="text-sm text-nb-black/80">Tile Size</span>
                                        <p className="text-[10px] text-nb-black/40">Deep zoom tiles</p>
                                    </div>
                                    <select
                                        value={imageApiOptions.tileSize || 512}
                                        onChange={e => setImageApiOptions({ ...imageApiOptions, tileSize: parseInt(e.target.value) })}
                                        className="border p-1 text-sm w-20"
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
                                <label className="block text-sm font-bold text-nb-black/80 mb-2">
                                    Featured Items <span className="font-normal text-nb-black/40">({canopyConfig.featured.length}/6 selected)</span>
                                </label>
                                <p className="text-xs text-nb-black/50 mb-3">Select up to 6 manifests to feature on the homepage.</p>
                                <div className="max-h-48 overflow-y-auto border border-nb-black/20 divide-y divide-nb-black/10">
                                    {availableManifests.map(manifest => (
                                        <label
                                            key={manifest.id}
                                            className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-nb-white transition-nb ${
                                                canopyConfig.featured.includes(manifest.id) ? 'bg-nb-blue/10' : ''
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
                                                className="text-iiif-blue"
                                            />
                                            <span className="text-sm text-nb-black/80 truncate flex-1">{manifest.label}</span>
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
                            <div className="h-[500px] flex flex-col items-center justify-center gap-4 text-nb-black/40" aria-live="polite">
                                <div className="w-12 h-12 border-4 border-nb-black/10 border-t-iiif-blue animate-spin"></div>
                                <p className="text-xs font-black uppercase tracking-widest">Synthesizing Archive DNA...</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex gap-4 mb-4">
                                    <div className={`flex-1 p-4 border-2 flex items-center gap-4 ${criticalErrors.length > 0 ? 'bg-nb-red/10 border-nb-red/30 text-nb-red' : 'bg-nb-green/10 border-nb-green/30 text-nb-green'}`}>
                                        <Icon name={criticalErrors.length > 0 ? 'error' : 'verified'} className="text-2xl"/>
                                        <div>
                                            <p className="font-bold text-sm">{criticalErrors.length > 0 ? `${criticalErrors.length} Critical Issues` : 'Spec Compliance: Valid'}</p>
                                            <p className="text-[10px] opacity-75">{criticalErrors.length > 0 ? 'Fix issues below to ensure interoperability.' : 'Archive meets IIIF Presentation 3.0 standards.'}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-nb-white border border-nb-black/20 flex flex-col justify-center min-w-[120px]">
                                        <span className="text-[9px] font-black text-nb-black/40 uppercase">Package Size</span>
                                        <span className="text-sm font-bold text-nb-black/80">~{includeAssets ? 'Calculated' : 'Small'}</span>
                                    </div>
                                </div>

                                <ExportDryRun files={virtualFiles} />
                                
                                {criticalErrors.length > 0 && (
                                    <div className="mt-4 p-4 bg-nb-orange/10 border border-nb-orange/20 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="warning" className="text-nb-orange"/>
                                            <span className="text-xs font-medium text-nb-orange">Archive has critical issues. You must fix them or override integrity.</span>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer bg-nb-white px-3 py-1.5 border border-nb-orange/20 shadow-brutal-sm">
                                            <input type="checkbox" checked={ignoreErrors} onChange={e => setIgnoreErrors(e.target.checked)} className="text-nb-orange"/>
                                            <span className="text-[9px] font-black uppercase text-nb-orange">Ignore Errors</span>
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
                            <div className="absolute inset-0 border-8 border-nb-black/10 "></div>
                            <div 
                                className="absolute inset-0 border-8 border-iiif-blue transition-nb "
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
                            <h3 className="text-lg font-bold text-nb-black">{progress.status}</h3>
                            <p className="text-xs text-nb-black/50 mt-1 uppercase tracking-widest font-black">Archive Compression Engine</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 bg-nb-white border-t flex justify-between items-center shrink-0">
                {step === 'config' && (
                    <>
                        <Button variant="ghost" size="bare" onClick={onClose} className="px-6 py-2 text-nb-black/40 font-bold hover:text-nb-black/60 transition-nb uppercase tracking-widest text-xs">Cancel</Button>
                        <Button variant="ghost" size="bare"
                            onClick={() => {
                                if (format === 'canopy') setStep('canopy-config');
                                else if (format === 'ocfl' || format === 'bagit') setStep('archival-config');
                                else if (format === 'activity-log') handleActivityLogExport();
                                else setStep('dry-run');
                            }}
                            className={`text-white px-10 py-3 font-black uppercase tracking-widest text-xs shadow-brutal flex items-center gap-2 transition-nb active:scale-95 ${format === 'activity-log' ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-iiif-blue hover:bg-nb-blue'}`}
                        >
                            {format === 'canopy' ? 'Configure Site' : format === 'ocfl' || format === 'bagit' ? 'Configure Package' : format === 'activity-log' ? 'Export Log' : 'Start Dry Run'} <Icon name={format === 'activity-log' ? 'download' : 'arrow_forward'} />
                        </Button>
                    </>
                )}
                {step === 'archival-config' && (
                    <>
                        <Button variant="ghost" size="bare" onClick={() => setStep('config')} className="px-6 py-2 text-nb-black/40 font-bold hover:text-nb-black/60 transition-nb uppercase tracking-widest text-xs">Back</Button>
                        <Button variant="ghost" size="bare"
                            onClick={handleArchivalExport}
                            className={`text-white px-10 py-3 font-black uppercase tracking-widest text-xs shadow-brutal flex items-center gap-2 transition-nb active:scale-95 ${format === 'ocfl' ? 'bg-nb-orange hover:bg-nb-orange' : 'bg-nb-purple hover:bg-nb-purple'}`}
                        >
                            Export {format.toUpperCase()} <Icon name="download" />
                        </Button>
                    </>
                )}
                {step === 'canopy-config' && (
                    <>
                        <Button variant="ghost" size="bare" onClick={() => setStep('config')} className="px-6 py-2 text-nb-black/40 font-bold hover:text-nb-black/60 transition-nb uppercase tracking-widest text-xs">Back</Button>
                        <Button variant="ghost" size="bare"
                            onClick={handleCanopyExport}
                            className="bg-iiif-blue text-white px-10 py-3 font-black uppercase tracking-widest text-xs hover:bg-nb-blue shadow-brutal flex items-center gap-2 transition-nb active:scale-95"
                        >
                            Generate Site Config <Icon name="arrow_forward" />
                        </Button>
                    </>
                )}
                {step === 'dry-run' && !processing && (
                    <>
                        <Button variant="ghost" size="bare" onClick={() => setStep('config')} className="px-6 py-2 text-nb-black/40 font-bold hover:text-nb-black/60 transition-nb uppercase tracking-widest text-xs">Back to Settings</Button>
                        <Button variant="ghost" size="bare"
                            onClick={handleFinalExport}
                            disabled={criticalErrors.length > 0 && !ignoreErrors}
                            className="bg-nb-green text-white px-10 py-3 font-black uppercase tracking-widest text-xs hover:bg-nb-green shadow-brutal flex items-center gap-2 transition-nb active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Finalize & Download ZIP <Icon name="download" />
                        </Button>
                    </>
                )}
            </div>
        </div>
    </div>
  );
};
