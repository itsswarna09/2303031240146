const service = require('../services/notificationService');
const { Log } = require('../../logging-middleware/logger');

exports.getPriorityNotifications = async (req, res) => {
  await Log("backend", "info", "controller", "getPriorityNotifications endpoint hit");
  try {
    const n = parseInt(req.query.n) || 10;
    const result = await service.getTopNotifications(n);
    await Log("backend", "info", "controller", `Returning ${result.length} priority notifications`);
    res.status(200).json({ notifications: result });
  } catch (err) {
    await Log("backend", "error", "controller", `Failed to get priority notifications: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};
exports.getAllNotifications = async (req, res) => {
  await Log("backend", "info", "controller", "getAllNotifications endpoint hit");
  try {
    const axios = require('axios');
    const response = await axios.get(
      'http://4.224.186.213/evaluation-service/notifications',
      { headers: { Authorization: `Bearer ${process.env.LOG_API_TOKEN}` } }
    );
    res.status(200).json(response.data);
  } catch (err) {
    await Log("backend", "error", "controller", `Failed to get all notifications: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};