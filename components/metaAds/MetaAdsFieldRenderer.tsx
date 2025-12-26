import React from 'react';
import { MetaAdsFieldId } from './metaAdsFields';
import { MetaAdsPanelPayload, MetaRefinement, MetaAdsProvenance } from '../../types';
import { ProvenanceBadge } from '../ProvenanceBadge';

const FieldCard: React.FC<{ title: string; children: React.ReactNode; provenance?: MetaAdsProvenance }> = ({ title, children, provenance }) => (
  <div className="bg-surface p-4 rounded-xl border border-app shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-[11px] font-black uppercase tracking-widest text-app">{title}</h4>
      <ProvenanceBadge provenance={provenance as any} />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {children}
    </div>
  </div>
);

const renderEmpty = (message: string) => (
  <div className="text-[10px] text-muted2 uppercase font-black">{message}</div>
);

const NA: React.FC<{ reason?: string }> = ({ reason }) => (
  <span className="font-black" title={reason || 'Indisponível'}>N/A</span>
);

const renderRefinements = (refinements: MetaRefinement[]) => {
  if (!refinements.length) return renderEmpty('Nenhum refinamento validado');
  return (
    <div className="space-y-2">
      {refinements.map((r, idx) => (
        <div key={`${r.name}-${idx}`} className="border border-app rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-app">{r.kind}</span>
            <ProvenanceBadge provenance={r.provenance as any} />
          </div>
          <div className="text-[11px] font-bold text-app mt-1">{r.name}</div>
          <div className="text-[10px] text-muted mt-1">{r.rationale}</div>
          {r.metaId && <div className="text-[9px] text-muted2 mt-1">Meta ID: {r.metaId}</div>}
        </div>
      ))}
    </div>
  );
};

