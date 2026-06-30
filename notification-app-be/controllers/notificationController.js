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