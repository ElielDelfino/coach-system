#!/usr/bin/env bash
# deploy.sh — build, push (opcional) e deploy da stack no Docker Swarm
#
# Uso:
#   bash deploy.sh              # build local + deploy (sem registry)
#   bash deploy.sh --push       # build + push para registry + deploy
#   bash deploy.sh --push --registry registry.example.com/coach
#
# Pré-requisitos no manager:
#   - Docker Swarm inicializado (docker swarm init)
#   - Arquivo .env.prod preenchido em /opt/coach/.env.prod (ou COACH_ENV abaixo)
#   - Imagens acessíveis no manager (build local ou via registry)

set -euo pipefail

# ── configuração ──────────────────────────────────────────────────────────────
STACK="${STACK:-coach}"
REGISTRY="${REGISTRY:-}"          # ex: registry.example.com/coach
TAG="${TAG:-latest}"
COACH_ENV="${COACH_ENV:-.env.prod}"
PUSH=false

# ── argumentos ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --push)       PUSH=true; shift ;;
    --registry)   REGISTRY="$2"; shift 2 ;;
    --tag)        TAG="$2"; shift 2 ;;
    --env)        COACH_ENV="$2"; shift 2 ;;
    --stack)      STACK="$2"; shift 2 ;;
    *) echo "Opção desconhecida: $1"; exit 1 ;;
  esac
done

# ── nomes das imagens ─────────────────────────────────────────────────────────
if [[ -n "$REGISTRY" ]]; then
  BACKEND_IMAGE="${REGISTRY}/backend:${TAG}"
  FRONTEND_IMAGE="${REGISTRY}/frontend:${TAG}"
else
  BACKEND_IMAGE="coach-backend:${TAG}"
  FRONTEND_IMAGE="coach-frontend:${TAG}"
fi

# ── verificações ──────────────────────────────────────────────────────────────
if [[ ! -f "$COACH_ENV" ]]; then
  echo "ERRO: arquivo de env '$COACH_ENV' não encontrado."
  echo "Copie .env.prod.example para $COACH_ENV e preencha os valores."
  exit 1
fi

echo "════════════════════════════════════════════"
echo " Coach System — Deploy"
echo " Stack    : $STACK"
echo " Tag      : $TAG"
echo " Backend  : $BACKEND_IMAGE"
echo " Frontend : $FRONTEND_IMAGE"
echo " Env      : $COACH_ENV"
echo "════════════════════════════════════════════"

# ── build ─────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Build backend..."
docker build -f docker/backend.Dockerfile  -t "$BACKEND_IMAGE"  .

echo ""
echo "▶ Build frontend..."
docker build -f docker/frontend.Dockerfile -t "$FRONTEND_IMAGE" .

# ── push ──────────────────────────────────────────────────────────────────────
if [[ "$PUSH" == "true" ]]; then
  echo ""
  echo "▶ Push das imagens para o registry..."
  docker push "$BACKEND_IMAGE"
  docker push "$FRONTEND_IMAGE"
fi

# ── deploy ────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Deploy da stack '$STACK'..."
env $(grep -v '^#' "$COACH_ENV" | xargs) \
  docker stack deploy \
    --compose-file docker-compose.yml \
    --with-registry-auth \
    --prune \
    "$STACK"

echo ""
echo "▶ Aguardando serviços estabilizarem (30s)..."
sleep 30

echo ""
echo "▶ Status da stack:"
docker stack services "$STACK"

echo ""
echo "▶ Tasks em execução:"
docker stack ps "$STACK" --filter "desired-state=running" --format "table {{.Name}}\t{{.Image}}\t{{.Node}}\t{{.CurrentState}}"

echo ""
echo "✔ Deploy concluído."
