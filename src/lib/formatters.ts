// Formatter and auto-corrector utility for official CSC PDS form fields

export function formatSalary(value: string): string {
  if (!value) return '';
  const clean = value.replace(/[^\d.]/g, '');
  if (!clean) return value;
  const num = parseFloat(clean);
  if (isNaN(num)) return value;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return `P${formatted}`;
}

export function formatSSS(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 2) return digits;
  if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 9)}-${digits.slice(9, 10)}`;
}

export function formatPagIBIG(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join('-');
}

export function formatPhilHealth(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  if (digits.length <= 2) return digits;
  if (digits.length <= 11) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 11)}-${digits.slice(11, 12)}`;
}

export function formatTIN(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  const parts = [];
  for (let i = 0; i < digits.length; i += 3) {
    parts.push(digits.slice(i, i + 3));
  }
  return parts.join('-');
}

export function formatMobile(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
}

export function formatTelephone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
}

export function parseHeightSuggestion(value: string): string | null {
  if (!value) return null;
  const val = value.trim().toLowerCase();
  // Check for feet/inches like 5'10, 5ft 10in, 5'10"
  const match = val.match(/(\d+)\s*(?:'|ft|feet)\s*(\d+)?\s*(?:"|in|inches)?/);
  if (match) {
    const feet = parseInt(match[1], 10);
    const inches = match[2] ? parseInt(match[2], 10) : 0;
    const totalInches = feet * 12 + inches;
    const meters = (totalInches * 0.0254).toFixed(2);
    return `${meters} m`;
  }
  return null;
}
