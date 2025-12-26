import type { BriefingData } from "../types";
import { operationalLogic, POSITIONING_META, OBJECTIVE_META } from "../src/domain/briefingOptions";

export type TargetingDNA = {
  name: string;
  geoStrategy: string;
  campaignObjective: string;
  kpis: string[];
  audiences: string[];
  creatives: {
    angles: string[];
    hooks: string[];
    ctas: string[];
  };
  budgetHint: string;
  notes: string[];
  interests: string;
  advantage: string;
  strategy: string;
  warning: string;
};

const posTone = (priceBias?: "LOW" | "MID" | "HIGH" | "VERY_HIGH") => {
  switch (priceBias) {
    case "LOW":
      return { valueProp: "preço/oferta", proof: "economia/combos", vibe: "direto e prático" };
    case "MID":
      return { valueProp: "custo-benefício", proof: "comparação/benefícios", vibe: "equilibrado" };
    case "HIGH":
      return { valueProp: "qualidade/experiência", proof: "reviews/garantia", vibe: "aspiracional" };
    case "VERY_HIGH":
      return { valueProp: "exclusividade/escassez", proof: "prova social premium", vibe: "sofisticado" };
    default:
      return { valueProp: "benefício principal", proof: "provas", vibe: "claro" };
  }
};

const objectivePack = (funnel?: "AWARENESS" | "CONSIDERATION" | "CONVERSION" | "INTEL") => {
  switch (funnel) {
    case "AWARENESS":
      return { obj: "Alcance/Reconhecimento", kpis: ["reach", "frequency", "video_thruplay"], cta: "Conheça" };
    case "CONSIDERATION":
      return { obj: "Leads/Mensagens", kpis: ["leads", "cpl", "ctr"], cta: "Fale no WhatsApp" };
    case "CONVERSION":
      return { obj: "Vendas/Conversões", kpis: ["purchases", "cpa", "roas"], cta: "Compre agora" };
    case "INTEL":
      return { obj: "Análise/Benchmark", kpis: ["ctr", "cpm", "hook_rate"], cta: "Ver mais" };
    default:
      return { obj: "Performance", kpis: ["ctr", "cpm"], cta: "Saiba mais" };
  }
};

