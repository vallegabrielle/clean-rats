#!/bin/bash
# Gera os valores necessários para configurar o Codemagic.
# Execute: bash scripts/setup-codemagic.sh

set -e

PLIST="GoogleService-Info.plist"

echo ""
echo "=== GOOGLE_SERVICE_INFO_PLIST_BASE64 ==="
if [ -f "$PLIST" ]; then
  base64 -i "$PLIST"
else
  echo "ERRO: $PLIST não encontrado na raiz do projeto."
  echo "Baixe em: Firebase Console → seu app iOS → GoogleService-Info.plist"
fi

echo ""
echo "=== Variáveis do grupo app_env ==="
echo "Copie do seu .env.local:"
echo ""

ENV_VARS=(
  "EXPO_PUBLIC_FIREBASE_API_KEY"
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID"
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  "EXPO_PUBLIC_FIREBASE_APP_ID"
  "EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID"
  "EXPO_PUBLIC_ADMOB_IOS_APP_ID"
  "EXPO_PUBLIC_ADMOB_BANNER_IOS_ID"
  "EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS_ID"
  "GOOGLE_SERVICE_INFO_PLIST_BASE64"
)

if [ -f ".env.local" ]; then
  for VAR in "${ENV_VARS[@]}"; do
    VALUE=$(grep "^${VAR}=" .env.local | cut -d= -f2-)
    if [ -n "$VALUE" ]; then
      echo "  $VAR = $VALUE"
    else
      echo "  $VAR = (não encontrado em .env.local)"
    fi
  done
else
  for VAR in "${ENV_VARS[@]}"; do
    echo "  $VAR"
  done
fi

echo ""
echo "=== Variáveis do grupo app_store_connect ==="
echo "Obter em: App Store Connect → Users and Access → Integrations → App Store Connect API"
echo ""
echo "  APP_STORE_CONNECT_PRIVATE_KEY  → conteúdo do arquivo .p8 (incluindo as linhas BEGIN/END)"
echo "  APP_STORE_CONNECT_KEY_IDENTIFIER → Key ID (ex: ABC123DEFG)"
echo "  APP_STORE_CONNECT_ISSUER_ID      → Issuer ID (UUID)"
echo ""
echo "=== Code Signing ==="
echo "Codemagic → Teams → iOS code signing:"
echo "  - Distribution Certificate (.p12 + senha)"
echo "    Exportar do Keychain Access → My Certificates → Apple Distribution"
echo "  - Provisioning Profile (App Store, com.gdvll.cleanrats)"
echo "    Baixar em: developer.apple.com → Certificates, IDs & Profiles → Profiles"
echo ""
