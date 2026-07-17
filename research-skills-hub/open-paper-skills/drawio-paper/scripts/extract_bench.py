"""
Setup script: extract PaperBananaBench.zip into the skill's PaperBananaBench/ directory.

Usage:
    python extract_bench.py

The zip file must be placed at {skill_dir}/PaperBananaBench.zip before running.
Handles the double-nested PaperBananaBench/PaperBananaBench/ structure automatically.
Works on Windows, macOS, and Linux.

Note: On Windows, some image filenames exceed the MAX_PATH (260-char) limit and will
be skipped with a warning. This is harmless — only the JSON index files are required
for the skill to function correctly.
"""

import os
import shutil
import sys
import zipfile

skill_dir = os.path.dirname(os.path.abspath(__file__))
# scripts/ is one level below skill_dir
skill_dir = os.path.dirname(skill_dir)

zip_path = os.path.join(skill_dir, "PaperBananaBench.zip")
out_dir  = os.path.join(skill_dir, "PaperBananaBench")


def longpath(p):
    """On Windows, prepend \\?\ to bypass the 260-char MAX_PATH limit."""
    if sys.platform == "win32" and not p.startswith("\\\\?\\"):
        return "\\\\?\\" + os.path.abspath(p)
    return p

if not os.path.exists(zip_path):
    print(f"ERROR: {zip_path} not found.")
    print("Please download it first:")
    print("  curl -L -o PaperBananaBench.zip https://huggingface.co/datasets/dwzhu/PaperBananaBench/resolve/main/PaperBananaBench.zip")
    sys.exit(1)

print(f"Extracting {zip_path} ...")

skipped = []
errors = []
count = 0

with zipfile.ZipFile(zip_path, "r") as z:
    for member in z.namelist():
        # Strip leading PaperBananaBench/ prefix if double-nested
        parts = member.split("/", 1)
        rel = parts[1] if len(parts) == 2 and parts[0] == "PaperBananaBench" else member
        if not rel:
            continue
        dest = os.path.join(out_dir, rel)
        try:
            if member.endswith("/"):
                os.makedirs(longpath(dest), exist_ok=True)
            else:
                os.makedirs(longpath(os.path.dirname(dest)), exist_ok=True)
                with z.open(member) as src, open(longpath(dest), "wb") as dst:
                    shutil.copyfileobj(src, dst)
                count += 1
        except OSError as e:
            skipped.append((member, str(e)))
        except Exception as e:
            errors.append((member, str(e)))

print(f"Extracted {count} files.")
if skipped:
    print(f"Skipped {len(skipped)} files (OS error — likely path too long, image files only, safe to ignore).")
if errors:
    print(f"Errors ({len(errors)}):")
    for m, e in errors:
        print(f"  {m}: {e}")

print("\nVerifying required files...")
expected = [
    "diagram/ref.json",
    "diagram/test.json",
    "plot/ref.json",
    "plot/test.json",
]
all_ok = True
for p in expected:
    full = os.path.join(out_dir, p)
    status = "OK" if os.path.exists(full) else "MISSING"
    print(f"  {status}: {p}")
    if status == "MISSING":
        all_ok = False

# Clean up zip only on success
if all_ok:
    os.remove(zip_path)
    print(f"Removed {zip_path}")
    print("\nSetup complete!")
else:
    print("\nWARNING: Some required files are missing. The zip may be incomplete.")
    print("The zip file has been kept for inspection.")
    sys.exit(1)
