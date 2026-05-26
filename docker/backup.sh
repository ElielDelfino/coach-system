#!/bin/bash
# Backup diário do PostgreSQL — Coach System
# Executa no manager do Swarm via cron. Usa a overlay network para acessar
# o container do banco sem expor a porta 5432 ao host.
#
# Uso:
#   set -a && source /opt/coach/.env && set +a
#   bash /opt/coach/docker/backup.sh
#
# Cron (diário às 03:00, no manager):
#   0 3 * * * root set -a && source /opt/coach/.env && set +a && bash /opt/coach/docker/backup.sh >> /var/log/coach-backup.log 2>&1

set -euo pipefail

# ── configuração ──────────────────────────────────────────────────────────────
STACK="${STACK:-coach}"
NETWORK="${STACK}_coach_network"
BACKUP_DIR="${BACKUP_DIR:-/opt/coach-backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="coach_db_${TIMESTAMP}.sql.gz"

# ── variáveis obrigatórias ────────────────────────────────────────────────────
: "${POSTGRES_USER:?POSTGRES_USER não definido}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD não definido}"
: "${POSTGRES_DB:?POSTGRES_DB não definido}"

# ── criar diretório de backups ────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Iniciando backup → $FILENAME"

# ── pg_dump via container temporário na overlay network ──────────────────────
# O postgres container não expõe a porta 5432 ao host (correto por segurança).
# Usamos a flag --network com a overlay attachable para atingir o serviço 'database'.
docker run --rm \
  --network "$NETWORK" \
  -e PGPASSWORD="$POSTGRES_PASSWORD" \
  postgres:16-alpine \
  pg_dump \
    --host=database \
    --username="$POSTGRES_USER" \
    --no-password \
    --format=plain \
    "$POSTGRES_DB" \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

SIZE=$(du -sh "${BACKUP_DIR}/${FILENAME}" | cut -f1)
echo "[$(date -Iseconds)] Backup concluído: ${FILENAME} (${SIZE})"

# ── limpeza de backups antigos ────────────────────────────────────────────────
DELETADOS=$(find "$BACKUP_DIR" -name "coach_db_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
RESTANTES=$(find "$BACKUP_DIR" -name "coach_db_*.sql.gz" | wc -l)
echo "[$(date -Iseconds)] Limpeza: ${DELETADOS} removidos, ${RESTANTES} mantidos (retenção: ${RETENTION_DAYS} dias)"
