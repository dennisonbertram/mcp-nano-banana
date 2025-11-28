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

// Batch job tracking
interface BatchJob {
  id: string;
  jobIds: string[];
  totalCount: number;
  createdAt: Date;
  completedAt?: Date;
}

const batchJobs = new Map<string, BatchJob>();

// Generate a simple unique batch ID
function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

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

// Batch tool schemas
const BatchPromptSchema = z.object({
  prompt: z.string().describe("Text prompt describing the image to generate"),
  aspectRatio: z
    .enum(["1:1", "3:4", "4:3", "9:16", "16:9"])
    .optional()
    .describe("Aspect ratio for this image (defaults to batch-level setting or 1:1)"),
  model: z
    .enum(AVAILABLE_MODELS)
    .optional()
    .describe("Model to use for this image (defaults to batch-level setting)"),
});

const GenerateBatchImagesSchema = z.object({
  prompts: z.array(BatchPromptSchema).min(1).max(20).describe("Array of image prompts to generate (1-20 images)"),
  defaultAspectRatio: z
    .enum(["1:1", "3:4", "4:3", "9:16", "16:9"])
    .default("1:1")
    .describe("Default aspect ratio for all images unless overridden per-prompt"),
  defaultModel: z
    .enum(AVAILABLE_MODELS)
    .default("gemini-3-pro-image-preview")
    .describe("Default model for all images unless overridden per-prompt"),
});

const CheckBatchStatusSchema = z.object({
  batchId: z.string().describe("The batch ID returned from generate_batch_images"),
});

