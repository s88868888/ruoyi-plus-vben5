const CNY_SYMBOL = '\u00A5';
const DAY_MS = 24 * 60 * 60 * 1000;

const CNY_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CN_ZERO = '\u96F6';
const CN_NUMS = [
  CN_ZERO,
  '\u58F9',
  '\u8D30',
  '\u53C1',
  '\u8086',
  '\u4F0D',
  '\u9646',
  '\u67D2',
  '\u634C',
  '\u7396',
] as const;
const CN_INT_RADICES = ['', '\u62FE', '\u4F70', '\u4EDF'] as const;
const CN_INT_UNITS = ['', '\u4E07', '\u4EBF', '\u5146'] as const;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value)
    .replace(/,/g, '')
    .replace(/[\u00A5\uFFE5]/g, '')
    .trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDatePart(value?: string): string {
  if (!value) {
    return '';
  }
  const [datePart = ''] = value.split(' ');
  return datePart;
}

function parseDate(value?: string): Date | null {
  const datePart = formatDatePart(value);
  if (!datePart) {
    return null;
  }

  const parsed = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function cnNum(index: number): string {
  return CN_NUMS[index] ?? CN_ZERO;
}

function cnIntRadix(index: number): string {
  return CN_INT_RADICES[index] ?? '';
}

function cnIntUnit(index: number): string {
  return CN_INT_UNITS[index] ?? '';
}

function convertGroup(groupText: string): string {
  let result = '';
  let zeroPending = false;
  const padded = groupText.padStart(4, '0');

  for (let i = 0; i < padded.length; i++) {
    const num = Number(padded[i] ?? '0');
    const unitIndex = padded.length - i - 1;

    if (num === 0) {
      zeroPending = result.length > 0;
      continue;
    }

    if (zeroPending) {
      result += CN_ZERO;
      zeroPending = false;
    }

    result += `${cnNum(num)}${cnIntRadix(unitIndex)}`;
  }

  return result;
}

function convertIntegerPart(integerPart: string): string {
  const groups: string[] = [];
  for (let i = integerPart.length; i > 0; i -= 4) {
    groups.unshift(integerPart.slice(Math.max(0, i - 4), i));
  }

  let result = '';
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i] ?? '0';
    const groupNumber = Number(group);
    const unit = cnIntUnit(groups.length - i - 1);

    if (groupNumber === 0) {
      if (result && !result.endsWith(CN_ZERO)) {
        result += CN_ZERO;
      }
      continue;
    }

    result += `${convertGroup(group)}${unit}`;

    const nextGroupNumber = Number(groups[i + 1] ?? '0');
    if (nextGroupNumber > 0 && nextGroupNumber < 1000 && !result.endsWith(CN_ZERO)) {
      result += CN_ZERO;
    }
  }

  return result.replace(/\u96F6+/g, CN_ZERO).replace(/\u96F6$/g, '') || CN_ZERO;
}

export function formatDateOnly(value?: string): string {
  return formatDatePart(value) || '-';
}

export function formatRemainingDays(publishDate?: string, deadline?: string): string {
  const publish = parseDate(publishDate);
  const end = parseDate(deadline);

  if (!publish || !end || end.getTime() < publish.getTime()) {
    return '-';
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((end.getTime() - today.getTime()) / DAY_MS);

  if (diffDays < 0) {
    return '\u5DF2\u622A\u6B62';
  }
  return `${diffDays}\u5929`;
}

export function formatCnyAmount(value: unknown): string {
  const amount = toNumber(value);
  if (amount === null) {
    return '-';
  }
  return CNY_FORMATTER.format(amount);
}

export function formatCnyScientific(value: unknown): string {
  const amount = toNumber(value);
  if (amount === null) {
    return '-';
  }
  return `${CNY_SYMBOL}${amount.toExponential(4).toUpperCase()}`;
}

export function formatCnyWithScientific(value: unknown): string {
  const normal = formatCnyAmount(value);
  const scientific = formatCnyScientific(value);
  if (normal === '-' || scientific === '-') {
    return '-';
  }
  return `${normal} (${scientific})`;
}

export function formatCnyUppercase(value: unknown): string {
  const amount = toNumber(value);
  if (amount === null) {
    return '-';
  }

  const negative = amount < 0;
  const fixed = Math.abs(amount).toFixed(2);
  const [integerRaw = '0', decimalRaw = '00'] = fixed.split('.');
  const integerPart = integerRaw || '0';
  const decimalPart = (decimalRaw || '00').padEnd(2, '0').slice(0, 2);

  const integerText = convertIntegerPart(integerPart);
  const jiao = Number(decimalPart[0] ?? '0');
  const fen = Number(decimalPart[1] ?? '0');

  let decimalText = '\u6574';
  if (jiao > 0 || fen > 0) {
    decimalText = '';
    if (jiao > 0) {
      decimalText += `${cnNum(jiao)}\u89D2`;
    } else if (fen > 0) {
      decimalText += CN_ZERO;
    }
    if (fen > 0) {
      decimalText += `${cnNum(fen)}\u5206`;
    }
  }

  const sign = negative ? '\u8D1F' : '';
  return `${sign}\u4EBA\u6C11\u5E01${integerText}\u5143${decimalText}`;
}
