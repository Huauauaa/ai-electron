export type WorkHourRefreshRequest = {
  loginUrl: string;
  workHourUrl: string;
};

export type WorkHourRecordRow = {
  api_id: number;
  payload: string;
  fetched_at: number;
};

export type WorkHourRefreshResult = {
  inserted: number;
  rows: WorkHourRecordRow[];
};

export type WorkHourListResult = {
  rows: WorkHourRecordRow[];
};
