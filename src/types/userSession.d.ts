export interface sessionData {
  userId: string;
  accessToken: string;
  accessExp: number;
}

export enum sessionStatus {
  NotFound = 1,
  Expired = 2,
  Valid = 3,
}
