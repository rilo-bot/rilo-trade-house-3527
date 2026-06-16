import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders the assistant's markdown replies inside a chat bubble.
 *
 * Safe by default: react-markdown does NOT render raw HTML (we don't add
 * rehype-raw), so model output like `<img onerror=…>` is shown as text, not
 * executed — no XSS. It also sanitizes link protocols (javascript: etc.).
 * Every element is styled with theme tokens; no prose plugin needed.
 */
const components: Components = {
  p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-4 marker:text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-4 marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => {
    const internal = href?.startsWith("/");
    return (
      <a
        href={href}
        target={internal ? undefined : "_blank"}
        rel={internal ? undefined : "noopener noreferrer"}
        className="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
      >
        {children}
      </a>
    );
  },
  h1: ({ children }) => (
    <h3 className="mt-3 mb-1 text-sm font-semibold text-foreground">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mt-3 mb-1 text-sm font-semibold text-foreground">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1 text-sm font-semibold text-foreground">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-background/70 p-3 text-xs [&>code]:bg-transparent [&>code]:p-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-3 border-border" />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border px-2 py-1 text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-2 py-1">{children}</td>
  ),
};

export function AssistantMarkdown({ children }: { children: string }) {
  return (
    <div className="text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </Markdown>
    </div>
  );
}
