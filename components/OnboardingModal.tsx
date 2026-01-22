
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
                style={{ width: step === 1 ? '50%' : '100%' }}
            ></div>
        </div>

        <div className="p-8 md:p-12">
            {step === 1 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-6 text-iiif-blue">
                            <Icon name="waving_hand" className="text-3xl" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to Field Studio</h1>
                        <p className="text-lg text-slate-500">Your privacy-first, offline-capable IIIF workbench.</p>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <h3 className="font-bold text-slate-700 mb-4">What brings you here?</h3>
                        <div className="space-y-3">
                            <label className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-iiif-blue hover:shadow-md transition-all group">
                                <input type="radio" name="goal" defaultChecked className="w-5 h-5 text-iiif-blue accent-iiif-blue"/>
                                <div>
                                    <div className="font-bold text-slate-800">Organize Field Research</div>
                                    <div className="text-sm text-slate-500">I have folders of photos and notes to structure.</div>
                                </div>
                            </label>
                            <label className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-iiif-blue hover:shadow-md transition-all group">
                                <input type="radio" name="goal" className="w-5 h-5 text-iiif-blue accent-iiif-blue"/>
                                <div>
                                    <div className="font-bold text-slate-800">Create IIIF Manifests</div>
                                    <div className="text-sm text-slate-500">I need standards-compliant JSON output.</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button 
                            onClick={() => setStep(2)}
                            className="bg-iiif-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            Next <Icon name="arrow_forward" />
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Customize your experience</h2>
                        <p className="text-slate-500">How familiar are you with the IIIF standard?</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <button 
                            onClick={() => setExpertise('novice')}
                            className={`p-6 rounded-xl border-2 text-left transition-all relative ${
                                expertise === 'novice' 
                                ? 'border-iiif-blue bg-blue-50 ring-2 ring-blue-100' 
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <div className="text-3xl mb-3">🌱</div>
                            <div className="font-bold text-slate-800 mb-1">What is IIIF?</div>
                            <div className="text-xs text-slate-500 leading-relaxed">
                                I'm new to this. Hide the technical jargon and focus on organizing my files.
                            </div>
                            {expertise === 'novice' && <div className="absolute top-4 right-4 text-iiif-blue"><Icon name="check_circle"/></div>}
                        </button>

                        <button 
                            onClick={() => setExpertise('intermediate')}
                            className={`p-6 rounded-xl border-2 text-left transition-all relative ${
                                expertise === 'intermediate' 
                                ? 'border-iiif-blue bg-blue-50 ring-2 ring-blue-100' 
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <div className="text-3xl mb-3">🏗️</div>
                            <div className="font-bold text-slate-800 mb-1">Familiar</div>
                            <div className="text-xs text-slate-500 leading-relaxed">
                                I know what Manifests and Canvases are. Show me the structure.
                            </div>
                            {expertise === 'intermediate' && <div className="absolute top-4 right-4 text-iiif-blue"><Icon name="check_circle"/></div>}
                        </button>

                        <button 
                            onClick={() => setExpertise('expert')}
                            className={`p-6 rounded-xl border-2 text-left transition-all relative ${
                                expertise === 'expert' 
                                ? 'border-iiif-blue bg-blue-50 ring-2 ring-blue-100' 
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <div className="text-3xl mb-3">⚡</div>
                            <div className="font-bold text-slate-800 mb-1">Expert</div>
                            <div className="text-xs text-slate-500 leading-relaxed">
                                I write JSON-LD for breakfast. Give me full control and raw editing.
                            </div>
                            {expertise === 'expert' && <div className="absolute top-4 right-4 text-iiif-blue"><Icon name="check_circle"/></div>}
                        </button>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg flex items-start gap-3 text-sm text-slate-600">
                        <Icon name="info" className="text-iiif-blue mt-0.5 shrink-0"/>
                        <p>This will set your <strong>Abstraction Level</strong>. "Simple" mode hides JSON and IDs. "Advanced" exposes all properties. You can change this later in Settings.</p>
                    </div>

                    <div className="flex justify-between items-center pt-4">
                        <button onClick={() => setStep(1)} className="text-slate-400 font-bold hover:text-slate-600">Back</button>
                        <button 
                            onClick={handleFinish}
                            className="bg-iiif-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
