import Queue from "bull";
import { processEmailJob, processSequenceJob } from "./emailProcessor";
import { logger } from "../utils/logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export function createBullQueue(name: string) {
  const queue = new Queue(name, REDIS_URL, {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  // Handle queue events
  queue
    .on("error", (error) => {
      logger.error(`Queue ${name} error:`, error);
    })
    .on("failed", (job, error) => {
      logger.error(`Job ${job.id} in queue ${name} failed:`, error);
    })
    .on("completed", (job) => {
      logger.info(`Job ${job.id} in queue ${name} completed`);
    });

  return queue;
}

// Create email queues
const emailQueue = createBullQueue("email-queue");
const sequenceQueue = createBullQueue("sequence-queue");

// Process email jobs
emailQueue.process("send-email", processEmailJob);

// Process sequence jobs
sequenceQueue.process("process-sequence", processSequenceJob);

export { emailQueue, sequenceQueue }; 