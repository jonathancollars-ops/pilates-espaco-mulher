/**
 * PDF Service
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Generates and shares clinical evaluation PDF reports using
 * expo-print and expo-sharing.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Patient } from '../types/patient';
import { Anamnesis } from '../types/anamnesis';
import { PosturalEvaluation } from '../types/postural';
import { Bioimpedance } from '../types/bioimpedance';
import {
  generateClinicalReportHtml,
  ClinicalReportPayload,
} from './reportGenerator';

export interface GeneratePdfOptions {
  share?: boolean; // Default: true
  dialogTitle?: string;
  base64?: boolean;
}

export interface GeneratePdfResult {
  uri: string;
  numberOfPages?: number;
  base64?: string;
  html: string;
}

/**
 * Generates a PDF file from clinical report data and optionally opens the system share sheet.
 * Supports both positional parameters and object payload.
 */
export async function generateClinicalReportPdf(
  patientOrPayload: Patient | ClinicalReportPayload,
  anamnesis?: Anamnesis | null,
  postural?: PosturalEvaluation | null,
  bioimpedanceList?: Bioimpedance[] | null,
  options?: GeneratePdfOptions
): Promise<GeneratePdfResult> {
  // Resolve HTML string
  let html: string;
  let resolvedOptions: GeneratePdfOptions | undefined;

  if ('patient' in patientOrPayload) {
    html = generateClinicalReportHtml(patientOrPayload);
    resolvedOptions = anamnesis as unknown as GeneratePdfOptions | undefined;
  } else {
    html = generateClinicalReportHtml(patientOrPayload, anamnesis, postural, bioimpedanceList);
    resolvedOptions = options;
  }

  // Print HTML to temporary PDF file via expo-print
  const printResult = await Print.printToFileAsync({
    html,
    base64: resolvedOptions?.base64 ?? false,
  });

  const shouldShare = resolvedOptions?.share !== false;

  // Optionally trigger native sharing if available
  if (shouldShare) {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(printResult.uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: resolvedOptions?.dialogTitle ?? 'Compartilhar Relatório Clínico',
      });
    }
  }

  return {
    uri: printResult.uri,
    numberOfPages: printResult.numberOfPages,
    base64: printResult.base64,
    html,
  };
}

/**
 * Shares an already generated PDF file.
 */
export async function shareReportPdf(
  uri: string,
  dialogTitle = 'Compartilhar Relatório Clínico'
): Promise<boolean> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    return false;
  }

  await Sharing.shareAsync(uri, {
    UTI: '.pdf',
    mimeType: 'application/pdf',
    dialogTitle,
  });

  return true;
}

/**
 * Sends HTML directly to an AirPrint or connected printer without intermediate file.
 */
export async function printReportDirectAsync(html: string): Promise<void> {
  await Print.printAsync({ html });
}
