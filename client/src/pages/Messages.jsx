import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Box, Typography, Tabs, Tab, Paper, TextField, Button,
  Avatar, Alert, Skeleton, Chip, Divider, Badge,
  Card, CardContent, CardActionArea, Collapse, CircularProgress
} from '@mui/material';
import {
  SendOutlined, MarkEmailReadOutlined, MarkEmailUnreadOutlined,
  CampaignOutlined, ForumOutlined
} from '@mui/icons-material';

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

export default function Messages() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);

  // Conversation
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(true);
  const [msgError, setMsgError] = useState('');
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef(null);

  // Broadcasts
  const [broadcasts, setBroadcasts] = useState([]);
  const [bcastLoading, setBcastLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const fetchMessages = async () => {
    setMsgLoading(true);
    try {
      const { data } = await api.get('/feedback');
      setMessages(data);
      // Mark admin replies as read silently
      api.post('/feedback/mark-read').catch(() => {});
    } catch (e) {
      setMsgError(e.response?.data?.message || 'Erreur de chargement');
    } finally {
      setMsgLoading(false);
    }
  };

  const fetchBroadcasts = async () => {
    setBcastLoading(true);
    try {
      const { data } = await api.get('/broadcasts');
      setBroadcasts(data);
    } catch {} finally {
      setBcastLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchBroadcasts();
  }, []);

  useEffect(() => {
    if (!msgLoading) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, msgLoading]);

  const handleSend = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      await api.post('/feedback', { message: newMsg.trim() });
      setNewMsg('');
      await fetchMessages();
    } catch (e) {
      setMsgError(e.response?.data?.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const handleExpand = async (b) => {
    if (expanded === b.id) { setExpanded(null); return; }
    setExpanded(b.id);
    if (!b.is_read) {
      api.post(`/broadcasts/${b.id}/read`).catch(() => {});
      setBroadcasts(prev =>
        prev.map(br => br.id === b.id ? { ...br, is_read: true, read_at: new Date().toISOString() } : br)
      );
    }
  };

  const unreadBcasts = broadcasts.filter(b => !b.is_read).length;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Messagerie</Typography>
        <Typography color="text.secondary">Échangez avec l'administration</Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab
            label="Conversation"
            icon={<ForumOutlined />}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 500 }}
          />
          <Tab
            label={
              <Badge badgeContent={unreadBcasts} color="error" sx={{ pr: unreadBcasts > 0 ? 1.5 : 0 }}>
                Annonces
              </Badge>
            }
            icon={<CampaignOutlined />}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 500 }}
          />
        </Tabs>
      </Box>

      {/* ── Conversation tab ── */}
      <TabPanel value={tab} index={0}>
        {msgError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setMsgError('')}>{msgError}</Alert>
        )}

        <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}>
          {/* Thread */}
          <Box sx={{ height: 460, overflowY: 'auto', p: 2, bgcolor: 'grey.50' }}>
            {msgLoading ? (
              [1, 2, 3].map(i => <Skeleton key={i} height={60} sx={{ mb: 1, borderRadius: 2 }} />)
            ) : messages.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <ForumOutlined sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">Aucun message. Envoyez un message à l'administration.</Typography>
              </Box>
            ) : (
              messages.map(m => {
                const isOwn = m.created_by === user.matricule;
                return (
                  <Box key={m.id} sx={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', mb: 1.5 }}>
                    {!isOwn && (
                      <Avatar sx={{ bgcolor: '#7D3C00', width: 32, height: 32, fontSize: 12, mr: 1, mt: 2.5, flexShrink: 0 }}>
                        {`${m.prenom?.[0] ?? ''}${m.nom?.[0] ?? ''}`.toUpperCase()}
                      </Avatar>
                    )}
                    <Box sx={{ maxWidth: '72%' }}>
                      {!isOwn && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, display: 'block' }}>
                          {m.prenom} {m.nom}
                        </Typography>
                      )}
                      <Box sx={{
                        p: 1.5,
                        borderRadius: isOwn ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
                        bgcolor: isOwn ? '#7D3C00' : '#fff',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                      }}>
                        <Typography
                          fontSize={14}
                          sx={{ color: isOwn ? '#fff' : 'text.primary', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        >
                          {m.message}
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ display: 'block', mt: 0.25, textAlign: isOwn ? 'right' : 'left' }}
                      >
                        {new Date(m.created_at).toLocaleString('fr-FR', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                        {isOwn && m.is_read && (
                          <span style={{ color: '#4CAF50', marginLeft: 4 }}>· Lu</span>
                        )}
                      </Typography>
                    </Box>
                  </Box>
                );
              })
            )}
            <div ref={threadEndRef} />
          </Box>

          <Divider />

          {/* Compose */}
          <Box sx={{ p: 2, display: 'flex', gap: 1, bgcolor: '#fff', alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              placeholder="Écrire un message à l'administration…"
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSend(); }}
              multiline
              maxRows={4}
              size="small"
              inputProps={{ maxLength: 2000 }}
              helperText="Ctrl + Entrée pour envoyer"
            />
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={sending || !newMsg.trim()}
              sx={{ minWidth: 48, px: 2, mb: 2.5 }}
            >
              {sending ? <CircularProgress size={20} color="inherit" /> : <SendOutlined />}
            </Button>
          </Box>
        </Paper>
      </TabPanel>

      {/* ── Annonces tab ── */}
      <TabPanel value={tab} index={1}>
        {bcastLoading ? (
          [1, 2, 3].map(i => <Skeleton key={i} height={80} sx={{ mb: 1.5, borderRadius: 2 }} />)
        ) : broadcasts.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}>
            <CampaignOutlined sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">Aucune annonce pour le moment</Typography>
          </Paper>
        ) : (
          broadcasts.map(b => (
            <Card
              key={b.id}
              sx={{
                mb: 2, borderRadius: 3,
                boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
                border: b.is_read ? '1px solid transparent' : '2px solid #7D3C00',
              }}
            >
              <CardActionArea onClick={() => handleExpand(b)}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                        {!b.is_read && (
                          <Chip label="Nouveau" size="small" color="error" sx={{ height: 18, fontSize: 10, fontWeight: 700 }} />
                        )}
                        <Typography fontWeight={b.is_read ? 500 : 700} fontSize={15}>
                          {b.subject}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Administration · {new Date(b.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </Typography>
                      {expanded !== b.id && (
                        <Typography
                          fontSize={13} color="text.secondary"
                          sx={{ mt: 0.75, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        >
                          {b.body}
                        </Typography>
                      )}
                    </Box>
                    {b.is_read
                      ? <MarkEmailReadOutlined sx={{ color: 'text.disabled', flexShrink: 0, mt: 0.5 }} />
                      : <MarkEmailUnreadOutlined sx={{ color: '#7D3C00', flexShrink: 0, mt: 0.5 }} />
                    }
                  </Box>
                </CardContent>
              </CardActionArea>
              <Collapse in={expanded === b.id}>
                <Divider />
                <Box sx={{ px: 3, py: 2.5, bgcolor: 'grey.50' }}>
                  <Typography fontSize={14} sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{b.body}</Typography>
                  {b.read_at && (
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.5 }}>
                      Lu le {new Date(b.read_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </Typography>
                  )}
                </Box>
              </Collapse>
            </Card>
          ))
        )}
      </TabPanel>
    </Box>
  );
}
