import { ChildConfig } from "./types";

export const CHILDREN: ChildConfig[] = [
  {
    name: "Axelle",
    monthlySalary: 658.13,
    majoredHourRate: 4.29,
  },
  {
    name: "Brune",
    monthlySalary: 691.88,
    majoredHourRate: 4.51,
  },
];

export const HOURS_MON_THU = 9.25; // Mon-Thu daily hours
export const HOURS_FRI = 8.75; // Friday daily hours
export const MAJORED_HOURS_THRESHOLD = 45; // Weekly hours above which hours are majored

export const MAINTENANCE_RATE = 4; // € per worked day
export const MEAL_RATE = 4; // € per worked day

export const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
