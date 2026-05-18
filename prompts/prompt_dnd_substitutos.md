Preciso implementar drag and drop e substitutos alimentares no ProtocoloBuilder.jsx do projeto Coach System.

Leia o CLAUDE.md e docs/ui-contract.md antes de começar.

---

## CONTEXTO

O arquivo frontend/src/pages/admin/ProtocoloBuilder.jsx já existe e está funcionando.
NÃO reescreva o arquivo inteiro — faça alterações cirúrgicas nas partes indicadas.

As funcionalidades a implementar são:

1. Drag and drop para reordenar itens de refeição (Módulo Alimentar)
2. Drag and drop para reordenar exercícios do treino (Módulo Treino)
3. Substitutos alimentares por item de refeição

---

## DEPENDÊNCIA

Instale a biblioteca de drag and drop:

  cd frontend
  npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

Não use react-beautiful-dnd (descontinuado) nem html5 drag and drop nativo.
Use exclusivamente @dnd-kit.

---

## IMPLEMENTAÇÃO 1 — Drag and drop nos itens de refeição

### Onde: componente RefeicaoEditor dentro do ProtocoloBuilder.jsx

A tabela de itens da refeição já existe. Envolva-a com o contexto do dnd-kit:

Imports necessários:
  import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors
  } from '@dnd-kit/core';
  import {
    SortableContext, sortableKeyboardCoordinates,
    useSortable, verticalListSortingStrategy, arrayMove
  } from '@dnd-kit/sortable';
  import { CSS } from '@dnd-kit/utilities';

Crie um componente SortableItem que envolve cada linha da tabela:

  function SortableItemRow({ item, onEdit, onDelete, onSubstitutos }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };
    return (
      <tr ref={setNodeRef} style={style} className="border-b border-surface-border text-zinc-300">
        {/* Handle de drag — apenas esse elemento dispara o drag */}
        <td className="px-2 py-2 w-6">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 select-none"
          >
            ⠿
          </div>
        </td>
        {/* resto das colunas existentes */}
        ...
      </tr>
    );
  }

No componente RefeicaoEditor, adicione a lógica de reordenação:

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;

    // Atualiza a ordem localmente primeiro (optimistic update)
    const oldIndex = itens.findIndex((i) => i.id === active.id);
    const newIndex = itens.findIndex((i) => i.id === over.id);
    const novosItens = arrayMove(itens, oldIndex, newIndex);
    setItens(novosItens);

    // Envia a nova ordem para o servidor
    try {
      await api.patch(`/admin/refeicoes/${refeicao.id}/itens/reordenar`, {
        ordem: novosItens.map((item, index) => ({ id: item.id, ordem: index }))
      });
    } catch (err) {
      toast.error('Erro ao reordenar. Recarregando...');
      onChange(); // recarrega do servidor em caso de erro
    }
  }

Envolva a tabela:

  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
    <SortableContext items={itens.map((i) => i.id)} strategy={verticalListSortingStrategy}>
      <table>
        <thead>...</thead>
        <tbody>
          {itens.map((item) => (
            <SortableItemRow key={item.id} item={item} ... />
          ))}
        </tbody>
      </table>
    </SortableContext>
  </DndContext>

---

## IMPLEMENTAÇÃO 2 — Drag and drop nos exercícios do treino

Mesma lógica do item 1, aplicada ao componente TreinoEditor dentro do ProtocoloBuilder.jsx.

Endpoint de reordenação:
  PATCH /admin/treinos/:treinoId/exercicios/reordenar
  Body: { ordem: [{ id, ordem }] }

Atenção ao superset: itens com mesmo grupo_superset devem aparecer visualmente agrupados.
Ao reordenar, mantenha itens do mesmo superset juntos — se arrastar um item de superset,
arraste o grupo inteiro. Implemente isso verificando grupo_superset antes de confirmar
o arrayMove.

Handle visual do superset: linha com fundo levemente diferente (bg-surface-elevated)
e badge do grupo (ex: "A1", "A2") na primeira coluna.

---

## IMPLEMENTAÇÃO 3 — Substitutos alimentares

### Onde: componente RefeicaoEditor, dentro de cada linha de item

Adicione um botão "Substitutos" em cada linha da tabela de itens.

Ao clicar, abre um painel expansível (accordion) abaixo da linha — NÃO um modal separado.
O painel deve aparecer inline na tabela, ocupando a largura total.

