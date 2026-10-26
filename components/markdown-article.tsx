import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { CodeBlock } from "./code-block";

export function headingId(value: React.ReactNode) {
  return String(value).toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

export function MarkdownArticle({ body }: { body: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h2: ({ children }) => <h2 id={headingId(children)}>{children}</h2>,
          h3: ({ children }) => <h3 id={headingId(children)}>{children}</h3>,
          table: ({ children }) => (
            <div className="table-scroll" role="region" aria-label="Scrollable data table" tabIndex={0}>
              <table>{children}</table>
            </div>
          ),
          pre: ({ children }) => {
            const child = React.Children.only(children) as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
            const language = child.props.className?.replace("language-", "");
            return <CodeBlock language={language}>{String(child.props.children ?? "")}</CodeBlock>;
          }
        }}
      >{body}</ReactMarkdown>
    </div>
  );
}
