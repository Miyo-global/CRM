export interface Holiday {
  id: number;
  orgId: string;
  name: string;
  date: string;
  message: string | null;
  year: number;
  createdAt: Date | string | null;
}

export interface AddHolidayInput {
  name: string;
  date: Date | string;
  message?: string;
}

export interface DeleteHolidayInput {
  holidayId: number;
}
