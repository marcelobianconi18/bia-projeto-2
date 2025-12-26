-- 1. Habilitar a extensão de inteligência espacial (VITAL para o HotspotsEngine)
create extension if not exists postgis;

-- 2. Tabela Mestra de Setores Censitários (O "Proxy" de Renda Real)
create table if not exists ibge_sectors (
  id bigint primary key, -- Código do Setor (ex: 355030805000001)
  geom geography(MultiPolygon, 4326), -- O desenho do bairro no mapa
  income_avg numeric, -- Renda média (R$)
  population int, -- População total
  households int, -- Domicílios
  risk_zone boolean default false, -- Para excluir áreas de risco de entrega
  
  -- Índices de Performance para consulta rápida (< 100ms)
  constraint income_check check (income_avg >= 0)
);

-- 3. Índice Espacial (Para o ST_DWithin funcionar instantaneamente)
create index if not exists ibge_sectors_geom_idx on ibge_sectors using gist (geom);

-- 4. Tabela de Briefings (O "Cérebro" do Cliente)
create table if not exists briefings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references auth.users not null,
  
  -- O DNA da Campanha (JSON gerado pelo targetingDNA.ts)
  strategy_dna jsonb not null, 
  
  -- Snapshot Financeiro (Para auditoria de performance)
  budget_allocated numeric not null,
  opportunity_score int not null
);

-- 5. Função de Busca de Hotspots (A "Mágica" do Backend)
-- Substitui a lógica de array em memória por busca real no raio
create or replace function find_hotspots_in_radius(
  lat float, 
  lng float, 
  radius_meters int,
  min_income numeric default 0
)
returns table (
  sector_id bigint,
  income numeric,
  pop int,
  dist_meters float
)
language sql
as $$
  select 
    id, 
    income_avg, 
    population,
    st_distance(geom, st_point(lng, lat)::geography) as dist_meters
  from ibge_sectors
  where st_dwithin(geom, st_point(lng, lat)::geography, radius_meters)
  and income_avg >= min_income
  order by income_avg desc
  limit 20;
$$;
