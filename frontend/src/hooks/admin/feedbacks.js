import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

export function useFeedbacksAluno(alunoId) {
  return useQuery({
    queryKey: ['admin', 'feedbacks', alunoId],
    queryFn: async () => (await api.get(`/admin/alunos/${alunoId}/feedbacks`)).data,
    enabled: !!alunoId,
    staleTime: 30_000,
  });
}

export function useFeedbacksNaoLidos() {
  return useQuery({
    queryKey: ['admin', 'feedbacks-nao-lidos'],
    queryFn: async () => (await api.get('/admin/feedbacks/nao-lidos')).data,
    staleTime: 60_000,
  });
}

export function useMarcarFeedbackLido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (feedbackId) =>
      (await api.patch(`/admin/feedbacks/${feedbackId}/lido`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'feedbacks'] });
      qc.invalidateQueries({ queryKey: ['admin', 'feedbacks-nao-lidos'] });
    },
  });
}
