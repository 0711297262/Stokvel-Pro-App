#!/bin/zsh

echo "=== Glass UI — B2 Class Replacement Started ==="

# OLD → NEW class mapping
# Format: old=new
MAPPINGS=(
"btn-primary=glass-btn glass-primary"
"btn=glass-btn"
"card=glass-card"
"card-kpi=glass-kpi"
"container=glass-container"
)

# Function to apply replacements
apply_replacements() {
  local file="$1"

  # Backup
  cp "$file" "$file.bak_b2"

  # Loop through mappings
  for pair in "${MAPPINGS[@]}"; do
    OLD="${pair%%=*}"
    NEW="${pair#*=}"

    # Replace only whole class names, not substrings
#!/bin/zsh

echo "=== Glass UI — B2 Class Replacement Started ==="

# OLD → NEW class mapping
MAPPINGS=(
"btn-primary=glass-btn glass-primary"
"btn=glass-btn"
"card=glass-card"
"card-kpi=glass-kpi"
"container=glass-container"
)

# Function to apply replacements
apply_replacements() {
  local file="$1"

  # Backup
  cp "$file" "$file.bak_b2"

  # Loop through mappings
  for pair in "${MAPPINGS[@]}"; do
    OLD="${pair%%=*}"
    NEW="${pair#*=}"

    # Replace only whole class names
    sed -i '' "s/\\b$OLD\\b/$NEW/g" "$file"
  done

  echo "✔ Patched: $file"
}

# Find all pages
FILES=($(find . -type f -name "*.html"))

for f in "${FILES[@]}"; do
  apply_replacements "$f"
done

echo "-----------------------------------------"
echo "DONE — Glass UI Patch B2 Applied"
echo "Backups created using *.bak_b2"
echo "-----------------------------------------"
    sed -i '' "s/\b$OLD\b/$NEW/g" "$file"
  done

  echo "✔ Patched: $file"
}

# Find all .html files (including nested folders + partials)
FILES=($(find . -type f -name "*.html"))

for f in "${FILES[@]}"; do
  apply_replacements "$f"
done

echo "-----------------------------------------"
echo "DONE — Glass UI Patch B2 Applied"
echo "Backups created using *.bak_b2"
echo "-----------------------------------------"
#!/bin/zsh

echo "=== Glass UI — B2 Class Replacement Started ==="

# OLD → NEW class mapping
# Format: old=new
MAPPINGS=(
"btn-primary=glass-btn glass-primary"
"btn=glass-btn"
"card=glass-card"
"card-kpi=glass-kpi"
"container=glass-container"
)

# Function to apply replacements
	#!/bin/zsh

echo "=== Glass UI — B2 Class Replacement Started ==="

# OLD → NEW class mapping
MAPPINGS=(
"btn-primary=glass-btn glass-primary"
"btn=glass-btn"
"card=glass-card"
"card-kpi=glass-kpi"
"container=glass-container"
)

# Function to apply replacements
apply_replacements() {
  local file="$1"

  # Backup
  cp "$file" "$file.bak_b2"

  # Loop through mappings
  for pair in "${MAPPINGS[@]}"; do
    OLD="${pair%%=*}"
    NEW="${pair#*=}"

    # Replace only whole class names
    sed -i '' "s/\\b$OLD\\b/$NEW/g" "$file"
  done

  echo "✔ Patched: $file"
}

# Find all pages
FILES=($(find . -type f -name "*.html"))

for f in "${FILES[@]}"; do
  apply_replacements "$f"
done

echo "-----------------------------------------"
echo "DONE — Glass UI Patch B2 Applied"
echo "Backups created using *.bak_b2"
echo "-----------------------------------------"
apply_replacements() {
  local file="$1"

  # Backup
  cp "$file" "$file.bak_b2"

  # Loop through mappings
  for pair in "${MAPPINGS[@]}"; do
    OLD="${pair%%=*}"
    NEW="${pair#*=}"

    # Replace only whole class names, not substrings
    sed -i '' "s/\b$OLD\b/$NEW/g" "$file"
  done

  echo "✔ Patched: $file"
}

# Find all .html files (including nested folders + partials)
FILES=($(find . -type f -name "*.html"))

for f in "${FILES[@]}"; do
  apply_replacements "$f"
done

echo "-----------------------------------------"
echo "DONE — Glass UI Patch B2 Applied"
echo "Backups created using *.bak_b2"
echo "-----------------------------------------"

