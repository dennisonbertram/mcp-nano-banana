#!/usr/bin/env bun

/**
 * MCP Nano Banana Server
 *
 * A Model Context Protocol (MCP) server for generating images using
 * Google's Gemini Nano Banana (gemini-2.5-flash-image) model.
 *
 * @author Dennison Bertram
 * @license MIT
 * @version 1.0.0
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import { readFileSync, existsSync } from "fs";
import { dirname, resolve, join } from "path";

// Load .env file from the script's directory
const scriptDir = import.meta.dir;
const envPath = join(scriptDir, ".env");

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    }
  });
}

// API Key for Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY) {
  console.error("Error: GEMINI_API_KEY environment variable is not set");
  console.error("Please set it in .env file or as an environment variable");
  process.exit(1);
}

// Initialize Gemini client
const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Job tracking for async image generation
interface ImageJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  prompt: string;
  result?: string; // base64 image data
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

const jobs = new Map<string, ImageJob>();

// Available models
const AVAILABLE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-image-preview",
  "gemini-3-pro-image-preview",
  "gemini-2.0-flash-exp-image-generation"
] as const;

// Zod schemas for tool inputs
const GenerateImageSchema = z.object({
  prompt: z.string().describe("Text prompt describing the image to generate"),
  aspectRatio: z
    .enum(["1:1", "3:4", "4:3", "9:16", "16:9"])
    .default("1:1")
    .describe("Aspect ratio for the generated image"),
  model: z
    .enum(AVAILABLE_MODELS)
    .default("gemini-3-pro-image-preview")
    .describe("Model to use for image generation"),
});

const CheckJobStatusSchema = z.object({
  jobId: z.string().describe("The job ID returned from generate_image"),
});

const SaveImageSchema = z.object({
  jobId: z.string().describe("The job ID of the completed image generation"),
  filePath: z
    .string()
    .describe("Absolute path where the image should be saved (must end in .png)"),
});

// Generate a simple unique ID
function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Async image generation function
async function generateImage(prompt: string, aspectRatio: string, model: string = "gemini-3-pro-image-preview"): Promise<string> {
  const jobId = generateJobId();

  // Create job
  jobs.set(jobId, {
    id: jobId,
    status: "pending",
    prompt,
    createdAt: new Date(),
  });

  // Start async generation (don't await - return job ID immediately)
  (async () => {
    try {
      jobs.get(jobId)!.status = "processing";

      const response = await genAI.models.generateContent({
        model: model,
        contents: [prompt],
        config: {
          responseModalities: ["image"],
          aspectRatio: aspectRatio,
        },
      });

      // Extract image from response
      const imagePart = response.candidates?.[0]?.content?.parts?.find(
        (part: any) => part.inlineData
      );

      if (imagePart?.inlineData?.data) {
        const job = jobs.get(jobId)!;
        job.status = "completed";
        job.result = imagePart.inlineData.data;
        job.completedAt = new Date();
      } else {
        throw new Error("No image data in response");
      }
    } catch (error) {
      const job = jobs.get(jobId)!;
      job.status = "failed";
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
    }
  })();

  return jobId;
}

// Save image to file system
async function saveImageToFile(jobId: string, filePath: string): Promise<void> {
  const job = jobs.get(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  if (job.status !== "completed") {
    throw new Error(`Job ${jobId} is not completed (status: ${job.status})`);
  }

  if (!job.result) {
    throw new Error(`Job ${jobId} has no result data`);
  }

  // Ensure file path is absolute and ends in .png
  const absolutePath = resolve(filePath);
  if (!absolutePath.endsWith(".png")) {
    throw new Error("File path must end in .png");
  }

  // Create directory if it doesn't exist
  await mkdir(dirname(absolutePath), { recursive: true });

  // Convert base64 to buffer and write
  const buffer = Buffer.from(job.result, "base64");
  await writeFile(absolutePath, buffer);
}

// Create MCP server
const server = new Server(
  {
    name: "mcp-nano-banana",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_image",
        description:
          "Create an AI-generated image from a text description. Returns a job ID immediately - use check_job_status to see when it's ready, then save_image to download it.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "Describe what you want to see in the image (e.g., 'a sunset over mountains' or 'a robot playing piano')",
            },
            aspectRatio: {
              type: "string",
              enum: ["1:1", "3:4", "4:3", "9:16", "16:9"],
              default: "1:1",
              description: "Image shape: 1:1 (square), 3:4 (portrait), 4:3 (landscape), 9:16 (phone vertical), 16:9 (widescreen)",
            },
            model: {
              type: "string",
              enum: ["gemini-3-pro-image-preview", "gemini-2.5-flash-image", "gemini-2.5-flash-image-preview", "gemini-2.0-flash-exp-image-generation"],
              default: "gemini-3-pro-image-preview",
              description: "Which AI model to use: gemini-3-pro-image-preview (best quality, slower), gemini-2.5-flash-image (faster, good quality)",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "check_job_status",
        description:
          "Check if an image is done generating. Shows whether it's still processing, completed and ready to save, or failed.",
        inputSchema: {
          type: "object",
          properties: {
            jobId: {
              type: "string",
              description: "The job ID you received from generate_image",
            },
          },
          required: ["jobId"],
        },
      },
      {
        name: "save_image",
        description:
          "Download a completed image to your computer as a PNG file. Only works after the image has finished generating (check with check_job_status first).",
        inputSchema: {
          type: "object",
          properties: {
            jobId: {
              type: "string",
              description: "The job ID from your completed image generation",
            },
            filePath: {
              type: "string",
              description:
                "Where to save the image on your computer (full path including filename, must end with .png) - e.g., '/Users/yourname/Pictures/my-image.png'",
            },
          },
          required: ["jobId", "filePath"],
        },
      },
      {
        name: "list_jobs",
        description:
          "See all your image generation requests and whether they're still processing, completed, or failed. Useful to track multiple images at once.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "generate_image": {
        const { prompt, aspectRatio = "1:1", model = "gemini-3-pro-image-preview" } = GenerateImageSchema.parse(args);
        const jobId = await generateImage(prompt, aspectRatio, model);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  jobId,
                  status: "pending",
                  message:
                    "Image generation started. Use check_job_status to monitor progress.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "check_job_status": {
        const { jobId } = CheckJobStatusSchema.parse(args);
        const job = jobs.get(jobId);

        if (!job) {
          throw new Error(`Job ${jobId} not found`);
        }

        const response: any = {
          jobId: job.id,
          status: job.status,
          prompt: job.prompt,
          createdAt: job.createdAt.toISOString(),
        };

        if (job.completedAt) {
          response.completedAt = job.completedAt.toISOString();
        }

        if (job.status === "completed") {
          response.message =
            "Image generation completed. Use save_image to save the result.";
          response.hasResult = true;
        } else if (job.status === "failed") {
          response.error = job.error;
        } else {
          response.message = `Image generation is ${job.status}. Please check again later.`;
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }

      case "save_image": {
        const { jobId, filePath } = SaveImageSchema.parse(args);
        await saveImageToFile(jobId, filePath);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Image saved successfully to ${filePath}`,
                  filePath,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_jobs": {
        const jobList = Array.from(jobs.values()).map((job) => ({
          jobId: job.id,
          status: job.status,
          prompt: job.prompt.substring(0, 50) + (job.prompt.length > 50 ? "..." : ""),
          createdAt: job.createdAt.toISOString(),
          completedAt: job.completedAt?.toISOString(),
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  totalJobs: jobList.length,
                  jobs: jobList,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid arguments: ${error.message}`);
    }
    throw error;
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Keep the server alive - it will run until the client disconnects
  // This is important for async operations to complete
  console.error("MCP Nano Banana server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
