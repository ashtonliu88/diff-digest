import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Set maximum duration to 60 seconds

export async function POST(request: NextRequest) {
  // Create a TransformStream to stream the response
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Process the request in the background and send the response as a stream
  const processRequest = async () => {
    try {
      const { prId, diff } = await request.json();

      if (!prId || !diff) {
        const errorMessage = JSON.stringify({
          error: "Missing required fields: prId and diff",
        });
        await writer.write(new TextEncoder().encode(errorMessage));
        await writer.close();
        return;
      }

      // System prompt that defines the assistant's role
      const systemPrompt = `You are an expert at generating release notes from Git diffs. Respond with two sections: DEVELOPER NOTES and MARKETING NOTES.`;

      // Developer-focused prompt
      const developerPrompt = `DEVELOPER NOTES:
[Your technical notes here - strictly technical content ONLY]

Guidelines for DEVELOPER NOTES:
- These should be technical, concise explanations focusing on WHAT changed and WHY
- Include specific file names, methods, libraries, and technical details
- Make sure to avoid hallucinations or statements not supported by the diff
- Target audience: Other developers
- Be factual and accurate based ONLY on the diff content
- Keep each note brief (1-3 sentences)
- Avoid phrases like "This PR," "This commit," etc.
- Do not introduce features/changes that aren't clearly in the diff
- Focus on the most significant changes if the diff is large
- Do not include any marketing or user-centric content here`;

      // Marketing-focused prompt
      const marketingPrompt = `MARKETING NOTES:
[Your user-centric notes here - strictly user-focused content ONLY]

Guidelines for MARKETING NOTES:
- These should be user-centric explanations focusing on BENEFITS and VALUE to end-users
- Use simpler language and avoid technical jargon
- Focus on what users will experience or gain from this change
- Be factual and accurate based ONLY on the diff content
- Keep each note brief (1-3 sentences)
- Avoid phrases like "This PR," "This commit," etc.
- Do not introduce features/changes that aren't clearly in the diff
- Focus on the most significant changes if the diff is large`;

      // Main user prompt with the diff
      const userPrompt = `
Generate two separate types of release notes for PR #${prId} based on the following Git diff.

${developerPrompt}

${marketingPrompt}

Git Diff to analyze:
\`\`\`
${diff}
\`\`\`
`;

      // First generate the developer notes
      const developerCompletion = await openAI_generateNotes(
        systemPrompt,
        userPrompt + "\nFocus on creating ONLY the DEVELOPER NOTES section at this time.", 
        true
      );

      // Stream developer notes to the client
      for await (const chunk of developerCompletion) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          await writer.write(new TextEncoder().encode(content));
        }
      }

      // Add a separator to clearly distinguish between developer and marketing notes
      await writer.write(new TextEncoder().encode("\n\n===MARKETING_NOTES===\n\n"));

      // Then generate the marketing notes
      const marketingCompletion = await openAI_generateNotes(
        systemPrompt,
        userPrompt + "\nFocus on creating ONLY the MARKETING NOTES section at this time.",
        false
      );

      // Stream marketing notes to the client
      for await (const chunk of marketingCompletion) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          await writer.write(new TextEncoder().encode(content));
        }
      }

      // Close the writer when done
      await writer.close();
    } catch (error) {
      console.error("Error generating notes:", error);
      try {
        const errorMessage = JSON.stringify({
          error: error instanceof Error ? error.message : "An unknown error occurred",
        });
        await writer.write(new TextEncoder().encode(errorMessage));
      } catch (e) {
        // Ignore errors during error handling
      } finally {
        await writer.close();
      }
    }
  };

  // Helper function to create OpenAI streaming completion
  async function openAI_generateNotes(systemPrompt: string, userPrompt: string, isDeveloperNotes: boolean) {
    return await openai.chat.completions.create({
      model: "gpt-4.1-mini", // You can change this to a different model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      stream: true,
      temperature: isDeveloperNotes ? 0.3 : 0.7, // Lower temp for developer notes (more precise)
      max_tokens: 750, // Split the tokens between both notes
    });
  }

  // Start processing in the background
  processRequest();

  // Return the readable stream immediately
  return new NextResponse(stream.readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
