import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string,
});

/**
 * Generate funny meme captions based on a template
 * @param templateName - The name of the meme template
 * @param boxCount - Number of text boxes in the template
 * @returns Array of generated captions
 */
export async function generateCaptions(templateName: string, boxCount: number): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a hilarious meme caption generator. Create ${boxCount} funny captions for a ${templateName} meme template. Be creative and humorous.`
        },
        {
          role: "user",
          content: `Generate ${boxCount} funny captions for the ${templateName} meme template. Return ONLY the captions as a numbered list.`
        }
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    // Extract captions from the response
    const content = response.choices[0]?.message?.content || "";
    const captions = content
      .split("\n")
      .filter(line => line.trim() !== "")
      .map(line => line.replace(/^\d+\.\s*/, "").trim())
      .slice(0, boxCount);

    // If we don't have enough captions, fill with placeholders
    while (captions.length < boxCount) {
      captions.push(`Caption ${captions.length + 1}`);
    }

    return captions;
  } catch (error) {
    console.error("Error generating captions:", error);
    // Return default captions on error
    return Array(boxCount).fill("").map((_, i) => `Caption ${i + 1}`);
  }
}

export default openai;