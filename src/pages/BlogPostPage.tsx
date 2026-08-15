import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatPostDate, getPost } from "../lib/blog";
import "./Pages.css";

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
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
      </article>
    </div>
  );
}
