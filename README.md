# Mp3Player

Mp3Player é um aplicativo mobile de reprodução e organização de músicas, desenvolvido em React Native com Expo. O projeto permite que o usuário importe arquivos MP3, monte uma biblioteca local, organize playlists e controle a reprodução com uma experiência simples, responsiva e persistente entre sessões.

## Sobre mim

Meu nome é Davi Costa, tenho 17 anos e eu sempre tive interesse em tecnologia. Fiz esse projeto, pois estava estudando programação pela FreeCodeCamp, e queria ver na prática como um projeto completo era produzido, por pura curiosidade. Já que meu conhecimento técnico ainda era baixo, usei ferramentas como GitHub Copilot e Gemini para fazer pesquisas gerais, tirar dúvidas e fazer a sintaxe do app.

Meu objetivo principal era aprender. Eu não sabia o que queria aprender na hora que comecei, mas, ao final, aprendi coisas como Git, API, bibliotecas, frameworks, usar o terminal e várias coisas úteis para alguém que só sabia o básico de lógica e sintaxe.

Já que meu tédio foi resolvido, vou voltar a estudar normalmente agora. Fiquem com a explicação sobre o funcionamento do app abaixo.

## Sobre o projeto

A aplicação foi construída com foco em uma proposta prática: disponibilizar um player offline que funcione diretamente no dispositivo, sem depender de uma API externa ou de serviços de streaming. As informações da biblioteca, das playlists e das preferências são armazenadas localmente, permitindo que o usuário retome o uso do app sem precisar reconfigurar tudo.

## Principais recursos

### Biblioteca e importação

- Importação de um ou vários arquivos diretamente do dispositivo.
- Validação por extensão `.mp3` ou por tipos MIME relacionados ao formato MP3.
- Cópia dos arquivos selecionados para o armazenamento local do aplicativo.
- Biblioteca ordenada automaticamente por nome.
- Identificador, nome exibido e data de importação associados a cada música.
- Remoção de músicas da biblioteca, incluindo o respectivo arquivo local.
- Renomeação do nome exibido das faixas sem alterar o arquivo original.

### Playlists

- Playlists padrão:
  - **Todas as músicas**, com a biblioteca completa em ordem alfabética;
  - **Adicionadas recentemente**, com ordenação pela data de importação.
- Criação de playlists personalizadas.
- Renomeação e exclusão de playlists.
- Importação de músicas já diretamente dentro da playlist ativa.
- Remoção de uma música da playlist sem excluir o arquivo da biblioteca.
- Validação para evitar playlists com nomes duplicados.

### Reprodução

- Reprodução, pausa e retomada da faixa atual.
- Avanço e retorno entre as músicas da fila ativa.
- Barra com tempo decorrido, duração total e controle visual de progresso por toque ou arraste.
- Reprodução automática da próxima faixa ao término da música atual.
- Modo aleatório com histórico para navegação anterior e próxima mais consistente.
- Seleção da próxima faixa sem repetir a faixa atual quando há opções disponíveis.
- Configuração de áudio para tocar com o celular silencioso e continuar em segundo plano.
- Integração com controles de áudio nativos quando disponíveis pelo módulo Expo.

### Interface e persistência

- Temas claro e escuro personalizados.
- Barra fixa de reprodução durante a navegação pela biblioteca.
- Interface adaptada para diferentes plataformas e áreas seguras dos dispositivos.
- Ajustes de reprodução e aparência armazenados com AsyncStorage.
- Normalização dos dados carregados para ignorar registros inválidos ou incompletos.
- Layout preparado para Android, iOS e web.

## Tecnologias utilizadas

- React Native
- Expo SDK 57
- Expo Router
- Expo Audio
- Expo Document Picker
- Expo File System
- AsyncStorage
- React Native Reanimated
- Ionicons

## Estrutura do projeto

```text
src/
├── app/
│   ├── _layout.tsx       # Layout raiz da aplicação
│   └── index.jsx         # Biblioteca, playlists, reprodução e configurações
├── components/           # Componentes visuais reutilizáveis do template
├── constants/            # Constantes de tema
└── hooks/                # Hooks de interface e tema
```

A maior parte da lógica funcional está concentrada na tela principal, que coordena o estado da biblioteca, as operações de arquivos, a persistência, as playlists e o player de áudio.

## Executando localmente

### Pré-requisitos

- Node.js
- npm
- Expo CLI compatível
- Para Android ou iOS, um dispositivo físico com Expo Go ou um emulador configurado

### Instalação

```bash
npm install
npx expo start
```

No terminal do Expo, escolha Android, iOS ou web. Também é possível utilizar o endereço exibido no terminal diretamente pelo aplicativo Expo Go.

## Gerando o APK Android

Com o EAS Build configurado, execute:

```bash
npx eas-cli@latest build --platform android --profile preview
```

O perfil `preview` está configurado para gerar uma distribuição interna em formato APK. Ao concluir o processo, o pacote pode ser baixado pelo link gerado pelo Expo EAS.

## Persistência dos dados

O aplicativo utiliza uma única chave no AsyncStorage para salvar:

- Lista de músicas importadas;
- Playlists criadas pelo usuário;
- Associação entre músicas e playlists;
- Preferência de reprodução automática;
- Preferência de ordem aleatória;
- Preferência de tema claro ou escuro.

Os arquivos MP3 são armazenados em uma pasta local do aplicativo. Os metadados e os caminhos para esses arquivos são utilizados para reconstruir o estado da biblioteca na próxima inicialização.

## Considerações técnicas

- O projeto trabalha com arquivos locais e não possui sincronização em nuvem.
- Atualmente, a importação aceita apenas arquivos no formato MP3.
- A biblioteca depende de os arquivos permanecerem disponíveis no armazenamento local do aplicativo.
- A reprodução em segundo plano e os controles externos dependem dos recursos disponíveis em cada plataforma.
- Os dados e arquivos permanecem associados ao dispositivo e à instalação do aplicativo.
