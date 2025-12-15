#!/bin/bash
set -e

echo "=== Glass UI — B1 Patch Started ==="

# 1. Ensure css/glass-ui.css exists
if [ ! -f css/glass-ui.css ]; then
  echo "Installing css/glass-ui.css ..."
  cat <<'EOF' > css/glass-ui.css
/* --- GLASS UI BASE STYLES (B1) --- */

.glass-card {
  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255,255,255,0.15);
}

.glass-btn {
  background: rgba(0,0,0,0.2);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 10px 16px;
  color: white;
  font-weight: 600;
  border: 1px solid rgba(255,255,255,0.2);
}

.glass-kpi {
  background: rgba(255,255,255,0.22);
  backdrop-filter: blur(14px);
  border-radius: 18px;
  padding: 20px;
  border: 1px solid rgba(255,255,255,0.18);
}

/* compatibility for old .card-kpi */
.card-kpi { composes: glass-kpi; }
EOF
fi

echo "✔ glass-ui.css ready."

# 2. Inject the <link> into every HTML page
HTML_FILES=$(find . -maxdepth 2 -name "*.html")

for f in $HTML_FILES; do
  echo "--- Patching: $f"

  cp "$f" "$f.bak_glass"

  # Add <link> to <head> if missing
  if ! grep -q 'glass-ui.css' "$f"; then
    sed -i '' 's|</head>|  <link rel="stylesheet" href="css/glass-ui.css">\n</head>|' "$f"
  fi

  # Replace old classes → new Glass UI classes
  sed -i '' 's/card/card glass-card/g' "$f"
  sed -i '' 's/button/glass-btn/g' "$f"
  sed -i '' 's/card-kpi/glass-kpi/g' "$f"

  echo "Patched: $f"
done

echo "=== DONE: B1 Glass UI Patch Applied ==="
echo "Backups created with *.bak_glass"
#!/bin/bash
set -e

echo "=== Glass UI — B1 Patch Started ==="

# 1. Ensure css/glass-ui.css exists
if [ ! -f css/glass-ui.css ]; then
  echo "Installing css/glass-ui.css ..."
  cat <<'EOF' > css/glass-ui.css
/* --- GLASS UI BASE STYLES (B1) --- */

.glass-card {
  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255,255,255,0.15);
}

.glass-btn {
  background: rgba(0,0,0,0.2);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 10px 16px;
  color: white;
  font-weight: 600;
  border: 1px solid rgba(255,255,255,0.2);
}

.glass-kpi {
  background: rgba(255,255,255,0.22);
  backdrop-filter: blur(14px);
  border-radius: 18px;
  padding: 20px;
  border: 1px solid rgba(255,255,255,0.18);
}

/* compatibility for old .card-kpi */
.card-kpi { composes: glass-kpi; }
EOF
fi

echo "✔ glass-ui.css ready."

# 2. Inject the <link> into every HTML page
HTML_FILES=$(find . -maxdepth 2 -name "*.html")

for f in $HTML_FILES; do
  echo "--- Patching: $f"

  cp "$f" "$f.bak_glass"

  # Add <link> to <head> if missing
  if ! grep -q 'glass-ui.css' "$f"; then
    sed -i '' 's|</head>|  <link rel="stylesheet" href="css/glass-ui.css">\n</head>|' "$f"
  fi

  # Replace old classes → new Glass UI classes
  sed -i '' 's/card/card glass-card/g' "$f"
  sed -i '' 's/button/glass-btn/g' "$f"
  sed -i '' 's/card-kpi/glass-kpi/g' "$f"

  echo "Patched: $f"
done

echo "=== DONE: B1 Glass UI Patch Applied ==="
echo "Backups created with *.bak_glass"
#!/bin/bash
# ---------------------------------------------
#  GLASS UI PATCHER — B1 (Global Minimal Patch)
# ---------------------------------------------

set -e

echo "Running Glass UI Patch B1..."

