# Europa a Dois 2027

Roteiro da viagem de 5 a 21 de fevereiro de 2027 (Paris, Mont Saint-Michel, Bélgica e Holanda), com tela "Hoje", roteiro dia a dia com fotos, mapa da rota, hotéis, checklist, gastos, trens e agenda editável.

Serviços externos usados (todos grátis e sem cadastro, chamados pelo navegador):
- **Fotos:** API da Wikipédia + créditos do Wikimedia Commons.
- **Mapa:** Leaflet com mapa base CARTO / OpenStreetMap.
- **Tempo:** Open-Meteo (previsão até 16 dias; antes disso, média real de fevereiro 2022–2026).
- **Cotação do euro:** Frankfurter (dados do Banco Central Europeu). Dá para definir a cotação manualmente na aba Gastos.

- **Site:** GitHub Pages (só arquivos estáticos, sem servidor).
- **Banco:** Firebase Firestore, com cache local para funcionar sem internet na viagem.
- **Login:** conta Google. Só os dois e-mails liberados em `firestore.rules` leem e salvam dados.

## Estrutura

| Arquivo | Para que serve |
|---|---|
| `index.html` | A página inteira: visual, roteiro, hotéis, checklist e agenda |
| `js/sync.js` | Login com Google e leitura/gravação no Firestore |
| `js/extras.js` | Fotos, mapa, tempo e controle de gastos |
| `js/firebase-config.js` | Configuração do projeto Firebase (**preencher**) |
| `firestore.rules` | Regras de acesso do banco (**preencher os e-mails**) |
| `sw.js` | Guarda a página no celular para abrir sem internet |
| `manifest.webmanifest`, `icons/` | Nome e ícone na tela inicial do celular |

Os dados ficam em `trips/europa-2027/` com as coleções `checks`, `calendar`, `hotels`, `hotelCustom`, `expenses` (gastos) e `settings` (orçamento).

## Passo a passo

### 1. Criar o projeto no Firebase
1. Acesse <https://console.firebase.google.com> e clique em **Criar projeto** (o Google Analytics pode ficar desligado).
2. No projeto, clique no ícone **Web (`</>`)** para registrar um app da Web. Dê o nome "Europa a Dois". Não precisa marcar o Firebase Hosting.
3. Guarde o objeto `firebaseConfig` que aparece na tela (vai no passo 4).

### 2. Ligar o login com Google
1. Menu **Authentication → Começar → Método de login**.
2. Ative **Google**, escolha o e-mail de suporte e salve.

### 3. Autorizar o endereço do GitHub Pages
1. Em **Authentication → Configurações → Domínios autorizados**, clique em **Adicionar domínio**.
2. Adicione `nascimentokp.github.io`.

### 4. Preencher a configuração
Edite `js/firebase-config.js` e cole os valores do passo 1 no lugar de `COLE_AQUI` e dos demais campos.
Esses valores podem ficar públicos: quem protege os dados são o login e as regras.

### 5. Criar o banco e publicar as regras
1. Menu **Firestore Database → Criar banco de dados**. Escolha uma região na Europa ou nos EUA e o **modo de produção**.
2. Edite `firestore.rules` no repositório, trocando `SEU_EMAIL@gmail.com` e `EMAIL_DA_ESPOSA@gmail.com` pelos e-mails das contas Google de vocês.
3. No Firebase, abra **Firestore Database → Regras**, cole o conteúdo de `firestore.rules` e clique em **Publicar**.

> Os e-mails ficam visíveis no repositório se ele for público. Se preferirem, deixem o repositório privado: o GitHub Pages funciona em repositório privado só nos planos pagos do GitHub. Outra opção é manter os e-mails reais apenas nas regras publicadas no Firebase e não no arquivo.

### 6. Publicar no GitHub Pages
1. No GitHub, abra o repositório → **Settings → Pages**.
2. Em **Build and deployment**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e salve.
3. Em um ou dois minutos o site fica em <https://nascimentokp.github.io/FeriasEuropa/>.

### 7. Usar no celular
1. Abra o endereço no Safari (iPhone) ou no Chrome (Android) e toque em **Entrar com Google**.
2. iPhone: **Compartilhar → Adicionar à Tela de Início**. Android: menu **⋮ → Adicionar à tela inicial**. O ícone da viagem já vem configurado.

## Atualizar a página
- Edite `index.html` e faça commit em `main`; o GitHub Pages publica sozinho.
- Ao mudar arquivos de forma importante, aumente `VERSION` em `sw.js` para os celulares baixarem a versão nova.

## Testar no computador
Os módulos do Firebase não carregam abrindo o arquivo direto (`file://`). Rode um servidor local na pasta:

```bash
python -m http.server 8000
```

Abra <http://localhost:8000>. O `localhost` já vem autorizado no Firebase.
