import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export function SectionHeader({
  title,
  to,
  linkLabel = "View all",
}: {
  title: string;
  to?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h2>
      {to && (
        <Link
          to={to}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {linkLabel} <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}
