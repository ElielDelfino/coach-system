#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

STACK_NAME="coach"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERRO: $ENV_FILE não encontrado em $(pwd)"
  exit 1
fi

echo "==> Carregando variáveis do $ENV_FILE"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "==> Build das imagens"
docker build --no-cache -f docker/frontend.Dockerfile -t coach-frontend:latest .
docker build --no-cache -f docker/backend.Dockerfile  -t coach-backend:latest  .

echo "==> Deploy da stack '$STACK_NAME' (lendo $COMPOSE_FILE + envs)"
docker stack deploy \
  --with-registry-auth \
  --resolve-image=changed \
  -c "$COMPOSE_FILE" \
  "$STACK_NAME"

echo "==> Aguardando convergência dos serviços..."
for svc in $(docker stack services --format '{{.Name}}' "$STACK_NAME"); do
  echo "    -> $svc"
  # Espera até replicas atuais == desejadas (timeout ~120s)
  for _ in $(seq 1 60); do
    read -r running desired < <(docker service ls --filter "name=$svc" --format '{{.Replicas}}' | awk -F'/' '{print $1, $2}')
    if [[ "$running" == "$desired" && -n "$running" ]]; then
      break
    fi
    sleep 2
  done
done

echo "==> Status final da stack"
docker stack services "$STACK_NAME"

echo "==> Deploy concluído."
