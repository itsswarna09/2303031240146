import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container, Typography, Tabs, Tab, List, ListItem, ListItemText,
  Chip, CircularProgress, Box
} from '@mui/material';

const BACKEND_URL = 'http://localhost:4000/api/notifications';

function App() {
  const [tab, setTab] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    const stored = sessionStorage.getItem('readIds');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await axios.get(BACKEND_URL);
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
    setLoading(false);
  };

  const fetchPriority = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/priority`);
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch priority notifications', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 0) fetchAll();
    else fetchPriority();
  }, [tab]);

  const markAsRead = (id) => {
    const updated = new Set(readIds);
    updated.add(id);
    setReadIds(updated);
    sessionStorage.setItem('readIds', JSON.stringify([...updated]));
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Notifications</Typography>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="All Notifications" />
        <Tab label="Priority Inbox" />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
      ) : (
        <List>
          {notifications.map((n) => (
            <ListItem
              key={n.ID}
              onClick={() => markAsRead(n.ID)}
              sx={{
                border: '1px solid #ddd',
                borderRadius: 2,
                mb: 1,
                bgcolor: readIds.has(n.ID) ? '#f5f5f5' : '#fff',
                cursor: 'pointer'
              }}
            >
              <ListItemText
                primary={
                  <>
                    {!readIds.has(n.ID) && <Chip label="New" size="small" color="primary" sx={{ mr: 1 }} />}
                    <Chip label={n.Type} size="small" sx={{ mr: 1 }} />
                    {n.Message}
                  </>
                }
                secondary={n.Timestamp}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Container>
  );
}

export default App;