// Adicionamos parâmetros novos para cumprir a Ordem 02 da AIMC
export function buildTargetingDNA(
  briefing: BriefingData, 
  totalBudget: number = 0, // Novo Input: Orçamento Real
  opportunityScore: number = 50 // Novo Input: Score da Rubrica (0-100)
): TargetingDNA {
  
  const logic = operationalLogic(briefing.operationalModel as any) ?? "RADIUS";
  const posId = briefing.marketPositioning as any | undefined;
  const pos = posTone(posId ? POSITIONING_META[posId]?.priceBias : undefined);
  const objId = briefing.objective as any | undefined;
  const obj = objectivePack(objId ? OBJECTIVE_META[objId]?.funnel : undefined);

  // Lógica Financeira Dinâmica (Algoritmo de Alocação v1.1)
  const calculateBudgetSplit = (strategyType: string): string => {
    if (totalBudget === 0) return "Defina um orçamento para cálculo de alocação.";
    
    // Se o Score for alto (>75), somos mais agressivos em prospecção (Top Funnel)
    // Se o Score for baixo (<50), somos conservadores e protegemos o caixa (Retargeting)
    const confidenceMultiplier = opportunityScore / 100;
    
    let prospectShare = 0.70; // Base padrão
    if (opportunityScore > 80) prospectShare = 0.80; // Ataque total
    if (opportunityScore < 50) prospectShare = 0.50; // Defesa

    const prospectBudget = (totalBudget * prospectShare).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const retargetBudget = (totalBudget * (1 - prospectShare)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return `Orçamento Diário: ${prospectBudget} Prospecção / ${retargetBudget} Retargeting. (Score de Confiança: ${opportunityScore}%)`;
  };

  const currentBudgetHint = calculateBudgetSplit(logic);

  const ds = briefing.dataSources?.[0];
  const wantsDigital = ds === "DS_DIGITAL" || ds === "DS_CROSS";
  const wantsPhysical = ds === "DS_PHYSICAL" || ds === "DS_CROSS";

  // Default values for new fields to ensure they exist
  const defaults = {
    interests: "Interesses gerais da categoria",
    advantage: "OFF",
    strategy: "Campanha manual com controle de bid",
    warning: "Monitore a frequência para evitar saturação"
  };

  const result = (() => {
    switch (logic) {
      case "NATIONAL_HEATMAP": {
        return {
          name: `Digital Nacional (${pos.valueProp})`,
          geoStrategy: "Brasil (macro) → refinar por CPA.",
          campaignObjective: obj.obj,
          kpis: obj.kpis,
          audiences: [
            "Broad (sem interesses) com otimização por conversão/lead",
            "Lookalike (se houver base) 1–3% + expansão",
            `Interesses: concorrentes + categoria + intenção (${pos.valueProp})`,
            wantsDigital ? "Retarget: engajamento 7/14/30d + visitantes site" : "Retarget: engajamento (IG/FB) 7/14/30d",
          ],
          creatives: {
            angles: [
              `Promessa centrada em ${pos.valueProp}`,
              "Demonstração rápida (antes/depois, unboxing, passo a passo)",
              "Prova social (reviews, UGC, comparativos)",
            ],
            hooks: [
              `“Se você quer ${pos.valueProp} sem dor de cabeça…”`,
              "“3 erros que fazem você pagar mais / perder tempo…”",
              "“O jeito mais simples de…”",
            ],
            ctas: [obj.cta, "Ver catálogo", "Enviar mensagem"],
          },
          
          // ATUALIZAÇÃO CRÍTICA:
          budgetHint: currentBudgetHint, // Agora é dinâmico
          
          notes: [
            "Evite microsegmentação no início.",
            `Alocação ajustada para Score ${opportunityScore}: Foco em ${opportunityScore > 75 ? 'Escala' : 'Validação'}.`
          ],
          interests: "Cultura Pop, Tecnologia, E-commerce",
          advantage: "ON",
          strategy: "Advantage+ Shopping",
          warning: "Cuidado com sobreposição em escala nacional"
        };
      }

      case "RADIUS": {
        return {
          name: `Local por Raio (${pos.valueProp})`,
          geoStrategy: "Raio por unidade (testar 1km/3km).",
          campaignObjective: obj.obj,
          kpis: obj.kpis,
          audiences: [
            "Geo: raio em torno do endereço + exclusões (fora do raio)",
            wantsDigital ? "Retarget local: engajamento + visitantes + mensagens" : "Retarget local: engajamento 7/14d",
            `Interesses locais: categoria + ${pos.valueProp} (leve)`,
            "Público semelhante: compradores/leads (se houver base)",
          ],
          creatives: {
            angles: [
              "Proximidade + conveniência (perto de você)",
              `Oferta/benefício focado em ${pos.valueProp}`,
              "Prova local (depoimentos do bairro/cidade)",
            ],
            hooks: ["“A X minutos de você”", "“Hoje ainda” / “agende agora”", "“Últimas vagas/horários”"],
            ctas: [obj.cta, "Traçar rota", "Agendar"],
          },
          budgetHint: currentBudgetHint, // Dinâmico
          notes: [
             "Cruzar com sinais IBGE de renda se disponível."
          ],
          interests: "Negócios Locais",
          advantage: "OFF",
          strategy: "Controle manual",
          warning: "Raio pequeno satura rápido"
        };
      }

      case "ISOCHRONE": {
        return {
          name: `Entrega/Deslocamento (${pos.valueProp})`,
          geoStrategy: "Cidade → segmentar por tempo (ex.: 10/20/30 min) em vez de km quando possível.",
          campaignObjective: obj.obj,
          kpis: obj.kpis,
          audiences: [
            "Geo: área atendida (priorizar quem recebe mais rápido)",
            "Retarget: quem clicou/mandou msg e não converteu (7/14d)",
            `Interesses: problema/necessidade + urgência + ${pos.valueProp}`,
          ],
          creatives: {
            angles: [
              "Rapidez e previsibilidade (chega em X min / atendimento hoje)",
              `Garantia/qualidade alinhada a ${pos.valueProp}`,
              "Demonstração de processo (como funciona o atendimento/entrega)",
            ],
            hooks: ["“Precisa pra hoje?”", "“Chega rápido na sua região”", "“Sem taxa surpresa”"],
            ctas: [obj.cta, "Pedir agora", "Agendar visita"],
          },
          budgetHint: currentBudgetHint, // Dinâmico
          notes: ["Se a operação tem limite real, não prometa prazos fora da área atendida."],
          interests: "Delivery, Conveniência, Serviços Express, Tempo Real",
          advantage: "OFF",
          strategy: "Segmentação geográfica estrita (sem Advantage+ Audience)",
          warning: "Não anuncie fora da área de entrega garantida"
        };
      }

      case "POI_FLOW": {
        return {
          name: `Fluxo & Âncoras (${pos.valueProp})`,
          geoStrategy:
            "Cidade → cercar POIs (terminais, faculdades, centros, malls) com raio curto e criativo contextual.",
          campaignObjective: obj.obj,
          kpis: obj.kpis,
          audiences: [
            "Geo: raio curto em POIs (0.5–2km) + horários (se aplicável)",
            "Interesses: estilo de vida ligado ao POI (estudo, trabalho, compras, lazer)",
            wantsDigital ? "Retarget: engajamento + vídeo views + mensagens" : "Retarget: engajamento 7/14d",
          ],
          creatives: {
            angles: [
              "Contexto do local (perfeito para quem está no [POI])",
              `Oferta rápida alinhada a ${pos.valueProp}`,
              "Impulso/escassez (janela de tempo: hoje, final de semana)",
            ],
            hooks: ["“Passando pelo [POI]?”", "“Pare 5 min e resolva isso”", "“Só hoje aqui perto”"],
            ctas: [obj.cta, "Ver localização", "Chamar agora"],
          },
          budgetHint: currentBudgetHint, // Dinâmico
          notes: [
            "Se shopping/âncora: mensagens e criativos precisam “parecer do lugar” (contextual).",
            "Se itinerante: rotas/horários devem estar claros na comunicação.",
          ],
          interests: "Compras, Entretenimento, Transporte Público, Vida Noturna",
          advantage: "OFF",
          strategy: "Geo-fencing tático manual",
          warning: "Baixo volume se o raio for muito restrito (<1km)"
        };
      }

      case "ECON_GROWTH": {
        return {
          name: `Expansão & Macro (${pos.valueProp})`,
          geoStrategy:
            "Estado/Regiões → priorizar municípios com sinais (renda/população/PIB quando disponível) e testar 3–5 clusters.",
          campaignObjective: obj.obj,
          kpis: obj.kpis,
          audiences: [
            "Geo: clusters por potencial (ex.: top 20 municípios por sinal)",
            `Interesses: categoria + intenção + ${pos.valueProp}`,
            "Segmentos amplos para medir demanda (sem microsegmentar)",
            wantsPhysical ? "Apoiar decisão com IBGE/Receita quando disponível" : "Usar performance como proxy de demanda",
          ],
          creatives: {
            angles: [
              "Proposta clara do que muda na vida do cliente (benefício principal)",
              `Diferencial coerente com ${pos.valueProp}`,
              "Prova social / cases / ‘onde já funciona’",
            ],
            hooks: ["“Chegamos em [região]”", "“Novo na sua cidade”", "“Veja como funciona em 30s”"],
            ctas: [obj.cta, "Quero na minha cidade", "Falar com consultor"],
          },
          budgetHint: currentBudgetHint, // Dinâmico
          notes: ["Evite conclusões com poucos eventos; use janelas maiores e agregue municípios por cluster."],
          interests: "Investimentos, Imóveis, Carreira, Luxo",
          advantage: "ON",
          strategy: "Advantage+ com exclusão geográfica",
          warning: "Custo por lead pode oscilar muito entre cidades"
        };
      }

      default: {
        return {
          name: `Estratégia Padrão (${pos.valueProp})`,
          geoStrategy: "Começar amplo e refinar por performance.",
          campaignObjective: obj.obj,
          kpis: obj.kpis,
          audiences: ["Broad", "Retarget 7/14/30d", `Interesses: categoria + ${pos.valueProp}`],
          creatives: {
            angles: [`Promessa em ${pos.valueProp}`, "Demonstração", "Prova social"],
            hooks: ["“Em 30s você entende…”", "“O erro #1 que…”", "“Se você quer X…”"],
            ctas: [obj.cta],
          },
          budgetHint: currentBudgetHint, // Dinâmico
          notes: ["Fallback aplicado porque não foi possível inferir a lógica operacional."],
          interests: "Interesses Gerais",
          advantage: "ON",
          strategy: "Automated Rules Standard",
          warning: "Defina limites de cpa"
        };
      }
    }
  })();

  // Fallback seguro se result for undefined, embora o switch cubra tudo
  if (!result) return defaults as any;

  return { ...defaults, ...result, budgetHint: currentBudgetHint };
}

export default buildTargetingDNA;
