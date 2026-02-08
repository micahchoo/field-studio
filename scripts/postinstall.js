#!/usr/bin/env node

/**
 * Post-install script that installs a git post-commit hook
 * to update the dependency graph after each commit.
 * Only runs in non-production environments.
 */

if (process.env.NODE_ENV === 'production') {
  console.log('Skipping post-commit hook installation in production');
  process.exit(0);
}

const fs = require('fs');
const path = require('path');

const hookContent = `#!/bin/sh
# Post-commit hook - Updates dependency graph after each commit
echo "🔍 Updating dependency graph..."
unset LD_LIBRARY_PATH && npx tsx scripts/analyze-imports.ts`;

const hookPath = path.join('.git', 'hooks', 'post-commit');

try {
  // Ensure .git/hooks directory exists
  const hooksDir = path.dirname(hookPath);
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  fs.writeFileSync(hookPath, hookContent);
  fs.chmodSync(hookPath, '755');
  console.log('✓ post-commit hook installed');
} catch (error) {
  // Silent fail - don't break installation
  console.warn('⚠ Could not install post-commit hook:', error.message);
}