# 1. Ensure css/glass-ui.css exists
mkdir -p css
cat > css/glass-ui.css <<'EOF'
/* --- Glass UI Core Styles (B1) --- */
:root {
  --glass-bg: rgba(255, 255, 255, 0.14);
  --glass-border: rgba(255, 255, 255, 0.22);
  --glass-shadow: rgba(0, 0, 0, 0.25);
  --blur-strength: 20px;
}

.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  backdrop-filter: blur(var(--blur-strength));
  -webkit-backdrop-filter: blur(var(--blur-strength));
  padding: 16px;
  box-shadow: 0 8px 20px var(--glass-shadow);
}

.glass-btn {
  background: rgba(255,255,255,0.22);
  border-radius: 12px;
  padding: 10px 16px;
  font-weight: 600;
  border: 1px solid rgba(255,255,255,0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
EOF

echo "✔ Installed css/glass-ui.css"


# ------------------------------------------------------------
# 2. CLASS REPLACEMENTS -- ZSH SAFE VERSION
# ------------------------------------------------------------

REPLACEMENTS="
card-kpi glass-card
card glass-card
btn-primary glass-btn
btn glass-btn
"

echo "Starting class replacements..."

for f in $(find . -maxdepth 3 -type f -name "*.html"); do
  echo "--- Patching: $f"
  cp "$f" "$f.bak_glass"

  while read -r old new; do
    [[ -z "$old" ]] && continue
    sed -i "" "s/$old/$new/g" "$f"
  done <<< "$REPLACEMENTS"

  echo "Patched: $f"
done


# ---------------------------------------------
# 3. PROCESS ALL HTML FILES
# ---------------------------------------------
FILES=$(find . -maxdepth 3 -type f -name "*.html")

for f in $FILES; do
  bak="${f}.bak_glass"
  cp "$f" "$bak"

  tmp="${f}.tmp"

  cp "$f" "$tmp"

  # inject <link> if missing
  if ! grep -q 'glass-ui.css' "$tmp"; then
    sed -i '' 's|</head>|  <link rel="stylesheet" href="/css/glass-ui.css">\n</head>|' "$tmp"
  fi

  # apply all replacements
  for key in "${!MAP[@]}"; do
    val="${MAP[$key]}"
    sed -i '' "s/$key/$val/g" "$tmp"
  done

  mv "$tmp" "$f"

  echo "✔ Patched $f  (backup: $bak)"
done

echo
echo "----------------------------------------"
echo "DONE — Glass UI Patch B1 Applied"
echo "----------------------------------------"
chmod +x patch-glass-b1.sh


	chmod +x patch-glass-b1.sh


#!/usr/bin/env bash

# -------------------------------------------------------------
#  B1: Install glass-ui.css + inject <link> into all HTML files
# -------------------------------------------------------------


echo "=== B1: Installing Glass UI framework ==="

# 1. Ensure css/ folder exists
mkdir -p css

# 2. Write glass-ui.css if missing
if [ ! -f css/glass-ui.css ]; then
cat << 'CSS' > css/glass-ui.css
/* ---------------------------------------------------------
   GLASS UI FRAMEWORK — BASE SETUP
--------------------------------------------------------- */

:root {
  --glass-bg: rgba(255,255,255,0.25);
  --glass-border: rgba(255,255,255,0.4);
  --glass-shadow: rgba(0,0,0,0.2);
#!/bin/bash
# ---------------------------------------------
#  GLASS UI PATCHER — B1 (Global Minimal Patch)
# ---------------------------------------------

set -e

echo "Running Glass UI Patch B1..."

# 1. Ensure css/glass-ui.css exists
mkdir -p css
cat > css/glass-ui.css <<'EOF'
/* --- Glass UI Core Styles (B1) --- */
:root {
  --glass-bg: rgba(255, 255, 255, 0.14);
  --glass-border: rgba(255, 255, 255, 0.22);
  --glass-shadow: rgba(0, 0, 0, 0.25);
  --blur-strength: 20px;
}

.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  backdrop-filter: blur(var(--blur-strength));
  -webkit-backdrop-filter: blur(var(--blur-strength));
  padding: 16px;
  box-shadow: 0 8px 20px var(--glass-shadow);
}

.glass-btn {
  background: rgba(255,255,255,0.22);
  border-radius: 12px;
  padding: 10px 16px;
  font-weight: 600;
  border: 1px solid rgba(255,255,255,0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
EOF

echo "✔ Installed css/glass-ui.css"

# ---------------------------------------------
#  2. CLASS REPLACEMENTS
# ---------------------------------------------

# ---------------------------------------------
# 3. PROCESS ALL HTML FILES
# ---------------------------------------------
FILES=$(find . -maxdepth 3 -type f -name "*.html")

for f in $FILES; do
  bak="${f}.bak_glass"
  cp "$f" "$bak"

  tmp="${f}.tmp"

  cp "$f" "$tmp"

  # inject <link> if missing
  if ! grep -q 'glass-ui.css' "$tmp"; then
    sed -i '' 's|</head>|  <link rel="stylesheet" href="/css/glass-ui.css">\n</head>|' "$tmp"
  fi

  # apply all replacements
  for key in "${!MAP[@]}"; do
    val="${MAP[$key]}"
    sed -i '' "s/$key/$val/g" "$tmp"
  done

  mv "$tmp" "$f"

  echo "✔ Patched $f  (backup: $bak)"
done

echo
echo "----------------------------------------"
echo "DONE — Glass UI Patch B1 Applied"
echo "----------------------------------------"
#!/bin/bash
# ---------------------------------------------
#  GLASS UI PATCHER — B1 (Global Minimal Patch)
# ---------------------------------------------

set -e

echo "Running Glass UI Patch B1..."

# 1. Ensure css/glass-ui.css exists
mkdir -p css
cat > css/glass-ui.css <<'EOF'
/* --- Glass UI Core Styles (B1) --- */
:root {
  --glass-bg: rgba(255, 255, 255, 0.14);
  --glass-border: rgba(255, 255, 255, 0.22);
  --glass-shadow: rgba(0, 0, 0, 0.25);
  --blur-strength: 20px;
}

.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  backdrop-filter: blur(var(--blur-strength));
  -webkit-backdrop-filter: blur(var(--blur-strength));
  padding: 16px;
  box-shadow: 0 8px 20px var(--glass-shadow);
}

.glass-btn {
  background: rgba(255,255,255,0.22);
  border-radius: 12px;
  padding: 10px 16px;
  font-weight: 600;
  border: 1px solid rgba(255,255,255,0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
EOF

echo "✔ Installed css/glass-ui.css"

# ---------------------------------------------
#  2. CLASS REPLACEMENTS
# ---------------------------------------------

# ---------------------------------------------
# 3. PROCESS ALL HTML FILES
# ---------------------------------------------
FILES=$(find . -maxdepth 3 -type f -name "*.html")

for f in $FILES; do
  bak="${f}.bak_glass"
  cp "$f" "$bak"

  tmp="${f}.tmp"

  cp "$f" "$tmp"

  # inject <link> if missing
  if ! grep -q 'glass-ui.css' "$tmp"; then
    sed -i '' 's|</head>|  <link rel="stylesheet" href="/css/glass-ui.css">\n</head>|' "$tmp"
  fi

  # apply all replacements
  for key in "${!MAP[@]}"; do
    val="${MAP[$key]}"
    sed -i '' "s/$key/$val/g" "$tmp"
  done

  mv "$tmp" "$f"

  echo "✔ Patched $f  (backup: $bak)"
done

echo
echo "----------------------------------------"
echo "DONE — Glass UI Patch B1 Applied"
echo "----------------------------------------"


  --radius-lg: 16px;
  --radius-sm: 10px;
  --blur-strong: blur(20px);
}

/* GLASS PANEL (Cards, Containers) */
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: var(--blur-strong);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: 0 4px 20px var(--glass-shadow);
}

/* GLASS KPI CARD */
.glass-kpi {
  background: var(--glass-bg);
  backdrop-filter: var(--blur-strong);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 14px;
  text-align: center;
  box-shadow: 0 2px 14px var(--glass-shadow);
}

/* COMPATIBILITY: keep .card-kpi working */
.card-kpi { 
  composes: glass-kpi; 
}

/* GLASS BUTTON */
.glass-button {
  background: rgba(255,255,255,0.35);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.45);
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: 0.2s ease;
}

.glass-button:hover {
  background: rgba(255,255,255,0.55);
}

/* NAV BAR */
.glass-nav {
  background: rgba(255,255,255,0.18);
  backdrop-filter: blur(18px);
  border-top: 1px solid rgba(255,255,255,0.35);
  padding: 12px;
}
CSS
echo "✔ Created css/glass-ui.css"
fi


# -------------------------------------------------------------
# 2. Inject <link> tag in every HTML file if missing
# -------------------------------------------------------------

echo "=== Injecting <link> into HTML pages ==="

for file in *.html */*.html */*/*.html; do
  [ ! -f "$file" ] && continue

  # Skip backup files
  case "$file" in
    *.bak|*.bak_glass) continue;;
  esac

  if ! grep -q "glass-ui.css" "$file"; then
    cp "$file" "$file.bak_glass"

    # Insert before </head>
    sed -i '' 's#</head>#  <link rel="stylesheet" href="/css/glass-ui.css">\n</head>#' "$file"

    echo "✔ Patched: $file"
  fi
done

echo "=== B1 COMPLETE ==="
echo "You can now run B2 (class replacement) when ready."


		# ---------------------------------------------
#  GLASS UI PATCHER — B1 (Global Minimal Patch)
# ---------------------------------------------

set -e

echo "Running Glass UI Patch B1..."

# 1. Ensure css/glass-ui.css exists
mkdir -p css
cat > css/glass-ui.css <<'EOF'
/* --- Glass UI Core Styles (B1) --- */
:root {
  --glass-bg: rgba(255, 255, 255, 0.14);
  --glass-border: rgba(255, 255, 255, 0.22);
  --glass-shadow: rgba(0, 0, 0, 0.25);
  --blur-strength: 20px;
}

.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  backdrop-filter: blur(var(--blur-strength));
  -webkit-backdrop-filter: blur(var(--blur-strength));
  padding: 16px;
  box-shadow: 0 8px 20px var(--glass-shadow);
}

.glass-btn {
  background: rgba(255,255,255,0.22);
  border-radius: 12px;
  padding: 10px 16px;
  font-weight: 600;
  border: 1px solid rgba(255,255,255,0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
EOF

echo "✔ Installed css/glass-ui.css"

# ---------------------------------------------
#  2. CLASS REPLACEMENTS


# ---------------------------------------------
# 3. PROCESS ALL HTML FILES
# ---------------------------------------------
FILES=$(find . -maxdepth 3 -type f -name "*.html")

for f in $FILES; do
  bak="${f}.bak_glass"
  cp "$f" "$bak"

  tmp="${f}.tmp"

  cp "$f" "$tmp"

  # inject <link> if missing
  if ! grep -q 'glass-ui.css' "$tmp"; then
    sed -i '' 's|</head>|  <link rel="stylesheet" href="/css/glass-ui.css">\n</head>|' "$tmp"
  fi

  # apply all replacements
  for key in "${!MAP[@]}"; do
    val="${MAP[$key]}"
    sed -i '' "s/$key/$val/g" "$tmp"
  done

  mv "$tmp" "$f"

  echo "✔ Patched $f  (backup: $bak)"
done

echo
echo "----------------------------------------"
echo "DONE — Glass UI Patch B1 Applied"
echo "----------------------------------------"


