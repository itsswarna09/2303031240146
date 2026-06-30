const { Log } = require('./logger');

Log("backend", "info", "service", "Testing logger setup")
  .then(() => console.log("Test complete"));