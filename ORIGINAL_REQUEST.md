# Original User Request

## 2026-09-11T20:13:38Z

Desenvolvimento de um aplicativo mobile nativo (iOS e Android via Expo / React Native) para a clínica "Pilates Espaço Mulher", de uso exclusivo da fisioterapeuta Dra. Rogéria Collares para avaliação fisioterapêutica postural/bioimpedância e prescrição de rotinas de treino de Pilates.

Working directory: c:\Users\jonat\Documents\antigravity\goofy-archimedes
Integrity mode: development

## Requirements

### R1. Apple Human Interface Guidelines (HIG) Design System & Mobile UX
Construção da camada de UI baseada nas diretrizes do Apple Human Interface Guidelines: tipografia nativa SF Pro / System Fonts, cabeçalhos com Large Titles dinâmicos, navegação nativa em abas e pilhas (Expo Router ou React Navigation), formulários no padrão `Inset Grouped List`, Segmented Controls, Sheets e modais com cantos suaves contínuos, e feedback tátil sutil via `expo-haptics`. Aplicação rigorosa da paleta oficial da marca:
- Primária (Pilates / Destaques): Lilás/Roxo (`#9B6CBA` e `#7A4F94`)
- Superfície / Fundo Agrupado: Off-white / Nude Suave (`#FAF8F5` e `#F4EEF7`)
- Acento / Alertas: Vinho/Bordô escuro (`#6A1B15`)
- Terciária / Sucesso e Indicadores: Verde Floresta Profundo (`#1B5235`)
Identidade profissional presente em headers/rodapés e relatórios: Dra. Rogéria Collares — CREFITO 23093-F, Pilates Espaço Mulher — Costa Azul, Rio das Ostras, WhatsApp: (22) 99947-4304.

### R2. Arquitetura Local-First com SQLite & Proteção Crítica de Cota do Firebase
Implementação de arquitetura estritamente Local-First utilizando banco de dados SQLite local (`expo-sqlite`) como fonte primária da verdade (Single Source of Truth). O aplicativo deve operar 100% offline para consulta, cadastro de pacientes, registro de avaliações e prescrição de treinos.
Para proteger a cota gratuita compartilhada (Spark Plan) do Firebase:
- Leituras e escritas no Firestore devem ser consolidadas (perfil do paciente, anamnese, avaliação e treinos em documento agrupado por paciente ou chave consolidada).
- Sem polling contínuo nem listeners em tempo real (`onSnapshot`) desnecessários.
- Sincronização remota disparada de forma explícita/sob demanda ou em lote com controle de flags locais de modificação (`dirty`/`synced`).
- Credenciais do Firebase configuradas:
  - apiKey: "AIzaSyDTW3CGDdCnhdq5xm3kFC6DdwCDnbkUa5o"
  - authDomain: "espacomulher-84137.firebaseapp.com"
  - projectId: "espacomulher-84137"
  - storageBucket: "espacomulher-84137.firebasestorage.app"
  - messagingSenderId: "484275307620"
  - appId: "1:484275307620:web:511b242f9ff23e703f4b71"
  - measurementId: "G-7FZV1VKLZY"

### R3. Módulo de Pacientes, Anamnese e Avaliação Fisioterapêutica Postural & Bioimpedância
Gerenciamento ágil de pacientes com busca e histórico cronológico:
- Cadastro completo do paciente (dados pessoais, contato, histórico clínico/patológico, queixas e objetivos).
- Avaliação postural estática e dinâmica (cabeça, ombros, coluna, pelve, joelhos, pés) com suporte a registro de fotos posturais com guias visuais/grid de alinhamento.
- Módulo de bioimpedância (peso, % gordura corporal, % massa muscular, água corporal, gordura visceral, TMB, IMC) com visualização comparativa e gráficos de evolução temporal.

### R4. Módulo de Prescrição e Execução de Rotinas de Treino de Pilates
Catálogo de exercícios organizado por aparelhos clássicos de Pilates (Reformer, Cadillac, Wunda Chair, Ladder Barrel, Mat / Solo e Pequenos Acessórios). Interface rápida para a profissional montar rotinas customizadas por paciente, ajustando número de repetições, configurações de molas/resistência, instruções posturais específicas e registro do histórico de sessões realizadas.

### R5. Exportação de Relatórios Clínicos e Compartilhamento
Geração e formatação de resumos de avaliação e evolução física para visualização e compartilhamento com o paciente (ex.: via WhatsApp ou PDF), contendo a identidade visual da clínica e assinatura profissional da fisioterapeuta.

## Acceptance Criteria

