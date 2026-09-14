import type { ReactNode } from 'react';

interface WorkspaceHeaderProps {
  children: ReactNode;
  empty?: boolean;
  className?: string;
}

export function WorkspaceHeader({
  children,
  empty = false,
  className,
}: WorkspaceHeaderProps) {
  const classes = [
    'soft-workspace-topbar',
    empty ? 'is-empty' : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <header className={classes}>
      {children}
    </header>
  );
}

interface WorkspaceIntroProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function WorkspaceIntro({
  eyebrow,
  title,
  description,
}: WorkspaceIntroProps) {
  return (
    <section className="soft-workspace-intro">
      <div>
        <p className="soft-workspace-eyebrow">
          {eyebrow}
        </p>

        <h1>{title}</h1>
      </div>

      <p className="soft-workspace-description">
        {description}
      </p>
    </section>
  );
}
