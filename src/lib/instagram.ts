/**
 * The Instagram posts written by scripts/instagram.ts, read once per build. Without them (tests,
 * CI, branch previews) there is nothing to read and the section shows the favourites.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  FEED_DIR,
  FEED_FILE,
  IMAGE_DIR,
  IMAGE_FORMATS,
  imageName,
  parseFeed,
  type InstagramFeed,
} from '../data/instagram';

const cache = new Map<string, InstagramFeed | undefined>();

/** The feed in `public/instagram/`, checked against its images; a missing image fails the build. */
export function loadInstagram(
  dir: string = resolve('public', FEED_DIR),
): InstagramFeed | undefined {
  if (cache.has(dir)) return cache.get(dir);
  const file = join(dir, FEED_FILE);
  let feed: InstagramFeed | undefined;
  if (existsSync(file)) {
    feed = parseFeed(JSON.parse(readFileSync(file, 'utf8')));
    for (const post of feed.posts) {
      for (const width of feed.widths) {
        for (const format of IMAGE_FORMATS) {
          const image = join(dir, IMAGE_DIR, imageName(post.file, width, format));
          if (!existsSync(image)) throw new Error(`Instagram image missing: ${image}`);
        }
      }
    }
  }
  cache.set(dir, feed);
  return feed;
}