### UI & Apple HIG Compliance
- [ ] Todas as telas utilizam o design system com a paleta oficial da marca (`#9B6CBA`, `#FAF8F5`, `#6A1B15`, `#1B5235`) e seguem o padrão Inset Grouped List da Apple.
- [ ] Large Titles dinâmicos no topo das telas principais com transição suave na rolagem.
- [ ] Feedbacks táteis (`Haptics`) acionados em seleções, confirmações de salvamento e ações destrutivas.
- [ ] Cabeçalho e rodapé com identificação da Dra. Rogéria Collares (CREFITO 23093-F) e dados de Costa Azul / Rio das Ostras.

### Local-First & Proteção de Cota Firebase
- [ ] Aplicativo 100% funcional offline: todas as operações de CRUD de pacientes, avaliações e prescrições persistem no SQLite local instantaneamente.
- [ ] Módulo do Firebase configurado com as credenciais do projeto `espacomulher-84137`, operando sem loops de leitura nem listeners persistentes que possam estourar a cota gratuita compartilhada.
- [ ] Documentos consolidados para paciente e avaliações no Firestore.

### Fluxos Clínicos e Prescrição
- [ ] Fluxo completo de cadastro, anamnese, avaliação postural (com grid fotográfico) e bioimpedância validado e funcional.
- [ ] Módulo de treinos com catálogo de exercícios por aparelho de Pilates e prescrição personalizada por paciente.
- [ ] Busca instantânea de pacientes localmente no banco de dados.

### Qualidade e Integridade do Código
- [ ] Verificação de tipos TypeScript em modo estrito (`npx tsc --noEmit`) executando sem erros.
- [ ] Código modular com separação clara de camadas: Design System (Tokens/UI), Database (SQLite Local-First), Services (Firebase Sync), Features (Pacientes, Avaliação, Treinos).

## Follow-up — 2026-09-11T22:01:09Z

Desenvolvimento do aplicativo mobile nativo (iOS/Android via Expo / React Native com TypeScript) para a clínica "Pilates Espaço Mulher" (Dra. Rogéria Collares - CREFITO 23093-F), operando de forma 100% local (offline-first, zero backend, sem custos de banco de dados e sem tela de login), com verificação automática de novas versões ao iniciar e estrita aderência ao Apple Design System (HIG).

Working directory: c:\Users\jonat\Documents\antigravity\goofy-archimedes  
Integrity mode: development

---

## Requirements

### R1. Apple Human Interface Guidelines (HIG) Design System
Implementar a interface com conformidade rigorosa ao Apple Human Interface Guidelines (HIG):
- Tipografia com fontes do sistema / SF Pro, cabeçalhos com Large Titles colapsáveis na rolagem.
- Formulários e telas no padrão `Inset Grouped List` com cantos contínuos e espaçamentos consistentes.
- Controles de navegação com Segmented Controls, Native Action Sheets e modais com cantos suaves.
- Feedback tátil sutil e intencional via `expo-haptics` em toques, seleções, confirmações e ações destrutivas.
- Paleta oficial da marca "Espaço Mulher":
  - Primária (Pilates / Destaques): Lilás/Roxo (`#9B6CBA` e `#7A4F94`)
  - Fundo de Superfície / Grouped Background: Off-white / Nude Suave (`#FAF8F5` e `#F4EEF7`)
  - Acento (Espaço / Contraste): Vinho/Bordô Profundo (`#6A1B15`)
  - Terciária (Mulher / Indicadores Clínicos Positivos): Verde Floresta (`#1B5235`)
- Assinatura profissional padronizada em cabeçalhos, rodapés e relatórios:
  - Dra. Rogéria Collares — CREFITO 23093-F
  - Pilates Espaço Mulher — Costa Azul, Rio das Ostras
  - WhatsApp: (22) 99947-4304

### R2. Arquitetura 100% Local-First (Zero Backend & Sem Login)
- O aplicativo deve abrir instantaneamente no Dashboard de Pacientes, sem nenhuma barreira de login ou autenticação remota.
- Persistência exclusiva em banco relacional SQLite local via `expo-sqlite`, atuando como Single Source of Truth (SSOT).
- Esquema relacional estruturado com migrações versionadas (`PRAGMA user_version`) abrangendo tabelas de pacientes, anamnese, avaliações posturais, bioimpedância, biblioteca de exercícios, rotinas de treino e itens de treino.
- Mecanismo de Backup e Restauração local: tela de Ajustes/Configurações com opção de exportar e importar todos os dados do banco em formato JSON via `expo-sharing` e `expo-file-system`.
- Remoção total de dependências ativas de backend (como Firebase/Firestore), garantindo zero custo de infraestrutura e funcionamento 100% offline.

