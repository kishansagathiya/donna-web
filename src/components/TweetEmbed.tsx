import { useEffect, useRef, useState } from "react";
import type { TweetRef } from "../lib/tweet";

type TwitterWidgets = {
  widgets: {
    createTweet: (
      id: string,
      element: HTMLElement,
      options?: Record<string, unknown>,
    ) => Promise<HTMLElement | undefined>;
  };
};

declare global {
  interface Window {
    twttr?: TwitterWidgets;
  }
}

let twitterScript: Promise<TwitterWidgets> | null = null;

function loadTwitterWidgets(): Promise<TwitterWidgets> {
  if (window.twttr?.widgets) return Promise.resolve(window.twttr);
  if (twitterScript) return twitterScript;

  twitterScript = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://platform.twitter.com/widgets.js"]',
    );
    const onReady = () => {
      if (window.twttr?.widgets) resolve(window.twttr);
      else reject(new Error("Twitter widgets failed to load"));
    };

    if (existing) {
      if (window.twttr?.widgets) onReady();
      else existing.addEventListener("load", onReady, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.onload = onReady;
    script.onerror = () => reject(new Error("Twitter widgets failed to load"));
    document.body.appendChild(script);
  });

  return twitterScript;
}

export function TweetEmbed({ tweet }: { tweet: TweetRef }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    const node = mountRef.current;
    if (!node) return;
    let cancelled = false;
    setEmbedded(false);

    loadTwitterWidgets()
      .then((twttr) => {
        if (cancelled || !mountRef.current) return;
        mountRef.current.replaceChildren();
        return twttr.widgets.createTweet(tweet.id, mountRef.current, {
          theme: "dark",
          dnt: true,
          align: "center",
        });
      })
      .then((el) => {
        if (!cancelled && el) setEmbedded(true);
      })
      .catch(() => {
        if (!cancelled) setEmbedded(false);
      });

    return () => {
      cancelled = true;
      node.replaceChildren();
    };
  }, [tweet.id]);

  return (
    <figure className="blog-tweet">
      <div ref={mountRef} />
      {embedded ? null : (
        <p className="blog-tweet-fallback">
          <a href={tweet.url} target="_blank" rel="noopener noreferrer">
            @{tweet.handle} on X
          </a>
        </p>
      )}
    </figure>
  );
}
