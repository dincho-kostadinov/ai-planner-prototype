import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const endpoint =
  "https://ai-planner-prototype-resource.services.ai.azure.com/api/projects/ai-planner-prototype";
const credential = new DefaultAzureCredential();
const AGENT_ID = "asst_ggHx8lDHUhj9PTSO4ZGP6UMt";

/* -------------------- Utility: Extract JSON safely -------------------- */
function extractJsonFromText(text) {
  try {
    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Direct parse attempt
    try {
      return JSON.parse(cleanedText);
    } catch {
      // If it's embedded, try regex
      const matches = cleanedText.match(/\{[\s\S]*\}/);
      if (matches) {
        return JSON.parse(matches[0]);
      }
    }

    return { rawText: cleanedText };
  } catch (err) {
    console.error("❌ extractJsonFromText error:", err.message);
    return { rawText: text };
  }
}

/* -------------------- Generic Agent Runner -------------------- */
async function runAgentWithPayload(payload) {
  const project = new AIProjectClient(endpoint, credential);
  const agent = await project.agents.getAgent(AGENT_ID);
  const thread = await project.agents.threads.create();

  // Send message to agent
  await project.agents.messages.create(
    thread.id,
    "user",
    JSON.stringify(payload)
  );

  // Create and poll the run until completion
  let run = await project.agents.runs.create(thread.id, agent.id);
  while (run.status === "queued" || run.status === "in_progress") {
    await new Promise((r) => setTimeout(r, 1000));
    run = await project.agents.runs.get(thread.id, run.id);
  }

  // Fetch all messages
  const messages = await project.agents.messages.list(thread.id, {
    order: "asc",
  });

  // ✅ capture only the *last assistant message*
  let responseText = "";
  for await (const m of messages) {
    if (m.role === "assistant") {
      const content = m.content.find(
        (c) => c.type === "text" && "text" in c
      );
      if (content) {
        responseText = content.text.value;
      }
    }
  }

  const parsed = extractJsonFromText(responseText);

  // ✅ Fix: If it's a stringified JSON, parse again
  if (typeof parsed === "string") {
    try {
      return JSON.parse(parsed);
    } catch {
      return { rawText: parsed };
    }
  }

  return parsed;
}

/* -------------------- /api/run-agent → Plan -------------------- */
app.post("/api/run-agent", async (req, res) => {
  try {
    const payload = {
      mode: "plan",
      data: req.body.prompt, // persons + tours
    };
    const result = await runAgentWithPayload(payload);
    res.json(result); // ✅ Return clean JSON only
  } catch (err) {
    console.error("❌ /api/run-agent error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- /api/update-agent → Validate -------------------- */
app.post("/api/update-agent", async (req, res) => {
  try {
    const payload = {
      mode: "validate",
      data: req.body,
    };
    const result = await runAgentWithPayload(payload);
    res.json(result); // ✅ Return clean JSON only
  } catch (err) {
    console.error("❌ /api/update-agent error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- /api/finalize-agent → Finalize -------------------- */
app.post("/api/finalize-agent", async (req, res) => {
  try {
    const payload = {
      mode: "finalize",
      data: req.body,
    };
    const result = await runAgentWithPayload(payload);
    res.json(result); // ✅ Return clean JSON only
  } catch (err) {
    console.error("❌ /api/finalize-agent error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- Start Server -------------------- */
app.listen(5000, () =>
  console.log("✅ Server running on port 5000")
);
