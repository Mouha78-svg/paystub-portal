import { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Tooltip, Avatar,
  Alert, Skeleton, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Snackbar, TextField, CircularProgress, Divider
} from '@mui/material';
import {
  DeleteOutlined, ChatBubbleOutlineOutlined, ReplyOutlined
} from '@mui/icons-material';

function EmployeeAvatar({ nom, prenom }) {
  const initials = `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase();
  return <Avatar sx={{ bgcolor: '#7D3C00', width: 32, height: 32, fontSize: 12 }}>{initials}</Avatar>;
}

export default function AdminFeedback() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySaving, setReplySaving] = useState(false);
  const [replyError, setReplyError] = useState('');

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/feedback');
      setMessages(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMessages(); }, []);

  const openReply = (m) => {
    setReplyTarget(m);
    setReplyText('');
    setReplyError('');
  };

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

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5">Messages des employés</Typography>
          <Typography color="text.secondary">Messages envoyés par les employés à l'administration</Typography>
        </Box>
        {!loading && (
          <Chip
            label={`${messages.length} message${messages.length !== 1 ? 's' : ''}`}
            color={messages.length > 0 ? 'warning' : 'default'}
            icon={<ChatBubbleOutlineOutlined />}
            sx={{ fontWeight: 600 }}
          />
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><Typography fontWeight={600} fontSize={13}>EMPLOYÉ</Typography></TableCell>
              <TableCell><Typography fontWeight={600} fontSize={13}>SERVICE</Typography></TableCell>
              <TableCell><Typography fontWeight={600} fontSize={13}>MESSAGE</Typography></TableCell>
              <TableCell><Typography fontWeight={600} fontSize={13}>DATE</Typography></TableCell>
              <TableCell align="right"><Typography fontWeight={600} fontSize={13}>ACTIONS</Typography></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? [1, 2, 3].map(i => (
                <TableRow key={i}>
                  {[1, 2, 3, 4, 5].map(j => <TableCell key={j}><Skeleton /></TableCell>)}
                </TableRow>
              ))
              : messages.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <ChatBubbleOutlineOutlined sx={{ fontSize: 40, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary">Aucun message reçu des employés</Typography>
                  </TableCell>
                </TableRow>
              )
              : messages.map(m => (
                <TableRow key={m.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <EmployeeAvatar nom={m.nom} prenom={m.prenom} />
                      <Box>
                        <Typography fontWeight={600} fontSize={14}>{m.prenom} {m.nom}</Typography>
                        <Typography variant="caption" color="text.secondary">{m.matricule}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={m.service} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 400 }}>
                    <Typography fontSize={13} sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.message}</Typography>
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

      {/* Reply dialog */}
      <Dialog open={Boolean(replyTarget)} onClose={() => setReplyTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Répondre à {replyTarget?.prenom} {replyTarget?.nom}
        </DialogTitle>
        <DialogContent dividers>
          {/* Original message */}
          <Box sx={{ p: 2, mb: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Message de l'employé
            </Typography>
            <Typography fontSize={14} sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {replyTarget?.message}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
              {replyTarget && new Date(replyTarget.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
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
            multiline
            rows={4}
            fullWidth
            autoFocus
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

      {/* Delete confirmation */}
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
