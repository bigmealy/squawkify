export interface Recording {
  id: string;
  songId: string;
  practiceId: string;
  url: string;
  takeLabel?: string;
  notes?: string;
  setOrder?: number;
}
