import { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Tooltip, Avatar,
  Alert, Skeleton, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Snackbar, TextField, CircularProgress,
  Divider, Tabs, Tab, Card, CardContent, LinearProgress
} from '@mui/material';
import {
  DeleteOutlined, ChatBubbleOutlineOutlined, ReplyOutlined,
  CampaignOutlined, AddOutlined, MarkEmailReadOutlined,
  MarkEmailUnreadOutlined
} from '@mui/icons-material';

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

function EmployeeAvatar({ nom, prenom }) {
  const initials = `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase();
  return <Avatar sx={{ bgcolor: '#7D3C00', width: 32, height: 32, fontSize: 12 }}>{initials}</Avatar>;
}

export default function AdminFeedback() {
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState('');
  const [error, setError] = useState('');

  // ── Messages tab ──────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySaving, setReplySaving] = useState(false);
  const [replyError, setReplyError] = useState('');

  // ── Broadcasts tab ────────────────────────────────────────────────────────
  const [broadcasts, setBroadcasts] = useState([]);
  const [bcastLoading, setBcastLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deleteBcast, setDeleteBcast] = useState(null);
  const [deletingBcast, setDeletingBcast] = useState(false);

  const fetchMessages = async () => {
    setMsgLoading(true);
    try {
      const { data } = await api.get('/admin/feedback');
      setMessages(data);
      // Mark all as read when admin opens the inbox
      api.post('/admin/feedback/mark-all-read').catch(() => {});
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur lors du chargement');
    } finally {
      setMsgLoading(false);
    }
  };

  const fetchBroadcasts = async () => {
    setBcastLoading(true);
    try {
      const { data } = await api.get('/admin/broadcasts');
      setBroadcasts(data);
    } catch {} finally {
      setBcastLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchBroadcasts();
  }, []);

  // ── Message actions ───────────────────────────────────────────────────────

  const openReply = (m) => { setReplyTarget(m); setReplyText(''); setReplyError(''); };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setReplySaving(true);
    setReplyError('');
    try {
      await api.post(`/admin/users/${replyTarget.matricule}/feedback`, { message: replyText });
      setSnack(`Réponse envoyée à ${replyTarget.prenom} ${replyTarget.nom}.`);
      setReplyTarget(null);
    } catch (e) {
      setReplyError(e.response?.data?.message || "Erreur lors de l'envoi");
    } finally {
      setReplySaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/feedback/${deleteTarget.id}`);
      setSnack('Message supprimé.');
      setDeleteTarget(null);
      fetchMessages();
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur lors de la suppression');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // ── Broadcast actions ─────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newSubject.trim() || !newBody.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      await api.post('/admin/broadcasts', { subject: newSubject, body: newBody });
      setSnack('Annonce envoyée à tous les employés.');
      setCreateOpen(false);
      setNewSubject('');
      setNewBody('');
      fetchBroadcasts();
    } catch (e) {
      setCreateError(e.response?.data?.message || "Erreur lors de l'envoi");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBcast = async () => {
    setDeletingBcast(true);
    try {
      await api.delete(`/admin/broadcasts/${deleteBcast.id}`);
      setSnack('Annonce supprimée.');
      setDeleteBcast(null);
      fetchBroadcasts();
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur lors de la suppression');
      setDeleteBcast(null);
    } finally {
      setDeletingBcast(false);
    }
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Messagerie</Typography>
        <Typography color="text.secondary">Gérez les messages et annonces</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab
            label={
              unreadCount > 0
                ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Messages reçus
                    <Chip label={unreadCount} size="small" color="warning" sx={{ height: 18, fontSize: 10, fontWeight: 700 }} />
                  </Box>
                : 'Messages reçus'
            }
            icon={<ChatBubbleOutlineOutlined />}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 500 }}
          />
          <Tab
            label="Annonces générales"
            icon={<CampaignOutlined />}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 500 }}
          />
        </Tabs>
      </Box>

      {/* ── Messages tab ── */}
      <TabPanel value={tab} index={0}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {messages.length} message{messages.length !== 1 ? 's' : ''} au total
          </Typography>
        </Box>

        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell><Typography fontWeight={600} fontSize={13}>STATUT</Typography></TableCell>
                <TableCell><Typography fontWeight={600} fontSize={13}>EMPLOYÉ</Typography></TableCell>
                <TableCell><Typography fontWeight={600} fontSize={13}>SERVICE</Typography></TableCell>
                <TableCell><Typography fontWeight={600} fontSize={13}>MESSAGE</Typography></TableCell>
                <TableCell><Typography fontWeight={600} fontSize={13}>DATE</Typography></TableCell>
                <TableCell align="right"><Typography fontWeight={600} fontSize={13}>ACTIONS</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {msgLoading
                ? [1, 2, 3].map(i => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5, 6].map(j => <TableCell key={j}><Skeleton /></TableCell>)}
                  </TableRow>
                ))
                : messages.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <ChatBubbleOutlineOutlined sx={{ fontSize: 40, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                      <Typography color="text.secondary">Aucun message reçu des employés</Typography>
                    </TableCell>
                  </TableRow>
                )
                : messages.map(m => (
                  <TableRow key={m.id} hover sx={{ bgcolor: m.is_read ? 'inherit' : 'rgba(125,60,0,0.03)' }}>
                    <TableCell>
                      <Tooltip title={m.is_read
                        ? `Lu le ${new Date(m.read_at).toLocaleDateString('fr-FR')}`
                        : 'Non lu'
                      }>
                        {m.is_read
                          ? <MarkEmailReadOutlined sx={{ color: 'text.disabled', fontSize: 20 }} />
                          : <MarkEmailUnreadOutlined sx={{ color: '#C68B2E', fontSize: 20 }} />
                        }
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <EmployeeAvatar nom={m.nom} prenom={m.prenom} />
                        <Box>
                          <Typography fontWeight={m.is_read ? 400 : 700} fontSize={14}>{m.prenom} {m.nom}</Typography>
                          <Typography variant="caption" color="text.secondary">{m.matricule}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={m.service} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 380 }}>
                      <Typography fontSize={13} sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {m.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={13} color="text.secondary">
                        {new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Répondre">
                        <IconButton size="small" color="primary" onClick={() => openReply(m)}>
                          <ReplyOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(m)}>
                          <DeleteOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── Broadcasts tab ── */}
      <TabPanel value={tab} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={() => { setCreateOpen(true); setNewSubject(''); setNewBody(''); setCreateError(''); }}
          >
            Nouvelle annonce
          </Button>
        </Box>

        {bcastLoading ? (
          [1, 2, 3].map(i => <Skeleton key={i} height={100} sx={{ mb: 1.5, borderRadius: 2 }} />)
        ) : broadcasts.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}>
            <CampaignOutlined sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">Aucune annonce envoyée</Typography>
            <Typography variant="caption" color="text.disabled">Utilisez le bouton ci-dessus pour envoyer une annonce à tous les employés.</Typography>
          </Paper>
        ) : (
          broadcasts.map(b => (
            <Card key={b.id} sx={{ mb: 2, borderRadius: 3, boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={600} fontSize={15} sx={{ mb: 0.5 }}>{b.subject}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Envoyée le {new Date(b.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </Typography>
                    <Typography
                      fontSize={13} color="text.secondary"
                      sx={{ mt: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {b.body}
                    </Typography>

                    {/* Read progress */}
                    <Box sx={{ mt: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Lue par {b.read_count} / {b.total_employees} employé{b.total_employees !== 1 ? 's' : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {b.total_employees > 0 ? Math.round((b.read_count / b.total_employees) * 100) : 0}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={b.total_employees > 0 ? (b.read_count / b.total_employees) * 100 : 0}
                        sx={{ borderRadius: 4, height: 6, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: '#7D3C00' } }}
                      />
                    </Box>
                  </Box>
                  <Tooltip title="Supprimer l'annonce">
                    <IconButton size="small" color="error" onClick={() => setDeleteBcast(b)}>
                      <DeleteOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </TabPanel>

      {/* ── Reply dialog ── */}
      <Dialog open={Boolean(replyTarget)} onClose={() => setReplyTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Répondre à {replyTarget?.prenom} {replyTarget?.nom}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ p: 2, mb: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Message de l'employé
            </Typography>
            <Typography fontSize={14} sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {replyTarget?.message}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
              {replyTarget && new Date(replyTarget.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {replyError && <Alert severity="error" sx={{ mb: 2 }}>{replyError}</Alert>}
          <TextField
            label="Votre réponse"
            placeholder="Saisir votre réponse…"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleReply(); }}
            multiline rows={4} fullWidth autoFocus
            inputProps={{ maxLength: 1000 }}
            helperText="Ctrl + Entrée pour envoyer"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyTarget(null)}>Annuler</Button>
          <Button
            variant="contained"
            startIcon={replySaving ? <CircularProgress size={16} color="inherit" /> : <ReplyOutlined />}
            onClick={handleReply}
            disabled={replySaving || !replyText.trim()}
          >
            Envoyer la réponse
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete message dialog ── */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer le message</DialogTitle>
        <DialogContent>
          <Typography>
            Supprimer le message de <strong>{deleteTarget?.prenom} {deleteTarget?.nom}</strong> ?
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Create broadcast dialog ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CampaignOutlined /> Nouvelle annonce générale
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ce message sera envoyé à tous les employés et apparaîtra dans leur espace Messagerie.
          </Typography>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
          <TextField
            label="Objet"
            value={newSubject}
            onChange={e => setNewSubject(e.target.value)}
            fullWidth sx={{ mb: 2 }}
            inputProps={{ maxLength: 200 }}
          />
          <TextField
            label="Contenu du message"
            value={newBody}
            onChange={e => setNewBody(e.target.value)}
            multiline rows={6} fullWidth
            inputProps={{ maxLength: 5000 }}
            helperText={`${newBody.length} / 5000 caractères`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Annuler</Button>
          <Button
            variant="contained"
            startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <CampaignOutlined />}
            onClick={handleCreate}
            disabled={creating || !newSubject.trim() || !newBody.trim()}
          >
            Envoyer à tous
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete broadcast dialog ── */}
      <Dialog open={Boolean(deleteBcast)} onClose={() => setDeleteBcast(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer l'annonce</DialogTitle>
        <DialogContent>
          <Typography>
            Supprimer l'annonce <strong>«&nbsp;{deleteBcast?.subject}&nbsp;»</strong> ?
            Elle disparaîtra de l'espace de tous les employés.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteBcast(null)}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDeleteBcast} disabled={deletingBcast}>
            {deletingBcast ? <CircularProgress size={20} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack('')}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
