"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, GitPullRequest, ExternalLink } from "lucide-react";

interface PrCardProps {
  id: string;
  title: string;
  url: string;
  diff: string;
  onSelect: (id: string, diff: string) => void;
  isSelected: boolean;
  isGenerating: boolean;
  hasCachedNotes?: boolean;
}

export function PrCard({
  id,
  title,
  url,
  diff,
  onSelect,
  isSelected,
  isGenerating,
  hasCachedNotes = false,
}: PrCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSelect = () => {
    if (!isGenerating) {
      onSelect(id, diff);
    }
  };

  const truncatedDiff = diff.slice(0, 300) + (diff.length > 300 ? "..." : "");
  
  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden transition-all group",
        "hover:border-primary/50 hover:bg-accent/20 hover:shadow-sm cursor-pointer active:scale-[0.99]",
        isSelected
          ? "border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/30"
          : "border-border"
      )}
      onClick={handleSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleSelect();
        }
      }}
      aria-pressed={isSelected}
      aria-disabled={isGenerating}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <GitPullRequest
              className={cn(
                "h-5 w-5",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span className="font-medium text-sm">PR #{id}</span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
            title="Open PR on GitHub"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">{title}</h3>

        <div className="flex items-center justify-between">
          <button
            className={cn(
              "text-sm px-3 py-1 rounded-md transition-colors relative",
              isSelected
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground",
              isGenerating && "opacity-50 cursor-not-allowed"
            )}
            onClick={(e) => {
              e.stopPropagation(); // Prevent the card's onClick from firing too
              handleSelect();
            }}
            disabled={isGenerating}
          >
            {isSelected ? "Selected" : "Generate Notes"}
            {!isSelected && hasCachedNotes && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-400 rounded-full" title="Cached notes available"></span>
            )}
          </button>

          <button
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
            onClick={(e) => {
              e.stopPropagation(); // Prevent the card's onClick from firing
              setIsExpanded(!isExpanded);
            }}
            aria-label={isExpanded ? "Hide diff" : "Show diff"}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-180"
              )}
            />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div 
          className="bg-background/50 border-t border-border p-4"
          onClick={(e) => e.stopPropagation()} // Prevent card selection when clicking on the diff
        >
          <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[400px] overflow-y-auto">
            {truncatedDiff}
          </pre>
          {diff.length > 300 && (
            <div className="mt-2 text-right">
              <span className="text-xs text-muted-foreground">
                Showing first 300 characters of diff
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
