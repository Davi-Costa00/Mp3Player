# Player de Música

Aplicativo mobile em React Native com Expo para importar e reproduzir arquivos MP3. A biblioteca e as playlists ficam salvas no dispositivo.

## Executar

Instale as dependências e inicie o Expo:

```bash
npm install
npx expo start
```

Abra o projeto no Expo Go ou em um emulador Android/iOS. Para gerar um bundle Android:

```bash
npx expo export --platform android
```

Para gerar um APK instalável em um dispositivo Android com EAS Build:

```bash
npx eas-cli@latest build --platform android --profile preview
```

Quando o build terminar, baixe o APK pelo link fornecido pelo EAS.

## Recursos

- Importar arquivos MP3 do dispositivo.
- Criar, renomear e remover playlists e músicas.
- Reproduzir, pausar, avançar, retroceder e controlar o volume.
- Escolher reprodução automática, ordem aleatória e tema claro/escuro.