### R3. Detecção Automática de Atualizações ao Inicializar
Na inicialização do aplicativo (`App.tsx`):
- Executar verificação Over-The-Air via `expo-updates` (`Updates.checkForUpdateAsync()`). Se houver update EAS pronto, notificar e reiniciar.
- Fallback via GitHub Releases API: efetuar requisição leve para `https://api.github.com/repos/{owner}/{repo}/releases/latest` comparando com a versão local (`Constants.expoConfig.version`).
- Em caso de nova versão no GitHub, exibir alerta nativo iOS (`Alert.alert`) com título, notas da versão e botão "Atualizar Agora" que redireciona para a URL do release.
- Graceful degradation: falhas de rede (dispositivo offline) devem ser tratadas de forma silenciosa e não bloqueante, sem impactar a inicialização do app.

### R4. Gestão de Pacientes (Dashboard)
- Listagem de pacientes em cartões estilo Apple HIG com suporte a busca em tempo real (`Searchable`).
- Cadastro e edição com os seguintes campos (sem CPF, sem Estado Civil e sem CEP):
  - Nome Completo, Idade e Data de Nascimento.
  - Telefone / WhatsApp com máscara formatada.
  - Endereço, Bairro, Cidade/Estado (com valor padrão: "Rio das Ostras - RJ").
  - E-mail.
  - Convênio (ex.: Particular, Unimed, Bradesco, etc.).
- Ações rápidas no cartão do paciente: Ver Ficha de Avaliação, Editar Cadastro, Gerenciar Treinos e Excluir com confirmação nativa.

### R5. Ficha de Avaliação Fisioterapêutica e Relatórios em PDF
Wizard ou abas segmentadas por paciente:
1. **Dados Pessoais**: Cabeçalho visual dinâmico com resumo cadastral.
2. **Anamnese Clínica**: Exames laboratoriais, medicamentos em uso, alergias, cirurgias, fraturas (sim/não, local, imobilização, fisioterapia prévia), luxações (sim/não, local, imobilização, fisioterapia), gravidez (sim/não, quantidade, tipo de parto, intercorrências), aborto (sim/não, quantidade, tempo gestacional), atividade física atual, queixas álgicas (localização e intensidade) e histórico de exames de imagem.
3. **Avaliação Física e Postural**:
   - Vista Frontal: Inclinação da cabeça (D / E / Neutra), Ombros (D / E / Alinhados), Triângulo de Thales (D / E), Joelhos (Valgos / Varos / Neutro), Pés (Hálux valgo D/E, Inversão D/E, Eversão D/E).
   - Vista Lateral: Coluna Cervical (Retificada / Hiperlordose / Neutra), Ombros (Protrusão / Neutro), Abdômen, Coluna Dorsal (Hipercifose / Retificada), Coluna Lombar (Hipercifose / Hiperlordose / Retificada), Quadril (Anteversão / Retroversão), Pés (Arco plantar: Sim / Não).
   - Vista Posterior: Ângulo da escápula (D / E), Escoliose (observações), Quadril (alinhamento D/E), Linha glútea (D / E), Linha poplítea (D / E).
   - Musculatura: Hipertrofia / Hipotrofia e localização.
4. **Bioimpedância Evolutiva**:
   - Múltiplas aferições temporais: Data, Peso (kg), Altura (cm), Circunferência Abdominal (cm), IMC (cálculo automático), Idade Corporal, Idade Metabólica, TMB (kcal/dia), Gordura Corporal (%), Gordura Visceral (%), Massa Muscular Esquelética (kg), Peso Ideal, Peso Alvo.
   - Gordura Segmentar: Braço D/E, Tronco, Perna D/E.
   - Parecer e interpretação clínica da profissional.
5. **Geração e Compartilhamento de PDF**:
   - Renderização de PDF profissional em padrão A4 via `expo-print`.
   - Layout sofisticado com paleta do Espaço Mulher, tabelas organizadas de anamnese, postura e bioimpedância, e rodapé com assinatura formal da Dra. Rogéria Collares (CREFITO 23093-F).
   - Compartilhamento nativo via `expo-sharing` (WhatsApp, AirDrop, e-mail, salvar em arquivos).

### R6. Prescrição de Treinos de Pilates e Biblioteca Dinâmica de Exercícios
- Criação, edição e exclusão de rotinas de exercícios vinculadas a cada paciente.
- Banco de dados pré-carregado com mais de 30 exercícios clássicos de Pilates e Cinesioterapia:
  - Solo / Mat (The Hundred, Roll Up, Pranchas, Perdigueiro, Swan, etc.).
  - Aparelhos clássicos (Reformer, Cadillac, Wunda Chair, Ladder Barrel).
  - Cinesioterapia e Acessórios (Bola Suíça, Faixas Elásticas, Halteres).
