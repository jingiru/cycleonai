import type { ReactNode } from "react";

type SectionProps = {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
};

type StatusCardProps = {
  label: string;
  value: string | number;
  status: string;
  detail: string;
};

type DataTableProps<T> = {
  columns: { key: keyof T | string; label: string; render?: (row: T) => ReactNode }[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
};

export function Section({ id, eyebrow, title, description, children }: SectionProps) {
  return (
    <section className="section" id={id}>
      <div className="sectionHeader">
        <p className="eyebrow">{eyebrow}</p>
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function StatusCard({ label, value, status, detail }: StatusCardProps) {
  return (
    <article className="statusCard">
      <div className="statusTop">
        <span>{label}</span>
        <em>{status}</em>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
      <div className="progressTrack" aria-hidden="true">
        <span />
      </div>
    </article>
  );
}

export function DataTable<T extends Record<string, unknown>>({ columns, rows, getRowKey }: DataTableProps<T>) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={getRowKey(row, index)}>
              {columns.map((column) => (
                <td key={String(column.key)}>
                  {column.render ? column.render(row) : String(row[column.key as keyof T] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
