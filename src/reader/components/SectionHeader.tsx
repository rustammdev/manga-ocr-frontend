import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  actionText?: string;
  actionLink?: string;
  className?: string;
}

export default function SectionHeader({
  title,
  actionText,
  actionLink,
  className = "",
}: SectionHeaderProps) {
  const actionContent = actionText ? (
    <span className="flex items-center gap-0.5 text-sm font-medium text-primary">
      {actionText}
      <ChevronRight size={16} />
    </span>
  ) : null;

  return (
    <div
      className={`flex items-center justify-between px-4 mb-3 ${className}`}
    >
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {actionContent &&
        (actionLink ? (
          <Link to={actionLink}>{actionContent}</Link>
        ) : (
          actionContent
        ))}
    </div>
  );
}
