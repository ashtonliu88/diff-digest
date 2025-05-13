"use client";

import { useState, useEffect, useRef } from "react";

// Cache interface for storing generated notes
interface NotesCache {
  [prId: string]: {
    developerNotes: string;
    marketingNotes: string;
    timestamp: number;
  };
}

interface UseNotesGeneratorOptions {
  abortOnUnmount?: boolean;
  cacheDuration?: number; // Cache duration in milliseconds, default 1 hour
}

interface UseNotesGeneratorResult {
  selectedPrId: string | null;
  developerNotes: string;
  marketingNotes: string;
  isGenerating: boolean;
  isComplete: boolean;
  error: string | null;
  generate: (prId: string, diff: string) => void;
  regenerate: () => void;
  cancelGeneration: () => void;
  hasCachedNotes: boolean;
}

// Initialize the cache from localStorage or create a new one
const getInitialCache = (): NotesCache => {
  if (typeof window === "undefined") return {};
  
  try {
    const cachedData = localStorage.getItem("diff-digest-notes-cache");
    return cachedData ? JSON.parse(cachedData) : {};
  } catch (e) {
    console.error("Error reading cache from localStorage:", e);
    return {};
  }
};

export function useNotesGenerator({
  abortOnUnmount = true,
  cacheDuration = 60 * 60 * 1000, // 1 hour by default
}: UseNotesGeneratorOptions = {}): UseNotesGeneratorResult {
  const [selectedPrId, setSelectedPrId] = useState<string | null>(null);
  const [developerNotes, setDeveloperNotes] = useState<string>("");
  const [marketingNotes, setMarketingNotes] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCachedNotes, setHasCachedNotes] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<NotesCache>(getInitialCache());
  const currentDiffRef = useRef<string>("");

  // Save cache to localStorage whenever it changes
  const updateCache = (cache: NotesCache) => {
    cacheRef.current = cache;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("diff-digest-notes-cache", JSON.stringify(cache));
      } catch (e) {
        console.error("Error saving cache to localStorage:", e);
      }
    }
  };

  // Clean up any ongoing fetch when unmounting
  useEffect(() => {
    return () => {
      if (abortOnUnmount && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [abortOnUnmount]);

  // Check if the selected PR notes are in the cache and still valid
  const checkCache = (prId: string): boolean => {
    const cachedData = cacheRef.current[prId];
    if (!cachedData) return false;

    const isExpired = Date.now() - cachedData.timestamp > cacheDuration;
    return !isExpired;
  };

  // Function to get notes from cache
  const getFromCache = (prId: string) => {
    const cachedData = cacheRef.current[prId];
    if (cachedData) {
      setDeveloperNotes(cachedData.developerNotes);
      setMarketingNotes(cachedData.marketingNotes);
      setIsComplete(true);
      return true;
    }
    return false;
  };

  // Main function to generate notes
  const generate = async (prId: string, diff: string, forceRegenerate = false) => {
    setSelectedPrId(prId);
    currentDiffRef.current = diff;
    
    // Check cache first if not forcing regeneration
    if (!forceRegenerate && checkCache(prId)) {
      setHasCachedNotes(true);
      getFromCache(prId);
      return;
    }

    // Reset state for fresh generation
    setHasCachedNotes(false);
    setDeveloperNotes("");
    setMarketingNotes("");
    setIsGenerating(true);
    setIsComplete(false);
    setError(null);

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create a new AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const response = await fetch("/api/generate-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prId, diff }),
        signal,
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          e
        ) {
          // If parsing fails, use the default error message
        }
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error("Response body is empty");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let developerBuffer = "";
      let marketingBuffer = "";
      let mode: "developer" | "marketing" = "developer";

      // Read streaming response
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Check for the special delimiter that indicates switching modes
        if (chunk.includes("===MARKETING_NOTES===")) {
          mode = "marketing";
          const [devPart, marketingPart] = chunk.split("===MARKETING_NOTES===");
          developerBuffer += devPart;
          marketingBuffer += marketingPart;
        } else if (mode === "developer") {
          developerBuffer += chunk;
        } else {
          marketingBuffer += chunk;
        }

        setDeveloperNotes(developerBuffer);
        setMarketingNotes(marketingBuffer);
      }

      // Save to cache
      const newCache = { ...cacheRef.current };
      newCache[prId] = {
        developerNotes: developerBuffer,
        marketingNotes: marketingBuffer,
        timestamp: Date.now(),
      };
      updateCache(newCache);

      setIsComplete(true);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        console.log("Request was aborted");
      } else {
        setError((err as Error).message || "An error occurred while generating notes");
        console.error("Error generating notes:", err);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Function to regenerate notes for the currently selected PR
  const regenerate = () => {
    if (selectedPrId && currentDiffRef.current) {
      generate(selectedPrId, currentDiffRef.current, true);
    }
  };

  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  };

  return {
    selectedPrId,
    developerNotes,
    marketingNotes,
    isGenerating,
    isComplete,
    error,
    generate,
    regenerate,
    cancelGeneration,
    hasCachedNotes,
  };
}
