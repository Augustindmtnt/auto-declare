import { ChildConfig } from "./types";

export const DEFAULT_CHILDREN: ChildConfig[] = [
  {
    name: "Axelle",
    netHourlyRate: 3.9,
    majoredHourRate: 4.29,
    contractStartDate: "2025-01-01",
  },
  {
    name: "Brune",
    netHourlyRate: 4.1,
    majoredHourRate: 4.51,
    contractStartDate: "2025-01-01",
  },
];

export const HOURS_MON_THU = 9.25; // Mon-Thu daily hours
export const HOURS_FRI = 8.75; // Friday daily hours
export const MAJORED_HOURS_THRESHOLD = 45; // Weekly hours above which hours are majored

export const MAINTENANCE_RATE = 4; // € per worked day
export const MEAL_RATE = 4; // € per worked day

export const WEEKS_PER_YEAR = 45; // Incomplete year: 45 weeks worked
export const HOURS_PER_WEEK = 4 * HOURS_MON_THU + HOURS_FRI; // 45.75h
export const NORMAL_HOURS_PER_WEEK = Math.min(HOURS_PER_WEEK, MAJORED_HOURS_THRESHOLD); // 45h

export function computeMonthlySalary(netHourlyRate: number): number {
  return Math.round((netHourlyRate * NORMAL_HOURS_PER_WEEK * WEEKS_PER_YEAR) / 12 * 100) / 100;
}

export const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
