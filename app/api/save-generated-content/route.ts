// app/api/your-endpoint/route.ts
import { saveGeneratedContent } from "@/utils/db/actions";

export async function POST(req: Request) {
  try {
    const { userId, content, prompt, contentType } = await req.json();

    if (!userId || !content || !prompt || !contentType) {
      return new Response(
        JSON.stringify({ error: "Invalid request payload" }),
        { status: 400 }
      );
    }

    const savedContent = await saveGeneratedContent(
      userId,
      content,
      prompt,
      contentType
    );
    return new Response(JSON.stringify(savedContent), { status: 200 });
  } catch (error) {
    console.error("Error saving generated content:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
