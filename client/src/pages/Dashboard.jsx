import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip,
  Avatar, Skeleton, Alert, Divider, TextField, IconButton,
  CircularProgress, Tooltip
} from '@mui/material';
import {
  ReceiptLongOutlined, PersonOutlined, TrendingUpOutlined,
  ArrowForwardOutlined, AccountBalanceOutlined, CalendarMonthOutlined,
  ChatBubbleOutlineOutlined, SendOutlined, EditOutlined, DeleteOutlined,
  CheckOutlined, CloseOutlined
} from '@mui/icons-material';

function StatCard({ icon, label, value, color, loading }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
        <Box sx={{ width: 50, height: 50, borderRadius: 3, bgcolor: `${color}.50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Box sx={{ color: `${color}.main` }}>{icon}</Box>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
          {loading ? <Skeleton width={80} height={28} /> : <Typography variant="h6">{value}</Typography>}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [payslips, setPayslips] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [messageSaving, setMessageSaving] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchFeedback = () => {
    setFeedbackLoading(true);
    api.get('/feedback').then(r => setFeedbackList(r.data)).catch(() => setFeedbackList([])).finally(() => setFeedbackLoading(false));
  };

  useEffect(() => {
    api.get('/payslips?limit=3').then(r => { setPayslips(r.data.data || []); setTotal(r.data.total ?? null); }).catch(e => setError(e.response?.data?.message || 'Erreur')).finally(() => setLoading(false));
    fetchFeedback();
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setMessageSaving(true);
    setMessageError('');
    try {
      await api.post('/feedback', { message: newMessage });
      setNewMessage('');
      fetchFeedback();
    } catch (e) {
      setMessageError(e.response?.data?.message || 'Erreur lors de l\'envoi');
    } finally {
      setMessageSaving(false);
    }
  };

  const startEdit = (f) => {
    setEditingId(f.id);
    setEditingText(f.message);
    setMessageError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleEditSave = async (id) => {
    if (!editingText.trim()) return;
    setEditSaving(true);
    setMessageError('');
    try {
      await api.put(`/feedback/${id}`, { message: editingText });
      setEditingId(null);
      fetchFeedback();
    } catch (e) {
      setMessageError(e.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    setMessageError('');
    try {
      await api.delete(`/feedback/${id}`);
      fetchFeedback();
    } catch (e) {
      setMessageError(e.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const fmt = n => new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);
  const initials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : 'U';
  const lastPayslip = payslips[0];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5">Bonjour, {user?.prenom} 👋</Typography>
        <Typography color="text.secondary">Bienvenue sur votre espace bulletins de salaire</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Profile card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, fontSize: 20 }}>{initials}</Avatar>
                <Box>
                  <Typography fontWeight={700}>{user?.prenom} {user?.nom}</Typography>
                  <Chip label={user?.service} size="small" color="primary" variant="outlined" sx={{ mt: 0.5 }} />
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[
                  { label: 'Matricule', value: user?.matricule, icon: <PersonOutlined fontSize="small" /> },
                  { label: 'Service', value: user?.service, icon: <AccountBalanceOutlined fontSize="small" /> },
                ].map(item => (
                  <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: 'text.secondary' }}>{item.icon}</Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                      <Typography variant="body2" fontWeight={500}>{item.value}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
              <Button variant="outlined" fullWidth sx={{ mt: 3 }} startIcon={<PersonOutlined />} onClick={() => navigate('/profile')}>
                Voir mon profil
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Stats */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <StatCard icon={<ReceiptLongOutlined />} label="Bulletins" value={loading ? '—' : total !== null ? total : payslips.length} color="primary" loading={loading} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard icon={<TrendingUpOutlined />} label="Dernier net" value={loading ? '—' : lastPayslip ? fmt(lastPayslip.salaire_net) : '—'} color="success" loading={loading} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard icon={<CalendarMonthOutlined />} label="Dernière période" value={loading ? '—' : lastPayslip ? `${lastPayslip.mois} ${lastPayslip.annee}` : '—'} color="secondary" loading={loading} />
            </Grid>
          </Grid>

          {/* Recent payslips */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography fontWeight={600}>Derniers bulletins</Typography>
                <Button size="small" endIcon={<ArrowForwardOutlined />} onClick={() => navigate('/payslips')}>Voir tout</Button>
              </Box>
              {loading ? (
                [1,2,3].map(i => <Skeleton key={i} height={64} sx={{ mb: 1, borderRadius: 2 }} />)
              ) : payslips.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <ReceiptLongOutlined sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary" variant="body2">Aucun bulletin disponible</Typography>
                </Box>
              ) : payslips.map((p, i) => (
                <Box key={p.id} sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  p: 1.5, borderRadius: 2, mb: 1,
                  bgcolor: i === 0 ? 'primary.50' : 'grey.50',
                  border: '1px solid', borderColor: i === 0 ? 'primary.100' : 'grey.200',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CalendarMonthOutlined sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Box>
                      <Typography fontWeight={500} fontSize={14}>{p.mois} {p.annee}</Typography>
                      <Typography variant="caption" color="text.secondary">Brut: {fmt(p.salaire_brut)}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography fontWeight={700} color="success.main" fontSize={15}>{fmt(p.salaire_net)}</Typography>
                    {i === 0 && <Chip label="Dernier" size="small" color="primary" sx={{ height: 18, fontSize: 10 }} />}
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Messaging with administration */}
      <Box sx={{ mt: 3 }}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ChatBubbleOutlineOutlined sx={{ color: 'primary.main' }} />
              <Typography fontWeight={600}>Messages</Typography>
            </Box>

            {/* Conversation thread */}
            {feedbackLoading ? (
              [1, 2].map(i => <Skeleton key={i} height={56} sx={{ mb: 1, borderRadius: 2 }} />)
            ) : feedbackList.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Aucun message pour l'instant. Vous pouvez contacter l'administration ci-dessous.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                {feedbackList.map(f => {
                  const fromUser = f.created_by === user?.matricule;
                  const isEditing = editingId === f.id;
                  return (
                    <Box
                      key={f.id}
                      sx={{
                        p: 2, borderRadius: 2, border: '1px solid',
                        alignSelf: fromUser ? 'flex-end' : 'flex-start',
                        maxWidth: '85%', width: isEditing ? '85%' : undefined,
                        bgcolor: fromUser ? 'secondary.50' : 'primary.50',
                        borderColor: fromUser ? 'secondary.200' : 'primary.100',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600} color={fromUser ? 'secondary.dark' : 'primary.dark'}>
                          {fromUser ? 'Vous' : 'Administration'}
                        </Typography>
                        {fromUser && !isEditing && (
                          <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                            <Tooltip title="Modifier">
                              <IconButton size="small" onClick={() => startEdit(f)} sx={{ p: 0.3 }}>
                                <EditOutlined sx={{ fontSize: 14, color: 'text.secondary' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Supprimer">
                              <IconButton size="small" onClick={() => handleDelete(f.id)} disabled={deletingId === f.id} sx={{ p: 0.3 }}>
                                {deletingId === f.id
                                  ? <CircularProgress size={12} />
                                  : <DeleteOutlined sx={{ fontSize: 14, color: 'error.main' }} />}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </Box>

                      {isEditing ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <TextField
                            value={editingText}
                            onChange={e => setEditingText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(f.id); } if (e.key === 'Escape') cancelEdit(); }}
                            size="small"
                            fullWidth
                            multiline
                            autoFocus
                            maxRows={6}
                            inputProps={{ maxLength: 1000 }}
                          />
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Tooltip title="Annuler (Échap)">
                              <IconButton size="small" onClick={cancelEdit}>
                                <CloseOutlined sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Enregistrer (Entrée)">
                              <span>
                                <IconButton size="small" color="primary" onClick={() => handleEditSave(f.id)} disabled={editSaving || !editingText.trim()}>
                                  {editSaving ? <CircularProgress size={14} /> : <CheckOutlined sx={{ fontSize: 16 }} />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </Box>
                      ) : (
                        <Typography fontSize={14} sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{f.message}</Typography>
                      )}

                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {new Date(f.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            {messageError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setMessageError('')}>{messageError}</Alert>}

            {/* Send message form */}
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <TextField
                placeholder="Envoyer un message à l'administration…"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                size="small"
                fullWidth
                multiline
                maxRows={4}
                inputProps={{ maxLength: 1000 }}
              />
              <Tooltip title="Envoyer">
                <span>
                  <IconButton color="primary" onClick={handleSendMessage} disabled={messageSaving || !newMessage.trim()}>
                    {messageSaving ? <CircularProgress size={20} /> : <SendOutlined />}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
