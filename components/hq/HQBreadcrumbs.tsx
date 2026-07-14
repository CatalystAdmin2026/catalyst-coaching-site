import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

export default function HQBreadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 mb-8">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <span className="text-gray-700 text-[10px]">/</span>
            )}
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="text-[10px] text-gray-500 uppercase tracking-[0.25em] font-medium hover:text-gray-300 transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={`text-[10px] uppercase tracking-[0.25em] font-medium ${
                  isLast ? "text-white/60" : "text-gray-500"
                }`}
              >
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
