import { Job } from "bull";
import { db } from "../db";
import { sendEmail } from "../services/email";
import { logger } from "../utils/logger";

interface SendEmailJob {
  fromAccount: string;
  subject: string;
  body: string;
  recipients: string[];
  userId: number;
}

interface ProcessSequenceJob {
  sequenceId: number;
  recipientEmail: string;
  currentStep: number;
  userId: number;
}

export async function processEmailJob(job: Job<SendEmailJob>) {
  const { fromAccount, subject, body, recipients, userId } = job.data;

  try {
    logger.info(`Processing email job ${job.id} for user ${userId}`);

    // Send email to each recipient
    for (const recipient of recipients) {
      try {
        await sendEmail({
          from: fromAccount,
          to: recipient,
          subject,
          body,
        });

        // Create tracking record
        await db.emailTracking.create({
          data: {
            campaignId: job.id,
            recipientEmail: recipient,
            status: "sent",
          },
        });

        logger.info(`Email sent to ${recipient}`);
      } catch (error) {
        logger.error(`Failed to send email to ${recipient}:`, error);

        // Record bounce/failure
        await db.emailTracking.create({
          data: {
            campaignId: job.id,
            recipientEmail: recipient,
            status: "bounced",
            bouncedAt: new Date(),
          },
        });
      }
    }

    // Update campaign status
    await db.emailCampaign.update({
      where: { id: job.id },
      data: { status: "completed" },
    });

    logger.info(`Email job ${job.id} completed successfully`);
  } catch (error) {
    logger.error(`Failed to process email job ${job.id}:`, error);
    throw error;
  }
}

export async function processSequenceJob(job: Job<ProcessSequenceJob>) {
  const { sequenceId, recipientEmail, currentStep, userId } = job.data;

  try {
    logger.info(
      `Processing sequence step ${currentStep} for sequence ${sequenceId}`
    );

    // Get sequence and current step
    const sequence = await db.emailSequence.findUnique({
      where: { id: sequenceId },
      include: {
        steps: {
          where: { order: currentStep },
        },
      },
    });

    if (!sequence || !sequence.steps.length) {
      throw new Error(`Sequence ${sequenceId} or step ${currentStep} not found`);
    }

    const step = sequence.steps[0];

    // Send email for current step
    await sendEmail({
      from: sequence.fromAccount,
      to: recipientEmail,
      subject: step.subject,
      body: step.body,
    });

    // Create tracking record
    await db.emailTracking.create({
      data: {
        sequenceId,
        recipientEmail,
        status: "sent",
        step: currentStep,
      },
    });

    // Schedule next step if available
    const nextStep = await db.emailSequenceStep.findFirst({
      where: {
        sequenceId,
        order: currentStep + 1,
      },
    });

    if (nextStep) {
      const delay = calculateDelay(nextStep.delay, nextStep.delayUnit);

      await job.queue.add(
        "process-sequence",
        {
          sequenceId,
          recipientEmail,
          currentStep: currentStep + 1,
          userId,
        },
        {
          delay,
        }
      );

      logger.info(
        `Scheduled next step ${currentStep + 1} for sequence ${sequenceId}`
      );
    } else {
      logger.info(`Sequence ${sequenceId} completed for ${recipientEmail}`);
    }
  } catch (error) {
    logger.error(
      `Failed to process sequence ${sequenceId} step ${currentStep}:`,
      error
    );
    throw error;
  }
}

function calculateDelay(delay: number, unit: "hours" | "days"): number {
  const multiplier = unit === "hours" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return delay * multiplier;
} 