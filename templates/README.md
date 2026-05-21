# Referência PowerPoint (legado `{{DF_*}}`)

O export **actual** gera o `.pptx` no servidor com **PptxGenJS** (`lib/exportDeliveryMeetingPptxProgrammatic.ts`). **Não** é necessário colocar um ficheiro modelo no disco para o download funcionar.

Os ficheiros `TEMPLEATE.pptx`, `delivery-meeting-template.pptx` ou variável **`DELIVERY_PPT_TEMPLATE_PATH`** mantêm valor apenas como **referência de design** e **checklist semântica**: os mesmos blocos de dados que antes iam para marcadores `{{DF_*}}` / `{{DF_UI_*}}` estão descritos em `lib/deliveryMeetingPptxData.ts` (`buildDeliveryMeetingPlaceholderMap`).

## Conteúdo mínimo do deck (PptxGenJS)

- Capa, KPIs (alinhados ao resumo executivo), texto consolidado, tabela por área, roadmap (corpo + listas closed / new+active), análise e métricas, pendências e riscos (`deckInput`), avisos do relatório se existirem.

## Marcadores `{{DF_UI_*}}` (dados da app) — mapeamento conceptual

| Antes no modelo | Agora no export |
|-----------------|-----------------|
| `{{DF_UI_LAST_MEETING_PENDING}}` | Tabela **Pendências** a partir das linhas editadas na UI |
| `{{DF_UI_RISKS_ACTION_PLAN}}` | Tabela **Riscos e plano de acção** |

## Marcadores `{{DF_*}}` (dados do relatório ADO)

Lista completa das chaves e texto derivado: `lib/deliveryMeetingPptxData.ts` (`buildDeliveryMeetingPlaceholderMap`). O builder programático reutiliza esse mapa para paridade de conteúdo.

## Nota histórica

Versões anteriores usavam **pptx-automizer** sobre um `.pptx` com caminhos ZIP normalizados; esse fluxo foi removido.
