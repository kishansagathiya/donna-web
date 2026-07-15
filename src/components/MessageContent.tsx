import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../lib/cn";

type Props = {
  content: string;
  variant: "user" | "assistant";
  className?: string;
};

const assistantComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h1 className="mb-2 text-base font-semibold last:mb-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 text-base font-semibold last:mb-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 text-[0.9375rem] font-semibold last:mb-0">{children}</h3>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-donna-gold underline underline-offset-2"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-donna-border pl-3 text-donna-muted last:mb-0">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-lg bg-black/5 px-3 py-2 font-mono text-[0.8125rem] leading-relaxed">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.8125rem]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg bg-black/5 p-3 last:mb-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-3 border-donna-border" />,
  table: ({ children }) => (
    <div className="mb-2 max-w-full overflow-x-auto last:mb-0">
      <table className="w-max min-w-full border-collapse text-left text-[0.875rem]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-donna-border bg-black/[0.04]">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-donna-border last:border-b-0">{children}</tr>
  ),
  th: ({ children, style }) => (
    <th
      style={style}
      className="whitespace-nowrap px-3 py-2 align-top font-semibold"
    >
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td style={style} className="whitespace-nowrap px-3 py-2 align-top">
      {children}
    </td>
  ),
  del: ({ children }) => <del className="line-through opacity-80">{children}</del>,
};

export function MessageContent({ content, variant, className }: Props) {
  if (!content) {
    return null;
  }

  if (variant === "user") {
    return <p className={cn("whitespace-pre-wrap", className)}>{content}</p>;
  }

  return (
    <div className={cn("[&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={assistantComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
