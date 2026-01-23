
import React, { useState } from 'react';
import { Icon } from './Icon';
import { AbstractionLevel } from '../types';

interface OnboardingModalProps {
  onComplete: (level: AbstractionLevel) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [expertise, setExpertise] = useState<'novice' | 'intermediate' | 'expert'>('novice');

  const handleFinish = () => {
    let level: AbstractionLevel = 'simple';
    if (expertise === 'intermediate') level = 'standard';
    if (expertise === 'expert') level = 'advanced';
    onComplete(level);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Progress Bar */}
        <div className="h-1.5 bg-slate-100 w-full">
            <div 
                className="h-full bg-iiif-blue transition-all duration-500 ease-out" 
                style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
            ></div>
        </div>

        <div className="p-8 md:p-12">
            {step === 1 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-6 text-iiif-blue">
                            <Icon name="history_edu" className="text-3xl" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Preserving Field Knowledge</h1>
                        <p className="text-lg text-slate-500 leading-relaxed max-w-md mx-auto">
                            Field Studio helps you turn messy raw data into organized, interoperable digital archives using the IIIF standard.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                                <Icon name="visibility" className="text-blue-500 text-sm"/> Rich Presentation
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Arrange photos, audio, and notes into structured sequences and deep-zoom views for colleagues to explore.
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                                <Icon name="link" className="text-green-500 text-sm"/> Standard-Compliant
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Your work is exported as JSON-LD, making it immediately viewable in tools like Mirador or the Universal Viewer.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button 
                            onClick={() => setStep(2)}
                            className="bg-iiif-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            Continue <Icon name="arrow_forward" />
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">The IIIF Hierarchy</h2>
                        <p className="text-slate-500">How we organize your field findings:</p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-start gap-4 p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                            <Icon name="folder" className="text-amber-500 mt-1"/>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">Collections (Your Projects)</h4>
                                <p className="text-xs text-slate-600 leading-relaxed">Groups of related objects, like a whole field season or a site survey set.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 bg-green-50/50 border border-green-100 rounded-xl">
                            <Icon name="menu_book" className="text-green-600 mt-1"/>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">Manifests (Your Objects)</h4>
                                <p className="text-xs text-slate-600 leading-relaxed">The digital representation of a single cohesive item—like a field diary, a map, or an artifact.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                            <Icon name="crop_original" className="text-blue-500 mt-1"/>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">Canvases (Your Views)</h4>
                                <p className="text-xs text-slate-600 leading-relaxed">Virtual pages where we "paint" your media. It might be a page of text, or a detail shot of a site feature.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4">
                        <button onClick={() => setStep(1)} className="text-slate-400 font-bold hover:text-slate-600">Back</button>
                        <button 
                            onClick={() => setStep(3)}
                            className="bg-iiif-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Choose your Workbench</h2>
                        <p className="text-slate-500">Set the level of technical detail you want to see.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <button 
                            onClick={() => setExpertise('novice')}
                            className={`p-6 rounded-xl border-2 text-left transition-all relative ${
                                expertise === 'novice' 
                                ? 'border-iiif-blue bg-blue-50 ring-2 ring-blue-100' 
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <div className="text-3xl mb-3">🛠️</div>
                            <div className="font-bold text-slate-800 mb-1">Simple</div>
                            <div className="text-[10px] text-slate-500 leading-relaxed">
                                Hides standard IDs and JSON. Focus on dragging folders and writing labels.
                            </div>
                            {expertise === 'novice' && <div className="absolute top-4 right-4 text-iiif-blue"><Icon name="check_circle"/></div>}
                        </button>

                        <button 
                            onClick={() => setExpertise('intermediate')}
                            className={`p-6 rounded-xl border-2 text-left transition-all relative ${
                                expertise === 'intermediate' 
                                ? 'border-iiif-blue bg-blue-50 ring-2 ring-blue-100' 
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <div className="text-3xl mb-3">🏗️</div>
                            <div className="font-bold text-slate-800 mb-1">Standard</div>
                            <div className="text-[10px] text-slate-500 leading-relaxed">
                                See how file names create structure. Edit standard metadata properties.
                            </div>
                            {expertise === 'intermediate' && <div className="absolute top-4 right-4 text-iiif-blue"><Icon name="check_circle"/></div>}
                        </button>

                        <button 
                            onClick={() => setExpertise('expert')}
                            className={`p-6 rounded-xl border-2 text-left transition-all relative ${
                                expertise === 'expert' 
                                ? 'border-iiif-blue bg-blue-50 ring-2 ring-blue-100' 
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <div className="text-3xl mb-3">⚡</div>
                            <div className="font-bold text-slate-800 mb-1">Expert</div>
                            <div className="text-[10px] text-slate-500 leading-relaxed">
                                Full control. Direct ID editing, JSON inspection, and raw property access.
                            </div>
                            {expertise === 'expert' && <div className="absolute top-4 right-4 text-iiif-blue"><Icon name="check_circle"/></div>}
                        </button>
                    </div>

                    <div className="flex justify-between items-center pt-4">
                        <button onClick={() => setStep(2)} className="text-slate-400 font-bold hover:text-slate-600">Back</button>
                        <button 
                            onClick={handleFinish}
                            className="bg-iiif-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg"
                        >
                            Complete Setup
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
