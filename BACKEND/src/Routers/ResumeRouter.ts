// BACKEND/src/Routers/ResumeRouter.ts
import express from "express";
// Optional: If you have an auth middleware, import it here to protect this route
// import { requireAuth } from '../Middleware/RequireAuth';

const router = express.Router();

const buildResumePrompt = (
  classBlocks: string,
) => `Act as a professional resume writer.
I will provide skills and tasks learned, grouped by university course.
Transform these into strong, action-oriented resume bullet points, grouped by course.

${classBlocks}

Requirements:
1. Output each course as a labeled section header using only alphabetical and numeric characters and a colon (e.g., "SER-491:").
2. Under each course, list 2-4 bullet points using strong action verbs (e.g., Engineered, Orchestrated, Developed).
3. Consolidate related skills within the same course where appropriate.
4. Do not include any markdown formatting.
5. Return plain text only, with course headers followed by bullet points on new lines.
`;

const buildTalkingPointsPrompt = (
  classBlocks: string,
) => `Act as a technical interview coach.

I will provide skills and tasks learned, grouped by university course.
Transform them into interview-ready talking points that a student can say out loud.

${classBlocks}

Requirements:
1. Output each course as a labeled section header using only alphabetical and numeric characters and a colon (e.g., "SER-491:").
2. For each skill provided, generate EXACTLY ONE talking point.
3. Do NOT combine skills together.
4. Do NOT create multiple talking points for a single skill.
5. Each talking point must be on its own new line and begin with a dash (-).
6. Write each talking point in first-person language (e.g., "I built...", "I implemented...", "I worked with...").
7. Each talking point should:
   - Clearly explain what was done
   - Reference tools, technologies, or concepts when possible
   - Sound natural for an interview response
8. Keep each talking point concise (1-2 sentences max).
9. Do not include markdown formatting.
10. Return plain text only.

Strict Rule:
- If a course has N skills listed, you must return exactly N talking points for that course.
- Maintain a one-to-one mapping between input skills and output talking points.
`;

// Add your requireAuth middleware here if you want to restrict this to logged-in users
router.post("/generate", async (req, res) => {
  try {
    const { skillsByClass, mode } = req.body;

    if (!skillsByClass || Object.keys(skillsByClass).length === 0) {
      return res
        .status(400)
        .json({ error: "No skills provided for generation." });
    }

    // 1. Format the data into the text blocks the AI expects
    const classBlocks = Object.entries(skillsByClass)
      .map(
        ([courseCode, skills]) =>
          `Course: ${courseCode}\n${(skills as string[]).map((s: string) => `- ${s}`).join("\n")}`,
      )
      .join("\n\n");

    // 2. Select the correct prompt based on the user's mode toggle
    const prompt =
      mode === "skills"
        ? buildResumePrompt(classBlocks)
        : buildTalkingPointsPrompt(classBlocks);

    // 3. Retrieve environment variables (Ensure these are set in BACKEND/.env)
    // Note: It's best practice to rename VITE_AIAPIKEY to just AIAPIKEY in your backend .env
    const API_KEY = process.env.VITE_AIAPIKEY || process.env.VITE_AIAPIKEY;
    const OPENROUTER_URL = process.env.VITE_OPEN_ROUTER_URL;
    const MODEL_ID = process.env.VITE_MODEL_ID; // Fallback to a default if env is missing

    if (!API_KEY) {
      throw new Error("Missing AI API Key in backend environment.");
    }

    if (!OPENROUTER_URL) {
      throw new Error("Missing OpenRouter URL in backend environment.");
    }

    const payload = {
      model: MODEL_ID,
      messages: [{ role: "user", content: prompt }],
    };

    // 4. Make the secure server-to-server call to OpenRouter
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        // You can replace HTTP-Referer with your actual production URL later
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Student Resume Dashboard",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("OpenRouter Error Body:", errBody);
      throw new Error(`HTTP error ${response.status} from OpenRouter`);
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content || "";

    // 5. Send the generated text back to the React frontend
    res.status(200).json({ text });
  } catch (error: any) {
    console.error("Backend AI Generation Error:", error);
    res
      .status(500)
      .json({ error: "Failed to generate AI content. Please try again." });
  }
});

export default router;
