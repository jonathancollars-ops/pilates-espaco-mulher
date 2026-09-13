/**
 * Secure Local Image Storage Service
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Manages sandboxed local filesystem persistence for patient avatars
 * and clinical condition photos via expo-file-system.
 */

import * as FileSystem from 'expo-file-system/legacy';

const BASE_DOCS_DIR = FileSystem.documentDirectory || 'file:///data/user/0/com.espacomulher.pilates/files/';
export const AVATARS_DIR = `${BASE_DOCS_DIR}avatars/`;
export const CONDITION_PHOTOS_DIR = `${BASE_DOCS_DIR}condition_photos/`;

/**
 * Ensures a directory exists on the local filesystem.
 */
async function ensureDirectoryExists(dirUri: string): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(dirUri);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
    }
  } catch (error) {
    // If it already exists or concurrent creation occurred, ignore error
    const checkAgain = await FileSystem.getInfoAsync(dirUri);
    if (!checkAgain.exists) {
      throw new Error(`Falha ao criar diretório local: ${dirUri}`);
    }
  }
}

/**
 * Extracts file extension from a URI, defaulting to '.jpg'.
 */
function extractExtension(uri: string): string {
  const cleanUri = uri.split('?')[0].split('#')[0];
  const dotIndex = cleanUri.lastIndexOf('.');
  if (dotIndex !== -1) {
    const ext = cleanUri.substring(dotIndex).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.heic'].includes(ext)) {
      return ext;
    }
  }
  return '.jpg';
}

/**
 * Persists a patient profile photo (avatar) into the sandboxed avatars directory.
 * 
 * @param patientId Unique patient ID
 * @param sourceUri Temporary or picker URI of the image
 * @returns Destination local file URI
 */
export async function savePatientAvatar(patientId: string, sourceUri: string): Promise<string> {
  if (!patientId || !sourceUri) {
    throw new Error('Identificador do paciente e URI de origem são obrigatórios.');
  }

  await ensureDirectoryExists(AVATARS_DIR);

  const ext = extractExtension(sourceUri);
  const fileName = `${patientId}_avatar_${Date.now()}${ext}`;
  const targetUri = `${AVATARS_DIR}${fileName}`;

  await FileSystem.copyAsync({
    from: sourceUri,
    to: targetUri,
  });

  return targetUri;
}

/**
 * Persists a clinical condition photo into the sandboxed condition_photos directory.
 * 
 * @param patientId Unique patient ID
 * @param sourceUri Temporary or picker URI of the image
 * @returns Destination local file URI
 */
export async function saveConditionPhoto(patientId: string, sourceUri: string): Promise<string> {
  if (!patientId || !sourceUri) {
    throw new Error('Identificador do paciente e URI de origem são obrigatórios.');
  }

  await ensureDirectoryExists(CONDITION_PHOTOS_DIR);

  const ext = extractExtension(sourceUri);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileName = `${patientId}_cond_${Date.now()}_${randomSuffix}${ext}`;
  const targetUri = `${CONDITION_PHOTOS_DIR}${fileName}`;

  await FileSystem.copyAsync({
    from: sourceUri,
    to: targetUri,
  });

  return targetUri;
}

/**
 * Safely deletes a local photo file from the filesystem.
 * 
 * @param uri Local file URI to delete
 * @returns boolean indicating whether the file existed and was deleted
 */
export async function deleteLocalPhoto(uri: string): Promise<boolean> {
  if (!uri || typeof uri !== 'string') {
    return false;
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
