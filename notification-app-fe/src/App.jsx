import { Log } from './logger';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Container, Typography, List, Chip, CircularProgress, Box,
  Paper, Avatar, Fade, Badge, IconButton, Tooltip
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import WorkIcon from '@mui/icons-material/Work';
import SchoolIcon from '@mui/icons-material/School';
import EventIcon from '@mui/icons-material/Event';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const BACKEND_URL = 'http://localhost:4000/api/notifications';

const typeConfig = {
  Placement: { color: '#2e7d32', bg: '#e8f5e9', icon: <WorkIcon fontSize="small" />, label: 'Placement update' },
  Result: { color: '#1565c0', bg: '#e3f2fd', icon: <SchoolIcon fontSize="small" />, label: 'Result update' },
  Event: { color: '#ef6c00', bg: '#fff3e0', icon: <EventIcon fontSize="small" />, label: 'Event update' }
};

function App() {
  const [tab, setTab] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    const stored = sessionStorage.getItem('readIds');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const tabRefs = useRef([]);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(BACKEND_URL);
      setNotifications(res.data.notifications || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const fetchPriority = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${BACKEND_URL}/priority`);
      setNotifications(res.data.notifications || []);
    } catch (err) {
      setError(err.message);
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

  const markAllRead = () => {
    const updated = new Set(notifications.map(n => n.ID));
    setReadIds(updated);
    sessionStorage.setItem('readIds', JSON.stringify([...updated]));
  };

  const handleTabKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      const next = (index + 1) % 2;
      tabRefs.current[next]?.focus();
      setTab(next);
    } else if (e.key === 'ArrowLeft') {
      const prev = (index - 1 + 2) % 2;
      tabRefs.current[prev]?.focus();
      setTab(prev);
    }
  };

  const unreadCount = notifications.filter(n => !readIds.has(n.ID)).length;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f2f5' }}>
      <Box
        component="header"
        sx={{
          background: 'linear-gradient(135deg, #5e35b1 0%, #3949ab 100%)',
          color: 'white',
          py: 5,
          px: 3,
          borderRadius: '0 0 32px 32px',
          boxShadow: '0 8px 24px rgba(57, 73, 171, 0.25)'
        }}
      >
        <Container maxWidth="sm">
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Badge badgeContent={unreadCount} color="error" aria-label={`${unreadCount} unread notifications`}>
                <NotificationsActiveIcon sx={{ fontSize: 32 }} aria-hidden="true" />
              </Badge>
              <Typography variant="h5" fontWeight={700} component="h1">
                Notifications
              </Typography>
            </Box>
            <Box display="flex">
              <Tooltip title="Refresh">
                <IconButton
                  onClick={() => (tab === 0 ? fetchAll() : fetchPriority())}
                  aria-label="Refresh notifications"
                  sx={{ color: 'white' }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              {unreadCount > 0 && (
                <Tooltip title="Mark all as read">
                  <IconButton
                    onClick={markAllRead}
                    aria-label="Mark all notifications as read"
                    sx={{ color: 'white' }}
                  >
                    <CheckCircleIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
          <Typography variant="body2" sx={{ opacity: 0.85, mb: 3 }}>
            Stay updated with placements, results & events
          </Typography>

          <Box role="tablist" aria-label="Notification view" sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: 1 }}>
            {['All Notifications', 'Priority Inbox'].map((label, i) => (
              <Box
                key={label}
                ref={(el) => (tabRefs.current[i] = el)}
                role="tab"
                tabIndex={tab === i ? 0 : -1}
                aria-selected={tab === i}
                aria-controls={`panel-${i}`}
                id={`tab-${i}`}
                onClick={() => setTab(i)}
                onKeyDown={(e) => handleTabKeyDown(e, i)}
                sx={{
                  px: 2.5, py: 1, borderRadius: 5, cursor: 'pointer',
                  fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap',
                  bgcolor: tab === i ? 'white' : 'rgba(255,255,255,0.15)',
                  color: tab === i ? '#3949ab' : 'white',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  '&:focus-visible': {
                    boxShadow: '0 0 0 3px rgba(255,255,255,0.6)'
                  }
                }}
              >
                {label}
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: 4 }} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {loading ? (
          <Box display="flex" justifyContent="center" mt={6} role="status" aria-live="polite">
            <CircularProgress sx={{ color: '#5e35b1' }} aria-label="Loading notifications" />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#fdecea' }} role="alert">
            <Typography color="error" fontWeight={500}>
              Couldn't load notifications: {error}
            </Typography>
          </Paper>
        ) : notifications.length === 0 ? (
          <Paper sx={{ p: 5, borderRadius: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">All caught up! No notifications.</Typography>
          </Paper>
        ) : (
          <List sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 0 }} aria-live="polite">
            {notifications.map((n, idx) => {
              const isRead = readIds.has(n.ID);
              const config = typeConfig[n.Type] || { color: '#666', bg: '#f5f5f5', icon: <EventIcon fontSize="small" />, label: 'Notification' };
              return (
                <Fade in timeout={300 + idx * 60} key={n.ID}>
                  <Paper
                    onClick={() => markAsRead(n.ID)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        markAsRead(n.ID);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${config.label}: ${n.Message}, ${n.Timestamp}, ${isRead ? 'read' : 'unread'}. Press Enter to mark as read.`}
                    elevation={0}
                    sx={{
                      borderRadius: 4,
                      p: 2,
                      cursor: 'pointer',
                      display: 'flex',
                      gap: 2,
                      alignItems: 'flex-start',
                      bgcolor: '#fff',
                      border: isRead ? '1px solid #eee' : `1.5px solid ${config.color}33`,
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      '&:hover': {
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                        transform: 'translateY(-2px)'
                      },
                      '&:focus-visible': {
                        boxShadow: `0 0 0 3px ${config.color}66`
                      }
                    }}
                  >
                    <Avatar sx={{ bgcolor: config.bg, color: config.color, width: 44, height: 44 }} aria-hidden="true">
                      {config.icon}
                    </Avatar>
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.3}>
                        <Chip
                          label={n.Type}
                          size="small"
                          sx={{
                            bgcolor: config.bg, color: config.color,
                            fontWeight: 700, fontSize: 11, height: 22
                          }}
                        />
                        {!isRead && (
                          <Box
                            sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#e53935' }}
                            aria-hidden="true"
                          />
                        )}
                      </Box>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: isRead ? 400 : 600, color: isRead ? 'text.secondary' : '#1a1a1a' }}
                      >
                        {n.Message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {n.Timestamp}
                      </Typography>
                    </Box>
                  </Paper>
                </Fade>
              );
            })}
          </List>
        )}
      </Container>
    </Box>
  );
}

export default App;