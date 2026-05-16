#!/bin/bash
set -e

echo "==> Build das imagens"
docker build -f docker/frontend.Dockerfile -t coach-frontend:latest .
docker build -f docker/backend.Dockerfile -t coach-backend:latest .

echo "==> Deploy da stack no Swarm"
docker stack deploy -c docker-compose.yml coach

echo "==> Aguardando serviços subirem..."
sleep 10

echo "==> Status da stack"
docker stack services coach

echo "==> Deploy concluído."
