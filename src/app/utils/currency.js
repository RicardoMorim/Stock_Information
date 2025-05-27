export function formatCurrency(value, currency = 'USD') {
  // Check if the value is a number and not NaN
  if (typeof value !== 'number' || isNaN(value)) {
    // console.warn(`formatCurrency received an invalid value: ${value}`);
    return 'N/A'; // Or throw an error, or return a default like $0.00 or an empty string
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
