/**
 * Currency and number formatting utilities for Pakistani Rupee (PKR).
 * If a value is greater than 999999, formats into millions notation (e.g. 1.000M, 1.0971M).
 */

/**
 * Formats a number into millions format (e.g. 1.000M, 1.0971M) if > 999999,
 * or standard localized number otherwise.
 */
export const formatMillions = (amount: number | undefined | null): string => {
  const val = Number(amount) || 0;
  const isNegative = val < 0;
  const absVal = Math.abs(val);

  if (absVal > 999999) {
    const m = absVal / 1_000_000;
    const str4 = m.toFixed(4);
    const formatted = str4.endsWith("0") ? m.toFixed(3) : str4;
    return `${isNegative ? "-" : ""}${formatted}M`;
  }

  return `${isNegative ? "-" : ""}${absVal.toLocaleString("en-PK")}`;
};

/**
 * Primary PKR currency formatter.
 * Returns 'PKR 1.000M', 'PKR 1.0971M' if > 999999, or 'PKR 12,345.00' otherwise.
 */
export const formatPKR = (amount: number | undefined | null): string => {
  const val = Number(amount) || 0;
  const isNegative = val < 0;
  const absVal = Math.abs(val);

  if (absVal > 999999) {
    const m = absVal / 1_000_000;
    const str4 = m.toFixed(4);
    const formatted = str4.endsWith("0") ? m.toFixed(3) : str4;
    return `${isNegative ? "-" : ""}PKR ${formatted}M`;
  }

  const numStr = absVal.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return `${isNegative ? "-" : ""}PKR ${numStr}`;
};

/**
 * Formats PKR with 'Rs.' prefix, supporting millions notation > 999999.
 */
export const formatRs = (amount: number | undefined | null): string => {
  const val = Number(amount) || 0;
  const isNegative = val < 0;
  const absVal = Math.abs(val);

  if (absVal > 999999) {
    const m = absVal / 1_000_000;
    const str4 = m.toFixed(4);
    const formatted = str4.endsWith("0") ? m.toFixed(3) : str4;
    return `${isNegative ? "-" : ""}Rs. ${formatted}M`;
  }

  return `${isNegative ? "-" : ""}Rs. ${absVal.toLocaleString("en-PK")}`;
};

/**
 * Formats full exact amount for tooltips/title attributes.
 */
export const formatPKRFull = (amount: number | undefined | null): string => {
  const val = Number(amount) || 0;
  return `PKR ${val.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

export const formatNumber = (amount: number | undefined | null): string => {
  return formatMillions(amount);
};
