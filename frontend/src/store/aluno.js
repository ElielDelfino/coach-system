import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAlunoStore = create(persist((set) => ({
  sessaoAtiva: null,
  iniciarSessao: (data) => set({ sessaoAtiva: data }),
  atualizarSessao: (patch) => set((s) =>
    s.sessaoAtiva ? { sessaoAtiva: { ...s.sessaoAtiva, ...patch } } : {}
  ),
  concluirSessao: () => set({ sessaoAtiva: null }),

  agua: {},
  registrarAgua: (data, litros) => set((s) => ({ agua: { ...s.agua, [data]: litros } })),

  treinoDia: {},
  marcarTreinoDia: (data, info) => set((s) => ({ treinoDia: { ...s.treinoDia, [data]: info } })),
  removerTreinoDia: (data) => set((s) => {
    const novo = { ...s.treinoDia };
    delete novo[data];
    return { treinoDia: novo };
  }),

  migradoV1: false,
  marcarMigrado: () => set({ migradoV1: true }),
}), { name: 'aluno-store' }));

export function migrarLocalStorage(userId) {
  if (!userId || typeof window === 'undefined') return;
  const state = useAlunoStore.getState();
  if (state.migradoV1) return;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const aguaMatch = key.match(new RegExp(`^agua_${userId}_(\\d{4}-\\d{2}-\\d{2})$`));
      if (aguaMatch) {
        const litros = Number(localStorage.getItem(key)) || 0;
        state.registrarAgua(aguaMatch[1], litros);
        continue;
      }

      const treinoDiaMatch = key.match(new RegExp(`^treino_dia_${userId}_(\\d{4}-\\d{2}-\\d{2})$`));
      if (treinoDiaMatch) {
        try {
          const info = JSON.parse(localStorage.getItem(key) || 'null');
          if (info) state.marcarTreinoDia(treinoDiaMatch[1], info);
        } catch { /* ignora */ }
      }
    }
    state.marcarMigrado();
  } catch { /* segue sem migrar */ }
}
