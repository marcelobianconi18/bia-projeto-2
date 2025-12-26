# TileServer local (OpenMapTiles)

Este guia usa `tileserver-gl` para servir tiles raster ou vetoriais localmente.

## Requisitos

- Docker ou Node.js
- Um arquivo `.mbtiles` (OpenMapTiles ou gerado via Tippecanoe)

## Opção A: Docker (mais simples)

1. Salve o arquivo `br.mbtiles` em uma pasta local.
2. Execute:
   ```bash
   docker run -it -v /caminho/para/tiles:/data -p 8080:8080 klokantech/tileserver-gl
   ```
3. Teste no navegador:
   - `http://localhost:8080/`
   - Estilos disponíveis em `http://localhost:8080/styles/`

## Opção B: Node.js

1. Instale:
   ```bash
   npm install -g tileserver-gl
   ```
2. Rode:
   ```bash
   tileserver-gl /caminho/para/br.mbtiles --port 8080
   ```

## Integracao no BIA

Defina a URL no `.env.local`:

```
VITE_TILESERVER_URL=http://localhost:8080/styles/osm-bright/{z}/{x}/{y}.png
```

Reinicie o Vite (`npm run dev`). O mapa vai usar o tileserver local.

## Observacoes

- Mantenha a atribuicao do OSM no mapa.
- Para tiles vetoriais, voce pode trocar o renderer (MapLibre) em um passo futuro.
