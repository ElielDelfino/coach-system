#!/bin/bash
# check-doc-links.sh — valida que paths citados na documentação existem.
# Uso: bash scripts/check-doc-links.sh
# Exit 0 = todos os paths válidos; exit 1 = ao menos um quebrado.
set -euo pipefail

cd "$(dirname "$0")/.."

DOCS=(.claude/CLAUDE.md prompts/archive/README.md)
while IFS= read -r f; do DOCS+=("$f"); done < <(find docs -type f -name '*.md')

BROKEN=0
for doc in "${DOCS[@]}"; do
  [[ -f "$doc" ]] || continue
  # extrai paths em backticks que começam com prefixos conhecidos
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    if [[ ! -e "$path" ]]; then
      echo "QUEBRADO: $doc -> $path"
      BROKEN=1
    fi
  done < <(grep -oE '`(docs|backend|frontend|scripts|docker|prompts|\.claude)/[a-zA-Z0-9_./-]+`' "$doc" \
    | tr -d '`' \
    | grep -v '<dominio>' \
    | sort -u)
done

if [[ $BROKEN -eq 0 ]]; then
  echo "OK — todos os paths citados existem."
fi
exit $BROKEN
