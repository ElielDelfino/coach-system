import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useToast, errorMessage } from '../ui/Toast';
import { useEnviarFeedback, useFeedbacks } from '../../hooks/aluno/queries';

function semanaInicio(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

const ESCALAS = [
  { id: 'humor',       label: 'Humor',         icone: '😊' },
  { id: 'energia',     label: 'Energia',       icone: '⚡' },
  { id: 'dificuldade', label: 'Dificuldade',   icone: '🔥' },
];

const EMOJIS_ESCALA = ['😖', '😕', '😐', '🙂', '🤩'];

function EscalaInput({ valor, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(valor === n ? null : n)}
          className={`flex-1 py-2 rounded-lg text-xl transition-all
            ${valor === n
              ? 'bg-brand/20 border border-brand/50 scale-105'
              : 'bg-surface-card border border-surface-border hover:border-zinc-600'}`}
          aria-label={`${n} de 5`}
        >
          {EMOJIS_ESCALA[n - 1]}
        </button>
      ))}
    </div>
  );
}

function NumeroInput({ label, valor, onChange, sufixo, step = 0.1 }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1.5 block">{label}</span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min="0"
          value={valor ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          placeholder="—"
          className="w-full bg-surface-card border border-surface-border rounded-xl
            px-4 py-3 pr-12 text-white text-base font-bold tabular-nums
            focus:outline-none focus:border-brand/60"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">
          {sufixo}
        </span>
      </div>
    </label>
  );
}

export default function FeedbackForm() {
  const toast = useToast();
  const enviar = useEnviarFeedback();
  const { data: historico = [] } = useFeedbacks(5);

  const semanaAtual = semanaInicio();
  const feedbackSemana = historico.find((f) => String(f.semana_inicio).slice(0, 10) === semanaAtual);

  const [texto, setTexto] = useState('');
  const [peso, setPeso] = useState(null);
  const [bf, setBf] = useState(null);
  const [cintura, setCintura] = useState(null);
  const [escalas, setEscalas] = useState({ humor: null, energia: null, dificuldade: null });

  useEffect(() => {
    if (feedbackSemana) {
      setTexto(feedbackSemana.texto || '');
      setPeso(feedbackSemana.peso_kg ?? null);
      setBf(feedbackSemana.percentual_gordura ?? null);
      setCintura(feedbackSemana.cintura_cm ?? null);
      setEscalas({
        humor: feedbackSemana.humor ?? null,
        energia: feedbackSemana.energia ?? null,
        dificuldade: feedbackSemana.dificuldade ?? null,
      });
    }
  }, [feedbackSemana?.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!texto.trim()) {
      toast.error('Escreva ao menos algumas palavras para seu coach.');
      return;
    }
    try {
      await enviar.mutateAsync({
        texto: texto.trim(),
        peso_kg: peso,
        percentual_gordura: bf,
        cintura_cm: cintura,
        humor: escalas.humor,
        energia: escalas.energia,
        dificuldade: escalas.dificuldade,
      });
      if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
      toast.success(feedbackSemana ? 'Feedback atualizado!' : 'Feedback enviado ao seu coach!');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-brand/10 via-zinc-900 to-zinc-950
        border border-brand/20 rounded-2xl p-4">
        <p className="text-[11px] uppercase tracking-widest text-zinc-500">Sua semana</p>
        <p className="text-white text-base font-black mt-0.5">
          Semana de {new Date(semanaAtual + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
        </p>
        <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
          Compartilhe como foi a semana com seu coach. Você pode atualizar até domingo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mensagem */}
        <div>
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1.5 block">
              Como foi sua semana?
            </span>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={5}
              placeholder="Conte pro coach: dores, dificuldades, vitórias, dúvidas sobre dieta ou treino..."
              maxLength={2000}
              className="w-full bg-surface-card border border-surface-border rounded-xl
                px-4 py-3 text-white text-sm leading-relaxed
                placeholder:text-zinc-600
                focus:outline-none focus:border-brand/60"
            />
          </label>
          <p className="text-right text-[10px] text-zinc-600 mt-1 tabular-nums">
            {texto.length}/2000
          </p>
        </div>

        {/* Escalas humor/energia/dificuldade */}
        <div className="space-y-3">
          {ESCALAS.map((e) => (
            <div key={e.id}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[11px] uppercase tracking-widest text-zinc-500">
                  <span className="mr-1.5">{e.icone}</span>{e.label}
                </span>
                <span className="text-zinc-600 text-[10px]">opcional</span>
              </div>
              <EscalaInput
                valor={escalas[e.id]}
                onChange={(v) => setEscalas((s) => ({ ...s, [e.id]: v }))}
              />
            </div>
          ))}
        </div>

        {/* Medidas opcionais */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-[11px] uppercase tracking-widest text-zinc-500">Medidas atualizadas</p>
            <span className="text-zinc-600 text-[10px]">tudo opcional</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <NumeroInput label="Peso"    valor={peso}    onChange={setPeso}    sufixo="kg" step={0.1} />
            <NumeroInput label="%BF"     valor={bf}      onChange={setBf}      sufixo="%"  step={0.1} />
            <NumeroInput label="Cintura" valor={cintura} onChange={setCintura} sufixo="cm" step={0.5} />
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={enviar.isPending}
          className="w-full bg-brand text-[#0A0A0E] font-black text-sm uppercase tracking-widest
            py-3.5 rounded-xl hover:bg-brand-dark transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {enviar.isPending
            ? 'Enviando…'
            : feedbackSemana ? 'Atualizar feedback' : 'Enviar para o coach'}
        </motion.button>

        {feedbackSemana && (
          <div className="flex items-center justify-center gap-2 text-[11px]">
            <span className={`w-1.5 h-1.5 rounded-full ${feedbackSemana.lido_pelo_coach ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
            <span className="text-zinc-500">
              {feedbackSemana.lido_pelo_coach
                ? `Coach leu em ${new Date(feedbackSemana.lido_em).toLocaleDateString('pt-BR')}`
                : 'Aguardando coach ler...'}
            </span>
          </div>
        )}
      </form>

      {/* Histórico */}
      {historico.length > 1 && (
        <div className="pt-4 border-t border-surface-border">
          <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-3">
            Semanas anteriores
          </p>
          <div className="space-y-2">
            {historico.filter((f) => String(f.semana_inicio).slice(0, 10) !== semanaAtual).map((f) => (
              <div key={f.id} className="bg-surface-elevated border border-surface-border rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-zinc-300 text-xs font-bold tabular-nums">
                    {new Date(String(f.semana_inicio).slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                  <span className={`w-1.5 h-1.5 rounded-full ${f.lido_pelo_coach ? 'bg-green-400' : 'bg-yellow-400'}`} />
                </div>
                <p className="text-zinc-400 text-sm line-clamp-2">{f.texto}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
