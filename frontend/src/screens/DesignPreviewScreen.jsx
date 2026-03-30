// Tela de preview de design — apenas para visualização, não afeta o app real

const MOCK = {
  feedings: 5,
  diapers: 3,
  sleep: '4h 20min',
  lastFeeding: '14:32',
  nextFeeding: 'em 45min',
  age: '2 meses e 12 dias',
  events: [
    { time: '15:10', type: 'feeding', label: 'Mamada · peito esquerdo · 12min', icon: '🤱' },
    { time: '14:32', type: 'feeding', label: 'Mamada · ambos · 18min', icon: '🤱' },
    { time: '13:45', type: 'diaper',  label: 'Fralda · xixi + cocô', icon: '👶' },
    { time: '11:00', type: 'sleep',   label: 'Acordou · dormiu 2h10min', icon: '☀️' },
    { time: '08:50', type: 'sleep',   label: 'Começou a dormir', icon: '😴' },
  ],
}

// ─── Proposta A: Home com Timeline ────────────────────────────────────────────
function ProposalA() {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      <div className="px-4 pt-5 pb-3 bg-gradient-to-br from-violet-600 to-violet-800">
        <p className="text-violet-200 text-xs font-medium">Boa tarde 👋</p>
        <h1 className="text-white text-2xl font-black mt-0.5">Diário da Helena</h1>
        <p className="text-violet-300 text-xs mt-0.5">{MOCK.age}</p>

        {/* Próxima mamada destaque */}
        <div className="mt-3 bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-lg">🤱</span>
          <div>
            <p className="text-white text-xs font-bold">Próxima mamada</p>
            <p className="text-violet-200 text-xs">{MOCK.nextFeeding} · última às {MOCK.lastFeeding}</p>
          </div>
          <div className="ml-auto bg-white/20 rounded-lg px-2 py-1">
            <span className="text-white text-xs font-bold">45min</span>
          </div>
        </div>
      </div>

      {/* Stats compactas */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        {[
          { label: 'Mamadas', value: MOCK.feedings, color: 'text-pink-500' },
          { label: 'Fraldas', value: MOCK.diapers, color: 'text-amber-500' },
          { label: 'Sono', value: MOCK.sleep, color: 'text-blue-500' },
        ].map(s => (
          <div key={s.label} className="py-3 text-center">
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-[10px] font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Botões de ação rápida */}
      <div className="grid grid-cols-4 gap-2 px-3 py-3">
        {[
          { icon: '🤱', label: 'Mamar', color: 'bg-pink-50 text-pink-600' },
          { icon: '👶', label: 'Fralda', color: 'bg-amber-50 text-amber-600' },
          { icon: '😴', label: 'Sono', color: 'bg-blue-50 text-blue-600' },
          { icon: '📊', label: 'Stats', color: 'bg-violet-50 text-violet-600' },
        ].map(b => (
          <button key={b.label} className={`${b.color} rounded-xl py-2.5 flex flex-col items-center gap-1`}>
            <span className="text-xl">{b.icon}</span>
            <span className="text-[10px] font-bold">{b.label}</span>
          </button>
        ))}
      </div>

      {/* Timeline de hoje */}
      <div className="px-3 pb-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Hoje</p>
        <div className="flex flex-col gap-0">
          {MOCK.events.map((e, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  e.type === 'feeding' ? 'bg-pink-100' : e.type === 'diaper' ? 'bg-amber-100' : 'bg-blue-100'
                }`}>{e.icon}</div>
                {i < MOCK.events.length - 1 && <div className="w-px h-3 bg-gray-100" />}
              </div>
              <div className="flex-1 pb-1">
                <p className="text-xs font-semibold text-gray-700">{e.label}</p>
                <p className="text-[10px] text-gray-400">{e.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Proposta B: Cards vibrantes com gradientes ───────────────────────────────
function ProposalB() {
  return (
    <div className="bg-[#f8f7ff] rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      <div className="px-4 pt-5 pb-4">
        <p className="text-gray-400 text-xs">Segunda-feira, 30 de março</p>
        <h1 className="text-gray-900 text-xl font-black mt-0.5">Boa tarde 👋</h1>
      </div>

      {/* Cards com gradiente */}
      <div className="grid grid-cols-2 gap-3 px-3">
        <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-4 text-white shadow-lg shadow-pink-200">
          <p className="text-pink-100 text-xs font-medium">Mamadas hoje</p>
          <p className="text-4xl font-black mt-1">{MOCK.feedings}</p>
          <p className="text-pink-200 text-[10px] mt-1">última às {MOCK.lastFeeding}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-4 text-white shadow-lg shadow-amber-200">
          <p className="text-amber-100 text-xs font-medium">Fraldas hoje</p>
          <p className="text-4xl font-black mt-1">{MOCK.diapers}</p>
          <p className="text-amber-100 text-[10px] mt-1">última há 1h20min</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-200">
          <p className="text-blue-100 text-xs font-medium">Sono total</p>
          <p className="text-2xl font-black mt-1">{MOCK.sleep}</p>
          <p className="text-blue-200 text-[10px] mt-1">acordou às 11:00</p>
        </div>
        <div className="bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl p-4 text-white shadow-lg shadow-violet-200">
          <p className="text-violet-100 text-xs font-medium">Próxima mamada</p>
          <p className="text-2xl font-black mt-1">{MOCK.nextFeeding}</p>
          <p className="text-violet-200 text-[10px] mt-1">média 2h30min</p>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2 px-3 mt-3 pb-4">
        {[
          { icon: '🤱', label: 'Iniciar mamada', color: 'bg-pink-500' },
          { icon: '😴', label: 'Iniciar sono', color: 'bg-blue-500' },
        ].map(b => (
          <button key={b.label} className={`flex-1 ${b.color} text-white rounded-xl py-3 flex items-center justify-center gap-2 shadow-sm`}>
            <span>{b.icon}</span>
            <span className="text-xs font-bold">{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Proposta C: Minimalista / Clean ─────────────────────────────────────────
function ProposalC() {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">Boa tarde</p>
            <h1 className="text-gray-900 text-2xl font-black">Helena 👶</h1>
            <p className="text-gray-400 text-xs mt-0.5">{MOCK.age}</p>
          </div>
          <div className="bg-violet-50 rounded-2xl px-3 py-2 text-right">
            <p className="text-violet-400 text-[10px] font-medium">Próxima mamada</p>
            <p className="text-violet-700 text-sm font-black">{MOCK.nextFeeding}</p>
          </div>
        </div>
      </div>

      {/* Linha divisória elegante */}
      <div className="mx-5 h-px bg-gray-50" />

      {/* Stats em linha */}
      <div className="flex px-5 py-4 gap-4">
        {[
          { icon: '🤱', value: `${MOCK.feedings}x`, label: 'mamadas', color: 'text-pink-500' },
          { icon: '👶', value: `${MOCK.diapers}x`, label: 'fraldas', color: 'text-amber-500' },
          { icon: '😴', value: MOCK.sleep, label: 'sono', color: 'text-blue-500' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-base">{s.icon}</span>
            <div>
              <p className={`text-sm font-black ${s.color}`}>{s.value}</p>
              <p className="text-gray-400 text-[10px]">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-5 h-px bg-gray-50" />

      {/* Timeline minimalista */}
      <div className="px-5 py-4">
        <p className="text-gray-300 text-[10px] font-bold uppercase tracking-widest mb-3">Hoje</p>
        {MOCK.events.slice(0, 4).map((e, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <span className="text-xs text-gray-300 w-10 shrink-0">{e.time}</span>
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              e.type === 'feeding' ? 'bg-pink-400' : e.type === 'diaper' ? 'bg-amber-400' : 'bg-blue-400'
            }`} />
            <p className="text-xs text-gray-600">{e.label}</p>
          </div>
        ))}
      </div>

      {/* FAB-style ações */}
      <div className="px-5 pb-5 grid grid-cols-3 gap-2">
        {[
          { icon: '🤱', label: 'Mamar' },
          { icon: '👶', label: 'Fralda' },
          { icon: '😴', label: 'Sono' },
        ].map(b => (
          <button key={b.label} className="border border-gray-100 rounded-xl py-3 flex flex-col items-center gap-1 hover:bg-gray-50">
            <span className="text-xl">{b.icon}</span>
            <span className="text-[10px] font-medium text-gray-500">{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Proposta D: Dark Premium ─────────────────────────────────────────────────
function ProposalD() {
  return (
    <div className="bg-[#0f0c1e] rounded-2xl shadow-2xl overflow-hidden border border-violet-900/30">
      <div className="px-5 pt-6 pb-4">
        <p className="text-violet-400 text-xs font-medium">Boa tarde 👋</p>
        <h1 className="text-white text-2xl font-black mt-0.5">Diário da Helena</h1>
        <p className="text-violet-600 text-xs mt-0.5">{MOCK.age}</p>
      </div>

      {/* Próxima mamada banner */}
      <div className="mx-4 mb-4 bg-gradient-to-r from-violet-600/30 to-purple-600/20 border border-violet-700/30 rounded-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-600/40 rounded-xl flex items-center justify-center text-lg">🤱</div>
        <div className="flex-1">
          <p className="text-violet-300 text-[10px] font-medium uppercase tracking-wide">Próxima mamada</p>
          <p className="text-white text-sm font-bold">{MOCK.nextFeeding} · última {MOCK.lastFeeding}</p>
        </div>
        <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center">
          <span className="text-white text-xs font-black">▶</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 mb-4">
        {[
          { label: 'Mamadas', value: MOCK.feedings, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
          { label: 'Fraldas', value: MOCK.diapers, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Sono', value: MOCK.sleep, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-xl py-3 text-center`}>
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-[10px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Timeline dark */}
      <div className="px-4 pb-5">
        <p className="text-violet-800 text-[10px] font-bold uppercase tracking-widest mb-3">Hoje</p>
        {MOCK.events.slice(0, 4).map((e, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
            <span className="text-xs text-violet-700 w-10 shrink-0 font-mono">{e.time}</span>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 ${
              e.type === 'feeding' ? 'bg-pink-500/20' : e.type === 'diaper' ? 'bg-amber-500/20' : 'bg-blue-500/20'
            }`}>{e.icon}</div>
            <p className="text-xs text-gray-400">{e.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Preview Page ─────────────────────────────────────────────────────────
export function DesignPreviewScreen() {
  return (
    <div className="overflow-y-auto h-full px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-black dark:text-white">Propostas de Design</h1>
        <p className="text-xs text-gray-400 mt-1">Comparativo de estilos para o app — nenhuma alteração foi feita no app real.</p>
      </div>

      <div className="flex flex-col gap-8">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-violet-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">A</span>
            <p className="text-sm font-bold dark:text-white">Header colorido + Timeline</p>
          </div>
          <ProposalA />
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-pink-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">B</span>
            <p className="text-sm font-bold dark:text-white">Cards com gradientes vibrantes</p>
          </div>
          <ProposalB />
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-gray-800 text-white text-[10px] font-black px-2 py-0.5 rounded-full">C</span>
            <p className="text-sm font-bold dark:text-white">Minimalista / Clean</p>
          </div>
          <ProposalC />
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-indigo-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full">D</span>
            <p className="text-sm font-bold dark:text-white">Dark Premium</p>
          </div>
          <ProposalD />
        </section>
      </div>

      <p className="text-center text-[10px] text-gray-300 dark:text-gray-700 mt-8 mb-4">
        Rota temporária · /preview · não vai para produção
      </p>
    </div>
  )
}
