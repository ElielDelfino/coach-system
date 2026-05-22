#!/bin/bash
# backup-db.sh — Backup diário do PostgreSQL para Backblaze B2 via rclone
# Pré-requisito: rclone configurado com remote "b2" apontando para seu bucket
#   rclone config → escolha "b2" → preencha Account ID e Application Key
# Adicione ao cron: 0 2 * * * /home/coach/coach-system/scripts/backup-db.sh
set -euo pipefail

ENV_FILE="$(dirname "$0")/../.env.prod"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERRO: $ENV_FILE não encontrado"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# ─────────────────────────────────────────
# Configuração
# ─────────────────────────────────────────
BACKUP_DIR="/tmp/coach-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="coach_db_${TIMESTAMP}.sql.gz"
B2_REMOTE="b2:${B2_BUCKET:-coach-backups}/db"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

# ─────────────────────────────────────────
# 1. Dump do banco
# ─────────────────────────────────────────
echo "==> Dumping banco de dados..."
CONTAINER=$(docker ps -qf name=coach_database)
if [[ -z "$CONTAINER" ]]; then
  echo "ERRO: container do banco não está rodando"
  exit 1
fi

docker exec "$CONTAINER" \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > "$BACKUP_DIR/$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
echo "    Arquivo: $BACKUP_FILE ($BACKUP_SIZE)"

# ─────────────────────────────────────────
# 2. Upload para Backblaze B2
# ─────────────────────────────────────────
echo "==> Enviando para $B2_REMOTE..."
rclone copy "$BACKUP_DIR/$BACKUP_FILE" "$B2_REMOTE" --progress

# ─────────────────────────────────────────
# 3. Remover backups locais temporários
# ─────────────────────────────────────────
rm -f "$BACKUP_DIR/$BACKUP_FILE"

# ─────────────────────────────────────────
# 4. Remover backups antigos do B2 (retenção)
# ─────────────────────────────────────────
echo "==> Limpando backups com mais de $RETENTION_DAYS dias no B2..."
rclone delete "$B2_REMOTE" \
  --min-age "${RETENTION_DAYS}d" \
  --include "coach_db_*.sql.gz"

echo "==> Backup concluído: $BACKUP_FILE → $B2_REMOTE"
echo "    $(date)"
