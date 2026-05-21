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

export function useCheckinsDia(data) {
  return useQuery({
    queryKey: ['aluno', 'refeicoes-checkins', data],
    queryFn: async () => {
      const res = await api.get('/aluno/refeicoes/checkins', { params: { data } });
      return res.data?.refeicao_ids || [];
    },
    enabled: !!data,
    staleTime: 30_000,
  });
}

export function useStreak() {
  return useQuery({
    queryKey: ['aluno', 'streak'],
    queryFn: async () => (await api.get('/aluno/streak')).data,
    staleTime: 60_000,
  });
}

export function useAtividadeDiaria(dias = 84) {
  return useQuery({
    queryKey: ['aluno', 'atividade-diaria', dias],
    queryFn: async () => (await api.get('/aluno/atividade-diaria', { params: { dias } })).data,
    staleTime: 5 * 60_000,
  });
}

export function useFeedbacks(limit = 10) {
  return useQuery({
    queryKey: ['aluno', 'feedbacks', limit],
    queryFn: async () => (await api.get('/aluno/feedbacks', { params: { limit } })).data,
    staleTime: 60_000,
  });
}

export function useEnviarFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post('/aluno/feedbacks', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aluno', 'feedbacks'] });
    },
  });
}

export function useToggleCheckin(data) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ refeicaoId, ativo }) => {
      if (ativo) {
        await api.delete(`/aluno/refeicoes/${refeicaoId}/checkin`, { params: { data } });
      } else {
        await api.post(`/aluno/refeicoes/${refeicaoId}/checkin`, { data });
      }
      return { refeicaoId, novoEstado: !ativo };
    },
    onMutate: async ({ refeicaoId, ativo }) => {
      const key = ['aluno', 'refeicoes-checkins', data];
      await qc.cancelQueries({ queryKey: key });
      const anterior = qc.getQueryData(key) || [];
      const otimista = ativo
        ? anterior.filter((id) => id !== refeicaoId)
        : [...anterior, refeicaoId];
      qc.setQueryData(key, otimista);
      return { anterior };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.anterior !== undefined) {
        qc.setQueryData(['aluno', 'refeicoes-checkins', data], ctx.anterior);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['aluno', 'refeicoes-checkins', data] });
      qc.invalidateQueries({ queryKey: ['aluno', 'progresso-semanal'] });
    },
  });
}
