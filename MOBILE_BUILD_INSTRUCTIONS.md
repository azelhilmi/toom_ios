# Toom iOS — via Capacitor : mode d'emploi

Ce dépôt contient le code web de Toom **plus** le wrapper Capacitor iOS. La
version Android vit dans le dépôt séparé `toom_android`.

## Ce qui a été fait

- Capacitor installé (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`),
  `appId` = `com.toom.app`, `appName` = `Toom`.
- Dossier `ios/` (projet Xcode complet, géré via Swift Package Manager — pas
  besoin de CocoaPods) avec la description caméra (`NSCameraUsageDescription`)
  ajoutée à `Info.plist`.
- Workflow GitHub Actions `.github/workflows/mobile-build.yml` qui compile
  le projet iOS **sans le signer**, sur un runner `macos-latest`, pour
  détecter les régressions à chaque changement.

## À faire une seule fois : pousser ce dépôt

Ce dépôt t'a été fourni sous forme de bundle Git (fichier `.bundle`) car
l'environnement qui l'a préparé n'a pas d'accès en écriture à ton GitHub :

```
git clone toom_ios.bundle toom_ios
cd toom_ios
git remote set-url origin https://github.com/azelhilmi/toom_ios.git
git push -u origin main
```

## Pourquoi pas de vraie app installable pour l'instant ?

Publier sur l'App Store demande des étapes qui nécessitent un compte
personnel/entreprise, impossibles à préparer à l'avance :

1. Un compte Apple Developer Program (99 $/an).
2. Un Mac avec Xcode pour créer les certificats de signature et profils de
   provisioning (ou un service comme Fastlane Match / Codemagic depuis une CI).
3. Une fois ces certificats obtenus, le workflow peut être étendu pour
   signer et exporter un `.ipa`, uploader vers TestFlight, etc. — sur le même
   principe que la signature Android (secrets GitHub contenant les
   certificats et profils, jamais en clair dans le dépôt).

En attendant, le job `ios-sanity-check` garantit que le projet reste
compilable à chaque changement du code web ou natif.

## ⚠️ Ce dépôt est une copie du code web, pas une source live

Ce code web a été copié depuis le dépôt principal `azelhilmi/toom` au moment
de la préparation. **Ce dépôt ne se met pas à jour automatiquement** quand tu
modifies le code dans `azelhilmi/toom`. Avant chaque build iOS :
1. Reporte tes changements web dans `src/`, `public/`, etc. de **ce** dépôt.
2. `npm run build` → `npx cap sync ios` → commit → push.

## Développement local (nécessite un Mac)

```
npm run build
npx cap sync ios
npx cap open ios
```
Puis lancer depuis Xcode sur un simulateur ou un appareil.
