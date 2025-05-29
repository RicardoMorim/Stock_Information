export function formatCurrency(value, currency = 'USD') {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercentage(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'N/A';
  }
  return `${value.toFixed(2)}%`;
}
