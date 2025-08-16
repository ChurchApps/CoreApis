import "reflect-metadata";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { configure } from "@codegenie/serverless-express";
import { createApp } from "./app";
import { handleSocket } from "./lambda/socket-handler";
import { handle15MinTimer, handleMidnightTimer } from "./lambda/timer-handler";

// Cache the serverless express app
let cachedApp: any = null;

// Web handler for HTTP requests
export const web = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  try {
    if (!cachedApp) {
      const app = await createApp();
      cachedApp = configure({ app });
    }

    return await cachedApp(event, context);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message || "Unknown error occurred"
      }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*"
      }
    };
  }
};

// WebSocket handler
export const socket = handleSocket;

// Timer handlers
export const timer15Min = handle15MinTimer;
export const timerMidnight = handleMidnightTimer;