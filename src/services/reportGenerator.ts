/**
 * Clinical Report Generator (HTML5 / A4 Template)
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Standards:
 * - A4 Portrait print formatting with page-break controls
 * - Official Brand Palette: #9B6CBA, #FAF8F5, #6A1B15, #1B5235
 * - Negative Constraint: strictly excludes omitted sensitive demographics
 * - Complete Anamnesis, Postural Evaluation, and Evolutionary Bioimpedance Table
 * - Formal Clinician Signature Block
 */

import { Patient } from '../types/patient';
import {
  Anamnesis,
  FractureEntry,
  LuxationEntry,
  PregnancyEntry,
  AbortionEntry,
  PainComplaintEntry,
} from '../types/anamnesis';
import { PosturalEvaluation } from '../types/postural';
import { Bioimpedance } from '../types/bioimpedance';

export interface ClinicalReportPayload {
  patient: Patient;
  anamnesis?: Anamnesis | null;
  postural?: PosturalEvaluation | null;
  bioimpedanceList?: Bioimpedance[] | null;
  generatedAt?: string | Date;
}

export const CLINIC_REPORT_IDENTITY = {
  professionalName: 'Dra. Rogéria Collares',
  professionalTitle: 'Fisioterapeuta Especialista',
  crefito: 'CREFITO 23093-F',
  clinicName: 'Pilates Espaço Mulher',
  specialties: 'Fisioterapia Especializada • Reabilitação Postural • Pilates Clínico',
  location: 'Costa Azul, Rio das Ostras - RJ',
  phone: '(22) 99947-4304',
} as const;

/**
 * Escapes HTML characters to prevent XSS or layout breakage.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Safely parses JSON fields that may be returned as string or object from SQLite.
 */
