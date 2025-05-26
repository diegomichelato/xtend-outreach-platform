import OpenAI from "openai";

// Verify OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY environment variable is not set. AI features will not work.");
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * Generate an image based on a text prompt using DALL-E 3
 * @param prompt The text prompt to generate an image from
 * @returns URL of the generated image
 */
export async function generateImage(prompt: string): Promise<string> {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Create a YouTube thumbnail style image for a video titled: ${prompt}. Make it eye-catching, colorful, and professional looking. Include visual elements that represent the video content.`,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No image was generated");
    }
    
    return response.data[0].url || "";
  } catch (error: any) {
    console.error("Error generating image:", error);
    throw new Error(`Failed to generate image: ${error.message}`);
  }
}

/**
 * Generate a creative description for a video based on its title and other metadata
 * @param title Video title
 * @param videoFormat Format of the video (Long Form, Short Form, etc.)
 * @param platform Platform where the video will be published
 * @returns Generated description
 */
export async function generateVideoDescription(
  title: string,
  videoFormat: string,
  platform: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a creative content writer specializing in video descriptions. Write engaging, SEO-friendly descriptions that capture the essence of videos.",
        },
        {
          role: "user",
          content: `Create a compelling ${videoFormat} description for a ${platform} video titled: "${title}". Keep it under 150 words, engaging, and include relevant hashtags at the end.`,
        },
      ],
      max_tokens: 300,
    });

    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error("Error generating video description:", error);
    throw new Error(`Failed to generate description: ${error.message}`);
  }
}

/**
 * Generate a video thumbnail based on title and details
 * @param videoTitle The title of the video
 * @param videoDetails Additional details about the video content
 * @returns Object containing the URL of the generated thumbnail
 */
export async function generateVideoThumbnail(
  videoTitle: string,
  videoDetails?: string
): Promise<{ thumbnailUrl: string }> {
  const prompt = videoDetails 
    ? `${videoTitle} - ${videoDetails}`
    : videoTitle;
    
  try {
    const imageUrl = await generateImage(prompt);
    return { thumbnailUrl: imageUrl };
  } catch (error: any) {
    console.error("Error generating video thumbnail:", error);
    throw new Error(`Failed to generate thumbnail: ${error.message}`);
  }
}

export default {
  generateImage,
  generateVideoDescription,
  generateVideoThumbnail
};