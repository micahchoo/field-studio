#!/usr/bin/env node
/**
 * UI Simplification Audit Script
 * 
 * Measures quantitative success criteria from the Architecture Critique:
 * 1. fieldMode prop usage reduction (≥90% from baseline)
 * 2. Terminology coverage (100% of IIIF term displays go through t())
 * 3. Consistency score across views (≥95%)
 * 
 * Run with: npx tsx scripts/audit-props.ts
 */

import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const COMPONENTS_DIR = path.join(ROOT_DIR, 'components');
const VIEWS_DIR = path.join(ROOT_DIR, 'components', 'views');

// Baseline counts (recorded before Phase 3)
const BASELINE = {
  fieldModePropUsages: 58,   // from earlier audit (sidebar prop-drilling audit)
  iiifTermDisplays: 0,       // to be measured
};

interface AuditResult {
  fieldModePropUsages: number;
  iiifTermDisplays: { total: number; usingT: number; raw: string[] };
  viewConsistency: { totalViews: number; consistentViews: number };
}

function findFiles(dir: string, ext: string[]): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath, ext));
    } else if (ext.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function countFieldModePropUsages(files: string[]): number {
  let count = 0;
  const propPattern = /fieldMode\s*[:=]\s*(?!useAppSettings)/g;
  const propPattern2 = /\.fieldMode\s*[^=]/g;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    // Count prop definitions in interfaces/props
    const matches = content.match(/fieldMode\s*[:?]\s*boolean/g);
    if (matches) count += matches.length;
    // Count prop usages in JSX
    const jsxMatches = content.match(/fieldMode\s*=\s*\{/g);
    if (jsxMatches) count += jsxMatches.length;
    // Count destructuring of fieldMode from props
    const destructureMatches = content.match(/\{\s*fieldMode\s*\}/g);
    if (destructureMatches) count += destructureMatches.length;
  }
  return count;
}

function auditIIIFTerminology(files: string[]): { total: number; usingT: number; raw: string[] } {
  const rawTerms: string[] = [];
  let total = 0;
  let usingT = 0;
  
  const iiifTypes = ['Collection', 'Manifest', 'Canvas', 'Range', 'AnnotationPage', 'Annotation'];
  const iiifRegex = new RegExp(`\\b(${iiifTypes.join('|')})\\b`, 'g');
  const tCallRegex = /t\(['"]?(Collection|Manifest|Canvas|Range|AnnotationPage|Annotation)['"]?\)/g;
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    // Find raw IIIF type mentions
    const rawMatches = content.match(iiifRegex);
    if (rawMatches) {
      rawTerms.push(...rawMatches);
      total += rawMatches.length;
    }
    // Find t() calls
    const tMatches = content.match(tCallRegex);
    if (tMatches) {
      usingT += tMatches.length;
    }
  }
  
  return { total, usingT, raw: rawTerms };
}

function auditViewConsistency(): { totalViews: number; consistentViews: number } {
  // Check each view component in components/views/
  const viewFiles = findFiles(VIEWS_DIR, ['.tsx']);
  let consistent = 0;
  
  const checks = [
    { pattern: /useAppSettings\(\)/, desc: 'uses useAppSettings' },
    { pattern: /useTerminology\(\)/, desc: 'uses terminology hook' },
    { pattern: /useContextualStyles\(.*\)/, desc: 'uses contextual styles' },
  ];
  
  for (const file of viewFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const passed = checks.filter(check => check.pattern.test(content)).length;
    // At least 2 out of 3 checks passed
    if (passed >= 2) consistent++;
  }
  
  return { totalViews: viewFiles.length, consistentViews: consistent };
}

function main() {
  console.log('=== UI Simplification Quantitative Audit ===\n');
    console.log('Generated from scripts/audit-props.ts');

  const tsxFiles = findFiles(COMPONENTS_DIR, ['.tsx']);
  
  // 1. fieldMode prop usage
  const fieldModeCount = countFieldModePropUsages(tsxFiles);
  const reduction = ((BASELINE.fieldModePropUsages - fieldModeCount) / BASELINE.fieldModePropUsages) * 100;
  
  console.log('1. fieldMode Prop Usage Reduction');
  console.log(`   Baseline: ${BASELINE.fieldModePropUsages} prop usages`);
  console.log(`   Current:  ${fieldModeCount} prop usages`);
  console.log(`   Reduction: ${reduction.toFixed(1)}%`);
  console.log(`   Target: ≥90% reduction → ${reduction >= 90 ? '✅ PASS' : '❌ FAIL'}\n`);
  
  // 2. Terminology coverage
  const terminology = auditIIIFTerminology(tsxFiles);
  const coverage = terminology.usingT / terminology.total * 100;
  
  console.log('2. IIIF Terminology Coverage');
  console.log(`   Total IIIF term displays: ${terminology.total}`);
  console.log(`   Using t(): ${terminology.usingT}`);
  console.log(`   Coverage: ${coverage.toFixed(1)}%`);
  console.log(`   Target: 100% → ${coverage === 100 ? '✅ PASS' : '❌ FAIL'}`);
  if (terminology.raw.length > 0) {
    console.log(`   Raw terms sample: ${[...new Set(terminology.raw)].slice(0, 5).join(', ')}...\n`);
  }
  
  // 3. View consistency
  const consistency = auditViewConsistency();
  const consistencyScore = (consistency.consistentViews / consistency.totalViews) * 100;
  
  console.log('3. View Consistency Score');
  console.log(`   Total view components: ${consistency.totalViews}`);
  console.log(`   Consistent views: ${consistency.consistentViews}`);
  console.log(`   Consistency score: ${consistencyScore.toFixed(1)}%`);
  console.log(`   Target: ≥95% → ${consistencyScore >= 95 ? '✅ PASS' : '❌ FAIL'}\n`);
  
  // Summary
  console.log('=== SUMMARY ===');
  const allPass = reduction >= 90 && coverage === 100 && consistencyScore >= 95;
  console.log(allPass ? '✅ All quantitative criteria met!' : '❌ Some criteria not yet met.');
  
  // Write results to file for tracking
  const result: AuditResult = {
    fieldModePropUsages: fieldModeCount,
    iiifTermDisplays: terminology,
    viewConsistency: consistency,
  };
  
  fs.writeFileSync(
    path.join(ROOT_DIR, 'docs', 'ui-simplification-audit.json'),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      baseline: BASELINE,
      results: result,
      targets: {
        fieldModeReduction: 90,
        terminologyCoverage: 100,
        consistencyScore: 95,
      },
      passes: {
        fieldMode: reduction >= 90,
        terminology: coverage === 100,
        consistency: consistencyScore >= 95,
      },
    }, null, 2)
  );
  
  console.log('\nResults saved to docs/ui-simplification-audit.json');
}

main();