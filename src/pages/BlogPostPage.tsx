import { Children, isValidElement, useEffect } from "react";
import type { Components } from "react-markdown";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BlogSignupGate } from "../components/BlogSignupGate";
import { TweetEmbed } from "../components/TweetEmbed";
import { formatPostDate, getPost } from "../lib/blog";
import { parseTweetUrl } from "../lib/tweet";
import "./Pages.css";

function hrefOf(node: unknown): string | undefined {
  if (!isValidElement<{ href?: string }>(node)) return undefined;
  return node.props.href;
}

const markdownComponents: Components = {
  a({ href, children }) {
    if (href?.startsWith("/")) {
      return <Link to={href}>{children}</Link>;
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  p({ children }) {
    const items = Children.toArray(children);
    if (items.length === 1 && isValidElement<{ className?: string }>(items[0])) {
      const tweet = parseTweetUrl(hrefOf(items[0]));
      if (tweet) return <TweetEmbed tweet={tweet} />;
      if (items[0].props.className === "blog-figure") {
        return items[0];
      }
    }
    return <p>{children}</p>;
  },
  img({ src, alt }) {
    if (!src) return null;
    const caption = alt?.trim();
    const isVideo = /\.(mp4|webm)(?:$|\?)/i.test(src);
    return (
      <figure className="blog-figure">
        {isVideo ? (
          <video src={src} controls playsInline muted loop />
        ) : (
          <img src={src} alt={caption || ""} loading="lazy" />
        )}
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  },
};

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPost(slug) : undefined;

  useEffect(() => {
    document.title = post ? `${post.title} — Donna` : "Post not found — Donna";
    const meta = document.querySelector('meta[name="description"]');
    const previous = meta?.getAttribute("content");
    if (post?.description) {
      meta?.setAttribute("content", post.description);
    }
    return () => {
      if (previous) meta?.setAttribute("content", previous);
    };
  }, [post]);

  if (!post) {
    return (
      <div className="doc-page">
        <article className="doc">
          <p>
            <Link to="/blog" className="blog-back">
              ← Blog
            </Link>
          </p>
          <h1>Post not found</h1>
          <p>That post does not exist, or it is no longer published.</p>
        </article>
      </div>
    );
  }

  return (
    <div className="doc-page doc-page--wide">
      <article className="doc doc--pitch">
        <Link to="/blog" className="blog-back">
          ← Blog
        </Link>
        <h1>{post.title}</h1>
        <p className="doc-updated">{formatPostDate(post.date)}</p>
        <BlogSignupGate>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {post.body}
          </ReactMarkdown>
        </BlogSignupGate>
      </article>
    </div>
  );
}
