const axios = require('axios');
const { Log } = require('../../logging-middleware/logger');
require('dotenv').config({ path: '../.env' });

const PRIORITY_WEIGHT = { Placement: 3, Result: 2, Event: 1 };

exports.getTopNotifications = async (n = 10) => {
  await Log("backend", "info", "service", "Fetching notifications from evaluation service");

  const response = await axios.get(
    'http://4.224.186.213/evaluation-service/notifications',
    { headers: { Authorization: `Bearer ${process.env.LOG_API_TOKEN}` } }
  );

  const notifications = response.data.notifications;
  await Log("backend", "info", "service", `Fetched ${notifications.length} notifications, sorting by priority`);

  const sorted = notifications.sort((a, b) => {
    const weightDiff = PRIORITY_WEIGHT[b.Type] - PRIORITY_WEIGHT[a.Type];
    if (weightDiff !== 0) return weightDiff;
    return new Date(b.Timestamp) - new Date(a.Timestamp);
  });

  return sorted.slice(0, n);
};