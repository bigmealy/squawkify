import { Practice } from '../models/practice';
import { PracticeMinutes } from '../models/practice-minutes';
import { Recording } from '../models/recording';
import { Song } from '../models/song';
import {
  groupByPractice,
  groupBySong,
  joinRecordings,
  sortPracticesMostRecentFirst,
  sortRecordingsBySetOrder,
  sortTakesMostRecentFirst,
} from './rehearsal-grouping';

describe('rehearsal-grouping', () => {
  const songA: Song = { id: 's1', title: 'Song A' };
  const songB: Song = { id: 's2', title: 'Song B' };
  const practiceOld: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };
  const practiceNew: Practice = { id: 'p2', date: '2026-02-01', venue: 'Room 2' };

  describe('joinRecordings', () => {
    it('joins recordings to their song and practice by id', () => {
      const recording: Recording = {
        id: 'r1',
        songId: songA.id,
        practiceId: practiceOld.id,
        url: 'https://example.com/r1.mp3',
      };

      const joined = joinRecordings([songA], [practiceOld], [recording]);

      expect(joined).toEqual([{ recording, song: songA, practice: practiceOld }]);
    });

    it('skips and warns on a recording with an unresolvable songId', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const recording: Recording = {
        id: 'r1',
        songId: 'missing-song',
        practiceId: practiceOld.id,
        url: 'https://example.com/r1.mp3',
      };

      const joined = joinRecordings([songA], [practiceOld], [recording]);

      expect(joined).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('r1'));
      warn.mockRestore();
    });

    it('skips and warns on a recording with an unresolvable practiceId', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const recording: Recording = {
        id: 'r1',
        songId: songA.id,
        practiceId: 'missing-practice',
        url: 'https://example.com/r1.mp3',
      };

      const joined = joinRecordings([songA], [practiceOld], [recording]);

      expect(joined).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('r1'));
      warn.mockRestore();
    });
  });

  describe('groupBySong', () => {
    it('includes every song, even one with zero matching recordings', () => {
      const recording: Recording = {
        id: 'r1',
        songId: songA.id,
        practiceId: practiceOld.id,
        url: 'https://example.com/r1.mp3',
      };
      const joined = joinRecordings([songA, songB], [practiceOld], [recording]);

      const groups = groupBySong([songA, songB], joined);

      expect(groups).toEqual([
        { song: songA, recordings: joined },
        { song: songB, recordings: [] },
      ]);
    });
  });

  describe('groupByPractice', () => {
    it('includes every practice, even one with zero matching recordings', () => {
      const recording: Recording = {
        id: 'r1',
        songId: songA.id,
        practiceId: practiceOld.id,
        url: 'https://example.com/r1.mp3',
      };
      const joined = joinRecordings([songA], [practiceOld, practiceNew], [recording]);

      const groups = groupByPractice([practiceOld, practiceNew], joined);

      expect(groups).toEqual([
        { practice: practiceOld, recordings: joined, minutes: undefined },
        { practice: practiceNew, recordings: [], minutes: undefined },
      ]);
    });

    it('attaches the matching minutes entry when one exists for a practice', () => {
      const minutes: PracticeMinutes = {
        practiceId: practiceOld.id,
        url: 'https://example.com/minutes.md',
      };

      const groups = groupByPractice([practiceOld, practiceNew], [], [minutes]);

      expect(groups[0].minutes).toEqual(minutes);
      expect(groups[1].minutes).toBeUndefined();
    });

    it('leaves minutes undefined for every practice when no minutes are given', () => {
      const groups = groupByPractice([practiceOld], []);

      expect(groups[0].minutes).toBeUndefined();
    });
  });

  describe('sortTakesMostRecentFirst', () => {
    it('orders joined recordings by practice date descending', () => {
      const older = { recording: {} as Recording, song: songA, practice: practiceOld };
      const newer = { recording: {} as Recording, song: songA, practice: practiceNew };

      const sorted = sortTakesMostRecentFirst([older, newer]);

      expect(sorted).toEqual([newer, older]);
    });
  });

  describe('sortPracticesMostRecentFirst', () => {
    it('orders practices by date descending', () => {
      const sorted = sortPracticesMostRecentFirst([practiceOld, practiceNew]);

      expect(sorted).toEqual([practiceNew, practiceOld]);
    });
  });

  describe('sortRecordingsBySetOrder', () => {
    it('orders by setOrder ascending when every recording has one', () => {
      const second = {
        recording: { setOrder: 2 } as Recording,
        song: songA,
        practice: practiceOld,
      };
      const first = { recording: { setOrder: 1 } as Recording, song: songA, practice: practiceOld };

      const sorted = sortRecordingsBySetOrder([second, first]);

      expect(sorted).toEqual([first, second]);
    });

    it('leaves original order untouched when no recording has setOrder', () => {
      const a = { recording: {} as Recording, song: songA, practice: practiceOld };
      const b = { recording: {} as Recording, song: songA, practice: practiceOld };
      const c = { recording: {} as Recording, song: songA, practice: practiceOld };

      const sorted = sortRecordingsBySetOrder([a, b, c]);

      expect(sorted).toEqual([a, b, c]);
    });
  });
});