export function parseSafeJson<T>(value: unknown): T | null {
  if (!value) return null;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Formats ISO YYYY-MM-DD to Brazilian standard DD/MM/YYYY.
 */
export function formatDateBR(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Não informada';
  if (dateInput instanceof Date) {
    const d = String(dateInput.getDate()).padStart(2, '0');
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const y = dateInput.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const clean = String(dateInput).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const [year, month, day] = clean.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }
  return clean;
}

/**
 * Formats full timestamp with date and time.
 */
export function formatDateTimeBR(dateInput?: string | Date | null): string {
  const d = dateInput instanceof Date ? dateInput : dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return 'Data não disponível';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

/**
 * Computes BMI: weight / (height / 100)^2
 */
export function calculateBmi(weightKg: number, heightCm: number): number {
  if (!weightKg || !heightCm || heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Evaluates WHO BMI classification.
 */
export function getBmiClassification(bmi: number): { label: string; color: string; bg: string } {
  if (bmi <= 0) return { label: 'N/A', color: '#6E6573', bg: '#F4EEF7' };
  if (bmi < 18.5) return { label: 'Abaixo do peso', color: '#C27803', bg: '#FEF5E7' };
  if (bmi < 25.0) return { label: 'Eutrófico (Normal)', color: '#1B5235', bg: '#E8F4EC' };
  if (bmi < 30.0) return { label: 'Sobrepeso', color: '#C27803', bg: '#FEF5E7' };
  if (bmi < 35.0) return { label: 'Obesidade Grau I', color: '#6A1B15', bg: '#FDECEB' };
  if (bmi < 40.0) return { label: 'Obesidade Grau II', color: '#6A1B15', bg: '#FDECEB' };
  return { label: 'Obesidade Grau III', color: '#6A1B15', bg: '#FDECEB' };
}

/**
 * Calculates Basal Metabolic Rate (BMR/TMB) for females using Mifflin-St Jeor equation.
 */
export function calculateBmr(weightKg: number, heightCm: number, ageYears?: number | null): number {
  if (!weightKg || !heightCm) return 0;
  const age = ageYears && ageYears > 0 ? ageYears : 35;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  return Math.round(bmr);
}

/**
 * Generates an HTML badge for Visual Analog Scale (EVA) pain score.
 */
function renderEvaBadge(eva: number): string {
  let color = '#1B5235';
  let bg = '#E8F4EC';
  let label = 'Leve';

  if (eva >= 7) {
    color = '#6A1B15';
    bg = '#FDECEB';
    label = 'Severa / Intensa';
  } else if (eva >= 4) {
    color = '#C27803';
    bg = '#FEF5E7';
    label = 'Moderada';
  } else if (eva === 0) {
    label = 'Ausente';
  }

  return `<span style="display:inline-block; padding:2px 8px; border-radius:12px; font-weight:700; font-size:11px; color:${color}; background-color:${bg}; border:1px solid ${color}40;">EVA ${eva}/10 • ${label}</span>`;
}

/**
 * Formats clinical status badge.
 */
function renderStatusBadge(status: string): string {
  switch (status) {
    case 'active':
      return '<span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600; color:#1B5235; background-color:#E8F4EC;">Em Tratamento Ativo</span>';
    case 'discharged':
      return '<span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600; color:#7A4F94; background-color:#F0E6F6;">Alta Clínica</span>';
    case 'archived':
      return '<span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600; color:#6E6573; background-color:#FAF8F5;">Prontuário Arquivado</span>';
    default:
      return `<span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600; color:#2C2530; background-color:#FAF8F5;">${escapeHtml(status)}</span>`;
  }
}

/**
 * Generates the complete HTML5 document for the clinical report.
 */
export function generateClinicalReportHtml(
  patientOrPayload: Patient | ClinicalReportPayload,
  anamnesisArg?: Anamnesis | null,
  posturalArg?: PosturalEvaluation | null,
  bioimpedanceListArg?: Bioimpedance[] | null
): string {
  let patient: Patient;
  let anamnesis: Anamnesis | null = null;
  let postural: PosturalEvaluation | null = null;
  let bioimpedanceList: Bioimpedance[] = [];
  let generatedAt: string | Date = new Date();

  // Support both object payload and positional arguments
  if ('patient' in patientOrPayload) {
    patient = patientOrPayload.patient;
    anamnesis = patientOrPayload.anamnesis ?? null;
    postural = patientOrPayload.postural ?? null;
    bioimpedanceList = patientOrPayload.bioimpedanceList ?? [];
    if (patientOrPayload.generatedAt) generatedAt = patientOrPayload.generatedAt;
  } else {
    patient = patientOrPayload;
    anamnesis = anamnesisArg ?? null;
    postural = posturalArg ?? null;
    bioimpedanceList = bioimpedanceListArg ?? [];
  }

  const formattedGeneratedAt = formatDateTimeBR(generatedAt);
  const birthdateFormatted = patient.birthdate ? formatDateBR(patient.birthdate) : 'Não informada';
  const ageDisplay = patient.age ? `${patient.age} anos` : 'Não informada';

  // Build full address
  const addressParts: string[] = [];
  if (patient.address) addressParts.push(patient.address);
  if (patient.neighborhood) addressParts.push(`Bairro ${patient.neighborhood}`);
  if (patient.city_state) addressParts.push(patient.city_state);
  const fullAddress = addressParts.length > 0 ? addressParts.join(' — ') : 'Rio das Ostras - RJ';

  // Parse Anamnesis JSON sub-fields safely
  const fractures = parseSafeJson<FractureEntry>(anamnesis?.fractures);
  const luxations = parseSafeJson<LuxationEntry>(anamnesis?.luxations);
  const pregnancies = parseSafeJson<PregnancyEntry>(anamnesis?.pregnancies);
  const abortions = parseSafeJson<AbortionEntry>(anamnesis?.abortions);
  const painComplaints = parseSafeJson<PainComplaintEntry[]>(anamnesis?.pain_complaints);

  // Sort bioimpedance chronologically (oldest to newest for evolution)
  const sortedBioimpedance = [...bioimpedanceList].sort((a, b) => {
    return new Date(a.evaluation_date).getTime() - new Date(b.evaluation_date).getTime();
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Clínico — ${escapeHtml(patient.name)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #1F1A24;
      background-color: #FFFFFF;
    }

    /* Primary Container */
    .report-container {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
    }

    /* Header Section */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2.5px solid #9B6CBA;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }

    .header-table td {
      vertical-align: top;
    }

    .clinic-brand-title {
      font-size: 18pt;
      font-weight: 800;
      color: #7A4F94;
      letter-spacing: -0.3px;
      margin-bottom: 2px;
    }

    .clinician-name {
      font-size: 12pt;
      font-weight: 700;
      color: #1F1A24;
      margin-bottom: 2px;
    }

    .clinician-crefito {
      color: #7A4F94;
      font-weight: 700;
    }

    .clinic-meta {
      font-size: 9pt;
      color: #6E6573;
      line-height: 1.35;
    }

    .report-badge-box {
      text-align: right;
    }

    .report-doc-title {
      display: inline-block;
      background-color: #F0E6F6;
      color: #7A4F94;
      font-size: 10pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 5px 12px;
      border-radius: 6px;
      border: 1px solid #D4BFE3;
      margin-bottom: 6px;
    }

    .report-emission-date {
      font-size: 8.5pt;
      color: #6E6573;
    }

    /* Section Cards */
    .section-card {
      background-color: #FFFFFF;
      border: 1px solid #E8E0EC;
      border-radius: 8px;
      margin-bottom: 14px;
      overflow: hidden;
      page-break-inside: avoid;
    }

    .section-header {
      background-color: #FAF8F5;
      border-bottom: 1px solid #E8E0EC;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #7A4F94;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .section-subtitle {
      font-size: 8.5pt;
      color: #6E6573;
    }

    .section-body {
      padding: 12px 14px;
    }

    /* Data Grids */
    .data-grid {
      display: table;
      width: 100%;
      border-collapse: collapse;
    }

    .data-row {
      display: table-row;
    }

    .data-cell {
      display: table-cell;
      padding: 5px 8px 5px 0;
      vertical-align: top;
    }

    .data-label {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #6E6573;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }

    .data-value {
      font-size: 10pt;
      font-weight: 500;
      color: #1F1A24;
    }

    .data-value-highlight {
      font-weight: 700;
      color: #7A4F94;
    }

    /* Two-column layout */
    .col-2 { width: 50%; }
    .col-3 { width: 33.33%; }
    .col-4 { width: 25%; }

    /* Tables */
    .table-custom {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 9pt;
    }

    .table-custom th {
      background-color: #FAF8F5;
      color: #7A4F94;
      font-weight: 700;
      text-align: left;
      padding: 7px 8px;
      border-bottom: 1.5px solid #D8CFDC;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .table-custom td {
      padding: 7px 8px;
      border-bottom: 1px solid #E8E0EC;
      color: #2C2530;
      vertical-align: middle;
    }

    .table-custom tr:nth-child(even) td {
      background-color: #FDFCFC;
    }

    .table-custom tr:last-child td {
      border-bottom: none;
    }

    /* Sub-panels inside sections */
    .sub-panel {
      background-color: #FAF8F5;
      border: 1px solid #E8E0EC;
      border-radius: 6px;
      padding: 9px 12px;
      margin-bottom: 10px;
    }

    .sub-panel:last-child {
      margin-bottom: 0;
    }

    .sub-panel-title {
      font-size: 9pt;
      font-weight: 700;
      color: #1F1A24;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .alert-wine {
      color: #6A1B15;
      font-weight: 600;
    }

    .success-green {
      color: #1B5235;
      font-weight: 600;
    }

    /* Formal Clinician Signature Footer */
    .signature-container {
      margin-top: 24px;
      padding-top: 16px;
      text-align: center;
      page-break-inside: avoid;
    }

    .signature-line {
      width: 320px;
      margin: 0 auto 6px auto;
      border-top: 1.5px solid #1F1A24;
    }

    .signature-name {
      font-size: 11pt;
      font-weight: 700;
      color: #1F1A24;
    }

    .signature-crefito {
      font-size: 9.5pt;
      font-weight: 600;
      color: #7A4F94;
      margin-top: 1px;
    }

    .signature-clinic {
      font-size: 8.5pt;
      color: #6E6573;
      margin-top: 2px;
    }

    .legal-notice {
      margin-top: 14px;
      font-size: 7.5pt;
      color: #9E97A6;
      text-align: center;
      line-height: 1.3;
    }

    .empty-notice {
      padding: 14px;
      text-align: center;
      font-size: 9pt;
      color: #6E6573;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 65%;">
          <div class="clinic-brand-title">${CLINIC_REPORT_IDENTITY.clinicName}</div>
          <div class="clinician-name">
            ${CLINIC_REPORT_IDENTITY.professionalName} — <span class="clinician-crefito">${CLINIC_REPORT_IDENTITY.crefito}</span>
          </div>
          <div class="clinic-meta">
            ${CLINIC_REPORT_IDENTITY.specialties}<br>
            ${CLINIC_REPORT_IDENTITY.location} • WhatsApp: ${CLINIC_REPORT_IDENTITY.phone}
          </div>
        </td>
        <td style="width: 35%;" class="report-badge-box">
          <div class="report-doc-title">Prontuário & Laudo</div><br>
          <span class="report-emission-date"><strong>Emissão:</strong> ${formattedGeneratedAt}</span>
        </td>
      </tr>
    </table>

    <!-- Patient Demographics Section -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">1. Identificação da Paciente</span>
        ${renderStatusBadge(patient.status)}
      </div>
      <div class="section-body">
        <div class="data-grid">
          <div class="data-row">
            <div class="data-cell col-2" style="padding-bottom: 8px;">
              <div class="data-label">Nome Completo</div>
              <div class="data-value data-value-highlight" style="font-size: 11pt;">${escapeHtml(patient.name)}</div>
            </div>
            <div class="data-cell col-4" style="padding-bottom: 8px;">
              <div class="data-label">Data de Nascimento</div>
              <div class="data-value">${birthdateFormatted}</div>
            </div>
            <div class="data-cell col-4" style="padding-bottom: 8px;">
              <div class="data-label">Idade Atual</div>
              <div class="data-value">${ageDisplay}</div>
            </div>
          </div>
          <div class="data-row">
            <div class="data-cell col-2">
              <div class="data-label">Telefone de Contato</div>
              <div class="data-value">${escapeHtml(patient.phone)}</div>
            </div>
            <div class="data-cell col-2">
              <div class="data-label">Convênio / Modalidade</div>
              <div class="data-value">${escapeHtml(patient.insurance || 'Particular')}</div>
            </div>
          </div>
          <div class="data-row">
            <div class="data-cell" style="padding-top: 8px; width: 100%;" colspan="3">
              <div class="data-label">Endereço de Residência</div>
              <div class="data-value">${escapeHtml(fullAddress)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Anamnesis Section -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">2. Anamnese Clínica & Queixas de Dor</span>
        <span class="section-subtitle">Avaliação Subjetiva & Histórico Patológico</span>
      </div>
      <div class="section-body">
        ${!anamnesis ? `
          <div class="empty-notice">Nenhuma anamnese clínica registrada no prontuário até o momento.</div>
        ` : `
          <!-- Pain Complaints & EVA Intensity -->
          <div class="sub-panel">
            <div class="sub-panel-title">
              <span>Quadro Álgico Principal & Escala Visual Analógica (EVA):</span>
              ${renderEvaBadge(anamnesis.pain_intensity ?? 0)}
            </div>
            ${Array.isArray(painComplaints) && painComplaints.length > 0 ? `
              <table class="table-custom" style="margin-top: 8px;">
                <thead>
                  <tr>
                    <th style="width: 30%;">Localização Anatômica</th>
                    <th style="width: 20%;">Intensidade</th>
                    <th style="width: 25%;">Características</th>
                    <th style="width: 25%;">Fatores de Agravo</th>
                  </tr>
                </thead>
                <tbody>
                  ${painComplaints.map((c) => `
                    <tr>
                      <td><strong>${escapeHtml(c.location)}</strong></td>
                      <td>${renderEvaBadge(c.eva_intensity)}</td>
                      <td>${escapeHtml(c.characteristics || 'Não relatadas')}</td>
                      <td>${escapeHtml(c.aggravating_factors || 'Não relatados')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="font-size: 9pt; color: #6E6573; margin-top: 4px;">
                Sem queixas localizadas de dor aguda no momento da admissão.
              </div>
            `}
          </div>

          <!-- Medical, Surgical & Traumatic History -->
          <div class="data-grid" style="margin-top: 8px;">
            <div class="data-row">
              <div class="data-cell col-3">
                <div class="data-label">Medicamentos em Uso</div>
                <div class="data-value">${escapeHtml(anamnesis.medications || 'Nenhum medicamento relatado')}</div>
              </div>
              <div class="data-cell col-3">
                <div class="data-label">Alergias Conhecidas</div>
                <div class="data-value ${anamnesis.allergies ? 'alert-wine' : ''}">${escapeHtml(anamnesis.allergies || 'Nenhuma alergia')}</div>
              </div>
              <div class="data-cell col-3">
                <div class="data-label">Cirurgias Prévias</div>
                <div class="data-value">${escapeHtml(anamnesis.surgeries || 'Nenhuma intervenção cirúrgica')}</div>
              </div>
            </div>
            <div class="data-row">
              <div class="data-cell col-2" style="padding-top: 8px;">
                <div class="data-label">Histórico de Fraturas</div>
                <div class="data-value">
                  ${fractures?.has === 'sim' 
                    ? `<span class="alert-wine">Sim</span>: ${escapeHtml(fractures.location || 'Local não especificado')} ${fractures.immobilization ? `(Imobilização: ${escapeHtml(fractures.immobilization)})` : ''} ${fractures.physiotherapy ? `— Fisio: ${escapeHtml(fractures.physiotherapy)}` : ''}`
                    : 'Nega histórico de fraturas'}
                </div>
              </div>
              <div class="data-cell col-2" style="padding-top: 8px;">
                <div class="data-label">Histórico de Luxações</div>
                <div class="data-value">
                  ${luxations?.has === 'sim'
                    ? `<span class="alert-wine">Sim</span>: ${escapeHtml(luxations.location || 'Local não especificado')} ${luxations.immobilization ? `(Imobilização: ${escapeHtml(luxations.immobilization)})` : ''} ${luxations.physiotherapy ? `— Fisio: ${escapeHtml(luxations.physiotherapy)}` : ''}`
                    : 'Nega histórico de luxações'}
                </div>
              </div>
            </div>
            <div class="data-row">
              <div class="data-cell col-2" style="padding-top: 8px;">
                <div class="data-label">Histórico Gineco-Obstétrico</div>
                <div class="data-value">
                  ${pregnancies?.has === 'sim'
                    ? `Gestações: ${pregnancies.quantity || 1} (${escapeHtml(pregnancies.delivery_type || 'Parto')} ${pregnancies.complications ? `— Complicações: ${escapeHtml(pregnancies.complications)}` : ''})`
                    : 'Sem gestações prévias'}
                  ${abortions?.has === 'sim' ? `<br><span style="color:#6E6573;">Abortamentos: ${abortions.quantity || 1} (${escapeHtml(abortions.gestational_age || 'Sem idade gestacional')})</span>` : ''}
                </div>
              </div>
              <div class="data-cell col-2" style="padding-top: 8px;">
                <div class="data-label">Atividade Física Atual & Hábitos</div>
                <div class="data-value">${escapeHtml(anamnesis.physical_activity || 'Sedentária / Sem atividade física regular')}</div>
              </div>
            </div>
          </div>

          <!-- Exams & Clinical Notes -->
          ${(anamnesis.imaging_exams || anamnesis.lab_tests || anamnesis.clinical_notes) ? `
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #E8E0EC;">
              ${anamnesis.imaging_exams ? `
                <div style="margin-bottom: 6px;">
                  <div class="data-label">Exames de Imagem (RX / RM / TC)</div>
                  <div class="data-value" style="font-size: 9.5pt;">${escapeHtml(anamnesis.imaging_exams)}</div>
                </div>
              ` : ''}
              ${anamnesis.lab_tests ? `
                <div style="margin-bottom: 6px;">
                  <div class="data-label">Exames Laboratoriais</div>
                  <div class="data-value" style="font-size: 9.5pt;">${escapeHtml(anamnesis.lab_tests)}</div>
                </div>
              ` : ''}
              ${anamnesis.clinical_notes ? `
                <div>
                  <div class="data-label">Parecer e Observações Clínicas Gerais</div>
                  <div class="data-value" style="font-size: 9.5pt; color: #2C2530;">${escapeHtml(anamnesis.clinical_notes)}</div>
                </div>
              ` : ''}
            </div>
          ` : ''}
        `}
      </div>
    </div>

    <!-- Postural Evaluation Section -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">3. Avaliação Postural Biomecânica</span>
        <span class="section-subtitle">${postural ? `Data da Avaliação: ${formatDateBR(postural.evaluation_date)}` : 'Inspeção Postural Tridimensional'}</span>
      </div>
      <div class="section-body">
        ${!postural ? `
          <div class="empty-notice">Nenhuma avaliação postural biomecânica registrada no momento.</div>
        ` : `
          <!-- Frontal View -->
          <div class="sub-panel">
            <div class="sub-panel-title" style="color: #7A4F94;">• Vista Frontal (Plano Coronal)</div>
            <div class="data-grid">
              <div class="data-row">
                <div class="data-cell col-4">
                  <div class="data-label">Cabeça / Cervical</div>
                  <div class="data-value">${escapeHtml(postural.head ? (postural.head === 'Neutra' ? 'Alinhada (Neutra)' : `Inclinação p/ ${postural.head}`) : 'Alinhada')}</div>
                </div>
                <div class="data-cell col-4">
                  <div class="data-label">Cintura Escapular / Ombros</div>
                  <div class="data-value">${escapeHtml(postural.shoulders ? (postural.shoulders === 'Alinhados' ? 'Alinhados' : `Mais elevado em ${postural.shoulders}`) : 'Alinhados')}</div>
                </div>
                <div class="data-cell col-4">
                  <div class="data-label">Triângulo de Thales</div>
                  <div class="data-value">${escapeHtml(postural.thales_triangle ? (postural.thales_triangle === 'Simétrico' ? 'Simétrico' : `Acentuado em ${postural.thales_triangle}`) : 'Simétrico')}</div>
                </div>
                <div class="data-cell col-4">
                  <div class="data-label">Alinhamento de Joelhos</div>
                  <div class="data-value">${escapeHtml(postural.knees || 'Neutro')}</div>
                </div>
              </div>
              <div class="data-row">
                <div class="data-cell" style="padding-top: 6px;" colspan="4">
                  <div class="data-label">Apoio Podal / Pés (Vista Frontal)</div>
                  <div class="data-value">${escapeHtml(postural.feet || 'Alinhamento neutro e simétrico')}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Lateral View -->
          <div class="sub-panel">
            <div class="sub-panel-title" style="color: #7A4F94;">• Vista Lateral (Plano Sagital)</div>
            <div class="data-grid">
              <div class="data-row">
                <div class="data-cell col-4">
                  <div class="data-label">Coluna Cervical</div>
                  <div class="data-value">${escapeHtml(postural.cervical || 'Neutra')}</div>
                </div>
                <div class="data-cell col-4">
                  <div class="data-label">Protrusão de Ombros</div>
                  <div class="data-value">${escapeHtml(postural.lateral_shoulders || 'Neutro')}</div>
                </div>
                <div class="data-cell col-4">
                  <div class="data-label">Coluna Dorsal / Torácica</div>
                  <div class="data-value">${escapeHtml(postural.dorsal || 'Neutra')}</div>
                </div>
                <div class="data-cell col-4">
                  <div class="data-label">Coluna Lombar</div>
                  <div class="data-value">${escapeHtml(postural.lumbar || 'Neutra')}</div>
                </div>
              </div>
              <div class="data-row">
                <div class="data-cell col-4" style="padding-top: 6px;">
                  <div class="data-label">Báscula Pélvica</div>
                  <div class="data-value">${escapeHtml(postural.pelvis || 'Neutra')}</div>
                </div>
                <div class="data-cell col-4" style="padding-top: 6px;">
                  <div class="data-label">Parede Abdominal</div>
                  <div class="data-value">${escapeHtml(postural.abdomen || 'Trofismo normal')}</div>
                </div>
                <div class="data-cell col-4" style="padding-top: 6px;">
                  <div class="data-label">Arco Plantar</div>
                  <div class="data-value">${postural.arch === 'Nao' ? '<span class="alert-wine">Desabado / Plano</span>' : 'Preservado (Sim)'}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Posterior View & Musculature -->
          <div class="sub-panel">
            <div class="sub-panel-title" style="color: #7A4F94;">• Vista Posterior & Tônus Muscular</div>
            <div class="data-grid">
              <div class="data-row">
                <div class="data-cell col-4">
                  <div class="data-label">Escápulas</div>
                  <div class="data-value">${escapeHtml(postural.scapula || 'Neutras')}</div>
                </div>
                <div class="data-cell col-4">
                  <div class="data-label">Pelve Posterior</div>
                  <div class="data-value">${escapeHtml(postural.posterior_pelvis ? (postural.posterior_pelvis === 'Alinhada' ? 'Alinhada' : `Desvio em ${postural.posterior_pelvis}`) : 'Alinhada')}</div>
                </div>
                <div class="data-cell col-4">
                  <div class="data-label">Linhas Glútea & Poplítea</div>
                  <div class="data-value">Glútea: ${escapeHtml(postural.gluteal_line || 'Alinhada')}<br>Poplítea: ${escapeHtml(postural.popliteal_line || 'Alinhada')}</div>
                </div>
                <div class="data-cell col-4">
                  <div class="data-label">Escoliose / Teste de Adams</div>
                  <div class="data-value">${escapeHtml(postural.scoliosis || 'Sem gibosidade detectada')}</div>
                </div>
              </div>
              <div class="data-row">
                <div class="data-cell" style="padding-top: 6px; width: 100%;" colspan="4">
                  <div class="data-label">Avaliação Muscular (Trofismo, Encurtamentos & Assimetrias)</div>
                  <div class="data-value">${escapeHtml(postural.musculature || 'Tônus eutrófico sem evidência de encurtamentos severos')}</div>
                </div>
              </div>
              ${postural.notes ? `
                <div class="data-row">
                  <div class="data-cell" style="padding-top: 6px; width: 100%;" colspan="4">
                    <div class="data-label">Conduta & Observações da Avaliação Postural</div>
                    <div class="data-value" style="font-size: 9.5pt;">${escapeHtml(postural.notes)}</div>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `}
      </div>
    </div>

    <!-- Bioimpedance Evolution Table Section -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">4. Monitoramento Evolutivo da Bioimpedância</span>
        <span class="section-subtitle">Composição Corporal, IMC, TMB & Distribuição Segmentar</span>
      </div>
      <div class="section-body">
        ${sortedBioimpedance.length === 0 ? `
          <div class="empty-notice">Nenhuma avaliação de bioimpedância registrada até o momento.</div>
        ` : `
          <table class="table-custom">
            <thead>
              <tr>
                <th style="width: 11%;">Data</th>
                <th style="width: 12%;">Peso / Alt.</th>
                <th style="width: 15%;">IMC & Status</th>
                <th style="width: 10%;">TMB (kcal)</th>
                <th style="width: 12%;">Gord. Corp.</th>
                <th style="width: 9%;">G. Visc.</th>
                <th style="width: 11%;">M. Muscular</th>
                <th style="width: 20%;">Gordura Segmentar</th>
              </tr>
            </thead>
            <tbody>
              ${sortedBioimpedance.map((item) => {
                const bmiVal = item.bmi && item.bmi > 0 ? item.bmi : calculateBmi(item.weight, item.height);
                const bmiClass = getBmiClassification(bmiVal);
                const bmrVal = item.bmr && item.bmr > 0 ? item.bmr : calculateBmr(item.weight, item.height, patient.age);

                // Segmental fat text
                const armText = (item.fat_arm_r !== null && item.fat_arm_r !== undefined && item.fat_arm_l !== null && item.fat_arm_l !== undefined)
                  ? `Braços: ${item.fat_arm_r}% D / ${item.fat_arm_l}% E`
                  : null;
                const trunkText = (item.fat_trunk !== null && item.fat_trunk !== undefined)
                  ? `Tronco: ${item.fat_trunk}%`
                  : null;
                const legText = (item.fat_leg_r !== null && item.fat_leg_r !== undefined && item.fat_leg_l !== null && item.fat_leg_l !== undefined)
                  ? `Pernas: ${item.fat_leg_r}% D / ${item.fat_leg_l}% E`
                  : null;

                const segmentalList = [armText, trunkText, legText].filter(Boolean);

                return `
                  <tr>
                    <td><strong>${formatDateBR(item.evaluation_date)}</strong></td>
                    <td>
                      <strong>${item.weight.toFixed(1)} kg</strong><br>
                      <span style="font-size: 8pt; color: #6E6573;">${item.height} cm</span>
                    </td>
                    <td>
                      <strong>${bmiVal.toFixed(1)}</strong> kg/m²<br>
                      <span style="display:inline-block; font-size: 7.5pt; font-weight:700; color:${bmiClass.color}; background-color:${bmiClass.bg}; padding:1px 5px; border-radius:4px;">
                        ${bmiClass.label}
                      </span>
                    </td>
                    <td>
                      <strong>${bmrVal}</strong><br>
                      <span style="font-size: 7.5pt; color:#6E6573;">kcal/dia</span>
                    </td>
                    <td>
                      <strong>${item.body_fat_percent.toFixed(1)}%</strong>
                      ${item.body_water_pct ? `<br><span style="font-size: 7.5pt; color:#6E6573;">Água: ${item.body_water_pct}%</span>` : ''}
                    </td>
                    <td>
                      <span style="font-weight:700; color: ${item.visceral_fat >= 10 ? '#6A1B15' : '#1B5235'};">
                        Nível ${item.visceral_fat}
                      </span>
                    </td>
                    <td>
                      <strong>${item.muscle_mass_kg.toFixed(1)} kg</strong>
                      ${item.abdominal_circ ? `<br><span style="font-size: 7.5pt; color:#6E6573;">Abd: ${item.abdominal_circ}cm</span>` : ''}
                    </td>
                    <td style="font-size: 8pt; line-height: 1.3;">
                      ${segmentalList.length > 0 ? segmentalList.join('<br>') : '<span style="color:#9E97A6;">Padrão global</span>'}
                    </td>
                  </tr>
                  ${item.clinical_opinion ? `
                    <tr>
                      <td colspan="8" style="background-color: #FAF8F5; padding: 5px 8px; font-size: 8pt; color: #2C2530;">
                        <strong>Parecer Clínico da Avaliação:</strong> ${escapeHtml(item.clinical_opinion)}
                      </td>
                    </tr>
                  ` : ''}
                `;
              }).join('')}
            </tbody>
          </table>
        `}
      </div>
    </div>

    <!-- Formal Clinician Signature Footer -->
    <div class="signature-container">
      <div class="signature-line"></div>
      <div class="signature-name">${CLINIC_REPORT_IDENTITY.professionalName}</div>
      <div class="signature-crefito">${CLINIC_REPORT_IDENTITY.crefito}</div>
      <div class="signature-clinic">${CLINIC_REPORT_IDENTITY.clinicName} • ${CLINIC_REPORT_IDENTITY.location}</div>
      <div class="legal-notice">
        Documento clínico emitido para fins de acompanhamento fisioterapêutico, monitoramento de saúde postural e prescrição cinesiológica.<br>
        Validação exclusiva sob assinatura da fisioterapeuta responsável. Todos os dados são protegidos por sigilo profissional e normas éticas vigentes.
      </div>
    </div>
  </div>
</body>
</html>`;
}