Estrutura do painel de substitutos:

  <tr> {/* linha do item principal */} </tr>
  <tr> {/* painel de substitutos — aparece/some com toggle */}
    <td colSpan={NUMERO_COLUNAS} className="px-5 py-3 bg-surface border-b border-surface-border">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
          Substituições para {item.nome_alimento}
        </div>

        {/* Lista de substitutos existentes */}
        {item.substitutos.map((sub) => (
          <div key={sub.id} className="flex items-center gap-3 text-sm text-zinc-300">
            <span className="text-zinc-500 text-xs">OU</span>
            <span className="font-medium text-white">{sub.nome_alimento}</span>
            <span className="text-zinc-400">{sub.quantidade_g}g</span>
            <button
              onClick={() => removerSubstituto(sub.id)}
              className="ml-auto text-zinc-600 hover:text-red-400 text-xs"
            >
              Remover
            </button>
          </div>
        ))}

        {/* Adicionar novo substituto */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-zinc-500 text-xs">OU</span>
          <input
            type="text"
            placeholder="Buscar alimento..."
            className="bg-surface-input border border-surface-border text-white rounded px-2 py-1 text-xs flex-1"
            value={buscaSub}
            onChange={(e) => setBuscaSub(e.target.value)}
          />
          {/* dropdown de resultados da busca */}
          {resultadosBusca.length > 0 && (
            <div className="absolute z-10 bg-surface-card border border-surface-border rounded-md shadow-lg">
              {resultadosBusca.map((alimento) => (
                <button
                  key={alimento.id}
                  onClick={() => selecionarSubstituto(alimento)}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-surface-elevated hover:text-white"
                >
                  {alimento.nome}
                </button>
              ))}
            </div>
          )}
          <input
            type="number"
            placeholder="g"
            className="bg-surface-input border border-surface-border text-white rounded px-2 py-1 text-xs w-16"
            value={qtdSub}
            onChange={(e) => setQtdSub(e.target.value)}
          />
          <button
            onClick={() => adicionarSubstituto(item.id)}
            className="text-brand text-xs font-bold hover:text-brand-dark"
          >
            + Adicionar
          </button>
        </div>
      </div>
    </td>
  </tr>

### Lógica de busca de substitutos

Ao digitar no input de busca (debounce de 300ms):
  api.get('/admin/alimentos?busca=' + termo)
  Exibir no dropdown: nome + categoria

Ao selecionar um alimento do dropdown:
  - Preenche o nome no input
  - Aguarda o admin digitar a quantidade em gramas
  - Botão "+ Adicionar" chama:
    api.post('/admin/refeicoes-itens/:itemId/substitutos', {
      alimento_id: alimento.id,
      quantidade_g: Number(qtdSub)
    })

Após adicionar: recarrega os itens da refeição (onChange())

Ao remover substituto:
  api.delete('/admin/substitutos/:substitutoId')
  Após remover: recarrega os itens

### Botão de toggle na linha do item

Adicione coluna "Sub" na tabela com botão toggle:

  <button
    onClick={() => toggleSubstitutos(item.id)}
    className={clsx(
      'text-xs font-bold px-2 py-0.5 rounded',
      item.substitutos?.length > 0
        ? 'text-brand border border-brand/40'
        : 'text-zinc-600 border border-zinc-700 hover:text-zinc-400'
    )}
  >
    {item.substitutos?.length > 0 ? `Sub (${item.substitutos.length})` : 'Sub'}
  </button>

---

## REGRAS DE IMPLEMENTAÇÃO

1. Optimistic update no drag and drop — atualiza a UI antes da resposta do servidor
2. Em caso de erro na reordenação — reverter para ordem original e mostrar toast de erro
3. Debounce de 300ms na busca de substitutos — não disparar request a cada tecla
4. O painel de substitutos não fecha ao recarregar a lista — manter estado de aberto/fechado por item
5. Não reescrever o arquivo inteiro — apenas adicionar/modificar as partes indicadas
6. Manter o design system do CLAUDE.md — cores, tipografia, bordas

---

## AO FINALIZAR

1. Confirme que o drag and drop funciona nos itens de refeição
2. Confirme que o drag and drop funciona nos exercícios do treino
3. Confirme que itens de superset se movem em grupo
4. Confirme que substitutos aparecem inline (não em modal separado)
5. Confirme que a busca de substitutos tem debounce
6. Execute o rebuild do frontend:
   docker build --no-cache -f docker/frontend.Dockerfile -t coach-frontend:latest .
   docker service update --force --image coach-frontend:latest coach_frontend
