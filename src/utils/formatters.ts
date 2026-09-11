/**
 * Brazilian Locale Formatters and Input Masks
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 */

/**
 * 1. Phone / WhatsApp Mask: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');

  if (digits.length <= 2) {
    return digits.length > 0 ? `(${digits}` : '';
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    // Landline: (XX) XXXX-XXXX
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // Mobile: (XX) XXXXX-XXXX (capped at 11 digits)
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Strips all non-numeric characters from a string.
 */
export function cleanDigits(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.replace(/\D/g, '');
}

/**
 * Generates a direct WhatsApp link with optional pre-filled message.
 */
export function formatWhatsAppUrl(phone: string, message?: string): string {
  const digits = cleanDigits(phone);
  const fullNumber = digits.startsWith('55') ? digits : `55${digits}`;
  const baseUrl = `https://wa.me/${fullNumber}`;
  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }
  return baseUrl;
}

/**
 * 2. Date Formatting: DD/MM/YYYY
 * Protects against timezone off-by-one errors (UTC-3 shift in Brazil).
 */
export function formatDateBR(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // Check if format is YYYY-MM-DD or starts with YYYY-MM-DD
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
  }

  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parses a Brazilian DD/MM/YYYY string into ISO YYYY-MM-DD format.
 */
export function parseBRDateToISO(brDate: string): string | null {
  if (!brDate) return null;
  const match = brDate.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) {
    return null;
  }

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Interactive typing mask for date inputs: DD/MM/YYYY
 */
export function maskDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Calculates completed age in years from birthdate.
 */
export function calculateAge(birthdateInput: string | Date | null | undefined): number | null {
  if (!birthdateInput) return null;
  let birthDate: Date;

  if (typeof birthdateInput === 'string') {
    const isoMatch = birthdateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      birthDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    } else {
      birthDate = new Date(birthdateInput);
    }
  } else {
    birthDate = birthdateInput;
  }

  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return Math.max(0, age);
}

/**
 * 3. Number and Unit Formatters
 */
export function formatWeight(kg: number | null | undefined, decimals = 1): string {
  if (kg == null || isNaN(kg)) return '—';
  return `${formatDecimalBR(kg, decimals)} kg`;
}

export function formatHeight(cm: number | null | undefined): string {
  if (cm == null || isNaN(cm)) return '—';
  return `${Math.round(cm)} cm`;
}

export function formatEnergy(kcal: number | null | undefined): string {
  if (kcal == null || isNaN(kcal)) return '—';
  const rounded = Math.round(kcal);
  return `${rounded.toLocaleString('pt-BR')} kcal`;
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value)) return '—';
  return `${formatDecimalBR(value, decimals)}%`;
}

export function formatDecimalBR(num: number | null | undefined, decimals = 1): string {
  if (num == null || isNaN(num)) return '—';
  return num.toFixed(decimals).replace('.', ',');
}

export function parseDecimalBR(str: string): number | null {
  if (!str) return null;
  const sanitized = str.trim().replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? null : parsed;
}
