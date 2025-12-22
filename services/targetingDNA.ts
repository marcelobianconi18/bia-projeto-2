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

export function buildTargetingDNA(briefing: BriefingData): TargetingDNA {
  const logic = operationalLogic(briefing.operationalModel as any) ?? "RADIUS";
  const posId = briefing.marketPositioning as any | undefined;
  const pos = posTone(posId ? POSITIONING_META[posId]?.priceBias : undefined);

  const objId = briefing.objective as any | undefined;
  const obj = objectivePack(objId ? OBJECTIVE_META[objId]?.funnel : undefined);

  const ds = briefing.dataSources?.[0];
  const wantsDigital = ds === "DS_DIGITAL" || ds === "DS_CROSS";
  const wantsPhysical = ds === "DS_PHYSICAL" || ds === "DS_CROSS";

  switch (logic) {
    case "NATIONAL_HEATMAP": {
      return {
        name: `Digital Nacional (${pos.valueProp})`,
        geoStrategy: "Brasil (macro) → estados/cidades por performance; começar amplo e refinar por CPA/ROAS.",
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
        budgetHint: "70% prospecção / 30% retarget; consolidar conjuntos com maior volume.",
        notes: [
          "Evite microsegmentação no início; deixe o algoritmo aprender.",
          "Criativos diferentes por posicionamento (popular vs premium) mudam mais que interesses.",
        ],
      };
    }

    case "RADIUS": {
      return {
        name: `Local por Raio (${pos.valueProp})`,
        geoStrategy: "Cidade → raio por unidade (testar 1km/3km/5km; ajustar por densidade).",
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
        budgetHint: "60% raio principal / 40% raio secundário; mover verba para o raio com melhor CPA/CPL.",
        notes: [
          wantsPhysical ? "Se possível, cruzar com sinais IBGE (renda/densidade) para priorizar bairros." : "Sem IBGE: priorize aprendizado por performance.",
        ],
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
        budgetHint: "Distribuir 50/30/20 entre zonas (rápida/média/longa) e otimizar pela margem.",
        notes: ["Se a operação tem limite real, não prometa prazos fora da área atendida."],
      };
    }

    case "POI_FLOW":
    case "ANCHORS": {
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
        budgetHint: "Criar 3–6 POIs principais; pausar os que não batem CTR + conversão após aprendizado.",
        notes: [
          "Se shopping/âncora: mensagens e criativos precisam “parecer do lugar” (contextual).",
          "Se itinerante: rotas/horários devem estar claros na comunicação.",
        ],
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
        budgetHint: "80% teste (clusters) / 20% retarget; promover clusters vencedores após 7–14 dias.",
        notes: ["Evite conclusões com poucos eventos; use janelas maiores e agregue municípios por cluster."],
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
        budgetHint: "70% prospecção / 30% retarget.",
        notes: ["Fallback aplicado porque não foi possível inferir a lógica operacional."],
      };
    }
  }
}

export default buildTargetingDNA;