export const MetaAdsFieldRenderer: React.FC<{ fieldId: MetaAdsFieldId; payload: MetaAdsPanelPayload; isRealOnly: boolean }> = ({
  fieldId,
  payload,
  isRealOnly
}) => {
  switch (fieldId) {
    case 'connection': {
      const connection = payload.connection;
      return (
        <FieldCard title="Conexao Meta Ads" provenance={payload.provenance}>
          {isRealOnly && renderEmpty('REAL_ONLY: Meta Ads desativado')}
          {!isRealOnly && (
            <>
              <div>Status: <strong>{payload.status}</strong></div>
              <div>Conta: <strong>{connection.accountId ? connection.accountId : <NA reason={payload.status === 'NOT_CONFIGURED' ? 'Meta não conectado' : 'Conta indisponível'} />}</strong></div>
              <div>Business: <strong>{connection.businessId ? connection.businessId : <NA reason={payload.status === 'NOT_CONFIGURED' ? 'Meta não conectado' : 'Business indisponível'} />}</strong></div>
              <div>Pixel: <strong>{connection.pixelId ? connection.pixelId : <NA reason={payload.status === 'NOT_CONFIGURED' ? 'Meta não conectado' : 'Pixel indisponível'} />}</strong></div>
              <div>Dataset: <strong>{connection.datasetId ? connection.datasetId : <NA reason={payload.status === 'NOT_CONFIGURED' ? 'Meta não conectado' : 'Dataset indisponível'} />}</strong></div>
            </>
          )}
        </FieldCard>
      );
    }
    case 'baseTargeting': {
      const base = payload.baseTargeting;
      return (
        <FieldCard title="Targeting Base" provenance={payload.provenance}>
          <div>Geo: <strong>{base.geo?.city || base.geo?.municipioId ? (base.geo.city || base.geo.municipioId) : <NA reason={payload.status === 'NOT_CONFIGURED' ? 'Meta não conectado' : 'Geo indisponível'} />}</strong></div>
          <div>Idade: <strong>{base.ageRanges?.length ? base.ageRanges.join(', ') : <NA reason={'Sem idade definida'} />}</strong></div>
          <div>Genero: <strong>{base.genders?.length ? base.genders.join(', ') : <NA reason={'Sem gênero definido'} />}</strong></div>
          <div>Objetivo: <strong>{base.objective || <NA reason={'Objetivo não definido'} />}</strong></div>
          <div>Modelo: <strong>{base.operationalModel || <NA reason={'Modelo operacional indisponível'} />}</strong></div>
          <div>Posicionamento: <strong>{base.positioning || <NA reason={'Posicionamento indisponível'} />}</strong></div>
        </FieldCard>
      );
    }
    case 'refinements': {
      return (
        <FieldCard title="Refinamentos Validados" provenance={payload.provenance}>
          {isRealOnly ? renderEmpty('REAL_ONLY: refinamentos bloqueados') : renderRefinements(payload.refinements)}
        </FieldCard>
      );
    }
    case 'estimates': {
      const estimates = payload.estimates;
      return (
        <FieldCard title="Estimativas Meta" provenance={estimates.provenance}>
          {isRealOnly && renderEmpty('REAL_ONLY: estimativas bloqueadas')}
          {!isRealOnly && (
            <>
              <div>Audience: <strong>{typeof estimates.audience_size?.value === 'number' ? estimates.audience_size!.value : <NA reason={estimates.provenance?.notes || 'Estimativa indisponível'} />}</strong></div>
              <div>Daily Reach: <strong>{typeof estimates.daily_reach?.value === 'number' ? estimates.daily_reach!.value : <NA reason={estimates.provenance?.notes || 'Estimativa indisponível'} />}</strong></div>
              <div>Daily Leads: <strong>{typeof estimates.daily_leads?.value === 'number' ? estimates.daily_leads!.value : <NA reason={estimates.provenance?.notes || 'Estimativa indisponível'} />}</strong></div>
            </>
          )}
        </FieldCard>
      );
    }
    case 'territory_ibge': {
      const ibge = payload.territory.ibge;
      return (
        <FieldCard title="Contexto IBGE" provenance={ibge?.provenance}>
          {!ibge && renderEmpty('Sem dados IBGE')}
          {ibge && (
            <>
              <div>Populacao: <strong>{typeof ibge.population === 'number' ? ibge.population : <NA reason={ibge.provenance?.notes || 'População indisponível'} />}</strong></div>
              <div>Renda: <strong>{typeof ibge.income === 'number' ? ibge.income : <NA reason={ibge.provenance?.notes || 'IBGE renda indisponível'} />}</strong></div>
            </>
          )}
        </FieldCard>
      );
    }
    case 'territory_google': {
      const google = payload.territory.google;
      return (
        <FieldCard title="Contexto Google" provenance={google?.provenance}>
          {!google && renderEmpty('Sem dados Google')}
          {google && renderEmpty(google.timeseries168 ? 'Timeseries 168h disponivel' : 'UNAVAILABLE')}
        </FieldCard>
      );
    }
    case 'territory_rfb': {
      const rfb = payload.territory.rfb;
      return (
        <FieldCard title="Contexto RFB" provenance={rfb?.provenance}>
          {!rfb && renderEmpty('Sem dados RFB')}
          {rfb && (
            <>
              <div>POIs: <strong>{typeof rfb.poi_count === 'number' ? rfb.poi_count : <NA reason={rfb.provenance?.notes || 'RFB indisponível'} />}</strong></div>
              <div>Categorias: <strong>{rfb.categories?.length ? rfb.categories.length : <NA reason={'Categorias indisponíveis'} />}</strong></div>
            </>
          )}
        </FieldCard>
      );
    }
    case 'export': {
      return (
        <FieldCard title="Exportacao Meta Ready" provenance={payload.provenance}>
          {payload.exportPayload ? (
            <pre className="text-[10px] bg-surface2 p-2 rounded border border-app overflow-auto max-h-40">
              {JSON.stringify(payload.exportPayload, null, 2)}
            </pre>
          ) : renderEmpty('Exportacao indisponivel')}
        </FieldCard>
      );
    }
    default:
      return null;
  }
};
