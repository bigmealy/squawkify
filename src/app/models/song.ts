export type SongStatus = 'learning' | 'gigging';

export interface Song {
  id: string;
  title: string;
  status?: SongStatus;
}
