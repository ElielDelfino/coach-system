#!/bin/bash
# deploy.sh — Deploy recorrente (após first-deploy.sh já ter rodado)
# Uso: cd /home/coach/coach-system && bash scripts/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

STACK_NAME="coach"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.prod}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERRO: $ENV_FILE não encontrado em $(pwd)"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "==> Build do frontend..."
docker build -f docker/frontend.Dockerfile -t coach-frontend:latest .

echo "==> Build do backend..."
docker build -f docker/backend.Dockerfile -t coach-backend:latest .

echo "==> Deploy da stack '$STACK_NAME'..."
docker stack deploy \
  --with-registry-auth \
  --resolve-image=never \
  -c "$COMPOSE_FILE" \
  "$STACK_NAME"

# Força update das imagens locais (Swarm não detecta mudança de tag :latest)
echo "==> Forçando update dos serviços com imagem local..."
for svc in coach_backend coach_frontend; do
  image="${svc#coach_}"
  if docker service inspect "$svc" >/dev/null 2>&1; then
    docker service update --force --image "coach-${image}:latest" "$svc" >/dev/null
    echo "    -> $svc atualizado"
  fi
done

echo "==> Aguardando convergência..."
sleep 10
for svc in $(docker stack services --format '{{.Name}}' "$STACK_NAME"); do
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
