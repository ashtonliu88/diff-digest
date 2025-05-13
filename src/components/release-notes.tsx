"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyIcon, CheckIcon, CodeIcon, MessageCircleIcon, RefreshCw } from "lucide-react";
import { useState } from "react";

interface ReleaseNotesProps {
  prId: string | null;
  developerNotes: string;
  marketingNotes: string;
  isGenerating: boolean;
  isComplete: boolean;
  error: string | null;
  onRegenerate?: () => void;
  hasCachedNotes?: boolean;
}

export function ReleaseNotes({
  prId,
  developerNotes,
  marketingNotes,
  isGenerating,
  isComplete,
  error,
  onRegenerate,
  hasCachedNotes = false,
}: ReleaseNotesProps) {
  const [activeTab, setActiveTab] = useState<string>("developer");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  
  const developerNotesRef = useRef<HTMLDivElement>(null);
  const marketingNotesRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to the bottom as new content streams in
  useEffect(() => {
    const activeRef = activeTab === "developer" ? developerNotesRef : marketingNotesRef;
    if (activeRef.current && isGenerating) {
      activeRef.current.scrollTop = activeRef.current.scrollHeight;
    }
  }, [developerNotes, marketingNotes, activeTab, isGenerating]);

  const handleCopy = () => {
    const textToCopy = activeTab === "developer" ? developerNotes : marketingNotes;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };

  const handleRegenerate = () => {
    if (onRegenerate && !isGenerating) {
      onRegenerate();
    }
  };

  if (!prId && !isGenerating && !isComplete) {
    return (
      <div className="border rounded-lg p-6 h-[500px] flex items-center justify-center text-center">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-medium mb-2">No PR Selected</h3>
          <p className="text-muted-foreground">
            Select a PR from the list on the left to generate release notes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          {isGenerating && (
            <span className="inline-block h-3 w-3 rounded-full bg-primary animate-pulse mr-1" />
          )}
          {isGenerating ? "Generating Notes..." : "Release Notes"}
          {prId && !isGenerating && ` for PR #${prId}`}
          {hasCachedNotes && !isGenerating && (
            <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Cached</span>
          )}
        </h3>
        
        <div className="flex items-center gap-1">
          {onRegenerate && prId && isComplete && !isGenerating && (
            <button
              onClick={handleRegenerate}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              title="Regenerate notes"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={handleCopy}
            disabled={!developerNotes && !marketingNotes || isGenerating}
            className={cn(
              "p-1.5 rounded-md text-muted-foreground transition-colors",
              (developerNotes || marketingNotes) && !isGenerating 
                ? "hover:text-foreground hover:bg-secondary/50" 
                : "opacity-50 cursor-not-allowed"
            )}
            title="Copy to clipboard"
          >
            {isCopied ? (
              <CheckIcon className="h-4 w-4 text-green-500" />
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-6 text-center">
          <div className="text-destructive mb-2">Error generating notes</div>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      ) : (
        <Tabs 
          defaultValue="developer" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="px-4 bg-muted/30">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger 
                value="developer" 
                className="flex items-center gap-1.5"
                data-state={activeTab === "developer" ? "active" : "inactive"}
              >
                <CodeIcon className="h-4 w-4" />
                <span>Developer Notes</span>
              </TabsTrigger>
              <TabsTrigger 
                value="marketing" 
                className="flex items-center gap-1.5"
                data-state={activeTab === "marketing" ? "active" : "inactive"}
              >
                <MessageCircleIcon className="h-4 w-4" />
                <span>Marketing Notes</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent 
            value="developer" 
            className="mt-0 p-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            <div 
              ref={developerNotesRef}
              className="p-4 h-[400px] overflow-y-auto whitespace-pre-wrap font-mono text-sm"
            >
              {developerNotes ? (
                <div className="animate-fade-in">
                  <h4 className="font-semibold mb-2 text-primary">DEVELOPER NOTES</h4>
                  {developerNotes.replace(/DEVELOPER NOTES:?/i, "").trim()}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">
                  {isGenerating ? "Generating developer notes..." : "No developer notes generated yet."}
                </p>
              )}
              {isGenerating && <span className="inline-block animate-pulse">▌</span>}
            </div>
          </TabsContent>

          <TabsContent 
            value="marketing" 
            className="mt-0 p-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            <div 
              ref={marketingNotesRef}
              className="p-4 h-[400px] overflow-y-auto whitespace-pre-wrap"
            >
              {marketingNotes ? (
                <div className="animate-fade-in">
                  <h4 className="font-semibold mb-2 text-primary">MARKETING NOTES</h4>
                  {marketingNotes.replace(/MARKETING NOTES:?/i, "").trim()}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">
                  {isGenerating ? "Generating marketing notes..." : "No marketing notes generated yet."}
                </p>
              )}
              {isGenerating && <span className="inline-block animate-pulse">▌</span>}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
