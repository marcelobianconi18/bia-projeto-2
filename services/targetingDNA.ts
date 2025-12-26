/**
 * BIANCONI INTELLIGENCE - TARGETING DNA v3.0
 * Context: High-End Real Estate (Luxury Market)
 * * Estratégia de Camadas:
 * 1. SNIPER: Alta Intenção (Fundo de Funil). O usuário já quer comprar.
 * 2. CONTEXTUAL: Lifestyle e Comportamento. O usuário tem o dinheiro/perfil.
 * 3. EXPANSIVE: Dados Demográficos amplos para o algoritmo (Advantage+).
 */

export type TargetingLayer = 'SNIPER' | 'CONTEXTUAL' | 'EXPANSIVE';

export interface InterestNode {
  id: string;
  name: string;
  category: string;
  audienceSizeEst: string; // Ex: "1.2M"
  matchScore: number; // 0-100 (Relevância para o produto)
  apiCode?: string; // Código de interesse da API do Meta (Ex: 6003123)
}

export const TARGETING_DNA: Record<TargetingLayer, InterestNode[]> = {
  SNIPER: [
    {
      id: 's1',
      name: 'Imóveis de Luxo',
      category: 'Real Estate',
      audienceSizeEst: '450k',
      matchScore: 99,
      apiCode: '600312321'
    },
    {
      id: 's2',
      name: 'Investimentos Imobiliários',
      category: 'Finance',
      audienceSizeEst: '890k',
      matchScore: 97,
      apiCode: '600334512'
    },
    {
      id: 's3',
      name: 'Condomínios Fechados',
      category: 'Housing',
      audienceSizeEst: '320k',
      matchScore: 95,
      apiCode: '600455678'
    },
    {
      id: 's4',
      name: 'Coberturas (Penthouses)',
      category: 'Real Estate',
      audienceSizeEst: '150k',
      matchScore: 94,
      apiCode: '600998877'
    },
    {
      id: 's5',
      name: 'Zillow / QuintoAndar (High End)',
      category: 'Marketplace',
      audienceSizeEst: '2.1M',
      matchScore: 88,
      apiCode: '601223344'
    }
  ],

  CONTEXTUAL: [
    {
      id: 'c1',
      name: 'Viagens de Primeira Classe',
      category: 'Travel',
      audienceSizeEst: '1.5M',
      matchScore: 85,
      apiCode: '600556677'
    },
    {
      id: 'c2',
      name: 'Veículos de Luxo (BMW/Mercedes)',
      category: 'Automotive',
      audienceSizeEst: '3.2M',
      matchScore: 82,
      apiCode: '600112233'
    },
    {
      id: 'c3',
      name: 'Golfe & Country Clubs',
      category: 'Sports/Lifestyle',
      audienceSizeEst: '800k',
      matchScore: 78,
      apiCode: '600778899'
    },
    {
      id: 'c4',
      name: 'Investimentos em Bolsa (B3/NYSE)',
      category: 'Finance',
      audienceSizeEst: '5.0M',
      matchScore: 75,
      apiCode: '600990011'
    },
    {
      id: 'c5',
      name: 'Alta Gastronomia & Vinhos',
      category: 'Lifestyle',
      audienceSizeEst: '2.8M',
      matchScore: 70,
      apiCode: '600332211'
    }
  ],

  EXPANSIVE: [
    {
      id: 'e1',
      name: 'Idade: 30 - 65+',
      category: 'Demographics',
      audienceSizeEst: '12M',
      matchScore: 100, // Obrigatório
      apiCode: 'DEMO_AGE_30_65'
    },
    {
      id: 'e2',
      name: 'Viajantes Internacionais Frequentes',
      category: 'Behavior',
      audienceSizeEst: '2.5M',
      matchScore: 60,
      apiCode: '600445566'
    },
    {
      id: 'e3',
      name: 'Diretores / C-Level / Empresários',
      category: 'Job Title',
      audienceSizeEst: '900k',
      matchScore: 65,
      apiCode: '600889900'
    },
    {
      id: 'e4',
      name: 'Usuários de iOS (iPhone 14/15)',
      category: 'Tech/Device',
      audienceSizeEst: '15M',
      matchScore: 55,
      apiCode: 'BEHAVIOR_IOS'
    }
  ]
};
