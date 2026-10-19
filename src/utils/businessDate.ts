/**
 * POS Business Date Utility
 *
 * Business day: 6:00 AM to 5:59:59 AM the following day.
 *
 * Examples:
 * October 18, 2026 at 05:59 AM -> October 17, 2026
 * October 18, 2026 at 06:00 AM -> October 18, 2026
 */

export const getBusinessDate = (date: Date = new Date()): string => {
  const businessDate = new Date(date);

  if (businessDate.getHours() < 6) {
    businessDate.setDate(businessDate.getDate() - 1);
  }

  const year = businessDate.getFullYear();
  const month = String(businessDate.getMonth() + 1).padStart(2, "0");
  const day = String(businessDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};
