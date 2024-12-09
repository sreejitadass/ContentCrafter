// app/api/update-user-points/route.ts

import { updateUserPoints } from "@/utils/db/actions";

export async function POST(req: Request) {
  try {
    const { userId, points } = await req.json();

    // Validate the incoming data
    if (!userId || typeof userId !== "string" || typeof points !== "number") {
      return new Response(
        JSON.stringify({ error: "Invalid request payload" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Call the function to update user points
    const updatedUser = await updateUserPoints(userId, points);

    return new Response(JSON.stringify(updatedUser), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating user points:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
