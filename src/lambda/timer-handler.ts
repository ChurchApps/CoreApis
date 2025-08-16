import { Pool } from "@churchapps/apihelper";
import { ScheduledEvent, Context } from "aws-lambda";

import { Environment } from "../shared/helpers/Environment";
import { RepositoryManager } from "../shared/infrastructure/RepositoryManager";

import { NotificationHelper } from "../modules/messaging/helpers/NotificationHelper";
import { MessagingRepositories } from "../modules/messaging/repositories";

const initEnv = async () => {
  if (!Environment.currentEnvironment) {
    await Environment.init(process.env.STAGE || "dev");
    Pool.initPool();
    await RepositoryManager.setupModuleContext("messaging");

    // Initialize messaging helpers
    const repositories = await RepositoryManager.getRepositories<MessagingRepositories>("messaging");
    NotificationHelper.init(repositories);
  }
};

export const handle15MinTimer = async (_event: ScheduledEvent, _context: Context): Promise<void> => {
  try {
    await initEnv();

    console.log("15-minute timer triggered - processing individual email notifications");

    // Send individual email notifications (every 30 minutes now for cost optimization)
    const result = await NotificationHelper.sendEmailNotifications("individual");

    console.log("15-minute timer completed", result);
  } catch (error) {
    console.error("Error in 15-minute timer:", error);
    throw error;
  }
};

export const handleMidnightTimer = async (_event: ScheduledEvent, _context: Context): Promise<void> => {
  try {
    await initEnv();

    console.log("Midnight timer triggered - processing daily digest email notifications");

    // Send daily digest email notifications (runs at 5 AM UTC)
    const result = await NotificationHelper.sendEmailNotifications("daily");

    console.log("Midnight timer completed", result);
  } catch (error) {
    console.error("Error in midnight timer:", error);
    throw error;
  }
};
