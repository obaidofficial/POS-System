/**
 * POS Business Date Utility for Pakistan Time Zone (PKT / Asia/Karachi, UTC+5)
 *
 * Business day cut-off: 6:00 AM to 5:59:59 AM the following day.
 *
 * Rules:
 * - 11 October, 05:59 AM PKT -> Belongs to 10 October (Previous business day)
 * - 11 October, 06:00 AM PKT -> Belongs to 11 October (New business day)
 * - Entries of Sales, EP / JC, and Mobile Load between 00:00 and 05:59:59 PKT
 *   belong to the previous calendar day (e.g. 10 October).
 * - At 06:00:00 AM PKT onwards, new entries belong to the current calendar day (e.g. 11 October).
 */

export const PAKISTAN_TIMEZONE = "Asia/Karachi";

export interface PakistanTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Extract date and time parts strictly in Pakistan Time (Asia/Karachi, UTC+5)
 */
export const getPakistanTimeParts = (input?: Date | string | number): PakistanTimeParts => {
  let dateObj: Date;

  if (!input) {
    dateObj = new Date();
  } else if (input instanceof Date) {
    dateObj = input;
  } else if (typeof input === "number") {
    dateObj = new Date(input);
  } else if (typeof input === "string") {
    const trimmed = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      // If only a date string is passed, anchor at midday PKT to avoid any shift
      dateObj = new Date(`${trimmed}T12:00:00+05:00`);
    } else if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      // Date and time string without explicit timezone: interpret strictly as Pakistan Time (+05:00)
      const normalized = trimmed.replace(" ", "T");
      dateObj = new Date(`${normalized}+05:00`);
    } else {
      dateObj = new Date(trimmed);
    }
  } else {
    dateObj = new Date();
  }

  if (isNaN(dateObj.getTime())) {
    dateObj = new Date();
  }

  // Use Intl.DateTimeFormat anchored strictly to Asia/Karachi
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PAKISTAN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(dateObj);
  const getP = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value || "0";

  return {
    year: parseInt(getP("year"), 10),
    month: parseInt(getP("month"), 10),
    day: parseInt(getP("day"), 10),
    hour: parseInt(getP("hour"), 10),
    minute: parseInt(getP("minute"), 10),
    second: parseInt(getP("second"), 10),
  };
};

/**
 * Returns the effective POS Business Date (YYYY-MM-DD) in Pakistan Time.
 * Shifts back one calendar day if the time in Pakistan is strictly before 6:00 AM (00:00 to 05:59:59).
 * If a plain YYYY-MM-DD date string is already provided, it is returned as-is.
 */
export const getBusinessDate = (input?: Date | string | number): string => {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return input.trim();
  }

  const { year, month, day, hour } = getPakistanTimeParts(input);

  // UTC noon anchor avoids any local DST or leap second shifts
  const calendarAnchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  // Before 6:00 AM in Pakistan belongs to the previous business date
  if (hour < 6) {
    calendarAnchor.setUTCDate(calendarAnchor.getUTCDate() - 1);
  }

  const bYear = calendarAnchor.getUTCFullYear();
  const bMonth = String(calendarAnchor.getUTCMonth() + 1).padStart(2, "0");
  const bDay = String(calendarAnchor.getUTCDate()).padStart(2, "0");

  return `${bYear}-${bMonth}-${bDay}`;
};

/**
 * Returns the current time in Pakistan as 24-hour HH:mm
 */
export const getPakistanTime = (input?: Date | string | number): string => {
  const { hour, minute } = getPakistanTimeParts(input);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

/**
 * Returns formatted Pakistan time string (e.g. "05:59 AM" or "05:59")
 */
export const getPakistanFormattedTime = (
  format: "12h" | "24h" = "12h",
  input?: Date | string | number,
): string => {
  const { hour, minute } = getPakistanTimeParts(input);

  if (format === "24h") {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
};

/**
 * Returns the calendar date in Pakistan (YYYY-MM-DD) without 6 AM business shift
 */
export const getPakistanCalendarDate = (input?: Date | string | number): string => {
  const { year, month, day } = getPakistanTimeParts(input);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

/**
 * Formats a business date (YYYY-MM-DD) nicely for display in headers and badges.
 * e.g. "Saturday, October 10, 2026"
 */
export const formatBusinessDateForDisplay = (dateStr?: string): string => {
  const effectiveDate = dateStr || getBusinessDate();
  const [y, m, d] = effectiveDate.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  return dateObj.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Returns the current business month (YYYY-MM)
 */
export const getBusinessMonth = (input?: Date | string | number): string => {
  const bDate = getBusinessDate(input);
  return bDate.substring(0, 7);
};

/**
 * Computes a date N days prior to a given business date
 */
export const getDateNDaysAgoBusiness = (days: number, fromDateStr?: string): string => {
  const baseDate = fromDateStr ? fromDateStr : getBusinessDate();
  const [y, m, d] = baseDate.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  target.setUTCDate(target.getUTCDate() - days);

  const resY = target.getUTCFullYear();
  const resM = String(target.getUTCMonth() + 1).padStart(2, "0");
  const resD = String(target.getUTCDate()).padStart(2, "0");
  return `${resY}-${resM}-${resD}`;
};

/**
 * Returns whether a given date matches the current active Pakistan business date
 */
export const isCurrentBusinessDate = (dateStr: string): boolean => {
  return dateStr === getBusinessDate();
};
