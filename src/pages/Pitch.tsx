import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import pitchMarkdown from "../content/pitch.md?raw";
import "./Pages.css";

export function Pitch() {
  useEffect(() => {
    document.title = "Pitch — Donna";
  }, []);

  return (
    <div className="doc-page doc-page--wide">
      <article className="doc doc--pitch">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {pitchMarkdown}
        </ReactMarkdown>
      </article>
    </div>
  );
}
