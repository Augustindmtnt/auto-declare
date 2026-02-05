export interface ChildConfig {
  name: string;
  monthlySalary: number;
  majoredHourRate: number;
}

export interface CalendarDay {
  date: Date;
  dateKey: string; // "YYYY-MM-DD"
  isCurrentMonth: boolean;
  isBusinessDay: boolean;
  isToday: boolean;
  isToggleable: boolean; // false for end-of-month overflow days
}

export interface CalendarWeek {
  days: CalendarDay[];
}

export interface DeclarationResult {
  childName: string;
  monthlySalary: number;
  majoredHoursCount: number;
  majoredHoursAmount: number;
  totalSalary: number;
  workedDays: number;
  maintenanceAllowance: number;
  mealAllowance: number;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: string; // ISO date string
  end: string; // ISO date string
}
