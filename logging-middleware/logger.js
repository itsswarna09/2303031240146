const axios = require('axios');
require('dotenv').config({ path: '../.env' });

async function Log(stack, level, pkg, message) {
  try {
    const response = await axios.post(
      'http://4.224.186.213/evaluation-service/logs',
      { stack, level, package: pkg, message },
      {
        headers: {
          Authorization: `Bearer ${process.env.LOG_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Log sent:', response.data.logID);
    return response.data;
  } catch (err) {
    console.error('Log failed:', err.response?.data || err.message);
  }
}

module.exports = { Log };