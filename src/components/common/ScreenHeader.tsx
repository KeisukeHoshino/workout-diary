import type { ReactNode } from 'react';

interface ScreenHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function ScreenHeader({ title, description, actions }: ScreenHeaderProps) {
  return (
    <header className="screen-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </header>
  );
}
