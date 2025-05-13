"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "./theme-provider";
import { Github } from "lucide-react";

export function Header() {
  const { theme } = useTheme();
  
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src={theme === "dark" ? "/logo-white.svg" : "/logo-black.svg"} 
              alt="Diff Digest" 
              width={28} 
              height={28} 
            />
            <span className="font-semibold text-lg">Diff Digest</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href="https://github.com/openai/openai-node" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
