export function formatPhoneNumber(input: string): string {
  const hasPlus = input.startsWith('+');
  const digits = input.replace(/\D/g, '');

  if (hasPlus) {
    return `+${digits}`;
  }

  // US number: 10 digits without country code
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // US number: 11 digits starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

export function parsePhoneNumbers(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map(num => num.trim())
    .filter(num => num.length > 0)
    .map(formatPhoneNumber);
}
