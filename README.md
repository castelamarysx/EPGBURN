# EPG Proxy Server

Servidor proxy para EPG (Electronic Program Guide) com cache e tratamento de erros.

## Configuração no Render.com

1. Crie uma conta em [Render.com](https://render.com)
2. Clique em "New +" e selecione "Web Service"
3. Configure o serviço:
   - Nome: `epg-proxy` (ou outro nome de sua escolha)
   - Runtime: Node
   - Build Command: `bun install`
   - Start Command: `bun run start`
   - Instance Type: Free
   - Region: Oregon (US West)
   - Branch: main

## Variáveis de Ambiente (Environment)
Não são necessárias variáveis de ambiente para este projeto.

## Arquivos incluídos

- `index.js` - Servidor proxy principal
- `package.json` - Dependências e configurações
- `.gitignore` - Arquivos a serem ignorados pelo Git

## Como usar

1. Faça deploy no Render.com usando as configurações acima
2. Sua URL será: `https://seu-app-name.onrender.com/epg`
3. Atualize a URL no arquivo `src/services/epg.ts` do seu projeto React

## Endpoints

- `GET /epg` - Retorna os dados do EPG em formato XML
- `GET /health` - Endpoint de verificação de saúde do servidor

## Características

- Cache de 1 hora
- CORS habilitado
- Fallback para cache em caso de erro
- Timeout de 30 segundos
- Headers de status do cache (X-Cache)

## Recursos do Plano Free

- 512 MB RAM
- 0.1 CPU
- Ideal para hobby projects
- Sem custos 