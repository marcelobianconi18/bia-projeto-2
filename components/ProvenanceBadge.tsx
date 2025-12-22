import React from 'react';
import { DataProvenance } from '../types';

interface Props { provenance?: DataProvenance }

export const ProvenanceBadge: React.FC<Props> = ({ provenance }) => {
  const label = provenance?.label || 'ESTIMATED';
  const titleParts: string[] = [];
  if (provenance?.source) titleParts.push(`Fonte: ${provenance.source}`);
  if (provenance?.method) titleParts.push(`Método: ${provenance.method}`);
  if (provenance?.updatedAt) titleParts.push(`Atualizado: ${provenance.updatedAt}`);
  if (provenance?.notes) titleParts.push(provenance.notes);

  const title = titleParts.join(' • ');

  const color = label === 'REAL' ? 'bg-green-600 text-white' : label === 'SIMULATED' ? 'bg-purple-700 text-white' : 'bg-yellow-500 text-black';

  return (
    <span title={title} className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${color}`}>
      {label}
    </span>
  );
};
