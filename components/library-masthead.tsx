import type { ReactNode } from "react";

type LibraryMastheadProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function LibraryMasthead({ title, description, action }: LibraryMastheadProps) {
  return <header className="library-heading">
      <h1>{title}</h1>
      <p>{description}</p>
      {action}
    </header>;
}
