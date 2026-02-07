#!/bin/bash
# Convert inline <button> to <Button variant="ghost"> across codebase
# Run from project root

set -e

echo "=== Converting inline buttons to Button atom ==="

# Files with <button> that need Button import added
FILES=$(grep -rl "<button" src/ --include="*.tsx" | xargs -I{} sh -c 'grep -q "import.*Button" "{}" || echo "{}"' 2>/dev/null)

for f in $FILES; do
  echo "Processing: $f"

  # Check if file imports from @/src/shared/ui/atoms already
  if grep -q "from '@/src/shared/ui/atoms'" "$f"; then
    # Add Button to existing import
    sed -i "s/from '@\/src\/shared\/ui\/atoms'/Button, \&/; s/{ /{ Button, /" "$f" 2>/dev/null || true
  else
    # Add new import line after first import
    sed -i "0,/^import/s//import { Button } from '@\/src\/shared\/ui\/atoms';\nimport/" "$f"
  fi
done

echo ""
echo "=== Replacing <button> with <Button variant=\"ghost\"> ==="

# Replace all <button with <Button variant="ghost" and </button> with </Button>
find src/ -name "*.tsx" -exec grep -l "<button" {} \; | while read f; do
  echo "Converting buttons in: $f"
  # Replace opening tag
  sed -i 's/<button\b/<Button variant="ghost"/g' "$f"
  # Replace closing tag
  sed -i 's/<\/button>/<\/Button>/g' "$f"
done

echo ""
echo "=== Done! Run 'npx eslint . 2>&1 | grep -c button' to verify ==="
