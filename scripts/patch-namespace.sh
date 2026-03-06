#!/bin/bash
# Patches contracts.gen.ts to use dynamic DOJO_NAMESPACE instead of hardcoded namespace.
# Run after `sozo build --typescript` generates the bindings.

FILE="src/dojo/typescript/contracts.gen.ts"

if [ ! -f "$FILE" ]; then
  echo "Error: $FILE not found"
  exit 1
fi

# Detect the hardcoded namespace from provider.call("NS", ...) or the line after provider.execute with "NS",
NS=$(grep -oE 'provider\.call\("[A-Za-z0-9_]+"' "$FILE" | head -1 | grep -oE '"[^"]+"' | tr -d '"')

if [ -z "$NS" ]; then
  # Try from the line pattern: \t\t\t\t"NS",
  NS=$(grep -E '^\t+\"[A-Za-z0-9_]+\",$' "$FILE" | head -1 | grep -oE '"[^"]+"' | tr -d '"')
fi

if [ -z "$NS" ]; then
  echo "Warning: Could not detect hardcoded namespace in $FILE"
  exit 0
fi

echo "Patching $FILE: replacing hardcoded namespace \"$NS\" with DOJO_NAMESPACE"

# Add import if not already present
if ! grep -q 'DOJO_NAMESPACE' "$FILE"; then
  sed -i.bak '1s|^|import { DOJO_NAMESPACE } from "../../config/namespace";\n|' "$FILE"
  rm -f "$FILE.bak"
fi

# Replace all hardcoded namespace strings
sed -i.bak "s/\"${NS}\"/DOJO_NAMESPACE/g" "$FILE"
rm -f "$FILE.bak"

echo "Done. Replaced all \"$NS\" with DOJO_NAMESPACE."
