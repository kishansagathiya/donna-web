const TWEET_URL =
  /^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([A-Za-z0-9_]+)\/status\/(\d+)/i;

export type TweetRef = {
  url: string;
  handle: string;
  id: string;
};

export function parseTweetUrl(href: string | undefined): TweetRef | null {
  if (!href) return null;
  const match = href.trim().match(TWEET_URL);
  if (!match) return null;
  return {
    url: `https://x.com/${match[1]}/status/${match[2]}`,
    handle: match[1],
    id: match[2],
  };
}
