const serverlessExpress = require('@codegenie/serverless-express');
const { Pool } = require('@churchapps/apihelper');

// Import Environment from the shared helpers
const { Environment } = require('./dist/shared/helpers/Environment');

// Import the app creator
const { createApp } = require('./dist/app');

// Initialize environment and connection pool
const checkPool = async () => {
  if (!Environment.currentEnvironment) {
    const stage = process.env.STAGE || process.env.ENVIRONMENT || 'dev';
    console.log('Initializing environment with stage:', stage);
    console.log('Environment variables:', {
      STAGE: process.env.STAGE,
      ENVIRONMENT: process.env.ENVIRONMENT,
      APP_ENV: process.env.APP_ENV
    });
    await Environment.init(stage);
    console.log('Environment initialized, connection strings loaded');
    Pool.initPool();
    console.log('Pool initialized');
  }
};

// Cache the handler
let cachedHandler;

// Web handler for HTTP requests
const web = async function(event, context) {
  try {
    console.log('Web handler invoked');
    console.log('Event httpMethod:', event.httpMethod);
    console.log('Event path:', event.path);
    
    await checkPool();
    
    // Initialize the handler only once
    if (!cachedHandler) {
      const app = await createApp();
      console.log('Express app created');
      
      cachedHandler = serverlessExpress({ 
        app,
        binarySettings: {
          contentTypes: [
            'application/octet-stream',
            'font/*', 
            'image/*',
            'application/pdf'
          ]
        }
      });
      console.log('Serverless Express handler created');
    }
    
    const result = await cachedHandler(event, context);
    return result;
  } catch (error) {
    console.error('Error in web handler:', error);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: process.env.STAGE === 'demo' ? error.stack : undefined,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Import socket and timer handlers
const { handleSocket } = require('./dist/lambda/socket-handler');
const { handle15MinTimer, handleMidnightTimer } = require('./dist/lambda/timer-handler');

// WebSocket handler
const socket = async function(event, context) {
  try {
    await checkPool();
    return await handleSocket(event, context);
  } catch (error) {
    console.error('Error in socket handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Socket handler error' })
    };
  }
};

// Timer handlers
const timer15Min = async function(event, context) {
  try {
    await checkPool();
    await handle15MinTimer(event, context);
    return { statusCode: 200, body: 'Timer executed successfully' };
  } catch (error) {
    console.error('Error in 15-minute timer:', error);
    throw error;
  }
};

const timerMidnight = async function(event, context) {
  try {
    await checkPool();
    await handleMidnightTimer(event, context);
    return { statusCode: 200, body: 'Timer executed successfully' };
  } catch (error) {
    console.error('Error in midnight timer:', error);
    throw error;
  }
};

// Export handlers
module.exports.web = web;
module.exports.socket = socket;
module.exports.timer15Min = timer15Min;
module.exports.timerMidnight = timerMidnight;