const serverlessExpress = require('@codegenie/serverless-express');

let serverlessExpressInstance;

async function setup(event, context) {
  const app = await require('./dist/app').createApp();
  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
}

function web(event, context) {
  if (serverlessExpressInstance) return serverlessExpressInstance(event, context);
  return setup(event, context);
}

async function socket(event, context) {
  const { handleSocket } = require('./dist/lambda/socket-handler');
  return await handleSocket(event, context);
}

async function timer15Min(event, context) {
  const { handle15MinTimer } = require('./dist/lambda/timer-handler');
  return await handle15MinTimer(event, context);
}

async function timerMidnight(event, context) {
  const { handleMidnightTimer } = require('./dist/lambda/timer-handler');
  return await handleMidnightTimer(event, context);
}

module.exports = {
  web,
  socket,
  timer15Min,
  timerMidnight
};