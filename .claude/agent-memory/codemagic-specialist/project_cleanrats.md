---
name: CleanRats — Configuração Codemagic
description: Contexto do projeto clean-rats no Codemagic — stack, bundle ID, chaves e decisões de config
type: project
---

Projeto React Native / Expo com workflows iOS no Codemagic.

- Bundle ID: `com.gdvll.cleanrats`
- Workspace Xcode: `ios/CleanRats.xcworkspace`, scheme `CleanRats`
- Stack: Expo prebuild + CocoaPods + npm
- Node: v20
- Distribuição iOS: `app_store` (TestFlight via `ios-preview`, App Store via `ios-production`)
- Environment groups usados: `app_env`, `app`
- GoogleService-Info.plist injetado via `$GOOGLE_SERVICE_INFO_PLIST_BASE64` no step de build

**Chaves Developer Portal (Teams > Integrations > Developer Portal):**
- "Codemagic" — label "Automatic code signing" (chave padrão/primeira, provavelmente sem permissões suficientes)
- "Codemagic 2" — Key ID `YFMML26QDQ` — chave correta para signing automático

**Decisão:** `api_key_id: YFMML26QDQ` adicionado em ambos os workflows dentro de `ios_signing` para forçar uso da chave correta.

**Why:** sem `api_key_id` explícito, o Codemagic usava a primeira chave da lista (ordem da UI), que não tinha permissões adequadas para buscar/criar provisioning profiles app_store, causando "No matching profiles found".

**How to apply:** sempre incluir `api_key_id` no bloco `ios_signing` ao gerar configs para este projeto.
