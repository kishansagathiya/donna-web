import { useEffect } from "react";
import { Link } from "react-router-dom";
import { formatPostDate, listPosts } from "../lib/blog";
import "./Pages.css";

export function BlogPage() {
  const posts = listPosts();

  useEffect(() => {
    document.title = "Blog — Donna";
  }, []);

  return (
    <div className="doc-page doc-page--wide">
      <div className="doc blog-index">
        <h1>Blog</h1>
        <p className="doc-updated">
          Notes on building Donna — memory, agents, and a real assistant.
        </p>
        {posts.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          <ul className="blog-list">
            {posts.map((post) => (
              <li key={post.slug} className="blog-list-item">
                <Link to={`/blog/${post.slug}`}>
                  <h2>{post.title}</h2>
                  <p className="blog-date">{formatPostDate(post.date)}</p>
                  {post.description ? (
                    <p className="blog-excerpt">{post.description}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
