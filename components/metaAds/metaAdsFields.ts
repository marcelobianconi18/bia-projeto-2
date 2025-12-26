export type MetaAdsFieldId =
  | 'connection'
  | 'baseTargeting'
  | 'refinements'
  | 'estimates'
  | 'territory_ibge'
  | 'territory_google'
  | 'territory_rfb'
  | 'export';

export type MetaAdsFieldDef = {
  id: MetaAdsFieldId;
  title: string;
  description?: string;
  defaultVisible: boolean;
  requires?: Array<'META' | 'IBGE' | 'GOOGLE' | 'RFB'>;
};

export const META_ADS_FIELDS: MetaAdsFieldDef[] = [
  {
    id: 'connection',
    title: 'Conexao Meta Ads',
    description: 'Status de conexao e identificadores',
    defaultVisible: true,
    requires: ['META']
  },
  {
    id: 'baseTargeting',
    title: 'Targeting Base',
    description: 'Deterministico a partir do briefing',
    defaultVisible: true
  },
  {
    id: 'refinements',
    title: 'Refinamentos Validados',
    description: 'Somente interesses/comportamentos validados',
    defaultVisible: true,
    requires: ['META']
  },
  {
    id: 'estimates',
    title: 'Estimativas Meta',
    description: 'Somente se retornado pela Meta',
    defaultVisible: true,
    requires: ['META']
  },
  {
    id: 'territory_ibge',
    title: 'Contexto IBGE',
    defaultVisible: true,
    requires: ['IBGE']
  },
  {
    id: 'territory_google',
    title: 'Contexto Google',
    defaultVisible: false,
    requires: ['GOOGLE']
  },
  {
    id: 'territory_rfb',
    title: 'Contexto RFB',
    defaultVisible: false,
    requires: ['RFB']
  },
  {
    id: 'export',
    title: 'Exportacao Meta Ready',
    defaultVisible: true,
    requires: ['META']
  }
];