- **Cadastro Dinâmico de Exercícios**: Botão "+ Criar Novo" permitindo à profissional cadastrar novos exercícios na hora (nome, aparelho/categoria, descrição, molas/intensidade), persistindo-os imediatamente no SQLite local para reutilização em qualquer paciente.
- Configuração individual por item de rotina: Séries, Repetições, Carga / Regulagem de Mola e Observações posturais.

### R7. Prontidão para Versionamento GitHub e Qualidade de Código
- Arquivo `.gitignore` abrangente para React Native / Expo (ignorando `.expo`, `node_modules`, builds locais, arquivos temporários).
- Ausência total de chaves secretas ou credenciais sensíveis no repositório.
- Documentação `README.md` detalhada com instruções de instalação (`npm install`), execução (`npm start`), arquitetura do projeto e configuração para futuras releases no GitHub.
- Tipagem estrita TypeScript sem erros em `npm run typecheck`.

---

## Acceptance Criteria

### Apple HIG & UI/UX
- [ ] Todas as telas utilizam a paleta oficial (`#9B6CBA`, `#FAF8F5`, `#6A1B15`, `#1B5235`) e estrutura Inset Grouped List.
- [ ] Large Titles dinâmicos nas telas principais com transição fluida para inline title ao rolar.
- [ ] Haptic feedback disparado em seleções de abas, segmented controls, salvamento e exclusão.
- [ ] Assinatura da Dra. Rogéria Collares (CREFITO 23093-F) visível no rodapé dos relatórios e telas institucionais.

### Local-First & SQLite Engine
- [ ] O app abre direto no Dashboard sem exigir login ou carregar tela de autenticação.
- [ ] Todas as entidades (pacientes, anamnese, postural, bioimpedância, treinos, exercícios) persistem no SQLite local e funcionam 100% offline.
- [ ] A tela de Configurações possui opções funcionais de Exportar Backup (gerando JSON compartilhado via `expo-sharing`) e Importar Backup (restaurando dados a partir de arquivo JSON).
- [ ] Nenhuma chamada de rede externa é necessária para a operação básica do app (zero backend dependency).

### Detecção de Atualizações
- [ ] Inicialização verifica atualizações OTA via `expo-updates` quando disponível.
- [ ] Requisição de fallback para GitHub Releases API compara versão local com a release mais recente.
- [ ] Alerta nativo iOS com opção "Atualizar Agora" é disparado quando detectada versão mais recente.
- [ ] Operação offline não trava nem exibe erro de atualização (silenciosa e tolerante a falhas).

### Gestão Clínica & Ficha de Avaliação
- [ ] Formulário de paciente não contém campos de CPF, Estado Civil ou CEP, e inicializa Cidade/Estado com "Rio das Ostras - RJ".
- [ ] Busca instantânea filtra pacientes por nome ou telefone em tempo real.
- [ ] Wizard/Segmented control permite preenchimento completo de Anamnese, Avaliação Postural (Frontal, Lateral, Posterior, Musculatura) e Bioimpedância.
- [ ] Cálculo automático de IMC e TMB na tela de bioimpedância.
- [ ] Botão de exportação gera PDF formatado em A4 via `expo-print` e abre o modal de compartilhamento via `expo-sharing`.

### Treinos & Exercícios Dinâmicos
- [ ] Banco de dados inicializado com mais de 30 exercícios clássicos de Pilates distribuídos entre Mat, Reformer, Cadillac, Chair, Barrel e Acessórios.
- [ ] Botão "+ Criar Novo" adiciona exercício customizado com sucesso ao SQLite e o disponibiliza na listagem para prescrição imediata.
- [ ] Rotinas personalizadas por paciente permitem configurar séries, repetições, carga/molas e notas.

### Código e Versionamento
- [ ] `npm run typecheck` (ou `npx tsc --noEmit`) executa com zero erros TypeScript.
- [ ] `.gitignore` devidamente configurado para Expo e React Native.
- [ ] `README.md` completo e bem estruturado na raiz do projeto.

---

## Verification Plan

### Automated Verification
- **TypeScript Strict Checking**: Executar `npm run typecheck` para assegurar que todos os componentes, schemas e repositórios estão 100% tipados.
- **Unit & Logic Tests**: Executar `npm test` para validar cálculos biométricos (IMC, TMB), serialização/deserialização do backup JSON e integridade dos seeds de exercícios.

### Interactive & Manual Verification
- Validação visual da navegação, Large Titles, Inset Grouped Lists e Segmented Controls.
- Teste de ciclo de vida do banco SQLite: inserção de paciente -> criação de anamnese -> avaliação postural -> registro de bioimpedância -> exportação de PDF.
- Teste da funcionalidade "+ Criar Novo" exercício e sua persistência.
- Teste de exportação e restauração de backup JSON.
- Teste do fallback de detecção de atualização no `App.tsx`.
