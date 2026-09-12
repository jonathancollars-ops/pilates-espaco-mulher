# Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)

Aplicativo mobile nativo (iOS & Android via Expo / React Native) para avaliação fisioterapêutica postural, monitoramento de bioimpedância e prescrição clínica de exercícios no método Pilates clássico e contemporâneo.

---

## 🏛️ Identidade e Padrões Clínicos

- **Responsável Técnica:** Dra. Rogéria Collares — Fisioterapeuta Especialista (CREFITO 23093-F)
- **Clínica:** Pilates Espaço Mulher
- **Localização:** Costa Azul, Rio das Ostras - RJ
- **Contato Clínico:** (22) 99947-4304
- **Paleta Oficial de Identidade:**
  - `Plum Primary`: `#9B6CBA`
  - `Plum Dark`: `#7A4F94`
  - `Ivory Background`: `#FAF8F5`
  - `Card / Table Tint`: `#F4EEF7`
  - `Deep Burgundy Accent`: `#6A1B15`
  - `Forest Green Accent`: `#1B5235`

---

## 📐 Arquitetura do Sistema

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UI & Presentation Layer                         │
│   Apple HIG Design System, Inset Grouped Lists, Large Titles, Haptics  │
├────────────────────────────────────────────────────────────────────────┤
│                           Navigation Layer                             │
│       Tabs: Pacientes | Treinos | Aparelhos | Relatórios | Ajustes     │
├────────────────────────────────────────────────────────────────────────┤
│                            Feature Modules                             │
│  - Cadastro & Busca de Pacientes  - Avaliação Postural & Fotogrametria │
│  - Anamnese Clínica & Escala EVA  - Bioimpedância & Curvas Evolutivas  │
│  - Catálogo de Aparelhos Pilates  - Prescrição Dinâmica de Treinos     │
│  - Laudo Clínico & PDF/WhatsApp   - Backup & Sincronização Local-First │
├────────────────────────────────────────────────────────────────────────┤
│                       Local-First Database Layer                       │
│    SQLite Engine (expo-sqlite, WAL mode, foreign keys, 9 tables, SSOT) │
├────────────────────────────────────────────────────────────────────────┤
│                     Backup & Resiliência Offline                       │
│  Export/Restore JSON com Rollback Atômico | Atualizações Não-Bloqueantes│
└────────────────────────────────────────────────────────────────────────┘
```

1. **Local-First SSOT:** Todo o ciclo de vida dos dados clínicos reside em banco SQLite local (`expo-sqlite`), operando em modo WAL com integridade referencial ativa e migrações versionadas (`PRAGMA user_version`).
2. **Apple HIG & Design Tokens:** Interface construída com listas agrupadas (*Inset Grouped Lists*), títulos expansíveis (*Large Titles*), feedback tátil háptico e microinterações elegantes.
3. **Privacidade e Proteção de Dados:** Política estrita de dados clínicos — restrição absoluta de campos sensíveis não pertinentes (exclusão intencional de CPF, CEP e Estado Civil).
4. **Relatórios Clínicos Oficiais:** Geração dinâmica de laudos em HTML5/A4 para exportação em PDF e compartilhamento imediato via WhatsApp, com assinatura e identificação do CREFITO 23093-F.
5. **Atualizações com Degradação Graciosa:** Verificação dual de versões (OTA via `expo-updates` com fallback para API pública do GitHub Releases), totalmente tolerante ao modo avião e falhas de rede.

---

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js >= 18.0.0
- npm >= 9.0.0
- Expo CLI (ou `npx expo`)

### Instalação de Dependências
```bash
npm install
```

### Execução do Aplicativo
```bash
# Iniciar o servidor de desenvolvimento Expo
npm start

# Executar diretamente no emulador / dispositivo Android
npm run android

# Executar no simulador iOS (macOS requerido)
npm run ios

