const ActionWrapperRunner = require('./runners/ActionWrapperRunner');

async function run() {
  const runner = new ActionWrapperRunner();
  await runner.run();
}

module.exports = { run };

if (require.main === module) {
  run();
}
