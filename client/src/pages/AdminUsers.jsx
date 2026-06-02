import { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Tooltip, Chip, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControlLabel, Switch, Alert, Skeleton, CircularProgress,
  MenuItem, InputAdornment, Snackbar
} from '@mui/material';
import {
  PersonAddOutlined, EditOutlined, DeleteOutlined, LockResetOutlined,
  AdminPanelSettingsOutlined, PersonOffOutlined, ContentCopyOutlined,
  CheckCircleOutlined, VisibilityOutlined, VisibilityOffOutlined
} from '@mui/icons-material';

const SERVICES = ['Informatique', 'Ressources Humaines', 'Finance', 'Direction', 'Logistique'];

const EMPTY_FORM = { matricule: '', nom: '', prenom: '', service: '', email: '', pin: '', is_admin: false };

function UserAvatar({ nom, prenom }) {
  const initials = `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase();
  return <Avatar sx={{ bgcolor: '#1a237e', width: 32, height: 32, fontSize: 12 }}>{initials}</Avatar>;
}

function StatusChips({ user }) {
  if (user.first_login) return <Chip label="1ère connexion" size="small" color="warning" variant="outlined" />;
  if (user.is_active) return <Chip label="Actif" size="small" color="success" variant="outlined" icon={<CheckCircleOutlined />} />;
  return <Chip label="Inactif" size="small" color="default" variant="outlined" icon={<PersonOffOutlined />} />;
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');

  // Add / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPin, setResetPin] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── Add / Edit ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowPin(false);
    setDialogOpen(true);
  };

  const openEdit = (user) => {
    setEditTarget(user);
    setForm({
      matricule: user.matricule,
      nom: user.nom,
      prenom: user.prenom,
      service: user.service,
      email: user.email || '',
      pin: '',
      is_admin: Boolean(user.is_admin),
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.matricule || !form.nom || !form.prenom || !form.service) {
      setFormError('Matricule, nom, prénom et service sont requis.');
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await api.put(`/admin/users/${editTarget.matricule}`, {
          nom: form.nom,
          prenom: form.prenom,
          service: form.service,
          email: form.email,
          is_admin: form.is_admin,
          is_active: editTarget.is_active,
        });
        setSnack('Employé mis à jour.');
      } else {
        const { data } = await api.post('/admin/users', {
          matricule: form.matricule,
          nom: form.nom,
          prenom: form.prenom,
          service: form.service,
          email: form.email,
          pin: form.pin || undefined,
          is_admin: form.is_admin,
        });
        setSnack(`Employé créé. PIN : ${data.pin}`);
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (e) {
      setFormError(e.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/users/${deleteTarget.matricule}`);
      setSnack('Employé supprimé.');
      setDeleteTarget(null);
      fetchUsers();
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur lors de la suppression');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // ── Reset password ──────────────────────────────────────────────────────────

  const openReset = (user) => {
    setResetTarget(user);
    setResetPin('');
    setResetResult(null);
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const { data } = await api.post(`/admin/users/${resetTarget.matricule}/reset-password`, {
        pin: resetPin || undefined,
      });
      setResetResult(data.pin);
      fetchUsers();
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur lors de la réinitialisation');
      setResetTarget(null);
    } finally {
      setResetting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSnack('PIN copié dans le presse-papiers.');
  };

  // ── Toggle active ───────────────────────────────────────────────────────────

  const toggleActive = async (user) => {
    try {
      await api.put(`/admin/users/${user.matricule}`, { is_active: !user.is_active });
      fetchUsers();
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5">Gestion des utilisateurs</Typography>
          <Typography color="text.secondary">Ajouter, modifier ou supprimer des comptes employés</Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAddOutlined />} onClick={openCreate}>
          Nouvel employé
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><Typography fontWeight={600} fontSize={13}>EMPLOYÉ</Typography></TableCell>
              <TableCell><Typography fontWeight={600} fontSize={13}>SERVICE</Typography></TableCell>
              <TableCell><Typography fontWeight={600} fontSize={13}>EMAIL</Typography></TableCell>
              <TableCell><Typography fontWeight={600} fontSize={13}>STATUT</Typography></TableCell>
              <TableCell><Typography fontWeight={600} fontSize={13}>RÔLE</Typography></TableCell>
              <TableCell align="right"><Typography fontWeight={600} fontSize={13}>ACTIONS</Typography></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? [1, 2, 3].map(i => (
                <TableRow key={i}>
                  {[1, 2, 3, 4, 5, 6].map(j => <TableCell key={j}><Skeleton /></TableCell>)}
                </TableRow>
              ))
              : users.map(u => (
                <TableRow key={u.matricule} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <UserAvatar nom={u.nom} prenom={u.prenom} />
                      <Box>
                        <Typography fontWeight={600} fontSize={14}>{u.prenom} {u.nom}</Typography>
                        <Typography variant="caption" color="text.secondary">{u.matricule}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell><Typography fontSize={13}>{u.service}</Typography></TableCell>
                  <TableCell><Typography fontSize={13} color="text.secondary">{u.email || '—'}</Typography></TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StatusChips user={u} />
                      {!u.first_login && (
                        <Tooltip title={u.is_active ? 'Désactiver le compte' : 'Activer le compte'}>
                          <Switch size="small" checked={Boolean(u.is_active)} onChange={() => toggleActive(u)} />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {u.is_admin
                      ? <Chip icon={<AdminPanelSettingsOutlined />} label="Admin" size="small" color="primary" />
                      : <Chip label="Employé" size="small" variant="outlined" />
                    }
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Modifier">
                      <IconButton size="small" onClick={() => openEdit(u)}><EditOutlined fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Réinitialiser le mot de passe">
                      <IconButton size="small" color="warning" onClick={() => openReset(u)}><LockResetOutlined fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(u)}><DeleteOutlined fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editTarget ? 'Modifier l\'employé' : 'Nouvel employé'}</DialogTitle>
        <DialogContent dividers>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Matricule"
              value={form.matricule}
              onChange={e => setForm(f => ({ ...f, matricule: e.target.value.toUpperCase() }))}
              disabled={Boolean(editTarget)}
              required
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Prénom" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} required fullWidth />
              <TextField label="Nom" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required fullWidth />
            </Box>
            <TextField
              select label="Service" value={form.service}
              onChange={e => setForm(f => ({ ...f, service: e.target.value }))} required fullWidth
            >
              {SERVICES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField
              label="Email" type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} fullWidth
            />
            {!editTarget && (
              <TextField
                label="PIN initial (laissez vide pour générer)"
                value={form.pin}
                onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
                type={showPin ? 'text' : 'password'}
                inputProps={{ maxLength: 10 }}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPin(v => !v)}>
                        {showPin ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            )}
            <FormControlLabel
              control={<Switch checked={form.is_admin} onChange={e => setForm(f => ({ ...f, is_admin: e.target.checked }))} />}
              label="Administrateur"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : (editTarget ? 'Enregistrer' : 'Créer')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer l'employé</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.prenom} {deleteTarget?.nom}</strong> ({deleteTarget?.matricule}) ?
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

      {/* ── Reset Password Dialog ── */}
      <Dialog open={Boolean(resetTarget)} onClose={() => { setResetTarget(null); setResetResult(null); }} maxWidth="xs" fullWidth>
        <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
        <DialogContent>
          {resetResult ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>Mot de passe réinitialisé avec succès.</Alert>
              <Typography variant="body2" gutterBottom>
                Communiquez ce PIN à l'employé. Il devra définir un nouveau mot de passe lors de sa prochaine connexion.
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h5" fontWeight={700} letterSpacing={4}>{resetResult}</Typography>
                <Tooltip title="Copier le PIN">
                  <IconButton onClick={() => copyToClipboard(resetResult)}><ContentCopyOutlined /></IconButton>
                </Tooltip>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Typography variant="body2">
                Réinitialiser le compte de <strong>{resetTarget?.prenom} {resetTarget?.nom}</strong>.
                Le compte repassera en mode « première connexion » et un nouveau PIN sera généré.
              </Typography>
              <TextField
                label="PIN personnalisé (optionnel)"
                value={resetPin}
                onChange={e => setResetPin(e.target.value)}
                helperText="Laissez vide pour générer automatiquement un PIN à 4 chiffres"
                inputProps={{ maxLength: 10 }}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {resetResult
            ? <Button variant="contained" onClick={() => { setResetTarget(null); setResetResult(null); }}>Fermer</Button>
            : <>
              <Button onClick={() => setResetTarget(null)}>Annuler</Button>
              <Button variant="contained" color="warning" onClick={handleReset} disabled={resetting}>
                {resetting ? <CircularProgress size={20} /> : 'Réinitialiser'}
              </Button>
            </>
          }
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={5000}
        onClose={() => setSnack('')}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