# Executar no navegador Web
npm run web
```

---

## 🧪 Suíte de Testes Automatizados e QA

O projeto adota uma estratégia rigorosa de garantia de qualidade baseada em **Category-Partition**, **Boundary Value Analysis (BVA)** e **Adversarial Stress Testing**, validando de ponta a ponta todas as regras de negócio, cálculos biométricos, transações de banco de dados e resiliência a falhas.

### Execução Completa da Suíte de Testes (289 testes)
```bash
npm test
```

### Compilação Estrita TypeScript (Zero Lints / Erros)
```bash
npx tsc --noEmit
```

### Execução de Suítes Específicas

#### 1. Módulo de Avaliação e Bioimpedância
Valida cálculos de IMC (ABESO/OMS) e TMB (Mifflin-St Jeor / Harris-Benedict) em valores de borda, histórico temporal no SQLite e laudo clínico com assinatura da Dra. Rogéria Collares:
```bash
node --test tests/m4_evaluation_flow.test.js
```

#### 2. Prescrição de Treinos e Exercícios Dinâmicos
Valida criação dinâmica de exercícios com `is_custom = 1`, catálogo imediato, montagem de rotinas com molas calibradas e atomicidade de rollback transacional:
```bash
node --test tests/m5_workout_routines.test.js
```

#### 3. Motor de Backup e Atualizações Offline
Valida exportação JSON das 7 tabelas relacionais, rejeição de backups corrompidos, dry-run referencial, rollback em falha de disco e degradação silenciosa em modo offline:
```bash
node --test tests/m6_backup_updates.test.js
```

---

## 📊 Matriz de Cobertura de Testes

| Módulo / Suíte | Arquivo | Testes | Cobertura Funcional & Cenários Validados |
|---|---|:---:|---|
| **M1 HIG & Identity** | `tests/m1_challenger.test.js` | 27 | Paleta, Tokens, HIG Inset Grouped, Large Title, Haptics |
| **M2 Formatters & Biometrics** | `tests/m2_formatters.test.js`<br>`tests/m2_biometrics.test.js` | 22 | Máscaras de data/telefone, IMC, TMB, Peso Ideal, Gordura Visceral |
| **M2 Repositories & Stress** | `tests/m2_repositories.test.js`<br>`tests/m2_challenger_backup_stress.test.js` | 51 | CRUD completo, transações atômicas, stress de backup |
| **M3 Patient Management** | `tests/m3_patient_integration.test.js`<br>`tests/m3_patient_dashboard_form.test.js`<br>`tests/m3_challenger_patient_form.test.js` | 68 | Admissão, busca em tempo real, validação de inputs, privacidade |
| **M4 Evaluation Flow** | `tests/m4_evaluation_flow.test.js` | 26 | Cálculos de borda IMC/TMB, histórico temporal bioimpedância, laudo PDF |
| **M4 Backend & Services** | `tests/m4_backend_services.test.js` | 20 | Serviços de relatório, atualizações OTA/GitHub, repositórios dinâmicos |
| **M5 Security & Data Privacy** | `tests/m5_security_audit.test.js` | 17 | Zero vazamento em nuvem, ausência de CPF/CEP, higienização de dados |
| **M5 Workout Routines** | `tests/m5_workout_routines.test.js` | 13 | Exercícios dinâmicos (`is_custom=1`), rotinas, séries, molas e rollback |
| **M6 Backup & Updates** | `tests/m6_backup_updates.test.js` | 17 | Exportação 7 tabelas, integridade referencial, rollback e modo offline |
| **Tiers 1, 2 e 5 Adicionais** | `tests/tier*` | 28 | Casos de borda de componentes de UI, botões e controles segmentados |
| **Total Aprovado** | **19 suítes** | **289** | **100% de Aprovação (`exit code 0`)** |

---

## 🔒 Diretrizes de Privacidade e Conformidade Ética

- **Ausência de CPF, CEP e Estado Civil:** Por diretriz deliberada da clínica, estes dados sensíveis não são solicitados nem persistidos no banco de dados.
- **Armazenamento 100% Local:** Os prontuários e históricos das pacientes residem no armazenamento seguro do dispositivo (`SQLite`), sem dependência de nuvem pública.
- **Assinatura e Validação:** Todos os laudos emitidos possuem validade sob o registro profissional da Dra. Rogéria Collares (CREFITO 23093-F).
