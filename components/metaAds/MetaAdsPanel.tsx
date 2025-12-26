import React, { useEffect, useState } from 'react';
import { BriefingData, MetaAdsPanelPayload } from '../../types';
import { buildMetaAdsPanel } from '../../services/metaAdsPanelService';
import { MetaAdsFieldRenderer } from './MetaAdsFieldRenderer';
import { MetaAdsFieldSettings } from './MetaAdsFieldSettings';
import { useMetaAdsFieldPrefs } from './useMetaAdsFieldPrefs';
import { META_ADS_FIELDS } from './metaAdsFields';
import { isRealOnly } from '../../services/env';

type Props = {
  briefingData: BriefingData;
};

export const MetaAdsPanel: React.FC<Props> = ({ briefingData }) => {
  const [payload, setPayload] = useState<MetaAdsPanelPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const realOnly = isRealOnly();

  const { prefs, orderedFields, toggleVisibility, moveField, resetDefaults } = useMetaAdsFieldPrefs();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    buildMetaAdsPanel(briefingData)
      .then((result) => {
        if (!alive) return;
        setPayload(result as MetaAdsPanelPayload);
      })
      .catch((err) => {
        if (!alive) return;
        setError('Falha ao carregar Meta Ads');
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [briefingData]);

  return (
    <div className="bg-surface2 rounded-2xl border border-app p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[12px] font-black uppercase tracking-widest text-app">Meta Ads</h3>
          <p className="text-[10px] text-muted2 uppercase">Painel dedicado com provenance</p>
        </div>
        <div className="flex items-center gap-2">
          {payload?.status === 'NOT_CONFIGURED' ? (
            <button
              onClick={() => window.open('/settings#connect-meta', '_self')}
              className="text-[10px] px-3 py-1 bg-accent text-accent-contrast rounded font-bold"
            >
              Conectar Meta Ads
            </button>
          ) : null}
          <button
            onClick={() => setShowSettings(true)}
            className="text-[10px] px-3 py-1 border border-app rounded"
          >
            Campos
          </button>
        </div>
      </div>

      {loading && <div className="text-[10px] text-muted2 uppercase font-black">Carregando painel...</div>}
      {error && <div className="text-[10px] text-red-400 uppercase font-black">{error}</div>}
      {!loading && !error && payload && (
        <div className="space-y-4">
          {orderedFields.map((field) => {
            if (!field || !prefs.visible[field.id]) return null;
            return (
              <MetaAdsFieldRenderer
                key={field.id}
                fieldId={field.id}
                payload={payload}
                isRealOnly={realOnly}
              />
            );
          })}
          {orderedFields.length === 0 && (
            <div className="text-[10px] text-muted2 uppercase font-black">Nenhum campo ativo</div>
          )}
        </div>
      )}

      {showSettings && (
        <MetaAdsFieldSettings
          visible={prefs.visible}
          onToggle={toggleVisibility}
          onMove={moveField}
          onReset={resetDefaults}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};
