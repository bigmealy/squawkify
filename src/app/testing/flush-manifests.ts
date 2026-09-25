import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { Practice } from '../models/practice';
import { PracticeMinutes } from '../models/practice-minutes';
import { Recording } from '../models/recording';
import { Song } from '../models/song';

export interface ManifestFixtures {
  songs?: Song[];
  practices?: Practice[];
  recordings?: Recording[];
  minutes?: PracticeMinutes[];
}

// HttpTestingController.expectOne both asserts a matching request exists and
// hands it back — there's no way to fetch a pending request without that
// assertion. Naming it `flushManifests` reflects what these tests use it
// for (answering all three manifest requests), rather than reading as an
// assertion inside Act.
export function flushManifests(
  httpMock: HttpTestingController,
  fixtures: ManifestFixtures = {},
): void {
  const respond = (url: string, body: Parameters<TestRequest['flush']>[0]) =>
    httpMock.expectOne(url).flush(body);

  respond('data/songs.json', fixtures.songs ?? []);
  respond('data/practices.json', fixtures.practices ?? []);
  respond('data/recordings.json', fixtures.recordings ?? []);
  respond('data/minutes.json', fixtures.minutes ?? []);
}
