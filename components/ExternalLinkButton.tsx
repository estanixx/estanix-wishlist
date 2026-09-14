import { ExternalLink } from 'lucide-react';

// components/ExternalLinkButton.tsx -- "Ir al sitio" link, styled as a
// button, used by OptionCard and SingleOptionLayout (spec.md §6.2/6.3).
// Always opens in a new tab (`target="_blank" rel="noopener noreferrer"`) --
// the same attributes the option's clickable image uses, so both paths to
// `option.link` behave identically.
export function ExternalLinkButton({ href, label = 'Ir al sitio', className = '' }: { href: string; label?: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-foreground transition duration-200 hover:border-border-hover hover:bg-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      {label}
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}
