import "server-only";
import { COMMAND_TOOLS, runCommandTool, type CommandActionLog } from "@/lib/anthropic/command-tools";

export const ASK_USER_TOOL = {
  name: "ask_user",
  description:
    "Ask the rep ONE follow-up question to fill in missing context. Always exactly one question per call. Provide 3-5 multiple-choice options informed by real CRM data (existing contacts at the company, common topics, common next steps). The last option should usually be 'Other'. Set allow_custom=true unless options are exhaustive.",
  input_schema: {
    type: "object" as const,
    properties: {
      question: {
        type: "string",
        description:
          "Single question, conversational second-person. Reference what you already know (e.g., 'Who at Razorpay did you speak with?').",
      },
      options: {
        type: "array",
        items: { type: "string" },
        description:
          "3-5 short MCQ options. Pull from REAL data when possible (contact names, deal names). Each option should be selectable as-is.",
      },
      allow_custom: {
        type: "boolean",
        description: "If true, the rep can type a free-form answer instead of picking an option.",
      },
    },
    required: ["question", "options"],
  },
};

export const COMMIT_TOOL = {
  name: "commit",
  description:
    "Submit the capture once you've used the entity tools (find_or_create_*, log_activity, create_task) to record everything. Call this exactly once at the end.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string",
        description: "1-2 sentence summary of what was captured. Second person, mention names.",
      },
    },
    required: ["summary"],
  },
};

// Re-export entity tool runners so the route handler can call them.
export { COMMAND_TOOLS, runCommandTool };
export type { CommandActionLog };

export const CAPTURE_TOOLS = [...COMMAND_TOOLS.filter((t) => t.name !== "answer"), ASK_USER_TOOL, COMMIT_TOOL];
