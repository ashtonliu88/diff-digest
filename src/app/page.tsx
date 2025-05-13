"use client"; // Mark as a Client Component

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { RepositorySelector } from "@/components/repository-selector";
import { PrCard } from "@/components/pr-card";
import { ReleaseNotes } from "@/components/release-notes";
import { useNotesGenerator } from "@/hooks/use-notes-generator";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { LoaderCircle } from "lucide-react";

// Define the expected structure of a diff object
interface DiffItem {
  id: string;
  description: string;
  diff: string;
  url: string; // Added URL field
}

// Define the expected structure of the API response
interface ApiResponse {
  diffs: DiffItem[];
  nextPage: number | null;
  currentPage: number;
  perPage: number;
}

export default function Home() {
  // Repository state
  const [owner, setOwner] = usePersistentState<string>("repo-owner", "openai");
  const [repo, setRepo] = usePersistentState<string>("repo-name", "openai-node");
  
  // Diff state
  const [diffs, setDiffs] = useState<DiffItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState<boolean>(false);

  // Notes generator state
  const {
    selectedPrId,
    developerNotes,
    marketingNotes,
    isGenerating,
    isComplete,
    error: generationError,
    generate,
    regenerate,
    hasCachedNotes,
  } = useNotesGenerator({
    cacheDuration: 30 * 60 * 1000, // 30 minutes cache duration
  });

  // Fetch diffs on mount
  useEffect(() => {
    handleFetchClick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDiffs = async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/sample-diffs?owner=${owner}&repo=${repo}&page=${page}&per_page=10`
      );
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorData.details || errorMsg;
        } catch {
          // Ignore if response body is not JSON
          console.warn("Failed to parse error response as JSON");
        }
        throw new Error(errorMsg);
      }
      const data: ApiResponse = await response.json();

      setDiffs((prevDiffs) =>
        page === 1 ? data.diffs : [...prevDiffs, ...data.diffs]
      );
      setCurrentPage(data.currentPage);
      setNextPage(data.nextPage);
      if (!initialFetchDone) setInitialFetchDone(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchClick = () => {
    setDiffs([]); // Clear existing diffs when fetching the first page again
    fetchDiffs(1);
  };

  const handleLoadMoreClick = () => {
    if (nextPage) {
      fetchDiffs(nextPage);
    }
  };

  const handleRepositoryChange = (newOwner: string, newRepo: string) => {
    setOwner(newOwner);
    setRepo(newRepo);
    // Fetch new repository data
    setDiffs([]);
    setCurrentPage(1);
    setNextPage(null);
    fetchDiffs(1);
  };

  const handleGenerateNotes = (prId: string, diff: string) => {
    generate(prId, diff);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Diff Digest ✍️</h1>
          <RepositorySelector
            defaultOwner={owner}
            defaultRepo={repo}
            onSelect={handleRepositoryChange}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left side - PR list */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-lg">Merged Pull Requests</h2>
              <button
                onClick={handleFetchClick}
                disabled={isLoading}
                className="text-xs px-2.5 py-1.5 rounded-md bg-primary/90 text-primary-foreground hover:bg-primary transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-1">
                    <LoaderCircle className="h-3 w-3 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  "Refresh"
                )}
              </button>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            {!initialFetchDone && !isLoading && !error && (
              <div className="text-center p-6 text-muted-foreground">
                Loading pull requests...
              </div>
            )}

            {initialFetchDone && diffs.length === 0 && !isLoading && !error && (
              <div className="text-center p-6 text-muted-foreground">
                No merged pull requests found for {owner}/{repo}.
              </div>
            )}

            <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
              {diffs.map((item) => (
                <PrCard
                  key={item.id}
                  id={item.id}
                  title={item.description}
                  url={item.url}
                  diff={item.diff}
                  onSelect={handleGenerateNotes}
                  isSelected={selectedPrId === item.id}
                  isGenerating={isGenerating}
                  hasCachedNotes={selectedPrId === item.id ? hasCachedNotes : false}
                />
              ))}
            </div>

            {nextPage && !isLoading && (
              <div className="pt-2">
                <button
                  onClick={handleLoadMoreClick}
                  className="w-full py-2 text-sm border border-border rounded-md hover:bg-secondary/50 transition-colors"
                >
                  Load More (Page {nextPage})
                </button>
              </div>
            )}
          </div>

          {/* Right side - Release notes */}
          <div className="lg:col-span-2">
            <ReleaseNotes
              prId={selectedPrId}
              developerNotes={developerNotes}
              marketingNotes={marketingNotes}
              isGenerating={isGenerating}
              isComplete={isComplete}
              error={generationError}
              onRegenerate={regenerate}
              hasCachedNotes={hasCachedNotes}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
