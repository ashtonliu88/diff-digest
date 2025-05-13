"use client";

import { useState } from "react";
import { GitFork, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RepositorySelectorProps {
  defaultOwner?: string;
  defaultRepo?: string;
  onSelect: (owner: string, repo: string) => void;
  disabled?: boolean;
}

export function RepositorySelector({
  defaultOwner = "openai",
  defaultRepo = "openai-node",
  onSelect,
  disabled = false,
}: RepositorySelectorProps) {
  const [owner, setOwner] = useState(defaultOwner);
  const [repo, setRepo] = useState(defaultRepo);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (owner.trim() && repo.trim()) {
      onSelect(owner.trim(), repo.trim());
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm",
          "hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <GitFork className="h-4 w-4" />
        <span className="max-w-32 truncate">
          {owner}/{repo}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 rounded-md border border-border bg-background p-4 shadow-md z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Repository</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground rounded-full p-1"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label
                htmlFor="owner"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                Owner
              </label>
              <input
                id="owner"
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="e.g. openai"
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm 
                  focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label
                htmlFor="repo"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                Repository
              </label>
              <input
                id="repo"
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="e.g. openai-node"
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm 
                  focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground 
                  hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              >
                Apply
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