const SaveBatchImagesSchema = z.object({
  batchId: z.string().describe("The batch ID of the completed batch generation"),
  directory: z.string().describe("Directory path where images should be saved"),
  filenamePrefix: z.string().default("image").describe("Prefix for generated filenames (default: 'image')"),
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

// Batch image generation function
type BatchPrompt = z.infer<typeof BatchPromptSchema>;

async function generateBatchImages(
  prompts: BatchPrompt[],
  defaultAspectRatio: string,
  defaultModel: string
): Promise<{ batchId: string; jobIds: string[] }> {
  const batchId = generateBatchId();
  const jobIds: string[] = [];

  // Generate all images in parallel
  for (const promptConfig of prompts) {
    const aspectRatio = promptConfig.aspectRatio || defaultAspectRatio;
    const model = promptConfig.model || defaultModel;
    const jobId = await generateImage(promptConfig.prompt, aspectRatio, model);
    jobIds.push(jobId);
  }

  // Create batch job
  batchJobs.set(batchId, {
    id: batchId,
    jobIds,
    totalCount: prompts.length,
    createdAt: new Date(),
  });

  return { batchId, jobIds };
}

// Get batch status with aggregated information
function getBatchStatus(batchId: string): {
  batchId: string;
  status: "pending" | "processing" | "completed" | "partial" | "failed";
  totalCount: number;
  completedCount: number;
  failedCount: number;
  pendingCount: number;
  processingCount: number;
  jobs: { jobId: string; status: string; prompt: string }[];
  createdAt: Date;
  completedAt?: Date;
} {
  const batch = batchJobs.get(batchId);
  if (!batch) {
    throw new Error(`Batch ${batchId} not found`);
  }

  let completedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  let processingCount = 0;
  const jobDetails: { jobId: string; status: string; prompt: string }[] = [];

  for (const jobId of batch.jobIds) {
    const job = jobs.get(jobId);
    if (job) {
      jobDetails.push({
        jobId: job.id,
        status: job.status,
        prompt: job.prompt.substring(0, 50) + (job.prompt.length > 50 ? "..." : ""),
      });

      switch (job.status) {
        case "completed":
          completedCount++;
          break;
        case "failed":
          failedCount++;
          break;
        case "pending":
          pendingCount++;
          break;
        case "processing":
          processingCount++;
          break;
      }
    }
  }

  // Determine overall batch status
  let status: "pending" | "processing" | "completed" | "partial" | "failed";
  const allDone = completedCount + failedCount === batch.totalCount;

  if (allDone) {
    if (failedCount === batch.totalCount) {
      status = "failed";
    } else if (failedCount > 0) {
      status = "partial";
    } else {
      status = "completed";
    }
    // Update batch completedAt if all jobs are done
    if (!batch.completedAt) {
      batch.completedAt = new Date();
    }
  } else if (processingCount > 0 || completedCount > 0) {
    status = "processing";
  } else {
    status = "pending";
  }

  return {
    batchId: batch.id,
    status,
    totalCount: batch.totalCount,
    completedCount,
    failedCount,
    pendingCount,
    processingCount,
    jobs: jobDetails,
    createdAt: batch.createdAt,
    completedAt: batch.completedAt,
  };
}

// Save all completed images from a batch
async function saveBatchImages(
  batchId: string,
  directory: string,
  filenamePrefix: string
): Promise<{ saved: { jobId: string; filePath: string }[]; failed: { jobId: string; error: string }[] }> {
  const batch = batchJobs.get(batchId);
  if (!batch) {
    throw new Error(`Batch ${batchId} not found`);
  }

  const absoluteDir = resolve(directory);
  await mkdir(absoluteDir, { recursive: true });

  const saved: { jobId: string; filePath: string }[] = [];
  const failed: { jobId: string; error: string }[] = [];

  for (let i = 0; i < batch.jobIds.length; i++) {
    const jobId = batch.jobIds[i];
    const filePath = join(absoluteDir, `${filenamePrefix}_${i + 1}.png`);

    try {
      await saveImageToFile(jobId, filePath);
      saved.push({ jobId, filePath });
    } catch (error) {
      failed.push({
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { saved, failed };
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
      {
        name: "generate_batch_images",
        description:
          "Generate multiple images at once from a list of prompts. Returns a batch ID to track all images together. Use check_batch_status to monitor progress and save_batch_images to save all completed images.",
        inputSchema: {
          type: "object",
          properties: {
            prompts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  prompt: {
                    type: "string",
                    description: "Text description of the image to generate",
                  },
                  aspectRatio: {
                    type: "string",
                    enum: ["1:1", "3:4", "4:3", "9:16", "16:9"],
                    description: "Optional aspect ratio override for this specific image",
                  },
                  model: {
                    type: "string",
                    enum: ["gemini-3-pro-image-preview", "gemini-2.5-flash-image", "gemini-2.5-flash-image-preview", "gemini-2.0-flash-exp-image-generation"],
                    description: "Optional model override for this specific image",
                  },
                },
                required: ["prompt"],
              },
              minItems: 1,
              maxItems: 20,
              description: "Array of 1-20 image prompts to generate",
            },
            defaultAspectRatio: {
              type: "string",
              enum: ["1:1", "3:4", "4:3", "9:16", "16:9"],
              default: "1:1",
              description: "Default aspect ratio for all images (can be overridden per-prompt)",
            },
            defaultModel: {
              type: "string",
              enum: ["gemini-3-pro-image-preview", "gemini-2.5-flash-image", "gemini-2.5-flash-image-preview", "gemini-2.0-flash-exp-image-generation"],
              default: "gemini-3-pro-image-preview",
              description: "Default model for all images (can be overridden per-prompt)",
            },
          },
          required: ["prompts"],
        },
      },
      {
        name: "check_batch_status",
        description:
          "Check the progress of a batch image generation. Shows how many images are completed, processing, or failed.",
        inputSchema: {
          type: "object",
          properties: {
            batchId: {
              type: "string",
              description: "The batch ID you received from generate_batch_images",
            },
          },
          required: ["batchId"],
        },
      },
      {
        name: "save_batch_images",
        description:
          "Save all completed images from a batch to a directory. Images are named with a prefix and number (e.g., image_1.png, image_2.png).",
        inputSchema: {
          type: "object",
          properties: {
            batchId: {
              type: "string",
              description: "The batch ID from your batch generation",
            },
            directory: {
              type: "string",
              description: "Directory path where all images should be saved (e.g., '/Users/yourname/Pictures/batch')",
            },
            filenamePrefix: {
              type: "string",
              default: "image",
              description: "Prefix for filenames (default: 'image'). Files will be named prefix_1.png, prefix_2.png, etc.",
            },
          },
          required: ["batchId", "directory"],
        },
      },
      {
        name: "list_batches",
        description:
          "See all your batch image generation requests and their overall status.",
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

      case "generate_batch_images": {
        const {
          prompts,
          defaultAspectRatio = "1:1",
          defaultModel = "gemini-3-pro-image-preview",
        } = GenerateBatchImagesSchema.parse(args);

        const { batchId, jobIds } = await generateBatchImages(
          prompts,
          defaultAspectRatio,
          defaultModel
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  batchId,
                  jobIds,
                  totalImages: prompts.length,
                  status: "pending",
                  message:
                    "Batch image generation started. Use check_batch_status to monitor progress.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "check_batch_status": {
        const { batchId } = CheckBatchStatusSchema.parse(args);
        const status = getBatchStatus(batchId);

        const response: any = {
          batchId: status.batchId,
          status: status.status,
          progress: `${status.completedCount}/${status.totalCount} completed`,
          totalCount: status.totalCount,
          completedCount: status.completedCount,
          processingCount: status.processingCount,
          pendingCount: status.pendingCount,
          failedCount: status.failedCount,
          createdAt: status.createdAt.toISOString(),
          jobs: status.jobs,
        };

        if (status.completedAt) {
          response.completedAt = status.completedAt.toISOString();
        }

        if (status.status === "completed") {
          response.message =
            "All images completed successfully. Use save_batch_images to save all images.";
        } else if (status.status === "partial") {
          response.message =
            "Batch completed with some failures. Use save_batch_images to save successful images.";
        } else if (status.status === "failed") {
          response.message = "All images failed to generate.";
        } else {
          response.message = `Batch is ${status.status}. Please check again later.`;
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

      case "save_batch_images": {
        const {
          batchId,
          directory,
          filenamePrefix = "image",
        } = SaveBatchImagesSchema.parse(args);

        const result = await saveBatchImages(batchId, directory, filenamePrefix);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: result.saved.length > 0,
                  message: `Saved ${result.saved.length} images to ${directory}`,
                  savedCount: result.saved.length,
                  failedCount: result.failed.length,
                  saved: result.saved,
                  failed: result.failed.length > 0 ? result.failed : undefined,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_batches": {
        const batchList = Array.from(batchJobs.values()).map((batch) => {
          const status = getBatchStatus(batch.id);
          return {
            batchId: batch.id,
            status: status.status,
            progress: `${status.completedCount}/${status.totalCount}`,
            totalCount: batch.totalCount,
            createdAt: batch.createdAt.toISOString(),
            completedAt: batch.completedAt?.toISOString(),
          };
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  totalBatches: batchList.length,
                  batches: batchList,
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
