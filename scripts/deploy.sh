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
  --resolve-image=never \
  -c "$COMPOSE_FILE" \
  "$STACK_NAME"

# Imagens locais (sem registry): stack deploy não detecta mudança de digest.
# Força update apontando para a tag :latest recém-construída.
echo "==> Forçando update dos serviços com imagem local"
for svc in coach_backend coach_frontend; do
  image="${svc#coach_}"
  if docker service inspect "$svc" >/dev/null 2>&1; then
    docker service update --force --image "coach-${image}:latest" "$svc" >/dev/null
    echo "    -> $svc atualizado para coach-${image}:latest"
  fi
done

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
