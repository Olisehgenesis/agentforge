/**
 * Skill Cron Runner
 *
 * Executes skills on a schedule via OpenClaw cron jobs.
 * When a cron fires, it triggers the agent's processMessage()
 * with a system-generated prompt that invokes the skill.
 *
 * This enables agents to run concurrently — each with its own
 * scheduled tasks, all managed by OpenClaw.
 *
 * Example cron jobs for Forex Trader:
 *   - Every 5 min: "Check all exchange rates and report anomalies"
 *   - Every hour: "Analyze portfolio performance and suggest rebalancing"
 *   - Daily: "Generate a daily market summary report"
 */

import { prisma } from "@/lib/db";
import { processMessage } from "@/lib/openclaw/manager";

export interface CronSkillJob {
  id: string;
  agentId: string;
  name: string;
  cron: string;     // cron expression
  skillPrompt: string; // message sent to the agent
  enabled: boolean;
  lastRun?: Date;
  lastResult?: string;
}

/**
 * Default cron jobs for each template type.
 * These are suggested when an agent is created.
 */
export function getDefaultCronJobs(templateType: string): Omit<CronSkillJob, "id" | "agentId" | "lastRun" | "lastResult">[] {
  switch (templateType) {
    case "forex":
      return [
        {
          name: "Rate Monitor",
          cron: "*/5 * * * *", // every 5 minutes
          skillPrompt: "Check all current CELO exchange rates. If any rate has moved more than 2% from the last check, report it as a significant movement.",
          enabled: true,
        },
        {
          name: "Portfolio Report",
          cron: "0 * * * *", // every hour
          skillPrompt: "Generate a portfolio status report showing current holdings and their USD values.",
          enabled: true,
        },
        {
          name: "Daily Market Summary",
          cron: "0 9 * * *", // daily at 9 AM
          skillPrompt: "Generate a comprehensive daily market analysis for all Mento stablecoin pairs. Include rate trends, oracle health, and trading recommendations.",
          enabled: false, // disabled by default
        },
      ];

    case "trading":
      return [
        {
          name: "Price Check",
          cron: "*/10 * * * *",
          skillPrompt: "Check current exchange rates for all configured trading pairs.",
          enabled: true,
        },
        {
          name: "Portfolio Rebalance Check",
          cron: "0 */4 * * *", // every 4 hours
          skillPrompt: "Analyze current portfolio allocation and suggest any rebalancing needed based on configured targets.",
          enabled: false,
        },
      ];

    case "payment":
      return [
        {
          name: "Balance Check",
          cron: "0 */6 * * *", // every 6 hours
          skillPrompt: "Check the agent wallet balance and report if any token is running low.",
          enabled: false,
        },
      ];

    case "social":
      return [
        {
          name: "Community Update",
          cron: "0 12 * * *", // daily at noon
          skillPrompt: "Generate a brief community update message about the latest Celo network stats.",
          enabled: false,
        },
      ];

    default:
      return [];
  }
}

/**
 * Execute a cron skill job.
 * Called by the OpenClaw gateway when a cron fires.
 */
export async function executeCronJob(
  agentId: string,
  jobId: string,
  skillPrompt: string
): Promise<{ success: boolean; response: string }> {
  try {
    // Process the skill prompt through the agent's normal message pipeline
    // This will trigger skill command parsing and execution
    const response = await processMessage(
      agentId,
      `[SCHEDULED TASK: ${jobId}] ${skillPrompt}`,
      [] // no conversation history for cron jobs
    );

    // Update last run in agent's cron data
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { openclawCronJobs: true },
    });

    if (agent?.openclawCronJobs) {
      try {
        const jobs = JSON.parse(agent.openclawCronJobs) as CronSkillJob[];
        const updated = jobs.map((j) =>
          j.id === jobId
            ? { ...j, lastRun: new Date().toISOString(), lastResult: response.slice(0, 200) }
            : j
        );
        await prisma.agent.update({
          where: { id: agentId },
          data: { openclawCronJobs: JSON.stringify(updated) },
        });
      } catch {
        // ignore parse errors
      }
    }

    // Log the cron execution
    await prisma.activityLog.create({
      data: {
        agentId,
        type: "action",
        message: `Cron job "${jobId}" executed`,
        metadata: JSON.stringify({
          jobId,
          prompt: skillPrompt.slice(0, 100),
          responseLength: response.length,
        }),
      },
    });

    return { success: true, response };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    await prisma.activityLog.create({
      data: {
        agentId,
        type: "error",
        message: `Cron job "${jobId}" failed: ${msg.slice(0, 200)}`,
      },
    });

    return { success: false, response: msg };
  }
}

/**
 * Save cron jobs for an agent.
 */
export async function saveCronJobs(agentId: string, jobs: CronSkillJob[]): Promise<void> {
  await prisma.agent.update({
    where: { id: agentId },
    data: { openclawCronJobs: JSON.stringify(jobs) },
  });
}

/**
 * Get cron jobs for an agent.
 */
export async function getCronJobs(agentId: string): Promise<CronSkillJob[]> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { openclawCronJobs: true },
  });

  if (!agent?.openclawCronJobs) return [];

  try {
    return JSON.parse(agent.openclawCronJobs) as CronSkillJob[];
  } catch {
    return [];
  }
}

