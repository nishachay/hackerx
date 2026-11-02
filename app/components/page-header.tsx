import type { ReactNode } from "react";

type Props = {
  title: string;
  lede?: string;
  eyebrow?: string;
  meta?: ReactNode;
};

export function PageHeader({ title, lede, eyebrow, meta }: Props) {
  return (
    <header className="page-head">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      {lede ? <p className="page-lede">{lede}</p> : null}
      {meta ? <div className="page-meta">{meta}</div> : null}
    </header>
  );
}
