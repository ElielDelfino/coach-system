import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

export function useProgressoSemanal() {
  return useQuery({
    queryKey: ['aluno', 'progresso-semanal'],
    queryFn: async () => (await api.get('/aluno/progresso-semanal')).data,
    staleTime: 5 * 60_000,
  });
}

export function useProximoTreino() {
  return useQuery({
    queryKey: ['aluno', 'proximo-treino'],
    queryFn: async () => (await api.get('/aluno/proximo-treino')).data,
    staleTime: 60_000,
  });
}

export function useProtocoloAtivo() {
  return useQuery({
    queryKey: ['aluno', 'protocolo-ativo'],
    queryFn: async () => {
      const { data } = await api.get('/aluno/protocolos');
      const lista = data || [];
      return lista.find((p) => p.ativo) || lista[0] || null;
    },
    staleTime: 5 * 60_000,
  });
}

export function useRefeicoes(protocoloId) {
  return useQuery({
    queryKey: ['aluno', 'refeicoes', protocoloId],
    queryFn: async () => (await api.get(`/aluno/protocolos/${protocoloId}/refeicoes`)).data || [],
    enabled: !!protocoloId,
    staleTime: 5 * 60_000,
  });
}

export function useTreinos(protocoloId) {
  return useQuery({
    queryKey: ['aluno', 'treinos', protocoloId],
    queryFn: async () => (await api.get(`/aluno/protocolos/${protocoloId}/treinos`)).data || [],
    enabled: !!protocoloId,
    staleTime: 5 * 60_000,
  });
}

export function usePerfil() {
  return useQuery({
    queryKey: ['aluno', 'perfil'],
    queryFn: async () => (await api.get('/aluno/perfil')).data,
    staleTime: 5 * 60_000,
  });
}

export function useConcluirSessao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessaoId, payload }) => {
      return (await api.patch(`/aluno/treinos/sessoes/${sessaoId}/concluir`, payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aluno', 'progresso-semanal'] });
      qc.invalidateQueries({ queryKey: ['aluno', 'proximo-treino'] });
    },
  });
}
