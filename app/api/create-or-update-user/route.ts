import type { NextApiRequest, NextApiResponse } from "next";
import { createOrUpdateUser } from "@/utils/db/actions";

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { userId, email, name } = req.body;

    if (!userId || !email || !name) {
      return res.status(400).json({ error: "Invalid request payload" });
    }

    try {
      const user = await createOrUpdateUser(userId, email, name);
      res.status(200).json(user);
    } catch (error) {
      console.error("Error creating or updating user:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: "Method not allowed" });
  }
}
