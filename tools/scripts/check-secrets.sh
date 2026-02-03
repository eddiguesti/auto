#!/bin/bash
# Pre-commit hook to detect potential secrets
# Install: cp scripts/check-secrets.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

set -e

echo "Checking for potential secrets in staged files..."

# Patterns that might indicate secrets
PATTERNS=(
    'sk_live_[a-zA-Z0-9]+'           # Stripe live keys
    'sk_test_[a-zA-Z0-9]+'           # Stripe test keys
    'AKIA[0-9A-Z]{16}'               # AWS Access Key ID
    '[a-zA-Z0-9_-]*api[_-]?key[a-zA-Z0-9_-]*=[a-zA-Z0-9_-]+'  # Generic API keys
    'ghp_[a-zA-Z0-9]{36}'            # GitHub personal access tokens
    'gho_[a-zA-Z0-9]{36}'            # GitHub OAuth tokens
    'github_pat_[a-zA-Z0-9_]{22,}'   # GitHub fine-grained tokens
    'xox[baprs]-[a-zA-Z0-9-]+'       # Slack tokens
    'ya29\.[a-zA-Z0-9_-]+'           # Google OAuth tokens
    'AIza[0-9A-Za-z_-]{35}'          # Google API keys
    '[0-9]+-[a-z0-9_]{32}\.apps\.googleusercontent\.com'  # Google Client ID
    'sq0[a-z]{3}-[a-zA-Z0-9_-]{22}'  # Square tokens
    'eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*'  # JWT tokens (base64)
)

# Files to check (staged files only)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
    echo "No staged files to check."
    exit 0
fi

FOUND_SECRETS=0

for file in $STAGED_FILES; do
    # Skip binary files and common non-secret files
    if [[ "$file" == *.png ]] || [[ "$file" == *.jpg ]] || [[ "$file" == *.gif ]] || \
       [[ "$file" == *.ico ]] || [[ "$file" == *.woff* ]] || [[ "$file" == *.ttf ]] || \
       [[ "$file" == *package-lock.json ]] || [[ "$file" == *yarn.lock ]]; then
        continue
    fi

    # Skip if file doesn't exist (deleted)
    if [ ! -f "$file" ]; then
        continue
    fi

    for pattern in "${PATTERNS[@]}"; do
        if grep -qE "$pattern" "$file" 2>/dev/null; then
            echo "WARNING: Potential secret found in $file matching pattern: $pattern"
            FOUND_SECRETS=1
        fi
    done
done

if [ $FOUND_SECRETS -eq 1 ]; then
    echo ""
    echo "Potential secrets detected! Please review the files above."
    echo "If these are false positives, you can bypass with: git commit --no-verify"
    echo ""
    exit 1
fi

echo "No secrets detected in staged files."
exit 0
