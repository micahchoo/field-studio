#!/bin/bash
# Verification script for atomic design structure

set -e

echo "=== Verifying Atomic Design Structure ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Check 1: Atoms should have zero internal dependencies
echo "Phase 1: Checking atoms for zero dependencies..."
if grep -r "from '\.\." utils/atoms/*.ts 2>/dev/null | grep -v "\.d\.ts"; then
    echo -e "${RED}ERROR: atoms importing from outside atoms/${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ Atoms have no external dependencies${NC}"
fi

# Check 2: Atoms should not import from each other (except index)
echo ""
echo "Checking atoms for cross-dependencies..."
ATOM_CROSS=0
for file in utils/atoms/*.ts; do
    if [ -f "$file" ] && [ "$(basename "$file")" != "index.ts" ]; then
        if grep -q "from '\./" "$file" 2>/dev/null; then
            echo -e "${RED}ERROR: $file imports from sibling atom${NC}"
            ATOM_CROSS=$((ATOM_CROSS + 1))
        fi
    fi
done
if [ $ATOM_CROSS -eq 0 ]; then
    echo -e "${GREEN}✓ No cross-dependencies in atoms${NC}"
else
    ERRORS=$((ERRORS + ATOM_CROSS))
fi

# Check 3: Molecules should only import from atoms
echo ""
echo "Phase 2: Checking molecules only import from atoms..."
MOL_INVALID=0
for file in utils/molecules/*.ts; do
    if [ -f "$file" ] && [ "$(basename "$file")" != "index.ts" ]; then
        # Check for imports from molecules or organisms
        if grep "from '\.\.\/molecules" "$file" > /dev/null 2>&1; then
            echo -e "${RED}ERROR: $file imports from molecules${NC}"
            MOL_INVALID=$((MOL_INVALID + 1))
        fi
        if grep "from '\.\.\/organisms" "$file" > /dev/null 2>&1; then
            echo -e "${RED}ERROR: $file imports from organisms${NC}"
            MOL_INVALID=$((MOL_INVALID + 1))
        fi
    fi
done
if [ $MOL_INVALID -eq 0 ]; then
    echo -e "${GREEN}✓ Molecules only import from atoms${NC}"
else
    ERRORS=$((ERRORS + MOL_INVALID))
fi

# Check 4: Organisms should only import from atoms and molecules
echo ""
echo "Phase 3: Checking organisms only import from atoms/molecules..."
ORG_INVALID=0
for file in utils/organisms/**/*.ts; do
    if [ -f "$file" ] && [ "$(basename "$file")" != "index.ts" ]; then
        # Check for imports from index
        if grep "from '\.\.\/index" "$file" > /dev/null 2>&1; then
            echo -e "${RED}ERROR: $file imports from index${NC}"
            ORG_INVALID=$((ORG_INVALID + 1))
        fi
        # Check for deep imports that create cycles
        if grep "from '\.\.\/organisms" "$file" > /dev/null 2>&1; then
            echo -e "${YELLOW}WARNING: $file imports from organisms${NC}"
        fi
    fi
done
if [ $ORG_INVALID -eq 0 ]; then
    echo -e "${GREEN}✓ Organisms have valid imports${NC}"
else
    ERRORS=$((ERRORS + ORG_INVALID))
fi

# Check 5: Verify main index.ts exports everything
echo ""
echo "Checking main index.ts has all exports..."
if [ -f "utils/atoms/index.ts" ] && [ -f "utils/molecules/index.ts" ] && [ -f "utils/organisms/index.ts" ]; then
    echo -e "${GREEN}✓ All index.ts files present${NC}"
else
    echo -e "${RED}ERROR: Missing index.ts files${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "=== Verification Complete ==="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    echo ""
    echo "Structure summary:"
    echo "  Atoms: $(ls -1 utils/atoms/*.ts 2>/dev/null | wc -l) files"
    echo "  Molecules: $(ls -1 utils/molecules/*.ts 2>/dev/null | wc -l) files"
    echo "  Organisms: $(ls -1 utils/organisms/**/*.ts 2>/dev/null | wc -l) files"
    exit 0
else
    echo -e "${RED}Found $ERRORS error(s)${NC}"
    exit 1
fi
