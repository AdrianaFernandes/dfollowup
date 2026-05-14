# Template PowerPoint — reunião delivery

Coloque aqui o ficheiro:

**`delivery-meeting-template.pptx`**

(cópia do teu modelo corporativo, ex. `TEMPLEATE.pptx`).

## Marcadores `{{DF_*}}`

No PowerPoint, use texto exactamente como `{{DF_PROJECT}}` (chave entre chaves duplas).  
O token **não** inclui `{{` `}}` na coluna “chave” abaixo — no slide deve ser `{{` + chave + `}}`.

| Marcador no slide | Conteúdo |
|-------------------|----------|
| `{{DF_CAPA_TITLE}}` | Título fixo: «Delivery Follow-up» |
| `{{DF_CAPA_PROJECT}}` | Nome do projeto (vazio se sem relatório) |
| `{{DF_CAPA_SPRINT}}` | Linha iteração ou Target Date |
| `{{DF_CAPA_AREAS}}` | Áreas WIQL (resumo) |
| `{{DF_DATE_PT}}` | Data da reunião (pt-PT, longo) |
| `{{DF_BRAND_FOOTER}}` | «Thomson Reuters» |
| `{{DF_META_LINE}}` | Projeto · recorte |
| `{{DF_NO_DATA}}` | Mensagem quando não há relatório |
| `{{DF_ANALYTICS_BLOCK}}` | Bloco KPIs / analytics (várias linhas) |
| `{{DF_RECAP_ISSUES_BODY}}` | Recap & issues — texto + analytics |
| `{{DF_RECAP_PENDING_BODY}}` | Detalhe filtro / area paths |
| `{{DF_ISSUES_BLOCKED_LINE}}` | Linha bloqueios (heurística) |
| `{{DF_ISSUES_OVERDUE_TSV}}` | Tabela atrasadas em TSV (área + contagem) |
| `{{DF_ISSUES_ANALYTICS_FOOTER}}` | Analytics (rodapé slide issues) |
| `{{DF_ROADMAP_INTRO}}` | Frase introdutória roadmap |
| `{{DF_ROADMAP_BODY}}` | Roadmap agrupado (texto + TSV por grupo) |
| `{{DF_DASHBOARD_LINES}}` | Linhas consolidado + velocity |
| `{{DF_DASHBOARD_BY_AREA_TSV}}` | TSV por area path (Tot / Cl / %) |
| `{{DF_CLOSED_TSV}}` | Itens fechados (TSV ou mensagem) |
| `{{DF_OPEN_TSV}}` | Itens em aberto (TSV ou mensagem) |
| `{{DF_THANK_YOU_PROJECT}}` | Projeto no slide final |
| `{{DF_TIER_SECTION_ANALYTICS}}` | Analytics nas secções “tier” (slides genéricos) |

Podes colocar **vários marcadores no mesmo slide** em caixas de texto diferentes.  
Células de **tabela** no modelo também podem conter estes marcadores (o motor percorre todos os elementos de texto).

Se o ficheiro **não** existir, a app continua a gerar o deck **programático** (PptxGenJS) como antes.
