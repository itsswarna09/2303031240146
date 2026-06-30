import axios from 'axios';

const LOG_TOKEN = import.meta.env.VITE_LOG_API_TOKEN;

export async function Log(stack, level, pkg, message) {
  try {
    await axios.post(
      'http://4.224.186.213/evaluation-service/logs',
      { stack, level, package: pkg, message },
      { headers: { Authorization: `Bearer ${LOG_TOKEN}` } }
    );
  } catch (err) {
    console.error('Log failed', err.response?.data || err.message);
  }
}