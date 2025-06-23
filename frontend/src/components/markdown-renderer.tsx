'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom styling for different elements
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-foreground mb-4 mt-6 first:mt-0 border-b border-border pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-foreground mb-3 mt-5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-foreground mb-2 mt-4 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-foreground/90 mb-3 leading-relaxed">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 space-y-1 text-foreground/90">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1 text-foreground/90">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="ml-2">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/20 pl-4 italic text-foreground/80 mb-3">
              {children}
            </blockquote>
          ),
          code: ({ children, ...props }) => {
            const inline = 'inline' in props ? props.inline : false;
            return inline ? (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
                {children}
              </code>
            ) : (
              <code className="block bg-muted p-3 rounded text-sm font-mono text-foreground overflow-x-auto">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-muted p-3 rounded mb-3 overflow-x-auto">
              {children}
            </pre>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/90">
              {children}
            </em>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="min-w-full border border-border">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody>
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-border">
              {children}
            </tr>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-foreground/90">
              {children}
            </td>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold text-foreground">
              {children}
            </th>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}