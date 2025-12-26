import React, { useState } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Building2, Smartphone, Lightbulb, ChevronDown } from 'lucide-react';

// Mock Data Generators
const generatePhysicalData = () => [
  { time: '00h', value: 12 }, { time: '02h', value: 8 }, { time: '04h', value: 8 },
  { time: '06h', value: 25 }, { time: '08h', value: 45 }, { time: '10h', value: 65 },
  { time: '12h', value: 95 }, { time: '14h', value: 70 }, { time: '16h', value: 75 },
  { time: '18h', value: 90 }, { time: '20h', value: 50 }, { time: '22h', value: 28 },
];

const generateDigitalData = () => [
  { time: '00h', value: 40 }, { time: '02h', value: 20 }, { time: '04h', value: 10 },
  { time: '06h', value: 15 }, { time: '08h', value: 30 }, { time: '10h', value: 40 },
  { time: '12h', value: 55 }, { time: '14h', value: 50 }, { time: '16h', value: 45 },
  { time: '18h', value: 60 }, { time: '20h', value: 95 }, { time: '22h', value: 85 },
];

type Mode = 'PHYSICAL' | 'DIGITAL';

interface PulseGraphWidgetProps {
  dark?: boolean;
}

export const PulseGraphWidget: React.FC<PulseGraphWidgetProps> = ({ dark = false }) => {
  const [mode, setMode] = useState<Mode>('PHYSICAL');
  const [day, setDay] = useState('Segunda');

  const data = mode === 'PHYSICAL' ? generatePhysicalData() : generateDigitalData();
  const primaryColor = mode === 'PHYSICAL' ? '#ff7a21' : '#a855f7';
  const highlightColor = mode === 'PHYSICAL' ? '#ff5c00' : '#8b5cf6';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 p-2 rounded shadow-2xl text-[10px] font-bold">
          <p className="text-slate-900 mb-1 uppercase tracking-tighter">{label}</p>
          <p style={{ color: primaryColor }}>FLUXO: {payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`min-h-[350px] rounded-3xl flex flex-col h-full overflow-hidden transition-all shadow-xl ${dark ? 'bg-[#1c1f26] border border-white/5' : 'bg-[#f3f4f6] border border-slate-200'}`}>
      {/* Header */}
      <div className="p-5 flex justify-between items-center">
        <h3 className={`font-black text-[12px] uppercase tracking-widest ${dark ? 'text-slate-400' : 'text-slate-400'}`}>
          Pulso do Mercado
        </h3>

        <div className="flex gap-3">
          <div className="relative">
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className={`appearance-none font-bold text-[11px] rounded-lg px-4 py-2 pr-8 outline-none transition cursor-pointer ${dark ? 'bg-[#0e1117] text-white border border-white/10' : 'bg-[#2d3748] text-white'}`}
            >
              <option>Segunda</option>
              <option>Terça</option>
              <option>Quarta</option>
              <option>Quinta</option>
              <option>Sexta</option>
              <option>Sábado</option>
              <option>Domingo</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
          </div>

          <div className={`flex rounded-lg p-1 border ${dark ? 'bg-[#0e1117] border-white/5' : 'bg-[#1a202c] border-slate-700'}`}>
            <button
              onClick={() => setMode('PHYSICAL')}
              className={`px-4 py-1.5 rounded-md text-[11px] font-black flex items-center gap-2 transition-all ${mode === 'PHYSICAL' ? 'bg-[#f97316] text-white shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}
            >
              <Building2 size={12} /> Físico
            </button>
            <button
              onClick={() => setMode('DIGITAL')}
              className={`px-4 py-1.5 rounded-md text-[11px] font-black flex items-center gap-2 transition-all ${mode === 'DIGITAL' ? 'bg-[#a855f7] text-white shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}
            >
              <Smartphone size={12} /> Digital
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full px-5 py-2">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 20 }}>
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
              dy={15}
              interval={2}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
            >
              {data.map((entry, index) => {
                // Destaque para os picos conforme imagem (12h e 18h são índices 6 e 9 aprox)
                const isPeak = (index === 6 || index === 9);
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={isPeak ? highlightColor : primaryColor}
                    fillOpacity={isPeak ? 1 : 0.4}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Insight */}
      <div className="mx-5 mb-5 mt-2">
        <div className={`rounded-xl p-3 border flex items-center gap-3 transition-colors ${dark ? 'bg-[#2d3748]/30 border-white/5' : 'bg-[#718096]/50 border-slate-400'}`}>
          <Lightbulb size={18} className={mode === 'PHYSICAL' ? 'text-[#ff7a21] drop-shadow-[0_0_8px_rgba(255,122,33,0.4)]' : 'text-purple-400'} />
          <p className={`text-[12px] font-bold ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
            {mode === 'PHYSICAL'
              ? <span>Pico comercial às <strong className="text-[#ff7a21]">12h e 18h</strong>.</span>
              : <span>Maior engajamento digital detectado às <strong className="text-purple-400">20h</strong>.</span>
            }
          </p>
        </div>
      </div>
    </div>
  );
};
