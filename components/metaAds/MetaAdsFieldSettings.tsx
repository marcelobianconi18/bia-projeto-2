import React from 'react';
import { META_ADS_FIELDS, MetaAdsFieldId } from './metaAdsFields';

type Props = {
  visible: Record<MetaAdsFieldId, boolean>;
  onToggle: (id: MetaAdsFieldId) => void;
  onMove: (id: MetaAdsFieldId, direction: 'up' | 'down') => void;
  onReset: () => void;
  onClose: () => void;
};

export const MetaAdsFieldSettings: React.FC<Props> = ({
  visible,
  onToggle,
  onMove,
  onReset,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-[3000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface p-6 rounded-2xl border border-app w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-app">Configurar Campos</h3>
          <button onClick={onClose} className="text-xs text-muted2 hover:text-app">Fechar</button>
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-auto">
          {META_ADS_FIELDS.map((field, idx) => (
            <div key={field.id} className="flex items-center justify-between border border-app rounded-lg p-3">
              <div>
                <div className="text-[11px] font-bold text-app">{field.title}</div>
                {field.description && <div className="text-[10px] text-muted2">{field.description}</div>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onMove(field.id, 'up')} className="text-[10px] px-2 py-1 border border-app rounded">↑</button>
                <button onClick={() => onMove(field.id, 'down')} className="text-[10px] px-2 py-1 border border-app rounded">↓</button>
                <button
                  onClick={() => onToggle(field.id)}
                  className={`text-[10px] px-3 py-1 rounded border ${visible[field.id] ? 'bg-app text-white border-app' : 'border-app text-muted2'}`}
                >
                  {visible[field.id] ? 'Visivel' : 'Oculto'}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4 gap-2">
          <button onClick={onReset} className="text-[10px] px-3 py-2 border border-app rounded">Reset</button>
        </div>
      </div>
    </div>
  );
};
